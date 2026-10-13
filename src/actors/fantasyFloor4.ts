/* M4.12 step 5 (docs/archive/M4.12-plan.md): floor 4's five foes redone as creatures of fantasy, by the rules of fantasyFloor1.ts:
   each keeps its fight, the parts its behaviour moves (by the old look's names) and about its height; each faces +Z,
   stands on y = 0 and idles; no round googly eyes; the school in the body. Small repeated parts that move move together,
   so each look draws in about as many calls as the old one did. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, crystal, limb, lit, part, rune, sphere, std, type V3 } from '../render/arcane';
import { rough } from '../world/kitParts';
import { batWing, gloss, joint, jointed, slitEyes, spike, thin, tube, type Built } from './beastParts';

const { ember: E, frost: F, storm: S, hallow: H } = SCHOOL_LIGHT;

/** The Candle Kobold (was the Wickmouse; runs cover to cover, its candle falls burning): a small scaled kobold, rust-dark,
    with a snout of little teeth, horns swept back, ember slits for eyes, a rag of a cloak and a knife; a stub of candle
    burns on its head. */
export function candleKobold(): Built {
  const g = new THREE.Group(),
    scale = gloss(0x4a2c1c, 0.5, 0.15),
    belly = std(0x7a5236),
    horn = std(0xc8b48c),
    rag = thin(0x3a2a24, { roughness: 1 }),
    steel = gloss(0xc8ccd0, 0.2, 0.8),
    waxM = std(0xf2e6cc),
    body = joint(g, [0, 0, 0]);
  tube(
    body,
    [
      [0, 0.16, -0.02],
      [0, 0.26, 0],
      [0, 0.34, 0.02],
    ],
    0.07,
    0.09,
    scale,
    6,
    7,
  ); // (a hunched little body)
  part(body, sphere(0.06, 8, 6), belly, [0, 0.25, 0.06], { scale: [1, 1.3, 0.6] });
  const head = joint(body, [0, 0.42, 0.05]);
  part(head, sphere(0.075, 10, 8), scale, [0, 0, 0], { scale: [1, 0.9, 1.1] });
  tube(
    head,
    [
      [0, -0.01, 0.05],
      [0, -0.025, 0.12],
      [0, -0.03, 0.16],
    ],
    0.045,
    0.028,
    scale,
    5,
    6,
  ); // (the snout)
  for (const s of [-1, 1])
    for (const z of [0.09, 0.13]) spike(head, [0.022 * s, -0.05, z], [0.02 * s, -0.075, z + 0.005], 0.007, horn);
  slitEyes(head, 0.045, 0.02, 0.06, 0.03, E, 0.5, 0.35);
  for (const s of [-1, 1]) {
    tube(
      head,
      [
        [0.04 * s, 0.05, -0.02],
        [0.08 * s, 0.09, -0.08],
        [0.1 * s, 0.08, -0.14],
      ],
      0.018,
      0.004,
      horn,
      6,
      4,
    );
    spike(head, [0.06 * s, 0.01, -0.02], [0.13 * s, 0.04, -0.04], 0.015, scale);
  }
  // a rag of a cloak over its shoulders
  part(body, new THREE.ConeGeometry(0.13, 0.2, 7, 1, true), rag, [0, 0.28, -0.03], { scale: [1, 1, 0.8] });
  // arms: a knife in one hand, the other clawed; short legs, big feet; a tail
  jointed(
    body,
    [
      [0.08, 0.34, 0.02],
      [0.13, 0.26, 0.06],
      [0.12, 0.2, 0.13],
    ],
    0.022,
    0.015,
    scale,
  );
  part(body, new THREE.BoxGeometry(0.03, 0.012, 0.2), steel, [0.13, 0.2, 0.23], { rot: [0, 0.3, 0.2] });
  jointed(
    body,
    [
      [-0.08, 0.34, 0.02],
      [-0.13, 0.25, 0.04],
      [-0.12, 0.18, 0.08],
    ],
    0.022,
    0.015,
    scale,
  );
  for (const s of [-1, 1]) {
    jointed(
      body,
      [
        [0.05 * s, 0.16, 0],
        [0.07 * s, 0.08, 0.03],
        [0.06 * s, 0, 0.02],
      ],
      0.03,
      0.02,
      scale,
    );
    part(body, sphere(0.035, 6, 5), scale, [0.06 * s, 0.01, 0.05], { scale: [1, 0.45, 1.6] });
  }
  const tail = joint(body, [0, 0.14, -0.07]);
  tube(
    tail,
    [
      [0, 0, 0],
      [0.02, -0.06, -0.1],
      [-0.02, -0.11, -0.2],
      [0.03, -0.13, -0.28],
    ],
    0.035,
    0.008,
    scale,
    8,
    5,
  );
  // the candle on its head, stuck in a dab of wax, and its flame
  part(head, sphere(0.04, 8, 5), waxM, [0, 0.07, -0.01], { scale: [1.3, 0.5, 1.3] });
  part(head, new THREE.CylinderGeometry(0.024, 0.028, 0.1, 7), waxM, [0, 0.12, -0.01]);
  for (const [x, y] of [
    [0.02, 0.1],
    [-0.02, 0.09],
  ])
    part(head, sphere(0.01, 5, 4), waxM, [x, y, 0.015], { scale: [1, 2, 1] }); // (drips)
  const flame = joint(head, [0, 0.19, -0.01]);
  part(flame, new THREE.ConeGeometry(0.026, 0.08, 6), lit(E), [0, 0.02, 0]);
  part(flame, sphere(0.016, 5, 4), lit(0xfff0c0), [0, -0.005, 0]);
  const halo = glow(E, 0.6, 0.6);
  flame.add(halo);
  return {
    group: g,
    shadow: 0.45,
    parts: { flame },
    idle: (t) => {
      body.position.y = Math.abs(Math.sin(t * 6)) * 0.015;
      head.rotation.y = Math.sin(t * 2.3) * 0.3;
      tail.rotation.y = Math.sin(t * 4) * 0.4;
      flame.scale.set(1, 0.85 + Math.sin(t * 17) * 0.15, 1);
      halo.material.opacity = 0.5 + Math.sin(t * 13) * 0.1;
    },
  };
}

