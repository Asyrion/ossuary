/* The bestiary's elementals: golems and living elements, each made of what it is and touching the room as its
   element does (docs/archive/M4.5-plan.md). Each stands (or hovers) over y = 0 facing +Z and idles; parts a foe's behaviour will
   move are named in `parts`. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, lit, part, shine, sphere, std, type V3 } from '../render/arcane';
import { rough } from '../world/kitParts';
import { gloss, joint, jointed, slitEyes, spike, tube, type Built } from './beastParts';

const { ember: E, frost: F, storm: S } = SCHOOL_LIGHT;

/** Floor 2, water: a figure of water risen out of its own pool, a churning crest for a head, arms that pour back into the
    pool and a cold light at its heart. */
export function puddleElemental(): Built {
  const g = new THREE.Group(),
    water = std(0x3f8eb8, { transparent: true, opacity: 0.72, roughness: 0.06, metalness: 0.25 }),
    foam = std(0xe4f6ff, { transparent: true, opacity: 0.85, roughness: 0.2 }),
    heartM = lit(F);
  part(
    g,
    new THREE.CircleGeometry(0.7, 18),
    std(0x1a4a60, { roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.9 }),
    [0, 0.008, 0],
    { rot: [-Math.PI / 2, 0, 0] },
  );
  const ripples = [0, 1].map(() =>
    part(g, new THREE.RingGeometry(0.9, 1, 24), shine(0xbfeaff, 0.4), [0, 0.012, 0], { rot: [-Math.PI / 2, 0, 0] }),
  );
  const body = joint(g, [0, 0, 0]);
  // a swirl rising out of the pool into a chest and shoulders, a head on top
  const profile = [
    [0.48, 0],
    [0.36, 0.08],
    [0.22, 0.24],
    [0.17, 0.42],
    [0.24, 0.6],
    [0.36, 0.74],
    [0.4, 0.84],
    [0.3, 0.92],
    [0.14, 0.96],
    [0, 0.97],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  part(body, new THREE.LatheGeometry(profile, 12), water, [0, 0, 0], { scale: [1.15, 1, 0.8] });
  for (let i = 0; i < 3; i++)
    part(body, new THREE.TorusGeometry(0.28 - i * 0.05, 0.022, 4, 14), foam, [0, 0.1 + i * 0.14, 0], {
      rot: [Math.PI / 2 + 0.2, 0.1 * i, 0],
      scale: [1, 0.8, 1],
    });
  const heart = part(body, sphere(0.1, 8, 6), heartM, [0, 0.7, 0.06]);
  const shine1 = glow(F, 0.7, 0.45);
  shine1.position.set(0, 0.7, 0.06);
  body.add(shine1);
  const headG = joint(body, [0, 1.1, 0.04]);
  part(headG, sphere(0.19, 10, 8), water, [0, 0, 0], { scale: [1, 1.05, 0.95] });
  slitEyes(headG, 0.08, 0.02, 0.15, 0.05, 0xe8faff, 0.45, 0.3);
  const crest = joint(headG, [0, 0.12, -0.04]);
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * 0.35;
    spike(
      crest,
      [Math.sin(a) * 0.1, 0, -0.04],
      [Math.sin(a) * 0.22, 0.2 + (i % 2) * 0.1, -0.2],
      0.05,
      i % 2 ? foam : water,
    );
  }
  const arms = ([-1, 1] as const).map((s) => {
    const a = joint(body, [0.38 * s, 0.84, 0]);
    tube(
      a,
      [
        [0, 0, 0],
        [0.16 * s, -0.06, 0.06],
        [0.28 * s, -0.3, 0.14],
        [0.3 * s, -0.52, 0.18],
      ],
      0.13,
      0.1,
      water,
      12,
      7,
    );
    part(a, sphere(0.15, 8, 6), foam, [0.3 * s, -0.6, 0.18], { scale: [1, 0.9, 1] });
    return a;
  });
  const bubbles = [0, 1, 2, 3, 4].map((i) => part(body, sphere(0.025 + (i % 2) * 0.015, 5, 4), foam, [0, 0, 0]));
  return {
    group: g,
    shadow: 0,
    parts: { body, crest },
    idle: (t) => {
      body.scale.set(1 + Math.sin(t * 2) * 0.03, 1 + Math.sin(t * 2 + 1) * 0.03, 1);
      crest.rotation.y = t * 0.8;
      arms.forEach((a, i) => {
        a.rotation.z = Math.sin(t * 1.5 + i * Math.PI) * 0.08;
      });
      bubbles.forEach((b, i) => {
        const k = (t * 0.3 + i / 5) % 1;
        b.position.set(Math.sin(i * 2.3) * 0.14, 0.1 + k * 0.85, Math.cos(i * 1.7) * 0.12);
      });
      ripples.forEach((r, i) => {
        const k = (t * 0.45 + i / 2) % 1;
        r.scale.setScalar(0.45 + k * 0.5);
        (r.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - k);
      });
      heart.scale.setScalar(1 + Math.sin(t * 3) * 0.12);
    },
  };
}

/** Floor 2, Storm: a thunderhead as wide as a cart, dark and heavy-browed, lightning for eyes and a mouth of it; sparks
    rain from its underside onto the floor its shadow covers. */
