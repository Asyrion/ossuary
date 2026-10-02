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
   ?pixel=720 (or texel, or off). Tuning in CFG.pixelLook.
   One exception (the owner, 2026-10-02): what is on the fine layer (`FINE`: the coins, so their faces read) is drawn
   into its own target at `CFG.pixelLook.fineLayer` pixels to a game pixel each way, and laid over the grid where it
   stands nearer than what the grid drew, outlined and banded as the rest is. Its size in the room is unchanged; only its
   pixels are smaller. The scene's lights are on that layer too (lights.ts). What writes no depth (glows, steam, fire)
   shows behind a coin even where it stands before it. The pass runs, and its target is made, only while something
   marked fine (`markFine`) is shown. */
import * as THREE from 'three';
import { CFG } from '../config';

/** The pixel grid: 'texel' (a game pixel to a room-kit texel), 'fine' (two to a texel each way), at most that many rows
    of whole screen pixels, or 0 (off). */
export type Lines = number | 'texel' | 'fine';
export interface PixelLook { /** the grid: 'texel', rows of pixels on screen, or 0 for off */ lines: Lines; outline: boolean; bands: boolean }
const P = CFG.pixelLook, KEY = 'ossuary.look', K = P.fineLayer;
/** The fine layer: an object's meshes on it (`layers.set(FINE)`) are drawn at the finer pixel (see above), and only
    there; with the pixel look off, with everything else. */
export const FINE = 1;
const fineObjects = new Set<THREE.Object3D>();
/** Mark `o` as holding what is on the fine layer (pickupLooks.ts does, for every coin it builds), so the fine pass runs
    while it is shown; it is forgotten once it has left the scene. */
export function markFine(o: THREE.Object3D) { fineObjects.add(o); }
/** Whether anything marked fine is shown in `scene` (all its parents visible), forgetting what has left it. */
function fineShown(scene: THREE.Scene) {
  let shown = false;
  for (const o of fineObjects) {
    let p = o, seen = o.visible;
    while (p.parent) { p = p.parent; seen &&= p.visible; }
    if (p !== scene) fineObjects.delete(o); else if (seen) shown = true;
  }
  return shown;
}
/** Every grid offered, the texel first. */
export const LINES: readonly Lines[] = ['texel', 'fine', ...P.lines];
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
  else if (q === 'texel' || q === 'fine') look.lines = q;
  else if (q && offered(Number(q))) look.lines = Number(q);
  else if (q) console.warn(`?pixel=${q}: use off, texel, fine or one of ${P.lines.join(', ')}`);
}

/** The pixel grid for a drawing buffer of `w` × `h` device pixels and at most `lines` rows: `f` device pixels to a game
    pixel (whole, rounded up, so a smaller window keeps the look rather than turning sharp), and the grid's size. */
export function pixelGrid(w: number, h: number, lines: number) {
  const f = Math.max(1, Math.ceil(h / lines - 1e-6));
  return { w: Math.ceil(w / f), h: Math.ceil(h / f), f };
}
/** A game pixel in world units at the texel, along the camera's right and up: a texel across (`tx` to a unit), and down
    the screen as much as a floor texel (`ty` to a unit along z) comes to, seen at `tilt` (radians) from above. */
export function texelPixel(tx: number, ty: number, tilt: number, out = { px: 0, py: 0 }) { out.px = 1 / tx; out.py = Math.sin(tilt) / ty; return out; }
/** The grid for a view `viewW` × `viewH` world units with pixels `px` × `py`: even both ways (so the camera's whole pixel
    lands on a pixel edge, as the texels do), with `margin` more on each side for the smooth step and the outlines. */
