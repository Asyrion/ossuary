/* The artifacts in the room kit's style (M3.5 step 3; docs/archive/M3.5-plan.md): each one built in code as what it is, a wand,
   a pair of boots, a ram's skull, a leech in a jar, in its own colour (`color` in data/artifacts.json) with a glowing part
   where its magic sits. They float over their pedestals (`makeArtifactVisual` in artifacts.ts; the merchant's wares and the
   shrine's stones too), and the HUD's icons are rendered from them (artifactIcons.ts), so what the mage picks up and what
   the HUD shows are the same thing. About half a unit tall, built about their middle, facing +z. Keyed by the artifact's
   `icon`. */
import * as THREE from 'three';
import { glowTone, curve, mesh, runeStrokes, shade, shared, taperTube, tone } from '../world/kitParts';
import { C, bone, box, put, skull } from '../world/objectLooks';

type Build = (g: THREE.Group, c: number) => void;
/** A cursed artifact's light (its glow over the pedestal, the rim of its icon). */
export const CURSED_RED = 0xb0201a;
const V = (x: number, y: number) => new THREE.Vector2(x, y);
/** A shape turned round the upright from its outline, given from the bottom up. */
const lathe = (pts: number[][], seg = 10) =>
  new THREE.LatheGeometry(
    pts.map(([x, y]) => V(x, y)),
    seg,
  );
