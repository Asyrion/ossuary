/* The pixel look: the game's look, pixel-art 3D.
   The scene is drawn into a small target with no smoothing and blown up to the window; the camera is snapped to that
   grid so still things don't shimmer as it moves. Dark outlines where a nearer surface meets a farther one (from depth),
   and, optional, light in a few bands, as in cartoon lighting. Colours and blending are the canvas's own (see
   drawPixelLook). The HUD stays sharp (it is HTML).
   It starts at the texel (everything is in the one pixel-art look): one game pixel is one of the
   room kit's texels (`CFG.roomKit.texel`, a 48th of a unit across, the floor's 34th of a unit down the screen), so the
   mage, foes, artifacts, costumes and spells are drawn at the same pixel size as the floors and walls, which land on
   the grid texel for texel. That grid doesn't fall on whole screen pixels (about 2.6 at 1080p), so the blow-up is a sharp
   one: each pixel the same size, its edges blended over one screen pixel, and the camera's step between pixels shown
   smoothly. The dev menu offers `texel` and `fine` (half a texel to a game pixel each way); ?pixel=texel, fine or off
   (off only from the URL, for tools and tests). Tuning in CFG.pixelLook.
   One exception: what is on the fine layer (`FINE`: the coins, so their faces read) is drawn
   into its own target at `CFG.pixelLook.fineLayer` pixels to a game pixel each way, and laid over the grid where it
   stands nearer than what the grid drew, outlined and banded as the rest is. Its size in the room is unchanged; only its
   pixels are smaller. The scene's lights are on that layer too (lights.ts). What writes no depth (glows, steam, fire)
   shows behind a coin even where it stands before it. Its passes run, and their targets are made, only while something
   marked fine (`markFine`) is shown, and only over the box those things fill on screen (`fineBox`): drawn, shaded and
   laid over the window there alone, so the blow-up every screen pixel runs is left as it is. */
import * as THREE from 'three';
import { CFG } from '../config';

/** The pixel grid: 'texel' (a game pixel to a room-kit texel), 'fine' (two to a texel each way), or 0 (off: only from
    the URL, for tools and tests). */
export type Lines = 0 | 'texel' | 'fine';
export interface PixelLook {
  /** the grid: 'texel', 'fine', or 0 for off */ lines: Lines;
  outline: boolean;
  bands: boolean;
}
const P = CFG.pixelLook,
  KEY = 'ossuary.look',
  K = P.fineLayer;
/** The fine layer: an object's meshes on it (`layers.set(FINE)`) are drawn at the finer pixel (see above), and only
    there; with the pixel look off, with everything else. */
export const FINE = 1;
const fineObjects = new Set<THREE.Object3D>();
/** The actors (`markActor`: the mage, the foes, the bosses): their solid meshes stamp the stencil where they are drawn in
    the grid's pass (`stamp`), a pass over the grid turns the stamp into a mask (`drawActors`), and the shading gives
    every pixel of an actor seen a closed outline round it and a rim of light on its top and left (art bible 4.4 and 4.5).
    Their glows, auras and shadows (translucent, or writing no depth) stamp nothing. */
const actorRoots = new Set<THREE.Object3D>();
/** Mark `o` as an actor, for the outline and the rim; it is forgotten once it has left the scene. */
export function markActor(o: THREE.Object3D) {
  actorRoots.add(o);
}
/** Mark `o` as holding what is on the fine layer (pickupLooks.ts does, for every coin it builds), so the fine pass runs
    while it is shown; it is forgotten once it has left the scene. */
export function markFine(o: THREE.Object3D) {
  fineObjects.add(o);
}
const box = new THREE.Box3(),
  corner = new THREE.Vector3(),
  fineBox = new THREE.Vector4(),
  areas: THREE.Vector4[] = [];
let nAreas = 0;
const overlap = (a: THREE.Vector4, b: THREE.Vector4) => a.x < b.z && b.x < a.z && a.y < b.w && b.y < a.w;
/** The boxes (in fine pixels, x0 y0 x1 y1, padded for the outline) that what is marked fine and shown in `scene` fills on
    the grid `gw` × `gh` as `camera` sees it: one to each thing marked, or to each group of them that overlap (`areas`, the
    first `nAreas`), and all of them (`fineBox`); forgetting what has left the scene. False when nothing shows. */
