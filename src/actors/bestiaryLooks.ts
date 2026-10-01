/* The bestiary's candidates (M4.5, docs/M4.5-plan.md; the owner's ask for "a whole host more", 2026-09-30): critters,
   fantasy creatures and elementals from the idea bank (docs/ideas.md, Bestiary), drawn up in code as looks for the owner
   to choose from before any becomes a foe. The rules of the first ten hold: round, readable shapes; big eyes on the
   critters; a school's light; smaller than the mage (elites aside). Each stands on y = 0 facing +Z and idles. Names and
   the fight each would bring are placeholders in STR.bestiary; the Galleries tab stands them in rows by kind. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, bigEyes, box, crystal, limb, lit, motes, part, shine, sphere, std, type School, type V3 } from '../render/arcane';

export interface Built { group: THREE.Group; idle: (t: number) => void; shadow: number; parts?: Record<string, THREE.Object3D> }
const blink = (list: THREE.Object3D[], t: number, every = 3.4) => { const k = t % every; for (const e of list) e.scale.y = k < .12 ? .12 : 1; };
const smile = (parent: THREE.Object3D, at: V3, r: number, color = 0x2a1418) => part(parent, new THREE.TorusGeometry(r, r * .14, 4, 10, Math.PI), lit(color), at, { rot: [0, 0, Math.PI] });
const { ember: E, frost: F, storm: S, hallow: H, umbral: U } = SCHOOL_LIGHT;

/* ---------- small critters ---------- */

/** Library, Umbral: a blot of ink with eyes that crawls out of scroll heaps, a quill feather stuck in it; struck, it splits. */
function inkling(): Built {
  const g = new THREE.Group(), ink = std(0x1a1630, { roughness: .3 }), sheen = lit(U, .9), body = new THREE.Group(); g.add(body);
  part(body, sphere(.17, 12, 10), ink, [0, .12, 0], { scale: [1.2, .7, 1.1] });
  const drips = [[-.17, .06], [.15, .1], [-.05, .17], [.18, -.08]].map(([x, z]) => part(body, sphere(.06, 8, 6), ink, [x, .03, z], { scale: [1, .45, 1] }));
  part(body, sphere(.05, 7, 5), sheen, [.06, .2, .06], { scale: [1, .4, 1] });
  const eyes = bigEyes(body, .06, .18, .13, .05);
  const quill = new THREE.Group(); quill.position.set(-.06, .2, -.06); quill.rotation.z = .35; body.add(quill);
  limb(quill, [0, 0, 0], [0, .26, 0], .008, std(0xe8e0d0)); part(quill, new THREE.ConeGeometry(.04, .2, 4), std(0xf0eadc), [0, .2, 0], { scale: [1, 1, .25] });
  return { group: g, shadow: .55, idle: t => {
    const w = Math.sin(t * 3); body.scale.set(1 + w * .06, 1 - w * .08, 1 + w * .04);
    drips.forEach((d, i) => { d.scale.x = 1 + Math.sin(t * 4 + i) * .2; }); quill.rotation.z = .35 + Math.sin(t * 2.4) * .12; blink(eyes, t, 3.2);
  } };
}

/** Drowned floor, Frost: a slow snail under a shell of ice, frost-blue horns, a trail of rime behind it. */
function rimeSnail(): Built {
  const g = new THREE.Group(), skin = std(0x9aa8b4), ice = std(0xbfe6ff, { roughness: .15, metalness: .1, transparent: true, opacity: .85 }), body = new THREE.Group(); g.add(body);
  part(body, sphere(.14, 10, 8), skin, [0, .07, .05], { scale: [.9, .45, 1.9] });
  const head = new THREE.Group(); head.position.set(0, .12, .26); body.add(head);
  part(head, sphere(.09, 10, 8), skin, [0, 0, 0]);
  const horns = [-1, 1].map(s => { const h = new THREE.Group(); h.position.set(.04 * s, .06, 0); head.add(h); limb(h, [0, 0, 0], [.03 * s, .12, .02], .012, skin); part(h, sphere(.022, 6, 5), lit(F), [.03 * s, .13, .02]); return h; });
  const eyes = bigEyes(head, .045, .02, .07, .036);
  const shell = new THREE.Group(); shell.position.set(0, .2, -.06); body.add(shell);
  part(shell, sphere(.17, 12, 10), ice, [0, 0, 0], { scale: [.85, 1, 1] });
  for (let i = 0; i < 3; i++) part(shell, new THREE.TorusGeometry(.13 - i * .04, .012, 4, 16), lit(F, .8), [0, .02 + i * .02, 0], { rot: [0, Math.PI / 2, 0] });
  crystal(shell, F, [0, .17, 0], .14); crystal(shell, F, [.08, .12, -.06], .09, [0, 0, .6]);
  const rime = [0, 1, 2].map(i => part(g, new THREE.CircleGeometry(.05, 8), shine(F, .4), [0, .01, -.25 - i * .12], { rot: [-Math.PI / 2, 0, 0] }));
  return { group: g, shadow: .5, idle: t => {
    const c = Math.sin(t * 1.6); body.scale.z = 1 + c * .05; head.position.z = .26 + c * .02;
    horns.forEach((h, i) => { h.rotation.x = Math.sin(t * 2 + i) * .2; }); rime.forEach((r, i) => { r.material.opacity = .25 + Math.sin(t * 2 - i) * .1; }); blink(eyes, t, 4);
  } };
}

/** Ossuary, Umbral: a round little spider hanging on a silk thread, violet eyes and a glint on its back. */
function spiderling(): Built {
  const g = new THREE.Group(), carapace = std(0x2a2232), fuzz = std(0x4a3a5a), body = new THREE.Group(); body.position.y = .55; g.add(body);
  part(body, sphere(.14, 12, 10), carapace, [0, 0, -.05], { scale: [1, .85, 1.1] });
  part(body, sphere(.09, 10, 8), fuzz, [0, -.01, .12]);
  part(body, new THREE.OctahedronGeometry(.04), lit(U), [0, .12, -.06], { scale: [1, .5, 1.4] });
  const eyes = bigEyes(body, .04, .02, .2, .032);
  for (const s of [-1, 1]) part(body, sphere(.014, 5, 4), lit(U), [.07 * s, .07, .17]);
  const legs = [-1, 1].flatMap(s => [.08, 0, -.08, -.15].map((z, i) => { const l = new THREE.Group(); l.position.set(.1 * s, 0, z); body.add(l); limb(l, [0, 0, 0], [.12 * s, .06, z * .3], .014, carapace); limb(l, [.12 * s, .06, z * .3], [.17 * s, -.08, z * .5], .012, carapace, .006); return { l, s, i }; }));
  const thread = part(g, new THREE.CylinderGeometry(.004, .004, 1, 4), lit(0xe8e4f0, .6), [0, 1.1, -.05]);
  return { group: g, shadow: .4, idle: t => {
    body.position.y = .55 + Math.sin(t * 1.4) * .06; body.rotation.y = Math.sin(t * .8) * .4; thread.scale.y = 1 - (body.position.y - .55);
    legs.forEach(({ l, s, i }) => { l.rotation.z = Math.sin(t * 6 + i) * .15 * s; }); blink(eyes, t, 3);
  } };
}

