/* The bottles and reagents of M5 in the room kit's style (docs/M5-plan.md): six bottle shapes built in code, each holding
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
const lathe = (pts: number[][], seg = 10) => new THREE.LatheGeometry(pts.map(([x, y]) => V(x, y)), seg);
const cyl = (r0: number, r1: number, h: number, seg = 8) => new THREE.CylinderGeometry(r0, r1, h, seg);
const hex = (c: string) => parseInt(c.slice(1), 16);
const GLASS = 0x9ebed8, CORK = 0x8a6a44, WAX = 0xa83a2a, BONE = 0xe4d8bc, CLAY = 0x8a5a3a, LEATHER = 0x6e4a30;

/** Each bottle: its glass (outline from the bottom up), how far the draught fills it (from its first height to its last:
    `draught`), its stopper. */
const SHAPES: Record<string, { glass: number[][]; draught: number[][]; stopper: (g: THREE.Group) => void }> = {
  flask: { // a round-bellied flask with a long neck
    glass: [[0, -.14], [.08, -.14], [.12, -.1], [.13, -.04], [.115, .02], [.07, .06], [.035, .08], [.032, .16], [.045, .17], [0, .17]],
    draught: [[0, -.135], [.078, -.135], [.115, -.1], [.125, -.04], [.11, .01], [0, .01]],
    stopper: g => { mesh(g, cyl(.034, .03, .05, 7), tone(CORK, .1), 0, .19, 0); },
  },
  vial: { // a tall thin vial
    glass: [[0, -.15], [.045, -.15], [.055, -.12], [.055, .1], [.04, .12], [.04, .15], [.05, .16], [0, .16]],
    draught: [[0, -.145], [.045, -.145], [.05, -.12], [.05, .05], [0, .05]],
    stopper: g => { mesh(g, cyl(.04, .036, .045, 7), tone(WAX, .1), 0, .18, 0); },
  },
  jar: { // a squat jar with a wide mouth, tied over with leather
    glass: [[0, -.12], [.1, -.12], [.13, -.09], [.13, .05], [.11, .08], [.1, .1], [0, .1]],
    draught: [[0, -.115], [.1, -.115], [.122, -.09], [.122, .02], [0, .02]],
    stopper: g => { mesh(g, cyl(.11, .115, .03, 9), tone(LEATHER, .14), 0, .11, 0); put(mesh(g, new THREE.TorusGeometry(.105, .01, 3, 12), tone(CORK, .05), 0, .095, 0), Math.PI / 2); },
  },
  tear: { // a teardrop, narrowing to a pointed stopper
    glass: [[0, -.13], [.05, -.125], [.095, -.09], [.105, -.03], [.08, .04], [.04, .1], [.025, .13], [0, .14]],
    draught: [[0, -.125], [.05, -.12], [.09, -.09], [.1, -.03], [.075, .02], [0, .02]],
    stopper: g => { mesh(g, new THREE.ConeGeometry(.03, .08, 6), tone(GLASS, .04, .35), 0, .18, 0); },
  },
  skull: { // a bottle cast as a little skull, its stopper a bone
    glass: [[0, -.12], [.07, -.12], [.1, -.08], [.12, -.01], [.115, .05], [.085, .09], [.04, .11], [.03, .14], [0, .14]],
    draught: [[0, -.115], [.07, -.115], [.095, -.08], [.11, -.01], [.1, .04], [0, .04]],
    stopper: g => {
      mesh(g, cyl(.016, .016, .07, 6), tone(BONE, .08), 0, .17, 0);
      for (const s of [-1, 1]) mesh(g, new THREE.SphereGeometry(.018, 6, 4), tone(BONE, .08), s * .012, .205, 0);
      for (const s of [-1, 1]) mesh(g, new THREE.SphereGeometry(.024, 6, 4), tone(0x221a18), s * .045, .03, .1); // (its eye sockets)
    },
  },
  bulb: { // a bulb on a short stem, like a lamp's glass
    glass: [[0, -.15], [.06, -.15], [.04, -.12], [.03, -.09], [.09, -.06], [.125, .0], [.11, .07], [.06, .11], [.03, .12], [.03, .15], [0, .15]],
    draught: [[0, -.08], [.07, -.07], [.115, .0], [.105, .04], [0, .04]],
    stopper: g => { mesh(g, cyl(.035, .03, .04, 7), tone(CORK, .1), 0, .17, 0); },
  },
};

/** The part of a profile (bottom up) between heights `a` and `b`, its ends cut where the outline crosses them; `closed`
    brings both ends in to the axis (a solid of its own). */
