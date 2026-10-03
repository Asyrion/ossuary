/* Enemy model options (the owner's request, 2026-09-29): candidate foes built in code from simple shapes, made to read
   in the pixel look. The third round (2026-09-30) made them critters and small fantasy creatures rather than the dead:
   round, big-eyed, smaller than the mage, each carrying its school's light (Ember, Frost, Storm, Hallow, Umbral) in
   spots, crests, crystals, flames or runes, and each belonging to a floor (four in the crypt, three on the drowned
   floor, three on the burning one). Each stands on y = 0 facing +Z (the camera) and moves a little while it idles.
   They are looks only until M4 makes them foes, in code (the owner's decision). The dev menu's gallery stands them in
   rows by floor ahead of the mage. Names and notes are placeholders in STR.options. Familiars the mage could bind are
   built the same way, from the owner's drawings (FAMILIAR_OPTIONS, names in STR.familiars). */
import * as THREE from 'three';
import { drJellyLook, type JellyParts } from '../world/jellyLooks';
import { givePose } from '../world/jellyGives';
import { glowTone } from '../world/kitParts';
import type { Room } from '../types';
import { blob, disposeTree, glow } from '../render/materials';
import { freeSpotNear, isFreeAt } from '../world/rooms';
import { mergeRig } from '../render/rig';
import { ALL_BOSS_LOOKS } from './bossLooks';
import { BESTIARY_OPTIONS } from './bestiaryLooks';
import { FLOOR1_LOOKS } from './fantasyFloor1';
import { FLOOR2_LOOKS } from './fantasyFloor2';
import { FLOOR3_LOOKS } from './fantasyFloor3';
import { FLOOR4_LOOKS } from './fantasyFloor4';
import { FLOOR5_LOOKS } from './fantasyFloor5';
import { WARDLING_LOOKS } from './fantasyWardlings';
import { box, limb, lit, motes, part, rune, shine, sphere, std, type School } from '../render/arcane';

/** A built option: its group, how it idles, the size of the shadow under it, and the parts a foe's behaviour moves beyond
    its idle (M4: a beetle's wing-cases, a mimic's lid). */
interface Built { group: THREE.Group; idle: (t: number) => void; shadow: number; parts?: Record<string, THREE.Object3D> }

/* ---------- the options ---------- */

/* (the floors' foes are creatures of fantasy now, in fantasyFloor1.ts to fantasyFloor5.ts, and the Wardlings ward cores in
   fantasyWardlings.ts: M4.12) */

export const MODEL_OPTIONS = [
  { id: 'sporeling', floor: 1, school: 'umbral', build: FLOOR1_LOOKS.sporeling }, { id: 'vesperMoth', floor: 1, school: 'hallow', build: FLOOR1_LOOKS.vesperMoth },
  { id: 'runeBeetle', floor: 1, school: 'storm', build: FLOOR1_LOOKS.runeBeetle }, { id: 'urnMimic', floor: 1, school: 'ember', build: FLOOR1_LOOKS.urnMimic },
  { id: 'mireToad', floor: 2, school: 'frost', build: FLOOR2_LOOKS.mireToad }, { id: 'cisternLurker', floor: 2, school: 'storm', build: FLOOR2_LOOKS.cisternLurker },
  { id: 'lanternJelly', floor: 2, school: 'hallow', build: FLOOR2_LOOKS.lanternJelly },
  { id: 'cinderSalamander', floor: 3, school: 'ember', build: FLOOR3_LOOKS.cinderSalamander }, { id: 'hexImp', floor: 3, school: 'umbral', build: FLOOR3_LOOKS.hexImp },
  { id: 'rimeDrakeling', floor: 3, school: 'frost', build: FLOOR3_LOOKS.rimeDrakeling },
  { id: 'wickmouse', floor: 4, school: 'ember', build: FLOOR4_LOOKS.wickmouse }, { id: 'chimeBat', floor: 4, school: 'storm', build: FLOOR4_LOOKS.chimeBat },
  { id: 'gargoyleWhelp', floor: 4, school: 'frost', build: FLOOR4_LOOKS.gargoyleWhelp }, { id: 'moonstagFawn', floor: 4, school: 'hallow', build: FLOOR4_LOOKS.moonstagFawn },
  { id: 'rootling', floor: 5, school: 'umbral', build: FLOOR5_LOOKS.rootling }, { id: 'stormRay', floor: 5, school: 'storm', build: FLOOR5_LOOKS.stormRay },
  { id: 'voidMote', floor: 5, school: 'umbral', build: FLOOR5_LOOKS.voidMote }, { id: 'lanternTortoise', floor: 5, school: 'frost', build: FLOOR5_LOOKS.lanternTortoise },
  // M4.2: the Wardlings, no floor's own (0): a drinking ward lets them out
  { id: 'wardEmber', floor: 0, school: 'ember', build: WARDLING_LOOKS.wardEmber }, { id: 'wardFrost', floor: 0, school: 'frost', build: WARDLING_LOOKS.wardFrost },
  { id: 'wardStorm', floor: 0, school: 'storm', build: WARDLING_LOOKS.wardStorm }, { id: 'wardHallow', floor: 0, school: 'hallow', build: WARDLING_LOOKS.wardHallow },
  { id: 'wardUmbral', floor: 0, school: 'umbral', build: WARDLING_LOOKS.wardUmbral }, { id: 'wardVerdant', floor: 0, school: 'verdant', build: WARDLING_LOOKS.wardVerdant },
] as const satisfies readonly { id: string; floor: 0 | 1 | 2 | 3 | 4 | 5; school: School; build: () => Built }[];
export type ModelOptionId = (typeof MODEL_OPTIONS)[number]['id'];

