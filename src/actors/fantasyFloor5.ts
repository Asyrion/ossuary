/* Floor 5's seven foes as creatures of fantasy (docs/archive/M4.12-plan.md), by the rules of fantasyFloor1.ts:
   each keeps its fight, the parts its behaviour moves (by name) and about its height; each faces +Z,
   stands on y = 0 and idles; no round googly eyes; the school in the body. Small repeated parts that move move together,
   so each look draws in few calls. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, crystal, limb, lit, part, runeRing, sphere, std, type V3 } from '../render/arcane';
import { rough } from '../world/kitParts';
import { beads, featherWing, gloss, joint, slitEyes, spike, thin, tube, type Built } from './beastParts';

const { frost: F, storm: S, umbral: U } = SCHOOL_LIGHT;

/** A crackle of lightning from `a` to `b` in `n` straight strokes, each bend thrown `jag` aside (one joint, to flicker). */
function zigzag(parent: THREE.Object3D, a: V3, b: V3, n: number, jag: number, mat: THREE.Material, r = 0.01) {
  const g = joint(parent, [0, 0, 0]);
  const pts: V3[] = Array.from({ length: n + 1 }, (_, i) => {
    const k = i / n,
      off = i && i < n ? jag * (i % 2 ? 1 : -1) : 0;
    return [a[0] + (b[0] - a[0]) * k + off, a[1] + (b[1] - a[1]) * k + off * 0.5, a[2] + (b[2] - a[2]) * k];
  });
  for (let i = 0; i < n; i++) limb(g, pts[i], pts[i + 1], r, mat);
  return g;
}

/** The Mandrake (for the Rootling; a mound under the floor that bursts up under the mage): a gnarled root beast of black
    bark, root legs splayed and root arms flung up, its bark face split by a screaming mouth with violet light in its
    throat, slit eyes sunk deep, a crown of dark leaves veined with violet. */
export function mandrake(): Built {
  const g = new THREE.Group(),
    bark = std(0x3a2a20, { roughness: 1 }),
    barkDark = std(0x241a14, { roughness: 1 }),
    leafM = std(0x24402a),
    vein = lit(U),
    soil = std(0x2a2420);
  const body = joint(g, [0, 0, 0]);
  part(body, rough(new THREE.SphereGeometry(0.2, 10, 8), 0.035, 4), bark, [0, 0.3, 0], { scale: [1, 1.25, 0.95] }); // (the gnarled tuber of its body)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    tube(
      body,
      [
        [Math.cos(a) * 0.12, 0.2, Math.sin(a) * 0.12],
        [Math.cos(a) * 0.2, 0.1, Math.sin(a) * 0.2],
        [Math.cos(a + 0.3) * 0.3, 0, Math.sin(a + 0.3) * 0.3],
      ],
      0.045,
      0.01,
      barkDark,
      6,
      5,
    );
  } // (root legs)
  // the face, tipped back to the camera: a screaming mouth with violet light in its throat, slit eyes sunk under a brow
  const face = joint(body, [0, 0.36, 0.17], [-0.5, 0, 0]);
  part(face, new THREE.CircleGeometry(0.075, 12), lit(0x0c0610), [0, -0.03, 0.02], { scale: [0.8, 1.25, 1] });
  part(face, new THREE.CircleGeometry(0.035, 10), vein, [0, -0.035, 0.025], { scale: [0.8, 1.2, 1] });
  part(face, new THREE.TorusGeometry(0.075, 0.02, 4, 12), barkDark, [0, -0.03, 0.02], { scale: [0.8, 1.25, 1] });
  part(face, new THREE.BoxGeometry(0.2, 0.03, 0.05), barkDark, [0, 0.07, 0.02]);
  slitEyes(face, 0.055, 0.05, 0.04, 0.028, U, 0.5, 0.45);
  const scream = glow(U, 0.4, 0.5);
  scream.position.set(0, -0.03, 0.06);
  face.add(scream);
  // root arms flung up and out, twigs for fingers
  const arms = joint(body, [0, 0.38, 0]);
  for (const s of [-1, 1]) {
    tube(
      arms,
      [
        [0.14 * s, 0, 0],
        [0.26 * s, 0.12, 0.02],
        [0.32 * s, 0.3, -0.02],
        [0.3 * s, 0.42, 0.02],
      ],
      0.04,
      0.015,
      bark,
      8,
      5,
    );
    for (const k of [-1, 0, 1])
      spike(arms, [0.3 * s, 0.42, 0.02], [(0.3 + k * 0.05) * s, 0.52, 0.02 + k * 0.04], 0.01, barkDark);
  }
  // a crown of dark leaves with violet veins
  const sprout = joint(body, [0, 0.54, -0.02]);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    part(sprout, sphere(0.08, 8, 5), leafM, [Math.cos(a) * 0.07, 0.06, Math.sin(a) * 0.07], {
      scale: [0.4, 0.2, 1.3],
      rot: [0.6 * Math.sin(a), -a + Math.PI / 2, 0.6 * Math.cos(a)],
    });
    limb(sprout, [0, 0.02, 0], [Math.cos(a) * 0.12, 0.09, Math.sin(a) * 0.12], 0.006, vein);
  }
  // the mound it hides under, shown by its fight
  const mound = joint(g, [0, 0, 0]);
  part(mound, rough(sphere(0.3, 10, 6), 0.02, 3), soil, [0, 0, 0], { scale: [1, 0.28, 1] });
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3;
    part(mound, sphere(0.07, 6, 4), soil, [Math.cos(a) * 0.24, 0.03, Math.sin(a) * 0.24], { scale: [1, 0.5, 1] });
  }
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6 + 0.4;
    part(mound, sphere(0.012, 4, 3), vein, [Math.cos(a) * 0.16, 0.07, Math.sin(a) * 0.16]);
  } // (violet glints in the soil)
  mound.visible = false;
  return {
    group: g,
    shadow: 0.55,
    parts: { body, mound },
    idle: (t) => {
      body.position.y = Math.abs(Math.sin(t * 6)) * 0.025;
      sprout.rotation.z = Math.sin(t * 2.2) * 0.12;
      arms.rotation.z = Math.sin(t * 3) * 0.06;
      scream.material.opacity = 0.35 + Math.sin(t * 5) * 0.15;
    },
  };
}

