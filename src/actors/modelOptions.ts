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
import { SCHOOL_LIGHT, bigEyes, box, circle, crystal, limb, lit, motes, part, rune, runeRing, shine, sphere, std, type School, type V3 } from '../render/arcane';

/** A built option: its group, how it idles, the size of the shadow under it, and the parts a foe's behaviour moves beyond
    its idle (M4: a beetle's wing-cases, a mimic's lid). */
interface Built { group: THREE.Group; idle: (t: number) => void; shadow: number; parts?: Record<string, THREE.Object3D> }

/** Now and then the eyes close for a moment. */
const blink = (list: THREE.Object3D[], t: number, every = 3.4, at = 0) => { const k = (t + at) % every; for (const e of list) e.scale.y = k < .12 ? .12 : 1; };
/** A small smile (the lower half of a thin ring), `r` wide, facing +Z. */
const smile = (parent: THREE.Object3D, at: V3, r: number, color = 0x2a1418, tilt = 0) => part(parent, new THREE.TorusGeometry(r, r * .14, 4, 10, Math.PI), lit(color), at, { rot: [tilt, 0, Math.PI] });

/* ---------- the options ---------- */

/** Crypt, Umbral: a mushroom that walks, hopping on stubby feet; its violet-spotted cap puffs spores. */
function sporeling(): Built {
  const U = SCHOOL_LIGHT.umbral, g = new THREE.Group(), stem = std(0xeadfca), capM = std(0x5a2f7a), gill = std(0x2c1a3e), body = new THREE.Group(); g.add(body);
  part(body, sphere(.16, 12, 10), stem, [0, .22, 0], { scale: [1, 1.3, .95] });
  for (const s of [-1, 1]) part(body, sphere(.065, 8, 6), stem, [.09 * s, .045, .04], { scale: [1, .6, 1.4] });
  // (the cap sits high and not too wide, so the camera, looking down, still sees the eyes under it)
  const cap = new THREE.Group(); cap.position.y = .42; body.add(cap);
  part(cap, new THREE.SphereGeometry(.27, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), capM, [0, 0, 0], { scale: [1, .75, 1] });
  part(cap, new THREE.CircleGeometry(.27, 16), gill, [0, 0, 0], { rot: [Math.PI / 2, 0, 0] });
  const spot = lit(U);
  for (const [th, ph, r] of [[0, 0, .05], [.75, 1.3, .045], [.8, 2.1, .04], [.7, .2, .04], [.75, 3.2, .04], [1.2, 1.7, .035], [1.15, .8, .03], [1.2, 2.6, .03], [.8, 4.4, .04]] as V3[])
    part(cap, sphere(r, 7, 5), spot, [.27 * Math.sin(th) * Math.cos(ph), .2 * Math.cos(th), .27 * Math.sin(th) * Math.sin(ph)]);
  const eyes = bigEyes(body, .066, .23, .13, .056);
  smile(body, [0, .15, .147], .03);
  const under = glow(U, .8, .45); under.position.y = .34; body.add(under);
  const spores = [0, 1, 2, 3, 4].map(() => part(g, sphere(.022, 5, 4), spot, [0, 0, 0]));
  return { group: g, shadow: .6, idle: t => {
    const k = t * 1.3 % 1, up = k < .55 ? Math.sin(k / .55 * Math.PI) : 0, land = k >= .55 && k < .75 ? Math.sin((k - .55) / .2 * Math.PI) : 0;
    body.position.y = up * .14; body.scale.set(1 + land * .12, 1 - land * .16 + up * .05, 1 + land * .12);
    cap.rotation.z = Math.sin(t * 2.8) * .08; blink(eyes, t, 3.1); under.material.opacity = .35 + Math.sin(t * 2.5) * .12;
    spores.forEach((s, i) => { const q = (t * .45 + i / 5) % 1; s.position.set(Math.sin(i * 2.3) * .16 + Math.sin(q * 7 + i) * .04, .55 + q * .55, Math.cos(i * 2.3) * .16); s.scale.setScalar(1 - q * .7); });
  } };
}

/** Crypt, Hallow: a fuzzy moth drawn to the chapel's candles, gold eyespots on its wings and a tail that glows like one. */
function vesperMoth(): Built {
  const H = SCHOOL_LIGHT.hallow, g = new THREE.Group(), fluff = std(0xf0e6cc), fluff2 = std(0xcdb690), stripe = std(0x8a6a44), wingM = std(0xeee2c6), edgeM = std(0x9a7a4c), body = new THREE.Group(); body.position.y = .6; g.add(body);
  part(body, sphere(.13, 10, 8), fluff, [0, 0, 0]);
  part(body, sphere(.11, 10, 8), fluff2, [0, -.03, -.17], { scale: [.9, .85, 1.35] });
  for (const z of [-.15, -.23]) part(body, new THREE.TorusGeometry(z > -.2 ? .096 : .08, .012, 4, 12), stripe, [0, -.03, z]);
  part(body, sphere(.04, 8, 6), lit(H), [0, -.04, -.31]);
  const tail = glow(H, .7, .7); tail.position.set(0, -.04, -.33); body.add(tail);
  part(body, new THREE.TorusGeometry(.1, .045, 6, 12), fluff, [0, .01, .08]);
  part(body, sphere(.1, 10, 8), fluff, [0, .03, .14]);
  const eyes = bigEyes(body, .058, .05, .2, .056);
  for (const s of [-1, 1]) {
    limb(body, [.04 * s, .11, .17], [.13 * s, .3, .25], .008, edgeM);
    part(body, sphere(.07, 6, 5), fluff2, [.1 * s, .24, .23], { scale: [.4, 1, .12], rot: [.4, 0, -.42 * s] });
    for (let i = 0; i < 3; i++) limb(body, [.05 * s, -.08, .06 - i * .06], [.1 * s, -.18, .08 - i * .07], .01, edgeM);
  }
  const wing = (s: number, at: V3, yaw: number, r: number) => {
    const w = new THREE.Group(); w.position.set(...at); w.rotation.y = yaw; body.add(w);
    part(w, sphere(r, 12, 6), wingM, [r * .9 * s, 0, 0], { scale: [1, .07, .62] });
    part(w, sphere(r * 1.05, 12, 6), edgeM, [r * .9 * s, -.005, 0], { scale: [1, .05, .67] });
    part(w, new THREE.CircleGeometry(r * .3, 12), lit(H), [r * 1.1 * s, r * .07 + .002, 0], { rot: [-Math.PI / 2, 0, 0] });
    part(w, new THREE.CircleGeometry(r * .13, 10), lit(0x3a2a1a), [r * 1.1 * s, r * .07 + .004, 0], { rot: [-Math.PI / 2, 0, 0] });
    return { w, s };
  };
  const wings = [-1, 1].flatMap(s => [wing(s, [.07 * s, .04, .03], -.35 * s, .24), wing(s, [.06 * s, .02, -.1], .5 * s, .17)]);
  const dust = motes(g, H, 4, .38, .55, .014);
  return { group: g, shadow: .6, idle: t => {
    body.position.y = .6 + Math.sin(t * 3) * .05 + Math.sin(t * 14) * .01; body.rotation.z = Math.sin(t * 1.3) * .08;
    wings.forEach(({ w, s }, i) => { w.rotation.z = s * (.2 + Math.sin(t * 14 - (i % 2) * .5) * .5); });
    tail.material.opacity = .55 + Math.sin(t * 5) * .15; blink(eyes, t, 3.7); dust(t, .8);
  } };
}

