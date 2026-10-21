/* Floor 2's six foes as creatures of fantasy (docs/archive/M4.12-plan.md), by the rules of fantasyFloor1.ts:
   each keeps its fight, the parts its behaviour moves (by name) and about its height; each faces +Z,
   stands on y = 0 and idles; no round googly eyes; the school in the body. Small repeated parts that move move together,
   so each look draws in few calls. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, crystal, limb, lit, part, runeRing, shine, sphere, std, type V3 } from '../render/arcane';
import { rough } from '../world/kitParts';
import { gloss, joint, jointed, slitEyes, spike, thin, tube, type Built } from './beastParts';

const { frost: F, storm: S, hallow: H } = SCHOOL_LIGHT;

/** A crackle of lightning from `a` to `b`: `n` straight strokes, each bend thrown `jag` aside (one mesh with the others of
    its surface once merged). */
function zigzag(parent: THREE.Object3D, a: V3, b: V3, n: number, jag: number, mat: THREE.Material, r = 0.008) {
  const pts: V3[] = Array.from({ length: n + 1 }, (_, i) => {
    const k = i / n,
      side = i % 2 ? 1 : -1,
      off = i && i < n ? jag * side : 0;
    return [a[0] + (b[0] - a[0]) * k + off, a[1] + (b[1] - a[1]) * k + off * 0.5, a[2] + (b[2] - a[2]) * k];
  });
  const g = joint(parent, [0, 0, 0]);
  for (let i = 0; i < n; i++) limb(g, pts[i], pts[i + 1], r, mat);
  return g;
}

/** The Hoarfrost Toad (for the Mire Toad; leaps, breathes cold): a horned toad the size of a hound, slate-dark, icicle
    warts down its back, a jaw of ice teeth and a crown of frost; its throat swells pale before it breathes. */