function fineShown(scene: THREE.Scene, camera: THREE.Camera, gw: number, gh: number) {
  const pad = K + 2; // (the outline and a pixel's rounding)
  nAreas = 0;
  for (const o of fineObjects) {
    let p = o,
      seen = o.visible;
    while (p.parent) {
      p = p.parent;
      seen &&= p.visible;
    }
    if (p !== scene) {
      fineObjects.delete(o);
      continue;
    }
    if (!seen || box.setFromObject(o).isEmpty()) continue;
    let a0 = Infinity,
      b0 = Infinity,
      a1 = -Infinity,
      b1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      corner
        .set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)
        .project(camera);
      const gx = ((corner.x + 1) / 2) * gw,
        gy = ((corner.y + 1) / 2) * gh;
      a0 = Math.min(a0, gx);
      a1 = Math.max(a1, gx);
      b0 = Math.min(b0, gy);
      b1 = Math.max(b1, gy);
    }
    if (a1 < 0 || b1 < 0 || a0 > gw || b0 > gh) continue; // (off the grid: another room's coin)
    const a = (areas[nAreas] ??= new THREE.Vector4());
    a.set(
      Math.max(0, Math.floor(a0 * K) - pad),
      Math.max(0, Math.floor(b0 * K) - pad),
      Math.min(gw * K, Math.ceil(a1 * K) + pad),
      Math.min(gh * K, Math.ceil(b1 * K) + pad),
    );
    if (a.z > a.x && a.w > a.y) nAreas++;
  }
  // boxes that overlap become one, so nothing is laid over twice
  for (let i = 0; i < nAreas; i++)
    for (let j = i + 1; j < nAreas; j++) {
      const a = areas[i],
        b = areas[j];
      if (!overlap(a, b)) continue;
      a.set(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.z, b.z), Math.max(a.w, b.w));
      areas[j] = areas[--nAreas];
      areas[nAreas] = b;
      j = i; // (and again from the start, the box having grown)
    }
  fineBox.set(Infinity, Infinity, -Infinity, -Infinity);
  for (let i = 0; i < nAreas; i++) {
    const a = areas[i];
    fineBox.set(Math.min(fineBox.x, a.x), Math.min(fineBox.y, a.y), Math.max(fineBox.z, a.z), Math.max(fineBox.w, a.w));
  }
  return nAreas > 0;
}
/** Every grid the dev menu offers, the texel first. */
export const LINES: readonly Lines[] = ['texel', 'fine'];
const offered = (l: unknown): l is Lines => LINES.includes(l as Lines);
let look: PixelLook = { lines: P.start, outline: true, bands: false };
try {
  // (a choice is kept with the default it was made against: when the default changes, the new one shows once)
  const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as (Partial<PixelLook> & { start?: Lines }) | null;
  if (v && v.start === P.start)
    look = {
      lines: offered(v.lines) ? v.lines : P.start,
      outline: v.outline !== false,
      bands: !!v.bands,
    };
} catch {
  /* no storage: the default */
}
if (typeof location !== 'undefined') {
  const q = new URLSearchParams(location.search).get('pixel');
  if (q === 'off') look.lines = 0;
  else if (q === 'texel' || q === 'fine') look.lines = q;
  else if (q) console.warn(`?pixel=${q}: use off, texel or fine`);
}

/** A game pixel in world units at the texel, along the camera's right and up: a texel across (`tx` to a unit), and down
    the screen as much as a floor texel (`ty` to a unit along z) comes to, seen at `tilt` (radians) from above. */
export function texelPixel(tx: number, ty: number, tilt: number, out = { px: 0, py: 0 }) {
  out.px = 1 / tx;
  out.py = Math.sin(tilt) / ty;
  return out;
}
/** The grid for a view `viewW` × `viewH` world units with pixels `px` × `py`: even both ways (so the camera's whole pixel
    lands on a pixel edge, as the texels do), with `margin` more on each side for the smooth step and the outlines. */
export function gridFor(viewW: number, viewH: number, px: number, py: number, margin: number, out = { w: 0, h: 0 }) {
  const even = (n: number) => 2 * Math.ceil(n / 2 - 1e-6);
  out.w = even(viewW / px) + 2 * margin;
  out.h = even(viewH / py) + 2 * margin;
  return out;
}
/** The rows the pixel look drew in the last frame (0 when it's off, or before the first frame). */
let lastRows = 0;
export const drawnRows = () => (look.lines ? lastRows : 0);
/** How far to move `v` to land on a multiple of `step`. */
export const snapBy = (v: number, step: number) => Math.round(v / step) * step - v;

export const pixelLook = (): Readonly<PixelLook> => look;
export function setPixelLook(change: Partial<PixelLook>) {
  look = { ...look, ...change };
  if (!offered(look.lines)) look.lines = 0;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...look, start: P.start }));
  } catch {
    /* not remembered */
  }
}

/* ---------- drawing ---------- */

