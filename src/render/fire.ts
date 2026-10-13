/* The room kit's fire (M3.5 step 3; docs/effects.md): the flames of torches, braziers and candles, in the style of the
   spell effects. A flame is a cream-white core in a sheath of its colour with a faint red edge, tongues licking beside
   it and embers rising from it. Everything moves on the GPU from one clock (`tickFire`): the flames lick and flicker,
   each on its own beat, and the embers rise and shrink, so a room full of fire costs nothing per step. Colours are
   baked into each fire's geometry, so every fire in the game shares four materials, and a fire draws in three or four
   calls (the sheath, the core, the edge, the embers). The sheath and core are painted in their colours rather than
   added as light, so a flame keeps its colours in front of a bright wall; only the faint edge and the embers add light. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { markShared } from './materials';

const clock = { value: 0 };
/** Every flame's time (seconds); the loop sets it each step. */
export function tickFire(t: number) {
  clock.value = t;
}

// Each vertex knows its flame: how far up it is (0 at the base, 1 at the tip), its flame's beat, and its flame's base.
// A flame stretches and shrinks about its base, and sways more the higher up it is.
const FLAME_VERT = `#include <begin_vertex>
float fOff = dot(modelMatrix[3].xyz, vec3(1.37, .7, 2.11)) + aFlame.y;
float fk = aFlame.x;
float fh = (transformed.y - aFlame.z) * (.86 + .1 * sin(uFire * 17. + fOff) + .06 * sin(uFire * 29. + fOff * 2.));
transformed.y = aFlame.z + fh;
transformed.x += sin(uFire * 11. - fk * 5. + fOff) * .22 * fh * fk;
transformed.z += cos(uFire * 9. - fk * 4. + fOff * 1.3) * .16 * fh * fk;`;
// An ember starts at its spot in the flame, rises `rise` while it drifts round, and shrinks to nothing; then again.
const EMBER_VERT = `#include <begin_vertex>
float eOff = dot(modelMatrix[3].xyz, vec3(1.37, .7, 2.11));
float ek = fract(uFire * aEmber.y + aEmber.x + eOff * .13);
float ea = aEmber.x * 37. + uFire * 2.3 + eOff;
transformed = transformed * (1. - ek * .9) + aCentre + vec3(sin(ea) * .25, 1., cos(ea) * .25) * aEmber.z * ek;`;

function fireMaterial(kind: 'sheath' | 'core' | 'edge' | 'ember') {
  const m = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    opacity: kind === 'sheath' ? 0.9 : 1,
    blending: kind === 'edge' || kind === 'ember' ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  m.onBeforeCompile = (s) => {
    s.uniforms.uFire = clock;
    const attrs = kind === 'ember' ? 'attribute vec3 aCentre;\nattribute vec3 aEmber;\n' : 'attribute vec3 aFlame;\n';
    s.vertexShader =
      `uniform float uFire;\n${attrs}` +
      s.vertexShader.replace('#include <begin_vertex>', kind === 'ember' ? EMBER_VERT : FLAME_VERT);
  };
  m.customProgramCacheKey = () => 'fire-' + kind;
  return markShared(m);
}
const MAT = {
  sheath: fireMaterial('sheath'),
  core: fireMaterial('core'),
  edge: fireMaterial('edge'),
  ember: fireMaterial('ember'),
};

/** A fire's colours: its core, its sheath, its edge (added light, so darker is fainter) and its embers. */
export interface FirePalette {
  core: number;
  body: number;
  edge: number;
  ember: number;
}
/** The colours of a fire from its flame and its light (a floor look's torch): the core near white, the sheath the light's
    colour, the edge the sheath turned red and dim. */
export function firePalette(flame: number, light: number): FirePalette {
  const c = (hex: number) => new THREE.Color(hex);
  return {
    core: c(flame).lerp(c(0xffffff), 0.55).getHex(),
    body: c(light).lerp(c(flame), 0.25).getHex(),
    edge: c(light).lerp(c(0xb01808), 0.6).multiplyScalar(0.5).getHex(),
    ember: c(flame).lerp(c(light), 0.4).getHex(),
  };
}
export const EMBER_FIRE = firePalette(0xffc36a, 0xff8a34);

/** One flame of a fire: its base at (x, y, z), `h` tall and `w` wide; `tongues` smaller ones lick beside it; `beat` sets
    it apart from its neighbours. */
export interface FlameSpec {
  x: number;
  y: number;
  z: number;
  h: number;
  w: number;
  tongues?: number;
  beat?: number;
}

// a flame's outline, turned round its axis: a rounded base, widest a third of the way up, drawn out to a point
const PROFILE = [
  [0, 0],
  [0.55, 0.05],
  [0.88, 0.17],
  [1, 0.3],
  [0.82, 0.5],
  [0.5, 0.7],
  [0.22, 0.87],
  [0, 1],
].map(([r, y]) => new THREE.Vector2(r * 0.5, y));

