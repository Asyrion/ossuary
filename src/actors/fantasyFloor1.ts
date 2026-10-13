/* M4.12 step 2 (docs/archive/M4.12-plan.md): floor 1's ten foes redone as creatures of fantasy. Each keeps its fight, the parts
   its behaviour moves (by the old look's names) and about its height; each faces +Z, stands on y = 0 and idles. The rules:
   no round googly eyes (small glowing slits or beads), the school in the body (runes, crystal, fire, light), real size. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, crystal, limb, lit, part, rune, shine, sphere, std, type V3 } from '../render/arcane';
import { rough } from '../world/kitParts';
import {
  beads,
  featherWing,
  gloss,
  joint,
  jointed,
  pincer,
  slitEyes,
  spike,
  thin,
  tube,
  type Built,
} from './beastParts';

const { ember: E, storm: S, hallow: H, umbral: U } = SCHOOL_LIGHT;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** The Spore Fiend (was the Sporeling; hops, bursts in stinging spores): a hunched fungal beast on four root legs, a hood of
    shelf fungus over a gilled maw of thorn teeth, violet spore sacs glowing along its back. */
export function sporeFiend(): Built {
  const g = new THREE.Group(),
    flesh = std(0x6e5e4a, { roughness: 0.95 }),
    fleshDark = std(0x4a3e30, { roughness: 0.95 }),
    shelf = std(0x3a1e4a, { roughness: 0.8 }),
    gill = std(0x241430),
    thorn = gloss(0xe8dcc0, 0.4, 0.1),
    sac = lit(U);
  const body = joint(g, [0, 0, 0]);
  part(body, rough(sphere(0.26, 10, 8), 0.025, 4), flesh, [0, 0.3, -0.06], { scale: [1.05, 0.8, 1.15] });
  // four root legs, splayed and knotted
  for (const [x, z] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ])
    tube(
      body,
      [
        [0.1 * x, 0.24, 0.08 * z],
        [0.2 * x, 0.14, 0.14 * z],
        [0.24 * x, 0, 0.2 * z],
      ],
      0.045,
      0.018,
      fleshDark,
      6,
      5,
    );
  // the hood: three shelves of fungus stacked forward over the face, violet above, gilled beneath
  const hood = joint(body, [0, 0.46, -0.02], [-0.35, 0, 0]); // (tipped back, so the maw shows beneath it from above)
  for (const [y, z, r] of [
    [0, 0, 0.2],
    [0.06, -0.06, 0.17],
    [0.11, -0.12, 0.13],
  ] as V3[]) {
    part(hood, new THREE.SphereGeometry(r * 0.8, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), shelf, [0, y, z], {
      scale: [1.15, 0.4, 1],
    });
    part(hood, new THREE.CircleGeometry(r * 0.8, 12), gill, [0, y - 0.002, z], {
      rot: [Math.PI / 2, 0, 0],
      scale: [1.15, 1, 1],
    });
    for (let i = 0; i < 7; i++) {
      const a = (i / 6 - 0.5) * 3.4,
        o: V3 = [Math.sin(a) * r * 0.9, y, z + Math.cos(a) * r * 0.8];
      spike(hood, o, [o[0] * 1.35, y + 0.02, z + (o[2] - z) * 1.35], 0.02, shelf);
    } // (its rim torn into points)
  }
  for (const s of [-1, 1])
    tube(
      hood,
      [
        [0.1 * s, 0.04, -0.02],
        [0.2 * s, 0.14, -0.06],
        [0.22 * s, 0.26, -0.16],
        [0.16 * s, 0.3, -0.24],
      ],
      0.035,
      0.006,
      thorn,
      10,
      5,
    ); // (two thorn horns curling up and back)
  for (const [x, z] of [
    [-0.06, 0.02],
    [0.07, -0.05],
    [0, -0.12],
    [-0.05, -0.15],
  ])
    part(hood, sphere(0.022, 6, 4), sac, [x, 0.12, z], { scale: [1, 0.4, 1] }); // (its spots, glowing)
  // the maw under the hood: dark, ringed with thorn teeth; two violet slits for eyes in the shade
  part(body, sphere(0.13, 8, 6), lit(0x6a2a8a), [0, 0.32, 0.2], { scale: [1.2, 0.75, 0.55] }); // (the maw, glowing violet in its throat)
  for (let i = 0; i < 9; i++) {
    const a = (i / 8 - 0.5) * 2.4;
    spike(body, [Math.sin(a) * 0.13, 0.39, 0.2 + Math.cos(a) * 0.03], [Math.sin(a) * 0.11, 0.29, 0.27], 0.018, thorn);
    spike(body, [Math.sin(a) * 0.13, 0.25, 0.2], [Math.sin(a) * 0.1, 0.34, 0.26], 0.015, thorn);
  }
  slitEyes(body, 0.09, 0.45, 0.2, 0.03, U, 0.3, 0.4);
  // the spore sacs along its back
  const sacs = joint(body, [0, 0.44, -0.22]); // (they swell as one, so they draw as one)
  for (const [x, y, z, r] of [
    [0, 0.5, -0.22, 0.09],
    [-0.16, 0.44, -0.12, 0.075],
    [0.17, 0.45, -0.14, 0.08],
    [-0.08, 0.4, -0.34, 0.065],
    [0.1, 0.39, -0.32, 0.06],
  ])
    part(sacs, sphere(r, 7, 5), sac, [x, y - 0.44, z + 0.22]);
  const under = glow(U, 1.1, 0.45);
  under.position.set(0, 0.4, -0.12);
  body.add(under);
  const drift = joint(g, [0, 0.5, -0.15]); // (the spores rise and turn as one drift, staggered in height)
  for (let i = 0; i < 5; i++)
    part(drift, sphere(0.02 * (1 - i * 0.12), 5, 4), sac, [
      Math.sin(i * 2.3) * 0.14,
      i * 0.11,
      Math.cos(i * 2.3) * 0.12,
    ]);
  return {
    group: g,
    shadow: 0.7,
    idle: (t) => {
      const k = (t * 1.3) % 1,
        up = k < 0.55 ? Math.sin((k / 0.55) * Math.PI) : 0,
        land = k >= 0.55 && k < 0.75 ? Math.sin(((k - 0.55) / 0.2) * Math.PI) : 0;
      body.position.y = up * 0.12;
      body.scale.set(1 + land * 0.1, 1 - land * 0.14 + up * 0.04, 1 + land * 0.1);
      hood.rotation.x = -up * 0.15;
      sacs.scale.setScalar(1 + Math.sin(t * 3) * 0.1);
      under.material.opacity = 0.3 + Math.sin(t * 2.5) * 0.12;
      const q = (t * 0.45) % 1;
      drift.position.y = 0.5 + q * 0.11;
      drift.rotation.y = t * 0.6;
      drift.scale.setScalar(1 - q * 0.25);
    },
  };
}