/** Garth, Hallow: a cloud of fireflies pulsing as one, a brighter queen at its heart with little eyes. */
function fireflyCloud(): Built {
  const g = new THREE.Group(), body = new THREE.Group(); body.position.y = .5; g.add(body);
  const queen = new THREE.Group(); body.add(queen);
  part(queen, sphere(.07, 10, 8), std(0x3a3020), [0, 0, 0], { scale: [1, .9, 1.3] }); part(queen, sphere(.06, 8, 6), lit(H), [0, -.02, -.07]);
  const eyes = bigEyes(queen, .028, .025, .06, .022);
  const wing = shine(0xfff4d0, .45); for (const s of [-1, 1]) part(queen, new THREE.CircleGeometry(.06, 8), wing, [.05 * s, .05, 0], { rot: [-1.2, 0, s * .4], scale: [1, .6, 1] });
  const lightM = lit(H), flies = Array.from({ length: 14 }, () => part(body, sphere(.022, 5, 4), lightM, [0, 0, 0]));
  const haze = glow(H, 1.1, .35); body.add(haze);
  return { group: g, shadow: .5, idle: t => {
    const p = .5 + .5 * Math.sin(t * 2.2); haze.material.opacity = .2 + p * .25; lightM.color.setHex(H).multiplyScalar(.6 + p * .4);
    flies.forEach((f, i) => { const a = t * (.8 + (i % 4) * .2) + i * 1.9, r = .18 + (i % 3) * .07; f.position.set(Math.cos(a) * r, Math.sin(t * 1.7 + i) * .12, Math.sin(a) * r); });
    queen.position.y = Math.sin(t * 2.5) * .03; blink(eyes, t, 3.7);
  } };
}

/** Collapsed crypt, Storm: a crab wearing a shell of rubble, sparks between its claws. */
function rubbleCrab(): Built {
  const g = new THREE.Group(), shellM = std(0x7a7066), stone = std(0x8e857a), claw = std(0xb07a4a), body = new THREE.Group(); g.add(body);
  part(body, sphere(.15, 10, 8), claw, [0, .1, 0], { scale: [1.2, .6, 1] });
  for (const [x, z, r] of [[0, -.04, .13], [-.09, .05, .08], [.1, .03, .09], [.02, .08, .07]] as V3[]) part(body, new THREE.DodecahedronGeometry(r, 0), x ? stone : shellM, [x, .2 + r * .4, z], { rot: [x * 9, z * 7, 0] });
  const eyes = new THREE.Group(); eyes.position.set(0, .16, .13); body.add(eyes);
  for (const s of [-1, 1]) limb(eyes, [.04 * s, 0, 0], [.05 * s, .07, .02], .01, claw);
  const lamps = bigEyes(eyes, .05, .08, .03, .03);
  const claws = [-1, 1].map(s => { const c = new THREE.Group(); c.position.set(.17 * s, .1, .1); body.add(c); limb(c, [0, 0, 0], [.06 * s, .02, .08], .025, claw); part(c, sphere(.05, 8, 6), claw, [.07 * s, .03, .12], { scale: [1, .7, 1.3] }); part(c, sphere(.02, 5, 4), lit(S), [.07 * s, .07, .15]); return c; });
  for (const s of [-1, 1]) for (const z of [-.08, 0, .06]) limb(body, [.12 * s, .08, z], [.22 * s, 0, z + .02], .012, claw);
  const spark = glow(S, .4, .5); spark.position.set(0, .14, .25); body.add(spark);
  return { group: g, shadow: .55, idle: t => {
    body.position.x = Math.sin(t * 1.5) * .04; claws.forEach((c, i) => { c.rotation.y = Math.sin(t * 3 + i * Math.PI) * .25; });
    spark.material.opacity = Math.floor(t * 9) % 4 === 0 ? .8 : .2; blink(lamps, t, 3.5);
  } };
}

/** Anywhere, Umbral: a ball of dust with eyes, rolling, a dark wisp trailing behind it. */
function dustPuff(): Built {
  const g = new THREE.Group(), dust = std(0x8a8090, { roughness: 1 }), body = new THREE.Group(); g.add(body);
  part(body, sphere(.15, 10, 8), dust, [0, .15, 0]);
  const tufts = Array.from({ length: 10 }, (_, i) => { const a = i * 2.4, b = (i % 3) * .5 + .3; return part(body, sphere(.06, 6, 5), dust, [Math.cos(a) * Math.sin(b) * .15, .15 + Math.cos(b) * .15, Math.sin(a) * Math.sin(b) * .15]); });
  const eyes = bigEyes(body, .055, .18, .13, .045);
  const wisp = [0, 1, 2].map(i => part(g, sphere(.05 - i * .012, 6, 5), shine(U, .35 - i * .08), [0, .14, -.18 - i * .1]));
  return { group: g, shadow: .45, idle: t => {
    body.position.y = Math.abs(Math.sin(t * 6)) * .03; tufts.forEach((f, i) => { f.scale.setScalar(.9 + Math.sin(t * 5 + i) * .15); });
    wisp.forEach((w, i) => { w.position.x = Math.sin(t * 3 - i) * .05; }); blink(eyes, t, 2.9);
  } };
}

/** Frozen rooms, Frost: a white hare with ice-blue eyes and long ears, a frost crystal in its scruff. */
function frostHare(): Built {
  const g = new THREE.Group(), fur = std(0xf2f4f8), shade = std(0xd4dce6), inner = std(0xc8d8f0), body = new THREE.Group(); g.add(body);
  part(body, sphere(.15, 12, 10), fur, [0, .17, -.04], { scale: [.9, .95, 1.15] });
  part(body, sphere(.07, 8, 6), fur, [0, .16, -.2]);
  for (const s of [-1, 1]) part(body, sphere(.06, 8, 6), shade, [.09 * s, .05, -.06], { scale: [1, .6, 1.8] });
  const head = new THREE.Group(); head.position.set(0, .3, .1); body.add(head);
  part(head, sphere(.11, 12, 10), fur, [0, 0, 0], { scale: [1, .95, 1.05] });
  const ears = [-1, 1].map(s => { const e = new THREE.Group(); e.position.set(.05 * s, .08, -.03); head.add(e); part(e, sphere(.04, 8, 6), fur, [0, .12, 0], { scale: [1, 3.2, .5] }); part(e, sphere(.025, 6, 5), inner, [0, .12, .015], { scale: [1, 3, .4] }); return e; });
  const eyes = bigEyes(head, .05, .02, .08, .04, 0x1a3a60);
  part(head, sphere(.018, 5, 4), std(0xe0a0b0), [0, -.03, .11]);
  crystal(body, F, [0, .3, -.12], .1, [-.4, 0, 0]);
  return { group: g, shadow: .45, idle: t => {
    const k = t * .9 % 1, hop = k < .3 ? Math.sin(k / .3 * Math.PI) : 0; body.position.y = hop * .1;
    ears.forEach((e, i) => { e.rotation.x = -.2 + Math.sin(t * 2.6 + i) * .15; }); head.rotation.y = Math.sin(t * 1.3) * .3; blink(eyes, t, 3.6);
  } };
}

