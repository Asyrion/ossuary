/* The bestiary's beasts (M4.5): animals of the dungeon, larger and stranger than life, each built to read at a glance as
   what it is (docs/archive/M4.5-plan.md). Each stands on y = 0 facing +Z and idles; parts a foe's behaviour will move are named in
   `parts`. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, lit, part, shine, sphere, std, type V3 } from '../render/arcane';
import { joint, slitEyes, spike, tube, type Built } from './beastParts';

const { frost: F, umbral: U } = SCHOOL_LIGHT;

/** Floor 2, Umbral: a puffball fungus the height of a child, walking on roots; its cap is warted and split by a gill-lined
    maw, and spores glow in its vents as it swells. */
export function puffcap(): Built {
  const g = new THREE.Group(),
    cap = std(0x6c4a86, { roughness: 0.95 }),
    wart = std(0xcab8da),
    stem = std(0xd6c8aa),
    root = std(0x8a7656),
    gill = std(0xe8d0e8),
    vent = lit(U);
  const body = joint(g, [0, 0, 0]);
  const legs = [0, 1, 2, 3].map((i) => {
    const a = (i * Math.PI) / 2 + Math.PI / 4,
      c = Math.sin(a),
      s = Math.cos(a),
      l = joint(body, [0, 0.3, 0]);
    tube(
      l,
      [
        [c * 0.08, 0, s * 0.08],
        [c * 0.26, -0.1, s * 0.26],
        [c * 0.36, -0.29, s * 0.36],
        [c * 0.46, -0.3, s * 0.44],
      ],
      0.07,
      0.015,
      root,
      8,
      5,
    );
    return l;
  });
  part(body, new THREE.CylinderGeometry(0.16, 0.22, 0.36, 8), stem, [0, 0.44, 0]);
  const ball = joint(body, [0, 0.78, 0]);
  part(ball, sphere(0.38, 14, 10), cap, [0, 0, 0], { scale: [1, 0.86, 1] });
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4,
      b = 0.3 + (i % 4) * 0.28;
    part(ball, sphere(0.035 + (i % 3) * 0.01, 5, 4), wart, [
      Math.cos(a) * Math.sin(b) * 0.37,
      Math.cos(b) * 0.32,
      Math.sin(a) * Math.sin(b) * 0.37,
    ]);
  }
  const vents = [
    [-0.2, 0.24, 0.1],
    [0.22, 0.2, -0.08],
    [0.02, 0.3, -0.2],
    [-0.12, 0.1, -0.3],
    [0.28, 0.02, 0.14],
  ].map((p) => part(ball, sphere(0.045, 6, 4), vent, p as V3, { scale: [1, 0.5, 1] }));
  const maw = joint(ball, [0, -0.06, 0.3]);
  part(maw, sphere(0.2, 10, 4), lit(0x12081a), [0, 0, 0], { scale: [1.25, 0.3, 0.35] });
  for (let i = 0; i < 9; i++) spike(maw, [-0.2 + i * 0.05, 0.06, 0.04], [-0.2 + i * 0.05, 0.0, 0.06], 0.016, gill);
  for (let i = 0; i < 8; i++)
    spike(maw, [-0.17 + i * 0.05, -0.06, 0.04], [-0.17 + i * 0.05, -0.005, 0.06], 0.014, gill);
  slitEyes(ball, 0.13, 0.1, 0.31, 0.045, U, 0.4, 0.4);
  const puff = [0, 1, 2, 3].map((i) => part(g, sphere(0.06 + i * 0.02, 6, 5), shine(U, 0.3), [0, 1.2, 0]));
  return {
    group: g,
    shadow: 1,
    parts: { body, ball },
    idle: (t) => {
      const sw = (Math.sin(t * 1.6) + 1) / 2;
      ball.scale.setScalar(1 + sw * 0.12);
      body.position.y = Math.abs(Math.sin(t * 2.4)) * 0.015;
      vents.forEach((v, i) => {
        v.scale.set(1 + sw * 0.5, 0.5, 1 + sw * 0.5);
        v.visible = true;
        void i;
      });
      legs.forEach((l, i) => {
        l.rotation.y = Math.sin(t * 2.4 + i) * 0.08;
      });
      puff.forEach((p, i) => {
        const k = (t * 0.35 + i / 4) % 1;
        p.position.set(Math.sin(i * 2 + t) * 0.15, 1.1 + k * 0.6, Math.cos(i * 2) * 0.1);
        (p.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - k);
      });
    },
  };
}

