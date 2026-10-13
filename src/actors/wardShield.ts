/* The drinking ward as a foe's shield (M4.2, from the Eda lore; its rules are in magic/drinking.ts). A sphere of pale
   ward-light round the foe drinks the spells that strike it instead of their harm (and keeps statuses off it), filling
   with the colour of what it drank most; full, it breaks, and a Wardling of that school joins the fight beside the foe.
   The cantrip passes through it. The Twin Guardians (M4.2 step 8) raise it; the dev menu wards any foe to try it. */
import * as THREE from 'three';
import type { Enemy } from '../types';
import { CFG } from '../config';
import { G } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT, type School } from '../render/arcane';
import { burst } from '../combat/fx';
import { toast } from '../notify';
import { freeSpotNear } from '../world/rooms';
import { FLOORS } from '../world/generate';
import { WARDLING, drink, fullness, mostDrunk, newDrink } from '../magic/drinking';
import { makeEnemy } from './enemies';

const WARD = 0xd8d0ff;
/** One sphere for every ward, kept when a foe is disposed. */
const sharedGeo = <T extends THREE.BufferGeometry>(g: T) => {
  g.userData.shared = true;
  return g;
};
let geo: THREE.IcosahedronGeometry | null = null,
  ringGeo: THREE.TorusGeometry | null = null;
let told = false;

/** Raise a drinking ward round `e` that holds `need` of spells' harm, `size` across its middle, `y` high. */
export function wardFoe(e: Enemy, need: number = CFG.ward.foeNeed, size = e.r * 1.8 + 0.3, y = e.flying ? 0.9 : 0.55) {
  if (e.ward || e.dead) return;
  geo ??= sharedGeo(new THREE.IcosahedronGeometry(1, 2));
  ringGeo ??= sharedGeo(new THREE.TorusGeometry(1, 0.035, 4, 32));
  // a faint sphere, and two rings of ward-light round it, crossed, so it reads as a ward and not a haze (its own materials: they fill with colour)
  const fx = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      color: WARD,
      transparent: true,
      opacity: 0.07,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const rimMat = new THREE.MeshBasicMaterial({
    color: WARD,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (const [x, z] of [
    [Math.PI / 2, 0],
    [0.5, 0.9],
  ]) {
    const ring = new THREE.Mesh(ringGeo, rimMat);
    ring.rotation.set(x, 0, z);
    fx.add(ring);
  }
  fx.userData.rim = rimMat;
  fx.position.y = y;
  fx.scale.setScalar(size);
  fx.userData.size = size;
  e.group.add(fx);
  e.ward = { drink: newDrink(need), fx };
  burst(e.x, fx.position.y, e.z, WARD, 14, 1.8, 0.04);
}

/** A spell's blow of `dmg` strikes a warded foe: the ward drinks it (of `school`, or of what it holds most for a
    reaction's). Full, it breaks and lets out a Wardling of what it drank most. */
export function drinkBlow(e: Enemy, dmg: number, school?: School) {
  const w = e.ward!,
    s = school ?? mostDrunk(w.drink),
    full = drink(w.drink, s, dmg),
    top = mostDrunk(w.drink);
  const m = w.fx.material as THREE.MeshBasicMaterial,
    k = fullness(w.drink);
  m.color.set(WARD).lerp(new THREE.Color(SCHOOL_LIGHT[top]), 0.35 + 0.65 * k);
  m.opacity = 0.07 + 0.15 * k;
  (w.fx.userData.rim as THREE.MeshBasicMaterial).color.copy(m.color);
  w.fx.scale.multiplyScalar(1.06);
  e.flash = 0.09;
  burst(e.x, w.fx.position.y, e.z, SCHOOL_LIGHT[s], 6, 1.4, 0.035);
  Sfx.at(e.x, e.z).wardDrink();
  if (!told) {
    told = true;
    toast(STR.toast.shieldDrinks, 3.5);
  }
  if (full) breakWard(e, top);
}

/** The ward breaks: its light scatters, and a Wardling of `school` rises beside the foe. */
function breakWard(e: Enemy, school: School) {
  const w = e.ward!;
  e.ward = undefined;
  e.group.remove(w.fx);
  (w.fx.material as THREE.Material).dispose();
  (w.fx.userData.rim as THREE.Material).dispose();
  burst(e.x, 0.8, e.z, SCHOOL_LIGHT[school], 26, 2.6, 0.05);
  Sfx.at(e.x, e.z).wardBurst();
  G.fx.shake = Math.max(G.fx.shake, 0.15);
  toast(STR.toast.shieldBreaks(STR.schools[school]), 3);
  const at = freeSpotNear(G.current, e.x + CFG.ward.beside, e.z),
    floor = FLOORS[Math.min(G.run.floor, FLOORS.length - 1)];
  const ling = makeEnemy(WARDLING[school], at.x, at.z, floor.enemyHp);
  if (e.isBoss) ling.unpaid = true; // (M6: a Twin Guardian's ward breaks again and again: its Wardlings pay no insight)
}

/** Lower `e`'s ward without breaking it (a Twin Guardian passing its shield across): no Wardling comes of it. */
export function unwardFoe(e: Enemy) {
  const w = e.ward;
  if (!w) return;
  e.ward = undefined;
  e.group.remove(w.fx);
  (w.fx.material as THREE.Material).dispose();
  (w.fx.userData.rim as THREE.Material).dispose();
}

/** Each step: the ward's light breathes, and shrinks back after a drink. */
export function updateWardShields(now: number) {
  for (const e of G.enemies) {
    if (!e.ward) continue;
    const base = e.ward.fx.userData.size as number,
      s = e.ward.fx.scale.x;
    e.ward.fx.scale.setScalar(base + (s - base) * 0.9 + Math.sin(now * 3 + e.x) * 0.01);
    e.ward.fx.rotation.y = now * 0.4;
  }
}

/** A new floor or run: the first ward's message shows again. */
export function resetWardShields() {
  told = false;
}
