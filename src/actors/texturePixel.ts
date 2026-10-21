/* Every Tripo model in pixel art from its own texture (the 2k painted textures don't read at the
   game's pixel size; every model from Tripo gets it). The mage's look (heroPixel.ts) keeps one colour a vertex, so on
   a simplified mesh eyes and markings blur away; this wears the texture instead, made pixel art at the size the game
   draws the model by tools/texel-bake.ts (render/texelBake.ts: shrunk to at least one texel a game pixel within each UV
   island, its glowing markings kept, its painted shadows lifted, cut to a small palette): the colour sampled sharp, lit in
   the same bands as the mage, and the glow lit of its own. Loaded once a model and shared by every copy: the animated
   creatures (madeCreatures.ts, their default look) and the made assets (assets/models.ts). The mage keeps its colours in its
   vertices (heroPixel.ts). */
import * as THREE from 'three';
import { CFG } from '../config';
import { toneMap } from './heroPixel';

const loader = new THREE.TextureLoader(),
  made = new Map<string, Promise<THREE.MeshToonMaterial>>();
/** A baked texture: sharp (one texel, one patch of colour), no mipmaps to blend it off its palette, rows as glTF's. */
const sharpTex = (url: string) =>
  loader.loadAsync(url).then((t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false;
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  });

/** The material of the model `key` drawn from its baked texture (`urls`: its colour and its glow), two-sided as Tripo's
    is; loaded once a key. */
export function texelMaterial(key: string, urls: { file: string; glow: string }) {
  let m = made.get(key);
  if (!m) {
    m = Promise.all([sharpTex(urls.file), sharpTex(urls.glow)]).then(([map, glow]) => {
      const mat = new THREE.MeshToonMaterial({
        map,
        gradientMap: toneMap(),
        emissive: 0xffffff,
        emissiveMap: glow,
        emissiveIntensity: CFG.creatures.texel.glowGain,
        side: THREE.DoubleSide,
      });
      const self = { value: CFG.heroPixel.glow };
      mat.userData.self = self; // (the faint self-light the mage's look has, so it reads in a dark room; `selfLight` raises it for one model)
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.selfLight = self;
        sh.fragmentShader =
          'uniform float selfLight;\n' +
          sh.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * selfLight;',
          );
      };
      mat.userData.shared = true; // (every copy wears it)
      return mat;
    });
    made.set(key, m);
    m.catch(() => made.delete(key)); // (a file that failed may be there next time)
  }
  return m;
}

/** The self-light of the model `key`'s material (every copy of it): the townspeople stand brighter at the Vigil. */
export function selfLight(key: string, v: number) {
  void made.get(key)?.then((m) => {
    (m.userData.self as { value: number }).value = v;
  });
}

/** Wear it on every textured mesh under `root`, but for a container's cut face (a material named `inside`,
    tools/art/lid.py), which keeps its own planks drawn at the texel. */
export async function wearTexel(root: THREE.Object3D, key: string, urls: { file: string; glow: string }) {
  const mat = await texelMaterial(key, urls);
  root.traverse((o) => {
    const m = o as THREE.Mesh,
      own = m.material as THREE.MeshStandardMaterial;
    if (m.isMesh && own.map && own.name !== 'inside') m.material = mat;
  });
  return mat;
}