export function thunderhead(): Built {
  const g = new THREE.Group(),
    cloud = joint(g, [0, 1.25, 0]),
    dark = std(0x34384a, { roughness: 1 }),
    mid = std(0x4c5266, { roughness: 1 }),
    top = std(0x6a7086, { roughness: 1 }),
    bolt = lit(S);
  part(g, new THREE.CircleGeometry(0.7, 18), std(0x000000, { transparent: true, opacity: 0.35 }), [0, 0.006, 0], {
    rot: [-Math.PI / 2, 0, 0],
    scale: [1.2, 0.9, 1],
  });
  const glowFloor = part(g, new THREE.CircleGeometry(0.6, 16), shine(S, 0.12), [0, 0.009, 0], {
    rot: [-Math.PI / 2, 0, 0],
  });
  for (const [x, y, z, r, m] of [
    [0, 0, 0, 0.38, 0],
    [-0.4, -0.06, 0.02, 0.3, 0],
    [0.42, -0.05, -0.02, 0.32, 0],
    [-0.18, 0.2, -0.1, 0.3, 1],
    [0.2, 0.22, -0.08, 0.32, 1],
    [0, 0.32, -0.22, 0.26, 2],
    [-0.5, 0.12, -0.18, 0.22, 2],
    [0.55, 0.1, -0.2, 0.22, 2],
    [0, -0.1, 0.18, 0.28, 1],
    [-0.25, -0.12, -0.25, 0.25, 0],
    [0.28, -0.1, -0.3, 0.24, 0],
  ] as [number, number, number, number, number][]) {
    part(cloud, sphere(r, 8, 6), [dark, mid, top][m], [x, y, z], { scale: [1.1, 0.8, 1] });
  }
  // the face: a brow of cloud over two eyes of lightning and a jagged mouth
  for (const s of [-1, 1])
    part(cloud, sphere(0.16, 6, 5), mid, [0.17 * s, 0.12, 0.32], { rot: [0, 0, -0.5 * s], scale: [1.5, 0.5, 0.7] });
  const eyes = slitEyes(cloud, 0.16, 0.04, 0.38, 0.075, S, 0.25, 0.35);
  const mouth = joint(cloud, [0, -0.13, 0.38]);
  for (let i = 0; i < 5; i++)
    part(mouth, new THREE.BoxGeometry(0.09, 0.022, 0.02), bolt, [-0.18 + i * 0.09, i % 2 ? 0.03 : -0.03, 0], {
      rot: [0, 0, i % 2 ? -0.6 : 0.6],
    });
  const bolts = [
    [-0.3, 0.1],
    [0.25, -0.15],
  ].map(([x, z]) => {
    const b = joint(g, [x, 0, z]);
    let y = 1.05,
      px = 0;
    for (let k = 0; k < 5; k++) {
      const ny = y - 0.21,
        nx = k % 2 ? 0.08 : -0.08;
      part(b, new THREE.BoxGeometry(0.025, Math.hypot(0.21, nx - px), 0.025), bolt, [(px + nx) / 2, (y + ny) / 2, 0], {
        rot: [0, 0, Math.atan2(nx - px, 0.21)],
      });
      y = ny;
      px = nx;
    }
    return b;
  });
  const rain = joint(g, [0, 0, 0]);
  for (let i = 0; i < 12; i++)
    part(rain, new THREE.BoxGeometry(0.012, 0.12, 0.012), shine(S, 0.8), [
      Math.sin(i * 2.4) * 0.5,
      (i * 0.37) % 1.1,
      Math.cos(i * 1.9) * 0.35,
    ]);
  return {
    group: g,
    shadow: 0,
    parts: { cloud },
    idle: (t) => {
      cloud.position.y = 1.25 + Math.sin(t * 1.2) * 0.05;
      cloud.rotation.y = Math.sin(t * 0.5) * 0.1;
      const flash = Math.floor(t * 7) % 9;
      bolts.forEach((b, i) => {
        b.visible = flash === i * 4;
      });
      rain.position.y = -((t * 1.6) % 1.1) + 0.05;
      glowFloor.material.opacity = 0.08 + (flash < 2 ? 0.12 : 0);
      for (const e of eyes) e.scale.y = 0.38 * (flash === 6 ? 0.3 : 1);
    },
  };
}

/** Floor 3, Ember: a djinn of living fire, a chest and horned head of coal split by cracks of flame, arms ending in fire
    and a fireball held ready; below the waist it is all flame, curling to a tip. */
