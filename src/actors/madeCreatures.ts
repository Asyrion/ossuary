/* Creatures made in Tripo and animated in code (docs/creatures.md): a model whose clips tools/animate-creature.ts baked
   (public/assets/creatures/<id>.glb, data/creatures.json), loaded once and copied, worn as pixel art made from its own
   texture (texturePixel.ts, baked by tools/texel-bake.ts). The townspeople wear them at the Vigil; the dev menu's
   Galleries tab stands one ahead of the mage (dev/creatureGallery.ts); a boss that fights as one (the Hallowed Hart) is
   loaded ahead at boot (`preloadCreature`), since its look is built at once (madeBosses.ts). */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import data from '../../data/creatures.json';
import { CFG } from '../config';
import { blob } from '../render/materials';
import { texelMaterial, wearTexel } from './texturePixel';

interface ClipInfo {
  duration: number;
  loop: boolean;
  speed?: number; // (how far a clip that carries it goes a second, in the model's units: a gallop)
  at?: number; // (when its blow falls: a stamp's hooves down)
  events: { t: number; sound: string; at?: string; loud?: boolean }[];
}
interface CreatureInfo {
  file: string;
  height: number;
  fine?: boolean;
  modelHeight: number;
  modelLength: number;
  walkSpeed: number;
  clips: Record<string, ClipInfo>;
  texel: { file: string; glow: string; side: number }; // (every model has its bake: tests/unit/texelBake.test.ts)
}
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

/** Creatures loaded ahead, for a look built at once: the loaded model and its baked pixel-art texture. */
const ready = new Map<string, { gltf: GLTF; map: THREE.Texture }>();
/** Load creature `id` ahead (a boss that fights as it: madeBosses.ts). Never rejects: a file that fails leaves the look
    it would have replaced, with a warning. */
export async function preloadCreature(id: string) {
  const info = CREATURES[id];
  if (!info || ready.has(id)) return;
  const base = import.meta.env.BASE_URL;
  try {
    const [gltf, mat] = await Promise.all([
      loadFile(info.file),
      texelMaterial(id, { file: base + info.texel.file, glow: base + info.texel.glow }),
    ]);
    if (mat.map) ready.set(id, { gltf, map: mat.map });
  } catch (e) {
    console.warn(`creature ${id}: could not be loaded (${String(e)}); its look stays as it was`);
  }
}
/** Creature `id` loaded ahead, or undefined while it isn't. */
export const readyCreature = (id: string) => ready.get(id);

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
  const mixer = new THREE.AnimationMixer(model),
    actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of gltf.animations) {
    const a = mixer.clipAction(clip);
    a.setLoop(info.clips[clip.name]?.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = true;
    actions[clip.name] = a;
  }
  return { info, group, model, mixer, actions, gltf };
}
/** The loaded model of `id`, if it has loaded (for an icon drawn at once). */
export const loadedScene = (id: string) => {
  const info = CREATURES[id];
  return info ? loaded.get(info.file) : undefined;
};
