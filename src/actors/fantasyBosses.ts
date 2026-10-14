/* The bosses as creatures of fantasy (docs/archive/M4.12-plan.md), by the rules of fantasyFloor1.ts: each keeps its
   fight, the parts the fight moves (`eye`, `ring`, `halo` and a boss's own) and about its height; each faces +Z and stands
   on y = 0; no round googly eyes; the school in the body. bossLooks.ts builds them through its own names (`wardenLook`, `hartLook`,
   `anglerLook`, `tigerLook`, `dragonHead`), as serpentLooks.ts does the serpent's head. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, circle, limb, lit, motes, part, rune, runeRing, sphere, std, type V3 } from '../render/arcane';
import { rough } from '../world/kitParts';
import { gloss, joint, jointed, slitEyes, spike, thin, tube } from './beastParts';
import type { BossBuilt } from './bossLooks';

const { umbral: U, hallow: H, frost: F, ember: E } = SCHOOL_LIGHT;

/** The ring of runes behind its head that the fight turns (as bossLooks.ts' own). */
function haloRing(g: THREE.Object3D, color: number, radius: number, y: number, z = -0.35) {
  const ring = new THREE.Group();
  ring.position.set(0, y, z);
  ring.rotation.x = -0.35;
  g.add(ring);
  runeRing(ring, color, radius, [0, 0, 0], 8, [Math.PI / 2, 0, 0], lit(color, 0.9));
  return ring;
}
/** The Hollow Warden's look, the Owlbear (Hallow): a bear's great hunched body under an owl's head, a hooked beak, a disc of
    pale feathers round two slits of gold, ear tufts like horns, clawed forelimbs, a crown of candles burning in its light. */
export function owlbear(): BossBuilt {
  const g = new THREE.Group(),
    fur = std(0x4a3c30, { roughness: 1 }),
    furDark = std(0x2e241c, { roughness: 1 }),
    feather = std(0x8a7a66),
    disc = std(0xb8a888),
    beakM = gloss(0x3a2c18, 0.35, 0.3),
    claw = gloss(0xd8ccb0, 0.3, 0.2),
    wax = std(0xf0e2c6),
    body = joint(g, [0, 0, 0]);
  part(body, rough(sphere(0.8, 16, 12), 0.03, 3), fur, [0, 0.95, -0.08], { scale: [1.05, 1.05, 1] });
  part(body, sphere(0.55, 12, 10), feather, [0, 1.05, 0.35], { scale: [1, 1.1, 0.55] }); // (a ruff of feathers at its breast)
  for (let i = 0; i < 12; i++)
    spike(
      body,
      [((i % 4) - 1.5) * 0.2, 1.3 - Math.floor(i / 4) * 0.22, 0.55],
      [((i % 4) - 1.5) * 0.22, 1.2 - Math.floor(i / 4) * 0.22, 0.64],
      0.05,
      furDark,
    ); // (its feathers, in rows)
  // forelimbs: thick, clawed, planted before it
  for (const s of [-1, 1]) {
    jointed(
      body,
      [
        [0.6 * s, 1.2, 0.2],
        [0.75 * s, 0.7, 0.45],
        [0.6 * s, 0.08, 0.6],
      ],
      0.2,
      0.14,
      fur,
    );
    for (const k of [-1, 0, 1]) spike(body, [0.6 * s + k * 0.08, 0.06, 0.7], [0.6 * s + k * 0.1, 0, 0.88], 0.04, claw);
    part(body, sphere(0.22, 8, 6), furDark, [0.42 * s, 0.2, -0.4], { scale: [1, 0.8, 1.3] }); // (haunches)
  }
  // the head: an owl's, its face a disc of feathers, slit eyes of gold, a hooked beak, tufts like horns
  const head = joint(body, [0, 1.85, 0.2]);
  part(head, sphere(0.58, 16, 12), feather, [0, 0, 0], { scale: [1.15, 0.9, 1] });
  const face = joint(head, [0, -0.02, 0.6], [-0.4, 0, 0]); // (tipped up to the camera)
  part(face, new THREE.CircleGeometry(0.44, 20), disc, [0, 0, 0], { scale: [1.15, 1, 1] });
  for (const s of [-1, 1])
    part(face, new THREE.TorusGeometry(0.17, 0.035, 4, 14, Math.PI), furDark, [0.2 * s, 0.0, 0.01], {
      rot: [0, 0, s * 0.3],
    }); // (dark brows over its eyes, low at the beak: a scowl)
  const eye = joint(face, [0, 0.05, 0.03]);
  slitEyes(eye, 0.2, 0, 0, 0.1, H, 0.2, 0.4);
  tube(
    face,
    [
      [0, -0.04, 0.02],
      [0, -0.14, 0.14],
      [0, -0.28, 0.1],
    ],
    0.07,
    0.01,
    beakM,
    6,
    5,
  ); // (the hooked beak)
  for (const s of [-1, 1])
    tube(
      head,
      [
        [0.32 * s, 0.34, -0.02],
        [0.46 * s, 0.56, -0.08],
        [0.52 * s, 0.72, -0.2],
      ],
      0.09,
      0.015,
      furDark,
      8,
      5,
    ); // (ear tufts like horns)
  // the crown of candles, their flames its school's light
  const crown = joint(head, [0, 0.45, -0.05]);
  const flames = joint(crown, [0, 0, 0]);
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.38,
      x = Math.sin(a) * 0.32,
      z = -Math.cos(a) * 0.1,
      h = 0.16 + (i % 2) * 0.07;
    part(crown, new THREE.CylinderGeometry(0.04, 0.045, h, 7), wax, [x, h / 2, z]);
    part(flames, new THREE.ConeGeometry(0.035, 0.1, 6), lit(H), [x, h + 0.05, z]);
  }
  const candleGlow = glow(H, 1.2, 0.55);
  candleGlow.position.y = 0.3;
  crown.add(candleGlow);
  circle(g, H, 1.3);
  const ring = haloRing(g, H, 0.8, 2.85);
  const halo = glow(H, 3, 0.35);
  halo.position.set(0, 2, -0.3);
  g.add(halo);
  return {
    group: g,
    shadow: 2.2,
    school: 'hallow',
    parts: { eye, ring, halo },
    idle: (t) => {
      head.rotation.y = Math.sin(t * 0.6) * 0.25;
      head.rotation.z = Math.sin(t * 0.9) * 0.06;
      body.position.y = Math.sin(t * 1.4) * 0.02;
      flames.scale.set(1, 0.85 + Math.sin(t * 13) * 0.15, 1);
      candleGlow.material.opacity = 0.5 + Math.sin(t * 9) * 0.08;
    },
  };
}