export function cinderDjinn(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0.3, 0]),
    coal = std(0x3a2418, { roughness: 1 }),
    crack = lit(E),
    hot = lit(0xffd36a),
    flameM = lit(0xff8a2a),
    sheath = shine(E, 0.5);
  const tail = joint(body, [0, 0.35, 0]);
  const flow: V3[] = [
    [0, 0.1, 0],
    [0, -0.1, -0.06],
    [0.05, -0.25, -0.18],
    [0.17, -0.3, -0.3],
    [0.23, -0.18, -0.36],
  ];
  tube(tail, flow, 0.2, 0.02, flameM, 14, 7);
  tube(
    tail,
    flow.map(([x, y, z]) => [x * 1.05, y, z * 1.05 - 0.01] as V3),
    0.27,
    0.04,
    sheath,
    14,
    7,
  );
  part(body, sphere(0.22, 10, 8), coal, [0, 0.58, 0], { scale: [1.2, 1, 0.8] });
  for (const [x, y, r, len] of [
    [-0.08, 0.62, 0.5, 0.16],
    [0.07, 0.55, -0.6, 0.14],
    [0, 0.48, 0.1, 0.12],
    [0.12, 0.68, 0.9, 0.1],
  ])
    part(body, new THREE.BoxGeometry(0.02, len, 0.02), crack, [x, y, 0.17], { rot: [0, 0, r] });
  const core = glow(E, 1.1, 0.5);
  core.position.set(0, 0.55, 0.05);
  body.add(core);
  for (const s of [-1, 1]) part(body, sphere(0.12, 8, 6), coal, [0.27 * s, 0.7, 0]);
  const head = joint(body, [0, 0.92, 0.03]);
  part(head, sphere(0.14, 10, 8), coal, [0, 0, 0], { scale: [0.95, 1.05, 0.9] });
  for (const s of [-1, 1])
    tube(
      head,
      [
        [0.08 * s, 0.07, -0.02],
        [0.17 * s, 0.17, -0.05],
        [0.2 * s, 0.3, -0.15],
        [0.15 * s, 0.38, -0.24],
      ],
      0.035,
      0.005,
      coal,
      8,
      5,
    );
  slitEyes(head, 0.055, 0.02, 0.12, 0.035, 0xfff0a0, 0.5, 0.4);
  part(head, new THREE.BoxGeometry(0.08, 0.014, 0.02), hot, [0, -0.06, 0.13]);
  for (let i = 0; i < 6; i++) {
    const a = (i - 2.5) * 0.35;
    spike(
      head,
      [Math.sin(a) * 0.07, 0.08, -0.06],
      [Math.sin(a) * 0.14, 0.26 + (i % 2) * 0.08, -0.22],
      0.04,
      i % 2 ? hot : flameM,
    );
  }
  const arms = ([-1, 1] as const).map((s) => {
    const a = joint(body, [0.3 * s, 0.7, 0]);
    const hand: V3 = s > 0 ? [0.24, 0.3, 0.18] : [0.2, -0.2, 0.14];
    const handAt: V3 = [hand[0] * s, hand[1], hand[2]];
    jointed(a, [[0, 0, 0], [0.16 * s, -0.16, 0.02], handAt], 0.06, 0.04, coal);
    for (let k = 0; k < 4; k++)
      spike(a, handAt, [handAt[0] + (k - 1.5) * 0.03, handAt[1] + 0.1, handAt[2] + 0.03], 0.02, flameM);
    return { a, handAt };
  });
  const ball = joint(arms[1].a, [arms[1].handAt[0], arms[1].handAt[1] + 0.14, arms[1].handAt[2]]);
  part(ball, sphere(0.09, 8, 6), hot, [0, 0, 0]);
  const ballGlow = glow(E, 0.6, 0.7);
  ball.add(ballGlow);
  return {
    group: g,
    shadow: 0.8,
    parts: { body, head, tail },
    idle: (t) => {
      body.position.y = 0.3 + Math.sin(t * 2) * 0.05;
      body.scale.setScalar(1.2);
      tail.rotation.y = Math.sin(t * 1.5) * 0.3;
      tail.scale.setScalar(1 + Math.sin(t * 7) * 0.05);
      arms.forEach(({ a }, i) => {
        a.rotation.z = Math.sin(t * 1.6 + i) * 0.1;
      });
      head.rotation.y = Math.sin(t * 0.9) * 0.2;
      ball.scale.setScalar(1 + Math.sin(t * 5) * 0.15);
      core.material.opacity = 0.4 + 0.15 * Math.sin(t * 6);
      ballGlow.material.opacity = 0.5 + 0.3 * Math.sin(t * 5);
    },
  };
}

/** Floor 3, Ember: an ooze of molten rock heaving under plates of black crust, eyes of white heat looking out between them;
    the floor round it burns. */
