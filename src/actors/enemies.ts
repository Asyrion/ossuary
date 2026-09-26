import * as THREE from 'three';
import { CFG, type EnemyType } from '../config';
import type { Enemy } from '../types';
import { G, after, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { blob, disposeTree, glow } from '../render/materials';
import { collide, colliders } from '../world/collision';
import { HD, HW } from '../world/dims';
import { spawnShot } from '../combat/projectiles';
import { hurtPlayer } from '../combat/damage';
import { onRoomCleared } from '../flow';
import { banner } from '../ui/hud';
import { angleLerp, lerp, rand } from '../util';

function stdMat(color: number, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .85, flatShading: true, ...extra });
}

/* Placeholder primitive foes. M2 replaces these with Tripo models. */
export function makeEnemy(type: EnemyType, x: number, z: number) {
  const C = CFG.enemy[type];
  const e: Enemy = {
    type, x, z, vx: 0, vz: 0, kx: 0, kz: 0, r: C.r, hp: C.hp, maxHp: C.hp, flying: false, spawn: .6, t: Math.random() * 10,
    flash: 0, mats: [], group: new THREE.Group(), body: new THREE.Group(), face: 0, contact: 1, state: 'idle', st: 0,
  };
  e.group.add(e.body);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); e.body.add(m);
    if (mat instanceof THREE.MeshStandardMaterial) { mat.userData.base = mat.emissive.clone(); e.mats.push(mat); }
    return m;
  };
  if (type === 'rotling') {
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
  } else if (type === 'warden') {
    e.contact = 2; e.isBoss = true;
    const iron = stdMat(0x3d3b42, { metalness: .6, roughness: .45 }), dark = stdMat(0x1e1c20, { metalness: .4 }), bone = stdMat(0xcfc2a6);
    add(new THREE.CylinderGeometry(.5, .78, 1.4, 8), iron, 0, .72, 0);
    add(new THREE.SphereGeometry(.34, 10, 8), iron, -.6, 1.35, 0, 1, .8, 1); add(new THREE.SphereGeometry(.34, 10, 8), iron, .6, 1.35, 0, 1, .8, 1);
    add(new THREE.CylinderGeometry(.28, .34, .5, 6), dark, 0, 1.7, 0);
    add(new THREE.ConeGeometry(.09, .45, 6), bone, -.26, 2.02, 0).rotation.z = .5;
    add(new THREE.ConeGeometry(.09, .45, 6), bone, .26, 2.02, 0).rotation.z = -.5;
    e.eye = add(new THREE.BoxGeometry(.36, .06, .05), new THREE.MeshBasicMaterial({ color: 0xff5a2a }), 0, 1.74, .3);
    e.ring = new THREE.Mesh(new THREE.TorusGeometry(.55, .035, 6, 32), new THREE.MeshBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: .8 }));
    e.ring.position.set(0, 1.75, -.25); e.body.add(e.ring);
    e.halo = glow(0xff4a1a, 2.2, .35); e.halo.position.set(0, 1.7, -.2); e.body.add(e.halo);
    e.state = 'walk'; e.st = 2.2; e.cycle = 0; e.summoned = false;
  }
  e.group.add(blob(C.r * 3)); e.group.position.set(x, 0, z); e.group.scale.setScalar(.01); scene.add(e.group);
  G.enemies.push(e); return e;
}

export function clearEnemies() {
  for (const e of G.enemies) { scene.remove(e.group); disposeTree(e.group); }
  G.enemies.length = 0;
}

