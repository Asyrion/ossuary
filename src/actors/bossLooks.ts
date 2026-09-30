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

/** A built boss look: its group, how it idles, its shadow, the parts the fight moves and its school. */
export interface BossBuilt { group: THREE.Group; idle: (t: number) => void; shadow: number; parts: { eye: THREE.Object3D; ring: THREE.Object3D; halo: THREE.Sprite }; school: School }

const blink = (list: THREE.Object3D[], t: number, every = 3.6) => { const k = t % every; for (const e of list) e.scale.y = k < .14 ? .12 : 1; };
const smile = (parent: THREE.Object3D, at: V3, r: number, color = 0x2a1418) => part(parent, new THREE.TorusGeometry(r, r * .14, 4, 12, Math.PI), lit(color), at, { rot: [0, 0, Math.PI] });
/** The ring of runes behind its head that the fight turns (in its own plane, facing the camera, tipped back a little). */
function haloRing(g: THREE.Object3D, color: number, radius: number, y: number) {
  const ring = new THREE.Group(); ring.position.set(0, y, -.35); ring.rotation.x = -.35; g.add(ring);
  runeRing(ring, color, radius, [0, 0, 0], 8, [Math.PI / 2, 0, 0]);
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

/** The looks, for the owner to choose (the dev menu's Galleries tab stands them ahead of the mage; `DEV.bossLook` is the
    one the Hollow Warden wears in its fight). */
export const BOSS_LOOKS = [
  { id: 'bellWarden', build: bellWarden }, { id: 'motherOfSpores', build: motherOfSpores }, { id: 'hollowOwl', build: hollowOwl },
] as const;
export type BossLookId = (typeof BOSS_LOOKS)[number]['id'];