/** The Sky Ray (for the Storm Ray; glides, laying sparks): a ray that swims the air, slate-dark, its head lobes curled
    forward like horns, sparks along the edges of its wings and a long barbed tail crackling. */
export function skyRay(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 1.05, 0]),
    skin = gloss(0x1e2a3a, 0.4, 0.2),
    under = std(0x3a4a5e),
    horn = std(0xb8c4d0),
    edge = lit(S),
    bolt = lit(0xf4f0a0);
  part(body, sphere(0.2, 12, 8), skin, [0, 0, 0], { scale: [1, 0.4, 1.2] });
  part(body, sphere(0.16, 10, 6), under, [0, -0.04, 0.02], { scale: [1, 0.3, 1] });
  slitEyes(body, 0.08, 0.06, 0.16, 0.03, S, 0.5, 0.3);
  for (const s of [-1, 1])
    tube(
      body,
      [
        [0.08 * s, 0, 0.2],
        [0.13 * s, 0.02, 0.32],
        [0.1 * s, 0.06, 0.4],
        [0.05 * s, 0.07, 0.38],
      ],
      0.035,
      0.008,
      horn,
      8,
      4,
    ); // (head lobes curled forward)
  const wing = (s: number) => {
    const w = joint(body, [0.16 * s, 0, 0]);
    const shape = new THREE.Shape(
      [
        [0, 0.16],
        [0.18, 0.12],
        [0.42, -0.02],
        [0.48, -0.08],
        [0.3, -0.12],
        [0.08, -0.2],
        [0, -0.18],
      ].map(([x, z]) => new THREE.Vector2(x * s, -z)),
    );
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    part(w, geo, thin(0x1e2a3a, { roughness: 0.5, metalness: 0.2 }), [0, 0.005, 0]);
    tube(
      w,
      [
        [0, 0.01, 0.16],
        [0.18 * s, 0.01, 0.12],
        [0.42 * s, 0.01, -0.02],
        [0.48 * s, 0.01, -0.08],
      ],
      0.012,
      0.006,
      edge,
      10,
      3,
    ); // (the leading edge, lit)
    for (let i = 0; i < 4; i++)
      part(w, new THREE.OctahedronGeometry(0.02), edge, [(0.12 + i * 0.1) * s, 0.02, 0.1 - i * 0.05]); // (sparks along it)
    return w;
  };
  const wings = [wing(-1), wing(1)];
  const tail = joint(body, [0, 0, -0.22]);
  tube(
    tail,
    [
      [0, 0, 0],
      [0, -0.01, -0.2],
      [0.02, -0.02, -0.4],
      [0, -0.02, -0.52],
    ],
    0.025,
    0.006,
    skin,
    8,
    4,
  );
  spike(tail, [0, -0.02, -0.5], [0, -0.02, -0.62], 0.02, horn);
  for (const s of [-1, 1]) spike(tail, [0, -0.02, -0.5], [0.04 * s, -0.02, -0.46], 0.01, horn); // (the barb)
  const crackle = zigzag(tail, [0, -0.01, -0.1], [0, -0.02, -0.56], 6, 0.025, bolt, 0.007);
  const spark = glow(S, 0.45, 0.6);
  spark.position.set(0, -0.02, -0.6);
  tail.add(spark);
  return {
    group: g,
    shadow: 0.65,
    idle: (t) => {
      wings.forEach((w, i) => {
        w.rotation.z = (i ? -1 : 1) * Math.sin(t * 3.2) * 0.35;
      });
      body.position.y = 1.05 + Math.sin(t * 1.6) * 0.06;
      tail.rotation.y = Math.sin(t * 2.4) * 0.3;
      const on = Math.floor(t * 9) % 3 !== 0;
      crackle.visible = on;
      spark.material.opacity = on ? 0.8 : 0.3;
    },
  };
}

