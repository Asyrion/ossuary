/* Costumes (M4.6, docs/archive/M4.6-plan.md): what artifacts put on the mage (costumeData.ts says which show), fitted to whatever
   model is loaded. Each part hangs from a bone of the rig, so it follows every clip; it is fitted once, in the rig's rest
   pose, to the part of the body it covers (the head and hair the head bone moves, the chest and shoulders, the hips, the
   hands and feet). A static model (no rig) wears its pieces on the model itself, fitted to its silhouette.

   Two kinds of piece: those built for the body (`BUILD`: the hood), and an artifact's own model carried at a spot (`carry`:
   a lantern at the hip, a sigil on the back, a pendant on the chest; `artifactLook`, as on its pedestal). The focus is held
   in the hand the cast clip thrusts (`castHandName`), following the hand each step (`updateCostumes`) and kept upright. A
   cursed artifact's piece glows red and weeps until a shrine cleanses it.

   The latest transformation formed (`G.run.transforms`) wears its look over them (TRANSFORM_LOOKS, transformPieces.ts),
   and the robes take a tint of its light (`tintRobes`). What its pieces mark moves here each step: the aura turns, the
   grimoire bobs, wings beat, footsteps burn, breath frosts, sparks crackle, and a Stormcaller's eyes flare (`flareEyes`). */
import * as THREE from 'three';
import { G, player } from '../state';
import { CFG } from '../config';
import { artifact } from '../items/artifactData';
import { artifactLook, CURSED_RED } from '../items/artifactLooks';
import { disposeTree, glowShared, mergeStill } from '../render/materials';
import { burst } from '../combat/fx';
import { strikeFx } from '../magic/spellFx';
import { TRANSFORMS, isTransform } from '../items/transformData';
import { arcNow } from '../items/arc';
import type { Emit } from './transformPieces';
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
/** What moves by itself in what is worn (found when it is put on): turning, bobbing, beating, letting out motes, flaring. */
let movers: THREE.Object3D[] = [];

/** A new model: measure it (in its rest pose, so before any clip plays) and put on what the mage wears. */
export function fitCostumes(holder: THREE.Object3D) {
  for (const slot of [...worn.keys()]) takeOff(slot);
  dropFocus();
  model = holder; fit = measure(holder); dress();
}

/** Put on the pieces the mage's artifacts call for, and take off those they no longer do; the focus in the casting hand. */
export function dress() {
  if (!model || !fit) return;
  const look = G.run.transforms.at(-1);
  const want = wornLooks([player.focus, ...player.items, ...tried].map(id => artifact(id)), player.cleansed, look, arcNow());
  const keyOf = (w: Worn) => `${w.piece}:${w.from}:${w.cursed}:${w.cleansed}`;
  for (const [slot, on] of [...worn]) if (!want.some(w => w.slot === slot && keyOf(w) === on.key)) takeOff(slot);
  for (const w of want) if (!worn.has(w.slot)) {
    const parts = w.piece === 'carried' ? carry(fit, w) : BUILD[w.piece](fit, w);
    for (const p of parts) { p.userData.costume = true; if (p.userData.follow || p.userData.float) model.add(p); } // (a part that hangs straight down whatever the arm does, or floats by the mage: placed each step)
    worn.set(w.slot, { key: keyOf(w), w, parts });
  }
  const focus = [...tried].reverse().find(id => artifact(id).kind === 'focus') ?? player.focus;
  if (held?.id !== focus) { dropFocus(); held = { id: focus, part: holdFocus(focus) }; held.part.userData.costume = true; }
  movers = [];
  for (const { parts } of worn.values()) for (const p of parts) p.traverse(o => { const u = o.userData; if (u.spin || u.bob || u.flap || u.emit || u.eyes !== undefined) movers.push(o); });
  tintRobes(look && isTransform(look) ? TRANSFORMS[look].light : null);
}

/** The robes tinted towards `light` (a transformation's), or back to their own: every material of the model itself (not
    what is worn), its colour kept the first time. */
