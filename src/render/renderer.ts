import * as THREE from 'three';
import { CFG } from '../config';
import { DEV, G, player } from '../state';
import type { Room } from '../types';
import { $, reduceMotion } from '../util';
import { drawPixelLook, pixelLook } from './pixelLook';

export const canvas = $<HTMLCanvasElement>('game');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = CFG.lights.exposure;
renderer.info.autoReset = false; // (reset once a frame in draw(), so a frame's count covers all its passes)

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050404);

export const TILT = (CFG.camTiltDeg * Math.PI) / 180;
export const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 120);
const CAM_DIR = new THREE.Vector3(0, Math.sin(TILT), Math.cos(TILT));
export const camTarget = new THREE.Vector3();

export function resize() {
  const w = window.innerWidth,
    h = window.innerHeight;
  renderer.setSize(w, h, false);
  const a = w / h;
  const viewH = Math.max(8.1, 15.5 / a);
  camera.left = (-viewH * a) / 2;
  camera.right = (viewH * a) / 2;
  camera.top = viewH / 2;
  camera.bottom = -viewH / 2;
  camera.updateProjectionMatrix();
  document.body.classList.toggle('portrait', h > w);
}

/** How far the camera pulls back in a room: not at all in one-cell rooms, CFG.camHallView in larger halls. */
export const viewScaleFor = (room: Pick<Room, 'plan'>) => (room.plan.cells.length > 1 ? CFG.camHallView : 1);
export const viewScale = () => 1 / camera.zoom;
export function setViewScale(s: number) {
  if (Math.abs(camera.zoom - 1 / s) < 1e-6) return;
  camera.zoom = 1 / s;
  camera.updateProjectionMatrix();
}

/** Where the camera should look in a room with the mage at (px, pz): the room's middle while the room fits
    the view, otherwise following the mage but never showing past the walls. The tall north wall counts
    as floor reaching H_TALL further north, since the camera looks down at 45°. Uses the room's own view
    scale, so it also works for the room a pan is heading to. */
export function cameraTargetFor(room: Pick<Room, 'bounds' | 'plan'>, px: number, pz: number) {
  const s = viewScaleFor(room),
    halfW = camera.right * s,
    halfD = (camera.top * s) / Math.sin(TILT);
  const x0 = room.bounds.minX - 1,
    x1 = room.bounds.maxX + 1; // walls are 1 thick
  const z0 = room.bounds.minZ - 1 - 1.32,
    z1 = room.bounds.maxZ + 1; // tall north wall, low south wall
  const fit = (lo: number, hi: number, half: number, p: number) =>
    hi - lo <= half * 2 ? (lo + hi) / 2 : Math.min(hi - half, Math.max(lo + half, p));
  return { x: fit(x0, x1, halfW, px), z: fit(z0, z1, halfD, pz) };
}

/** M4.6: the camera close on the mage, or back to the room's view. */
export function setCloseUp(on: boolean) {
  DEV.closeUp = on;
  if (!on && G.room.current) setViewScale(viewScaleFor(G.room.current));
}

export function placeCamera() {
  const s = reduceMotion ? 0 : G.fx.shake;
  const sx = (Math.random() - 0.5) * s,
    sz = (Math.random() - 0.5) * s;
  if (DEV.closeUp) {
    // (M4.6: close on the mage, to see what is worn)
    const y = CFG.costume.closeUp.y;
    camera.position.set(player.x, y, player.z).addScaledVector(CAM_DIR, 40);
    camera.lookAt(player.x, y, player.z);
    if (camera.zoom !== CFG.costume.closeUp.zoom) {
      camera.zoom = CFG.costume.closeUp.zoom;
      camera.updateProjectionMatrix();
    }
    return;
  }
  camera.position.set(camTarget.x + sx, 0, camTarget.z + sz).addScaledVector(CAM_DIR, 40);
  camera.lookAt(camTarget.x + sx, 0, camTarget.z + sz);
}

/** Draw a frame: the scene, or the scene in the pixel look (M3.5's style test). Draw calls and triangles are counted
    per frame, over both passes of the pixel look. */
export function draw() {
  renderer.info.reset();
  placeCamera();
  if (pixelLook().lines) drawPixelLook(renderer, scene, camera);
  else {
    camera.layers.enableAll();
    renderer.render(scene, camera);
  } // (off: the fine layer with everything else)
}
