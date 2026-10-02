/* M4.12 step 5 (docs/M4.12-plan.md): floor 4's five foes redone as creatures of fantasy, by the rules of fantasyFloor1.ts:
   each keeps its fight, the parts its behaviour moves (by the old look's names) and about its height; each faces +Z,
   stands on y = 0 and idles; no round googly eyes; the school in the body. Small repeated parts that move move together,
   so each look draws in about as many calls as the old one did. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, crystal, limb, lit, part, rune, sphere, std, type V3 } from '../render/arcane';
import { rough } from '../world/kitParts';
import { batWing, gloss, joint, jointed, slitEyes, spike, thin, tube, type Built } from './beastParts';

const { ember: E, frost: F, storm: S, hallow: H } = SCHOOL_LIGHT;

/** The Candle Kobold (was the Wickmouse; runs cover to cover, its candle falls burning): a small scaled kobold, rust-dark,
    with a snout of little teeth, horns swept back, ember slits for eyes, a rag of a cloak and a knife; a stub of candle
    burns on its head. */
export function candleKobold(): Built {
  const g = new THREE.Group(), scale = gloss(0x4a2c1c, .5, .15), belly = std(0x7a5236), horn = std(0xc8b48c), rag = thin(0x3a2a24, { roughness: 1 }), steel = gloss(0xc8ccd0, .2, .8), waxM = std(0xf2e6cc), body = joint(g, [0, 0, 0]);
  tube(body, [[0, .16, -.02], [0, .26, 0], [0, .34, .02]], .07, .09, scale, 6, 7); // (a hunched little body)
  part(body, sphere(.06, 8, 6), belly, [0, .25, .06], { scale: [1, 1.3, .6] });
  const head = joint(body, [0, .42, .05]);
  part(head, sphere(.075, 10, 8), scale, [0, 0, 0], { scale: [1, .9, 1.1] });
  tube(head, [[0, -.01, .05], [0, -.025, .12], [0, -.03, .16]], .045, .028, scale, 5, 6); // (the snout)
  for (const s of [-1, 1]) for (const z of [.09, .13]) spike(head, [.022 * s, -.05, z], [.02 * s, -.075, z + .005], .007, horn);
  slitEyes(head, .045, .02, .06, .03, E, .5, .35);
  for (const s of [-1, 1]) { tube(head, [[.04 * s, .05, -.02], [.08 * s, .09, -.08], [.1 * s, .08, -.14]], .018, .004, horn, 6, 4); spike(head, [.06 * s, .01, -.02], [.13 * s, .04, -.04], .015, scale); }
  // a rag of a cloak over its shoulders
  part(body, new THREE.ConeGeometry(.13, .2, 7, 1, true), rag, [0, .28, -.03], { scale: [1, 1, .8] });
  // arms: a knife in one hand, the other clawed; short legs, big feet; a tail
  jointed(body, [[.08, .34, .02], [.13, .26, .06], [.12, .2, .13]], .022, .015, scale);
  part(body, new THREE.BoxGeometry(.03, .012, .2), steel, [.13, .2, .23], { rot: [0, .3, .2] });
  jointed(body, [[-.08, .34, .02], [-.13, .25, .04], [-.12, .18, .08]], .022, .015, scale);
  for (const s of [-1, 1]) { jointed(body, [[.05 * s, .16, 0], [.07 * s, .08, .03], [.06 * s, 0, .02]], .03, .02, scale); part(body, sphere(.035, 6, 5), scale, [.06 * s, .01, .05], { scale: [1, .45, 1.6] }); }
  const tail = joint(body, [0, .14, -.07]);
  tube(tail, [[0, 0, 0], [.02, -.06, -.1], [-.02, -.11, -.2], [.03, -.13, -.28]], .035, .008, scale, 8, 5);
  // the candle on its head, stuck in a dab of wax, and its flame
  part(head, sphere(.04, 8, 5), waxM, [0, .07, -.01], { scale: [1.3, .5, 1.3] });
  part(head, new THREE.CylinderGeometry(.024, .028, .1, 7), waxM, [0, .12, -.01]);
  for (const [x, y] of [[.02, .1], [-.02, .09]]) part(head, sphere(.01, 5, 4), waxM, [x, y, .015], { scale: [1, 2, 1] }); // (drips)
  const flame = joint(head, [0, .19, -.01]);
  part(flame, new THREE.ConeGeometry(.026, .08, 6), lit(E), [0, .02, 0]); part(flame, sphere(.016, 5, 4), lit(0xfff0c0), [0, -.005, 0]);
  const halo = glow(E, .6, .6); flame.add(halo);
  return { group: g, shadow: .45, parts: { flame }, idle: t => {
    body.position.y = Math.abs(Math.sin(t * 6)) * .015; head.rotation.y = Math.sin(t * 2.3) * .3; tail.rotation.y = Math.sin(t * 4) * .4;
    flame.scale.set(1, .85 + Math.sin(t * 17) * .15, 1); halo.material.opacity = .5 + Math.sin(t * 13) * .1;
  } };
}