/** Crypt, Storm: a scarab with runes lit on its shell and a spark on its horn; its wing-cases part to show the storm in it. */
function runeBeetle(): Built {
  const S = SCHOOL_LIGHT.storm, g = new THREE.Group(), shellM = std(0x234a78, { roughness: .3, metalness: .5 }), under = std(0x151b2a), legM = std(0x0e1220), spark = lit(S), body = new THREE.Group(); body.position.y = .17; g.add(body);
  part(body, sphere(.19, 12, 8), under, [0, -.02, -.02], { scale: [1, .55, 1.3] });
  const inner = glow(S, .8, 0); inner.position.set(0, .08, -.04); body.add(inner);
  const seam = part(body, box(.02, .02, .4), lit(S), [0, .1, -.04]);
  const halves = [-1, 1].map(s => {
    const h = new THREE.Group(); h.position.set(.01 * s, .02, 0); body.add(h);
    part(h, sphere(.2, 12, 8), shellM, [.09 * s, 0, -.04], { scale: [.6, .62, 1.22] });
    rune(h, S, [.09 * s, .128, -.04], .1, [-Math.PI / 2 + .25, 0, 0]);
    part(h, sphere(.018, 5, 4), spark, [.12 * s, .1, .12]); part(h, sphere(.018, 5, 4), spark, [.15 * s, .07, -.2]);
    return h;
  });
  part(body, sphere(.12, 10, 8), shellM, [0, .03, .21], { scale: [1, .6, .7] });
  part(body, sphere(.09, 10, 8), under, [0, 0, .3]);
  part(body, new THREE.ConeGeometry(.03, .16, 6), shellM, [0, .07, .36], { rot: [.7, 0, 0] });
  const tip = crystal(body, S, [0, .135, .415], .07, [.7, 0, 0], spark), sparkGlow = glow(S, .28, .7); sparkGlow.position.set(0, .14, .42); body.add(sparkGlow);
  const eyes = bigEyes(body, .06, .035, .33, .048, 0x1a1224, .3);
  for (const s of [-1, 1]) part(body, new THREE.ConeGeometry(.018, .07, 4), legM, [.035 * s, -.04, .39], { rot: [Math.PI / 2 + .3, 0, s * .4] });
  const legs: THREE.Group[] = [];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const l = new THREE.Group(), k = .03 * (1 - i); l.position.set(.1 * s, -.04, .12 - i * .14); body.add(l); legs.push(l);
    limb(l, [0, 0, 0], [.14 * s, .03, k], .016, legM); limb(l, [.14 * s, .03, k], [.2 * s, -.13, k * 2], .014, legM, .008);
  }
  return { group: g, shadow: .65, parts: { halfL: halves[0], halfR: halves[1], inner }, idle: t => {
    const open = Math.max(0, Math.sin(t * 1.3)) ** 4;
    halves.forEach((h, i) => { h.rotation.z = (i ? 1 : -1) * open * .4; }); inner.material.opacity = open * .9;
    legs.forEach((l, i) => { l.rotation.y = Math.sin(t * 10 + i * 1.9) * .2 * (1 - open); }); body.position.y = .17 + Math.abs(Math.sin(t * 10)) * .008 * (1 - open);
    const on = Math.floor(t * 9) % 4 !== 0; seam.visible = on || open > .3; tip.visible = on; sparkGlow.material.opacity = on ? .7 : .15; blink(eyes, t, 4.1);
  } };
}

/** Crypt, Ember: a kiln-fired urn on stubby feet with a fire in its belly; it lifts its lid to peek, and spits embers. */
function urnMimic(): Built {
  const E = SCHOOL_LIGHT.ember, g = new THREE.Group(), clay = std(0xb0603c), clayDark = std(0x7a3a26), tooth = std(0xf0e8d6), body = new THREE.Group(); g.add(body);
  const profile = [[0, 0], [.13, 0], [.21, .05], [.26, .16], [.25, .28], [.19, .36], [.15, .4], [.17, .43]].map(([x, y]) => new THREE.Vector2(x, y));
  part(body, new THREE.LatheGeometry(profile, 14), clay, [0, .06, 0]);
  part(body, new THREE.TorusGeometry(.25, .014, 4, 22), lit(E), [0, .34, 0], { rot: [Math.PI / 2, 0, 0] });
  for (const a of [-.55, 0, .55]) rune(body, E, [Math.sin(a) * .265, .22, Math.cos(a) * .265], .075, [0, a, 0]);
  part(body, new THREE.CircleGeometry(.15, 14), lit(0x2a0c06), [0, .485, 0], { rot: [-Math.PI / 2, 0, 0] });
  const inside = glow(E, .75, .4); inside.position.y = .52; body.add(inside);
  const peek = new THREE.Group(); peek.position.set(0, .42, .02); body.add(peek);
  const eyes = bigEyes(peek, .06, 0, .04, .055);
  const lid = new THREE.Group(); lid.position.set(0, .5, -.15); body.add(lid);
  part(lid, new THREE.CylinderGeometry(.18, .19, .045, 14), clayDark, [0, .02, .15]); part(lid, sphere(.045, 8, 6), clayDark, [0, .07, .15]);
  for (const s of [-1, 1]) part(lid, new THREE.ConeGeometry(.018, .05, 4), tooth, [.05 * s, -.02, .31], { rot: [Math.PI, 0, 0] });
  const feet = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([x, z]) => part(body, sphere(.06, 8, 6), clayDark, [.12 * x, .03, .1 * z], { scale: [1, .7, 1.1] }));
  const embers = [0, 1, 2].map(() => part(body, sphere(.02, 5, 4), lit(0xffb040), [0, 0, 0]));
  return { group: g, shadow: .65, parts: { lid, peek, inside }, idle: t => {
    const k = t * .45 % 1, open = Math.min(1, Math.max(0, Math.sin(k * Math.PI * 2) * 1.6));
    lid.rotation.x = -open * .8; peek.position.y = .42 + open * .085; peek.rotation.y = Math.sin(t * 3) * .35 * open;
    body.position.y = Math.abs(Math.sin(t * 8)) * .012; feet.forEach((f, i) => { f.position.y = .03 + Math.max(0, Math.sin(t * 8 + i * 1.6)) * .015; });
    inside.material.opacity = .25 + open * .5; blink(eyes, t, 2.9);
    embers.forEach((e, i) => { const q = (t * .9 + i / 3) % 1; e.visible = open > .2; e.position.set(Math.sin(i * 2.1 + q * 4) * .08, .5 + q * .4, Math.cos(i * 2.1) * .06); e.scale.setScalar(1 - q * .6); });
  } };
}