/** Grotto, Umbral: a small Sporeling, round as a puffball, swelling before it bursts. */
function puffcap(): Built {
  const g = new THREE.Group(), stem = std(0xe8dcc6), cap = std(0x7a4a9a), body = new THREE.Group(); g.add(body);
  part(body, sphere(.09, 10, 8), stem, [0, .09, 0], { scale: [1, 1.1, 1] });
  const ball = new THREE.Group(); ball.position.y = .25; body.add(ball);
  part(ball, sphere(.16, 14, 12), cap, [0, 0, 0]);
  for (let i = 0; i < 9; i++) { const a = i * 2.4, b = (i % 3) * .4 + .4; part(ball, sphere(.022, 6, 4), lit(U), [Math.cos(a) * Math.sin(b) * .16, Math.cos(b) * .16, Math.sin(a) * Math.sin(b) * .16]); }
  const eyes = bigEyes(body, .045, .1, .08, .036);
  smile(body, [0, .055, .09], .02);
  return { group: g, shadow: .4, idle: t => {
    const swell = (Math.sin(t * 1.8) + 1) / 2; ball.scale.setScalar(1 + swell * .18); body.position.y = Math.abs(Math.sin(t * 3)) * .015; blink(eyes, t, 3.2);
  } };
}

/** Burning floor, Ember: a striped wasp with ember wings, out of a nest of paper set in a wall. */
function emberWasp(): Built {
  const g = new THREE.Group(), stripe = std(0x2a1a10), amber = std(0xd88a2a), body = new THREE.Group(); body.position.y = .62; g.add(body);
  part(body, sphere(.08, 10, 8), amber, [0, 0, .05]);
  const abdomen = new THREE.Group(); abdomen.position.set(0, -.02, -.1); body.add(abdomen);
  part(abdomen, sphere(.09, 10, 8), amber, [0, 0, 0], { scale: [1, .9, 1.4] });
  for (const z of [.03, -.05]) part(abdomen, new THREE.TorusGeometry(.085, .018, 4, 12), stripe, [0, 0, z], { scale: [1, .9, 1] });
  part(abdomen, new THREE.ConeGeometry(.02, .07, 5), stripe, [0, 0, -.14], { rot: [-Math.PI / 2, 0, 0] });
  const head = new THREE.Group(); head.position.set(0, .03, .14); body.add(head);
  part(head, sphere(.07, 10, 8), amber, [0, 0, 0]);
  const eyes = bigEyes(head, .04, .02, .05, .032);
  for (const s of [-1, 1]) limb(head, [.02 * s, .05, 0], [.06 * s, .12, .04], .006, stripe);
  const wing = shine(E, .55), wings = [-1, 1].map(s => part(body, new THREE.CircleGeometry(.1, 8), wing, [.08 * s, .07, -.02], { rot: [-1.3, 0, s * .5], scale: [1, .55, 1] }));
  const heat = glow(E, .6, .4); heat.position.z = -.1; body.add(heat);
  return { group: g, shadow: .35, idle: t => {
    body.position.y = .62 + Math.sin(t * 4) * .04; wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (.3 + Math.abs(Math.sin(t * 28)) * .6); });
    abdomen.rotation.x = Math.sin(t * 3) * .12; blink(eyes, t, 3.1);
  } };
}

/** Drowned floor, Frost: a clear little newt, cold to the touch, a blue glow where its heart is. */
function glassNewt(): Built {
  const g = new THREE.Group(), glass = std(0xd8f0ff, { roughness: .1, transparent: true, opacity: .7 }), rim = std(0x9ac8e8), body = new THREE.Group(); g.add(body);
  part(body, sphere(.09, 10, 8), glass, [0, .07, 0], { scale: [1, .65, 2.2] });
  part(body, sphere(.035, 6, 5), lit(F), [0, .08, .02]);
  const head = new THREE.Group(); head.position.set(0, .08, .22); body.add(head);
  part(head, sphere(.07, 10, 8), glass, [0, 0, 0], { scale: [1.1, .75, 1.1] });
  const eyes = bigEyes(head, .045, .035, .03, .032, 0x123a5a);
  smile(head, [0, -.01, .07], .022);
  const tail = new THREE.Group(); tail.position.set(0, .07, -.18); body.add(tail);
  limb(tail, [0, 0, 0], [.04, 0, -.18], .04, glass, .01);
  const legs = [[1, .1], [-1, .1], [1, -.1], [-1, -.1]].map(([s, z]) => { const l = new THREE.Group(); l.position.set(.08 * s, .05, z); body.add(l); limb(l, [0, 0, 0], [.07 * s, -.04, .03], .015, rim); return l; });
  return { group: g, shadow: .4, idle: t => {
    tail.rotation.y = Math.sin(t * 3) * .4; head.rotation.y = Math.sin(t * 1.4) * .2;
    legs.forEach((l, i) => { l.rotation.y = Math.sin(t * 3 + i * 1.6) * .25; }); blink(eyes, t, 4.2);
  } };
}

/* ---------- fantasy creatures ---------- */

/** Crypt, Umbral: a small lizard with a crest of violet spines and a heavy-lidded stare that slows what it fixes. */
function basiliskHatchling(): Built {
  const g = new THREE.Group(), scale = std(0x4a6a4a), belly = std(0xb8c8a0), body = new THREE.Group(); g.add(body);
  part(body, sphere(.12, 10, 8), scale, [0, .1, -.02], { scale: [1, .75, 1.6] });
  part(body, sphere(.09, 8, 6), belly, [0, .07, .04], { scale: [1, .5, 1.4] });
  const head = new THREE.Group(); head.position.set(0, .15, .2); body.add(head);
  part(head, sphere(.09, 10, 8), scale, [0, 0, 0], { scale: [1, .85, 1.2] });
  for (let i = 0; i < 4; i++) part(head, new THREE.ConeGeometry(.02, .1 - i * .015, 4), lit(U), [0, .07 - i * .005, -.02 - i * .05], { rot: [-.6, 0, 0] }); // (its crest)
  const lids = new THREE.Group(); lids.position.set(0, .03, .07); head.add(lids);
  const eyes = bigEyes(lids, .045, 0, 0, .036, 0x3a0a4a);
  for (const s of [-1, 1]) part(lids, sphere(.04, 8, 6), scale, [.045 * s, .025, 0], { scale: [1.1, .5, 1.1] }); // (heavy lids)
  const stare = glow(U, .5, 0); stare.position.set(0, .03, .14); head.add(stare);
  const tail = new THREE.Group(); tail.position.set(0, .09, -.2); body.add(tail);
  limb(tail, [0, 0, 0], [0, .02, -.22], .05, scale, .01);
  for (const s of [-1, 1]) for (const z of [.1, -.1]) limb(body, [.09 * s, .06, z], [.15 * s, 0, z + .03], .02, scale);
  return { group: g, shadow: .45, idle: t => {
    tail.rotation.y = Math.sin(t * 2) * .35; head.rotation.y = Math.sin(t * .8) * .3; stare.material.opacity = Math.max(0, Math.sin(t * .9)) * .6; blink(eyes, t, 5);
  } };
}