/** The Seraph Moth (was the Vesper Moth; flutters, drawn to lit braziers): six wings, each with an eye of pale fire, a
    needle proboscis, feelers like a crown. */
export function seraphMoth(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0.62, 0]),
    fur = std(0x5a4a34, { roughness: 1 }),
    furPale = std(0xb8a27a, { roughness: 1 }),
    band = std(0x2a2018),
    wingM = thin(0xd8c8a0, { roughness: 0.7 }),
    edgeM = thin(0x6a5232),
    fire = lit(H),
    needle = gloss(0x2a2014, 0.3, 0.3);
  part(body, sphere(0.11, 10, 8), fur, [0, 0, 0.02], { scale: [1, 0.95, 1.1] });
  part(body, sphere(0.1, 10, 8), furPale, [0, -0.02, -0.17], { scale: [0.85, 0.8, 1.5] });
  for (const z of [-0.12, -0.2, -0.28])
    part(body, new THREE.TorusGeometry(0.08 - (z + 0.12) * -0.25, 0.012, 4, 12), band, [0, -0.02, z]);
  part(body, sphere(0.035, 6, 5), fire, [0, -0.03, -0.34]);
  const head = joint(body, [0, 0.02, 0.12]);
  part(head, sphere(0.07, 8, 6), fur, [0, 0, 0]);
  beads(
    head,
    [
      [-0.045, 0.02, 0.05],
      [0.045, 0.02, 0.05],
    ],
    0.018,
    H,
  );
  tube(
    head,
    [
      [0, -0.02, 0.06],
      [0, -0.06, 0.16],
      [0, -0.12, 0.27],
      [0, -0.15, 0.33],
    ],
    0.012,
    0.003,
    needle,
    8,
    4,
  ); // (the needle proboscis)
  // feelers like a crown: two feathered antennae spread up and out
  for (const s of [-1, 1]) {
    tube(
      head,
      [
        [0.02 * s, 0.05, 0.04],
        [0.08 * s, 0.16, 0.06],
        [0.16 * s, 0.26, 0.02],
      ],
      0.008,
      0.004,
      band,
      6,
      3,
    );
    for (let i = 0; i < 5; i++) {
      const k = 0.3 + i * 0.14,
        at: V3 = [0.02 * s + 0.14 * s * k, 0.05 + 0.21 * k, 0.04];
      spike(head, at, [at[0] + 0.04 * s, at[1] + 0.03, at[2] - 0.02], 0.006, furPale);
    }
  }
  // six wings in three pairs, each with an eye of pale fire (a ring with a slit for a pupil)
  const sides = [-1, 1].map((s) => joint(body, [0.065 * s, 0.04, 0])); // (each side's three wings beat as one, so they draw as one)
  const wing = (s: number, at: V3, yaw: number, r: number) => {
    const w = joint(sides[(s + 1) / 2], [at[0] - 0.065 * s, at[1] - 0.04, at[2]], [0, yaw, 0]);
    part(w, sphere(r, 12, 6), wingM, [r * 0.9 * s, 0, 0], { scale: [1, 0.06, 0.6] });
    part(w, sphere(r * 1.05, 12, 6), edgeM, [r * 0.9 * s, -0.004, 0], { scale: [1, 0.05, 0.65] });
    part(w, new THREE.RingGeometry(r * 0.16, r * 0.3, 14), fire, [r * 1.05 * s, r * 0.07, 0], {
      rot: [-Math.PI / 2, 0, 0],
    });
    part(w, new THREE.PlaneGeometry(r * 0.07, r * 0.3), lit(0x1a120a), [r * 1.05 * s, r * 0.07 + 0.002, 0], {
      rot: [-Math.PI / 2, 0, 0],
    });
    return { w, s };
  };
  for (const s of [-1, 1]) {
    wing(s, [0.06 * s, 0.05, 0.06], -0.55 * s, 0.2);
    wing(s, [0.07 * s, 0.04, -0.02], -0.1 * s, 0.25);
    wing(s, [0.06 * s, 0.02, -0.11], 0.5 * s, 0.17);
  }
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++)
      jointed(
        body,
        [
          [0.04 * s, -0.06, 0.05 - i * 0.06],
          [0.1 * s, -0.14, 0.07 - i * 0.07],
          [0.11 * s, -0.24, 0.1 - i * 0.08],
        ],
        0.009,
        0.005,
        band,
      );
  const halo = glow(H, 0.9, 0.35);
  body.add(halo);
  return {
    group: g,
    shadow: 0.7,
    idle: (t) => {
      body.position.y = 0.62 + Math.sin(t * 3) * 0.05 + Math.sin(t * 14) * 0.01;
      body.rotation.z = Math.sin(t * 1.3) * 0.08;
      sides.forEach((w, i) => {
        w.rotation.z = (i ? 1 : -1) * (0.25 + Math.sin(t * 13) * 0.5);
      });
      halo.material.opacity = 0.25 + Math.sin(t * 4) * 0.1;
    },
  };
}

/** The Runehorn (was the Rune Beetle; charges): a ram-like beast of stone and sinew, its horns carved runestones that
    crackle before the charge, two plates of carved stone on its back that part to show the storm in it (`halfL`, `halfR`,
    `inner`). */