/* ---------- familiars ---------- */

/** A familiar the owner drew (2026-09-30), rebuilt in code: a spectral fox of indigo fur, cyan runes and gold swirls
    along its flanks, glowing eyes and paws, and a great starry tail streaming behind it. It trots in place. */
function runeFox(sideOn = true): Built {
  const g = new THREE.Group(), fox = new THREE.Group(); g.add(fox);
  if (sideOn) fox.rotation.y = Math.PI / 2; // (side on, as drawn: built facing +Z, it walks to the right)
  const fur = std(0x3a2c7a), furDark = std(0x241a52), furLight = std(0x5a6ec8), cheek = std(0xc8d8ff);
  const cyan = lit(0x8ff0ff), gold = lit(0xffd878), violet = lit(0xb080ff), star = lit(0xffffff);
  // the body: torso, haunch and a pale chest with a ruff of fur down it
  const body = new THREE.Group(); body.position.y = .42; fox.add(body);
  part(body, sphere(.2, 12, 10), fur, [0, 0, 0], { scale: [.72, .78, 1.7] });
  part(body, sphere(.17, 10, 8), furDark, [0, .02, -.24], { scale: [.85, .9, 1] });
  part(body, sphere(.12, 10, 8), furLight, [0, -.02, .28], { scale: [.9, 1, .85] });
  for (let i = 0; i < 4; i++) part(body, new THREE.ConeGeometry(.045, .16, 4), furLight, [(i - 1.5) * .05, -.12 - Math.abs(i - 1.5) * .02, .33], { rot: [Math.PI - .3, 0, (i - 1.5) * .25] });
  // markings: a line of light along the spine, runes and gold swirls down each flank
  part(body, box(.014, .014, .48), cyan, [0, .155, -.02]);
  for (const s of [-1, 1]) {
    for (const [z, y] of [[.12, .03], [-.03, -.02], [-.18, .03]]) rune(body, 0x8ff0ff, [.148 * s, y, z], .075, [0, s * Math.PI / 2, 0], cyan);
    part(body, new THREE.TorusGeometry(.1, .006, 4, 20, Math.PI * 1.3), gold, [.15 * s, .0, .05], { rot: [0, s * Math.PI / 2, .6] });
    part(body, new THREE.TorusGeometry(.05, .006, 4, 14, Math.PI * 1.6), gold, [.15 * s, .03, -.1], { rot: [0, s * Math.PI / 2, 2.2] });
  }
  // neck and head: a long snout, pale cheeks swept back, tall ears lit inside, eyes of cyan light
  limb(fox, [0, .5, .3], [0, .62, .4], .09, furLight, .11);
  const head = new THREE.Group(); head.position.set(0, .64, .42); fox.add(head);
  part(head, sphere(.12, 12, 10), fur, [0, 0, 0], { scale: [1, .9, 1.05] });
  part(head, new THREE.ConeGeometry(.07, .2, 8), fur, [0, -.03, .15], { rot: [Math.PI / 2, 0, 0], scale: [1, 1, .8] });
  part(head, new THREE.ConeGeometry(.055, .16, 8), cheek, [0, -.06, .13], { rot: [Math.PI / 2, 0, 0], scale: [1, 1, .6] });
  part(head, sphere(.024, 6, 5), std(0x0c0a14), [0, -.02, .25]);
  const ears: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    part(head, new THREE.ConeGeometry(.05, .14, 4), cheek, [.09 * s, -.05, -.03], { rot: [-Math.PI / 2, 0, -.5 * s] });
    const ear = new THREE.Group(); ear.position.set(.065 * s, .09, -.03); ear.rotation.z = -.28 * s; head.add(ear); ears.push(ear);
    part(ear, new THREE.ConeGeometry(.055, .22, 4), furDark, [0, .1, 0]); part(ear, new THREE.ConeGeometry(.03, .15, 4), violet, [0, .08, .02]);
    part(head, sphere(.026, 8, 6), cyan, [.068 * s, .035, .085], { scale: [1, .6, 1.3] });
    const shine2 = glow(0x8ff0ff, .16, .8); shine2.position.set(.07 * s, .035, .09); head.add(shine2);
  }
  rune(head, 0x8ff0ff, [0, .1, .06], .06, [-.9, 0, 0], cyan);
  // legs, trotting (diagonal pairs together), each paw lit and trailing a little mist
  const legs = [[1, .22, 0], [-1, .22, Math.PI], [1, -.22, Math.PI], [-1, -.22, 0]].map(([s, z, phase]) => {
    const l = new THREE.Group(); l.position.set(.08 * s, .36, z); fox.add(l);
    limb(l, [0, 0, 0], [0, -.17, .025], .036, fur, .03); limb(l, [0, -.17, .025], [0, -.33, 0], .026, furDark, .022);
    part(l, sphere(.034, 6, 5), cyan, [0, -.34, .02], { scale: [1, .5, 1.4] });
    const mist = glow(0x7fd4ff, .26, .55); mist.position.set(0, -.34, 0); l.add(mist);
    return { l, phase };
  });
  // the tail: a great plume sweeping up and back and curling at its tip, dark and starry inside, streaked with light
  const TAIL = 11, tailFurs = [std(0x241858), std(0x33227a), std(0x3e4aa8)], streak = shine(0x8ff0ff, .55), streak2 = shine(0xb080ff, .5);
  const curve = (k: number) => ({ y: .5 + .75 * k - .05 * k * k - .2 * k ** 3, z: -.36 - .35 * k - .15 * k * k });
  const segs = Array.from({ length: TAIL }, (_, i) => {
    const k = i / (TAIL - 1), r = .045 + .15 * Math.pow(Math.sin(k * Math.PI), .7) * (1 - .3 * k), s = new THREE.Group(); fox.add(s);
    const ty = .75 - .1 * k - .6 * k * k, tz = -.35 - .3 * k; s.rotation.x = Math.atan2(tz, ty); // (its length along the tail)
    part(s, sphere(1, 10, 8), tailFurs[i % 3], [0, 0, 0], { scale: [r * .8, r * 1.35, r] });
    for (const side of [-1, 1]) for (const [dz, m] of [[.35, streak], [-.3, streak2]] as [number, THREE.Material][]) part(s, box(.014, r * 1.7, .014), m, [side * r * .78 * Math.sqrt(1 - dz * dz), 0, dz * r]); // (on its skin, both sides)
    for (let j = 0; j < 2; j++) { const a = i * 2.3 + j * 3.1; part(s, sphere(.013, 4, 3), [star, gold, cyan][(i + j) % 3], [Math.cos(a) * r * .8, Math.sin(a * 1.3) * r, Math.sin(a) * r * .9]); }
    return { s, k, r };
  });
  const mark = new THREE.Group(); segs[5].s.add(mark); // a rune-diamond of gold on the tail's flank
  for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; part(mark, box(.008, .075, .008), gold, [sd * segs[5].r * .82, Math.sin(a) * .026, Math.cos(a) * .026], { rot: [a, 0, 0] }); }
  const aura = glow(0x7fe8ff, .9, .18); fox.add(aura);
  const wisps = [0, 1, 2].map(i => part(fox, new THREE.ConeGeometry(.04, .24, 5), shine(0x8ff0ff, .45), [0, 0, 0], { rot: [-Math.PI / 2 - .2 + i * .25, 0, 0] }));
  const twinkles = [0, 1, 2, 3].map(i => { const t = new THREE.Group(); fox.add(t); part(t, box(.008, .09, .008), star, [0, 0, 0]); part(t, box(.09, .008, .008), star, [0, 0, 0]); t.position.set((i - 1.5) * .2, .75 + (i % 2) * .25, -.6 - (i % 3) * .15); return t; });
  const dustA = motes(g, 0x8ff0ff, 5, .55, .55, .015), dustB = motes(g, 0xb080ff, 4, .45, .8, .013);
  return { group: g, shadow: .8, idle: t => {
    const w = t * 5.5;
    legs.forEach(({ l, phase }) => { l.rotation.x = Math.sin(w + phase) * .42; });
    body.position.y = .42 + Math.abs(Math.sin(w)) * .015; head.position.y = .64 + Math.abs(Math.sin(w)) * .012; head.rotation.y = Math.sin(t * .6) * .12;
    ears.forEach((e, i) => { e.rotation.x = Math.max(0, Math.sin(t * 1.3 + i * 2)) ** 8 * -.4; });
    for (const { s, k } of segs) { const c = curve(k); s.position.set(Math.sin(t * 1.8 - k * 2.2) * .09 * k, c.y + Math.sin(t * 2.4 - k * 3) * .03 * k, c.z); }
    const tip = segs[TAIL - 1].s.position; aura.position.copy(segs[6].s.position);
    wisps.forEach((m, i) => { m.position.set(tip.x + Math.sin(t * 3 + i) * .03, tip.y - .04 + i * .04, tip.z - .1); });
    twinkles.forEach((tw, i) => { tw.scale.setScalar(.4 + Math.max(0, Math.sin(t * 2.5 + i * 1.7)) * .9); });
    dustA(t, .7); dustB(t, -.5);
  } };
}