/** The Void Maw (for the Void Mote; swallows the cantrip and spills it back): a floating sphere of dark, its mouth a ring
    of pale teeth round violet light, turned to the camera; three slits of eyes over it; a ring of violet turning about it. */
export function voidMaw(): Built {
  const g = new THREE.Group(),
    dark = std(0x0c0814, { roughness: 0.4 }),
    tooth = gloss(0xe0d8e8, 0.3, 0.2),
    maw = lit(U);
  const body = joint(g, [0, 0.9, 0]);
  part(body, rough(sphere(0.22, 14, 10), 0.01, 3), dark, [0, 0, 0]);
  const mouth = joint(body, [0, 0.02, 0.17], [-0.75, 0, 0]); // (turned up to the camera)
  part(mouth, new THREE.CircleGeometry(0.13, 16), lit(0x05030a), [0, 0, 0.005]);
  part(mouth, new THREE.CircleGeometry(0.06, 12), maw, [0, 0, 0.008]);
  const teeth = joint(mouth, [0, 0, 0.01]); // (they open and close as one)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    spike(
      teeth,
      [Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0],
      [Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0.03],
      0.018,
      tooth,
    );
  }
  const throat = glow(U, 0.5, 0.6);
  throat.position.set(0, 0, 0.04);
  mouth.add(throat);
  beads(
    body,
    [
      [-0.06, 0.14, 0.14],
      [0, 0.17, 0.12],
      [0.06, 0.14, 0.14],
    ],
    0.016,
    0xd7b0ff,
  );
  const ring = runeRing(body, U, 0.34, [0, 0, 0], 6, [1.2, 0, 0]);
  const core = glow(U, 1.1, 0.4);
  body.add(core);
  return {
    group: g,
    shadow: 0.45,
    parts: { body },
    idle: (t) => {
      ring.rotation.z = t * 2.2;
      body.position.y = 0.9 + Math.sin(t * 1.9) * 0.05;
      core.material.opacity = 0.3 + Math.sin(t * 4) * 0.1;
      teeth.scale.setScalar(0.9 + Math.max(0, Math.sin(t * 1.4)) * 0.2);
      throat.material.opacity = 0.45 + Math.sin(t * 3) * 0.15;
    },
  };
}

/** The Dragon Turtle (for the Lantern Tortoise, the elite: hides, spins off the walls, lies dizzy): a dragon's head and
    clawed legs under a dark shell ridged with spikes, an ice lantern burning in a little stone shrine on its back. */