/** Floor 5, Frost: a hare as tall as the mage's hip on long hind legs, frost-white, crowned with antlers of ice, pale eyes
    and ears laid back. */
export function frostJackalope(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0, 0]),
    fur = std(0xdfe6ee),
    shade = std(0x9aa8b8),
    inner = std(0x8a7a88),
    ice = std(0x9cdcff, { transparent: true, opacity: 0.9, roughness: 0.1, metalness: 0.15 }),
    tip = lit(F);
  body.scale.setScalar(1.3);
  tube(
    body,
    [
      [0, 0.36, -0.3],
      [0, 0.44, -0.08],
      [0, 0.46, 0.12],
      [0, 0.5, 0.2],
    ],
    0.17,
    0.13,
    fur,
    10,
    8,
  );
  part(body, sphere(0.13, 8, 6), shade, [0, 0.5, -0.12], { scale: [0.9, 0.5, 1.8] });
  for (const s of [-1, 1]) {
    tube(
      body,
      [
        [0.11 * s, 0.38, -0.26],
        [0.13 * s, 0.26, -0.14],
        [0.12 * s, 0.1, -0.34],
        [0.12 * s, 0.02, -0.2],
        [0.12 * s, 0.01, 0.02],
      ],
      0.1,
      0.03,
      fur,
      10,
      6,
    );
    tube(
      body,
      [
        [0.08 * s, 0.38, 0.16],
        [0.09 * s, 0.2, 0.22],
        [0.09 * s, 0.02, 0.24],
      ],
      0.04,
      0.025,
      fur,
      6,
      5,
    );
  }
  part(body, sphere(0.06, 6, 5), fur, [0, 0.42, -0.4]);
  const head = joint(body, [0, 0.6, 0.26], [0.2, 0, 0]);
  part(head, sphere(0.1, 10, 8), fur, [0, 0, 0], { scale: [0.85, 0.9, 1.3] });
  part(head, sphere(0.04, 6, 5), shade, [0, -0.04, 0.13]);
  for (const s of [-1, 1])
    part(head, new THREE.BoxGeometry(0.06, 0.02, 0.05), shade, [0.05 * s, 0.05, 0.05], {
      rot: [0, -0.3 * s, -0.35 * s],
    });
  slitEyes(head, 0.06, 0.02, 0.07, 0.028, 0xbfe8ff, 0.9, 0.35);
  const ears = [-1, 1].map((s) => {
    const e = joint(head, [0.045 * s, 0.06, -0.06], [-1.15, 0, -0.35 * s]);
    part(e, sphere(0.04, 8, 6), fur, [0, 0.13, 0], { scale: [1, 3.2, 0.45] });
    part(e, sphere(0.025, 6, 5), inner, [0, 0.13, 0.016], { scale: [1, 3, 0.3] });
    return e;
  });
  // antlers of ice: a beam swept up and back with tines, glowing at the tips
  for (const s of [-1, 1]) {
    const beam: V3[] = [
      [0.04 * s, 0.08, 0.0],
      [0.12 * s, 0.22, -0.02],
      [0.2 * s, 0.38, -0.1],
      [0.24 * s, 0.52, -0.2],
    ];
    tube(head, beam, 0.028, 0.012, ice, 8, 5);
    for (const [k, len, out] of [
      [1, 0.14, 0.02],
      [2, 0.16, 0.06],
      [3, 0.1, 0.02],
    ]) {
      const p = beam[k];
      spike(head, p, [p[0] + out * s, p[1] + len, p[2] + 0.06], 0.014, ice);
      part(head, sphere(0.014, 4, 3), tip, [p[0] + out * s, p[1] + len, p[2] + 0.06]);
    }
    part(head, sphere(0.018, 4, 3), tip, beam[3]);
  }
  const breath = glow(F, 0.55, 0.25);
  breath.position.set(0, 0.3, -0.05);
  head.add(breath);
  return {
    group: g,
    shadow: 1,
    parts: { body, head },
    idle: (t) => {
      const k = (t * 0.7) % 1,
        hop = k < 0.25 ? Math.sin((k / 0.25) * Math.PI) : 0;
      body.position.y = hop * 0.12;
      head.rotation.y = Math.sin(t * 1.3) * 0.35;
      ears.forEach((e, i) => {
        e.rotation.x = -1.15 + Math.sin(t * 2.6 + i) * 0.08;
      });
      breath.material.opacity = 0.15 + 0.1 * Math.sin(t * 2);
    },
  };
}