/** Drowned floor, Frost: a fat toad with frost crystals growing on its back; it puffs its throat and breathes cold. */
function mireToad(): Built {
  const F = SCHOOL_LIGHT.frost, g = new THREE.Group(), skin = std(0x4f7a78), belly = std(0xc4d4c0), spotM = std(0x2f5250), ice = lit(F), body = new THREE.Group(); g.add(body);
  part(body, sphere(.26, 12, 10), skin, [0, .2, -.04], { scale: [1.1, .72, 1] });
  part(body, sphere(.2, 12, 10), skin, [0, .25, .14], { scale: [1.15, .7, .95] });
  const throat = part(body, sphere(.12, 10, 8), belly, [0, .14, .24], { scale: [1.2, .8, .9] });
  for (const s of [-1, 1]) part(body, sphere(.075, 8, 6), skin, [.1 * s, .33, .15]);
  const eyes = bigEyes(body, .1, .37, .18, .062, 0x1a1224, .15);
  part(body, new THREE.TorusGeometry(.2, .01, 4, 16, 1.2), lit(0x1a2a2a), [0, .43, .305], { rot: [0, 0, -Math.PI / 2 - .6] });
  for (const [x, y, z, h, rx, rz] of [[0, .37, -.08, .17, 0, 0], [-.11, .35, -.02, .12, 0, .45], [.12, .34, -.12, .13, 0, -.45], [-.06, .32, -.22, .1, -.6, .2], [.05, .3, -.26, .09, -.7, -.2]])
    crystal(body, F, [x, y, z], h, [rx, 0, rz], ice);
  for (const [x, y, z] of [[.17, .28, -.02], [-.18, .26, -.1], [.08, .3, .06], [.2, .2, -.18]]) part(body, sphere(.03, 6, 5), spotM, [x, y, z]);
  for (const s of [-1, 1]) {
    part(body, sphere(.11, 8, 6), skin, [.22 * s, .1, -.12], { scale: [.8, .9, 1.3] });
    part(body, sphere(.06, 6, 5), skin, [.25 * s, .02, .02], { scale: [1, .4, 1.6] });
    limb(body, [.14 * s, .14, .18], [.17 * s, .02, .26], .03, skin); part(body, sphere(.045, 6, 5), skin, [.18 * s, .015, .28], { scale: [1.2, .4, 1.2] });
  }
  const frost = glow(F, .8, .4); frost.position.set(0, .4, -.12); body.add(frost);
  const breath = [0, 1, 2].map(() => part(body, sphere(.06, 7, 6), shine(F, .45), [0, 0, 0]));
  return { group: g, shadow: .75, parts: { body, throat }, idle: t => {
    const puff = Math.max(0, Math.sin(t * 3.2)); throat.scale.set(1.2 + puff * .35, .8 + puff * .3, .9 + puff * .25);
    body.scale.set(1, 1 + Math.sin(t * 1.6) * .02, 1); blink(eyes, t, 3.3); frost.material.opacity = .3 + Math.sin(t * 2) * .1;
    breath.forEach((b, i) => { const q = (t * .45 + i * .08) % 1; b.visible = q < .45; const k = q / .45; b.position.set((i - 1) * .05 * k, .2 + k * .12, .34 + k * .45); b.scale.setScalar(.4 + k * 1.3); (b.material as THREE.MeshBasicMaterial).opacity = .45 * (1 - k); });
  } };
}

/** Drowned floor, Storm: a round-headed eel rising from a rune-edged pool, lights along its flanks and a glowing lure on
    each whisker. */
function cisternLurker(): Built {
  const S = SCHOOL_LIGHT.storm, g = new THREE.Group(), hide = std(0x2e6272), belly = std(0x9cc4b8), light = lit(S), fin = shine(0x9fe8ff, .5);
  const disc = part(g, new THREE.CircleGeometry(.5, 20), std(0x12404a, { roughness: .15, metalness: .2, emissive: 0x06242a }), [0, .012, 0], { rot: [-Math.PI / 2, 0, 0] });
  const edge = runeRing(g, S, .5, [0, .03, 0], 8);
  const rise = new THREE.Group(); g.add(rise); // (all of it that rises out of the pool: M4's foe sinks it to dive)
  const segs: THREE.Mesh[] = [], spots: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) { const r = .14 - i * .01, s = part(rise, sphere(r, 10, 8), i % 2 ? belly : hide, [0, 0, 0]); segs.push(s); if (!(i % 2)) for (const x of [-1, 1]) spots.push(part(s, sphere(.022, 5, 4), light, [r * .9 * x, .03, .03])); }
  const head = new THREE.Group(); rise.add(head);
  part(head, sphere(.18, 12, 10), hide, [0, 0, 0], { scale: [1.1, .95, 1] });
  part(head, sphere(.12, 10, 8), belly, [0, -.06, .07], { scale: [1.2, .7, 1] });
  const eyes = bigEyes(head, .08, .05, .13, .06);
  smile(head, [0, -.05, .175], .04);
  const lures: THREE.Sprite[] = [];
  for (const s of [-1, 1]) {
    limb(head, [.11 * s, -.05, .12], [.2 * s, -.1, .17], .012, hide); limb(head, [.2 * s, -.1, .17], [.27 * s, -.03, .2], .01, hide);
    part(head, sphere(.03, 6, 5), light, [.27 * s, -.03, .2]); const l = glow(S, .3, .8); l.position.set(.27 * s, -.03, .2); head.add(l); lures.push(l);
    part(head, sphere(.08, 8, 6), fin, [.18 * s, .05, -.03], { scale: [.3, 1, .9], rot: [0, 0, -.6 * s] });
  }
  for (let i = 0; i < 3; i++) part(head, new THREE.ConeGeometry(.04, .18, 4), fin, [(i - 1) * .06, .17, -.05], { rot: [-.4, 0, -(i - 1) * .5] });
  const place = (t: number) => {
    for (let i = 0; i < 6; i++) { const k = i / 6; segs[i].position.set(Math.sin(t * 1.8 + k * 3) * .1 * (1 - k * .3), .05 + k * .7, -.1 + Math.sin(k * 2.4) * .15); }
    head.position.set(Math.sin(t * 1.8 + 3) * .07, .84, .04); head.rotation.set(.15 + Math.sin(t * 1.2) * .08, 0, Math.sin(t * .9) * .12);
    edge.rotation.y = t * .3; blink(eyes, t, 3.6);
    lures.forEach((l, i) => { l.material.opacity = (Math.floor(t * 6) + i * 2) % 5 ? .8 : .25; });
    spots.forEach((s, i) => { s.visible = (Math.floor(t * 4) + i) % 5 !== 0; });
  };
  place(0);
  return { group: g, shadow: .5, idle: place, parts: { rise, lures: lures[0], lures2: lures[1], disc } };
}

