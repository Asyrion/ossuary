/* Kaelith, the Shadow Sentinel (docs/M7-plan.md, decisions 5 and 6; GDD: the Vigil, Kaelith): the Seal's boss,
   the run's last fight. Umbral, weak to Hallow, resisting Umbral; its look is the Winged Watcher
   (kaelithLooks.ts). Three phases, by its health (kaelithData.ts):
   1. The Sentinel: it stalks at blade's reach; sweeps a fan of hexing blades (its blade raised, its mantle spread, first);
      fires volleys that hex; and steps from shadow to shadow: it sinks where no light falls and rises in another shadow
      near the mage with a ring of cuts. A lit candle stand, brazier or wall light makes light it can't step into or out of.
   2. The seal cracks: it goes to the hall's middle and holds the seal shut with one hand, taking a quarter of each blow,
      its volleys still coming. The hall's four ward pillars wake, each in a school (what the mage holds first); each ward
      still open lets the horde out of its crack, a foe every few seconds. Struck with its school (or a glyph's blast) a ward
      shuts; all four shut, Kaelith reels, open to blows, then fights on as the Sentinel.
   3. The last light: the hall goes dark (the candle stands lit before still hold it off) and a black sun hangs over it;
      every few seconds it pulls the mage toward it, unless they stand by a lit candle stand, then rings its blades out.
   It doesn't die: it kneels, and stays in its hall, kneeling (`onBossDead` in flow.ts calls `kaelithKneels`). */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Enemy, PropBox, Room } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { glow } from '../render/materials';
import { mergeRig } from '../render/rig';
import { setDarkness } from '../render/lights';
import { spawnShot } from '../combat/projectiles';
import { burst } from '../combat/fx';
import { banner, bossBarMarks, line } from '../notify';
import { floatText } from '../magic/statusFx';
import { freeSpotNear } from '../world/rooms';
import { FLOORS } from '../world/generate';
import { sealWard, wakeWard, wardHooks } from '../world/mechanisms';
import { callFoe, type Role } from './foeData';
import { makeEnemy } from './enemies';
import { kaelithKneeling, kaelithLook, kaelithMade } from './kaelithLooks';
import { phaseOf, sealWards, type KaelithPhase } from './kaelithData';
import { mulberry } from '../util';
import { SPELL_DEFS } from '../magic/spellData';

const C = CFG.enemy.kaelith,
  U = SCHOOL_LIGHT.umbral,
  CANDLE_WICK = 0xffb060;
/** The fight's own state, beside the foe's (one Kaelith at a time). */
interface Fight {
  e: Enemy;
  phase: KaelithPhase;
  wards: PropBox[];
  cracks: Map<PropBox, number>;
  pull: number;
  sun: THREE.Group | null;
  said: Set<string>;
  roles: number;
}
let fight: Fight | null = null;
/** Where it knelt (the browser tests read it: clear of the way out). */
export let kneltAt: { x: number; z: number } | null = null;

/** A new floor (and so a new run) forgets the last fight: a death to Kaelith leaves nothing for the next run to read. */
export function resetKaelith() {
  fight = null;
  kneltAt = null;
  wardHooks.shut = undefined;
}