/** Fen-Nex in its full shape (M4.2, the owner's Fen-Nex, "fox man"): a long white beast between fox, cat and dragon, its
    fur blown back into feathers tipped with flame, its legs plated dark blue with red spiral runes, eyes of ember gold, a
    long feathered tail burning at its tip; it breathes Ember. Built facing +Z; it runs in place. `sideOn` turns it to
    walk to the right, as the gallery shows the familiars. */
function fenNex(sideOn = true): Built {
  const g = new THREE.Group(), beast = new THREE.Group(); g.add(beast); if (sideOn) beast.rotation.y = Math.PI / 2;
  const fur = std(0xf4f0ea), shade2 = std(0xd8d2c8), plate = std(0x1c2a5a, { roughness: .5, metalness: .3 }), dark = std(0x10162e);
  const flame = lit(0xff8a2a), flameHot = lit(0xffd070), rune = lit(0xff3a2a), eyeM = lit(0xffc040);
  const body = new THREE.Group(); body.position.y = .55; beast.add(body);
  part(body, sphere(.25, 14, 10), fur, [0, 0, 0], { scale: [.72, .72, 2] });
  part(body, sphere(.2, 12, 8), shade2, [0, -.06, .28], { scale: [.85, .85, 1] });
  // feathers blown back along its back and flanks, each tipped with flame
  const tips: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) for (const s of [-1, 0, 1]) {
    if (s === 0 && i % 2) continue;
    const z = .36 - i * .09, y = .16 - Math.abs(s) * .05, x = s * .13;
    part(body, new THREE.ConeGeometry(.045, .2, 4), fur, [x, y, z], { rot: [-1.9, 0, s * .5] });
    tips.push(part(body, new THREE.ConeGeometry(.022, .07, 4), i % 3 ? flame : flameHot, [x + s * .05, y + .06, z - .1], { rot: [-1.9, 0, s * .5] }));
  }
  // neck and head: a cat's round skull, a fox's snout and tall ears, a dragon's swept-back horns; ember eyes
  limb(beast, [0, .66, .42], [0, .86, .62], .1, fur, .12);
  const head = new THREE.Group(); head.position.set(0, .9, .68); beast.add(head);
  part(head, sphere(.14, 12, 10), fur, [0, 0, 0], { scale: [1, .9, 1.05] });
  part(head, new THREE.ConeGeometry(.075, .22, 8), fur, [0, -.03, .17], { rot: [Math.PI / 2, 0, 0], scale: [1, 1, .75] });
  part(head, sphere(.026, 6, 5), dark, [0, -.02, .28]);
  for (const s of [-1, 1]) {
    part(head, new THREE.ConeGeometry(.05, .2, 4), fur, [.07 * s, .14, -.02], { rot: [-.3, 0, -.3 * s] });
    part(head, new THREE.ConeGeometry(.028, .12, 4), flame, [.07 * s, .16, 0], { rot: [-.3, 0, -.3 * s] });
    limb(head, [.06 * s, .06, -.06], [.12 * s, .12, -.26], .022, plate, .01); // (swept-back horns)
    part(head, sphere(.028, 8, 6), eyeM, [.07 * s, .03, .1], { scale: [1, .6, 1.3] });
  }
  const mouth = glow(0xff8a2a, .5, 0); mouth.position.set(0, -.04, .32); head.add(mouth);
  // legs plated dark blue, a red spiral rune on each plate
  const legs = [[1, .3, 0], [-1, .3, Math.PI], [1, -.3, Math.PI], [-1, -.3, 0]].map(([s, z, phase]) => {
    const l = new THREE.Group(); l.position.set(.11 * s, .5, z); beast.add(l);
    limb(l, [0, 0, 0], [0, -.24, .03], .05, fur, .045); limb(l, [0, -.24, .03], [0, -.46, 0], .045, plate, .04);
    part(l, new THREE.TorusGeometry(.03, .006, 4, 12, Math.PI * 1.6), rune, [.045 * s, -.33, .015], { rot: [0, s * Math.PI / 2, 0] });
    part(l, sphere(.045, 6, 5), plate, [0, -.47, .03], { scale: [1, .5, 1.4] });
    return { l, phase };
  });
  // the tail: long and feathered, burning at its tip
  const TAIL = 8, segs = Array.from({ length: TAIL }, (_, i) => {
    const k = i / (TAIL - 1), s = new THREE.Group(); beast.add(s);
    part(s, sphere(.06 + .05 * Math.sin(k * Math.PI), 8, 6), fur, [0, 0, 0], { scale: [1, 1, 1.6] });
    if (i % 2) for (const sd of [-1, 1]) part(s, new THREE.ConeGeometry(.03, .14, 4), fur, [sd * .05, .03, -.04], { rot: [-2.2, 0, sd * .6] });
    return { s, k };
  });
  const tipFire = new THREE.Group(); beast.add(tipFire);
  part(tipFire, new THREE.ConeGeometry(.06, .2, 6), flame, [0, .06, 0]); part(tipFire, new THREE.ConeGeometry(.035, .13, 6), flameHot, [0, .05, 0]);
  const tipGlow = glow(0xff8a2a, .7, .6); tipFire.add(tipGlow);
  const embers = motes(g, 0xff9a3a, 5, .6, .7, .016);
  return { group: g, shadow: 1, parts: { head, mouth } as Record<string, THREE.Object3D>, idle: t => {
    const w = t * 6;
    legs.forEach(({ l, phase }) => { l.rotation.x = Math.sin(w + phase) * .5; });
    body.position.y = .55 + Math.abs(Math.sin(w)) * .02; head.position.y = .9 + Math.abs(Math.sin(w)) * .015;
    for (const { s, k } of segs) s.position.set(Math.sin(t * 2.2 - k * 2.5) * .12 * k, .6 + .25 * k + Math.sin(t * 2.6 - k * 3) * .03 * k, -.5 - .55 * k);
    const tip = segs[TAIL - 1].s.position; tipFire.position.set(tip.x, tip.y + .05, tip.z - .08); tipFire.scale.set(1, .85 + Math.sin(t * 17) * .15, 1);
    tips.forEach((f, i) => { f.scale.setScalar(.8 + Math.sin(t * 13 + i * 1.3) * .25); });
    embers(t, .6);
  } };
}

