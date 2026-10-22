/* The bestiary's creatures: beasts of myth and magic, each built to read at a glance as what it is
   (docs/archive/M4.5-plan.md). Each stands (or hovers) over y = 0 facing +Z and idles; parts a foe's behaviour will move are named
   in `parts`. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, limb, lit, part, shine, sphere, std, type V3 } from '../render/arcane';
import { batWing, featherWing, gloss, joint, slitEyes, spike, thin, tube, type Built } from './beastParts';

const { ember: E, frost: F, storm: S, hallow: H, umbral: U } = SCHOOL_LIGHT;

/** Floor 1, Umbral: a great grimoire that flies on its own covers, its pages grown into teeth, a red ribbon of a tongue
    and an eye that opens on its cover. */
export function grimoireMimic(): Built {
  const g = new THREE.Group(),
    book = joint(g, [0, 0.8, 0]),
    leather = gloss(0x4a1a2c, 0.55, 0.15),
    gilt = gloss(0xc89a44, 0.3, 0.75),
    paper = std(0xe6d8b8),
    tooth = std(0xf2ead6);
  book.scale.setScalar(1.25);
  const half = (up: 1 | -1) => {
    const h = joint(book, [0, 0, -0.33]);
    part(h, new THREE.BoxGeometry(0.5, 0.07, 0.62), paper, [0, 0.04 * up, 0.33]);
    part(h, new THREE.BoxGeometry(0.58, 0.03, 0.68), leather, [0, 0.09 * up, 0.34]);
    for (const s of [-1, 1])
      part(h, new THREE.ConeGeometry(0.07, 0.03, 3), gilt, [0.25 * s, 0.1 * up, 0.63], {
        rot: [0, s * 0.8, 0],
        scale: [1, 1, 1],
      });
    for (let i = 0; i < 8; i++)
      spike(h, [-0.21 + i * 0.06, 0.07 * up * 0.3, 0.62], [-0.21 + i * 0.06, -0.045 * up, 0.66], 0.022, tooth);
    for (let i = 0; i < 3; i++)
      spike(h, [0.24, 0.07 * up * 0.3, 0.5 - i * 0.14], [0.24, -0.04 * up, 0.5 - i * 0.14], 0.018, tooth);
    for (let i = 0; i < 3; i++)
      spike(h, [-0.24, 0.07 * up * 0.3, 0.5 - i * 0.14], [-0.24, -0.04 * up, 0.5 - i * 0.14], 0.018, tooth);
    return h;
  };
  const upper = half(1),
    lower = half(-1);
  part(book, new THREE.CylinderGeometry(0.075, 0.075, 0.6, 8), leather, [0, 0, -0.34], { rot: [0, 0, Math.PI / 2] });
  for (const x of [-0.18, 0.18])
    part(book, new THREE.TorusGeometry(0.078, 0.012, 4, 10), gilt, [x, 0, -0.34], { rot: [0, Math.PI / 2, 0] });
  // the eye on the cover, in a ring of gilt, under a lid of leather
  const eye = joint(upper, [0, 0.11, 0.34]);
  part(eye, new THREE.TorusGeometry(0.1, 0.018, 4, 14), gilt, [0, 0, 0], { rot: [Math.PI / 2, 0, 0] });
  part(eye, sphere(0.085, 10, 6), lit(0xd7b0ff), [0, 0, 0], { scale: [1.15, 0.3, 0.62] });
  part(eye, new THREE.BoxGeometry(0.03, 0.02, 0.1), lit(0x14081e), [0, 0.02, 0]);
  const lid = part(eye, sphere(0.09, 8, 4), leather, [0, 0.01, -0.03], { scale: [1.2, 0.3, 0.5] });
  tube(
    book,
    [
      [0, -0.02, 0.12],
      [0, -0.04, 0.45],
      [0.04, -0.16, 0.62],
      [0.02, -0.32, 0.6],
      [-0.03, -0.4, 0.52],
    ],
    0.032,
    0.02,
    std(0x8a1a2a),
    12,
    5,
  );
  const maw = glow(U, 0.7, 0.55);
  maw.position.set(0, 0, 0.2);
  book.add(maw);
  const pages = [0, 1, 2].map(() => part(g, new THREE.PlaneGeometry(0.16, 0.2), thin(0xe6d8b8), [0, 0, 0]));
  return {
    group: g,
    shadow: 0.9,
    parts: { book, upper, lower },
    idle: (t) => {
      const bite = Math.max(0, Math.sin(t * 3.2));
      upper.rotation.x = -0.18 - bite * 0.4;
      lower.rotation.x = 0.08 + bite * 0.18;
      book.position.y = 0.8 + Math.sin(t * 2) * 0.06;
      book.rotation.z = Math.sin(t * 1.3) * 0.08;
      lid.position.z = Math.floor(t / 3.1) % 2 && t % 3.1 < 0.15 ? 0.03 : -0.03;
      maw.material.opacity = 0.35 + bite * 0.4;
      pages.forEach((p, i) => {
        const a = t * 1.2 + i * 2.1;
        p.position.set(Math.cos(a) * 0.7, 0.6 + Math.sin(t * 2 + i) * 0.2, Math.sin(a) * 0.55);
        p.rotation.set(t * 2 + i, a, t + i);
      });
    },
  };
}

/** A pool of dark water `r` across with a ring of ripples, for what rises out of one. */
function pool(parent: THREE.Object3D, r: number) {
  part(
    parent,
    new THREE.CircleGeometry(r, 18),
    std(0x2e5e6e, { roughness: 0.9, emissive: 0x16404e }), // (the floor's deep water, as the room's pools: a near-black one read as a hole)
    [0, 0.008, 0],
    { rot: [-Math.PI / 2, 0, 0] },
  );
  return [0, 1].map(() =>
    part(parent, new THREE.RingGeometry(0.9, 1, 24), shine(0x9fe4ff, 0.35), [0, 0.012, 0], {
      rot: [-Math.PI / 2, 0, 0],
    }),
  );
}

/** Floor 2, Frost: a sea serpent risen in coils out of a pool, green-scaled and pale-bellied, a frill of ice-blue fins down
    its neck and a fanged, finned head. */
