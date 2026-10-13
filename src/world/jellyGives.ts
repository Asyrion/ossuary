/* Dr. Jelly hands things over (the owner's ask, 2026-10-02): the potion he named, the one the mage brewed at his table, a
   recipe bought from him or given in thanks, obols. Each gift waits its turn and is played once the alchemy table is shut
   and no fight is on: he reaches across the table with the thing on his palm, leaning in, and holds it out while it
   glints; then it hops in a short arc to the mage and his arm comes back. What is given is the mage's already (the belt,
   the recipes, the purse): the gesture shows it (Nothing silent). Timings `CFG.alchemy.lab.give`; `givePose` is the
   gesture itself, which the Galleries tab loops. */
import * as THREE from 'three';
import { CFG } from '../config';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { burst } from '../combat/fx';
import { scene } from '../render/renderer';
import { disposeTree } from '../render/materials';
import { bottleLook } from '../items/alchemyLooks';
import { POTIONS, type PotionId } from '../items/alchemyData';
import { tone, mesh, glowTone } from './kitParts';
import { put } from './objectLooks';
import { restPose, type JellyParts } from './jellyLooks';
import type { Room } from '../types';

export type Gift = { kind: 'potion'; potion: PotionId } | { kind: 'recipe' } | { kind: 'coins' };
interface Giving {
  gift: Gift;
  room: Room;
  t: number;
  item: THREE.Object3D;
  shared: boolean;
  flying: boolean;
  from: THREE.Vector3;
  glint: boolean;
}
const queue: { gift: Gift; room: Room }[] = [];
let giving: Giving | null = null,
  last = 0;
const W = () => CFG.alchemy.lab.give;

/** Dr. Jelly will hand `gift` over in this room (when the table is shut and no fight is on). */
export function jellyGives(gift: Gift) {
  queue.push({ gift, room: G.current });
}
/** A new floor or run: nothing left to give, nothing in the air. */
export function clearGives() {
  queue.length = 0;
  if (giving) drop(giving);
  giving = null;
}
/** What he is handing over now (the dev hooks, the tests): its kind, the phase and how far in. */
export const givingNow = () =>
  giving && { kind: giving.gift.kind, t: +giving.t.toFixed(2), phase: phaseOf(giving.t), waiting: queue.length };

const ease = (k: number) => k * k * (3 - 2 * k);
function phaseOf(t: number) {
  const g = W();
  return t < g.reach ? 'reach' : t < g.reach + g.hold ? 'hold' : t < g.reach + g.hold + g.toss ? 'toss' : 'back';
}

/** The giving gesture at `k` (0: at rest, 1: reaching across): the right arm out, its palm up, the body leaning in and the
    head bowed over what he gives. */
export function givePose(P: JellyParts, k: number) {
  restPose(P);
  const [s, e, h] = [P.arms[0].shoulder, P.arms[0].elbow, P.arms[0].hand],
    G1 = CFG.alchemy.lab.give;
  s.rotation.x += (G1.shoulder - s.rotation.x) * k;
  s.rotation.z += (G1.out - s.rotation.z) * k; // (up and out: from above, a reach towards the camera hardly shows)
  e.rotation.x += (G1.elbow - e.rotation.x) * k;
  h.rotation.x = -(s.rotation.x + e.rotation.x) * k;
  h.rotation.z = -s.rotation.z * k; // (the palm turned up as the arm rises)
  P.body.rotation.x = G1.lean * k;
  P.head.rotation.x = G1.nod * k;
}

/** The thing he gives, in his palm's space: the potion's own bottle, a sealed scroll, or a few obols. */
function itemFor(gift: Gift): { o: THREE.Object3D; shared: boolean } {
  if (gift.kind === 'potion') {
    const b = bottleLook(G.run.bottles[gift.potion]),
      box = new THREE.Box3().setFromObject(b),
      h = box.max.y - box.min.y || 1;
    b.scale.multiplyScalar(W().size / h);
    b.position.y = (-box.min.y * W().size) / h;
    return { o: b, shared: true }; // (a copy: its geometry and materials are every bottle's)
  }
  const g = new THREE.Group();
  if (gift.kind === 'recipe') {
    put(
      mesh(g, new THREE.CylinderGeometry(0.028, 0.028, 0.17, 8), tone(0xe8d8b0, 0.08), 0, 0.03, 0),
      0,
      0,
      Math.PI / 2,
    );
    for (const x of [-0.09, 0.09])
      put(
        mesh(g, new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6), tone(0x6a4a2a, 0.06), x, 0.03, 0),
        0,
        0,
        Math.PI / 2,
      );
    mesh(g, new THREE.SphereGeometry(0.018, 6, 5), glowTone(0x5ac860), 0, 0.03, 0.028); // (Dr. Jelly's green seal)
  } else
    for (let i = 0; i < 3; i++)
      put(
        mesh(
          g,
          new THREE.CylinderGeometry(0.03, 0.03, 0.009, 10),
          tone(0xd8b048, 0.05, 0.5),
          (i - 1) * 0.025,
          0.01 + i * 0.011,
          (i % 2) * 0.01,
        ),
        0.2 * (i - 1),
        0,
        0.15,
      );
  return { o: g, shared: false };
}