/** Fen-Nex as it is at `stage` (1 and 2: the Rune Fox, 3: its full shape), facing +Z, for the game (combat/fennex.ts). */
export const fennexLook = (stage: number) => stage >= 3 ? fenNex(false) : runeFox(false);

/** Familiars the mage could bind, looks only (names and notes in STR.familiars). */
export const FAMILIAR_OPTIONS = [{ id: 'runeFox', build: () => runeFox() }, { id: 'fenNex', build: () => fenNex() }] as const satisfies readonly { id: string; build: () => Built }[];

/* ---------- the gallery ---------- */

const shown: { room: Room; group: THREE.Group; idle: (t: number) => void }[] = [];
let clock = 0;
/** Stand the options (every one, or those in `only`) ahead of (north of) world (x, z) in `room`, a row per floor (the
    crypt's nearest), on free floor; returns where each stands. */
export function showModelOptions(room: Room, x: number, z: number, only?: readonly string[]) {
  const gap = 1.7, out: { id: string; floor: number; x: number; z: number }[] = [];
  const picked = MODEL_OPTIONS.filter(o => !only || only.includes(o.id));
  const floors = [...new Set(picked.map(o => o.floor))].sort((a, b) => (a || 99) - (b || 99)); // (the Wardlings, no floor's, last)
  for (const [r, floor] of floors.entries()) {
    const row = picked.filter(o => o.floor === floor);
    row.forEach((o, i) => {
      const at = freeSpotNear(room, x + (i - (row.length - 1) / 2) * gap, z - 1.8 - r * 1.7);
      const b = o.build(); mergeRig(b.group, b.idle, o.id); b.group.position.set(at.x - room.cx, 0, at.z - room.cz); b.group.add(blob(b.shadow)); room.group.add(b.group);
      shown.push({ room, group: b.group, idle: b.idle }); out.push({ id: o.id, floor, x: at.x, z: at.z });
    });
  }
  return out;
}
/** Stand the familiar options (every one, or those in `only`) in a row ahead of world (x, z) in `room`. */
export function showFamiliarOptions(room: Room, x: number, z: number, only?: readonly string[]) {
  const list = FAMILIAR_OPTIONS.filter(o => !only || only.includes(o.id));
  return list.map((o, i) => {
    const at = freeSpotNear(room, x + (i - (list.length - 1) / 2) * 2, z - 1.8);
    const b = o.build(); mergeRig(b.group, b.idle, o.id); b.group.position.set(at.x - room.cx, 0, at.z - room.cz); b.group.add(blob(b.shadow)); room.group.add(b.group);
    shown.push({ room, group: b.group, idle: b.idle });
    return { id: o.id, x: at.x, z: at.z };
  });
}
/** Stand the bosses built in code (bossLooks.ts: the Hollow Warden, M4, and the bosses of the floors below and the
    Eda lore's; every one, or those in `only`) in a row ahead of world (x, z). */