/** Library, Umbral: a book that flaps and bites, its pages for teeth, a violet eye on its cover. */
function grimoireMimic(): Built {
  const g = new THREE.Group(), leather = std(0x5a2a3a), page = std(0xece2c8), gilt = std(0xc89a48, { metalness: .4, roughness: .5 }), book = new THREE.Group(); book.position.y = .35; g.add(book);
  const lower = new THREE.Group(), upper = new THREE.Group(); book.add(lower); upper.position.set(0, 0, -.12); book.add(upper);
  part(lower, box(.32, .03, .24), leather, [0, -.02, 0]); part(lower, box(.3, .04, .22), page, [0, .015, 0]);
  part(upper, box(.32, .03, .24), leather, [0, .02, .12]); part(upper, box(.3, .04, .22), page, [0, -.015, .12]);
  part(upper, box(.06, .006, .06), gilt, [0, .037, .12], { rot: [0, Math.PI / 4, 0] });
  for (let i = 0; i < 6; i++) { part(lower, new THREE.ConeGeometry(.012, .05, 4), page, [-.12 + i * .048, .05, .11]); part(upper, new THREE.ConeGeometry(.012, .05, 4), page, [-.12 + i * .048, -.05, .23], { rot: [Math.PI, 0, 0] }); }
  const eye = new THREE.Group(); eye.position.set(0, .05, .15); upper.add(eye);
  const eyes = bigEyes(eye, 0, 0, 0, .045, 0x3a0a4a);
  part(book, box(.04, .07, .26), leather, [0, 0, -.12]); // (the spine)
  const loose = [0, 1].map(i => part(g, box(.08, .002, .1), page, [.2 - i * .4, .2, -.1]));
  return { group: g, shadow: .45, parts: { upper }, idle: t => {
    upper.rotation.x = -.15 - Math.abs(Math.sin(t * 2.6)) * .5; book.position.y = .35 + Math.abs(Math.sin(t * 2.6)) * .05;
    loose.forEach((l, i) => { l.position.y = .15 + Math.sin(t * 1.5 + i * 2) * .08; l.rotation.z = Math.sin(t * 2 + i) * .6; }); blink(eyes, t, 3.4);
  } };
}

/** Drowned floor, Frost: a sea-serpent's young coiled up out of a pool, a frill of ice-blue fins, spitting cold. */
function brineSerpent(): Built {
  const g = new THREE.Group(), skin = std(0x2a6a7a), belly = std(0xa8d8d0), fin = shine(F, .55), body = new THREE.Group(); g.add(body);
  part(g, new THREE.CircleGeometry(.32, 20), std(0x1e4a5a, { roughness: .2 }), [0, .01, 0], { rot: [-Math.PI / 2, 0, 0] }); // (its pool)
  const neck: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) neck.push(part(body, sphere(.09 - i * .005, 10, 8), i % 2 ? skin : belly, [0, .06 + i * .09, 0]));
  const head = new THREE.Group(); head.position.set(0, .6, .05); body.add(head);
  part(head, sphere(.1, 10, 8), skin, [0, 0, 0], { scale: [1, .85, 1.3] });
  part(head, sphere(.06, 8, 6), belly, [0, -.04, .08], { scale: [1, .6, 1.2] });
  const eyes = bigEyes(head, .055, .04, .07, .04, 0x0a2a3a);
  for (const s of [-1, 1]) part(head, new THREE.ConeGeometry(.06, .16, 4), fin, [.09 * s, .02, -.02], { rot: [0, 0, -s * 1.2], scale: [1, 1, .3] });
  const ripple = part(g, new THREE.RingGeometry(.28, .32, 24), shine(F, .4), [0, .015, 0], { rot: [-Math.PI / 2, 0, 0] });
  return { group: g, shadow: .5, idle: t => {
    neck.forEach((n, i) => { n.position.x = Math.sin(t * 1.6 - i * .5) * .03 * i; }); head.position.x = Math.sin(t * 1.6 - 3) * .18; head.rotation.y = Math.sin(t * 1.1) * .3;
    ripple.scale.setScalar(1 + (t * .5 % 1) * .3); ripple.material.opacity = .4 * (1 - t * .5 % 1); blink(eyes, t, 3.8);
  } };
}

/** Burning floor, Ember (elite): a phoenix chick, round and downy, its crest and tail feathers already afire. */
function phoenixChick(): Built {
  const g = new THREE.Group(), down = std(0xf0a040), deep = std(0xc85a1a), beak = std(0xf0d070), body = new THREE.Group(); g.add(body);
  part(body, sphere(.2, 14, 12), down, [0, .24, 0]);
  part(body, sphere(.13, 10, 8), std(0xf8d080), [0, .2, .1], { scale: [1, 1, .6] });
  const wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.set(.18 * s, .26, -.02); body.add(w); part(w, sphere(.1, 8, 6), deep, [.03 * s, -.02, 0], { scale: [.5, 1, .9] }); return w; });
  const eyes = bigEyes(body, .07, .32, .15, .05, 0x3a1a08);
  part(body, new THREE.ConeGeometry(.03, .07, 5), beak, [0, .26, .2], { rot: [Math.PI / 2, 0, 0] });
  const crest = [0, 1, 2].map(i => part(body, new THREE.ConeGeometry(.03, .14, 5), lit(i === 1 ? 0xffd070 : E), [(i - 1) * .05, .48, -.02], { rot: [-.2, 0, (i - 1) * -.4] }));
  const tail = [0, 1, 2].map(i => part(body, new THREE.ConeGeometry(.035, .2, 5), lit(i === 1 ? 0xffd070 : E), [(i - 1) * .06, .22, -.24], { rot: [-2, 0, (i - 1) * .4] }));
  for (const s of [-1, 1]) part(body, sphere(.035, 6, 4), beak, [.07 * s, .03, .05], { scale: [1, .5, 1.5] });
  const heat = glow(E, 1, .45); heat.position.y = .3; body.add(heat);
  const embers = motes(g, E, 5, .3, .6, .018);
  return { group: g, shadow: .55, idle: t => {
    wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.max(0, Math.sin(t * 3)) * .4; });
    [...crest, ...tail].forEach((f, i) => { f.scale.set(1, .8 + Math.sin(t * 14 + i) * .2, 1); }); heat.material.opacity = .4 + Math.sin(t * 9) * .08; embers(t, .7); blink(eyes, t, 3.3);
  } };
}

/** Burning floor, Storm (elite): a griffin fledgling, an eaglet's head on a lion cub's body, storm-gold on its wing tips. */
function griffinFledgling(): Built {
  const g = new THREE.Group(), fur = std(0xc8a070), feather = std(0xf0ece0), beak = std(0xe0b040), body = new THREE.Group(); g.add(body);
  part(body, sphere(.17, 12, 10), fur, [0, .22, -.06], { scale: [.9, .85, 1.3] });
  for (const s of [-1, 1]) for (const z of [.1, -.18]) part(body, sphere(.05, 6, 5), fur, [.09 * s, .05, z], { scale: [1, 1.4, 1] });
  const tail = new THREE.Group(); tail.position.set(0, .22, -.26); body.add(tail); limb(tail, [0, 0, 0], [0, .1, -.15], .015, fur); part(tail, sphere(.035, 6, 5), fur, [0, .11, -.16]);
  const head = new THREE.Group(); head.position.set(0, .4, .12); body.add(head);
  part(head, sphere(.12, 12, 10), feather, [0, 0, 0]);
  part(head, new THREE.ConeGeometry(.04, .1, 5), beak, [0, -.02, .12], { rot: [Math.PI / 2 + .3, 0, 0] });
  const eyes = bigEyes(head, .055, .03, .09, .042, 0x2a1a08);
  for (const s of [-1, 1]) part(head, new THREE.ConeGeometry(.03, .1, 4), feather, [.07 * s, .1, -.04], { rot: [-.4, 0, -s * .4] });
  const wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.set(.12 * s, .3, -.04); body.add(w); part(w, sphere(.12, 8, 6), feather, [.08 * s, .02, -.02], { scale: [.9, .35, .8] }); part(w, new THREE.ConeGeometry(.04, .1, 4), lit(S), [.18 * s, .03, -.06], { rot: [0, 0, -s * Math.PI / 2] }); return w; });
  return { group: g, shadow: .6, idle: t => {
    wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (.2 + Math.max(0, Math.sin(t * 2.2)) * .6); }); head.rotation.y = Math.sin(t * 1.2) * .35; tail.rotation.y = Math.sin(t * 2.5) * .4; blink(eyes, t, 3.9);
  } };
}