export function runehorn(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0.26, 0]),
    hide = std(0x24242e, { roughness: 0.9 }),
    stone = std(0x3c3c48, { roughness: 0.85 }),
    horn = std(0x8a8478, { roughness: 0.7 }),
    hoof = gloss(0x14141a, 0.4, 0.3),
    spark = lit(S);
  part(body, rough(sphere(0.22, 10, 8), 0.02, 7), hide, [0, 0, -0.04], { scale: [0.95, 0.8, 1.35] });
  const inner = glow(S, 0.9, 0);
  inner.position.set(0, 0.12, -0.06);
  body.add(inner);
  // the storm in it: a ridge of crystals along the spine, between the plates
  for (const [z, h] of [
    [0.12, 0.12],
    [-0.02, 0.16],
    [-0.16, 0.13],
    [-0.28, 0.09],
  ])
    crystal(body, S, [0, 0.15 + h * 0.3, z], h, [-0.35, 0, 0], spark);
  const halves = [-1, 1].map((s) => {
    // (two carved plates: they part as it charges)
    const h = joint(body, [0.01 * s, 0.1, -0.02]);
    part(h, rough(new THREE.BoxGeometry(0.15, 0.05, 0.34), 0.015, 3 + s), stone, [0.11 * s, 0.0, -0.02], {
      rot: [0, 0, 0.5 * s],
    });
    for (const z of [0.07, -0.11]) rune(h, S, [0.12 * s, 0.035, z], 0.11, [-Math.PI / 2, 0, 0.5 * s]);
    return h;
  });
  // the head: long and low, a stone brow, slit eyes, and the great pale horns curling back and round, runes cut along them
  const head = joint(body, [0, 0.08, 0.32], [0.15, 0, 0]);
  head.scale.setScalar(1.25);
  part(head, rough(sphere(0.11, 8, 6), 0.015, 9), hide, [0, 0, 0.04], { scale: [0.85, 0.8, 1.3] });
  part(head, new THREE.BoxGeometry(0.18, 0.05, 0.1), stone, [0, 0.06, 0.02]);
  slitEyes(head, 0.065, 0.03, 0.1, 0.025, S, 0.4, 0.3);
  for (const s of [-1, 1]) {
    tube(
      head,
      [
        [0.06 * s, 0.07, 0],
        [0.2 * s, 0.17, -0.04],
        [0.3 * s, 0.08, -0.12],
        [0.29 * s, -0.06, -0.04],
        [0.21 * s, -0.06, 0.07],
      ],
      0.055,
      0.016,
      horn,
      14,
      6,
    ); // (curling wide, out past the shoulders)
    for (let i = 0; i < 4; i++)
      part(head, new THREE.BoxGeometry(0.05, 0.02, 0.04), spark, [
        (0.14 + i * 0.045) * s,
        0.19 - i * 0.035,
        -0.04 - i * 0.03,
      ]); // (runes cut along the horn)
  }
  const tip = crystal(head, S, [0, 0.02, 0.17], 0.05, [Math.PI / 2, 0, 0], spark),
    tipGlow = glow(S, 0.3, 0.6);
  tipGlow.position.set(0, 0.02, 0.19);
  head.add(tipGlow);
  // four legs, thick, with split hooves that strike sparks
  const legs = [
    [0.13, 0.16],
    [-0.13, 0.16],
    [0.13, -0.22],
    [-0.13, -0.22],
  ].map(([x, z]) => {
    const l = joint(body, [x, -0.06, z]);
    jointed(
      l,
      [
        [0, 0, 0],
        [0, -0.1, 0.02],
        [0, -0.2, -0.01],
      ],
      0.05,
      0.035,
      hide,
    );
    part(l, new THREE.CylinderGeometry(0.035, 0.045, 0.04, 6), hoof, [0, -0.2, 0]);
    return l;
  });
  tube(
    body,
    [
      [0, 0.02, -0.32],
      [0, -0.04, -0.42],
      [0, -0.12, -0.44],
    ],
    0.03,
    0.01,
    hide,
    6,
    4,
  );
  return {
    group: g,
    shadow: 0.8,
    parts: { halfL: halves[0], halfR: halves[1], inner },
    idle: (t) => {
      const open = Math.max(0, Math.sin(t * 1.3)) ** 4;
      halves.forEach((h, i) => {
        h.rotation.z = (i ? 1 : -1) * open * 0.4;
      });
      inner.material.opacity = open * 0.9;
      legs.forEach((l, i) => {
        l.rotation.x = Math.sin(t * 4 + i * 1.6) * 0.08 * (1 - open);
      });
      head.rotation.x = 0.25 + Math.sin(t * 1.1) * 0.05;
      const on = Math.floor(t * 9) % 4 !== 0;
      tip.visible = on;
      tipGlow.material.opacity = on ? 0.6 : 0.15;
    },
  };
}

/** The Urn Mimic (hidden among urns): a clay urn with ember light in its cracks; its lid lifts on a ring of fangs (`lid`), a
    cluster of ember slits peers out (`peek`) over the fire inside (`inside`), and clay legs fold under it. */