export function magmaOoze(): Built {
  const g = new THREE.Group(),
    lava = std(0x9a2a08, { emissive: 0xff4a08, emissiveIntensity: 0.7, roughness: 0.55 }),
    crust = std(0x2e2522, { roughness: 1 }),
    hot = lit(0xffd36a);
  const disc = part(g, new THREE.CircleGeometry(0.85, 16), shine(E, 0.22), [0, 0.008, 0], {
    rot: [-Math.PI / 2, 0, 0],
  }); // (named, so a made look keeps it)
  const body = joint(g, [0, 0, 0]);
  const blob = joint(body, [0, 0, 0]);
  part(blob, sphere(0.45, 12, 8), lava, [0, 0.22, 0], { scale: [1.25, 0.62, 1.1] });
  for (const [x, z, r] of [
    [0.5, 0.2, 0.16],
    [-0.48, 0.16, 0.14],
    [0.2, -0.48, 0.13],
    [-0.3, -0.4, 0.12],
  ] as V3[])
    part(blob, sphere(r, 8, 6), lava, [x, r * 0.5, z], { scale: [1.2, 0.7, 1.2] });
  // plates of black crust over the whole top, the lava showing only in the cracks between them
  const Y = new THREE.Vector3(0, 1, 0),
    n = new THREE.Vector3();
  for (let i = 0; i < 26; i++) {
    const y = 1 - ((i + 0.5) / 26) * 0.95,
      rr = Math.sqrt(1 - y * y),
      a = i * 2.39996,
      nx = Math.cos(a) * rr,
      nz = Math.sin(a) * rr;
    if (nz > 0.55 && Math.abs(nx) < 0.5 && y < 0.7) continue;
    const plate = part(
      blob,
      rough(new THREE.DodecahedronGeometry(0.15, 0), 0.03, i),
      crust,
      [nx * 0.56, 0.22 + y * 0.27, nz * 0.5],
      { scale: [1.15, 0.38, 1.15] },
    );
    plate.quaternion.setFromUnitVectors(Y, n.set(nx / 1.25, y / 0.62, nz / 1.1).normalize());
  }
  slitEyes(blob, 0.12, 0.4, 0.38, 0.055, 0xfff0a0, 0.4, 0.35);
  part(blob, new THREE.BoxGeometry(0.2, 0.03, 0.02), hot, [0, 0.3, 0.45], { rot: [0, 0, 0] });
  const bubbles = [0, 1, 2, 3].map((i) =>
    part(blob, sphere(0.05, 6, 5), hot, [Math.sin(i * 2.2) * 0.3, 0.4, Math.cos(i * 2.2) * 0.25 + 0.05]),
  );
  const heat = glow(E, 1.4, 0.35);
  heat.position.y = 0.3;
  body.add(heat);
  return {
    group: g,
    shadow: 0,
    parts: { body, blob, disc },
    idle: (t) => {
      blob.scale.set(1 + Math.sin(t * 1.7) * 0.05, 1 - Math.sin(t * 1.7) * 0.06, 1 + Math.sin(t * 1.7 + 1) * 0.04);
      bubbles.forEach((b, i) => {
        const k = (t * 0.6 + i / 4) % 1;
        b.scale.setScalar(k < 0.8 ? k * 1.2 : (1 - k) * 4);
      });
      heat.material.opacity = 0.28 + 0.1 * Math.sin(t * 3);
    },
  };
}

/** A golem's block of `w`, `h`, `d` at `at`, a little out of true. */
const block = (
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  at: V3,
  rot: V3 = [0, 0, 0],
  seed = 0,
) => part(parent, rough(new THREE.BoxGeometry(w, h, d, 2, 2, 2), Math.min(w, h, d) * 0.08, seed), mat, at, { rot });

/** Floor 3, Frost: a hulking golem of salt cut in blocks, candles burning on its shoulders and head and their wax running
    down it, a single cold slit of an eye. */
export function saltGolem(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0, 0]),
    salt = std(0xf2f0ec, { roughness: 0.6 }),
    shade = std(0xd2d4d8, { roughness: 0.7 }),
    crystal = std(0xe8f4ff, { roughness: 0.15, metalness: 0.15 }),
    wax = std(0xf0e2c6),
    flame = lit(0xffd36a);
  for (const s of [-1, 1]) block(body, 0.2, 0.4, 0.22, shade, [0.15 * s, 0.2, 0], [0, 0.1 * s, 0], s + 2);
  block(body, 0.46, 0.22, 0.32, shade, [0, 0.44, 0], [0, 0.05, 0], 1);
  const torso = joint(body, [0, 0.55, 0]);
  block(torso, 0.6, 0.48, 0.4, salt, [0, 0.28, 0], [0.05, -0.06, 0.03], 2);
  block(torso, 0.3, 0.2, 0.26, salt, [0, 0.6, 0.08], [0.1, 0.1, 0], 3);
  part(torso, new THREE.BoxGeometry(0.2, 0.03, 0.02), lit(F), [0, 0.62, 0.22]);
  for (const s of [-1, 1]) block(torso, 0.26, 0.22, 0.3, salt, [0.4 * s, 0.44, 0], [0, 0, 0.2 * s], 4 + s);
  for (const [p, h, r] of [
    [[-0.18, 0.58, -0.15], 0.22, [-0.4, 0, 0.3]],
    [[0.12, 0.55, -0.18], 0.18, [-0.5, 0, -0.4]],
    [[0.3, 0.62, -0.05], 0.16, [0, 0, -0.7]],
    [[-0.42, 0.58, 0.05], 0.14, [0, 0, 0.6]],
  ] as [V3, number, V3][])
    part(torso, new THREE.OctahedronGeometry(h / 2), crystal, p, { rot: r, scale: [0.45, 1, 0.45] });
  const candles: THREE.Sprite[] = [];
  for (const [x, y, z, h] of [
    [-0.44, 0.58, 0.05, 0.2],
    [-0.34, 0.58, -0.06, 0.14],
    [0.08, 0.72, 0.02, 0.16],
    [0.42, 0.58, 0.08, 0.12],
  ]) {
    part(torso, new THREE.CylinderGeometry(0.035, 0.04, h, 6), wax, [x, y + h / 2, z]);
    part(torso, new THREE.ConeGeometry(0.025, 0.07, 5), flame, [x, y + h + 0.04, z]);
    const gl = glow(0xffb050, 0.3, 0.6);
    gl.position.set(x, y + h + 0.05, z);
    torso.add(gl);
    candles.push(gl);
    part(torso, sphere(0.03, 5, 4), wax, [x + 0.02, y - 0.06, z + 0.1], { scale: [0.8, 2.2, 0.8] });
  }
  const arms = ([-1, 1] as const).map((s) => {
    const a = joint(torso, [0.42 * s, 0.42, 0]);
    block(a, 0.18, 0.3, 0.18, shade, [0.04 * s, -0.2, 0], [0, 0, 0.1 * s], 6);
    block(a, 0.16, 0.26, 0.16, salt, [0.07 * s, -0.46, 0.03], [0, 0, 0], 7);
    block(a, 0.24, 0.22, 0.24, salt, [0.08 * s, -0.68, 0.05], [0.2, 0.3, 0], 8);
    return a;
  });
  return {
    group: g,
    shadow: 1.1,
    parts: { body, torso },
    idle: (t) => {
      torso.rotation.y = Math.sin(t * 0.8) * 0.06;
      torso.position.y = 0.55 + Math.sin(t * 1.6) * 0.01;
      arms.forEach((a, i) => {
        a.rotation.x = Math.sin(t * 1.2 + i * Math.PI) * 0.08;
      });
      candles.forEach((c, i) => {
        c.material.opacity = 0.45 + 0.2 * Math.sin(t * 9 + i * 2);
      });
    },
  };
}

