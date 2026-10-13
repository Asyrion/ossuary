/* M4.12 step 4 (docs/archive/M4.12-plan.md): floor 3's four foes and the wasps' nest redone as creatures of fantasy, by the rules of
   fantasyFloor1.ts: each keeps its fight, the parts its behaviour moves (by the old look's names) and about its height;
   each faces +Z, stands on y = 0 and idles; no round googly eyes; the school in the body. Small repeated parts that move
   move together, so each look draws in about as many calls as the old one did. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, circle, crystal, limb, lit, part, rune, shine, sphere, std, type V3 } from '../render/arcane';
import { rough } from '../world/kitParts';
import { batWing, gloss, joint, jointed, slitEyes, spike, tube, type Built } from './beastParts';

const { ember: E, frost: F, umbral: U } = SCHOOL_LIGHT;

/** A tongue of flame `h` tall at `at`: an outer cone and a hot core (both on `parent`, to flicker with it). */
function flameTongue(
  parent: THREE.Object3D,
  at: V3,
  h: number,
  outer: THREE.Material,
  core: THREE.Material,
  rot: V3 = [0, 0, 0],
) {
  part(parent, new THREE.ConeGeometry(h * 0.28, h, 6), outer, [at[0], at[1] + h / 2, at[2]], { rot });
  part(parent, new THREE.ConeGeometry(h * 0.14, h * 0.55, 5), core, [at[0], at[1] + h * 0.3, at[2] + 0.005], { rot });
}

/** The Salamander (was the Cinder Salamander; lays burning ground): the alchemists' fire beast, a lean lizard of black
    stone cracked with lava, a crest of fire down its back, flames licking its flanks, ember slits for eyes and a tail
    that ends in flame. */
export function salamander(): Built {
  const g = new THREE.Group(),
    hide = gloss(0x1c1210, 0.55, 0.15),
    belly = std(0x3a1e14),
    lava = lit(0xff7a1c),
    flameM = lit(E),
    core = lit(0xffd060),
    body = joint(g, [0, 0, 0]);
  body.rotation.y = 0.6; // (turned a little, so its length shows; the head looks back at the camera)
  tube(
    body,
    [
      [0, 0.13, 0.3],
      [0, 0.15, 0.12],
      [0, 0.14, -0.08],
      [0, 0.12, -0.22],
    ],
    0.13,
    0.1,
    hide,
    10,
    8,
  );
  part(body, sphere(0.11, 10, 8), belly, [0, 0.07, 0.04], { scale: [0.95, 0.45, 1.8] });
  for (let i = 0; i < 6; i++) {
    const z = 0.24 - i * 0.09,
      s = i % 2 ? 1 : -1;
    limb(body, [0.03 * s, 0.25, z], [0.11 * s, 0.2, z - 0.05], 0.012, lava);
    limb(body, [0.11 * s, 0.2, z - 0.05], [0.13 * s, 0.12, z - 0.02], 0.01, lava);
  } // (lava in the cracks of its hide)
  const head = joint(body, [0, 0.16, 0.34]);
  part(head, rough(sphere(0.11, 10, 8), 0.012, 3), hide, [0, 0, 0.04], { scale: [1.05, 0.7, 1.4] });
  part(head, new THREE.BoxGeometry(0.18, 0.025, 0.12), hide, [0, 0.06, 0.04]); // (a heavy brow)
  slitEyes(head, 0.065, 0.045, 0.1, 0.03, E, 0.5, 0.35);
  for (const s of [-1, 1]) spike(head, [0.06 * s, 0.06, -0.02], [0.12 * s, 0.1, -0.1], 0.022, hide); // (horns of its brow, swept back)
  part(head, new THREE.BoxGeometry(0.14, 0.01, 0.1), lava, [0, -0.035, 0.14]); // (the glow of its mouth)
  const crest = joint(body, [0, 0.26, 0]); // (the crest of fire flickers as one)
  for (const [z, h] of [
    [0.24, 0.14],
    [0.12, 0.2],
    [0, 0.22],
    [-0.12, 0.18],
    [-0.22, 0.13],
  ])
    flameTongue(crest, [0, 0, z], h, flameM, core, [-0.3, 0, 0]);
  for (const s of [-1, 1])
    for (const z of [0.12, -0.08]) flameTongue(crest, [0.1 * s, -0.08, z], 0.1, flameM, core, [-0.2, 0, -0.8 * s]); // (flames licking its flanks)
  for (const [s, z] of [
    [-1, 0.2],
    [1, 0.2],
    [-1, -0.14],
    [1, -0.14],
  ]) {
    jointed(
      body,
      [
        [0.09 * s, 0.12, z],
        [0.2 * s, 0.1, z + 0.03],
        [0.22 * s, 0, z + 0.08],
      ],
      0.035,
      0.022,
      hide,
    );
    for (const k of [-1, 0, 1])
      spike(body, [0.22 * s, 0.01, z + 0.08], [0.24 * s + k * 0.03, 0.005, z + 0.14], 0.01, lava);
  }
  const tail = joint(body, [0, 0.12, -0.22]);
  tube(
    tail,
    [
      [0, 0, 0],
      [0.04, -0.03, -0.16],
      [-0.02, -0.06, -0.32],
      [0.06, -0.06, -0.46],
    ],
    0.09,
    0.02,
    hide,
    10,
    6,
  );
  flameTongue(tail, [0.06, -0.07, -0.48], 0.16, flameM, core, [-1.1, 0, 0]);
  const tipGlow = glow(E, 0.5, 0.7);
  tipGlow.position.set(0.06, -0.04, -0.54);
  tail.add(tipGlow);
  const heat = glow(E, 1.1, 0.35);
  heat.position.y = 0.25;
  body.add(heat);
  return {
    group: g,
    shadow: 0.75,
    idle: (t) => {
      crest.scale.set(1, 0.85 + Math.sin(t * 11) * 0.2, 1);
      tail.rotation.y = Math.sin(t * 2.5) * 0.3;
      head.rotation.y = -0.5 + Math.sin(t * 0.9) * 0.2;
      head.position.y = 0.16 + Math.sin(t * 1.8) * 0.01;
      heat.material.opacity = 0.3 + Math.sin(t * 3) * 0.08;
      tipGlow.material.opacity = 0.5 + 0.25 * Math.sin(t * 9);
    },
  };
}