function drop(v: Giving) {
  v.item.parent?.remove(v.item);
  if (!v.shared) disposeTree(v.item);
}

/** Every step: play the gift being given (and start the next waiting), in the laboratory `room` with Dr. Jelly's `parts`
    at (jx, jz); `paused`: the table is open or a fight is on (a gift waits, one under way goes on). */
export function updateGives(room: Room, parts: JellyParts | undefined, now: number, paused: boolean) {
  const dt = Math.min(0.1, Math.max(0, now - last));
  last = now;
  if (giving && giving.room !== room) {
    drop(giving);
    giving = null;
  }
  if (!parts) return;
  if (!giving) {
    const i = queue.findIndex((q) => q.room === room);
    if (i < 0 || paused) return;
    const { gift } = queue.splice(i, 1)[0],
      it = itemFor(gift);
    it.o.scale.multiplyScalar(0.001);
    parts.gift.add(it.o);
    giving = {
      gift,
      room,
      t: 0,
      item: it.o,
      shared: it.shared,
      flying: false,
      from: new THREE.Vector3(),
      glint: false,
    };
  }
  const v = giving,
    g = W();
  v.t += dt;
  const size = (v.item.userData.size ??= v.item.scale.x * 1000); // (its own scale, before it grows out of the palm)
  if (v.t < g.reach + g.hold) {
    // reaching, then holding it out while it glints
    givePose(parts, ease(Math.min(1, v.t / g.reach)));
    v.item.scale.setScalar(size * ease(Math.min(1, v.t / g.reach)));
    v.item.position.y = (v.item.userData.y ??= v.item.position.y) + Math.sin(v.t * 9) * 0.006;
    v.item.rotation.y += dt * 1.2;
    if (!v.glint && v.t >= g.reach) {
      v.glint = true;
      const p = v.item.getWorldPosition(new THREE.Vector3());
      burst(p.x, p.y + 0.08, p.z, 0xfff0c0, 6, 0.6, 0.03);
      Sfx.at(p.x, p.z).jellyGive();
    }
    return;
  }
  if (!v.flying) {
    // it leaves the palm: into the room, to hop to the mage
    v.flying = true;
    v.item.getWorldPosition(v.from);
    const ws = v.item.getWorldScale(new THREE.Vector3()).x;
    v.item.parent?.remove(v.item);
    scene.add(v.item);
    v.item.position.copy(v.from);
    v.item.scale.setScalar(ws);
  }
  const back = (v.t - g.reach - g.hold) / g.back,
    k = Math.min(1, (v.t - g.reach - g.hold) / g.toss);
  givePose(parts, 1 - ease(Math.min(1, back)));
  if (v.item.parent) {
    const to = { x: player.x, y: 1, z: player.z };
    v.item.position.set(
      v.from.x + (to.x - v.from.x) * k,
      v.from.y + (to.y - v.from.y) * k + Math.sin(k * Math.PI) * g.arc,
      v.from.z + (to.z - v.from.z) * k,
    );
    v.item.rotation.y += dt * 6;
    if (k >= 1) {
      const c =
        v.gift.kind === 'potion'
          ? parseInt(POTIONS[v.gift.potion].color.slice(1), 16)
          : v.gift.kind === 'recipe'
            ? 0x9ae890
            : 0xffd060;
      burst(player.x, 1, player.z, c, 10, 1, 0.04);
      Sfx.pickup();
      drop(v);
    }
  }
  if (back >= 1 && !v.item.parent) {
    restPose(parts);
    giving = null;
  }
}