/** The Bell Fiend (was the Chime Bat; rings to mark the mage's spot): a bat-winged beast whose head is a hollow bronze
    bell, two slits glowing in it and lightning crackling inside; claws hanging, a whip of a tail. */
export function bellFiend(): Built {
  const g = new THREE.Group(),
    hide = gloss(0x241c2c, 0.5, 0.15),
    bronze = gloss(0xa87a2c, 0.3, 0.75),
    bronzeDark = gloss(0x4a3410, 0.35, 0.7),
    wingM = std(0x2e2236, { side: THREE.DoubleSide, roughness: 0.8 }),
    bone = std(0x5a4a5a),
    bolt = lit(0xf4f0a0);
  const body = joint(g, [0, 0.95, 0]);
  part(body, rough(sphere(0.13, 10, 8), 0.012, 4), hide, [0, -0.05, -0.02], { scale: [1, 1.15, 0.9] });
  // the bell for a head: bronze, its mouth turned down and forward, lightning inside and slits of light cut in its crown
  const bell = joint(body, [0, 0.14, 0.06], [-1.45, 0, 0]); // (its mouth turned forward for a face, where the camera sees the dark inside and the lightning in it)
  part(bell, new THREE.CylinderGeometry(0.1, 0.19, 0.26, 14, 1, true), bronze, [0, -0.03, 0]);
  part(bell, new THREE.SphereGeometry(0.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), bronze, [0, 0.1, 0]);
  part(bell, new THREE.TorusGeometry(0.19, 0.022, 4, 18), bronzeDark, [0, -0.16, 0], { rot: [Math.PI / 2, 0, 0] });
  part(bell, new THREE.CircleGeometry(0.18, 14), lit(0x0c0a14), [0, -0.13, 0], { rot: [Math.PI / 2, 0, 0] }); // (dark inside)
  slitEyes(bell, 0.06, 0.06, 0.1, 0.034, S, 0.55, 0.35);
  for (const s of [-1, 1])
    tube(
      bell,
      [
        [0.08 * s, 0.1, 0],
        [0.17 * s, 0.2, -0.02],
        [0.24 * s, 0.22, -0.1],
      ],
      0.028,
      0.005,
      bronzeDark,
      8,
      4,
    ); // (horns off its crown)
  const crackle = joint(bell, [0, 0, 0]);
  for (const [a, b] of [
    [
      [-0.1, -0.12, 0.03],
      [-0.03, -0.04, -0.02],
    ],
    [
      [-0.03, -0.04, -0.02],
      [0.04, -0.12, 0.04],
    ],
    [
      [0.04, -0.12, 0.04],
      [0.1, -0.07, -0.03],
    ],
    [
      [0.04, -0.12, 0.04],
      [0.02, -0.12, 0.1],
    ],
  ] as [V3, V3][])
    limb(crackle, a, b, 0.018, bolt);
  const spark = glow(S, 0.7, 0.6);
  spark.position.set(0, -0.12, 0);
  bell.add(spark);
  // wide bat wings, claws hanging below, a whip of a tail
  const wings = ([-1, 1] as const).map((s) => batWing(body, s, [0.08 * s, 0.02, -0.02], 0.48, wingM, bone));
  for (const s of [-1, 1]) {
    jointed(
      body,
      [
        [0.05 * s, -0.18, 0],
        [0.07 * s, -0.28, 0.03],
        [0.06 * s, -0.36, 0.0],
      ],
      0.022,
      0.012,
      hide,
    );
    for (const k of [-1, 1]) spike(body, [0.06 * s, -0.36, 0], [0.06 * s + k * 0.02, -0.42, 0.03], 0.008, bone);
  }
  tube(
    body,
    [
      [0, -0.14, -0.08],
      [0.03, -0.26, -0.2],
      [-0.03, -0.32, -0.34],
      [0.02, -0.3, -0.46],
    ],
    0.02,
    0.004,
    hide,
    10,
    4,
  );
  return {
    group: g,
    shadow: 0.5,
    parts: { bell },
    idle: (t) => {
      const f = Math.sin(t * 12);
      wings.forEach((w, i) => {
        w.rotation.z = (i ? 1 : -1) * f * 0.5;
        w.rotation.y = (i ? -1 : 1) * 0.2;
      });
      body.position.y = 0.95 + Math.sin(t * 12) * 0.03 + Math.sin(t * 2) * 0.05;
      bell.rotation.z = Math.sin(t * 5) * 0.15;
      bell.rotation.x = -1.45;
      crackle.visible = Math.floor(t * 9) % 3 !== 0;
      spark.material.opacity = 0.4 + Math.max(0, Math.sin(t * 9)) * 0.3;
    },
  };
}

