/* Steam (Ember + Frost; built 2026-10-01): a cloud where fire met cold. It comes from the reaction on a foe (a chilled foe
   set burning, a burning one chilled; magic/status.ts) and from the floor (fire on ice, frost on burning oil; world/pools.ts).
   Foes inside can't aim: their shots go wide (`spawnShot`). Eyes can't see the mage through one: a basilisk's stare, a
   radiant eye, a watching statue (`steamBetween`). Water under it is scalded, and what hides in it comes up (`hearGround`'s
   'steam'). Each cloud is a few soft puffs, drifting up and thinning out. */
import * as THREE from 'three';
import type { Room } from '../types';
import { G } from '../state';
import { scene } from '../render/renderer';
import { glowTex } from '../render/textures';
import { MAGIC } from './status';
import { groundHears } from '../world/groundHooks';

const S = MAGIC.reactions.steam, PUFFS = 7;
interface Cloud { room: Room; x: number; z: number; r: number; t: number; life: number; puffs: THREE.Sprite[]; mat: THREE.SpriteMaterial }
const clouds: Cloud[] = [];

/** A cloud of steam at (x, z) in the current room, `r` across (the reaction's, by default), for `time` seconds. */
export function steamAt(x: number, z: number, r = S.radius, time = S.time) {
  const room = G.current, mat = new THREE.SpriteMaterial({ map: glowTex, color: 0xe8f2f8, transparent: true, opacity: 0, depthWrite: false });
  const puffs = Array.from({ length: PUFFS }, (_, i) => {
    const s = new THREE.Sprite(mat), a = i / PUFFS * Math.PI * 2, d = r * (.25 + .45 * ((i * 37) % 7) / 7);
    s.position.set(x + Math.cos(a) * d, .5 + (i % 3) * .35, z + Math.sin(a) * d); s.scale.setScalar(r * 1.1); s.renderOrder = 6;
    s.userData.rise = .15 + (i % 4) * .06; scene.add(s); return s;
  });
  clouds.push({ room, x, z, r, t: time, life: time, puffs, mat });
  groundHears('steam', x, z, r); // (scalded water: what hides in it comes up)
}

/** Whether (x, z) in the current room is inside a cloud of steam. */
export const inSteam = (x: number, z: number) => clouds.some(c => c.room === G.current && Math.hypot(x - c.x, z - c.z) < c.r);
/** Whether steam hangs between (x0, z0) and (x1, z1) in the current room, or round either end: an eye can't see through it. */
export function steamBetween(x0: number, z0: number, x1: number, z1: number) {
  const dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz || 1;
  return clouds.some(c => {
    if (c.room !== G.current) return false;
    const k = Math.max(0, Math.min(1, ((c.x - x0) * dx + (c.z - z0) * dz) / l2));
    return Math.hypot(x0 + dx * k - c.x, z0 + dz * k - c.z) < c.r * S.sight; // (the thick of it)
  });
}
/** The clouds in the current room (tests, the dev menu). */
export const steamCount = () => clouds.filter(c => c.room === G.current).length;

function drop(c: Cloud) { for (const s of c.puffs) scene.remove(s); c.mat.dispose(); clouds.splice(clouds.indexOf(c), 1); }
/** Every step: the clouds drift up and thin out, and go. Only the current room's show. */
export function updateSteam(dt: number) {
  for (let i = clouds.length - 1; i >= 0; i--) {
    const c = clouds[i]; c.t -= dt;
    if (c.t <= 0) { drop(c); continue; }
    const k = c.t / c.life, here = c.room === G.current;
    c.mat.opacity = Math.min(1, (1 - k) * 6) * Math.min(1, k * 2.5) * .5; // (it billows up, then thins out)
    for (const s of c.puffs) { s.visible = here; s.position.y += s.userData.rise * dt; s.scale.setScalar(c.r * (1.1 + (1 - k) * .5)); }
  }
}
/** A new floor or run: every cloud goes. */
export function clearSteam() { while (clouds.length) drop(clouds[0]); }