/** Build Kaelith in its look; its hall's ward pillars go dormant until the seal cracks. */
export function buildKaelith(e: Enemy) {
  const made = !!kaelithMade(),
    L = kaelithLook(),
    P = L.parts;
  e.mats = mergeRig(L.group, L.idle, 'boss:kaelith' + (L.clip ? ':creature' : made ? ':made' : ''), [
    P.eye,
    P.ring,
    P.body,
    P.blade,
    P.mantle,
    P.hand,
    P.head,
  ]);
  for (const m of e.mats) m.userData.base = m.emissive.clone();
  e.model = L.group;
  e.idle = L.idle;
  e.clip = L.clip; // (as its rigged creature: its clips played by its states, updateKaelith)
  e.shadow = L.shadow;
  e.bossSchool = L.school;
  e.body.add(L.group);
  e.eye = P.eye;
  e.ring = P.ring;
  e.halo = P.halo;
  e.parts = P;
  e.bossAff = { weak: C.weak, resist: C.resist };
  e.summoned = true; // (its own horde comes out of the cracks; the boss's call below half health never comes)
  e.state = 'stalk';
  e.st = 1.8;
  e.cycle = 0;
  const wards = (G.room.current.props ?? []).filter((b) => b.prop.kind === 'obelisk');
  for (const w of wards) sealWard(w);
  fight = { e, phase: 1, wards, cracks: new Map(), pull: 0, sun: null, said: new Set(), roles: 0 };
  wardHooks.shut = wardShut;
  bossBarMarks(C.phases);
}

const wait = (s: number) => s * (fight?.phase === 3 ? C.quick : 1);
const shotMul = (e: Enemy) => e.bossCfg?.shotSpeedMul ?? 1;
/** `count` shots over `spread` round the way to the mage (turned by `turn`), from `from` out, hexing `hex`. */
function fan(e: Enemy, count: number, spread: number, speed: number, hex: number, turn = 0, from = 0.9) {
  const base = Math.atan2(player.z - e.z, player.x - e.x) + turn,
    ux = Math.cos(base),
    uz = Math.sin(base);
  for (let i = 0; i < count; i++) {
    const a = base + (count > 1 ? (i / (count - 1) - 0.5) * spread : 0);
    spawnShot(e.x + ux * from, e.z + uz * from, Math.cos(a), Math.sin(a), speed, U, 1, 1.1, { hex });
  }
}
function ring(e: Enemy, n: number, speed: number, offset = 0) {
  for (let i = 0; i < n; i++) {
    const a = offset + (i / n) * Math.PI * 2;
    spawnShot(e.x, e.z, Math.cos(a), Math.sin(a), speed, U, 0.9, 1.2);
  }
}

/** Whether a light falls on (x, z) in `room`: a lit brazier, candle stand or wall light within `r`. */
function litNear(room: Room, x: number, z: number, r: number) {
  for (const b of room.props ?? []) if (b.prop.lit && Math.hypot(b.x - x, b.z - z) < r) return true;
  for (const t of room.torches) if (t.lit && Math.hypot(t.x - x, t.z - z) < r) return true;
  return false;
}
/** Whether (x, z) lies in shadow for it: no light within its reach (in the last light, only the lit candle stands give any). */
function shadowAt(room: Room, x: number, z: number) {
  if (fight?.phase === 3)
    return !(room.props ?? []).some(
      (b) =>
        b.prop.lit &&
        (b.prop.kind === 'candles' || b.prop.kind === 'wetCandles') &&
        Math.hypot(b.x - x, b.z - z) < C.step.light,
    );
  return !litNear(room, x, z, C.step.light);
}
/** A shadow round the mage to rise in, if any. */
function shadowNear(room: Room) {
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2,
      r = C.step.near + Math.random() * (C.step.far - C.step.near),
      at = freeSpotNear(room, player.x + Math.cos(a) * r, player.z + Math.sin(a) * r);
    if (shadowAt(room, at.x, at.z) && Math.hypot(at.x - player.x, at.z - player.z) > C.step.near * 0.8) return at;
  }
  return null;
}
/** Whether the mage stands where the last light can't draw them: within reach of a lit candle stand. */
export const candleSafe = (room: Room = G.room.current) =>
  (room.props ?? []).some(
    (b) =>
      b.prop.lit &&
      (b.prop.kind === 'candles' || b.prop.kind === 'wetCandles') &&
      Math.hypot(b.x - player.x, b.z - player.z) < C.candleSafe,
  );

/** Once, the first time: a line that says what to do. */
function say(key: string, text: string) {
  if (!fight || fight.said.has(key)) return;
  fight.said.add(key);
  line(text, 4.5);
}