const cyl = (r0: number, r1: number, h: number, seg = 7) => new THREE.CylinderGeometry(r0, r1, h, seg);
const ball = (r: number, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
/** A stick from a to b (points [x, y, z]), `r` thick. */
function stick(g: THREE.Object3D, a: number[], b: number[], r: number, mat: THREE.Material, r1 = r) {
  const A = new THREE.Vector3(...a),
    B = new THREE.Vector3(...b),
    d = B.clone().sub(A);
  const m = mesh(g, cyl(r1, r, d.length(), 6), mat);
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}
const tube = (g: THREE.Object3D, pts: number[][], r0: number, r1: number, mat: THREE.Material, segs = 12) =>
  mesh(g, taperTube(curve(pts), segs, r0, r1, 5), mat);

const WOOD = 0x6e4c30,
  DARKWOOD = 0x3e2a1a,
  GOLD = 0xc49a4a,
  BRONZE = 0xa27a3e,
  BRASS = 0xb8963a,
  IRON = 0x4a464c,
  SILVER = 0xb8bcc4,
  LEATHER = 0x6a3a24;
const metal = (c: number) => tone(c, 0.05, 0.45);
const GEO = {
  gem: shared(new THREE.OctahedronGeometry(1, 0)),
  rune: shared(runeStrokes(0.08)),
  coin: shared(cyl(0.1, 0.1, 0.025, 10)),
};
/** A gem of colour `c`, glowing: an octahedron `r` across, drawn out `long` times. */
const gem = (g: THREE.Object3D, c: number, r: number, x = 0, y = 0, z = 0, long = 1.4) =>
  put(mesh(g, GEO.gem, glowTone(c), x, y, z), 0, Math.PI / 4, 0, [r, r * long, r]);
/** A lantern of glass glowing `c`: a cap, bars, a base, a ring to carry it. */
function lantern(g: THREE.Object3D, c: number) {
  mesh(g, cyl(0.07, 0.07, 0.18, 6), glowTone(c), 0, 0, 0);
  mesh(g, new THREE.ConeGeometry(0.11, 0.09, 6), metal(IRON), 0, 0.135, 0);
  mesh(g, cyl(0.1, 0.08, 0.04, 6), metal(IRON), 0, -0.11, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    mesh(g, cyl(0.009, 0.009, 0.19, 4), metal(IRON), Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08);
  }
  mesh(g, new THREE.TorusGeometry(0.04, 0.012, 4, 10), metal(IRON), 0, 0.2, 0);
}
/** A book `c`-bound, closed, with metal corners and a clasp. */
function book(g: THREE.Object3D, c: number, corner = GOLD) {
  box(g, 0.3, 0.38, 0.08, tone(c, 0.06), 0, 0, 0);
  box(g, 0.28, 0.36, 0.065, tone(0xe8dcc0, 0.04), 0.012, 0, 0);
  for (const [x, y] of [
    [-0.13, 0.17],
    [0.13, 0.17],
    [-0.13, -0.17],
    [0.13, -0.17],
  ])
    box(g, 0.06, 0.06, 0.09, metal(corner), x, y, 0);
  box(g, 0.06, 0.05, 0.1, metal(corner), 0.15, 0, 0);
}

export const ARTIFACT_LOOKS: Record<string, Build> = {
  // ---------- foci ----------
  wand(g, c) {
    // a pale wand, its grip bound, a star of light at its tip
    const w = new THREE.Group();
    w.rotation.z = -0.6;
    g.add(w);
    mesh(w, cyl(0.012, 0.026, 0.5), tone(0xd8c7a4, 0.08), 0, 0, 0);
    for (const y of [-0.17, -0.12]) mesh(w, cyl(0.03, 0.03, 0.025, 7), tone(LEATHER), 0, y, 0);
    gem(w, c, 0.06, 0, 0.29, 0, 1.6);
  },
  staff(g, c) {
    // a short staff forking in two, an orb held in each prong
    mesh(g, cyl(0.018, 0.024, 0.4), tone(WOOD, 0.1), 0, -0.1, 0);
    for (const s of [-1, 1]) {
      tube(
        g,
        [
          [0, 0.08, 0],
          [s * 0.06, 0.16, 0],
          [s * 0.1, 0.24, 0],
        ],
        0.02,
        0.013,
        tone(WOOD, 0.1),
        6,
      );
      mesh(g, ball(0.045), glowTone(c), s * 0.11, 0.28, 0);
    }
    mesh(g, cyl(0.028, 0.028, 0.03, 7), metal(BRONZE), 0, 0.08, 0);
  },
  orb(g, c) {
    // a sea-glass orb with a wave caught in it, in a bronze claw
    mesh(g, ball(0.15, 12, 10), glowTone(shade(c, 0.7)), 0, 0.05, 0);
    put(mesh(g, new THREE.TorusGeometry(0.1, 0.02, 4, 16), glowTone(shade(c, 1.4)), 0, 0.05, 0), 0.9, 0, 0.3);
    mesh(g, cyl(0.06, 0.09, 0.05, 8), metal(BRONZE), 0, -0.14, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      tube(
        g,
        [
          [Math.cos(a) * 0.06, -0.13, Math.sin(a) * 0.06],
          [Math.cos(a) * 0.13, -0.07, Math.sin(a) * 0.13],
          [Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1],
        ],
        0.014,
        0.008,
        metal(BRONZE),
        5,
      );
    }
  },
  crook(g, c) {
    // a shepherd's crook, a bell of light hung from its hook
    tube(
      g,
      [
        [0, -0.27, 0],
        [0, 0.08, 0],
        [0, 0.18, 0],
        [0.06, 0.26, 0],
        [0.13, 0.22, 0],
        [0.13, 0.14, 0],
      ],
      0.022,
      0.016,
      tone(0xb08a5a, 0.1),
      16,
    );
    mesh(g, ball(0.035), glowTone(c), 0.13, 0.09, 0);
  },
  censer(g, c) {
    // a censer on three short chains, smoke glowing through it
    mesh(
      g,
      lathe([
        [0, -0.08],
        [0.07, -0.075],
        [0.11, -0.03],
        [0.11, 0.01],
      ]),
      metal(SILVER),
      0,
      0,
      0,
    );
    mesh(
      g,
      lathe([
        [0.11, 0.01],
        [0.09, 0.05],
        [0.04, 0.08],
        [0, 0.09],
      ]),
      metal(SILVER),
      0,
      0,
      0,
    );
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      mesh(g, ball(0.014, 5, 3), glowTone(c), Math.cos(a) * 0.11, -0.01, Math.sin(a) * 0.11);
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      stick(g, [Math.cos(a) * 0.09, 0.02, Math.sin(a) * 0.09], [0, 0.25, 0], 0.006, metal(IRON));
    }
    mesh(g, new THREE.TorusGeometry(0.03, 0.01, 4, 8), metal(IRON), 0, 0.26, 0);
  },
  spear(g, c) {
    // a spear of pale steel, its blade a long leaf
    const s = new THREE.Group();
    s.rotation.z = -0.55;
    g.add(s);
    mesh(s, cyl(0.014, 0.016, 0.5), tone(DARKWOOD, 0.1), 0, -0.05, 0);
    put(mesh(s, GEO.gem, metal(c), 0, 0.28, 0), 0, 0, 0, [0.05, 0.14, 0.015]);
    box(s, 0.1, 0.02, 0.03, metal(IRON), 0, 0.2, 0);
  },
  serpent(g, c) {
    // a rod with a serpent coiled up it, its eyes lit
    mesh(g, cyl(0.014, 0.018, 0.52), tone(DARKWOOD, 0.1), 0, 0, 0);
    const pts: number[][] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16,
        a = t * Math.PI * 5;
      pts.push([Math.cos(a) * 0.045, -0.24 + t * 0.46, Math.sin(a) * 0.045]);
    }
    tube(g, pts, 0.012, 0.022, tone(c, 0.1), 40);
    mesh(g, ball(0.035), tone(c, 0.1), 0, 0.25, 0.03).scale.set(1, 0.8, 1.3);
    for (const s of [-1, 1]) mesh(g, ball(0.008, 4, 3), glowTone(0xffe070), s * 0.02, 0.26, 0.07);
  },
  emberwood(g, c) {
    // a charred wand, embers glowing in its cracks, a flame crystal at its tip
    const w = new THREE.Group();
    w.rotation.z = -0.6;
    g.add(w);
    mesh(w, cyl(0.014, 0.03, 0.5), tone(0x2a1a14, 0.1), 0, 0, 0);
    for (const y of [-0.1, 0.02, 0.12])
      put(mesh(w, cyl(0.031, 0.031, 0.012, 6), glowTone(c)), 0, 0, 0.15, 1).position.y = y;
    gem(w, 0xffa040, 0.06, 0, 0.29, 0, 1.8);
  },
  tome(g, c) {
    // a book of whispers, a rune glowing on its cover
    book(g, c, SILVER);
    put(mesh(g, GEO.rune, glowTone(shade(c, 1.6)), 0, 0, 0.045), 0, 0, 0, 1.4);
  },
  // ---------- passives ----------
  sigil(g, c) {
    // a bronze sigil, a gem of ember light set in it
    mesh(g, cyl(0.16, 0.16, 0.03, 12).rotateX(Math.PI / 2), metal(BRONZE), 0, 0, 0);
    mesh(g, new THREE.TorusGeometry(0.13, 0.012, 4, 16), metal(shade(BRONZE, 0.7)), 0, 0, 0.02);
    gem(g, c, 0.07, 0, 0, 0.04, 1.5);
  },
  boots(g, c) {
    // a pair of pilgrim's boots
    for (const s of [-1, 1]) {
      mesh(g, cyl(0.06, 0.065, 0.2, 8), tone(c, 0.1), s * 0.08, 0.02, 0);
      box(g, 0.11, 0.07, 0.2, tone(shade(c, 0.85), 0.1), s * 0.08, -0.1, 0.05);
      mesh(g, cyl(0.066, 0.066, 0.025, 8), tone(shade(c, 0.6)), s * 0.08, 0.1, 0);
    }
  },
  beads(g, c) {
    // a rosary: a loop of beads, a pendant hanging from it
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      mesh(g, ball(0.028, 6, 4), tone(c, 0.05), Math.cos(a) * 0.14, 0.05 + Math.sin(a) * 0.14, 0);
    }
    stick(g, [0, -0.09, 0], [0, -0.18, 0], 0.006, tone(0x6a5a44));
    gem(g, shade(c, 1.2), 0.04, 0, -0.21, 0);
  },
  lens(g, c) {
    // a lens ground from bone, in a rim of little teeth, hung on a chain of finger bones
    mesh(g, cyl(0.13, 0.13, 0.03, 14).rotateX(Math.PI / 2), glowTone(shade(c, 0.8)), 0, 0, 0);
    mesh(g, new THREE.TorusGeometry(0.135, 0.028, 5, 16), tone(C.bone, 0.05), 0, 0, 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      put(
        mesh(g, new THREE.ConeGeometry(0.018, 0.05, 4), tone(C.boneOld), Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0),
        0,
        0,
        a - Math.PI / 2,
      );
    }
    for (let i = 0; i < 3; i++) mesh(g, cyl(0.012, 0.012, 0.05, 5), tone(C.bone, 0.05), 0, 0.21 + i * 0.055, 0);
  },
  shard(g, c) {
    // a shard of red crystal bound in gold wire
    put(mesh(g, GEO.gem, glowTone(c), 0, 0, 0), 0.2, 0.6, 0.15, [0.09, 0.24, 0.07]);
    put(mesh(g, new THREE.TorusGeometry(0.07, 0.01, 4, 10), metal(GOLD), 0, -0.05, 0), Math.PI / 2 - 0.2, 0, 0.15);
  },
  knuckle(g, c) {
    // a saint's knucklebone tied with a red thread, a gold cap on it
    bone(g, 0, 0, 0, 0.4, -0.4, true, c);
    mesh(g, cyl(0.03, 0.03, 0.03, 6), tone(0x9a1e18), 0, 0, 0);
    put(mesh(g, cyl(0.04, 0.04, 0.04, 7), metal(GOLD), 0.1, 0.06, 0), 0, 0, -1.2);
  },
  bell(g, c) {
    // a hand bell of bronze, its clapper hanging
    mesh(
      g,
      lathe(
        [
          [0, -0.16],
          [0.14, -0.16],
          [0.12, -0.12],
          [0.08, 0.05],
          [0.03, 0.08],
          [0, 0.09],
        ],
        12,
      ),
      metal(c),
      0,
      0,
      0,
    );
    stick(g, [0, 0.08, 0], [0, 0.24, 0], 0.018, tone(DARKWOOD, 0.1), 0.022);
    mesh(g, ball(0.028), metal(IRON), 0, -0.17, 0);
  },
  chisel(g, c) {
    // a mason's chisel: a steel blade, a wooden handle
    const s = new THREE.Group();
    s.rotation.z = -0.7;
    g.add(s);
    mesh(s, cyl(0.045, 0.05, 0.22, 8), tone(WOOD, 0.1), 0, -0.12, 0);
    mesh(s, cyl(0.052, 0.052, 0.03, 8), metal(IRON), 0, -0.01, 0);
    put(box(s, 0.08, 0.24, 0.05, metal(c), 0, 0.1, 0), 0, 0, 0, [0.08, 0.24, 0.05]);
    put(box(s, 0.08, 0.04, 0.02, metal(shade(c, 1.3)), 0, 0.23, 0), 0, 0, 0, [0.08, 0.04, 0.02]);
  },
  eye(g, c) {
    // a raven's eye in a ring of black feathers
    mesh(g, ball(0.1, 10, 8), tone(0xe8e4d8, 0.03), 0, 0, 0);
    mesh(g, ball(0.05, 8, 6), glowTone(c), 0, 0, 0.065);
    mesh(g, ball(0.022, 6, 4), tone(0x0a0808), 0, 0, 0.1);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      put(
        mesh(g, GEO.gem, tone(0x1a1820, 0.1), Math.cos(a) * 0.16, Math.sin(a) * 0.16, -0.02),
        0,
        0,
        a - Math.PI / 2,
        [0.03, 0.07, 0.01],
      );
    }
  },
  mirror(g, c) {
    // a hand mirror, its glass cracked
    put(
      mesh(g, cyl(0.11, 0.11, 0.015, 14).rotateX(Math.PI / 2), glowTone(shade(c, 0.75)), 0, 0.07, 0),
      0,
      0,
      0,
      [1, 1.3, 1],
    );
    put(mesh(g, new THREE.TorusGeometry(0.115, 0.018, 4, 16), metal(SILVER), 0, 0.07, 0), 0, 0, 0, [1, 1.3, 1]);
    stick(g, [0, -0.08, 0], [0, -0.26, 0], 0.018, metal(SILVER), 0.024);
    for (const [a, b] of [
      [
        [-0.02, 0.15, 0.01],
        [0.02, 0.07, 0.01],
      ],
      [
        [0.02, 0.07, 0.01],
        [-0.03, 0.0, 0.01],
      ],
    ])
      stick(g, a, b, 0.004, tone(0x1a2028));
  },
  feather(g, c) {
    // two hawk's feathers bound with a bone ring (leaning back)
    g = lean(g);
    for (const [s, a] of [
      [-1, 0.35],
      [1, -0.25],
    ]) {
      const f = new THREE.Group();
      f.rotation.z = a;
      g.add(f);
      put(mesh(f, ball(0.07, 8, 6), tone(c, 0.08), s * 0.03, 0.06, 0), 0, 0, 0, [0.8, 2.6, 0.15]);
      stick(f, [s * 0.03, -0.14, 0], [s * 0.03, 0.22, 0], 0.006, tone(0xe8e0c8));
    }
    mesh(g, new THREE.TorusGeometry(0.03, 0.012, 4, 10), tone(C.bone), 0, -0.1, 0).rotation.x = Math.PI / 2;
  },
  ram(g, c) {
    // a ram's skull, its horns curled
    skull(g, 0, 0, 0, 0, 0, 1.1, c);
    for (const s of [-1, 1]) {
      const pts: number[][] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10,
          a = t * Math.PI * 1.6;
        pts.push([s * (0.1 + Math.sin(a) * 0.09 + t * 0.05), 0.08 + Math.cos(a) * 0.09 - t * 0.05, -0.02 + t * 0.06]);
      }
      tube(g, pts, 0.035, 0.012, tone(shade(c, 0.75), 0.1), 16);
    }
  },
  satchel(g, c) {
    // M5: a satchel of oiled leather, its flap buckled, two bottles poking out of it
    box(g, 0.3, 0.22, 0.12, tone(c, 0.1), 0, -0.04, 0);
    box(g, 0.31, 0.1, 0.13, tone(shade(c, 0.8), 0.1), 0, 0.04, 0.005);
    box(g, 0.05, 0.06, 0.02, metal(BRASS), 0, 0.0, 0.07);
    for (const [x, col] of [
      [-0.07, 0x7ae070],
      [0.06, 0xe0475a],
    ] as [number, number][]) {
      mesh(g, cyl(0.025, 0.025, 0.12, 6), glowTone(col), x, 0.11, -0.02);
      mesh(g, cyl(0.018, 0.018, 0.03, 5), tone(0x8a6a44, 0.1), x, 0.18, -0.02);
    }
    put(mesh(g, new THREE.TorusGeometry(0.13, 0.014, 4, 12, Math.PI), tone(shade(c, 0.8), 0.1), 0, 0.07, 0), 0, 0, 0);
  },
  spoon(g, c) {
    // M5: a silver spoon on a cord, worn thin at the bowl
    put(mesh(g, ball(0.07, 10, 6), metal(c), 0, -0.12, 0.01), 0, 0, 0, [1, 1.35, 0.35]);
    stick(g, [0, -0.04, 0], [0, 0.17, 0], 0.012, metal(c));
    mesh(g, ball(0.022, 6, 4), metal(c), 0, 0.18, 0);
    put(mesh(g, new THREE.TorusGeometry(0.05, 0.008, 4, 12), tone(0x6a5a3e, 0.1), 0, 0.24, 0), 0, 0, 0);
  },
  retort(g, c) {
    // M5: a glass retort, a crack along its neck, a little green still in its belly
    mesh(g, ball(0.13, 12, 9), glowTone(shade(c, 0.75)), -0.06, -0.06, 0);
    mesh(g, ball(0.135, 12, 9), tone(0xd8e8f0, 0.04, 0.3), -0.06, -0.05, -0.01).scale.set(1, 1, 0.4);
    tube(
      g,
      [
        [-0.02, 0.05, 0],
        [0.06, 0.14, 0],
        [0.16, 0.12, 0],
        [0.24, 0.02, 0],
      ],
      0.045,
      0.018,
      glowTone(shade(c, 0.9)),
      10,
    );
    put(box(g, 0.1, 0.01, 0.01, tone(0x203018), 0.1, 0.13, 0.03), 0, 0, 0.5, [0.1, 0.01, 0.01]);
    mesh(g, cyl(0.11, 0.13, 0.03, 8), metal(IRON), -0.06, -0.2, 0);
  },
  jar(g, c) {
    // a leech in a jar, the jar corked
    mesh(
      g,
      lathe(
        [
          [0, -0.16],
          [0.1, -0.16],
          [0.11, -0.12],
          [0.11, 0.08],
          [0.08, 0.12],
          [0.07, 0.15],
          [0, 0.15],
        ],
        10,
      ),
      glowTone(0x6a3a3a),
      0,
      0,
      0,
    );
    tube(
      g,
      [
        [-0.05, -0.1, 0.1],
        [0.03, -0.04, 0.11],
        [-0.02, 0.03, 0.11],
        [0.04, 0.07, 0.1],
      ],
      0.025,
      0.018,
      tone(c, 0.1),
      10,
    );
    mesh(g, cyl(0.07, 0.06, 0.05, 8), tone(0xa08058, 0.1), 0, 0.17, 0);
  },
  moth(g, c) {
    // a pale moth, eyes on its wings (leaning back: flat, it would turn edge-on)
    g = lean(g);
    put(mesh(g, ball(0.035, 6, 5), tone(shade(c, 0.8), 0.05), 0, 0, 0), 0, 0, 0, [1, 2.6, 1]);
    for (const s of [-1, 1]) {
      put(mesh(g, ball(0.1, 8, 4), tone(c, 0.06), s * 0.1, 0.04, 0), 0, 0, s * 0.5, [1, 0.75, 0.12]);
      put(mesh(g, ball(0.06, 8, 4), tone(shade(c, 0.9), 0.06), s * 0.07, -0.07, 0), 0, 0, -s * 0.5, [1, 0.75, 0.12]);
      mesh(g, ball(0.02, 5, 3), glowTone(0x6a5aa0), s * 0.11, 0.05, 0.02);
      stick(g, [s * 0.01, 0.09, 0], [s * 0.05, 0.17, 0.02], 0.004, tone(0x4a3a2a));
    }
  },
  foxrune(g, c) {
    // a disc of indigo stone, a fox's face cut in it in rune-light (leaning back, to face the room)
    g = lean(g);
    put(mesh(g, cyl(0.16, 0.16, 0.05, 14), tone(0x2a2260, 0.08), 0, 0, 0), Math.PI / 2, 0, 0);
    mesh(g, new THREE.TorusGeometry(0.16, 0.014, 4, 20), tone(GOLD, 0.05, 0.45), 0, 0, 0);
    for (const s of [-1, 1]) {
      put(mesh(g, new THREE.ConeGeometry(0.045, 0.1, 3), glowTone(c), s * 0.06, 0.07, 0.03), 0, 0, -s * 0.3);
      mesh(g, ball(0.018, 5, 4), glowTone(c), s * 0.045, 0, 0.03);
    }
    put(mesh(g, new THREE.ConeGeometry(0.05, 0.1, 3), glowTone(c), 0, -0.055, 0.03), 0, 0, Math.PI);
  },
  skull(g, c) {
    // a weeping skull, its tears glowing
    skull(g, 0, 0, 0, 0, 0, 1.3, c);
    for (const s of [-1, 1])
      for (const [dy, r] of [
        [-0.07, 0.014],
        [-0.12, 0.01],
      ])
        mesh(g, ball(r, 5, 4), glowTone(shade(c, 1.2)), s * 0.06, dy, 0.15);
  },
  oath(g, c) {
    // an oath rolled and tied with gold, a heart of gold sealing it
    put(mesh(g, cyl(0.05, 0.05, 0.36, 8), tone(0xe0d4b4, 0.05), 0, 0, 0), 0, 0, Math.PI / 2);
    mesh(g, new THREE.TorusGeometry(0.052, 0.01, 4, 10), metal(GOLD), 0, 0, 0).rotation.y = Math.PI / 2;
    heart(g, glowTone(c), 0, 0.02, 0.07, 0.45);
  },
  leadheart(g, c) {
    // a heart of lead, strapped across with iron and nailed
    heart(g, tone(c, 0.08, 0.3), 0, 0, 0, 1.1);
    put(box(g, 0.36, 0.035, 0.13, metal(IRON), 0, 0.02, 0), 0, 0, -0.35, [0.36, 0.035, 0.13]);
    for (const x of [-0.1, 0.1]) mesh(g, ball(0.018, 5, 3), metal(shade(IRON, 1.4)), x, 0.02 - x * 0.36, 0.07);
  },
  covenant(g, c) {
    // a covenant on parchment, signed and sealed in blood
    box(g, 0.28, 0.36, 0.015, tone(0xd8c8a0, 0.05), 0, 0, 0);
    for (const y of [0.1, 0.05, 0]) box(g, 0.18, 0.012, 0.005, tone(0x3a2a22), 0, y, 0.01);
    mesh(g, ball(0.045, 8, 6), glowTone(c), 0.04, -0.11, 0.02).scale.set(1, 1.2, 0.4);
  },
  keyring(g, c) {
    // a sexton's iron ring with three keys on it (leaning back)
    g = lean(g);
    mesh(g, new THREE.TorusGeometry(0.1, 0.014, 4, 16), metal(IRON), 0, 0.1, 0);
    for (const [x, a] of [
      [-0.06, 0.3],
      [0, 0],
      [0.06, -0.3],
    ]) {
      const k = new THREE.Group();
      k.position.set(x, 0.02, 0);
      k.rotation.z = a;
      g.add(k);
      mesh(k, new THREE.TorusGeometry(0.025, 0.008, 4, 8), metal(c), 0, 0, 0);
      mesh(k, cyl(0.008, 0.008, 0.16, 4), metal(c), 0, -0.1, 0);
      box(k, 0.04, 0.03, 0.01, metal(c), 0.02, -0.16, 0);
    }
  },
  purse(g, c) {
    // a miser's purse tied with a cord, coins spilling from it
    mesh(
      g,
      lathe(
        [
          [0, -0.15],
          [0.1, -0.14],
          [0.14, -0.08],
          [0.13, 0.02],
          [0.07, 0.08],
          [0.05, 0.1],
          [0.08, 0.14],
          [0, 0.13],
        ],
        9,
      ),
      tone(LEATHER, 0.1),
      0,
      0,
      0,
    );
    mesh(g, new THREE.TorusGeometry(0.055, 0.012, 4, 10), tone(0x8a6a40), 0, 0.09, 0).rotation.x = Math.PI / 2;
    for (const [x, z, a] of [
      [0.13, 0.08, 0.5],
      [0.19, 0.05, 1.1],
    ])
      put(mesh(g, GEO.coin, metal(c), x, -0.14, z), a, 0, 0.3, 0.7);
  },
  chalk(g, c) {
    // a stick of chalk in a brass holder, a glyph drawn with it
    const s = new THREE.Group();
    s.rotation.z = -0.7;
    g.add(s);
    mesh(s, cyl(0.025, 0.025, 0.14, 6), tone(c, 0.04), 0, 0.1, 0);
    mesh(s, cyl(0.03, 0.035, 0.18, 6), metal(BRASS), 0, -0.05, 0);
    put(mesh(g, GEO.rune, glowTone(0xf0ead8), -0.06, -0.14, 0.05), 0, 0, 0.2, 1.1);
  },
  obol(g, c) {
    // the Ferryman's obol, and one more under it
    mesh(g, GEO.coin, metal(shade(c, 0.8)), 0.04, -0.04, -0.03).rotation.x = Math.PI / 2;
    put(mesh(g, cyl(0.14, 0.14, 0.03, 12).rotateX(Math.PI / 2), metal(c), 0, 0.02, 0), 0, 0, 0.2);
    mesh(g, new THREE.TorusGeometry(0.08, 0.01, 4, 12), metal(shade(c, 0.7)), 0, 0.02, 0.02);
  },
  band(g, c) {
    // a warding band, its runes lit
    put(mesh(g, new THREE.TorusGeometry(0.14, 0.035, 6, 20), metal(SILVER), 0, 0, 0), 0.5, 0, 0);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.45;
      put(
        mesh(
          g,
          GEO.rune,
          glowTone(c),
          Math.cos(a) * 0.14,
          Math.sin(a) * 0.14 * Math.cos(0.5),
          0.02 + Math.sin(a) * 0.14 * Math.sin(0.5),
        ),
        0,
        0,
        a + Math.PI / 2,
        0.5,
      );
    }
  },
  lantern(g, c) {
    lantern(g, c);
  },
  manalantern(g, c) {
    // a brass lamp with no glass, a crystal of mana burning in it
    mesh(g, cyl(0.1, 0.06, 0.05, 8), metal(BRASS), 0, -0.12, 0);
    mesh(g, new THREE.TorusGeometry(0.1, 0.014, 4, 16), metal(BRASS), 0, 0.1, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      tube(
        g,
        [
          [Math.cos(a) * 0.07, -0.1, Math.sin(a) * 0.07],
          [Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12],
          [Math.cos(a) * 0.1, 0.1, Math.sin(a) * 0.1],
        ],
        0.012,
        0.01,
        metal(BRASS),
        6,
      );
    }
    gem(g, c, 0.07, 0, 0, 0, 1.7);
    mesh(g, new THREE.TorusGeometry(0.035, 0.01, 4, 8), metal(BRASS), 0, 0.19, 0);
  },
  scale(g, c) {
    // a pedlar's balance: a post, a beam, two pans on cords
    mesh(g, cyl(0.012, 0.016, 0.36), metal(BRASS), 0, 0, 0);
    mesh(g, cyl(0.05, 0.06, 0.03, 8), metal(BRASS), 0, -0.18, 0);
    box(g, 0.36, 0.02, 0.02, metal(c), 0, 0.16, 0);
    for (const s of [-1, 1]) {
      stick(g, [s * 0.17, 0.16, 0], [s * 0.17, 0.02, 0], 0.004, tone(0x6a5a44));
      mesh(
        g,
        lathe([
          [0, 0],
          [0.07, 0.005],
          [0.08, 0.025],
        ]),
        metal(c),
        s * 0.17,
        0.0,
        0,
      );
    }
  },
  // ---------- cursed ----------
  mask(g, c) {
    // a drowned face's mask, its eyes hollow, dripping
    put(mesh(g, ball(0.16, 12, 8), tone(c, 0.06)), 0, 0, 0, [1, 1.25, 0.45]);
    for (const s of [-1, 1]) {
      box(g, 0.07, 0.022, 0.02, tone(0x08100e), s * 0.06, 0.04, 0.07);
      mesh(g, ball(0.012, 5, 3), glowTone(0x6ac8c8), s * 0.06, -0.06 - (s > 0 ? 0.04 : 0), 0.06);
    }
    box(g, 0.08, 0.02, 0.02, tone(0x08100e), 0, -0.1, 0.065);
  },
  chain(g, c) {
    // three links of a penitent's chain, a shackle on the last
    for (let i = 0; i < 3; i++)
      put(
        mesh(g, new THREE.TorusGeometry(0.07, 0.024, 4, 10), metal(c), -0.14 + i * 0.11, 0.08 - i * 0.08, 0),
        0,
        i % 2 ? Math.PI / 2 : 0,
        0.7,
        [1, 1.4, 1],
      );
    put(
      mesh(g, new THREE.TorusGeometry(0.1, 0.03, 4, 12, Math.PI * 1.4), metal(shade(c, 0.8)), 0.14, -0.15, 0),
      0,
      0,
      -0.3,
    );
  },
  thorns(g, c) {
    // a crown of twisted thorn branches
    const ring: number[][] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ring.push([Math.cos(a) * 0.15, Math.sin(a * 3) * 0.02, Math.sin(a) * 0.15]);
    }
    const t = new THREE.Group();
    t.rotation.x = 1.05;
    g.add(t); // (tipped up to face the camera: flat, a crown reads as a line)
    tube(t, ring, 0.022, 0.022, tone(c, 0.1), 48);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      put(
        mesh(t, new THREE.ConeGeometry(0.014, 0.08, 4), tone(0xc8b890), Math.cos(a) * 0.15, 0.03, Math.sin(a) * 0.15),
        0,
        -a,
        Math.PI / 2 - 0.5,
      );
    }
  },
  hungertome(g, c) {
    // a hungering book, its pages turned to teeth
    book(g, c, IRON);
    for (let i = 0; i < 6; i++)
      put(
        mesh(g, new THREE.ConeGeometry(0.018, 0.06, 4), tone(0xe8e0c8), 0.16, -0.15 + i * 0.06, 0),
        0,
        0,
        -Math.PI / 2,
      );
    mesh(g, ball(0.03, 6, 4), glowTone(0xb02030), 0.17, 0, 0).scale.set(0.5, 3, 0.8);
  },
  // ---------- M3 ----------
  vigil(g, c) {
    // a vigil candle on its dish, its flame still
    mesh(g, cyl(0.06, 0.065, 0.24, 9), tone(c, 0.04), 0, -0.03, 0);
    mesh(g, cyl(0.12, 0.1, 0.025, 10), metal(BRASS), 0, -0.16, 0);
    mesh(g, ball(0.035, 6, 5), glowTone(0xffd070), 0, 0.14, 0).scale.set(1, 2, 1);
  },
  frostring(g, c) {
    // a ring grown over with ice
    put(mesh(g, new THREE.TorusGeometry(0.12, 0.03, 6, 18), metal(SILVER), 0, -0.03, 0), 0.6, 0, 0);
    for (let i = 0; i < 4; i++) gem(g, c, 0.03 + (i % 2) * 0.015, -0.08 + i * 0.055, 0.08 + (i % 2) * 0.03, 0, 2);
  },
  stormglass(g, c) {
    // a pendant of stormglass, lightning caught in it
    put(mesh(g, GEO.gem, glowTone(shade(c, 0.6)), 0, -0.05, 0), 0, Math.PI / 4, 0, [0.1, 0.17, 0.1]);
    stick(g, [0.02, 0.05, 0.09], [-0.03, -0.04, 0.09], 0.008, glowTone(0xfffff0));
    stick(g, [-0.03, -0.04, 0.09], [0.03, -0.1, 0.09], 0.008, glowTone(0xfffff0));
    mesh(g, new THREE.TorusGeometry(0.04, 0.01, 4, 10), metal(GOLD), 0, 0.15, 0);
  },
  thurible(g, c) {
    // a ball of blackened iron on a single chain, embers glowing in its slits, ash smoking from it
    mesh(g, ball(0.12, 10, 8), metal(0x2a2624), 0, -0.08, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      put(
        box(g, 0.02, 0.09, 0.01, glowTone(0xff7030), Math.cos(a) * 0.12, -0.08, Math.sin(a) * 0.12),
        0,
        -a + Math.PI / 2,
        0,
        [0.02, 0.09, 0.01],
      );
    }
    stick(g, [0, 0.04, 0], [0, 0.26, 0], 0.008, metal(IRON));
    mesh(g, new THREE.TorusGeometry(0.03, 0.01, 4, 8), metal(IRON), 0, 0.27, 0);
    for (const [x, y, r] of [
      [0.1, 0.02, 0.045],
      [0.15, 0.1, 0.035],
      [0.12, 0.18, 0.028],
    ])
      mesh(g, ball(r, 6, 4), tone(shade(c, 0.9), 0.08), x, y, 0.04);
  },
  witchknot(g, c) {
    // a witch's knot of cord, a bead bound in it
    mesh(g, new THREE.TorusKnotGeometry(0.1, 0.022, 48, 5, 2, 3), tone(c, 0.06), 0, 0, 0);
    mesh(g, ball(0.035, 6, 5), glowTone(shade(c, 1.5)), 0, 0, 0.06);
  },
  // ---------- M4.1 ----------
  pendulum(g, c) {
    // a clock's pendulum caught mid-swing: its rod from a hook, a bob with a rune lit in it
    const p = new THREE.Group();
    p.position.y = 0.22;
    p.rotation.z = 0.35;
    g.add(p);
    mesh(p, new THREE.TorusGeometry(0.03, 0.01, 4, 8), metal(BRASS), 0, 0.02, 0);
    mesh(p, cyl(0.01, 0.01, 0.34, 5), metal(BRASS), 0, -0.17, 0);
    put(mesh(p, cyl(0.1, 0.1, 0.035, 14), metal(c), 0, -0.38, 0), Math.PI / 2);
    put(mesh(p, GEO.rune, glowTone(0xfff0c0), 0, -0.38, 0.02), 0, 0, 0, 0.9);
    mesh(p, new THREE.TorusGeometry(0.1, 0.012, 4, 16), metal(shade(c, 0.7)), 0, -0.38, 0);
  },
  lodestar(g, c) {
    // a dark wand tipped with a lodestone, a small star hanging where its bolt stopped
    const w = new THREE.Group();
    w.rotation.z = -0.6;
    g.add(w);
    mesh(w, cyl(0.012, 0.022, 0.44), tone(0x3a3440, 0.08), 0, -0.03, 0);
    put(mesh(w, GEO.gem, tone(0x5c6478, 0.15, 0.5), 0, 0.22, 0), 0, 0.4, 0, [0.05, 0.07, 0.05]);
    const star = new THREE.Group();
    star.position.set(0.14, 0.22, 0.02);
    g.add(star);
    for (const r of [0, Math.PI / 2])
      put(mesh(star, GEO.gem, glowTone(c)), 0, 0, r + Math.PI / 4, [0.018, 0.07, 0.018]);
    mesh(star, ball(0.028, 6, 5), glowTone(0xffffff));
  },
  twincandles(g, c) {
    // two vigil candles side by side on one dish, both lit
    mesh(g, cyl(0.16, 0.13, 0.025, 12), metal(BRASS), 0, -0.17, 0);
    for (const [x, h] of [
      [-0.06, 0.26],
      [0.065, 0.22],
    ]) {
      mesh(g, cyl(0.045, 0.05, h, 9), tone(0xf0e6cc, 0.04), x, -0.16 + h / 2, 0);
      mesh(g, ball(0.028, 6, 5), glowTone(c), x, -0.16 + h + 0.04, 0).scale.set(1, 2, 1);
    }
  },
  choir(g, c) {
    // a bone flute, its finger holes dark, the notes of the hymn rising off it
    const f = new THREE.Group();
    f.rotation.z = -0.5;
    g.add(f);
    mesh(f, cyl(0.028, 0.03, 0.42, 8), tone(c, 0.06), 0, -0.02, 0);
    mesh(f, ball(0.034, 7, 5), tone(shade(c, 0.9), 0.06), 0, 0.19, 0);
    for (let i = 0; i < 4; i++) mesh(f, ball(0.011, 5, 3), tone(0x1a120c), 0, -0.12 + i * 0.07, 0.027);
    for (const [x, y] of [
      [0.1, 0.12],
      [0.16, 0.2],
      [0.08, 0.24],
    ])
      mesh(g, ball(0.022, 6, 4), glowTone(0xfff0c8), x, y, 0.04);
  },
  echostone(g, c) {
    // a smooth cistern pebble, rings of its echo lit round it
    put(mesh(g, ball(0.13, 12, 9), tone(c, 0.12)), 0, 0, 0, [1.1, 0.8, 0.9]);
    for (const r of [0.17, 0.22])
      put(mesh(g, new THREE.TorusGeometry(r, 0.008, 3, 24), glowTone(0xc8e0ff), 0, 0, 0), 1.2, 0, 0);
  },
  bloodmoon(g, c) {
    // a disc of red glass in a dark iron frame, on a loop
    const d = lean(g);
    put(mesh(d, cyl(0.13, 0.13, 0.03, 16), glowTone(shade(c, 0.8))), Math.PI / 2);
    mesh(d, new THREE.TorusGeometry(0.135, 0.02, 4, 18), metal(IRON), 0, 0, 0);
    put(mesh(d, cyl(0.05, 0.05, 0.032, 10), glowTone(shade(c, 1.4)), 0.04, 0.04, 0.002), Math.PI / 2);
    mesh(d, new THREE.TorusGeometry(0.03, 0.01, 4, 8), metal(IRON), 0, 0.17, 0);
  },
  salt(g, c) {
    // a pouch of grave salt, open, a little heap spilled beside it
    mesh(
      g,
      lathe(
        [
          [0, -0.15],
          [0.1, -0.14],
          [0.13, -0.07],
          [0.12, 0.02],
          [0.07, 0.07],
          [0.08, 0.1],
          [0, 0.1],
        ],
        9,
      ),
      tone(LEATHER, 0.1),
      -0.04,
      0,
      0,
    );
    mesh(g, new THREE.TorusGeometry(0.07, 0.012, 4, 10), tone(0x8a6a40), -0.04, 0.07, 0).rotation.x = Math.PI / 2;
    mesh(g, new THREE.ConeGeometry(0.1, 0.07, 8), tone(c, 0.12), 0.12, -0.13, 0.04);
    for (const [x, y, z] of [
      [0.02, 0.09, 0.02],
      [0.07, -0.1, 0.1],
      [0.18, -0.14, 0.08],
    ])
      put(mesh(g, GEO.gem, tone(c, 0.05), x, y, z), 0, x * 9, 0, 0.025);
  },
  halo(g, c) {
    // a saint's halo of beaten gold, its rays standing out
    const h = lean(g);
    mesh(h, new THREE.TorusGeometry(0.15, 0.025, 5, 24), metal(c), 0, 0, 0);
    mesh(h, new THREE.TorusGeometry(0.15, 0.008, 3, 24), glowTone(0xfff4d0), 0, 0, 0.02);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      stick(
        h,
        [Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0],
        [Math.cos(a) * (i % 2 ? 0.23 : 0.26), Math.sin(a) * (i % 2 ? 0.23 : 0.26), 0],
        0.007,
        glowTone(c),
      );
    }
  },
  ferrylantern(g, c) {
    // the Ferryman's prow lamp, hung from its crook
    tube(
      g,
      [
        [-0.12, -0.25, 0],
        [-0.12, 0.1, 0],
        [-0.08, 0.24, 0],
        [0.02, 0.24, 0],
        [0.04, 0.18, 0],
      ],
      0.016,
      0.012,
      tone(DARKWOOD, 0.1),
      10,
    );
    const l = new THREE.Group();
    l.position.set(0.04, -0.02, 0);
    l.scale.setScalar(0.85);
    g.add(l);
    lantern(l, c);
  },
  antler(g, c) {
    // a tine of the white hart's antler, its point still lit
    tube(
      g,
      [
        [-0.08, -0.22, 0],
        [-0.04, -0.05, 0.02],
        [0.02, 0.08, 0],
        [0.1, 0.2, -0.02],
      ],
      0.035,
      0.014,
      tone(0xf0e8d0, 0.08),
      12,
    );
    tube(
      g,
      [
        [-0.04, -0.06, 0.02],
        [0.06, -0.02, 0.02],
        [0.14, 0.03, 0],
      ],
      0.02,
      0.01,
      tone(0xf0e8d0, 0.08),
      8,
    );
    mesh(g, ball(0.02, 6, 4), glowTone(c), 0.1, 0.2, -0.02);
    mesh(g, ball(0.014, 5, 3), glowTone(c), 0.14, 0.03, 0);
  },
  contract(g, c) {
    // a contract rolled tight, a seal of red wax on its cord, an obol for the first body
    put(mesh(g, cyl(0.05, 0.05, 0.36, 10), tone(0xe0d4b0, 0.06), 0, 0.02, 0), 0, 0, Math.PI / 2 - 0.3);
    for (const s of [-1, 1])
      put(
        mesh(
          g,
          cyl(0.056, 0.056, 0.02, 10),
          tone(c, 0.08),
          s * 0.17 * Math.cos(0.3),
          0.02 + s * 0.17 * Math.sin(0.3),
          0,
        ),
        0,
        0,
        Math.PI / 2 - 0.3,
      );
    put(mesh(g, cyl(0.045, 0.05, 0.02, 10), tone(0x8a1a1a, 0.06), 0, 0.02, 0.055), Math.PI / 2);
    put(mesh(g, GEO.coin, metal(GOLD), 0.1, -0.16, 0.04), 1.2, 0, 0.2);
  },
  lastrite(g, c) {
    // a strip of linen with the rite written on it, folded over once, its words faintly lit
    const l = lean(g);
    box(l, 0.12, 0.36, 0.012, tone(c, 0.06), -0.05, 0, 0);
    put(box(l, 0.12, 0.2, 0.012, tone(shade(c, 0.92), 0.06), 0.06, 0.07, 0.012), 0, 0, -0.25, [0.12, 0.2, 0.012]);
    for (let i = 0; i < 3; i++) put(mesh(l, GEO.rune, glowTone(0xb8c8ff), -0.05, 0.12 - i * 0.1, 0.01), 0, 0, 0, 0.5);
  },
  hood(g, c) {
    // a pilgrim's cowl
    mesh(
      g,
      lathe(
        [
          [0.2, -0.2],
          [0.18, -0.05],
          [0.15, 0.06],
          [0.1, 0.14],
          [0.04, 0.18],
          [0, 0.19],
        ],
        12,
      ),
      tone(c, 0.08),
      0,
      0,
      0,
    );
    put(mesh(g, ball(0.12, 10, 8), tone(0x1a1010), 0, -0.05, 0.09), 0, 0, 0, [1, 1.1, 0.5]);
  },
};

