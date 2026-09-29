/* Enemy model options (the owner's request, 2026-09-29): candidate foes built in code from simple shapes, made to read
   in the pixel look, and (the owner's second round) more high fantasy: each carries its school's light (Ember, Frost,
   Storm, Hallow, Umbral) in runes, crystals, rune rings, motes and spirit fire, and belongs to a floor (four in the
   crypt, three on the drowned floor, three on the burning one). Each stands on y = 0 facing +Z (the camera) and moves
   a little while it idles. They are looks only until M4 makes them foes, in code (the owner's decision). The dev
   menu's gallery stands them in rows by floor ahead of the mage. Names and notes are placeholders in STR.options. */
import * as THREE from 'three';
import type { Room } from '../types';
import { blob, disposeTree, glow } from '../render/materials';
import { freeSpotNear } from '../world/rooms';
import { SCHOOL_LIGHT, box, circle, crystal, eyes, limb, lit, motes, part, rune, runeRing, shine, sphere, std, type School, type V3 } from '../render/arcane';

interface Built { group: THREE.Group; idle: (t: number) => void }

/* ---------- the options ---------- */

/** Crypt, Umbral: a ribcage on six bone legs, runes cut into its bones and a dark crystal for a heart. */
function boneCrawler(): Built {
  const U = SCHOOL_LIGHT.umbral, g = new THREE.Group(), bone = std(0xd8ccb2), dark = std(0x241c2c), body = new THREE.Group(); body.position.y = .36; g.add(body);
  part(body, sphere(.2), dark, [0, 0, 0], { scale: [.9, .55, 1.5] });
  for (let i = 0; i < 4; i++) { part(body, new THREE.TorusGeometry(.19 - i * .02, .024, 5, 10, Math.PI), bone, [0, -.03, .16 - i * .12]); rune(body, U, [0, .17 - i * .02, .16 - i * .12], .07); }
  const heart = crystal(body, U, [0, .02, .02], .2), halo = glow(U, .9, .7); halo.position.set(0, .02, .02); body.add(halo);
  const skull = new THREE.Group(); skull.position.set(0, .06, .36); body.add(skull);
  part(skull, sphere(.14), bone, [0, 0, 0], { scale: [1, .9, 1.05] });
  part(skull, box(.16, .05, .12), bone, [0, -.1, .05]);
  part(skull, sphere(.045, 6, 5), dark, [-.055, .02, .11]); part(skull, sphere(.045, 6, 5), dark, [.055, .02, .11]);
  eyes(skull, U, .055, .02, .135, .024); rune(skull, U, [0, .1, .12], .06, [-.4, 0, 0]);
  for (const s of [-1, 1]) part(skull, new THREE.ConeGeometry(.025, .16, 5), dark, [.09 * s, .12, -.02], { rot: [-.5, 0, -.5 * s] });
  for (let i = 0; i < 3; i++) part(body, new THREE.ConeGeometry(.05 - i * .012, .14, 5), bone, [0, .02, -.34 - i * .1], { rot: [-Math.PI / 2, 0, 0] });
  const legs: THREE.Group[] = [];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const leg = new THREE.Group(), z = .16 - i * .16; leg.position.set(.14 * s, 0, z); body.add(leg);
    limb(leg, [0, 0, 0], [.2 * s, .12, 0], .022, bone); limb(leg, [.2 * s, .12, 0], [.3 * s, -.28, .03 * (1 - i)], .02, bone, .014);
    crystal(leg, U, [.31 * s, -.33, .03 * (1 - i)], .1, [Math.PI, 0, 0]);
    legs.push(leg);
  }
  const wisps = motes(body, U, 4, .32, .15, .02);
  return { group: g, idle: t => {
    body.position.y = .36 + Math.abs(Math.sin(t * 9)) * .02; legs.forEach((l, i) => { l.rotation.y = Math.sin(t * 9 + i * 1.7) * .18; });
    skull.rotation.y = Math.sin(t * 1.3) * .25; heart.rotation.y = t * 2; halo.material.opacity = .5 + Math.sin(t * 3) * .2; wisps(t, 1.2);
  } };
}