/** The Bell Fiend (was the Chime Bat; rings to mark the mage's spot): a bat-winged beast whose head is a hollow bronze
    bell, two slits glowing in it and lightning crackling inside; claws hanging, a whip of a tail. */
export function bellFiend(): Built {
  const g = new THREE.Group(), hide = gloss(0x241c2c, .5, .15), bronze = gloss(0xa87a2c, .3, .75), bronzeDark = gloss(0x4a3410, .35, .7), wingM = std(0x2e2236, { side: THREE.DoubleSide, roughness: .8 }), bone = std(0x5a4a5a), bolt = lit(0xf4f0a0);
  const body = joint(g, [0, .95, 0]);
  part(body, rough(sphere(.13, 10, 8), .012, 4), hide, [0, -.05, -.02], { scale: [1, 1.15, .9] });
  // the bell for a head: bronze, its mouth turned down and forward, lightning inside and slits of light cut in its crown
  const bell = joint(body, [0, .14, .06], [-1.45, 0, 0]); // (its mouth turned forward for a face, where the camera sees the dark inside and the lightning in it)
  part(bell, new THREE.CylinderGeometry(.1, .19, .26, 14, 1, true), bronze, [0, -.03, 0]);
  part(bell, new THREE.SphereGeometry(.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), bronze, [0, .1, 0]);
  part(bell, new THREE.TorusGeometry(.19, .022, 4, 18), bronzeDark, [0, -.16, 0], { rot: [Math.PI / 2, 0, 0] });
  part(bell, new THREE.CircleGeometry(.18, 14), lit(0x0c0a14), [0, -.13, 0], { rot: [Math.PI / 2, 0, 0] }); // (dark inside)
  slitEyes(bell, .06, .06, .1, .034, S, .55, .35);
  for (const s of [-1, 1]) tube(bell, [[.08 * s, .1, 0], [.17 * s, .2, -.02], [.24 * s, .22, -.1]], .028, .005, bronzeDark, 8, 4); // (horns off its crown)
  const crackle = joint(bell, [0, 0, 0]);
  for (const [a, b] of [[[-.1, -.12, .03], [-.03, -.04, -.02]], [[-.03, -.04, -.02], [.04, -.12, .04]], [[.04, -.12, .04], [.1, -.07, -.03]], [[.04, -.12, .04], [.02, -.12, .1]]] as [V3, V3][]) limb(crackle, a, b, .018, bolt);
  const spark = glow(S, .7, .6); spark.position.set(0, -.12, 0); bell.add(spark);
  // wide bat wings, claws hanging below, a whip of a tail
  const wings = ([-1, 1] as const).map(s => batWing(body, s, [.08 * s, .02, -.02], .48, wingM, bone));
  for (const s of [-1, 1]) { jointed(body, [[.05 * s, -.18, 0], [.07 * s, -.28, .03], [.06 * s, -.36, .0]], .022, .012, hide); for (const k of [-1, 1]) spike(body, [.06 * s, -.36, 0], [.06 * s + k * .02, -.42, .03], .008, bone); }
  tube(body, [[0, -.14, -.08], [.03, -.26, -.2], [-.03, -.32, -.34], [.02, -.3, -.46]], .02, .004, hide, 10, 4);
  return { group: g, shadow: .5, parts: { bell }, idle: t => {
    const f = Math.sin(t * 12); wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * f * .5; w.rotation.y = (i ? -1 : 1) * .2; });
    body.position.y = .95 + Math.sin(t * 12) * .03 + Math.sin(t * 2) * .05;
    bell.rotation.z = Math.sin(t * 5) * .15; bell.rotation.x = -1.45; crackle.visible = Math.floor(t * 9) % 3 !== 0; spark.material.opacity = .4 + Math.max(0, Math.sin(t * 9)) * .3;
  } };
}