export function dragonTurtle(): Built {
  const g = new THREE.Group(),
    shellM = gloss(0x24343a, 0.5, 0.2),
    plate = std(0x3a4c50),
    spikeM = std(0xcfc6b0),
    skin = gloss(0x3a4a48, 0.5, 0.15),
    stone = std(0x6a7074),
    horn = std(0xb8d8f0, { emissive: 0x204a6a }),
    ice = lit(F),
    body = joint(g, [0, 0, 0]);
  part(body, new THREE.SphereGeometry(0.52, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), shellM, [0, 0.16, 0], {
    scale: [1, 0.8, 1.1],
  });
  part(body, new THREE.CylinderGeometry(0.54, 0.54, 0.06, 16), plate, [0, 0.15, 0], { scale: [1, 1, 1.1] }); // (the shell's rim)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    spike(
      body,
      [Math.cos(a) * 0.52, 0.16, Math.sin(a) * 0.57],
      [Math.cos(a) * 0.64, 0.2, Math.sin(a) * 0.7],
      0.04,
      spikeM,
    );
  } // (spikes round the rim)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    const p: V3 = [Math.cos(a) * 0.3, 0.48, Math.sin(a) * 0.33];
    part(body, new THREE.CylinderGeometry(0.11, 0.12, 0.04, 6), plate, p, {
      rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5],
    });
    spike(body, p, [p[0] * 1.15, p[1] + 0.16, p[2] * 1.15], 0.035, spikeM);
  }
  // the dragon's head: a long snout, horns swept back, slit eyes, a jaw of teeth
  const head = joint(body, [0, 0.24, 0.6]);
  part(head, sphere(0.13, 10, 8), skin, [0, 0, 0], { scale: [1, 0.85, 1.1] });
  tube(
    head,
    [
      [0, -0.01, 0.06],
      [0, -0.03, 0.18],
      [0, -0.05, 0.28],
    ],
    0.09,
    0.055,
    skin,
    6,
    7,
  );
  part(head, new THREE.BoxGeometry(0.2, 0.03, 0.1), skin, [0, 0.07, 0.04]);
  slitEyes(head, 0.07, 0.05, 0.1, 0.03, F, 0.5, 0.35);
  for (const s of [-1, 1]) {
    tube(
      head,
      [
        [0.06 * s, 0.08, -0.02],
        [0.12 * s, 0.16, -0.12],
        [0.14 * s, 0.18, -0.26],
      ],
      0.03,
      0.006,
      horn,
      8,
      5,
    );
    for (const z of [0.16, 0.24]) spike(head, [0.04 * s, -0.08, z], [0.035 * s, -0.13, z + 0.01], 0.012, spikeM);
  }
  const legs = joint(body, [0, 0, 0]);
  for (const [x, z] of [
    [-0.36, 0.3],
    [0.36, 0.3],
    [-0.36, -0.3],
    [0.36, -0.3],
  ] as [number, number][]) {
    part(legs, sphere(0.11, 8, 6), skin, [x, 0.07, z], { scale: [1, 0.75, 1.1] });
    for (const k of [-1, 0, 1])
      spike(legs, [x * 1.05, 0.02, z + 0.08], [x * 1.05 + k * 0.04, 0, z + 0.17], 0.015, spikeM);
  }
  tube(
    body,
    [
      [0, 0.12, -0.55],
      [0.04, 0.08, -0.72],
      [-0.02, 0.06, -0.86],
    ],
    0.07,
    0.015,
    skin,
    8,
    5,
  ); // (a spiked tail)
  for (let i = 0; i < 3; i++)
    spike(body, [0, 0.16 - i * 0.02, -0.6 - i * 0.1], [0, 0.24 - i * 0.03, -0.62 - i * 0.1], 0.02, spikeM);
  // the shrine on its back: a stone arch over an ice lantern, burning pale
  const shrine = joint(body, [0, 0.5, -0.02]);
  for (const s of [-1, 1]) part(shrine, new THREE.BoxGeometry(0.05, 0.24, 0.05), stone, [0.11 * s, 0.12, 0]);
  part(shrine, new THREE.TorusGeometry(0.11, 0.028, 4, 10, Math.PI), stone, [0, 0.24, 0]);
  for (const [x, h, r] of [
    [0, 0.16, 0],
    [-0.04, 0.11, 0.4],
    [0.045, 0.1, -0.4],
  ] as [number, number, number][])
    crystal(shrine, F, [x, h / 2 + 0.01, 0], h, [0, 0, r], ice);
  const light = glow(F, 1, 0.6);
  light.position.y = 0.12;
  shrine.add(light);
  return {
    group: g,
    shadow: 1.05,
    parts: { head, legs, light },
    idle: (t) => {
      head.rotation.y = Math.sin(t * 0.8) * 0.2;
      head.rotation.z = 0;
      head.position.y = 0.24 + Math.sin(t * 1.3) * 0.015;
      light.material.opacity = 0.5 + Math.sin(t * 2.6) * 0.12;
    },
  };
}