export function hoarfrostToad(): Built {
  const g = new THREE.Group(),
    skin = gloss(0x22303e, 0.6, 0.1),
    belly = std(0x3e4c5c),
    horn = std(0x9cc8e8, { roughness: 0.3, emissive: 0x1c4a6a }),
    tooth = lit(0xe4f6ff),
    ice = lit(F);
  const body = joint(g, [0, 0, 0]);
  part(body, rough(sphere(0.29, 12, 10), 0.02, 3), skin, [0, 0.23, -0.07], { scale: [1.12, 0.7, 1.05] });
  part(body, rough(sphere(0.21, 12, 10), 0.015, 5), skin, [0, 0.27, 0.16], { scale: [1.25, 0.62, 1] });
  const throat = part(
    body,
    sphere(0.13, 10, 8),
    std(0x7aa8c8, { roughness: 0.4, emissive: 0x18405a }),
    [0, 0.15, 0.26],
    { scale: [1.2, 0.8, 0.9] },
  );
  // a heavy brow over two slit eyes, and great horns of ice swept back past its shoulders
  for (const s of [-1, 1]) part(body, sphere(0.07, 8, 6), skin, [0.11 * s, 0.36, 0.2], { scale: [1.2, 0.6, 1] });
  slitEyes(body, 0.11, 0.36, 0.27, 0.045, F, 0.45, 0.3);
  for (const s of [-1, 1])
    tube(
      body,
      [
        [0.12 * s, 0.37, 0.14],
        [0.25 * s, 0.47, 0.08],
        [0.36 * s, 0.5, -0.06],
        [0.39 * s, 0.42, -0.18],
      ],
      0.05,
      0.01,
      horn,
      12,
      6,
    );
  // a crown of frost between the horns, and icicle warts down its back
  for (let i = 0; i < 5; i++) {
    const a = (i / 4 - 0.5) * 1.6;
    crystal(
      body,
      F,
      [Math.sin(a) * 0.11, 0.41, 0.12 - Math.cos(a) * 0.05],
      0.14 + (i % 2) * 0.07,
      [-0.3, 0, -a * 0.6],
      ice,
    );
  }
  for (const [x, z, h, rz] of [
    [0, -0.02, 0.16, 0],
    [-0.13, -0.06, 0.12, 0.5],
    [0.14, -0.1, 0.13, -0.5],
    [-0.07, -0.2, 0.11, 0.3],
    [0.08, -0.24, 0.1, -0.3],
    [0, -0.32, 0.09, 0],
    [-0.19, -0.18, 0.08, 0.7],
    [0.2, -0.2, 0.08, -0.7],
  ] as const)
    crystal(body, F, [x, 0.38 - Math.abs(x) * 0.4 + z * 0.2, z], h, [-0.3, 0, rz], ice);
  // the jaw: a wide dark line of mouth, a row of ice teeth along it
  part(body, new THREE.TorusGeometry(0.2, 0.012, 4, 16, 1.4), lit(0x0c1218), [0, 0.42, 0.3], {
    rot: [0, 0, -Math.PI / 2 - 0.7],
  });
  for (let i = 0; i < 7; i++) {
    const x = (i / 6 - 0.5) * 0.3,
      z = 0.34 - Math.abs(x) * 0.4;
    spike(body, [x, 0.22, z], [x * 1.05, 0.15, z + 0.02], 0.016, tooth);
  }
  // legs: great folded haunches behind, splayed hands in front
  for (const s of [-1, 1]) {
    part(body, sphere(0.12, 8, 6), skin, [0.23 * s, 0.11, -0.13], { scale: [0.8, 0.95, 1.35] });
    part(body, sphere(0.065, 6, 5), belly, [0.27 * s, 0.02, 0.03], { scale: [1, 0.4, 1.7] });
    limb(body, [0.15 * s, 0.14, 0.19], [0.19 * s, 0.02, 0.28], 0.032, skin);
    for (const k of [-1, 0, 1]) spike(body, [0.19 * s, 0.015, 0.29], [0.19 * s + k * 0.04, 0.01, 0.36], 0.012, belly);
  }
  const frost = glow(F, 0.9, 0.4);
  frost.position.set(0, 0.42, -0.12);
  body.add(frost);
  const breath = glow(F, 0.5, 0);
  breath.position.set(0, 0.2, 0.42);
  body.add(breath);
  return {
    group: g,
    shadow: 0.8,
    parts: { body, throat },
    idle: (t) => {
      const puff = Math.max(0, Math.sin(t * 3.2));
      throat.scale.set(1.2 + puff * 0.35, 0.8 + puff * 0.3, 0.9 + puff * 0.25);
      body.scale.set(1, 1 + Math.sin(t * 1.6) * 0.02, 1);
      frost.material.opacity = 0.3 + Math.sin(t * 2) * 0.1;
      breath.material.opacity = puff * 0.35;
    },
  };
}

/** The Kelpie (for the Cistern Lurker; hides under water, rises, spits and dives): the water horse of the old tales rising
    from its pool, black-hided, a mane of weed with lightning running in it, a fanged muzzle and slit eyes. */
