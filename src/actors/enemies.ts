import * as THREE from 'three';
import { snagAt } from '../world/props';
import { BOSS_TYPES, CFG, type EnemyType } from '../config';
import { FOES, isFoe, type FoeType } from './foeData';
import { bumpFoe, buildFoe, poseFoe, teleColor, updateFoe } from './foes';
import type { Enemy } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { blob, disposeTree, glow } from '../render/materials';
import { blockers, collide } from '../world/collision';
import { randomSpot } from '../world/rooms';
import type { BossConfig } from '../world/generate';
import { spawnShot } from '../combat/projectiles';
import { hurtPlayer } from '../combat/damage';
import { onWaveCleared } from '../flow';
import { angleLerp, lerp, rand } from '../util';
import { afterBossMove, buildBoss, updateBoss } from './bosses';
import { canAct, speedFactor } from '../magic/status';
import { statusTint } from '../magic/statusFx';
import { mantleShields } from '../magic/shapes';
import { wadeAt } from '../world/pools';

export function stdMat(color: number, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .85, flatShading: true, ...extra });
}

/* The foes: those built in code (M4: actors/foes.ts, data/foes.json) and the placeholder primitives they replace (the
   old three, the bosses until theirs is built, the training dummy). */
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
  } else if (type === 'wisp') {
    const W = CFG.enemy.wisp;
    e.flying = true; e.contact = 1;
    const shell = stdMat(0x2a1f35, { emissive: 0x3c1f5c, transparent: true, opacity: .88, flatShading: false, roughness: .4 });
    add(new THREE.SphereGeometry(.28, 14, 12), shell, 0, 0, 0);
    e.core = add(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xe0c2ff }), 0, 0, .12);
    e.halo = glow(0xa266ff, 1.3, .7); e.body.add(e.halo); e.body.position.y = .8;
    e.target = { x, z }; e.fireT = rand(W.fireMin, W.fireMax) * .7;
  } else if (type === 'hound') {
    const hide = stdMat(0x57463c), bone = stdMat(0xd8ccb2), eye = new THREE.MeshBasicMaterial({ color: 0xff4a32 });
    add(new THREE.SphereGeometry(.3, 10, 8), hide, 0, .36, 0, .85, .6, 1.35);
    add(new THREE.SphereGeometry(.2, 10, 8), bone, 0, .45, .44, .9, .85, 1.15);
    add(new THREE.SphereGeometry(.04, 6, 5), eye, -.08, .52, .6); add(new THREE.SphereGeometry(.04, 6, 5), eye, .08, .52, .6);
    for (let i = 0; i < 3; i++) add(new THREE.ConeGeometry(.05, .18, 5), bone, 0, .6, -.2 + i * .18);
    for (const [lx, lz] of [[-.16, .22], [.16, .22], [-.16, -.22], [.16, -.22]]) add(new THREE.CylinderGeometry(.045, .035, .3, 5), hide, lx, .15, lz);
    e.dir = { x: 1, z: 0 }; e.state = 'wander'; e.st = rand(.5, 1.5);
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
  e.group.add(blob(e.shadow ?? C.r * 3)); e.group.position.set(x, 0, z); e.group.scale.setScalar(.01); scene.add(e.group);
  G.enemies.push(e); return e;
}

export function clearEnemies() {
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
    } else if (e.type === 'wisp') {
      const C = CFG.enemy.wisp; const tg = e.target!;
      if (Math.hypot(tg.x - e.x, tg.z - e.z) < .3 || Math.random() < dt * .3) e.target = randomSpot(cur);
      const tx = e.target!.x - e.x, tz = e.target!.z - e.z, tl = Math.hypot(tx, tz) || 1;
      e.vx = lerp(e.vx, tx / tl * C.speed * e.speedMul, dt * 2); e.vz = lerp(e.vz, tz / tl * C.speed * e.speedMul, dt * 2);
      e.body.position.y = .8 + Math.sin(e.t * 2.4) * .1;
      e.fireT! -= dt; const ft = e.fireT!;
      const tele = ft < .45 && ft > 0;
      e.core!.scale.setScalar(tele ? 1 + (.45 - ft) * 2.2 : 1); e.halo!.material.opacity = tele ? 1 : .6 + Math.sin(e.t * 9) * .1;
      if (ft <= 0) { spawnShot(e.x + ux * .3, e.z + uz * .3, ux, uz, C.shotSpeed, 0xb784ff, .8); Sfx.at(e.x, e.z).enemyShot(); e.fireT = rand(C.fireMin, C.fireMax); }
    } else if (e.type === 'hound') {
      const C = CFG.enemy.hound; e.st -= dt; const dir = e.dir!;
      if (e.state === 'wander') {
        e.vx = dir.x * C.speed * e.speedMul; e.vz = dir.z * C.speed * e.speedMul; faceTo = Math.atan2(dir.x, dir.z);
        if (e.st <= 0) { const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.random() * 4 | 0]; e.dir = { x: d[0], z: d[1] }; e.st = rand(.8, 1.8); }
        const alignedX = Math.abs(dz) < .45, alignedZ = Math.abs(dx) < .45;
        if ((alignedX || alignedZ) && dist < 9) { e.state = 'tell'; e.st = .3; e.dir = alignedX ? { x: Math.sign(dx), z: 0 } : { x: 0, z: Math.sign(dz) }; Sfx.at(e.x, e.z).charge(); }
        e.body.position.y = Math.abs(Math.sin(e.t * 9)) * .03;
      } else if (e.state === 'tell') {
        e.vx = e.vz = 0; faceTo = Math.atan2(dir.x, dir.z); e.body.position.x = Math.sin(e.t * 60) * .03;
        if (e.st <= 0) { e.state = 'charge'; e.body.position.x = 0; }
      } else if (e.state === 'charge') {
        e.vx = dir.x * C.charge * e.speedMul; e.vz = dir.z * C.charge * e.speedMul; faceTo = Math.atan2(dir.x, dir.z);
        e.body.rotation.x = .15;
      } else if (e.state === 'stun') {
        e.vx = e.vz = 0; faceTo = e.face; e.body.rotation.x = 0; e.body.rotation.z = Math.sin(e.t * 20) * .1;
        if (e.st <= 0) { e.state = 'wander'; e.st = rand(.6, 1.2); e.body.rotation.z = 0; }
      }
    } else if (e.isBoss) faceTo = updateBoss(e, dt, ux, uz) ?? faceTo;
    e.vx *= slow; e.vz *= slow;
    if (!e.flying) { const w = wadeAt(e.x, e.z) * snagAt(e.x, e.z); e.vx *= w; e.vz *= w; } // walkers wade through water, snag in cobwebs
    // integrate + knockback
    e.kx *= Math.exp(-8 * dt); e.kz *= Math.exp(-8 * dt);
    e.x += (e.vx + e.kx) * dt; e.z += (e.vz + e.kz) * dt;
    const hit = collide(e, e.flying ? walls : solids);
    if (e.type === 'hound') {
      if (e.state === 'charge' && hit) { e.state = 'stun'; e.st = .7; G.shake = Math.max(G.shake, .12); Sfx.at(e.x, e.z).hit(); }
      else if (e.state === 'wander' && hit) { e.dir = { x: -e.dir!.x, z: -e.dir!.z }; }
    } else if (e.isBoss) afterBossMove(e, hit);
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
  const alive = G.enemies.filter(e => !e.dead);
  if (alive.length !== G.enemies.length) G.enemies = alive;
  if (cur.locked && G.enemies.length === 0) onWaveCleared(cur);
}