/** Floor 3, earth: a golem of rubble and broken masonry, hunched on its knuckles, a seam of light splitting its chest. */
export function rubbleGolem(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0, 0]),
    stone = std(0x7a746a, { roughness: 1 }),
    dressed = std(0x9a9284, { roughness: 0.9 }),
    dark = std(0x55504a, { roughness: 1 }),
    moss = std(0x5a6a3a),
    seam = lit(0xffd890);
  for (const s of [-1, 1]) {
    part(body, rough(new THREE.DodecahedronGeometry(0.17, 0), 0.03, s), dark, [0.18 * s, 0.17, -0.05]);
    part(body, rough(new THREE.DodecahedronGeometry(0.14, 0), 0.03, s + 3), stone, [0.2 * s, 0.38, -0.04]);
  }
  const torso = joint(body, [0, 0.5, 0], [0.25, 0, 0]);
  part(torso, rough(new THREE.DodecahedronGeometry(0.4, 1), 0.05, 1), stone, [0, 0.36, 0], { scale: [1.2, 1, 0.85] });
  block(torso, 0.3, 0.22, 0.2, dressed, [-0.18, 0.52, 0.22], [0.2, 0.3, 0.1], 2);
  block(torso, 0.24, 0.18, 0.2, dressed, [0.22, 0.3, 0.24], [-0.1, -0.3, 0.2], 3);
  let y = 0.62,
    x = 0;
  for (let i = 0; i < 6; i++) {
    const ny = y - 0.1,
      nx = i % 2 ? 0.05 : -0.04;
    part(
      torso,
      new THREE.BoxGeometry(0.035, 0.12, 0.03),
      seam,
      [(x + nx) / 2, (y + ny) / 2, 0.34 - Math.abs(0.36 - y) * 0.1],
      { rot: [0, 0, Math.atan2(nx - x, 0.1)] },
    );
    y = ny;
    x = nx;
  }
  const heart = glow(0xffd890, 0.7, 0.55);
  heart.position.set(0, 0.4, 0.3);
  torso.add(heart);
  for (const [p, r] of [
    [[0.24, 0.62, -0.1], 0.12],
    [[-0.28, 0.5, -0.15], 0.1],
  ] as [V3, number][])
    part(torso, sphere(r, 6, 4), moss, p, { scale: [1.2, 0.4, 1] });
  const head = joint(torso, [0, 0.76, 0.2]);
  block(head, 0.24, 0.2, 0.22, dressed, [0, 0, 0], [0, 0, 0], 5);
  for (const s of [-1, 1]) part(head, new THREE.BoxGeometry(0.05, 0.03, 0.02), seam, [0.06 * s, 0.01, 0.115]);
  const arms = ([-1, 1] as const).map((s) => {
    const a = joint(torso, [0.5 * s, 0.6, 0]);
    part(a, rough(new THREE.DodecahedronGeometry(0.2, 0), 0.03, s * 2), stone, [0, 0, 0]);
    part(a, rough(new THREE.DodecahedronGeometry(0.13, 0), 0.03, s * 3), dark, [0.08 * s, -0.26, 0.1]);
    part(a, rough(new THREE.DodecahedronGeometry(0.11, 0), 0.03, s * 4), stone, [0.1 * s, -0.48, 0.18]);
    block(a, 0.3, 0.26, 0.3, dressed, [0.1 * s, -0.72, 0.24], [0.2, 0.3 * s, 0], s + 6);
    return a;
  });
  return {
    group: g,
    shadow: 1.3,
    parts: { body, torso, head },
    idle: (t) => {
      torso.rotation.x = 0.25 + Math.sin(t * 1.1) * 0.04;
      head.rotation.y = Math.sin(t * 0.7) * 0.25;
      arms.forEach((a, i) => {
        a.rotation.x = Math.sin(t * 1.1 + i * Math.PI) * 0.06;
      });
      heart.material.opacity = 0.4 + 0.2 * Math.sin(t * 2.2);
    },
  };
}

/** Floor 4, Storm: a golem of dark lodestone bound in iron bands, its forearms and fists hanging apart from it, held only
    by its pull; iron filings bristle on its shoulders and stones circle it; a storm-lit core shows in its chest. */