// Three passes: the scene into the grid (`target`, with its depth); the grid shaded (outlines, bands) into `shaded`, still
// at the grid's size; and the blow-up to the window. Both targets only grow (in steps of `GROW`), and each frame draws
// into the corner it needs, so a zoom blending between rooms doesn't make new ones every frame.
let target: THREE.WebGLRenderTarget | null = null,
  shaded: THREE.WebGLRenderTarget | null = null;
let fine: THREE.WebGLRenderTarget | null = null,
  over: THREE.WebGLRenderTarget | null = null,
  mask: THREE.WebGLRenderTarget | null = null;
const GROW = 64,
  MARGIN = 2;
const buffer = new THREE.Vector2(),
  right = new THREE.Vector3(),
  up = new THREE.Vector3(),
  pix = { px: 0, py: 0 },
  grid = { w: 0, h: 0 },
  clear = new THREE.Color();
const passScene = new THREE.Scene(),
  passCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
// The floor's grade (docs/art-bible.md 4.2: cool shadows, no black where the room is): the darks lean toward the
// floor's shadow colour at their own lightness, most in the darkest, and black is lifted toward that colour. Shared by
// the grid and the fine layer, so coins are graded as the room round them is; amount and lift 0 leave colours as they are.
const GRADE = {
  gradeShadow: { value: new THREE.Color(0, 0, 0) },
  gradeAmount: { value: 0 },
  gradeLift: { value: 0 },
  gradeInk: { value: 0 },
};
const GRADE_GLSL = /* glsl */ `
    uniform vec3 gradeShadow; uniform float gradeAmount; uniform float gradeLift; uniform float gradeInk;
    // the outline's colour (art bible 4.4): toward a near black tinted by the floor's shadow and a little by what it outlines
    vec3 ink(vec3 c) { return mix(c, gradeShadow * 0.35 + c * 0.12, gradeInk); }
    vec3 grade(vec3 c) {
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      vec3 cool = gradeShadow * (l / max(dot(gradeShadow, vec3(0.299, 0.587, 0.114)), 1e-3));
      c = mix(c, cool, gradeAmount * (1.0 - smoothstep(0.0, 0.45, l)));
      return mix(gradeShadow, vec3(1.0), c) * gradeLift + c * (1.0 - gradeLift);
    }`;
