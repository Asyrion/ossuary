/* The pixel look: the game's look, pixel-art 3D (the owner's choice after the style test of M3.5 step 2, 2026-09-30).
   The scene is drawn into a small target with no smoothing and blown up to the window; the camera is snapped to that
   grid so still things don't shimmer as it moves. Dark outlines where a nearer surface meets a farther one (from depth),
   and, optional, light in a few bands, as in cartoon lighting. Colours and blending are the canvas's own (see
   drawPixelLook). The HUD stays sharp (it is HTML).
   Since 2026-10-01 (the owner: everything in the one pixel-art look) it starts at the texel: one game pixel is one of the
   room kit's texels (`CFG.roomKit.texel`, a 48th of a unit across, the floor's 34th of a unit down the screen), so the
   mage, foes, artifacts, costumes and spells are drawn at the same pixel size as the floors and walls, which land on
   the grid texel for texel. That grid doesn't fall on whole screen pixels (about 2.6 at 1080p), so the blow-up is a sharp
   one: each pixel the same size, its edges blended over one screen pixel, and the camera's step between pixels shown
   smoothly. The rows of earlier (1080 down to 270, whole screen pixels to a game pixel) stay in the dev menu, and
   ?pixel=720 (or texel, or off). Tuning in CFG.pixelLook. */
import * as THREE from 'three';
import { CFG } from '../config';

/** The pixel grid: 'texel' (a game pixel to a room-kit texel), at most that many rows of whole screen pixels, or 0 (off). */
export type Lines = number | 'texel';
export interface PixelLook { /** the grid: 'texel', rows of pixels on screen, or 0 for off */ lines: Lines; outline: boolean; bands: boolean }
const P = CFG.pixelLook, KEY = 'ossuary.look';
/** Every grid offered, the texel first. */
export const LINES: readonly Lines[] = ['texel', ...P.lines];
const offered = (l: unknown): l is Lines => LINES.includes(l as Lines);
let look: PixelLook = { lines: P.start, outline: true, bands: false };
try {
  // (a choice is kept with the default it was made against: when the default changes, the new one shows once)
  const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as (Partial<PixelLook> & { start?: Lines }) | null;
  if (v && v.start === P.start) look = { lines: offered(v.lines) ? v.lines : 0, outline: v.outline !== false, bands: !!v.bands };
} catch { /* no storage: the default */ }
if (typeof location !== 'undefined') {
  const q = new URLSearchParams(location.search).get('pixel');
  if (q === 'off') look.lines = 0;
  else if (q === 'texel') look.lines = 'texel';
  else if (q && offered(Number(q))) look.lines = Number(q);
  else if (q) console.warn(`?pixel=${q}: use off, texel or one of ${P.lines.join(', ')}`);
}

/** The pixel grid for a drawing buffer of `w` × `h` device pixels and at most `lines` rows: `f` device pixels to a game
    pixel (whole, rounded up, so a smaller window keeps the look rather than turning sharp), and the grid's size. */
export function pixelGrid(w: number, h: number, lines: number) {
  const f = Math.max(1, Math.ceil(h / lines - 1e-6));
  return { w: Math.ceil(w / f), h: Math.ceil(h / f), f };
}
/** A game pixel in world units at the texel, along the camera's right and up: a texel across (`tx` to a unit), and down
    the screen as much as a floor texel (`ty` to a unit along z) comes to, seen at `tilt` (radians) from above. */
export const texelPixel = (tx: number, ty: number, tilt: number) => ({ px: 1 / tx, py: Math.sin(tilt) / ty });
/** The grid for a view `viewW` × `viewH` world units with pixels `px` × `py`: even both ways (so the camera's whole pixel
    lands on a pixel edge, as the texels do), with `margin` more on each side for the smooth step and the outlines. */
export function gridFor(viewW: number, viewH: number, px: number, py: number, margin: number) {
  const even = (n: number) => 2 * Math.ceil(n / 2 - 1e-6);
  return { w: even(viewW / px) + 2 * margin, h: even(viewH / py) + 2 * margin };
}
/** The rows the pixel look drew in the last frame (0 when it's off, or before the first frame). */
let lastRows = 0;
export const drawnRows = () => look.lines ? lastRows : 0;
/** How far to move `v` to land on a multiple of `step`. */
export const snapBy = (v: number, step: number) => Math.round(v / step) * step - v;

