/* The floor-1 boss built in code (M4's boss, docs/M4-plan.md): three looks drawn up for the owner to choose from, in the
   style of the critters (modelOptions.ts): round, big-eyed, each with its school's light, and larger than the mage. The
   Hollow Warden's fight stays as it was (bosses.ts: it walks, winds up and bursts a ring of shots, fires aimed volleys,
   calls the floor's walkers below half health); a look gives it the parts that fight moves: `eye` (swells as it winds
   up), `ring` (turns, faster while winding), `halo` (brightens), and its school's light for its shots. Each stands on
   y = 0 facing +Z. Names and notes are placeholders in STR.bossLooks.

   Bell Warden (Storm): a great beetle whose shell is an old cracked bronze bell; it peers out from under the rim with two
     lamp-bright eyes, runes crackling on the bronze; the bell tolls its rings of shots.
   Mother of Spores (Umbral): a mushroom as tall as a door, her wide cap spotted with violet light, a round pale face under
     it, little mushrooms at her feet; the Sporelings she calls are her young.
   Hollow Owl (Hallow): a round barn owl the size of a wardrobe, a heart-shaped pale face with great golden eyes, a crown of
     candles on her head and wings folded like a cloak. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { lay, neck, spiral, type P3 } from './dragonPath';
import { SCHOOL_LIGHT, bigEyes, box, circle, limb, lit, motes, part, rune, runeRing, sphere, std, type School, type V3 } from '../render/arcane';
import { gloss, joint, jointed, slitEyes, spike, thin, tube } from './beastParts';
import { curve } from '../world/kitParts';
import { EMBER_FIRE, makeFire, makeMotes, type FlameSpec } from '../render/fire';
import { serpentHeadOld, serpentLook } from './serpentLooks';
import { dressedBoss } from './fantasyBosses';

/** A built boss look: its group, how it idles, its shadow, the parts the fight moves (the Warden's three, and any a
    boss's own fight moves besides) and its school. */
export interface BossBuilt { group: THREE.Group; idle: (t: number) => void; shadow: number; parts: { eye: THREE.Object3D; ring: THREE.Object3D; halo: THREE.Sprite } & Record<string, THREE.Object3D>; school: School; key?: string }

const blink = (list: THREE.Object3D[], t: number, every = 3.6) => { const k = t % every; for (const e of list) e.scale.y = k < .14 ? .12 : 1; };
const smile = (parent: THREE.Object3D, at: V3, r: number, color = 0x2a1418) => part(parent, new THREE.TorusGeometry(r, r * .14, 4, 12, Math.PI), lit(color), at, { rot: [0, 0, Math.PI] });
/** The ring of runes behind its head that the fight turns (in its own plane, facing the camera, tipped back a little; in
    its school's colour, not added light, which the halo behind it would wash to white). */
function haloRing(g: THREE.Object3D, color: number, radius: number, y: number, z = -.35) {
  const ring = new THREE.Group(); ring.position.set(0, y, z); ring.rotation.x = -.35; g.add(ring);
  runeRing(ring, color, radius, [0, 0, 0], 8, [Math.PI / 2, 0, 0], lit(color, .9));
  return ring;
}

/** A bronze bell for a shell, a beetle under it. */
function bellWarden(): BossBuilt {
  const S = SCHOOL_LIGHT.storm, g = new THREE.Group(), bronze = std(0x9a6a32, { roughness: .45, metalness: .55 }), verd = std(0x4f8a76, { roughness: .7 }), under = std(0x1c1a22), legM = std(0x151320), body = new THREE.Group(); g.add(body);
  // the bell: its outline turned from the lip up to the crown
  const bell = new THREE.Group(); bell.position.set(0, .42, -.12); bell.rotation.x = -.3; body.add(bell); // (tipped back: it peers out from under the lip)
  const profile = [[.98, 0], [.96, .1], [.84, .2], [.72, .45], [.66, .8], [.6, 1.05], [.44, 1.2], [.2, 1.27], [0, 1.28]].map(([x, y]) => new THREE.Vector2(x, y));
  part(bell, new THREE.LatheGeometry(profile, 20), bronze, [0, 0, 0]);
  part(bell, new THREE.TorusGeometry(.97, .05, 5, 28), bronze, [0, .03, 0], { rot: [Math.PI / 2, 0, 0] });
  for (const [y, r] of [[.24, .82], [.9, .63]] as [number, number][]) part(bell, new THREE.TorusGeometry(r, .025, 4, 26), verd, [0, y, 0], { rot: [Math.PI / 2, 0, 0] });
  // the crack, green with age, and runes crackling round the waist
  for (const [x, y, rz] of [[.35, .95, .5], [.44, .72, -.3], [.5, .52, .4]] as V3[]) part(bell, box(.03, .22, .03), lit(0x2a1a0a), [x, y, .54 + (1 - y) * .2], { rot: [0, .6, rz] });
  const runes = new THREE.Group(); bell.add(runes);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; rune(runes, S, [Math.sin(a) * .72, .5, Math.cos(a) * .72], .16, [0, a, 0]); }
  part(bell, new THREE.TorusGeometry(.12, .04, 5, 12), bronze, [0, 1.33, 0]); // (the crown, where a rope once hung)
  // under the rim: a dark body, two great eyes looking out, mandibles
  part(body, sphere(.7, 14, 10), under, [0, .45, 0], { scale: [1.2, .55, 1.1] });
  const eye = new THREE.Group(); eye.position.set(0, .4, .86); body.add(eye);
  const eyes = bigEyes(eye, .24, 0, 0, .15, 0x10141e);
  const lamp = glow(S, .9, .5); lamp.position.set(0, 0, .1); eye.add(lamp);
  for (const s of [-1, 1]) limb(body, [.25 * s, .22, .78], [.12 * s, .15, 1.02], .035, legM, .015);
  const legs = [-1, 1].flatMap(s => [.5, 0, -.5].map((z, i) => {
    const l = new THREE.Group(); l.position.set(.85 * s, .3, z); body.add(l);
    limb(l, [0, 0, 0], [.35 * s, -.05, 0], .06, legM); limb(l, [.35 * s, -.05, 0], [.45 * s, -.3, 0], .05, legM, .02);
    return { l, s, i };
  }));
  const ring = haloRing(g, S, .72, 2.05);
  const halo = glow(S, 3, .35); halo.position.set(0, 1.4, -.3); g.add(halo);
  const sparks = motes(g, S, 6, 1.1, .9, .03);
  return { group: g, shadow: 2.2, school: 'storm', parts: { eye, ring, halo }, idle: t => {
    legs.forEach(({ l, s, i }) => { l.rotation.y = Math.sin(t * 5 + i * 2) * .2 * s; });
    bell.rotation.z = Math.sin(t * 1.3) * .03; runes.visible = Math.floor(t * 7) % 5 !== 0; blink(eyes, t, 4.1); sparks(t, .9);
  } };
}

