/* M4.12 step 2 (docs/M4.12-plan.md): floor 1's ten foes redone as creatures of fantasy. Each keeps its fight, the parts
   its behaviour moves (by the old look's names) and about its height; each faces +Z, stands on y = 0 and idles. The rules:
   no round googly eyes (small glowing slits or beads), the school in the body (runes, crystal, fire, light), real size. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, crystal, limb, lit, part, rune, shine, sphere, std, type V3 } from '../render/arcane';
import { rough } from '../world/kitParts';
import { beads, featherWing, gloss, joint, jointed, pincer, slitEyes, spike, thin, tube, type Built } from './beastParts';

const { ember: E, storm: S, hallow: H, umbral: U } = SCHOOL_LIGHT;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** The Spore Fiend (was the Sporeling; hops, bursts in stinging spores): a hunched fungal beast on four root legs, a hood of
    shelf fungus over a gilled maw of thorn teeth, violet spore sacs glowing along its back. */
export function sporeFiend(): Built {
  const g = new THREE.Group(), flesh = std(0x6e5e4a, { roughness: .95 }), fleshDark = std(0x4a3e30, { roughness: .95 }), shelf = std(0x3a1e4a, { roughness: .8 }), gill = std(0x241430), thorn = gloss(0xe8dcc0, .4, .1), sac = lit(U);
  const body = joint(g, [0, 0, 0]);
  part(body, rough(sphere(.26, 10, 8), .025, 4), flesh, [0, .3, -.06], { scale: [1.05, .8, 1.15] });
  // four root legs, splayed and knotted
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) tube(body, [[.1 * x, .24, .08 * z], [.2 * x, .14, .14 * z], [.24 * x, 0, .2 * z]], .045, .018, fleshDark, 6, 5);
  // the hood: three shelves of fungus stacked forward over the face, violet above, gilled beneath
  const hood = joint(body, [0, .46, -.02], [-.35, 0, 0]); // (tipped back, so the maw shows beneath it from above)
  for (const [y, z, r] of [[0, 0, .2], [.06, -.06, .17], [.11, -.12, .13]] as V3[]) {
    part(hood, new THREE.SphereGeometry(r * .8, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), shelf, [0, y, z], { scale: [1.15, .4, 1] });
    part(hood, new THREE.CircleGeometry(r * .8, 12), gill, [0, y - .002, z], { rot: [Math.PI / 2, 0, 0], scale: [1.15, 1, 1] });
    for (let i = 0; i < 7; i++) { const a = (i / 6 - .5) * 3.4, o: V3 = [Math.sin(a) * r * .9, y, z + Math.cos(a) * r * .8]; spike(hood, o, [o[0] * 1.35, y + .02, z + (o[2] - z) * 1.35], .02, shelf); } // (its rim torn into points)
  }
  for (const s of [-1, 1]) tube(hood, [[.1 * s, .04, -.02], [.2 * s, .14, -.06], [.22 * s, .26, -.16], [.16 * s, .3, -.24]], .035, .006, thorn, 10, 5); // (two thorn horns curling up and back)
  for (const [x, z] of [[-.06, .02], [.07, -.05], [0, -.12], [-.05, -.15]]) part(hood, sphere(.022, 6, 4), sac, [x, .12, z], { scale: [1, .4, 1] }); // (its spots, glowing)
  // the maw under the hood: dark, ringed with thorn teeth; two violet slits for eyes in the shade
  part(body, sphere(.13, 8, 6), lit(0x6a2a8a), [0, .32, .2], { scale: [1.2, .75, .55] }); // (the maw, glowing violet in its throat)
  for (let i = 0; i < 9; i++) { const a = (i / 8 - .5) * 2.4; spike(body, [Math.sin(a) * .13, .39, .2 + Math.cos(a) * .03], [Math.sin(a) * .11, .29, .27], .018, thorn); spike(body, [Math.sin(a) * .13, .25, .2], [Math.sin(a) * .1, .34, .26], .015, thorn); }
  slitEyes(body, .09, .45, .2, .03, U, .3, .4);
  // the spore sacs along its back
  const sacs = [[0, .5, -.22, .09], [-.16, .44, -.12, .075], [.17, .45, -.14, .08], [-.08, .4, -.34, .065], [.1, .39, -.32, .06]].map(([x, y, z, r]) => part(body, sphere(r, 7, 5), sac, [x, y, z]));
  const under = glow(U, 1.1, .45); under.position.set(0, .4, -.12); body.add(under);
  const spores = [0, 1, 2, 3, 4].map(() => part(g, sphere(.02, 5, 4), sac, [0, 0, 0]));
  return { group: g, shadow: .7, idle: t => {
    const k = t * 1.3 % 1, up = k < .55 ? Math.sin(k / .55 * Math.PI) : 0, land = k >= .55 && k < .75 ? Math.sin((k - .55) / .2 * Math.PI) : 0;
    body.position.y = up * .12; body.scale.set(1 + land * .1, 1 - land * .14 + up * .04, 1 + land * .1);
    hood.rotation.x = -up * .15; sacs.forEach((s, i) => s.scale.setScalar(1 + Math.sin(t * 3 + i) * .15)); under.material.opacity = .3 + Math.sin(t * 2.5) * .12;
    spores.forEach((s, i) => { const q = (t * .45 + i / 5) % 1; s.position.set(Math.sin(i * 2.3) * .14 + Math.sin(q * 7 + i) * .04, .5 + q * .55, -.15 + Math.cos(i * 2.3) * .12); s.scale.setScalar(1 - q * .7); });
  } };
}

