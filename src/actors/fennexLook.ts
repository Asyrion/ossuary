/* Fen-Nex, for the familiar (combat/fennex.ts): the Rune Fox and its full shape as animated creatures made in Tripo
   (docs/creatures.md: public/assets/creatures/fennex.glb and fennex_full.glb, loaded once the title is up), their clips
   played by what it does, its glows, mist, stars and fire built in code on their bones; or, under ?assets=off, a file that failed or the
   dev menu's switch, both built in code. */
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { glow } from '../render/materials';
import { box, limb, lit, motes, part, rune, shine, sphere, std } from '../render/arcane';
import { CFG } from '../config';
import { assetsOn } from '../assets/models';
import { CREATURES, keepMixer, overClip, preloadCreature, readyCreature } from './madeCreatures';

/** A built look: its group, how it idles, the size of the shadow under it, and the parts the familiar moves beyond its
    idle (its head and mouth). As an animated creature it also plays clips by name (`clip`: cross-faded, a gait paced to
    `speed`, a bite or breath played over the rest), and `idle(t)` runs them on the familiar's clock. */
export interface Built {
  group: THREE.Group;
  idle: (t: number) => void;
  shadow: number;
  parts?: Record<string, THREE.Object3D>;
  /** The creature it is (data/creatures.json), when it is one. */
  creature?: string;
  clip?: (name: string, speed?: number) => void;
  clipNow?: () => { clip: string; time: number; rate: number; over: string[] };
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
    shadow: CFG.artifacts.fennex.made.shadow[0],
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
    shadow: CFG.artifacts.fennex.made.shadow[1],
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

/* ---------- as animated creatures ---------- */

const CREATURE_KEY = 'ossuary.fennexCreature';
let creatureOn = (() => {
  try {
    return localStorage.getItem(CREATURE_KEY) !== 'off';
  } catch {
    return true;
  }
})();
/** Whether Fen-Nex is its animated creature (the dev menu turns it off to compare with the look in code). */
export const fennexCreature = () => creatureOn;
/** Set it (from the next time it is built: bound, grown, or come back to the mage), remembered in this browser. */
export function setFennexCreature(on: boolean) {
  creatureOn = on;
  try {
    localStorage.setItem(CREATURE_KEY, on ? 'on' : 'off');
  } catch {
    /* kept for this session */
  }
}
/** The creature of each stage: the Rune Fox for stages 1 and 2, its full shape for 3. */
export const fennexCreatureOf = (stage: number) => (stage >= 3 ? 'fennex_full' : 'fennex');
/** Load both creatures ahead (once the title is up, and again, at once, as the rune is bound: none while the assets are
    off), since its look is built at once. Never rejects. */
export async function preloadFennex() {
  if (!assetsOn()) return;
  await Promise.all(['fennex', 'fennex_full'].map((id) => preloadCreature(id)));
}

/** What rides a bone of the creature, placed in the model's own units at rest (x left-right, y up, z forward: the
    numbers `npm run animate-creature -- --bones` prints). */
type Riding = [bone: string, at: readonly [number, number, number], o: THREE.Object3D];

/** The Rune Fox's glows on its model, which paints its runes, swirls, spine line and starry plume itself: its eyes, the
    mist at its paws, the aura in its plume, stars twinkling over it, and motes of light about it. */
function runeFoxLights(g: THREE.Group): { ride: Riding[]; idle: (t: number) => void } {
  const ride: Riding[] = [];
  for (const s of [-1, 1]) ride.push(['tripo::Head_2', [0.038 * s - 0.018, 0.545, 0.44], glow(0x8ff0ff, 0.2, 0.85)]);
  const mists = (
    [
      ['tripo::0_Left_Limb_3', [0.032, 0.02, 0.27]],
      ['tripo::0_Right_Limb_3', [-0.069, 0.02, 0.27]],
      ['tripo::1_Left_Limb_2', [0.044, 0.02, -0.03]],
      ['tripo::1_Right_Limb_2', [-0.08, 0.02, -0.03]],
    ] as const
  ).map(([b, at]) => {
    const m = glow(0x7fd4ff, 0.26, 0.55);
    ride.push([b, at, m]);
    return m;
  });
  const aura = glow(0x7fe8ff, 0.9, 0.18);
  ride.push(['tripo::Tail_2', [0.06, 0.42, -0.32], aura]);
  const star = lit(0xffffff);
  const twinkles = (
    [
      ['tripo::Tail_2', [0.14, 0.47, -0.35]],
      ['tripo::Tail_3', [-0.03, 0.5, -0.5]],
      ['tripo::Tail_3', [0.16, 0.44, -0.58]],
    ] as const
  ).map(([b, at]) => {
    const t = new THREE.Group();
    part(t, box(0.008, 0.09, 0.008), star, [0, 0, 0]);
    part(t, box(0.09, 0.008, 0.008), star, [0, 0, 0]);
    ride.push([b, at, t]);
    return t;
  });
  const dustA = motes(g, 0x8ff0ff, 5, 0.55, 0.55, 0.015),
    dustB = motes(g, 0xb080ff, 4, 0.45, 0.8, 0.013);
  const { mist: Mi, twinkle: Tw } = CFG.artifacts.fennex.made;
  return {
    ride,
    idle(t) {
      mists.forEach((m, i) => (m.material.opacity = Mi[0] + Mi[1] * Math.sin(t * Mi[2] + i * Mi[3])));
      twinkles.forEach((tw, i) => tw.scale.setScalar(Tw[0] + Math.max(0, Math.sin(t * Tw[2] + i * Tw[3])) * Tw[1]));
      dustA(t, 0.7);
      dustB(t, -0.5);
    },
  };
}

/** The full shape's fire on its model, which paints its flame-tipped feathers, ear flames, leg spirals and the flame at
    its tail's tip: the glow of its eyes, of its mouth (lit as it breathes) and of the flame at its tail, and embers. */
function fenNexLights(g: THREE.Group): { ride: Riding[]; idle: (t: number) => void; mouth: THREE.Sprite } {
  const ride: Riding[] = [];
  for (const s of [-1, 1]) ride.push(['tripo::Head_2', [0.042 * s - 0.011, 0.574, 0.46], glow(0xffc040, 0.16, 0.7)]);
  const mouth = glow(0xff8a2a, 0.5, 0);
  ride.push(['tripo::Head_2', [-0.004, 0.53, 0.5], mouth]);
  const tip = glow(0xff8a2a, 0.7, 0.6);
  ride.push(['tripo::Tail_1', [0.16, 0.43, -0.47], tip]);
  const embers = motes(g, 0xff9a3a, 5, 0.6, 0.7, 0.016),
    T = CFG.artifacts.fennex.made.tip;
  return {
    ride,
    mouth,
    idle(t) {
      tip.material.opacity = T[0] + T[1] * Math.sin(t * T[2]) + T[3] * Math.sin(t * T[4]);
      embers(t, 0.6);
    },
  };
}

/** Fen-Nex at `stage` as its animated creature, sized as its look in code at stage 2 (the Rune Fox grown) or 3 (its
    full shape), or null while it isn't to be (assets off, not loaded, the dev switch off). */
function madeFennex(stage: number): Built | null {
  const id = fennexCreatureOf(stage),
    r = readyCreature(id),
    info = CREATURES[id];
  if (!creatureOn || !assetsOn() || !r || !info) return null;
  const F = CFG.artifacts.fennex,
    M = F.made;
  const g = new THREE.Group(),
    model = cloneSkinned(r.gltf.scene);
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry = m.geometry.clone(); // (its own: taking it away disposes it)
      m.frustumCulled = false; // (its bones carry it beyond the box of its rest)
      m.material = r.mat; // (the baked pixel art, its glowing runes lit; shared by every copy)
    }
  });
  // (the familiar scales its look by its stage: the model's height is the look in code's at the stage it was made for)
  const unit = info.height / info.modelHeight / F.scale[stage >= 3 ? 2 : 1];
  model.scale.setScalar(unit);
  g.add(model);
  model.updateMatrixWorld(true);
  const lights: { ride: Riding[]; idle: (t: number) => void; mouth?: THREE.Sprite } =
    stage >= 3 ? fenNexLights(g) : runeFoxLights(g);
  const bone = (name: string) => model.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  for (const [b, at, o] of lights.ride) {
    // (placed at rest in the look's frame, then carried by its bone: a holder keeps the model's scale off it)
    const holder = new THREE.Object3D(),
      to = bone(b) ?? model;
    holder.position.set(at[0] * unit, at[1] * unit, at[2] * unit);
    holder.add(o);
    g.add(holder);
    g.updateMatrixWorld(true);
    to.attach(holder);
  }
  const mixer = keepMixer(model),
    actions: Record<string, THREE.AnimationAction> = {},
    OVER = M.over; // (played over the rest: it bites on the run, breathes at the mage's heel)
  for (const c of r.gltf.animations) {
    const over = OVER.includes(c.name),
      a = mixer.clipAction(over ? overClip(id, c) : c);
    a.setLoop(over || info.clips[c.name]?.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = !over;
    actions[c.name] = a;
  }
  let now = '',
    last = 0;
  const play = (name: string, speed?: number) => {
    const a = actions[name],
      ci = info.clips[name];
    if (!a || !ci) return;
    if (OVER.includes(name)) {
      if (!a.isRunning()) a.reset().play();
      return;
    }
    // (a clip that doesn't loop, its shake as it grows, plays out before it trots on)
    if (name !== now && info.clips[now]?.loop === false && actions[now]?.isRunning()) return;
    const world = unit * (g.parent?.scale.x ?? 1); // (the model's units to the room's, once the familiar scaled its look)
    a.timeScale =
      speed !== undefined && ci.speed ? THREE.MathUtils.clamp(speed / (ci.speed * world), M.pace[0], M.pace[1]) : 1;
    if (name === now) return;
    const was = actions[now];
    a.reset().play();
    if (was) was.crossFadeTo(a, M.blend, false);
    now = name;
  };
  play('idle');
  return {
    group: g,
    shadow: M.shadow[stage >= 3 ? 1 : 0],
    parts: lights.mouth ? { mouth: lights.mouth } : {},
    creature: id,
    clip: play,
    clipNow: () => ({
      clip: now,
      time: +(actions[now]?.time ?? 0).toFixed(2),
      rate: +(actions[now]?.timeScale ?? 1).toFixed(2),
      over: OVER.filter((k) => actions[k]?.isRunning()),
    }),
    idle(t) {
      mixer.update(THREE.MathUtils.clamp(t - last, 0, CFG.artifacts.fennex.made.stepMost));
      last = t;
      lights.idle(t);
    },
  };
}

/** Whether Fen-Nex at `stage` would now be its animated creature (it was built in code while its creature loaded: once
    it has, combat/fennex.ts builds it again). */
export const fennexCreatureReady = (stage: number) =>
  creatureOn && assetsOn() && !!readyCreature(fennexCreatureOf(stage));

/** Fen-Nex as it is at `stage` (1 and 2: the Rune Fox, 3: its full shape), facing +Z, for the game (combat/fennex.ts):
    its animated creature once loaded, else built in code. */
export const fennexLook = (stage: number): Built => madeFennex(stage) ?? (stage >= 3 ? fenNex() : runeFox());