/** Anywhere, Umbral: a fox of shadow, darker than the room, with violet eyes, that blinks from shadow to shadow. */
function shadowFox(): Built {
  const g = new THREE.Group(), coat = std(0x241e34), deep = std(0x140f20), body = new THREE.Group(); g.add(body);
  part(body, sphere(.13, 12, 10), coat, [0, .2, -.04], { scale: [.8, .85, 1.5] });
  for (const [x, z] of [[.06, .1], [-.06, .1], [.06, -.16], [-.06, -.16]]) limb(body, [x, .14, z], [x, 0, z], .025, deep, .02);
  const head = new THREE.Group(); head.position.set(0, .3, .18); body.add(head);
  part(head, sphere(.09, 10, 8), coat, [0, 0, 0]); part(head, new THREE.ConeGeometry(.05, .14, 6), coat, [0, -.02, .1], { rot: [Math.PI / 2, 0, 0] });
  for (const s of [-1, 1]) part(head, new THREE.ConeGeometry(.04, .12, 4), deep, [.05 * s, .1, -.02]);
  const eyes = bigEyes(head, .045, .02, .06, .034, 0x5a1a8a);
  const tail = [0, 1, 2, 3].map(i => part(body, sphere(.06 - i * .008, 8, 6), shine(U, .55 - i * .1), [0, .26 + i * .05, -.26 - i * .08]));
  const veil = glow(0x1a1028, 1, .5); veil.position.y = .2; body.add(veil);
  return { group: g, shadow: .5, idle: t => {
    const flick = Math.sin(t * 1.1) > .93 ? .3 : 1; body.scale.setScalar(flick > .5 ? 1 : .96); veil.material.opacity = .5 * flick;
    tail.forEach((p, i) => { p.position.x = Math.sin(t * 2.4 - i * .6) * .04 * i; }); head.rotation.y = Math.sin(t * .9) * .3; blink(eyes, t, 4.4);
  } };
}

/** Bell chamber, Storm: a harpy chick, a round grey owlet's body with a sharp little face and storm-gold flight feathers. */
function harpyChick(): Built {
  const g = new THREE.Group(), plume = std(0x8a8a9a), face = std(0xd8d0c4), talon = std(0x3a3030), body = new THREE.Group(); body.position.y = .5; g.add(body);
  part(body, sphere(.16, 12, 10), plume, [0, 0, 0], { scale: [1, 1.1, 1] });
  part(body, sphere(.1, 10, 8), face, [0, .08, .1], { scale: [1, 1, .5] });
  const eyes = bigEyes(body, .045, .1, .15, .036, 0x1a1408);
  part(body, new THREE.ConeGeometry(.02, .05, 4), std(0xc8a040), [0, .05, .17], { rot: [Math.PI / 2 + .3, 0, 0] });
  for (const s of [-1, 1]) part(body, new THREE.ConeGeometry(.03, .1, 4), plume, [.06 * s, .2, 0], { rot: [0, 0, -s * .3] });
  const wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.set(.14 * s, .02, 0); body.add(w); part(w, sphere(.12, 8, 6), plume, [.08 * s, 0, 0], { scale: [1, .3, .7] }); for (let i = 0; i < 3; i++) part(w, new THREE.ConeGeometry(.02, .1, 4), lit(S), [(.16 + i * .03) * s, -.02, -.04 + i * .04], { rot: [0, 0, -s * Math.PI / 2] }); return w; });
  for (const s of [-1, 1]) limb(body, [.05 * s, -.14, .02], [.06 * s, -.26, .06], .015, talon);
  return { group: g, shadow: .4, idle: t => {
    body.position.y = .5 + Math.sin(t * 3.4) * .05; wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(t * 9) * .7; }); blink(eyes, t, 3);
  } };
}

/** Embalmers' hall, Frost: a small golem of salt and wax, a dripping candle for a heart, slow and heavy. */
function saltGolemling(): Built {
  const g = new THREE.Group(), salt = std(0xece8e0, { roughness: 1 }), wax = std(0xf0dcb0), body = new THREE.Group(); g.add(body);
  part(body, new THREE.DodecahedronGeometry(.17, 1), salt, [0, .28, 0], { scale: [1, 1.05, .85] });
  part(body, new THREE.DodecahedronGeometry(.1, 0), salt, [0, .5, .02]);
  const eyes = bigEyes(body, .04, .51, .1, .03, 0x2a3a5a);
  const arms = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(.17 * s, .36, 0); body.add(a); part(a, new THREE.DodecahedronGeometry(.07, 0), salt, [.04 * s, -.08, .02]); part(a, new THREE.DodecahedronGeometry(.06, 0), wax, [.05 * s, -.18, .05]); return a; });
  for (const s of [-1, 1]) part(body, new THREE.DodecahedronGeometry(.07, 0), wax, [.08 * s, .07, 0]);
  part(body, new THREE.CylinderGeometry(.03, .035, .08, 7), wax, [0, .32, .14]); const heart = part(body, new THREE.ConeGeometry(.02, .05, 6), lit(F), [0, .38, .14]);
  for (let i = 0; i < 4; i++) part(body, sphere(.012, 4, 3), shine(F, .7), [Math.sin(i * 1.7) * .14, .3 + (i % 2) * .1, Math.cos(i * 1.7) * .1]);
  return { group: g, shadow: .55, idle: t => {
    body.rotation.z = Math.sin(t * 1.2) * .04; arms.forEach((a, i) => { a.rotation.x = Math.sin(t * 1.2 + i * Math.PI) * .2; }); heart.scale.set(1, .8 + Math.sin(t * 11) * .2, 1); blink(eyes, t, 4.6);
  } };
}

/* ---------- elementals (each made of its element: the room answers to it) ---------- */

/** Ember: a flicker of flame with eyes, flitting about. */
function cinderSprite(): Built {
  const g = new THREE.Group(), body = new THREE.Group(); body.position.y = .5; g.add(body);
  const core = part(body, sphere(.1, 10, 8), lit(0xffd070), [0, 0, 0]);
  const tongues = [0, 1, 2, 3, 4].map(i => part(body, new THREE.ConeGeometry(.06 - i * .006, .2 - i * .02, 6), lit(i % 2 ? E : 0xff9a3a), [Math.sin(i * 2.5) * .04, .1, Math.cos(i * 2.5) * .04], { rot: [Math.cos(i * 2.5) * .3, 0, -Math.sin(i * 2.5) * .3] }));
  const eyes = bigEyes(body, .035, .01, .08, .028, 0x3a1000);
  const heat = glow(E, .9, .55); body.add(heat);
  const sparks = motes(g, 0xffb050, 4, .2, .7, .015);
  return { group: g, shadow: .35, idle: t => {
    body.position.set(Math.sin(t * 1.7) * .06, .5 + Math.sin(t * 2.9) * .05, 0); tongues.forEach((f, i) => { f.scale.set(1, .75 + Math.sin(t * 15 + i * 1.3) * .25, 1); });
    core.scale.setScalar(.9 + Math.sin(t * 11) * .1); heat.material.opacity = .45 + Math.sin(t * 13) * .1; sparks(t, 1.4); blink(eyes, t, 2.8);
  } };
}