/** The Seraph Moth (was the Vesper Moth; flutters, drawn to lit braziers): six wings, each with an eye of pale fire, a
    needle proboscis, feelers like a crown. */
export function seraphMoth(): Built {
  const g = new THREE.Group(), body = joint(g, [0, .62, 0]), fur = std(0x5a4a34, { roughness: 1 }), furPale = std(0xb8a27a, { roughness: 1 }), band = std(0x2a2018), wingM = thin(0xd8c8a0, { roughness: .7 }), edgeM = thin(0x6a5232), fire = lit(H), needle = gloss(0x2a2014, .3, .3);
  part(body, sphere(.11, 10, 8), fur, [0, 0, .02], { scale: [1, .95, 1.1] });
  part(body, sphere(.1, 10, 8), furPale, [0, -.02, -.17], { scale: [.85, .8, 1.5] });
  for (const z of [-.12, -.2, -.28]) part(body, new THREE.TorusGeometry(.08 - (z + .12) * -.25, .012, 4, 12), band, [0, -.02, z]);
  part(body, sphere(.035, 6, 5), fire, [0, -.03, -.34]);
  const head = joint(body, [0, .02, .12]);
  part(head, sphere(.07, 8, 6), fur, [0, 0, 0]);
  beads(head, [[-.045, .02, .05], [.045, .02, .05]], .018, H);
  tube(head, [[0, -.02, .06], [0, -.06, .16], [0, -.12, .27], [0, -.15, .33]], .012, .003, needle, 8, 4); // (the needle proboscis)
  // feelers like a crown: two feathered antennae spread up and out
  for (const s of [-1, 1]) {
    tube(head, [[.02 * s, .05, .04], [.08 * s, .16, .06], [.16 * s, .26, .02]], .008, .004, band, 6, 3);
    for (let i = 0; i < 5; i++) { const k = .3 + i * .14, at: V3 = [.02 * s + .14 * s * k, .05 + .21 * k, .04]; spike(head, at, [at[0] + .04 * s, at[1] + .03, at[2] - .02], .006, furPale); }
  }
  // six wings in three pairs, each with an eye of pale fire (a ring with a slit for a pupil)
  const wing = (s: number, at: V3, yaw: number, r: number) => {
    const w = joint(body, at, [0, yaw, 0]);
    part(w, sphere(r, 12, 6), wingM, [r * .9 * s, 0, 0], { scale: [1, .06, .6] });
    part(w, sphere(r * 1.05, 12, 6), edgeM, [r * .9 * s, -.004, 0], { scale: [1, .05, .65] });
    part(w, new THREE.RingGeometry(r * .16, r * .3, 14), fire, [r * 1.05 * s, r * .07, 0], { rot: [-Math.PI / 2, 0, 0] });
    part(w, new THREE.PlaneGeometry(r * .07, r * .3), lit(0x1a120a), [r * 1.05 * s, r * .07 + .002, 0], { rot: [-Math.PI / 2, 0, 0] });
    return { w, s };
  };
  const wings = [-1, 1].flatMap(s => [wing(s, [.06 * s, .05, .06], -.55 * s, .2), wing(s, [.07 * s, .04, -.02], -.1 * s, .25), wing(s, [.06 * s, .02, -.11], .5 * s, .17)]);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) jointed(body, [[.04 * s, -.06, .05 - i * .06], [.1 * s, -.14, .07 - i * .07], [.11 * s, -.24, .1 - i * .08]], .009, .005, band);
  const halo = glow(H, .9, .35); body.add(halo);
  return { group: g, shadow: .7, idle: t => {
    body.position.y = .62 + Math.sin(t * 3) * .05 + Math.sin(t * 14) * .01; body.rotation.z = Math.sin(t * 1.3) * .08;
    wings.forEach(({ w, s }, i) => { w.rotation.z = s * (.25 + Math.sin(t * 13 - (i % 3) * .6) * .5); });
    halo.material.opacity = .25 + Math.sin(t * 4) * .1;
  } };
}

/** The Runehorn (was the Rune Beetle; charges): a ram-like beast of stone and sinew, its horns carved runestones that
    crackle before the charge, two plates of carved stone on its back that part to show the storm in it (`halfL`, `halfR`,
    `inner`). */
