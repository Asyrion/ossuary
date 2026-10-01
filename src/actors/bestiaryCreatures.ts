/* The bestiary's creatures (M4.5): beasts of myth and magic, each built to read at a glance as what it is
   (docs/M4.5-plan.md). Each stands (or hovers) over y = 0 facing +Z and idles; parts a foe's behaviour will move are named
   in `parts`. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, limb, lit, part, shine, sphere, std, type V3 } from '../render/arcane';
import { batWing, featherWing, gloss, joint, slitEyes, spike, thin, tube, type Built } from './beastParts';

const { ember: E, frost: F, storm: S, hallow: H, umbral: U } = SCHOOL_LIGHT;

/** Floor 1, Umbral: a great grimoire that flies on its own covers, its pages grown into teeth, a red ribbon of a tongue
    and an eye that opens on its cover. */
export function grimoireMimic(): Built {
  const g = new THREE.Group(), book = joint(g, [0, .8, 0]), leather = gloss(0x4a1a2c, .55, .15), gilt = gloss(0xc89a44, .3, .75), paper = std(0xe6d8b8), tooth = std(0xf2ead6);
  book.scale.setScalar(1.25);
  const half = (up: 1 | -1) => {
    const h = joint(book, [0, 0, -.33]);
    part(h, new THREE.BoxGeometry(.5, .07, .62), paper, [0, .04 * up, .33]);
    part(h, new THREE.BoxGeometry(.58, .03, .68), leather, [0, .09 * up, .34]);
    for (const s of [-1, 1]) part(h, new THREE.ConeGeometry(.07, .03, 3), gilt, [.25 * s, .1 * up, .63], { rot: [0, s * .8, 0], scale: [1, 1, 1] });
    for (let i = 0; i < 8; i++) spike(h, [-.21 + i * .06, .07 * up * .3, .62], [-.21 + i * .06, -.045 * up, .66], .022, tooth);
    for (let i = 0; i < 3; i++) spike(h, [.24, .07 * up * .3, .5 - i * .14], [.24, -.04 * up, .5 - i * .14], .018, tooth);
    for (let i = 0; i < 3; i++) spike(h, [-.24, .07 * up * .3, .5 - i * .14], [-.24, -.04 * up, .5 - i * .14], .018, tooth);
    return h;
  };
  const upper = half(1), lower = half(-1);
  part(book, new THREE.CylinderGeometry(.075, .075, .6, 8), leather, [0, 0, -.34], { rot: [0, 0, Math.PI / 2] });
  for (const x of [-.18, .18]) part(book, new THREE.TorusGeometry(.078, .012, 4, 10), gilt, [x, 0, -.34], { rot: [0, Math.PI / 2, 0] });
  // the eye on the cover, in a ring of gilt, under a lid of leather
  const eye = joint(upper, [0, .11, .34]);
  part(eye, new THREE.TorusGeometry(.1, .018, 4, 14), gilt, [0, 0, 0], { rot: [Math.PI / 2, 0, 0] });
  part(eye, sphere(.085, 10, 6), lit(0xd7b0ff), [0, 0, 0], { scale: [1.15, .3, .62] });
  part(eye, new THREE.BoxGeometry(.03, .02, .1), lit(0x14081e), [0, .02, 0]);
  const lid = part(eye, sphere(.09, 8, 4, ), leather, [0, .01, -.03], { scale: [1.2, .3, .5] });
  tube(book, [[0, -.02, .12], [0, -.04, .45], [.04, -.16, .62], [.02, -.32, .6], [-.03, -.4, .52]], .032, .02, std(0x8a1a2a), 12, 5);
  const maw = glow(U, .7, .55); maw.position.set(0, 0, .2); book.add(maw);
  const pages = [0, 1, 2].map(() => part(g, new THREE.PlaneGeometry(.16, .2), thin(0xe6d8b8), [0, 0, 0]));
  return { group: g, shadow: .9, parts: { book, upper, lower }, idle: t => {
    const bite = Math.max(0, Math.sin(t * 3.2)); upper.rotation.x = -.18 - bite * .4; lower.rotation.x = .08 + bite * .18;
    book.position.y = .8 + Math.sin(t * 2) * .06; book.rotation.z = Math.sin(t * 1.3) * .08;
    lid.position.z = Math.floor(t / 3.1) % 2 && t % 3.1 < .15 ? .03 : -.03;
    maw.material.opacity = .35 + bite * .4;
    pages.forEach((p, i) => { const a = t * 1.2 + i * 2.1; p.position.set(Math.cos(a) * .7, .6 + Math.sin(t * 2 + i) * .2, Math.sin(a) * .55); p.rotation.set(t * 2 + i, a, t + i); });
  } };
}