function band(pts: number[][], a: number, b: number, closed = false) {
  const at = (y: number) => { for (let i = 1; i < pts.length; i++) { const [r0, y0] = pts[i - 1], [r1, y1] = pts[i]; if ((y0 - y) * (y1 - y) <= 0 && y1 !== y0) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0; };
  const out: number[][] = [];
  if (a > pts[0][1]) { if (closed) out.push([0, a]); out.push([at(a), a]); }
  for (const p of pts) if (p[1] > a && p[1] < b) out.push(p);
  if (b < pts[pts.length - 1][1]) { out.push([at(b), b]); if (closed) out.push([0, b]); }
  return out;
}

const bottles = new Map<string, THREE.Object3D>();
/** A bottle of the run's deal: its glass, its glowing draught, its stopper (a copy; shared with every bottle like it). */
export function bottleLook(b: Bottle) {
  const key = b.shape + b.liquid; let t = bottles.get(key);
  if (!t) {
    const g = new THREE.Group(), s = SHAPES[b.shape] ?? SHAPES.flask, liquid = hex(b.liquid);
    // the belly up to the fill line is the draught itself, so its colour reads (the glass is drawn solid in the kit's
    // style); the glass is what lies above it, and below it where the draught doesn't reach (a bulb's stem)
    const lo = s.draught[0][1], hi = s.draught[s.draught.length - 1][1], bottom = s.glass[0][1];
    mesh(g, lathe(band(s.glass, lo, hi, true), 10), glowTone(liquid));
    mesh(g, lathe(band(s.glass, hi, Infinity), 10), tone(GLASS, .04, .35));
    if (lo > bottom + .01) mesh(g, lathe(band(s.glass, -Infinity, lo), 10), tone(GLASS, .04, .35));
    s.stopper(g);
    g.add(glowShared(liquid, .7, .4));
    t = keep(g); t.scale.setScalar(CFG.alchemy.bottleScale); bottles.set(key, t); // (as big on the floor as the other pickups)
  }
  return t.clone();
}

/** Each reagent's look, small enough to sit in a hand. */
const REAGENT_BUILD: Record<ReagentId, (g: THREE.Group, c: number) => void> = {
  graveMoss(g, c) { // a clump of moss with pale stalks
    mesh(g, rough(new THREE.SphereGeometry(.12, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), .03, 7), tone(c, .2), 0, -.06, 0);
    for (const [x, z] of [[-.04, .02], [.03, -.03], [.05, .04]]) { mesh(g, cyl(.006, .006, .08, 4), tone(0xd8d0a0), x, .0, z); mesh(g, new THREE.SphereGeometry(.014, 5, 3), tone(0xf0e8c0), x, .045, z); }
  },
  wispEssence(g, c) { // a mote of light in a little glass ball
    mesh(g, new THREE.SphereGeometry(.05, 8, 6), glowTone(c), 0, 0, 0);
    mesh(g, new THREE.SphereGeometry(.09, 10, 7), tone(GLASS, .04, .35), 0, 0, 0).scale.setScalar(1);
    g.add(glowShared(c, .8, .55));
  },
  boneDust(g, c) { // a heap of pale dust in a twist of cloth
    mesh(g, rough(new THREE.ConeGeometry(.12, .1, 8), .02, 3), tone(c, .12), 0, -.05, 0);
    mesh(g, rough(new THREE.ConeGeometry(.07, .07, 7), .015, 4), tone(BONE, .1), .04, -.01, .02);
  },
  emberSalt(g, c) { // orange crystals, glowing at the core
    for (const [x, z, h, a] of [[0, 0, .14, 0], [.05, .03, .1, .4], [-.05, .02, .09, -.5], [.01, -.05, .08, .2]]) put(mesh(g, new THREE.OctahedronGeometry(.045, 0), glowTone(c), x, -.06 + h / 2, z), a, a, 0).scale.set(1, h / .09, 1);
    g.add(glowShared(c, .6, .45));
  },
  rimewater(g, c) { // a frosted phial of water that will not thaw
    mesh(g, lathe([[0, -.12], [.05, -.12], [.06, -.09], [.06, .08], [.03, .1], [.03, .12], [0, .12]], 8), glowTone(c));
    mesh(g, cyl(.035, .032, .04, 6), tone(0xe8f4ff, .05), 0, .14, 0);
  },
  bloomPetal(g, c) { // a bloom of rose petals round a glowing gold heart, on a green leaf
    put(mesh(g, new THREE.SphereGeometry(1, 7, 4), tone(0x5e8a34, .1), 0, -.07, .01), -.15, .4, 0, [.07, .014, .13]);
    for (let k = 0; k < 5; k++) { const p = new THREE.Group(); p.rotation.y = k / 5 * Math.PI * 2; g.add(p); put(mesh(p, new THREE.SphereGeometry(1, 6, 4), tone(c, .06), 0, -.03, .05), -.45, 0, 0, [.04, .014, .065]); }
    mesh(g, new THREE.SphereGeometry(.03, 6, 4), glowTone(0xf0d860), 0, -.02, 0);
    g.add(glowShared(c, .5, .35));
  },
  wardensAsh(g, c) { // a little urn of heavy grey ash, a ward-blue rune on it
    mesh(g, lathe([[0, -.1], [.06, -.1], [.09, -.05], [.09, .03], [.06, .07], [.065, .09], [0, .09]], 9), tone(CLAY, .14));
    mesh(g, cyl(.06, .06, .01, 9), tone(c, .1), 0, .09, 0);
    mesh(g, new THREE.BoxGeometry(.03, .05, .01), glowTone(0x8ab8ff), 0, 0, .09);
  },
};
const reagents = new Map<ReagentId, THREE.Object3D>();
/** A reagent's look (a copy). */
export function reagentLook(id: ReagentId) {
  let t = reagents.get(id);
  if (!t) { const g = new THREE.Group(); REAGENT_BUILD[id](g, hex(REAGENTS[id].color)); t = keep(g); t.scale.setScalar(CFG.alchemy.reagentScale); reagents.set(id, t); }
  return t.clone();
}

/** The HUD's icons: a bottle as dealt, a reagent (pixel art, as the artifacts' are). */
export const bottleIconUrl = (b: Bottle) => iconUrlOf('bottle:' + b.shape + b.liquid, () => bottleLook(b), b.liquid);
export const reagentIconUrl = (id: ReagentId) => iconUrlOf('reagent:' + id, () => reagentLook(id), REAGENTS[id].color);