export function brineSerpent(): Built {
  const g = new THREE.Group(),
    scale = gloss(0x2a5e58, 0.35, 0.2),
    belly = std(0xa8c8b4),
    fin = thin(0x7fd4ff, { transparent: true, opacity: 0.8, roughness: 0.3 }),
    fang = std(0xf0ece0);
  const water = joint(g, [0, 0, 0]),
    ripples = pool(water, 0.8); // (its pool, a part of its own: the foe keeps it at the floor while it sinks)
  const body = joint(g, [0, 0, 0]);
  tube(
    body,
    [
      [0.5, -0.15, -0.5],
      [0.6, 0.25, -0.3],
      [0.62, 0.3, -0.05],
      [0.6, -0.15, 0.15],
    ],
    0.12,
    0.09,
    scale,
    10,
    7,
  );
  tube(
    body,
    [
      [-0.55, -0.1, -0.1],
      [-0.62, 0.14, -0.32],
      [-0.48, 0.3, -0.5],
    ],
    0.07,
    0.015,
    scale,
    8,
    5,
  );
  part(body, new THREE.ConeGeometry(0.12, 0.26, 3), fin, [-0.46, 0.38, -0.52], {
    rot: [-0.6, 0, 0],
    scale: [1, 1, 0.15],
  });
  const neck = joint(body, [0, 0, 0]);
  const spine: V3[] = [
    [0, -0.12, -0.22],
    [-0.02, 0.35, -0.18],
    [0, 0.78, -0.05],
    [0.02, 1.02, 0.14],
  ];
  tube(neck, spine, 0.17, 0.11, scale, 12, 8);
  for (let i = 0; i < 6; i++) {
    const k = i / 6,
      y = 0.05 + k * 0.9,
      z = -0.12 + k * 0.18;
    part(neck, sphere(0.12 - k * 0.03, 6, 4), belly, [0, y, z + 0.1], { scale: [1, 0.45, 0.5] });
  }
  for (let i = 0; i < 7; i++) {
    const k = i / 7,
      y = 0.15 + k * 0.85,
      z = -0.32 + k * 0.32;
    part(neck, new THREE.ConeGeometry(0.07, 0.2 - k * 0.05, 3), fin, [0, y, z], {
      rot: [-0.9, 0, 0],
      scale: [1, 1, 0.12],
    });
  }
  const head = joint(neck, [0.02, 1.05, 0.18], [0.35, 0, 0]);
  part(head, sphere(0.14, 10, 8), scale, [0, 0, 0.06], { scale: [0.92, 0.62, 1.55] });
  const jaw = joint(head, [0, -0.05, -0.02], [0.35, 0, 0]);
  part(jaw, sphere(0.11, 8, 6), belly, [0, -0.02, 0.14], { scale: [0.85, 0.35, 1.4] });
  for (const s of [-1, 1]) {
    spike(head, [0.05 * s, -0.04, 0.22], [0.045 * s, -0.13, 0.24], 0.016, fang);
    spike(jaw, [0.04 * s, 0, 0.22], [0.04 * s, 0.08, 0.25], 0.013, fang);
  }
  slitEyes(head, 0.09, 0.06, 0.12, 0.042, F, 0.6, 0.3);
  for (const s of [-1, 1]) {
    const f = joint(head, [0.12 * s, 0.02, -0.06], [0, 0.5 * s, 0]);
    for (let k = 0; k < 3; k++)
      part(f, new THREE.ConeGeometry(0.05, 0.24, 3), fin, [0.06 * s, 0.02 + k * 0.05, -0.06], {
        rot: [-1.2 + k * 0.25, 0, -0.9 * s],
        scale: [1, 1, 0.15],
      });
  }
  return {
    group: g,
    shadow: 0,
    parts: { body, neck, head, jaw, pool: water },
    idle: (t) => {
      neck.rotation.z = Math.sin(t * 1.1) * 0.06;
      neck.rotation.x = Math.sin(t * 0.8) * 0.04;
      head.rotation.y = Math.sin(t * 0.9) * 0.2;
      jaw.rotation.x = 0.25 + Math.max(0, Math.sin(t * 1.8)) * 0.35;
      ripples.forEach((r, i) => {
        const k = (t * 0.4 + i / 2) % 1;
        r.scale.setScalar(0.35 + k * 0.55);
        (r.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - k);
      });
    },
  };
}

/** Floor 3, Ember (elite): a firebird taller than the mage with its wings raised, every feather tipped with flame, a crest
    and a long tail of fire streaming behind. */
