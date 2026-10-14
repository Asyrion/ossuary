/* Dr. Jelly's laboratory in the room kit's style (docs/archive/M5-plan.md; GDD: Potions and alchemy): the glass globes
   of glowing jelly on their iron stands, the alchemy table with its alembic, burner and racks, Dr. Jelly (jellyLooks.ts) and the great arched window on the north wall, behind which the
   jelly serpent coils in its vat. Built in code as the other pieces are (objectLooks.ts, specialLooks.ts): painted pieces
   merged into a few meshes (`mergeStill`), green glowing jelly as the room's light (no lights are added: a light more
   would make every material compile again). What they do is world/laboratory.ts. */
import * as THREE from 'three';
import { blob, glow, glowShared, markShared, mergeStill } from '../render/materials';
import { firePalette, makeFire } from '../render/fire';
import { curve, glowTone, mesh, shade, taperTube, tone } from './kitParts';
import { box, put } from './objectLooks';

const V = (x: number, y: number) => new THREE.Vector2(x, y);
const lathe = (pts: number[][], seg = 10) =>
  new THREE.LatheGeometry(
    pts.map(([x, y]) => V(x, y)),
    seg,
  );
const cyl = (r0: number, r1: number, h: number, seg = 8) => new THREE.CylinderGeometry(r0, r1, h, seg);
const tube = (g: THREE.Object3D, pts: number[][], r0: number, r1: number, mat: THREE.Material, segs = 8) =>
  mesh(g, taperTube(curve(pts), segs, r0, r1, 5), mat);
const metal = (c: number) => tone(c, 0.05, 0.5);

/** The laboratory's colours: its jelly, the glass, iron, copper and the old oak of the table. */
export const JELLY = 0x7ae070,
  JELLY_DEEP = 0x2e8a4a,
  JELLY_PALE = 0xc8ffb0,
  VAT_DEEP = 0x123a1c,
  VAT_EMPTY = 0x0e2a16; // (the vat's jelly darker than the serpent in it, so it shows)
const GLASS = 0x9ebed8,
  IRON = 0x3a383c,
  COPPER = 0xa8683a,
  OAK = 0x5a3e26,
  OAK_DARK = 0x3e2a1a;

/** A glass globe of glowing jelly on a three-legged iron stand, bubbles hanging in it. */
export function globeLook(R: () => number) {
  const g = new THREE.Group(),
    iron = metal(IRON);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + R();
    tube(
      g,
      [
        [Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2],
        [Math.cos(a) * 0.12, 0.25, Math.sin(a) * 0.12],
        [Math.cos(a) * 0.1, 0.42, Math.sin(a) * 0.1],
      ],
      0.02,
      0.015,
      iron,
      5,
    );
  }
  put(mesh(g, new THREE.TorusGeometry(0.12, 0.018, 4, 12), iron, 0, 0.42, 0), Math.PI / 2);
  mesh(g, new THREE.SphereGeometry(0.24, 12, 9), glowTone(JELLY), 0, 0.62, 0);
  put(mesh(g, new THREE.SphereGeometry(0.15, 8, 6), glowTone(JELLY_DEEP), 0.04, 0.58, 0.12), 0, 0, 0, [1, 0.7, 0.4]); // (a darker swirl inside)
  for (let i = 0; i < 4; i++)
    mesh(
      g,
      new THREE.SphereGeometry(0.025 + R() * 0.02, 5, 4),
      glowTone(JELLY_PALE),
      (R() - 0.5) * 0.25,
      0.52 + R() * 0.2,
      0.17 + R() * 0.05,
    );
  mesh(g, cyl(0.05, 0.06, 0.08, 7), tone(GLASS, 0.04, 0.35), 0, 0.88, 0);
  mesh(g, cyl(0.06, 0.055, 0.03, 7), metal(COPPER), 0, 0.93, 0);
  const gl = glowShared(JELLY, 1.4, 0.5);
  gl.position.y = 0.62;
  g.add(gl);
  g.add(blob(0.6));
  return g;
}