/** Crypt, Hallow: a hooded robe hemmed in gold with a spirit-candle for a head and a halo over it, candles circling it. */
function candleWraith(): Built {
  const H = SCHOOL_LIGHT.hallow, g = new THREE.Group(), robe = std(0x2a2448), wax = std(0xefe6cc), inner = std(0x0a0812), gold = std(0xc9a040, { roughness: .4, metalness: .6 }), float = new THREE.Group(); g.add(float);
  circle(g, H, .55);
  part(float, new THREE.ConeGeometry(.36, .9, 9, 1, true), robe, [0, .52, 0]);
  part(float, new THREE.ConeGeometry(.36, .9, 9, 1, true), inner, [0, .52, 0], { scale: .96 });
  part(float, new THREE.TorusGeometry(.35, .02, 4, 18), lit(H), [0, .1, 0], { rot: [Math.PI / 2, 0, 0] });
  for (const x of [-.06, .06]) part(float, box(.025, .8, .02), gold, [x, .55, .2], { rot: [-.38, 0, 0] });
  rune(float, H, [0, .5, .27], .1, [-.38, 0, 0]);
  part(float, sphere(.2, 10, 8), robe, [0, 1.02, -.04], { scale: [1.05, 1.1, 1] });
  part(float, sphere(.16, 10, 8), inner, [0, 1.02, .03], { scale: [.9, 1, .7] });
  part(float, new THREE.CylinderGeometry(.09, .1, .3, 10), wax, [0, 1.18, .02]);
  for (const [x, y, h] of [[-.07, 1.13, .12], [.06, 1.1, .16], [.02, 1.15, .1]] as V3[]) part(float, new THREE.CylinderGeometry(.018, .018, h, 5), wax, [x, y, .085]);
  eyes(float, H, .035, 1.22, .105, .018);
  const flame = new THREE.Group(); flame.position.set(0, 1.4, .02); float.add(flame);
  part(flame, new THREE.ConeGeometry(.055, .18, 7), lit(0xfff0b0), [0, 0, 0]); part(flame, new THREE.ConeGeometry(.028, .1, 6), lit(0xffffff), [0, -.02, 0]);
  const halo = part(float, new THREE.TorusGeometry(.16, .015, 4, 24), lit(H), [0, 1.58, -.02], { rot: [Math.PI / 2 - .3, 0, 0] });
  const light = glow(H, 1.2, .7); light.position.y = 1.4; float.add(light);
  const hands = [-1, 1].map(s => { const h = new THREE.Group(); h.position.set(.36 * s, .62, .2); float.add(h); part(h, sphere(.055, 6, 5), wax, [0, 0, 0]); part(h, new THREE.TorusGeometry(.04, .01, 4, 10), gold, [0, .02, 0], { rot: [Math.PI / 2, 0, 0] }); return h; });
  const orbit = new THREE.Group(); orbit.position.y = .9; float.add(orbit);
  const candles = [0, 1, 2].map(i => { const c = new THREE.Group(); orbit.add(c); part(c, new THREE.CylinderGeometry(.03, .03, .1, 6), wax, [0, 0, 0]); part(c, new THREE.ConeGeometry(.02, .06, 5), lit(0xfff0b0), [0, .08, 0]); const a = i / 3 * Math.PI * 2; c.position.set(Math.cos(a) * .55, 0, Math.sin(a) * .55); return c; });
  return { group: g, idle: t => {
    float.position.y = .08 + Math.sin(t * 2) * .05; flame.scale.set(1, .85 + Math.sin(t * 17) * .15, 1); light.material.opacity = .6 + Math.sin(t * 11) * .1;
    float.rotation.z = Math.sin(t * 1.4) * .04; orbit.rotation.y = t * .8; candles.forEach((c, i) => { c.position.y = Math.sin(t * 2 + i) * .06; });
    hands.forEach((h, i) => { h.position.y = .62 + Math.sin(t * 2.2 + i * 1.5) * .05; }); halo.rotation.z = t * .5;
  } };
}