export function phoenix(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 1.15, 0]),
    red = std(0xc8381a),
    deep = std(0x7a1a10),
    gold = gloss(0xe8b040, 0.3, 0.5),
    flame = lit(E),
    hot = lit(0xffd36a);
  part(body, sphere(0.22, 10, 8), red, [0, 0, 0], { scale: [0.9, 0.95, 1.55] });
  part(body, sphere(0.17, 8, 6), hot, [0, -0.06, 0.1], { scale: [0.8, 0.8, 1.2] });
  const core = glow(E, 1.6, 0.45);
  body.add(core);
  const head = joint(body, [0, 0.2, 0.3]);
  limb(body, [0, 0.05, 0.18], [0, 0.2, 0.3], 0.1, red, 0.08);
  part(head, sphere(0.11, 8, 6), red, [0, 0, 0], { scale: [0.9, 0.95, 1.2] });
  tube(
    head,
    [
      [0, 0.02, 0.08],
      [0, 0.0, 0.2],
      [0, -0.07, 0.26],
    ],
    0.04,
    0.008,
    gold,
    6,
    5,
  );
  slitEyes(head, 0.06, 0.03, 0.07, 0.03, 0xfff0a0, 0.7, 0.3);
  for (let i = 0; i < 6; i++) {
    const a = (i - 2.5) * 0.25;
    spike(
      head,
      [0, 0.06, -0.02],
      [Math.sin(a) * 0.12, 0.22 + Math.cos(a) * 0.05 - Math.abs(a) * 0.08, -0.26 - Math.abs(a) * 0.1],
      0.025,
      i % 2 ? flame : hot,
    );
  }
  const wings = ([-1, 1] as const).map((s) => {
    const w = featherWing(body, s, [0.12 * s, 0.1, 0.05], 1.15, red, flame, 9, 0.6);
    for (let i = 0; i < 6; i++)
      spike(
        w,
        [(0.3 + i * 0.14) * s, -0.01, -0.3 - i * 0.04],
        [(0.34 + i * 0.16) * s, -0.02, -0.55 - i * 0.06],
        0.03,
        i % 2 ? hot : flame,
      );
    return w;
  });
  const tail = joint(body, [0, -0.05, -0.3]);
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.22,
      len = 0.9 - Math.abs(i - 2) * 0.12;
    part(
      tail,
      new THREE.ConeGeometry(0.07, len, 4),
      i === 2 ? deep : red,
      [Math.sin(a) * len * 0.45, -0.1, -len * 0.45],
      { rot: [-Math.PI / 2 + 0.25, 0, -a], scale: [1, 1, 0.22] },
    );
    spike(
      tail,
      [Math.sin(a) * len * 0.85, -0.2, -len * 0.85],
      [Math.sin(a) * len * 1.05, -0.3, -len * 1.1],
      0.04,
      i % 2 ? hot : flame,
    );
  }
  for (const s of [-1, 1])
    tube(
      tail,
      [
        [0.03 * s, -0.08, -0.1],
        [0.2 * s, -0.35, -0.5],
        [0.12 * s, -0.6, -0.9],
        [0.2 * s, -0.7, -1.1],
      ],
      0.035,
      0.008,
      flame,
      12,
      4,
    );
  for (const s of [-1, 1])
    for (let k = -1; k <= 1; k++) spike(body, [0.07 * s, -0.2, 0.05], [0.08 * s + k * 0.04, -0.38, 0.14], 0.015, gold);
  const embers = [0, 1, 2, 3, 4, 5].map(() => part(g, sphere(0.03, 4, 3), hot, [0, 0, 0]));
  return {
    group: g,
    shadow: 1.6,
    parts: { body, head, tail },
    idle: (t) => {
      const f = Math.sin(t * 2.6);
      wings[0].rotation.z = -0.55 - f * 0.4;
      wings[1].rotation.z = 0.55 + f * 0.4;
      body.position.y = 1.15 + Math.sin(t * 2.6 + 1.2) * 0.06;
      tail.rotation.x = Math.sin(t * 1.5) * 0.08;
      head.rotation.y = Math.sin(t * 0.8) * 0.25;
      core.material.opacity = 0.35 + 0.15 * Math.sin(t * 4);
      embers.forEach((e, i) => {
        const k = (t * 0.5 + i / 6) % 1;
        e.position.set(Math.sin(i * 2.7) * 0.6 * (1 - k), 0.4 + k * 1.4, -0.3 + Math.cos(i * 1.9) * 0.4);
        e.scale.setScalar(1 - k);
      });
    },
  };
}

/** Floor 3, Umbral: a basilisk as long as two men lying down, low on six clawed legs, a crown of spines on its brow and
    a stare that burns violet. */
export function basilisk(): Built {
  const g = new THREE.Group(),
    hide = gloss(0x55663a, 0.5, 0.12),
    stripe = gloss(0x2c3620, 0.5, 0.12),
    belly = std(0xc8b878),
    crown = gloss(0x6a3a8a, 0.35, 0.3),
    claw = gloss(0x1a1414, 0.3, 0.3),
    stare = lit(0xd0a0ff);
  const body = joint(g, [0, 0, 0]);
  tube(
    body,
    [
      [0.3, 0.05, -1.35],
      [0.2, 0.08, -1.05],
      [0, 0.14, -0.7],
      [0, 0.24, -0.35],
    ],
    0.03,
    0.22,
    hide,
    14,
    8,
  );
  tube(
    body,
    [
      [0, 0.24, -0.35],
      [0, 0.3, 0],
      [0, 0.31, 0.32],
    ],
    0.23,
    0.18,
    hide,
    8,
    8,
  );
  for (let i = 0; i < 6; i++) {
    const k = i / 6;
    part(
      body,
      new THREE.TorusGeometry(0.2 - k * 0.1, 0.03, 3, 10),
      stripe,
      [k * 0.1, 0.26 - k * 0.16, 0.05 - k * 1.05],
      { rot: [Math.PI / 2 - 0.2, 0, 0], scale: [1, 1, 0.6] },
    );
  }
  part(body, sphere(0.2, 8, 6), belly, [0, 0.15, -0.1], { scale: [1.05, 0.4, 2.2] });
  for (let i = 0; i < 9; i++) {
    const k = i / 9;
    spike(
      body,
      [k * 0.08, 0.5 - k * 0.3, 0.18 - k * 1.2],
      [k * 0.08, 0.64 - k * 0.34, 0.12 - k * 1.2],
      0.045 - k * 0.025,
      crown,
    );
  }
  const head = joint(body, [0, 0.34, 0.5]);
  part(head, sphere(0.19, 10, 8), hide, [0, 0, 0.06], { scale: [1, 0.62, 1.45] });
  part(head, sphere(0.12, 8, 6), stripe, [0, 0.07, 0.0], { scale: [1.2, 0.5, 1.5] });
  const jaw = joint(head, [0, -0.07, 0], [0.12, 0, 0]);
  part(jaw, sphere(0.15, 8, 6), stripe, [0, -0.02, 0.12], { scale: [0.9, 0.35, 1.4] });
  for (const s of [-1, 1]) spike(head, [0.07 * s, -0.05, 0.28], [0.065 * s, -0.14, 0.3], 0.018, std(0xeee6d0));
  const eyes = slitEyes(head, 0.11, 0.06, 0.14, 0.06, 0xd0a0ff, 0.55, 0.35);
  const gazes = [-1, 1].map((s) => {
    const gl = glow(U, 0.5, 0.75);
    gl.position.set(0.12 * s, 0.06, 0.16);
    head.add(gl);
    return gl;
  });
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * 0.3;
    spike(head, [Math.sin(a) * 0.1, 0.08, -0.04], [Math.sin(a) * 0.26, 0.36 - Math.abs(a) * 0.06, -0.24], 0.04, crown);
    part(head, sphere(0.024, 4, 3), stare, [Math.sin(a) * 0.26, 0.36 - Math.abs(a) * 0.06, -0.24]);
  }
  const legs = [-1, 1].flatMap((s) =>
    [0.22, -0.5].map((z) => {
      const l = joint(body, [0.16 * s, 0.2, z]);
      tube(
        l,
        [
          [0, 0, 0],
          [0.16 * s, 0.03, 0.03],
          [0.27 * s, -0.06, 0.08],
          [0.3 * s, -0.19, 0.12],
        ],
        0.085,
        0.05,
        hide,
        8,
        6,
      );
      for (const k of [-1, 0, 1]) spike(l, [0.3 * s, -0.19, 0.12], [0.34 * s + k * 0.05, -0.2, 0.24], 0.022, claw);
      return l;
    }),
  );
  return {
    group: g,
    shadow: 1.6,
    parts: { body, head, jaw },
    idle: (t) => {
      body.rotation.y = Math.sin(t * 0.9) * 0.05;
      head.rotation.y = Math.sin(t * 0.7) * 0.3;
      jaw.rotation.x = 0.1 + Math.max(0, Math.sin(t * 1.2)) * 0.12;
      legs.forEach((l, i) => {
        l.rotation.y = Math.sin(t * 1.8 + i * 1.7) * 0.06;
      });
      const g2 = 0.5 + 0.3 * Math.sin(t * 2);
      for (const gl of gazes) gl.material.opacity = g2;
      for (const e of eyes) e.scale.y = 0.38 * (t % 4 < 0.1 ? 0.3 : 1);
    },
  };
}