/** The Gargoyle (was the Gargoyle Whelp; stone that turns most of a blow, pounces): a horned, winged beast of dark stone
    crouched like a statue on the edge of a roof, frost glowing in its cracks and its slit eyes, rime on its back. */
export function gargoyle(): Built {
  const g = new THREE.Group(), stone = std(0x46464e, { roughness: .95 }), stoneDark = std(0x2e2e36, { roughness: .95 }), frost = lit(F), body = joint(g, [0, 0, 0]);
  part(body, rough(sphere(.22, 10, 8), .025, 3), stone, [0, .28, -.06], { scale: [1, .95, 1.15] }); // (hunched shoulders)
  part(body, rough(sphere(.16, 8, 6), .02, 5), stone, [0, .16, -.22], { scale: [1.15, .8, 1] }); // (haunches)
  // frost in its cracks
  for (const [a, b] of [[[.14, .42, -.02], [.2, .3, .04]], [[.2, .3, .04], [.16, .18, .02]], [[-.12, .44, -.12], [-.2, .32, -.16]], [[-.2, .32, -.16], [-.17, .2, -.2]], [[.04, .48, -.16], [.12, .4, -.26]]] as [V3, V3][]) limb(body, a, b, .018, frost);
  for (let i = 0; i < 5; i++) crystal(body, F, [(i - 2) * .07, .5 - Math.abs(i - 2) * .03, -.1 - Math.abs(i - 2) * .04], .17 - Math.abs(i - 2) * .02, [-.4, 0, (i - 2) * .3], frost); // (rime on its back)
  // the head: heavy-browed, a jaw of stone fangs, horns curling out and back
  const head = joint(body, [0, .44, .14]);
  part(head, rough(sphere(.13, 10, 8), .015, 6), stone, [0, 0, 0], { scale: [1.15, .9, 1.05] });
  part(head, new THREE.BoxGeometry(.22, .04, .1), stoneDark, [0, .06, .06]); // (the brow)
  tube(head, [[0, -.04, .06], [0, -.06, .14], [0, -.07, .18]], .07, .05, stone, 5, 6);
  for (const s of [-1, 1]) {
    tube(head, [[.08 * s, .07, -.02], [.18 * s, .14, -.06], [.24 * s, .1, -.16], [.22 * s, .02, -.2]], .04, .008, stoneDark, 10, 5);
    spike(head, [.03 * s, -.09, .16], [.03 * s, -.14, .17], .014, stoneDark);
  }
  const [eyeL, eyeR] = slitEyes(head, .055, .03, .11, .042, F, .45, .35);
  const shine = glow(F, .7, 0); shine.position.set(0, .03, .16); head.add(shine);
  // forelegs planted, claws over the edge; wings folded high behind; a spade of a tail
  for (const s of [-1, 1]) {
    jointed(body, [[.12 * s, .3, .06], [.15 * s, .16, .14], [.13 * s, 0, .16]], .05, .035, stone, stoneDark);
    for (const k of [-1, 0, 1]) spike(body, [.13 * s, .015, .17], [.13 * s + k * .03, .005, .24], .014, stoneDark);
    part(body, sphere(.07, 7, 5), stoneDark, [.17 * s, .03, -.2], { scale: [1, .6, 1.4] });
  }
  const wings = ([-1, 1] as const).map(s => {
    const w = joint(body, [.14 * s, .38, -.16]);
    limb(w, [0, 0, 0], [.12 * s, .26, -.06], .025, stoneDark); limb(w, [.12 * s, .26, -.06], [.22 * s, .14, -.12], .018, stoneDark);
    const shape = new THREE.Shape([[0, 0], [.12, .26], [.22, .14], [.17, .1], [.18, .02], [.1, .02], [.08, -.06]].map(([x, y]) => new THREE.Vector2(x * s, y)));
    part(w, new THREE.ShapeGeometry(shape), std(0x3a3a44, { side: THREE.DoubleSide, roughness: .95 }), [0, 0, -.04], { rot: [-.25, 0, 0] });
    return w;
  });
  tube(body, [[0, .1, -.32], [.06, .04, -.44], [-.04, .02, -.54]], .04, .01, stone, 8, 5);
  part(body, new THREE.OctahedronGeometry(.05), stoneDark, [-.05, .02, -.58], { scale: [1, .35, 1.3] });
  return { group: g, shadow: .65, parts: { head, shine, wings: wings[0], wings2: wings[1], eyeL, eyeR }, idle: t => {
    head.rotation.y = Math.sin(t * .9) * .15; const k = (t + 1.3) % 4.4; eyeL.scale.y = eyeR.scale.y = k < .12 ? .12 : .38;
  } };
}