/** The Hex Imp (blinks about, its hex drains mana): horned, bat-winged and long-limbed, dark as a bruise, a barbed tail, and
    hexing runes burning on its palms, one raised to throw; a hex circle turns under it. */
export function hexImpFierce(): Built {
  const g = new THREE.Group(),
    skin = gloss(0x3a2452, 0.5, 0.15),
    dark = gloss(0x140c1c, 0.4, 0.3),
    horn = std(0xb8a8c8),
    wingM = std(0x3a1e4a, { side: THREE.DoubleSide, roughness: 0.8 }),
    hex = lit(U),
    float = joint(g, [0, 0, 0]);
  const ring = circle(g, U, 0.38);
  const body = joint(float, [0, 0.5, 0]);
  tube(
    body,
    [
      [0, -0.12, -0.02],
      [0, 0, 0],
      [0, 0.12, 0.02],
    ],
    0.07,
    0.1,
    skin,
    6,
    7,
  ); // (a narrow waist up to broad shoulders)
  // the head: long-chinned, slit eyes under a brow, horns curving up and out, long pointed ears
  const head = joint(body, [0, 0.22, 0.03]);
  part(head, sphere(0.09, 10, 8), skin, [0, 0, 0], { scale: [0.95, 1.1, 0.95] });
  spike(head, [0, -0.05, 0.04], [0, -0.13, 0.06], 0.04, skin);
  slitEyes(head, 0.04, 0.02, 0.075, 0.032, U, 0.5, 0.45);
  for (const s of [-1, 1]) {
    tube(
      head,
      [
        [0.05 * s, 0.06, 0],
        [0.1 * s, 0.16, -0.02],
        [0.17 * s, 0.22, -0.07],
        [0.2 * s, 0.18, -0.12],
      ],
      0.026,
      0.005,
      horn,
      10,
      5,
    );
    spike(head, [0.08 * s, 0, -0.01], [0.2 * s, 0.05, -0.04], 0.025, skin);
  }
  // long arms: one hand raised with a hex burning in it, the other low with a rune on its palm
  jointed(
    body,
    [
      [0.09, 0.1, 0],
      [0.2, 0.2, 0.06],
      [0.24, 0.34, 0.12],
    ],
    0.025,
    0.016,
    skin,
  );
  for (const k of [-1, 0, 1]) spike(body, [0.24, 0.34, 0.12], [0.25 + k * 0.03, 0.42, 0.14], 0.007, dark);
  jointed(
    body,
    [
      [-0.09, 0.1, 0],
      [-0.18, -0.04, 0.06],
      [-0.2, -0.18, 0.1],
    ],
    0.025,
    0.016,
    skin,
  );
  rune(body, U, [-0.2, -0.2, 0.13], 0.07, [-0.3, 0, 0], hex);
  rune(body, U, [0, 0.04, 0.1], 0.12, [-0.2, 0, 0], hex);
  const chestGlow = glow(U, 0.35, 0.5);
  chestGlow.position.set(0, 0.04, 0.12);
  body.add(chestGlow); // (a hex burning on its chest)
  const flame = joint(body, [0.25, 0.4, 0.14]);
  part(flame, sphere(0.045, 8, 6), hex, [0, 0, 0]);
  rune(flame, U, [0, 0, 0.05], 0.1, [0, 0, 0], hex);
  const fire = glow(U, 0.5, 0.7);
  flame.add(fire);
  for (const s of [-1, 1]) {
    jointed(
      body,
      [
        [0.05 * s, -0.12, 0],
        [0.09 * s, -0.24, 0.06],
        [0.07 * s, -0.38, -0.02],
      ],
      0.028,
      0.012,
      skin,
    );
    spike(body, [0.07 * s, -0.38, -0.02], [0.08 * s, -0.4, 0.06], 0.012, dark);
  }
  // bat wings, wide, and a barbed tail curling behind
  const wings = ([-1, 1] as const).map((s) => batWing(body, s, [0.06 * s, 0.1, -0.05], 0.52, wingM, dark));
  const tail = joint(body, [0, -0.12, -0.04]);
  tube(
    tail,
    [
      [0, 0, 0],
      [0.06, -0.12, -0.12],
      [-0.04, -0.2, -0.24],
      [0.04, -0.16, -0.36],
    ],
    0.025,
    0.008,
    skin,
    10,
    5,
  );
  part(tail, new THREE.OctahedronGeometry(0.05), dark, [0.05, -0.14, -0.4], { scale: [1, 0.35, 1.3] });
  return {
    group: g,
    shadow: 0.5,
    idle: (t) => {
      float.position.y = Math.sin(t * 2.6) * 0.06;
      head.rotation.z = Math.sin(t * 1.1) * 0.1;
      ring.rotation.y = t * 0.3;
      wings.forEach((w, i) => {
        w.rotation.z = (i ? -1 : 1) * (0.2 + Math.sin(t * 9) * 0.35);
        w.rotation.y = (i ? -1 : 1) * 0.3;
      });
      flame.scale.setScalar(0.85 + Math.sin(t * 12) * 0.15);
      fire.material.opacity = 0.55 + Math.sin(t * 9) * 0.12;
      tail.rotation.y = Math.sin(t * 2) * 0.3;
    },
  };
}