/** Floor 4, Hallow (elite): a griffin, an eagle's white head and gold wings on a lion's body, taloned forefeet and a lion's
    tail, the Reliquary's treasure-guard. */
export function griffin(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0, 0]),
    fur = std(0xc89a50),
    dark = std(0x8a6430),
    feather = std(0xf2ead8),
    wingM = std(0xb88a40),
    tipM = gloss(0xf0d890, 0.3, 0.5),
    beak = gloss(0xe8b830, 0.3, 0.4),
    talon = gloss(0x1a1410, 0.3, 0.3);
  part(body, sphere(0.3, 10, 8), fur, [0, 0.72, -0.25], { scale: [0.85, 0.8, 1.5] });
  part(body, sphere(0.26, 10, 8), feather, [0, 0.82, 0.12], { scale: [0.9, 0.95, 1] });
  const legs = [-1, 1]
    .map((s) => {
      const f = joint(body, [0.15 * s, 0.62, 0.22]);
      part(f, sphere(0.11, 8, 6), feather, [0.01 * s, -0.1, 0.04], { scale: [1, 1.6, 1] });
      tube(
        f,
        [
          [0, -0.2, 0.05],
          [0.02 * s, -0.4, 0.1],
          [0.03 * s, -0.6, 0.14],
        ],
        0.065,
        0.05,
        beak,
        6,
        6,
      );
      for (const k of [-1, 0, 1]) spike(f, [0.03 * s, -0.6, 0.14], [0.03 * s + k * 0.05, -0.62, 0.26], 0.02, talon);
      const h = joint(body, [0.18 * s, 0.66, -0.6]);
      tube(
        h,
        [
          [0, 0, 0],
          [0.03 * s, -0.25, 0.12],
          [0.02 * s, -0.48, -0.06],
          [0.02 * s, -0.64, 0.02],
        ],
        0.12,
        0.06,
        fur,
        8,
        6,
      );
      part(h, sphere(0.07, 6, 5), fur, [0.02 * s, -0.64, 0.06], { scale: [1, 0.6, 1.3] });
      return [f, h];
    })
    .flat();
  const neck = joint(body, [0, 0.95, 0.28]);
  tube(
    neck,
    [
      [0, 0, 0],
      [0, 0.18, 0.1],
      [0, 0.28, 0.2],
    ],
    0.17,
    0.13,
    feather,
    6,
    7,
  );
  const head = joint(neck, [0, 0.34, 0.26]);
  part(head, sphere(0.16, 10, 8), feather, [0, 0, 0], { scale: [0.9, 0.9, 1.15] });
  tube(
    head,
    [
      [0, 0.02, 0.1],
      [0, 0.02, 0.24],
      [0, -0.06, 0.3],
      [0, -0.13, 0.27],
    ],
    0.07,
    0.01,
    beak,
    8,
    6,
  );
  for (const s of [-1, 1]) {
    part(head, new THREE.BoxGeometry(0.08, 0.03, 0.1), dark, [0.07 * s, 0.07, 0.06], { rot: [0, -0.3 * s, -0.25 * s] });
    spike(head, [0.08 * s, 0.08, -0.08], [0.12 * s, 0.2, -0.24], 0.03, feather);
  }
  slitEyes(head, 0.085, 0.03, 0.09, 0.035, H, 0.8, 0.3);
  const wings = ([-1, 1] as const).map((s) => featherWing(body, s, [0.18 * s, 1.0, -0.1], 1.05, wingM, tipM, 9, 0.5));
  const tail = joint(body, [0, 0.78, -0.72]);
  tube(
    tail,
    [
      [0, 0, 0],
      [0, -0.1, -0.3],
      [0.05, -0.35, -0.45],
      [0.12, -0.45, -0.35],
    ],
    0.045,
    0.03,
    fur,
    10,
    5,
  );
  part(tail, sphere(0.07, 6, 5), dark, [0.13, -0.47, -0.32], { scale: [1, 1.4, 1] });
  return {
    group: g,
    shadow: 1.7,
    parts: { body, neck, head, tail },
    idle: (t) => {
      const f = Math.sin(t * 1.4);
      wings[0].rotation.z = -0.75 - f * 0.2;
      wings[1].rotation.z = 0.75 + f * 0.2;
      wings[0].rotation.y = 0.3;
      wings[1].rotation.y = -0.3;
      head.rotation.y = Math.sin(t * 0.8) * 0.35;
      head.rotation.x = Math.sin(t * 1.3) * 0.08;
      tail.rotation.y = Math.sin(t * 1.6) * 0.3;
      body.position.y = Math.sin(t * 1.4) * 0.01;
      void legs;
    },
  };
}