/** Drowned floor, Hallow: a jellyfish floating like a lantern, a little flame in its bell and gold light round its rim. */
function lanternJelly(): Built {
  const H = SCHOOL_LIGHT.hallow, g = new THREE.Group(), float = new THREE.Group(), tentM = std(0xf0d8a8), tipM = lit(H); g.add(float);
  const bellM = std(0xf6dca0, { transparent: true, opacity: .6, emissive: 0x5a3a10, roughness: .3, side: THREE.DoubleSide, depthWrite: false });
  const bell = new THREE.Group(); bell.position.y = .72; float.add(bell);
  part(bell, new THREE.SphereGeometry(.26, 16, 10, 0, Math.PI * 2, 0, Math.PI * .56), bellM, [0, 0, 0], { scale: [1, .85, 1] });
  part(bell, new THREE.TorusGeometry(.255, .018, 4, 24), lit(H), [0, -.04, 0], { rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; part(bell, sphere(.03, 6, 5), tentM, [Math.cos(a) * .25, -.06, Math.sin(a) * .25]); }
  const flame = new THREE.Group(); flame.position.y = .02; bell.add(flame);
  part(flame, new THREE.ConeGeometry(.045, .13, 7), lit(0xfff0b0), [0, 0, 0]); part(flame, new THREE.ConeGeometry(.022, .07, 6), lit(0xffffff), [0, -.02, 0]);
  const light = glow(H, .6, .5); light.position.y = .02; bell.add(light);
  const eyes = bigEyes(bell, .08, .04, .22, .05);
  const tents = Array.from({ length: 6 }, (_, i) => { const a = i / 6 * Math.PI * 2 + .3; return { a, parts: [0, 1, 2, 3, 4].map(j => part(float, sphere(.026 - j * .003, 6, 5), j === 4 ? tipM : tentM, [0, 0, 0])) }; });
  const place = (t: number) => {
    const p = Math.sin(t * 2.4); bell.scale.set(1 - p * .06, 1 + p * .08, 1 - p * .06); float.position.y = Math.sin(t * 1.2) * .06 + p * .02;
    flame.scale.set(1, .85 + Math.sin(t * 13) * .15, 1); light.material.opacity = .45 + Math.sin(t * 9) * .08;
    for (const { a, parts } of tents) parts.forEach((m, j) => { const sway = Math.sin(t * 2 - j * .8 + a * 3) * .025 * j; m.position.set(Math.cos(a) * (.17 - j * .01) + sway, .64 - j * .085, Math.sin(a) * (.17 - j * .01) + sway * .5); });
    blink(eyes, t, 4.2);
  };
  place(0);
  return { group: g, shadow: .5, idle: place, parts: { bell, light } };
}

/** Burning floor, Ember: a salamander with glowing spots, a crest of flame down its back and a flame on its tail. */
function cinderSalamander(): Built {
  const E = SCHOOL_LIGHT.ember, g = new THREE.Group(), skin = std(0x7a3226), belly = std(0xe07a34), spot = lit(0xffa040), flameM = lit(E), flameCore = lit(0xffd060), body = new THREE.Group(); g.add(body);
  body.rotation.y = .6; // (turned a little, so its length shows; the head looks back at the camera)
  const head = new THREE.Group(); head.position.set(0, .15, .3); body.add(head);
  part(head, sphere(.13, 12, 8), skin, [0, 0, 0], { scale: [1.15, .75, 1.2] });
  part(head, sphere(.1, 10, 8), belly, [0, -.04, .04], { scale: [1.1, .5, 1.1] });
  const eyes = bigEyes(head, .072, .07, .07, .052);
  smile(head, [0, -.01, .15], .05);
  for (const s of [-1, 1]) part(head, sphere(.022, 5, 4), lit(0xff8a5a), [.1 * s, -.01, .11]);
  part(body, sphere(.14, 12, 8), skin, [0, .14, .1], { scale: [1, .8, 1.3] });
  part(body, sphere(.12, 12, 8), skin, [0, .12, -.1], { scale: [1, .8, 1.3] });
  part(body, sphere(.12, 10, 8), belly, [0, .08, .02], { scale: [.9, .5, 1.6] });
  for (const [x, y, z] of [[.07, .23, .13], [-.07, .23, .1], [.06, .2, -.06], [-.05, .2, -.14], [.08, .18, -.16]]) part(body, sphere(.022, 5, 4), spot, [x, y, z]);
  const crest = [[.25, .16, .12], [.23, .03, .1], [.21, -.1, .09]].map(([y, z, h]) => { const c = new THREE.Group(); c.position.set(0, y, z); body.add(c); part(c, new THREE.ConeGeometry(.035, h, 6), flameM, [0, h / 2, 0]); part(c, new THREE.ConeGeometry(.018, h * .55, 5), flameCore, [0, h * .3, .01]); return c; });
  const tail = [0, 1, 2, 3].map(i => part(body, sphere(.09 - i * .017, 8, 6), skin, [0, .1 - i * .015, -.24 - i * .1]));
  const tip = new THREE.Group(); body.add(tip);
  part(tip, new THREE.ConeGeometry(.04, .14, 6), flameM, [0, .07, 0]); part(tip, new THREE.ConeGeometry(.02, .08, 5), flameCore, [0, .04, .01]);
  const tipGlow = glow(E, .5, .7); tipGlow.position.y = .07; tip.add(tipGlow);
  for (const [s, z] of [[-1, .16], [1, .16], [-1, -.1], [1, -.1]]) { limb(body, [.1 * s, .12, z], [.2 * s, .04, z + .04], .03, skin); part(body, sphere(.045, 6, 5), skin, [.21 * s, .02, z + .06], { scale: [1.2, .45, 1.2] }); }
  const heat = glow(E, 1, .35); heat.position.y = .2; body.add(heat);
  return { group: g, shadow: .7, idle: t => {
    const curl = (k: number) => -.07 * k * k + Math.sin(t * 2.5 - k * .7) * .03 * k;
    tail.forEach((m, i) => { m.position.x = curl(i + 1); }); tip.position.set(curl(4.6), .05, -.6);
    crest.forEach((c, i) => { c.scale.set(1, .8 + Math.sin(t * 11 + i * 2) * .25, 1); });
    head.rotation.y = -.5 + Math.sin(t * .9) * .2; head.position.y = .15 + Math.sin(t * 1.8) * .01; heat.material.opacity = .3 + Math.sin(t * 3) * .08; blink(eyes, t, 3.2);
  } };
}

/** Burning floor, Umbral: a big-eared imp on bat wings over a hex circle, holding up a violet flame; it grins. */
function hexImp(): Built {
  const U = SCHOOL_LIGHT.umbral, g = new THREE.Group(), skin = std(0xa07ccc), paler = std(0xc4aee0), dark = std(0x241830), wingM = std(0x3a2250, { side: THREE.DoubleSide }), float = new THREE.Group(); g.add(float);
  const hex = circle(g, U, .38);
  const body = new THREE.Group(); body.position.y = .48; float.add(body);
  part(body, sphere(.11, 10, 8), skin, [0, 0, 0], { scale: [1, 1.1, .9] });
  part(body, sphere(.07, 8, 6), paler, [0, -.02, .06]);
  const head = new THREE.Group(); head.position.set(0, .2, .02); body.add(head);
  part(head, sphere(.17, 12, 10), skin, [0, 0, 0], { scale: [1.1, 1, 1] });
  for (const s of [-1, 1]) {
    part(head, new THREE.ConeGeometry(.055, .22, 5), skin, [.19 * s, .03, -.01], { rot: [0, 0, -s * 1.15] });
    part(head, new THREE.ConeGeometry(.03, .14, 4), std(0xc080a0), [.18 * s, .03, .01], { rot: [0, 0, -s * 1.15] });
    part(head, new THREE.ConeGeometry(.024, .09, 5), dark, [.06 * s, .15, -.02], { rot: [-.3, 0, -s * .3] });
  }
  const eyes = bigEyes(head, .068, .02, .12, .062, 0x2a0c40);
  smile(head, [0, -.07, .155], .06, 0x1a0a20);
  part(head, new THREE.ConeGeometry(.012, .035, 4), std(0xf0e8e0), [.03, -.115, .155], { rot: [Math.PI, 0, 0] });
  const wings = [-1, 1].map(s => {
    const w = new THREE.Group(); w.position.set(.07 * s, .06, -.08); w.rotation.x = -.5; body.add(w);
    limb(w, [0, 0, 0], [.3 * s, .16, 0], .013, dark); limb(w, [.3 * s, .16, 0], [.34 * s, -.04, 0], .01, dark); limb(w, [.3 * s, .16, 0], [.22 * s, -.1, 0], .01, dark);
    part(w, sphere(.16, 10, 6), wingM, [.2 * s, .03, 0], { scale: [1, .75, .06] });
    return { w, s };
  });
  limb(body, [.1, .04, .03], [.2, .14, .12], .025, skin); part(body, sphere(.032, 6, 5), skin, [.2, .15, .12]);
  limb(body, [-.1, .04, .03], [-.15, -.06, .08], .025, skin); part(body, sphere(.03, 6, 5), skin, [-.15, -.07, .08]);
  for (const s of [-1, 1]) { limb(body, [.05 * s, -.1, 0], [.07 * s, -.22, .03], .022, skin); part(body, sphere(.03, 6, 5), dark, [.07 * s, -.24, .05], { scale: [1, .6, 1.4] }); }
  const flame = new THREE.Group(); flame.position.set(.2, .25, .13); body.add(flame);
  part(flame, new THREE.ConeGeometry(.06, .17, 7), lit(U), [0, 0, 0]); part(flame, new THREE.ConeGeometry(.03, .09, 6), lit(0xe6d4ff), [0, -.03, .01]);
  const fire = glow(U, .45, .7); flame.add(fire);
  const tail = [0, 1, 2, 3, 4].map(() => part(body, sphere(.02, 5, 4), skin, [0, 0, 0]));
  const spade = part(body, new THREE.OctahedronGeometry(.045), dark, [0, 0, 0], { scale: [1, 1, .4] });
  return { group: g, shadow: .5, idle: t => {
    float.position.y = Math.sin(t * 2.6) * .06; head.rotation.z = Math.sin(t * 1.1) * .12;
    wings.forEach(({ w, s }) => { w.rotation.y = s * (.2 + Math.sin(t * 12) * .45); });
    flame.scale.set(1, .8 + Math.sin(t * 15) * .2, 1); fire.material.opacity = .55 + Math.sin(t * 9) * .12; hex.rotation.y = t * .3;
    tail.forEach((m, i) => { const k = (i + 1) / 5; m.position.set(Math.sin(t * 2 + k * 3) * .08 * k, -.08 - k * .2, -.08 - Math.sin(k * 2.2) * .12); });
    spade.position.set(Math.sin(t * 2 + 3.6) * .09, -.3, -.12); spade.rotation.z = Math.sin(t * 2) * .3; blink(eyes, t, 3.5);
  } };
}

/** Burning floor, Frost (an elite): a small dragon with ice crystals for horns and spines, on little wings; breathes rime. */
function rimeDrakeling(): Built {
  const F = SCHOOL_LIGHT.frost, g = new THREE.Group(), scaleM = std(0x8ab8d8), belly = std(0xdceaf2), wingM = std(0x5a86b0, { side: THREE.DoubleSide }), bone = std(0x3a5a7a), ice = lit(F), body = new THREE.Group(); g.add(body);
  const ground = circle(g, F, .62);
  part(body, sphere(.22, 12, 10), scaleM, [0, .3, -.04], { scale: [.95, .95, 1.15] });
  part(body, sphere(.15, 10, 8), belly, [0, .28, .1], { scale: [1, 1.15, .7] });
  limb(body, [0, .42, .06], [0, .58, .16], .09, scaleM, .1);
  const head = new THREE.Group(); head.position.set(0, .66, .2); body.add(head);
  part(head, sphere(.15, 12, 10), scaleM, [0, 0, 0], { scale: [1.05, .95, 1.05] });
  part(head, sphere(.1, 10, 8), scaleM, [0, -.04, .13], { scale: [1, .75, 1.1] });
  for (const s of [-1, 1]) {
    part(head, sphere(.014, 5, 4), lit(0x1a2a3a), [.035 * s, -.01, .235]);
    crystal(head, F, [.08 * s, .13, -.08], .17, [-.8, 0, -.3 * s], ice); crystal(head, F, [.14 * s, .02, -.05], .09, [-.3, 0, -1.2 * s], ice);
  }
  const eyes = bigEyes(head, .075, .04, .1, .056, 0x10283a);
  smile(head, [0, -.07, .2], .045, 0x1a2a3a, -.4);
  for (const [y, z, h] of [[.52, -.06, .12], [.49, -.17, .1], [.42, -.28, .09]]) crystal(body, F, [0, y, z], h, [-.4, 0, 0], ice);
  const wings = [-1, 1].map(s => {
    const w = new THREE.Group(); w.position.set(.14 * s, .44, -.1); body.add(w);
    limb(w, [0, 0, 0], [.3 * s, .2, -.1], .018, bone); crystal(w, F, [.31 * s, .22, -.1], .06, [0, 0, -s], ice);
    part(w, sphere(.2, 10, 6), wingM, [.17 * s, .05, -.06], { scale: [1, .7, .06], rot: [0, s * .3, 0] });
    return { w, s };
  });
  for (const s of [-1, 1]) {
    limb(body, [.1 * s, .22, .12], [.12 * s, .03, .18], .04, scaleM); part(body, sphere(.05, 6, 5), belly, [.12 * s, .02, .21], { scale: [1.1, .5, 1.2] });
    part(body, sphere(.12, 8, 6), scaleM, [.16 * s, .16, -.12], { scale: [.8, 1, 1.2] }); part(body, sphere(.06, 6, 5), belly, [.17 * s, .025, -.02], { scale: [1.1, .45, 1.5] });
  }
  const tail = [0, 1, 2, 3, 4].map(i => part(body, sphere(.08 - i * .012, 8, 6), scaleM, [0, 0, 0]));
  const tailTip = crystal(body, F, [0, 0, 0], .12, [0, 0, 0], ice);
  const breath = [0, 1, 2, 3].map(() => part(head, sphere(.05, 7, 6), shine(F, .5), [0, 0, 0]));
  const snow = motes(g, 0xe8f6ff, 5, .5, .7, .014);
  return { group: g, shadow: .9, parts: { ground }, idle: t => {
    body.scale.set(1, 1 + Math.sin(t * 1.8) * .02, 1); head.rotation.set(Math.sin(t * 1.1) * .08, Math.sin(t * .7) * .25, Math.sin(t * .9) * .06);
    wings.forEach(({ w, s }) => { w.rotation.z = s * (.15 + Math.sin(t * 3) * .25); });
    tail.forEach((m, i) => { const k = i / 4; m.position.set(Math.sin(k * 2.2 + Math.sin(t * 1.5) * .4) * .22 * k, .12 - k * .08, -.26 - k * .22); });
    tailTip.position.set(Math.sin(2.4 + Math.sin(t * 1.5) * .4) * .26, .05, -.5); tailTip.rotation.set(-1.2, 0, 0);
    breath.forEach((b, i) => { const q = (t * .35 + i * .05) % 1; b.visible = q < .35; const k = q / .35; b.position.set((i - 1.5) * .03 * k, -.05 + k * .05, .24 + k * .5); b.scale.setScalar(.3 + k * 1.4); (b.material as THREE.MeshBasicMaterial).opacity = .5 * (1 - k); });
    snow(t, .6); blink(eyes, t, 3.9);
  } };
}

/** The options, by floor (names and notes in STR.options): four in the crypt, three drowned, three burning. */
/* ---------- floor 4, the Gilded Reliquary (M4.1) ---------- */

/** Reliquary, Ember: a round little mouse with a stub of candle burning on its back. */
function wickmouse(): Built {
  const E = SCHOOL_LIGHT.ember, g = new THREE.Group(), fur = std(0x8a7a6c), belly = std(0xcdbba4), pink = std(0xd89a92), waxM = std(0xf2e6cc), body = new THREE.Group(); g.add(body);
  part(body, sphere(.17, 12, 10), fur, [0, .16, -.02], { scale: [1, .85, 1.25] });
  part(body, sphere(.1, 10, 8), belly, [0, .12, .1], { scale: [1.1, .8, .9] });
  const head = new THREE.Group(); head.position.set(0, .22, .2); body.add(head);
  part(head, sphere(.11, 10, 8), fur, [0, 0, 0], { scale: [1, .9, 1.1] });
  part(head, sphere(.035, 6, 5), pink, [0, -.02, .12]); // (the nose)
  for (const s of [-1, 1]) { part(head, sphere(.075, 10, 8), fur, [.1 * s, .09, -.03], { scale: [1, 1, .35] }); part(head, sphere(.05, 8, 6), pink, [.1 * s, .09, -.01], { scale: [1, 1, .3] }); }
  const eyes = bigEyes(head, .05, .03, .08, .042);
  for (const s of [-1, 1]) for (const z of [.1, -.1]) part(body, sphere(.035, 6, 4), belly, [.09 * s, .02, z], { scale: [1, .6, 1.4] }); // (paws)
  const tail = new THREE.Group(); tail.position.set(0, .12, -.22); body.add(tail);
  limb(tail, [0, 0, 0], [0, .06, -.14], .016, pink, .01); limb(tail, [0, .06, -.14], [.04, .14, -.24], .01, pink, .006);
  // the candle on its back, stuck in a dab of wax, and its flame
  part(body, sphere(.05, 8, 5), waxM, [0, .3, -.05], { scale: [1.3, .5, 1.3] });
  part(body, new THREE.CylinderGeometry(.03, .034, .14, 7), waxM, [0, .38, -.05]);
  const flame = new THREE.Group(); flame.position.set(0, .47, -.05); body.add(flame);
  part(flame, new THREE.ConeGeometry(.03, .09, 6), lit(E), [0, .02, 0]); part(flame, sphere(.018, 5, 4), lit(0xfff0c0), [0, -.005, 0]);
  const halo = glow(E, .6, .6); flame.add(halo);
  return { group: g, shadow: .45, parts: { flame }, idle: t => {
    body.position.y = Math.abs(Math.sin(t * 9)) * .02; head.rotation.y = Math.sin(t * 2.3) * .25; tail.rotation.y = Math.sin(t * 5) * .5;
    flame.scale.set(1, .85 + Math.sin(t * 17) * .15, 1); halo.material.opacity = .5 + Math.sin(t * 13) * .1; blink(eyes, t, 3.3);
  } };
}

/** Reliquary, Storm: a round bat with great ears, a little bronze bell at its throat that rings for the lightning. */
function chimeBat(): Built {
  const S = SCHOOL_LIGHT.storm, g = new THREE.Group(), fur = std(0x4a3e58), furLight = std(0x6a5a7a), wingM = std(0x2e2638), bronze = std(0xb08a40, { roughness: .45, metalness: .5 }), body = new THREE.Group(); body.position.y = .95; g.add(body);
  part(body, sphere(.17, 12, 10), fur, [0, 0, 0]);
  part(body, sphere(.11, 10, 8), furLight, [0, -.05, .09], { scale: [1, .9, .7] });
  for (const s of [-1, 1]) { part(body, new THREE.ConeGeometry(.07, .2, 6), fur, [.1 * s, .18, 0], { rot: [0, 0, -s * .35] }); part(body, new THREE.ConeGeometry(.04, .13, 5), std(0xa87a8a), [.1 * s, .17, .02], { rot: [0, 0, -s * .35] }); }
  const eyes = bigEyes(body, .065, .04, .13, .055);
  for (const s of [-1, 1]) part(body, new THREE.ConeGeometry(.012, .035, 4), std(0xf4f0e6), [.03 * s, -.06, .15], { rot: [Math.PI, 0, 0] }); // (two little fangs)
  const wings = [-1, 1].map(s => {
    const w = new THREE.Group(); w.position.set(.14 * s, .02, -.02); body.add(w);
    part(w, new THREE.ConeGeometry(.2, .42, 3), wingM, [.2 * s, -.02, 0], { rot: [0, 0, -s * Math.PI / 2], scale: [1, 1, .12] });
    limb(w, [0, 0, 0], [.38 * s, .06, 0], .012, fur);
    return w;
  });
  // the bell at its throat on a cord, a storm light at its clapper
  const bell = new THREE.Group(); bell.position.set(0, -.14, .1); body.add(bell);
  part(bell, new THREE.CylinderGeometry(.035, .06, .08, 10, 1, true), bronze, [0, -.04, 0]); part(bell, sphere(.036, 8, 6), bronze, [0, 0, 0], { scale: [1, .6, 1] });
  part(bell, sphere(.018, 6, 4), lit(S), [0, -.08, 0]);
  const spark = glow(S, .45, .5); spark.position.y = -.08; bell.add(spark);
  return { group: g, shadow: .5, parts: { bell }, idle: t => {
    const f = Math.sin(t * 16); wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * f * .6; });
    body.position.y = .95 + Math.sin(t * 16) * .03 + Math.sin(t * 2) * .05; blink(eyes, t, 3.7);
    bell.rotation.z = Math.sin(t * 5) * .15; spark.material.opacity = .4 + Math.max(0, Math.sin(t * 9)) * .3;
  } };
}