/** The Rime Drake (was the Rime Drakeling, the elite: breath, flight, a frost ring): a young wyvern as long as the mage is
    tall, steel-blue scales, crests and horns of frost, membrane wings on its arms and slit eyes; a frost circle under it. */
export function rimeDrake(): Built {
  const g = new THREE.Group(),
    scaleM = gloss(0x2c4462, 0.45, 0.25),
    belly = std(0x6a88a8, { emissive: 0x10283c }),
    bone = std(0xa8d4f0, { emissive: 0x2a5a80 }),
    wingM = std(0x3a6a98, {
      side: THREE.DoubleSide,
      roughness: 0.6,
      transparent: true,
      opacity: 0.85,
      emissive: 0x0e2a44,
    }),
    horn = std(0xb8d8f0, { roughness: 0.3, emissive: 0x204a6a }),
    ice = lit(F),
    body = joint(g, [0, 0, 0]);
  const ground = circle(g, F, 0.66);
  part(body, rough(sphere(0.2, 12, 10), 0.015, 2), scaleM, [0, 0.34, -0.04], { scale: [0.9, 0.95, 1.35] });
  part(body, sphere(0.14, 10, 8), belly, [0, 0.3, 0.1], { scale: [0.95, 1.1, 0.8] });
  tube(
    body,
    [
      [0, 0.44, 0.1],
      [0, 0.56, 0.2],
      [0, 0.64, 0.28],
    ],
    0.09,
    0.07,
    scaleM,
    6,
    7,
  ); // (the neck, raised)
  const head = joint(body, [0, 0.68, 0.32]);
  part(head, sphere(0.1, 10, 8), scaleM, [0, 0, 0], { scale: [1, 0.85, 1.1] });
  tube(
    head,
    [
      [0, -0.01, 0.06],
      [0, -0.03, 0.16],
      [0, -0.05, 0.24],
    ],
    0.07,
    0.04,
    scaleM,
    6,
    6,
  ); // (a long snout)
  part(head, new THREE.BoxGeometry(0.15, 0.03, 0.08), scaleM, [0, 0.06, 0.04]); // (the brow)
  slitEyes(head, 0.06, 0.04, 0.09, 0.03, F, 0.5, 0.35);
  for (const s of [-1, 1]) {
    tube(
      head,
      [
        [0.05 * s, 0.07, -0.02],
        [0.1 * s, 0.16, -0.1],
        [0.12 * s, 0.2, -0.22],
      ],
      0.03,
      0.006,
      horn,
      8,
      5,
    );
    crystal(head, F, [0.1 * s, 0.02, -0.04], 0.1, [-0.4, 0, -1.2 * s], ice); // (frost crests behind the jaw)
    for (const z of [0.12, 0.18]) spike(head, [0.035 * s, -0.07, z], [0.033 * s, -0.11, z + 0.01], 0.01, horn);
  }
  for (const [y, z, h] of [
    [0.6, 0.02, 0.22],
    [0.54, -0.12, 0.2],
    [0.48, -0.26, 0.17],
    [0.38, -0.4, 0.14],
  ])
    crystal(body, F, [0, y, z], h, [-0.5, 0, 0], ice);
  for (let i = 0; i < 4; i++)
    part(body, new THREE.BoxGeometry(0.13 - i * 0.015, 0.012, 0.05), ice, [0, 0.42 - i * 0.07, 0.2 - i * 0.015], {
      rot: [-0.9, 0, 0],
    }); // (frost-light between the plates of its breast) // (a crest of frost down its back)
  const breath = glow(F, 0.5, 0);
  breath.position.set(0, -0.05, 0.32);
  head.add(breath);
  // wings on its arms, membrane between bone; two strong legs
  const wings = ([-1, 1] as const).map((s) => batWing(body, s, [0.13 * s, 0.46, -0.04], 0.5, wingM, bone));
  for (const s of [-1, 1]) {
    part(body, sphere(0.1, 8, 6), scaleM, [0.15 * s, 0.22, -0.1], { scale: [0.8, 1.1, 1.2] });
    jointed(
      body,
      [
        [0.16 * s, 0.18, -0.08],
        [0.18 * s, 0.08, 0.02],
        [0.17 * s, 0, 0.06],
      ],
      0.05,
      0.03,
      scaleM,
    );
    for (const k of [-1, 0, 1]) spike(body, [0.17 * s, 0.01, 0.06], [0.17 * s + k * 0.04, 0, 0.13], 0.014, horn);
  }
  const tail = joint(body, [0, 0.26, -0.28]);
  tube(
    tail,
    [
      [0, 0, 0],
      [0.06, -0.08, -0.18],
      [-0.04, -0.16, -0.38],
      [0.08, -0.2, -0.56],
    ],
    0.1,
    0.02,
    scaleM,
    12,
    6,
  );
  crystal(tail, F, [0.09, -0.2, -0.6], 0.14, [-1.3, 0, 0], ice);
  const snow = glow(F, 1.2, 0.25);
  snow.position.y = 0.45;
  body.add(snow);
  return {
    group: g,
    shadow: 0.95,
    parts: { ground },
    idle: (t) => {
      body.scale.set(1, 1 + Math.sin(t * 1.8) * 0.02, 1);
      head.rotation.set(Math.sin(t * 1.1) * 0.08, Math.sin(t * 0.7) * 0.25, Math.sin(t * 0.9) * 0.06);
      wings.forEach((w, i) => {
        w.rotation.z = (i ? 1 : -1) * (0.25 + Math.sin(t * 3) * 0.25);
        w.rotation.x = -0.25;
      });
      tail.rotation.y = Math.sin(t * 1.5) * 0.35;
      breath.material.opacity = Math.max(0, Math.sin(t * 0.9)) ** 3 * 0.6;
      snow.material.opacity = 0.2 + Math.sin(t * 2) * 0.06;
    },
  };
}

