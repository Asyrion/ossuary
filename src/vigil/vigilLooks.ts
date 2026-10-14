/* The Vigil's pieces (docs/M7-plan.md, decision 9), built in code from the room kit's parts in the warm candlelit
   crypt: the bier the mage wakes on, the candle wall (a candle for each one lit), the wall of skulls, the
   echoes' plinths, the Great Circle cut in the Nave's floor, the Ferryman standing in his boat, and the six ways barred by
   a school. Each is built facing +z (into the room) from the wall's face or its own middle, and its still body merged
   (`mergeStill`); what moves is kept apart in `userData.parts` (the Ferryman's head and lantern, the veil). */
import * as THREE from 'three';
import type { FloorLook } from '../types';
import type { School } from '../actors/foeData';
import { blob, glow, glowShared, markShared, mergeStill } from '../render/materials';
import { firePalette, makeFire, type FlameSpec } from '../render/fire';
import { MAT, curve, mesh, rough, runeStrokes, shade, stoneOf, taperTube, tone } from '../world/kitParts';
import { lecternLook } from '../world/specialLooks';
import { mulberry } from '../rng';
import type { PieceKind } from './vigilMap';

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (r0: number, r1: number, h: number, n = 8) => new THREE.CylinderGeometry(r0, r1, h, n);
const candlePal = (look: FloorLook) => {
  const [a, b] = look.torch.candle ?? [look.torch.flame, look.torch.light];
  return firePalette(new THREE.Color(a).getHex(), new THREE.Color(b).getHex());
};
const waxOf = (look: FloorLook) => tone(new THREE.Color(look.torch.wax ?? '#f0e2c6').getHex(), 0.05);
const SHROUD = 0xb4a68c,
  WOOD = 0x3e2c1e,
  HULL = 0x2a2018,
  ROBE = 0x2a2420,
  HOOD = 0x1e1a18;

/** A stone bier two tiles long (along x): a plinth, its slab, a stone pillow at the head (west) and a shroud folded at its
    foot, a short candle burning at each corner. */
function bierLook(look: FloorLook) {
  const g = new THREE.Group(),
    stone = tone(stoneOf(look, 1.15), 0.12),
    dark = tone(stoneOf(look, 0.85), 0.1),
    wax = waxOf(look);
  mesh(g, box(1.7, 0.36, 0.7), dark, 0, 0.18, 0);
  mesh(g, box(1.86, 0.1, 0.82), stone, 0, 0.41, 0);
  mesh(g, box(1.6, 0.05, 0.1), stone, 0, 0.06, 0.4);
  mesh(g, rough(box(0.28, 0.1, 0.5), 0.02, 3), stone, -0.72, 0.51, 0);
  mesh(g, box(0.46, 0.08, 0.66), tone(SHROUD, 0.1), 0.66, 0.5, 0);
  mesh(g, box(0.4, 0.06, 0.6), tone(shade(SHROUD, 0.85), 0.1), 0.64, 0.57, 0.02);
  const specs: FlameSpec[] = [];
  for (const [x, z] of [
    [-0.84, -0.32],
    [-0.84, 0.32],
    [0.84, -0.32],
    [0.84, 0.32],
  ]) {
    mesh(g, cyl(0.035, 0.04, 0.12, 6), wax, x, 0.52, z);
    specs.push({ x, y: 0.58, z, h: 0.1, w: 0.045 });
  }
  const fire = makeFire(specs, candlePal(look), 2, 0.2);
  g.add(fire);
  const light = glow(0xffb860, 1.1, 0.5);
  light.position.set(0, 0.7, 0);
  g.add(light);
  g.add(blob(2.2));
  g.userData.parts = { fire, light };
  mergeStill(g);
  return g;
}

/** The candle wall (five tiles along the north wall): three stepped tiers of stone crowded with candles, each a name's; one
    burns for each candle lit (`setLit`), the first in the middle of the middle tier. Built from the wall's face, facing +z. */
