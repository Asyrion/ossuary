/* Enemy model options (the owner's request, 2026-09-29): candidate foes built in code from simple shapes, like the
   placeholder foes, made to read in the pixel look. Each stands on y = 0 facing +Z (the camera) and moves a little
   while it idles. They are looks only: the dev menu's gallery stands them in a row ahead of the mage, and the owner
   picks which become foes (with behaviour, health and sounds) in a later step. Names and notes are placeholders in
   STR.options, kept to the dungeon. */
import * as THREE from 'three';
import type { Room } from '../types';
import { blob, glow } from '../render/materials';
import { freeSpotNear } from '../world/rooms';

type V3 = [number, number, number];
interface Built { group: THREE.Group; idle: (t: number) => void }

const std = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, flatShading: true, ...extra });
const lit = (color: number, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });
function part(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, at: V3, o: { rot?: V3; scale?: V3 | number } = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...at);
  if (o.rot) m.rotation.set(...o.rot);
  if (o.scale !== undefined) typeof o.scale === 'number' ? m.scale.setScalar(o.scale) : m.scale.set(...o.scale);
  parent.add(m); return m;
}
const Y = new THREE.Vector3(0, 1, 0);
/** A rod of radius `r` from a to b (a bone, an arm, a leg, a handle). */
function limb(parent: THREE.Object3D, a: V3, b: V3, r: number, mat: THREE.Material, r2 = r) {
  const va = new THREE.Vector3(...a), d = new THREE.Vector3(...b).sub(va), len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, len, 6), mat);
  m.position.copy(va).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(Y, d.normalize()); parent.add(m); return m;
}
const sphere = (r: number, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const eyes = (parent: THREE.Object3D, color: number, x: number, y: number, z: number, r = .035) => { const m = lit(color); part(parent, sphere(r, 6, 5), m, [-x, y, z]); part(parent, sphere(r, 6, 5), m, [x, y, z]); };

/* ---------- the options ---------- */

/** Crypt: a ribcage on six bone legs, a skull for a head; skitters in bursts. */
function boneCrawler(): Built {
  const g = new THREE.Group(), bone = std(0xd8ccb2), dark = std(0x3a322c), body = new THREE.Group(); body.position.y = .36; g.add(body);
  part(body, sphere(.2), dark, [0, 0, 0], { scale: [.9, .55, 1.5] });
  for (let i = 0; i < 4; i++) part(body, new THREE.TorusGeometry(.19 - i * .02, .024, 5, 10, Math.PI), bone, [0, -.03, .16 - i * .12]);
  for (let i = 0; i < 5; i++) part(body, sphere(.035, 6, 5), bone, [0, .17 - i * .01, .2 - i * .11]);
  const skull = new THREE.Group(); skull.position.set(0, .06, .36); body.add(skull);
  part(skull, sphere(.14), bone, [0, 0, 0], { scale: [1, .9, 1.05] });
  part(skull, box(.16, .05, .12), bone, [0, -.1, .05]);
  part(skull, sphere(.045, 6, 5), dark, [-.055, .02, .11]); part(skull, sphere(.045, 6, 5), dark, [.055, .02, .11]);
  eyes(skull, 0xff4a2a, .055, .02, .135, .022);
  for (let i = 0; i < 3; i++) part(body, new THREE.ConeGeometry(.05 - i * .012, .14, 5), bone, [0, .02, -.34 - i * .1], { rot: [-Math.PI / 2, 0, 0] });
  const legs: THREE.Group[] = [];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const leg = new THREE.Group(), z = .16 - i * .16; leg.position.set(.14 * s, 0, z); body.add(leg);
    limb(leg, [0, 0, 0], [.2 * s, .12, 0], .022, bone); limb(leg, [.2 * s, .12, 0], [.32 * s, -.36, .04 * (1 - i)], .02, bone, .012);
    legs.push(leg);
  }
  return { group: g, idle: t => { body.position.y = .36 + Math.abs(Math.sin(t * 9)) * .02; legs.forEach((l, i) => { l.rotation.y = Math.sin(t * 9 + i * 1.7) * .18; }); skull.rotation.y = Math.sin(t * 1.3) * .25; } };
}