function tintRobes(light: number | null) {
  const to = new THREE.Color(light ?? 0xffffff), k = light === null ? 0 : CFG.transform.tint;
  const walk = (o: THREE.Object3D) => {
    if (o.userData.costume) return;
    const m = o as THREE.Mesh;
    if (m.isMesh) for (const mat of [m.material].flat() as THREE.MeshStandardMaterial[]) {
      if (!mat.color || mat.userData.shared) continue;
      const own = (mat.userData.robe ??= mat.color.clone()) as THREE.Color;
      mat.color.copy(own).lerp(to, k);
    }
    o.children.forEach(walk);
  };
  if (model) walk(model);
}
/** The tint on the robes now (for the tests): how far the model's first own material is from its colour. */
export function robeTint() {
  let d = 0;
  model?.traverse(o => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (!d && m?.userData?.robe) d = Math.abs(m.color.r - m.userData.robe.r) + Math.abs(m.color.g - m.userData.robe.g) + Math.abs(m.color.b - m.userData.robe.b); });
  return d;
}

let flare = 0;
/** A Storm spell cast: the Stormcaller's eyes flare blue. */
export const flareEyes = () => { flare = 1; };

/** Where hand `side` is in the world now (its bone's place, or its rest spot on a static model), into `out`; false before
    a model is fitted (M4.11: the spell marks follow the hands). */
export function handAt(side: Side, out: THREE.Vector3) {
  if (!model || !fit) return false;
  const bone = fit.hand[side].bone;
  if (bone) { bone.updateWorldMatrix(true, false); bone.getWorldPosition(out); } else { model.updateWorldMatrix(true, false); model.localToWorld(out.copy(fit.hand[side].pos)); }
  return true;
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
  moveWorn(dt);
  if ((dripT -= dt) <= 0) {
    dripT = CFG.costume.curse.drip;
    for (const { w, parts } of worn.values()) if (w.cursed) for (const p of parts) { p.getWorldPosition(v); burst(v.x, v.y, v.z, p.userData.drip ?? CURSED_RED, 1, .4, .025); }
  }
}

const emitT = new WeakMap<THREE.Object3D, number>(), w3 = new THREE.Vector3();
/** What moves in what is worn: the aura and runes turn, the grimoire bobs, wings beat, eyes flare and fade, and markers let
    out motes (footsteps while walking, breath, sparks). */
function moveWorn(dt: number) {
  const now = G.simClock, walking = Math.hypot(player.vx, player.vz) > .6;
  flare = Math.max(0, flare - dt * 1.4);
  for (const o of movers) {
    const u = o.userData;
    if (u.spin) o.rotation.y += u.spin * dt;
    if (u.bob) { o.position.y = u.bob.y + Math.sin(now * u.bob.rate) * u.bob.amp; o.rotation.y += dt * .6; }
    if (u.flap) o.rotation.y = u.flap * (.15 + Math.sin(now * 2.4) * .18);
    if (u.eyes !== undefined) { const s = o as THREE.Sprite; s.material.opacity = u.eyes + (1 - u.eyes) * flare; }
    const e = u.emit as Emit | undefined; if (!e) continue;
    if (e.kind === 'steps' && !walking) continue;
    const t = (emitT.get(o) ?? 0) - dt; emitT.set(o, t > 0 ? t : e.every * (.7 + Math.random() * .6)); if (t > 0) continue;
    o.getWorldPosition(w3);
    if (e.kind === 'steps') burst(w3.x, w3.y + .04, w3.z, e.color, 3, .6, .028);
    else if (e.kind === 'breath') burst(w3.x, w3.y, w3.z, e.color, 6, .45, .03);
    else { const a = Math.random() * Math.PI * 2, b = a + 1 + Math.random() * 2; strikeFx({ x: w3.x + Math.cos(a) * .35, y: w3.y * (.4 + Math.random() * .7), z: w3.z + Math.sin(a) * .35 }, { x: w3.x + Math.cos(b) * .4, y: w3.y * (.3 + Math.random() * .8), z: w3.z + Math.sin(b) * .4 }, e.color, .12, true); }
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