export function urnMimicFierce(): Built {
  const g = new THREE.Group(),
    clay = std(0xa8583a, { roughness: 0.9 }),
    clayDark = std(0x6a3424, { roughness: 0.9 }),
    tooth = gloss(0xe8dcc4, 0.4, 0.1),
    crack = lit(E),
    body = joint(g, [0, 0, 0]);
  const profile = [
    [0, 0],
    [0.13, 0],
    [0.21, 0.05],
    [0.26, 0.16],
    [0.25, 0.28],
    [0.19, 0.36],
    [0.15, 0.4],
    [0.17, 0.43],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  part(body, new THREE.LatheGeometry(profile, 14), clay, [0, 0.06, 0]);
  // ember light in its cracks (jagged glowing lines down its belly) and a band of runes
  for (const [a, y0, y1] of [
    [0.4, 0.12, 0.36],
    [-0.9, 0.1, 0.3],
    [2.4, 0.14, 0.34],
  ] as V3[])
    for (let k = 0; k < 3; k++) {
      const y = y0 + ((y1 - y0) * (k + 0.5)) / 3,
        x = Math.sin(a + (k % 2 ? 0.06 : -0.06)) * 0.262,
        z = Math.cos(a + (k % 2 ? 0.06 : -0.06)) * 0.262;
      part(body, new THREE.BoxGeometry(0.012, (y1 - y0) / 3 + 0.01, 0.012), crack, [x, y + 0.06, z], {
        rot: [0, a, k % 2 ? 0.4 : -0.4],
      });
    }
  part(body, new THREE.TorusGeometry(0.25, 0.012, 4, 22), clayDark, [0, 0.34, 0], { rot: [Math.PI / 2, 0, 0] });
  // fangs round the rim, inside the mouth
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    spike(
      body,
      [Math.sin(a) * 0.15, 0.49, Math.cos(a) * 0.15],
      [Math.sin(a) * 0.11, 0.44, Math.cos(a) * 0.11],
      0.016,
      tooth,
    );
  }
  part(body, new THREE.CircleGeometry(0.14, 14), lit(0x2a0a04), [0, 0.47, 0], { rot: [-Math.PI / 2, 0, 0] });
  const inside = glow(E, 0.75, 0.4);
  inside.position.y = 0.52;
  body.add(inside);
  // what peeks out: a cluster of ember slits, no face
  const peek = joint(body, [0, 0.42, 0.02]);
  for (const [x, y, r] of [
    [-0.04, 0.02, 0.022],
    [0.04, 0.02, 0.022],
    [0, 0.045, 0.016],
    [-0.075, -0.005, 0.014],
    [0.075, -0.005, 0.014],
  ] as V3[])
    part(peek, sphere(r, 6, 4), lit(0xffb040), [x, y, 0.07], { scale: [1.3, 0.35, 0.6] });
  const lid = joint(body, [0, 0.5, -0.15]);
  part(lid, new THREE.CylinderGeometry(0.18, 0.19, 0.045, 14), clayDark, [0, 0.02, 0.15]);
  part(lid, new THREE.ConeGeometry(0.05, 0.08, 6), clayDark, [0, 0.08, 0.15]);
  for (let i = 0; i < 9; i++) {
    const a = (i / 8 - 0.5) * 2.6;
    spike(
      lid,
      [Math.sin(a) * 0.16, -0.002, 0.15 + Math.cos(a) * 0.16],
      [Math.sin(a) * 0.14, -0.06, 0.15 + Math.cos(a) * 0.14],
      0.016,
      tooth,
    );
  } // (the lid's fangs)
  // clay legs folded under (an urn's foot, until it walks)
  const legs = [0, 1, 2, 3].map((i) => {
    const a = ((i + 0.5) / 4) * Math.PI * 2,
      l = joint(body, [Math.sin(a) * 0.16, 0.1, Math.cos(a) * 0.14]);
    jointed(
      l,
      [
        [0, 0, 0],
        [Math.sin(a) * 0.12, 0.02, Math.cos(a) * 0.1],
        [Math.sin(a) * 0.16, -0.1, Math.cos(a) * 0.13],
      ],
      0.03,
      0.015,
      clayDark,
    );
    return l;
  });
  const embers = [0, 1, 2].map(() => part(body, sphere(0.02, 5, 4), lit(0xffb040), [0, 0, 0]));
  return {
    group: g,
    shadow: 0.65,
    parts: { lid, peek, inside },
    idle: (t) => {
      const k = (t * 0.45) % 1,
        open = Math.min(1, Math.max(0, Math.sin(k * Math.PI * 2) * 1.6));
      lid.rotation.x = -open * 0.8;
      peek.position.y = 0.42 + open * 0.085;
      peek.rotation.y = Math.sin(t * 3) * 0.3 * open;
      body.position.y = Math.abs(Math.sin(t * 8)) * 0.01;
      legs.forEach((l, i) => {
        l.rotation.z = Math.sin(t * 8 + i * 1.6) * 0.1;
      });
      inside.material.opacity = 0.25 + open * 0.5;
      embers.forEach((e, i) => {
        const q = (t * 0.9 + i / 3) % 1;
        e.visible = open > 0.2;
        e.position.set(Math.sin(i * 2.1 + q * 4) * 0.08, 0.5 + q * 0.4, Math.cos(i * 2.1) * 0.06);
        e.scale.setScalar(1 - q * 0.6);
      });
    },
  };
}

/** The Gloom Weaver (was the Crypt Spider; hangs on its thread, drops, spits webs): a spider with a horned, hooded carapace
    and a crown of violet eyes, a rune burning on its abdomen, barbed legs. */
export function gloomWeaver(): Built {
  const g = new THREE.Group(),
    shell = gloss(0x1c1624, 0.45, 0.25),
    plate = gloss(0x2e2238, 0.35, 0.3),
    hair = std(0x281f30, { roughness: 1 }),
    band = std(0x4a2e5e),
    fang = gloss(0x40181c, 0.3, 0.3),
    barb = gloss(0x5a4a6a, 0.4, 0.2);
  const body = joint(g, [0, 0, 0]);
  part(body, rough(sphere(0.2, 10, 8), 0.02, 1), shell, [0, 0.34, 0.12], { scale: [1, 0.6, 1.15] });
  // the hooded carapace over the head, swept back into two horns
  part(body, sphere(0.15, 10, 6), plate, [0, 0.42, 0.2], { scale: [1.15, 0.55, 1] });
  for (const s of [-1, 1])
    tube(
      body,
      [
        [0.08 * s, 0.46, 0.16],
        [0.16 * s, 0.58, 0.08],
        [0.2 * s, 0.66, -0.06],
        [0.18 * s, 0.7, -0.14],
      ],
      0.03,
      0.006,
      plate,
      10,
      5,
    );
  const abdomen = joint(body, [0, 0.4, -0.14], [0.15, 0, 0]);
  part(abdomen, rough(sphere(0.3, 12, 10), 0.035, 2), hair, [0, 0.06, -0.24], { scale: [1, 0.85, 1.22] });
  for (let i = 0; i < 4; i++)
    part(abdomen, sphere(0.22 - i * 0.03, 10, 4), plate, [0, 0.2 - i * 0.02, -0.1 - i * 0.12], {
      scale: [1, 0.25, 0.55],
    }); // (chitin plates down its back)
  rune(abdomen, U, [0, 0.33, -0.26], 0.16, [-Math.PI / 2 + 0.3, 0, 0]);
  const runeGlow = glow(U, 0.7, 0.45);
  runeGlow.position.set(0, 0.36, -0.26);
  abdomen.add(runeGlow);
  for (let i = 0; i < 6; i++)
    spike(
      abdomen,
      [Math.cos(i * 1.05) * 0.2, 0.12, -0.24 + Math.sin(i * 1.05) * 0.22],
      [Math.cos(i * 1.05) * 0.28, 0.22, -0.24 + Math.sin(i * 1.05) * 0.3],
      0.016,
      barb,
    );
  const legs = [
    [0.26, [0.36, 0.64, 0.5], [0.52, 0, 0.84]],
    [0.16, [0.48, 0.66, 0.26], [0.82, 0, 0.4]],
    [0.06, [0.48, 0.62, -0.04], [0.82, 0, -0.14]],
    [-0.04, [0.4, 0.6, -0.32], [0.62, 0, -0.62]],
  ] as const;
  const legGroups = [-1, 1].flatMap((s) =>
    legs.map(([hz, knee, foot]) => {
      const hip: V3 = [0.14 * s, 0.32, hz],
        k: V3 = [knee[0] * s, knee[1], knee[2]],
        f: V3 = [foot[0] * s, foot[1], foot[2]];
      const ankle: V3 = [k[0] + (f[0] - k[0]) * 0.55, k[1] * 0.55, k[2] + (f[2] - k[2]) * 0.55];
      const l = joint(body, hip);
      jointed(l, [[0, 0, 0], sub(k, hip), sub(ankle, hip), sub(f, hip)], 0.042, 0.012, hair, band);
      spike(l, sub(k, hip), [k[0] - hip[0], k[1] - hip[1] + 0.09, k[2] - hip[2] - 0.02], 0.016, barb); // (a barb at the knee)
      return l;
    }),
  );
  for (const s of [-1, 1]) spike(body, [0.05 * s, 0.27, 0.32], [0.035 * s, 0.08, 0.42], 0.04, fang);
  const eyes = joint(body, [0, 0.46, 0.29]); // (they blink as one, so they draw as one)
  beads(
    eyes,
    (
      [
        [-0.05, 0.45, 0.31],
        [0.05, 0.45, 0.31],
        [-0.1, 0.44, 0.29],
        [0.1, 0.44, 0.29],
        [-0.03, 0.49, 0.29],
        [0.03, 0.49, 0.29],
        [-0.14, 0.46, 0.25],
        [0.14, 0.46, 0.25],
      ] as V3[]
    ).map(([x, y, z]): V3 => [x, y - 0.46, z - 0.29]),
    0.02,
    0xc58aff,
  );
  return {
    group: g,
    shadow: 1.2,
    parts: { body, abdomen },
    idle: (t) => {
      body.position.y = Math.sin(t * 2.2) * 0.012;
      abdomen.scale.setScalar(1 + Math.sin(t * 1.6) * 0.03);
      runeGlow.material.opacity = 0.3 + Math.sin(t * 2) * 0.15;
      legGroups.forEach((l, i) => {
        const ph = (i + (i >= 4 ? 1 : 0)) % 2;
        l.rotation.x = Math.max(0, Math.sin(t * 3 + ph * Math.PI)) * -0.06;
      });
      const k = t % 4.2;
      eyes.scale.setScalar(k < 0.1 ? 0.4 : 1);
    },
  };
}