/** The Pale Unicorn (was the Moonstag Fawn; heals the foes round it): a gaunt white unicorn, its ribs showing, a mane and
    tail of silver hanging lank, gold hooves, slit eyes of light, and a spiral horn that glows as it mends. */
export function paleUnicorn(): Built {
  const g = new THREE.Group(), coat = std(0xd8d2c8), shade = std(0x9a948c), mane = std(0x6a6c7a, { roughness: 1 }), hoof = gloss(0xb08a40, .3, .7), hornM = std(0xf6ead0, { emissive: 0x6a5420 }), light = lit(H), body = joint(g, [0, 0, 0]);
  part(body, sphere(.18, 12, 10), coat, [0, .52, -.06], { scale: [.75, .78, 1.45] });
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) part(body, new THREE.TorusGeometry(.1, .008, 3, 8, 1.6), shade, [.1 * s, .5, .06 - i * .06], { rot: [0, Math.PI / 2, s > 0 ? -.8 : Math.PI + .8] }); // (ribs showing)
  const legs = joint(body, [0, 0, 0]);
  for (const [x, z] of [[-.08, .14], [.08, .14], [-.08, -.24], [.08, -.24]] as [number, number][]) {
    const l = joint(legs, [x, .44, z]);
    jointed(l, [[0, 0, 0], [0, -.2, .02], [0, -.4, -.01]], .035, .022, coat);
    part(l, new THREE.CylinderGeometry(.024, .03, .05, 6), hoof, [0, -.42, -.01]);
  }
  tube(body, [[0, .6, .12], [0, .74, .2], [0, .84, .24]], .07, .055, coat, 6, 7); // (a long neck, raised)
  const head = joint(body, [0, .88, .27]);
  part(head, sphere(.08, 10, 8), coat, [0, 0, 0], { scale: [.85, .9, 1.1] });
  tube(head, [[0, -.02, .04], [0, -.06, .14], [0, -.08, .2]], .06, .04, coat, 6, 6); // (a long gaunt face)
  slitEyes(head, .05, .02, .06, .025, H, .6, .3);
  for (const s of [-1, 1]) spike(head, [.04 * s, .06, -.02], [.06 * s, .14, -.05], .018, coat); // (ears)
  // the horn: a spiral of light
  const horn = joint(head, [0, .07, .05], [-.6, 0, 0]);
  part(horn, new THREE.ConeGeometry(.022, .3, 7), hornM, [0, .15, 0]);
  tube(horn, Array.from({ length: 9 }, (_, i) => { const k = i / 8, a = k * Math.PI * 5; return [Math.cos(a) * .022 * (1 - k), k * .28, Math.sin(a) * .022 * (1 - k)] as V3; }), .007, .003, light, 24, 3);
  const aura = glow(H, .9, .35); aura.position.y = .3; horn.add(aura);
  // the mane, lank down its neck, and the tail
  for (let i = 0; i < 6; i++) { const y = .86 - i * .05, z = .2 - i * .025; tube(body, [[0, y + .04, z - .04], [.05 * (i % 2 ? 1 : -1), y - .06, z - .08], [.07 * (i % 2 ? 1 : -1), y - .16, z - .06]], .025, .006, mane, 6, 4); }
  tube(body, [[0, .56, -.3], [.02, .5, -.38], [-.02, .36, -.42], [.01, .24, -.4]], .04, .008, mane, 8, 5);
  return { group: g, shadow: .55, parts: { head, aura, legs }, idle: t => {
    head.rotation.x = Math.sin(t * 1.3) * .08; aura.material.opacity = .3 + Math.sin(t * 2.4) * .08;
    legs.children.forEach((l, i) => { l.rotation.x = Math.sin(t * .8 + i) * .02; }); // (a shift of weight, so each leg stays its own part: the healer's gait swings them)
  } };
}

/** The Frost Scarab (was the Rime Scarab; rolls a growing ball of snow): a scarab of carved blue crystal as large as a
    shield, its wing cases cut in facets with runes of frost on them, a great horned crest of ice; it rolls a ball of rime. */
