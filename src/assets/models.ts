/* Loading the assets data/assets.json names (M3.5, docs/assets.md: Pipeline, step 8): models, a floor look's tile and
   artifacts' icons, at boot, next to the hero. Each model is loaded once, stood on the floor at its height, and every
   use is a clone sharing its geometry and materials (marked shared, so removing a use frees nothing). A file that is
   missing or broken leaves its placeholder in place, with a warning in the console, never an error.
   ?assets=off keeps every placeholder; ?assets=<a manifest's path>.json loads another manifest (the tests' stand-ins).
   The dev menu turns them off and on to compare. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MANIFEST, manifestFiles, type Manifest, type ModelEntry } from './assetData';

export type AssetStatus = 'loaded' | 'missing' | 'failed' | 'off';
export interface AssetInfo { where: string; file: string; status: AssetStatus; triangles?: number; note?: string }
type Group = 'props' | 'artifacts';

const loader = new GLTFLoader();
const models = new Map<string, THREE.Object3D>(), floors = new Map<string, HTMLImageElement>(), icons = new Map<string, string>();
let info: AssetInfo[] = [], enabled = true;

/** Load everything the manifest names (or the one ?assets= points to). Never rejects. */
export async function loadAssets(search = location.search) {
  const opt = new URLSearchParams(search).get('assets');
  let manifest: Manifest = MANIFEST, base = `${import.meta.env.BASE_URL}assets/`;
  if (opt === 'off') enabled = false;
  else if (opt && /^[\w./-]+\.json$/.test(opt) && !opt.includes('..')) { // (a path on this site only)
    try { const res = await fetch(opt); if (!res.ok) throw new Error(`${res.status}`); manifest = await res.json() as Manifest; base = opt.replace(/[^/]*$/, ''); }
    catch (e) { console.warn(`?assets=${opt}: the manifest could not be read (${String(e)}); using the game's own`); }
  } else if (opt) console.warn(`?assets=${opt}: use off, or a manifest's path ending in .json`);
  const files = manifestFiles(manifest);
  if (!enabled) { info = files.map(f => ({ ...f, status: 'off' })); return; }
  info = await Promise.all(files.map(async f => {
    const url = base + f.file, [group, id] = f.where.split('.') as [string, string];
    try {
      if (group === 'props' || group === 'artifacts') {
        const entry = (manifest[group] as Record<string, ModelEntry>)[id], buf = await fetchFile(url);
        if (!buf) return missing(f);
        const gltf = await loader.parseAsync(buf, url.replace(/[^/]*$/, ''));
        const { holder, triangles } = standUp(gltf.scene, entry);
        models.set(f.where, holder);
        return { ...f, status: 'loaded' as const, triangles };
      }
      const img = new Image(); img.src = url;
      try { await img.decode(); } catch { return (await fetchFile(url)) ? failed(f, 'not an image') : missing(f); }
      if (group === 'floors') floors.set(id, img); else icons.set(id, url);
      return { ...f, status: 'loaded' as const };
    } catch (e) { return failed(f, String(e)); }
  }));
}
/** A file's bytes, or null when it isn't there (a dev server answers a missing file with its page). */
async function fetchFile(url: string) {
  const res = await fetch(url);
  if (!res.ok || /text\/html/.test(res.headers.get('content-type') ?? '')) return null;
  return res.arrayBuffer();
}
function missing(f: { where: string; file: string }): AssetInfo { console.warn(`asset ${f.where}: ${f.file} is missing; the placeholder stays`); return { ...f, status: 'missing' }; }
function failed(f: { where: string; file: string }, note: string): AssetInfo { console.warn(`asset ${f.where}: ${f.file} could not be loaded (${note}); the placeholder stays`); return { ...f, status: 'failed', note }; }

/** A model stood on the floor, centred, at its entry's height, turned and nudged as the entry says; shared. */
function standUp(scene: THREE.Object3D, e: ModelEntry) {
  scene.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
  scene.scale.setScalar(e.height / (size.y || 1)); scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene), c = box.getCenter(new THREE.Vector3());
  scene.position.set(scene.position.x - c.x, scene.position.y - box.min.y, scene.position.z - c.z);
  const holder = new THREE.Group(); holder.add(scene); holder.rotation.y = e.yaw ?? 0;
  if (e.offset) holder.position.set(...e.offset);
  holder.userData.height = e.height;
  let triangles = 0;
  holder.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    m.geometry.userData.shared = true; triangles += (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mat.userData.shared = true;
  });
  return { holder, triangles: Math.round(triangles) };
}

/** A copy of a model to place (its geometry and materials shared), or null for the placeholder. `props` are the
    placeholders' ids (urn, pedestal), `artifacts` the artifacts' ids. The copy stands on y = 0; `userData.height`
    is its height. */
export function modelFor(group: Group, id: string): THREE.Object3D | null {
  const m = enabled ? models.get(`${group}.${id}`) : undefined;
  return m ? m.clone(true) : null;
}
/** A floor look's painted tile, or null for the procedural floor. */
export const floorTile = (look: string) => enabled ? floors.get(look) ?? null : null;
/** An artifact's painted icon (its URL), or null for the drawn one. */
export const iconUrl = (id: string) => enabled ? icons.get(id) ?? null : null;

/** The same model in the dark, bluish stone of a rune-sealed urn: its materials tinted once and shared. */
const sealedMats = new Map<THREE.Material, THREE.Material>();
export function sealedLook(model: THREE.Object3D, tint: number) {
  model.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    const swap = (mat: THREE.Material) => {
      let t = sealedMats.get(mat);
      if (!t) { t = mat.clone(); (t as THREE.MeshStandardMaterial).color?.multiply(new THREE.Color(tint)); t.userData.shared = true; sealedMats.set(mat, t); }
      return t;
    };
    m.material = Array.isArray(m.material) ? m.material.map(swap) : swap(m.material);
  });
  return model;
}

/** Every asset named, with how it went. */
export const assetList = (): readonly AssetInfo[] => info;
/** Whether loaded assets are used (the dev menu turns them off to compare with the placeholders). */
export const assetsOn = () => enabled && info.some(i => i.status === 'loaded');
export function setAssetsOn(on: boolean) { enabled = on && info.some(i => i.status === 'loaded'); }