/** The Quill Kraken (was the Ink Octopus; smears ink, splits in two): an ink-black kraken with a hooked beak and a ring of
    small eyes, its arms ending in quill nibs, violet runes under its skin. */
export function quillKraken(): Built {
  const g = new THREE.Group(),
    ink = gloss(0x1e1430, 0.2, 0.15),
    inner = gloss(0x3a2458, 0.25, 0.1),
    nib = gloss(0xe8dcc8, 0.3, 0.2),
    beakM = gloss(0x14100c, 0.3, 0.3),
    spark = lit(0xb98cff);
  const pulse = glow(0xb98cff, 0.9, 0.3);
  pulse.position.set(0, 0.64, -0.1);
  g.add(pulse); // (the runes' pulse, a glow over them)
  part(g, new THREE.CircleGeometry(0.62, 16), gloss(0x0a0710, 0.08, 0.5), [0, 0.006, 0.02], {
    rot: [-Math.PI / 2, 0, 0],
    scale: [1, 0.8, 1],
  });
  const body = joint(g, [0, 0, 0]);
  const mantle = joint(body, [0, 0.52, -0.1], [-0.38, 0, 0]);
  part(mantle, sphere(0.28, 12, 10), ink, [0, 0.12, 0], { scale: [1, 1.3, 1.05] });
  for (const s of [-1, 1])
    part(mantle, sphere(0.16, 8, 4), inner, [0.2 * s, 0.26, -0.02], { scale: [0.4, 1, 0.7], rot: [0, 0, 0.5 * s] }); // (fins)
  for (let i = 0; i < 9; i++)
    rune(
      mantle,
      0xb98cff,
      [Math.sin(i * 2.1) * 0.26, 0.05 + (i % 3) * 0.12, Math.cos(i * 2.1) * 0.23],
      0.05,
      [0, i * 2.1, 0],
      spark,
    );
  // a ring of small eyes round its brow, and a hooked beak under them
  beads(
    body,
    Array.from({ length: 7 }, (_, i) => {
      const a = (i / 6 - 0.5) * 2;
      return [Math.sin(a) * 0.2, 0.55 + Math.cos(a * 1.5) * 0.02, 0.17 + Math.cos(a) * 0.04] as V3;
    }),
    0.022,
    0xe0c0ff,
  );
  for (const s of [-1, 1]) spike(body, [0, 0.4 + s * 0.02, 0.2], [0, 0.4 - s * 0.06, 0.3], 0.035, beakM);
  part(body, sphere(0.09, 8, 6), inner, [0, 0.4, 0.16], { scale: [1.3, 0.7, 0.7] });
  // eight arms, the front two raised, each ending in a quill's nib
  const sets = [joint(body, [0, 0, 0]), joint(body, [0, 0, 0])]; // (the arms sway in two sets, so they draw as four meshes, not sixteen)
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2,
      c = Math.sin(a),
      s = Math.cos(a),
      front = s > 0.7;
    const arm = sets[i % 2];
    const pts: V3[] = front
      ? [
          [c * 0.1, 0.34, s * 0.12],
          [c * 0.32, 0.3, s * 0.4],
          [c * 0.44, 0.5, s * 0.62],
          [c * 0.4, 0.72, s * 0.66],
          [c * 0.3, 0.8, s * 0.56],
        ]
      : [
          [c * 0.12, 0.34, s * 0.1],
          [c * 0.42, 0.1, s * 0.4],
          [c * 0.68, 0.03, s * 0.66],
          [c * 0.84, 0.12, s * 0.8],
          [c * 0.82, 0.2, s * 0.76],
        ];
    tube(arm, pts, 0.08, 0.016, i % 2 ? ink : inner, 14, 6);
    const end = pts[pts.length - 1],
      before = pts[pts.length - 2];
    spike(
      arm,
      end,
      [end[0] + (end[0] - before[0]) * 1.4, end[1] + (end[1] - before[1]) * 1.4, end[2] + (end[2] - before[2]) * 1.4],
      0.02,
      nib,
    );
  }
  return {
    group: g,
    shadow: 1.1,
    parts: { body, mantle },
    idle: (t) => {
      mantle.scale.set(1 + Math.sin(t * 1.8) * 0.04, 1 - Math.sin(t * 1.8) * 0.05, 1);
      sets.forEach((a, i) => {
        a.rotation.y = Math.sin(t * 1.3 + i * 2.6) * 0.07;
        a.rotation.x = Math.sin(t * 1.7 + i * 2) * 0.03;
      });
      pulse.material.opacity = 0.18 + 0.14 * Math.sin(t * 2.5);
    },
  };
}