export function updateEnemies(dt: number) {
  const cur = G.current;
  const walls = colliders(cur, false), solids = colliders(cur, true);
  for (const e of G.enemies) {
    e.t += dt;
    if (e.spawn > 0) { e.spawn -= dt; const s = 1 - Math.max(0, e.spawn) / .6; e.group.scale.setScalar(.2 + .8 * (1 - Math.pow(1 - s, 3))); continue; }
    e.group.scale.setScalar(1);
    const dx = player.x - e.x, dz = player.z - e.z, dist = Math.hypot(dx, dz) || 1, ux = dx / dist, uz = dz / dist;
    let faceTo = Math.atan2(ux, uz);
    if (e.type === 'rotling') {
      const wob = Math.sin(e.t * 3.1) * .35; const sp = CFG.enemy.rotling.speed;
      e.vx = (ux - uz * wob) * sp; e.vz = (uz + ux * wob) * sp;
      e.body.rotation.z = Math.sin(e.t * 6) * .08; e.body.position.y = Math.abs(Math.sin(e.t * 6)) * .04;
    } else if (e.type === 'wisp') {
      const C = CFG.enemy.wisp; const tg = e.target!;
      if (Math.hypot(tg.x - e.x, tg.z - e.z) < .3 || Math.random() < dt * .3) e.target = { x: cur.cx + rand(-HW + 1, HW - 1), z: cur.cz + rand(-HD + 1, HD - 1) };
      const tx = e.target!.x - e.x, tz = e.target!.z - e.z, tl = Math.hypot(tx, tz) || 1;
      e.vx = lerp(e.vx, tx / tl * C.speed, dt * 2); e.vz = lerp(e.vz, tz / tl * C.speed, dt * 2);
      e.body.position.y = .8 + Math.sin(e.t * 2.4) * .1;
      e.fireT! -= dt; const ft = e.fireT!;
      const tele = ft < .45 && ft > 0;
      e.core!.scale.setScalar(tele ? 1 + (.45 - ft) * 2.2 : 1); e.halo!.material.opacity = tele ? 1 : .6 + Math.sin(e.t * 9) * .1;
      if (ft <= 0) { spawnShot(e.x + ux * .3, e.z + uz * .3, ux, uz, C.shotSpeed, 0xb784ff, .8); Sfx.enemyShot(); e.fireT = rand(C.fireMin, C.fireMax); }
    } else if (e.type === 'hound') {
      const C = CFG.enemy.hound; e.st -= dt; const dir = e.dir!;
      if (e.state === 'wander') {
        e.vx = dir.x * C.speed; e.vz = dir.z * C.speed; faceTo = Math.atan2(dir.x, dir.z);
        if (e.st <= 0) { const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.random() * 4 | 0]; e.dir = { x: d[0], z: d[1] }; e.st = rand(.8, 1.8); }
        const alignedX = Math.abs(dz) < .45, alignedZ = Math.abs(dx) < .45;
        if ((alignedX || alignedZ) && dist < 9) { e.state = 'tell'; e.st = .3; e.dir = alignedX ? { x: Math.sign(dx), z: 0 } : { x: 0, z: Math.sign(dz) }; Sfx.charge(); }
        e.body.position.y = Math.abs(Math.sin(e.t * 9)) * .03;
      } else if (e.state === 'tell') {
        e.vx = e.vz = 0; faceTo = Math.atan2(dir.x, dir.z); e.body.position.x = Math.sin(e.t * 60) * .03;
        if (e.st <= 0) { e.state = 'charge'; e.body.position.x = 0; }
      } else if (e.state === 'charge') {
        e.vx = dir.x * C.charge; e.vz = dir.z * C.charge; faceTo = Math.atan2(dir.x, dir.z);
        e.body.rotation.x = .15;
      } else if (e.state === 'stun') {
        e.vx = e.vz = 0; faceTo = e.face; e.body.rotation.x = 0; e.body.rotation.z = Math.sin(e.t * 20) * .1;
        if (e.st <= 0) { e.state = 'wander'; e.st = rand(.6, 1.2); e.body.rotation.z = 0; }
      }
    } else if (e.type === 'warden') updateWarden(e, dt, ux, uz);
    // integrate + knockback
    e.kx *= Math.exp(-8 * dt); e.kz *= Math.exp(-8 * dt);
    e.x += (e.vx + e.kx) * dt; e.z += (e.vz + e.kz) * dt;
    const hit = collide(e, e.flying ? walls : solids);
    if (e.type === 'hound') {
      if (e.state === 'charge' && hit) { e.state = 'stun'; e.st = .7; G.shake = Math.max(G.shake, .12); Sfx.hit(); }
      else if (e.state === 'wander' && hit) { e.dir = { x: -e.dir!.x, z: -e.dir!.z }; }
    }
    e.face = angleLerp(e.face, faceTo, 1 - Math.exp(-10 * dt));
    e.group.position.set(e.x, 0, e.z); e.body.rotation.y = e.face;
    // hit flash
    if (e.flash > 0) { e.flash -= dt; for (const m of e.mats) m.emissive.setRGB(1, .95, .9); }
    else for (const m of e.mats) m.emissive.copy(m.userData.base as THREE.Color);
    // contact damage
    if (Math.hypot(player.x - e.x, player.z - e.z) < player.r + e.r * .9) hurtPlayer(e.contact, e.x, e.z);
  }
  // keep walkers from stacking
  const es = G.enemies;
  for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    const a = es[i], b = es[j]; if (a.flying !== b.flying) continue;
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = a.r + b.r;
    if (d > 0 && d < min) {
      const p = (min - d) / 2 / d; const wa = a.isBoss ? .1 : 1, wb = b.isBoss ? .1 : 1;
      a.x -= dx * p * wa; a.z -= dz * p * wa; b.x += dx * p * wb; b.z += dz * p * wb;
    }
  }
  const alive = G.enemies.filter(e => !e.dead);
  if (alive.length !== G.enemies.length) G.enemies = alive;
  if (cur.locked && G.enemies.length === 0) onRoomCleared(cur);
}