export function lodestoneGolem(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0, 0]),
    lode = gloss(0x5c5a72, 0.5, 0.3),
    iron = gloss(0x9a9aa6, 0.35, 0.6),
    filing = std(0xb0b0b8, { metalness: 0.5, roughness: 0.5 }),
    coreM = lit(S),
    field = shine(S, 0.35);
  for (const s of [-1, 1]) {
    part(body, rough(new THREE.DodecahedronGeometry(0.15, 0), 0.03, s), lode, [0.17 * s, 0.16, 0]);
    part(body, new THREE.TorusGeometry(0.13, 0.025, 4, 10), iron, [0.17 * s, 0.26, 0], { rot: [Math.PI / 2, 0, 0] });
  }
  const torso = joint(body, [0, 0.5, 0]);
  part(torso, rough(new THREE.DodecahedronGeometry(0.36, 1), 0.04, 2), lode, [0, 0.32, 0], { scale: [1.15, 1, 0.8] });
  for (const [y, r] of [
    [0.18, 0.36],
    [0.46, 0.38],
  ])
    part(torso, new THREE.TorusGeometry(r, 0.03, 4, 14), iron, [0, y, 0], {
      rot: [Math.PI / 2, 0, 0],
      scale: [1.1, 0.78, 1],
    });
  part(torso, sphere(0.1, 8, 6), coreM, [0, 0.34, 0.26]);
  const coreGlow = glow(S, 0.8, 0.6);
  coreGlow.position.set(0, 0.34, 0.28);
  torso.add(coreGlow);
  const arcs = [0, 1].map((i) =>
    part(torso, new THREE.TorusGeometry(0.2 + i * 0.08, 0.008, 3, 20, Math.PI * 1.2), field, [0, 0.34, 0.28], {
      rot: [0, 0, i * 1.4],
    }),
  );
  for (const s of [-1, 1])
    for (let i = 0; i < 9; i++)
      spike(
        torso,
        [0.28 * s + ((i % 3) - 1) * 0.06, 0.58, (Math.floor(i / 3) - 1) * 0.07],
        [0.3 * s + ((i % 3) - 1) * 0.08, 0.72 + (i % 2) * 0.04, (Math.floor(i / 3) - 1) * 0.09],
        0.012,
        filing,
      );
  const head = joint(torso, [0, 0.7, 0.1]);
  part(head, rough(new THREE.BoxGeometry(0.22, 0.17, 0.2, 2, 2, 2), 0.02, 4), lode, [0, 0, 0]);
  part(head, new THREE.BoxGeometry(0.14, 0.025, 0.02), coreM, [0, 0.01, 0.105]);
  const arms = ([-1, 1] as const).map((s) => {
    part(torso, rough(new THREE.DodecahedronGeometry(0.16, 0), 0.03, s * 5), lode, [0.44 * s, 0.5, 0]);
    const a = joint(torso, [0.5 * s, 0.2, 0.05]);
    part(a, rough(new THREE.BoxGeometry(0.16, 0.26, 0.16, 2, 2, 2), 0.02, s * 6), lode, [0, 0, 0]);
    part(a, new THREE.TorusGeometry(0.11, 0.02, 4, 10), iron, [0, -0.06, 0], { rot: [Math.PI / 2, 0, 0] });
    const fist = joint(a, [0, -0.3, 0.06]);
    part(fist, rough(new THREE.BoxGeometry(0.24, 0.22, 0.24, 2, 2, 2), 0.02, s * 7), iron, [0, 0, 0]);
    return { a, fist };
  });
  const stones = [0, 1, 2, 3].map((i) =>
    part(g, rough(new THREE.DodecahedronGeometry(0.07 + (i % 2) * 0.03, 0), 0.015, i), lode, [0, 0, 0]),
  );
  return {
    group: g,
    shadow: 1.1,
    parts: { body, torso },
    idle: (t) => {
      torso.position.y = 0.5 + Math.sin(t * 1.4) * 0.015;
      arms.forEach(({ a, fist }, i) => {
        a.position.y = 0.2 + Math.sin(t * 1.8 + i * 2) * 0.03;
        fist.position.y = -0.3 + Math.sin(t * 2.1 + i) * 0.03;
      });
      stones.forEach((st, i) => {
        const a = t * 0.9 + (i * Math.PI) / 2;
        st.position.set(Math.cos(a) * 0.75, 0.9 + Math.sin(t * 1.3 + i) * 0.15, Math.sin(a) * 0.6);
        st.rotation.set(t + i, t * 0.7, 0);
      });
      arcs.forEach((ar, i) => {
        ar.rotation.z = t * (i ? -2 : 1.6);
      });
      coreGlow.material.opacity = 0.45 + 0.25 * Math.sin(t * 5);
    },
  };
}

/** Floor 4, Ember (elite): a walking brazier taller than the mage, a cage of black iron with fire roaring inside it, its
    bowl for a head and a grate for a face, heavy stone arms bound in iron. */
