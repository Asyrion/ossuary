/* Creatures made in Tripo and animated in code (docs/creatures.md): a model whose clips tools/animate-creature.ts baked
   (public/assets/creatures/<id>.glb, data/creatures.json), loaded once and copied, worn as pixel art made from its own
   texture (texturePixel.ts, baked by tools/texel-bake.ts). The townspeople wear them at the Vigil; the dev menu's
   Galleries tab stands one ahead of the mage (dev/creatureGallery.ts); a boss that fights as one and the familiar Fen-Nex
   are loaded ahead (`preloadCreature`), since their looks are built at once: a floor's boss as the floor is built
   (madeBosses.ts), Fen-Nex once the title is up or the rune is bound (fennexLook.ts). The title waits for none of them. */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import data from '../../data/creatures.json';
import { CFG } from '../config';
import { blob } from '../render/materials';
import { texelMaterial, wearTexel } from './texturePixel';
import type { CreatureInfo } from './creatureData';

export const CREATURES = Object.fromEntries(
  Object.entries(data).filter(([k]) => k !== '_comment'),
) as unknown as Record<string, CreatureInfo>;

const loader = new GLTFLoader(),
  loaded = new Map<string, Promise<GLTF>>();

/** The file of a creature, loaded once (its materials shared by every copy: taking one away leaves them). */
function loadFile(file: string) {
  if (!loaded.has(file))
    loaded.set(
      file,
      loader.loadAsync(`${import.meta.env.BASE_URL}${file}`).then((g) => {
        g.scene.traverse((o) => {
          const m = (o as THREE.Mesh).material;
          if (m) (Array.isArray(m) ? m : [m]).forEach((x) => (x.userData.shared = true));
        });
        return g;
      }),
    );
  return loaded.get(file)!;
}

/** Creatures loaded ahead, for a look built at once: the loaded model, its baked pixel-art texture and the material
    made of it (shared by every copy: its glow lit, for a look no hit lights). */
const ready = new Map<string, { gltf: GLTF; map: THREE.Texture; mat: THREE.MeshToonMaterial }>(),
  loading = new Map<string, Promise<void>>();
/** Load creature `id` ahead (a boss that fights as it: madeBosses.ts), once however often it is asked. Never rejects: a
    file that fails leaves the look it would have replaced, with a warning. */
export function preloadCreature(id: string): Promise<void> {
  if (!CREATURES[id]) return Promise.resolve();
  let p = loading.get(id);
  if (!p) loading.set(id, (p = load(id)));
  return p;
}
async function load(id: string) {
  const info = CREATURES[id],
    base = import.meta.env.BASE_URL;
  try {
    const [gltf, mat] = await Promise.all([
      loadFile(info.file),
      texelMaterial(id, { file: base + info.texel.file, glow: base + info.texel.glow }),
    ]);
    if (mat.map) ready.set(id, { gltf, map: mat.map, mat });
  } catch (e) {
    console.warn(`creature ${id}: could not be loaded (${String(e)}); its look stays as it was`);
  }
}
/** Creature `id` loaded ahead, or undefined while it isn't. */
export const readyCreature = (id: string) => ready.get(id);
/** Once every creature asked for so far has loaded or failed (the dev hooks: a browser test waits on it rather than on
    luck). */
export const creaturesLoaded = async () => {
  for (let n = -1; n !== loading.size;) {
    n = loading.size;
    await Promise.all(loading.values());
  }
};

/** A clip played over the others (a flinch, a bite on the run): made additive from its first frame (its rest), once for
    every copy of creature `id`. */
const overClips = new Map<string, THREE.AnimationClip>();
export function overClip(id: string, clip: THREE.AnimationClip) {
  const key = id + '/' + clip.name;
  let o = overClips.get(key);
  if (!o) overClips.set(key, (o = THREE.AnimationUtils.makeClipAdditive(clip.clone())));
  return o;
}

/** A made model ready to stand (the townspeople use it too, at the Vigil): loaded once and copied, worn as pixel art from
    its texture, scaled to its height, on a shadow, with its clips ready in a mixer (a clip that doesn't loop holds its last
    pose). Null when `still()` says it is no longer wanted once it has loaded. Its group stands at the origin. */
export async function madeModel(id: string, still: () => boolean = () => true) {
  const info = CREATURES[id];
  if (!info) return null;
  const gltf = await loadFile(info.file);
  if (!still()) return null;
  const model = cloneSkinned(gltf.scene),
    scale = info.height / info.modelHeight;
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry = m.geometry.clone();
      m.frustumCulled = false;
    }
  }); // (its own geometry: the bake writes colours into it, and taking it away disposes it)
  // (pixel art from its texture, baked by tools/texel-bake.ts at the size the game draws it)
  const base = import.meta.env.BASE_URL;
  await wearTexel(model, id, { file: base + info.texel.file, glow: base + info.texel.glow });
  if (!still()) return null;
  model.scale.setScalar(scale);
  const group = new THREE.Group();
  group.add(model);
  group.add(blob(Math.max(info.modelLength, info.modelHeight * 0.45) * scale * CFG.creatures.shadow));
  const mixer = keepMixer(model),
    actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of gltf.animations) {
    const a = mixer.clipAction(clip);
    a.setLoop(info.clips[clip.name]?.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = true;
    actions[clip.name] = a;
  }
  return { info, group, model, mixer, actions, gltf };
}
/** A mixer for the copy `model`, which taking the copy away stops, letting its actions go (disposeTree, as heroAnim.ts
    lets its own go). A function on the copy, not the mixer: a copy's userData is copied as JSON. */
export function keepMixer(model: THREE.Object3D) {
  const mixer = new THREE.AnimationMixer(model);
  model.userData.stop = () => {
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    delete model.userData.stop;
  };
  return mixer;
}
/** The loaded model of `id`, if it has loaded (for an icon drawn at once). */
export const loadedScene = (id: string) => {
  const info = CREATURES[id];
  return info ? loaded.get(info.file) : undefined;
};