export function runehorn(): Built {
  const g = new THREE.Group(), body = joint(g, [0, .26, 0]), hide = std(0x24242e, { roughness: .9 }), stone = std(0x3c3c48, { roughness: .85 }), horn = std(0x8a8478, { roughness: .7 }), hoof = gloss(0x14141a, .4, .3), spark = lit(S);
  part(body, rough(sphere(.22, 10, 8), .02, 7), hide, [0, 0, -.04], { scale: [.95, .8, 1.35] });
  const inner = glow(S, .9, 0); inner.position.set(0, .12, -.06); body.add(inner);
  // the storm in it: a ridge of crystals along the spine, between the plates
  for (const [z, h] of [[.12, .12], [-.02, .16], [-.16, .13], [-.28, .09]]) crystal(body, S, [0, .15 + h * .3, z], h, [-.35, 0, 0], spark);
  const halves = [-1, 1].map(s => { // (two carved plates: they part as it charges)
    const h = joint(body, [.01 * s, .1, -.02]);
    part(h, rough(new THREE.BoxGeometry(.15, .05, .34), .015, 3 + s), stone, [.11 * s, .0, -.02], { rot: [0, 0, .5 * s] });
    for (const z of [.07, -.11]) rune(h, S, [.12 * s, .035, z], .11, [-Math.PI / 2, 0, .5 * s]);
    return h;
  });
  // the head: long and low, a stone brow, slit eyes, and the great pale horns curling back and round, runes cut along them
  const head = joint(body, [0, .08, .32], [.15, 0, 0]); head.scale.setScalar(1.25);
  part(head, rough(sphere(.11, 8, 6), .015, 9), hide, [0, 0, .04], { scale: [.85, .8, 1.3] });
  part(head, new THREE.BoxGeometry(.18, .05, .1), stone, [0, .06, .02]);
  slitEyes(head, .065, .03, .1, .025, S, .4, .3);
  for (const s of [-1, 1]) {
    tube(head, [[.06 * s, .07, 0], [.2 * s, .17, -.04], [.3 * s, .08, -.12], [.29 * s, -.06, -.04], [.21 * s, -.06, .07]], .055, .016, horn, 14, 6); // (curling wide, out past the shoulders)
    for (let i = 0; i < 4; i++) part(head, new THREE.BoxGeometry(.05, .02, .04), spark, [(.14 + i * .045) * s, .19 - i * .035, -.04 - i * .03]); // (runes cut along the horn)
  }
  const tip = crystal(head, S, [0, .02, .17], .05, [Math.PI / 2, 0, 0], spark), tipGlow = glow(S, .3, .6); tipGlow.position.set(0, .02, .19); head.add(tipGlow);
  // four legs, thick, with split hooves that strike sparks
  const legs = [[.13, .16], [-.13, .16], [.13, -.22], [-.13, -.22]].map(([x, z]) => { const l = joint(body, [x, -.06, z]); jointed(l, [[0, 0, 0], [0, -.1, .02], [0, -.2, -.01]], .05, .035, hide); part(l, new THREE.CylinderGeometry(.035, .045, .04, 6), hoof, [0, -.2, 0]); return l; });
  tube(body, [[0, .02, -.32], [0, -.04, -.42], [0, -.12, -.44]], .03, .01, hide, 6, 4);
  return { group: g, shadow: .8, parts: { halfL: halves[0], halfR: halves[1], inner }, idle: t => {
    const open = Math.max(0, Math.sin(t * 1.3)) ** 4;
    halves.forEach((h, i) => { h.rotation.z = (i ? 1 : -1) * open * .4; }); inner.material.opacity = open * .9;
    legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 4 + i * 1.6) * .08 * (1 - open); }); head.rotation.x = .25 + Math.sin(t * 1.1) * .05;
    const on = Math.floor(t * 9) % 4 !== 0; tip.visible = on; tipGlow.material.opacity = on ? .6 : .15;
  } };
}

/** The Urn Mimic (hidden among urns): a clay urn with ember light in its cracks; its lid lifts on a ring of fangs (`lid`), a
    cluster of ember slits peers out (`peek`) over the fire inside (`inside`), and clay legs fold under it. */