/** The Gloom Raven (dims the sight; lights drive it off): a raven with wings wider than the mage is tall, black with a violet
    sheen, three slit eyes (the third in its brow), a crest of black spines raised, smoke trailing from its wing tips. */
export function gloomRavenFierce(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0.95, 0]),
    black = gloss(0x1a1628, 0.4, 0.25),
    sheen = gloss(0x3a2a68, 0.3, 0.3),
    beak = gloss(0x0e0c10, 0.3, 0.4),
    smokeM = std(0x0a0810, { transparent: true, opacity: 0.4, depthWrite: false }),
    edge = lit(0x8a5ad8);
  part(body, sphere(0.2, 10, 8), black, [0, 0, 0], { scale: [0.9, 0.85, 1.6] });
  part(body, sphere(0.15, 8, 6), sheen, [0, 0.06, 0.05], { scale: [1, 0.8, 1.3] });
  const head = joint(body, [0, 0.08, 0.32]);
  part(head, sphere(0.13, 10, 8), black, [0, 0, 0], { scale: [0.9, 0.95, 1.1] });
  tube(
    head,
    [
      [0, 0.02, 0.08],
      [0, 0.0, 0.22],
      [0, -0.05, 0.32],
    ],
    0.06,
    0.01,
    beak,
    6,
    6,
  );
  slitEyes(head, 0.065, 0.03, 0.08, 0.036, 0xd7b0ff, 0.8, 0.3);
  part(head, sphere(0.03, 8, 6), lit(0xd7b0ff), [0, 0.09, 0.07], { scale: [0.4, 1, 0.5] }); // (the third eye, upright in its brow)
  const eyeGlow = glow(U, 0.5, 0.7);
  eyeGlow.position.set(0, 0.06, 0.1);
  head.add(eyeGlow);
  for (let i = 0; i < 6; i++) {
    const x = (i % 2 ? 1 : -1) * (0.015 + Math.floor(i / 2) * 0.02),
      z = 0.02 - Math.floor(i / 2) * 0.07;
    spike(head, [x, 0.1, z], [x * 2.2, 0.3 - Math.floor(i / 2) * 0.04, z - 0.16], 0.025, black);
  } // (the crest, raised)
  const wings = ([-1, 1] as const).map((s) => {
    const w = featherWing(body, s, [0.12 * s, 0.08, 0.03], 0.78, black, sheen, 9, 0.55);
    for (let i = 0; i < 4; i++)
      part(
        w,
        new THREE.ConeGeometry(0.04, 0.45 + (i % 2) * 0.15, 4),
        i % 2 ? edge : black,
        [(0.55 + i * 0.07) * s, -0.01, -0.3 - (i % 2) * 0.08],
        { rot: [-Math.PI / 2, 0, -(0.4 + i * 0.12) * s], scale: [1, 1, 0.2] },
      );
    for (let i = 0; i < 3; i++)
      tube(
        w,
        [
          [(0.62 + i * 0.06) * s, 0, -0.3],
          [(0.66 + i * 0.06) * s, -0.04, -0.5],
          [(0.6 + i * 0.08) * s, -0.06, -0.72],
        ],
        0.05,
        0.01,
        smokeM,
        6,
        5,
      ); // (smoke trailing from its wing tips)
    return w;
  });
  const tail = joint(body, [0, 0.01, -0.3]);
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.16;
    part(tail, new THREE.ConeGeometry(0.06, 0.42, 4), i % 2 ? sheen : black, [Math.sin(a) * 0.2, 0, -0.2], {
      rot: [-Math.PI / 2, 0, -a],
      scale: [1, 1, 0.2],
    });
  }
  for (const s of [-1, 1])
    for (let k = -1; k <= 1; k++) spike(body, [0.06 * s, -0.16, 0.05], [0.07 * s + k * 0.03, -0.3, 0.12], 0.012, beak);
  const smoke = joint(g, [0, 0.95, -0.4]); // (a drift of smoke behind it, turning as one)
  for (let i = 0; i < 5; i++)
    part(smoke, sphere(0.12 + i * 0.03, 6, 5), smokeM, [Math.sin(i * 2.2) * 0.25, -i * 0.12, -i * 0.1]);
  part(g, new THREE.CircleGeometry(0.75, 16), std(0x000000, { transparent: true, opacity: 0.4 }), [0, 0.007, 0], {
    rot: [-Math.PI / 2, 0, 0],
  });
  return {
    group: g,
    shadow: 0,
    parts: { body, head },
    idle: (t) => {
      const f = Math.sin(t * 2.4);
      wings[0].rotation.z = -0.3 - f * 0.55;
      wings[1].rotation.z = 0.3 + f * 0.55;
      body.position.y = 0.95 + Math.sin(t * 2.4 + 1.2) * 0.06;
      head.rotation.y = Math.sin(t * 0.8) * 0.35;
      tail.rotation.x = Math.sin(t * 2.4) * 0.06;
      smoke.rotation.y = t * 0.5;
      smoke.position.y = 0.95 + Math.sin(t * 1.2) * 0.05;
      eyeGlow.material.opacity = 0.55 + Math.sin(t * 3) * 0.15;
    },
  };
}