/** The Hallowed Hart (Hallow): a gaunt white stag, its ribs showing, a long silver mane down its neck, slit eyes of light
    and antlers that are light itself. Keeps its fight's parts: `body` (it rears), `head` (lowers its antlers), `antlers`
    and four legs in `legs` (it trots and charges). */
export function hartFierce(): BossBuilt {
  const g = new THREE.Group(),
    coat = std(0xd8d2c4),
    shade = std(0x9e968a),
    mane = std(0x8a8c98, { roughness: 1 }),
    hoof = gloss(0x1e1a18, 0.4, 0.3),
    antlerM = lit(H),
    muzzle = std(0x8a8072);
  const body = joint(g, [0, 0, 0]);
  part(body, sphere(0.7, 16, 12), coat, [0, 1.05, -0.05], { scale: [0.62, 0.58, 1.1] });
  for (let i = 0; i < 5; i++)
    for (const s of [-1, 1])
      part(body, new THREE.TorusGeometry(0.42, 0.018, 3, 10, 1.5), shade, [0.02 * s, 1.0, 0.25 - i * 0.14], {
        rot: [0, Math.PI / 2, s > 0 ? -0.75 : Math.PI + 0.75],
      }); // (ribs showing)
  const legs = joint(body, [0, 0, 0]);
  for (const [x, z] of [
    [-0.24, 0.45],
    [0.24, 0.45],
    [-0.24, -0.55],
    [0.24, -0.55],
  ] as [number, number][]) {
    const l = joint(legs, [x, 0.82, z]);
    jointed(
      l,
      [
        [0, 0, 0],
        [0, -0.42, 0.03],
        [0, -0.74, -0.02],
      ],
      0.075,
      0.05,
      coat,
    );
    part(l, new THREE.CylinderGeometry(0.05, 0.065, 0.1, 7), hoof, [0, -0.78, -0.02]);
  }
  tube(
    body,
    [
      [0, 1.25, 0.55],
      [0, 1.55, 0.72],
      [0, 1.82, 0.86],
    ],
    0.17,
    0.12,
    coat,
    8,
    7,
  ); // (a long neck)
  for (let i = 0; i < 7; i++) {
    const y = 1.86 - i * 0.1,
      z = 0.78 - i * 0.05,
      s = i % 2 ? 1 : -1;
    tube(
      body,
      [
        [0, y + 0.05, z - 0.08],
        [0.08 * s, y - 0.08, z - 0.14],
        [0.12 * s, y - 0.24, z - 0.12],
      ],
      0.045,
      0.008,
      mane,
      6,
      4,
    );
  } // (the mane, long and lank)
  const head = joint(body, [0, 1.94, 0.9]);
  part(head, sphere(0.24, 14, 10), coat, [0, 0, 0], { scale: [0.85, 0.85, 1.1] });
  tube(
    head,
    [
      [0, -0.03, 0.12],
      [0, -0.08, 0.3],
      [0, -0.1, 0.42],
    ],
    0.13,
    0.08,
    coat,
    6,
    7,
  ); // (a long gaunt face)
  part(head, sphere(0.07, 8, 6), muzzle, [0, -0.1, 0.44]);
  for (const s of [-1, 1]) spike(head, [0.18 * s, 0.12, -0.04], [0.36 * s, 0.18, -0.12], 0.05, shade); // (ears, laid back)
  const eye = joint(head, [0, 0.06, 0.18]);
  slitEyes(eye, 0.13, 0, 0, 0.05, H, 0.55, 0.35);
  // the antlers: light itself, a beam each side and its tines
  const antlers = joint(head, [0, 0.2, -0.05]);
  for (const s of [-1, 1]) {
    const beam: V3[] = [
      [0.1 * s, 0, 0],
      [0.34 * s, 0.3, -0.05],
      [0.5 * s, 0.62, -0.12],
      [0.56 * s, 0.96, -0.05],
    ];
    for (let i = 0; i < 3; i++) limb(antlers, beam[i], beam[i + 1], 0.04 - i * 0.008, antlerM, 0.034 - i * 0.008);
    for (const [from, tip] of [
      [beam[1], [0.64 * s, 0.5, 0.1]],
      [beam[2], [0.26 * s, 0.8, 0.02]],
      [beam[2], [0.78 * s, 0.86, -0.1]],
      [beam[3], [0.66 * s, 1.08, -0.12]],
    ] as [V3, V3][])
      limb(antlers, from, tip, 0.028, antlerM, 0.012);
  }
  const candleGlow = glow(H, 2, 0.5);
  candleGlow.position.set(0, 0.8, -0.05);
  antlers.add(candleGlow);
  const tail = joint(body, [0, 1.2, -0.85]);
  part(tail, new THREE.ConeGeometry(0.08, 0.26, 6), coat, [0, 0, -0.06], { rot: [-2.2, 0, 0] });
  circle(g, H, 1.45);
  const ring = haloRing(g, H, 0.9, 2.7, 0.5);
  const halo = glow(H, 3.4, 0.35);
  halo.position.set(0, 2.2, 0);
  g.add(halo);
  const dust = motes(g, H, 5, 1.3, 1.5, 0.03);
  return {
    group: g,
    shadow: 2.4,
    school: 'hallow',
    parts: { eye, ring, halo, body, head, antlers, legs },
    idle: (t) => {
      head.position.y = 1.94 + Math.sin(t * 1.4) * 0.025;
      body.scale.y = 1 + Math.sin(t * 1.4) * 0.01;
      tail.rotation.x = Math.sin(t * 5) * 0.15;
      candleGlow.material.opacity = 0.45 + Math.sin(t * 3) * 0.1;
      dust(t, 0.45);
    },
  };
}

