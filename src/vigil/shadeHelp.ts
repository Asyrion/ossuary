/* Bound shades at work (M7 step 6; docs/M7-plan.md, decisions 10 and 11): a shade bound in one run walks with the mage
   through the next (`G.run.walking`, taken from the save as the run begins), a small wisp of it at the mage's shoulder,
   each helping its own way (data/shades.json's `help`, tuning `CFG.shadeHelp`):
   - storm (the storm caller): now and then a bolt from a storm cloud on the nearest foe, shocking it;
   - roots (the cloud-forest wizard): now and then roots hold the foes near the mage;
   - bow (the forager): now and then an arrow at the nearest foe;
   - turn (the scribe): the first shot a room that would reach the mage is turned aside;
   - dig (the sexton): now and then a half heart dug out of a room won;
   - sing (the chorister): the spells come round a little quicker (`singMul`, read by `spellCooldown`);
   - ring (the bell-ringer): now and then a bell that stalls the shots near the mage;
   - hex (the novice): the first foe the mage strikes in a room is hexed;
   - brew (the embalmer): a draught brewed on every floor;
   - map (the pilgrim): each floor's way known from the start.
   Nothing silent: each one's word rises where it acts (once a room) and its line shows the first time in a run
   (boonHooks.ts's `actsHere`); the run begins with a line for each shade walking with it. */
import * as THREE from 'three';
import type { Enemy, Room } from '../types';
import { CFG } from '../config';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { disposeTree } from '../render/materials';
import { burst } from '../combat/fx';
import { damageEnemy } from '../combat/damage';
import { fireSecondary } from '../combat/projectiles';
import { inflict } from '../magic/statusFx';
import { strikeFx } from '../magic/spellFx';
import { actsHere } from '../progression/boonHooks';
import { spawnHeart } from '../items/pickups';
import { addPotion } from '../items/potions';
import { pickPotion } from '../items/alchemyData';
import { renderMinimap, line } from '../ui/hud';
import { Rng } from '../rng';
import { shade, SHADE_IDS, type ShadeHelp } from './shadeData';
import { takeBound } from './save';
import { walking } from './walking';
import { shadeWispLook } from './shadeLooks';

const H = () => CFG.shadeHelp;
const helper = (help: ShadeHelp) => G.run.walking.find((id) => shade(id)?.help === help)!;
/** A help at work at (x, z): its word there once a room, its line the first time in a run. */
function acts(help: ShadeHelp, x = player.x, z = player.z) {
  const id = helper(help);
  actsHere('shade:' + help, 'shade:' + help, STR.shades.acts[help], shade(id).light, STR.shades.helps[help], x, z, () =>
    Sfx.at(x, z).shadeHelp(),
  );
}

/** A run begins: the shades bound before walk with it (and are bound no longer: they slip back into their chains after). */
export function shadesWalk() {
  G.run.walking = takeBound().filter((id) => SHADE_IDS.includes(id));
  for (const id of G.run.walking)
    line(STR.shades.walks(STR.shades.names[id] ?? id, STR.shades.helps[shade(id).help]), 5);
}

/** The dev menu: a shade walks with the mage from now on, this run (its line said as a run's would be). */
export function walkWith(id: string) {
  if (!SHADE_IDS.includes(id) || G.run.walking.includes(id)) return false;
  G.run.walking = [...G.run.walking, id];
  line(STR.shades.walks(STR.shades.names[id] ?? id, STR.shades.helps[shade(id).help]), 5);
  return true;
}
/** A floor begun: the embalmer's draught, the pilgrim's map. */
export function helpNewFloor() {
  if (walking('brew')) {
    const r = Rng.from(G.run.seed, 'embalmer' + G.run.floor);
    addPotion(pickPotion({ next: () => r.next() }));
    acts('brew');
  }
  if (walking('map')) {
    for (const r of G.rooms) r.known = true;
    renderMinimap();
    acts('map');
  }
}
/** A room won: the sexton digs, now and then. */
export function helpRoomCleared(room: Room) {
  if (!walking('dig') || room !== G.current) return;
  const r = Rng.from(G.run.seed, 'sexton' + G.run.floor + ':' + room.plan.id);
  if (r.next() >= H().dig.chance) return;
  const x = player.x + 0.6,
    z = player.z + 0.4;
  spawnHeart(x, z, 1);
  burst(x, 0.2, z, 0xb8ae96, 10, 1.2, 0.03);
  acts('dig', x, z);
}

const timers: Partial<Record<ShadeHelp, number>> = {};
let turnedIn: Room | null = null,
  hexedIn: Room | null = null,
  lastCd = [0, 0];
