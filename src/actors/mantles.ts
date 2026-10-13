/* Champion mantles in the game (M4.7, docs/archive/M4.7-plan.md; the rules are actors/mantleData.ts, tuning in data/magic.json).
   A mantled champion shows its school: its aura and the glow in its body in the school's light, a ring of runes turning
   under it (a Stormcharged one a ring of crackling lightning and a thundercloud over it; a Hallowed one a halo too), and
   its mantle's name rising as it comes (the first time in a run, a line says what the mantle does and what
   unbinds it). Each step a Kindled champion lays burning ground as it goes and a Hallowed one mends the foes round it;
   struck, a Stormcharged one throws a spark under the mage; falling, a Hexbound one curses the ground round it. The status
   of the school that strips it (statusFx.ts's `inflict`) unbinds it: "Unbound!", stunned, and open to every blow for a
   while (`damageEnemy`). Its shots chill or hex through `shotsBy` (projectiles.ts), its touch chills (enemies.ts). */
import * as THREE from 'three';
import type { Enemy } from '../types';
import { G, after, player } from '../state';
import { CFG } from '../config';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { MAGIC, canHeal, newStatus } from '../magic/status';
import { SCHOOL_LIGHT, lightningField, lit, runeRing, sphere, std } from '../render/arcane';
import { glow } from '../render/materials';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { disposeTree } from '../render/materials';
import { burst } from '../combat/fx';
import { ringFx, strikeFx } from '../magic/spellFx';
import { floatText } from '../magic/statusFx';
import { gainMana } from '../magic/spells';
import { hexDrained } from '../magic/hex';
import { line } from '../notify';
import { layFire, laySpark } from './foes';
import { mantleSchool, type MantleId } from './mantleData';

const M = MAGIC.mantles;
const lightOf = (id: MantleId) => SCHOOL_LIGHT[mantleSchool(id)];

/** Put mantle `id` on champion `e` (just built): the school's light in its body and aura, the rune ring under it, its
    name rising as it comes, and, the first time in a run, the line that says what it does. */
export function giveMantle(e: Enemy, id: MantleId) {
  const light = lightOf(id),
    tint = new THREE.Color(light).multiplyScalar(0.16);
  e.mantle = id;
  e.mantleT = 0;
  for (const m of e.mats) {
    m.userData.base = tint.clone();
    m.emissive.copy(tint);
  }
  e.aura?.material.color.set(light);
  e.mantleRing =
    id === 'stormcharged'
      ? stormLook(e, light)
      : runeRing(e.group, light, (e.r * 1.35) / e.scale, [0, 0.04, 0], 6, [0, 0, 0], lit(light)); // (in its colour, not added light, which a lit floor washes white)
  if (id === 'hallowed') e.mantleRing.add(haloOver(e, light));
  after(0.7, () => {
    if (e.mantle === id && !e.dead) floatText(e.x, 1.9, e.z, STR.foes.mantles[id].name, light);
  });
  if (!G.run.hinted.has('mantle:' + id)) {
    G.run.hinted.add('mantle:' + id);
    after(0.7, () => line(STR.foes.mantles[id].line, CFG.afflict.lineShow));
  }
}

/** How tall `e`'s body stands (for what floats over it). */
/** How tall `e`'s look stands: the top of its meshes (not a spider's thread), its glows left out (a halo round a flame
    would count as twice the creature). */
function heightOf(e: Enemy) {
  const root = e.model ?? e.body,
    b = new THREE.Box3(),
    part = new THREE.Box3();
  root.updateWorldMatrix(true, true);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (o as unknown as THREE.Sprite).isSprite || !o.visible) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    b.union(part.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld));
  });
  return b.isEmpty() ? 1 : Math.min(2.6, Math.max(0.5, b.max.y));
}

/** A Stormcharged champion's look (Stormcharged and Hallowed are near in colour, so they differ in kind, not only light):
    no rune ring but a ring of lightning crackling round its feet, arcs crawling up its body, and a small thundercloud over
    it that strikes down at it now and then (`stormStep`). Drawn as instances: a few draw calls in all. */