/** Reliquary, Frost: a round stone gargoyle pup, stubby wings folded, little horns; its eyes wake frost-blue. */
function gargoyleWhelp(): Built {
  const F = SCHOOL_LIGHT.frost, g = new THREE.Group(), stone = std(0x8a8680, { roughness: .95 }), stoneDark = std(0x5e5a56), body = new THREE.Group(); g.add(body);
  part(body, sphere(.24, 12, 10), stone, [0, .24, -.02], { scale: [1, .9, 1.05] });
  const head = new THREE.Group(); head.position.set(0, .44, .12); body.add(head);
  part(head, sphere(.17, 12, 10), stone, [0, 0, 0], { scale: [1.1, .95, 1] });
  part(head, sphere(.08, 8, 6), stoneDark, [0, -.06, .13], { scale: [1.2, .7, .8] }); // (the snout)
  for (const s of [-1, 1]) { part(head, new THREE.ConeGeometry(.035, .14, 5), stoneDark, [.1 * s, .15, -.02], { rot: [-.4, 0, -s * .5] }); part(head, new THREE.ConeGeometry(.05, .12, 4), stone, [.17 * s, .06, -.02], { rot: [0, 0, -s * 1.3] }); }
  const eyes = bigEyes(head, .075, .03, .12, .055, 0x16283a);
  const shine = glow(F, .7, 0); shine.position.set(0, .03, .16); head.add(shine);
  for (const s of [-1, 1]) for (const z of [.14, -.12]) part(body, sphere(.06, 7, 5), stoneDark, [.13 * s, .04, z], { scale: [1, .6, 1.3] }); // (claws)
  const wings = [-1, 1].map(s => {
    const w = new THREE.Group(); w.position.set(.16 * s, .34, -.12); body.add(w);
    part(w, new THREE.ConeGeometry(.14, .3, 3), stoneDark, [.08 * s, .06, -.02], { rot: [.4, 0, -s * .8], scale: [1, 1, .2] });
    return w;
  });
  part(body, new THREE.ConeGeometry(.04, .24, 5), stoneDark, [0, .1, -.3], { rot: [-1.9, 0, 0] });
  for (let i = 0; i < 3; i++) crystal(body, F, [(i - 1) * .08, .45, -.1 - Math.abs(i - 1) * .04], .09, [-.4, 0, (i - 1) * .3]); // (rime crystals on its back)
  return { group: g, shadow: .6, parts: { head, shine, wings: wings[0], wings2: wings[1], eyeL: eyes[0], eyeR: eyes[1] }, idle: t => {
    head.rotation.y = Math.sin(t * .9) * .15; blink(eyes, t, 4.4);
  } };
}

