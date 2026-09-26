import * as THREE from 'three';
import { CFG } from '../config';
import { scene } from './renderer';

// Soft fill + cold moon + two torch lights that follow the current room + the hero's lantern
const L = CFG.lights;
scene.add(new THREE.HemisphereLight(0x8a7ea0, 0x1d150f, L.hemi));
const moon = new THREE.DirectionalLight(0xaab6d8, L.moon);
moon.position.set(-4, 10, 7); scene.add(moon);

export const torchLights = [0, 1].map(() => {
  const l = new THREE.PointLight(0xff9a3c, L.torch, L.torchDistance, L.torchDecay); scene.add(l); return l;
});
export const lantern = new THREE.PointLight(0xffc27a, L.lantern, L.lanternDistance, L.lanternDecay);
scene.add(lantern);