/** A mushroom as tall as a door. */
function motherOfSpores(): BossBuilt {
  const U = SCHOOL_LIGHT.umbral, g = new THREE.Group(), stem = std(0xeadfca), capM = std(0x5a2f7a), gill = std(0x2c1a3e), spotM = lit(U), body = new THREE.Group(); g.add(body);
  part(body, sphere(.55, 16, 12), stem, [0, .72, 0], { scale: [1, 1.35, .92] });
  for (const s of [-1, 1]) part(body, sphere(.2, 10, 8), stem, [.3 * s, .12, .1], { scale: [1, .55, 1.4] });
  for (const s of [-1, 1]) { limb(body, [.45 * s, .95, .1], [.72 * s, .7, .35], .08, stem, .06); part(body, sphere(.09, 8, 6), stem, [.74 * s, .68, .38]); }
  // (the cap high and not too wide, so the camera, looking down, still sees her face under it)
  const cap = new THREE.Group(); cap.position.y = 1.55; body.add(cap);
  part(cap, new THREE.SphereGeometry(.92, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), capM, [0, 0, 0], { scale: [1, .7, 1] });
  part(cap, new THREE.CircleGeometry(.92, 22), gill, [0, 0, 0], { rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 16; i++) { const th = .3 + (i % 4) * .28, ph = i * 2.4; part(cap, sphere(.065 + (i % 3) * .022, 7, 5), spotM, [.92 * Math.sin(th) * Math.cos(ph), .64 * Math.cos(th), .92 * Math.sin(th) * Math.sin(ph)]); }
  const eye = new THREE.Group(); eye.position.set(0, 1, .5); body.add(eye);
  const eyes = bigEyes(eye, .2, 0, 0, .16);
  smile(body, [0, .68, .5], .12);
  const glowUnder = glow(U, 2.6, .4); glowUnder.position.y = 1.35; body.add(glowUnder);
  // little mushrooms at her feet
  for (const [x, z, s] of [[-.7, .4, .5], [.8, .3, .4], [-.45, -.6, .45], [.6, -.55, .55]] as V3[]) {
    const m = new THREE.Group(); m.position.set(x, 0, z); m.scale.setScalar(s); g.add(m);
    part(m, sphere(.16, 8, 6), stem, [0, .2, 0], { scale: [1, 1.3, 1] });
    part(m, new THREE.SphereGeometry(.28, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), capM, [0, .38, 0], { scale: [1, .7, 1] });
    part(m, sphere(.05, 6, 4), spotM, [0, .57, 0]);
  }
  const ring = haloRing(g, U, .75, 2.5);
  const halo = glow(U, 3.2, .35); halo.position.set(0, 1.6, -.3); g.add(halo);
  const spores = motes(g, U, 8, 1.2, 1.6, .035);
  return { group: g, shadow: 2.3, school: 'umbral', parts: { eye, ring, halo }, idle: t => {
    const b = Math.sin(t * 1.6); body.scale.set(1 + b * .02, 1 - b * .025, 1 + b * .02); cap.rotation.z = Math.sin(t * 1.1) * .05;
    glowUnder.material.opacity = .35 + Math.sin(t * 2.2) * .1; blink(eyes, t, 3.8); spores(t, .6);
  } };
}

/** A round barn owl with a crown of candles. */
function hollowOwl(): BossBuilt {
  const H = SCHOOL_LIGHT.hallow, g = new THREE.Group(), plume = std(0x8a7a66), plumeDark = std(0x5e5244), face = std(0xf0e6d4), rim = std(0xb89a6a), wax = std(0xf0e2c6), body = new THREE.Group(); g.add(body);
  part(body, sphere(.8, 16, 12), plume, [0, .95, 0], { scale: [1, 1.15, .95] });
  part(body, sphere(.55, 14, 10), face, [0, .82, .36], { scale: [1, 1.1, .5] }); // (the breast, pale)
  for (let i = 0; i < 9; i++) part(body, new THREE.ConeGeometry(.06, .12, 4), plumeDark, [((i % 3) - 1) * .22, .95 - Math.floor(i / 3) * .2, .6], { rot: [Math.PI / 2 + .3, 0, 0] }); // (speckles)
  const wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.set(.7 * s, 1, -.05); body.add(w); part(w, sphere(.55, 12, 10), plumeDark, [.05 * s, -.1, 0], { scale: [.35, 1.1, .85] }); return { w, s }; });
  const head = new THREE.Group(); head.position.y = 1.85; body.add(head);
  part(head, sphere(.62, 16, 12), plume, [0, 0, 0], { scale: [1.15, .9, 1] });
  part(head, new THREE.SphereGeometry(.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), face, [0, -.02, .28], { rot: [Math.PI / 2, 0, 0], scale: [1.1, .45, 1] });
  part(head, new THREE.TorusGeometry(.5, .04, 5, 24), rim, [0, -.02, .5], { scale: [1.1, 1, 1] });
  const eye = new THREE.Group(); eye.position.set(0, .02, .55); head.add(eye);
  const eyes = bigEyes(eye, .2, 0, 0, .15, 0x2a1a08);
  part(head, new THREE.ConeGeometry(.06, .14, 5), std(0xc8a040), [0, -.18, .62], { rot: [Math.PI, 0, 0] });
  for (const s of [-1, 1]) part(head, new THREE.ConeGeometry(.12, .3, 5), plumeDark, [.45 * s, .45, -.05], { rot: [0, 0, -s * .5] }); // (ear tufts)
  // the crown of candles, their flames her school's light
  const crown = new THREE.Group(); crown.position.y = .5; head.add(crown);
  const flames: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) { const a = (i - 2) * .38, x = Math.sin(a) * .35, z = -Math.cos(a) * .1; const h = .16 + (i % 2) * .07; part(crown, new THREE.CylinderGeometry(.04, .045, h, 7), wax, [x, h / 2, z]); flames.push(part(crown, new THREE.ConeGeometry(.035, .1, 6), lit(H), [x, h + .05, z])); }
  const candleGlow = glow(H, 1.2, .55); candleGlow.position.y = .3; crown.add(candleGlow);
  for (const s of [-1, 1]) part(body, sphere(.14, 8, 6), std(0xc8a040), [.25 * s, .06, .3], { scale: [1.3, .45, 1.2] }); // (talons)
  circle(g, H, 1.25);
  const ring = haloRing(g, H, .75, 2.75);
  const halo = glow(H, 3, .35); halo.position.set(0, 2, -.3); g.add(halo);
  const dust = motes(g, H, 6, 1, 1.6, .03);
  return { group: g, shadow: 2, school: 'hallow', parts: { eye, ring, halo }, idle: t => {
    head.rotation.y = Math.sin(t * .6) * .25; head.rotation.z = Math.sin(t * .9) * .06;
    wings.forEach(({ w, s }) => { w.rotation.z = s * (.05 + Math.max(0, Math.sin(t * 1.4)) * .08); });
    flames.forEach((f, i) => { f.scale.set(1, .8 + Math.sin(t * 13 + i * 2) * .2, 1); }); candleGlow.material.opacity = .5 + Math.sin(t * 9) * .08;
    blink(eyes, t, 4.4); dust(t, .5);
  } };
}

/** The Hallowed Hart (M4.1, floor 4's boss, Hallow): a great white stag with candles burning in its antlers. Its fight
    (bosses.ts) moves its legs as it trots and charges, its head as it lowers its antlers, and its body as it rears. */