/** A pool of dark water `r` across with a ring of ripples, for what rises out of one. */
function pool(parent: THREE.Object3D, r: number) {
  part(parent, new THREE.CircleGeometry(r, 18), std(0x10303a, { roughness: .1, metalness: .3, transparent: true, opacity: .92 }), [0, .008, 0], { rot: [-Math.PI / 2, 0, 0] });
  return [0, 1].map(() => part(parent, new THREE.RingGeometry(.9, 1, 24), shine(0x9fe4ff, .35), [0, .012, 0], { rot: [-Math.PI / 2, 0, 0] }));
}

/** Floor 2, Frost: a sea serpent risen in coils out of a pool, green-scaled and pale-bellied, a frill of ice-blue fins down
    its neck and a fanged, finned head. */
export function brineSerpent(): Built {
  const g = new THREE.Group(), scale = gloss(0x2a5e58, .35, .2), belly = std(0xa8c8b4), fin = thin(0x7fd4ff, { transparent: true, opacity: .8, roughness: .3 }), fang = std(0xf0ece0);
  const ripples = pool(g, .8);
  const body = joint(g, [0, 0, 0]);
  tube(body, [[.5, -.15, -.5], [.6, .25, -.3], [.62, .3, -.05], [.6, -.15, .15]], .12, .09, scale, 10, 7);
  tube(body, [[-.55, -.1, -.1], [-.62, .14, -.32], [-.48, .3, -.5]], .07, .015, scale, 8, 5);
  part(body, new THREE.ConeGeometry(.12, .26, 3), fin, [-.46, .38, -.52], { rot: [-.6, 0, 0], scale: [1, 1, .15] });
  const neck = joint(body, [0, 0, 0]);
  const spine: V3[] = [[0, -.12, -.22], [-.02, .35, -.18], [0, .78, -.05], [.02, 1.02, .14]];
  tube(neck, spine, .17, .11, scale, 12, 8);
  for (let i = 0; i < 6; i++) { const k = i / 6, y = .05 + k * .9, z = -.12 + k * .18; part(neck, sphere(.12 - k * .03, 6, 4), belly, [0, y, z + .1], { scale: [1, .45, .5] }); }
  for (let i = 0; i < 7; i++) { const k = i / 7, y = .15 + k * .85, z = -.32 + k * .32; part(neck, new THREE.ConeGeometry(.07, .2 - k * .05, 3), fin, [0, y, z], { rot: [-.9, 0, 0], scale: [1, 1, .12] }); }
  const head = joint(neck, [.02, 1.05, .18], [.35, 0, 0]);
  part(head, sphere(.14, 10, 8), scale, [0, 0, .06], { scale: [.92, .62, 1.55] });
  const jaw = joint(head, [0, -.05, -.02], [.35, 0, 0]);
  part(jaw, sphere(.11, 8, 6), belly, [0, -.02, .14], { scale: [.85, .35, 1.4] });
  for (const s of [-1, 1]) { spike(head, [.05 * s, -.04, .22], [.045 * s, -.13, .24], .016, fang); spike(jaw, [.04 * s, 0, .22], [.04 * s, .08, .25], .013, fang); }
  slitEyes(head, .09, .06, .12, .042, F, .6, .3);
  for (const s of [-1, 1]) { const f = joint(head, [.12 * s, .02, -.06], [0, .5 * s, 0]); for (let k = 0; k < 3; k++) part(f, new THREE.ConeGeometry(.05, .24, 3), fin, [.06 * s, .02 + k * .05, -.06], { rot: [-1.2 + k * .25, 0, -.9 * s], scale: [1, 1, .15] }); }
  return { group: g, shadow: 0, parts: { neck, head, jaw }, idle: t => {
    neck.rotation.z = Math.sin(t * 1.1) * .06; neck.rotation.x = Math.sin(t * .8) * .04; head.rotation.y = Math.sin(t * .9) * .2;
    jaw.rotation.x = .25 + Math.max(0, Math.sin(t * 1.8)) * .35;
    ripples.forEach((r, i) => { const k = (t * .4 + i / 2) % 1; r.scale.setScalar(.35 + k * .55); (r.material as THREE.MeshBasicMaterial).opacity = .4 * (1 - k); });
  } };
}

/** Floor 3, Ember (elite): a firebird taller than the mage with its wings raised, every feather tipped with flame, a crest
    and a long tail of fire streaming behind. */