/** One step of Kaelith's fight. Returns the way it faces, when that isn't towards the mage. */
export function updateKaelith(e: Enemy, dt: number, ux: number, uz: number): number | undefined {
  if (!fight || fight.e !== e) return;
  const P = e.parts!,
    B = e.bossCfg,
    speed = C.speed * (B?.speedMul ?? 1),
    d = Math.hypot(player.x - e.x, player.z - e.z);
  e.idle?.(e.t);
  e.ring!.rotation.z += dt * (e.state.startsWith('wind') || e.state === 'pull' ? 6 : 1.2);
  const now = phaseOf(Math.max(0, e.hp), e.maxHp, C.phases);
  if (now > fight.phase) enterPhase(e, now);
  if (fight.phase === 2) updateCracks(e, dt);
  if (fight.sun) {
    fight.sun.rotation.y += dt * 0.6;
    fight.sun.position.y = 3.3 + Math.sin(e.t * 1.4) * 0.08;
  }
  switch (e.state) {
    case 'stalk': {
      // it keeps at blade's reach, circling
      const want = d > C.keep + 0.4 ? 1 : d < C.keep - 0.4 ? -0.6 : 0;
      e.vx = (ux * want - uz * 0.35) * speed;
      e.vz = (uz * want + ux * 0.35) * speed;
      P.blade.rotation.x = 0;
      P.mantle.scale.x = 1;
      e.halo!.material.opacity = 0.35;
      e.clip?.('idle', { after: true });
      if (e.st <= 0) {
        e.cycle = e.cycle! + 1;
        const order =
          fight.phase === 3 ? ['windSweep', 'windPull', 'sink', 'windVolley'] : ['windSweep', 'windVolley', 'sink'];
        let next = order[e.cycle % order.length];
        if (next === 'sink' && !(shadowAt(G.room.current, e.x, e.z) && shadowNear(G.room.current))) next = 'windVolley'; // (nowhere dark to go: it stays and fires)
        e.state = next;
        e.st =
          next === 'windSweep'
            ? C.sweep.tell
            : next === 'windVolley'
              ? C.volley.tell
              : next === 'windPull'
                ? 0.6
                : C.step.sink;
        if (next === 'sink') Sfx.at(e.x, e.z).shadowStep();
      }
      break;
    }
    case 'windSweep': {
      // its blade raised, its mantle spread: the cue to get clear
      e.vx = e.vz = 0;
      e.clip?.('sweep', { beat: e.st }); // (as its creature: its blade swept through as the fan goes out)
      const k = 1 - Math.max(0, e.st) / C.sweep.tell;
      P.blade.rotation.x = -k * 1.1;
      P.mantle.scale.x = 1 + k * 0.35;
      e.halo!.material.opacity = 0.35 + k * 0.5;
      if (e.st <= 0) {
        fan(e, C.sweep.count, C.sweep.spread, C.sweep.speed * shotMul(e), C.sweep.hex);
        Sfx.at(e.x, e.z).kaelithSweep();
        G.fx.shake = Math.max(G.fx.shake, 0.15);
        e.state = 'recover';
        e.st = 0.6;
      }
      break;
    }
    case 'windVolley':
      e.vx = e.vz = 0;
      e.clip?.('talk'); // (its free hand casting the volleys)
      if (e.st <= 0) {
        e.state = 'volley';
        e.volleys = B?.volleys ?? 3;
        e.st = 0;
      }
      break;
    case 'volley': // shadow that hexes, a few at a time
      e.vx = e.vz = 0;
      if (e.st <= 0) {
        fan(e, C.volley.count, C.volley.spread, C.volley.speed * shotMul(e), C.volley.hex, e.volleys! % 2 ? 0.1 : -0.1);
        Sfx.at(e.x, e.z).spit();
        e.volleys = e.volleys! - 1;
        e.st = C.volley.every;
        if (e.volleys <= 0) {
          e.state = fight.phase === 2 && !allShut() ? 'hold' : 'stalk';
          e.st = wait(fight.phase === 2 ? C.holdVolley : 1.6);
        }
      }
      break;
    case 'recover':
      e.vx = e.vz = 0;
      P.blade.rotation.x *= 0.9;
      if (e.st <= 0) {
        e.state = 'stalk';
        e.st = wait(1.6);
      }
      break;
    case 'sink': {
      // it sinks into the shadow it stands in
      e.vx = e.vz = 0;
      const k = 1 - Math.max(0, e.st) / C.step.sink;
      P.body.position.y = -k * 1.6;
      P.mantle.scale.x = 1 - k * 0.3;
      if (e.st <= 0) {
        e.hidden = true;
        e.contact = 0;
        e.state = 'gone';
        e.st = C.step.gone;
      }
      break;
    }
    case 'gone': // below: then up in another shadow near the mage
      e.vx = e.vz = 0;
      if (e.st <= 0) {
        const at = shadowNear(G.room.current) ?? { x: e.x, z: e.z };
        e.x = at.x;
        e.z = at.z;
        e.state = 'rise';
        e.st = C.step.rise;
        burst(e.x, 0.3, e.z, U, 14, 2, 0.05);
        Sfx.at(e.x, e.z).shadowStep();
      }
      break;
    case 'rise': {
      e.vx = e.vz = 0;
      const k = Math.max(0, e.st) / C.step.rise;
      P.body.position.y = -k * 1.6;
      if (e.st <= 0) {
        P.body.position.y = 0;
        P.mantle.scale.x = 1;
        e.hidden = false;
        e.contact = 2;
        ring(e, C.step.cuts, C.step.cutSpeed * shotMul(e), Math.random());
        e.state = 'stalk';
        e.st = wait(1.4);
      }
      break;
    }
    case 'toSeal': {
      // the seal cracks: it goes to the hall's middle to hold it shut
      const cx = G.room.current.cx,
        cz = G.room.current.cz - 0.5,
        dx = cx - e.x,
        dz = cz - e.z,
        dd = Math.hypot(dx, dz);
      if (dd > 0.25) {
        e.vx = (dx / dd) * speed * 1.6;
        e.vz = (dz / dd) * speed * 1.6;
      } else {
        e.vx = e.vz = 0;
        e.state = 'hold';
        e.st = wait(C.holdVolley);
      }
      break;
    }
    case 'hold': // one hand on the seal: guarded; volleys while it holds
      e.vx = e.vz = 0;
      P.hand.rotation.x = -0.9;
      e.clip?.('kneel'); // (as its creature it kneels to the seal, which lowers it; else bowed lower)
      P.body.position.y = e.clip ? 0 : -0.25;
      e.guard = C.guard;
      if (e.st <= 0) {
        e.state = 'windVolley';
        e.st = C.volley.tell;
      }
      return Math.atan2(player.x - e.x, player.z - e.z);
    case 'reel': // all four wards shut: thrown open
      e.vx = e.vz = 0;
      e.guard = C.open;
      P.body.position.x = Math.sin(e.t * 30) * 0.04;
      if (e.st <= 0) {
        P.body.position.x = 0;
        e.guard = 1;
        e.state = 'stalk';
        e.st = 1.2;
      }
      break;
    case 'windPull':
      e.vx = e.vz = 0;
      e.clip?.('talk');
      e.halo!.material.opacity = 0.9;
      if (e.st <= 0) {
        e.state = 'pull';
        e.st = C.pullTime;
        Sfx.at(e.x, e.z).eclipsePull();
        say('candles', STR.bosses.kaelith.candlesLine);
      }
      break;
    case 'pull': // the black sun draws the mage in, unless a lit candle stand holds them
      e.vx = e.vz = 0;
      fight.pull = e.st;
      if (!candleSafe()) {
        player.pull.x -= ux * C.pull;
        player.pull.z -= uz * C.pull;
        if (Math.random() < dt * 30) {
          const k = Math.random();
          burst(player.x + (e.x - player.x) * k, 0.9, player.z + (e.z - player.z) * k, U, 1, 0.5, 0.04);
        }
      }
      if (e.st <= 0) {
        fight.pull = 0;
        ring(e, C.ring.count, C.ring.speed * shotMul(e), Math.random());
        Sfx.at(e.x, e.z).kaelithSweep();
        e.state = 'recover';
        e.st = 0.6;
      }
      break;
  }
  return undefined;
}