function hartOld(): BossBuilt {
  const H = SCHOOL_LIGHT.hallow, g = new THREE.Group(), coat = std(0xeee6d6), shade = std(0xcdbfa6), hoof = std(0x3a2e24), horn = std(0xe8d4a4, { roughness: .6, metalness: .15 }), wax = std(0xf6ecd6), muzzle = std(0xb8a88e), nose = std(0x2a2020);
  const body = new THREE.Group(); g.add(body);
  part(body, sphere(.75, 16, 12), coat, [0, 1.05, -.05], { scale: [.72, .62, 1.05] });
  part(body, sphere(.5, 12, 10), shade, [0, 1.1, .55], { scale: [.9, .95, .7] }); // (the chest, a shade darker)
  for (let i = 0; i < 5; i++) part(body, sphere(.13, 8, 6), coat, [(i - 2) * .12, 1.28 - Math.abs(i - 2) * .05, .9 - Math.abs(i - 2) * .06], { scale: [1, .8, .7] }); // (a soft ruff at the throat)
  // four legs, each a pivot at the hip: a slim leg and a dark hoof
  const legs = new THREE.Group(); body.add(legs);
  for (const [x, z] of [[-.27, .45], [.27, .45], [-.27, -.55], [.27, -.55]] as [number, number][]) {
    const l = new THREE.Group(); l.position.set(x, .82, z); legs.add(l);
    limb(l, [0, 0, 0], [0, -.42, .03], .09, coat, .065); limb(l, [0, -.42, .03], [0, -.72, -.02], .06, coat, .045);
    part(l, new THREE.CylinderGeometry(.055, .07, .1, 7), hoof, [0, -.77, -.02]);
  }
  limb(body, [0, 1.3, .6], [0, 1.8, .86], .2, coat, .15); // (the neck)
  const head = new THREE.Group(); head.position.set(0, 1.94, .9); body.add(head);
  part(head, sphere(.3, 14, 10), coat, [0, 0, 0], { scale: [.9, .9, 1.1] });
  part(head, sphere(.17, 10, 8), muzzle, [0, -.1, .3], { scale: [1, .85, 1.1] });
  part(head, sphere(.05, 6, 5), nose, [0, -.06, .47]);
  const ears = [-1, 1].map(s => { const ear = new THREE.Group(); ear.position.set(.26 * s, .12, -.05); head.add(ear); part(ear, new THREE.ConeGeometry(.08, .26, 6), shade, [.08 * s, 0, 0], { rot: [0, 0, -s * 1.2], scale: [1, 1, .5] }); return ear; });
  const eye = new THREE.Group(); eye.position.set(0, .07, .2); head.add(eye);
  const eyes = bigEyes(eye, .16, 0, 0, .11, 0x2a1a10, .35);
  // the antlers: a beam each side and its tines, a candle burning on every tip in its school's light
  const antlers = new THREE.Group(); antlers.position.set(0, .2, -.05); head.add(antlers);
  const flames: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const beam: V3[] = [[.12 * s, 0, 0], [.34 * s, .3, -.05], [.48 * s, .62, -.12], [.52 * s, .92, -.05]];
    for (let i = 0; i < 3; i++) limb(antlers, beam[i], beam[i + 1], .045 - i * .008, horn, .04 - i * .008);
    const tines: [V3, V3][] = [[beam[1], [.62 * s, .5, .1]], [beam[2], [.28 * s, .78, .02]], [beam[2], [.74 * s, .84, -.1]], [beam[3], beam[3]]];
    for (const [from, tip] of tines) {
      if (from !== tip) limb(antlers, from, tip, .03, horn, .022);
      part(antlers, new THREE.CylinderGeometry(.028, .03, .12, 6), wax, [tip[0], tip[1] + .06, tip[2]]);
      flames.push(part(antlers, new THREE.ConeGeometry(.032, .1, 6), lit(H), [tip[0], tip[1] + .17, tip[2]]));
    }
  }
  const candleGlow = glow(H, 1.8, .5); candleGlow.position.set(0, .8, -.05); antlers.add(candleGlow);
  const tail = new THREE.Group(); tail.position.set(0, 1.22, -.82); body.add(tail);
  part(tail, new THREE.ConeGeometry(.1, .24, 6), coat, [0, 0, -.06], { rot: [-2.2, 0, 0] });
  circle(g, H, 1.45);
  const ring = haloRing(g, H, .9, 2.6, .5);
  const halo = glow(H, 3.4, .35); halo.position.set(0, 2.2, 0); g.add(halo);
  const dust = motes(g, H, 7, 1.3, 1.5, .03);
  return { group: g, shadow: 2.4, school: 'hallow', parts: { eye, ring, halo, body, head, antlers, legs }, idle: t => {
    head.position.y = 1.94 + Math.sin(t * 1.4) * .025; ears.forEach((e, i) => { e.rotation.x = Math.max(0, Math.sin(t * 2.3 + i * 2) - .8) * 2; });
    tail.rotation.x = Math.sin(t * 5) * .15; flames.forEach((f, i) => { f.scale.set(1, .8 + Math.sin(t * 13 + i * 1.7) * .2, 1); });
    candleGlow.material.opacity = .45 + Math.sin(t * 8) * .07; blink(eyes, t, 4.2); dust(t, .45);
  } };
}

/** The Deep Angler (M4.1, floor 5's boss, Umbral): a great round anglerfish afloat in the mist, needle-toothed, its lure
    a lamp of cold light on a stalk. Its fight moves its jaw as it draws the mage in and bites, and swells its lure. */