export function phoenix(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 1.15, 0]), red = std(0xc8381a), deep = std(0x7a1a10), gold = gloss(0xe8b040, .3, .5), flame = lit(E), hot = lit(0xffd36a);
  part(body, sphere(.22, 10, 8), red, [0, 0, 0], { scale: [.9, .95, 1.55] });
  part(body, sphere(.17, 8, 6), hot, [0, -.06, .1], { scale: [.8, .8, 1.2] });
  const core = glow(E, 1.6, .45); body.add(core);
  const head = joint(body, [0, .2, .3]);
  limb(body, [0, .05, .18], [0, .2, .3], .1, red, .08);
  part(head, sphere(.11, 8, 6), red, [0, 0, 0], { scale: [.9, .95, 1.2] });
  tube(head, [[0, .02, .08], [0, .0, .2], [0, -.07, .26]], .04, .008, gold, 6, 5);
  slitEyes(head, .06, .03, .07, .03, 0xfff0a0, .7, .3);
  for (let i = 0; i < 6; i++) { const a = (i - 2.5) * .25; spike(head, [0, .06, -.02], [Math.sin(a) * .12, .22 + Math.cos(a) * .05 - Math.abs(a) * .08, -.26 - Math.abs(a) * .1], .025, i % 2 ? flame : hot); }
  const wings = ([-1, 1] as const).map(s => {
    const w = featherWing(body, s, [.12 * s, .1, .05], 1.15, red, flame, 9, .6);
    for (let i = 0; i < 6; i++) spike(w, [(.3 + i * .14) * s, -.01, -.3 - i * .04], [(.34 + i * .16) * s, -.02, -.55 - i * .06], .03, i % 2 ? hot : flame);
    return w;
  });
  const tail = joint(body, [0, -.05, -.3]);
  for (let i = 0; i < 5; i++) { const a = (i - 2) * .22, len = .9 - Math.abs(i - 2) * .12; part(tail, new THREE.ConeGeometry(.07, len, 4), i === 2 ? deep : red, [Math.sin(a) * len * .45, -.1, -len * .45], { rot: [-Math.PI / 2 + .25, 0, -a], scale: [1, 1, .22] }); spike(tail, [Math.sin(a) * len * .85, -.2, -len * .85], [Math.sin(a) * len * 1.05, -.3, -len * 1.1], .04, i % 2 ? hot : flame); }
  for (const s of [-1, 1]) tube(tail, [[.03 * s, -.08, -.1], [.2 * s, -.35, -.5], [.12 * s, -.6, -.9], [.2 * s, -.7, -1.1]], .035, .008, flame, 12, 4);
  for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) spike(body, [.07 * s, -.2, .05], [.08 * s + k * .04, -.38, .14], .015, gold);
  const embers = [0, 1, 2, 3, 4, 5].map(() => part(g, sphere(.03, 4, 3), hot, [0, 0, 0]));
  return { group: g, shadow: 1.6, parts: { body, head, tail }, idle: t => {
    const f = Math.sin(t * 2.6); wings[0].rotation.z = -.55 - f * .4; wings[1].rotation.z = .55 + f * .4; body.position.y = 1.15 + Math.sin(t * 2.6 + 1.2) * .06;
    tail.rotation.x = Math.sin(t * 1.5) * .08; head.rotation.y = Math.sin(t * .8) * .25;
    core.material.opacity = .35 + .15 * Math.sin(t * 4);
    embers.forEach((e, i) => { const k = (t * .5 + i / 6) % 1; e.position.set(Math.sin(i * 2.7) * .6 * (1 - k), .4 + k * 1.4, -.3 + Math.cos(i * 1.9) * .4); e.scale.setScalar(1 - k); });
  } };
}

/** Floor 3, Umbral: a basilisk as long as two men lying down, low on six clawed legs, a crown of spines on its brow and
    a stare that burns violet. */
export function basilisk(): Built {
  const g = new THREE.Group(), hide = gloss(0x55663a, .5, .12), stripe = gloss(0x2c3620, .5, .12), belly = std(0xc8b878), crown = gloss(0x6a3a8a, .35, .3), claw = gloss(0x1a1414, .3, .3), stare = lit(0xd0a0ff);
  const body = joint(g, [0, 0, 0]);
  tube(body, [[.3, .05, -1.35], [.2, .08, -1.05], [0, .14, -.7], [0, .24, -.35]], .03, .22, hide, 14, 8);
  tube(body, [[0, .24, -.35], [0, .3, 0], [0, .31, .32]], .23, .18, hide, 8, 8);
  for (let i = 0; i < 6; i++) { const k = i / 6; part(body, new THREE.TorusGeometry(.2 - k * .1, .03, 3, 10), stripe, [k * .1, .26 - k * .16, .05 - k * 1.05], { rot: [Math.PI / 2 - .2, 0, 0], scale: [1, 1, .6] }); }
  part(body, sphere(.2, 8, 6), belly, [0, .15, -.1], { scale: [1.05, .4, 2.2] });
  for (let i = 0; i < 9; i++) { const k = i / 9; spike(body, [k * .08, .5 - k * .3, .18 - k * 1.2], [k * .08, .64 - k * .34, .12 - k * 1.2], .045 - k * .025, crown); }
  const head = joint(body, [0, .34, .5]);
  part(head, sphere(.19, 10, 8), hide, [0, 0, .06], { scale: [1, .62, 1.45] });
  part(head, sphere(.12, 8, 6), stripe, [0, .07, .0], { scale: [1.2, .5, 1.5] });
  const jaw = joint(head, [0, -.07, 0], [.12, 0, 0]);
  part(jaw, sphere(.15, 8, 6), stripe, [0, -.02, .12], { scale: [.9, .35, 1.4] });
  for (const s of [-1, 1]) spike(head, [.07 * s, -.05, .28], [.065 * s, -.14, .3], .018, std(0xeee6d0));
  const eyes = slitEyes(head, .11, .06, .14, .06, 0xd0a0ff, .55, .35);
  const gazes = [-1, 1].map(s => { const gl = glow(U, .5, .75); gl.position.set(.12 * s, .06, .16); head.add(gl); return gl; });
  for (let i = 0; i < 7; i++) { const a = (i - 3) * .3; spike(head, [Math.sin(a) * .1, .08, -.04], [Math.sin(a) * .26, .36 - Math.abs(a) * .06, -.24], .04, crown); part(head, sphere(.024, 4, 3), stare, [Math.sin(a) * .26, .36 - Math.abs(a) * .06, -.24]); }
  const legs = [-1, 1].flatMap(s => [.22, -.5].map(z => {
    const l = joint(body, [.16 * s, .2, z]);
    tube(l, [[0, 0, 0], [.16 * s, .03, .03], [.27 * s, -.06, .08], [.3 * s, -.19, .12]], .085, .05, hide, 8, 6);
    for (const k of [-1, 0, 1]) spike(l, [.3 * s, -.19, .12], [.34 * s + k * .05, -.2, .24], .022, claw);
    return l;
  }));
  return { group: g, shadow: 1.6, parts: { body, head, jaw }, idle: t => {
    body.rotation.y = Math.sin(t * .9) * .05; head.rotation.y = Math.sin(t * .7) * .3; jaw.rotation.x = .1 + Math.max(0, Math.sin(t * 1.2)) * .12;
    legs.forEach((l, i) => { l.rotation.y = Math.sin(t * 1.8 + i * 1.7) * .06; });
    const g2 = .5 + .3 * Math.sin(t * 2); for (const gl of gazes) gl.material.opacity = g2; for (const e of eyes) e.scale.y = .38 * (t % 4 < .1 ? .3 : 1);
  } };
}