function drop(x: number, y: number, z: number, w: number, h: number, color: number, beat: number) {
  const g = new THREE.LatheGeometry(PROFILE, 7);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g.scale(w, h, w).translate(x, y, z);
  const n = g.attributes.position.count,
    col = new THREE.Color(color),
    cols = new Float32Array(n * 3),
    fl = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    cols.set([col.r, col.g, col.b], i * 3);
    fl.set([(g.attributes.position.getY(i) - y) / h, beat, y], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.setAttribute('aFlame', new THREE.BufferAttribute(fl, 3));
  return g;
}
const joined = (parts: THREE.BufferGeometry[]) => {
  const g = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return g;
};

/** Whatever a fire's flames and embers reach, for culling (the shaders move them past their geometry). */
function reach(specs: FlameSpec[], rise: number) {
  const box = new THREE.Box3();
  for (const s of specs)
    box
      .expandByPoint(new THREE.Vector3(s.x, s.y, s.z))
      .expandByPoint(new THREE.Vector3(s.x, s.y + s.h * 1.3 + rise, s.z));
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  sphere.radius += 0.3;
  return sphere;
}

/** A fire: its flames (a core and a sheath with an edge, each flame on its own beat, and the tongues beside it) and
    `embers` embers rising `rise` from them. The group is flagged `userData.fire`: it moves by itself (show or hide it). */
export function makeFire(specs: FlameSpec[], pal: FirePalette, embers = 0, rise = 0.5) {
  const cores: THREE.BufferGeometry[] = [],
    sheaths: THREE.BufferGeometry[] = [],
    edges: THREE.BufferGeometry[] = [];
  specs.forEach((s, i) => {
    const beat = s.beat ?? i * 2.3;
    cores.push(drop(s.x, s.y, s.z, s.w * 0.42, s.h * 0.5, pal.core, beat));
    sheaths.push(drop(s.x, s.y, s.z, s.w, s.h, pal.body, beat));
    edges.push(drop(s.x, s.y - s.h * 0.04, s.z, s.w * 1.45, s.h * 1.2, pal.edge, beat));
    for (let k = 0; k < (s.tongues ?? 0); k++) {
      const a = (k / (s.tongues ?? 1)) * Math.PI * 2 + beat,
        r = s.w * 0.38;
      sheaths.push(
        drop(
          s.x + Math.cos(a) * r,
          s.y + s.h * 0.05,
          s.z + Math.sin(a) * r,
          s.w * 0.4,
          s.h * (0.45 + 0.1 * (k % 2)),
          pal.body,
          beat + 1.7 + k,
        ),
      );
    }
  });
  const g = new THREE.Group();
  g.userData.fire = true;
  const sphere = reach(specs, rise);
  const sheath = new THREE.Mesh(joined(sheaths), MAT.sheath),
    core = new THREE.Mesh(joined(cores), MAT.core),
    edge = new THREE.Mesh(joined(edges), MAT.edge);
  sheath.renderOrder = 2;
  core.renderOrder = 3;
  edge.renderOrder = 3;
  g.add(sheath, core, edge); // (the core is painted over the sheath inside it)
  if (embers) {
    const e = new THREE.Mesh(emberGeometry(specs, pal.ember, embers, rise), MAT.ember);
    e.renderOrder = 2;
    g.add(e);
  }
  for (const m of g.children as THREE.Mesh[]) m.geometry.boundingSphere = sphere;
  return g;
}

/** Turn a fire made by `makeFire` to `pal` where it stands (its geometries are its own): M4.10's brazier taken by darkness
    burns with Blackfire. Each part takes its colour by its material; embers keep their few bright ones. */
export function recolourFire(fire: THREE.Object3D, pal: FirePalette) {
  const by = new Map<THREE.Material, number>([
    [MAT.sheath, pal.body],
    [MAT.core, pal.core],
    [MAT.edge, pal.edge],
    [MAT.ember, pal.ember],
  ]);
  fire.traverse((o) => {
    const m = o as THREE.Mesh,
      hex = m.isMesh ? by.get(m.material as THREE.Material) : undefined,
      a = m.geometry?.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (hex === undefined || !a) return;
    const c = new THREE.Color(hex);
    for (let i = 0; i < a.count; i++) a.setXYZ(i, c.r, c.g, c.b);
    a.needsUpdate = true;
  });
}

/** Motes without a fire (a glowcap's spores): `n` of them rising `rise` from over `specs` (only their places and sizes
    count), `speed` times as fast as a fire's embers. One draw call; they move by themselves. */
export function makeMotes(specs: FlameSpec[], color: number, n: number, rise = 0.5, speed = 1) {
  const m = new THREE.Mesh(emberGeometry(specs, color, n, rise, speed), MAT.ember);
  m.renderOrder = 2;
  m.userData.fire = true;
  m.geometry.boundingSphere = reach(specs, rise);
  return m;
}

/** `n` embers spread over the flames, each a tiny crystal with its own start, speed and rise. */
function emberGeometry(specs: FlameSpec[], color: number, n: number, rise: number, speed = 1) {
  const one = new THREE.OctahedronGeometry(1, 0),
    parts: THREE.BufferGeometry[] = [];
  let seed = 7;
  const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const col = new THREE.Color(color),
    bright = col.clone().lerp(new THREE.Color(0xffffff), 0.5);
  for (let i = 0; i < n; i++) {
    const s = specs[i % specs.length],
      size = Math.max(0.018, s.w * 0.09),
      e = one.clone().scale(size, size * 1.3, size);
    e.deleteAttribute('uv');
    e.deleteAttribute('normal');
    const at = [s.x + (R() - 0.5) * s.w * 0.6, s.y + s.h * (0.2 + R() * 0.3), s.z + (R() - 0.5) * s.w * 0.6],
      ember = [i / n + R() * 0.2, (0.45 + R() * 0.5) * speed, rise * (0.6 + R() * 0.6)];
    const c = R() < 0.35 ? bright : col,
      count = e.attributes.position.count;
    const fill = (v: number[]) => {
      const a = new Float32Array(count * 3);
      for (let k = 0; k < count; k++) a.set(v, k * 3);
      return new THREE.BufferAttribute(a, 3);
    };
    e.setAttribute('color', fill([c.r, c.g, c.b]));
    e.setAttribute('aCentre', fill(at));
    e.setAttribute('aEmber', fill(ember));
    parts.push(e);
  }
  one.dispose();
  return joined(parts);
}