function anglerOld(): BossBuilt {
  const U = SCHOOL_LIGHT.umbral, TEAL = 0x7fe8e0, g = new THREE.Group(), skin = std(0x252c44, { roughness: .6 }), belly = std(0x3e4462), finM = std(0x302a50), mouthM = lit(0x2a0a22), tooth = std(0xece6f4, { roughness: .4 }), stalkM = std(0x1c2032);
  const body = new THREE.Group(); body.position.y = 1.25; g.add(body);
  part(body, sphere(.95, 18, 14), skin, [0, 0, 0], { scale: [1, .88, 1] });
  part(body, sphere(.8, 14, 10), belly, [0, -.3, .12], { scale: [1, .66, .95] });
  for (let i = 0; i < 10; i++) { const s = i < 5 ? 1 : -1, a = -.7 + (i % 5) * .35; part(body, sphere(.035, 5, 4), lit(i % 2 ? U : TEAL), [s * .93 * Math.cos(a), -.18, .93 * Math.sin(a) * .6]); } // (lights along its flanks)
  // its mouth: a wide dark crescent with needle teeth above; the lower jaw opens
  part(body, new THREE.SphereGeometry(.6, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mouthM, [0, -.12, .52], { scale: [1.05, .5, .62] });
  for (let i = 0; i < 8; i++) { const a = (i / 7 - .5) * 2.2; part(body, new THREE.ConeGeometry(.04, .2, 5), tooth, [Math.sin(a) * .56, -.2, .62 + Math.cos(a) * .3], { rot: [Math.PI, 0, 0] }); }
  const jaw = new THREE.Group(); jaw.position.set(0, -.3, .2); body.add(jaw);
  part(jaw, new THREE.SphereGeometry(.64, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skin, [0, .02, .35], { scale: [1.04, .55, .75] });
  for (let i = 0; i < 9; i++) { const a = (i / 8 - .5) * 2.3; part(jaw, new THREE.ConeGeometry(.045, .22, 5), tooth, [Math.sin(a) * .6, .08, .35 + Math.cos(a) * .42]); }
  const eye = new THREE.Group(); eye.position.set(0, .32, .7); body.add(eye);
  const eyes = bigEyes(eye, .36, 0, 0, .19, 0x0a0a16, .3);
  // the lure: a stalk curving up and forward from its brow, a lamp of cold light at its end
  const stalk = new THREE.Group(); stalk.position.set(0, .78, .25); body.add(stalk);
  limb(stalk, [0, 0, 0], [0, .55, .25], .04, stalkM, .03); limb(stalk, [0, .55, .25], [0, .72, .7], .03, stalkM, .025); limb(stalk, [0, .72, .7], [0, .55, 1.02], .025, stalkM, .02);
  const lure = new THREE.Group(); lure.position.set(0, .45, 1.08); stalk.add(lure);
  part(lure, sphere(.13, 12, 10), lit(0xeee4ff), [0, 0, 0]);
  const lureGlow = glow(U, 1.7, .6); lure.add(lureGlow);
  // fins: two at its sides that beat, spines along its back, a forked tail
  const fins = [-1, 1].map(s => { const f = new THREE.Group(); f.position.set(.88 * s, -.05, -.1); body.add(f); part(f, new THREE.ConeGeometry(.3, .6, 4), finM, [.22 * s, 0, 0], { rot: [0, 0, -s * Math.PI / 2], scale: [1, 1, .25] }); return f; });
  for (let i = 0; i < 4; i++) part(body, new THREE.ConeGeometry(.07, .36 - i * .05, 5), finM, [0, .82 - i * .08, -.2 - i * .22], { rot: [-.5, 0, 0] });
  const tail = new THREE.Group(); tail.position.set(0, 0, -.9); body.add(tail);
  for (const s of [-1, 1]) part(tail, new THREE.ConeGeometry(.24, .62, 4), finM, [0, .22 * s, -.26], { rot: [-Math.PI / 2 + s * .6, 0, 0], scale: [.3, 1, 1] });
  const ring = haloRing(g, U, .95, 2.55, -.6);
  const halo = glow(U, 3.6, .35); halo.position.set(0, 1.3, -.4); g.add(halo);
  const wisps = motes(g, TEAL, 8, 1.5, 1.2, .03);
  return { group: g, shadow: 2.5, school: 'umbral', parts: { eye, ring, halo, body, jaw, lure, lureGlow }, idle: t => {
    body.position.y = 1.25 + Math.sin(t * 1.3) * .08; fins.forEach((f, i) => { f.rotation.y = Math.sin(t * 4 + i * Math.PI) * .45; });
    tail.rotation.y = Math.sin(t * 2.2) * .3; stalk.rotation.x = Math.sin(t * 1.7) * .08; jaw.rotation.x = .06 + Math.sin(t * 1.1) * .05;
    blink(eyes, t, 5); wisps(t, .35);
  } };
}

/** The War-Tiger (M4.2, from the Eda lore; Frost): a great white-maned tiger with grey stripes, armoured in plates of
    bronze and stone: a pauldron on each shoulder, a slab of carved stone along its back and a bronze brow, each with a rune
    of frost cut in it. Its fight (bosses.ts) stands it still as a statue, moves its legs as it prowls and pounces, a
    forepaw as it swipes, its head and jaw as it roars; each plate is a part of its own (`plate0` to `plate3`) that a blast,
    a Shatter or enough blows knock off. */
function tigerOld(): BossBuilt {
  const F = SCHOOL_LIGHT.frost, g = new THREE.Group(), fur = std(0xebe5d8), pale = std(0xf8f4ec), stripe = std(0x4c4c58), nose = std(0x4a2c30), claw = std(0xd8d0c0);
  const bronze = std(0xae783c, { roughness: .4, metalness: .6 }), verd = std(0x5a9a86, { roughness: .7 }), stone = std(0x9c968a, { roughness: .95 }), stoneDark = std(0x6a665e), runeM = lit(F, .95);
  const body = new THREE.Group(); g.add(body);
  // long and low; the grey stripes run from the spine down each flank, tapering
  part(body, sphere(.7, 16, 12), fur, [0, .84, -.05], { scale: [.8, .62, 1.22] });
  part(body, sphere(.5, 12, 10), pale, [0, .66, .12], { scale: [.9, .5, 1.3] }); // (the pale underside)
  for (const dz of [-.62, -.36, -.1, .16]) for (const s of [-1, 1]) {
    const f = Math.sqrt(1 - (dz / .86) ** 2), pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 6; k++) { const a = Math.PI / 2 - s * (.2 + k * .17); pts.push(new THREE.Vector3(Math.cos(a) * .58 * f, .84 + Math.sin(a) * .45 * f, -.05 + dz + k * .015)); }
    part(body, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, .034, 4), stripe, [0, 0, 0]);
  }
  // four legs, each a pivot at the hip or shoulder: thick, striped, great paws (the fore ones clawed)
  const legs = new THREE.Group(); body.add(legs);
  for (const [x, z] of [[-.34, .5], [.34, .5], [-.32, -.58], [.32, -.58]] as [number, number][]) {
    const l = new THREE.Group(); l.position.set(x, .72, z); legs.add(l);
    limb(l, [0, 0, 0], [0, -.36, .04], .14, fur, .11); limb(l, [0, -.36, .04], [0, -.62, .02], .11, fur, .1);
    part(l, new THREE.TorusGeometry(.125, .026, 4, 12), stripe, [0, -.2, .02], { rot: [Math.PI / 2, 0, 0] });
    part(l, sphere(.13, 10, 8), pale, [0, -.64, .07], { scale: [1, .55, 1.3] });
    if (z > 0) for (let i = -1; i <= 1; i++) part(l, new THREE.ConeGeometry(.022, .08, 4), claw, [i * .055, -.66, .22], { rot: [Math.PI / 2, 0, 0] });
  }
  // the head: a broad face, a pale muzzle, round ears, big eyes of frost-pale blue, and a jaw that drops as it roars
  const head = new THREE.Group(); head.position.set(0, 1.1, .92); body.add(head);
  part(head, sphere(.38, 14, 12), fur, [0, 0, 0], { scale: [1.08, .92, 1] });
  part(head, sphere(.2, 10, 8), pale, [0, -.1, .3], { scale: [1.2, .75, .85] });
  part(head, sphere(.055, 7, 5), nose, [0, -.03, .45], { scale: [1.3, .8, 1] });
  for (const s of [-1, 1]) {
    part(head, sphere(.1, 8, 6), fur, [.27 * s, .3, -.04], { scale: [1, 1, .5] });
    part(head, sphere(.06, 6, 5), stripe, [.27 * s, .3, -.01], { scale: [1, 1, .4] });
    for (let i = 0; i < 2; i++) part(head, box(.03, .12, .03), stripe, [(.3 + i * .05) * s, .02 - i * .08, .18], { rot: [0, 0, s * (1.2 + i * .2)] }); // (stripes on its cheeks)
  }
  const jaw = new THREE.Group(); jaw.position.set(0, -.18, .12); head.add(jaw);
  part(jaw, sphere(.17, 10, 6), pale, [0, -.02, .2], { scale: [1.05, .5, .9] });
  for (const s of [-1, 1]) part(jaw, new THREE.ConeGeometry(.025, .09, 4), claw, [.08 * s, .06, .3], {}); // (fangs)
  const eye = new THREE.Group(); eye.position.set(0, .08, .28); head.add(eye);
  const eyes = bigEyes(eye, .15, 0, 0, .1, 0x10283a, .3);
  // the mane: a white ruff round the face, tufts pointing out
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2, r = .42 + (i % 2) * .05;
    part(head, new THREE.ConeGeometry(.1, .3, 5), pale, [Math.cos(a) * r, Math.sin(a) * r * .9 - .02, -.14], { rot: [0, 0, a - Math.PI / 2] });
  }
  part(head, sphere(.46, 12, 10), pale, [0, -.02, -.2], { scale: [1.05, 1, .6] });
  // the tail, striped, curling up at the end
  const tail = new THREE.Group(); tail.position.set(0, .9, -.98); body.add(tail);
  const tp: V3[] = [[0, 0, 0], [0, -.12, -.36], [0, -.1, -.72], [0, .12, -.94]];
  for (let i = 0; i < 3; i++) { limb(tail, tp[i], tp[i + 1], .07 - i * .012, fur, .06 - i * .012); part(tail, new THREE.TorusGeometry(.07 - i * .012, .018, 4, 10), stripe, tp[i + 1], { rot: [Math.PI / 2 + i * .5, 0, 0] }); }
  // the plates: bronze pauldrons on its shoulders, a slab of carved stone on its back, a bronze brow
  const plates = [-1, 1].map(s => {
    const p = new THREE.Group(); p.position.set(.4 * s, 1.02, .44); p.rotation.z = -s * .55; body.add(p);
    part(p, new THREE.SphereGeometry(.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), bronze, [0, 0, 0], { scale: [1, .62, 1.2] });
    part(p, new THREE.TorusGeometry(.3, .03, 4, 20), verd, [0, 0, 0], { rot: [Math.PI / 2, 0, 0], scale: [1, 1.2, 1] });
    for (const z of [-.2, 0, .2]) part(p, sphere(.03, 5, 4), verd, [.24, .05, z]);
    rune(p, F, [0, .19, 0], .16, [-Math.PI / 2, 0, 0], runeM);
    return p;
  });
  const back = new THREE.Group(); back.position.set(0, 1.28, -.2); back.rotation.x = .06; body.add(back);
  part(back, box(.62, .1, .9), stone, [0, 0, 0]);
  for (const s of [-1, 1]) part(back, box(.06, .12, .92), stoneDark, [.31 * s, -.01, 0]);
  for (const z of [-.25, .25]) rune(back, F, [0, .056, z], .2, [-Math.PI / 2, 0, 0], runeM);
  plates.push(back);
  const brow = new THREE.Group(); brow.position.set(0, .2, .1); brow.rotation.x = .45; head.add(brow);
  part(brow, new THREE.SphereGeometry(.4, 14, 6, 0, Math.PI * 2, 0, Math.PI * .26), bronze, [0, -.3, 0]);
  part(brow, box(.05, .07, .36), bronze, [0, .1, 0]);
  rune(brow, F, [0, .115, .1], .12, [-Math.PI / 2, 0, 0], runeM);
  plates.push(brow);
  circle(g, F, 1.5);
  const ring = haloRing(g, F, .9, 2.35, -.2);
  const halo = glow(F, 3.4, .35); halo.position.set(0, 1.9, 0); g.add(halo);
  const rime = new THREE.Group(); g.add(rime);
  const frost = motes(rime, F, 7, 1.3, 1.2, .03);
  return { group: g, shadow: 2.5, school: 'frost', parts: { eye, ring, halo, body, head, jaw, legs, tail, rime, plate0: plates[0], plate1: plates[1], plate2: plates[2], plate3: plates[3] }, idle: t => {
    const b = Math.sin(t * 1.8); body.scale.set(1, 1 + b * .015, 1); head.rotation.z = Math.sin(t * .7) * .05;
    tail.rotation.y = Math.sin(t * 1.9) * .35; tail.rotation.x = Math.sin(t * 1.3) * .1;
    blink(eyes, t, 4.6); frost(t, .5);
  } };
}

/* The Pillar Dragon (M4.2, from the Eda lore; Ember and Frost): a long dragon with antlers, a spiked mane and a beard,
   orange down its left flank and blue-grey down its right. Its head is one look (it leans out from the pillar and
   breathes); its body a chain of segments drawn as instances, laid along its path each step (pillarDragon.ts). */
