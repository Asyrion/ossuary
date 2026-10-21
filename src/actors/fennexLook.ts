/* Fen-Nex built in code: the Rune Fox and its full shape, for the familiar (combat/fennex.ts). */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { box, limb, lit, motes, part, rune, shine, sphere, std } from '../render/arcane';

/** A built look: its group, how it idles, the size of the shadow under it, and the parts the familiar moves beyond its
    idle (its head and mouth). */
interface Built {
  group: THREE.Group;
  idle: (t: number) => void;
  shadow: number;
  parts?: Record<string, THREE.Object3D>;
}

/* ---------- Fen-Nex ---------- */

/** The familiar: a spectral fox of indigo fur, cyan runes and gold swirls
    along its flanks, glowing eyes and paws, and a great starry tail streaming behind it. Built facing +Z; it trots in
    place. */
function runeFox(): Built {
  const g = new THREE.Group(),
    fox = new THREE.Group();
  g.add(fox);
  const fur = std(0x3a2c7a),
    furDark = std(0x241a52),
    furLight = std(0x5a6ec8),
    cheek = std(0xc8d8ff);
  const cyan = lit(0x8ff0ff),
    gold = lit(0xffd878),
    violet = lit(0xb080ff),
    star = lit(0xffffff);
  // the body: torso, haunch and a pale chest with a ruff of fur down it
  const body = new THREE.Group();
  body.position.y = 0.42;
  fox.add(body);
  part(body, sphere(0.2, 12, 10), fur, [0, 0, 0], { scale: [0.72, 0.78, 1.7] });
  part(body, sphere(0.17, 10, 8), furDark, [0, 0.02, -0.24], { scale: [0.85, 0.9, 1] });
  part(body, sphere(0.12, 10, 8), furLight, [0, -0.02, 0.28], { scale: [0.9, 1, 0.85] });
  for (let i = 0; i < 4; i++)
    part(
      body,
      new THREE.ConeGeometry(0.045, 0.16, 4),
      furLight,
      [(i - 1.5) * 0.05, -0.12 - Math.abs(i - 1.5) * 0.02, 0.33],
      { rot: [Math.PI - 0.3, 0, (i - 1.5) * 0.25] },
    );
  // markings: a line of light along the spine, runes and gold swirls down each flank
  part(body, box(0.014, 0.014, 0.48), cyan, [0, 0.155, -0.02]);
  for (const s of [-1, 1]) {
    for (const [z, y] of [
      [0.12, 0.03],
      [-0.03, -0.02],
      [-0.18, 0.03],
    ])
      rune(body, 0x8ff0ff, [0.148 * s, y, z], 0.075, [0, (s * Math.PI) / 2, 0], cyan);
    part(body, new THREE.TorusGeometry(0.1, 0.006, 4, 20, Math.PI * 1.3), gold, [0.15 * s, 0.0, 0.05], {
      rot: [0, (s * Math.PI) / 2, 0.6],
    });
    part(body, new THREE.TorusGeometry(0.05, 0.006, 4, 14, Math.PI * 1.6), gold, [0.15 * s, 0.03, -0.1], {
      rot: [0, (s * Math.PI) / 2, 2.2],
    });
  }
  // neck and head: a long snout, pale cheeks swept back, tall ears lit inside, eyes of cyan light
  limb(fox, [0, 0.5, 0.3], [0, 0.62, 0.4], 0.09, furLight, 0.11);
  const head = new THREE.Group();
  head.position.set(0, 0.64, 0.42);
  fox.add(head);
  part(head, sphere(0.12, 12, 10), fur, [0, 0, 0], { scale: [1, 0.9, 1.05] });
  part(head, new THREE.ConeGeometry(0.07, 0.2, 8), fur, [0, -0.03, 0.15], {
    rot: [Math.PI / 2, 0, 0],
    scale: [1, 1, 0.8],
  });
  part(head, new THREE.ConeGeometry(0.055, 0.16, 8), cheek, [0, -0.06, 0.13], {
    rot: [Math.PI / 2, 0, 0],
    scale: [1, 1, 0.6],
  });
  part(head, sphere(0.024, 6, 5), std(0x0c0a14), [0, -0.02, 0.25]);
  const ears: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    part(head, new THREE.ConeGeometry(0.05, 0.14, 4), cheek, [0.09 * s, -0.05, -0.03], {
      rot: [-Math.PI / 2, 0, -0.5 * s],
    });
    const ear = new THREE.Group();
    ear.position.set(0.065 * s, 0.09, -0.03);
    ear.rotation.z = -0.28 * s;
    head.add(ear);
    ears.push(ear);
    part(ear, new THREE.ConeGeometry(0.055, 0.22, 4), furDark, [0, 0.1, 0]);
    part(ear, new THREE.ConeGeometry(0.03, 0.15, 4), violet, [0, 0.08, 0.02]);
    part(head, sphere(0.026, 8, 6), cyan, [0.068 * s, 0.035, 0.085], { scale: [1, 0.6, 1.3] });
    const shine2 = glow(0x8ff0ff, 0.16, 0.8);
    shine2.position.set(0.07 * s, 0.035, 0.09);
    head.add(shine2);
  }
  rune(head, 0x8ff0ff, [0, 0.1, 0.06], 0.06, [-0.9, 0, 0], cyan);
  // legs, trotting (diagonal pairs together), each paw lit and trailing a little mist
  const legs = [
    [1, 0.22, 0],
    [-1, 0.22, Math.PI],
    [1, -0.22, Math.PI],
    [-1, -0.22, 0],
  ].map(([s, z, phase]) => {
    const l = new THREE.Group();
    l.position.set(0.08 * s, 0.36, z);
    fox.add(l);
    limb(l, [0, 0, 0], [0, -0.17, 0.025], 0.036, fur, 0.03);
    limb(l, [0, -0.17, 0.025], [0, -0.33, 0], 0.026, furDark, 0.022);
    part(l, sphere(0.034, 6, 5), cyan, [0, -0.34, 0.02], { scale: [1, 0.5, 1.4] });
    const mist = glow(0x7fd4ff, 0.26, 0.55);
    mist.position.set(0, -0.34, 0);
    l.add(mist);
    return { l, phase };
  });
  // the tail: a great plume sweeping up and back and curling at its tip, dark and starry inside, streaked with light
  const TAIL = 11,
    tailFurs = [std(0x241858), std(0x33227a), std(0x3e4aa8)],
    streak = shine(0x8ff0ff, 0.55),
    streak2 = shine(0xb080ff, 0.5);
  const curve = (k: number) => ({
    y: 0.5 + 0.75 * k - 0.05 * k * k - 0.2 * k ** 3,
    z: -0.36 - 0.35 * k - 0.15 * k * k,
  });
  const segs = Array.from({ length: TAIL }, (_, i) => {
    const k = i / (TAIL - 1),
      r = 0.045 + 0.15 * Math.pow(Math.sin(k * Math.PI), 0.7) * (1 - 0.3 * k),
      s = new THREE.Group();
    fox.add(s);
    const ty = 0.75 - 0.1 * k - 0.6 * k * k,
      tz = -0.35 - 0.3 * k;
    s.rotation.x = Math.atan2(tz, ty); // (its length along the tail)
    part(s, sphere(1, 10, 8), tailFurs[i % 3], [0, 0, 0], { scale: [r * 0.8, r * 1.35, r] });
    for (const side of [-1, 1])
      for (const [dz, m] of [
        [0.65, streak],
        [-0.6, streak2],
      ] as [number, THREE.Material][])
        part(s, box(0.014, r * 1.7, 0.014), m, [side * r * 0.8 * Math.sqrt(1 - dz * dz), 0, dz * r]); // (on its skin, both sides, in from its edge: there, unoutlined, they read as a pale rim)
    for (let j = 0; j < 2; j++) {
      const a = i * 2.3 + j * 3.1;
      part(s, sphere(0.013, 4, 3), [star, gold, cyan][(i + j) % 3], [
        Math.cos(a) * r * 0.8,
        Math.sin(a * 1.3) * r,
        Math.sin(a) * r * 0.9,
      ]);
    }
    return { s, k, r };
  });
  const mark = new THREE.Group();
  segs[5].s.add(mark); // a rune-diamond of gold on the tail's flank
  for (const sd of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      part(mark, box(0.008, 0.075, 0.008), gold, [sd * segs[5].r * 0.82, Math.sin(a) * 0.026, Math.cos(a) * 0.026], {
        rot: [a, 0, 0],
      });
    }
  const aura = glow(0x7fe8ff, 0.9, 0.18);
  fox.add(aura);
  const wisps = [0, 1, 2].map((i) =>
    part(fox, new THREE.ConeGeometry(0.04, 0.24, 5), shine(0x8ff0ff, 0.45), [0, 0, 0], {
      rot: [-Math.PI / 2 - 0.2 + i * 0.25, 0, 0],
    }),
  );
  const twinkles = [0, 1, 2, 3].map((i) => {
    const t = new THREE.Group();
    fox.add(t);
    part(t, box(0.008, 0.09, 0.008), star, [0, 0, 0]);
    part(t, box(0.09, 0.008, 0.008), star, [0, 0, 0]);
    t.position.set((i - 1.5) * 0.2, 0.75 + (i % 2) * 0.25, -0.6 - (i % 3) * 0.15);
    return t;
  });
  const dustA = motes(g, 0x8ff0ff, 5, 0.55, 0.55, 0.015),
    dustB = motes(g, 0xb080ff, 4, 0.45, 0.8, 0.013);
  return {
    group: g,
    shadow: 0.8,
    idle: (t) => {
      const w = t * 5.5;
      legs.forEach(({ l, phase }) => {
        l.rotation.x = Math.sin(w + phase) * 0.42;
      });
      body.position.y = 0.42 + Math.abs(Math.sin(w)) * 0.015;
      head.position.y = 0.64 + Math.abs(Math.sin(w)) * 0.012;
      head.rotation.y = Math.sin(t * 0.6) * 0.12;
      ears.forEach((e, i) => {
        e.rotation.x = Math.max(0, Math.sin(t * 1.3 + i * 2)) ** 8 * -0.4;
      });
      for (const { s, k } of segs) {
        const c = curve(k);
        s.position.set(Math.sin(t * 1.8 - k * 2.2) * 0.09 * k, c.y + Math.sin(t * 2.4 - k * 3) * 0.03 * k, c.z);
      }
      const tip = segs[TAIL - 1].s.position;
      aura.position.copy(segs[6].s.position);
      wisps.forEach((m, i) => {
        m.position.set(tip.x + Math.sin(t * 3 + i) * 0.03, tip.y - 0.04 + i * 0.04, tip.z - 0.1);
      });
      twinkles.forEach((tw, i) => {
        tw.scale.setScalar(0.4 + Math.max(0, Math.sin(t * 2.5 + i * 1.7)) * 0.9);
      });
      dustA(t, 0.7);
      dustB(t, -0.5);
    },
  };
}