export const pixelLook = (): Readonly<PixelLook> => look;
export function setPixelLook(change: Partial<PixelLook>) {
  look = { ...look, ...change };
  if (!offered(look.lines)) look.lines = 0;
  try { localStorage.setItem(KEY, JSON.stringify({ ...look, start: P.start })); } catch { /* not remembered */ }
}

/* ---------- drawing ---------- */

// Three passes: the scene into the grid (`target`, with its depth); the grid shaded (outlines, bands) into `shaded`, still
// at the grid's size; and the blow-up to the window. Both targets only grow (in steps of `GROW`), and each frame draws
// into the corner it needs, so a zoom blending between rooms doesn't make new ones every frame.
let target: THREE.WebGLRenderTarget | null = null, shaded: THREE.WebGLRenderTarget | null = null;
const GROW = 64, MARGIN = 2;
const buffer = new THREE.Vector2(), right = new THREE.Vector3(), up = new THREE.Vector3();
const passScene = new THREE.Scene(), passCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const shade = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false, // (three writes it as GLSL 3 under WebGL 2, texelFetch included)
  uniforms: {
    tColor: { value: null }, tDepth: { value: null }, grid: { value: new THREE.Vector2() },
    outline: { value: 0 }, bands: { value: 0 }, gap: { value: P.outlineGap }, dark: { value: P.outlineDark }, steps: { value: P.bands }, range: { value: 1 },
  },
  vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 grid;
    uniform float outline; uniform float bands; uniform float gap; uniform float dark; uniform float steps; uniform float range;
    float depthAt(ivec2 p) { return texelFetch(tDepth, clamp(p, ivec2(0), ivec2(grid) - 1), 0).r * range; }
    void main() {
      ivec2 p = ivec2(gl_FragCoord.xy);
      vec3 col = texelFetch(tColor, p, 0).rgb;
      if (outline > 0.5) { // the nearer side of an edge: a neighbour lies more than gap units farther away
        float d = depthAt(p);
        float farther = max(max(depthAt(p + ivec2(1, 0)), depthAt(p - ivec2(1, 0))), max(depthAt(p + ivec2(0, 1)), depthAt(p - ivec2(0, 1)))) - d;
        if (farther > gap) col *= pow(1.0 - dark, 1.0 / 2.2); // (as dark as 1 - dark in linear light)
      }
      gl_FragColor = vec4(col, 1.0); // (tone-mapped and encoded already, by the scene's own shaders)
      if (bands > 0.5) { // light in a few steps, the hue kept: steps even to the eye (finer in the dark), never black
        float l = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114)), s = sqrt(l);
        float q = max(floor(s * steps + 0.5), 1.0) / steps;
        gl_FragColor.rgb *= min(q * q / max(l, 1e-4), 4.0);
      }
    }`,
});
const blit = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  uniforms: { tShaded: { value: null }, size: { value: new THREE.Vector2() }, centre: { value: new THREE.Vector2() }, screen: { value: new THREE.Vector2() }, scale: { value: new THREE.Vector2() } },
  vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tShaded; uniform vec2 size; uniform vec2 centre; uniform vec2 screen; uniform vec2 scale;
    void main() {
      // where this screen pixel falls on the grid (in game pixels), then a sharp blow-up: inside a game pixel its own
      // colour, blended with the next only over the last screen pixel before the edge (the texture filters linearly)
      vec2 g = centre + (gl_FragCoord.xy - screen * 0.5) / scale - 0.5;
      vec2 i = floor(g), f = clamp((fract(g) - 0.5) * scale + 0.5, 0.0, 1.0);
      gl_FragColor = vec4(texture2D(tShaded, (i + f + 0.5) / size).rgb, 1.0);
    }`,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; passScene.add(quad);
const pass = (renderer: THREE.WebGLRenderer, m: THREE.Material, to: THREE.WebGLRenderTarget | null) => { quad.material = m; renderer.setRenderTarget(to); renderer.render(passScene, passCamera); };