/** The Deep Angler (Umbral): a great anglerfish of black, its eyes small slits of cold light, needle teeth in a jaw that
    drops, ragged fins; the lure on its stalk is its only light. Keeps `body`, `jaw`, `lure` and `lureGlow`. */
export function anglerFierce(): BossBuilt {
  const g = new THREE.Group(),
    skin = gloss(0x0c0e16, 0.55, 0.2),
    belly = std(0x1a1c28),
    finM = thin(0x141624, { roughness: 0.9 }),
    mouthM = lit(0x14040e),
    tooth = gloss(0xe8e4f0, 0.3, 0.2),
    stalkM = std(0x10121c);
  const body = joint(g, [0, 1.25, 0]);
  part(body, rough(sphere(0.95, 18, 14), 0.03, 4), skin, [0, 0, 0], { scale: [1, 0.88, 1] });
  part(body, sphere(0.8, 14, 10), belly, [0, -0.3, 0.12], { scale: [1, 0.66, 0.95] });
  part(body, new THREE.SphereGeometry(0.6, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mouthM, [0, -0.12, 0.52], {
    scale: [1.05, 0.5, 0.62],
  });
  for (let i = 0; i < 11; i++) {
    const a = (i / 10 - 0.5) * 2.4;
    part(body, new THREE.ConeGeometry(0.045, 0.3, 5), tooth, [Math.sin(a) * 0.58, -0.18, 0.62 + Math.cos(a) * 0.3], {
      rot: [Math.PI - 0.2, 0, 0],
    });
  }
  const jaw = joint(body, [0, -0.3, 0.2]);
  part(jaw, new THREE.SphereGeometry(0.64, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skin, [0, 0.02, 0.35], {
    scale: [1.04, 0.55, 0.75],
  });
  for (let i = 0; i < 12; i++) {
    const a = (i / 11 - 0.5) * 2.5;
    part(jaw, new THREE.ConeGeometry(0.05, 0.3, 5), tooth, [Math.sin(a) * 0.62, 0.1, 0.35 + Math.cos(a) * 0.44], {
      rot: [0.2, 0, 0],
    });
  }
  const eye = joint(body, [0, 0.3, 0.72]);
  slitEyes(eye, 0.28, 0, 0, 0.06, 0x7fe8e0, 0.5, 0.3);
  // the lure: a stalk curving up and forward from its brow, a lamp of cold light at its end, its only light
  const stalk = joint(body, [0, 0.78, 0.25]);
  tube(
    stalk,
    [
      [0, 0, 0],
      [0, 0.55, 0.25],
      [0, 0.72, 0.7],
      [0, 0.55, 1.02],
    ],
    0.04,
    0.02,
    stalkM,
    12,
    5,
  );
  const lure = joint(stalk, [0, 0.45, 1.08]);
  part(lure, sphere(0.14, 12, 10), lit(0xeee4ff), [0, 0, 0]);
  const lureGlow = glow(U, 1.7, 0.6);
  lure.add(lureGlow);
  // fins, ragged: two that beat, a ridge of spines along its back, a forked tail
  const fins = [-1, 1].map((s) => {
    const f = joint(body, [0.88 * s, -0.05, -0.1]);
    for (let k = 0; k < 3; k++) spike(f, [0, 0, -k * 0.1], [0.6 * s, -0.1 + k * 0.1, -0.2 - k * 0.1], 0.06, finM);
    return f;
  });
  for (let i = 0; i < 5; i++)
    spike(body, [0, 0.8 - i * 0.08, -0.1 - i * 0.2], [0, 1.2 - i * 0.1, -0.3 - i * 0.22], 0.05, finM);
  const tail = joint(body, [0, 0, -0.9]);
  for (const s of [-1, 1]) spike(tail, [0, 0, 0], [0, 0.5 * s, -0.6], 0.12, finM);
  const ring = haloRing(g, U, 0.95, 2.55, -0.6);
  const halo = glow(U, 3.6, 0.35);
  halo.position.set(0, 1.3, -0.4);
  g.add(halo);
  return {
    group: g,
    shadow: 2.5,
    school: 'umbral',
    parts: { eye, ring, halo, body, jaw, lure, lureGlow },
    idle: (t) => {
      body.position.y = 1.25 + Math.sin(t * 1.3) * 0.08;
      fins.forEach((f, i) => {
        f.rotation.y = Math.sin(t * 4 + i * Math.PI) * 0.45;
      });
      tail.rotation.y = Math.sin(t * 2.2) * 0.3;
      stalk.rotation.x = Math.sin(t * 1.7) * 0.08;
      jaw.rotation.x = 0.06 + Math.sin(t * 1.1) * 0.05;
    },
  };
}

/** The War-Tiger (Frost): a white-maned tiger snarling, its long face wrinkled back from great fangs, slit eyes of frost
    under a heavy brow, ears laid back; armoured in plates of bronze and stone, each with a rune of frost. Keeps its fight's
    parts: `body`, `head`, `jaw`, `legs` (the second its swiping forepaw), `tail`, `rime` and the plates `plate0` to `plate3`. */
export function tigerFierce(): BossBuilt {
  const g = new THREE.Group(),
    fur = std(0xd8d0c2),
    pale = std(0xeee8de),
    stripe = std(0x1e1e26),
    nose = std(0x3a2228),
    claw = gloss(0xe0d8c8, 0.3, 0.2),
    gum = lit(0x5a1a20);
  const bronze = gloss(0x9a6a32, 0.4, 0.6),
    verd = std(0x4a8a76, { roughness: 0.7 }),
    stone = std(0x6a665e, { roughness: 0.95 }),
    stoneDark = std(0x4a4640),
    runeM = lit(F, 0.95);
  const body = joint(g, [0, 0, 0]);
  part(body, sphere(0.7, 16, 12), fur, [0, 0.84, -0.05], { scale: [0.8, 0.6, 1.25] });
  part(body, sphere(0.5, 12, 10), pale, [0, 0.66, 0.12], { scale: [0.9, 0.5, 1.3] });
  for (const dz of [-0.66, -0.42, -0.18, 0.06, 0.28])
    for (const s of [-1, 1]) {
      // (stripes, dark and jagged, from the spine down each flank)
      const f = Math.sqrt(Math.max(0, 1 - (dz / 0.88) ** 2)),
        pts: V3[] = [];
      for (let k = 0; k <= 5; k++) {
        const a = Math.PI / 2 - s * (0.15 + k * 0.2);
        pts.push([Math.cos(a) * 0.58 * f, 0.84 + Math.sin(a) * 0.44 * f, -0.05 + dz + (k % 2) * 0.05]);
      }
      tube(body, pts, 0.05, 0.012, stripe, 8, 4);
    }
  const legs = joint(body, [0, 0, 0]);
  for (const [x, z] of [
    [-0.34, 0.5],
    [0.34, 0.5],
    [-0.32, -0.58],
    [0.32, -0.58],
  ] as [number, number][]) {
    const l = joint(legs, [x, 0.72, z]);
    jointed(
      l,
      [
        [0, 0, 0],
        [0, -0.36, 0.04],
        [0, -0.62, 0.02],
      ],
      0.14,
      0.1,
      fur,
    );
    part(l, sphere(0.13, 10, 8), pale, [0, -0.64, 0.07], { scale: [1, 0.55, 1.3] });
    for (let i = -1; i <= 1; i++) spike(l, [i * 0.055, -0.64, 0.16], [i * 0.06, -0.68, 0.28], 0.022, pale); // (in the paw's surface: each leg moves apart, a surface a call)
  }
  // the head: long, snarling, a heavy brow over slit eyes, the muzzle wrinkled back from its fangs, ears laid back
  const head = joint(body, [0, 1.1, 0.92]);
  part(head, sphere(0.36, 14, 12), fur, [0, 0, 0], { scale: [1.05, 0.88, 1.1] });
  tube(
    head,
    [
      [0, -0.06, 0.18],
      [0, -0.1, 0.34],
      [0, -0.12, 0.44],
    ],
    0.2,
    0.15,
    pale,
    6,
    8,
  ); // (the long muzzle)
  part(head, sphere(0.05, 7, 5), nose, [0, -0.04, 0.48], { scale: [1.4, 0.8, 1] });
  for (let i = 0; i < 3; i++)
    part(head, new THREE.TorusGeometry(0.12, 0.012, 3, 10, 2), stripe, [0, -0.02 + i * 0.03, 0.32 - i * 0.04], {
      rot: [-0.4, 0, Math.PI * 0.5 - 1],
      scale: [1, 0.5, 1],
    }); // (the snarl's wrinkles)
  part(head, new THREE.BoxGeometry(0.5, 0.07, 0.14), fur, [0, 0.14, 0.18]); // (the heavy brow)
  for (const s of [-1, 1]) {
    spike(head, [0.24 * s, 0.26, -0.06], [0.42 * s, 0.3, -0.22], 0.08, fur); // (ears, laid back)
    for (let i = 0; i < 2; i++)
      part(head, new THREE.BoxGeometry(0.035, 0.14, 0.03), stripe, [(0.3 + i * 0.05) * s, 0.0 - i * 0.08, 0.16], {
        rot: [0, 0, s * (1.2 + i * 0.2)],
      });
    spike(head, [0.08 * s, -0.16, 0.4], [0.07 * s, -0.34, 0.43], 0.035, claw); // (the great upper fangs)
  }
  const jaw = joint(head, [0, -0.2, 0.14]);
  part(jaw, sphere(0.17, 10, 6), pale, [0, -0.02, 0.22], { scale: [1.05, 0.45, 1] });
  part(jaw, new THREE.BoxGeometry(0.2, 0.02, 0.16), gum, [0, 0.04, 0.22]);
  for (const s of [-1, 1]) spike(jaw, [0.08 * s, 0.04, 0.34], [0.07 * s, 0.14, 0.36], 0.025, claw);
  const eye = joint(head, [0, 0.08, 0.3]);
  slitEyes(eye, 0.14, 0, 0, 0.055, F, 0.45, 0.4);
  // the mane: a white ruff round the face, tufts pointing out
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2,
      r = 0.42 + (i % 2) * 0.06;
    part(head, new THREE.ConeGeometry(0.1, 0.34, 5), pale, [Math.cos(a) * r, Math.sin(a) * r * 0.9 - 0.02, -0.16], {
      rot: [0, 0, a - Math.PI / 2],
    });
  }
  const tail = joint(body, [0, 0.9, -0.98]);
  const tp: V3[] = [
    [0, 0, 0],
    [0, -0.12, -0.36],
    [0, -0.1, -0.72],
    [0, 0.12, -0.94],
  ];
  tube(tail, tp, 0.07, 0.03, fur, 10, 6);
  for (let i = 1; i < 4; i++)
    part(tail, new THREE.TorusGeometry(0.065 - i * 0.01, 0.02, 4, 10), stripe, tp[i], {
      rot: [Math.PI / 2 + i * 0.5, 0, 0],
    });
  // the plates: bronze pauldrons, a slab of carved stone on its back, a bronze brow plate
  const plates = [-1, 1].map((s) => {
    const p = joint(body, [0.4 * s, 1.02, 0.44], [0, 0, -s * 0.55]);
    part(p, new THREE.SphereGeometry(0.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), bronze, [0, 0, 0], {
      scale: [1, 0.62, 1.2],
    });
    part(p, new THREE.TorusGeometry(0.3, 0.03, 4, 20), verd, [0, 0, 0], {
      rot: [Math.PI / 2, 0, 0],
      scale: [1, 1.2, 1],
    });
    for (let k = 0; k < 3; k++)
      spike(p, [0.1 * s, 0.12, -0.2 + k * 0.2], [0.18 * s, 0.32, -0.24 + k * 0.2], 0.04, bronze); // (spikes on the pauldron)
    rune(p, F, [0, 0.19, 0], 0.16, [-Math.PI / 2, 0, 0], runeM);
    return p;
  });
  const back = joint(body, [0, 1.28, -0.2], [0.06, 0, 0]);
  part(back, new THREE.BoxGeometry(0.62, 0.1, 0.9), stone, [0, 0, 0]);
  for (const s of [-1, 1]) part(back, new THREE.BoxGeometry(0.06, 0.12, 0.92), stoneDark, [0.31 * s, -0.01, 0]);
  for (const z of [-0.25, 0.25]) rune(back, F, [0, 0.056, z], 0.2, [-Math.PI / 2, 0, 0], runeM);
  plates.push(back);
  const brow = joint(head, [0, 0.22, 0.1], [0.45, 0, 0]);
  part(brow, new THREE.SphereGeometry(0.4, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.26), bronze, [0, -0.3, 0]);
  part(brow, new THREE.BoxGeometry(0.05, 0.07, 0.36), bronze, [0, 0.1, 0]);
  rune(brow, F, [0, 0.115, 0.1], 0.12, [-Math.PI / 2, 0, 0], runeM);
  plates.push(brow);
  circle(g, F, 1.5);
  const ring = haloRing(g, F, 0.9, 2.35, -0.2);
  const halo = glow(F, 3.4, 0.35);
  halo.position.set(0, 1.9, 0);
  g.add(halo);
  const rime = joint(g, [0, 0, 0]);
  const frost = motes(rime, F, 6, 1.3, 1.2, 0.03);
  return {
    group: g,
    shadow: 2.5,
    school: 'frost',
    parts: {
      eye,
      ring,
      halo,
      body,
      head,
      jaw,
      legs,
      tail,
      rime,
      plate0: plates[0],
      plate1: plates[1],
      plate2: plates[2],
      plate3: plates[3],
    },
    idle: (t) => {
      const b = Math.sin(t * 1.8);
      body.scale.set(1, 1 + b * 0.015, 1);
      head.rotation.z = Math.sin(t * 0.7) * 0.05;
      tail.rotation.y = Math.sin(t * 1.9) * 0.35;
      tail.rotation.x = Math.sin(t * 1.3) * 0.1;
      frost(t, 0.5);
    },
  };
}

/** The Pillar Dragon's head (Ember and Frost): split orange and blue-grey as its body is, horns sweeping back, a brow of
    spines over slit eyes, a long jaw of fangs, a beard and whiskers; its maw glows as it breathes. Keeps `head`, `jaw` and
    `maw`. */
export function dragonHeadFierce(): BossBuilt {
  const g = new THREE.Group(),
    orange = gloss(0xb85a20, 0.55, 0.15),
    blue = gloss(0x4a5a70, 0.55, 0.15),
    cream = std(0xe0d2b2),
    horn = std(0xd8c4a0, { roughness: 0.5 }),
    dark = std(0x1a100c),
    fang = gloss(0xf4efe4, 0.3, 0.2);
  const head = joint(g, [0, 0, 0]);
  const halfBall = (r: number, side: 1 | -1) =>
    new THREE.SphereGeometry(r, 12, 9, side > 0 ? 0 : Math.PI, Math.PI).rotateY(Math.PI / 2);
  const split = (r: number, at: V3, scale: V3) => {
    for (const s of [1, -1] as const) part(head, halfBall(r, s), s > 0 ? orange : blue, at, { scale });
  };
  split(0.28, [0, 0.06, 0.12], [1, 0.8, 1.15]); // (the skull)
  split(0.19, [0, -0.01, 0.5], [0.85, 0.6, 1.7]); // (a long snout)
  part(head, sphere(0.08, 8, 6), cream, [0, 0.02, 0.8], { scale: [1.2, 0.7, 0.9] });
  for (const s of [-1, 1]) part(head, sphere(0.025, 5, 4), dark, [0.05 * s, 0.06, 0.86]);
  for (const s of [-1, 1]) {
    part(head, new THREE.BoxGeometry(0.14, 0.05, 0.24), s > 0 ? orange : blue, [0.15 * s, 0.2, 0.32], {
      rot: [-0.2, 0.2 * s, 0.25 * s],
    });
    for (let k = 0; k < 3; k++)
      spike(head, [0.16 * s, 0.22, 0.24 - k * 0.08], [0.24 * s, 0.32, 0.16 - k * 0.1], 0.025, horn);
  } // (a brow of spines)
  const eye = joint(head, [0, 0.15, 0.4]);
  slitEyes(eye, 0.12, 0, 0, 0.05, E, 0.5, 0.35);
  for (const s of [-1, 1])
    tube(
      head,
      [
        [0.12 * s, 0.26, 0],
        [0.24 * s, 0.42, -0.18],
        [0.3 * s, 0.44, -0.42],
        [0.26 * s, 0.3, -0.6],
      ],
      0.055,
      0.01,
      horn,
      12,
      6,
    ); // (horns sweeping back)
  for (let i = 0; i < 7; i++) {
    const a = -0.3 + (i / 6) * (Math.PI + 0.6);
    spike(
      head,
      [Math.cos(a) * 0.26, 0.06 + Math.sin(a) * 0.26, -0.14],
      [Math.cos(a) * 0.44, 0.06 + Math.sin(a) * 0.44, -0.36],
      0.04,
      cream,
    );
  } // (a mane of spikes)
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++)
      spike(head, [0.08 * s, -0.08, 0.5 + i * 0.12], [0.07 * s, -0.18, 0.52 + i * 0.12], 0.018, fang);
  const jaw = joint(head, [0, -0.12, 0.2]);
  part(jaw, sphere(0.16, 10, 7), cream, [0, -0.02, 0.3], { scale: [0.8, 0.4, 1.8] });
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++)
      spike(jaw, [0.07 * s, 0.04, 0.3 + i * 0.12], [0.065 * s, 0.12, 0.32 + i * 0.12], 0.016, fang);
  for (let i = 0; i < 5; i++)
    spike(
      jaw,
      [(i - 2) * 0.05, -0.08, 0.28 - Math.abs(i - 2) * 0.03],
      [(i - 2) * 0.06, -0.36 + Math.abs(i - 2) * 0.05, 0.2],
      0.04,
      cream,
    ); // (the beard)
  for (const s of [-1, 1])
    tube(
      head,
      [
        [0.12 * s, 0, 0.66],
        [0.4 * s, -0.06, 0.78],
        [0.68 * s, -0.2, 0.66],
        [0.86 * s, -0.36, 0.44],
      ],
      0.014,
      0.006,
      cream,
      10,
      4,
    ); // (whiskers)
  const maw = glow(0xe07a2c, 1.6, 0);
  maw.position.set(0, -0.08, 0.8);
  head.add(maw);
  const ring = haloRing(g, E, 0.42, 0.82, -0.5);
  const halo = glow(0xe07a2c, 2.6, 0.3);
  halo.position.set(0, 0.3, -0.2);
  g.add(halo);
  return {
    group: g,
    shadow: 1.2,
    school: 'ember',
    parts: { eye, ring, halo, head, jaw, maw },
    idle: (t) => {
      head.rotation.z = Math.sin(t * 1.2) * 0.06;
      head.rotation.x = Math.sin(t * 0.9) * 0.05;
    },
  };
}