export function candleWallLook(look: FloorLook) {
  const g = new THREE.Group(),
    stone = tone(stoneOf(look, 1.1), 0.12),
    lip = tone(stoneOf(look, 1.3), 0.08),
    wax = waxOf(look),
    R = mulberry(71);
  const tiers = [
    { y: 0.3, d: 0.56, n: 7 },
    { y: 0.6, d: 0.38, n: 6 },
    { y: 0.9, d: 0.2, n: 5 },
  ];
  const spots: { x: number; y: number; z: number; h: number }[] = [];
  for (const t of tiers) {
    mesh(g, box(4.6, t.y, t.d), stone, 0, t.y / 2, t.d / 2);
    mesh(g, box(4.66, 0.04, t.d + 0.04), lip, 0, t.y, t.d / 2);
    for (let i = 0; i < t.n; i++) {
      const x = ((i - (t.n - 1) / 2) * 4.2) / t.n + (R() - 0.5) * 0.12,
        z = t.d - 0.1 - R() * 0.05,
        h = 0.1 + R() * 0.2;
      mesh(g, cyl(0.034, 0.04, 1, 6), wax, x, t.y + h / 2, z).scale.y = h;
      mesh(g, new THREE.SphereGeometry(0.07, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), wax, x, t.y, z).scale.y = 0.3; // (its wax pooled)
      spots.push({ x, y: t.y + h, z, h });
    }
  }
  // the order they light: the middle tier's middle first, then outward, tier by tier
  const order = spots
    .map((_, i) => i)
    .sort((a, b) => {
      const tier = (i: number) => (i < 7 ? 1 : i < 13 ? 0 : 2),
        ta = tier(a),
        tb = tier(b);
      return ta - tb || Math.abs(spots[a].x) - Math.abs(spots[b].x);
    });
  const light = glow(0xffb860, 1.6, 0.7);
  light.position.set(0, 0.95, 0.5);
  g.add(light);
  g.add(blob(5));
  g.userData.parts = { light };
  mergeStill(g);
  let fire: THREE.Object3D | null = null,
    now = -1;
  const setLit = (n: number) => {
    n = Math.max(0, Math.min(order.length, n));
    if (n === now) return;
    now = n;
    if (fire) {
      g.remove(fire);
      fire.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    }
    const specs: FlameSpec[] = order
      .slice(0, n)
      .map((i) => ({ x: spots[i].x, y: spots[i].y, z: spots[i].z, h: 0.12, w: 0.05 }));
    fire = specs.length ? makeFire(specs, candlePal(look), Math.min(4, specs.length), 0.3) : null;
    if (fire) g.add(fire);
    light.visible = n > 0;
    light.material.opacity = Math.min(0.85, 0.35 + n * 0.05);
  };
  return {
    group: g,
    setLit,
    get lit() {
      return now;
    },
    count: spots.length,
    light,
  };
}

/** The wall of skulls (two tiles along the north wall): a rack of niches, two rows of three, a skull in each, its eyes dark. */
function skullsLook(look: FloorLook) {
  const g = new THREE.Group(),
    stone = tone(stoneOf(look, 1.05), 0.12),
    dark = MAT.socket;
  mesh(g, box(1.9, 1.5, 0.34), stone, 0, 0.75, 0.17);
  for (const row of [0, 1])
    for (const col of [-1, 0, 1]) {
      const x = col * 0.6,
        y = 0.45 + row * 0.62;
      mesh(g, box(0.46, 0.42, 0.04), dark, x, y, 0.345);
      mesh(g, new THREE.SphereGeometry(0.13, 9, 7).scale(1, 0.92, 1.05), MAT.skull, x, y - 0.04, 0.36);
      mesh(g, box(0.15, 0.05, 0.1), MAT.skull, x, y - 0.15, 0.4);
      for (const s of [-1, 1]) mesh(g, new THREE.SphereGeometry(0.035, 6, 4), dark, x + s * 0.05, y - 0.03, 0.47);
    }
  mesh(g, box(2, 0.08, 0.4), tone(stoneOf(look, 1.3), 0.08), 0, 1.52, 0.18);
  g.add(blob(2.2));
  mergeStill(g);
  return g;
}