function ensure(w: number, h: number) {
  if (target && target.width >= w && target.height >= h) return;
  const W = Math.max(GROW * Math.ceil(w / GROW), target?.width ?? 0), H = Math.max(GROW * Math.ceil(h / GROW), target?.height ?? 0);
  target?.depthTexture?.dispose(); target?.dispose(); shaded?.dispose();
  target = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, colorSpace: THREE.SRGBColorSpace, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, samples: 0 });
  target.depthTexture = new THREE.DepthTexture(W, H);
  // Blend as the canvas does. three tone-maps and encodes to sRGB in each material's shader only when it draws to the
  // screen (or an XR target); into any other target it writes linear light, blended as such, and faint translucent
  // light (a daylight shaft, rime, a torch's halo) came out far brighter and harder-edged than on the canvas. Flagged
  // as an XR target, the scene is tone-mapped and encoded per material, into plain 8-bit storage (RGBA8, so the GPU
  // doesn't encode it a second time), and the shading and blow-up only copy it.
  target.texture.internalFormat = 'RGBA8';
  (target as THREE.WebGLRenderTarget & { isXRRenderTarget: boolean }).isXRRenderTarget = true;
  // the shaded grid, filtered linearly for the sharp blow-up's one blended screen pixel (its values already encoded)
  shaded = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, samples: 0 });
  shaded.texture.internalFormat = 'RGBA8';
  target.scissorTest = shaded.scissorTest = true;
}

/** Draw the scene in the pixel look (when it is on: check `pixelLook().lines` first). The camera is moved to the
    nearest whole pixel of the grid along its own right and up, after it has been placed; the blow-up puts back the
    part of a pixel it was moved, so the camera glides while the room stays on its texels. */
export function drawPixelLook(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.OrthographicCamera) {
  renderer.getDrawingBufferSize(buffer);
  const viewW = (camera.right - camera.left) / camera.zoom, viewH = (camera.top - camera.bottom) / camera.zoom;
  camera.updateMatrixWorld(); right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
  // a game pixel in world units: a texel (the floor's, seen from the camera's tilt), or a whole number of screen pixels
  let px: number, py: number;
  if (look.lines === 'texel') ({ px, py } = texelPixel(CFG.roomKit.texel[0], CFG.roomKit.texel[1], Math.asin(Math.min(1, Math.abs(up.z)))));
  else { const f = pixelGrid(buffer.x, buffer.y, look.lines as number).f; px = py = viewH * f / buffer.y; }
  const g = gridFor(viewW, viewH, px, py, MARGIN); ensure(g.w, g.h); lastRows = Math.round(viewH / py);
  // the camera to a whole pixel along its right and up (as the texels lie), and the frustum widened to the whole grid
  const dr = snapBy(camera.position.dot(right), px), du = snapBy(camera.position.dot(up), py);
  camera.position.addScaledVector(right, dr).addScaledVector(up, du); camera.updateMatrixWorld();
  const frustum = [camera.left, camera.right, camera.top, camera.bottom] as const;
  camera.left = -g.w * px * camera.zoom / 2; camera.right = -camera.left; camera.top = g.h * py * camera.zoom / 2; camera.bottom = -camera.top;
  camera.updateProjectionMatrix();
  target!.viewport.set(0, 0, g.w, g.h); target!.scissor.set(0, 0, g.w, g.h);
  shaded!.viewport.set(0, 0, g.w, g.h); shaded!.scissor.set(0, 0, g.w, g.h);
  renderer.setRenderTarget(target); renderer.render(scene, camera);
  [camera.left, camera.right, camera.top, camera.bottom] = frustum; camera.updateProjectionMatrix();
  const s = shade.uniforms, b = blit.uniforms;
  s.tColor.value = target!.texture; s.tDepth.value = target!.depthTexture; s.grid.value.set(g.w, g.h);
  s.outline.value = look.outline ? 1 : 0; s.bands.value = look.bands ? 1 : 0; s.range.value = camera.far - camera.near;
  pass(renderer, shade, shaded);
  // the window shows the view itself (viewW × viewH), the grid's middle less the part of a pixel the camera was moved
  b.tShaded.value = shaded!.texture; b.size.value.set(shaded!.width, shaded!.height); b.screen.value.set(buffer.x, buffer.y);
  b.centre.value.set(g.w / 2 - dr / px, g.h / 2 - du / py); b.scale.value.set(buffer.x * px / viewW, buffer.y * py / viewH);
  pass(renderer, blit, null);
}