export function hearthGolem(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0, 0]),
    iron = gloss(0x2e2a2c, 0.45, 0.6),
    stone = std(0x6a625a, { roughness: 1 }),
    coals = std(0x3a1a0e, { emissive: 0xff4a10, emissiveIntensity: 0.9 }),
    flame = lit(0xff9a3a),
    hot = lit(0xffd36a);
  for (const s of [-1, 1]) {
    tube(
      body,
      [
        [0.16 * s, 0.62, 0],
        [0.2 * s, 0.32, 0.06],
        [0.18 * s, 0.05, 0.02],
      ],
      0.07,
      0.06,
      iron,
      6,
      6,
    );
    part(body, new THREE.BoxGeometry(0.18, 0.07, 0.26), iron, [0.18 * s, 0.035, 0.05]);
  }
  const torso = joint(body, [0, 0.62, 0]);
  part(torso, new THREE.CylinderGeometry(0.3, 0.24, 0.08, 10), iron, [0, 0, 0]);
  part(torso, new THREE.CylinderGeometry(0.26, 0.22, 0.5, 10), coals, [0, 0.3, 0]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    part(torso, new THREE.CylinderGeometry(0.018, 0.018, 0.62, 4), iron, [
      Math.cos(a) * 0.31,
      0.32,
      Math.sin(a) * 0.31,
    ]);
  }
  for (const y of [0.18, 0.46])
    part(torso, new THREE.TorusGeometry(0.31, 0.022, 4, 16), iron, [0, y, 0], { rot: [Math.PI / 2, 0, 0] });
  const fireIn = joint(torso, [0, 0.32, 0]);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4;
    part(fireIn, new THREE.ConeGeometry(0.07, 0.3, 5), i % 2 ? flame : hot, [
      Math.cos(a) * 0.14,
      0,
      Math.sin(a) * 0.14,
    ]);
  }
  const heat = glow(E, 1.4, 0.55);
  heat.position.y = 0.3;
  torso.add(heat);
  // the bowl it wears for a head, flames leaping out of it, the grate of its face
  const head = joint(torso, [0, 0.66, 0]);
  part(
    head,
    new THREE.LatheGeometry(
      [
        [0.1, -0.08],
        [0.26, -0.02],
        [0.36, 0.1],
        [0.38, 0.16],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      12,
    ),
    iron,
    [0, 0, 0],
  );
  part(head, new THREE.CylinderGeometry(0.34, 0.34, 0.02, 12), coals, [0, 0.12, 0]);
  for (let i = 0; i < 5; i++)
    part(head, new THREE.BoxGeometry(0.025, 0.2, 0.025), iron, [-0.12 + i * 0.06, 0.02, 0.3], { rot: [-0.4, 0, 0] });
  for (const s of [-1, 1]) part(head, sphere(0.04, 6, 5), hot, [0.08 * s, 0.04, 0.26], { scale: [1.3, 0.7, 0.5] });
  const flames = joint(head, [0, 0.16, 0]);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4,
      r = i ? 0.2 : 0;
    part(flames, new THREE.ConeGeometry(0.09 - r * 0.15, 0.5 - r * 0.6, 5), i % 2 ? flame : hot, [
      Math.cos(a) * r,
      0.2 - r * 0.25,
      Math.sin(a) * r,
    ]);
  }
  const crown = glow(E, 1.2, 0.55);
  crown.position.y = 0.35;
  head.add(crown);
  for (const s of [-1, 1])
    for (const z of [-0.1, 0.1])
      part(head, new THREE.TorusGeometry(0.03, 0.008, 3, 6), iron, [0.37 * s, 0.05, z], { rot: [0, Math.PI / 2, 0] });
  const arms = ([-1, 1] as const).map((s) => {
    const a = joint(torso, [0.36 * s, 0.42, 0]);
    part(a, rough(new THREE.DodecahedronGeometry(0.17, 0), 0.03, s), stone, [0.04 * s, 0, 0]);
    tube(
      a,
      [
        [0.06 * s, -0.1, 0],
        [0.12 * s, -0.36, 0.06],
        [0.14 * s, -0.6, 0.1],
      ],
      0.1,
      0.085,
      stone,
      6,
      6,
    );
    part(a, new THREE.TorusGeometry(0.1, 0.025, 4, 10), iron, [0.12 * s, -0.4, 0.07], { rot: [Math.PI / 2, 0, 0] });
    part(a, rough(new THREE.BoxGeometry(0.24, 0.22, 0.26, 2, 2, 2), 0.03, s + 3), stone, [0.15 * s, -0.74, 0.12]);
    return a;
  });
  return {
    group: g,
    shadow: 1.4,
    parts: { body, torso, head, flames, fireIn, heat, crown },
    idle: (t) => {
      torso.rotation.y = Math.sin(t * 0.7) * 0.08;
      arms.forEach((a, i) => {
        a.rotation.x = Math.sin(t * 1.1 + i * Math.PI) * 0.1;
      });
      flames.scale.set(1, 1 + Math.sin(t * 7) * 0.12, 1);
      fireIn.scale.y = 1 + Math.sin(t * 8 + 1) * 0.15;
      heat.material.opacity = 0.45 + 0.12 * Math.sin(t * 5);
      crown.material.opacity = 0.45 + 0.15 * Math.sin(t * 6 + 2);
    },
  };
}

/** Floor 5, Frost (elite): a golem of glacier ice taller than any door, a dark frozen heart showing through its chest, a
    mantle of jagged shoulder crystals and fists like boulders of ice. */