/** Crypt, Hallow: the sexton who keeps the dead, a soul-light in his lantern and gold runes cut into his shovel. */
function sextonGhoul(): Built {
  const H = SCHOOL_LIGHT.hallow, g = new THREE.Group(), skin = std(0x76806a), coat = std(0x3a3048), hem = std(0x2a2236), wood = std(0x6a4a2c), iron = std(0x4a4a52), torso = new THREE.Group(); g.add(torso);
  for (const s of [-1, 1]) { limb(g, [.1 * s, .38, 0], [.12 * s, 0, .05], .055, coat); part(g, box(.1, .06, .16), iron, [.12 * s, .03, .08]); }
  torso.position.set(0, .45, 0); torso.rotation.x = .45;
  part(torso, sphere(.24), coat, [0, .18, 0], { scale: [1, 1.1, .8] });
  part(torso, new THREE.ConeGeometry(.3, .4, 8, 1, true), hem, [0, -.02, 0]);
  part(torso, new THREE.TorusGeometry(.3, .015, 4, 16), lit(H, .9), [0, -.21, 0], { rot: [Math.PI / 2, 0, 0] });
  part(torso, new THREE.TorusGeometry(.12, .012, 4, 12), std(0xc9a040, { metalness: .6, roughness: .4 }), [0, .3, .12], { rot: [.4, 0, 0] });
  crystal(torso, H, [0, .2, .2], .09);
  const head = new THREE.Group(); head.position.set(0, .45, .12); head.rotation.x = -.35; torso.add(head);
  part(head, sphere(.14), skin, [0, 0, 0], { scale: [1, .95, 1.1] });
  part(head, box(.14, .05, .08), skin, [0, -.11, .05], { rot: [.3, 0, 0] });
  eyes(head, H, .05, .02, .13, .025);
  part(head, sphere(.12, 8, 6), coat, [0, .07, -.04], { scale: [1.05, .7, 1.05] }); // (a cap, not a brim: the camera looks down on him)
  const shovel = new THREE.Group(); shovel.position.set(.26, .5, .2); g.add(shovel);
  limb(g, [.2, .75, 0], [.26, .5, .2], .045, skin); limb(shovel, [0, .45, -.1], [0, -.45, .12], .025, wood);
  part(shovel, box(.2, .26, .03), iron, [0, -.52, .15], { rot: [.25, 0, 0] });
  rune(shovel, H, [0, -.5, .17], .1, [.25, 0, 0]);
  const lantern = new THREE.Group(); lantern.position.set(-.26, .42, .12); g.add(lantern);
  limb(g, [-.2, .75, 0], [-.26, .5, .12], .045, skin);
  part(lantern, box(.11, .15, .11), iron, [0, -.1, 0]); part(lantern, box(.08, .1, .12), lit(0xfff4d0), [0, -.1, 0]);
  const soul = glow(H, 1.1, .8); soul.position.y = -.1; lantern.add(soul);
  const drift = motes(g, H, 4, .22, .6, .018);
  return { group: g, idle: t => {
    torso.rotation.x = .45 + Math.sin(t * 1.6) * .04; head.rotation.set(-.35, Math.sin(t * .7) * .3, 0); lantern.rotation.z = Math.sin(t * 2.2) * .2;
    shovel.rotation.z = Math.sin(t * 1.6) * .05; soul.material.opacity = .65 + Math.sin(t * 5) * .15; drift(t, .9);
  } };
}