/** A Lampwyrm (one of the swarm of seven, was a lantern beetle): a finger-long winged wyrm, its throat glowing like a
    lantern. */
export function lampwyrm(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0.75, 0]),
    scale = gloss(0x3a2a18, 0.35, 0.3),
    belly = std(0x8a6a3a),
    wingM = thin(0xfff0c8, { transparent: true, opacity: 0.55, roughness: 0.3 }),
    throat = lit(H);
  const wyrm = joint(body, [0, 0, 0]);
  wyrm.scale.setScalar(1.7);
  tube(
    wyrm,
    [
      [0, 0, 0.1],
      [0, 0.01, 0.04],
      [0.015, 0, -0.04],
      [-0.01, -0.01, -0.1],
      [0.01, 0, -0.16],
    ],
    0.022,
    0.004,
    scale,
    12,
    5,
  );
  part(wyrm, sphere(0.03, 8, 6), scale, [0, 0.01, 0.12], { scale: [1, 0.8, 1.3] });
  for (const s of [-1, 1]) spike(wyrm, [0.012 * s, 0.025, 0.12], [0.03 * s, 0.05, 0.08], 0.006, belly); // (two small horns)
  beads(
    wyrm,
    [
      [-0.016, 0.02, 0.145],
      [0.016, 0.02, 0.145],
    ],
    0.005,
    0xfff3c4,
  );
  part(wyrm, sphere(0.024, 8, 6), throat, [0, -0.012, 0.08], { scale: [1, 0.9, 1.3] }); // (the lantern throat)
  const wings = [-1, 1].map((s) =>
    part(wyrm, sphere(0.055, 6, 4), wingM, [0.05 * s, 0.02, 0.02], { rot: [0, 0.3 * s, 0], scale: [1.3, 0.08, 0.6] }),
  );
  const gl = glow(H, 0.6, 0.7);
  gl.position.set(0, -0.02, 0.14);
  body.add(gl);
  return {
    group: g,
    shadow: 0.35,
    parts: { body },
    idle: (t) => {
      body.position.y = 0.75 + Math.sin(t * 3.1) * 0.06;
      for (const w of wings) w.rotation.z = Math.sin(t * 38) * 0.55;
      wyrm.rotation.y = Math.sin(t * 2.2) * 0.2;
      gl.material.opacity = 0.45 + 0.3 * Math.max(0, Math.sin(t * 2.4));
    },
  };
}

/** The swarm of seven Lampwyrms, as the Galleries tab stands it (the foe is one wyrm; `pack` in the data makes seven). */
export function lampwyrmSwarm(): Built {
  const g = new THREE.Group(),
    halo = glow(H, 1.8, 0.22);
  halo.position.y = 0.75;
  g.add(halo);
  const wyrms = Array.from({ length: 7 }, (_, i) => {
    const w = lampwyrm();
    g.add(w.group);
    return { w, i };
  });
  return {
    group: g,
    shadow: 1,
    idle: (t) => {
      halo.material.opacity = 0.14 + 0.1 * Math.sin(t * 2);
      for (const { w, i } of wyrms) {
        const a = t * (0.7 + (i % 3) * 0.18) + i * 2.4,
          r = 0.25 + (i % 3) * 0.16;
        w.idle(t + i * 0.7);
        w.group.position.set(Math.cos(a) * r, Math.sin(t * 1.4 + i * 1.7) * 0.22, Math.sin(a) * r * 0.8);
        w.group.rotation.y = -a;
      }
    },
  };
}

/** The Caladrius (was the Choir Lark; perches and sings the foes round it on): the white bird of the old bestiaries, a crest
    of feathers like a halo, a blade of a beak, long tail plumes. */
export function caladrius(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0.95, 0]),
    white = std(0xf2eee4),
    pale = std(0xd8d0bc),
    gold = std(0xd9b866),
    beak = gloss(0xc8a850, 0.3, 0.4),
    ray = lit(H);
  part(body, sphere(0.17, 10, 8), white, [0, 0, 0], { scale: [0.95, 0.85, 1.6] });
  part(body, sphere(0.14, 8, 6), pale, [0, -0.04, 0.1], { scale: [0.9, 0.85, 1.2] });
  const head = joint(body, [0, 0.12, 0.27]);
  part(head, sphere(0.1, 10, 8), white, [0, 0, 0], { scale: [0.9, 0.95, 1.1] });
  slitEyes(head, 0.055, 0.02, 0.07, 0.02, H, 0.5, 0.2);
  const upper = joint(head, [0, -0.01, 0.09]);
  spike(upper, [0, 0, 0], [0, -0.04, 0.24], 0.03, beak); // (a long blade of a beak)
  const lower = joint(head, [0, -0.035, 0.08], [0.3, 0, 0]);
  spike(lower, [0, 0, 0], [0, -0.02, 0.15], 0.024, beak);
  // the crest: a fan of white plumes behind the head with a ring of light, like a halo
  const crest = joint(head, [0, 0.06, -0.04]);
  for (let i = 0; i < 9; i++) {
    const a = (i - 4) * 0.28;
    spike(crest, [0, 0, 0], [Math.sin(a) * 0.18, 0.14 + Math.cos(a) * 0.1, -0.1], 0.018, i % 2 ? white : gold);
  }
  part(crest, new THREE.TorusGeometry(0.17, 0.008, 4, 24), ray, [0, 0.14, -0.08], { rot: [-0.3, 0, 0] });
  const wings = ([-1, 1] as const).map((s) => featherWing(body, s, [0.1 * s, 0.06, 0.02], 0.66, white, gold, 9, 0.5));
  const tail = joint(body, [0, 0.02, -0.24]);
  for (const [x, len, r] of [
    [0, 0.8, 0],
    [-0.06, 0.66, 0.2],
    [0.06, 0.66, -0.2],
    [-0.1, 0.5, 0.38],
    [0.1, 0.5, -0.38],
  ] as V3[]) {
    part(tail, new THREE.ConeGeometry(0.045, len, 4), white, [x, 0, -len * 0.48], {
      rot: [-Math.PI / 2, 0, r],
      scale: [1, 1, 0.2],
    });
    part(tail, sphere(0.03, 6, 4), gold, [x - Math.sin(-r) * len * 0.05, 0.005, -len * 0.96], { scale: [1, 0.3, 1.4] });
  }
  for (const s of [-1, 1])
    for (let k = -1; k <= 1; k++) spike(body, [0.05 * s, -0.12, 0.02], [0.06 * s + k * 0.03, -0.22, 0.08], 0.01, beak);
  const notes = [0, 1, 2].map(() =>
    part(g, new THREE.TorusGeometry(0.12, 0.012, 4, 18), shine(H, 0.8), [0, 1.05, 0.45]),
  );
  return {
    group: g,
    shadow: 0.9,
    parts: { body, head },
    idle: (t) => {
      const f = Math.sin(t * 6.5);
      wings[0].rotation.z = -f * 0.5;
      wings[1].rotation.z = f * 0.5;
      body.position.y = 0.95 + Math.sin(t * 6.5 + 1) * 0.03;
      tail.rotation.x = Math.sin(t * 2) * 0.08;
      lower.rotation.x = 0.3 + Math.max(0, Math.sin(t * 6)) * 0.25;
      crest.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
      notes.forEach((n, i) => {
        const k = (t * 0.8 + i / 3) % 1;
        n.position.set(0, body.position.y + 0.1, 0.5 + k * 0.7);
        n.scale.setScalar(0.5 + k * 1.6);
        (n.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
      });
    },
  };
}

