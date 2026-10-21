/* Bosses made in Tripo (R3): a still model, worn as pixel art from its own texture, in place of the boss's look built in
   code (`props/foe_<id>.glb`, the way madeFoes.ts dresses the foes). The look in code is still built for what its fight
   reads: the rune ring and the halo stay as built (lifted to the model's height), and the eye's glow is set on the
   model's face. The parts the fight moves (a jaw, gills, a sword arm, legs) become empty places, and what the fight did
   to them shows on the model as a whole a frame later: the Abbess rears and swells as she wails, the Pyre Knight leans
   into his blade and bobs as he strides. Its size is the look in code's (`CFG.madeBosses`: `size` times it). */
import * as THREE from 'three';
import type { BossBuilt } from './bossLooks';
import { modelFor } from '../assets/models';
import { disposeTree } from '../render/materials';
import { CFG } from '../config';

const box = new THREE.Box3(),
  size = new THREE.Vector3(),
  had = new THREE.Vector3();

/** How the fight's parts move the model as a whole, by boss: from the empty places it moves (`p`) onto the body. */
const POSE: Record<string, (body: THREE.Object3D, p: Record<string, THREE.Object3D>, t: number) => void> = {
  abbess(body, p) {
    const wail = Math.max(0, p.jaw.rotation.x),
      flare = Math.abs(p.gillL.rotation.z);
    body.rotation.x = -wail * 0.45; // (her head comes up as her jaw opens)
    body.scale.set(1 + flare * 0.12, 1 + wail * 0.1, 1);
  },
  pyre(body, p) {
    const stride = p.legL.rotation.x;
    body.rotation.x = Math.max(-0.35, Math.min(0.35, p.arms.rotation.x * 0.2)); // (leaning into the blade, back to raise it)
    body.position.y = Math.abs(Math.sin(stride)) * 0.06;
    body.rotation.z = stride * 0.08;
  },
};

/** The made look of boss `id`, wrapping its look in code `code`, or undefined while it has none. */
export function madeBossLook(id: string, code: () => BossBuilt): (() => BossBuilt) | undefined {
  const how = (CFG.madeBosses as Record<string, { size: number; keep: readonly string[]; fire?: string }>)[id];
  if (!how || !modelFor('props', `foe_${id}`)) return undefined;
  return () => build(id, code(), how.size, how.keep, how.fire);
}

function build(id: string, made: BossBuilt, scale: number, keep: readonly string[], fire?: string): BossBuilt {
  made.idle(0);
  made.group.updateMatrixWorld(true);
  // (its solid body only, as madeFoes.ts measures it)
  box.makeEmpty();
  made.group.traverse((o) => {
    const m = o as THREE.Mesh,
      mat = m.material as THREE.Material | undefined;
    if (m.isMesh && mat && !Array.isArray(mat) && !mat.transparent && mat.visible && m.visible)
      box.expandByObject(m, true);
  });
  box.getSize(had);
  const g = new THREE.Group(),
    body = new THREE.Group(),
    model = modelFor('props', `foe_${id}`)!;
  box.setFromObject(model, true).getSize(size);
  model.scale.multiplyScalar((scale * Math.max(had.x, had.y, had.z)) / Math.max(size.x, size.y, size.z, 1e-3));
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const was = m.material as THREE.MeshToonMaterial;
    m.material = new THREE.MeshStandardMaterial({ map: was.map, roughness: 0.85, metalness: 0 }); // (its own: a hit lights it alone)
  });
  body.add(model);
  g.add(body);
  box.setFromObject(model, true);
  const tall = box.max.y,
    lift = tall / Math.max(had.y, 1e-3),
    face = new THREE.Vector3(0, tall * 0.55, box.max.z * 0.9);
  // the fire of its part `fire` (a texture's painted flames don't light, the code's do): at the same height on the model
  const flames: THREE.Object3D[] = [];
  made.parts[fire ?? '']?.traverse((o) => {
    if (o.userData.fire) flames.push(o);
  });
  for (const f of flames) {
    f.getWorldPosition(f.position);
    f.position.multiplyScalar(lift);
    f.scale.multiplyScalar(lift);
    f.removeFromParent();
    body.add(f);
  }
  // the parts its fight reads: the kept ones as built, at the model's height; the eye's glow on its face; empty places
  const parts: Record<string, THREE.Object3D> = {};
  for (const [name, p] of Object.entries(made.parts)) {
    if (keep.includes(name)) {
      p.getWorldPosition(p.position);
      p.position.y *= lift;
      p.removeFromParent();
      g.add(p);
      parts[name] = p;
    } else if ((p as THREE.Sprite).isSprite) {
      // (on the eye's place when there is one, so what the fight does to the eye shows in its glow)
      p.removeFromParent();
      if (parts.eye) p.position.set(0, 0, 0.02);
      else p.position.copy(face);
      (parts.eye ?? body).add(p);
      parts[name] = p;
    } else {
      const o = new THREE.Object3D();
      o.position.copy(name === 'eye' ? face : p.getWorldPosition(o.position));
      body.add(o);
      parts[name] = o;
    }
  }
  disposeTree(made.group);
  const pose = POSE[id];
  return {
    group: g,
    shadow: made.shadow,
    openShadow: true,
    school: made.school,
    parts: parts as BossBuilt['parts'],
    idle(t) {
      body.position.set(0, 0, 0);
      body.rotation.set(0, Math.sin(t * 0.6) * 0.05, 0);
      body.scale.setScalar(1);
      pose?.(body, parts, t);
    },
  };
}