/** The Gargoyle (was the Gargoyle Whelp; stone that turns most of a blow, pounces): a horned, winged beast of dark stone
    crouched like a statue on the edge of a roof, frost glowing in its cracks and its slit eyes, rime on its back. */
export function gargoyle(): Built {
  const g = new THREE.Group(),
    stone = std(0x46464e, { roughness: 0.95 }),
    stoneDark = std(0x2e2e36, { roughness: 0.95 }),
    frost = lit(F),
    body = joint(g, [0, 0, 0]);
  part(body, rough(sphere(0.22, 10, 8), 0.025, 3), stone, [0, 0.28, -0.06], { scale: [1, 0.95, 1.15] }); // (hunched shoulders)
  part(body, rough(sphere(0.16, 8, 6), 0.02, 5), stone, [0, 0.16, -0.22], { scale: [1.15, 0.8, 1] }); // (haunches)
  // frost in its cracks
  for (const [a, b] of [
    [
      [0.14, 0.42, -0.02],
      [0.2, 0.3, 0.04],
    ],
    [
      [0.2, 0.3, 0.04],
      [0.16, 0.18, 0.02],
    ],
    [
      [-0.12, 0.44, -0.12],
      [-0.2, 0.32, -0.16],
    ],
    [
      [-0.2, 0.32, -0.16],
      [-0.17, 0.2, -0.2],
    ],
    [
      [0.04, 0.48, -0.16],
      [0.12, 0.4, -0.26],
    ],
  ] as [V3, V3][])
    limb(body, a, b, 0.018, frost);
  for (let i = 0; i < 5; i++)
    crystal(
      body,
      F,
      [(i - 2) * 0.07, 0.5 - Math.abs(i - 2) * 0.03, -0.1 - Math.abs(i - 2) * 0.04],
      0.17 - Math.abs(i - 2) * 0.02,
      [-0.4, 0, (i - 2) * 0.3],
      frost,
    ); // (rime on its back)
  // the head: heavy-browed, a jaw of stone fangs, horns curling out and back
  const head = joint(body, [0, 0.44, 0.14]);
  part(head, rough(sphere(0.13, 10, 8), 0.015, 6), stone, [0, 0, 0], { scale: [1.15, 0.9, 1.05] });
  part(head, new THREE.BoxGeometry(0.22, 0.04, 0.1), stoneDark, [0, 0.06, 0.06]); // (the brow)
  tube(
    head,
    [
      [0, -0.04, 0.06],
      [0, -0.06, 0.14],
      [0, -0.07, 0.18],
    ],
    0.07,
    0.05,
    stone,
    5,
    6,
  );
  for (const s of [-1, 1]) {
    tube(
      head,
      [
        [0.08 * s, 0.07, -0.02],
        [0.18 * s, 0.14, -0.06],
        [0.24 * s, 0.1, -0.16],
        [0.22 * s, 0.02, -0.2],
      ],
      0.04,
      0.008,
      stoneDark,
      10,
      5,
    );
    spike(head, [0.03 * s, -0.09, 0.16], [0.03 * s, -0.14, 0.17], 0.014, stoneDark);
  }
  const [eyeL, eyeR] = slitEyes(head, 0.055, 0.03, 0.11, 0.042, F, 0.45, 0.35);
  const shine = glow(F, 0.7, 0);
  shine.position.set(0, 0.03, 0.16);
  head.add(shine);
  // forelegs planted, claws over the edge; wings folded high behind; a spade of a tail
  for (const s of [-1, 1]) {
    jointed(
      body,
      [
        [0.12 * s, 0.3, 0.06],
        [0.15 * s, 0.16, 0.14],
        [0.13 * s, 0, 0.16],
      ],
      0.05,
      0.035,
      stone,
      stoneDark,
    );
    for (const k of [-1, 0, 1])
      spike(body, [0.13 * s, 0.015, 0.17], [0.13 * s + k * 0.03, 0.005, 0.24], 0.014, stoneDark);
    part(body, sphere(0.07, 7, 5), stoneDark, [0.17 * s, 0.03, -0.2], { scale: [1, 0.6, 1.4] });
  }
  const wings = ([-1, 1] as const).map((s) => {
    const w = joint(body, [0.14 * s, 0.38, -0.16]);
    limb(w, [0, 0, 0], [0.12 * s, 0.26, -0.06], 0.025, stoneDark);
    limb(w, [0.12 * s, 0.26, -0.06], [0.22 * s, 0.14, -0.12], 0.018, stoneDark);
    const shape = new THREE.Shape(
      [
        [0, 0],
        [0.12, 0.26],
        [0.22, 0.14],
        [0.17, 0.1],
        [0.18, 0.02],
        [0.1, 0.02],
        [0.08, -0.06],
      ].map(([x, y]) => new THREE.Vector2(x * s, y)),
    );
    part(w, new THREE.ShapeGeometry(shape), std(0x3a3a44, { side: THREE.DoubleSide, roughness: 0.95 }), [0, 0, -0.04], {
      rot: [-0.25, 0, 0],
    });
    return w;
  });
  tube(
    body,
    [
      [0, 0.1, -0.32],
      [0.06, 0.04, -0.44],
      [-0.04, 0.02, -0.54],
    ],
    0.04,
    0.01,
    stone,
    8,
    5,
  );
  part(body, new THREE.OctahedronGeometry(0.05), stoneDark, [-0.05, 0.02, -0.58], { scale: [1, 0.35, 1.3] });
  return {
    group: g,
    shadow: 0.65,
    parts: { head, shine, wings: wings[0], wings2: wings[1], eyeL, eyeR },
    idle: (t) => {
      head.rotation.y = Math.sin(t * 0.9) * 0.15;
      const k = (t + 1.3) % 4.4;
      eyeL.scale.y = eyeR.scale.y = k < 0.12 ? 0.12 : 0.38;
    },
  };
}

