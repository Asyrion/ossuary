/* The bottles and reagents of M5 in the room kit's style (docs/archive/M5-plan.md): six bottle shapes built in code, each holding
   a glowing draught in the colour a run deals it (alchemyData.ts, `bottlesFor`), and a small look for each reagent. Built
   once a kind (merged, `keep`) and copied, as the other pickups are (pickupLooks.ts); their HUD icons are rendered from
   them (`iconUrlOf`), so the icon is the thing picked up. */
import * as THREE from 'three';
import { CFG } from '../config';
import { glowShared } from '../render/materials';
import { glowTone, mesh, rough, tone } from '../world/kitParts';
import { put } from '../world/objectLooks';
import { keep } from './pickupLooks';
import { iconUrlOf } from './artifactIcons';
import type { Bottle, ReagentId } from './alchemyData';
import { REAGENTS } from './alchemyData';

const V = (x: number, y: number) => new THREE.Vector2(x, y);
const lathe = (pts: number[][], seg = 10) =>
  new THREE.LatheGeometry(
    pts.map(([x, y]) => V(x, y)),
    seg,
  );
const cyl = (r0: number, r1: number, h: number, seg = 8) => new THREE.CylinderGeometry(r0, r1, h, seg);
const hex = (c: string) => parseInt(c.slice(1), 16);
const GLASS = 0x9ebed8,
  CORK = 0x8a6a44,
  WAX = 0xa83a2a,
  BONE = 0xe4d8bc,
  CLAY = 0x8a5a3a,
  LEATHER = 0x6e4a30;

/** Each bottle: its glass (outline from the bottom up), how far the draught fills it (from its first height to its last:
    `draught`), its stopper. */
const SHAPES: Record<string, { glass: number[][]; draught: number[][]; stopper: (g: THREE.Group) => void }> = {
  flask: {
    // a round-bellied flask with a long neck
    glass: [
      [0, -0.14],
      [0.08, -0.14],
      [0.12, -0.1],
      [0.13, -0.04],
      [0.115, 0.02],
      [0.07, 0.06],
      [0.035, 0.08],
      [0.032, 0.16],
      [0.045, 0.17],
      [0, 0.17],
    ],
    draught: [
      [0, -0.135],
      [0.078, -0.135],
      [0.115, -0.1],
      [0.125, -0.04],
      [0.11, 0.01],
      [0, 0.01],
    ],
    stopper: (g) => {
      mesh(g, cyl(0.034, 0.03, 0.05, 7), tone(CORK, 0.1), 0, 0.19, 0);
    },
  },
  vial: {
    // a tall thin vial
    glass: [
      [0, -0.15],
      [0.045, -0.15],
      [0.055, -0.12],
      [0.055, 0.1],
      [0.04, 0.12],
      [0.04, 0.15],
      [0.05, 0.16],
      [0, 0.16],
    ],
    draught: [
      [0, -0.145],
      [0.045, -0.145],
      [0.05, -0.12],
      [0.05, 0.05],
      [0, 0.05],
    ],
    stopper: (g) => {
      mesh(g, cyl(0.04, 0.036, 0.045, 7), tone(WAX, 0.1), 0, 0.18, 0);
    },
  },
  jar: {
    // a squat jar with a wide mouth, tied over with leather
    glass: [
      [0, -0.12],
      [0.1, -0.12],
      [0.13, -0.09],
      [0.13, 0.05],
      [0.11, 0.08],
      [0.1, 0.1],
      [0, 0.1],
    ],
    draught: [
      [0, -0.115],
      [0.1, -0.115],
      [0.122, -0.09],
      [0.122, 0.02],
      [0, 0.02],
    ],
    stopper: (g) => {
      mesh(g, cyl(0.11, 0.115, 0.03, 9), tone(LEATHER, 0.14), 0, 0.11, 0);
      put(mesh(g, new THREE.TorusGeometry(0.105, 0.01, 3, 12), tone(CORK, 0.05), 0, 0.095, 0), Math.PI / 2);
    },
  },
  tear: {
    // a teardrop, narrowing to a pointed stopper
    glass: [
      [0, -0.13],
      [0.05, -0.125],
      [0.095, -0.09],
      [0.105, -0.03],
      [0.08, 0.04],
      [0.04, 0.1],
      [0.025, 0.13],
      [0, 0.14],
    ],
    draught: [
      [0, -0.125],
      [0.05, -0.12],
      [0.09, -0.09],
      [0.1, -0.03],
      [0.075, 0.02],
      [0, 0.02],
    ],
    stopper: (g) => {
      mesh(g, new THREE.ConeGeometry(0.03, 0.08, 6), tone(GLASS, 0.04, 0.35), 0, 0.18, 0);
    },
  },
  skull: {
    // a bottle cast as a little skull, its stopper a bone
    glass: [
      [0, -0.12],
      [0.07, -0.12],
      [0.1, -0.08],
      [0.12, -0.01],
      [0.115, 0.05],
      [0.085, 0.09],
      [0.04, 0.11],
      [0.03, 0.14],
      [0, 0.14],
    ],
    draught: [
      [0, -0.115],
      [0.07, -0.115],
      [0.095, -0.08],
      [0.11, -0.01],
      [0.1, 0.04],
      [0, 0.04],
    ],
    stopper: (g) => {
      mesh(g, cyl(0.016, 0.016, 0.07, 6), tone(BONE, 0.08), 0, 0.17, 0);
      for (const s of [-1, 1]) mesh(g, new THREE.SphereGeometry(0.018, 6, 4), tone(BONE, 0.08), s * 0.012, 0.205, 0);
      for (const s of [-1, 1]) mesh(g, new THREE.SphereGeometry(0.024, 6, 4), tone(0x221a18), s * 0.045, 0.03, 0.1); // (its eye sockets)
    },
  },
  bulb: {
    // a bulb on a short stem, like a lamp's glass
    glass: [
      [0, -0.15],
      [0.06, -0.15],
      [0.04, -0.12],
      [0.03, -0.09],
      [0.09, -0.06],
      [0.125, 0.0],
      [0.11, 0.07],
      [0.06, 0.11],
      [0.03, 0.12],
      [0.03, 0.15],
      [0, 0.15],
    ],
    draught: [
      [0, -0.08],
      [0.07, -0.07],
      [0.115, 0.0],
      [0.105, 0.04],
      [0, 0.04],
    ],
    stopper: (g) => {
      mesh(g, cyl(0.035, 0.03, 0.04, 7), tone(CORK, 0.1), 0, 0.17, 0);
    },
  },
};