/** Crypt, Storm: an urn banded in brass with a storm sealed inside it; the seal is failing, and it bites. */
function urnMimic(): Built {
  const S = SCHOOL_LIGHT.storm, g = new THREE.Group(), clay = std(0x6a3a5a), brass = std(0xc9a040, { roughness: .35, metalness: .7 }), tooth = std(0xe8e0c8), body = new THREE.Group(); g.add(body);
  const profile = [[0, 0], [.15, 0], [.2, .06], [.26, .2], [.24, .34], [.16, .44], [.12, .5]].map(([x, y]) => new THREE.Vector2(x, y));
  part(body, new THREE.LatheGeometry(profile, 12), clay, [0, .14, 0]);
  for (const [y, r] of [[.22, .265], [.46, .19]]) part(body, new THREE.TorusGeometry(r, .018, 5, 20), brass, [0, y, 0], { rot: [Math.PI / 2, 0, 0] });
  part(body, new THREE.TorusGeometry(.255, .012, 4, 20), lit(S), [0, .34, 0], { rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .3; rune(body, S, [Math.cos(a) * .262, .34, Math.sin(a) * .262], .07, [0, -a + Math.PI / 2, 0]); }
  part(body, new THREE.CircleGeometry(.12, 12), std(0x100808), [0, .63, 0], { rot: [-Math.PI / 2, 0, 0] });
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; part(body, new THREE.ConeGeometry(.02, .07, 4), tooth, [Math.cos(a) * .11, .66, Math.sin(a) * .11]); }
  part(body, sphere(.06, 6, 5), lit(S), [0, .62, .06], { scale: [1, .4, 1.6] });
  eyes(body, 0xffffff, .05, .6, -.02, .02);
  const inside = glow(S, .8, .7); inside.position.y = .7; body.add(inside);
  const cap = new THREE.Group(); cap.position.set(0, .66, -.12); body.add(cap);
  part(cap, new THREE.CylinderGeometry(.15, .13, .05, 12), brass, [0, 0, .12]); crystal(cap, S, [0, .08, .12], .1);
  const sparks = [0, 1, 2].map(() => part(body, box(.012, .14, .012), lit(0xffffff), [0, .34, 0]));
  const legs: THREE.Group[] = [];
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const l = new THREE.Group(); l.position.set(.16 * x, .2, .1 * z); body.add(l); legs.push(l);
    limb(l, [0, 0, 0], [.18 * x, .06, .08 * z], .025, brass); limb(l, [.18 * x, .06, .08 * z], [.24 * x, -.2, .12 * z], .022, brass, .01);
  }
  return { group: g, idle: t => {
    cap.rotation.x = -.35 - Math.abs(Math.sin(t * 5)) * .35; body.position.y = Math.abs(Math.sin(t * 7)) * .015; legs.forEach((l, i) => { l.rotation.y = Math.sin(t * 7 + i) * .15; });
    const k = Math.floor(t * 12); sparks.forEach((s, i) => { const a = (k * 7 + i * 13) % 20 / 20 * Math.PI * 2; s.position.set(Math.cos(a) * .27, .34, Math.sin(a) * .27); s.rotation.set(0, -a, ((k + i) % 3 - 1) * .6); s.visible = (k + i) % 3 !== 0; });
    inside.material.opacity = .5 + Math.abs(Math.sin(t * 9)) * .4;
  } };
}

/** Drowned floor, Frost: a veiled mourner crowned in ice, water held in the air round her; weeps a spray of cold. */
function drownedMourner(): Built {
  const F = SCHOOL_LIGHT.frost, g = new THREE.Group(), gown = std(0x2f4f60), veil = std(0xb8d4dc, { transparent: true, opacity: .8 }), hand = std(0xc8d8d4), float = new THREE.Group(); g.add(float);
  circle(g, F, .6);
  const profile = [[.02, 0], [.36, 0], [.28, .3], [.2, .7], [.16, .95], [.02, 1.02]].map(([x, y]) => new THREE.Vector2(x, y));
  part(float, new THREE.LatheGeometry(profile, 10), gown, [0, .08, 0]);
  part(float, new THREE.TorusGeometry(.35, .018, 4, 18), lit(F), [0, .1, 0], { rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 3; i++) rune(float, F, [(i - 1) * .12, .45 + (i % 2) * .08, .24 - Math.abs(i - 1) * .03], .08, [-.15, 0, 0]);
  part(float, sphere(.16), std(0x10202a), [0, 1.18, 0]);
  part(float, new THREE.ConeGeometry(.26, .62, 10, 1, true), veil, [0, 1.0, 0]);
  part(float, sphere(.18, 10, 6), veil, [0, 1.22, 0], { scale: [1, .8, 1] });
  eyes(float, F, .05, 1.19, .15, .024);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; crystal(float, F, [Math.cos(a) * .15, 1.4 + (i % 2) * .03, Math.sin(a) * .15], .12 + (i % 2) * .06, [Math.sin(a) * .3, 0, -Math.cos(a) * .3]); }
  for (const s of [-1, 1]) { limb(float, [.18 * s, .92, .02], [.24 * s, .52, .12], .05, gown, .06); for (let f = -1; f <= 1; f++) limb(float, [.24 * s, .52, .12], [(.25 + f * .02) * s, .36, .16 + f * .02], .012, hand); }
  const cold = glow(F, 1.4, .4); cold.position.y = .9; float.add(cold);
  const orbs = [0, 1, 2].map(() => { const o = part(float, sphere(.07, 10, 8), std(0x4aa8ff, { transparent: true, opacity: .7, roughness: .1, emissive: 0x1a5a8a }), [0, 0, 0]); o.add(glow(F, .35, .6)); return o; });
  const drops = [0, 1, 2, 3].map(i => part(g, sphere(.025, 5, 4), lit(F), [(i - 1.5) * .12, 0, .06 * (i % 2)]));
  return { group: g, idle: t => {
    float.position.y = .1 + Math.sin(t * 1.5) * .05; float.rotation.z = Math.sin(t * .9) * .05;
    orbs.forEach((o, i) => { const a = t * .9 + i / 3 * Math.PI * 2; o.position.set(Math.cos(a) * .5, .8 + Math.sin(t * 1.3 + i) * .12, Math.sin(a) * .5); });
    drops.forEach((d, i) => { const k = (t * .8 + i * .27) % 1; d.position.y = .12 * (1 - k); d.visible = k < .9; });
  } };
}