/** Its health crossed a mark: the seal cracks, or the last light falls. */
function enterPhase(e: Enemy, to: KaelithPhase) {
  const f = fight!,
    S = STR.bosses.kaelith;
  if (to >= 2 && f.phase < 2) {
    // the seal cracks: to the middle, and the wards wake
    f.phase = 2;
    e.hidden = false;
    e.contact = 2;
    e.parts!.body.position.y = 0;
    const held = player.spells.map((id) => (id ? schoolOfSpell(id) : null));
    sealWards(held, mulberry(G.room.current.plan.seed ^ 0x5ea1)).forEach((s, i) => {
      const w = f.wards[i];
      if (w) {
        wakeWard(w, s);
        f.cracks.set(w, C.crackEvery * (0.4 + i * 0.25));
      }
    });
    banner(S.cracks, S.wardsLine);
    Sfx.at(e.x, e.z).sealCrack();
    G.fx.shake = 0.5;
    say('wards', S.wardsLine);
    e.state = f.wards.length ? 'toSeal' : 'stalk';
    e.st = 0; // (a hall without its pillars, the dev menu's: no seal to hold)
  }
  if (to === 3) {
    // the last light
    f.phase = 3;
    e.guard = 1;
    e.hidden = false;
    e.contact = 2;
    e.parts!.hand.rotation.x = 0;
    e.parts!.body.position.y = 0;
    for (const w of f.wards)
      if (!w.prop.broken) {
        sealWard(w);
        f.cracks.delete(w);
      } // (the cracks close, the wards go dark: the seal's fight is over)
    banner(S.lastLight, '');
    Sfx.at(e.x, e.z).eclipsePull();
    if (!G.room.current.candlesLit) setDarkness(1);
    f.sun = blackSun();
    e.group.add(f.sun);
    for (const b of G.room.current.props ?? [])
      if ((b.prop.kind === 'candles' || b.prop.kind === 'wetCandles') && !b.prop.lit) {
        const w = glow(CANDLE_WICK, 0.7, 0.45);
        w.position.y = 1;
        b.prop.mesh.add(w);
      } // (a wick's glow on each unlit stand: the candles must be found in the dark)
    e.state = 'windPull';
    e.st = 0.8;
  }
}

