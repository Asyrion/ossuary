import * as THREE from 'three';
import { CFG } from '../config';
import { G } from '../state';
import { $, reduceMotion } from '../util';

export const canvas = $<HTMLCanvasElement>('game');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = CFG.lights.exposure;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050404);

export const TILT = CFG.camTiltDeg * Math.PI / 180;
export const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 120);
const CAM_DIR = new THREE.Vector3(0, Math.sin(TILT), Math.cos(TILT));
export const camTarget = new THREE.Vector3();
export const CAM_OFFSET_Z = -0.66;

export function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  const a = w / h;
  const viewH = Math.max(8.1, 15.5 / a);
  camera.left = -viewH * a / 2; camera.right = viewH * a / 2;
  camera.top = viewH / 2; camera.bottom = -viewH / 2;
  camera.updateProjectionMatrix();
  document.body.classList.toggle('portrait', h > w);
}

export function placeCamera() {
  const s = reduceMotion ? 0 : G.shake;
  const sx = (Math.random() - .5) * s, sz = (Math.random() - .5) * s;
  camera.position.set(camTarget.x + sx, 0, camTarget.z + sz).addScaledVector(CAM_DIR, 40);
  camera.lookAt(camTarget.x + sx, 0, camTarget.z + sz);
}

export function draw() { placeCamera(); renderer.render(scene, camera); }