/** Drowned floor, Storm: an eel with lights along its flanks and a frill of glass fins, rising from a rune-edged pool. */
function cisternLurker(): Built {
  const S = SCHOOL_LIGHT.storm, g = new THREE.Group(), hide = std(0x1e3a44), belly = std(0x6a8a8a), mouth = std(0x5a2a4a), tooth = std(0xe8e0c8);
  part(g, new THREE.CircleGeometry(.5, 20), std(0x12404a, { roughness: .15, metalness: .2, emissive: 0x06242a }), [0, .012, 0], { rot: [-Math.PI / 2, 0, 0] });
  const edge = runeRing(g, S, .5, [0, .03, 0], 8);
  const segs: THREE.Mesh[] = [], spots: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) { const s = part(g, sphere(.16 - i * .008), i % 2 ? belly : hide, [0, 0, 0]); segs.push(s); for (const x of [-1, 1]) spots.push(part(s, sphere(.022, 5, 4), lit(S), [.14 * x, .03, .03])); }
  const head = new THREE.Group(); g.add(head);
  part(head, sphere(.17), hide, [0, 0, 0], { scale: [1, 1, 1.1] });
  part(head, new THREE.TorusGeometry(.1, .04, 6, 12), mouth, [0, -.01, .15]);
  part(head, sphere(.08, 8, 6), lit(S), [0, -.01, .1], { scale: [1, 1, .4] });
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; part(head, new THREE.ConeGeometry(.018, .06, 4), tooth, [Math.cos(a) * .08, -.01 + Math.sin(a) * .08, .16], { rot: [0, 0, a + Math.PI / 2] }); }
  for (let i = 0; i < 7; i++) { const a = (i - 3) / 3 * 1.1; part(head, new THREE.ConeGeometry(.05, .26, 4), shine(0x9fe8ff, .45), [Math.sin(a) * .15, .12 + Math.cos(a) * .06, -.05], { rot: [-.4, 0, -a] }); }
  eyes(head, 0xffffff, .13, .07, .06, .026);
  const spark = glow(S, .7, .7); head.add(spark); spark.position.z = .2;
  const place = (t: number) => {
    for (let i = 0; i < 7; i++) { const k = i / 7; segs[i].position.set(Math.sin(t * 1.8 + k * 3) * .12 * (1 - k * .3), .05 + k * .85, -.1 + Math.sin(k * 2.4) * .18); }
    head.position.set(Math.sin(t * 1.8 + 3) * .08, .98, .06); head.rotation.x = .25 + Math.sin(t * 1.2) * .1;
    edge.rotation.y = t * .3; spark.material.opacity = (Math.floor(t * 10) % 4 === 0) ? .9 : .3;
    spots.forEach((s, i) => { s.visible = (Math.floor(t * 4) + i) % 5 !== 0; });
  };
  place(0);
  return { group: g, idle: place };
}