/** Chapel: a hooded robe with a candle for a head; drifts, and its flame flares before it strikes. */
function candleWraith(): Built {
  const g = new THREE.Group(), robe = std(0x2c2530), wax = std(0xe6dcc0), inner = std(0x0d0a0c), float = new THREE.Group(); g.add(float);
  part(float, new THREE.ConeGeometry(.36, .9, 9, 1, true), robe, [0, .52, 0]);
  part(float, new THREE.ConeGeometry(.36, .9, 9, 1, true), inner, [0, .52, 0], { scale: .96 });
  part(float, new THREE.TorusGeometry(.13, .05, 6, 12), robe, [0, .98, 0], { rot: [Math.PI / 2, 0, 0] });
  part(float, sphere(.2, 10, 8), robe, [0, 1.02, -.04], { scale: [1.05, 1.1, 1] });
  part(float, sphere(.16, 10, 8), inner, [0, 1.02, .03], { scale: [.9, 1, .7] });
  part(float, new THREE.CylinderGeometry(.09, .1, .3, 10), wax, [0, 1.18, .02]);
  for (const [x, y, h] of [[-.07, 1.13, .12], [.06, 1.1, .16], [.02, 1.15, .1]] as V3[]) part(float, new THREE.CylinderGeometry(.018, .018, h, 5), wax, [x, y, .085]);
  eyes(float, 0xff7a2a, .035, 1.22, .105, .018);
  const flame = new THREE.Group(); flame.position.set(0, 1.4, .02); float.add(flame);
  part(flame, new THREE.ConeGeometry(.05, .16, 7), lit(0xffc070), [0, 0, 0]); part(flame, new THREE.ConeGeometry(.025, .09, 6), lit(0xfff4d0), [0, -.02, 0]);
  const halo = glow(0xffa040, 1.1, .7); halo.position.y = 1.38; float.add(halo);
  for (const s of [-1, 1]) { limb(float, [.26 * s, .82, 0], [.3 * s, .5, .2], .07, robe, .1); part(float, sphere(.05, 6, 5), wax, [.3 * s, .44, .22]); }
  return { group: g, idle: t => { float.position.y = .08 + Math.sin(t * 2) * .05; flame.scale.set(1, .85 + Math.sin(t * 17) * .15, 1); halo.material.opacity = .6 + Math.sin(t * 11) * .1; float.rotation.z = Math.sin(t * 1.4) * .04; } };
}

/** Crypt: a sexton who never left, hunched over his shovel, a lantern at his hip; slow, then swings wide. */
function sextonGhoul(): Built {
  const g = new THREE.Group(), skin = std(0x76806a), coat = std(0x4a3a2c), wood = std(0x6a4a2c), iron = std(0x4a4a52), torso = new THREE.Group(); g.add(torso);
  for (const s of [-1, 1]) { limb(g, [.1 * s, .38, 0], [.12 * s, 0, .05], .055, coat); part(g, box(.1, .06, .16), iron, [.12 * s, .03, .08]); }
  torso.position.set(0, .45, 0); torso.rotation.x = .45;
  part(torso, sphere(.24), coat, [0, .18, 0], { scale: [1, 1.1, .8] });
  part(torso, new THREE.ConeGeometry(.3, .4, 8, 1, true), coat, [0, -.02, 0]);
  const head = new THREE.Group(); head.position.set(0, .45, .12); head.rotation.x = -.35; torso.add(head);
  part(head, sphere(.14), skin, [0, 0, 0], { scale: [1, .95, 1.1] });
  part(head, box(.14, .05, .08), skin, [0, -.11, .05], { rot: [.3, 0, 0] });
  eyes(head, 0xd8ff6a, .05, .02, .13, .025);
  part(head, sphere(.12, 8, 6), coat, [0, .07, -.04], { scale: [1.05, .7, 1.05] }); // (a cap, not a brim: the camera looks down on him)
  const shovel = new THREE.Group(); shovel.position.set(.26, .5, .2); g.add(shovel);
  limb(g, [.2, .75, 0], [.26, .5, .2], .045, skin); limb(shovel, [0, .45, -.1], [0, -.45, .12], .025, wood); part(shovel, box(.2, .26, .03), iron, [0, -.52, .15], { rot: [.25, 0, 0] });
  const lantern = new THREE.Group(); lantern.position.set(-.26, .42, .12); g.add(lantern);
  limb(g, [-.2, .75, 0], [-.26, .5, .12], .045, skin);
  part(lantern, box(.1, .14, .1), iron, [0, -.1, 0]); part(lantern, box(.07, .09, .11), lit(0xffc060), [0, -.1, 0]);
  const shine = glow(0xffb050, .8, .6); shine.position.y = -.1; lantern.add(shine);
  return { group: g, idle: t => { torso.rotation.x = .45 + Math.sin(t * 1.6) * .04; head.rotation.set(-.35, Math.sin(t * .7) * .3, 0); lantern.rotation.z = Math.sin(t * 2.2) * .2; shovel.rotation.z = Math.sin(t * 1.6) * .05; } };
}