export function gridFor(viewW: number, viewH: number, px: number, py: number, margin: number, out = { w: 0, h: 0 }) {
  const even = (n: number) => 2 * Math.ceil(n / 2 - 1e-6);
  out.w = even(viewW / px) + 2 * margin; out.h = even(viewH / py) + 2 * margin; return out;
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
let target: THREE.WebGLRenderTarget | null = null, shaded: THREE.WebGLRenderTarget | null = null, fine: THREE.WebGLRenderTarget | null = null;
const GROW = 64, MARGIN = 2;
const buffer = new THREE.Vector2(), right = new THREE.Vector3(), up = new THREE.Vector3(), pix = { px: 0, py: 0 }, grid = { w: 0, h: 0 }, clear = new THREE.Color();
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
  uniforms: {
    tShaded: { value: null }, size: { value: new THREE.Vector2() }, centre: { value: new THREE.Vector2() }, screen: { value: new THREE.Vector2() }, scale: { value: new THREE.Vector2() }, grid: { value: new THREE.Vector2() }, whole: { value: 0 },
    tFine: { value: null }, tFineDepth: { value: null }, tDepth: { value: null }, fineSize: { value: new THREE.Vector2() }, hasFine: { value: 0 }, outline: { value: 0 }, dark: { value: P.outlineDark }, bands: { value: 0 }, steps: { value: P.bands },
  },
  vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tShaded; uniform vec2 size; uniform vec2 centre; uniform vec2 screen; uniform vec2 scale; uniform vec2 grid; uniform float whole;
    uniform sampler2D tFine; uniform sampler2D tFineDepth; uniform sampler2D tDepth; uniform vec2 fineSize; uniform float hasFine; uniform float outline; uniform float dark;
    uniform float bands; uniform float steps;
    const int K = ${K};
    // light in steps, as the shade pass bands the grid
    vec3 band(vec3 c) {
      if (bands < 0.5) return c;
      float l = dot(c, vec3(0.299, 0.587, 0.114)), s = sqrt(l), q = max(floor(s * steps + 0.5), 1.0) / steps;
      return c * min(q * q / max(l, 1e-4), 4.0);
    }
    // a fine pixel drawn there, and nearer than what the grid drew in its game pixel
    bool seen(ivec2 q) {
      if (any(lessThan(q, ivec2(0))) || any(greaterThanEqual(q, ivec2(fineSize)))) return false;
      return texelFetch(tFine, q, 0).a > 0.5 && texelFetch(tFineDepth, q, 0).r <= texelFetch(tDepth, q / K, 0).r + 1e-6;
    }
    // the fine layer over the colour: fine pixel q (its colour c, sampled), or, within a game pixel of one, its outline
    // (as thick as the grid's)
    vec3 overFine(vec3 col, ivec2 q, vec4 c) {
      if (seen(q)) return col * (1.0 - c.a) + band(c.rgb); // (c is premultiplied: clear pixels are all zero)
      if (outline > 0.5) for (int d = 1; d <= K; d++)
        if (seen(q + ivec2(d, 0)) || seen(q - ivec2(d, 0)) || seen(q + ivec2(0, d)) || seen(q - ivec2(0, d))) return col * pow(1.0 - dark, 1.0 / 2.2);
      return col;
    }
    void main() {
      if (whole > 0.5) { // the rows of earlier: each game pixel a whole number of screen pixels, copied as it is
        ivec2 p = min(ivec2(floor(gl_FragCoord.xy * grid / screen)), ivec2(grid) - 1);
        gl_FragColor = vec4(texelFetch(tShaded, p, 0).rgb, 1.0);
        if (hasFine > 0.5) { ivec2 q = ivec2(floor(gl_FragCoord.xy * grid * float(K) / screen)); gl_FragColor.rgb = overFine(gl_FragColor.rgb, q, texelFetch(tFine, q, 0)); }
        return;
      }
      // at the texel: where this screen pixel falls on the grid (in game pixels), then a sharp blow-up: inside a game
      // pixel its own colour, blended with the next only over the last screen pixel before the edge (filtered linearly)
      vec2 g = centre + (gl_FragCoord.xy - screen * 0.5) / scale - 0.5;
      vec2 i = floor(g), f = clamp((fract(g) - 0.5) * scale + 0.5, 0.0, 1.0);
      gl_FragColor = vec4(texture2D(tShaded, (i + f + 0.5) / size).rgb, 1.0);
      if (hasFine > 0.5) { // the fine layer, blown up the same way at its own pixel
        vec2 gf = (g + 0.5) * float(K) - 0.5, sf = scale / float(K), fi = floor(gf), ff = clamp((fract(gf) - 0.5) * sf + 0.5, 0.0, 1.0);
        gl_FragColor.rgb = overFine(gl_FragColor.rgb, ivec2(floor(gf + 0.5)), texture2D(tFine, (fi + ff + 0.5) / fineSize));
      }
    }`,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; passScene.add(quad);
const pass = (renderer: THREE.WebGLRenderer, m: THREE.Material, to: THREE.WebGLRenderTarget | null) => { quad.material = m; renderer.setRenderTarget(to); renderer.render(passScene, passCamera); };

function ensure(w: number, h: number) {
  if (target && target.width >= w && target.height >= h) return;
  const W = Math.max(GROW * Math.ceil(w / GROW), target?.width ?? 0), H = Math.max(GROW * Math.ceil(h / GROW), target?.height ?? 0);
  target?.depthTexture?.dispose(); target?.dispose(); shaded?.dispose(); fine?.depthTexture?.dispose(); fine?.dispose();
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
  shaded.texture.internalFormat = 'RGBA8'; fine = null;
  target.scissorTest = shaded.scissorTest = true;
}
/** The fine layer's target, made the first time it is needed at the grid's size: K × K pixels to each of the grid's, with
    its own depth (encoded as the scene is; filtered linearly for the sharp blow-up, read pixel by pixel for its depth). */
function ensureFine() {
  if (fine) return fine;
  const W = target!.width * K, H = target!.height * K;
  fine = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, colorSpace: THREE.SRGBColorSpace, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, samples: 0 });
  fine.depthTexture = new THREE.DepthTexture(W, H);
  fine.texture.internalFormat = 'RGBA8'; fine.scissorTest = true;
  (fine as THREE.WebGLRenderTarget & { isXRRenderTarget: boolean }).isXRRenderTarget = true;
  return fine;
}

/** Whether the fine layer drew anything in the last frame. */
let fineDrawn = false;
export const fineLayerDrawn = () => fineDrawn;
/** The fine layer alone into its target (the grid's `gw` × `gh`, K times finer), on a clear ground: the scene's background
    left out, its lights kept (they are on the layer too), its matrices as the grid's pass left them. Whether it drew
    anything; nothing is done while nothing marked fine is shown. */
function drawFine(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, gw: number, gh: number) {
  if (!fineShown(scene)) return false;
  const f = ensureFine(); f.viewport.set(0, 0, gw * K, gh * K); f.scissor.set(0, 0, gw * K, gh * K);
  const bg = scene.background, alpha = renderer.getClearAlpha(), calls = renderer.info.render.calls, auto = scene.matrixWorldAutoUpdate;
  renderer.getClearColor(clear); renderer.setClearColor(0x000000, 0); scene.background = null; scene.matrixWorldAutoUpdate = false;
  camera.layers.set(FINE); renderer.setRenderTarget(f); renderer.render(scene, camera);
  camera.layers.set(0); scene.background = bg; scene.matrixWorldAutoUpdate = auto; renderer.setClearColor(clear, alpha);
  return renderer.info.render.calls > calls;
}

/** Draw the scene in the pixel look (when it is on: check `pixelLook().lines` first). The camera is moved to the
    nearest whole pixel of the grid along its own right and up, after it has been placed. At the texel the blow-up puts
    back the part of a pixel it was moved, so the camera glides while the room stays on its texels; the rows of earlier
    are drawn exactly as before (the grid filling the window, each pixel copied whole). */
export function drawPixelLook(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.OrthographicCamera) {
  renderer.getDrawingBufferSize(buffer);
  const viewW = (camera.right - camera.left) / camera.zoom, viewH = (camera.top - camera.bottom) / camera.zoom;
  camera.updateMatrixWorld(); right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
  const s = shade.uniforms, b = blit.uniforms, rows = typeof look.lines === 'number';
  let gw: number, gh: number, px: number, py: number;
  if (rows) { // the rows of earlier: the grid the window's own (pixelGrid), the camera on its pixels, nothing moved back
    const g = pixelGrid(buffer.x, buffer.y, look.lines as number); gw = g.w; gh = g.h; px = py = viewH / gh;
  } else { // a game pixel a texel ('fine': half of one), the floor's texel seen from the camera's tilt
    const k = look.lines === 'fine' ? 2 : 1;
    ({ px, py } = texelPixel(CFG.roomKit.texel[0] * k, CFG.roomKit.texel[1] * k, Math.asin(Math.min(1, Math.abs(up.z))), pix));
    ({ w: gw, h: gh } = gridFor(viewW, viewH, px, py, MARGIN, grid));
  }
  ensure(gw, gh); lastRows = Math.round(viewH / py);
  const dr = snapBy(camera.position.dot(right), px), du = snapBy(camera.position.dot(up), py);
  camera.position.addScaledVector(right, dr).addScaledVector(up, du); camera.updateMatrixWorld();
  target!.viewport.set(0, 0, gw, gh); target!.scissor.set(0, 0, gw, gh);
  shaded!.viewport.set(0, 0, gw, gh); shaded!.scissor.set(0, 0, gw, gh);
  camera.layers.set(0); // (the fine layer is drawn on its own: drawFine)
  if (rows) { renderer.setRenderTarget(target); renderer.render(scene, camera); fineDrawn = drawFine(renderer, scene, camera, gw, gh); }
  else { // the frustum widened to the whole grid (its margin), then put back
    const l = camera.left, r = camera.right, t = camera.top, bt = camera.bottom;
    camera.left = -gw * px * camera.zoom / 2; camera.right = -camera.left; camera.top = gh * py * camera.zoom / 2; camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
    renderer.setRenderTarget(target); renderer.render(scene, camera); fineDrawn = drawFine(renderer, scene, camera, gw, gh);
    camera.left = l; camera.right = r; camera.top = t; camera.bottom = bt; camera.updateProjectionMatrix();
  }
  s.tColor.value = target!.texture; s.tDepth.value = target!.depthTexture; s.grid.value.set(gw, gh);
  s.outline.value = look.outline ? 1 : 0; s.bands.value = look.bands ? 1 : 0; s.range.value = camera.far - camera.near;
  pass(renderer, shade, shaded);
  b.tShaded.value = shaded!.texture; b.size.value.set(shaded!.width, shaded!.height); b.screen.value.set(buffer.x, buffer.y);
  b.grid.value.set(gw, gh); b.whole.value = rows ? 1 : 0;
  b.hasFine.value = fineDrawn ? 1 : 0; b.outline.value = look.outline ? 1 : 0; b.bands.value = look.bands ? 1 : 0;
  if (fine) { b.tFine.value = fine.texture; b.tFineDepth.value = fine.depthTexture; b.tDepth.value = target!.depthTexture; b.fineSize.value.set(fine.width, fine.height); }
  // at the texel the window shows the view itself (viewW × viewH): the grid's middle less the part of a pixel moved
  b.centre.value.set(gw / 2 - dr / px, gh / 2 - du / py); b.scale.value.set(buffer.x * px / viewW, buffer.y * py / viewH);
  pass(renderer, blit, null);
}