/** Drowned floor, Umbral: skulls wreathed in violet flame, circling a dark crystal inside two turning rings. */
function skullSwarm(): Built {
  const U = SCHOOL_LIGHT.umbral, g = new THREE.Group(), bone = std(0xd8ccb2), dark = std(0x1a1224);
  const core = crystal(g, U, [0, .85, 0], .3);
  const halo = glow(U, 1.5, .75); halo.position.y = .85; g.add(halo);
  const ringA = runeRing(g, U, .3, [0, .85, 0], 5, [.5, 0, 0]), ringB = runeRing(g, U, .22, [0, .85, 0], 4, [-.9, 0, .6]);
  const skulls = [0, 1, 2, 3, 4].map(() => {
    const s = new THREE.Group(); g.add(s);
    part(s, sphere(.1), bone, [0, 0, 0], { scale: [1, .9, 1.05] }); part(s, box(.11, .035, .08), bone, [0, -.075, .03]);
    part(s, sphere(.03, 5, 4), dark, [-.04, .01, .08]); part(s, sphere(.03, 5, 4), dark, [.04, .01, .08]);
    eyes(s, U, .04, .01, .095, .016);
    const fire = part(s, new THREE.ConeGeometry(.07, .18, 6), shine(U, .7), [0, .12, -.02]);
    return { s, fire };
  });
  const place = (t: number) => {
    skulls.forEach(({ s, fire }, i) => { const a = t * 1.3 + i / 5 * Math.PI * 2; s.position.set(Math.cos(a) * .42, .85 + Math.sin(a * 2 + i) * .1, Math.sin(a) * .42); s.rotation.y = Math.sin(a) * .4; fire.scale.y = .8 + Math.sin(t * 13 + i) * .25; });
    core.rotation.y = t * 1.5; ringA.rotation.y = t * .9; ringB.rotation.z = .6 + t * .7; halo.material.opacity = .6 + Math.sin(t * 4) * .15;
  };
  place(0);
  return { group: g, idle: place };
}

/** Burning floor, Ember: a charred body split by glowing cracks, a molten heart, a crown of floating embers. */
function emberHusk(): Built {
  const E = SCHOOL_LIGHT.ember, g = new THREE.Group(), char = std(0x1c1512), crack = lit(0xff8a2a), body = new THREE.Group(); g.add(body);
  circle(g, E, .5);
  for (const s of [-1, 1]) { limb(body, [.12 * s, .5, 0], [.14 * s, 0, .02], .07, char, .06); limb(body, [.26 * s, .9, 0], [.34 * s, .5, .12], .06, char, .05); part(body, box(.02, .22, .02), crack, [.13 * s, .25, .07]); rune(body, E, [.34 * s, .56, .17], .06); }
  part(body, sphere(.26), char, [0, .76, 0], { scale: [1, 1.2, .8] });
  const core = crystal(body, 0xffc060, [0, .78, .17], .16);
  for (const [x, y, r] of [[-.1, .9, .4], [.12, .7, -.5], [-.05, .62, .2], [.1, .95, -.3]] as V3[]) part(body, box(.022, .18, .02), crack, [x, y, .19], { rot: [0, 0, r] });
  part(body, sphere(.15, 8, 6), char, [0, 1.12, .02]);
  eyes(body, 0xffe080, .05, 1.14, .15, .026);
  const crown = new THREE.Group(); crown.position.y = 1.36; body.add(crown);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; part(crown, new THREE.TetrahedronGeometry(.05), lit(i % 2 ? E : 0xffc060), [Math.cos(a) * .16, (i % 2) * .05, Math.sin(a) * .16]); }
  const heat = glow(E, 1.3, .6); heat.position.y = .8; body.add(heat);
  const embers = motes(g, E, 5, .3, .9, .02);
  return { group: g, idle: t => {
    const p = .5 + Math.sin(t * 3.1) * .5; heat.material.opacity = .45 + p * .3; core.scale.set(.45 * (.9 + p * .25), .9 + p * .25, .45 * (.9 + p * .25)); core.rotation.y = t;
    body.rotation.z = Math.sin(t * 1.1) * .03; crown.rotation.y = t * 1.2; crown.position.y = 1.36 + Math.sin(t * 2) * .03; embers(t, 1.5);
  } };
}