/** Fen-Nex in its full shape: a long white beast between fox, cat and dragon, its
    fur blown back into feathers tipped with flame, its legs plated dark blue with red spiral runes, eyes of ember gold, a
    long feathered tail burning at its tip; it breathes Ember. Built facing +Z; it runs in place. */
function fenNex(): Built {
  const g = new THREE.Group(),
    beast = new THREE.Group();
  g.add(beast);
  const fur = std(0xf4f0ea),
    shade2 = std(0xd8d2c8),
    plate = std(0x1c2a5a, { roughness: 0.5, metalness: 0.3 }),
    dark = std(0x10162e);
  const flame = lit(0xff8a2a),
    flameHot = lit(0xffd070),
    rune = lit(0xff3a2a),
    eyeM = lit(0xffc040);
  const body = new THREE.Group();
  body.position.y = 0.55;
  beast.add(body);
  part(body, sphere(0.25, 14, 10), fur, [0, 0, 0], { scale: [0.72, 0.72, 2] });
  part(body, sphere(0.2, 12, 8), shade2, [0, -0.06, 0.28], { scale: [0.85, 0.85, 1] });
  // feathers blown back along its back and flanks, each tipped with flame
  const tips: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++)
    for (const s of [-1, 0, 1]) {
      if (s === 0 && i % 2) continue;
      const z = 0.36 - i * 0.09,
        y = 0.16 - Math.abs(s) * 0.05,
        x = s * 0.13;
      part(body, new THREE.ConeGeometry(0.045, 0.2, 4), fur, [x, y, z], { rot: [-1.9, 0, s * 0.5] });
      tips.push(
        part(
          body,
          new THREE.ConeGeometry(0.022, 0.07, 4),
          i % 3 ? flame : flameHot,
          [x + s * 0.05, y + 0.06, z - 0.1],
          { rot: [-1.9, 0, s * 0.5] },
        ),
      );
    }
  // neck and head: a cat's round skull, a fox's snout and tall ears, a dragon's swept-back horns; ember eyes
  limb(beast, [0, 0.66, 0.42], [0, 0.86, 0.62], 0.1, fur, 0.12);
  const head = new THREE.Group();
  head.position.set(0, 0.9, 0.68);
  beast.add(head);
  part(head, sphere(0.14, 12, 10), fur, [0, 0, 0], { scale: [1, 0.9, 1.05] });
  part(head, new THREE.ConeGeometry(0.075, 0.22, 8), fur, [0, -0.03, 0.17], {
    rot: [Math.PI / 2, 0, 0],
    scale: [1, 1, 0.75],
  });
  part(head, sphere(0.026, 6, 5), dark, [0, -0.02, 0.28]);
  for (const s of [-1, 1]) {
    part(head, new THREE.ConeGeometry(0.05, 0.2, 4), fur, [0.07 * s, 0.14, -0.02], { rot: [-0.3, 0, -0.3 * s] });
    part(head, new THREE.ConeGeometry(0.028, 0.12, 4), flame, [0.07 * s, 0.16, 0], { rot: [-0.3, 0, -0.3 * s] });
    limb(head, [0.06 * s, 0.06, -0.06], [0.12 * s, 0.12, -0.26], 0.022, plate, 0.01); // (swept-back horns)
    part(head, sphere(0.028, 8, 6), eyeM, [0.07 * s, 0.03, 0.1], { scale: [1, 0.6, 1.3] });
  }
  const mouth = glow(0xff8a2a, 0.5, 0);
  mouth.position.set(0, -0.04, 0.32);
  head.add(mouth);
  // legs plated dark blue, a red spiral rune on each plate
  const legs = [
    [1, 0.3, 0],
    [-1, 0.3, Math.PI],
    [1, -0.3, Math.PI],
    [-1, -0.3, 0],
  ].map(([s, z, phase]) => {
    const l = new THREE.Group();
    l.position.set(0.11 * s, 0.5, z);
    beast.add(l);
    limb(l, [0, 0, 0], [0, -0.24, 0.03], 0.05, fur, 0.045);
    limb(l, [0, -0.24, 0.03], [0, -0.46, 0], 0.045, plate, 0.04);
    part(l, new THREE.TorusGeometry(0.03, 0.006, 4, 12, Math.PI * 1.6), rune, [0.045 * s, -0.33, 0.015], {
      rot: [0, (s * Math.PI) / 2, 0],
    });
    part(l, sphere(0.045, 6, 5), plate, [0, -0.47, 0.03], { scale: [1, 0.5, 1.4] });
    return { l, phase };
  });
  // the tail: long and feathered, burning at its tip
  const TAIL = 8,
    segs = Array.from({ length: TAIL }, (_, i) => {
      const k = i / (TAIL - 1),
        s = new THREE.Group();
      beast.add(s);
      part(s, sphere(0.06 + 0.05 * Math.sin(k * Math.PI), 8, 6), fur, [0, 0, 0], { scale: [1, 1, 1.6] });
      if (i % 2)
        for (const sd of [-1, 1])
          part(s, new THREE.ConeGeometry(0.03, 0.14, 4), fur, [sd * 0.05, 0.03, -0.04], { rot: [-2.2, 0, sd * 0.6] });
      return { s, k };
    });
  const tipFire = new THREE.Group();
  beast.add(tipFire);
  part(tipFire, new THREE.ConeGeometry(0.06, 0.2, 6), flame, [0, 0.06, 0]);
  part(tipFire, new THREE.ConeGeometry(0.035, 0.13, 6), flameHot, [0, 0.05, 0]);
  const tipGlow = glow(0xff8a2a, 0.7, 0.6);
  tipFire.add(tipGlow);
  const embers = motes(g, 0xff9a3a, 5, 0.6, 0.7, 0.016);
  return {
    group: g,
    shadow: 1,
    parts: { head, mouth },
    idle: (t) => {
      const w = t * 6;
      legs.forEach(({ l, phase }) => {
        l.rotation.x = Math.sin(w + phase) * 0.5;
      });
      body.position.y = 0.55 + Math.abs(Math.sin(w)) * 0.02;
      head.position.y = 0.9 + Math.abs(Math.sin(w)) * 0.015;
      for (const { s, k } of segs)
        s.position.set(
          Math.sin(t * 2.2 - k * 2.5) * 0.12 * k,
          0.6 + 0.25 * k + Math.sin(t * 2.6 - k * 3) * 0.03 * k,
          -0.5 - 0.55 * k,
        );
      const tip = segs[TAIL - 1].s.position;
      tipFire.position.set(tip.x, tip.y + 0.05, tip.z - 0.08);
      tipFire.scale.set(1, 0.85 + Math.sin(t * 17) * 0.15, 1);
      tips.forEach((f, i) => {
        f.scale.setScalar(0.8 + Math.sin(t * 13 + i * 1.3) * 0.25);
      });
      embers(t, 0.6);
    },
  };
}

/** Fen-Nex as it is at `stage` (1 and 2: the Rune Fox, 3: its full shape), facing +Z, for the game (combat/fennex.ts). */
export const fennexLook = (stage: number) => (stage >= 3 ? fenNex() : runeFox());