/** Drowned floor: a veiled mourner in a sodden gown, always dripping; floats, and weeps a spray of cold water. */
function drownedMourner(): Built {
  const g = new THREE.Group(), gown = std(0x3f5a5c), veil = std(0x9fb4b0, { transparent: true, opacity: .82 }), hand = std(0xb8c6c0), float = new THREE.Group(); g.add(float);
  const profile = [[.02, 0], [.36, 0], [.28, .3], [.2, .7], [.16, .95], [.02, 1.02]].map(([x, y]) => new THREE.Vector2(x, y));
  part(float, new THREE.LatheGeometry(profile, 10), gown, [0, .08, 0]);
  part(float, sphere(.16), std(0x1a2426), [0, 1.18, 0]);
  part(float, new THREE.ConeGeometry(.26, .62, 10, 1, true), veil, [0, 1.0, 0]);
  part(float, sphere(.18, 10, 6), veil, [0, 1.22, 0], { scale: [1, .8, 1] });
  eyes(float, 0x8ff0ff, .05, 1.19, .15, .022);
  for (const s of [-1, 1]) { limb(float, [.18 * s, .92, .02], [.24 * s, .52, .12], .05, gown, .06); for (let f = -1; f <= 1; f++) limb(float, [.24 * s, .52, .12], [(.25 + f * .02) * s, .36, .16 + f * .02], .012, hand); }
  const cold = glow(0x5fd0e0, 1.4, .35); cold.position.y = .8; float.add(cold);
  const drops = [0, 1, 2, 3].map(i => part(g, sphere(.025, 5, 4), lit(0x8fd8ff), [(i - 1.5) * .12, 0, .06 * (i % 2)]));
  return { group: g, idle: t => { float.position.y = .1 + Math.sin(t * 1.5) * .05; float.rotation.z = Math.sin(t * .9) * .05; drops.forEach((d, i) => { const k = (t * .8 + i * .27) % 1; d.position.y = .12 * (1 - k); d.visible = k < .9; }); } };
}

/** Drowned floor: a lamprey-mouthed eel that rises from a pool and sinks again; bites, and spits from afar. */
function cisternLurker(): Built {
  const g = new THREE.Group(), hide = std(0x3d4e3a), belly = std(0xa9ac8a), mouth = std(0x7a3a3a), tooth = std(0xe8e0c8);
  part(g, new THREE.CircleGeometry(.5, 16), std(0x0e2226, { roughness: .2, metalness: .3 }), [0, .012, 0], { rot: [-Math.PI / 2, 0, 0] });
  const segs: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) segs.push(part(g, sphere(.16 - i * .008), i % 2 ? belly : hide, [0, 0, 0]));
  const head = new THREE.Group(); g.add(head);
  part(head, sphere(.17), hide, [0, 0, 0], { scale: [1, 1, 1.1] });
  part(head, new THREE.TorusGeometry(.1, .04, 6, 12), mouth, [0, -.01, .15]);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; part(head, new THREE.ConeGeometry(.018, .06, 4), tooth, [Math.cos(a) * .08, -.01 + Math.sin(a) * .08, .16], { rot: [0, 0, a + Math.PI / 2] }); }
  eyes(head, 0xffd35e, .13, .07, .06, .025);
  const place = (t: number) => {
    for (let i = 0; i < 7; i++) { const k = i / 7; segs[i].position.set(Math.sin(t * 1.8 + k * 3) * .12 * (1 - k * .3), .05 + k * .85, -.1 + Math.sin(k * 2.4) * .18); }
    head.position.set(Math.sin(t * 1.8 + 3) * .08, .98, .06); head.rotation.x = .25 + Math.sin(t * 1.2) * .1;
  };
  place(0);
  return { group: g, idle: place };
}