const DRAGON = { fire: 0xe07a2c, frost: 0x6c8098, cream: 0xf0e2c2, horn: 0xdcc088 };
/** Half a sphere: the side of +x (its left, orange) or of -x (its right, blue-grey). */
const halfBall = (r: number, side: 1 | -1) => new THREE.SphereGeometry(r, 12, 9, side > 0 ? 0 : Math.PI, Math.PI).rotateY(Math.PI / 2);

/** The Pillar Dragon's head, facing +z from where its neck joins (the origin): split orange and blue-grey, a cream
    muzzle and beard, antlers, a spiked mane, long whiskers, big eyes; its jaw drops and its maw glows as it breathes. */
function dragonHeadOld(): BossBuilt {
  const g = new THREE.Group(), orange = std(DRAGON.fire, { roughness: .6 }), blue = std(DRAGON.frost, { roughness: .6 }), cream = std(DRAGON.cream), horn = std(DRAGON.horn, { roughness: .55, metalness: .15 }), dark = std(0x2a1a18);
  const head = new THREE.Group(); g.add(head);
  const split = (parent: THREE.Object3D, r: number, at: V3, scale: V3) => { for (const s of [1, -1] as const) part(parent, halfBall(r, s), s > 0 ? orange : blue, at, { scale }); };
  split(head, .3, [0, .06, .14], [1, .85, 1.1]); // (the skull)
  split(head, .2, [0, 0, .48], [.9, .7, 1.45]); // (the snout)
  part(head, sphere(.1, 9, 7), cream, [0, .04, .72], { scale: [1.2, .8, .9] });
  for (const s of [-1, 1]) part(head, sphere(.028, 5, 4), dark, [.06 * s, .08, .79]);
  for (const s of [-1, 1]) part(head, sphere(.09, 8, 6), s > 0 ? orange : blue, [.2 * s, .2, .32], { scale: [1, .6, 1.4] }); // (brows)
  const jaw = new THREE.Group(); jaw.position.set(0, -.12, .2); head.add(jaw);
  part(jaw, sphere(.17, 10, 7), cream, [0, -.02, .26], { scale: [.85, .42, 1.6] });
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) part(jaw, new THREE.ConeGeometry(.022, .08, 4), std(0xf8f4ea), [.08 * s, .06, .38 + i * .12]);
  for (let i = 0; i < 5; i++) part(jaw, new THREE.ConeGeometry(.045, .3 - Math.abs(i - 2) * .05, 5), cream, [(i - 2) * .05, -.16, .3 - Math.abs(i - 2) * .03], { rot: [Math.PI + .2, 0, 0] }); // (the beard)
  const eye = new THREE.Group(); eye.position.set(0, .15, .4); head.add(eye);
  const eyes = bigEyes(eye, .13, 0, 0, .085, 0x2a1408, .5);
  // antlers, branching back and up; a mane of spikes round the back of the head; whiskers streaming from the snout
  for (const s of [-1, 1]) {
    const beam: V3[] = [[.12 * s, .26, 0], [.24 * s, .5, -.12], [.3 * s, .72, -.3]];
    for (let i = 0; i < 2; i++) limb(head, beam[i], beam[i + 1], .035 - i * .008, horn, .028 - i * .008);
    limb(head, beam[1], [.42 * s, .6, -.02], .022, horn, .014); limb(head, beam[2], [.2 * s, .86, -.34], .018, horn, .012);
  }
  for (let i = 0; i < 9; i++) { const a = -.5 + i / 8 * (Math.PI + 1); part(head, new THREE.ConeGeometry(.06, .3, 4), cream, [Math.cos(a) * .3, .06 + Math.sin(a) * .3, -.14], { rot: [-1.1, 0, a - Math.PI / 2] }); }
  for (const s of [-1, 1]) {
    const pts = [[.14 * s, 0, .62], [.4 * s, -.06, .74], [.68 * s, -.2, .62], [.86 * s, -.36, .4]].map(([x, y, z]) => new THREE.Vector3(x, y, z));
    part(head, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, .014, 4), cream, [0, 0, 0]);
  }
  const maw = glow(DRAGON.fire, 1.6, 0); maw.position.set(0, -.08, .74); head.add(maw);
  const ring = haloRing(g, SCHOOL_LIGHT.ember, .42, .78, -.5);
  const halo = glow(DRAGON.fire, 2.6, .3); halo.position.set(0, .3, -.2); g.add(halo);
  return { group: g, shadow: 1.2, school: 'ember', parts: { eye, ring, halo, head, jaw, maw }, idle: t => {
    head.rotation.z = Math.sin(t * 1.2) * .06; head.rotation.x = Math.sin(t * .9) * .05; blink(eyes, t, 4.3);
  } };
}

/** The Pillar Dragon's body: `n` segments drawn as instances (a few draw calls for the whole length), orange on the left
    and blue-grey on the right, cream beneath, a spike on each, four short legs and a tuft at the tail. `pose` lays them
    along the points given (head end first), each turned along the body. */
export interface DragonBody { group: THREE.Group; n: number; spacing: number; mats: THREE.MeshStandardMaterial[]; pose: (at: readonly (readonly [number, number, number])[]) => void }
export function dragonBody(n = 22, spacing = .2): DragonBody {
  const g = new THREE.Group(), o = new THREE.Color(DRAGON.fire), b = new THREE.Color(DRAGON.frost), c = new THREE.Color(DRAGON.cream), white = new THREE.Color(0xffffff);
  const painted = (geo: THREE.BufferGeometry, colour: (x: number, y: number) => THREE.Color) => {
    const p = geo.attributes.position, col = new Float32Array(p.count * 3);
    for (let k = 0; k < p.count; k++) colour(p.getX(k), p.getY(k)).toArray(col, k * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
  };
  // (painted in their vertices: the merge that makes a look cheap leaves instances alone, and so does it these)
  const skin = std(0xffffff, { vertexColors: true, roughness: .6 }), bone = std(0xffffff, { vertexColors: true });
  const segGeo = painted(new THREE.SphereGeometry(1, 12, 8), (x, y) => y < -.6 ? c : x > 0 ? o : b);
  const spikeGeo = painted(new THREE.ConeGeometry(.5, 1, 4).translate(0, .5, 0), () => c);
  const legGeo = painted(new THREE.CylinderGeometry(.05, .07, .4, 5).translate(0, .2, 0), () => white);
  const segs = new THREE.InstancedMesh(segGeo, skin, n), spikes = new THREE.InstancedMesh(spikeGeo, bone, n + 3), legs = new THREE.InstancedMesh(legGeo, skin, 4);
  for (let i = 0; i < 4; i++) legs.setColorAt(i, i % 2 ? b : o);
  for (const m of [segs, spikes, legs]) { m.frustumCulled = false; g.add(m); } // (the instances go wherever the body does)
  const LEGS = [Math.round(n * .22), Math.round(n * .55)];
  const radius = (i: number) => { const t = i / (n - 1); return t < .3 ? .17 + .08 * t / .3 : .25 - .17 * Math.pow((t - .3) / .7, 1.2); };
  const m = new THREE.Matrix4(), local = new THREE.Matrix4(), rot = new THREE.Matrix4(), turn = new THREE.Matrix4(), x = new THREE.Vector3(), y = new THREE.Vector3(), f = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), q = new THREE.Vector3();
  const basis = (at: readonly (readonly [number, number, number])[], i: number, r: number) => {
    const a = at[Math.max(0, i - 1)], z = at[Math.min(at.length - 1, i + 1)];
    f.set(a[0] - z[0], a[1] - z[1], a[2] - z[2]); if (f.lengthSq() < 1e-8) f.set(0, 0, 1); f.normalize();
    x.crossVectors(up, f); if (x.lengthSq() < 1e-6) x.set(1, 0, 0); x.normalize(); y.crossVectors(f, x);
    p.set(at[i][0], at[i][1], at[i][2]);
    return m.makeBasis(x, y, f).scale(q.set(r, r * .9, r * 1.3)).setPosition(p);
  };
  return { group: g, n, spacing, mats: [skin, bone], pose: at => {
    for (let i = 0; i < n; i++) {
      const r = radius(i); basis(at, i, r); segs.setMatrixAt(i, m);
      spikes.setMatrixAt(i, local.copy(m).multiply(rot.makeTranslation(0, .8, 0)).multiply(turn.makeRotationX(-.7)).multiply(rot.makeScale(.42, .55, .42)));
      const k = LEGS.indexOf(i);
      if (k >= 0) for (const s of [1, -1]) legs.setMatrixAt(k * 2 + (s > 0 ? 0 : 1), local.copy(m).multiply(rot.makeTranslation(s * .8, -.35, .1)).multiply(turn.makeRotationZ(-s * 2.3)).multiply(rot.makeScale(1 / r * .2, 1 / (r * .9) * .2, 1 / (r * 1.3) * .2)));
    }
    basis(at, n - 1, radius(n - 1)); // (a tuft at the tail, pointing back)
    for (let k = 0; k < 3; k++) spikes.setMatrixAt(n + k, local.copy(m).multiply(turn.makeRotationX(-Math.PI / 2 - .4 + k * .4)).multiply(rot.makeScale(1.3, 3, 1.3)));
    segs.instanceMatrix.needsUpdate = spikes.instanceMatrix.needsUpdate = legs.instanceMatrix.needsUpdate = true;
  } };
}

