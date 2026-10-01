/* Costumes (M4.6, docs/M4.6-plan.md): what artifacts put on the mage (costumeData.ts says which show), fitted to whatever
   model is loaded. Each part hangs from a bone of the rig, so it follows every clip; it is fitted once, in the rig's rest
   pose, to the part of the body it covers (the head and hair the head bone moves, the chest and shoulders, the hips, the
   hands and feet). A static model (no rig) wears its pieces on the model itself, fitted to its silhouette.

   Two kinds of piece: those built for the body (`BUILD`: the hood), and an artifact's own model carried at a spot (`carry`:
   a lantern at the hip, a sigil on the back, a pendant on the chest; `artifactLook`, as on its pedestal). The focus is held
   in the hand the cast clip thrusts (`castHandName`), following the hand each step (`updateCostumes`) and kept upright. A
   cursed artifact's piece glows red and weeps until a shrine cleanses it. */
import * as THREE from 'three';
import { player } from '../state';
import { CFG } from '../config';
import { artifact } from '../items/artifactData';
import { artifactLook, CURSED_RED } from '../items/artifactLooks';
import { disposeTree, glowShared, mergeStill } from '../render/materials';
import { burst } from '../combat/fx';
import { castSide, hang, measure, offSide, sideX, type Fit, type Side } from './costumeFit';
import { BUILD } from './costumePieces';
import { COSTUME_SLOTS, wornIds, wornLooks, type CarrySpot, type Worn } from './costumeData';

let model: THREE.Object3D | null = null, fit: Fit | null = null;
/** What is worn in each slot: its key (what it is, and its curse) and its parts. */
const worn = new Map<string, { key: string; w: Worn; parts: THREE.Object3D[] }>();
/** The focus held, and the artifact it is. */
let held: { id: string; part: THREE.Object3D } | null = null;
/** The dev menu's try-on: artifacts whose pieces show as if held (after what is held). */
const tried: string[] = [];

/** A new model: measure it (in its rest pose, so before any clip plays) and put on what the mage wears. */
export function fitCostumes(holder: THREE.Object3D) {
  for (const slot of [...worn.keys()]) takeOff(slot);
  dropFocus();
  model = holder; fit = measure(holder); dress();
}

/** Put on the pieces the mage's artifacts call for, and take off those they no longer do; the focus in the casting hand. */
export function dress() {
  if (!model || !fit) return;
  const want = wornLooks([player.focus, ...player.items, ...tried].map(id => artifact(id)), player.cleansed);
  const keyOf = (w: Worn) => `${w.piece}:${w.from}:${w.cursed}:${w.cleansed}`;
  for (const [slot, on] of [...worn]) if (!want.some(w => w.slot === slot && keyOf(w) === on.key)) takeOff(slot);
  for (const w of want) if (!worn.has(w.slot)) {
    const parts = w.piece === 'carried' ? carry(fit, w) : BUILD[w.piece](fit, w);
    for (const p of parts) if (p.userData.follow) model.add(p); // (a part that hangs straight down whatever the arm does: placed each step)
    worn.set(w.slot, { key: keyOf(w), w, parts });
  }
  const focus = [...tried].reverse().find(id => artifact(id).kind === 'focus') ?? player.focus;
  if (held?.id !== focus) { dropFocus(); held = { id: focus, part: holdFocus(focus) }; }
}

/** The pieces the mage wears now, as ids (a built piece's, or the carrying artifact's), and the focus held. */
const bySlot = () => [...worn.values()].sort((a, b) => COSTUME_SLOTS.indexOf(a.w.slot) - COSTUME_SLOTS.indexOf(b.w.slot));
export const wornNow = () => wornIds(bySlot().map(o => o.w));
export const heldNow = () => held?.id ?? null;
/** What is worn in each slot, with its curse (for the tests): the rule's entries, and how many parts each hangs. */
export const wornDetail = () => bySlot().map(o => ({ ...o.w, parts: o.parts.length, bones: o.parts.map(p => p.parent?.name ?? '') }));

/** The dev menu's try-on: show artifact `id`'s piece (or hold the focus) as if it were held, or stop. */
export function tryOn(id: string) { const i = tried.indexOf(id); if (i >= 0) tried.splice(i, 1); else tried.push(id); dress(); return i < 0; }
export function takeAllOff() { tried.length = 0; dress(); }
export const triedOn = () => [...tried];

function takeOff(slot: string) {
  for (const part of worn.get(slot)?.parts ?? []) { part.removeFromParent(); disposeTree(part); }
  worn.delete(slot);
}
function dropFocus() { if (held) { held.part.removeFromParent(); disposeTree(held.part); held = null; } }

/* ---------- every step ---------- */