/** Ember: a blob of molten rock, crusted dark, glowing through its cracks; struck, it splits. */
function magmaBlob(): Built {
  const g = new THREE.Group(), crust = std(0x3a2620, { roughness: .9 }), body = new THREE.Group(); g.add(body);
  part(body, sphere(.2, 12, 10), lit(0xff6a1a), [0, .17, 0], { scale: [1.15, .8, 1.1] });
  for (let i = 0; i < 9; i++) { const a = i * 2.4, b = (i % 3) * .45 + .35; part(body, new THREE.DodecahedronGeometry(.07, 0), crust, [Math.cos(a) * Math.sin(b) * .2, .17 + Math.cos(b) * .14, Math.sin(a) * Math.sin(b) * .19], { rot: [a, b, 0] }); }
  const eyes = bigEyes(body, .06, .24, .17, .04, 0x2a0800);
  const pool = part(g, new THREE.CircleGeometry(.24, 16), shine(E, .4), [0, .01, 0], { rot: [-Math.PI / 2, 0, 0] });
  return { group: g, shadow: .55, idle: t => {
    const w = Math.sin(t * 2.2); body.scale.set(1 + w * .07, 1 - w * .09, 1 + w * .05); pool.material.opacity = .3 + Math.sin(t * 3) * .1; blink(eyes, t, 3.4);
  } };
}

/** Ember (elite): a walking brazier of iron, fire in its bowl for a head, coals for eyes; frost must put it out first. */
function hearthGolem(): Built {
  const g = new THREE.Group(), iron = std(0x3a3434, { metalness: .5, roughness: .5 }), rust = std(0x6a3a22), body = new THREE.Group(); g.add(body);
  part(body, new THREE.CylinderGeometry(.22, .17, .34, 10), iron, [0, .42, 0]);
  for (const y of [.3, .52]) part(body, new THREE.TorusGeometry(.2, .02, 4, 16), rust, [0, y, 0], { rot: [Math.PI / 2, 0, 0] });
  const bowl = new THREE.Group(); bowl.position.y = .64; body.add(bowl);
  part(bowl, new THREE.CylinderGeometry(.26, .18, .14, 12, 1, true), iron, [0, 0, 0]);
  part(bowl, sphere(.2, 10, 6), lit(0xff7a2a), [0, .03, 0], { scale: [1, .3, 1] });
  const flames = [0, 1, 2, 3, 4, 5].map(i => part(bowl, new THREE.ConeGeometry(.06, .3 - (i % 3) * .06, 6), lit(i % 2 ? E : 0xffc050), [Math.cos(i) * .12, .18, Math.sin(i) * .12]));
  for (const s of [-1, 1]) part(body, sphere(.035, 6, 5), lit(0xffd070), [.08 * s, .48, .17]);
  const legs = [-1, 1].map(s => { const l = new THREE.Group(); l.position.set(.1 * s, .27, 0); body.add(l); limb(l, [0, 0, 0], [.04 * s, -.27, .03], .05, iron, .04); return l; });
  const arms = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(.23 * s, .5, 0); body.add(a); limb(a, [0, 0, 0], [.08 * s, -.22, .06], .04, iron); part(a, sphere(.05, 6, 5), rust, [.09 * s, -.24, .07]); return a; });
  const heat = glow(E, 1.4, .5); heat.position.y = .8; body.add(heat);
  return { group: g, shadow: .75, idle: t => {
    flames.forEach((f, i) => { f.scale.set(1, .8 + Math.sin(t * 12 + i * 1.7) * .2, 1); }); heat.material.opacity = .45 + Math.sin(t * 8) * .1;
    legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 2 + i * Math.PI) * .15; }); arms.forEach((a, i) => { a.rotation.x = Math.sin(t * 2 + i * Math.PI + 1) * .2; });
  } };
}

/** Frost: a snowball with a face, a twig of a nose and a sprig of frost on top; it grows as it rolls. */
function snowballSprite(): Built {
  const g = new THREE.Group(), snow = std(0xf4f8ff, { roughness: 1 }), body = new THREE.Group(); g.add(body);
  part(body, new THREE.IcosahedronGeometry(.18, 1), snow, [0, .18, 0]);
  const eyes = bigEyes(body, .06, .22, .15, .042, 0x1a3a60);
  part(body, new THREE.ConeGeometry(.02, .08, 5), std(0x8a5a3a), [0, .17, .19], { rot: [Math.PI / 2, 0, 0] });
  crystal(body, F, [0, .38, 0], .1); crystal(body, F, [.05, .35, 0], .07, [0, 0, -.6]); crystal(body, F, [-.05, .35, 0], .07, [0, 0, .6]);
  const flakes = motes(g, 0xe8f6ff, 5, .28, .3, .016);
  return { group: g, shadow: .45, idle: t => { body.rotation.x = Math.sin(t * 2) * .12; body.position.y = Math.abs(Math.sin(t * 4)) * .02; flakes(t, .6); blink(eyes, t, 3.5); } };
}

/** Frost (elite): a golem of glacier ice, slow, blocking bolts; storm on it while it is frozen shatters it. */
function glacierGolem(): Built {
  const g = new THREE.Group(), ice = std(0xbfe0f4, { roughness: .15, metalness: .1 }), deep = std(0x7aa8c8, { roughness: .2 }), body = new THREE.Group(); g.add(body);
  part(body, new THREE.DodecahedronGeometry(.3, 0), ice, [0, .5, 0], { scale: [1, 1.1, .8] });
  part(body, new THREE.DodecahedronGeometry(.16, 0), ice, [0, .9, .03]);
  for (const s of [-1, 1]) { part(body, new THREE.DodecahedronGeometry(.13, 0), deep, [.32 * s, .55, 0]); part(body, new THREE.DodecahedronGeometry(.11, 0), ice, [.34 * s, .3, .06]); part(body, new THREE.DodecahedronGeometry(.12, 0), deep, [.13 * s, .12, 0]); }
  for (const s of [-1, 1]) part(body, sphere(.035, 6, 5), lit(F), [.06 * s, .92, .14]);
  crystal(body, F, [-.12, 1.02, -.04], .16, [0, 0, .4]); crystal(body, F, [.1, 1.04, -.02], .2, [0, 0, -.3]); crystal(body, F, [.2, .78, -.12], .14, [0, 0, -.8]);
  const cold = glow(F, 1.4, .3); cold.position.y = .6; body.add(cold);
  return { group: g, shadow: .85, idle: t => { body.rotation.z = Math.sin(t * .9) * .03; body.position.y = Math.abs(Math.sin(t * .9)) * .02; cold.material.opacity = .25 + Math.sin(t * 1.5) * .08; } };
}

/** Storm: a zigzag of a spark with eyes that zips in straight lines, turning at walls. */
function sparkSprite(): Built {
  const g = new THREE.Group(), body = new THREE.Group(); body.position.y = .45; g.add(body);
  part(body, new THREE.OctahedronGeometry(.1), lit(0xfff6c0), [0, 0, 0], { scale: [1, 1.3, 1] });
  const arcs = [0, 1, 2].map(i => { const a = new THREE.Group(); body.add(a); a.rotation.y = i * 2.1; for (let k = 0; k < 3; k++) part(a, box(.015, .1, .015), lit(S), [.1 + k * .05, (k % 2 ? .04 : -.04), 0], { rot: [0, 0, k % 2 ? .8 : -.8] }); return a; });
  const eyes = bigEyes(body, .035, .02, .08, .026, 0x3a3000);
  const crackle = glow(S, .8, .6); body.add(crackle);
  return { group: g, shadow: .3, idle: t => {
    arcs.forEach((a, i) => { a.rotation.y = i * 2.1 + t * 5; a.visible = Math.floor(t * 12 + i) % 3 !== 0; }); crackle.material.opacity = .4 + (Math.floor(t * 10) % 2) * .3;
    body.position.x = Math.round(Math.sin(t * .8) * 3) * .03; blink(eyes, t, 2.7);
  } };
}