/** The Pillar Dragon for the gallery: coiled round a stone column, leaning out (the same path its fight lays it on); `head`
    its head as built now, or as the pairs ask (lookPairs.ts). */
export function dragonLook(head: () => BossBuilt = dragonHead): BossBuilt {
  const L = head(), g = new THREE.Group(), B = dragonBody(), stone = std(0x8a8478);
  part(g, new THREE.CylinderGeometry(.27, .3, 1.55, 10), stone, [0, .78, 0]); part(g, box(.72, .18, .72), stone, [0, 1.62, 0]); part(g, box(.86, .2, .86), stone, [0, .1, 0]);
  const coil = spiral(0, 0, 1.75, Math.PI * .75, { radius: .62, turns: 1.25, drop: 1.2 }), end = coil[coil.length - 1], h: P3 = [.35, 1.6, 1.15];
  B.pose(lay([...neck(h, end, .35), ...coil.slice().reverse()], B.n, B.spacing, .3));
  g.add(B.group); L.group.position.set(...h); L.group.rotation.y = .3; g.add(L.group);
  return { ...L, group: g, shadow: 2 };
}

/** One of the Twin Guardians (M4.2, from the Eda lore; Hallow): a colossal bearded guardian of sandstone crouched as
    the ones in the gate's towers, a helm on its head, lion paws for hands and feet, a round stone shield on its left
    arm; its eyes the Wardens' gold. The two differ a little (`second`: greyer stone, a forked beard, a crest on its
    helm). Its fight (bosses.ts) turns its head after the mage, raises its shield arm as it shields its twin, and rears
    its right paw to strike. */
export function twinLook(second = false): BossBuilt {
  const H = SCHOOL_LIGHT.hallow, g = new THREE.Group(), stone = std(second ? 0xa8a296 : 0xc2ae8a, { roughness: .95 }), dark = std(second ? 0x7a756c : 0x8e7c60, { roughness: .95 }), gold = std(0xc89a48, { roughness: .45, metalness: .5 });
  const body = new THREE.Group(); g.add(body);
  // crouched: great haunches, a broad chest leaning forward, the forepaws planted
  part(body, sphere(.62, 14, 10), stone, [0, .85, -.15], { scale: [1.1, .95, 1] });
  part(body, sphere(.55, 14, 10), stone, [0, 1.35, .15], { scale: [1.15, 1, .85] });
  part(body, box(.9, .1, .5), gold, [0, 1.05, .32]); // (a belt of gilt)
  for (const s of [-1, 1]) { // haunches and hind paws
    part(body, sphere(.36, 10, 8), dark, [.5 * s, .45, -.2], { scale: [.8, 1, 1.2] });
    part(body, sphere(.22, 9, 7), stone, [.55 * s, .12, .2], { scale: [1.1, .6, 1.4] });
    for (let i = -1; i <= 1; i++) part(body, sphere(.06, 6, 5), dark, [.55 * s + i * .08, .08, .45]);
  }
  // the head: a helm, heavy brows, a great square beard; eyes of the Wardens' gold
  const head = new THREE.Group(); head.position.set(0, 1.95, .3); body.add(head);
  part(head, sphere(.3, 12, 10), stone, [0, 0, 0], { scale: [1, 1.05, .95] });
  part(head, new THREE.SphereGeometry(.33, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), gold, [0, .05, -.02]); // (the helm)
  part(head, box(.5, .06, .12), gold, [0, .06, .22]); // (its brim)
  if (second) part(head, box(.06, .22, .5), gold, [0, .38, -.02]); // (a crest)
  part(head, box(.42, .07, .1), dark, [0, -.02, .26]); // (brows)
  const beard = new THREE.Group(); beard.position.set(0, -.2, .18); head.add(beard);
  if (second) for (const s of [-1, 1]) part(beard, new THREE.ConeGeometry(.13, .55, 5), dark, [.1 * s, -.2, 0], { rot: [Math.PI, 0, s * .15] });
  else { part(beard, box(.34, .5, .16), dark, [0, -.2, 0]); for (let i = 0; i < 4; i++) part(beard, box(.34, .03, .17), stone, [0, -.05 - i * .11, 0]); }
  const eye = new THREE.Group(); eye.position.set(0, .06, .27); head.add(eye);
  for (const s of [-1, 1]) part(eye, sphere(.05, 7, 5), lit(H), [.1 * s, 0, 0]);
  const eyeGlow = glow(H, .7, .6); eye.add(eyeGlow);
  // the arms: a lion paw each, the left bearing a round stone shield with a gilt boss
  const arm = (s: 1 | -1) => {
    const a = new THREE.Group(); a.position.set(.62 * s, 1.55, .15); body.add(a);
    limb(a, [0, 0, 0], [.08 * s, -.5, .22], .16, stone, .13); limb(a, [.08 * s, -.5, .22], [.05 * s, -1.05, .45], .13, stone, .12);
    part(a, sphere(.2, 10, 8), stone, [.05 * s, -1.2, .52], { scale: [1.15, .7, 1.3] });
    for (let i = -1; i <= 1; i++) part(a, new THREE.ConeGeometry(.035, .1, 4), dark, [.05 * s + i * .08, -1.28, .74], { rot: [Math.PI / 2, 0, 0] });
    return a;
  };
  const armL = arm(1), armR = arm(-1);
  const shield = new THREE.Group(); shield.position.set(.2, -.7, .5); armL.add(shield);
  part(shield, new THREE.CylinderGeometry(.5, .5, .1, 16), dark, [0, 0, 0], { rot: [Math.PI / 2, 0, 0] });
  part(shield, new THREE.TorusGeometry(.5, .04, 4, 20), gold, [0, 0, .05]);
  part(shield, sphere(.12, 8, 6), gold, [0, 0, .08], { scale: [1, 1, .5] });
  rune(shield, H, [0, .28, .06], .14, [0, 0, 0], lit(H, .9));
  const ring = haloRing(g, H, .85, 2.75, -.4);
  const halo = glow(H, 3.2, .3); halo.position.set(0, 1.9, -.3); g.add(halo);
  const dust = motes(g, H, 5, 1.1, 1.4, .025);
  return { group: g, shadow: 2.6, school: 'hallow', parts: { eye, ring, halo, body, head, armL, armR, shield, eyeGlow }, idle: t => {
    const b = Math.sin(t * 1.1); body.scale.set(1 + b * .01, 1 + b * .012, 1); dust(t, .4);
  } };
}

/** The Twin Guardians for the gallery: the two side by side. */
export function twinPairLook(): BossBuilt {
  const a = twinLook(), b = twinLook(true), g = new THREE.Group();
  a.group.position.x = -1.2; b.group.position.x = 1.2; g.add(a.group, b.group);
  return { ...a, group: g, shadow: 4, idle: t => { a.idle(t); b.idle(t + 1.7); } };
}

/** The Drowned Abbess (floor 2 or 3's boss, Frost; remade in code 2026-10-01, the owner's ask): a great pale cave olm,
    soft and pale, rearing out of the water under the floor, its long tail curled behind it. Feathery gills glowing
    with cold light hang round its head like a wimple and a veil, and its little forelegs are folded before its chest as
    if at prayer, which is why the sextons called it the Abbess; it smiles a wide mouth of fine teeth. Its fight (bosses.ts)
    opens its jaw and spreads its gills as it wails, flares its eyes, and sinks it into the floor. */