/** The alchemy table: a long oak table on turned legs; on it an alembic over a burner of green fire, a rack of vials, a
    mortar and pestle and loose papers. `fire` (the burner's flame, moved each step) in `userData.parts`. */
export function tableLook() {
  const g = new THREE.Group(),
    oak = tone(OAK, 0.14),
    dark = tone(OAK_DARK, 0.1),
    iron = metal(IRON),
    copper = metal(COPPER);
  box(g, 1.5, 0.07, 0.74, oak, 0, 0.66, 0);
  box(g, 1.42, 0.05, 0.66, dark, 0, 0.6, 0);
  for (const [x, z] of [
    [-0.66, -0.3],
    [0.66, -0.3],
    [-0.66, 0.3],
    [0.66, 0.3],
  ])
    mesh(
      g,
      lathe(
        [
          [0.05, 0],
          [0.06, 0.05],
          [0.04, 0.15],
          [0.05, 0.3],
          [0.035, 0.45],
          [0.045, 0.6],
          [0, 0.6],
        ],
        7,
      ),
      dark,
      x,
      0,
      z,
    );
  box(g, 1.3, 0.04, 0.04, dark, 0, 0.15, -0.3);
  box(g, 1.3, 0.04, 0.04, dark, 0, 0.15, 0.3);
  // the alembic: a round copper pot over the burner, its long neck curving down into a glass flask of green
  const ax = -0.25,
    top = 0.7;
  box(g, 0.22, 0.06, 0.22, iron, ax, top + 0.03, 0);
  mesh(
    g,
    lathe(
      [
        [0, 0],
        [0.13, 0.01],
        [0.16, 0.08],
        [0.14, 0.17],
        [0.07, 0.22],
        [0.05, 0.28],
        [0, 0.29],
      ],
      10,
    ),
    copper,
    ax,
    top + 0.12,
    0,
  );
  tube(
    g,
    [
      [ax, top + 0.4, 0],
      [ax + 0.1, top + 0.5, 0],
      [ax + 0.3, top + 0.42, 0],
      [ax + 0.44, top + 0.25, 0],
    ],
    0.025,
    0.015,
    copper,
    8,
  );
  mesh(
    g,
    lathe(
      [
        [0, 0],
        [0.08, 0.01],
        [0.1, 0.07],
        [0.07, 0.13],
        [0.03, 0.16],
        [0.025, 0.22],
        [0, 0.22],
      ],
      10,
    ),
    glowTone(JELLY),
    ax + 0.46,
    top,
    0,
  );
  const fire = makeFire([{ x: ax, y: top + 0.06, z: 0, h: 0.1, w: 0.07 }], firePalette(JELLY_PALE, JELLY), 0);
  // a rack of vials, each its own colour
  box(g, 0.34, 0.05, 0.1, dark, 0.38, top + 0.03, -0.2);
  [0xe0475a, 0x4a8cff, 0xff7a2a, 0xb49aff, 0x40c8a0].forEach((c, i) => {
    mesh(g, cyl(0.022, 0.022, 0.13, 6), glowTone(c), 0.25 + i * 0.065, top + 0.1, -0.2);
    mesh(g, cyl(0.016, 0.016, 0.02, 5), tone(0x8a6a44, 0.1), 0.25 + i * 0.065, top + 0.175, -0.2);
  });
  // a mortar and pestle, and papers
  mesh(
    g,
    lathe(
      [
        [0, 0],
        [0.07, 0],
        [0.09, 0.04],
        [0.08, 0.08],
        [0.06, 0.08],
        [0.05, 0.03],
        [0, 0.03],
      ],
      9,
    ),
    tone(0x8a8478, 0.12),
    0.45,
    top,
    0.18,
  );
  put(mesh(g, cyl(0.015, 0.02, 0.16, 5), tone(0x8a8478, 0.1), 0.47, top + 0.1, 0.18), 0, 0, 0.5);
  for (const [x, z, a] of [
    [0.05, 0.2, 0.3],
    [0.15, 0.14, -0.4],
  ])
    put(box(g, 0.2, 0.005, 0.26, tone(0xe0d0aa, 0.06), x, top + 0.005, z), 0, a, 0, [0.2, 0.005, 0.26]);
  const gl = glowShared(JELLY, 1, 0.3);
  gl.position.set(ax + 0.2, top + 0.45, 0);
  g.add(gl);
  g.add(blob(1.6));
  g.userData.parts = { fire };
  mergeStill(g);
  return g;
}