/** The Pale Unicorn (was the Moonstag Fawn; heals the foes round it): a gaunt white unicorn, its ribs showing, a mane and
    tail of silver hanging lank, gold hooves, slit eyes of light, and a spiral horn that glows as it mends. */
export function paleUnicorn(): Built {
  const g = new THREE.Group(),
    coat = std(0xd8d2c8),
    shade = std(0x9a948c),
    mane = std(0x6a6c7a, { roughness: 1 }),
    hoof = gloss(0xb08a40, 0.3, 0.7),
    hornM = std(0xf6ead0, { emissive: 0x6a5420 }),
    light = lit(H),
    body = joint(g, [0, 0, 0]);
  part(body, sphere(0.18, 12, 10), coat, [0, 0.52, -0.06], { scale: [0.75, 0.78, 1.45] });
  for (let i = 0; i < 4; i++)
    for (const s of [-1, 1])
      part(body, new THREE.TorusGeometry(0.1, 0.008, 3, 8, 1.6), shade, [0.1 * s, 0.5, 0.06 - i * 0.06], {
        rot: [0, Math.PI / 2, s > 0 ? -0.8 : Math.PI + 0.8],
      }); // (ribs showing)
  const legs = joint(body, [0, 0, 0]);
  for (const [x, z] of [
    [-0.08, 0.14],
    [0.08, 0.14],
    [-0.08, -0.24],
    [0.08, -0.24],
  ] as [number, number][]) {
    const l = joint(legs, [x, 0.44, z]);
    jointed(
      l,
      [
        [0, 0, 0],
        [0, -0.2, 0.02],
        [0, -0.4, -0.01],
      ],
      0.035,
      0.022,
      coat,
    );
    part(l, new THREE.CylinderGeometry(0.024, 0.03, 0.05, 6), hoof, [0, -0.42, -0.01]);
  }
  tube(
    body,
    [
      [0, 0.6, 0.12],
      [0, 0.74, 0.2],
      [0, 0.84, 0.24],
    ],
    0.07,
    0.055,
    coat,
    6,
    7,
  ); // (a long neck, raised)
  const head = joint(body, [0, 0.88, 0.27]);
  part(head, sphere(0.08, 10, 8), coat, [0, 0, 0], { scale: [0.85, 0.9, 1.1] });
  tube(
    head,
    [
      [0, -0.02, 0.04],
      [0, -0.06, 0.14],
      [0, -0.08, 0.2],
    ],
    0.06,
    0.04,
    coat,
    6,
    6,
  ); // (a long gaunt face)
  slitEyes(head, 0.05, 0.02, 0.06, 0.025, H, 0.6, 0.3);
  for (const s of [-1, 1]) spike(head, [0.04 * s, 0.06, -0.02], [0.06 * s, 0.14, -0.05], 0.018, coat); // (ears)
  // the horn: a spiral of light
  const horn = joint(head, [0, 0.07, 0.05], [-0.6, 0, 0]);
  part(horn, new THREE.ConeGeometry(0.022, 0.3, 7), hornM, [0, 0.15, 0]);
  tube(
    horn,
    Array.from({ length: 9 }, (_, i) => {
      const k = i / 8,
        a = k * Math.PI * 5;
      return [Math.cos(a) * 0.022 * (1 - k), k * 0.28, Math.sin(a) * 0.022 * (1 - k)] as V3;
    }),
    0.007,
    0.003,
    light,
    24,
    3,
  );
  const aura = glow(H, 0.9, 0.35);
  aura.position.y = 0.3;
  horn.add(aura);
  // the mane, lank down its neck, and the tail
  for (let i = 0; i < 6; i++) {
    const y = 0.86 - i * 0.05,
      z = 0.2 - i * 0.025;
    tube(
      body,
      [
        [0, y + 0.04, z - 0.04],
        [0.05 * (i % 2 ? 1 : -1), y - 0.06, z - 0.08],
        [0.07 * (i % 2 ? 1 : -1), y - 0.16, z - 0.06],
      ],
      0.025,
      0.006,
      mane,
      6,
      4,
    );
  }
  tube(
    body,
    [
      [0, 0.56, -0.3],
      [0.02, 0.5, -0.38],
      [-0.02, 0.36, -0.42],
      [0.01, 0.24, -0.4],
    ],
    0.04,
    0.008,
    mane,
    8,
    5,
  );
  return {
    group: g,
    shadow: 0.55,
    parts: { head, aura, legs },
    idle: (t) => {
      head.rotation.x = Math.sin(t * 1.3) * 0.08;
      aura.material.opacity = 0.3 + Math.sin(t * 2.4) * 0.08;
      legs.children.forEach((l, i) => {
        l.rotation.x = Math.sin(t * 0.8 + i) * 0.02;
      }); // (a shift of weight, so each leg stays its own part: the healer's gait swings them)
    },
  };
}