export function urnMimicFierce(): Built {
  const g = new THREE.Group(), clay = std(0xa8583a, { roughness: .9 }), clayDark = std(0x6a3424, { roughness: .9 }), tooth = gloss(0xe8dcc4, .4, .1), crack = lit(E), body = joint(g, [0, 0, 0]);
  const profile = [[0, 0], [.13, 0], [.21, .05], [.26, .16], [.25, .28], [.19, .36], [.15, .4], [.17, .43]].map(([x, y]) => new THREE.Vector2(x, y));
  part(body, new THREE.LatheGeometry(profile, 14), clay, [0, .06, 0]);
  // ember light in its cracks (jagged glowing lines down its belly) and a band of runes
  for (const [a, y0, y1] of [[.4, .12, .36], [-.9, .1, .3], [2.4, .14, .34]] as V3[]) for (let k = 0; k < 3; k++) { const y = y0 + (y1 - y0) * (k + .5) / 3, x = Math.sin(a + (k % 2 ? .06 : -.06)) * .262, z = Math.cos(a + (k % 2 ? .06 : -.06)) * .262; part(body, new THREE.BoxGeometry(.012, (y1 - y0) / 3 + .01, .012), crack, [x, y + .06, z], { rot: [0, a, k % 2 ? .4 : -.4] }); }
  part(body, new THREE.TorusGeometry(.25, .012, 4, 22), clayDark, [0, .34, 0], { rot: [Math.PI / 2, 0, 0] });
  // fangs round the rim, inside the mouth
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; spike(body, [Math.sin(a) * .15, .49, Math.cos(a) * .15], [Math.sin(a) * .11, .44, Math.cos(a) * .11], .016, tooth); }
  part(body, new THREE.CircleGeometry(.14, 14), lit(0x2a0a04), [0, .47, 0], { rot: [-Math.PI / 2, 0, 0] });
  const inside = glow(E, .75, .4); inside.position.y = .52; body.add(inside);
  // what peeks out: a cluster of ember slits, no face
  const peek = joint(body, [0, .42, .02]);
  for (const [x, y, r] of [[-.04, .02, .022], [.04, .02, .022], [0, .045, .016], [-.075, -.005, .014], [.075, -.005, .014]] as V3[]) part(peek, sphere(r, 6, 4), lit(0xffb040), [x, y, .07], { scale: [1.3, .35, .6] });
  const lid = joint(body, [0, .5, -.15]);
  part(lid, new THREE.CylinderGeometry(.18, .19, .045, 14), clayDark, [0, .02, .15]); part(lid, new THREE.ConeGeometry(.05, .08, 6), clayDark, [0, .08, .15]);
  for (let i = 0; i < 9; i++) { const a = (i / 8 - .5) * 2.6; spike(lid, [Math.sin(a) * .16, -.002, .15 + Math.cos(a) * .16], [Math.sin(a) * .14, -.06, .15 + Math.cos(a) * .14], .016, tooth); } // (the lid's fangs)
  // clay legs folded under (an urn's foot, until it walks)
  const legs = [0, 1, 2, 3].map(i => { const a = (i + .5) / 4 * Math.PI * 2, l = joint(body, [Math.sin(a) * .16, .1, Math.cos(a) * .14]); jointed(l, [[0, 0, 0], [Math.sin(a) * .12, .02, Math.cos(a) * .1], [Math.sin(a) * .16, -.1, Math.cos(a) * .13]], .03, .015, clayDark); return l; });
  const embers = [0, 1, 2].map(() => part(body, sphere(.02, 5, 4), lit(0xffb040), [0, 0, 0]));
  return { group: g, shadow: .65, parts: { lid, peek, inside }, idle: t => {
    const k = t * .45 % 1, open = Math.min(1, Math.max(0, Math.sin(k * Math.PI * 2) * 1.6));
    lid.rotation.x = -open * .8; peek.position.y = .42 + open * .085; peek.rotation.y = Math.sin(t * 3) * .3 * open;
    body.position.y = Math.abs(Math.sin(t * 8)) * .01; legs.forEach((l, i) => { l.rotation.z = Math.sin(t * 8 + i * 1.6) * .1; });
    inside.material.opacity = .25 + open * .5;
    embers.forEach((e, i) => { const q = (t * .9 + i / 3) % 1; e.visible = open > .2; e.position.set(Math.sin(i * 2.1 + q * 4) * .08, .5 + q * .4, Math.cos(i * 2.1) * .06); e.scale.setScalar(1 - q * .6); });
  } };
}

/** The Gloom Weaver (was the Crypt Spider; hangs on its thread, drops, spits webs): a spider with a horned, hooded carapace
    and a crown of violet eyes, a rune burning on its abdomen, barbed legs. */
export function gloomWeaver(): Built {
  const g = new THREE.Group(), shell = gloss(0x1c1624, .45, .25), plate = gloss(0x2e2238, .35, .3), hair = std(0x281f30, { roughness: 1 }), band = std(0x4a2e5e), fang = gloss(0x40181c, .3, .3), barb = gloss(0x5a4a6a, .4, .2);
  const body = joint(g, [0, 0, 0]);
  part(body, rough(sphere(.2, 10, 8), .02, 1), shell, [0, .34, .12], { scale: [1, .6, 1.15] });
  // the hooded carapace over the head, swept back into two horns
  part(body, sphere(.15, 10, 6, ), plate, [0, .42, .2], { scale: [1.15, .55, 1] });
  for (const s of [-1, 1]) tube(body, [[.08 * s, .46, .16], [.16 * s, .58, .08], [.2 * s, .66, -.06], [.18 * s, .7, -.14]], .03, .006, plate, 10, 5);
  const abdomen = joint(body, [0, .4, -.14], [.15, 0, 0]);
  part(abdomen, rough(sphere(.3, 12, 10), .035, 2), hair, [0, .06, -.24], { scale: [1, .85, 1.22] });
  for (let i = 0; i < 4; i++) part(abdomen, sphere(.22 - i * .03, 10, 4), plate, [0, .2 - i * .02, -.1 - i * .12], { scale: [1, .25, .55] }); // (chitin plates down its back)
  rune(abdomen, U, [0, .33, -.26], .16, [-Math.PI / 2 + .3, 0, 0]);
  const runeGlow = glow(U, .7, .45); runeGlow.position.set(0, .36, -.26); abdomen.add(runeGlow);
  for (let i = 0; i < 6; i++) spike(abdomen, [Math.cos(i * 1.05) * .2, .12, -.24 + Math.sin(i * 1.05) * .22], [Math.cos(i * 1.05) * .28, .22, -.24 + Math.sin(i * 1.05) * .3], .016, barb);
  const legs = [[.26, [.36, .64, .5], [.52, 0, .84]], [.16, [.48, .66, .26], [.82, 0, .4]], [.06, [.48, .62, -.04], [.82, 0, -.14]], [-.04, [.4, .6, -.32], [.62, 0, -.62]]] as const;
  const legGroups = [-1, 1].flatMap(s => legs.map(([hz, knee, foot]) => {
    const hip: V3 = [.14 * s, .32, hz], k: V3 = [knee[0] * s, knee[1], knee[2]], f: V3 = [foot[0] * s, foot[1], foot[2]];
    const ankle: V3 = [k[0] + (f[0] - k[0]) * .55, k[1] * .55, k[2] + (f[2] - k[2]) * .55];
    const l = joint(body, hip); jointed(l, [[0, 0, 0], sub(k, hip), sub(ankle, hip), sub(f, hip)], .042, .012, hair, band);
    spike(l, sub(k, hip), [k[0] - hip[0], k[1] - hip[1] + .09, k[2] - hip[2] - .02], .016, barb); // (a barb at the knee)
    return l;
  }));
  for (const s of [-1, 1]) spike(body, [.05 * s, .27, .32], [.035 * s, .08, .42], .04, fang);
  const eyes = beads(body, [[-.05, .45, .31], [.05, .45, .31], [-.1, .44, .29], [.1, .44, .29], [-.03, .49, .29], [.03, .49, .29], [-.14, .46, .25], [.14, .46, .25]], .02, 0xc58aff);
  return { group: g, shadow: 1.2, parts: { body, abdomen }, idle: t => {
    body.position.y = Math.sin(t * 2.2) * .012; abdomen.scale.setScalar(1 + Math.sin(t * 1.6) * .03); runeGlow.material.opacity = .3 + Math.sin(t * 2) * .15;
    legGroups.forEach((l, i) => { const ph = (i + (i >= 4 ? 1 : 0)) % 2; l.rotation.x = Math.max(0, Math.sin(t * 3 + ph * Math.PI)) * -.06; });
    const k = t % 4.2; for (const e of eyes) e.scale.setScalar(k < .1 ? .4 : 1);
  } };
}