/** The glass of the vat window, and the cracks a bolt leaves in it: shared by every laboratory. */
let glassMat: THREE.MeshBasicMaterial | null = null,
  crackMat: THREE.MeshBasicMaterial | null = null;
const glassOf = () =>
  (glassMat ??= markShared(
    new THREE.MeshBasicMaterial({ color: JELLY_PALE, transparent: true, opacity: 0.1, depthWrite: false }),
  ));
const crackOf = () => (crackMat ??= markShared(new THREE.MeshBasicMaterial({ color: 0xf0fff0 })));

/** The arched window on the north wall: a deep stone frame and leaded panes, the vat's dark green jelly behind, the jelly
    serpent coiled in it behind the glass (a chain of glowing rings that turns slowly). Built facing +z, its foot on the
    floor, `w` wide. In `userData`: `serpent` and `head` (moved each step), `glass` and the three stages of `cracks` (shown
    as bolts strike it), `back` (the jelly, darkened when the vat is empty) and `glow`. `broken`: the glass gone and the
    vat empty (the serpent is out). */
export function vatWindowLook(stone: number, w = 2, broken = false) {
  const g = new THREE.Group(),
    st = tone(stone, 0.12),
    dark = tone(shade(stone, 0.7), 0.1),
    lead = metal(0x2a2a2a),
    h = 0.98,
    r = w / 2,
    spring = h - r * 0.4; // (the arch springs here; its crown just under the wall's top)
  const D = 0.26,
    F = 0.1; // (the frame's depth, and the middle of it, out from the wall)
  // the frame: jambs and an arch of voussoirs standing out from the wall, so the serpent sits inside it; the sill
  for (const s of [-1, 1]) box(g, 0.16, spring - 0.1, D, st, s * (r + 0.02), (spring - 0.1) / 2 + 0.1, F);
  for (let i = 0; i <= 8; i++) {
    const a = (Math.PI * i) / 8,
      x = Math.cos(a) * (r + 0.04),
      y = spring + Math.sin(a) * (r * 0.4 + 0.02);
    put(box(g, 0.3, 0.14, D + 0.01, i % 2 ? dark : st, x, y, F), 0, 0, a - Math.PI / 2, [0.3, 0.14, D + 0.01]);
  } // (voussoirs wide enough to meet: one arch)
  box(g, w + 0.3, 0.1, D + 0.08, st, 0, 0.08, F + 0.02);
  const pane = new THREE.Shape();
  pane.moveTo(-r, 0.15);
  pane.lineTo(r, 0.15);
  pane.lineTo(r, spring);
  pane.absellipse(0, spring, r, r * 0.4, 0, Math.PI, false, 0);
  pane.lineTo(-r, 0.15);
  mergeStill(g);
  // the vat behind: dark jelly, darker still when it stands empty (its own mesh, to darken when the serpent breaks out)
  const back = mesh(g, new THREE.ShapeGeometry(pane, 12), glowTone(broken ? VAT_EMPTY : VAT_DEEP), 0, 0, -0.02);
  // the serpent: rings of jelly coiled in the vat, its head raised, two pale eyes (gone when it is out)
  const serpent = new THREE.Group();
  serpent.position.set(0, 0.16, 0.08);
  serpent.visible = !broken;
  g.add(serpent);
  const ring = new THREE.TorusGeometry(0.085, 0.055, 5, 10);
  for (let i = 0; i < 12; i++) {
    const a = i * 0.6,
      rr = 0.42 - i * 0.02;
    const m = mesh(
      serpent,
      ring,
      glowTone(i % 2 ? JELLY : 0x5ac860),
      Math.cos(a) * rr,
      0.06 + i * 0.035,
      Math.sin(a) * rr * 0.12,
    );
    m.rotation.y = a;
  }
  mergeStill(serpent);
  const head = new THREE.Group();
  head.position.set(0.05, 0.52, 0.02);
  head.userData.y = 0.52;
  serpent.add(head); // (apart from the coil, so it can lift and sway)
  put(mesh(head, new THREE.SphereGeometry(0.12, 8, 6), glowTone(JELLY_PALE)), 0, 0, 0, [1.3, 0.8, 0.7]);
  for (const x of [-0.06, 0.06]) mesh(head, new THREE.SphereGeometry(0.03, 5, 4), glowTone(0x0e2a16), x, 0.03, 0.08);
  mergeStill(head);
  // the glass in front of it, the lead between the panes, and the cracks bolts leave
  const front = new THREE.Group();
  g.add(front);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(pane, 12), glassOf());
  glass.position.z = 0.2;
  glass.visible = !broken;
  front.add(glass);
  const bars = new THREE.Group();
  bars.visible = !broken;
  front.add(bars);
  for (let i = 1; i < 4; i++) {
    const x = -r + (i * w) / 4,
      top = spring + Math.sqrt(Math.max(0, 1 - (x / r) ** 2)) * r * 0.4 - 0.02;
    box(bars, 0.025, top - 0.15, 0.03, lead, x, (top - 0.15) / 2 + 0.15, 0.21);
  }
  for (let i = 1; i < 3; i++) box(bars, w, 0.025, 0.03, lead, 0, 0.15 + i * 0.26, 0.21);
  mergeStill(bars);
  // once broken: the lead twisted away, shards of glass left in the frame
  const shards = new THREE.Group();
  shards.visible = broken;
  front.add(shards);
  for (let i = 0; i < 8; i++) {
    const x = -r + 0.08 + (i % 4) * 0.1 + (i > 3 ? w - 0.46 : 0),
      y = 0.2 + ((i * 37) % 5) * 0.07;
    put(
      mesh(shards, new THREE.ConeGeometry(0.05, 0.24, 3), tone(0xb8d8c0, 0.05, 0.3), x, y, 0.21),
      0,
      0,
      (i % 2 ? 0.35 : -0.35) + Math.PI,
    );
  }
  for (const [x, y, a] of [
    [-r, 0.45, 0.5],
    [r, 0.4, -0.6],
    [-r + 0.1, 0.8, -0.3],
  ])
    put(box(shards, 0.4, 0.025, 0.03, lead, x + (x < 0 ? 0.2 : -0.2), y, 0.21), 0, 0, a, [0.4, 0.025, 0.03]);
  mergeStill(shards);
  // three stages of cracks, spreading from where the bolts strike (low in the middle of the glass)
  const cracks = [0, 1, 2].map((k) => {
    const c = new THREE.Group();
    c.visible = false;
    front.add(c);
    const n = 3 + k * 2,
      cx = (k - 1) * 0.25,
      cy = 0.42 + k * 0.05;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + k * 0.7,
        len = 0.18 + ((i * 53 + k * 17) % 7) * 0.04;
      put(
        box(c, len, 0.016, 0.01, crackOf(), cx + (Math.cos(a) * len) / 2, cy + (Math.sin(a) * len) / 2, 0.215),
        0,
        0,
        a,
        [len, 0.016, 0.01],
      );
    }
    mergeStill(c);
    return c;
  });
  const gl = glow(JELLY, w * 1.1, broken ? 0.15 : 0.3);
  gl.position.set(0, h * 0.55, 0.25);
  g.add(gl);
  g.userData = { serpent, head, glow: gl, glass, cracks, back, bars, shards };
  return g;
}
