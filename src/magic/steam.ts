/* Steam (Ember + Frost; built 2026-10-01): a cloud where fire met cold. It comes from the reaction on a foe (a chilled foe
   set burning, a burning one chilled; magic/status.ts) and from the floor (fire on ice, frost on burning oil; world/pools.ts).
   Foes inside can't aim: their shots go wide (`spawnShot`). Eyes can't see the mage through one: a basilisk's stare, a
   radiant eye, a watching statue (`steamBetween`). Water under it is scalded, and what hides in it comes up (`hearGround`'s
   'steam'). Each cloud is a few soft puffs, drifting up and thinning out. */
import * as THREE from 'three';
import type { Room } from '../types';
import { G, player } from '../state';
import { scene } from '../render/renderer';
import { glowTex } from '../render/textures';
import { MAGIC } from './status';
import { groundHears } from '../world/groundHooks';
import { damageEnemy } from '../combat/damage';
import { burst } from '../combat/fx';
import { renderHearts } from '../ui/hud';
import { inflict } from './statusFx';
import { strikeFx } from './spellFx';
import { weaveAt } from './weaveFx';
import { CFG } from '../config';
import { heroDrink } from '../actors/hero';

const S = MAGIC.reactions.steam,
  PUFFS = 7;
interface Cloud {
  room: Room;
  x: number;
  z: number;
  r: number;
  t: number;
  life: number;
  puffs: THREE.Sprite[];
  mat: THREE.SpriteMaterial;
  /** M4.10: the school that charged it (Thundercloud, Incense, Miasma), its clock, and whether its incense has mended the mage. */ school?: Charge;
  tick?: number;
  mended?: boolean;
}
/** The schools a cloud takes (M4.10's chains), what each makes of it, and its colour. */
export type Charge = 'storm' | 'hallow' | 'umbral';
const CHAIN: Record<Charge, 'thundercloud' | 'incense' | 'miasma'> = {
  storm: 'thundercloud',
  hallow: 'incense',
  umbral: 'miasma',
};
const TINT: Record<Charge, number> = { storm: 0xf4eeb0, hallow: 0xffe8a8, umbral: 0x5a4078 };
const clouds: Cloud[] = [];

/** A cloud of steam at (x, z) in the current room, `r` across (the reaction's, by default), for `time` seconds. M5: a
    `dark` one (a thrown Shadowstep Tincture) is darkness, not steam: foes in it can't aim either, but water keeps still. */