/** The Quill Kraken (was the Ink Octopus; smears ink, splits in two): an ink-black kraken with a hooked beak and a ring of
    small eyes, its arms ending in quill nibs, violet runes under its skin. */
export function quillKraken(): Built {
  const g = new THREE.Group(), ink = gloss(0x1e1430, .2, .15), inner = gloss(0x3a2458, .25, .1), nib = gloss(0xe8dcc8, .3, .2), beakM = gloss(0x14100c, .3, .3), spark = lit(0xb98cff);
  part(g, new THREE.CircleGeometry(.62, 16), gloss(0x0a0710, .08, .5), [0, .006, .02], { rot: [-Math.PI / 2, 0, 0], scale: [1, .8, 1] });
  const body = joint(g, [0, 0, 0]);
  const mantle = joint(body, [0, .52, -.1], [-.38, 0, 0]);
  part(mantle, sphere(.28, 12, 10), ink, [0, .12, 0], { scale: [1, 1.3, 1.05] });
  for (const s of [-1, 1]) part(mantle, sphere(.16, 8, 4), inner, [.2 * s, .26, -.02], { scale: [.4, 1, .7], rot: [0, 0, .5 * s] }); // (fins)
  for (let i = 0; i < 9; i++) rune(mantle, 0xb98cff, [Math.sin(i * 2.1) * .26, .05 + (i % 3) * .12, Math.cos(i * 2.1) * .23], .05, [0, i * 2.1, 0], spark);
  // a ring of small eyes round its brow, and a hooked beak under them
  beads(body, Array.from({ length: 7 }, (_, i) => { const a = (i / 6 - .5) * 2; return [Math.sin(a) * .2, .55 + Math.cos(a * 1.5) * .02, .17 + Math.cos(a) * .04] as V3; }), .022, 0xe0c0ff);
  for (const s of [-1, 1]) spike(body, [0, .4 + s * .02, .2], [0, .4 - s * .06, .3], .035, beakM);
  part(body, sphere(.09, 8, 6), inner, [0, .4, .16], { scale: [1.3, .7, .7] });
  // eight arms, the front two raised, each ending in a quill's nib
  const arms = Array.from({ length: 8 }, (_, i) => {
    const a = (i + .5) / 8 * Math.PI * 2, c = Math.sin(a), s = Math.cos(a), front = s > .7;
    const arm = joint(body, [0, 0, 0]);
    const pts: V3[] = front
      ? [[c * .1, .34, s * .12], [c * .32, .3, s * .4], [c * .44, .5, s * .62], [c * .4, .72, s * .66], [c * .3, .8, s * .56]]
      : [[c * .12, .34, s * .1], [c * .42, .1, s * .4], [c * .68, .03, s * .66], [c * .84, .12, s * .8], [c * .82, .2, s * .76]];
    tube(arm, pts, .08, .016, i % 2 ? ink : inner, 14, 6);
    const end = pts[pts.length - 1], before = pts[pts.length - 2];
    spike(arm, end, [end[0] + (end[0] - before[0]) * 1.4, end[1] + (end[1] - before[1]) * 1.4, end[2] + (end[2] - before[2]) * 1.4], .02, nib);
    return arm;
  });
  return { group: g, shadow: 1.1, parts: { body, mantle }, idle: t => {
    mantle.scale.set(1 + Math.sin(t * 1.8) * .04, 1 - Math.sin(t * 1.8) * .05, 1);
    arms.forEach((a, i) => { a.rotation.y = Math.sin(t * 1.3 + i * .9) * .07; a.rotation.x = Math.sin(t * 1.7 + i) * .03; });
    spark.color.setHex(0xb98cff).multiplyScalar(.6 + .4 * Math.sin(t * 2.5));
  } };
}

