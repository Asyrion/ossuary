/* The pixel look: a style test for M3.5 step 2, where the owner chooses between pixel-art 3D and cartoon 3D before the
   house style is set. The scene is drawn into a small target, a few hundred lines tall, with no smoothing, and blown
   up to the window in whole pixels; the camera is snapped to that grid so still things don't shimmer as it moves.
   Optional: dark outlines where a nearer surface meets a farther one (from depth), and light in a few bands, as in
   cartoon lighting. The HUD stays sharp (it is HTML). The dev menu switches it (remembered in this browser), and so
   does ?pixel=270 (or off). Tuning in CFG.pixelLook. */
import * as THREE from 'three';
import { CFG } from '../config';

export interface PixelLook { /** rows of pixels on screen; 0 is off */ lines: number; outline: boolean; bands: boolean }
const P = CFG.pixelLook, KEY = 'ossuary.pixelLook';
let look: PixelLook = { lines: 0, outline: true, bands: false };
try {
  const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<PixelLook> | null;
  if (v) look = { lines: P.lines.includes(v.lines ?? -1) ? v.lines! : 0, outline: v.outline !== false, bands: !!v.bands };
} catch { /* no storage: off */ }
if (typeof location !== 'undefined') {
  const q = new URLSearchParams(location.search).get('pixel');
  if (q === 'off') look.lines = 0;
  else if (q && P.lines.includes(Number(q))) look.lines = Number(q);
  else if (q) console.warn(`?pixel=${q}: use off or one of ${P.lines.join(', ')}`);
}

/** The pixel grid for a drawing buffer of `w` × `h` device pixels and about `lines` rows: `f` device pixels to a game
    pixel (whole), and the grid's size. */
export function pixelGrid(w: number, h: number, lines: number) {
  const f = Math.max(1, Math.round(h / lines));
  return { w: Math.ceil(w / f), h: Math.ceil(h / f), f };
}
/** How far to move `v` to land on a multiple of `step`. */
export const snapBy = (v: number, step: number) => Math.round(v / step) * step - v;

export const pixelLook = (): Readonly<PixelLook> => look;
export function setPixelLook(change: Partial<PixelLook>) {
  look = { ...look, ...change };
  if (!P.lines.includes(look.lines)) look.lines = 0;
  try { localStorage.setItem(KEY, JSON.stringify(look)); } catch { /* not remembered */ }
}

/* ---------- drawing ---------- */

let target: THREE.WebGLRenderTarget | null = null;
const buffer = new THREE.Vector2(), right = new THREE.Vector3(), up = new THREE.Vector3();
const blitScene = new THREE.Scene(), blitCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const blit = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false, // (three writes it as GLSL 3 under WebGL 2, texelFetch included)
  uniforms: {
    tColor: { value: null }, tDepth: { value: null }, grid: { value: new THREE.Vector2() }, screen: { value: new THREE.Vector2() },
    outline: { value: 0 }, bands: { value: 0 }, gap: { value: P.outlineGap }, dark: { value: P.outlineDark }, steps: { value: P.bands }, range: { value: 1 },
  },
  vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 grid; uniform vec2 screen;
    uniform float outline; uniform float bands; uniform float gap; uniform float dark; uniform float steps; uniform float range;
    float depthAt(ivec2 p) { return texelFetch(tDepth, clamp(p, ivec2(0), ivec2(grid) - 1), 0).r * range; }
    void main() {
      ivec2 p = min(ivec2(floor(gl_FragCoord.xy * grid / screen)), ivec2(grid) - 1);
      vec3 col = texelFetch(tColor, p, 0).rgb;
      if (outline > 0.5) { // the nearer side of an edge: a neighbour lies more than gap units farther away
        float d = depthAt(p);
        float farther = max(max(depthAt(p + ivec2(1, 0)), depthAt(p - ivec2(1, 0))), max(depthAt(p + ivec2(0, 1)), depthAt(p - ivec2(0, 1)))) - d;
        if (farther > gap) col *= 1.0 - dark;
      }
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      if (bands > 0.5) { // light in a few steps, the hue kept: steps even to the eye (finer in the dark), never black
        float l = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114)), s = sqrt(l);
        float q = max(floor(s * steps + 0.5), 1.0) / steps;
        gl_FragColor.rgb *= min(q * q / max(l, 1e-4), 4.0);
      }
    }`,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blit); quad.frustumCulled = false; blitScene.add(quad);

/** Draw the scene in the pixel look (when it is on: check `pixelLook().lines` first). The camera is moved to the
    nearest whole pixel of the grid along its own right and up, after it has been placed. */
export function drawPixelLook(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.OrthographicCamera) {
  renderer.getDrawingBufferSize(buffer);
  const g = pixelGrid(buffer.x, buffer.y, look.lines);
  if (!target || target.width !== g.w || target.height !== g.h) {
    target?.depthTexture?.dispose(); target?.dispose();
    target = new THREE.WebGLRenderTarget(g.w, g.h, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, samples: 0 });
    target.depthTexture = new THREE.DepthTexture(g.w, g.h);
  }
  // one grid pixel in world units, along the camera's right and up: the camera lands on a whole one
  const step = (camera.top - camera.bottom) / camera.zoom / g.h;
  camera.updateMatrixWorld(); right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
  camera.position.addScaledVector(right, snapBy(camera.position.dot(right), step)).addScaledVector(up, snapBy(camera.position.dot(up), step));
  camera.updateMatrixWorld();
  renderer.setRenderTarget(target); renderer.render(scene, camera); renderer.setRenderTarget(null);
  const u = blit.uniforms;
  u.tColor.value = target.texture; u.tDepth.value = target.depthTexture; u.grid.value.set(g.w, g.h); u.screen.value.set(buffer.x, buffer.y);
  u.outline.value = look.outline ? 1 : 0; u.bands.value = look.bands ? 1 : 0; u.range.value = camera.far - camera.near;
  renderer.render(blitScene, blitCamera);
}