/** A Cinder Hornet (was an Ember Wasp, let out of its nest): a hornet of obsidian banded with lava, wings of flame, ember
    slits for eyes and a stinger glowing white-hot. */
export function cinderHornet(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0.85, 0]),
    black = gloss(0x120c0a, 0.25, 0.5),
    lava = lit(0xff5a10),
    sting = lit(0xfff0c0);
  part(body, sphere(0.11, 8, 6), black, [0, 0, 0], { scale: [1, 0.95, 1.25] });
  const head = joint(body, [0, 0.02, 0.16]);
  part(head, sphere(0.085, 8, 6), black, [0, 0, 0.02], { scale: [1.1, 1, 0.9] });
  slitEyes(head, 0.055, 0.03, 0.06, 0.04, E, 0.9, 0.25);
  for (const s of [-1, 1]) {
    spike(head, [0.03 * s, -0.05, 0.08], [-0.01 * s, -0.1, 0.14], 0.02, black); // (mandibles)
    tube(
      head,
      [
        [0.025 * s, 0.06, 0.06],
        [0.07 * s, 0.16, 0.08],
        [0.13 * s, 0.2, 0.02],
      ],
      0.01,
      0.004,
      black,
      6,
      3,
    ); // (feelers, swept back like horns)
  }
  limb(body, [0, -0.02, -0.1], [0, -0.05, -0.16], 0.03, black);
  const tail = joint(body, [0, -0.05, -0.16], [0.35, 0, 0]);
  [0.13, 0.135, 0.12, 0.095, 0.065].forEach((r, i) =>
    part(tail, sphere(r, 8, 6), i % 2 ? lava : black, [0, 0, -0.06 - i * 0.1], {
      scale: i % 2 ? [1.02, 0.92, 0.5] : [1, 0.9, 0.9],
    }),
  );
  spike(tail, [0, 0, -0.5], [0, -0.02, -0.66], 0.03, sting);
  for (let i = 0; i < 4; i++)
    for (const s of [-1, 1])
      spike(tail, [0.1 * s, 0.02, -0.08 - i * 0.1], [0.17 * s, 0.07, -0.12 - i * 0.1], 0.018, black); // (obsidian barbs along it)
  const tipGlow = glow(E, 0.4, 0.8);
  tipGlow.position.set(0, -0.02, -0.64);
  tail.add(tipGlow);
  // wings of flame: tongues of fire fanned out to each side, a side's beating as one
  const flameM = shine(0xff6a18, 0.75),
    core = shine(0xffd060, 0.7);
  const wings = ([-1, 1] as const).map((s) => {
    const w = joint(body, [0.06 * s, 0.08, 0]);
    for (const [a, len] of [
      [0.4, 0.44],
      [0.08, 0.52],
      [-0.26, 0.4],
      [-0.55, 0.28],
    ]) {
      const dir: V3 = [Math.cos(a) * s, 0, Math.sin(a)];
      for (const [m, r, l, y] of [
        [flameM, 0.07, len, 0],
        [core, 0.03, len * 0.6, 0.005],
      ] as const) {
        const geo = new THREE.ConeGeometry(r, l, 5);
        geo.rotateX(Math.PI / 2); // (its point along +Z, then turned out along `dir`)
        part(w, geo, m, [(dir[0] * l) / 2, y, (dir[2] * l) / 2], {
          rot: [0, Math.atan2(dir[0], dir[2]), 0],
          scale: [1, 0.25, 1],
        });
      }
    }
    return w;
  });
  for (let i = 0; i < 3; i++)
    spike(body, [0, 0.09, 0.06 - i * 0.07], [0, 0.17 - i * 0.015, 0.02 - i * 0.08], 0.025, black); // (a crest of obsidian points)
  for (const s of [-1, 1])
    for (const z of [0.07, 0, -0.07])
      jointed(
        body,
        [
          [0.06 * s, -0.07, z],
          [0.12 * s, -0.16, z + 0.03],
          [0.1 * s, -0.3, z + 0.02],
        ],
        0.014,
        0.007,
        black,
      );
  return {
    group: g,
    shadow: 0.8,
    parts: { body, tail },
    idle: (t) => {
      body.position.y = 0.85 + Math.sin(t * 3) * 0.05;
      body.rotation.y = Math.sin(t * 0.9) * 0.2;
      wings.forEach((w, i) => {
        w.rotation.z = Math.sin(t * 42) * 0.45 * (i ? 1 : -1);
      });
      tail.rotation.x = 0.35 + Math.sin(t * 2.4) * 0.12;
      tipGlow.material.opacity = 0.55 + 0.3 * Math.sin(t * 6);
    },
  };
}

