/* Loading the assets data/assets.json names (docs/assets.md: Pipeline, step 8): models, a floor look's tile,
   a floor look's wall faces, the decals made from pictures (a splash),
   artifacts' icons and coin faces, at boot, next to the hero. A model wears its texture as pixel art
   (`texel`, baked by prepare-asset; actors/texturePixel.ts). Each model is loaded once, stood on the
   floor at its height, and every use is a clone sharing its geometry and materials (marked shared, so removing a use
   frees nothing). A file that is missing or broken leaves its placeholder in place, with a warning in the console, never
   an error.
   ?assets=off keeps every placeholder; ?assets=<a manifest's path>.json loads another manifest (the tests' stand-ins).
   The dev menu turns them off and on to compare. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MANIFEST, manifestFiles, type Manifest, type ModelEntry } from './assetData';
import { wearTexel } from '../actors/texturePixel';

export type AssetStatus = 'loaded' | 'missing' | 'failed' | 'off';
export interface AssetInfo {
  where: string;
  file: string;
  status: AssetStatus;
  triangles?: number;
  note?: string;
}
type Group = 'props' | 'artifacts';

const loader = new GLTFLoader();
const models = new Map<string, THREE.Object3D>(),
  floors = new Map<string, HTMLImageElement>(),
  walls = new Map<string, HTMLImageElement>(),
  floorFaces = new Map<string, HTMLImageElement>(),
  decals = new Map<string, HTMLImageElement>(),
  icons = new Map<string, string>();
/** A coin's face as loaded: the image, and the colour round its edge (the coin's rim, for its edge in the room). */
export interface CoinFace {
  img: HTMLImageElement;
  rim: number;
}
const faces = new Map<string, CoinFace>(),
  coinIcons = new Map<string, string>();
let info: AssetInfo[] = [],
  enabled = true,
  obol: string | null = null,
  coinOrder: string[] = [];

/** Load everything the manifest names (or the one ?assets= points to). Never rejects. */
export async function loadAssets(search = location.search) {
  const opt = new URLSearchParams(search).get('assets');
  let manifest: Manifest = MANIFEST,
    base = `${import.meta.env.BASE_URL}assets/`;
  if (opt === 'off') enabled = false;
  else if (opt && /^[\w./-]+\.json$/.test(opt) && !opt.includes('..')) {
    // (a path on this site only)
    try {
      const res = await fetch(opt);
      if (!res.ok) throw new Error(`${res.status}`);
      manifest = (await res.json()) as Manifest;
      base = opt.replace(/[^/]*$/, '');
    } catch (e) {
      console.warn(`?assets=${opt}: the manifest could not be read (${String(e)}); using the game's own`);
    }
  } else if (opt) console.warn(`?assets=${opt}: use off, or a manifest's path ending in .json`);
  const files = manifestFiles(manifest);
  obol = manifest.obol ?? null;
  coinOrder = files
    .filter((f) => f.where.startsWith('coins.') && f.where.endsWith('.face'))
    .map((f) => f.where.split('.')[1]); // (the faces decode in any order)
  if (!enabled) {
    info = files.map((f) => ({ ...f, status: 'off' }));
    return;
  }
  info = await Promise.all(
    files.map(async (f) => {
      const url = base + f.file,
        [group, id] = f.where.split('.') as [string, string];
      try {
        if (group === 'props' || group === 'artifacts') {
          const entry = manifest[group][id],
            buf = await fetchFile(url);
          if (!buf) return missing(f);
          const gltf = await loader.parseAsync(buf, url.replace(/[^/]*$/, ''));
          if (entry.texel)
            // (its texture as pixel art, as every Tripo model wears it)
            await wearTexel(gltf.scene, base + entry.file, {
              file: base + entry.texel.file,
              glow: base + entry.texel.glow,
            }).catch((e) =>
              console.warn(
                `asset ${f.where}: its pixel-art texture could not be loaded (${String(e)}); it wears the texture as made`,
              ),
            );
          const { holder, triangles } = standUp(gltf.scene, entry);
          models.set(f.where, holder);
          return { ...f, status: 'loaded' as const, triangles };
        }
        const img = new Image();
        img.src = url;
        try {
          await img.decode();
        } catch {
          return (await fetchFile(url)) ? failed(f, 'not an image') : missing(f);
        }
        if (group === 'floors') floors.set(id, img);
        else if (group === 'walls')
          walls.set(f.where.slice(6), img); // (look.kind)
        else if (group === 'floorFaces')
          floorFaces.set(f.where.slice(11), img); // (look.name)
        else if (group === 'decals') decals.set(id, img);
        else if (group === 'coins') {
          if (f.where.endsWith('.face')) faces.set(id, { img, rim: rimOf(img) });
          else coinIcons.set(id, url);
        } else icons.set(id, url);
        return { ...f, status: 'loaded' as const };
      } catch (e) {
        return failed(f, String(e));
      }
    }),
  );
}
/** A file's bytes, or null when it isn't there (a dev server answers a missing file with its page). */
async function fetchFile(url: string) {
  const res = await fetch(url);
  if (!res.ok || /text\/html/.test(res.headers.get('content-type') ?? '')) return null;
  return res.arrayBuffer();
}
function missing(f: { where: string; file: string }): AssetInfo {
  console.warn(`asset ${f.where}: ${f.file} is missing; the placeholder stays`);
  return { ...f, status: 'missing' };
}
function failed(f: { where: string; file: string }, note: string): AssetInfo {
  console.warn(`asset ${f.where}: ${f.file} could not be loaded (${note}); the placeholder stays`);
  return { ...f, status: 'failed', note };
}