export function abbessLook(): BossBuilt {
  const F = SCHOOL_LIGHT.frost, g = new THREE.Group(), skin = gloss(0xe2d6d6, .5, .08), pale = std(0xf6eeea), finM = thin(0xe6c4c8), spotM = lit(0xbfe9ff);
  const mouthM = lit(0x2c1624), tooth = std(0xf4f0e8, { roughness: .35 }), stalkM = lit(0x3f9ad0), frondM = lit(F), tipM = lit(0xe2f6ff);
  const body = new THREE.Group(); g.add(body);
  // the tail, curled on the floor behind it, a soft fin along its top and freckles of cold light
  const tail = joint(body, [0, .3, -.2]), tailPts: V3[] = [[0, 0, 0], [0, -.04, -.6], [-.42, -.12, -1.05], [-.28, -.18, -1.5], [.2, -.2, -1.74]], tc = curve(tailPts);
  tube(tail, tailPts, .42, .05, skin, 18, 8);
  for (let i = 1; i < 10; i++) {
    const k = i / 11, p = tc.getPoint(k), d = tc.getTangent(k), r = .42 - .37 * k;
    part(tail, sphere(.2, 6, 5), finM, [p.x, p.y + r * .85, p.z], { rot: [0, Math.atan2(d.x, d.z), 0], scale: [.12, 1 - k * .6, 1.2] });
    if (i % 2) part(tail, sphere(.035, 5, 4), spotM, [p.x + r * .5, p.y + r * .55, p.z]);
  }
  // the body, rearing up from the floor to the head; a pale belly
  tube(body, [[0, .25, -.25], [0, .7, -.02], [0, 1.15, .2], [0, 1.44, .38]], .5, .32, skin, 12, 10);
  part(body, sphere(.42, 12, 10), pale, [0, .8, .2], { scale: [.9, 1.25, .6] });
  for (const s of [-1, 1]) {
    // the forelegs folded before the chest, the hands meeting as if at prayer; the hind legs splayed on the floor
    jointed(body, [[.3 * s, 1.18, .3], [.42 * s, .9, .5], [.08 * s, 1.02, .66]], .08, .05, skin);
    for (let f = 0; f < 3; f++) limb(body, [.08 * s, 1.02, .66], [.03 * s, 1.1 + f * .04, .7 + f * .015], .02, pale, .012);
    jointed(body, [[.38 * s, .35, -.12], [.72 * s, .24, .06], [.86 * s, .04, .26]], .12, .07, skin);
    part(body, sphere(.12, 8, 6), pale, [.9 * s, .03, .34], { scale: [1.2, .3, 1.1] });
  }
  for (let i = 0; i < 5; i++) part(body, sphere(.04, 5, 4), spotM, [(i % 2 ? .16 : -.16), .55 + i * .2, -.2 + i * .1]);
  // the head: broad and flat, held up so its face shows, a wide smile of fine teeth, eyes of cold light
  const head = joint(body, [0, 1.62, .5], [-.35, 0, 0]);
  part(head, sphere(.44, 14, 10), skin, [0, 0, 0], { scale: [1.3, .62, 1.1] });
  part(head, new THREE.TorusGeometry(.44, .075, 4, 18, Math.PI), mouthM, [0, -.08, 0], { rot: [Math.PI / 2, 0, 0], scale: [1.25, 1.06, 1] });
  for (let i = 1; i < 12; i++) { const a = i / 12 * Math.PI; part(head, new THREE.ConeGeometry(.035, i % 2 ? .15 : .1, 4), tooth, [Math.cos(a) * .58, -.1, Math.sin(a) * .5], { rot: [Math.PI, 0, 0] }); }
  const jaw = joint(head, [0, -.08, -.1]);
  part(jaw, sphere(.32, 12, 8), pale, [0, -.04, .24], { scale: [1.5, .45, 1.15] });
  for (let i = 1; i < 9; i++) { const a = i / 9 * Math.PI; part(jaw, new THREE.ConeGeometry(.02, .06, 4), tooth, [Math.cos(a) * .44, .03, .1 + Math.sin(a) * .36]); }
  const eye = joint(head, [0, .1, .36]);
  slitEyes(eye, .32, 0, .02, .16, F, .5, .4); // (narrow, cold, slanted down to the middle)
  const eyeGlow = glow(F, 1.1, .45); eyeGlow.position.set(0, 0, .08); eye.add(eyeGlow);
  for (let i = 0; i < 4; i++) part(head, sphere(.03, 5, 4), spotM, [(i - 1.5) * .14, .26, -.1 - (i % 2) * .08]);
  // the gills: three plumes a side, sweeping up over the head, out, and down to the shoulders like a veil; each a stalk
  // feathered along its length, its tips bright
  const gills = [-1, 1].map(s => {
    const gj = joint(head, [.5 * s, .04, -.12]);
    for (const [up, out] of [[.55, .32], [.12, .55], [-.42, .45]] as [number, number][]) {
      const pts: V3[] = [[0, 0, 0], [out * .45 * s, up * .5 + .04, -.1], [out * .85 * s, up * .85, -.28], [out * s, up - .1 * Math.sign(up), -.46]], c = curve(pts);
      tube(gj, pts, .09, .04, stalkM, 8, 6);
      for (let k = 1; k <= 6; k++) {
        const p = c.getPoint(k / 7), len = .24 - k * .018;
        for (const v of [-1, 1]) spike(gj, [p.x, p.y, p.z], [p.x + .05 * s, p.y + v * len, p.z - .07], .045, k > 4 ? tipM : frondM);
      }
    }
    return gj;
  });
  const ring = haloRing(g, F, .85, 1.95, .05);
  const halo = glow(F, 3.4, .35); halo.position.set(0, 1.6, 0); g.add(halo);
  const drips = motes(g, F, 8, 1.3, 1.2, .03);
  return { group: g, shadow: 2.4, school: 'frost', parts: { eye, ring, halo, body, head, jaw, gillL: gills[0], gillR: gills[1], eyeGlow }, idle: t => {
    body.rotation.z = Math.sin(t * .9) * .04; head.rotation.z = Math.sin(t * .7 + 1) * .06; head.rotation.x = -.35 + Math.sin(t * 1.1) * .04;
    gills.forEach((gj, i) => { gj.rotation.y = Math.sin(t * 1.6 + i * Math.PI) * .12; gj.rotation.x = Math.sin(t * 2.1 + i) * .06; });
    tail.rotation.y = Math.sin(t * 1.2) * .1; drips(t, .4);
  } };
}

/** The Pyre Knight (floor 2 or 3's boss, Ember; remade in code 2026-10-01, the owner's ask): a suit of blackened plate as
    tall as a door with no one inside it, only fire: it glows at every joint and through a crack in its breastplate, and
    pours up out of its helm as out of a brazier ringed with iron spikes. A greatsword whose fuller runs molten burns in
    both its gauntlets, and its cloak smoulders along the hem. Its fight (bosses.ts) strides its legs as it stalks, levels
    its blade as it aims and charges, raises it overhead and swings it down as it sprays embers, and widens the slit of
    its visor. */