/** Floor 4, Hallow: a great eye, gold-irised and slit, in turning wheels of gold set with lesser eyes, white wings folded
    round it: the Reliquary's watcher. */
export function radiantEye(): Built {
  const g = new THREE.Group(),
    core = joint(g, [0, 1.05, 0]),
    white = std(0xf6f0e0, { roughness: 0.4 }),
    gold = gloss(0xd8a840, 0.3, 0.75),
    wingM = std(0xf4eedc),
    tipM = std(0xe8d090),
    iris = lit(H),
    small = lit(0xfff0c0);
  const halo = glow(H, 1.9, 0.3);
  core.add(halo);
  const eye = joint(core, [0, 0, 0]);
  part(eye, sphere(0.24, 14, 10), white, [0, 0, 0]);
  part(eye, new THREE.CircleGeometry(0.14, 18), iris, [0, 0, 0.238]);
  part(eye, new THREE.CircleGeometry(0.07, 12), lit(0x140c04), [0, 0, 0.242], { scale: [0.38, 1, 1] });
  const lids = [1, -1].map((s) => {
    const l = joint(eye, [0, 0, 0]);
    part(l, new THREE.SphereGeometry(0.26, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), gold, [0, 0, 0], {
      rot: [s > 0 ? -0.9 : Math.PI + 0.9, 0, 0],
    });
    return { l, s };
  });
  const wheels = [
    [0, 0, 0, 0.46],
    [Math.PI / 2, 0, 0.5, 0.56],
    [0.9, 1.2, 0, 0.5],
  ].map(([x, y, z, r]) => {
    const w = joint(joint(core, [0, 0, 0], [x, y, z]), [0, 0, 0]);
    part(w, new THREE.TorusGeometry(r, 0.022, 5, 36), gold, [0, 0, 0]);
    part(w, new THREE.TorusGeometry(r * 0.88, 0.01, 4, 36), gold, [0, 0, 0]);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(w, sphere(0.035, 6, 5), small, [Math.cos(a) * r * 0.94, Math.sin(a) * r * 0.94, 0]);
    }
    return w;
  });
  const wings = [
    [1, 0.4],
    [-1, 0.4],
    [1, -0.5],
    [-1, -0.5],
  ].map(([s, tilt]) => {
    const w = featherWing(core, s as 1 | -1, [0.18 * s, tilt * 0.3, -0.15], 0.55, wingM, tipM, 7, 0.45);
    w.rotation.z = tilt * s;
    return w;
  });
  return {
    group: g,
    shadow: 1,
    parts: { core, eye, lidTop: lids[0].l, lidBottom: lids[1].l, halo }, // (its halo named, so a made look keeps its light)
    idle: (t) => {
      core.position.y = 1.05 + Math.sin(t * 1.5) * 0.05;
      wheels.forEach((w, i) => {
        w.rotation.z = t * (0.6 + i * 0.15) * (i % 2 ? -1 : 1);
      });
      eye.rotation.y = Math.sin(t * 0.7) * 0.35;
      eye.rotation.x = Math.sin(t * 0.9) * 0.15;
      const open = t % 5 < 0.2 ? 0.2 : 1;
      lids.forEach(({ l, s }) => {
        l.rotation.x = s * (1 - open) * 0.9;
      });
      wings.forEach((w, i) => {
        w.rotation.y = Math.sin(t * 2.2 + i) * 0.15;
      });
      halo.material.opacity = 0.22 + 0.1 * Math.sin(t * 2);
    },
  };
}

/** Floor 4, Storm: a harpy, vulture wings where its arms should be, gold-edged with storm; a pale masked face with a
    hooked nose and burning eyes under a mane of dark hair, a ruff of feathers, and taloned legs hanging below. */
export function harpy(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 1.0, 0]),
    skin = std(0xb0a898),
    feathers = std(0x4a3e36),
    ruff = std(0x6a5a4a),
    tipM = gloss(0xd8c060, 0.3, 0.5),
    hair = std(0x1e1a1c),
    talon = gloss(0x1a1410, 0.3, 0.3),
    leg = gloss(0x8a7a4a, 0.4, 0.3);
  part(body, sphere(0.18, 10, 8), skin, [0, 0.12, 0.02], { scale: [0.95, 1.1, 0.75] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    part(body, new THREE.ConeGeometry(0.07, 0.36, 4), feathers, [Math.cos(a) * 0.14, -0.18, Math.sin(a) * 0.11], {
      rot: [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35],
      scale: [1, 1, 0.4],
    });
  }
  part(body, sphere(0.2, 10, 8), feathers, [0, -0.06, 0], { scale: [1, 0.8, 0.85] });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    spike(
      body,
      [Math.cos(a) * 0.1, 0.3, Math.sin(a) * 0.08],
      [Math.cos(a) * 0.22, 0.26, Math.sin(a) * 0.18],
      0.045,
      ruff,
    );
  }
  const head = joint(body, [0, 0.42, 0.04]);
  head.scale.setScalar(1.25);
  part(head, sphere(0.12, 10, 8), skin, [0, 0, 0], { scale: [0.85, 1.05, 0.9] });
  spike(head, [0, 0.01, 0.1], [0, -0.06, 0.19], 0.03, skin);
  for (const s of [-1, 1])
    part(head, sphere(0.04, 6, 5), lit(0x1a1418), [0.045 * s, 0.025, 0.085], { scale: [1.3, 0.7, 0.5] });
  slitEyes(head, 0.045, 0.025, 0.1, 0.026, S, 0.3, 0.35);
  part(head, new THREE.BoxGeometry(0.06, 0.01, 0.02), lit(0x2a0a0a), [0, -0.06, 0.1]);
  const mane = joint(head, [0, 0.06, -0.04]);
  for (let i = 0; i < 11; i++) {
    const a = (i - 5) * 0.32,
      side = Math.sign(a) || 1;
    tube(
      mane,
      [
        [Math.sin(a) * 0.1, 0.05, -0.01],
        [Math.sin(a) * 0.16, 0.06, -0.1],
        [Math.sin(a) * 0.14 + side * 0.06, -0.12, -0.12 + Math.abs(a) * 0.1],
        [Math.sin(a) * 0.12 + side * 0.08, -0.36, -0.12 + Math.abs(a) * 0.12],
      ],
      0.045,
      0.01,
      hair,
      8,
      4,
    );
  }
  const wings = ([-1, 1] as const).map((s) => featherWing(body, s, [0.14 * s, 0.2, 0], 0.9, feathers, tipM, 9, 0.6));
  const legs = [-1, 1].map((s) => {
    const l = joint(body, [0.07 * s, -0.24, 0.02]);
    tube(
      l,
      [
        [0, 0, 0],
        [0.02 * s, -0.18, 0.08],
        [0.03 * s, -0.36, 0.02],
      ],
      0.04,
      0.025,
      leg,
      6,
      5,
    );
    for (const k of [-1, 0, 1]) spike(l, [0.03 * s, -0.36, 0.02], [0.03 * s + k * 0.05, -0.44, 0.1], 0.016, talon);
    return l;
  });
  return {
    group: g,
    shadow: 1.2,
    parts: { body, head },
    idle: (t) => {
      const f = Math.sin(t * 3.4);
      wings[0].rotation.z = -0.2 - f * 0.5;
      wings[1].rotation.z = 0.2 + f * 0.5;
      body.position.y = 1.0 + Math.sin(t * 3.4 + 1.3) * 0.06;
      mane.rotation.x = Math.sin(t * 3.4) * 0.1;
      head.rotation.y = Math.sin(t * 1.1) * 0.3;
      legs.forEach((l, i) => {
        l.rotation.x = Math.sin(t * 2 + i) * 0.15;
      });
    },
  };
}