/** Floor 4, Hallow (elite): a griffin, an eagle's white head and gold wings on a lion's body, taloned forefeet and a lion's
    tail, the Reliquary's treasure-guard. */
export function griffin(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), fur = std(0xc89a50), dark = std(0x8a6430), feather = std(0xf2ead8), wingM = std(0xb88a40), tipM = gloss(0xf0d890, .3, .5), beak = gloss(0xe8b830, .3, .4), talon = gloss(0x1a1410, .3, .3);
  part(body, sphere(.3, 10, 8), fur, [0, .72, -.25], { scale: [.85, .8, 1.5] });
  part(body, sphere(.26, 10, 8), feather, [0, .82, .12], { scale: [.9, .95, 1] });
  const legs = [-1, 1].map(s => {
    const f = joint(body, [.15 * s, .62, .22]);
    part(f, sphere(.11, 8, 6), feather, [.01 * s, -.1, .04], { scale: [1, 1.6, 1] });
    tube(f, [[0, -.2, .05], [.02 * s, -.4, .1], [.03 * s, -.6, .14]], .065, .05, beak, 6, 6);
    for (const k of [-1, 0, 1]) spike(f, [.03 * s, -.6, .14], [.03 * s + k * .05, -.62, .26], .02, talon);
    const h = joint(body, [.18 * s, .66, -.6]);
    tube(h, [[0, 0, 0], [.03 * s, -.25, .12], [.02 * s, -.48, -.06], [.02 * s, -.64, .02]], .12, .06, fur, 8, 6);
    part(h, sphere(.07, 6, 5), fur, [.02 * s, -.64, .06], { scale: [1, .6, 1.3] });
    return [f, h];
  }).flat();
  const neck = joint(body, [0, .95, .28]);
  tube(neck, [[0, 0, 0], [0, .18, .1], [0, .28, .2]], .17, .13, feather, 6, 7);
  const head = joint(neck, [0, .34, .26]);
  part(head, sphere(.16, 10, 8), feather, [0, 0, 0], { scale: [.9, .9, 1.15] });
  tube(head, [[0, .02, .1], [0, .02, .24], [0, -.06, .3], [0, -.13, .27]], .07, .01, beak, 8, 6);
  for (const s of [-1, 1]) { part(head, new THREE.BoxGeometry(.08, .03, .1), dark, [.07 * s, .07, .06], { rot: [0, -.3 * s, -.25 * s] }); spike(head, [.08 * s, .08, -.08], [.12 * s, .2, -.24], .03, feather); }
  slitEyes(head, .085, .03, .09, .035, H, .8, .3);
  const wings = ([-1, 1] as const).map(s => featherWing(body, s, [.18 * s, 1.0, -.1], 1.05, wingM, tipM, 9, .5));
  const tail = joint(body, [0, .78, -.72]);
  tube(tail, [[0, 0, 0], [0, -.1, -.3], [.05, -.35, -.45], [.12, -.45, -.35]], .045, .03, fur, 10, 5);
  part(tail, sphere(.07, 6, 5), dark, [.13, -.47, -.32], { scale: [1, 1.4, 1] });
  return { group: g, shadow: 1.7, parts: { body, neck, head, tail }, idle: t => {
    const f = Math.sin(t * 1.4); wings[0].rotation.z = -.75 - f * .2; wings[1].rotation.z = .75 + f * .2; wings[0].rotation.y = .3; wings[1].rotation.y = -.3;
    head.rotation.y = Math.sin(t * .8) * .35; head.rotation.x = Math.sin(t * 1.3) * .08; tail.rotation.y = Math.sin(t * 1.6) * .3;
    body.position.y = Math.sin(t * 1.4) * .01; void legs;
  } };
}

