/* The artifacts' HUD icons in the room kit's style (M3.5 step 3): each rendered from its model (artifactLooks.ts), so the
   icon is the thing the mage picked up. The model is lit from above and in front, with a rim of its own colour behind
   it, turned three-quarters to the camera; drawn at `SIZE`, scaled down to `OUT` pixels and outlined in dark, as the
   pixel look outlines the scene. Rendered the first time it is asked for and kept (a data URL), so the HUD pays once. */
import * as THREE from 'three';
import { renderer } from '../render/renderer';
import { CFG } from '../config';
import { disposeTree, mergeStill } from '../render/materials';
import type { ArtifactDef } from './artifactData';
import { CURSED_RED, artifactLook } from './artifactLooks';

const I = CFG.roomKit.icon, SIZE = I.size, OUT = I.out, OUTLINE = [22, 15, 11, 235];
const cache = new Map<string, string>();
let stage: { scene: THREE.Scene; camera: THREE.OrthographicCamera; rim: THREE.DirectionalLight; target: THREE.WebGLRenderTarget } | null = null;

function setUp() {
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 20);
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0x2a2018, I.fill));
  const key = new THREE.DirectionalLight(0xfff4e6, I.key); key.position.set(1.5, 2.5, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, I.rim); rim.position.set(-2, 1, -2.5); scene.add(rim);
  const target = new THREE.WebGLRenderTarget(SIZE, SIZE, { type: THREE.UnsignedByteType, colorSpace: THREE.SRGBColorSpace, samples: 0 });
  // (tone-mapped and encoded as the scene is, like the pixel look's target: see pixelLook.ts)
  target.texture.internalFormat = 'RGBA8'; (target as THREE.WebGLRenderTarget & { isXRRenderTarget: boolean }).isXRRenderTarget = true;
  return stage = { scene, camera, rim, target };
}

/** The icon of `def` as a data URL (a transparent PNG, `OUT` pixels square). */
export function artifactIconUrl(def: ArtifactDef) {
  const hit = cache.get(def.id); if (hit) return hit;
  const { scene, camera, rim, target } = stage ?? setUp();
  const look = artifactLook(def.icon, def.color); mergeStill(look); look.rotation.set(I.turn[0], I.turn[1], 0); scene.add(look); // (merged as on its pedestal: its faces shaded, its metal)
  rim.color.set(def.kind === 'cursed' ? CURSED_RED : def.color);
  const box = new THREE.Box3().setFromObject(look), mid = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const half = Math.max(size.x, size.y) / 2 * I.margin;
  Object.assign(camera, { left: -half, right: half, top: half, bottom: -half }); camera.position.set(mid.x, mid.y, mid.z + 10); camera.lookAt(mid); camera.updateProjectionMatrix();
  const was = { target: renderer.getRenderTarget(), color: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha() };
  renderer.setRenderTarget(target); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
  const px = new Uint8Array(SIZE * SIZE * 4); renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, px);
  renderer.setRenderTarget(was.target); renderer.setClearColor(was.color, was.alpha);
  scene.remove(look); disposeTree(look);
  const url = toIcon(px); cache.set(def.id, url); return url;
}

/** The rendered pixels (bottom row first) to a small PNG: turned upright, scaled down, and outlined. */
function toIcon(px: Uint8Array) {
  const big = document.createElement('canvas'); big.width = big.height = SIZE;
  const img = new ImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) img.data.set(px.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);
  big.getContext('2d')!.putImageData(img, 0, 0);
  const out = document.createElement('canvas'); out.width = out.height = OUT;
  const g = out.getContext('2d')!; g.imageSmoothingQuality = 'high'; g.drawImage(big, 1, 1, OUT - 2, OUT - 2);
  const d = g.getImageData(0, 0, OUT, OUT), a = (x: number, y: number) => x < 0 || y < 0 || x >= OUT || y >= OUT ? 0 : d.data[(y * OUT + x) * 4 + 3];
  const edge: number[] = [];
  for (let y = 0; y < OUT; y++) for (let x = 0; x < OUT; x++) if (a(x, y) < I.edge && (a(x - 1, y) > I.solid || a(x + 1, y) > I.solid || a(x, y - 1) > I.solid || a(x, y + 1) > I.solid)) edge.push((y * OUT + x) * 4);
  for (const i of edge) d.data.set(OUTLINE, i);
  g.putImageData(d, 0, 0);
  return out.toDataURL('image/png');
}