interface Storm {
  field: ReturnType<typeof lightningField>;
  cloud: THREE.Group;
  flash: THREE.Sprite;
  r: number;
  top: number;
  t: number;
  strike: number;
  seed: number;
}
const storms = new WeakMap<THREE.Object3D, Storm>();
function stormLook(e: Enemy, light: number) {
  const g = new THREE.Group(),
    r = (e.r * 1.35) / e.scale,
    top = heightOf(e),
    S = CFG.mantleLooks.storm;
  e.group.add(g);
  const field = lightningField(g, light, S.segments);
  const cloud = new THREE.Group();
  cloud.position.y = top + S.cloudOver;
  g.add(cloud);
  const puffs = [
    [0, 0, 0, 0.3],
    [0.26, -0.03, 0.05, 0.22],
    [-0.25, -0.02, -0.04, 0.24],
    [0.08, 0.08, -0.12, 0.2],
    [-0.08, 0.02, 0.16, 0.18],
  ].map(([x, y, z, k]) => sphere(k * S.cloudSize, 8, 6).translate(x * S.cloudSize, y * S.cloudSize, z * S.cloudSize));
  const geo = mergeGeometries(puffs);
  for (const p of puffs) p.dispose();
  cloud.add(new THREE.Mesh(geo, std(0x40465a, { emissive: 0x141824 })));
  const flash = glow(light, S.cloudSize * 2.2, 0);
  flash.position.y = -0.05;
  cloud.add(flash);
  storms.set(g, {
    field,
    cloud,
    flash,
    r,
    top,
    t: 0,
    strike: S.strikeEvery * Math.random(),
    seed: Math.random() * 1e6,
  });
  return g;
}
/** Every step: the lightning crackles anew a dozen times a second, the cloud drifts and now and then strikes down. */
function stormStep(e: Enemy, dt: number) {
  const st = e.mantleRing && storms.get(e.mantleRing);
  if (!st) return;
  const S = CFG.mantleLooks.storm;
  st.t -= dt;
  st.strike -= dt;
  st.cloud.position.x = Math.sin(G.flow.clock * 0.9) * 0.08;
  st.cloud.rotation.y += dt * 0.6;
  st.flash.material.opacity = Math.max(0, st.flash.material.opacity - dt * 4);
  if (st.t > 0) return;
  st.t = S.flicker;
  let seed = (st.seed = (st.seed * 16807 + 1) % 2147483647);
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const f = st.field,
    r = st.r,
    a0 = rnd() * Math.PI * 2,
    n = S.ringBolts,
    at = (a: number, rr = r): [number, number, number] => [Math.cos(a) * rr, 0.05, Math.sin(a) * rr];
  f.begin();
  for (let i = 0; i < n; i++)
    if (rnd() < 0.8) f.bolt(at(a0 + (i / n) * Math.PI * 2), at(a0 + ((i + 1) / n) * Math.PI * 2), 2, r * 0.14, rnd); // (the ring, with gaps)
  for (let i = 0; i < S.arcs; i++)
    if (rnd() < 0.65) {
      const a = rnd() * Math.PI * 2;
      f.bolt(
        [Math.cos(a) * r * 0.3, st.top * (0.35 + rnd() * 0.45), Math.sin(a) * r * 0.3],
        at(a + (rnd() - 0.5), r * 0.95),
        4,
        0.1,
        rnd,
      );
    } // (arcs crawling down its body to the ground)
  if (st.strike <= 0) {
    // the cloud strikes down at it
    st.strike = S.strikeEvery * (0.6 + rnd() * 0.8);
    st.flash.material.opacity = 0.9;
    f.bolt([st.cloud.position.x, st.cloud.position.y - 0.1, 0], [0, st.top * 0.8, 0], 5, 0.12, rnd);
    if (G.current && Math.hypot(player.x - e.x, player.z - e.z) < 9) Sfx.at(e.x, e.z).zap();
  }
  f.end();
}
/** A Hallowed champion's halo: a ring of gold over its head, as a saint's, breathing with its light. */
function haloOver(e: Enemy, light: number) {
  const H = CFG.mantleLooks.halo,
    top = heightOf(e),
    m = new THREE.Mesh(new THREE.TorusGeometry(H.size, H.size * 0.12, 6, 28), lit(light));
  m.rotation.x = -Math.PI / 2;
  m.position.y = top + H.over;
  m.name = 'halo';
  const g = glow(light, H.size * 3, 0.35);
  m.add(g);
  return m;
}

/** A status of the school that strips it landed on `e`: the mantle goes, the champion is stunned and open a while. */
export function unbind(e: Enemy) {
  const id = e.mantle;
  if (!id) return;
  const light = lightOf(id),
    U = MAGIC.unbound,
    CH = CFG.champion;
  e.mantle = undefined;
  e.unbound = U.time;
  const s = (e.status ??= newStatus());
  s.stun = Math.max(s.stun, U.stun);
  if (e.mantleRing) {
    e.group.remove(e.mantleRing);
    disposeTree(e.mantleRing);
    e.mantleRing = undefined;
  }
  for (const m of e.mats) {
    const c = new THREE.Color(CH.tint);
    m.userData.base = c;
    m.emissive.copy(c);
  }
  e.aura?.material.color.set(CH.aura);
  floatText(e.x, 1.9, e.z, STR.foes.unbound, light, 34);
  burst(e.x, 0.9, e.z, light, 22, 3, 0.05);
  ringFx(e.x, 0.1, e.z, light, 0.3, 1.8, CFG.spellFx.ring, true);
  Sfx.at(e.x, e.z).unbound();
}