function updateWarden(e: Enemy, dt: number, ux: number, uz: number) {
  const C = CFG.enemy.warden; e.st -= dt;
  const hpFrac = e.hp / e.maxHp;
  const ring = e.ring!, eye = e.eye!, halo = e.halo!;
  ring.rotation.z += dt * (e.state.startsWith('wind') ? 6 : 1.2);
  if (!e.summoned && hpFrac < .5) {
    e.summoned = true; Sfx.boom(); G.shake = .25; banner(...STR.banner.summon);
    for (const sx of [-4, 4]) makeEnemy('rotling', G.current.cx + sx, G.current.cz + 1.5);
  }
  if (e.state === 'walk') {
    e.vx = ux * C.speed * (hpFrac < .5 ? 1.25 : 1); e.vz = uz * C.speed * (hpFrac < .5 ? 1.25 : 1);
    e.body.position.y = Math.abs(Math.sin(e.t * 4)) * .05; eye.scale.set(1, 1, 1); halo.material.opacity = .35;
    if (e.st <= 0) { e.cycle = e.cycle! + 1; e.state = e.cycle % 2 ? 'windBurst' : 'windAim'; e.st = e.state === 'windBurst' ? .75 : .5; }
  } else if (e.state === 'windBurst' || e.state === 'windAim') {
    e.vx = e.vz = 0; const k = 1 - e.st / .75; halo.material.opacity = .35 + k * .6; eye.scale.set(1 + k, 1 + k * 2, 1);
    e.body.position.y = 0; e.body.position.x = Math.sin(e.t * 50) * .02;
    if (e.st <= 0) {
      e.body.position.x = 0;
      if (e.state === 'windBurst') {
        const n = 12, off = Math.random() * Math.PI;
        for (let i = 0; i < n; i++) { const a = off + i / n * Math.PI * 2; spawnShot(e.x, e.z, Math.cos(a), Math.sin(a), 3.4, 0xff6a3a, .9, 1.25); }
        if (hpFrac < .6) after(.32, () => {
          if (e.dead || G.state !== 'play') return;
          for (let i = 0; i < n; i++) { const a = off + (i + .5) / n * Math.PI * 2; spawnShot(e.x, e.z, Math.cos(a), Math.sin(a), 3, 0xff6a3a, .9, 1.25); }
        });
        Sfx.boom(); G.shake = .18; e.state = 'walk'; e.st = 2.1;
      } else { e.state = 'volley'; e.volleys = 3; e.st = 0; }
    }
  } else if (e.state === 'volley') {
    e.vx = e.vz = 0;
    if (e.st <= 0) {
      const base = Math.atan2(uz, ux);
      for (const d of [-.28, 0, .28]) spawnShot(e.x + ux * .8, e.z + uz * .8, Math.cos(base + d), Math.sin(base + d), 4.4, 0xff6a3a, 1, 1.1);
      Sfx.enemyShot(); e.volleys = e.volleys! - 1; e.st = .3; if (e.volleys <= 0) { e.state = 'walk'; e.st = 2.4; }
    }
  }
}