/** The jelly serpent's head: a wyrm of clear jelly, its skull and jaw of green-white bone seen through it, small slits of
    light deep in the sockets, a crest of jelly fins. Keeps `head`, `jaw` and `fins`. */
export function serpentHeadFierce(): BossBuilt {
  const g = new THREE.Group(),
    jelly = std(0x6ad868, {
      roughness: 0.2,
      transparent: true,
      opacity: 0.55,
      emissive: 0x1e6a34,
      emissiveIntensity: 0.45,
      depthWrite: false,
    });
  const bone = std(0xd8f0c8, { roughness: 0.5, emissive: 0x3a5a3a, emissiveIntensity: 0.3 }),
    fin = std(0xc8ffb0, {
      roughness: 0.3,
      transparent: true,
      opacity: 0.7,
      emissive: 0x4a8a4a,
      emissiveIntensity: 0.5,
    }),
    socket = lit(0x0a1a0e);
  const head = joint(g, [0, 0, 0]);
  // the skull, seen through the jelly: a long dome, the sockets, a ridge
  part(head, sphere(0.2, 12, 9), bone, [0, 0.06, 0.08], { scale: [1, 0.7, 1.2] });
  tube(
    head,
    [
      [0, 0.02, 0.2],
      [0, -0.01, 0.42],
      [0, -0.03, 0.6],
    ],
    0.12,
    0.07,
    bone,
    6,
    6,
  );
  for (const s of [-1, 1]) part(head, sphere(0.065, 8, 6), socket, [0.11 * s, 0.12, 0.28], { scale: [1.1, 0.8, 0.6] });
  const eye = joint(head, [0, 0.12, 0.31]);
  slitEyes(eye, 0.11, 0, 0, 0.03, 0xc8ffb0, 0.5, 0.3);
  part(head, sphere(0.34, 14, 10), jelly, [0, 0.04, 0.1], { scale: [1, 0.8, 1.25] }); // (the jelly round it)
  part(head, sphere(0.24, 12, 8), jelly, [0, -0.02, 0.42], { scale: [0.95, 0.62, 1.3] });
  const jaw = joint(head, [0, -0.13, 0.14]);
  tube(
    jaw,
    [
      [0.1, -0.02, 0],
      [0.08, -0.04, 0.25],
      [0, -0.05, 0.48],
    ],
    0.03,
    0.02,
    bone,
    6,
    4,
  );
  tube(
    jaw,
    [
      [-0.1, -0.02, 0],
      [-0.08, -0.04, 0.25],
      [0, -0.05, 0.48],
    ],
    0.03,
    0.02,
    bone,
    6,
    4,
  ); // (the jawbone, seen through)
  for (const s of [-1, 1])
    for (let i = 0; i < 4; i++)
      spike(
        jaw,
        [0.08 * s - i * 0.015 * s, -0.02, 0.1 + i * 0.1],
        [0.075 * s - i * 0.015 * s, 0.06, 0.11 + i * 0.1],
        0.015,
        bone,
      );
  part(jaw, sphere(0.2, 10, 7), jelly, [0, -0.02, 0.22], { scale: [0.85, 0.42, 1.45] });
  const fins = joint(head, [0, 0, 0]);
  for (let i = 0; i < 5; i++)
    part(fins, new THREE.ConeGeometry(0.09 - i * 0.01, 0.36 - i * 0.04, 4), fin, [0, 0.3 - i * 0.02, 0.1 - i * 0.13], {
      rot: [-0.6, 0, 0],
      scale: [0.3, 1, 1],
    });
  for (const s of [-1, 1])
    part(fins, new THREE.ConeGeometry(0.07, 0.32, 4), fin, [0.3 * s, 0.02, -0.08], {
      rot: [-0.4, 0, -s * 1.1],
      scale: [0.3, 1, 1],
    });
  const ring = joint(g, [0, 0.5, -0.1]);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    part(ring, sphere(0.035 + (i % 3) * 0.01, 6, 5), fin, [
      Math.cos(a) * 0.42,
      Math.sin(a * 2) * 0.04,
      Math.sin(a) * 0.42,
    ]);
  }
  const halo = glow(0x6ad868, 2.2, 0.3);
  halo.position.set(0, 0.2, 0);
  g.add(halo);
  return {
    group: g,
    shadow: 1,
    school: 'frost',
    parts: { eye, ring, halo, head, jaw, fins },
    idle: (t) => {
      head.rotation.z = Math.sin(t * 1.4) * 0.07;
      head.rotation.x = Math.sin(t * 1.1) * 0.05;
      ring.rotation.y = t * 0.6;
    },
  };
}