export function glacierGolem(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0, 0]),
    ice = std(0x9ad0f0, { roughness: 0.1, metalness: 0.15, transparent: true, opacity: 0.9 }),
    deep = std(0x5a9ccc, { roughness: 0.15, metalness: 0.15 }),
    snow = std(0xeef6ff, { roughness: 1 }),
    heartM = std(0x10284a, { roughness: 0.3 }),
    eye = lit(F);
  for (const s of [-1, 1]) {
    part(body, rough(new THREE.BoxGeometry(0.26, 0.5, 0.3, 2, 3, 2), 0.03, s), deep, [0.2 * s, 0.25, 0]);
    part(body, rough(new THREE.BoxGeometry(0.32, 0.14, 0.4, 2, 2, 2), 0.03, s + 4), ice, [0.2 * s, 0.07, 0.05]);
  }
  const torso = joint(body, [0, 0.55, 0]);
  part(torso, rough(new THREE.IcosahedronGeometry(0.45, 1), 0.06, 2), ice, [0, 0.5, 0], { scale: [1.2, 1.05, 0.85] });
  part(torso, rough(new THREE.IcosahedronGeometry(0.3, 1), 0.04, 3), deep, [0, 0.1, 0], { scale: [1.1, 0.8, 0.9] });
  part(torso, sphere(0.16, 8, 6), heartM, [0, 0.5, 0.18]);
  const heart = glow(F, 0.9, 0.5);
  heart.position.set(0, 0.5, 0.3);
  torso.add(heart);
  part(torso, rough(new THREE.IcosahedronGeometry(0.4, 1), 0.03, 6), snow, [0, 0.9, -0.05], {
    scale: [1.1, 0.25, 0.75],
  });
  for (const [p, h, rot] of [
    [[-0.5, 0.9, 0], 0.55, [0, 0, 0.6]],
    [[0.5, 0.9, 0], 0.55, [0, 0, -0.6]],
    [[-0.3, 1.0, -0.15], 0.45, [-0.3, 0, 0.3]],
    [[0.32, 1.0, -0.12], 0.5, [-0.3, 0, -0.3]],
    [[0, 1.0, -0.25], 0.4, [-0.6, 0, 0]],
    [[-0.58, 0.78, 0.1], 0.3, [0.3, 0, 1]],
    [[0.6, 0.78, 0.1], 0.3, [0.3, 0, -1]],
  ] as [V3, number, V3][])
    part(torso, new THREE.OctahedronGeometry(h / 2), ice, p, { rot, scale: [0.42, 1, 0.42] });
  const head = joint(torso, [0, 0.92, 0.22]);
  part(head, rough(new THREE.IcosahedronGeometry(0.15, 0), 0.02, 7), deep, [0, 0, 0], { scale: [1.2, 0.8, 1] });
  part(head, new THREE.BoxGeometry(0.18, 0.03, 0.02), eye, [0, 0, 0.14]);
  const arms = ([-1, 1] as const).map((s) => {
    const a = joint(torso, [0.55 * s, 0.7, 0]);
    tube(
      a,
      [
        [0, 0, 0],
        [0.12 * s, -0.3, 0.04],
        [0.14 * s, -0.62, 0.1],
      ],
      0.16,
      0.13,
      ice,
      6,
      7,
    );
    part(a, rough(new THREE.IcosahedronGeometry(0.25, 1), 0.04, s + 9), deep, [0.15 * s, -0.82, 0.14]);
    for (let k = 0; k < 3; k++)
      part(a, new THREE.OctahedronGeometry(0.07), ice, [0.15 * s + (k - 1) * 0.1, -0.68, 0.3], {
        scale: [0.5, 1.3, 0.5],
        rot: [0.8, 0, (k - 1) * 0.4],
      });
    return a;
  });
  const mist = [0, 1, 2].map(() => part(g, sphere(0.2, 6, 5), shine(0xd8f0ff, 0.12), [0, 0.1, 0]));
  return {
    group: g,
    shadow: 1.6,
    parts: { body, torso, head },
    idle: (t) => {
      torso.rotation.y = Math.sin(t * 0.6) * 0.06;
      torso.position.y = 0.55 + Math.sin(t * 1.2) * 0.01;
      arms.forEach((a, i) => {
        a.rotation.x = Math.sin(t * 0.9 + i * Math.PI) * 0.07;
      });
      heart.material.opacity = 0.35 + 0.2 * Math.sin(t * 1.8);
      mist.forEach((m, i) => {
        const k = (t * 0.25 + i / 3) % 1;
        m.position.set(Math.sin(i * 2.1) * 0.5, 0.08 + k * 0.2, Math.cos(i * 2.1) * 0.4);
        m.scale.setScalar(1 + k * 1.5);
        (m.material as THREE.MeshBasicMaterial).opacity = 0.12 * (1 - k);
      });
    },
  };
}

/** One of the stones a rubble golem breaks into (floor 3): a boulder rolling on its own, a seam of storm light across it. */
export function rubbleStone(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0.26, 0]),
    stone = std(0x7a746a, { roughness: 1 }),
    seam = lit(0xffd890);
  part(body, rough(new THREE.DodecahedronGeometry(0.27, 1), 0.04, 7), stone, [0, 0, 0]);
  part(body, new THREE.TorusGeometry(0.27, 0.018, 4, 16), seam, [0, 0, 0], { rot: [0, Math.PI / 2, 0.3] });
  return {
    group: g,
    shadow: 0.6,
    parts: { body },
    idle: () => {
      /* (it rolls as it goes: its behaviour turns it) */
    },
  };
}