/** A Lampwyrm (one of the swarm of seven, was a lantern beetle): a finger-long winged wyrm, its throat glowing like a
    lantern. */
export function lampwyrm(): Built {
  const g = new THREE.Group(), body = joint(g, [0, .75, 0]), scale = gloss(0x3a2a18, .35, .3), belly = std(0x8a6a3a), wingM = thin(0xfff0c8, { transparent: true, opacity: .55, roughness: .3 }), throat = lit(H);
  const wyrm = joint(body, [0, 0, 0]); wyrm.scale.setScalar(1.7);
  tube(wyrm, [[0, 0, .1], [0, .01, .04], [.015, 0, -.04], [-.01, -.01, -.1], [.01, 0, -.16]], .022, .004, scale, 12, 5);
  part(wyrm, sphere(.03, 8, 6), scale, [0, .01, .12], { scale: [1, .8, 1.3] });
  for (const s of [-1, 1]) spike(wyrm, [.012 * s, .025, .12], [.03 * s, .05, .08], .006, belly); // (two small horns)
  beads(wyrm, [[-.016, .02, .145], [.016, .02, .145]], .005, 0xfff3c4);
  part(wyrm, sphere(.024, 8, 6), throat, [0, -.012, .08], { scale: [1, .9, 1.3] }); // (the lantern throat)
  const wings = [-1, 1].map(s => part(wyrm, sphere(.055, 6, 4), wingM, [.05 * s, .02, .02], { rot: [0, .3 * s, 0], scale: [1.3, .08, .6] }));
  const gl = glow(H, .6, .7); gl.position.set(0, -.02, .14); body.add(gl);
  return { group: g, shadow: .35, parts: { body }, idle: t => {
    body.position.y = .75 + Math.sin(t * 3.1) * .06; for (const w of wings) w.rotation.z = Math.sin(t * 38) * .55;
    wyrm.rotation.y = Math.sin(t * 2.2) * .2; gl.material.opacity = .45 + .3 * Math.max(0, Math.sin(t * 2.4));
  } };
}

/** The Caladrius (was the Choir Lark; perches and sings the foes round it on): the white bird of the old bestiaries, a crest
    of feathers like a halo, a blade of a beak, long tail plumes. */
export function caladrius(): Built {
  const g = new THREE.Group(), body = joint(g, [0, .95, 0]), white = std(0xf2eee4), pale = std(0xd8d0bc), gold = std(0xd9b866), beak = gloss(0xc8a850, .3, .4), ray = lit(H);
  part(body, sphere(.17, 10, 8), white, [0, 0, 0], { scale: [.95, .85, 1.6] });
  part(body, sphere(.14, 8, 6), pale, [0, -.04, .1], { scale: [.9, .85, 1.2] });
  const head = joint(body, [0, .12, .27]);
  part(head, sphere(.1, 10, 8), white, [0, 0, 0], { scale: [.9, .95, 1.1] });
  slitEyes(head, .055, .02, .07, .02, H, .5, .2);
  const upper = joint(head, [0, -.01, .09]); spike(upper, [0, 0, 0], [0, -.04, .24], .03, beak); // (a long blade of a beak)
  const lower = joint(head, [0, -.035, .08], [.3, 0, 0]); spike(lower, [0, 0, 0], [0, -.02, .15], .024, beak);
  // the crest: a fan of white plumes behind the head with a ring of light, like a halo
  const crest = joint(head, [0, .06, -.04]);
  for (let i = 0; i < 9; i++) { const a = (i - 4) * .28; spike(crest, [0, 0, 0], [Math.sin(a) * .18, .14 + Math.cos(a) * .1, -.1], .018, i % 2 ? white : gold); }
  part(crest, new THREE.TorusGeometry(.17, .008, 4, 24), ray, [0, .14, -.08], { rot: [-.3, 0, 0] });
  const wings = ([-1, 1] as const).map(s => featherWing(body, s, [.1 * s, .06, .02], .66, white, gold, 9, .5));
  const tail = joint(body, [0, .02, -.24]);
  for (const [x, len, r] of [[0, .8, 0], [-.06, .66, .2], [.06, .66, -.2], [-.1, .5, .38], [.1, .5, -.38]] as V3[]) { part(tail, new THREE.ConeGeometry(.045, len, 4), white, [x, 0, -len * .48], { rot: [-Math.PI / 2, 0, r], scale: [1, 1, .2] }); part(tail, sphere(.03, 6, 4), gold, [x - Math.sin(-r) * len * .05, .005, -len * .96], { scale: [1, .3, 1.4] }); }
  for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) spike(body, [.05 * s, -.12, .02], [.06 * s + k * .03, -.22, .08], .01, beak);
  const notes = [0, 1, 2].map(() => part(g, new THREE.TorusGeometry(.12, .012, 4, 18), shine(H, .8), [0, 1.05, .45]));
  return { group: g, shadow: .9, parts: { body, head }, idle: t => {
    const f = Math.sin(t * 6.5); wings[0].rotation.z = -f * .5; wings[1].rotation.z = f * .5; body.position.y = .95 + Math.sin(t * 6.5 + 1) * .03;
    tail.rotation.x = Math.sin(t * 2) * .08; lower.rotation.x = .3 + Math.max(0, Math.sin(t * 6)) * .25; crest.scale.setScalar(1 + Math.sin(t * 3) * .06);
    notes.forEach((n, i) => { const k = (t * .8 + i / 3) % 1; n.position.set(0, body.position.y + .1, .5 + k * .7); n.scale.setScalar(.5 + k * 1.6); (n.material as THREE.MeshBasicMaterial).opacity = .8 * (1 - k); });
  } };
}