/** Floor 4, Hallow: a great eye, gold-irised and slit, in turning wheels of gold set with lesser eyes, white wings folded
    round it: the Reliquary's watcher. */
export function radiantEye(): Built {
  const g = new THREE.Group(), core = joint(g, [0, 1.05, 0]), white = std(0xf6f0e0, { roughness: .4 }), gold = gloss(0xd8a840, .3, .75), wingM = std(0xf4eedc), tipM = std(0xe8d090), iris = lit(H), small = lit(0xfff0c0);
  const halo = glow(H, 1.9, .3); core.add(halo);
  const eye = joint(core, [0, 0, 0]);
  part(eye, sphere(.24, 14, 10), white, [0, 0, 0]);
  part(eye, new THREE.CircleGeometry(.14, 18), iris, [0, 0, .238]);
  part(eye, new THREE.CircleGeometry(.07, 12), lit(0x140c04), [0, 0, .242], { scale: [.38, 1, 1] });
  const lids = [1, -1].map(s => { const l = joint(eye, [0, 0, 0]); part(l, new THREE.SphereGeometry(.26, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), gold, [0, 0, 0], { rot: [s > 0 ? -.9 : Math.PI + .9, 0, 0] }); return { l, s }; });
  const wheels = [[0, 0, 0, .46], [Math.PI / 2, 0, .5, .56], [.9, 1.2, 0, .5]].map(([x, y, z, r]) => {
    const w = joint(joint(core, [0, 0, 0], [x, y, z]), [0, 0, 0]);
    part(w, new THREE.TorusGeometry(r, .022, 5, 36), gold, [0, 0, 0]);
    part(w, new THREE.TorusGeometry(r * .88, .01, 4, 36), gold, [0, 0, 0]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; part(w, sphere(.035, 6, 5), small, [Math.cos(a) * r * .94, Math.sin(a) * r * .94, 0]); }
    return w;
  });
  const wings = [[1, .4], [-1, .4], [1, -.5], [-1, -.5]].map(([s, tilt]) => { const w = featherWing(core, s as 1 | -1, [.18 * s, tilt * .3, -.15], .55, wingM, tipM, 7, .45); w.rotation.z = tilt * s; return w; });
  return { group: g, shadow: 1, parts: { core, eye }, idle: t => {
    core.position.y = 1.05 + Math.sin(t * 1.5) * .05; wheels.forEach((w, i) => { w.rotation.z = t * (.6 + i * .15) * (i % 2 ? -1 : 1); });
    eye.rotation.y = Math.sin(t * .7) * .35; eye.rotation.x = Math.sin(t * .9) * .15;
    const open = t % 5 < .2 ? .2 : 1; lids.forEach(({ l, s }) => { l.rotation.x = s * (1 - open) * .9; });
    wings.forEach((w, i) => { w.rotation.y = Math.sin(t * 2.2 + i) * .15; });
    halo.material.opacity = .22 + .1 * Math.sin(t * 2);
  } };
}

/** Floor 4, Storm: a harpy, vulture wings where its arms should be, gold-edged with storm; a pale masked face with a
    hooked nose and burning eyes under a mane of dark hair, a ruff of feathers, and taloned legs hanging below. */