/** Reliquary, Hallow: a white fawn, gold-dappled, with glowing nubs of antler; it heals what fights beside it. */
function moonstagFawn(): Built {
  const H = SCHOOL_LIGHT.hallow, g = new THREE.Group(), coat = std(0xf0e8da), dapple = lit(0xe6c880), hoof = std(0x6a5a4a), muzzle = std(0xc8b8a0), body = new THREE.Group(); g.add(body);
  part(body, sphere(.2, 12, 10), coat, [0, .42, -.04], { scale: [.85, .8, 1.3] });
  for (const [x, y, z] of [[.1, .5, 0], [-.12, .47, -.1], [.08, .45, -.18], [-.05, .54, .08], [.13, .42, -.1]] as V3[]) part(body, sphere(.025, 5, 4), dapple, [x, y, z]);
  const legs = new THREE.Group(); body.add(legs);
  for (const [x, z] of [[-.09, .14], [.09, .14], [-.09, -.2], [.09, -.2]] as [number, number][]) { const l = new THREE.Group(); l.position.set(x, .34, z); legs.add(l); limb(l, [0, 0, 0], [0, -.3, 0], .03, coat, .022); part(l, new THREE.CylinderGeometry(.022, .028, .04, 6), hoof, [0, -.32, 0]); }
  const head = new THREE.Group(); head.position.set(0, .66, .22); body.add(head);
  limb(body, [0, .5, .12], [0, .64, .2], .07, coat, .06);
  part(head, sphere(.13, 12, 10), coat, [0, 0, 0], { scale: [.9, .95, 1.1] });
  part(head, sphere(.065, 8, 6), muzzle, [0, -.05, .11]);
  part(head, sphere(.018, 5, 4), std(0x2a2020), [0, -.035, .17]);
  for (const s of [-1, 1]) part(head, new THREE.ConeGeometry(.045, .14, 6), coat, [.13 * s, .06, -.02], { rot: [0, 0, -s * 1.1], scale: [1, 1, .45] });
  const eyes = bigEyes(head, .07, .025, .08, .05, 0x2a1a10, .3);
  const antlers = new THREE.Group(); antlers.position.set(0, .12, -.02); head.add(antlers);
  for (const s of [-1, 1]) { limb(antlers, [.04 * s, 0, 0], [.07 * s, .07, -.01], .014, std(0xe8d4a4)); part(antlers, sphere(.018, 6, 4), lit(H), [.07 * s, .08, -.01]); }
  const aura = glow(H, .9, .35); aura.position.y = .1; antlers.add(aura);
  part(body, new THREE.ConeGeometry(.04, .09, 5), coat, [0, .5, -.3], { rot: [-2, 0, 0] });
  return { group: g, shadow: .5, parts: { head, aura, legs }, idle: t => {
    head.rotation.x = Math.sin(t * 1.3) * .08; aura.material.opacity = .3 + Math.sin(t * 2.4) * .08; blink(eyes, t, 4);
  } };
}