/** The four wards still open let the horde out of their cracks. */
function updateCracks(e: Enemy, dt: number) {
  const f = fight!,
    cur = G.room.current,
    floor = FLOORS[Math.min(G.run.floor, FLOORS.length - 1)];
  for (const [w, t] of f.cracks) {
    const left = t - dt;
    f.cracks.set(w, left);
    if (left > 0) continue;
    f.cracks.set(w, C.crackEvery);
    if (G.room.enemies.filter((s) => s.servant && !s.dead).length >= C.hordeMax) continue; // (counted only when a crack is due)
    const role = (['R', 'W', 'H'] as Role[])[f.roles++ % 3],
      at = freeSpotNear(cur, w.x, w.z + 1.2);
    burst(at.x, 0.2, at.z, SCHOOL_LIGHT[w.prop.ward ?? 'umbral'], 16, 2.2, 0.05);
    Sfx.at(at.x, at.z).rubble();
    makeEnemy(callFoe(floor.foes, role, Math.random), at.x, at.z, floor.enemyHp).servant = true;
    void e;
    break; // (one a step: the cracks take their turns)
  }
}

const allShut = () => !!fight && fight.wards.length > 0 && fight.wards.every((w) => w.prop.broken);
/** A ward shut (struck with its school, or a glyph's blast): its crack closes; with all four shut, Kaelith reels, open. */
function wardShut(box: PropBox) {
  const f = fight;
  if (!f) return;
  box.prop.broken = true;
  f.cracks.delete(box);
  floatText(box.x, 2.6, box.z, STR.bosses.kaelith.shut, SCHOOL_LIGHT[box.prop.ward ?? 'umbral']);
  Sfx.at(box.x, box.z).wardShut();
  if (f.phase === 2 && allShut()) {
    const e = f.e;
    e.state = 'reel';
    e.st = C.reel;
    e.guard = C.open;
    e.parts!.hand.rotation.x = 0;
    e.parts!.body.position.y = 0;
    banner(STR.bosses.kaelith.thrown, '');
    floatText(e.x, 3, e.z, STR.bosses.kaelith.open, 0xffd070);
    G.fx.shake = 0.4;
  }
}