/** The Rime Warg (for the Rime Wolf; a pack that rings the mage): a hunched warg, dark-furred, high at the shoulder and low
    at the hip, a mane of frost crystals round its neck, ice spines down its back, a heavy jaw and slit eyes of ice. */
export function rimeWarg(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0, 0]),
    fur = std(0x3a4452, { roughness: 1 }),
    back = std(0x232a36, { roughness: 1 }),
    belly = std(0x56606c),
    nose = gloss(0x0e1014, 0.3, 0.3),
    tooth = std(0xf4f0e6),
    ice = lit(0xbfe8ff);
  body.scale.setScalar(1.15);
  tube(
    body,
    [
      [0, 0.5, -0.42],
      [0, 0.58, -0.15],
      [0, 0.68, 0.12],
      [0, 0.66, 0.26],
    ],
    0.15,
    0.2,
    fur,
    10,
    8,
  ); // (hunched: high at the shoulder)
  part(body, rough(sphere(0.2, 10, 8), 0.02, 6), back, [0, 0.74, -0.06], { scale: [0.85, 0.5, 1.8] });
  part(body, sphere(0.16, 8, 6), belly, [0, 0.52, 0.18], { scale: [0.85, 1.05, 1] });
  for (let i = 0; i < 9; i++) {
    const k = i / 9;
    spike(
      body,
      [i % 2 ? 0.04 : -0.04, 0.8 - k * 0.14, 0.26 - k * 0.7],
      [i % 2 ? 0.1 : -0.1, 1.04 - k * 0.2, 0.16 - k * 0.8],
      0.035 - k * 0.014,
      ice,
    );
  } // (ice spines down its back)
  for (let i = 0; i < 8; i++) {
    const a = (i / 7 - 0.5) * 2.6;
    crystal(
      body,
      F,
      [Math.sin(a) * 0.17, 0.68 + Math.cos(a) * 0.06, 0.3 - Math.abs(Math.sin(a)) * 0.06],
      0.12,
      [-0.5, 0, -a * 0.8],
      ice,
    );
  } // (a mane of frost round its neck)
  const sets = [joint(body, [0, 0, 0]), joint(body, [0, 0, 0])]; // (the legs in two diagonal pairs that step together)
  [-1, 1].forEach((s) =>
    [
      [0.18, 0],
      [-0.36, 1],
    ].forEach(([z, hind], j) => {
      const l = joint(sets[(j + (s > 0 ? 1 : 0)) % 2], [0.11 * s, hind ? 0.5 : 0.6, z]);
      const pts: V3[] = hind
        ? [
            [0, 0, 0],
            [0.02 * s, -0.16, 0.1],
            [0.02 * s, -0.34, -0.06],
            [0.02 * s, -0.5, 0.0],
          ]
        : [
            [0, 0, 0],
            [0.02 * s, -0.28, 0.02],
            [0.02 * s, -0.6, 0.04],
          ];
      tube(l, pts, hind ? 0.085 : 0.07, 0.035, fur, 8, 6);
      part(l, sphere(0.05, 6, 4), back, [0.02 * s, hind ? -0.5 : -0.6, hind ? 0.04 : 0.08], { scale: [1, 0.55, 1.5] });
      for (const k of [-1, 1])
        spike(
          l,
          [0.02 * s, hind ? -0.5 : -0.6, hind ? 0.07 : 0.11],
          [(0.02 + k * 0.02) * s, hind ? -0.52 : -0.62, hind ? 0.12 : 0.16],
          0.01,
          tooth,
        );
    }),
  );
  const head = joint(body, [0, 0.64, 0.42], [0.25, 0, 0]);
  part(head, sphere(0.14, 10, 8), fur, [0, 0, 0], { scale: [1, 0.9, 1.05] });
  part(head, new THREE.ConeGeometry(0.09, 0.28, 6), fur, [0, -0.03, 0.19], {
    rot: [Math.PI / 2 + 0.08, 0, 0],
    scale: [1, 1, 0.8],
  });
  part(head, new THREE.BoxGeometry(0.2, 0.03, 0.08), back, [0, 0.07, 0.06]); // (a heavy brow)
  part(head, sphere(0.025, 6, 4), nose, [0, -0.02, 0.33]);
  for (const s of [-1, 1]) {
    part(head, new THREE.ConeGeometry(0.055, 0.16, 4), back, [0.08 * s, 0.13, -0.04], {
      rot: [-0.5, 0, -0.3 * s],
      scale: [1, 1, 0.5],
    });
    for (const z of [0.12, 0.2, 0.27]) spike(head, [0.04 * s, -0.08, z], [0.037 * s, -0.15, z + 0.01], 0.013, tooth);
  }
  slitEyes(head, 0.065, 0.045, 0.11, 0.035, 0xbfe8ff, 0.55, 0.4);
  const tail = joint(body, [0, 0.52, -0.48]);
  tube(
    tail,
    [
      [0, 0, 0],
      [0, -0.12, -0.16],
      [0.04, -0.3, -0.24],
      [0.06, -0.42, -0.22],
    ],
    0.07,
    0.02,
    fur,
    8,
    6,
  );
  return {
    group: g,
    shadow: 1.2,
    parts: { body, head, tail },
    idle: (t) => {
      body.position.y = Math.sin(t * 2) * 0.01;
      head.rotation.y = Math.sin(t * 0.9) * 0.25;
      head.rotation.x = 0.25 + Math.sin(t * 1.7) * 0.05;
      tail.rotation.y = Math.sin(t * 1.4) * 0.2;
      sets.forEach((l, i) => {
        l.rotation.x = (i ? 1 : -1) * Math.sin(t * 2) * 0.03;
      });
    },
  };
}