export function showBossLooks(room: Room, x: number, z: number, only?: readonly string[]) {
  const list = ALL_BOSS_LOOKS.filter(o => !only || only.includes(o.id));
  return list.map((o, i) => {
    const at = freeSpotNear(room, x + (i - (list.length - 1) / 2) * 2.9, z - 3);
    const b = o.build(); mergeRig(b.group, b.idle, 'boss:' + o.id); b.group.position.set(at.x - room.cx, 0, at.z - room.cz); b.group.add(blob(b.shadow)); room.group.add(b.group);
    shown.push({ room, group: b.group, idle: b.idle });
    return { id: o.id, x: at.x, z: at.z };
  });
}
/** Stand Dr. Jelly (world/jellyLooks.ts: the plague doctor, the owner's choice of 2026-10-02) ahead of world (x, z),
    looping the giving gesture with a flask of jelly on his palm. */
export function showJellyLooks(room: Room, x: number, z: number) {
  return [0].map(i => {
    const at = freeSpotNear(room, x, z - 2), g = drJellyLook(), P = g.userData.parts as JellyParts;
    const vial = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), glowTone(0x7ae070)); vial.position.y = .05; P.gift.add(vial);
    g.position.set(at.x - room.cx, 0, at.z - room.cz); room.group.add(g);
    shown.push({ room, group: g, idle: t => { const c = (t + i * .9) % 3.2, k = c < .5 ? c / .5 : c < 1.6 ? 1 : c < 2.1 ? 1 - (c - 1.6) / .5 : 0; givePose(P, k * k * (3 - 2 * k)); vial.visible = k > .05; P.body.position.y = Math.sin(t * 2.1 + i) * .02; } });
    return { id: 'plague', x: at.x, z: at.z };
  });
}
/** The nearest open floor to (x, z), searching outwards half a tile at a time, at least `gap` from every spot `taken`
    (so a crowd of looks never stands one on another); the nearest open floor at all if the room has no such place. */