/** Burning floor, Ember: a thurifer in a tall gold-edged hood, swinging a censer of arcane fire, beads circling him. */
function censerBearer(): Built {
  const E = SCHOOL_LIGHT.ember, g = new THREE.Group(), robe = std(0x5a1e24), trim = std(0xc9a040, { roughness: .4, metalness: .6 }), dark = std(0x0d0a0c), brass = std(0xb08a40, { roughness: .4, metalness: .6 });
  part(g, new THREE.ConeGeometry(.34, .95, 9), robe, [0, .48, 0]);
  for (const x of [-.07, .07]) part(g, box(.05, .82, .02), trim, [x, .5, .2], { rot: [-.34, 0, 0] });
  rune(g, E, [0, .42, .25], .1, [-.34, 0, 0]); rune(g, E, [0, .66, .17], .08, [-.34, 0, 0]);
  part(g, sphere(.19), robe, [0, 1.02, -.02], { scale: [1.05, 1.1, 1.05] });
  part(g, new THREE.ConeGeometry(.17, .34, 8), robe, [0, 1.28, -.04]); part(g, new THREE.TorusGeometry(.17, .02, 4, 14), trim, [0, 1.12, -.02], { rot: [Math.PI / 2, 0, 0] });
  part(g, sphere(.14), dark, [0, 1.0, .06], { scale: [.9, 1, .7] });
  eyes(g, E, .045, 1.02, .16, .022);
  limb(g, [-.24, .85, 0], [-.18, .6, .18], .07, robe, .09);
  limb(g, [.24, .85, 0], [.3, .72, .24], .07, robe, .09);
  const swing = new THREE.Group(); swing.position.set(.3, .7, .28); g.add(swing);
  for (let i = 0; i < 4; i++) part(swing, sphere(.018, 5, 4), brass, [0, -.05 - i * .055, 0]);
  const censer = new THREE.Group(); censer.position.y = -.3; swing.add(censer);
  part(censer, new THREE.OctahedronGeometry(.09), brass, [0, 0, 0], { scale: [1, .8, 1] }); part(censer, sphere(.035, 6, 5), lit(0xffc060), [0, 0, .07]);
  censer.add(glow(E, .8, .8));
  const smoke = [0, 1, 2, 3].map(i => part(g, sphere(.07, 6, 5), shine(i % 2 ? E : 0xffc060, .4), [.3, .3, .3 + i * .01]));
  const beads = motes(g, 0xffd878, 7, .45, .75, .02);
  return { group: g, idle: t => {
    swing.rotation.x = Math.sin(t * 2.4) * .5; const cz = .28 + Math.sin(swing.rotation.x) * .3, cy = .7 - Math.cos(swing.rotation.x) * .3;
    smoke.forEach((s, i) => { const k = (t * .5 + i / 4) % 1; s.position.set(.3 + Math.sin(k * 5) * .05, cy + k * .7, cz); s.scale.setScalar(.5 + k * 1.1); (s.material as THREE.MeshBasicMaterial).opacity = .45 * (1 - k); });
    beads(t, .7);
  } };
}