/** An echo's plinth in the Nave: a low drum of stone with a ring of runes cut round it, empty. */
function plinthLook(look: FloorLook) {
  const g = new THREE.Group(),
    stone = tone(stoneOf(look, 1.1), 0.1);
  mesh(g, cyl(0.4, 0.44, 0.3, 10), stone, 0, 0.15, 0);
  mesh(g, cyl(0.46, 0.46, 0.06, 10), tone(stoneOf(look, 1.3), 0.08), 0, 0.33, 0);
  const rune = runeStrokes(0.14);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2,
      m = mesh(g, rune, MAT.socket, Math.sin(a) * 0.445, 0.16, Math.cos(a) * 0.445);
    m.rotation.y = a;
  }
  g.add(blob(1.1));
  mergeStill(g);
  return g;
}

/** The Great Circle cut in the Nave's floor: three rings (the vows, the gifts, the omens), each with its sigils'
    places as small rings, and spokes between them; dark, as cut stone is, until the circle is cast. One mesh. */
export function circleLook(radius: number) {
  const parts: THREE.BufferGeometry[] = [],
    flat = (geo: THREE.BufferGeometry, x = 0, z = 0) => parts.push(geo.rotateX(-Math.PI / 2).translate(x, 0.006, z));
  const rings = [radius, radius * 0.72, radius * 0.44];
  rings.forEach((r, k) => {
    flat(new THREE.RingGeometry(r - 0.07, r, 64));
    const n = [6, 6, 3][k];
    for (let i = 0; i < n; i++) {
      const a = ((i + (k === 1 ? 0.5 : 0)) / n) * Math.PI * 2,
        rr = k === 0 ? r - 0.38 : r;
      flat(new THREE.RingGeometry(0.15, 0.2, 16), Math.cos(a) * rr, Math.sin(a) * rr);
    }
  });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6,
      l = rings[0] - rings[2] - 0.12,
      mid = (rings[0] + rings[2]) / 2;
    flat(new THREE.PlaneGeometry(l, 0.05).rotateZ(-a), Math.cos(a) * mid, Math.sin(a) * mid);
  }
  const geo = new THREE.BufferGeometry(),
    all = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const n = all.reduce((s, p) => s + p.attributes.position.count, 0),
    pos = new Float32Array(n * 3);
  let o = 0;
  for (const p of all) {
    pos.set(p.attributes.position.array, o * 3);
    o += p.attributes.position.count;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  for (const p of [...parts, ...all]) if (p !== geo) p.dispose();
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0x1c140e,
      roughness: 1,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    }),
  );
  m.renderOrder = 1;
  return m;
}

/** The Ferryman in his boat (three tiles along x, two across, on the Landing's water): a long dark hull, its prow curling
    up to the west, a bench, and at the stern the Ferryman, tall and hooded, leaning on his pole, a lantern hanging from its
    crook. His head turns to the mage (`head`); the lantern sways (`lantern`). */
/** The boat, with the Ferryman at its stern built in code, or (`ferryman` false) without him: his made model stands there
    instead (vigil/town.ts's `standFerryman`). */