/** The part of a profile (bottom up) between heights `a` and `b`, its ends cut where the outline crosses them; `closed`
    brings both ends in to the axis (a solid of its own). */
function band(pts: number[][], a: number, b: number, closed = false) {
  const at = (y: number) => {
    for (let i = 1; i < pts.length; i++) {
      const [r0, y0] = pts[i - 1],
        [r1, y1] = pts[i];
      if ((y0 - y) * (y1 - y) <= 0 && y1 !== y0) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
    }
    return 0;
  };
  const out: number[][] = [];
  if (a > pts[0][1]) {
    if (closed) out.push([0, a]);
    out.push([at(a), a]);
  }
  for (const p of pts) if (p[1] > a && p[1] < b) out.push(p);
  if (b < pts[pts.length - 1][1]) {
    out.push([at(b), b]);
    if (closed) out.push([0, b]);
  }
  return out;
}

const bottles = new Map<string, THREE.Object3D>();
/** A bottle of the run's deal: its glass, its glowing draught, its stopper (a copy; shared with every bottle like it). */
export function bottleLook(b: Bottle) {
  const key = b.shape + b.liquid;
  let t = bottles.get(key);
  if (!t) {
    const g = new THREE.Group(),
      s = SHAPES[b.shape] ?? SHAPES.flask,
      liquid = hex(b.liquid);
    // the belly up to the fill line is the draught itself, so its colour reads (the glass is drawn solid in the kit's
    // style); the glass is what lies above it, and below it where the draught doesn't reach (a bulb's stem)
    const lo = s.draught[0][1],
      hi = s.draught[s.draught.length - 1][1],
      bottom = s.glass[0][1];
    mesh(g, lathe(band(s.glass, lo, hi, true), 10), glowTone(liquid));
    mesh(g, lathe(band(s.glass, hi, Infinity), 10), tone(GLASS, 0.04, 0.35));
    if (lo > bottom + 0.01) mesh(g, lathe(band(s.glass, -Infinity, lo), 10), tone(GLASS, 0.04, 0.35));
    s.stopper(g);
    g.add(glowShared(liquid, 0.7, 0.4));
    t = keep(g);
    t.scale.setScalar(CFG.alchemy.bottleScale);
    bottles.set(key, t); // (as big on the floor as the other pickups)
  }
  return t.clone();
}