/** The black sun of the last light, over its head: a dark orb, a crown of light and a rim (the eclipse's look). */
function blackSun() {
  const g = new THREE.Group();
  g.position.y = 3.3;
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), new THREE.MeshBasicMaterial({ color: 0x050308 })));
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.035, 6, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd8a0 }),
  );
  rim.rotation.x = Math.PI / 2 - 0.4;
  g.add(rim);
  const crown = glow(0xffc070, 1.8, 0.6);
  g.add(crown);
  return g;
}

/** Kaelith kneels where it fell (`onBossDead`): a figure of its look kneeling (kaelithLooks.ts), its eyes dim, stays in its
    hall; the dark lifts. */
export function kaelithKneels(fell: { x: number; z: number }) {
  const room = G.room.current,
    L = kaelithKneeling();
  // (it kneels where it fell, unless that is where the way out, the heart, the page and the gifts are laid round the hall's
  // middle: then out past them, on its side of the middle, or north of it)
  let at = fell;
  const dx = fell.x - room.cx,
    dz = fell.z - room.cz,
    d = Math.hypot(dx, dz);
  if (d < C.kneelClear)
    at = freeSpotNear(
      room,
      room.cx + (d > 0.5 ? dx / d : 0) * C.kneelClear,
      room.cz + (d > 0.5 ? dz / d : -1) * C.kneelClear,
    );
  L.group.position.set(at.x - room.cx, 0, at.z - room.cz);
  room.group.add(L.group);
  kneltAt = { x: at.x, z: at.z };
  setDarkness(0);
  Sfx.at(at.x, at.z).kneel();
  line(STR.bosses.kaelith.kneels, 5);
  if (fight) {
    wardHooks.shut = undefined;
    fight = null;
  }
}

/** What the dev menu and the browser tests read of the fight. */
export function kaelithInfo() {
  if (!fight) return null;
  const e = fight.e;
  return {
    phase: fight.phase,
    state: e.state,
    guard: e.guard ?? 1,
    hidden: !!e.hidden,
    wards: fight.wards.map((w) => ({ x: w.x, z: w.z, school: w.prop.ward ?? null, shut: !!w.prop.broken })),
    pulling: fight.pull > 0,
    safe: candleSafe(),
    sun: !!fight.sun,
  };
}
/** The dev menu: bring the fight to a phase (its health just under the mark). */
export function kaelithToPhase(to: 2 | 3) {
  if (!fight) return false;
  const e = fight.e;
  e.hp = Math.min(e.hp, e.maxHp * C.phases[to - 2] - 0.01);
  return true;
}
/** The dev menu: shut every ward still open. */
export function shutAllWards() {
  if (!fight) return false;
  for (const w of fight.wards) if (!w.prop.broken && w.prop.ward) wardShut(w);
  return true;
}

/** A spell's school by its id. */
const schoolOfSpell = (id: string) => SPELL_DEFS.find((s) => s.id === id)?.school ?? null;