/** Floor 4, Umbral: a gaunt fox of shadow, black with a violet sheen, ears laid back and teeth bared, three tails of smoke
    behind it that thin to nothing. Nothing like Fen-Nex: dark where it is bright, lean where it is round. */
export function shadowFox(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0, 0]),
    coat = gloss(0x221c2e, 0.4, 0.2),
    under = std(0x3a3048),
    smoke = std(0x4a2a70, { transparent: true, opacity: 0.8 }),
    tooth = std(0xe8e0d0),
    wisp = shine(U, 0.6),
    mark = lit(0x9a6ad8);
  body.scale.setScalar(1.15);
  tube(
    body,
    [
      [0, 0.44, -0.38],
      [0, 0.5, -0.1],
      [0, 0.5, 0.14],
    ],
    0.14,
    0.15,
    coat,
    8,
    7,
  );
  part(body, sphere(0.15, 8, 6), under, [0, 0.44, 0.16], { scale: [0.9, 0.9, 1] });
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++)
      part(body, new THREE.BoxGeometry(0.012, 0.1, 0.016), mark, [0.14 * s, 0.5, -0.25 + i * 0.12], {
        rot: [0.4, 0, 0.25 * s],
      });
  const legs = [-1, 1].flatMap((s) =>
    [
      [0.12, 0.16],
      [-0.36, -0.36],
    ].map(([z, fz]) => {
      const l = joint(body, [0.08 * s, 0.42, z]);
      tube(
        l,
        [
          [0, 0, 0],
          [0.02 * s, -0.2, 0.04 * Math.sign(z + 0.1)],
          [0.02 * s, -0.42, (fz - z) * 0.2 - 0.02],
        ],
        0.05,
        0.028,
        coat,
        6,
        5,
      );
      part(l, sphere(0.04, 6, 4), coat, [0.02 * s, -0.42, (fz - z) * 0.2 + 0.02], { scale: [1, 0.5, 1.4] });
      return l;
    }),
  );
  const head = joint(body, [0, 0.6, 0.3]);
  part(head, sphere(0.12, 10, 8), coat, [0, 0, 0], { scale: [1, 0.85, 1] });
  part(head, new THREE.ConeGeometry(0.075, 0.26, 6), coat, [0, -0.03, 0.18], {
    rot: [Math.PI / 2 + 0.12, 0, 0],
    scale: [1, 1, 0.7],
  });
  for (const s of [-1, 1]) {
    part(head, new THREE.ConeGeometry(0.06, 0.2, 4), coat, [0.07 * s, 0.14, -0.06], {
      rot: [-0.6, 0, -0.3 * s],
      scale: [1, 1, 0.45],
    });
    for (const z of [0.12, 0.2]) spike(head, [0.03 * s, -0.07, z], [0.028 * s, -0.12, z + 0.01], 0.01, tooth);
  }
  slitEyes(head, 0.055, 0.03, 0.1, 0.032, 0xc58aff, 0.5, 0.45);
  const tails = [-1, 0, 1].map((k) => {
    const tl = joint(body, [0, 0.5, -0.4]);
    tube(
      tl,
      [
        [0, 0, 0],
        [k * 0.12, 0.06, -0.22],
        [k * 0.26, 0.28, -0.4],
        [k * 0.3, 0.5, -0.38],
      ],
      0.08,
      0.02,
      smoke,
      10,
      6,
    );
    part(tl, sphere(0.06, 6, 5), wisp, [k * 0.3, 0.52, -0.38]);
    return tl;
  });
  const puffs = [0, 1, 2, 3].map(() => part(g, sphere(0.08, 6, 5), shine(0x5a2a90, 0.45), [0, 0.05, 0]));
  return {
    group: g,
    shadow: 1,
    parts: { body, head },
    idle: (t) => {
      head.rotation.y = Math.sin(t * 0.9) * 0.3;
      tails.forEach((tl, i) => {
        tl.rotation.y = Math.sin(t * 1.4 + i * 1.3) * 0.2;
        tl.rotation.x = Math.sin(t * 1.1 + i) * 0.08;
      });
      puffs.forEach((p, i) => {
        const k = (t * 0.4 + i / 4) % 1;
        p.position.set(Math.sin(i * 2.4) * 0.3, 0.05 + k * 0.3, -0.3 + Math.cos(i * 1.8) * 0.3);
        p.scale.setScalar(1 + k);
        (p.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - k);
      });
      legs.forEach((l, i) => {
        l.rotation.x = Math.sin(t * 1.5 + i) * 0.04;
      });
    },
  };
}