function clearSpot(room: Room, x: number, z: number, taken: readonly { x: number; z: number }[], gap = 1) {
  const b = room.bounds;
  for (let ring = 0; ring < 24; ring++) for (let dz = -ring; dz <= ring; dz++) for (let dx = -ring; dx <= ring; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
    const px = x + dx * .5, pz = z + dz * .5;
    if (px > b.minX + .5 && px < b.maxX - .5 && pz > b.minZ + .5 && pz < b.maxZ - .5 && isFreeAt(room, px, pz) && taken.every(q => Math.hypot(q.x - px, q.z - pz) >= gap)) return { x: px, z: pz };
  }
  return freeSpotNear(room, x, z);
}
/** Stand the bestiary (M4.5; every one, or those in `only`) ahead of world (x, z) in `room`: rows for each kind (beasts,
    creatures of myth, elementals), nearest the mage first, each turned a little to show its side. They are the size of
    the foes they will be, so the whole bestiary wants a great hall (`?room=great_hall`). */
export function showBestiary(room: Room, x: number, z: number, only?: readonly string[]) {
  const out: { id: string; x: number; z: number }[] = [];
  const kinds = (['beast', 'creature', 'elemental'] as const).map(kind => BESTIARY_OPTIONS.filter(o => o.kind === kind && (!only || only.includes(o.id)))).filter(l => l.length);
  const across = Math.max(1, Math.min(8, Math.floor((room.bounds.maxX - room.bounds.minX) / 2.4)));
  let row = 0;
  for (const list of kinds) {
    list.forEach((o, i) => {
      const n = Math.min(across, list.length - Math.floor(i / across) * across);
      const wx = x + ((i % across) - (n - 1) / 2) * 2.4, wz = z - 1.9 - (row + Math.floor(i / across)) * 2.1;
      const at = clearSpot(room, wx, wz, out, 1.7);
      const b = o.build(); mergeRig(b.group, b.idle, 'bestiary:' + o.id); b.group.position.set(at.x - room.cx, 0, at.z - room.cz); b.group.rotation.y = .5;
      if (b.shadow) b.group.add(blob(b.shadow));
      room.group.add(b.group); shown.push({ room, group: b.group, idle: b.idle }); out.push({ id: o.id, x: at.x, z: at.z });
    });
    row += Math.ceil(list.length / across);
  }
  return out;
}
/** Every step: the options in the room shown move as they idle. */
export function updateModelOptions(dt: number, current: Room) {
  clock += dt;
  for (const s of shown) if (s.room === current) s.idle(clock);
}
/** Stand one look built by `build` at world (x, z) in `room`, turned `ry`, merged as a foe's is (M4.12's old and new looks
    side by side); it idles with the rest and goes with them. Its height and the names of the parts it moves. */
export function standLook(room: Room, build: () => import('./beastParts').Built, key: string, x: number, z: number, ry = .5) {
  const b = build(); mergeRig(b.group, b.idle, key, Object.values(b.parts ?? {})); b.group.position.set(x - room.cx, 0, z - room.cz); b.group.rotation.y = ry;
  if (b.shadow) b.group.add(blob(b.shadow));
  room.group.add(b.group); shown.push({ room, group: b.group, idle: b.idle });
  return b;
}
/** Take the options shown in `room` away. */
export function removeModelOptions(room: Room) {
  for (let i = shown.length - 1; i >= 0; i--) if (shown[i].room === room) { room.group.remove(shown[i].group); disposeTree(shown[i].group); shown.splice(i, 1); }
}
/** A new floor: its rooms are gone, and the options with them. */
export function clearModelOptions() { shown.length = 0; }