/** A status its mantle keeps off landed on `e`: a puff in its light, and now and then the word. */
export function shrugOff(e: Enemy) {
  burst(e.x, 0.8, e.z, lightOf(e.mantle!), 4, 1.2, 0.03);
  if (G.flow.clock - (e.saidAt ?? -9) > 1.5) {
    e.saidAt = G.flow.clock;
    floatText(e.x, 1.7, e.z, STR.foes.shrugs, lightOf(e.mantle!));
  }
}

/** `e` was struck by the mage: a Stormcharged champion throws a spark under the mage (now and then). */
export function mantleStruck(e: Enemy) {
  if (e.mantle !== 'stormcharged' || e.dead || (e.mantleT ?? 0) > 0) return;
  const S = M.stormcharged;
  e.mantleT = S.sparkEvery;
  laySpark(G.current, player.x, player.z, S.sparkTime, e.foe?.id);
  strikeFx({ x: e.x, y: 1, z: e.z }, { x: player.x, y: 0.05, z: player.z }, SCHOOL_LIGHT.storm, 0.22, true);
  Sfx.at(e.x, e.z).zap();
}

/** `e` fell: a Hexbound champion's curse closes on the ground round it, draining the mage's mana if it is still inside. */
export function mantleFell(e: Enemy) {
  if (e.mantle !== 'hexbound') return;
  const H = M.hexbound,
    x = e.x,
    z = e.z,
    room = G.current,
    violet = SCHOOL_LIGHT.umbral;
  ringFx(x, 0.08, z, violet, H.curseReach, 0.2, H.curseDelay, true);
  burst(x, 0.5, z, violet, 16, 1.6, 0.04);
  Sfx.at(x, z).curse();
  after(H.curseDelay, () => {
    if (G.current !== room || G.flow.state !== 'play') return;
    burst(x, 0.3, z, violet, 20, H.curseReach, 0.05);
    if (Math.hypot(player.x - x, player.z - z) < H.curseReach) {
      const took = Math.min(player.mana, H.curse);
      gainMana(-H.curse);
      hexDrained(took, { x, z });
    }
  });
}

/** Every step, for the mantled champions in the room: their rings turn, a Kindled one lays fire where it goes, a Hallowed
    one mends the foes round it; and the unbound ones close up again. */
export function updateMantles(dt: number) {
  for (const e of G.enemies) {
    if (e.unbound) e.unbound = Math.max(0, e.unbound - dt);
    if (!e.mantle || e.dead || e.spawn > 0) continue;
    e.mantleT = (e.mantleT ?? 0) - dt;
    // (Stormcharged and Hallowed are near in colour, so they differ in kind: a storm's crackling ring, arcs and thundercloud;
    // a saint's rune ring that breathes, a halo over its head and motes rising)
    if (e.mantle === 'stormcharged') {
      stormStep(e, dt);
      if (Math.random() < dt * 4)
        burst(
          e.x + (Math.random() - 0.5) * e.r * 2,
          0.15,
          e.z + (Math.random() - 0.5) * e.r * 2,
          SCHOOL_LIGHT.storm,
          2,
          2.2,
          0.025,
        );
    } else if (e.mantleRing) e.mantleRing.rotation.y += dt * 0.8;
    if (e.mantle === 'hallowed') {
      if (e.mantleRing) e.mantleRing.scale.setScalar(1 + Math.sin(G.flow.clock * 2.4) * 0.08);
      if (Math.random() < dt * 2.5)
        burst(
          e.x + (Math.random() - 0.5) * e.r * 1.6,
          0.3,
          e.z + (Math.random() - 0.5) * e.r * 1.6,
          SCHOOL_LIGHT.hallow,
          1,
          0.5,
          0.03,
        );
    }
    if (e.mantle === 'kindled' && e.mantleT <= 0 && Math.hypot(e.vx, e.vz) > 0.3 && !e.hidden) {
      e.mantleT = M.kindled.trailEvery;
      layFire(G.current, e.x, e.z, M.kindled.trailTime, e.foe?.id);
    }
    if (e.mantle === 'hallowed' && e.mantleT <= 0) {
      e.mantleT = M.hallowed.mendEvery;
      if ((e.status?.sanct ?? 0) > 0) continue; // (its own school's light on it stills its mending)
      for (const o of G.enemies) {
        if (
          o === e ||
          o.dead ||
          o.hidden ||
          o.hp >= o.maxHp ||
          !canHeal(o.status) ||
          Math.hypot(o.x - e.x, o.z - e.z) > M.hallowed.mendReach
        )
          continue;
        o.hp = Math.min(o.maxHp, o.hp + M.hallowed.mend * (o.isBoss ? M.hallowed.bossShare : 1));
        burst(o.x, 0.9, o.z, SCHOOL_LIGHT.hallow, 5, 1.2, 0.03);
      }
    }
  }
}