/* ---------- floor 5, the Ferryman's Shore (M4.1) ---------- */

/** Shore, Umbral: a seed-bulb on little root feet, a sprout on its head with violet-lit leaves; it burrows. */
function rootling(): Built {
  const U = SCHOOL_LIGHT.umbral, g = new THREE.Group(), bark = std(0x6a5038), barkDark = std(0x3e2e22), leafM = std(0x3e6a44), soil = std(0x2a2420), body = new THREE.Group(); g.add(body);
  part(body, sphere(.2, 12, 10), bark, [0, .24, 0], { scale: [1, 1.05, .95] });
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; part(body, new THREE.BoxGeometry(.012, .3, .012), barkDark, [Math.cos(a) * .17, .26, Math.sin(a) * .17], { rot: [0, -a, .1] }); } // (the bulb's ribs)
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .4; limb(body, [Math.cos(a) * .12, .08, Math.sin(a) * .12], [Math.cos(a) * .22, 0, Math.sin(a) * .22], .025, barkDark, .012); } // (root feet)
  const eyes = bigEyes(body, .07, .28, .15, .055);
  smile(body, [0, .19, .18], .025);
  const sprout = new THREE.Group(); sprout.position.y = .44; body.add(sprout);
  limb(sprout, [0, 0, 0], [0, .12, 0], .018, leafM, .012);
  for (const s of [-1, 1]) { part(sprout, sphere(.07, 8, 6), leafM, [.07 * s, .13, 0], { scale: [1.3, .35, .7], rot: [0, 0, s * .5] }); part(sprout, sphere(.018, 5, 4), lit(U), [.1 * s, .15, .02]); }
  const shine = glow(U, .6, .4); shine.position.y = .15; sprout.add(shine);
  const mound = new THREE.Group(); g.add(mound);
  part(mound, sphere(.3, 10, 6, ), soil, [0, 0, 0], { scale: [1, .28, 1] });
  for (let i = 0; i < 5; i++) { const a = i * 1.3; part(mound, sphere(.07, 6, 4), soil, [Math.cos(a) * .24, .03, Math.sin(a) * .24], { scale: [1, .5, 1] }); }
  mound.visible = false;
  return { group: g, shadow: .5, parts: { body, mound }, idle: t => {
    body.position.y = Math.abs(Math.sin(t * 6)) * .025; sprout.rotation.z = Math.sin(t * 2.2) * .15; shine.material.opacity = .35 + Math.sin(t * 3) * .1; blink(eyes, t, 3.6);
  } };
}

/** Shore, Storm: a small manta of storm-cloud grey gliding over the room, yellow sparks along its wings, a spark at its tail. */
function stormRay(): Built {
  const S = SCHOOL_LIGHT.storm, g = new THREE.Group(), skin = std(0x5a6272), belly = std(0xa8b0bc), body = new THREE.Group(); body.position.y = 1.05; g.add(body);
  part(body, sphere(.2, 12, 8), skin, [0, 0, 0], { scale: [1, .45, 1.1] });
  part(body, sphere(.16, 10, 6), belly, [0, -.03, .02], { scale: [1, .35, 1] });
  const wings = [-1, 1].map(s => {
    const w = new THREE.Group(); w.position.set(.16 * s, 0, 0); body.add(w);
    part(w, sphere(.2, 10, 6), skin, [.2 * s, 0, -.02], { scale: [1.4, .18, .9] });
    for (let i = 0; i < 3; i++) part(w, sphere(.022, 5, 4), lit(S), [(.12 + i * .1) * s, .04, .05 - i * .04]);
    return w;
  });
  const eyes = bigEyes(body, .08, .05, .18, .05);
  const tail = new THREE.Group(); tail.position.set(0, 0, -.2); body.add(tail);
  limb(tail, [0, 0, 0], [0, -.02, -.45], .02, skin, .006);
  part(tail, sphere(.03, 6, 4), lit(S), [0, -.02, -.47]);
  const spark = glow(S, .45, .6); spark.position.set(0, -.02, -.47); tail.add(spark);
  return { group: g, shadow: .6, idle: t => {
    wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(t * 3.2) * .35; }); body.position.y = 1.05 + Math.sin(t * 1.6) * .06;
    tail.rotation.y = Math.sin(t * 2.4) * .3; spark.material.opacity = .4 + Math.max(0, Math.sin(t * 11)) * .4; blink(eyes, t, 4.1);
  } };
}

/** Shore, Umbral: a little knot of the dark, a black orb in a spinning ring of violet light, with big eyes; it swallows bolts. */
function voidMote(): Built {
  const U = SCHOOL_LIGHT.umbral, g = new THREE.Group(), dark = std(0x120c1c, { roughness: .4 }), body = new THREE.Group(); body.position.y = .9; g.add(body);
  part(body, sphere(.2, 14, 10), dark, [0, 0, 0]);
  const ring = new THREE.Group(); body.add(ring); ring.rotation.x = 1.2;
  part(ring, new THREE.TorusGeometry(.3, .025, 5, 24), lit(U), [0, 0, 0]);
  part(ring, new THREE.TorusGeometry(.36, .01, 4, 24), shine(U, .6), [0, 0, 0]);
  const eyes = bigEyes(body, .075, .04, .16, .058, 0x4a2a7a);
  const core = glow(U, 1.1, .45); body.add(core);
  const specks = motes(body, U, 5, .45, 0, .02);
  return { group: g, shadow: .45, parts: { body }, idle: t => {
    ring.rotation.z = t * 2.2; body.position.y = .9 + Math.sin(t * 1.9) * .05; core.material.opacity = .35 + Math.sin(t * 4) * .1; specks(t, -1.2); blink(eyes, t, 3.9);
  } };
}

