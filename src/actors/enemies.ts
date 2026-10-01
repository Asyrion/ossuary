import * as THREE from 'three';
import { snagAt } from '../world/props';
import { BOSS_TYPES, CFG, type EnemyType } from '../config';
import { FOES, isFoe, type FoeType } from './foeData';
import { bumpFoe, buildFoe, clearFoeHazards, poseFoe, teleColor, updateFoe, updateFoeHazards } from './foes';
import type { Enemy } from '../types';
import { G, player } from '../state';
import { scene } from '../render/renderer';
import { blob, disposeTree, glow } from '../render/materials';
import { blockers, collide } from '../world/collision';
import type { BossConfig } from '../world/generate';
import { hurtPlayer } from '../combat/damage';
import { onWaveCleared } from '../flow';
import { angleLerp } from '../util';
import { afterBossMove, buildBoss, updateBoss } from './bosses';
import { canAct, speedFactor } from '../magic/status';
import { statusTint } from '../magic/statusFx';
import { mantleShields } from '../magic/shapes';
import { wadeAt } from '../world/pools';
import { saltHolds } from '../combat/familiars';
import { packOf, songHaste } from './bestiaryFoes';

export function stdMat(color: number, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .85, flatShading: true, ...extra });
}

/* The foes: those built in code (M4: actors/foes.ts, data/foes.json), and placeholder primitives: the bosses until theirs
   is built, and two for testing that no floor's fights hold, the rotling (a plain walker with no school: the browser
   tests' target) and the training dummy (the dev menu's: it stands still and never falls). */
/** Spawn an enemy. `hpMul` scales health (deeper floors); `boss` tunes the floor's boss; a champion
    (champion rooms) is bigger, glows, has more health and moves a little faster. */
export function makeEnemy(type: FoeType, x: number, z: number, hpMul = 1, boss?: BossConfig, opts: { champion?: boolean } = {}) {
  const def = isFoe(type) ? FOES[type] : undefined, C = def ?? CFG.enemy[type as EnemyType], CH = CFG.champion;
  const hp = C.hp * hpMul * (boss?.hpMul ?? 1) * (opts.champion ? CH.hpMul : 1);
  const e: Enemy = {
    type, x, z, vx: 0, vz: 0, kx: 0, kz: 0, r: C.r * (opts.champion ? CH.radiusMul : 1), hp, maxHp: hp, bossCfg: boss, flying: false, spawn: .6, t: Math.random() * 10,
    flash: 0, mats: [], group: new THREE.Group(), body: new THREE.Group(), face: 0, contact: 1, state: 'idle', st: 0,
    scale: opts.champion ? CH.scale : 1, speedMul: opts.champion ? CH.speedMul : 1, champion: opts.champion,
  };
  e.group.add(e.body);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); e.body.add(m);
    if (mat instanceof THREE.MeshStandardMaterial) { mat.userData.base = mat.emissive.clone(); e.mats.push(mat); }
    return m;
  };
  if (def) buildFoe(e, def);
  else if (type === 'rotling') {
    const skin = stdMat(0x6f7b5b), pale = stdMat(0x8d917a), eye = new THREE.MeshBasicMaterial({ color: 0xffd35e });
    add(new THREE.SphereGeometry(.32, 10, 8), skin, 0, .38, 0, 1, 1.12, .9);
    add(new THREE.SphereGeometry(.21, 10, 8), pale, 0, .78, .1);
    add(new THREE.SphereGeometry(.045, 6, 5), eye, -.08, .82, .28); add(new THREE.SphereGeometry(.045, 6, 5), eye, .08, .82, .28);
    add(new THREE.CylinderGeometry(.06, .05, .45, 6), skin, -.3, .42, .16).rotation.x = .9;
    add(new THREE.CylinderGeometry(.06, .05, .45, 6), skin, .3, .42, .16).rotation.x = .9;
  } else if (type === 'dummy') { // a straw training dummy on a post: stands still, never falls (dev menu)
    const wood = stdMat(0x6a4a2c), straw = stdMat(0xc8a860), sack = stdMat(0x9a8058);
    add(new THREE.CylinderGeometry(.05, .06, 1.1, 6), wood, 0, .55, 0);
    add(new THREE.CylinderGeometry(.04, .04, .8, 6), wood, 0, .95, 0).rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(.2, .24, .5, 8), straw, 0, .78, 0);
    add(new THREE.SphereGeometry(.17, 10, 8), sack, 0, 1.2, 0);
    add(new THREE.CylinderGeometry(.28, .32, .08, 10), wood, 0, .04, 0);
    e.contact = 0;
  } else if ((BOSS_TYPES as readonly string[]).includes(type)) buildBoss(e, add);
  if (opts.champion) { // an ember glow in the body and a pulsing aura around it
    for (const m of e.mats) { m.userData.base = new THREE.Color(CH.tint); m.emissive.set(CH.tint); }
    e.aura = glow(CH.aura, 1.6, .5); e.aura.position.y = .5; e.group.add(e.aura);
  }
  e.group.add(blob(e.shadow ?? C.r * 3)); e.group.position.set(e.x, 0, e.z); e.group.scale.setScalar(.01); scene.add(e.group);
  G.enemies.push(e); return e;
}

/** Spawn foe `type` at (x, z) as makeEnemy does, or, for one that comes in a pack (M4.5: a firefly swarm), the whole pack
    round it, sharing one mind; returns the first. `roll` (0 to 1) sizes the pack: a room's fights pass one from its seed. */
