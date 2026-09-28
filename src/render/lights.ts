import * as THREE from 'three';
import { CFG } from '../config';
import type { FloorLook, Torch } from '../types';
import { scene } from './renderer';

// Soft fill + cold moon + a pool of four torch lights on the torches nearest the mage + the hero's lantern.
// The number of lights never changes, so shaders are never rebuilt when rooms change.
const L = CFG.lights;
const hemi = new THREE.HemisphereLight(0x8a7ea0, 0x1d150f, L.hemi); scene.add(hemi);
const moon = new THREE.DirectionalLight(0xaab6d8, L.moon);
moon.position.set(-4, 10, 7); scene.add(moon);

export const torchLights = [0, 1, 2, 3].map(() => {
  const l = new THREE.PointLight(0xff9a3c, 0, L.torchDistance, L.torchDecay); scene.add(l); return l;
});
/** Which torch each light sits on, and how far it has faded in. */
const slots = torchLights.map(light => ({ light, torch: null as Torch | null, fade: 0 }));
export const lantern = new THREE.PointLight(0xffc27a, L.lantern, L.lanternDistance, L.lanternDecay);
scene.add(lantern);

/** Torch brightness factor of the current floor (CFG.lights.torch × this), and how dark the current room is:
    0 normally, 1 in a dark room (torches out, fill and moonlight low, the lantern a little brighter). */
export const lightState = { torchMul: 1, dark: 0, darkTarget: 0 };
/** Fade towards a room's darkness; `instant` for the first room of a floor. */
export function setDarkness(target: number, instant = false) { lightState.darkTarget = target; if (instant) lightState.dark = target; }
/** Current light levels, for tests. */
export const lightLevels = () => ({ hemi: hemi.intensity, moon: moon.intensity, lantern: lantern.intensity, torches: torchLights.map(l => l.intensity) });
/** Tint the fill light, moonlight and torch lights for a floor's look. */
export function applyFloorLook(look: FloorLook) {
  hemi.color.set(look.light.sky); hemi.groundColor.set(look.light.ground); moon.color.set(look.light.moon);
  for (const l of torchLights) l.color.set(look.torch.light);
  lightState.torchMul = look.torch.intensity;
}

/** The torch light colour and brightness of the room entered (a secret room burns pale blue). */
export function applyRoomTorches(look: FloorLook) {
  for (const l of torchLights) l.color.set(look.torch.light);
  lightState.torchMul = look.torch.intensity;
}

const nearest = (torches: Torch[], x: number, z: number, n: number, bias: (t: Torch) => number = () => 0) =>
  torches.slice().sort((a, b) => Math.hypot(a.x - x, a.z - z) + bias(a) - (Math.hypot(b.x - x, b.z - z) + bias(b))).slice(0, n);

/** Put the lights on a room's torches at once (entering a room). */
export function resetTorchLights(torches: Torch[], x: number, z: number) {
  const pick = nearest(torches.filter(t => t.lit), x, z, slots.length);
  slots.forEach((s, i) => { s.torch = pick[i] ?? null; s.fade = s.torch ? 1 : 0; if (s.torch) s.light.position.set(s.torch.x, 1.3, s.torch.z); });
}

/** Each step: lights follow the four torches nearest the mage (with a little stickiness so they don't flicker
    between two torches), fading out before they move. `flicker` is the shared torch flicker. */
export function updateTorchLights(torches: Torch[], x: number, z: number, dt: number, flicker: number) {
  const ls = lightState, dark = (ls.dark += (ls.darkTarget - ls.dark) * (1 - Math.exp(-5 * dt)));
  hemi.intensity = L.hemi * (1 - .8 * dark); moon.intensity = L.moon * (1 - .85 * dark); lantern.intensity = L.lantern * (1 + .35 * dark);
  const want = nearest(torches.filter(t => t.lit), x, z, slots.length, t => slots.some(s => s.torch === t) ? -1.5 : 0);
  for (const s of slots) {
    if (s.torch && !want.includes(s.torch)) s.fade = Math.max(0, s.fade - dt * 6); // leaving: fade out first
    if (!s.torch || (s.fade === 0 && !want.includes(s.torch))) {
      const free = want.find(t => !slots.some(o => o.torch === t));
      s.torch = free ?? null;
      if (s.torch) s.light.position.set(s.torch.x, 1.3, s.torch.z);
    } else if (want.includes(s.torch)) s.fade = Math.min(1, s.fade + dt * 6);
    s.light.intensity = s.torch ? L.torch * ls.torchMul * flicker * s.fade * (1 - dark) : 0;
  }
}
