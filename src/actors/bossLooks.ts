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
import { SCHOOL_LIGHT, bigEyes, box, circle, limb, lit, motes, part, rune, runeRing, sphere, std, type School, type V3 } from '../render/arcane';

/** A built boss look: its group, how it idles, its shadow, the parts the fight moves (the Warden's three, and any a
    boss's own fight moves besides) and its school. */
export interface BossBuilt { group: THREE.Group; idle: (t: number) => void; shadow: number; parts: { eye: THREE.Object3D; ring: THREE.Object3D; halo: THREE.Sprite } & Record<string, THREE.Object3D>; school: School }

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
export function hartLook(): BossBuilt {
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
export function anglerLook(): BossBuilt {
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

/** The looks, for the owner to choose (the dev menu's Galleries tab stands them ahead of the mage, and picks the one the
    Hollow Warden wears in its fight). */
export const BOSS_LOOKS = [
  { id: 'bellWarden', build: bellWarden }, { id: 'motherOfSpores', build: motherOfSpores }, { id: 'hollowOwl', build: hollowOwl },
] as const;
export type BossLookId = (typeof BOSS_LOOKS)[number]['id'];
/** Every boss built in code, for the Galleries tab: the Warden's three looks, then the bosses of floors 4 and 5. */
export const ALL_BOSS_LOOKS: readonly { id: string; build: () => BossBuilt }[] = [...BOSS_LOOKS, { id: 'hart', build: hartLook }, { id: 'angler', build: anglerLook }];

/** The look the Hollow Warden wears until the owner chooses: picked in the dev menu, remembered in this browser. */
const LOOK_KEY = 'ossuary.bossLook', FIRST: BossLookId = 'motherOfSpores';
let chosen: BossLookId = FIRST;
try { const v = localStorage.getItem(LOOK_KEY); if (BOSS_LOOKS.some(o => o.id === v)) chosen = v as BossLookId; } catch { /* no storage: the first */ }
export const bossLook = () => chosen;
export function setBossLook(id: BossLookId) { chosen = id; try { localStorage.setItem(LOOK_KEY, id); } catch { /* kept this session */ } }
/** Build the look the Hollow Warden wears now. */
export const buildBossLook = (id: BossLookId = chosen) => BOSS_LOOKS.find(o => o.id === id)!.build();