/** Storm: a small storm-cloud with a sulking face, raining sparks on what lies under it. */
function thunderhead(): Built {
  const g = new THREE.Group(), cloud = std(0x6a6a80, { roughness: 1 }), dark = std(0x4a4a5e), body = new THREE.Group(); body.position.y = .9; g.add(body);
  for (const [x, y, z, r] of [[0, 0, 0, .18], [-.16, -.03, 0, .13], [.16, -.02, 0, .14], [.06, .1, -.04, .12], [-.08, .08, .02, .1]] as [number, number, number, number][]) part(body, sphere(r, 10, 8), y < 0 ? dark : cloud, [x, y, z]);
  const eyes = bigEyes(body, .06, 0, .16, .036, 0x1a1a2a);
  part(body, box(.1, .012, .01), lit(0x2a1a1a), [0, -.07, .17]); // (a frown)
  const rain = [0, 1, 2, 3, 4].map(i => part(g, box(.012, .12, .012), lit(i % 2 ? S : 0xc8d8ff), [(i - 2) * .07, .6, (i % 2) * .05]));
  const bolt = new THREE.Group(); bolt.position.y = .55; g.add(bolt); for (let k = 0; k < 3; k++) part(bolt, box(.02, .14, .02), lit(S), [k % 2 ? .03 : -.03, -k * .12, 0], { rot: [0, 0, k % 2 ? .5 : -.5] });
  return { group: g, shadow: .55, idle: t => {
    body.position.y = .9 + Math.sin(t * 1.4) * .04; rain.forEach((r, i) => { r.position.y = .7 - ((t * 1.4 + i * .23) % 1) * .65; }); bolt.visible = Math.sin(t * 2.3) > .92; blink(eyes, t, 3.9);
  } };
}

/** Storm: a golem of lodestone, iron filings bristling on it, that bends the mage's bolts towards itself. */
function lodestoneGolem(): Built {
  const g = new THREE.Group(), stone = std(0x3a3a46, { metalness: .4, roughness: .5 }), rust = std(0x7a4a2a), body = new THREE.Group(); g.add(body);
  part(body, new THREE.DodecahedronGeometry(.22, 0), stone, [0, .4, 0], { scale: [1, 1.15, .85] });
  part(body, new THREE.DodecahedronGeometry(.12, 0), stone, [0, .72, .02]);
  for (let i = 0; i < 14; i++) { const a = i * 2.4, b = (i % 4) * .35 + .3; part(body, box(.012, .07, .012), rust, [Math.cos(a) * Math.sin(b) * .22, .4 + Math.cos(b) * .24, Math.sin(a) * Math.sin(b) * .2], { rot: [b, a, 0] }); }
  for (const s of [-1, 1]) { part(body, new THREE.DodecahedronGeometry(.1, 0), stone, [.26 * s, .38, .02]); part(body, new THREE.DodecahedronGeometry(.09, 0), stone, [.1 * s, .1, 0]); }
  for (const s of [-1, 1]) part(body, sphere(.03, 6, 5), lit(S), [.05 * s, .74, .11]);
  const field = [0, 1].map(i => part(g, new THREE.TorusGeometry(.38 + i * .1, .008, 4, 28), shine(S, .4), [0, .42, 0], { rot: [Math.PI / 2, 0, 0] }));
  return { group: g, shadow: .65, idle: t => { field.forEach((f, i) => { const k = (t * .6 + i * .5) % 1; f.scale.setScalar(1.2 - k * .5); f.material.opacity = .4 * k; }); body.rotation.y = Math.sin(t * .7) * .15; } };
}

/** Hallow: a wisp of light with an open singing mouth; foes near it strike harder until it is silenced. */
function choirWisp(): Built {
  const g = new THREE.Group(), body = new THREE.Group(); body.position.y = .6; g.add(body);
  part(body, sphere(.12, 12, 10), lit(0xfff4d8), [0, 0, 0], { scale: [1, 1.2, 1] });
  const tail = [0, 1, 2].map(i => part(body, sphere(.08 - i * .02, 8, 6), lit(H, .8 - i * .2), [0, -.13 - i * .07, -.03 * i]));
  const eyes = bigEyes(body, .04, .04, .1, .028, 0x5a4010);
  const mouth = part(body, new THREE.CircleGeometry(.025, 10), lit(0x5a3a10), [0, -.03, .121]);
  const notes = [0, 1, 2].map(() => part(g, new THREE.TorusGeometry(.03, .008, 4, 10), shine(H, .7), [0, 0, 0]));
  const halo = glow(H, 1, .5); body.add(halo);
  return { group: g, shadow: .35, idle: t => {
    body.position.y = .6 + Math.sin(t * 2) * .05; tail.forEach((p, i) => { p.position.x = Math.sin(t * 2.6 - i) * .03 * (i + 1); }); mouth.scale.setScalar(.8 + Math.abs(Math.sin(t * 4)) * .6);
    notes.forEach((n, i) => { const q = (t * .5 + i / 3) % 1; n.position.set(.12 + q * .2, .7 + q * .3, 0); n.material.opacity = .7 * (1 - q); }); halo.material.opacity = .4 + Math.sin(t * 4) * .1; blink(eyes, t, 4);
  } };
}

/** Hallow: an orb of light in rings of gold, one great eye; it flares, blinding for a moment. */
function radiantOrb(): Built {
  const g = new THREE.Group(), body = new THREE.Group(); body.position.y = .65; g.add(body);
  part(body, sphere(.13, 14, 12), lit(0xfff0c0), [0, 0, 0]);
  const rings = [0, 1].map(i => part(body, new THREE.TorusGeometry(.2 + i * .05, .012, 4, 28), std(0xc89a48, { metalness: .5, roughness: .4 }), [0, 0, 0], { rot: [i ? .6 : -.6, 0, i ? .4 : -.4] }));
  const eye = new THREE.Group(); eye.position.z = .1; body.add(eye);
  const eyes = bigEyes(eye, 0, 0, 0, .06, 0x6a4a10);
  const flare = glow(H, 1.6, .3); body.add(flare);
  return { group: g, shadow: .4, idle: t => {
    rings.forEach((r, i) => { r.rotation.y = t * (i ? .8 : -1.1); }); const f = Math.max(0, Math.sin(t * 1.3) - .85) / .15; flare.material.opacity = .3 + f * .6; flare.scale.setScalar(1.6 + f * 1.4);
    body.position.y = .65 + Math.sin(t * 1.6) * .04; blink(eyes, t, 5);
  } };
}