/** Burning floor: a charred body split by glowing cracks; slow, and bursts into embers when it falls. */
function emberHusk(): Built {
  const g = new THREE.Group(), char = std(0x1c1512), crack = lit(0xff6a1a), body = new THREE.Group(); g.add(body);
  for (const s of [-1, 1]) { limb(body, [.12 * s, .5, 0], [.14 * s, 0, .02], .07, char, .06); limb(body, [.26 * s, .9, 0], [.34 * s, .5, .12], .06, char, .05); part(body, box(.02, .22, .02), crack, [.13 * s, .25, .07]); }
  part(body, sphere(.26), char, [0, .76, 0], { scale: [1, 1.2, .8] });
  const core = part(body, sphere(.09, 8, 6), lit(0xffb040), [0, .78, .17]);
  for (const [x, y, r] of [[-.1, .9, .4], [.12, .7, -.5], [-.05, .62, .2]] as V3[]) part(body, box(.02, .18, .02), crack, [x, y, .19], { rot: [0, 0, r] });
  part(body, sphere(.15, 8, 6), char, [0, 1.12, .02]);
  eyes(body, 0xffc040, .05, 1.14, .15, .025);
  part(body, box(.02, .1, .02), crack, [.06, 1.2, .14], { rot: [0, 0, .5] });
  const heat = glow(0xff6a1a, 1.2, .55); heat.position.y = .8; body.add(heat);
  return { group: g, idle: t => { const p = .5 + Math.sin(t * 3.1) * .5; heat.material.opacity = .4 + p * .3; core.scale.setScalar(.9 + p * .25); body.rotation.z = Math.sin(t * 1.1) * .03; } };
}

/** Elite: a knight's bones in rusted plate behind a tower shield; blocks bolts from the front. */
function cryptKnight(): Built {
  const g = new THREE.Group(), iron = std(0x5a5a62, { roughness: .6 }), rust = std(0x6a2a22), bone = std(0xd8ccb2), dark = std(0x121014), body = new THREE.Group(); g.add(body);
  for (const s of [-1, 1]) { limb(body, [.11 * s, .55, 0], [.12 * s, .05, 0], .07, iron, .06); part(body, box(.12, .08, .2), iron, [.12 * s, .04, .04]); }
  part(body, box(.4, .42, .26), iron, [0, .8, 0]);
  part(body, box(.3, .5, .05), rust, [0, .52, .14]);
  for (const s of [-1, 1]) part(body, sphere(.12, 8, 6), iron, [.24 * s, 1.0, 0], { scale: [1, .7, 1] });
  const head = new THREE.Group(); head.position.y = 1.18; body.add(head);
  part(head, new THREE.CylinderGeometry(.15, .15, .26, 10), iron, [0, 0, 0]);
  part(head, new THREE.ConeGeometry(.16, .12, 10), iron, [0, .19, 0]);
  part(head, box(.22, .035, .02), dark, [0, .02, .145]); eyes(head, 0x9fe0b0, .045, .02, .15, .018);
  const shield = new THREE.Group(); shield.position.set(-.3, .7, .22); body.add(shield);
  part(shield, box(.42, .7, .06), std(0x4a3a2c), [0, 0, 0]); part(shield, box(.46, .74, .04), iron, [0, 0, -.02]);
  part(shield, sphere(.07, 8, 6), iron, [0, 0, .04]); part(shield, box(.36, .05, .02), rust, [0, .2, .035]);
  const sword = new THREE.Group(); sword.position.set(.3, .72, .12); body.add(sword);
  limb(body, [.24, .95, 0], [.3, .72, .12], .045, bone);
  part(sword, box(.05, .7, .02), std(0xb8b8c0, { roughness: .35, metalness: .5 }), [0, -.05, .12], { rot: [.35, 0, 0] });
  part(sword, box(.2, .04, .04), iron, [0, .28, 0]);
  return { group: g, idle: t => { body.rotation.y = Math.sin(t * .8) * .06; sword.rotation.x = Math.sin(t * 1.3) * .06; head.rotation.y = Math.sin(t * .6) * .15; } };
}

