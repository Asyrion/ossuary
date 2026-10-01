/* The artifacts' HUD icons in the room kit's style (M3.5 step 3): each rendered from its model (artifactLooks.ts), so the
   icon is the thing the mage picked up. The model is lit from above and in front, with a rim of its own colour behind
   it, turned three-quarters to the camera; drawn at `SIZE`, and made pixel art of `OUT` pixels (about the artifact's own
   size in the room at the pixel look's texel), outlined in dark, as the pixel look outlines the scene. Rendered the first time it is asked for and kept (a data URL), so the HUD pays once. */
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
  return iconUrlOf(def.id, () => { const look = artifactLook(def.icon, def.color); mergeStill(look); return look; }, def.kind === 'cursed' ? CURSED_RED : def.color);
}

/** Any look as a pixel-art icon (M5: the bottles and reagents too), rendered once under `key` and kept: `make` builds the
    look (it is disposed after), lit as an artifact is, with a rim in `rim`'s colour. */
export function iconUrlOf(key: string, make: () => THREE.Object3D, rim: THREE.ColorRepresentation) {
  const hit = cache.get(key); if (hit) return hit;
  const st = stage ?? setUp(), { scene, camera, target } = st;
  const look = make(); look.rotation.set(I.turn[0], I.turn[1], 0); scene.add(look); // (merged as on its pedestal: its faces shaded, its metal)
  st.rim.color.set(rim);
  const box = meshBox(look), mid = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const half = Math.max(size.x, size.y) / 2 * I.margin;
  Object.assign(camera, { left: -half, right: half, top: half, bottom: -half }); camera.position.set(mid.x, mid.y, mid.z + 10); camera.lookAt(mid); camera.updateProjectionMatrix();
  const was = { target: renderer.getRenderTarget(), color: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha() };
  renderer.setRenderTarget(target); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
  const px = new Uint8Array(SIZE * SIZE * 4); renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, px);
  renderer.setRenderTarget(was.target); renderer.setClearColor(was.color, was.alpha);
  scene.remove(look); disposeTree(look);
  const url = toIcon(px); cache.set(key, url); return url;
}

/** What an icon frames: the model's meshes, not the glow sprites round it (a bottle's or a reagent's light, M5), which
    would leave the model a speck in the middle. */
function meshBox(o: THREE.Object3D) {
  const box = new THREE.Box3(), b = new THREE.Box3(); o.updateMatrixWorld(true);
  o.traverse(c => { const m = c as THREE.Mesh; if (!m.isMesh) return; m.geometry.computeBoundingBox(); box.union(b.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld)); });
  return box.isEmpty() ? new THREE.Box3().setFromObject(o) : box;
}

/** The rendered pixels (bottom row first) to a small pixel-art PNG (2026-10-01, everything in the one pixel-art look): each
    icon pixel the mean of the rendered block under it (weighted by how much is drawn there), drawn or not (no soft
    edge), and outlined in dark, as the pixel look outlines the scene. Shown in whole steps (`image-rendering: pixelated`). */
function toIcon(px: Uint8Array) {
  const out = document.createElement('canvas'); out.width = out.height = OUT;
  const g = out.getContext('2d')!, d = g.createImageData(OUT, OUT), k = SIZE / (OUT - 2); // (a pixel of margin all round, for the outline)
  for (let y = 0; y < OUT - 2; y++) for (let x = 0; x < OUT - 2; x++) {
    let r = 0, gr = 0, b = 0, a = 0, n = 0;
    for (let v = Math.floor(y * k); v < Math.floor((y + 1) * k); v++) for (let u = Math.floor(x * k); u < Math.floor((x + 1) * k); u++) {
      const i = ((SIZE - 1 - v) * SIZE + u) * 4, w = px[i + 3]; r += px[i] * w; gr += px[i + 1] * w; b += px[i + 2] * w; a += w; n++;
    }
    if (a / n < I.solid) continue; // (too little drawn here: left clear)
    d.data.set([r / a, gr / a, b / a, 255], ((y + 1) * OUT + x + 1) * 4);
  }
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < OUT && y < OUT && d.data[(y * OUT + x) * 4 + 3] === 255;
  const edge: number[] = [];
  for (let y = 0; y < OUT; y++) for (let x = 0; x < OUT; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) edge.push((y * OUT + x) * 4);
  for (const i of edge) d.data.set(OUTLINE, i);
  g.putImageData(d, 0, 0);
  return out.toDataURL('image/png');
}