const v = new THREE.Vector3();
let dripT = 0;
/** Each step: the focus follows the casting hand, upright and leaning a little forward; a cursed piece weeps. */
export function updateCostumes(dt: number) {
  if (!model || !fit) return;
  if (held) {
    const C = CFG.costume.focus, side = castSide(), bone = fit.hand[side].bone;
    if (bone) { bone.updateWorldMatrix(true, false); model.worldToLocal(bone.getWorldPosition(v)); held.part.position.copy(v); }
    else held.part.position.copy(fit.hand[side].pos);
    held.part.rotation.set(C.lean, 0, side === 'R' ? C.tilt : -C.tilt);
  }
  for (const { parts } of worn.values()) for (const p of parts) { // (the parts that follow a wrist, hanging straight down)
    const fl = p.userData.follow as { side: Side; drop?: number } | undefined, bone = fl && fit.hand[fl.side].bone; if (!fl) continue;
    if (bone) { bone.updateWorldMatrix(true, false); model.worldToLocal(bone.getWorldPosition(v)); p.position.copy(v); } else p.position.copy(fit.hand[fl.side].pos);
    if (fl.drop) p.scale.y = Math.max(.05, p.position.y / fl.drop); // (a chain to the floor, from wherever the wrist is)
  }
  if ((dripT -= dt) <= 0) {
    dripT = CFG.costume.curse.drip;
    for (const { w, parts } of worn.values()) if (w.cursed) for (const p of parts) { p.getWorldPosition(v); burst(v.x, v.y, v.z, p.userData.drip ?? CURSED_RED, 1, .4, .025); }
  }
}

/* ---------- carried pieces and the focus ---------- */

/** An artifact's own model (as on its pedestal), merged, scaled to `scale` and moved so that the point `top` (0 its middle,
    .5 its top) sits at the origin; with a red glow while it is cursed. `upright`: the slant it is shown at on its pedestal
    (a wand or a spear laid aslant) taken out, to be held. */
function ownLook(id: string, scale: number, top: number, cursed: boolean, upright = false) {
  const def = artifact(id), look = artifactLook(def.icon, def.color);
  if (upright) for (const c of look.children) c.rotation.z = 0;
  mergeStill(look); look.scale.setScalar(scale);
  const h = new THREE.Box3().setFromObject(look).getSize(new THREE.Vector3()).y;
  look.position.y = -h * top;
  const g = new THREE.Group(); g.add(look);
  if (cursed) { const gl = glowShared(CURSED_RED, h * CFG.costume.curse.glow, .55); gl.position.y = look.position.y; g.add(gl); }
  return g;
}

/** Where each spot is on the body (in the model's frame, at rest), what it hangs from, and how the model is turned there. */
function spot(f: Fit, at: CarrySpot) {
  const ch = f.chest, cc = ch.getCenter(new THREE.Vector3()), cs = ch.getSize(new THREE.Vector3());
  const hc = f.hips.getCenter(new THREE.Vector3()), hs = f.hips.getSize(new THREE.Vector3()), off = sideX(offSide());
  switch (at) {
    case 'belt': return { anchor: f.hipsAt, pos: new THREE.Vector3(hc.x + off * (hs.x * .5 + .02), f.hips.max.y - hs.y * .2, hc.z + hs.z * .15), turn: new THREE.Euler(0, off * .5, 0), top: .5 };
    case 'back': return { anchor: f.chestAt, pos: new THREE.Vector3(cc.x, cc.y, ch.min.z - .05), turn: new THREE.Euler(.15, Math.PI, 0), top: 0 };
    case 'shoulder': return { anchor: f.chestAt, pos: new THREE.Vector3(cc.x + off * cs.x * .42, ch.max.y + .02, cc.z), turn: new THREE.Euler(0, off * .4, -off * .3), top: -.35 };
    case 'chest': return { anchor: f.chestAt, pos: new THREE.Vector3(cc.x, ch.max.y - cs.y * .45, ch.max.z + .02), turn: new THREE.Euler(-.1, 0, 0), top: .5 };
    case 'wrist': { const s = offSide(); return { anchor: f.hand[s].at, pos: f.hand[s].pos.clone(), turn: new THREE.Euler(0, 0, sideX(s) * Math.PI / 2), top: 0 }; }
  }
}

/** An artifact's own model carried at its spot. */
function carry(f: Fit, w: Worn): THREE.Object3D[] {
  const S = spot(f, w.at!), C = CFG.costume.carry[w.at!];
  const piece = ownLook(w.from, C.scale, S.top, w.cursed);
  piece.position.copy(S.pos); piece.rotation.copy(S.turn);
  const outer = new THREE.Group(); outer.add(piece);
  return [hang(S.anchor, outer)];
}

/** The focus, its own model, in the model's frame (it follows the hand each step: `updateCostumes`). */
function holdFocus(id: string) {
  const part = ownLook(id, CFG.costume.focus.scale, CFG.costume.focus.grip, false, true);
  part.position.copy(fit!.hand[castSide()].pos); model!.add(part);
  return part;
}