export function harpy(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 1.0, 0]), skin = std(0xb0a898), feathers = std(0x4a3e36), ruff = std(0x6a5a4a), tipM = gloss(0xd8c060, .3, .5), hair = std(0x1e1a1c), talon = gloss(0x1a1410, .3, .3), leg = gloss(0x8a7a4a, .4, .3);
  part(body, sphere(.18, 10, 8), skin, [0, .12, .02], { scale: [.95, 1.1, .75] });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; part(body, new THREE.ConeGeometry(.07, .36, 4), feathers, [Math.cos(a) * .14, -.18, Math.sin(a) * .11], { rot: [Math.sin(a) * .35, 0, -Math.cos(a) * .35], scale: [1, 1, .4] }); }
  part(body, sphere(.2, 10, 8), feathers, [0, -.06, 0], { scale: [1, .8, .85] });
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; spike(body, [Math.cos(a) * .1, .3, Math.sin(a) * .08], [Math.cos(a) * .22, .26, Math.sin(a) * .18], .045, ruff); }
  const head = joint(body, [0, .42, .04]);
  head.scale.setScalar(1.25);
  part(head, sphere(.12, 10, 8), skin, [0, 0, 0], { scale: [.85, 1.05, .9] });
  spike(head, [0, .01, .1], [0, -.06, .19], .03, skin);
  for (const s of [-1, 1]) part(head, sphere(.04, 6, 5), lit(0x1a1418), [.045 * s, .025, .085], { scale: [1.3, .7, .5] });
  slitEyes(head, .045, .025, .1, .026, S, .3, .35);
  part(head, new THREE.BoxGeometry(.06, .01, .02), lit(0x2a0a0a), [0, -.06, .1]);
  const mane = joint(head, [0, .06, -.04]);
  for (let i = 0; i < 11; i++) { const a = (i - 5) * .32, side = Math.sign(a) || 1; tube(mane, [[Math.sin(a) * .1, .05, -.01], [Math.sin(a) * .16, .06, -.1], [Math.sin(a) * .14 + side * .06, -.12, -.12 + Math.abs(a) * .1], [Math.sin(a) * .12 + side * .08, -.36, -.12 + Math.abs(a) * .12]], .045, .01, hair, 8, 4); }
  const wings = ([-1, 1] as const).map(s => featherWing(body, s, [.14 * s, .2, 0], .9, feathers, tipM, 9, .6));
  const legs = [-1, 1].map(s => { const l = joint(body, [.07 * s, -.24, .02]); tube(l, [[0, 0, 0], [.02 * s, -.18, .08], [.03 * s, -.36, .02]], .04, .025, leg, 6, 5); for (const k of [-1, 0, 1]) spike(l, [.03 * s, -.36, .02], [.03 * s + k * .05, -.44, .1], .016, talon); return l; });
  return { group: g, shadow: 1.2, parts: { body, head }, idle: t => {
    const f = Math.sin(t * 3.4); wings[0].rotation.z = -.2 - f * .5; wings[1].rotation.z = .2 + f * .5; body.position.y = 1.0 + Math.sin(t * 3.4 + 1.3) * .06;
    mane.rotation.x = Math.sin(t * 3.4) * .1; head.rotation.y = Math.sin(t * 1.1) * .3; legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 2 + i) * .15; });
  } };
}

/** Floor 4, Umbral: a gaunt fox of shadow, black with a violet sheen, ears laid back and teeth bared, three tails of smoke
    behind it that thin to nothing. Nothing like Fen-Nex: dark where it is bright, lean where it is round. */
export function shadowFox(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), coat = gloss(0x221c2e, .4, .2), under = std(0x3a3048), smoke = std(0x4a2a70, { transparent: true, opacity: .8 }), tooth = std(0xe8e0d0), wisp = shine(U, .6), mark = lit(0x9a6ad8);
  body.scale.setScalar(1.15);
  tube(body, [[0, .44, -.38], [0, .5, -.1], [0, .5, .14]], .14, .15, coat, 8, 7);
  part(body, sphere(.15, 8, 6), under, [0, .44, .16], { scale: [.9, .9, 1] });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) part(body, new THREE.BoxGeometry(.012, .1, .016), mark, [.14 * s, .5, -.25 + i * .12], { rot: [.4, 0, .25 * s] });
  const legs = [-1, 1].flatMap(s => [[.12, .16], [-.36, -.36]].map(([z, fz]) => { const l = joint(body, [.08 * s, .42, z]); tube(l, [[0, 0, 0], [.02 * s, -.2, .04 * Math.sign(z + .1)], [.02 * s, -.42, (fz - z) * .2 - .02]], .05, .028, coat, 6, 5); part(l, sphere(.04, 6, 4), coat, [.02 * s, -.42, (fz - z) * .2 + .02], { scale: [1, .5, 1.4] }); return l; }));
  const head = joint(body, [0, .6, .3]);
  part(head, sphere(.12, 10, 8), coat, [0, 0, 0], { scale: [1, .85, 1] });
  part(head, new THREE.ConeGeometry(.075, .26, 6), coat, [0, -.03, .18], { rot: [Math.PI / 2 + .12, 0, 0], scale: [1, 1, .7] });
  for (const s of [-1, 1]) {
    part(head, new THREE.ConeGeometry(.06, .2, 4), coat, [.07 * s, .14, -.06], { rot: [-.6, 0, -.3 * s], scale: [1, 1, .45] });
    for (const z of [.12, .2]) spike(head, [.03 * s, -.07, z], [.028 * s, -.12, z + .01], .01, tooth);
  }
  slitEyes(head, .055, .03, .1, .032, 0xc58aff, .5, .45);
  const tails = [-1, 0, 1].map(k => { const tl = joint(body, [0, .5, -.4]); tube(tl, [[0, 0, 0], [k * .12, .06, -.22], [k * .26, .28, -.4], [k * .3, .5, -.38]], .08, .02, smoke, 10, 6); part(tl, sphere(.06, 6, 5), wisp, [k * .3, .52, -.38]); return tl; });
  const puffs = [0, 1, 2, 3].map(() => part(g, sphere(.08, 6, 5), shine(0x5a2a90, .45), [0, .05, 0]));
  return { group: g, shadow: 1, parts: { body, head }, idle: t => {
    head.rotation.y = Math.sin(t * .9) * .3; tails.forEach((tl, i) => { tl.rotation.y = Math.sin(t * 1.4 + i * 1.3) * .2; tl.rotation.x = Math.sin(t * 1.1 + i) * .08; });
    puffs.forEach((p, i) => { const k = (t * .4 + i / 4) % 1; p.position.set(Math.sin(i * 2.4) * .3, .05 + k * .3, -.3 + Math.cos(i * 1.8) * .3); p.scale.setScalar(1 + k); (p.material as THREE.MeshBasicMaterial).opacity = .35 * (1 - k); });
    legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 1.5 + i) * .04; });
  } };
}