/** Floor 5, Umbral (elite): a hydra of the black marsh, a squat scaled body on four clawed legs and three serpent necks,
    each head fanged and spitting violet venom. */
export function hydra(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0, 0]),
    hide = gloss(0x2a3a2e, 0.45, 0.2),
    dark = gloss(0x16201a, 0.45, 0.2),
    belly = std(0x8a8a5a),
    fang = std(0xf0ece0),
    claw = gloss(0x1a1414, 0.3, 0.3),
    venom = lit(0xc58aff);
  part(body, sphere(0.45, 12, 8), hide, [0, 0.55, -0.1], { scale: [1.1, 0.72, 1.3] });
  part(body, sphere(0.36, 10, 6), belly, [0, 0.42, 0.02], { scale: [1.15, 0.55, 1.25] });
  for (let i = 0; i < 6; i++)
    spike(body, [0, 0.86 - i * 0.03, 0.05 - i * 0.14], [0, 1.0 - i * 0.04, -0.04 - i * 0.14], 0.05 - i * 0.005, dark);
  tube(
    body,
    [
      [0, 0.5, -0.6],
      [0, 0.35, -0.95],
      [0.15, 0.2, -1.25],
      [0.3, 0.12, -1.4],
    ],
    0.2,
    0.03,
    hide,
    12,
    7,
  );
  const legs = [-1, 1].flatMap((s) =>
    [0.2, -0.38].map((z) => {
      const l = joint(body, [0.38 * s, 0.42, z]);
      tube(
        l,
        [
          [0, 0, 0],
          [0.14 * s, -0.12, 0.04],
          [0.18 * s, -0.42, 0.08],
        ],
        0.12,
        0.08,
        hide,
        6,
        6,
      );
      for (const k of [-1, 0, 1]) spike(l, [0.18 * s, -0.42, 0.08], [0.22 * s + k * 0.05, -0.42, 0.22], 0.025, claw);
      return l;
    }),
  );
  // three necks, and two more that a cut head grows back as (hidden until then); a stump at each neck's root
  const necks = [
    [-1, 0.1, 1.62],
    [0, 0.16, 1.95],
    [1, 0.1, 1.7],
    [-1.7, -0.02, 1.4],
    [1.7, -0.02, 1.45],
  ].map(([s, z, h], i) => {
    const n = joint(body, [s * 0.22, 0.7, 0.3]);
    n.visible = i < 3;
    const tip: V3 = [s * 0.5, h - 0.7, z + 0.1];
    tube(
      n,
      [
        [0, 0, 0],
        [s * 0.1, 0.3, 0.14],
        [s * 0.3, (h - 0.7) * 0.55, z + 0.06],
        [s * 0.48, (h - 0.7) * 0.85, z - 0.06],
        tip,
      ],
      0.16,
      0.1,
      hide,
      14,
      7,
    );
    for (let k = 0; k < 4; k++) {
      const u = (k + 1) / 5;
      spike(
        n,
        [s * 0.3 * u, (h - 0.7) * u, z * u - 0.08],
        [s * 0.3 * u, (h - 0.7) * u + 0.02, z * u - 0.18],
        0.03,
        dark,
      );
    }
    const head = joint(n, tip, [0.3, -s * 0.3, 0]);
    part(head, sphere(0.13, 10, 8), hide, [0, 0, 0.06], { scale: [0.9, 0.65, 1.5] });
    const jaw = joint(head, [0, -0.05, 0], [0.4, 0, 0]);
    part(jaw, sphere(0.1, 8, 6), belly, [0, -0.02, 0.12], { scale: [0.85, 0.35, 1.4] });
    for (const t of [-1, 1]) {
      spike(head, [0.045 * t, -0.04, 0.2], [0.04 * t, -0.12, 0.22], 0.015, fang);
      spike(jaw, [0.035 * t, 0, 0.18], [0.035 * t, 0.07, 0.2], 0.012, fang);
      spike(head, [0.07 * t, 0.06, -0.02], [0.1 * t, 0.16, -0.14], 0.025, dark);
    }
    slitEyes(head, 0.075, 0.05, 0.1, 0.035, 0xc58aff, 0.6, 0.35);
    const drip = part(jaw, sphere(0.03, 5, 4), venom, [0, -0.05, 0.2], { scale: [1, 1.6, 1] });
    const stump = joint(body, [s * 0.22, 0.7, 0.3]);
    stump.visible = false;
    part(stump, new THREE.CylinderGeometry(0.11, 0.16, 0.22, 8), hide, [s * 0.05, 0.1, 0.05]);
    part(stump, new THREE.CircleGeometry(0.11, 8), std(0x6a1a2a), [s * 0.05, 0.215, 0.05], {
      rot: [-Math.PI / 2, 0, 0],
    });
    return { n, head, jaw, drip, i, stump };
  });
  const heads = Object.fromEntries(
    necks.flatMap(({ n, head, stump, i }) => [
      [`neck${i}`, n],
      [`head${i}`, head],
      [`stump${i}`, stump],
    ]),
  );
  return {
    group: g,
    shadow: 1.8,
    parts: { body, ...heads },
    idle: (t) => {
      body.position.y = Math.sin(t * 1.2) * 0.01;
      necks.forEach(({ n, head, jaw, drip, i }) => {
        n.rotation.z = Math.sin(t * 1.1 + i * 2) * 0.08;
        n.rotation.x = Math.sin(t * 0.9 + i * 1.3) * 0.06;
        head.rotation.y = Math.sin(t * 0.8 + i) * 0.3;
        jaw.rotation.x = 0.3 + Math.max(0, Math.sin(t * 1.6 + i * 2.1)) * 0.4;
        drip.position.y = -0.05 - ((t * 0.6 + i / 3) % 1) * 0.2;
      });
      legs.forEach((l, i) => {
        l.rotation.y = Math.sin(t * 1.2 + i) * 0.03;
      });
    },
  };
}