/** The Mantis Knight (was the Storm Mantis; parries the cantrip, lunges): as tall as the mage, its carapace grown into plate
    like a harness, a crested helm of a head, two scythes of storm crystal raised to parry, a tattered mantle of wings. */
export function mantisKnight(): Built {
  const g = new THREE.Group(), plate = gloss(0x3a4a5e, .3, .55), plateDark = gloss(0x232c3a, .35, .5), trim = gloss(0xb89a4a, .3, .6), mantleM = thin(0x2a2236, { roughness: .9 }), edge = lit(S), crystalM = shine(S, .85);
  const body = joint(g, [0, 0, 0]); body.scale.setScalar(1.22);
  // the abdomen behind, banded like a cuirass; the tattered mantle of wings over it
  tube(body, [[0, .52, .02], [0, .48, -.2], [0, .4, -.45], [0, .34, -.62]], .13, .06, plateDark, 10, 7);
  for (let i = 0; i < 4; i++) part(body, new THREE.TorusGeometry(.12 - i * .016, .014, 4, 10), trim, [0, .5 - i * .05, -.12 - i * .15], { rot: [Math.PI / 2 - .35, 0, 0] });
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape([[0, 0], [.16 * s, -.06], [.2 * s, -.4], [.12 * s, -.36], [.14 * s, -.6], [.06 * s, -.52], [.04 * s, -.7], [0, -.62]].map(([x, z]) => new THREE.Vector2(x, z)));
    const geo = new THREE.ShapeGeometry(shape); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mantleM); m.position.set(.02 * s, .6, -.04); m.rotation.x = .25; body.add(m); // (torn at the hem)
  }
  const chest = joint(body, [0, .5, .02], [-.25, 0, 0]);
  tube(chest, [[0, 0, 0], [0, .25, .04], [0, .45, .03]], .085, .055, plate, 6, 6);
  part(chest, new THREE.BoxGeometry(.18, .14, .1), plate, [0, .3, .05]); part(chest, new THREE.BoxGeometry(.19, .02, .11), trim, [0, .37, .05]); // (the breastplate)
  for (const s of [-1, 1]) part(chest, sphere(.06, 6, 4), plateDark, [.1 * s, .4, .03], { scale: [1.2, .7, 1] }); // (pauldrons)
  // the helm: a narrow wedge with a crest fin, a slit glowing across the visor
  const head = joint(chest, [0, .52, .04]);
  part(head, new THREE.OctahedronGeometry(.1, 0), plate, [0, 0, .03], { scale: [1.2, 1.1, 1] });
  part(head, new THREE.BoxGeometry(.012, .14, .16), trim, [0, .09, -.01]); // (the crest)
  part(head, new THREE.BoxGeometry(.13, .016, .02), edge, [0, .01, .11]); // (the visor's slit)
  for (const s of [-1, 1]) tube(head, [[.04 * s, .07, .04], [.08 * s, .2, 0], [.14 * s, .3, -.08]], .007, .003, plateDark, 6, 3);
  // the raptorial forelegs, armoured, ending in scythes of storm crystal
  const arms = ([-1, 1] as const).map(s => {
    const a = joint(chest, [.08 * s, .36, .06], [0, 0, -.35 * s]);
    jointed(a, [[0, 0, 0], [.05 * s, -.1, .14], [.09 * s, .2, .32]], .045, .035, plate, trim);
    const blade = joint(a, [.09 * s, .2, .32], [2.5, 0, 0]);
    part(blade, new THREE.ConeGeometry(.05, .52, 4), crystalM, [0, .26, 0], { scale: [1, 1, .3] });
    part(blade, new THREE.BoxGeometry(.012, .48, .012), edge, [0, .24, .02]);
    return { a, blade };
  });
  const spark = glow(S, .5, .6); spark.position.set(0, .2, .38); chest.add(spark);
  for (const s of [-1, 1]) for (const [hz, kz, fz] of [[0, .18, .28], [-.12, -.3, -.5]]) jointed(body, [[.05 * s, .48, hz], [.3 * s, .52, kz], [.42 * s, 0, fz]], .028, .014, plate, trim);
  return { group: g, shadow: 1, parts: { chest, head }, idle: t => {
    chest.rotation.z = Math.sin(t * 1.1) * .05; chest.rotation.x = -.25 + Math.sin(t * 1.1 + 1) * .03; head.rotation.y = Math.sin(t * .7) * .3;
    arms.forEach(({ a, blade }, i) => { a.rotation.x = Math.sin(t * 1.6 + i) * .05; blade.rotation.x = 2.5 + Math.sin(t * 2.3 + i * 2) * .08; });
    spark.material.opacity = Math.floor(t * 11) % 3 === 0 ? .85 : .2;
  } };
}