/** Floor 5, Umbral (elite): a hydra of the black marsh, a squat scaled body on four clawed legs and three serpent necks,
    each head fanged and spitting violet venom. */
export function hydra(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), hide = gloss(0x2a3a2e, .45, .2), dark = gloss(0x16201a, .45, .2), belly = std(0x8a8a5a), fang = std(0xf0ece0), claw = gloss(0x1a1414, .3, .3), venom = lit(0xc58aff);
  part(body, sphere(.45, 12, 8), hide, [0, .55, -.1], { scale: [1.1, .72, 1.3] });
  part(body, sphere(.36, 10, 6), belly, [0, .42, .02], { scale: [1.15, .55, 1.25] });
  for (let i = 0; i < 6; i++) spike(body, [0, .86 - i * .03, .05 - i * .14], [0, 1.0 - i * .04, -.04 - i * .14], .05 - i * .005, dark);
  tube(body, [[0, .5, -.6], [0, .35, -.95], [.15, .2, -1.25], [.3, .12, -1.4]], .2, .03, hide, 12, 7);
  const legs = [-1, 1].flatMap(s => [.2, -.38].map(z => {
    const l = joint(body, [.38 * s, .42, z]);
    tube(l, [[0, 0, 0], [.14 * s, -.12, .04], [.18 * s, -.42, .08]], .12, .08, hide, 6, 6);
    for (const k of [-1, 0, 1]) spike(l, [.18 * s, -.42, .08], [.22 * s + k * .05, -.42, .22], .025, claw);
    return l;
  }));
  const necks = [[-1, .1, 1.62], [0, .16, 1.95], [1, .1, 1.7]].map(([s, z, h], i) => {
    const n = joint(body, [s * .22, .7, .3]);
    const tip: V3 = [s * .5, h - .7, z + .1];
    tube(n, [[0, 0, 0], [s * .1, .3, .14], [s * .3, (h - .7) * .55, z + .06], [s * .48, (h - .7) * .85, z - .06], tip], .16, .1, hide, 14, 7);
    for (let k = 0; k < 4; k++) { const u = (k + 1) / 5; spike(n, [s * .3 * u, (h - .7) * u, z * u - .08], [s * .3 * u, (h - .7) * u + .02, z * u - .18], .03, dark); }
    const head = joint(n, tip, [.3, -s * .3, 0]);
    part(head, sphere(.13, 10, 8), hide, [0, 0, .06], { scale: [.9, .65, 1.5] });
    const jaw = joint(head, [0, -.05, 0], [.4, 0, 0]);
    part(jaw, sphere(.1, 8, 6), belly, [0, -.02, .12], { scale: [.85, .35, 1.4] });
    for (const t of [-1, 1]) { spike(head, [.045 * t, -.04, .2], [.04 * t, -.12, .22], .015, fang); spike(jaw, [.035 * t, 0, .18], [.035 * t, .07, .2], .012, fang); spike(head, [.07 * t, .06, -.02], [.1 * t, .16, -.14], .025, dark); }
    slitEyes(head, .075, .05, .1, .035, 0xc58aff, .6, .35);
    const drip = part(jaw, sphere(.03, 5, 4), venom, [0, -.05, .2], { scale: [1, 1.6, 1] });
    return { n, head, jaw, drip, i };
  });
  return { group: g, shadow: 1.8, parts: { body }, idle: t => {
    body.position.y = Math.sin(t * 1.2) * .01;
    necks.forEach(({ n, head, jaw, drip, i }) => { n.rotation.z = Math.sin(t * 1.1 + i * 2) * .08; n.rotation.x = Math.sin(t * .9 + i * 1.3) * .06; head.rotation.y = Math.sin(t * .8 + i) * .3; jaw.rotation.x = .3 + Math.max(0, Math.sin(t * 1.6 + i * 2.1)) * .4; drip.position.y = -.05 - ((t * .6 + i / 3) % 1) * .2; });
    legs.forEach((l, i) => { l.rotation.y = Math.sin(t * 1.2 + i) * .03; });
  } };
}