/** Floor 5, Umbral: a manticore, a lion's body dark as old blood with a black mane, leathery bat wings, and a scorpion's
    tail arched over its back, spines along it and a violet sting at its tip; its jaws carry rows of teeth. */
export function manticore(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0, 0]),
    fur = std(0x5e2c22),
    dark = std(0x3a1812),
    mane = std(0x22141e),
    wingSkin = thin(0x3a2230, { roughness: 0.7 }),
    bone = std(0x2a1a22),
    chitin = gloss(0x2a1a30, 0.35, 0.4),
    tooth = std(0xf0ece0),
    sting = lit(0xc58aff);
  tube(
    body,
    [
      [0, 0.6, -0.5],
      [0, 0.66, -0.15],
      [0, 0.7, 0.2],
      [0, 0.7, 0.32],
    ],
    0.2,
    0.24,
    fur,
    10,
    8,
  );
  part(body, sphere(0.2, 8, 6), dark, [0, 0.52, 0.1], { scale: [1, 0.8, 1.6] });
  const legs = [-1, 1].flatMap((s) =>
    [
      [0.24, 0],
      [-0.44, 1],
    ].map(([z, hind]) => {
      const l = joint(body, [0.13 * s, 0.62, z]);
      const pts: V3[] = hind
        ? [
            [0, 0, 0],
            [0.03 * s, -0.22, 0.12],
            [0.02 * s, -0.42, -0.06],
            [0.02 * s, -0.6, 0.02],
          ]
        : [
            [0, 0, 0],
            [0.03 * s, -0.3, 0.03],
            [0.02 * s, -0.6, 0.06],
          ];
      tube(l, pts, hind ? 0.12 : 0.1, 0.055, fur, 8, 6);
      part(l, sphere(0.07, 6, 5), fur, [0.02 * s, -0.6, hind ? 0.06 : 0.1], { scale: [1, 0.6, 1.3] });
      for (const k of [-1, 0, 1])
        spike(l, [0.02 * s, -0.6, hind ? 0.1 : 0.16], [0.02 * s + k * 0.04, -0.62, hind ? 0.17 : 0.23], 0.015, tooth);
      return l;
    }),
  );
  const head = joint(body, [0, 0.82, 0.48]);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    spike(
      head,
      [Math.cos(a) * 0.12, Math.sin(a) * 0.12, -0.06],
      [Math.cos(a) * 0.3, Math.sin(a) * 0.28 - 0.04, -0.2],
      0.07,
      mane,
    );
  }
  part(head, sphere(0.15, 10, 8), fur, [0, 0, 0.04], { scale: [0.95, 0.9, 1.05] });
  part(head, new THREE.BoxGeometry(0.16, 0.1, 0.14), fur, [0, -0.05, 0.17]);
  const jaw = joint(head, [0, -0.1, 0.06], [0.3, 0, 0]);
  part(jaw, new THREE.BoxGeometry(0.14, 0.05, 0.16), dark, [0, -0.01, 0.1]);
  for (let i = 0; i < 4; i++) {
    spike(head, [-0.05 + i * 0.033, -0.09, 0.23], [-0.05 + i * 0.033, -0.15, 0.235], 0.012, tooth);
    spike(jaw, [-0.045 + i * 0.03, 0.01, 0.17], [-0.045 + i * 0.03, 0.06, 0.175], 0.011, tooth);
  }
  slitEyes(head, 0.06, 0.04, 0.14, 0.032, 0xffb060, 0.6, 0.4);
  for (const s of [-1, 1])
    part(head, new THREE.ConeGeometry(0.04, 0.1, 4), mane, [0.1 * s, 0.14, 0.0], { rot: [-0.3, 0, -0.3 * s] });
  const wings = ([-1, 1] as const).map((s) => {
    const w = batWing(body, s, [0.14 * s, 0.82, 0.12], 0.95, wingSkin, bone);
    return w;
  });
  // the tail: segments of chitin arching up over the back, the sting hanging forward over its head
  const tail = joint(body, [0, 0.64, -0.6]);
  const arc: V3[] = [
    [0, 0, 0],
    [0, 0.35, -0.25],
    [0, 0.8, -0.2],
    [0, 1.0, 0.1],
    [0, 0.92, 0.38],
  ];
  const curveT = new THREE.CatmullRomCurve3(arc.map((p) => new THREE.Vector3(...p))),
    q = new THREE.Vector3();
  for (let i = 0; i < 9; i++) {
    curveT.getPointAt(i / 9, q);
    part(tail, sphere(0.09 - i * 0.005, 8, 6), chitin, [q.x, q.y, q.z], { scale: [1, 1, 1.25] });
    spike(tail, [q.x, q.y + 0.06, q.z], [q.x, q.y + 0.14, q.z - 0.03], 0.018, bone);
  }
  const tip = joint(tail, arc[4]);
  part(tip, sphere(0.08, 8, 6), chitin, [0, 0, 0], { scale: [0.9, 0.9, 1.3] });
  spike(tip, [0, -0.02, 0.06], [0, -0.18, 0.14], 0.035, sting);
  const venom = glow(U, 0.5, 0.7);
  venom.position.set(0, -0.12, 0.12);
  tip.add(venom);
  return {
    group: g,
    shadow: 1.6,
    parts: { body, head, tail, tip },
    idle: (t) => {
      const f = Math.sin(t * 1.2);
      wings[0].rotation.z = -0.5 - f * 0.15;
      wings[1].rotation.z = 0.5 + f * 0.15;
      wings[0].rotation.y = 0.5;
      wings[1].rotation.y = -0.5;
      tail.rotation.x = Math.sin(t * 1.5) * 0.06;
      tip.rotation.x = Math.sin(t * 2.2) * 0.2;
      head.rotation.y = Math.sin(t * 0.8) * 0.25;
      jaw.rotation.x = 0.2 + Math.max(0, Math.sin(t * 1.3)) * 0.25;
      venom.material.opacity = 0.5 + 0.3 * Math.sin(t * 4);
      legs.forEach((l, i) => {
        l.rotation.x = Math.sin(t * 1.6 + i * 1.6) * 0.03;
      });
    },
  };
}