export function kelpie(): Built {
  const g = new THREE.Group(),
    hide = gloss(0x16242c, 0.35, 0.2),
    weed = std(0x1c3a2a, { roughness: 1 }),
    weedTip = std(0x3a6a3a),
    fang = gloss(0xdce8e8, 0.3, 0.2),
    hoof = gloss(0x0c1014, 0.4, 0.3),
    bolt = lit(0xf4f0a0);
  const disc = part(
    g,
    new THREE.CircleGeometry(0.55, 20),
    std(0x2e5e6e, { roughness: 0.9, emissive: 0x16404e }), // (the floor's deep water, as the room's pools: a near-black one read as a hole)
    [0, 0.012, 0],
    { rot: [-Math.PI / 2, 0, 0] },
  );
  const edge = runeRing(g, S, 0.55, [0, 0.03, 0], 8);
  const rise = joint(g, [0, 0, 0]); // (all of it that rises out of the pool: the foe sinks it to dive)
  part(rise, new THREE.TorusGeometry(0.28, 0.022, 4, 20), shine(0x9fe8ff, 0.5), [0, 0.03, 0.06], {
    rot: [Math.PI / 2, 0, 0],
  }); // (the water breaking round it)
  const neck = joint(rise, [0, 0.02, -0.04]);
  part(neck, rough(sphere(0.2, 10, 8), 0.015, 2), hide, [0, 0.2, 0.04], { scale: [1.05, 1.15, 0.9] }); // (its chest out of the water)
  tube(
    neck,
    [
      [0, 0.22, 0],
      [0, 0.48, 0.02],
      [0, 0.68, 0.06],
      [0, 0.82, 0.1],
    ],
    0.15,
    0.09,
    hide,
    10,
    7,
  );
  // the head, long and lean, tipped down: slit eyes under a ridge, ears laid back, a fanged muzzle
  const head = joint(neck, [0, 0.86, 0.12], [0.55, 0, 0]);
  part(head, sphere(0.1, 10, 8), hide, [0, 0, 0], { scale: [0.95, 0.9, 1.1] });
  tube(
    head,
    [
      [0, -0.01, 0.04],
      [0, -0.03, 0.16],
      [0, -0.05, 0.26],
    ],
    0.08,
    0.05,
    hide,
    6,
    7,
  );
  slitEyes(head, 0.065, 0.04, 0.07, 0.034, S, 0.5, 0.4);
  for (const s of [-1, 1]) {
    spike(head, [0.05 * s, 0.07, -0.02], [0.1 * s, 0.17, -0.1], 0.028, hide); // (ears, laid back like horns)
    for (const z of [0.12, 0.18, 0.24]) spike(head, [0.035 * s, -0.07, z], [0.033 * s, -0.13, z + 0.01], 0.012, fang);
  }
  part(head, sphere(0.02, 5, 4), lit(S), [0, -0.02, 0.3]); // (a spark at its nostrils)
  // the mane: strands of weed falling down its neck and out to the sides, lightning crackling in it
  for (let i = 0; i < 7; i++) {
    const y = 0.96 - i * 0.1,
      z = 0.04 - i * 0.015,
      s = i % 2 ? 1 : -1,
      w = 0.12 + (i % 3) * 0.04;
    tube(
      neck,
      [
        [0, y, z],
        [0.06 * s, y - 0.02, z - 0.08],
        [w * s, y - 0.1, z - 0.14],
        [(w + 0.06) * s, y - 0.2, z - 0.12],
      ],
      0.035,
      0.008,
      i % 3 ? weed : weedTip,
      8,
      4,
    );
  }
  const crackle = zigzag(neck, [0.08, 0.98, 0.04], [0.24, 0.44, -0.1], 7, 0.06, bolt, 0.014); // (on the mane's outside, where the camera sees it)
  const crackle2 = zigzag(neck, [-0.08, 0.84, 0.04], [-0.24, 0.36, -0.08], 6, 0.055, bolt, 0.014);
  // its forelegs, raised out of the water and pawing
  const paws = joint(neck, [0, 0.3, 0.12]);
  for (const s of [-1, 1]) {
    jointed(
      paws,
      [
        [0.12 * s, 0, 0],
        [0.2 * s, 0.06, 0.18],
        [0.17 * s, -0.08, 0.28],
      ],
      0.05,
      0.034,
      hide,
    );
    part(paws, new THREE.CylinderGeometry(0.035, 0.045, 0.05, 7), hoof, [0.17 * s, -0.11, 0.29]);
  }
  const lures = [-1, 1].map((s) => {
    const l = glow(S, 0.3, 0.8);
    l.position.set(0.14 * s, 0.62, -0.14);
    neck.add(l);
    return l;
  }); // (sparks caught in the mane)
  const place = (t: number) => {
    neck.rotation.z = Math.sin(t * 1.1) * 0.06;
    neck.rotation.x = Math.sin(t * 0.8) * 0.04;
    head.rotation.x = 0.55 + Math.sin(t * 1.3) * 0.08;
    paws.rotation.x = Math.sin(t * 2.6) * 0.25;
    edge.rotation.y = t * 0.3;
    const k = Math.floor(t * 9);
    crackle.visible = k % 3 !== 0;
    crackle2.visible = k % 4 !== 1;
    lures.forEach((l, i) => {
      l.material.opacity = (Math.floor(t * 6) + i * 2) % 5 ? 0.8 : 0.25;
    });
  };
  place(0);
  return { group: g, shadow: 0.55, idle: place, parts: { rise, lures: lures[0], lures2: lures[1], disc } };
}