/** Floor 5, Umbral: a manticore, a lion's body dark as old blood with a black mane, leathery bat wings, and a scorpion's
    tail arched over its back, spines along it and a violet sting at its tip; its jaws carry rows of teeth. */
export function manticore(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), fur = std(0x5e2c22), dark = std(0x3a1812), mane = std(0x22141e), wingSkin = thin(0x3a2230, { roughness: .7 }), bone = std(0x2a1a22), chitin = gloss(0x2a1a30, .35, .4), tooth = std(0xf0ece0), sting = lit(0xc58aff);
  tube(body, [[0, .6, -.5], [0, .66, -.15], [0, .7, .2], [0, .7, .32]], .2, .24, fur, 10, 8);
  part(body, sphere(.2, 8, 6), dark, [0, .52, .1], { scale: [1, .8, 1.6] });
  const legs = [-1, 1].flatMap(s => [[.24, 0], [-.44, 1]].map(([z, hind]) => {
    const l = joint(body, [.13 * s, .62, z]);
    const pts: V3[] = hind ? [[0, 0, 0], [.03 * s, -.22, .12], [.02 * s, -.42, -.06], [.02 * s, -.6, .02]] : [[0, 0, 0], [.03 * s, -.3, .03], [.02 * s, -.6, .06]];
    tube(l, pts, hind ? .12 : .1, .055, fur, 8, 6);
    part(l, sphere(.07, 6, 5), fur, [.02 * s, -.6, hind ? .06 : .1], { scale: [1, .6, 1.3] });
    for (const k of [-1, 0, 1]) spike(l, [.02 * s, -.6, hind ? .1 : .16], [.02 * s + k * .04, -.62, hind ? .17 : .23], .015, tooth);
    return l;
  }));
  const head = joint(body, [0, .82, .48]);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; spike(head, [Math.cos(a) * .12, Math.sin(a) * .12, -.06], [Math.cos(a) * .3, Math.sin(a) * .28 - .04, -.2], .07, mane); }
  part(head, sphere(.15, 10, 8), fur, [0, 0, .04], { scale: [.95, .9, 1.05] });
  part(head, new THREE.BoxGeometry(.16, .1, .14), fur, [0, -.05, .17]);
  const jaw = joint(head, [0, -.1, .06], [.3, 0, 0]);
  part(jaw, new THREE.BoxGeometry(.14, .05, .16), dark, [0, -.01, .1]);
  for (let i = 0; i < 4; i++) { spike(head, [-.05 + i * .033, -.09, .23], [-.05 + i * .033, -.15, .235], .012, tooth); spike(jaw, [-.045 + i * .03, .01, .17], [-.045 + i * .03, .06, .175], .011, tooth); }
  slitEyes(head, .06, .04, .14, .032, 0xffb060, .6, .4);
  for (const s of [-1, 1]) part(head, new THREE.ConeGeometry(.04, .1, 4), mane, [.1 * s, .14, .0], { rot: [-.3, 0, -.3 * s] });
  const wings = ([-1, 1] as const).map(s => { const w = batWing(body, s, [.14 * s, .82, .12], .95, wingSkin, bone); return w; });
  // the tail: segments of chitin arching up over the back, the sting hanging forward over its head
  const tail = joint(body, [0, .64, -.6]);
  const arc: V3[] = [[0, 0, 0], [0, .35, -.25], [0, .8, -.2], [0, 1.0, .1], [0, .92, .38]];
  const curveT = new THREE.CatmullRomCurve3(arc.map(p => new THREE.Vector3(...p))), q = new THREE.Vector3();
  for (let i = 0; i < 9; i++) { curveT.getPointAt(i / 9, q); part(tail, sphere(.09 - i * .005, 8, 6), chitin, [q.x, q.y, q.z], { scale: [1, 1, 1.25] }); spike(tail, [q.x, q.y + .06, q.z], [q.x, q.y + .14, q.z - .03], .018, bone); }
  const tip = joint(tail, arc[4]);
  part(tip, sphere(.08, 8, 6), chitin, [0, 0, 0], { scale: [.9, .9, 1.3] });
  spike(tip, [0, -.02, .06], [0, -.18, .14], .035, sting);
  const venom = glow(U, .5, .7); venom.position.set(0, -.12, .12); tip.add(venom);
  return { group: g, shadow: 1.6, parts: { body, head, tail, tip }, idle: t => {
    const f = Math.sin(t * 1.2); wings[0].rotation.z = -.5 - f * .15; wings[1].rotation.z = .5 + f * .15; wings[0].rotation.y = .5; wings[1].rotation.y = -.5;
    tail.rotation.x = Math.sin(t * 1.5) * .06; tip.rotation.x = Math.sin(t * 2.2) * .2; head.rotation.y = Math.sin(t * .8) * .25; jaw.rotation.x = .2 + Math.max(0, Math.sin(t * 1.3)) * .25;
    venom.material.opacity = .5 + .3 * Math.sin(t * 4); legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 1.6 + i * 1.6) * .03; });
  } };
}