/** The Tarasque (for the Dust Pangolin; rolls up and glances the cantrip off, dazed by a wall): the armoured beast of the
    old tales, a lion-like head in a shaggy mane, violet slit eyes and fangs, a dark shell ridged with great spikes it rolls
    up in, violet light between its plates, a spiked club of a tail. */
export function tarasque(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0, 0]),
    shellM = gloss(0x3a2e2a, 0.5, 0.2),
    plate = std(0x54443c),
    spikeM = std(0xd8ccb0),
    skin = std(0x5a4636),
    mane = std(0x6a3a20, { roughness: 1 }),
    claw = gloss(0x1a1414, 0.3, 0.3),
    seam = lit(U);
  part(
    body,
    rough(new THREE.SphereGeometry(0.38, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0.02, 5),
    shellM,
    [0, 0.2, -0.12],
    { scale: [1, 1, 1.4] },
  );
  part(body, new THREE.CylinderGeometry(0.4, 0.4, 0.05, 14), plate, [0, 0.2, -0.12], { scale: [1, 1, 1.4] }); // (the shell's rim)
  for (let i = 0; i < 3; i++)
    part(body, new THREE.TorusGeometry(0.3 - i * 0.06, 0.012, 3, 16, Math.PI), seam, [0, 0.24 + i * 0.06, -0.12], {
      rot: [0, Math.PI / 2, 0],
      scale: [1, 1 - i * 0.1, 1.4],
    }); // (violet light between its plates)
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 5; i++) {
      // (rows of great spikes)
      const z = -0.5 + i * 0.19,
        x = (r - 1) * 0.17,
        y = 0.2 + Math.sqrt(Math.max(0, 1 - (x / 0.38) ** 2 - ((z + 0.12) / 0.53) ** 2)) * 0.38;
      spike(
        body,
        [x, y - 0.02, z],
        [x * 1.4, y + 0.2 - Math.abs(r - 1) * 0.05, z - 0.04],
        0.045 - Math.abs(r - 1) * 0.01,
        spikeM,
      );
    }
  // legs: thick, clawed, in two pairs that step together
  const sets = [joint(body, [0, 0, 0]), joint(body, [0, 0, 0])];
  [-1, 1].forEach((s) =>
    [
      [0.18, 0],
      [-0.4, 1],
    ].forEach(([z], j) => {
      const l = joint(sets[(j + (s > 0 ? 1 : 0)) % 2], [0.24 * s, 0.26, z]);
      tube(
        l,
        [
          [0, 0, 0],
          [0.04 * s, -0.14, 0.03],
          [0.05 * s, -0.26, 0.05],
        ],
        0.08,
        0.06,
        skin,
        6,
        6,
      );
      for (const k of [-1, 0, 1]) spike(l, [0.05 * s, -0.26, 0.07], [0.05 * s + k * 0.035, -0.27, 0.15], 0.018, claw);
    }),
  );
  // the tail, ending in a spiked club
  tube(
    body,
    [
      [0, 0.16, -0.66],
      [0.04, 0.12, -0.82],
      [-0.02, 0.1, -0.96],
    ],
    0.08,
    0.05,
    skin,
    8,
    6,
  );
  part(body, sphere(0.08, 8, 6), plate, [-0.02, 0.1, -1]);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    spike(body, [-0.02, 0.1, -1], [-0.02 + Math.cos(a) * 0.14, 0.1 + Math.sin(a) * 0.14, -1.02], 0.025, spikeM);
  }
  // the head: lion-like, in a shaggy mane, fangs, violet slit eyes
  const head = joint(body, [0, 0.26, 0.3]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    tube(
      head,
      [
        [Math.cos(a) * 0.08, Math.sin(a) * 0.08 + 0.02, -0.02],
        [Math.cos(a) * 0.18, Math.sin(a) * 0.16 + 0.02, -0.08],
        [Math.cos(a) * 0.24, Math.sin(a) * 0.2 - 0.02, -0.14],
      ],
      0.04,
      0.01,
      mane,
      5,
      4,
    );
  }
  part(head, sphere(0.12, 10, 8), skin, [0, 0, 0.04], { scale: [1, 0.9, 1] });
  tube(
    head,
    [
      [0, -0.02, 0.1],
      [0, -0.04, 0.18],
      [0, -0.05, 0.22],
    ],
    0.08,
    0.06,
    skin,
    5,
    6,
  );
  part(head, new THREE.BoxGeometry(0.18, 0.03, 0.08), plate, [0, 0.07, 0.08]);
  slitEyes(head, 0.06, 0.04, 0.13, 0.03, U, 0.5, 0.4);
  for (const s of [-1, 1]) {
    spike(head, [0.035 * s, -0.07, 0.2], [0.03 * s, -0.14, 0.21], 0.015, spikeM);
    spike(head, [0.08 * s, 0.08, 0], [0.14 * s, 0.16, -0.08], 0.025, spikeM);
  }
  const eyes = glow(U, 0.35, 0.5);
  eyes.position.set(0, 0.05, 0.16);
  head.add(eyes);
  return {
    group: g,
    shadow: 1.3,
    parts: { body, head },
    idle: (t) => {
      body.position.y = Math.abs(Math.sin(t * 2)) * 0.01;
      head.rotation.y = Math.sin(t * 1.1) * 0.3;
      head.rotation.x = Math.sin(t * 1.7) * 0.1;
      sets.forEach((l, i) => {
        l.rotation.x = (i ? 1 : -1) * Math.sin(t * 2) * 0.05;
      });
      eyes.material.opacity = 0.4 + Math.sin(t * 3) * 0.15;
    },
  };
}

/** Floor 5's looks, by the look id each replaces. */
export const FLOOR5_LOOKS: Record<string, () => Built> = {
  rootling: mandrake,
  stormRay: skyRay,
  voidMote: voidMaw,
  lanternTortoise: dragonTurtle,
  gloomRaven: gloomRavenFierce,
  rimeWolf: rimeWarg,
  dustPangolin: tarasque,
};