export function frostScarab(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), crystalM = std(0x2e6aa8, { roughness: .12, metalness: .35, transparent: true, opacity: .9, emissive: 0x0c2a4a }), dark = gloss(0x101c30, .35, .45), horn = std(0xb8e0ff, { roughness: .2, emissive: 0x2a5a88 }), snow = std(0xeef6ff, { roughness: 1 }), ice = lit(F);
  // the wing cases: two faceted halves of crystal, a seam of frost-light between them, a rune cut in each
  for (const s of [-1, 1]) {
    part(body, new THREE.IcosahedronGeometry(.3, 0), crystalM, [.13 * s, .3, -.12], { scale: [.5, .55, 1.2] });
    rune(body, F, [.15 * s, .44, -.14], .14, [-Math.PI / 2 + .1, 0, .25 * s], ice);
  }
  part(body, new THREE.BoxGeometry(.014, .02, .66), ice, [0, .46, -.12]);
  part(body, rough(sphere(.18, 10, 8), .012, 2), dark, [0, .3, .22], { scale: [1.2, .7, .8] }); // (the plate behind its head)
  const head = joint(body, [0, .27, .36]);
  part(head, sphere(.1, 8, 6), dark, [0, 0, .02], { scale: [1.2, .6, 1] });
  // the crest: a great forked horn of ice curving up, two smaller ones out to the sides
  tube(head, [[0, .03, .06], [0, .16, .14], [0, .32, .12], [0, .42, .02]], .045, .012, horn, 10, 6);
  for (const s of [-1, 1]) {
    spike(head, [0, .33, .11], [.11 * s, .44, .14], .02, horn);
    tube(head, [[.08 * s, .04, .04], [.18 * s, .1, .06], [.24 * s, .16, .02]], .025, .006, horn, 6, 4);
    spike(head, [.05 * s, -.03, .1], [.02 * s, -.05, .18], .02, dark);
  }
  slitEyes(head, .07, .02, .08, .028, F, .7, .2);
  // six legs in two sets of three that step together
  const sets = [joint(body, [0, 0, 0]), joint(body, [0, 0, 0])];
  [-1, 1].forEach(s => [[.2, [.28, .4, .38], [.24, .3, .58]], [0, [.38, .28, .02], [.46, 0, .02]], [-.22, [.36, .26, -.34], [.42, 0, -.54]]].forEach(([z, k, f], j) => {
    const l = joint(sets[(j + (s > 0 ? 1 : 0)) % 2], [.18 * s, .26, z as number]), kn = k as number[], ft = f as number[];
    jointed(l, [[0, 0, 0], [(kn[0] - .18) * s, kn[1] - .26, kn[2] - (z as number)], [(ft[0] - .18) * s, ft[1] - .26, ft[2] - (z as number)]], .035, .018, dark, horn);
    spike(l, [(kn[0] - .14) * s, kn[1] - .3, kn[2] - (z as number)], [(kn[0] - .06) * s, kn[1] - .28, kn[2] - (z as number)], .014, horn);
  }));
  // the ball it rolls: snow packed round shards of ice
  const ball = joint(g, [0, .36, .92]);
  part(ball, rough(new THREE.IcosahedronGeometry(.36, 1), .04, 5), snow, [0, 0, 0]);
  for (let i = 0; i < 10; i++) { const a = i * 2.4, b = .4 + (i % 4) * .6, p: V3 = [Math.cos(a) * Math.sin(b) * .36, Math.cos(b) * .36, Math.sin(a) * Math.sin(b) * .36]; part(ball, new THREE.OctahedronGeometry(.07), ice, p, { scale: [.5, 1.3, .5], rot: [a, b, 0] }); }
  const chill = glow(F, .9, .3); ball.add(chill);
  return { group: g, shadow: 1.5, parts: { body, ball }, idle: t => {
    ball.rotation.x = t * .8; body.position.z = Math.sin(t * 1.6) * .03; head.rotation.x = Math.sin(t * 1.6) * .06;
    sets.forEach((l, i) => { l.rotation.x = (i ? 1 : -1) * Math.sin(t * 3.2) * .06; }); chill.material.opacity = .22 + .1 * Math.sin(t * 2);
  } };
}

/** Floor 4's new looks, by the look id each replaces. */
export const FLOOR4_LOOKS: Record<string, () => Built> = {
  wickmouse: candleKobold, chimeBat: bellFiend, gargoyleWhelp: gargoyle, moonstagFawn: paleUnicorn, rimeScarab: frostScarab,
};