/** The Reliquary Medusa (for the Lantern Jelly; drifts close and pulses light): a jellyfish whose bell is a lantern, panes of
    light between ribs of dark bronze, a flame inside and a ring to hang it by; no face; it trails stinging threads like
    chains, each ending in a barb of light. */
export function reliquaryMedusa(): Built {
  const g = new THREE.Group(),
    float = joint(g, [0, 0, 0]),
    bronze = gloss(0x3a2810, 0.35, 0.65),
    chainM = gloss(0x4a3818, 0.35, 0.6),
    barb = lit(H);
  const pane = std(0xffe2a0, {
    transparent: true,
    opacity: 0.6,
    emissive: 0x8a5a14,
    roughness: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const bell = joint(float, [0, 0.76, 0]);
  part(bell, new THREE.SphereGeometry(0.26, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), pane, [0, 0, 0], {
    scale: [1, 0.95, 1],
  });
  // ribs of bronze down the bell like a lantern's frame, a band and a rim of light below
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2,
      pts = [0, 1, 2, 3, 4].map((k) => {
        const p = (k / 4) * Math.PI * 0.56;
        return [Math.sin(p) * Math.cos(a) * 0.27, Math.cos(p) * 0.257, Math.sin(p) * Math.sin(a) * 0.27] as V3;
      });
    tube(bell, pts, 0.016, 0.012, bronze, 8, 4);
  }
  part(bell, new THREE.TorusGeometry(0.262, 0.02, 4, 24), bronze, [0, -0.02, 0], { rot: [Math.PI / 2, 0, 0] });
  part(bell, new THREE.TorusGeometry(0.25, 0.016, 4, 24), lit(H), [0, -0.05, 0], { rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    spike(
      bell,
      [Math.cos(a) * 0.24, -0.05, Math.sin(a) * 0.24],
      [Math.cos(a) * 0.26, -0.13, Math.sin(a) * 0.26],
      0.025,
      bronze,
    );
  } // (its frilled hem, in points)
  // the lantern's cap and the ring it hangs by
  part(bell, new THREE.CylinderGeometry(0.04, 0.09, 0.06, 8), bronze, [0, 0.26, 0]);
  part(bell, new THREE.TorusGeometry(0.05, 0.012, 4, 12), bronze, [0, 0.34, 0]);
  const flame = joint(bell, [0, 0.02, 0]);
  part(flame, new THREE.ConeGeometry(0.05, 0.15, 7), lit(0xfff0b0), [0, 0, 0]);
  part(flame, new THREE.ConeGeometry(0.024, 0.08, 6), lit(0xffffff), [0, -0.02, 0]);
  const light = glow(H, 0.7, 0.5);
  light.position.y = 0.02;
  bell.add(light);
  // the threads: chains of bronze links in three sets that sway, each ending in a hooked barb of light
  const sets = [0, 1, 2].map((j) => {
    const set = joint(float, [0, 0.7, 0]);
    for (const c of [0, 1]) {
      const a = ((j * 2 + c) / 6) * Math.PI * 2 + 0.3,
        r = 0.17;
      for (let i = 0; i < 7; i++) {
        const k = i / 6,
          x = Math.cos(a) * (r - k * 0.03),
          z = Math.sin(a) * (r - k * 0.03),
          bend = Math.sin(k * 2.4 + a) * 0.03;
        part(set, new THREE.TorusGeometry(0.022, 0.006, 4, 8), chainM, [x + bend, -i * 0.065, z + bend * 0.5], {
          rot: [0, a + ((i % 2) * Math.PI) / 2, 0],
        });
      }
      spike(
        set,
        [Math.cos(a) * 0.14, -0.44, Math.sin(a) * 0.14],
        [Math.cos(a) * 0.16, -0.52, Math.sin(a) * 0.16 + 0.02],
        0.02,
        barb,
      );
    }
    return set;
  });
  const place = (t: number) => {
    const p = Math.sin(t * 2.4);
    bell.scale.set(1 - p * 0.06, 1 + p * 0.08, 1 - p * 0.06);
    float.position.y = Math.sin(t * 1.2) * 0.06 + p * 0.02;
    flame.scale.set(1, 0.85 + Math.sin(t * 13) * 0.15, 1);
    light.material.opacity = 0.45 + Math.sin(t * 9) * 0.08;
    sets.forEach((s, i) => {
      s.rotation.x = Math.sin(t * 1.6 + i * 2.1) * 0.1;
      s.rotation.z = Math.sin(t * 1.3 + i * 1.7) * 0.08;
    });
  };
  place(0);
  return { group: g, shadow: 0.5, idle: place, parts: { bell, light } };
}

/** The Glass Wyrm (for the Glass Newt; hides in water, its bite chills): a long wyrm of clear ice on short legs, its body in
    an S, a dark spine and a frost heart glowing through it, horns of ice, a great frill fanned out from its head like fins
    of rime and a crest of ice down its back. */
export function glassWyrm(): Built {
  const g = new THREE.Group(),
    glass = std(0x2a6aa8, { transparent: true, opacity: 0.72, roughness: 0.06, metalness: 0.2 }),
    deep = gloss(0x0e2038, 0.2, 0.3),
    core = lit(F),
    rim = lit(0xd8f4ff);
  const frillM = thin(0x8ad0ff, { transparent: true, opacity: 0.85, emissive: 0x2a6a9a, roughness: 0.2 });
  const body = joint(g, [0, 0, 0]);
  const spine: V3[] = [
    [0, 0.17, 0.34],
    [0.06, 0.18, 0.08],
    [-0.08, 0.16, -0.2],
    [0.1, 0.12, -0.5],
    [-0.06, 0.08, -0.8],
    [0.12, 0.05, -1.08],
    [0.3, 0.04, -1.28],
    [0.42, 0.04, -1.36],
  ];
  tube(body, spine, 0.15, 0.015, glass, 22, 8);
  tube(
    body,
    spine.slice(0, 7).map(([x, y, z]) => [x, y + 0.02, z] as V3),
    0.055,
    0.01,
    deep,
    18,
    5,
  ); // (its spine, seen through the ice)
  part(body, new THREE.OctahedronGeometry(0.09), core, [0.02, 0.2, 0.02], { scale: [0.8, 1.25, 0.8] });
  const heart = glow(F, 0.8, 0.7);
  heart.position.set(0.02, 0.22, 0.02);
  body.add(heart);
  // a crest of ice down its back, tall at the shoulders
  const along = (k: number): V3 => {
    const f = k * (spine.length - 1),
      i = Math.min(spine.length - 2, Math.floor(f)),
      r = f - i,
      p = spine[i],
      q = spine[i + 1];
    return [p[0] + (q[0] - p[0]) * r, p[1] + (q[1] - p[1]) * r, p[2] + (q[2] - p[2]) * r];
  };
  for (let i = 0; i < 12; i++) {
    const k = 0.04 + (i / 12) * 0.8,
      p = along(k),
      y = p[1] + 0.13 - k * 0.08;
    spike(body, [p[0], y, p[2]], [p[0], y + 0.22 * (1 - k * 0.8), p[2] - 0.09], 0.035 - k * 0.025, rim);
  }
  // the head: long and flat, slit eyes, horns of ice swept back, and the great frill fanned out to each side
  const head = joint(body, [0, 0.18, 0.4]);
  part(head, sphere(0.14, 10, 8), glass, [0, 0, 0.08], { scale: [1, 0.55, 1.6] });
  part(head, new THREE.BoxGeometry(0.18, 0.012, 0.18), rim, [0, -0.035, 0.18]);
  slitEyes(head, 0.07, 0.05, 0.14, 0.045, F, 0.7, 0.25);
  for (const s of [-1, 1]) {
    tube(
      head,
      [
        [0.05 * s, 0.06, 0.02],
        [0.1 * s, 0.12, -0.1],
        [0.12 * s, 0.14, -0.24],
      ],
      0.03,
      0.006,
      rim,
      8,
      4,
    );
    const fan = part(head, new THREE.CircleGeometry(0.3, 12, -0.25, Math.PI * 0.95), frillM, [0.09 * s, 0.04, -0.04], {
      rot: [-0.55, s > 0 ? -0.3 : Math.PI + 0.3, s * 0.2],
    });
    fan.renderOrder = 1;
    for (let i = 0; i < 6; i++) {
      const a = -0.25 + ((i + 0.5) / 6) * Math.PI * 0.95,
        d: V3 = [Math.cos(a) * 0.3, Math.sin(a) * 0.27, -Math.sin(a) * 0.13];
      spike(head, [0.09 * s, 0.04, -0.04], [0.09 * s + d[0] * s, 0.04 + d[1], -0.04 + d[2] - 0.08], 0.012, rim);
    }
  }
  // four short legs, set by diagonal pairs that step together
  const sets = [joint(body, [0, 0, 0]), joint(body, [0, 0, 0])];
  [-1, 1].forEach((s) =>
    [
      [0.16, 0.26, 0.07],
      [-0.32, -0.42, -0.07],
    ].forEach(([hz, fz, x0], j) => {
      const l = joint(sets[(j + (s > 0 ? 1 : 0)) % 2], [x0 + 0.09 * s, 0.14, hz]);
      jointed(
        l,
        [
          [0, 0, 0],
          [0.18 * s, 0.05, 0.02],
          [0.26 * s, -0.13, fz - hz],
        ],
        0.055,
        0.032,
        glass,
      );
      for (const k of [-1, 0, 1])
        spike(l, [0.25 * s, -0.13, fz - hz], [0.31 * s + k * 0.03, -0.13, fz - hz + 0.06 + k * 0.02 * s], 0.012, rim);
    }),
  );
  return {
    group: g,
    shadow: 1.3,
    parts: { body, head },
    idle: (t) => {
      body.rotation.y = Math.sin(t * 1.5) * 0.06;
      head.rotation.y = Math.sin(t * 0.9) * 0.25;
      head.rotation.x = Math.sin(t * 1.3) * 0.05;
      sets.forEach((l, i) => {
        l.rotation.y = (i ? 1 : -1) * Math.sin(t * 1.5) * 0.05;
      });
      heart.material.opacity = 0.5 + 0.25 * Math.sin(t * 3);
    },
  };
}

/** The Rime Crawler (for the Rime Snail; a rime trail, a shell it hides in): a crawler of wet slate under a shell that is a
    geode, dark stone cracked open on top and ice crystal bursting out of it; horned eye stalks, and a lamprey's ring of
    teeth for a mouth. */
export function rimeCrawler(): Built {
  const g = new THREE.Group(),
    skin = gloss(0x28323e, 0.3, 0.1),
    belly = std(0x46525e),
    rock = std(0x3a3c46, { roughness: 1 }),
    tooth = gloss(0xd8e4ec, 0.3, 0.2),
    ice = lit(F),
    iceM = std(0x7ac8f8, { roughness: 0.1, metalness: 0.2, emissive: 0x1e5a88 });
  for (let i = 0; i < 4; i++)
    part(
      g,
      new THREE.CircleGeometry(0.16 - i * 0.02, 8),
      shine(0xd8f0ff, 0.35 - i * 0.06),
      [Math.sin(i * 2) * 0.04, 0.006, -0.62 - i * 0.2],
      { rot: [-Math.PI / 2, 0, 0], scale: [1, 1.5, 1] },
    );
  const body = joint(g, [0, 0, 0]);
  const foot = joint(body, [0, 0, 0]);
  part(foot, sphere(0.24, 10, 6), skin, [0, 0.08, -0.08], { scale: [1.05, 0.42, 2.6] });
  part(foot, sphere(0.24, 10, 6), belly, [0, 0.04, -0.08], { scale: [1.2, 0.2, 2.7] });
  // the head: a thick neck rearing forward, the round mouth turned up and out, ringed with teeth, its throat glowing
  const head = joint(body, [0, 0.14, 0.32]);
  tube(
    head,
    [
      [0, 0, -0.06],
      [0, 0.1, 0.08],
      [0, 0.2, 0.16],
    ],
    0.14,
    0.12,
    skin,
    6,
    8,
  );
  const mouth = joint(head, [0, 0.22, 0.2], [-0.75, 0, 0]);
  part(mouth, new THREE.CircleGeometry(0.1, 14), lit(0x0c0a10), [0, 0, 0.005]);
  part(mouth, new THREE.CircleGeometry(0.04, 10), ice, [0, 0, 0.008]);
  part(mouth, new THREE.TorusGeometry(0.11, 0.025, 5, 16), skin, [0, 0, 0]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    spike(
      mouth,
      [Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.01],
      [Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.03],
      0.014,
      tooth,
    );
  }
  // horned eye stalks, a slit of frost-light at each tip
  const stalks = joint(head, [0, 0.22, 0.14]);
  for (const s of [-1, 1]) {
    tube(
      stalks,
      [
        [0.07 * s, 0, 0],
        [0.12 * s, 0.16, -0.02],
        [0.17 * s, 0.32, -0.06],
      ],
      0.024,
      0.012,
      skin,
      6,
      4,
    );
    spike(stalks, [0.16 * s, 0.3, -0.06], [0.24 * s, 0.38, -0.14], 0.018, tooth);
    part(stalks, sphere(0.03, 8, 6), ice, [0.17 * s, 0.33, -0.04], { scale: [1, 0.4, 0.6], rot: [0, 0, -0.4 * s] });
  }
  // the shell: a geode, dark rough stone cracked open on top, crystal of ice bursting out round a ring of frost-light
  const shell = joint(body, [0, 0.2, -0.16], [-0.2, 0, 0]);
  part(shell, rough(new THREE.IcosahedronGeometry(0.34, 1), 0.04, 4), rock, [0, 0.22, 0], { scale: [1, 0.82, 1.12] });
  part(shell, new THREE.TorusGeometry(0.2, 0.022, 4, 18), ice, [0, 0.46, 0], { rot: [Math.PI / 2, 0, 0] });
  for (const [x, z, h, rx, rz, lit_] of [
    [0, 0, 0.44, 0, 0, 1],
    [0.12, 0.07, 0.32, 0.35, -0.55, 0],
    [-0.12, 0.06, 0.34, 0.35, 0.55, 1],
    [0.08, -0.12, 0.3, -0.45, -0.35, 1],
    [-0.1, -0.11, 0.28, -0.45, 0.45, 0],
    [0.2, -0.02, 0.22, 0, -1, 1],
    [-0.2, -0.02, 0.24, 0, 1, 0],
    [0, 0.16, 0.24, 0.8, 0, 1],
    [0.05, 0.02, 0.2, 0.1, -0.2, 0],
  ] as const)
    crystal(shell, F, [x, 0.42 + h * 0.3, z], h, [rx, 0, rz], lit_ ? ice : iceM);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    crystal(
      shell,
      F,
      [Math.cos(a) * 0.3, 0.2 + (i % 2) * 0.08, Math.sin(a) * 0.34],
      0.1,
      [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2],
      iceM,
    );
  } // (crystal breaking through its flanks)
  const breath = glow(F, 1, 0.3);
  breath.position.set(0, 0.55, 0);
  shell.add(breath);
  return {
    group: g,
    shadow: 1.1,
    parts: { body, head, shell },
    idle: (t) => {
      const c = Math.sin(t * 1.3);
      foot.scale.z = 1 + c * 0.04;
      head.position.z = 0.32 + c * 0.03;
      head.scale.setScalar(1);
      shell.position.z = -0.16 - c * 0.01;
      stalks.rotation.x = Math.sin(t * 1.7) * 0.15;
      stalks.rotation.z = Math.sin(t * 1.1) * 0.1;
      breath.material.opacity = 0.2 + 0.12 * Math.sin(t * 2);
    },
  };
}

/** The Spark Wyvern (for the Storm Darter; dashes, laying sparks): a small wyvern on two pairs of dragonfly wings, a horned
    head with slit eyes, a long serpent's body ringed with storm-light and a tail that crackles. */
export function sparkWyvern(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0.85, 0]),
    scale = gloss(0x4a3c94, 0.3, 0.45), // (storm indigo: a dark teal body was lost on the drowned floor, art bible 4.1)
    belly = gloss(0xb89a34, 0.3, 0.4),
    horn = std(0xc8d0d8),
    spark = lit(S),
    wingM = shine(0xdcecff, 0.3),
    vein = lit(0xf6f0a8);
  part(body, sphere(0.12, 8, 6), scale, [0, 0, 0], { scale: [0.9, 0.85, 1.6] }); // (thick enough to read: a thin dark body vanished)
  part(body, sphere(0.08, 8, 6), belly, [0, -0.03, 0.04], { scale: [0.85, 0.6, 1.4] });
  // the neck and head: horned, a wyvern's long jaw, slit eyes
  tube(
    body,
    [
      [0, 0.02, 0.12],
      [0, 0.06, 0.22],
      [0, 0.07, 0.3],
    ],
    0.055,
    0.04,
    scale,
    6,
    6,
  );
  part(body, sphere(0.06, 8, 6), scale, [0, 0.07, 0.33], { scale: [0.9, 0.75, 1.5] });
  slitEyes(body, 0.032, 0.09, 0.37, 0.026, S, 0.5, 0.35);
  for (const s of [-1, 1]) {
    tube(
      body,
      [
        [0.025 * s, 0.1, 0.32],
        [0.08 * s, 0.15, 0.25],
        [0.13 * s, 0.15, 0.16],
        [0.15 * s, 0.11, 0.1],
      ],
      0.016,
      0.004,
      horn,
      8,
      4,
    );
    spike(body, [0.02 * s, 0.04, 0.4], [0.015 * s, 0.0, 0.44], 0.01, horn);
  }
  // the serpent's body and tail, ringed with storm-light, a crackle running down the end of it
  tube(
    body,
    [
      [0, 0, -0.12],
      [0.04, -0.02, -0.36],
      [-0.04, 0, -0.6],
      [0.03, 0.05, -0.82],
      [0, 0.09, -0.96],
    ],
    0.085,
    0.016,
    scale,
    14,
    6,
  );
  for (let i = 0; i < 5; i++)
    part(body, new THREE.TorusGeometry(0.055 - i * 0.006, 0.012, 3, 8), spark, [
      Math.sin(i * 1.3) * 0.03,
      -0.01 + i * 0.015,
      -0.2 - i * 0.13,
    ]);
  for (let i = 0; i < 6; i++)
    spike(body, [0, 0.07 - i * 0.006, 0.08 - i * 0.1], [0, 0.12 - i * 0.008, 0.04 - i * 0.1], 0.014, horn); // (spines down its back)
  const crackle = zigzag(body, [0.02, 0.04, -0.62], [0, 0.1, -1.1], 6, 0.045, vein, 0.012);
  const tip = glow(S, 0.45, 0.7);
  tip.position.set(0, 0.1, -1.02);
  body.add(tip);
  // two pairs of dragonfly wings, a side's pair beating as one
  const sides = ([-1, 1] as const).map((s) => {
    const w = joint(body, [0.05 * s, 0.06, 0]);
    for (const [z, sweep, r] of [
      [0.06, 0.12, 0.32],
      [-0.06, -0.14, 0.28],
    ]) {
      part(w, sphere(r, 8, 4), wingM, [r * s, 0, z], { rot: [0, sweep * s, 0], scale: [1, 0.03, 0.17] });
      part(w, new THREE.BoxGeometry(r * 1.8, 0.006, 0.01), vein, [r * s, 0.005, z + 0.01], { rot: [0, sweep * s, 0] });
    }
    return w;
  });
  for (const s of [-1, 1])
    jointed(
      body,
      [
        [0.04 * s, -0.06, -0.06],
        [0.08 * s, -0.12, -0.02],
        [0.06 * s, -0.18, 0.03],
      ],
      0.014,
      0.006,
      scale,
    );
  return {
    group: g,
    shadow: 0.9,
    parts: { body },
    idle: (t) => {
      body.position.y = 0.85 + Math.sin(t * 2.2) * 0.05;
      body.rotation.z = Math.sin(t * 1.4) * 0.06;
      sides.forEach((w, i) => {
        w.rotation.z = Math.sin(t * 34) * 0.35 * (i ? 1 : -1);
      });
      const on = Math.floor(t * 10) % 3 === 0;
      tip.material.opacity = on ? 0.95 : 0.35;
      crackle.visible = !on;
    },
  };
}

/** Floor 2's looks, by the look id each replaces. */
export const FLOOR2_LOOKS: Record<string, () => Built> = {
  mireToad: hoarfrostToad,
  cisternLurker: kelpie,
  lanternJelly: reliquaryMedusa,
  glassNewt: glassWyrm,
  rimeSnail: rimeCrawler,
  stormDarter: sparkWyvern,
};
