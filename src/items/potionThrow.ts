/* A potion thrown (M5, docs/M5-plan.md; GDD: Potions and alchemy): the bottle arcs to where the mage aims and shatters in
   a splash. Its throw effect lands through the hooks the spells use (fireAt, frostAt, shockAt, hallowAt, umbralAt and
   inflict), so a splash lights oil, freezes water, wakes mechanisms and sets off reactions like any spell. While the
   potion key is held a ring shows where it will land. The Grave Draught's thrall, a skeleton that fights for the mage
   until the room is quiet, lives here too. */
import * as THREE from 'three';
import { CFG } from '../config';
import { G, player } from '../state';
import { scene } from '../render/renderer';
import { Sfx } from '../audio/sfx';
import { burst } from '../combat/fx';
import { damageEnemy } from '../combat/damage';
import { blastAt } from '../combat/glyphs';
import { inflict, floatText } from '../magic/statusFx';
import { newStatus } from '../magic/status';
import { ringFx, strikeFx } from '../magic/spellFx';
import { steamAt } from '../magic/steam';
import { aimDir } from '../magic/spells';
import { fireAt, frostAt, shockAt } from '../world/pools';
import { hallowAt, umbralAt } from '../world/mechanisms';
import { layFire } from '../actors/foes';
import { renderHearts } from '../ui/hud';
import { disposeTree } from '../render/materials';
import { mesh, tone } from '../world/kitParts';
import { potionHold } from '../input';
import { POTIONS, isKnown, type PotionDef, type PotionId, type ThrowEffect } from './alchemyData';
import { brewedPotions } from './alchemyMemory';
import { bottleLook } from './alchemyLooks';
import type { Enemy } from '../types';

const A = CFG.alchemy;
interface Flight { id: PotionId; g: THREE.Object3D; x0: number; z0: number; x1: number; z1: number; t: number; room: object }
const flights: Flight[] = [];
interface Storm { x: number; z: number; t: number; next: number; def: PotionDef; room: object }
const storms: Storm[] = [];

/** Where a potion thrown now lands: as far as it reaches along where the mage aims, inside the room. */
export function landing() {
  const d = aimDir(null), b = G.current.bounds;
  return { x: Math.min(b.maxX - .3, Math.max(b.minX + .3, player.x + d.x * A.reach)), z: Math.min(b.maxZ - .3, Math.max(b.minZ + .3, player.z + d.z * A.reach)) };
}

/** Throw a potion: its bottle flies off in an arc. The Alchemist's gift (M5 step 8, `splitThrow`) splits it in two in
    the air: two bottles, landing `CFG.alchemy.split` apart across the aim, each a whole splash. */
export function throwPotion(id: PotionId) {
  const to = landing(), b = G.current.bounds;
  const lands = !player.stats.effects.has('splitThrow') ? [to] : (() => {
    const dx = to.x - player.x, dz = to.z - player.z, d = Math.hypot(dx, dz) || 1, px = -dz / d * A.split / 2, pz = dx / d * A.split / 2;
    return [-1, 1].map(s => ({ x: Math.min(b.maxX - .3, Math.max(b.minX + .3, to.x + px * s)), z: Math.min(b.maxZ - .3, Math.max(b.minZ + .3, to.z + pz * s)) }));
  })();
  for (const at of lands) { const g = bottleLook(G.run.bottles[id]); g.position.set(player.x, 1, player.z); scene.add(g); flights.push({ id, g, x0: player.x, z0: player.z, x1: at.x, z1: at.z, t: 0, room: G.current }); }
  if (lands.length > 1) burst(player.x, 1.2, player.z, 0x7ae070, 6, 1.2, .03); // (the bottle splits as it leaves the hand)
  Sfx.throwPotion();
}

const near = (x: number, z: number, r: number) => G.enemies.filter(e => !e.dead && e.spawn <= 0 && !e.hidden && Math.hypot(e.x - x, e.z - z) < r + e.r);
const mageIn = (x: number, z: number, r: number) => Math.hypot(player.x - x, player.z - z) < r + player.r;
const num = (v: number | string | undefined) => Number(v ?? 0);
const col = (def: PotionDef) => parseInt(def.color.slice(1), 16);