/** Each reagent's look, small enough to sit in a hand. */
const REAGENT_BUILD: Record<ReagentId, (g: THREE.Group, c: number) => void> = {
  graveMoss(g, c) {
    // a clump of moss with pale stalks
    mesh(
      g,
      rough(new THREE.SphereGeometry(0.12, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0.03, 7),
      tone(c, 0.2),
      0,
      -0.06,
      0,
    );
    for (const [x, z] of [
      [-0.04, 0.02],
      [0.03, -0.03],
      [0.05, 0.04],
    ]) {
      mesh(g, cyl(0.006, 0.006, 0.08, 4), tone(0xd8d0a0), x, 0.0, z);
      mesh(g, new THREE.SphereGeometry(0.014, 5, 3), tone(0xf0e8c0), x, 0.045, z);
    }
  },
  wispEssence(g, c) {
    // a mote of light in a little glass ball
    mesh(g, new THREE.SphereGeometry(0.05, 8, 6), glowTone(c), 0, 0, 0);
    mesh(g, new THREE.SphereGeometry(0.09, 10, 7), tone(GLASS, 0.04, 0.35), 0, 0, 0).scale.setScalar(1);
    g.add(glowShared(c, 0.8, 0.55));
  },
  boneDust(g, c) {
    // a heap of pale dust in a twist of cloth
    mesh(g, rough(new THREE.ConeGeometry(0.12, 0.1, 8), 0.02, 3), tone(c, 0.12), 0, -0.05, 0);
    mesh(g, rough(new THREE.ConeGeometry(0.07, 0.07, 7), 0.015, 4), tone(BONE, 0.1), 0.04, -0.01, 0.02);
  },
  emberSalt(g, c) {
    // orange crystals, glowing at the core
    for (const [x, z, h, a] of [
      [0, 0, 0.14, 0],
      [0.05, 0.03, 0.1, 0.4],
      [-0.05, 0.02, 0.09, -0.5],
      [0.01, -0.05, 0.08, 0.2],
    ])
      put(mesh(g, new THREE.OctahedronGeometry(0.045, 0), glowTone(c), x, -0.06 + h / 2, z), a, a, 0).scale.set(
        1,
        h / 0.09,
        1,
      );
    g.add(glowShared(c, 0.6, 0.45));
  },
  rimewater(g, c) {
    // a frosted phial of water that will not thaw
    mesh(
      g,
      lathe(
        [
          [0, -0.12],
          [0.05, -0.12],
          [0.06, -0.09],
          [0.06, 0.08],
          [0.03, 0.1],
          [0.03, 0.12],
          [0, 0.12],
        ],
        8,
      ),
      glowTone(c),
    );
    mesh(g, cyl(0.035, 0.032, 0.04, 6), tone(0xe8f4ff, 0.05), 0, 0.14, 0);
  },
  bloomPetal(g, c) {
    // a bloom of rose petals round a glowing gold heart, on a green leaf
    put(
      mesh(g, new THREE.SphereGeometry(1, 7, 4), tone(0x5e8a34, 0.1), 0, -0.07, 0.01),
      -0.15,
      0.4,
      0,
      [0.07, 0.014, 0.13],
    );
    for (let k = 0; k < 5; k++) {
      const p = new THREE.Group();
      p.rotation.y = (k / 5) * Math.PI * 2;
      g.add(p);
      put(mesh(p, new THREE.SphereGeometry(1, 6, 4), tone(c, 0.06), 0, -0.03, 0.05), -0.45, 0, 0, [0.04, 0.014, 0.065]);
    }
    mesh(g, new THREE.SphereGeometry(0.03, 6, 4), glowTone(0xf0d860), 0, -0.02, 0);
    g.add(glowShared(c, 0.5, 0.35));
  },
  wardensAsh(g, c) {
    // a little urn of heavy grey ash, a ward-blue rune on it
    mesh(
      g,
      lathe(
        [
          [0, -0.1],
          [0.06, -0.1],
          [0.09, -0.05],
          [0.09, 0.03],
          [0.06, 0.07],
          [0.065, 0.09],
          [0, 0.09],
        ],
        9,
      ),
      tone(CLAY, 0.14),
    );
    mesh(g, cyl(0.06, 0.06, 0.01, 9), tone(c, 0.1), 0, 0.09, 0);
    mesh(g, new THREE.BoxGeometry(0.03, 0.05, 0.01), glowTone(0x8ab8ff), 0, 0, 0.09);
  },
};
const reagents = new Map<ReagentId, THREE.Object3D>();
/** A reagent's look (a copy). */
export function reagentLook(id: ReagentId) {
  let t = reagents.get(id);
  if (!t) {
    const g = new THREE.Group();
    REAGENT_BUILD[id](g, hex(REAGENTS[id].color));
    t = keep(g);
    t.scale.setScalar(CFG.alchemy.reagentScale);
    reagents.set(id, t);
  }
  return t.clone();
}

/** The HUD's icons: a bottle as dealt, a reagent (pixel art, as the artifacts' are). */
export const bottleIconUrl = (b: Bottle) => iconUrlOf('bottle:' + b.shape + b.liquid, () => bottleLook(b), b.liquid);
export const reagentIconUrl = (id: ReagentId) => iconUrlOf('reagent:' + id, () => reagentLook(id), REAGENTS[id].color);