/** The Helm Hermit (was the Rubble Crab; hidden as rubble, a blast flips it): a hermit beast living in the broken stone head
    of a Warden's statue, claws of slate (`big`, `small`) with a spark between them, eyes on stalks. */
export function helmHermit(): Built {
  const g = new THREE.Group(), stone = std(0x7e786e, { roughness: .9 }), stoneDark = std(0x5e5850, { roughness: .9 }), slate = gloss(0x3a4048, .45, .3), flesh = std(0x6a5a64), tipM = gloss(0x1e2228, .35, .3);
  const body = joint(g, [0, 0, 0]);
  // the stone head it lives in, lying on its side: a helm with a crest, a brow, a crack across it
  const helm = joint(body, [0, .32, -.08], [0, 0, -Math.PI / 2 + .25]);
  part(helm, rough(sphere(.34, 12, 9), .02, 5), stone, [0, 0, 0], { scale: [1, 1.05, 1.05] });
  part(helm, rough(new THREE.BoxGeometry(.52, .07, .12), .01, 6), stoneDark, [0, .09, .34]); // (the brow)
  for (const s of [-1, 1]) part(helm, new THREE.BoxGeometry(.12, .035, .03), lit(S), [.12 * s, .02, .365]); // (its eye holes, lit by what lives inside)
  part(helm, new THREE.BoxGeometry(.07, .24, .1), stoneDark, [0, -.1, .36]); // (the nose guard)
  for (const s of [-1, 1]) part(helm, rough(new THREE.BoxGeometry(.16, .26, .06), .01, 7 + s), stoneDark, [.24 * s, -.12, .26], { rot: [0, .5 * s, 0] }); // (cheek guards)
  part(helm, rough(new THREE.BoxGeometry(.06, .5, .1), .015, 8), stoneDark, [0, .3, 0], { rot: [0, 0, 0] }); // (the crest along its top)
  part(helm, new THREE.BoxGeometry(.012, .3, .012), std(0x2a2620), [.12, .1, .3], { rot: [.4, 0, .5] }); // (a crack)
  for (const [x, z, r] of [[.24, .2, .07], [-.2, -.2, .06], [.1, -.28, .05]] as V3[]) part(body, rough(new THREE.DodecahedronGeometry(r, 0), r * .2, x * 9), stoneDark, [x, .08, z]);
  // the soft body coming out of the helm's neck, eyes on stalks
  part(body, sphere(.16, 8, 6), flesh, [0, .22, .24], { scale: [1.3, .6, 1] });
  const stalks = [-1, 1].map(s => { const e = joint(body, [.08 * s, .3, .3]); limb(e, [0, 0, 0], [.03 * s, .16, .04], .018, flesh); beads(e, [[.03 * s, .18, .05]], .028, S); return e; });
  const big = pincer(body, [.36, .26, .36], .62, slate, tipM, [0, -.35, 0]);
  const small = pincer(body, [-.3, .24, .38], .34, slate, tipM, [0, .3, 0]);
  jointed(body, [[.2, .24, .26], [.34, .26, .34]], .06, .05, slate); jointed(body, [[-.2, .22, .26], [-.3, .24, .36]], .05, .04, slate);
  const legs = [-1, 1].flatMap(s => [.18, .04].map(z => {
    const l = joint(body, [.22 * s, .2, z]);
    jointed(l, [[0, 0, 0], [.22 * s, .14, z * .3], [.38 * s, -.12, z * .6]], .04, .02, slate);
    spike(l, [.38 * s, -.12, z * .6], [.42 * s, -.2, z * .7], .018, tipM);
    return l;
  }));
  const spark = glow(S, .55, .6); spark.position.set(0, .3, .7); body.add(spark);
  return { group: g, shadow: 1.4, parts: { body, big: big.claw, small: small.claw }, idle: t => {
    body.position.x = Math.sin(t * 1.4) * .03; body.position.y = Math.abs(Math.sin(t * 2.8)) * .008;
    big.finger.rotation.x = -Math.max(0, Math.sin(t * 2)) * .4; small.finger.rotation.x = -Math.max(0, Math.sin(t * 2.6 + 1)) * .4;
    stalks.forEach((e, i) => { e.rotation.z = Math.sin(t * 1.9 + i * 2) * .15; });
    legs.forEach((l, i) => { l.rotation.z = Math.sin(t * 2.8 + i * 1.3) * .06; });
    spark.material.opacity = Math.floor(t * 9) % 4 === 0 ? .9 : .15;
  } };
}

/** Floor 1's new looks, by the look id each replaces. */
export const FLOOR1_LOOKS: Record<string, () => Built> = {
  sporeling: sporeFiend, vesperMoth: seraphMoth, runeBeetle: runehorn, urnMimic: urnMimicFierce, cryptSpider: gloomWeaver,
  inkOctopus: quillKraken, fireflyBeetle: lampwyrm, choirLark: caladrius, stormMantis: mantisKnight, rubbleCrab: helmHermit,
};