/** Each throw, where it splashes (`r` across). */
const THROW: Record<ThrowEffect, (x: number, z: number, r: number, def: PotionDef) => void> = {
  healSplash(x, z, r, def) {
    hallowAt(x, z, r);
    if (mageIn(x, z, r)) { player.hp = Math.min(player.maxHp, player.hp + num(def.throw.halves)); renderHearts(); floatText(player.x, 1.8, player.z, '+', 0xff8a8a, 40); }
  },
  daze(x, z, r, def) { for (const e of near(x, z, r)) { const s = e.status ??= newStatus(); s.stun = Math.max(s.stun, num(def.throw.seconds)); floatText(e.x, 1.4, e.z, '…', 0x9ec8ff, 30); } },
  firePool(x, z, r, def) { fireAt(x, z, r); layFire(G.current, x, z, num(def.throw.seconds), undefined); for (const e of near(x, z, r)) inflict(e, { burn: 3 }); },
  freezeSplash(x, z, r, def) {
    frostAt(x, z, r);
    for (const e of near(x, z, r)) { inflict(e, { chill: 3 }); const s = e.status ??= newStatus(); s.frozen = Math.max(s.frozen, num(def.throw.seconds)); }
  },
  stormSplash(x, z, _r, def) { storms.push({ x, z, t: num(def.throw.seconds), next: 0, def, room: G.current }); shockAt(x, z, undefined, true); },
  echoSplash(x, z, r) { // each foe in the splash strikes the nearest other foe, as hard as its own touch
    const hit = near(x, z, r);
    for (const e of hit) {
      const o = G.enemies.filter(f => f !== e && !f.dead && f.spawn <= 0 && !f.hidden).sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0];
      if (!o) continue;
      const d = Math.hypot(o.x - e.x, o.z - e.z) || 1;
      strikeFx({ x: e.x, y: .8, z: e.z }, { x: o.x, y: .8, z: o.z }, 0xe8e0c8, .25, true);
      damageEnemy(o, (e.contact || 1) * A.echoMul, (o.x - e.x) / d, (o.z - e.z) / d);
    }
  },
  giantSplash(x, z, r, def) {
    for (const e of near(x, z, r)) {
      if (e.giant) continue; e.giant = true;
      e.speedMul = (e.speedMul ?? 1) * (1 - num(def.throw.speed)); e.model?.scale.multiplyScalar(num(def.throw.scale));
    }
  },
  darkSplash(x, z, r, def) { steamAt(x, z, r * 1.3, num(def.throw.seconds), true); umbralAt(x, z, r); },
  cleanseSplash(x, z, r) {
    for (const e of near(x, z, r)) { if (e.status) Object.assign(e.status, newStatus()); }
    if (mageIn(x, z, r)) Object.assign(player, { chill: 0, stone: 0, dim: 0 });
    burst(x, .6, z, 0xf0e0b0, 14, 2, .05);
  },
  explode(x, z) { blastAt(x, z); },
  hexSplash(x, z, r, def) { umbralAt(x, z, r); for (const e of near(x, z, r)) inflict(e, { hex: num(def.throw.stacks) }); },
  raiseThrall(x, z) { raiseThrall(x, z); },
};

/** A bottle lands: it shatters, its splash rings out in its colour, and its throw effect lands there. */
function splash(f: Flight) {
  const def = POTIONS[f.id], c = col(def), retort = player.stats.effects.has('retort'), r = A.splash * (retort ? A.retort.splashMul : 1);
  Sfx.at(f.x1, f.z1).bottleBreak();
  ringFx(f.x1, .08, f.z1, c, .2, r, .45, true); burst(f.x1, .3, f.z1, c, 18, 2.6, .05); burst(f.x1, .2, f.z1, 0xd8e8f0, retort ? 16 : 8, retort ? 3 : 2, .03); // (glass)
  if (retort) for (const e of near(f.x1, f.z1, r)) damageEnemy(e, A.retort.cut, 0, 0, 0, 'spell'); // (M5 step 8: the Cracked Retort's glass cuts)
  THROW[def.throw.effect](f.x1, f.z1, r, def);
}
/** Dev hook: the bottles in the air, and where each will land. */
export const flightsNow = () => flights.map(f => ({ id: f.id, x: f.x1, z: f.z1 }));

/* ---------- the Grave Draught's thrall ---------- */