/** Chapel: a hooded monk swinging a burning censer; the smoke hides him, the censer's swing burns. */
function censerBearer(): Built {
  const g = new THREE.Group(), robe = std(0x4a4038), dark = std(0x0d0a0c), brass = std(0xa07a3a, { roughness: .45, metalness: .5 });
  part(g, new THREE.ConeGeometry(.34, .95, 9), robe, [0, .48, 0]);
  part(g, sphere(.19), robe, [0, 1.02, -.02], { scale: [1.05, 1.1, 1.05] });
  part(g, sphere(.14), dark, [0, 1.0, .06], { scale: [.9, 1, .7] });
  eyes(g, 0xffb040, .045, 1.02, .16, .02);
  part(g, new THREE.TorusGeometry(.2, .03, 5, 12), std(0x6a5a42), [0, .62, 0], { rot: [Math.PI / 2, 0, 0] });
  limb(g, [-.24, .85, 0], [-.18, .6, .18], .07, robe, .09);
  limb(g, [.24, .85, 0], [.3, .72, .24], .07, robe, .09);
  const swing = new THREE.Group(); swing.position.set(.3, .7, .28); g.add(swing);
  for (let i = 0; i < 4; i++) part(swing, sphere(.018, 5, 4), brass, [0, -.05 - i * .055, 0]);
  const censer = new THREE.Group(); censer.position.y = -.3; swing.add(censer);
  part(censer, new THREE.OctahedronGeometry(.09), brass, [0, 0, 0], { scale: [1, .8, 1] }); part(censer, sphere(.03, 6, 5), lit(0xff8a3a), [0, 0, .07]);
  const ember = glow(0xff8a3a, .6, .7); censer.add(ember);
  const smoke = [0, 1, 2].map(i => part(g, sphere(.07, 6, 5), lit(0x8a8078, .35), [.3, .3, .3 + i * .01]));
  return { group: g, idle: t => { swing.rotation.x = Math.sin(t * 2.4) * .5; const cz = .28 + Math.sin(swing.rotation.x) * .3, cy = .7 - Math.cos(swing.rotation.x) * .3; smoke.forEach((s, i) => { const k = (t * .5 + i / 3) % 1; s.position.set(.3 + Math.sin(k * 5) * .05, cy + k * .7, cz); s.scale.setScalar(.6 + k * 1.2); (s.material as THREE.MeshBasicMaterial).opacity = .35 * (1 - k); }); } };
}

/** Any floor: skulls circling a violet flame; they break apart when hit and circle back. */
function skullSwarm(): Built {
  const g = new THREE.Group(), bone = std(0xd8ccb2), dark = std(0x2a1f35);
  const core = part(g, sphere(.1, 8, 6), lit(0xc090ff), [0, .85, 0]);
  const halo = glow(0xa266ff, 1.4, .7); halo.position.y = .85; g.add(halo);
  const skulls = [0, 1, 2, 3, 4].map(() => {
    const s = new THREE.Group(); g.add(s);
    part(s, sphere(.1), bone, [0, 0, 0], { scale: [1, .9, 1.05] }); part(s, box(.11, .035, .08), bone, [0, -.075, .03]);
    part(s, sphere(.03, 5, 4), dark, [-.04, .01, .08]); part(s, sphere(.03, 5, 4), dark, [.04, .01, .08]);
    eyes(s, 0xd8a0ff, .04, .01, .095, .014);
    return s;
  });
  const place = (t: number) => skulls.forEach((s, i) => { const a = t * 1.3 + i / 5 * Math.PI * 2; s.position.set(Math.cos(a) * .36, .85 + Math.sin(a * 2 + i) * .1, Math.sin(a) * .36); s.rotation.y = Math.sin(a) * .4; core.scale.setScalar(.9 + Math.sin(t * 4) * .1); });
  place(0);
  return { group: g, idle: place };
}