export function pyreKnightLook(): BossBuilt {
  const E = SCHOOL_LIGHT.ember, g = new THREE.Group(), plate = gloss(0x3c3430, .4, .6), dark = std(0x1c1716, { metalness: .5, roughness: .55 }), trim = gloss(0x9a8472, .32, .7);
  const seam = lit(0xff8a34), molten = lit(0xffc36a), steel = gloss(0x9a8c80, .3, .8), cloth = thin(0x3a1612, { roughness: .9 });
  const body = new THREE.Group(); g.add(body);
  // the legs, each a pivot at the hip: cuisse, a knee cop with the fire showing behind it, greave, a sabaton
  const legs = [-1, 1].map(s => {
    const l = joint(body, [.26 * s, 1.0, 0]);
    limb(l, [0, 0, 0], [0, -.45, .05], .17, plate, .14);
    part(l, sphere(.14, 8, 6), trim, [0, -.47, .08]); part(l, sphere(.1, 6, 5), seam, [0, -.47, -.04]);
    limb(l, [0, -.5, .05], [0, -.88, 0], .14, plate, .12);
    part(l, box(.22, .12, .38), dark, [0, -.94, .08]);
    return l;
  });
  // a skirt of plates over the hips, a ring of fire at the waist
  for (let i = -3; i <= 3; i++) { const a = i * .42; part(body, box(.2, .34, .05), i % 2 ? trim : plate, [Math.sin(a) * .38, .98, Math.cos(a) * .38 - .02], { rot: [-.2, a, 0] }); }
  part(body, new THREE.TorusGeometry(.36, .05, 5, 18), seam, [0, 1.14, 0], { rot: [Math.PI / 2, 0, 0] });
  // the breastplate: a ridge down the middle, a crack the fire shows through
  part(body, sphere(.5, 14, 10), plate, [0, 1.55, 0], { scale: [1.05, 1.1, .75] });
  part(body, box(.05, .62, .05), trim, [0, 1.56, .36], { rot: [.1, 0, 0] });
  for (const [x, y, rz] of [[.12, 1.72, .5], [.16, 1.56, -.4], [.1, 1.42, .3], [.2, 1.36, -.6]] as V3[]) part(body, box(.035, .17, .03), molten, [x, y, .36 - (1.72 - y) * .05], { rot: [0, .35, rz] });
  part(body, new THREE.CylinderGeometry(.25, .3, .18, 10), dark, [0, 2.06, 0]);
  // the pauldrons: three shells each, layered, a spike on the top
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    part(body, new THREE.SphereGeometry(.32 - i * .05, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), i ? plate : trim, [.56 * s, 1.92 - i * .13, 0], { rot: [0, 0, -s * (.35 + i * .12)], scale: [1, .7, 1.1] });
    if (!i) spike(body, [.62 * s, 2.1, 0], [.74 * s, 2.42, -.05], .06, trim);
  }
  // the helm: a great helm open at the crown like a brazier, iron spikes round its rim, fire pouring up out of it; the
  // slit of its visor burning
  const helm = joint(body, [0, 2.3, 0]);
  part(helm, new THREE.CylinderGeometry(.28, .25, .48, 10), plate, [0, 0, 0]);
  part(helm, new THREE.TorusGeometry(.28, .035, 4, 16), trim, [0, .24, 0], { rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; spike(helm, [Math.sin(a) * .28, .24, Math.cos(a) * .28], [Math.sin(a) * .36, .46, Math.cos(a) * .36], .04, dark); }
  part(helm, box(.06, .3, .04), trim, [0, -.06, .27]);
  const eye = joint(helm, [0, .04, .27]);
  part(eye, box(.34, .05, .03), molten, [0, 0, 0]);
  const pyre = makeFire([{ x: 0, y: .2, z: 0, h: .75, w: .42, tongues: 3 }], EMBER_FIRE, 10, .9); helm.add(pyre);
  // the arms hold the greatsword before it, point forward and down (the fight raises and swings them, the sword with them)
  const arms = joint(body, [0, 1.86, 0]);
  for (const s of [-1, 1]) {
    limb(arms, [.56 * s, -.02, 0], [.46 * s, -.45, .25], .13, plate, .12);
    part(arms, sphere(.09, 6, 5), seam, [.46 * s, -.45, .25]);
    limb(arms, [.46 * s, -.45, .25], [.12 * s, -.62, .56], .12, plate, .11);
    part(arms, sphere(.12, 8, 6), dark, [.09 * s, -.64, .6], { scale: [1, .9, 1.2] });
  }
  const sword = joint(arms, [0, -.64, .6], [2, 0, 0]);
  part(sword, box(.16, 1.45, .045), steel, [0, .8, 0]);
  part(sword, box(.045, 1.22, .055), molten, [0, .76, 0]);
  part(sword, new THREE.ConeGeometry(.08, .22, 4), steel, [0, 1.63, 0], { rot: [0, Math.PI / 4, 0], scale: [1, 1, .3] });
  part(sword, box(.52, .07, .1), dark, [0, .06, 0]);
  for (const s of [-1, 1]) part(sword, sphere(.05, 6, 5), trim, [.27 * s, .09, 0]);
  part(sword, new THREE.CylinderGeometry(.035, .035, .34, 6), dark, [0, -.13, 0]);
  part(sword, sphere(.06, 6, 5), trim, [0, -.32, 0]);
  const blaze = makeFire([.45, .8, 1.15, 1.45].map((y, i) => ({ x: 0, y: -.42 * y, z: .91 * y, h: .34 - i * .03, w: .15 })), EMBER_FIRE, 6, .6);
  blaze.rotation.x = -2; sword.add(blaze); // (in the sword's frame turned back upright, so the flames still rise)
  // the cloak, down its back from the shoulders, its tattered hem smouldering
  const cloak = joint(body, [0, 1.95, -.05]);
  part(cloak, new THREE.CylinderGeometry(.5, .78, 1.75, 12, 1, true, Math.PI - 1.15, 2.3), cloth, [0, -.88, 0]);
  const hem: FlameSpec[] = [];
  for (let i = 0; i < 11; i++) {
    const a = Math.PI - 1.1 + i / 10 * 2.2, x = Math.sin(a) * .78, z = Math.cos(a) * .78;
    part(cloak, new THREE.ConeGeometry(.08, .2 + (i % 3) * .06, 4), i % 2 ? seam : cloth, [x, -1.78, z], { rot: [Math.PI, 0, 0] });
    if (i % 3 === 1) hem.push({ x, y: -1.8, z, h: .15, w: .3 });
  }
  cloak.add(makeMotes(hem, E, 14, 1.2));
  const ring = haloRing(g, E, .8, 2.45, -.5);
  const halo = glow(E, 3.3, .35); halo.position.set(0, 1.8, -.2); g.add(halo);
  return { group: g, shadow: 2.3, school: 'ember', parts: { eye, ring, halo, body, helm, arms, sword, legL: legs[0], legR: legs[1] }, idle: t => {
    body.position.y = Math.sin(t * 1.6) * .015; cloak.rotation.x = .04 + Math.sin(t * 1.3) * .04; helm.rotation.y = Math.sin(t * .6) * .08;
  } };
}

/** The bosses' looks as they were before M4.12 (by the id `BOSS_FANTASY` keeps their new looks under), for the pairs
    and the contract (lookPairs.ts). */
export const OLD_BOSS_LOOKS: Readonly<Record<string, () => BossBuilt>> = { bellWarden, motherOfSpores, hollowOwl, hart: hartOld, angler: anglerOld, tiger: tigerOld, dragonHead: dragonHeadOld, serpentHead: serpentHeadOld };
/** The bosses of floors 4 and 5 (M4.1), the War-Tiger and the Pillar Dragon's head (M4.2), as they are built now (M4.12:
    the new look once approved). */
export const hartLook = dressedBoss('hart', hartOld), anglerLook = dressedBoss('angler', anglerOld), tigerLook = dressedBoss('tiger', tigerOld), dragonHead = dressedBoss('dragonHead', dragonHeadOld);

/** The looks, for the owner to choose (the dev menu's Galleries tab stands them ahead of the mage, and picks the one the
    Hollow Warden wears in its fight). */
export const BOSS_LOOKS = [
  { id: 'bellWarden', build: dressedBoss('bellWarden', bellWarden) }, { id: 'motherOfSpores', build: dressedBoss('motherOfSpores', motherOfSpores) }, { id: 'hollowOwl', build: dressedBoss('hollowOwl', hollowOwl) },
] as const;
export type BossLookId = (typeof BOSS_LOOKS)[number]['id'];
/** Every boss built in code, for the Galleries tab: the Warden's three looks, the bosses of floors 2 and 3, of floors 4
    and 5, then the bosses from the Eda lore (M4.2). */
export const ALL_BOSS_LOOKS: readonly { id: string; build: () => BossBuilt }[] = [...BOSS_LOOKS, { id: 'abbess', build: abbessLook }, { id: 'pyre', build: pyreKnightLook }, { id: 'hart', build: hartLook }, { id: 'angler', build: anglerLook }, { id: 'tiger', build: tigerLook }, { id: 'dragon', build: dragonLook }, { id: 'twins', build: twinPairLook }, { id: 'serpent', build: serpentLook }];

/** The look the Hollow Warden wears until the owner chooses: picked in the dev menu, remembered in this browser. */
const LOOK_KEY = 'ossuary.bossLook', FIRST: BossLookId = 'motherOfSpores';
let chosen: BossLookId = FIRST;
try { const v = localStorage.getItem(LOOK_KEY); if (BOSS_LOOKS.some(o => o.id === v)) chosen = v as BossLookId; } catch { /* no storage: the first */ }
export const bossLook = () => chosen;
export function setBossLook(id: BossLookId) { chosen = id; try { localStorage.setItem(LOOK_KEY, id); } catch { /* kept this session */ } }
/** Build the look the Hollow Warden wears now. */
export const buildBossLook = (id: BossLookId = chosen) => BOSS_LOOKS.find(o => o.id === id)!.build();
