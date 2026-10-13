import * as THREE from 'three';
import { G } from '../state';
import { scene } from '../render/renderer';
import { clamp, rand } from '../util';

const PGEO = new THREE.BoxGeometry(1, 1, 1);
PGEO.userData.shared = true;
/** Spray of small cubes that fall and fade. */
export function burst(x: number, y: number, z: number, color: number, n: number, spd: number, size: number) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(PGEO, new THREE.MeshBasicMaterial({ color, transparent: true }));
    const s = size * rand(0.5, 1.3);
    m.scale.setScalar(s);
    m.position.set(x, y, z);
    scene.add(m);
    const a = Math.random() * Math.PI * 2,
      v = rand(0.3, 1) * spd;
    G.particles.push({ m, vx: Math.cos(a) * v, vy: rand(1, 3.5), vz: Math.sin(a) * v, life: rand(0.4, 0.8) });
  }
}

export function updateParticles(dt: number) {
  const ps = G.particles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    p.life -= dt;
    p.vy -= 9 * dt;
    p.m.position.x += p.vx * dt;
    p.m.position.y = Math.max(0.02, p.m.position.y + p.vy * dt);
    p.m.position.z += p.vz * dt;
    if (p.m.position.y <= 0.02) {
      p.vx *= 0.8;
      p.vz *= 0.8;
      p.vy = 0;
    }
    p.m.rotation.x += dt * 6;
    p.m.material.opacity = clamp(p.life / 0.35, 0, 1);
    if (p.life <= 0) {
      scene.remove(p.m);
      p.m.material.dispose();
      ps.splice(i, 1);
    }
  }
}

const DGEO = new THREE.CircleGeometry(1, 18);
DGEO.rotateX(-Math.PI / 2);
DGEO.userData.shared = true;
/** Stain left on the floor where a foe died. */
export function addDecal(x: number, z: number, color: number, size: number) {
  const m = new THREE.Mesh(
    DGEO,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false }),
  );
  m.position.set(x, 0.006 + G.decals.length * 0.0002, z);
  m.scale.set(size * rand(0.8, 1.2), 1, size * rand(0.7, 1));
  m.rotation.y = Math.random() * 3;
  scene.add(m);
  G.decals.push(m);
}