/** The Cinder Hornets' nest (only fire harms it): a nest of cooled lava set in the wall, black stone in ridged layers, lava
    glowing in its cracks and at its mouth, where the brood stirs. */
export function lavaNest(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0, 0]),
    stone = std(0x2a2220, { roughness: 1 }),
    ridge = std(0x3c302a, { roughness: 1 }),
    lava = lit(0xff7a1c),
    mouth = lit(0x2a0a04);
  const profile = [
    [0, 0.05],
    [0.3, 0.12],
    [0.44, 0.4],
    [0.46, 0.7],
    [0.4, 1],
    [0.26, 1.22],
    [0.1, 1.32],
    [0, 1.34],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  part(body, rough(new THREE.LatheGeometry(profile, 12), 0.03, 6), stone, [0, 0, 0], { scale: [1, 1, 0.8] });
  for (let i = 0; i < 5; i++) {
    const y = 0.25 + i * 0.22,
      r = [0.37, 0.45, 0.47, 0.43, 0.31][i];
    part(body, rough(new THREE.TorusGeometry(r, 0.045, 4, 14), 0.02, i), ridge, [0, y, 0], {
      rot: [Math.PI / 2, 0, 0],
      scale: [1, 0.8, 1],
    });
  }
  // lava in its cracks: runs down the face between the ridges
  for (const [x, y0, y1] of [
    [-0.24, 1.05, 0.7],
    [0.2, 0.95, 0.52],
    [-0.12, 0.5, 0.2],
    [0.3, 0.6, 0.32],
    [0.05, 1.2, 0.9],
  ]) {
    const z = Math.sqrt(Math.max(0, 0.2 - x * x)) * 0.8 + 0.1;
    limb(body, [x, y0, z], [x + 0.05, (y0 + y1) / 2, z + 0.02], 0.018, lava);
    limb(body, [x + 0.05, (y0 + y1) / 2, z + 0.02], [x - 0.02, y1, z], 0.016, lava);
  }
  part(body, sphere(0.14, 8, 6), mouth, [0, 0.55, 0.33], { scale: [1, 0.8, 0.45] });
  part(body, new THREE.TorusGeometry(0.14, 0.025, 4, 14), lava, [0, 0.55, 0.35], { scale: [1, 0.8, 1] });
  for (const [x, y] of [
    [-0.22, 0.85],
    [0.24, 0.78],
    [0.1, 1.08],
  ])
    part(body, sphere(0.045, 6, 5), lava, [x, y, Math.sqrt(Math.max(0, 0.2 - x * x)) * 0.8 + 0.12], {
      scale: [1, 0.8, 0.4],
    }); // (the smaller holes, glowing)
  const brood = glow(E, 0.7, 0.7);
  brood.position.set(0, 0.55, 0.38);
  body.add(brood);
  part(body, new THREE.CylinderGeometry(0.06, 0.1, 0.3, 6), ridge, [0, 1.42, -0.05]); // (where it hangs from the stone)
  return {
    group: g,
    shadow: 0.9,
    parts: { body },
    idle: (t) => {
      body.scale.set(1 + Math.sin(t * 1.4) * 0.015, 1, 1);
      brood.material.opacity = 0.45 + 0.3 * Math.max(0, Math.sin(t * 3.1));
    },
  };
}

/** Floor 3's new looks, by the look id each replaces. */
export const FLOOR3_LOOKS: Record<string, () => Built> = {
  cinderSalamander: salamander,
  hexImp: hexImpFierce,
  rimeDrakeling: rimeDrake,
  emberWasp: cinderHornet,
  waspNest: lavaNest,
};