export function spawnFoe(type: FoeType, x: number, z: number, hpMul = 1, opts: { champion?: boolean } = {}, roll: () => number = Math.random) {
  const pack = isFoe(type) ? FOES[type].pack : undefined;
  if (!pack) return makeEnemy(type, x, z, hpMul, undefined, opts);
  const n = pack[0] + Math.floor(roll() * (pack[1] - pack[0] + 1));
  let first = true;
  return packOf(n, x, z, (px, pz) => { const e = makeEnemy(type, px, pz, hpMul, undefined, first ? opts : {}); first = false; return e; });
}

export function clearEnemies() {
  clearFoeHazards();
  for (const e of G.enemies) { scene.remove(e.group); disposeTree(e.group); }
  G.enemies.length = 0;
}

export function updateEnemies(dt: number) {
  const cur = G.current;
  const walls = blockers(cur, 'flyer'), solids = blockers(cur, 'walker');
  for (const e of G.enemies) {
    // frozen or stunned foes don't move or act; chilled ones move slower
    const acts = canAct(e.status) && !e.asleep, slow = speedFactor(e.status);
    if (acts) e.t += dt;
    if (e.spawn > 0) { e.spawn -= dt; const s = 1 - Math.max(0, e.spawn) / .6; e.group.scale.setScalar((.2 + .8 * (1 - Math.pow(1 - s, 3))) * e.scale); continue; }
    e.group.scale.setScalar(e.scale);
    if (e.aura) e.aura.material.opacity = .45 + Math.sin(e.t * 5) * .15;
    const dx = player.x - e.x, dz = player.z - e.z, dist = Math.hypot(dx, dz) || 1, ux = dx / dist, uz = dz / dist;
    let faceTo = Math.atan2(ux, uz);
    if (!acts || e.type === 'dummy') { e.vx = e.vz = 0; faceTo = e.face; }
    else if (e.foe) faceTo = updateFoe(e, dt, { ux, uz, dist }) ?? faceTo;
    else if (e.type === 'rotling') {
      const wob = Math.sin(e.t * 3.1) * .35; const sp = CFG.enemy.rotling.speed * e.speedMul;
      e.vx = (ux - uz * wob) * sp; e.vz = (uz + ux * wob) * sp;
      e.body.rotation.z = Math.sin(e.t * 6) * .08; e.body.position.y = Math.abs(Math.sin(e.t * 6)) * .04;
    } else if (e.isBoss) faceTo = updateBoss(e, dt, ux, uz) ?? faceTo;
    // integrate + knockback: its pace this step is chill's slowing, walkers wading through water or snagged in cobwebs, and
    // a lark's song or a wolf's howl hastening it (M4.5), all on its step, not its velocity, which many foes build on (one
    // easing in would be slowed again every step, far past the factor)
    const pace = slow * songHaste(e) * (e.flying ? 1 : wadeAt(e.x, e.z) * snagAt(e.x, e.z));
    e.kx *= Math.exp(-8 * dt); e.kz *= Math.exp(-8 * dt);
    e.x += (e.vx * pace + e.kx) * dt; e.z += (e.vz * pace + e.kz) * dt;
    const hit = collide(e, e.flying ? walls : solids);
    saltHolds(e); // (the Salt Circle keeps walkers out)
    if (e.isBoss) afterBossMove(e, hit);
    else if (e.foe) bumpFoe(e, !!hit);
    e.face = angleLerp(e.face, faceTo, 1 - Math.exp(-10 * dt));
    e.group.position.set(e.x, 0, e.z); e.body.rotation.y = e.face;
    // hit flash, else the glow of its statuses
    const tint = e.flash > 0 ? null : statusTint(e, G.simClock);
    if (e.flash > 0) { e.flash -= dt; for (const m of e.mats) m.emissive.setRGB(1, .95, .9); }
    else for (const m of e.mats) { m.emissive.copy(m.userData.base as THREE.Color); if (tint) m.emissive.lerp(tint[0], tint[1]); }
    if (e.foe) { // a foe in code: its telegraph glows in its school's light, and it swells; a hit squashes it
      if (e.tele && e.flash <= 0) { const c = teleColor(e); for (const m of e.mats) m.emissive.lerp(c, e.tele * .75); }
      poseFoe(e);
    }
    // contact damage (not from a boss under the floor or in the air, nor from a foe frozen in ice or stunned, nor
    // through the Static Mantle)
    if (!e.hidden && acts && e.contact && Math.hypot(player.x - e.x, player.z - e.z) < player.r + e.r * .9 && !mantleShields(e)) hurtPlayer(e.contact, e.x, e.z);
  }
  // keep walkers from stacking
  const es = G.enemies;
  for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    const a = es[i], b = es[j]; if (a.flying !== b.flying || a.hidden || b.hidden) continue;
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = a.r + b.r;
    if (d > 0 && d < min) {
      const p = (min - d) / 2 / d; const wa = a.isBoss ? .1 : 1, wb = b.isBoss ? .1 : 1;
      a.x -= dx * p * wa; a.z -= dz * p * wa; b.x += dx * p * wb; b.z += dz * p * wb;
    }
  }
  updateFoeHazards(dt); // (a salamander's burning trail)
  const alive = G.enemies.filter(e => !e.dead);
  if (alive.length !== G.enemies.length) G.enemies = alive;
  if (cur.locked && G.enemies.length === 0) onWaveCleared(cur);
}