/** The Frost Scarab (was the Rime Scarab; rolls a growing ball of snow): a scarab of carved blue crystal as large as a
    shield, its wing cases cut in facets with runes of frost on them, a great horned crest of ice; it rolls a ball of rime. */
export function frostScarab(): Built {
  const g = new THREE.Group(),
    body = joint(g, [0, 0, 0]),
    crystalM = std(0x2e6aa8, { roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.9, emissive: 0x0c2a4a }),
    dark = gloss(0x101c30, 0.35, 0.45),
    horn = std(0xb8e0ff, { roughness: 0.2, emissive: 0x2a5a88 }),
    snow = std(0xeef6ff, { roughness: 1 }),
    ice = lit(F);
  // the wing cases: two faceted halves of crystal, a seam of frost-light between them, a rune cut in each
  for (const s of [-1, 1]) {
    part(body, new THREE.IcosahedronGeometry(0.3, 0), crystalM, [0.13 * s, 0.3, -0.12], { scale: [0.5, 0.55, 1.2] });
    rune(body, F, [0.15 * s, 0.44, -0.14], 0.14, [-Math.PI / 2 + 0.1, 0, 0.25 * s], ice);
  }
  part(body, new THREE.BoxGeometry(0.014, 0.02, 0.66), ice, [0, 0.46, -0.12]);
  part(body, rough(sphere(0.18, 10, 8), 0.012, 2), dark, [0, 0.3, 0.22], { scale: [1.2, 0.7, 0.8] }); // (the plate behind its head)
  const head = joint(body, [0, 0.27, 0.36]);
  part(head, sphere(0.1, 8, 6), dark, [0, 0, 0.02], { scale: [1.2, 0.6, 1] });
  // the crest: a great forked horn of ice curving up, two smaller ones out to the sides
  tube(
    head,
    [
      [0, 0.03, 0.06],
      [0, 0.16, 0.14],
      [0, 0.32, 0.12],
      [0, 0.42, 0.02],
    ],
    0.045,
    0.012,
    horn,
    10,
    6,
  );
  for (const s of [-1, 1]) {
    spike(head, [0, 0.33, 0.11], [0.11 * s, 0.44, 0.14], 0.02, horn);
    tube(
      head,
      [
        [0.08 * s, 0.04, 0.04],
        [0.18 * s, 0.1, 0.06],
        [0.24 * s, 0.16, 0.02],
      ],
      0.025,
      0.006,
      horn,
      6,
      4,
    );
    spike(head, [0.05 * s, -0.03, 0.1], [0.02 * s, -0.05, 0.18], 0.02, dark);
  }
  slitEyes(head, 0.07, 0.02, 0.08, 0.028, F, 0.7, 0.2);
  // six legs in two sets of three that step together
  const sets = [joint(body, [0, 0, 0]), joint(body, [0, 0, 0])];
  [-1, 1].forEach((s) =>
    [
      [0.2, [0.28, 0.4, 0.38], [0.24, 0.3, 0.58]],
      [0, [0.38, 0.28, 0.02], [0.46, 0, 0.02]],
      [-0.22, [0.36, 0.26, -0.34], [0.42, 0, -0.54]],
    ].forEach(([z, k, f], j) => {
      const l = joint(sets[(j + (s > 0 ? 1 : 0)) % 2], [0.18 * s, 0.26, z as number]),
        kn = k as number[],
        ft = f as number[];
      jointed(
        l,
        [
          [0, 0, 0],
          [(kn[0] - 0.18) * s, kn[1] - 0.26, kn[2] - (z as number)],
          [(ft[0] - 0.18) * s, ft[1] - 0.26, ft[2] - (z as number)],
        ],
        0.035,
        0.018,
        dark,
        horn,
      );
      spike(
        l,
        [(kn[0] - 0.14) * s, kn[1] - 0.3, kn[2] - (z as number)],
        [(kn[0] - 0.06) * s, kn[1] - 0.28, kn[2] - (z as number)],
        0.014,
        horn,
      );
    }),
  );
  // the ball it rolls: snow packed round shards of ice
  const ball = joint(g, [0, 0.36, 0.92]);
  part(ball, rough(new THREE.IcosahedronGeometry(0.36, 1), 0.04, 5), snow, [0, 0, 0]);
  for (let i = 0; i < 10; i++) {
    const a = i * 2.4,
      b = 0.4 + (i % 4) * 0.6,
      p: V3 = [Math.cos(a) * Math.sin(b) * 0.36, Math.cos(b) * 0.36, Math.sin(a) * Math.sin(b) * 0.36];
    part(ball, new THREE.OctahedronGeometry(0.07), ice, p, { scale: [0.5, 1.3, 0.5], rot: [a, b, 0] });
  }
  const chill = glow(F, 0.9, 0.3);
  ball.add(chill);
  return {
    group: g,
    shadow: 1.5,
    parts: { body, ball },
    idle: (t) => {
      ball.rotation.x = t * 0.8;
      body.position.z = Math.sin(t * 1.6) * 0.03;
      head.rotation.x = Math.sin(t * 1.6) * 0.06;
      sets.forEach((l, i) => {
        l.rotation.x = (i ? 1 : -1) * Math.sin(t * 3.2) * 0.06;
      });
      chill.material.opacity = 0.22 + 0.1 * Math.sin(t * 2);
    },
  };
}

/** Floor 4's new looks, by the look id each replaces. */
export const FLOOR4_LOOKS: Record<string, () => Built> = {
  wickmouse: candleKobold,
  chimeBat: bellFiend,
  gargoyleWhelp: gargoyle,
  moonstagFawn: paleUnicorn,
  rimeScarab: frostScarab,
};