/** The Mantis Knight (was the Storm Mantis; parries the cantrip, lunges): as tall as the mage, its carapace grown into plate
    like a harness, a crested helm of a head, two scythes of storm crystal raised to parry, a tattered mantle of wings. */
export function mantisKnight(): Built {
  const g = new THREE.Group(),
    plate = gloss(0x3a4a5e, 0.3, 0.55),
    plateDark = gloss(0x232c3a, 0.35, 0.5),
    trim = gloss(0xb89a4a, 0.3, 0.6),
    mantleM = thin(0x2a2236, { roughness: 0.9 }),
    edge = lit(S),
    crystalM = shine(S, 0.85);
  const body = joint(g, [0, 0, 0]);
  body.scale.setScalar(1.22);
  // the abdomen behind, banded like a cuirass; the tattered mantle of wings over it
  tube(
    body,
    [
      [0, 0.52, 0.02],
      [0, 0.48, -0.2],
      [0, 0.4, -0.45],
      [0, 0.34, -0.62],
    ],
    0.13,
    0.06,
    plateDark,
    10,
    7,
  );
  for (let i = 0; i < 4; i++)
    part(body, new THREE.TorusGeometry(0.12 - i * 0.016, 0.014, 4, 10), trim, [0, 0.5 - i * 0.05, -0.12 - i * 0.15], {
      rot: [Math.PI / 2 - 0.35, 0, 0],
    });
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape(
      [
        [0, 0],
        [0.16 * s, -0.06],
        [0.2 * s, -0.4],
        [0.12 * s, -0.36],
        [0.14 * s, -0.6],
        [0.06 * s, -0.52],
        [0.04 * s, -0.7],
        [0, -0.62],
      ].map(([x, z]) => new THREE.Vector2(x, z)),
    );
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mantleM);
    m.position.set(0.02 * s, 0.6, -0.04);
    m.rotation.x = 0.25;
    body.add(m); // (torn at the hem)
  }
  const chest = joint(body, [0, 0.5, 0.02], [-0.25, 0, 0]);
  tube(
    chest,
    [
      [0, 0, 0],
      [0, 0.25, 0.04],
      [0, 0.45, 0.03],
    ],
    0.085,
    0.055,
    plate,
    6,
    6,
  );
  part(chest, new THREE.BoxGeometry(0.18, 0.14, 0.1), plate, [0, 0.3, 0.05]);
  part(chest, new THREE.BoxGeometry(0.19, 0.02, 0.11), trim, [0, 0.37, 0.05]); // (the breastplate)
  for (const s of [-1, 1]) part(chest, sphere(0.06, 6, 4), plateDark, [0.1 * s, 0.4, 0.03], { scale: [1.2, 0.7, 1] }); // (pauldrons)
  // the helm: a narrow wedge with a crest fin, a slit glowing across the visor
  const head = joint(chest, [0, 0.52, 0.04]);
  part(head, new THREE.OctahedronGeometry(0.1, 0), plate, [0, 0, 0.03], { scale: [1.2, 1.1, 1] });
  part(head, new THREE.BoxGeometry(0.012, 0.14, 0.16), trim, [0, 0.09, -0.01]); // (the crest)
  part(head, new THREE.BoxGeometry(0.13, 0.016, 0.02), edge, [0, 0.01, 0.11]); // (the visor's slit)
  for (const s of [-1, 1])
    tube(
      head,
      [
        [0.04 * s, 0.07, 0.04],
        [0.08 * s, 0.2, 0],
        [0.14 * s, 0.3, -0.08],
      ],
      0.007,
      0.003,
      plateDark,
      6,
      3,
    );
  // the raptorial forelegs, armoured, ending in scythes of storm crystal
  const arms = ([-1, 1] as const).map((s) => {
    const a = joint(chest, [0.08 * s, 0.36, 0.06], [0, 0, -0.35 * s]);
    jointed(
      a,
      [
        [0, 0, 0],
        [0.05 * s, -0.1, 0.14],
        [0.09 * s, 0.2, 0.32],
      ],
      0.045,
      0.035,
      plate,
      trim,
    );
    const blade = joint(a, [0.09 * s, 0.2, 0.32], [2.5, 0, 0]);
    part(blade, new THREE.ConeGeometry(0.05, 0.52, 4), crystalM, [0, 0.26, 0], { scale: [1, 1, 0.3] });
    part(blade, new THREE.BoxGeometry(0.012, 0.48, 0.012), edge, [0, 0.24, 0.02]);
    return { a, blade };
  });
  const spark = glow(S, 0.5, 0.6);
  spark.position.set(0, 0.2, 0.38);
  chest.add(spark);
  for (const s of [-1, 1])
    for (const [hz, kz, fz] of [
      [0, 0.18, 0.28],
      [-0.12, -0.3, -0.5],
    ])
      jointed(
        body,
        [
          [0.05 * s, 0.48, hz],
          [0.3 * s, 0.52, kz],
          [0.42 * s, 0, fz],
        ],
        0.028,
        0.014,
        plate,
        trim,
      );
  return {
    group: g,
    shadow: 1,
    parts: { chest, head },
    idle: (t) => {
      chest.rotation.z = Math.sin(t * 1.1) * 0.05;
      chest.rotation.x = -0.25 + Math.sin(t * 1.1 + 1) * 0.03;
      head.rotation.y = Math.sin(t * 0.7) * 0.3;
      arms.forEach(({ a, blade }, i) => {
        a.rotation.x = Math.sin(t * 1.6 + i) * 0.05;
        blade.rotation.x = 2.5 + Math.sin(t * 2.3 + i * 2) * 0.08;
      });
      spark.material.opacity = Math.floor(t * 11) % 3 === 0 ? 0.85 : 0.2;
    },
  };
}