/** The grade in force (the dev menu's readout, tests): the shadow colour as written, the amount and the lift. */
export const gradeNow = () => ({
  shadow: '#' + GRADE.gradeShadow.value.getHexString(THREE.LinearSRGBColorSpace),
  amount: GRADE.gradeAmount.value,
  lift: GRADE.gradeLift.value,
  ink: GRADE.gradeInk.value,
  gap: shade.uniforms.gap.value as number,
});
/** Grade the pixel look for a floor (its `grade`, types.ts FloorLook); none, colours as they are. */
export function setGrade(g?: { shadow: string; amount: number; lift: number; ink?: number; gap?: number }) {
  // (the pass works on encoded colours, so the hex goes in as it is written, not converted to linear light)
  GRADE.gradeShadow.value.setHex(parseInt((g?.shadow ?? '#000000').slice(1), 16), THREE.LinearSRGBColorSpace);
  GRADE.gradeAmount.value = g?.amount ?? 0;
  GRADE.gradeLift.value = g?.lift ?? 0;
  GRADE.gradeInk.value = g?.ink ?? 0;
  shade.uniforms.gap.value = g?.gap ?? P.outlineGap;
}
const shade = new THREE.ShaderMaterial({
  depthTest: false,
  depthWrite: false, // (three writes it as GLSL 3 under WebGL 2, texelFetch included)
  uniforms: {
    tColor: { value: null },
    tDepth: { value: null },
    tMask: { value: null },
    actors: { value: 0 },
    rimColor: { value: new THREE.Color().setHex(parseInt(P.actors.rim.slice(1), 16), THREE.LinearSRGBColorSpace) },
    rim: { value: P.actors.rimAmount },
    rampSteps: { value: P.actors.steps },
    cool: { value: P.actors.cool },
    warm: { value: P.actors.warm },
    grid: { value: new THREE.Vector2() },
    outline: { value: 0 },
    bands: { value: 0 },
    gap: { value: P.outlineGap },
    dark: { value: P.outlineDark },
    steps: { value: P.bands },
    range: { value: 1 },
    ...GRADE,
  },
  vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tColor; uniform sampler2D tDepth; uniform sampler2D tMask; uniform vec2 grid;
    uniform float outline; uniform float bands; uniform float gap; uniform float dark; uniform float steps; uniform float range;
    uniform float actors; uniform vec3 rimColor; uniform float rim;
    uniform float rampSteps; uniform float cool; uniform float warm;
    ${GRADE_GLSL}
    const vec3 LUM = vec3(0.299, 0.587, 0.114);
    // an actor's light on its own ramp: in a few steps even to the eye, the hue kept, then its darks turned toward the
    // floor's shadow colour (where the floor has one) and its lights toward the warm light, each at its own lightness
    vec3 ramp(vec3 c) {
      float l = dot(c, LUM), q = max(floor(sqrt(l) * rampSteps + 0.5), 1.0) / rampSteps;
      c *= min(q * q / max(l, 1e-4), 4.0);
      l = q * q;
      vec3 dim = gradeShadow * (l / max(dot(gradeShadow, LUM), 1e-3)), lit = rimColor * (l / dot(rimColor, LUM));
      c = mix(c, dim, cool * (1.0 - smoothstep(0.08, 0.4, l)) * step(1e-3, gradeAmount));
      return mix(c, lit, warm * smoothstep(0.45, 0.85, l));
    }
    ivec2 at(ivec2 p) { return clamp(p, ivec2(0), ivec2(grid) - 1); }
    float depthAt(ivec2 p) { return texelFetch(tDepth, at(p), 0).r * range; }
    // an actor seen there (its stamp, turned into the mask)
    bool actorAt(ivec2 p) { return actors > 0.5 && texelFetch(tMask, at(p), 0).r > 0.5; }
    void main() {
      ivec2 p = ivec2(gl_FragCoord.xy);
      vec3 col = texelFetch(tColor, p, 0).rgb;
      bool me = actorAt(p);
      ivec2 n[4] = ivec2[4](p - ivec2(1, 0), p + ivec2(0, 1), p + ivec2(1, 0), p - ivec2(0, 1));
      if (outline > 0.5) { // the nearer side of an edge: a neighbour lies more than gap units farther away
        float d = depthAt(p), farther = 0.0;
        // (an actor's own edge is left to its outline outside it, so that stays one pixel wide)
        for (int i = 0; i < 4; i++) if (!me || actorAt(n[i])) farther = max(farther, depthAt(n[i]) - d);
        if (farther > gap) col = ink(col * pow(1.0 - dark, 1.0 / 2.2)); // (as dark as 1 - dark in linear light)
        // the actor's closed outline, outside it all round: a pixel beside one, whatever lies there, in its colour darkened
        if (!me) for (int i = 0; i < 4; i++) if (actorAt(n[i])) { col = ink(texelFetch(tColor, at(n[i]), 0).rgb * pow(1.0 - dark, 1.0 / 2.2)); break; }
      }
      gl_FragColor = vec4(grade(col), 1.0); // (tone-mapped and encoded already, by the scene's own shaders)
      if (me) gl_FragColor.rgb = ramp(gl_FragColor.rgb);
      if (bands > 0.5) { // light in a few steps, the hue kept: steps even to the eye (finer in the dark), never black
        float l = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114)), s = sqrt(l);
        float q = max(floor(s * steps + 0.5), 1.0) / steps;
        gl_FragColor.rgb *= min(q * q / max(l, 1e-4), 4.0);
      }
      // the rim: an actor's top and left edge caught in a warm light from above and the left (where it is three pixels
      // thick or more: a leg or a horn stays its own colour inside its outline)
      if (me && ((!actorAt(n[1]) && actorAt(n[3]) && actorAt(p - ivec2(0, 2))) || (!actorAt(n[0]) && actorAt(n[2]) && actorAt(p + ivec2(2, 0))))) gl_FragColor.rgb = mix(gl_FragColor.rgb, max(gl_FragColor.rgb, rimColor), rim);
    }`,
});
const blit = new THREE.ShaderMaterial({
  depthTest: false,
  depthWrite: false,
  uniforms: {
    tShaded: { value: null },
    size: { value: new THREE.Vector2() },
    centre: { value: new THREE.Vector2() },
    screen: { value: new THREE.Vector2() },
    scale: { value: new THREE.Vector2() },
  },
  vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tShaded; uniform vec2 size; uniform vec2 centre; uniform vec2 screen; uniform vec2 scale;
    void main() {
      // where this screen pixel falls on the grid (in game pixels), then a sharp blow-up: inside a game
      // pixel its own colour, blended with the next only over the last screen pixel before the edge (filtered linearly)
      vec2 g = centre + (gl_FragCoord.xy - screen * 0.5) / scale - 0.5;
      vec2 i = floor(g), f = clamp((fract(g) - 0.5) * scale + 0.5, 0.0, 1.0);
      gl_FragColor = vec4(texture2D(tShaded, (i + f + 0.5) / size).rgb, 1.0);
    }`,
});
// The fine layer kept out of the blow-up above, which every screen pixel runs every frame (a software renderer pays for
// code it skips): it is shaded at its own pixel inside its box (`fineShade`, into `over`: premultiplied, the coin banded,
// its outline a translucent dark), then laid over the window by a quad covering only that box (`fineOver`); each coin,
// or group of coins that overlap, has a box of its own (`areas`).
const fineShade = new THREE.ShaderMaterial({
  depthTest: false,
  depthWrite: false,
  uniforms: {
    tFine: { value: null },
    tFineDepth: { value: null },
    tDepth: { value: null },
    fineBox: { value: fineBox },
    outline: { value: 0 },
    dark: { value: P.outlineDark },
    bands: { value: 0 },
    steps: { value: P.bands },
    ...GRADE,
  },
  vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */ `
    ${GRADE_GLSL}
    uniform sampler2D tFine; uniform sampler2D tFineDepth; uniform sampler2D tDepth; uniform vec4 fineBox; uniform float outline; uniform float dark;
    uniform float bands; uniform float steps;
    const int K = ${K};
    // light in steps, as the shade pass bands the grid
    vec3 band(vec3 c) {
      if (bands < 0.5) return c;
      float l = dot(c, vec3(0.299, 0.587, 0.114)), s = sqrt(l), q = max(floor(s * steps + 0.5), 1.0) / steps;
      return c * min(q * q / max(l, 1e-4), 4.0);
    }
    // inside the box the fine layer was drawn in this frame (outside it, its target holds nothing of this frame)
    bool inBox(ivec2 q) { return all(greaterThanEqual(q, ivec2(fineBox.xy))) && all(lessThan(q, ivec2(fineBox.zw))); }
    // a fine pixel drawn there, and nearer than what the grid drew in its game pixel
    bool seen(ivec2 q) {
      if (!inBox(q)) return false;
      return texelFetch(tFine, q, 0).a > 0.5 && texelFetch(tFineDepth, q, 0).r <= texelFetch(tDepth, q / K, 0).r + 1e-6;
    }
    void main() {
      ivec2 q = ivec2(gl_FragCoord.xy);
      if (seen(q)) { gl_FragColor = vec4(band(grade(texelFetch(tFine, q, 0).rgb)), 1.0); return; }
      gl_FragColor = vec4(0.0);
      // within a game pixel of a coin, its outline (as thick as the grid's, and as dark)
      if (outline > 0.5) for (int d = 1; d <= K; d++)
        if (seen(q + ivec2(d, 0)) || seen(q - ivec2(d, 0)) || seen(q + ivec2(0, d)) || seen(q - ivec2(0, d))) { gl_FragColor.a = 1.0 - pow(1.0 - dark, 1.0 / 2.2); return; }
    }`,
});
const fineOver = new THREE.ShaderMaterial({
  depthTest: false,
  depthWrite: false,
  transparent: true,
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  uniforms: {
    tOver: { value: null },
    rect: { value: new THREE.Vector4() },
    fineSize: { value: new THREE.Vector2() },
    area: { value: new THREE.Vector4() },
    centre: { value: new THREE.Vector2() },
    screen: { value: new THREE.Vector2() },
    scale: { value: new THREE.Vector2() },
  },
  vertexShader:
    'uniform vec4 rect; void main() { gl_Position = vec4(mix(rect.xy, rect.zw, position.xy * 0.5 + 0.5), 0.0, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tOver; uniform vec2 fineSize; uniform vec4 area; uniform vec2 centre; uniform vec2 screen; uniform vec2 scale;
    const int K = ${K};
    void main() {
      // blown up as the grid is, at its own pixel, never reading outside its box
      vec2 g = centre + (gl_FragCoord.xy - screen * 0.5) / scale - 0.5, gf = (g + 0.5) * float(K) - 0.5;
      vec2 fi = floor(gf), ff = clamp((fract(gf) - 0.5) * scale / float(K) + 0.5, 0.0, 1.0);
      gl_FragColor = texture2D(tOver, clamp(fi + ff + 0.5, area.xy + 0.5, area.zw - 0.5) / fineSize);
    }`,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
quad.frustumCulled = false;
passScene.add(quad);
const pass = (renderer: THREE.WebGLRenderer, m: THREE.Material, to: THREE.WebGLRenderTarget | null) => {
  quad.material = m;
  renderer.setRenderTarget(to);
  renderer.render(passScene, passCamera);
};

function ensure(w: number, h: number) {
  if (target && target.width >= w && target.height >= h) return;
  const W = Math.max(GROW * Math.ceil(w / GROW), target?.width ?? 0),
    H = Math.max(GROW * Math.ceil(h / GROW), target?.height ?? 0);
  target?.depthTexture?.dispose();
  target?.dispose();
  shaded?.dispose();
  fine?.depthTexture?.dispose();
  fine?.dispose();
  over?.dispose();
  mask?.dispose(); // (its depth is the grid's, gone above)
  mask = null;
  target = new THREE.WebGLRenderTarget(W, H, {
    type: THREE.UnsignedByteType,
    colorSpace: THREE.SRGBColorSpace,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
    stencilBuffer: true,
    samples: 0,
  });
  // (depth and stencil together: the actors stamp the stencil, read back through the mask)
  target.depthTexture = new THREE.DepthTexture(W, H, THREE.UnsignedInt248Type);
  target.depthTexture.format = THREE.DepthStencilFormat;
  // Blend as the canvas does. three tone-maps and encodes to sRGB in each material's shader only when it draws to the
  // screen (or an XR target); into any other target it writes linear light, blended as such, and faint translucent
  // light (a daylight shaft, rime, a torch's halo) came out far brighter and harder-edged than on the canvas. Flagged
  // as an XR target, the scene is tone-mapped and encoded per material, into plain 8-bit storage (RGBA8, so the GPU
  // doesn't encode it a second time), and the shading and blow-up only copy it.
  target.texture.internalFormat = 'RGBA8';
  (target as THREE.WebGLRenderTarget & { isXRRenderTarget: boolean }).isXRRenderTarget = true;
  // the shaded grid, filtered linearly for the sharp blow-up's one blended screen pixel (its values already encoded)
  shaded = new THREE.WebGLRenderTarget(W, H, {
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    samples: 0,
  });
  shaded.texture.internalFormat = 'RGBA8';
  fine = over = null;
  target.scissorTest = shaded.scissorTest = true;
}
/** The fine layer's targets, made the first time they are needed at the grid's size, K × K pixels to each of the grid's:
    the layer drawn, with its own depth (encoded as the scene is, read pixel by pixel), and the layer shaded (`over`,
    filtered linearly for the sharp blow-up). */
function ensureFine() {
  if (fine) return fine;
  const W = target!.width * K,
    H = target!.height * K;
  fine = new THREE.WebGLRenderTarget(W, H, {
    type: THREE.UnsignedByteType,
    colorSpace: THREE.SRGBColorSpace,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
    samples: 0,
  });
  fine.depthTexture = new THREE.DepthTexture(W, H);
  fine.texture.internalFormat = 'RGBA8';
  fine.scissorTest = true;
  (fine as THREE.WebGLRenderTarget & { isXRRenderTarget: boolean }).isXRRenderTarget = true;
  over = new THREE.WebGLRenderTarget(W, H, {
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    samples: 0,
  });
  over.texture.internalFormat = 'RGBA8';
  over.scissorTest = true;
  return fine;
}

/** The mask of the actors seen (`mask`, the grid's size), sharing the grid's depth and stencil, made the first time an
    actor is shown. */
function ensureMask() {
  if (mask) return mask;
  mask = new THREE.WebGLRenderTarget(target!.width, target!.height, {
    type: THREE.UnsignedByteType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
    stencilBuffer: true,
    samples: 0,
  });
  mask.depthTexture = target!.depthTexture; // (the grid's stamp read through its stencil)
  mask.scissorTest = true;
  return mask;
}
const solid = (m: THREE.Material) => !m.transparent && m.depthWrite && m.visible;
/** While the grid is drawn, an actor's solid meshes stamp 1 into the stencil where they pass the depth test (as the
    frontmost so far: what is drawn nearer after them is rare, three drawing the solid front to back). */
let stamping = false;
function stamp(this: THREE.Object3D, ...[, , , , mat]: Parameters<THREE.Object3D['onBeforeRender']>) {
  if (!stamping || !this.userData.actor || !solid(mat)) return;
  mat.stencilWrite = true;
  mat.stencilRef = 1;
  mat.stencilFunc = THREE.AlwaysStencilFunc;
  mat.stencilZPass = THREE.ReplaceStencilOp;
}
function unstamp(this: THREE.Object3D, ...[, , , , mat]: Parameters<THREE.Object3D['onAfterRender']>) {
  if (!mat.stencilWrite || !stamping) return;
  mat.stencilWrite = false;
  mat.stencilZPass = THREE.KeepStencilOp;
}
/** The actors' meshes made to stamp (once each), forgetting the actors that have left the scene. Whether any is shown. */
function tagActors(scene: THREE.Scene) {
  let any = false;
  for (const o of actorRoots) {
    let p = o,
      seen = o.visible;
    while (p.parent) {
      p = p.parent;
      seen &&= p.visible;
    }
    if (p !== scene) {
      actorRoots.delete(o);
      continue;
    }
    if (!seen) continue;
    any = true;
    o.traverse((c) => {
      if (!(c as THREE.Mesh).isMesh || c.userData.actor) return;
      c.userData.actor = true;
      const before = c.onBeforeRender.bind(c),
        after = c.onAfterRender.bind(c);
      c.onBeforeRender = (...a) => {
        stamp.apply(c, a);
        before(...a);
      };
      c.onAfterRender = (...a) => {
        unstamp.apply(c, a);
        after(...a);
      };
    });
  }
  return any;
}
const maskFill = new THREE.ShaderMaterial({
  depthTest: false,
  depthWrite: false,
  stencilWrite: true, // (three tests the stencil only for a material that writes it; this one writes nothing to it)
  stencilWriteMask: 0,
  stencilRef: 1,
  stencilFunc: THREE.EqualStencilFunc,
  vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
});
/** The actors' stamp turned into `mask` (the grid's `gw` × `gh`): white where an actor is seen, black elsewhere. */
function drawActors(renderer: THREE.WebGLRenderer, gw: number, gh: number) {
  const m = ensureMask(),
    auto = renderer.autoClear;
  m.viewport.set(0, 0, gw, gh);
  m.scissor.set(0, 0, gw, gh);
  renderer.getClearColor(clear);
  const alpha = renderer.getClearAlpha();
  renderer.setRenderTarget(m);
  renderer.setClearColor(0x000000, 1);
  renderer.clear(true, false, false); // (the colour only: the depth and the stamp are the grid's)
  renderer.autoClear = false;
  pass(renderer, maskFill, m);
  renderer.autoClear = auto;
  renderer.setClearColor(clear, alpha);
}

/** Whether the fine layer drew anything in the last frame. */
let fineDrawn = false;
export const fineLayerDrawn = () => fineDrawn;
/** The fine layer alone into its target (the grid's `gw` × `gh`, K times finer), on a clear ground, inside the box what
    is marked fine fills on screen: the scene's background left out, its lights kept (they are on the layer too), its
    matrices as the grid's pass left them. Whether it drew anything; nothing is done while nothing marked fine is shown. */
function drawFine(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, gw: number, gh: number) {
  if (!fineShown(scene, camera, gw, gh)) return false;
  const f = ensureFine();
  f.viewport.set(0, 0, gw * K, gh * K);
  f.scissor.set(fineBox.x, fineBox.y, fineBox.z - fineBox.x, fineBox.w - fineBox.y);
  const bg = scene.background,
    alpha = renderer.getClearAlpha(),
    calls = renderer.info.render.calls,
    auto = scene.matrixWorldAutoUpdate;
  renderer.getClearColor(clear);
  renderer.setClearColor(0x000000, 0);
  scene.background = null;
  scene.matrixWorldAutoUpdate = false;
  camera.layers.set(FINE);
  renderer.setRenderTarget(f);
  renderer.render(scene, camera);
  camera.layers.set(0);
  scene.background = bg;
  scene.matrixWorldAutoUpdate = auto;
  renderer.setClearColor(clear, alpha);
  return renderer.info.render.calls > calls;
}

/** Draw the scene in the pixel look (when it is on: check `pixelLook().lines` first). The camera is moved to the
    nearest whole pixel of the grid along its own right and up, after it has been placed. At the texel the blow-up puts
    back the part of a pixel it was moved, so the camera glides while the room stays on its texels. */
export function drawPixelLook(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.OrthographicCamera) {
  renderer.getDrawingBufferSize(buffer);
  const viewW = (camera.right - camera.left) / camera.zoom,
    viewH = (camera.top - camera.bottom) / camera.zoom;
  camera.updateMatrixWorld();
  right.setFromMatrixColumn(camera.matrixWorld, 0);
  up.setFromMatrixColumn(camera.matrixWorld, 1);
  const s = shade.uniforms,
    b = blit.uniforms;
  // a game pixel a texel ('fine': half of one), the floor's texel seen from the camera's tilt
  const k = look.lines === 'fine' ? 2 : 1;
  const { px, py } = texelPixel(
    CFG.roomKit.texel[0] * k,
    CFG.roomKit.texel[1] * k,
    Math.asin(Math.min(1, Math.abs(up.z))),
    pix,
  );
  const { w: gw, h: gh } = gridFor(viewW, viewH, px, py, MARGIN, grid);
  ensure(gw, gh);
  lastRows = Math.round(viewH / py);
  const dr = snapBy(camera.position.dot(right), px),
    du = snapBy(camera.position.dot(up), py);
  camera.position.addScaledVector(right, dr).addScaledVector(up, du);
  camera.updateMatrixWorld();
  target!.viewport.set(0, 0, gw, gh);
  target!.scissor.set(0, 0, gw, gh);
  shaded!.viewport.set(0, 0, gw, gh);
  shaded!.scissor.set(0, 0, gw, gh);
  camera.layers.set(0); // (the fine layer is drawn on its own: drawFine)
  // the frustum widened to the whole grid (its margin), then put back
  const l = camera.left,
    r = camera.right,
    t = camera.top,
    bt = camera.bottom;
  camera.left = (-gw * px * camera.zoom) / 2;
  camera.right = -camera.left;
  camera.top = (gh * py * camera.zoom) / 2;
  camera.bottom = -camera.top;
  camera.updateProjectionMatrix();
  const actorsDrawn = tagActors(scene);
  stamping = actorsDrawn;
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  stamping = false;
  if (actorsDrawn) drawActors(renderer, gw, gh);
  fineDrawn = drawFine(renderer, scene, camera, gw, gh);
  camera.left = l;
  camera.right = r;
  camera.top = t;
  camera.bottom = bt;
  camera.updateProjectionMatrix();
  s.tColor.value = target!.texture;
  s.tDepth.value = target!.depthTexture;
  s.tMask.value = actorsDrawn ? mask!.texture : target!.texture;
  s.actors.value = actorsDrawn ? 1 : 0;
  (s.grid.value as THREE.Vector2).set(gw, gh);
  s.outline.value = look.outline ? 1 : 0;
  s.bands.value = look.bands ? 1 : 0;
  s.range.value = camera.far - camera.near;
  pass(renderer, shade, shaded);
  b.tShaded.value = shaded!.texture;
  (b.size.value as THREE.Vector2).set(shaded!.width, shaded!.height);
  (b.screen.value as THREE.Vector2).set(buffer.x, buffer.y);
  // at the texel the window shows the view itself (viewW × viewH): the grid's middle less the part of a pixel moved
  (b.centre.value as THREE.Vector2).set(gw / 2 - dr / px, gh / 2 - du / py);
  (b.scale.value as THREE.Vector2).set((buffer.x * px) / viewW, (buffer.y * py) / viewH);
  pass(renderer, blit, null);
  if (fineDrawn) laidOver(renderer, gw, gh);
}
const ndc = (v: number, of: number) => Math.min(1, Math.max(-1, (v / of) * 2 - 1));
/** The fine layer shaded at its own pixel inside its boxes, then laid over the window (after the blow-up, blended, with
    the blow-up's own mapping), by a quad over each box alone. */
function laidOver(renderer: THREE.WebGLRenderer, gw: number, gh: number) {
  const f = fine!,
    o = over!,
    u = fineShade.uniforms,
    v = fineOver.uniforms,
    b = blit.uniforms;
  u.tFine.value = f.texture;
  u.tFineDepth.value = f.depthTexture;
  u.tDepth.value = target!.depthTexture;
  u.outline.value = look.outline ? 1 : 0;
  u.bands.value = look.bands ? 1 : 0;
  o.viewport.set(0, 0, gw * K, gh * K);
  for (let i = 0; i < nAreas; i++) {
    const a = areas[i];
    o.scissor.set(a.x, a.y, a.z - a.x, a.w - a.y);
    pass(renderer, fineShade, o);
  }
  v.tOver.value = o.texture;
  (v.fineSize.value as THREE.Vector2).set(o.width, o.height);
  (v.centre.value as THREE.Vector2).copy(b.centre.value as THREE.Vector2);
  (v.scale.value as THREE.Vector2).copy(b.scale.value as THREE.Vector2);
  (v.screen.value as THREE.Vector2).copy(b.screen.value as THREE.Vector2);
  // each box on the window: from fine pixels back to screen pixels, as the blow-up maps them, a screen pixel wider
  const sw = buffer.x,
    sh = buffer.y,
    c = b.centre.value as THREE.Vector2,
    k = b.scale.value as THREE.Vector2;
  const at = (x: number, y: number) => [(x / K - c.x) * k.x + sw / 2, (y / K - c.y) * k.y + sh / 2];
  const auto = renderer.autoClear;
  renderer.autoClear = false;
  for (let i = 0; i < nAreas; i++) {
    const a = areas[i],
      [x0, y0] = at(a.x, a.y),
      [x1, y1] = at(a.z, a.w);
    (v.area.value as THREE.Vector4).copy(a);
    (v.rect.value as THREE.Vector4).set(ndc(x0 - 1, sw), ndc(y0 - 1, sh), ndc(x1 + 1, sw), ndc(y1 + 1, sh));
    pass(renderer, fineOver, null);
  }
  renderer.autoClear = auto;
}