/** Shore, Frost (elite): a big round tortoise carrying a little shrine of candles on its shell, burning pale. */
function lanternTortoise(): Built {
  const F = SCHOOL_LIGHT.frost, g = new THREE.Group(), shellM = std(0x3e5048), plate = std(0x5e7068), skin = std(0x8a9a88), stone = std(0x9aa0a4), waxM = std(0xe8eef0), body = new THREE.Group(); g.add(body);
  part(body, new THREE.SphereGeometry(.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), shellM, [0, .16, 0], { scale: [1, .8, 1.1] });
  for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI * 2, r = i ? .3 : 0; part(body, new THREE.CylinderGeometry(.12, .13, .04, 6), plate, [Math.cos(a) * r, .5 - (i ? .1 : 0), Math.sin(a) * r * 1.1], { rot: [i ? (Math.sin(a) * .5) : 0, 0, i ? (-Math.cos(a) * .5) : 0] }); }
  part(body, new THREE.CylinderGeometry(.52, .52, .06, 16), plate, [0, .15, 0], { scale: [1, 1, 1.1] }); // (the shell's rim)
  const head = new THREE.Group(); head.position.set(0, .22, .56); body.add(head);
  part(head, sphere(.15, 10, 8), skin, [0, 0, .05], { scale: [1, .9, 1.15] });
  const eyes = bigEyes(head, .075, .05, .14, .05);
  const legs = new THREE.Group(); body.add(legs);
  for (const [x, z] of [[-.34, .3], [.34, .3], [-.34, -.3], [.34, -.3]] as [number, number][]) part(legs, sphere(.11, 8, 6), skin, [x, .06, z], { scale: [1, .7, 1.1] });
  // the shrine on its back: a little arch of stone, candles burning pale inside
  const shrine = new THREE.Group(); shrine.position.set(0, .5, -.02); body.add(shrine);
  for (const s of [-1, 1]) part(shrine, box(.05, .22, .05), stone, [.1 * s, .11, 0]);
  part(shrine, new THREE.TorusGeometry(.1, .025, 4, 10, Math.PI), stone, [0, .22, 0]);
  const flames: THREE.Mesh[] = [];
  for (const [x, h] of [[-.04, .08], [.035, .06]] as [number, number][]) { part(shrine, new THREE.CylinderGeometry(.018, .02, h, 6), waxM, [x, h / 2, 0]); flames.push(part(shrine, new THREE.ConeGeometry(.02, .06, 6), lit(F), [x, h + .03, 0])); }
  const light = glow(F, .9, .6); light.position.y = .12; shrine.add(light);
  return { group: g, shadow: 1, parts: { head, legs, light }, idle: t => {
    head.rotation.y = Math.sin(t * .8) * .2; head.position.y = .22 + Math.sin(t * 1.3) * .015; flames.forEach((f, i) => { f.scale.set(1, .8 + Math.sin(t * 12 + i * 2) * .2, 1); }); blink(eyes, t, 4.6);
  } };
}

/* ---------- the Wardlings (M4.2): what a drinking ward drank, let out ---------- */

/** Let out of a drinking ward (world/vault.ts, actors/wardShield.ts), one for each school: a round drop of liquid light in
    its school's colour with a bright core and big eyes, floating inside a turning ring of its runes, its school's crest on
    top: a flame, ice spikes, a crest of sparks, a halo, little horns, a sprout (M5's Verdant). */
function wardling(school: School): Built {
  const L = SCHOOL_LIGHT[school], g = new THREE.Group(), body = new THREE.Group(); body.position.y = .85; g.add(body);
  const drop = school === 'storm' ? 0x5a6ab8 : new THREE.Color(L).multiplyScalar(.7).getHex(); // (Storm's a thundercloud: its yellow is too near Hallow's gold)
  part(body, sphere(.25, 14, 10), std(drop, { emissive: school === 'storm' ? 0x2a3470 : L, emissiveIntensity: .35, roughness: .4 }), [0, 0, 0]); // the drop of light
  part(body, sphere(.06, 8, 6), shine(0xffffff, .55), [-.11, .12, .16]);                                                                              // a gleam on it
  const eyes = bigEyes(body, .085, .04, .2, .062);
  const ring = new THREE.Group(); ring.rotation.x = 1.25; body.add(ring);
  runeRing(ring, L, .4, [0, 0, 0], 5);
  const crest = new THREE.Group(); crest.position.y = .24; body.add(crest);
  const pale = lit(new THREE.Color(L).lerp(new THREE.Color(0xffffff), .45).getHex());
  if (school === 'ember') { part(crest, new THREE.ConeGeometry(.07, .22, 6), pale, [0, .1, 0]); for (const s of [-1, 1]) part(crest, new THREE.ConeGeometry(.045, .13, 5), lit(L), [.07 * s, .05, 0], { rot: [0, 0, -.4 * s] }); }
  else if (school === 'frost') for (const a of [-.5, 0, .5]) part(crest, new THREE.ConeGeometry(.035, .2, 4), pale, [Math.sin(a) * .1, .08, 0], { rot: [0, 0, -a] });
  else if (school === 'storm') for (const [x, y, r] of [[-.05, .06, .6], [.02, .1, -.6], [.06, .16, .6]] as V3[]) part(crest, box(.03, .1, .03), pale, [x, y, 0], { rot: [0, 0, r] });
  else if (school === 'hallow') part(crest, new THREE.TorusGeometry(.13, .018, 4, 18), pale, [0, .1, 0], { rot: [Math.PI / 2, 0, 0] });
  else if (school === 'verdant') for (const s of [-1, 1]) part(crest, sphere(.06, 6, 4), pale, [.06 * s, .08, 0], { rot: [0, 0, -.6 * s], scale: [.6, 1.6, .25] }); // (M5: a sprout of two leaves)
  else for (const s of [-1, 1]) part(crest, new THREE.ConeGeometry(.04, .16, 5), std(0x1a1024), [.1 * s, .02, 0], { rot: [0, 0, -.5 * s] });
  const specks = motes(body, L, 4, .42, 0, .02);
  const light = glow(L, 1.1, .5); body.add(light);
  return { group: g, shadow: .5, parts: { body, light }, idle: t => {
    ring.rotation.z = t * 1.6; body.position.y = .85 + Math.sin(t * 2.1) * .05; body.scale.setScalar(1); crest.rotation.y = Math.sin(t * 1.3) * .3; specks(t, 1.4); blink(eyes, t, 3.6);
  } };
}

export const MODEL_OPTIONS = [
  { id: 'sporeling', floor: 1, school: 'umbral', build: sporeling }, { id: 'vesperMoth', floor: 1, school: 'hallow', build: vesperMoth },
  { id: 'runeBeetle', floor: 1, school: 'storm', build: runeBeetle }, { id: 'urnMimic', floor: 1, school: 'ember', build: urnMimic },
  { id: 'mireToad', floor: 2, school: 'frost', build: mireToad }, { id: 'cisternLurker', floor: 2, school: 'storm', build: cisternLurker },
  { id: 'lanternJelly', floor: 2, school: 'hallow', build: lanternJelly },
  { id: 'cinderSalamander', floor: 3, school: 'ember', build: cinderSalamander }, { id: 'hexImp', floor: 3, school: 'umbral', build: hexImp },
  { id: 'rimeDrakeling', floor: 3, school: 'frost', build: rimeDrakeling },
  { id: 'wickmouse', floor: 4, school: 'ember', build: wickmouse }, { id: 'chimeBat', floor: 4, school: 'storm', build: chimeBat },
  { id: 'gargoyleWhelp', floor: 4, school: 'frost', build: gargoyleWhelp }, { id: 'moonstagFawn', floor: 4, school: 'hallow', build: moonstagFawn },
  { id: 'rootling', floor: 5, school: 'umbral', build: rootling }, { id: 'stormRay', floor: 5, school: 'storm', build: stormRay },
  { id: 'voidMote', floor: 5, school: 'umbral', build: voidMote }, { id: 'lanternTortoise', floor: 5, school: 'frost', build: lanternTortoise },
  // M4.2: the Wardlings, no floor's own (0): a drinking ward lets them out
  { id: 'wardEmber', floor: 0, school: 'ember', build: () => wardling('ember') }, { id: 'wardFrost', floor: 0, school: 'frost', build: () => wardling('frost') },
  { id: 'wardStorm', floor: 0, school: 'storm', build: () => wardling('storm') }, { id: 'wardHallow', floor: 0, school: 'hallow', build: () => wardling('hallow') },
  { id: 'wardUmbral', floor: 0, school: 'umbral', build: () => wardling('umbral') }, { id: 'wardVerdant', floor: 0, school: 'verdant', build: () => wardling('verdant') },
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
/** Stand the bosses built in code (bossLooks.ts: the Hollow Warden's three looks, M4, and the bosses of floors 4 and 5,
    M4.1; every one, or those in `only`) in a row ahead of world (x, z). */
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
/** Take the options shown in `room` away. */
export function removeModelOptions(room: Room) {
  for (let i = shown.length - 1; i >= 0; i--) if (shown[i].room === room) { room.group.remove(shown[i].group); disposeTree(shown[i].group); shown.splice(i, 1); }
}
/** A new floor: its rooms are gone, and the options with them. */
export function clearModelOptions() { shown.length = 0; }