export function steamAt(x: number, z: number, r = S.radius, time = S.time, dark = false) {
  const room = G.current,
    mat = new THREE.SpriteMaterial({
      map: glowTex,
      color: dark ? 0x2a1a40 : 0xe8f2f8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
  const puffs = Array.from({ length: PUFFS }, (_, i) => {
    const s = new THREE.Sprite(mat),
      a = (i / PUFFS) * Math.PI * 2,
      d = r * (0.25 + (0.45 * ((i * 37) % 7)) / 7);
    s.position.set(x + Math.cos(a) * d, 0.5 + (i % 3) * 0.35, z + Math.sin(a) * d);
    s.scale.setScalar(r * 1.1);
    s.renderOrder = 6;
    s.userData.rise = 0.15 + (i % 4) * 0.06;
    scene.add(s);
    return s;
  });
  clouds.push({ room, x, z, r, t: time, life: time, puffs, mat });
  if (!dark) groundHears('steam', x, z, r); // (scalded water: what hides in it comes up)
}

/** A school lands at (x, z) (M4.10): a cloud there not yet charged takes it: Storm makes it a thundercloud, Hallow incense,
    Umbral a miasma. Returns whether one did. */
export function chargeSteam(x: number, z: number, school: Charge) {
  const c = clouds.find((c) => c.room === G.current && !c.school && Math.hypot(x - c.x, z - c.z) < c.r);
  if (!c) return false;
  c.school = school;
  c.tick = 0;
  c.mat.color.setHex(TINT[school]);
  weaveAt(CHAIN[school], c.x, c.z);
  return true;
}
/** Each second, a charged cloud does its school's work on the foes inside (and incense mends the mage once). */
function chargedTick(c: Cloud) {
  const W = MAGIC.weaves,
    T = W[CHAIN[c.school!]];
  c.tick = T.every;
  for (const e of G.enemies) {
    if (e.dead || e.hidden || e.spawn > 0 || Math.hypot(e.x - c.x, e.z - c.z) > c.r + e.r * 0.5) continue;
    if (c.school === 'storm') {
      strikeFx({ x: c.x, y: 1.4, z: c.z }, { x: e.x, y: 0.7, z: e.z }, 0xf0e890, CFG.spellFx.strike, true);
      damageEnemy(e, W.thundercloud.damage, 0, 0, 0, 'spell', 'storm');
      inflict(e, { shock: W.thundercloud.shock }, 'mage');
    } else if (c.school === 'hallow') inflict(e, { sanct: W.incense.sanct });
    else inflict(e, { hex: W.miasma.hex });
  }
  if (
    c.school === 'hallow' &&
    !c.mended &&
    player.hp < player.maxHp &&
    Math.hypot(player.x - c.x, player.z - c.z) < c.r
  ) {
    c.mended = true;
    player.hp = Math.min(player.maxHp, player.hp + W.incense.heal);
    renderHearts();
    heroDrink();
    burst(player.x, 0.9, player.z, 0xffe8a8, 10, 1.4, 0.04);
  }
}

/** Whether (x, z) in the current room is inside a cloud of steam. */
export const inSteam = (x: number, z: number) =>
  clouds.some((c) => c.room === G.current && Math.hypot(x - c.x, z - c.z) < c.r);
/** Whether steam hangs between (x0, z0) and (x1, z1) in the current room, or round either end: an eye can't see through it. */
export function steamBetween(x0: number, z0: number, x1: number, z1: number) {
  const dx = x1 - x0,
    dz = z1 - z0,
    l2 = dx * dx + dz * dz || 1;
  return clouds.some((c) => {
    if (c.room !== G.current) return false;
    const k = Math.max(0, Math.min(1, ((c.x - x0) * dx + (c.z - z0) * dz) / l2));
    return Math.hypot(x0 + dx * k - c.x, z0 + dz * k - c.z) < c.r * S.sight; // (the thick of it)
  });
}
/** The clouds in the current room (tests, the dev menu). */
export const steamCount = () => clouds.filter((c) => c.room === G.current).length;

function drop(c: Cloud) {
  for (const s of c.puffs) scene.remove(s);
  c.mat.dispose();
  clouds.splice(clouds.indexOf(c), 1);
}
/** Every step: the clouds drift up and thin out, and go. Only the current room's show. */
export function updateSteam(dt: number) {
  for (let i = clouds.length - 1; i >= 0; i--) {
    const c = clouds[i];
    c.t -= dt;
    if (c.t <= 0) {
      drop(c);
      continue;
    }
    const k = c.t / c.life,
      here = c.room === G.current;
    c.mat.opacity = Math.min(1, (1 - k) * 6) * Math.min(1, k * 2.5) * 0.5; // (it billows up, then thins out)
    for (const s of c.puffs) {
      s.visible = here;
      s.position.y += s.userData.rise * dt;
      s.scale.setScalar(c.r * (1.1 + (1 - k) * 0.5));
    }
    if (c.school && here && (c.tick = (c.tick ?? 0) - dt) <= 0) chargedTick(c);
    if (c.school === 'storm' && here && Math.random() < dt * 6)
      burst(
        c.x + (Math.random() - 0.5) * c.r,
        1 + Math.random() * 0.6,
        c.z + (Math.random() - 0.5) * c.r,
        0xf0e890,
        1,
        1.4,
        0.025,
      ); // (a thundercloud crackles)
  }
}
/** A new floor or run: every cloud goes. */
export function clearSteam() {
  while (clouds.length) drop(clouds[0]);
}
