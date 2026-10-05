/* A Tripo creature in pixel art from its own texture (2026-10-05, the owner: the 2k painted textures don't read at the
   game's pixel size). The mage's look (heroPixel.ts) keeps one colour a vertex, so on a creature's simplified mesh its
   eyes and markings blur away; this one wears the texture instead, made pixel art at the size the game draws it by
   tools/texel-bake.ts (render/texelBake.ts: shrunk to at least one texel a game pixel within each UV island, its glowing
   markings kept, its painted shadows lifted, cut to a small palette): `<id>.texel.png` sampled sharp, lit in the same
   bands as the mage, and `<id>.glow.png` lit of its own. Loaded once a creature and shared by every copy (the dev menu's
   creature look "pixel art from its texture"). */
import * as THREE from 'three';
import { CFG } from '../config';
import { toneMap } from './heroPixel';

const loader = new THREE.TextureLoader(), made = new Map<string, Promise<THREE.MeshToonMaterial>>();
/** A baked texture: sharp (one texel, one patch of colour), no mipmaps to blend it off its palette, rows as glTF's. */
const sharpTex = (url: string) => loader.loadAsync(url).then(t => { t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; });

/** The material of creature `id` drawn from its baked texture (`files`, from data/creatures.json), two-sided as Tripo's
    is; loaded once. */
export function texelMaterial(id: string, files: { file: string; glow: string }) {
  let m = made.get(id);
  if (!m) {
    const base = import.meta.env.BASE_URL;
    m = Promise.all([sharpTex(base + files.file), sharpTex(base + files.glow)]).then(([map, glow]) => {
      const mat = new THREE.MeshToonMaterial({ map, gradientMap: toneMap(), emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: CFG.creatures.texel.glowGain, side: THREE.DoubleSide });
      const self = CFG.heroPixel.glow.toFixed(3); // (the faint self-light the mage's look has, so it reads in a dark room)
      mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * ${self};`); };
      mat.userData.shared = true; // (every copy wears it)
      return mat;
    });
    made.set(id, m);
  }
  return m;
}

/** Wear it on every textured mesh under `root` (a copy of creature `id`). */
export async function wearTexel(root: THREE.Object3D, id: string, files: { file: string; glow: string }) {
  const mat = await texelMaterial(id, files);
  root.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && (m.material as THREE.MeshStandardMaterial).map) m.material = mat; });
}