/** Anywhere urns stand: an urn that is not an urn; waits still among the others, then scuttles and bites. */
function urnMimic(): Built {
  const g = new THREE.Group(), clay = std(0x8a5436), lid = std(0x6a3e26), tooth = std(0xe8e0c8), body = new THREE.Group(); g.add(body);
  const profile = [[0, 0], [.15, 0], [.2, .06], [.26, .2], [.24, .34], [.16, .44], [.12, .5]].map(([x, y]) => new THREE.Vector2(x, y));
  part(body, new THREE.LatheGeometry(profile, 12), clay, [0, .14, 0]);
  part(body, new THREE.CircleGeometry(.12, 12), std(0x1a0808), [0, .63, 0], { rot: [-Math.PI / 2, 0, 0] });
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; part(body, new THREE.ConeGeometry(.02, .07, 4), tooth, [Math.cos(a) * .11, .66, Math.sin(a) * .11]); }
  part(body, sphere(.06, 6, 5), std(0xa03030), [0, .62, .06], { scale: [1, .4, 1.6] });
  eyes(body, 0xffe060, .05, .6, -.02, .02);
  const cap = new THREE.Group(); cap.position.set(0, .66, -.12); body.add(cap);
  part(cap, new THREE.CylinderGeometry(.15, .13, .05, 12), lid, [0, 0, .12]); part(cap, sphere(.04, 6, 5), lid, [0, .04, .12]);
  const legs: THREE.Group[] = [];
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const l = new THREE.Group(); l.position.set(.16 * x, .2, .1 * z); body.add(l); legs.push(l);
    limb(l, [0, 0, 0], [.18 * x, .06, .08 * z], .025, std(0x5a3a2a)); limb(l, [.18 * x, .06, .08 * z], [.24 * x, -.2, .12 * z], .022, std(0x5a3a2a), .01);
  }
  return { group: g, idle: t => { cap.rotation.x = -.35 - Math.abs(Math.sin(t * 5)) * .35; body.position.y = Math.abs(Math.sin(t * 7)) * .015; legs.forEach((l, i) => { l.rotation.y = Math.sin(t * 7 + i) * .15; }); } };
}

/** The options, in the order the gallery shows them (names and notes in STR.options). */
export const MODEL_OPTIONS = [
  { id: 'boneCrawler', build: boneCrawler }, { id: 'candleWraith', build: candleWraith }, { id: 'sextonGhoul', build: sextonGhoul },
  { id: 'drownedMourner', build: drownedMourner }, { id: 'cisternLurker', build: cisternLurker }, { id: 'emberHusk', build: emberHusk },
  { id: 'cryptKnight', build: cryptKnight }, { id: 'censerBearer', build: censerBearer }, { id: 'skullSwarm', build: skullSwarm },
  { id: 'urnMimic', build: urnMimic },
] as const;
export type ModelOptionId = (typeof MODEL_OPTIONS)[number]['id'];

/* ---------- the gallery ---------- */

const shown: { room: Room; idle: (t: number) => void }[] = [];
let clock = 0;
/** Stand every option in two rows ahead of (north of) world (x, z) in `room`, on free floor; returns where each stands. */
export function showModelOptions(room: Room, x: number, z: number) {
  const cols = 5, gap = 1.6, out: { id: string; x: number; z: number }[] = [];
  MODEL_OPTIONS.forEach((o, i) => {
    const at = freeSpotNear(room, x + (i % cols - (cols - 1) / 2) * gap, z - 2.2 - Math.floor(i / cols) * 2);
    const b = o.build(); b.group.position.set(at.x - room.cx, 0, at.z - room.cz); b.group.add(blob(.9)); room.group.add(b.group);
    shown.push({ room, idle: b.idle }); out.push({ id: o.id, x: at.x, z: at.z });
  });
  return out;
}
/** Every step: the options in the room shown move as they idle. */
export function updateModelOptions(dt: number, current: Room) {
  clock += dt;
  for (const s of shown) if (s.room === current) s.idle(clock);
}
/** A new floor: its rooms are gone, and the options with them. */
export function clearModelOptions() { shown.length = 0; }