const wisps = new Map<string, THREE.Group>();
const alive = (e: Enemy) => !e.dead && e.spawn <= 0 && !e.hidden;
function nearest(reach: number) {
  let best: Enemy | null = null,
    bd = reach;
  for (const e of G.enemies)
    if (alive(e)) {
      const d = Math.hypot(e.x - player.x, e.z - player.z);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
  return best;
}
/** Whether a help's timer has come round (it counts only while there is a fight). */
function due(help: ShadeHelp, every: number, dt: number) {
  const t = (timers[help] ?? every * 0.5) - dt;
  timers[help] = t <= 0 ? every : t;
  return t <= 0;
}

/** Each step: the wisps keep at the mage's shoulder, and each help acts when it can. `acting`: false while paused. */
export function updateShadeHelp(dt: number, now: number, acting: boolean) {
  for (const [id, w] of wisps)
    if (!G.run.walking.includes(id)) {
      scene.remove(w);
      disposeTree(w);
      wisps.delete(id);
    }
  G.run.walking.forEach((id, k) => {
    let w = wisps.get(id);
    if (!w) {
      w = shadeWispLook(shade(id).light);
      scene.add(w);
      wisps.set(id, w);
    }
    const a = now * 0.7 + (k * Math.PI * 2) / G.run.walking.length;
    w.position.set(
      player.x + Math.cos(a) * 0.75,
      0.55 + Math.sin(now * 2 + k) * 0.06,
      player.z - 0.35 + Math.sin(a) * 0.4,
    );
  });
  if (!acting || !G.run.walking.length) return;
  const room = G.current,
    fight = G.enemies.some(alive);
  if (fight && walking('storm') && due('storm', H().storm.every, dt)) {
    const e = nearest(H().storm.reach);
    if (e) {
      strikeFx({ x: e.x, y: 3.2, z: e.z }, { x: e.x, y: 0.5, z: e.z }, 0xf0e070);
      damageEnemy(e, H().storm.damage, 0, 0, 0.2, 'spell', 'storm');
      inflict(e, { shock: H().storm.shock }, 'mage');
      Sfx.at(e.x, e.z).arc();
      acts('storm', e.x, e.z);
    }
  }
  if (fight && walking('roots') && due('roots', H().roots.every, dt)) {
    const near = G.enemies.filter((e) => alive(e) && Math.hypot(e.x - player.x, e.z - player.z) < H().roots.reach);
    for (const e of near) inflict(e, { root: H().roots.root }, 'mage');
    if (near.length) acts('roots', near[0].x, near[0].z);
  }
  if (fight && walking('bow') && due('bow', H().bow.every, dt)) {
    const e = nearest(H().bow.reach);
    if (e) {
      fireSecondary(player.x, player.z, e.x - player.x, e.z - player.z, {
        damage: player.stats.damage * H().bow.damageMul,
        range: H().bow.reach + 1,
        scale: 0.5,
        color: 0xd0a868,
        speed: H().bow.speed,
      });
      acts('bow');
    }
  }
  if (walking('turn') && turnedIn !== room) {
    // the first shot a room that would reach the mage
    const i = G.shots.findIndex((s) => Math.hypot(s.x - player.x, s.z - player.z) < H().turn.reach + s.r);
    if (i >= 0) {
      const s = G.shots[i];
      scene.remove(s.mesh);
      G.shots.splice(i, 1);
      burst(s.x, s.y, s.z, 0xe8dcc0, 10, 1.4, 0.04);
      turnedIn = room;
      acts('turn', s.x, s.z);
    }
  }
  if (walking('ring') && due('ring', H().ring.every, dt)) {
    const near = G.shots.filter((s) => Math.hypot(s.x - player.x, s.z - player.z) < H().ring.reach);
    for (const s of near) {
      s.vx *= H().ring.stall;
      s.vz *= H().ring.stall;
    }
    if (near.length) {
      Sfx.at(player.x, player.z).bell();
      acts('ring');
    }
  }
  if (walking('hex') && hexedIn !== room) {
    // the first foe struck in a room
    const e = G.enemies.find((f) => alive(f) && f.hp < f.maxHp && !f.isBoss);
    if (e) {
      inflict(e, { hex: H().hex.hex }, 'mage');
      hexedIn = room;
      acts('hex', e.x, e.z);
    }
  }
  if (walking('sing')) {
    // its song as a spell comes round quicker: once a room
    player.spellCd.forEach((cd, i) => {
      if (cd > lastCd[i] + 0.01 && cd > 0) acts('sing');
    });
    lastCd = [...player.spellCd];
  }
}

/** A new run: the wisps go (the run's own walkers come with `shadesWalk`). */
export function clearShadeHelp() {
  for (const w of wisps.values()) {
    scene.remove(w);
    disposeTree(w);
  }
  wisps.clear();
  turnedIn = hexedIn = null;
}
/** For the tests: who walks with the mage and how often each help has acted. */
export const shadeHelpInfo = () => ({
  walking: [...G.run.walking],
  acted: Object.fromEntries(
    Object.entries(G.run.acted)
      .filter(([k]) => k.startsWith('shade:'))
      .map(([k, n]) => [k.slice(6), n]),
  ),
});
