import * as THREE from 'three';
import { CFG } from '../config';
import type { FloorLook } from '../types';
import { scene } from './renderer';

// Soft fill + cold moon + two torch lights that follow the current room + the hero's lantern
const L = CFG.lights;
const hemi = new THREE.HemisphereLight(0x8a7ea0, 0x1d150f, L.hemi); scene.add(hemi);
const moon = new THREE.DirectionalLight(0xaab6d8, L.moon);
moon.position.set(-4, 10, 7); scene.add(moon);

export const torchLights = [0, 1].map(() => {
  const l = new THREE.PointLight(0xff9a3c, L.torch, L.torchDistance, L.torchDecay); scene.add(l); return l;
});
export const lantern = new THREE.PointLight(0xffc27a, L.lantern, L.lanternDistance, L.lanternDecay);
scene.add(lantern);

/** Torch brightness factor of the current floor (CFG.lights.torch × this). */
export const lightState = { torchMul: 1 };
/** Tint the fill light, moonlight and torch lights for a floor's look. */
export function applyFloorLook(look: FloorLook) {
  hemi.color.set(look.light.sky); hemi.groundColor.set(look.light.ground); moon.color.set(look.light.moon);
  for (const l of torchLights) l.color.set(look.torch.light);
  lightState.torchMul = look.torch.intensity;
}