interface Thrall { g: THREE.Group; x: number; z: number; cd: number; room: object; legs: THREE.Object3D[]; t: number }
let thrall: Thrall | null = null;
const BONE = 0xe4d8bc;
/** A skeleton rises from the splash and fights for the mage until the room is quiet (or the mage leaves it). */
function raiseThrall(x: number, z: number) {
  if (thrall) dropThrall();
  const g = new THREE.Group(), bone = tone(BONE, .1), dark = tone(0x2a2220);
  mesh(g, new THREE.SphereGeometry(.14, 8, 6), bone, 0, .78, 0); // skull
  for (const s of [-1, 1]) mesh(g, new THREE.SphereGeometry(.035, 5, 4), dark, s * .05, .79, .12); // eye sockets
  mesh(g, new THREE.CylinderGeometry(.04, .05, .34, 6), bone, 0, .5, 0); // spine
  for (let i = 0; i < 3; i++) mesh(g, new THREE.TorusGeometry(.11 - i * .012, .015, 3, 10, Math.PI * 1.4), bone, 0, .58 - i * .07, 0).rotation.set(Math.PI / 2, 0, Math.PI * .8);
  for (const s of [-1, 1]) mesh(g, new THREE.CylinderGeometry(.025, .02, .3, 5), bone, s * .15, .5, 0).rotation.z = s * .25; // arms
  const legs = [-1, 1].map(s => { const l = mesh(g, new THREE.CylinderGeometry(.03, .025, .34, 5), bone, s * .07, .17, 0); return l; });
  g.position.set(x, 0, z); scene.add(g);
  thrall = { g, x, z, cd: .4, room: G.current, legs, t: 0 };
  burst(x, .4, z, 0x7a8a70, 16, 2, .05); Sfx.at(x, z).throwPotion();
}
function dropThrall() {
  if (!thrall) return;
  burst(thrall.x, .4, thrall.z, BONE, 14, 2, .04);
  scene.remove(thrall.g); disposeTree(thrall.g); thrall = null;
}
function updateThrall(dt: number) {
  const t = thrall; if (!t) return;
  if (t.room !== G.current || !G.current.locked && !G.enemies.some(e => !e.dead)) { dropThrall(); return; }
  t.t += dt; t.cd -= dt;
  const e = G.enemies.filter(f => !f.dead && f.spawn <= 0 && !f.hidden).sort((a, b) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z))[0] as Enemy | undefined;
  if (!e) return;
  const dx = e.x - t.x, dz = e.z - t.z, d = Math.hypot(dx, dz) || 1;
  if (d > A.thrall.near) { const s = Math.min(d - A.thrall.near * .8, A.thrall.speed * dt); t.x += dx / d * s; t.z += dz / d * s; }
  else if (t.cd <= 0) { t.cd = A.thrall.every; damageEnemy(e, A.thrall.damage, dx / d, dz / d, .6); burst(e.x, .7, e.z, BONE, 5, 1.4, .03); }
  t.g.position.set(t.x, 0, t.z); t.g.rotation.y = Math.atan2(dx, dz);
  t.legs.forEach((l, i) => { l.rotation.x = Math.sin(t.t * 9 + i * Math.PI) * .5; });
}

/* ---------- the aim, the flights, the storms ---------- */

let marker: THREE.Mesh | null = null;
/** Every step: bottles in flight arc and land; a bottled storm strikes; the thrall fights; and while the potion key is held
    (long enough to throw), a ring shows where the chosen potion will land. */
export function updateThrows(dt: number) {
  for (let i = flights.length - 1; i >= 0; i--) {
    const f = flights[i]; f.t += dt / A.flight;
    const k = Math.min(1, f.t);
    f.g.position.set(f.x0 + (f.x1 - f.x0) * k, .9 + Math.sin(k * Math.PI) * A.arc - .7 * k, f.z0 + (f.z1 - f.z0) * k);
    f.g.rotation.z += dt * 10; f.g.rotation.x += dt * 6;
    if (k >= 1 || f.room !== G.current) {
      scene.remove(f.g); disposeTree(f.g); flights.splice(i, 1);
      if (f.room === G.current) splash(f);
    }
  }
  for (let i = storms.length - 1; i >= 0; i--) {
    const s = storms[i]; s.t -= dt; s.next -= dt;
    if (s.t <= 0 || s.room !== G.current) { storms.splice(i, 1); continue; }
    if (s.next > 0) continue;
    s.next = num(s.def.throw.every);
    const hit = near(s.x, s.z, A.splash * 1.4), e = hit[Math.floor(G.run.alchemy.next() * hit.length)];
    const tx = e ? e.x : s.x + (Math.random() - .5) * A.splash * 2, tz = e ? e.z : s.z + (Math.random() - .5) * A.splash * 2;
    strikeFx({ x: tx, y: 3.2, z: tz }, { x: tx, y: .1, z: tz }, 0xb49aff, .18); Sfx.at(tx, tz).throwPotion();
    if (e) { damageEnemy(e, num(s.def.throw.damage), 0, 0, .3, undefined, 'storm'); inflict(e, { shock: 1 }); }
    shockAt(tx, tz, undefined, true);
  }
  updateThrall(dt);
  // the aim: a ring where it will land, in the potion's colour once it is known
  const aiming = potionHold.since > 0 && performance.now() - potionHold.since > A.hold * 1000 && player.belt.length > 0;
  if (aiming) {
    if (!marker) { marker = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false })); marker.renderOrder = 4; scene.add(marker); }
    const id = player.belt[Math.min(player.beltAt, player.belt.length - 1)] as PotionId;
    (marker.material as THREE.MeshBasicMaterial).color.set(isKnown(id, G.run.identified, brewedPotions()) ? col(POTIONS[id]) : 0xffffff);
    const to = landing(); marker.position.set(to.x, .05, to.z); marker.scale.setScalar(A.splash); marker.visible = true;
  } else if (marker) marker.visible = false;
}

/** A new room or run: nothing left in the air, no storm, no thrall. */
export function clearThrows() {
  for (const f of flights) { scene.remove(f.g); disposeTree(f.g); }
  flights.length = 0; storms.length = 0; dropThrall(); if (marker) marker.visible = false;
}
/** For the tests: what is in the air, the storms, and the thrall. */
export const throwsNow = () => ({ flying: flights.length, storms: storms.length, thrall: !!thrall });