/** Burning floor, Frost (an elite): a knight's bones in rime-crusted plate, a frost-lit blade, a spectral plume and cape. */
function cryptKnight(): Built {
  const F = SCHOOL_LIGHT.frost, g = new THREE.Group(), iron = std(0x5a6272, { roughness: .5, metalness: .4 }), bone = std(0xd8ccb2), dark = std(0x0a0c12), body = new THREE.Group(); g.add(body);
  for (const s of [-1, 1]) { limb(body, [.11 * s, .55, 0], [.12 * s, .05, 0], .07, iron, .06); part(body, box(.12, .08, .2), iron, [.12 * s, .04, .04]); }
  part(body, box(.4, .42, .26), iron, [0, .8, 0]);
  part(body, box(.3, .5, .05), std(0x1e3a5a), [0, .52, .14]); rune(body, F, [0, .56, .17], .12);
  const cape = part(body, new THREE.PlaneGeometry(.5, .8), shine(F, .3), [0, .62, -.16], { rot: [.15, 0, 0] });
  for (const s of [-1, 1]) { part(body, sphere(.12, 8, 6), iron, [.24 * s, 1.0, 0], { scale: [1, .7, 1] }); crystal(body, F, [.26 * s, 1.1, 0], .12, [0, 0, -.5 * s]); }
  const head = new THREE.Group(); head.position.y = 1.18; body.add(head);
  part(head, new THREE.CylinderGeometry(.15, .15, .26, 10), iron, [0, 0, 0]);
  part(head, new THREE.ConeGeometry(.16, .12, 10), iron, [0, .19, 0]);
  part(head, box(.22, .035, .02), dark, [0, .02, .145]); eyes(head, F, .045, .02, .15, .02);
  const plume = part(head, new THREE.ConeGeometry(.07, .4, 6), shine(F, .6), [0, .38, -.06], { rot: [-.35, 0, 0] });
  const shield = new THREE.Group(); shield.position.set(-.3, .7, .22); body.add(shield);
  part(shield, box(.42, .7, .06), std(0x2a3448), [0, 0, 0]); part(shield, box(.46, .74, .04), iron, [0, 0, -.02]);
  crystal(shield, F, [0, .02, .06], .2); rune(shield, F, [0, -.2, .04], .1); rune(shield, F, [0, .22, .04], .08, [0, 0, Math.PI]);
  const sword = new THREE.Group(); sword.position.set(.3, .72, .12); body.add(sword);
  limb(body, [.24, .95, 0], [.3, .72, .12], .045, bone);
  part(sword, box(.05, .72, .02), lit(0xcfeeff), [0, -.05, .12], { rot: [.35, 0, 0] });
  const edge = glow(F, .9, .5); edge.position.set(0, -.1, .14); sword.add(edge);
  part(sword, box(.22, .04, .04), iron, [0, .28, 0]);
  const rime = motes(g, F, 5, .5, .5, .018);
  return { group: g, idle: t => {
    body.rotation.y = Math.sin(t * .8) * .06; sword.rotation.x = Math.sin(t * 1.3) * .06; head.rotation.y = Math.sin(t * .6) * .15;
    plume.scale.set(1, .85 + Math.sin(t * 6) * .15, 1); cape.rotation.x = .15 + Math.sin(t * 1.9) * .08; edge.material.opacity = .4 + Math.sin(t * 4) * .15; rime(t, .8);
  } };
}

/** The options, by floor (names and notes in STR.options): four in the crypt, three drowned, three burning. */
export const MODEL_OPTIONS = [
  { id: 'boneCrawler', floor: 1, school: 'umbral', build: boneCrawler }, { id: 'candleWraith', floor: 1, school: 'hallow', build: candleWraith },
  { id: 'sextonGhoul', floor: 1, school: 'hallow', build: sextonGhoul }, { id: 'urnMimic', floor: 1, school: 'storm', build: urnMimic },
  { id: 'drownedMourner', floor: 2, school: 'frost', build: drownedMourner }, { id: 'cisternLurker', floor: 2, school: 'storm', build: cisternLurker },
  { id: 'skullSwarm', floor: 2, school: 'umbral', build: skullSwarm },
  { id: 'emberHusk', floor: 3, school: 'ember', build: emberHusk }, { id: 'censerBearer', floor: 3, school: 'ember', build: censerBearer },
  { id: 'cryptKnight', floor: 3, school: 'frost', build: cryptKnight },
] as const satisfies readonly { id: string; floor: 1 | 2 | 3; school: School; build: () => Built }[];
export type ModelOptionId = (typeof MODEL_OPTIONS)[number]['id'];

/* ---------- the gallery ---------- */

const shown: { room: Room; group: THREE.Group; idle: (t: number) => void }[] = [];
let clock = 0;
/** Stand the options (every one, or those in `only`) ahead of (north of) world (x, z) in `room`, a row per floor (the
    crypt's nearest), on free floor; returns where each stands. */
export function showModelOptions(room: Room, x: number, z: number, only?: readonly string[]) {
  const gap = 1.7, out: { id: string; floor: number; x: number; z: number }[] = [];
  for (const floor of [1, 2, 3]) {
    const row = MODEL_OPTIONS.filter(o => o.floor === floor && (!only || only.includes(o.id)));
    row.forEach((o, i) => {
      const at = only ? freeSpotNear(room, x, z - 1.8) : freeSpotNear(room, x + (i - (row.length - 1) / 2) * gap, z - 1.8 - (floor - 1) * 1.7);
      const b = o.build(); b.group.position.set(at.x - room.cx, 0, at.z - room.cz); b.group.add(blob(.9)); room.group.add(b.group);
      shown.push({ room, group: b.group, idle: b.idle }); out.push({ id: o.id, floor, x: at.x, z: at.z });
    });
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