/** A heart, `s` times .3 across, in `mat`: its outline drawn and given depth, bevelled. */
const heart = (g: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, s: number) =>
  put(mesh(g, HEART, mat, x, y, z), 0, 0, 0, s);
const HEART = shared(
  (() => {
    const h = new THREE.Shape();
    h.moveTo(0, -0.13);
    h.bezierCurveTo(-0.03, -0.08, -0.15, -0.02, -0.15, 0.05);
    h.bezierCurveTo(-0.15, 0.13, -0.05, 0.16, 0, 0.08);
    h.bezierCurveTo(0.05, 0.16, 0.15, 0.13, 0.15, 0.05);
    h.bezierCurveTo(0.15, -0.02, 0.03, -0.08, 0, -0.13);
    return new THREE.ExtrudeGeometry(h, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.015,
      bevelSegments: 1,
      curveSegments: 6,
    }).translate(0, 0, -0.03);
  })(),
);

/** A group inside `g` leaning back 40°, for a flat artifact: as it turns, its face still shows to the camera above. */
function lean(g: THREE.Group) {
  const l = new THREE.Group();
  l.rotation.x = -0.7;
  g.add(l);
  return l;
}

/** An artifact's look by its icon (a known one's, or the sigil). */
export function artifactLook(icon: string, color: string) {
  const g = new THREE.Group(),
    c = new THREE.Color(color).getHex();
  (ARTIFACT_LOOKS[icon] ?? ARTIFACT_LOOKS.sigil)(g, c);
  return g;
}
