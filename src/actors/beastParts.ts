/* The parts the bestiary's beasts, creatures and elementals are built from (M4.5; actors/bestiaryLooks.ts). Each one has to
   read at a glance in the pixel look as the animal or creature it is named after, so the parts favour silhouettes:
   tapered tubes for tails, necks and tentacles, jointed legs, membrane and feathered wings, claws, fangs and horns, and
   small glowing slit eyes under a brow, never big round ones. Built on the arcane parts (render/arcane.ts). */
import * as THREE from 'three';
import { limb, lit, part, sphere, std, type V3 } from '../render/arcane';
import { curve, taperTube } from '../world/kitParts';

export interface Built { group: THREE.Group; idle: (t: number) => void; shadow: number; parts?: Record<string, THREE.Object3D> }

/** A surface with a sheen (chitin, scales, wet ink): lower roughness, a touch of metal so the torchlight catches its edges. */
export const gloss = (color: number, rough = .45, metal = .25) => std(color, { roughness: rough, metalness: metal });
/** A surface seen from both sides (membranes, fins, feathers, pages). */
export const thin = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => std(color, { side: THREE.DoubleSide, ...extra });

/** A group at `at` in `parent`, turned by `rot`: something the idle (or later a foe's behaviour) moves as one. */
export function joint(parent: THREE.Object3D, at: V3, rot: V3 = [0, 0, 0]) {
  const g = new THREE.Group(); g.position.set(...at); g.rotation.set(...rot); parent.add(g); return g;
}

/** A tapered tube along a smooth curve through `pts`: a tail, a neck, a tentacle, a horn's sweep. */
export function tube(parent: THREE.Object3D, pts: V3[], r0: number, r1: number, mat: THREE.Material, segs = 10, radial = 6) {
  const m = new THREE.Mesh(taperTube(curve(pts), segs, r0, r1, radial), mat); parent.add(m); return m;
}

/** A jointed limb through `pts` (hip, knee, ankle, foot...), tapering from `r0` to `r1`, a knob at each inner joint. */
export function jointed(parent: THREE.Object3D, pts: V3[], r0: number, r1: number, mat: THREE.Material, knob: THREE.Material = mat) {
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = r0 + (r1 - r0) * i / n, b = r0 + (r1 - r0) * (i + 1) / n;
    limb(parent, pts[i], pts[i + 1], a, mat, b);
    if (i) part(parent, sphere(a * 1.2, 6, 5), knob, pts[i]);
  }
}

/** A cone from `base` to a point at `tip`: a claw, fang, horn, spine or stinger. */
export const spike = (parent: THREE.Object3D, base: V3, tip: V3, r: number, mat: THREE.Material) => limb(parent, base, tip, r, mat, 0);

/** Two glowing slit eyes at (±x, y, z), slanted down towards the middle under a brow, `r` long; turned outwards by `yaw`.
    Returns them (to narrow, or to glow brighter). */
export function slitEyes(parent: THREE.Object3D, x: number, y: number, z: number, r: number, color: number, yaw = .35, slant = .35) {
  const m = lit(color);
  return [-1, 1].map(s => part(parent, sphere(r, 8, 6), m, [x * s, y, z], { rot: [0, yaw * s, -slant * s], scale: [1, .38, .5] }));
}
/** Small round glowing eyes for creatures with many (spiders) or beady ones (birds, insects): a lit bead each. */
export const beads = (parent: THREE.Object3D, at: V3[], r: number, color: number) => { const m = lit(color); return at.map(p => part(parent, sphere(r, 6, 5), m, p)); };

/** A feathered wing for the side `s` (+1 right, -1 left), spread flat from `at` (the shoulder), `span` long: an arm of two
    bones and `n` feathers fanned back from it, the outer ones in `tip`. Flap it by turning it about Z. */
export function featherWing(parent: THREE.Object3D, s: 1 | -1, at: V3, span: number, cover: THREE.Material, tip: THREE.Material, n = 8, sweep = .55) {
  const w = joint(parent, at);
  limb(w, [0, 0, 0], [span * .42 * s, .02, .02], span * .045, cover, span * .03);
  limb(w, [span * .42 * s, .02, .02], [span * .9 * s, 0, -.02], span * .03, cover, span * .012);
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), x = span * (.1 + .85 * k) * s, len = span * (.34 + .26 * k);
    part(w, new THREE.ConeGeometry(span * (.06 + .02 * k), len, 4), k > .55 ? tip : cover, [x, -.005 * i, -len * .42 + .02], { rot: [-Math.PI / 2, 0, -k * sweep * s], scale: [1, 1, .22] });
  }
  // coverts over the arm, so the wing reads as one surface from above
  for (let i = 0; i < 4; i++) part(w, new THREE.ConeGeometry(span * .09, span * .26, 4), cover, [span * (.12 + .2 * i) * s, .02, -span * .08], { rot: [-Math.PI / 2, 0, 0], scale: [1, 1, .3] });
  return w;
}

/** A membrane wing (a bat's, a manticore's, a drake's) for the side `s` from `at`, `span` long: three finger bones and a
    scalloped membrane between them. Flap it by turning it about Z. */
export function batWing(parent: THREE.Object3D, s: 1 | -1, at: V3, span: number, skin: THREE.Material, bone: THREE.Material) {
  const w = joint(parent, at);
  const wrist: V3 = [span * .38 * s, .1, .02];
  const tips: V3[] = [[span * s, .02, .02], [span * .88 * s, -.02, -span * .32], [span * .58 * s, -.04, -span * .55]];
  limb(w, [0, 0, 0], wrist, span * .035, bone, span * .03);
  for (const p of tips) limb(w, wrist, p, span * .02, bone, span * .008);
  spike(w, wrist, [wrist[0] + span * .04 * s, wrist[1] + .02, wrist[2] + span * .1], span * .025, bone);
  // the membrane: wrist, the finger tips with a scallop between each, back to the body
  const outline: [number, number][] = [[0, 0], [wrist[0], wrist[2]]];
  const sag = (a: V3, b: V3, k: number): [number, number] => { const mx = (a[0] + b[0]) / 2, mz = (a[2] + b[2]) / 2; return [mx + (wrist[0] - mx) * k, mz + (wrist[2] - mz) * k]; };
  outline.push([tips[0][0], tips[0][2]], sag(tips[0], tips[1], .25), [tips[1][0], tips[1][2]], sag(tips[1], tips[2], .25), [tips[2][0], tips[2][2]], [span * .08 * s, -span * .38]);
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ShapeGeometry(shape); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, skin); m.position.y = .02; w.add(m);
  return w;
}

/** A crab's or scorpion's pincer at `at` pointing along +Z, `size` long: a swollen palm, a fixed finger and a moving one
    (returned, to open and close it about X). */
export function pincer(parent: THREE.Object3D, at: V3, size: number, shell: THREE.Material, tipMat: THREE.Material = shell, rot: V3 = [0, 0, 0]) {
  const c = joint(parent, at, rot);
  part(c, sphere(size * .32, 8, 6), shell, [0, 0, size * .2], { scale: [.85, .7, 1.25] });
  spike(c, [0, -size * .06, size * .45], [0, -size * .04, size * .95], size * .1, tipMat);
  const finger = joint(c, [0, size * .1, size * .42]);
  spike(finger, [0, 0, 0], [0, -size * .06, size * .48], size * .09, tipMat);
  return { claw: c, finger };
}