/** Umbral: a sprite of gloom, a wisp of dark with violet eyes, darkening the room round it. */
function gloomSprite(): Built {
  const g = new THREE.Group(), body = new THREE.Group(); body.position.y = .5; g.add(body);
  part(body, sphere(.12, 12, 10), std(0x1a1028), [0, 0, 0]);
  const wisps = [0, 1, 2, 3, 4].map(i => part(body, sphere(.06, 8, 6), shine(0x3a2050, .5), [Math.cos(i * 1.26) * .12, Math.sin(i * 1.26) * .06, Math.sin(i * 1.26) * .12]));
  const eyes = bigEyes(body, .04, .02, .1, .03, 0x5a1a8a);
  const shade = part(g, new THREE.CircleGeometry(.5, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .4, depthWrite: false }), [0, .012, 0], { rot: [-Math.PI / 2, 0, 0] });
  return { group: g, shadow: .3, idle: t => {
    wisps.forEach((w, i) => { const a = i * 1.26 + t * 1.2; w.position.set(Math.cos(a) * .13, Math.sin(t * 2 + i) * .06, Math.sin(a) * .13); }); shade.material.opacity = .3 + Math.sin(t * 1.5) * .08;
    body.position.y = .5 + Math.sin(t * 2.2) * .04; blink(eyes, t, 3.6);
  } };
}

/** Water: a walking pool on the drowned floor, ripples round its feet; frozen, it is ice to stand on. */
function puddleElemental(): Built {
  const g = new THREE.Group(), water = std(0x3a7a9a, { roughness: .15, transparent: true, opacity: .8 }), body = new THREE.Group(); g.add(body);
  part(body, sphere(.17, 12, 10), water, [0, .17, 0], { scale: [1.1, 1, 1] });
  part(body, sphere(.1, 10, 8), water, [0, .38, 0]);
  part(body, sphere(.04, 6, 5), std(0xd8f0ff, { roughness: .1 }), [.06, .42, .06]); // (a highlight)
  const eyes = bigEyes(body, .04, .4, .08, .03, 0x0a2a3a);
  const drops = [0, 1, 2].map(() => part(g, sphere(.025, 6, 5), water, [0, 0, 0]));
  const ripples = [0, 1].map(() => part(g, new THREE.RingGeometry(.2, .24, 20), shine(0x9ad8ff, .4), [0, .012, 0], { rot: [-Math.PI / 2, 0, 0] }));
  return { group: g, shadow: .5, idle: t => {
    const w = Math.sin(t * 2.5); body.scale.set(1 + w * .05, 1 - w * .06, 1 + w * .05);
    drops.forEach((d, i) => { const q = (t * .8 + i / 3) % 1; d.position.set(Math.sin(i * 2) * .18, .3 - q * .3, Math.cos(i * 2) * .18); });
    ripples.forEach((r, i) => { const q = (t * .5 + i * .5) % 1; r.scale.setScalar(.8 + q * .8); r.material.opacity = .4 * (1 - q); }); blink(eyes, t, 3.3);
  } };
}

/** Earth: a golem of rubble stacked into a rough body, a seam of light in its chest; a blast breaks it into rolling stones. */
function rubbleGolem(): Built {
  const g = new THREE.Group(), rock = std(0x8a8070), dark = std(0x5e564a), body = new THREE.Group(); g.add(body);
  const stones: THREE.Mesh[] = [];
  for (const [x, y, z, r] of [[0, .4, 0, .2], [.05, .66, .03, .13], [-.17, .45, .02, .1], [.18, .44, 0, .11], [-.08, .14, 0, .1], [.09, .14, .02, .1], [-.2, .24, .04, .07], [.2, .26, .05, .07]] as [number, number, number, number][]) stones.push(part(body, new THREE.DodecahedronGeometry(r, 0), r > .12 ? rock : dark, [x, y, z], { rot: [x * 7, y * 5, z * 3] }));
  part(body, box(.05, .12, .02), lit(0xe8c890), [0, .42, .19]);
  for (const s of [-1, 1]) part(body, sphere(.028, 6, 5), lit(0xe8c890), [.05 * s + .05, .7, .14]);
  return { group: g, shadow: .6, idle: t => { stones.forEach((st, i) => { st.position.y += Math.sin(t * 1.5 + i) * .0006; }); body.rotation.z = Math.sin(t * 1.1) * .03; } };
}

/** The candidates, by kind, each with its school (the light it carries) and the floor it would live on. */
export const BESTIARY_OPTIONS = [
  { id: 'inkling', kind: 'critter', school: 'umbral', floor: 1, build: inkling },
  { id: 'rimeSnail', kind: 'critter', school: 'frost', floor: 2, build: rimeSnail },
  { id: 'spiderling', kind: 'critter', school: 'umbral', floor: 1, build: spiderling },
  { id: 'fireflyCloud', kind: 'critter', school: 'hallow', floor: 4, build: fireflyCloud },
  { id: 'rubbleCrab', kind: 'critter', school: 'storm', floor: 3, build: rubbleCrab },
  { id: 'dustPuff', kind: 'critter', school: 'umbral', floor: 5, build: dustPuff },
  { id: 'frostHare', kind: 'critter', school: 'frost', floor: 2, build: frostHare },
  { id: 'puffcap', kind: 'critter', school: 'umbral', floor: 2, build: puffcap },
  { id: 'emberWasp', kind: 'critter', school: 'ember', floor: 3, build: emberWasp },
  { id: 'glassNewt', kind: 'critter', school: 'frost', floor: 5, build: glassNewt },
  { id: 'basiliskHatchling', kind: 'creature', school: 'umbral', floor: 1, build: basiliskHatchling },
  { id: 'grimoireMimic', kind: 'creature', school: 'umbral', floor: 3, build: grimoireMimic },
  { id: 'brineSerpent', kind: 'creature', school: 'frost', floor: 2, build: brineSerpent },
  { id: 'phoenixChick', kind: 'creature', school: 'ember', floor: 3, build: phoenixChick },
  { id: 'griffinFledgling', kind: 'creature', school: 'storm', floor: 4, build: griffinFledgling },
  { id: 'shadowFox', kind: 'creature', school: 'umbral', floor: 5, build: shadowFox },
  { id: 'harpyChick', kind: 'creature', school: 'storm', floor: 4, build: harpyChick },
  { id: 'saltGolemling', kind: 'creature', school: 'frost', floor: 3, build: saltGolemling },
  { id: 'cinderSprite', kind: 'elemental', school: 'ember', floor: 3, build: cinderSprite },
  { id: 'magmaBlob', kind: 'elemental', school: 'ember', floor: 3, build: magmaBlob },
  { id: 'hearthGolem', kind: 'elemental', school: 'ember', floor: 4, build: hearthGolem },
  { id: 'snowballSprite', kind: 'elemental', school: 'frost', floor: 2, build: snowballSprite },
  { id: 'glacierGolem', kind: 'elemental', school: 'frost', floor: 5, build: glacierGolem },
  { id: 'sparkSprite', kind: 'elemental', school: 'storm', floor: 4, build: sparkSprite },
  { id: 'thunderhead', kind: 'elemental', school: 'storm', floor: 5, build: thunderhead },
  { id: 'lodestoneGolem', kind: 'elemental', school: 'storm', floor: 4, build: lodestoneGolem },
  { id: 'choirWisp', kind: 'elemental', school: 'hallow', floor: 1, build: choirWisp },
  { id: 'radiantOrb', kind: 'elemental', school: 'hallow', floor: 4, build: radiantOrb },
  { id: 'gloomSprite', kind: 'elemental', school: 'umbral', floor: 5, build: gloomSprite },
  { id: 'puddleElemental', kind: 'elemental', school: 'frost', floor: 2, build: puddleElemental },
  { id: 'rubbleGolem', kind: 'elemental', school: 'storm', floor: 3, build: rubbleGolem },
] as const satisfies readonly { id: string; kind: 'critter' | 'creature' | 'elemental'; school: School; floor: number; build: () => Built }[];
export type BestiaryOptionId = (typeof BESTIARY_OPTIONS)[number]['id'];