function boatLook(ferryman = true) {
  const g = new THREE.Group(),
    wood = tone(HULL, 0.12),
    plank = tone(WOOD, 0.12),
    iron = MAT.iron;
  const hull = new THREE.SphereGeometry(0.5, 14, 8).scale(2.7, 0.5, 0.82);
  mesh(g, hull, wood, 0, 0.12, 0);
  mesh(g, box(2.2, 0.04, 0.5), tone(shade(WOOD, 0.7), 0.1), 0, 0.3, 0); // (its hull, and the boards inside)
  mesh(g, new THREE.TorusGeometry(1, 0.035, 4, 28).rotateX(Math.PI / 2).scale(1.35, 1, 0.41), plank, 0, 0.3, 0);
  mesh(
    g,
    taperTube(
      curve([
        [-1.25, 0.2, 0],
        [-1.5, 0.4, 0],
        [-1.55, 0.66, 0],
        [-1.42, 0.78, 0],
      ]),
      8,
      0.09,
      0.04,
    ),
    wood,
  );
  mesh(g, box(0.12, 0.06, 0.74), plank, -0.3, 0.3, 0);
  mesh(g, box(0.12, 0.06, 0.7), plank, 0.5, 0.3, 0);
  mesh(
    g,
    taperTube(
      curve([
        [-1.3, 0.3, 0],
        [-1.7, 0.2, -0.05],
        [-2.05, 0.32, -0.1],
      ]),
      6,
      0.018,
      0.018,
      4,
    ),
    tone(0x8a7a5a, 0.1),
  ); // (the mooring rope, to the jetty's post)
  mesh(g, cyl(0.07, 0.08, 0.7, 6), plank, -2.12, 0.35, -0.1);
  // the Ferryman, standing at the stern
  if (ferryman) {
    const { F, head, lantern } = ferrymanFigure(plank, iron);
    F.position.set(0.88, 0.26, 0);
    g.add(F);
    g.userData.parts = { head, lantern };
  }
  g.add(blob(3));
  mergeStill(g);
  return g;
}
/** The Ferryman himself, his pole in hand and its lantern lit (alone, for the talk panel's icon). */
export function ferrymanLook() {
  const g = new THREE.Group();
  g.add(ferrymanFigure(tone(WOOD, 0.12), MAT.iron).F);
  return g;
}
function ferrymanFigure(plank: THREE.Material, iron: THREE.Material) {
  const robe = tone(ROBE, 0.1),
    F = new THREE.Group();
  mesh(
    F,
    new THREE.LatheGeometry(
      [
        [0.3, 0],
        [0.28, 0.2],
        [0.22, 0.7],
        [0.17, 1.05],
        [0.14, 1.25],
        [0.05, 1.32],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      10,
    ),
    robe,
  );
  mesh(F, box(0.5, 0.14, 0.16), robe, 0, 1.12, 0.02).rotation.z = 0.05; // (the shoulders)
  for (const s of [-1, 1]) {
    const arm = mesh(F, cyl(0.06, 0.08, 0.5, 6), robe, s * 0.2, 0.92, 0.08);
    arm.rotation.set(-0.5, 0, s * 0.25);
  }
  const head = new THREE.Group();
  head.position.set(0, 1.32, 0);
  F.add(head);
  mesh(head, new THREE.SphereGeometry(0.16, 10, 8).scale(1, 1.1, 1.05), tone(HOOD, 0.08), 0, 0.06, 0);
  mesh(head, new THREE.ConeGeometry(0.12, 0.22, 8).rotateX(-0.5), tone(HOOD, 0.08), 0, 0.16, -0.08);
  mesh(head, box(0.18, 0.16, 0.04), MAT.socket, 0, 0.02, 0.15);
  for (const s of [-1, 1]) mesh(head, new THREE.SphereGeometry(0.018, 5, 4), tone(0xd8c8a0), s * 0.045, 0.04, 0.17);
  // the pole, its crook and the lantern
  const pole = new THREE.Group();
  pole.position.set(0.32, 0, 0.12);
  pole.rotation.z = -0.12;
  F.add(pole);
  mesh(pole, cyl(0.025, 0.03, 2.1, 6), plank, 0, 0.95, 0);
  mesh(pole, new THREE.TorusGeometry(0.12, 0.02, 4, 10, Math.PI), plank, -0.12, 2.0, 0);
  const lantern = new THREE.Group();
  lantern.position.set(-0.24, 1.98, 0);
  pole.add(lantern);
  mesh(lantern, cyl(0.004, 0.004, 0.14, 3), iron, 0, -0.07, 0);
  mesh(lantern, new THREE.ConeGeometry(0.08, 0.07, 6), iron, 0, -0.15, 0);
  mesh(lantern, cyl(0.07, 0.06, 0.03, 6), iron, 0, -0.32, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    mesh(lantern, box(0.012, 0.14, 0.012), iron, Math.cos(a) * 0.06, -0.25, Math.sin(a) * 0.06);
  }
  lantern.add(makeFire([{ x: 0, y: -0.3, z: 0, h: 0.1, w: 0.05 }], firePalette(0xffe0a0, 0xffa040), 1, 0.1));
  const lit = glowShared(0xffc070, 1.0, 0.75);
  lit.position.set(0, -0.24, 0);
  lantern.add(lit);
  return { F, head, lantern };
}

/** A piece of the Vigil, by kind. */
export function pieceLook(kind: PieceKind, look: FloorLook, o: { ferryman?: boolean } = {}) {
  switch (kind) {
    case 'bier':
      return bierLook(look);
    case 'skulls':
      return skullsLook(look);
    case 'lectern':
      return lecternLook(look);
    case 'plinth':
      return plinthLook(look);
    case 'boat':
      return boatLook(o.ferryman ?? true);
    case 'candleWall':
      return candleWallLook(look).group;
  }
}

/* ---------- the six barred ways ---------- */

const ICE = markShared(
  new THREE.MeshStandardMaterial({
    color: 0xa8d8f0,
    emissive: 0x1a3a50,
    roughness: 0.25,
    transparent: true,
    opacity: 0.82,
  }),
);
const VEIL = markShared(
  new THREE.MeshStandardMaterial({
    color: 0x1a1024,
    emissive: 0x140820,
    roughness: 1,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  }),
);
const RUNE_LIT = markShared(new THREE.MeshBasicMaterial({ color: 0xa8dcff }));
const WATER = markShared(
  new THREE.MeshStandardMaterial({ color: 0x1e4a5e, emissive: 0x0c2632, roughness: 0.15, metalness: 0.2 }),
); // (dark water that still reads as water, not a hole: the room inspector)
/** A doorway's frame of stone `w` wide, standing out from the wall's face: two posts and a lintel; a pointed head for the
    chapel. */
function frame(g: THREE.Group, w: number, look: FloorLook, pointed = false) {
  const stone = tone(stoneOf(look, 0.95), 0.12),
    top = tone(stoneOf(look, 1.2), 0.1);
  for (const s of [-1, 1]) {
    mesh(g, box(0.3, 1.62, 0.34), stone, s * (w / 2 - 0.15), 0.81, 0.17);
    mesh(g, box(0.38, 0.1, 0.4), top, s * (w / 2 - 0.15), 0.05, 0.18);
  }
  mesh(g, box(w + 0.1, 0.26, 0.38), top, 0, 1.68, 0.19);
  if (pointed)
    mesh(g, new THREE.ConeGeometry(w / 2, 0.5, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.3), stone, 0, 2.04, 0.15);
}

/** One way barred by a school, `w` tiles along its wall, built from the wall's face facing +z. `open`: the way
    as its school left it, the doorway through it clear: the ice melted off the stair, the cellar's water frozen to walk
    on, the rune door gone with its stones alight, the veil drawn aside, the chapel's candles burning under a gilded sun,
    the root alive in leaf and flower round the arch. */
export function barLook(school: School, w: number, look: FloorLook, open = false) {
  const g = new THREE.Group(),
    R = mulberry(school.length * 31),
    inner = w - 0.6;
  const parts: Record<string, THREE.Object3D> = {};
  const lit = (x: number, y: number, z: number, color: number, size = 0.7, opacity = 0.55) => {
    const l = glow(color, size, opacity);
    l.position.set(x, y, z);
    g.add(l);
    return l;
  };
  if (school === 'ember') {
    // a stair going up into the rock, frozen solid to the arch
    frame(g, w, look);
    if (!open)
      for (let k = 0; k < 5; k++)
        mesh(g, box(inner, 0.3, 0.3), tone(stoneOf(look, 0.9 - k * 0.04), 0.1), 0, 0.15 + k * 0.3, 0.25 - k * 0.05);
    if (!open) {
      mesh(g, rough(box(inner, 1.5, 0.3), 0.08, 5), ICE, 0, 0.76, 0.2);
      for (let k = 0; k < 6; k++)
        mesh(
          g,
          new THREE.ConeGeometry(0.05 + R() * 0.04, 0.2 + R() * 0.25, 5).rotateX(Math.PI),
          ICE,
          (k / 5 - 0.5) * (inner - 0.1),
          1.45,
          0.38,
        );
      for (let k = 0; k < 4; k++)
        mesh(
          g,
          rough(new THREE.DodecahedronGeometry(0.16 + R() * 0.1, 0), 0.03, k),
          ICE,
          (R() - 0.5) * inner,
          0.1,
          0.42 + R() * 0.1,
        );
    } else {
      // (melted: the stair's side steps either side of the doorway, wet, a warm light coming down from above)
      for (const s of [-1, 1])
        for (let k = 0; k < 3; k++)
          mesh(
            g,
            box(0.42, 0.2 + k * 0.2, 0.3),
            tone(stoneOf(look, 0.85 + k * 0.05), 0.1),
            s * (inner / 2 - 0.21),
            0.1 + k * 0.1,
            0.25 - k * 0.05,
          );
      for (let k = 0; k < 3; k++)
        mesh(g, box(0.3 + R() * 0.3, 0.01, 0.2 + R() * 0.2), WATER, (R() - 0.5) * inner, 0.006, 0.5 + R() * 0.3);
      lit(0, 1.2, 0.3, 0xffc070, 1.2, 0.5);
    }
  } else if (school === 'storm') {
    // a door of stone set with three dark rune stones
    frame(g, w, look);
    if (!open) {
      mesh(g, box(inner, 1.52, 0.16), tone(0x3e4450, 0.12), 0, 0.76, 0.1);
      mesh(g, box(inner - 0.2, 0.05, 0.05), MAT.iron, 0, 0.42, 0.2);
      mesh(g, box(inner - 0.2, 0.05, 0.05), MAT.iron, 0, 1.3, 0.2);
    }
    for (let k = 0; k < 3; k++) {
      // (open: the stones stand in the arch's posts and lintel, alight)
      const x = open ? [-1, 0, 1][k] * (inner / 2 + 0.02) : ((k - 1) * inner) / 3.2,
        y = open ? [0.9, 1.68, 0.9][k] : k === 1 ? 1.05 : 0.7,
        z = open ? 0.38 : 0.22;
      mesh(g, cyl(0.16, 0.17, 0.1, 10).rotateX(Math.PI / 2), tone(0x5a606c, 0.1), x, y, z);
      mesh(g, runeStrokes(0.2), open ? RUNE_LIT : MAT.socket, x, y, z + 0.06);
      if (open) lit(x, y, z + 0.1, 0x8ec8ff, 0.55, 0.6);
    }
  } else if (school === 'umbral') {
    // a veil of shadow hanging in the arch, stirring
    frame(g, w, look);
    if (!open) {
      mesh(g, box(inner, 1.5, 0.04), MAT.socket, 0, 0.76, 0.02);
      const veil = new THREE.Mesh(new THREE.PlaneGeometry(inner, 1.5, 10, 4), VEIL);
      veil.position.set(0, 0.78, 0.14);
      g.add(veil);
      parts.veil = veil;
    } else
      for (const s of [-1, 1]) {
        // (drawn aside: bunched at each post)
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 1.46, 3, 4), VEIL);
        cloth.position.set(s * (inner / 2 - 0.2), 0.8, 0.16);
        g.add(cloth);
        mesh(g, cyl(0.05, 0.03, 0.1, 6), MAT.blackIron, s * (inner / 2 - 0.2), 0.9, 0.2);
      }
    mesh(g, cyl(0.025, 0.025, inner + 0.1, 5).rotateZ(Math.PI / 2), MAT.blackIron, 0, 1.53, 0.14);
  } else if (school === 'hallow') {
    // a dark chapel's pointed arch, its candles cold, a dull sun over it
    frame(g, w, look, true);
    if (!open) mesh(g, box(inner, 1.55, 0.04), MAT.socket, 0, 0.78, 0.02);
    for (const s of [-1, 1]) {
      // (open: a candle on a ledge either side of the doorway, lit)
      const x = open ? s * (inner / 2 - 0.12) : s * 0.3,
        y = open ? 0.62 : 0.45;
      if (open) mesh(g, box(0.26, 0.06, 0.26), tone(stoneOf(look, 1.15), 0.1), x, y - 0.12, 0.3);
      mesh(g, cyl(0.035, 0.04, 0.18, 6), MAT.wax, x, y, 0.3);
      mesh(g, cyl(0.004, 0.004, 0.03, 3), MAT.pitch, x, y + 0.105, 0.3);
    }
    if (!open) mesh(g, box(inner * 0.6, 0.36, 0.3), tone(stoneOf(look, 1.15), 0.1), 0, 0.18, 0.2);
    else {
      const f = makeFire(
        [-1, 1].map((s) => ({ x: s * (inner / 2 - 0.12), y: 0.73, z: 0.3, h: 0.1, w: 0.045 })),
        firePalette(0xffe0a0, 0xffa040),
        2,
        0.2,
      );
      g.add(f);
      lit(0, 1.0, 0.4, 0xfff0c0, 1.3, 0.45);
    }
    const sun = open ? MAT.gilt : MAT.darkBronze;
    mesh(g, new THREE.TorusGeometry(0.16, 0.025, 4, 14), sun, 0, 2.1, 0.36);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      mesh(g, box(0.03, 0.1, 0.02), sun, Math.cos(a) * 0.25, 2.1 + Math.sin(a) * 0.25, 0.36).rotation.z =
        a - Math.PI / 2;
    }
    if (open) lit(0, 2.1, 0.42, 0xffe08a, 0.8, 0.7);
  } else if (school === 'verdant') {
    // a dead root broken through the wall, its arms splayed down the stone and into the floor
    const root = tone(open ? 0x5e5236 : 0x5c4c3c, 0.15),
      dark = tone(open ? 0x3c6a34 : 0x3e3228, 0.12);
    if (!open) {
      mesh(g, rough(box(0.8, 0.5, 0.08), 0.08, 2), MAT.socket, 0, 1.0, 0.03); // (the hole it broke, below the wall's top)
      mesh(
        g,
        taperTube(
          curve([
            [0, 1.02, 0.02],
            [0.05, 0.95, 0.3],
            [0.12, 0.6, 0.5],
            [0.18, 0.22, 0.58],
            [0.22, 0, 0.55],
          ]),
          14,
          0.24,
          0.13,
        ),
        root,
      );
    } else
      mesh(
        g,
        taperTube(
          curve([
            [-0.68, 1.25, 0.1],
            [-0.3, 1.42, 0.16],
            [0, 1.48, 0.18],
            [0.3, 1.42, 0.16],
            [0.68, 1.25, 0.1],
          ]),
          12,
          0.1,
          0.1,
        ),
        root,
      ); // (alive: an arch of root over the doorway, the arms down its sides)
    mesh(
      g,
      taperTube(
        curve([
          [-0.1, 1.0, 0.05],
          [-0.35, 0.82, 0.12],
          [-0.55, 0.5, 0.14],
          [-0.68, 0.15, 0.2],
          [-0.72, 0, 0.26],
        ]),
        12,
        0.13,
        0.06,
      ),
      root,
    );
    mesh(
      g,
      taperTube(
        curve([
          [0.12, 0.98, 0.06],
          [0.4, 0.8, 0.1],
          [0.62, 0.45, 0.12],
          [0.72, 0.1, 0.2],
          [0.75, 0, 0.24],
        ]),
        12,
        0.12,
        0.05,
      ),
      root,
    );
    for (let k = 0; k < 7; k++) {
      const sx = (R() - 0.5) * 1.2,
        y = 0.2 + R() * 0.6;
      mesh(
        g,
        taperTube(
          curve([
            [sx * 0.6, y + 0.15, 0.12],
            [sx, y, 0.2],
            [sx * 1.15, y - 0.2, 0.16],
          ]),
          4,
          0.03,
          0.008,
          3,
        ),
        dark,
      );
    }
    for (const x of [-0.72, 0.22, 0.75])
      mesh(g, rough(new THREE.DodecahedronGeometry(0.12, 0), 0.03, x * 10), dark, x, 0.04, 0.3).scale.y = 0.4; // (where each digs into the floor)
    if (open)
      for (let k = 0; k < 14; k++) {
        // (leaves and flowers along it)
        const a = k / 13,
          x = Math.cos(a * Math.PI) * 0.7,
          y = 0.2 + Math.sin(a * Math.PI) * 1.25;
        mesh(g, new THREE.SphereGeometry(0.07, 5, 4).scale(1.3, 0.5, 1), MAT.lichen, x, y, 0.26);
        if (k % 3 === 1) {
          mesh(
            g,
            new THREE.SphereGeometry(0.05, 6, 4),
            tone(k % 2 ? 0xf0c0d8 : 0xfff2b0, 0.05),
            x + 0.04,
            y + 0.05,
            0.3,
          );
        }
      }
  } else {
    // frost: a cellar stair going down into black water, filled to halfway up the arch
    frame(g, w, look);
    if (!open) mesh(g, box(inner, 1.5, 0.04), MAT.socket, 0, 0.78, 0.02);
    if (!open)
      for (let k = 0; k < 4; k++) {
        // (the steps, coming down toward the room and under the water)
        const y = 1.18 - k * 0.15,
          z = 0.07 + k * 0.06;
        mesh(g, box(inner, 0.07, 0.1), tone(stoneOf(look, 1.05 - k * 0.08), 0.1), 0, y, z);
        mesh(g, box(inner, 0.015, 0.1), tone(stoneOf(look, 1.35), 0.05), 0, y + 0.04, z);
      }
    if (!open) {
      mesh(g, box(inner, 0.68, 0.05), WATER, 0, 0.34, 0.3); // (the water standing in the arch)
      mesh(g, box(inner, 0.025, 0.06), tone(0x5a8aa0, 0.05), 0, 0.69, 0.31); // (its surface catching the light)
      for (let k = 0; k < 3; k++)
        mesh(
          g,
          box(0.18 + R() * 0.2, 0.012, 0.01),
          tone(0x4a7488, 0.05),
          (R() - 0.5) * (inner - 0.4),
          0.5 - k * 0.14,
          0.335,
        );
      for (let k = 0; k < 7; k++) {
        const m = mesh(
          g,
          cyl(0.02, 0.02, 0.09, 4).rotateZ(Math.PI / 2),
          MAT.iron,
          (k / 6 - 0.5) * (inner - 0.1),
          1.0 - Math.abs(k - 3) * 0.06,
          0.37,
        );
        m.rotation.y = 0.2;
      } // (a chain across)
    } else {
      // (frozen over: a floor of ice running in through the doorway, the chain fallen)
      mesh(g, rough(box(inner, 0.06, 0.9), 0.02, 3), ICE, 0, 0.03, 0.45);
      for (let k = 0; k < 5; k++)
        mesh(
          g,
          new THREE.ConeGeometry(0.04 + R() * 0.03, 0.15 + R() * 0.15, 5).rotateX(Math.PI),
          ICE,
          (k / 4 - 0.5) * (inner - 0.1),
          1.48,
          0.36,
        );
      for (let k = 0; k < 7; k++)
        mesh(
          g,
          cyl(0.02, 0.02, 0.09, 4).rotateZ(Math.PI / 2),
          MAT.iron,
          -inner / 2 + 0.1 + k * 0.07,
          0.07,
          0.6 + (k % 2) * 0.03,
        );
    }
  }
  g.add(blob(w + 0.4));
  g.userData.parts = parts;
  mergeStill(g);
  return { group: g, veil: parts.veil as THREE.Mesh | undefined };
}

/** How a piece or bar built facing +z is turned to face into the room from each wall. */
export const FACE_TURN = { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 } as const;

/** The veil stirs; the lantern sways; the Ferryman's head turns toward (dx, dz), the mage seen from his boat. */
export function moveVeil(veil: THREE.Mesh, t: number) {
  const pos = veil.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i);
    pos.setZ(i, Math.sin(t * 1.3 + x * 2.6 + y * 0.8) * 0.045 * (0.75 - y / 2));
  }
  pos.needsUpdate = true;
}
export function moveFerryman(boat: THREE.Object3D, t: number, toMage: number | null) {
  const parts = boat.userData.parts as { head: THREE.Object3D; lantern: THREE.Object3D } | undefined;
  if (!parts) return; // (his made model moves itself)
  const { head, lantern } = parts;
  lantern.rotation.z = Math.sin(t * 1.4) * 0.12;
  lantern.rotation.x = Math.sin(t * 1.1 + 1) * 0.06;
  const want = toMage === null ? 0 : Math.max(-1.1, Math.min(1.1, toMage));
  head.rotation.y += (want - head.rotation.y) * 0.05;
}