/** The Helm Hermit (was the Rubble Crab; hidden as rubble, a blast flips it): a hermit beast living in the broken stone head
    of a Warden's statue, claws of slate (`big`, `small`) with a spark between them, eyes on stalks. */
export function helmHermit(): Built {
  const g = new THREE.Group(),
    stone = std(0x7e786e, { roughness: 0.9 }),
    stoneDark = std(0x5e5850, { roughness: 0.9 }),
    slate = gloss(0x3a4048, 0.45, 0.3),
    flesh = std(0x6a5a64),
    tipM = gloss(0x1e2228, 0.35, 0.3);
  const body = joint(g, [0, 0, 0]);
  // the stone head it lives in, lying on its side: a helm with a crest, a brow, a crack across it
  const helm = joint(body, [0, 0.32, -0.08], [0, 0, -Math.PI / 2 + 0.25]);
  part(helm, rough(sphere(0.34, 12, 9), 0.02, 5), stone, [0, 0, 0], { scale: [1, 1.05, 1.05] });
  part(helm, rough(new THREE.BoxGeometry(0.52, 0.07, 0.12), 0.01, 6), stoneDark, [0, 0.09, 0.34]); // (the brow)
  for (const s of [-1, 1]) part(helm, new THREE.BoxGeometry(0.12, 0.035, 0.03), lit(S), [0.12 * s, 0.02, 0.365]); // (its eye holes, lit by what lives inside)
  part(helm, new THREE.BoxGeometry(0.07, 0.24, 0.1), stoneDark, [0, -0.1, 0.36]); // (the nose guard)
  for (const s of [-1, 1])
    part(helm, rough(new THREE.BoxGeometry(0.16, 0.26, 0.06), 0.01, 7 + s), stoneDark, [0.24 * s, -0.12, 0.26], {
      rot: [0, 0.5 * s, 0],
    }); // (cheek guards)
  part(helm, rough(new THREE.BoxGeometry(0.06, 0.5, 0.1), 0.015, 8), stoneDark, [0, 0.3, 0], { rot: [0, 0, 0] }); // (the crest along its top)
  part(helm, new THREE.BoxGeometry(0.012, 0.3, 0.012), std(0x2a2620), [0.12, 0.1, 0.3], { rot: [0.4, 0, 0.5] }); // (a crack)
  for (const [x, z, r] of [
    [0.24, 0.2, 0.07],
    [-0.2, -0.2, 0.06],
    [0.1, -0.28, 0.05],
  ] as V3[])
    part(body, rough(new THREE.DodecahedronGeometry(r, 0), r * 0.2, x * 9), stoneDark, [x, 0.08, z]);
  // the soft body coming out of the helm's neck, eyes on stalks
  part(body, sphere(0.16, 8, 6), flesh, [0, 0.22, 0.24], { scale: [1.3, 0.6, 1] });
  const stalks = [-1, 1].map((s) => {
    const e = joint(body, [0.08 * s, 0.3, 0.3]);
    limb(e, [0, 0, 0], [0.03 * s, 0.16, 0.04], 0.018, flesh);
    beads(e, [[0.03 * s, 0.18, 0.05]], 0.028, S);
    return e;
  });
  const big = pincer(body, [0.36, 0.26, 0.36], 0.62, slate, tipM, [0, -0.35, 0]);
  const small = pincer(body, [-0.3, 0.24, 0.38], 0.34, slate, tipM, [0, 0.3, 0]);
  jointed(
    body,
    [
      [0.2, 0.24, 0.26],
      [0.34, 0.26, 0.34],
    ],
    0.06,
    0.05,
    slate,
  );
  jointed(
    body,
    [
      [-0.2, 0.22, 0.26],
      [-0.3, 0.24, 0.36],
    ],
    0.05,
    0.04,
    slate,
  );
  const legs = [-1, 1].flatMap((s) =>
    [0.18, 0.04].map((z) => {
      const l = joint(body, [0.22 * s, 0.2, z]);
      jointed(
        l,
        [
          [0, 0, 0],
          [0.22 * s, 0.14, z * 0.3],
          [0.38 * s, -0.12, z * 0.6],
        ],
        0.04,
        0.02,
        slate,
      );
      spike(l, [0.38 * s, -0.12, z * 0.6], [0.42 * s, -0.2, z * 0.7], 0.018, tipM);
      return l;
    }),
  );
  const spark = glow(S, 0.55, 0.6);
  spark.position.set(0, 0.3, 0.7);
  body.add(spark);
  return {
    group: g,
    shadow: 1.4,
    parts: { body, big: big.claw, small: small.claw },
    idle: (t) => {
      body.position.x = Math.sin(t * 1.4) * 0.03;
      body.position.y = Math.abs(Math.sin(t * 2.8)) * 0.008;
      big.finger.rotation.x = -Math.max(0, Math.sin(t * 2)) * 0.4;
      small.finger.rotation.x = -Math.max(0, Math.sin(t * 2.6 + 1)) * 0.4;
      stalks.forEach((e, i) => {
        e.rotation.z = Math.sin(t * 1.9 + i * 2) * 0.15;
      });
      legs.forEach((l, i) => {
        l.rotation.z = Math.sin(t * 2.8 + i * 1.3) * 0.06;
      });
      spark.material.opacity = Math.floor(t * 9) % 4 === 0 ? 0.9 : 0.15;
    },
  };
}

/** Floor 1's new looks, by the look id each replaces. */
export const FLOOR1_LOOKS: Record<string, () => Built> = {
  sporeling: sporeFiend,
  vesperMoth: seraphMoth,
  runeBeetle: runehorn,
  urnMimic: urnMimicFierce,
  cryptSpider: gloomWeaver,
  inkOctopus: quillKraken,
  fireflyBeetle: lampwyrm,
  choirLark: caladrius,
  stormMantis: mantisKnight,
  rubbleCrab: helmHermit,
};
