/* Foes made in Tripo (R3, art bible 4.19): a still model, worn as pixel art from its own texture, in place of the look
   built in code, moved by code as a whole (it squats, floats, sways, crawls or banks: `CFG.madeFoes`). The look in code
   is still built, for two things: its height above the floor (a flyer's model hangs where its body was; its size is
   `span`, so it matches the foe's reach, not the look in code), and the parts its behaviour moves by name. The part named `main` is the model; a
   part that is a light (a sprite) is kept as it is; the others are empty places, so a behaviour that turns a head or
   swells a throat moves nothing it can't see. Each foe wears its own copy of the model's surface, so a hit lights only
   it. A model not loaded (data/assets.json props `foe_<look>`) leaves the look in code. */
import * as THREE from 'three';
import type { Built } from './beastParts';
import { modelFor } from '../assets/models';
import { disposeTree } from '../render/materials';
import { CFG } from '../config';

type Motion = 'squat' | 'float' | 'sway' | 'crawl' | 'bank';
const box = new THREE.Box3(),
  size = new THREE.Vector3();

/** The made look of `look` (wrapping its look in code, `code`), or undefined while it has none. */
export function madeFoeLook(look: string, code: () => Built): (() => Built) | undefined {
  const how = (CFG.madeFoes as Record<string, { motion: Motion; main: string; span: number }>)[look];
  if (!how || !modelFor('props', `foe_${look}`)) return undefined;
  return () => build(look, code(), how.motion, how.main, how.span);
}

function build(look: string, made: Built, motion: Motion, main: string, span: number): Built {
  made.idle(0);
  made.group.updateMatrixWorld(true);
  // (its solid body only: glows, auras and see-through films would make the box far larger than the foe)
  box.makeEmpty();
  made.group.traverse((o) => {
    const m = o as THREE.Mesh,
      mat = m.material as THREE.Material | undefined;
    if (m.isMesh && mat && !Array.isArray(mat) && !mat.transparent && mat.visible && m.visible)
      box.expandByObject(m, true);
  });
  if (box.isEmpty()) box.setFromObject(made.group, true);
  const floor = box.min.y,
    g = new THREE.Group(),
    body = new THREE.Group(),
    model = modelFor('props', `foe_${look}`)!;
  box.setFromObject(model, true).getSize(size);
  model.scale.multiplyScalar(span / Math.max(size.x, size.z, 1e-3));
  model.position.y = motion === 'float' || motion === 'bank' ? Math.max(0, floor) : 0;
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const was = m.material as THREE.MeshToonMaterial;
    m.material = new THREE.MeshStandardMaterial({ map: was.map, roughness: 0.85, metalness: 0 }); // (its own: a hit lights it alone)
  });
  body.add(model);
  g.add(body);
  // the parts its behaviour moves: the model, its lights as they were, empty places for the rest
  const parts: Record<string, THREE.Object3D> = {};
  for (const [name, p] of Object.entries(made.parts ?? {})) {
    if (name === main) parts[name] = body;
    else if ((p as THREE.Sprite).isSprite) {
      p.getWorldPosition(p.position);
      p.removeFromParent();
      g.add(p);
      parts[name] = p;
    } else {
      const o = new THREE.Object3D();
      p.getWorldPosition(o.position);
      body.add(o);
      parts[name] = o;
    }
  }
  parts[main] ??= body;
  disposeTree(made.group);
  const lift = model.position.y;
  return {
    group: g,
    shadow: made.shadow,
    parts,
    idle(t) {
      const s = Math.sin(t * 2.6),
        c = Math.cos(t * 1.7);
      body.position.set(0, 0, 0);
      body.rotation.set(0, 0, 0);
      body.scale.setScalar(1);
      if (motion === 'squat') body.scale.set(1 + s * 0.035, 1 - s * 0.05, 1 + s * 0.035);
      else if (motion === 'float') {
        body.position.y = s * 0.06;
        body.rotation.z = c * 0.06;
      } else if (motion === 'sway') {
        body.rotation.z = c * 0.07;
        body.scale.y = 1 + s * 0.03;
      } else if (motion === 'crawl') body.scale.set(1 - s * 0.02, 1 + s * 0.015, 1 + s * 0.05);
      else {
        body.position.y = s * 0.05;
        body.rotation.z = c * 0.18;
      }
      model.position.y = lift;
    },
  };
}