/** A model stood on the floor, centred, at its entry's height, turned and nudged as the entry says; shared. */
function standUp(scene: THREE.Object3D, e: ModelEntry) {
  scene.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
  scene.scale.setScalar(e.height / (size.y || 1));
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene),
    c = box.getCenter(new THREE.Vector3());
  scene.position.set(scene.position.x - c.x, scene.position.y - box.min.y, scene.position.z - c.z);
  const holder = new THREE.Group();
  holder.add(scene);
  holder.rotation.y = e.yaw ?? 0;
  if (e.offset) holder.position.set(...e.offset);
  holder.userData.height = e.height;
  let triangles = 0;
  holder.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.userData.shared = true;
    triangles += (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mat.userData.shared = true;
  });
  return { holder, triangles: Math.round(triangles) };
}

/** A copy of a model to place (its geometry and materials shared), or null for the placeholder. `props` are the
    placeholders' ids (urn, pedestal), `artifacts` the artifacts' ids. The copy stands on y = 0; `userData.height`
    is its height. */
export function modelFor(group: Group, id: string): THREE.Object3D | null {
  const m = enabled ? models.get(`${group}.${id}`) : undefined;
  if (!m) return null;
  return m.clone(true);
}

/** A floor look's painted tile, or null for the procedural floor. */
export const floorTile = (look: string) => (enabled ? (floors.get(look) ?? null) : null);
/** A floor look's made face for a kind of wall, or null for the one the room kit draws. */
export const wallTile = (look: string, kind: string) => (enabled ? (walls.get(`${look}.${kind}`) ?? null) : null);
/** A floor look's made floor face of that name (its look's `floor.face`), or null for the paving the room kit draws. */
export const floorFace = (look: string, name: string) => (enabled ? (floorFaces.get(`${look}.${name}`) ?? null) : null);
/** A decal made from a picture (data/assets.json `decals`: a grey PNG of tones at the kit's texel), or null for the
    one drawn in code. */
export const decalImage = (id: string) => (enabled ? (decals.get(id) ?? null) : null);
/** An artifact's drawn icon (its URL: 24 px of pixel art, tools/aseprite), or null for the one rendered from its model
    (items/artifactIcons.ts). */
export const iconUrl = (id: string) => (enabled ? (icons.get(id) ?? null) : null);

/** A coin face's rim: the mean colour of its outermost drawn pixels. */
function rimOf(img: HTMLImageElement) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return 0x8a6a34;
  g.drawImage(img, 0, 0);
  const { data, width: w, height: h } = g.getImageData(0, 0, c.width, c.height);
  const r = Math.min(w, h) / 2,
    sum = [0, 0, 0];
  let n = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4,
        d = Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2);
      if (data[i + 3] > 128 && d > r - 2.5) {
        sum[0] += data[i];
        sum[1] += data[i + 1];
        sum[2] += data[i + 2];
        n++;
      }
    }
  return n ? (Math.round(sum[0] / n) << 16) | (Math.round(sum[1] / n) << 8) | Math.round(sum[2] / n) : 0x8a6a34; // (sRGB bytes, as a hex colour is)
}
/** A coin's face, or null when it isn't loaded (the obol built in code stays). */
export const coinFace = (id: string) => (enabled ? (faces.get(id) ?? null) : null);
/** A coin's icon (its URL), or null. */
export const coinIconUrl = (id: string) => (enabled ? (coinIcons.get(id) ?? null) : null);
/** The coins whose faces loaded, in the manifest's order (not the order they finished decoding in). */
export const coinIds = () => (enabled ? coinOrder.filter((id) => faces.has(id)) : []);
/** The face the manifest has the obols wear (data/assets.json `obol`), or null. */
export const manifestObol = () => obol;

/** A material tinted (its colour times `tint`), made once a tint and shared. */
const tintedMats = new Map<number, Map<THREE.Material, THREE.Material>>();
function tintedMat(mat: THREE.Material, tint: number) {
  let byMat = tintedMats.get(tint);
  if (!byMat) tintedMats.set(tint, (byMat = new Map<THREE.Material, THREE.Material>()));
  let t = byMat.get(mat);
  if (!t) {
    t = mat.clone();
    (t as THREE.MeshStandardMaterial).color?.multiply(new THREE.Color(tint));
    t.userData.shared = true;
    byMat.set(mat, t);
  }
  return t;
}
/** The same model with its materials tinted (`tintedMat`; its glow untouched): a floor's own tone of a made prop. */
export function tintedLook(model: THREE.Object3D, tint: number) {
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.material = Array.isArray(m.material) ? m.material.map((t) => tintedMat(t, tint)) : tintedMat(m.material, tint);
  });
  return model;
}
/** The same model in the dark, bluish stone of a rune-sealed urn, its tint `lift` of the way to white (a floor's
    `items.sealedLift`: a dark urn tinted sank to near black). */
export const sealedLook = (model: THREE.Object3D, tint: number, lift = 0) =>
  tintedLook(model, new THREE.Color(tint).lerp(new THREE.Color(0xffffff), lift).getHex());

/** Every asset named, with how it went. */
export const assetList = (): readonly AssetInfo[] => info;
/** Whether loaded assets are used (the dev menu turns them off to compare with the placeholders). */
export const assetsOn = () => enabled && info.some((i) => i.status === 'loaded');
export function setAssetsOn(on: boolean) {
  enabled = on && info.some((i) => i.status === 'loaded');
}
