import * as THREE from 'three';
import { CFG } from '../config';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { basicMat, blob, glowShared, sphereGeo } from '../render/materials';
import { blockers, pointInBoxes } from '../world/collision';
import { shootDir } from '../input';
import { heroCast } from '../actors/hero';
import { damageEnemy, hurtPlayer } from './damage';
import { burst } from './fx';

/** Hero bolt, alternating between the two "eyes" slightly left and right of centre. */
export function spawnBolt() {
  const dir = shootDir(); if (!dir) return;
  const px = -dir.z, pz = dir.x; player.eye *= -1;
  const mesh = new THREE.Group();
  const b = {
    x: player.x + dir.x * .3 + px * .1 * player.eye, z: player.z + dir.z * .3 + pz * .1 * player.eye, y: .6,
    vx: dir.x * CFG.hero.shotSpeed + player.vx * CFG.hero.shotInherit, vz: dir.z * CFG.hero.shotSpeed + player.vz * CFG.hero.shotInherit,
    r: .12 * player.boltScale, dist: 0, mesh,
  };
  const shadow = blob(.35); shadow.position.y = -b.y + .015;
  mesh.add(new THREE.Mesh(sphereGeo(.1 * player.boltScale), basicMat(player.boltColor)), glowShared(player.boltColor, .75 * player.boltScale, .9), shadow);
  scene.add(mesh); G.bolts.push(b);
  player.squash = 1; heroCast(); Sfx.shoot();
}

/** Enemy projectile. */
export function spawnShot(x: number, z: number, dx: number, dz: number, speed: number, color: number, y = .55, size = 1) {
  const mesh = new THREE.Group();
  const sh = blob(.4); sh.position.y = -y + .015;
  mesh.add(new THREE.Mesh(sphereGeo(.13 * size), basicMat(color)), glowShared(color, .9 * size, .9), sh);
  scene.add(mesh); G.shots.push({ x, z, y, vx: dx * speed, vz: dz * speed, r: .14 * size, color, mesh });
}

export function clearProjectiles() {
  for (const b of G.bolts) scene.remove(b.mesh); G.bolts.length = 0;
  for (const s of G.shots) scene.remove(s.mesh); G.shots.length = 0;
}

export function updateBolts(dt: number) {
  const solids = blockers(G.current, 'bolt');
  for (let i = G.bolts.length - 1; i >= 0; i--) {
    const b = G.bolts[i]; const sp = Math.hypot(b.vx, b.vz);
    b.x += b.vx * dt; b.z += b.vz * dt; b.dist += sp * dt;
    // bolts drop to the floor over the last 30% of their range
    const R = CFG.hero.range, fall = b.dist > R * .7 ? (b.dist - R * .7) / (R * .3) : 0; b.y = .6 * (1 - fall * fall);
    let kill = b.dist >= R || b.y <= .05;
    if (!kill && pointInBoxes(b.x, b.z, 0, solids)) kill = true;
    if (!kill) for (const e of G.enemies) {
      if (e.dead || e.spawn > 0) continue;
      const ey = e.flying ? .8 : .5;
      if (Math.hypot(b.x - e.x, b.z - e.z) < e.r + b.r && Math.abs(b.y - ey) < 1.4) { damageEnemy(e, player.damage, b.vx / sp, b.vz / sp); kill = true; break; }
    }
    b.mesh.position.set(b.x, b.y, b.z); b.mesh.children[2].position.y = -b.y + .015;
    if (kill) { scene.remove(b.mesh); G.bolts.splice(i, 1); burst(b.x, Math.max(.1, b.y), b.z, player.boltColor, 5, 1.6, .05); Sfx.splash(); }
  }
}

export function updateShots(dt: number) {
  const solids = blockers(G.current, 'bolt');
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i]; s.x += s.vx * dt; s.z += s.vz * dt; s.mesh.position.set(s.x, s.y, s.z);
    let kill = pointInBoxes(s.x, s.z, 0, solids);
    if (!kill && Math.hypot(player.x - s.x, player.z - s.z) < player.r + s.r) { hurtPlayer(1, s.x - s.vx, s.z - s.vz); kill = true; }
    if (kill) { scene.remove(s.mesh); G.shots.splice(i, 1); burst(s.x, s.y, s.z, s.color, 4, 1.2, .05); }
  }
}
