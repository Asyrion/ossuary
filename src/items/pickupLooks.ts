/* The pickups and containers in the room kit's style (docs/archive/M3.5-plan.md): hearts of blood with a glowing
   face (a half one broken down the middle), an obol wearing a coin face (obolFace.ts) or, without
   one, stamped with a rune, a leather purse with a coin in its neck, a mana
   vial of blue grave-light, a bone key with a ward-blue stone in its bow, a glyph stone with its rune burning amber; an
   offering coffer (planks, iron bands, a slot for coins) and a reliquary chest (dark wood, bone or gilt bands, a lock
   plate) with its ward seal, a circle of runes. Built once each, merged (`mergeStill`), and cloned: what a pickup is and
   does is in pickups.ts. */
import * as THREE from 'three';
import { TILT } from '../render/renderer';
import { CFG } from '../config';
import { FINE, markFine } from '../render/pixelLook';
import { blob, glow, glowShared, markShared, mergeStill } from '../render/materials';
import { glowTone, mesh, rough, runeStrokes, shade, shared, tone } from '../world/kitParts';
import { box, put } from '../world/objectLooks';
import { WARD_COLOR as WARD } from '../world/rooms';
import type { Item } from './loot';
import { obolFaceNow, obolFaces } from './obolFace';
import { coinFace, modelFor, type CoinFace } from '../assets/models';

const V = (x: number, y: number) => new THREE.Vector2(x, y);
/** A shape turned round the upright from its outline, given from the bottom up. */
const lathe = (pts: number[][], seg = 10) =>
  new THREE.LatheGeometry(
    pts.map(([x, y]) => V(x, y)),
    seg,
  );
const cyl = (r0: number, r1: number, h: number, seg = 8) => new THREE.CylinderGeometry(r0, r1, h, seg);

const BLOOD = 0x8a1610,
  RUBY = 0xd83426,
  SHINE = 0xffb4a0,
  OBOL = 0xc89a44,
  LEATHER = 0x5a2c22, // (oxblood: a dark body off floor 1's ochre, its obols the bright part)
  CORD = 0xc8a878,
  GLASS = 0x9ebed8,
  MANA = 0x4a8cff,
  CORK = 0x8a6a44,
  BONE = 0xe4d8bc,
  SLATE = 0x3a332c,
  SLATE_RIM = 0x5e554c,
  AMBER = 0xffae48,
  OAK = 0x6a4428,
  DARK_OAK = 0x563620,
  IRON = 0x6e6a72,
  GILT = 0xc49a4a,
  GOLD = 0xffd27a;
const metal = (c: number) => tone(c, 0.05, 0.45);

/** A heart's outline, .68 across: whole, or its left half broken off down the middle. */
function heartShape(half: boolean) {
  const s = new THREE.Shape();
  if (half) {
    s.moveTo(0, 0.18);
    s.bezierCurveTo(-0.12, 0.34, -0.34, 0.28, -0.34, 0.1);
    s.bezierCurveTo(-0.34, -0.05, -0.05, -0.22, 0, -0.3);
    for (const [x, y] of [
      [-0.03, -0.2],
      [0.03, -0.1],
      [-0.02, 0],
      [0.03, 0.09],
    ])
      s.lineTo(x, y); // (the break)
    s.lineTo(0, 0.18);
  } else {
    s.moveTo(0, -0.3);
    s.bezierCurveTo(0.05, -0.22, 0.34, -0.05, 0.34, 0.1);
    s.bezierCurveTo(0.34, 0.28, 0.12, 0.34, 0, 0.18);
    s.bezierCurveTo(-0.12, 0.34, -0.34, 0.28, -0.34, 0.1);
    s.bezierCurveTo(-0.34, -0.05, -0.05, -0.22, 0, -0.3);
  }
  return s;
}
const extrude = (s: THREE.Shape, depth: number, bevel: number) =>
  new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 7,
  }).translate(0, 0, -depth / 2);

/** A flat group facing the camera above (tipped back by the camera's tilt), inside `g`. */
function facing(g: THREE.Group) {
  const f = new THREE.Group();
  f.rotation.x = -TILT;
  g.add(f);
  return f;
}

type Build = (g: THREE.Group) => void;
const ITEMS: Record<Exclude<Item, 'potion' | 'reagent' | 'rune'>, Build> = {
  // (potions and reagents: alchemyLooks.ts; runes: runeLooks.ts)
  heart: (g) => heart(g, false),
  halfHeart: (g) => heart(g, true),
  coin(g) {
    // a face: the coin tipped back to the camera, at its face's pixel size; the rune: upright, as before
    const face = obolFaceNow();
    if (face) facedObol(facing(g), face, FACE_R);
    else obol(g, 1);
    g.add(glowShared(GOLD, 0.8, 0.6));
  },
  purse(g) {
    // a squat leather pouch drawn shut with cord, its mouth gathered in a frill, obols showing at it and one
    // sewn on each side
    mesh(
      g,
      rough(
        lathe(
          [
            [0, -0.18],
            [0.11, -0.175],
            [0.18, -0.14],
            [0.215, -0.08],
            [0.22, -0.02],
            [0.195, 0.04],
            [0.14, 0.09],
            [0.075, 0.112],
            [0.062, 0.13],
            [0.1, 0.16],
            [0.15, 0.2],
            [0.125, 0.215],
            [0.07, 0.19],
            [0, 0.18],
          ],
          11,
        ),
        0.02,
        5,
      ),
      tone(LEATHER, 0.16),
    );
    put(mesh(g, new THREE.TorusGeometry(0.07, 0.022, 4, 10), tone(CORD, 0.05), 0, 0.118, 0), Math.PI / 2);
    for (const s of [-1, 1])
      put(mesh(g, cyl(0.011, 0.009, 0.13, 4), tone(CORD), s * 0.06, 0.06, 0.1), 0.35, 0, s * 0.4);
    for (const [x, y, z, rx, rz] of [
      [0.02, 0.2, 0.05, -0.9, 0.2],
      [-0.05, 0.205, -0.03, -0.3, -0.5],
    ]) {
      const c = new THREE.Group();
      c.position.set(x, y, z);
      c.rotation.set(rx, 0, rz);
      obol(c, 0.55);
      g.add(c);
    }
    for (const z of [-1, 1]) {
      const c = new THREE.Group();
      c.position.set(0, -0.04, z * 0.21);
      c.rotation.set(-0.15 * z, z < 0 ? Math.PI : 0, 0);
      obol(c, 0.45);
      g.add(c);
    }
    g.add(glowShared(GOLD, 0.7, 0.45));
  },
  mana(g) {
    // a vial of blue grave-light: the glowing draught in its belly, the glass shoulder and neck, a cork tied down
    mesh(
      g,
      lathe(
        [
          [0, -0.13],
          [0.07, -0.13],
          [0.1, -0.1],
          [0.112, -0.05],
          [0.104, 0.01],
          [0.086, 0.035],
          [0, 0.035],
        ],
        10,
      ),
      glowTone(MANA),
    );
    mesh(
      g,
      lathe(
        [
          [0.088, 0.03],
          [0.095, 0.045],
          [0.07, 0.075],
          [0.042, 0.09],
          [0.036, 0.14],
          [0.048, 0.15],
          [0.046, 0.165],
          [0, 0.165],
        ],
        10,
      ),
      tone(GLASS, 0.04, 0.35),
    );
    put(mesh(g, new THREE.TorusGeometry(0.078, 0.012, 3, 12), tone(GLASS, 0, 0.35), 0, -0.125, 0), Math.PI / 2);
    mesh(g, cyl(0.034, 0.03, 0.06, 7), tone(CORK, 0.1), 0, 0.19, 0);
    put(mesh(g, new THREE.TorusGeometry(0.04, 0.008, 3, 10), tone(CORD), 0, 0.135, 0), Math.PI / 2);
    put(mesh(g, cyl(0.01, 0.01, 0.08, 4), glowTone(0xdcecff), -0.045, -0.045, 0.108), 0, 0, 0.15); // (a glint on the glass)
    g.add(glowShared(0x6fa8ff, 0.8, 0.6));
  },
  key(g) {
    // a bone key: its bow a ring round a ward-blue stone (large enough to glint), a collar, the shaft, two bits
    const k = new THREE.Group();
    k.scale.setScalar(1.15);
    g.add(k);
    const b = new THREE.Group();
    b.position.x = -0.19;
    k.add(b);
    mesh(b, new THREE.TorusGeometry(0.078, 0.034, 5, 12), tone(BONE, 0.06));
    put(mesh(b, new THREE.OctahedronGeometry(0.055, 0), glowTone(WARD)), 0, 0, 0, [1, 1.3, 0.7]);
    mesh(b, new THREE.SphereGeometry(0.03, 5, 4), tone(BONE), 0, 0.11, 0);
    put(mesh(k, cyl(0.032, 0.026, 0.3, 6), tone(BONE, 0.06), 0.03, 0, 0), 0, 0, Math.PI / 2);
    for (const x of [-0.09, -0.06])
      put(mesh(k, cyl(0.044, 0.044, 0.02, 7), tone(shade(BONE, 0.85)), x, 0, 0), 0, 0, Math.PI / 2);
    box(k, 0.055, 0.1, 0.055, tone(BONE, 0.06), 0.15, -0.07, 0);
    box(k, 0.05, 0.075, 0.055, tone(BONE, 0.06), 0.075, -0.06, 0);
    g.add(glowShared(0xf0e6cc, 0.6, 0.35));
  },
  glyph(g) {
    // a glyph stone: a slate, its rim worn pale, its rune burning amber
    const f = facing(g);
    put(mesh(f, rough(cyl(0.2, 0.21, 0.06, 10), 0.012, 9), tone(SLATE, 0.12)), Math.PI / 2, 0, 0, [1, 1, 1.12]);
    put(mesh(f, new THREE.TorusGeometry(0.19, 0.014, 3, 16), tone(SLATE_RIM, 0.06), 0, 0, 0.03), 0, 0, 0, [1, 1.12, 1]);
    mesh(f, GEO.rune, glowTone(AMBER), 0, 0, 0.04);
    g.add(glowShared(0xff9a3a, 0.75, 0.55));
  },
  paleSoul: (g) => soul(g, 0xa8c0f0, 0xe8f0ff), // a pale flame with a white heart
  blackSoul(g) {
    soul(g, 0x2a1640, 0xb07aff, true);
    put(mesh(g, new THREE.TorusGeometry(0.12, 0.012, 3, 16), glowTone(0xa266ff), 0, -0.15, 0), Math.PI / 2);
  },
  hallowedSoul(g) {
    soul(g, 0xffd878, 0xfffbe8);
    put(mesh(g, new THREE.TorusGeometry(0.085, 0.013, 3, 18), glowTone(0xffe8a0), 0, 0.33, 0), Math.PI / 2 - 0.25);
  },
  shard(g) {
    // a splinter of lodestone: dark iron-grey, veined with the pale cyan it pulls in, a chip beside it, filings at its
    // foot (its veins pale: a blue one sank into a dark floor with the body)
    const iron = tone(0x5c6478, 0.2, 0.55),
      vein = glowTone(0xb0f4ff);
    put(mesh(g, rough(new THREE.OctahedronGeometry(0.17, 0), 0.025, 11), iron), 0.15, 0.3, 0.1, [0.72, 1.55, 0.6]);
    put(
      mesh(g, rough(new THREE.OctahedronGeometry(0.08, 0), 0.014, 12), iron, 0.17, -0.14, 0.04),
      0.5,
      0,
      -0.7,
      [0.8, 1.4, 0.6],
    );
    for (const [x, y, rz, l] of [
      [-0.03, 0.08, 0.35, 0.16],
      [0.04, -0.07, -0.45, 0.13],
      [0, 0.22, 0.1, 0.1],
    ])
      put(mesh(g, cyl(0.03, 0.03, l, 4), vein, x, y, 0.09), 0, 0, rz); // (two pixels wide at least: thinner flickered)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      box(g, 0.025, 0.014, 0.06, iron, Math.cos(a) * 0.19, -0.24, Math.sin(a) * 0.19).rotation.y = -a;
    }
    g.add(glowShared(0x9ae8ff, 0.9, 0.6));
  },
};
/** A soul mote: a flame turned on the upright, its `body` colour round a brighter `core`; `dark`, the body unlit (a black
    mote's shadow, its light all in the core). */
function soul(g: THREE.Group, body: number, core: number, dark = false) {
  const flame = [
    [0, -0.16],
    [0.09, -0.15],
    [0.13, -0.1],
    [0.14, -0.03],
    [0.12, 0.04],
    [0.085, 0.1],
    [0.05, 0.16],
    [0.02, 0.22],
    [0, 0.27],
  ];
  mesh(g, lathe(flame, 10), dark ? tone(body, 0.1) : glowTone(body));
  put(
    mesh(
      g,
      lathe(
        flame.map(([x, y]) => [x * 0.5, y * 0.55 - 0.05]),
        8,
      ),
      glowTone(core),
      0,
      0.035,
      0.1,
    ),
    0,
    0,
    0,
    [1, 1, 0.6],
  ); // (its heart, showing at the front)
  for (const [x, y, r] of [
    [-0.06, 0.33, 0.022],
    [0.05, 0.4, 0.016],
  ])
    mesh(g, new THREE.SphereGeometry(r, 5, 4), glowTone(core), x, y, 0); // (sparks rising off it)
  g.add(glowShared(dark ? 0xa266ff : body, 0.75, 0.55));
}
const GEO = { rune: shared(runeStrokes(0.26)), stamp: shared(runeStrokes(0.13)) };

/** A heart of blood: its body dark, its face a glowing ruby, a glint on it; `half`, broken down the middle. */
function heart(g: THREE.Group, half: boolean) {
  const f = facing(g),
    s = heartShape(half);
  mesh(f, extrude(s, 0.08, 0.03), tone(BLOOD, 0.08, 0.15));
  put(mesh(f, extrude(s, 0.06, 0.012), glowTone(RUBY), 0, 0.01, 0.04), 0, 0, 0, [0.74, 0.74, 1]);
  put(mesh(f, new THREE.SphereGeometry(0.035, 6, 4), glowTone(SHINE), -0.15, 0.12, 0.085), 0, 0, 0.6, [1.4, 0.7, 0.5]);
}
/** An obol `s` times full size: the coin face it wears (a purse's coins too), or (`face` null) a disc with a raised rim
    and a rune stamped on both faces. */
function obol(g: THREE.Object3D, s: number, face = obolFaceNow()) {
  const o = new THREE.Group();
  o.scale.setScalar(s);
  g.add(o);
  if (face) {
    facedObol(o, face, 0.17, true);
    return;
  }
  put(mesh(o, cyl(0.17, 0.17, 0.035, 16), metal(OBOL)), Math.PI / 2);
  mesh(o, new THREE.TorusGeometry(0.165, 0.02, 4, 18), metal(shade(OBOL, 1.1)));
  for (const z of [-1, 1])
    put(mesh(o, GEO.stamp, metal(shade(OBOL, 0.72)), 0, 0, z * 0.018), 0, z < 0 ? Math.PI : 0, 0);
}

/** A coin's radius when it wears a face: `CFG.pickups.coinPixels` game pixels across, its face drawn on the fine layer
    (pixelLook.ts: `images.coin.size` fine pixels across, so a coin facing the camera shows it pixel for pixel). */
export const FACE_R = CFG.pickups.coinPixels / 2 / CFG.roomKit.texel[0];
const faceMats = new Map<string, { face: THREE.Material; edge: THREE.Material }>(),
  fineMats = new Set<THREE.Material>();
/** A coin `r` in radius wearing `face` on both sides, facing +z, its edge in the face's rim colour (a material of its
    own, so the edge isn't merged with what else is painted: `onFine` puts the coin on the fine layer). The face is drawn
    pixel by pixel (no smoothing, no mipmaps), lit a little from within so it reads in a dark room; a `small` coin (a
    purse's, a few pixels across with the rest of the room) is smoothed down to its size, so it doesn't shimmer. */
function facedObol(g: THREE.Object3D, face: CoinFace & { id: string }, r: number, small = false) {
  const key = face.id + (small ? ':small' : '');
  let m = faceMats.get(key);
  if (!m) {
    const map = new THREE.Texture(face.img);
    map.colorSpace = THREE.SRGBColorSpace;
    map.generateMipmaps = small;
    map.magFilter = THREE.NearestFilter;
    map.minFilter = small ? THREE.LinearMipmapLinearFilter : THREE.NearestFilter;
    map.needsUpdate = true;
    const look = new THREE.MeshStandardMaterial({
      map,
      emissive: 0xffffff,
      emissiveMap: map,
      emissiveIntensity: CFG.pickups.coinGlow,
      metalness: 0.25,
      roughness: 0.55,
      alphaTest: 0.5,
    });
    const edge = new THREE.MeshStandardMaterial({
      color: face.rim,
      metalness: 0.45,
      roughness: 0.5,
      flatShading: true,
    });
    faceMats.set(key, (m = { face: markShared(look), edge: markShared(edge) }));
    if (!small) fineMats.add(look).add(edge);
  }
  for (const z of [-1, 1])
    put(mesh(g, new THREE.CircleGeometry(r, 28), m.face, 0, 0, z * 0.018), 0, z < 0 ? Math.PI : 0, 0);
  put(mesh(g, new THREE.CylinderGeometry(r, r, 0.036, 28, 1, true), m.edge), Math.PI / 2);
}

const items = new Map<string, THREE.Object3D>();
/** A pickup's look (a copy: its merged geometry and its materials shared with every other of the kind). An obol's and a
    purse's are kept by the face they wear. */
export function itemLook(kind: Exclude<Item, 'potion' | 'reagent' | 'rune'>) {
  const key = kind === 'coin' || kind === 'purse' ? `${kind}:${obolFaceNow()?.id ?? 'rune'}` : kind;
  let t = items.get(key);
  if (!t) {
    const g = new THREE.Group();
    ITEMS[kind](g);
    t = keep(g);
    if (kind === 'coin') onFine(t);
    items.set(key, t);
  }
  const c = t.clone();
  if (t.userData.fine) markFine(c);
  return c;
}
/** A coin face's meshes in `o` moved to the fine layer (after merging, which makes new meshes): drawn at the finer pixel;
    `o` is marked (`userData.fine`) when it has any. A purse's coins stay with the purse. */
function onFine(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh && fineMats.has(m.material as THREE.Material)) {
      m.layers.set(FINE);
      o.userData.fine = true;
    }
  });
}

/** Every coin face the obols can wear, side by side (the dev menu's gallery): each a coin as the room shows it, at its
    pickup's height, in a row centred on (x, z) in `parent`'s space; the rune last. */
export function coinGallery(parent: THREE.Object3D, x: number, z: number) {
  const g = new THREE.Group(),
    ids = obolFaces(),
    gap = FACE_R * 2.6;
  ids.forEach((id, i) => {
    const c = new THREE.Group(),
      f = coinFace(id);
    if (f) facedObol(facing(c), { ...f, id }, FACE_R);
    else obol(c, 1, null);
    c.add(glowShared(GOLD, 0.8, 0.6));
    c.position.set(x + (i - (ids.length - 1) / 2) * gap, 0.35, z);
    g.add(c);
  });
  mergeStill(g);
  onFine(g);
  markFine(g);
  parent.add(g);
  return g;
}

/** A coffer or a chest, merged, its lid on a hinge at the back (`lid`, turned to open) and a chest's ward seal on its
    front (`ward`: its first child, the circle of runes, turns; gold on a gilded chest). A made model (data/assets.json:
    props `coffer`, `chest`, `chest_gilded`, its lid a node named `lid` turning about its own origin at the hinge) takes
    the place of the one built here. As in pickups.ts. */
export function containerLook(kind: 'coffer' | 'chest', gilded = false) {
  const key = kind + (gilded ? ':gilded' : '');
  let t = boxes.get(key);
  if (!t) {
    t = madeContainer(kind, gilded) ?? (kind === 'coffer' ? coffer() : chest(gilded));
    boxes.set(key, t);
  }
  const g = t.clone(),
    lid = g.getObjectByName('lid')!,
    ward = g.getObjectByName('ward');
  if (ward) {
    const flat = ward.userData.flat === true, // (lying over a made chest's lid, its glow small: a large one tinted the lid)
      gl = glow(gilded ? GOLD : WARD, flat ? 0.7 : gilded ? 1.3 : 1, flat ? 0.3 : 0.55);
    ward.add(gl);
  } // (its own: it is freed when the ward breaks)
  return { g, lid, ward };
}
const boxes = new Map<string, THREE.Object3D>();

/** A container's made model, its ward seal (a chest's) standing before its front, or null where none is made or its lid
    can't be found. */
function madeContainer(kind: 'coffer' | 'chest', gilded: boolean) {
  const model = modelFor('props', kind === 'coffer' ? 'coffer' : gilded ? 'chest_gilded' : 'chest');
  if (!model) return null;
  if (!model.getObjectByName('lid')) {
    console.warn(`asset props.${kind}: the model has no node named lid; the one built in code stays`);
    return null;
  }
  const g = new THREE.Group();
  g.add(model, blob(kind === 'coffer' ? 0.8 : 1));
  if (kind === 'chest') {
    // (its seal hovers flat over the lid, turning: seen from above as the camera sees it, the lock and bands left clear)
    const box = new THREE.Box3().setFromObject(model),
      ward = wardSeal(gilded, true);
    ward.position.set(0, box.max.y + CFG.roomKit.sealHover, (box.min.z + box.max.z) / 2);
    g.add(ward);
  }
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.geometry) m.geometry.userData.shared = true;
  }); // (its copies share it: taking one away frees nothing)
  return g;
}

/** An offering coffer: a box of planks, iron bands and corners, a lid with a slot for coins and a hasp. */
function coffer() {
  const g = new THREE.Group(),
    lid = new THREE.Group(),
    wood = tone(OAK, 0.12),
    dark = tone(0x16100c),
    iron = metal(IRON);
  box(g, 0.5, 0.28, 0.36, wood, 0, 0.14, 0);
  for (const x of [-0.16, 0.16]) box(g, 0.05, 0.29, 0.372, iron, x, 0.145, 0);
  lid.name = 'lid';
  lid.position.set(0, 0.28, -0.18);
  g.add(lid);
  box(lid, 0.53, 0.07, 0.39, wood, 0, 0.035, 0.18);
  box(lid, 0.44, 0.025, 0.3, tone(shade(OAK, 1.1), 0.08), 0, 0.08, 0.18);
  for (const x of [-0.16, 0.16]) box(lid, 0.055, 0.075, 0.4, iron, x, 0.037, 0.18);
  for (const x of [-1, 1])
    for (const z of [-1, 1]) box(lid, 0.05, 0.076, 0.05, iron, x * 0.245, 0.037, 0.18 + z * 0.175);
  box(lid, 0.16, 0.012, 0.035, dark, 0, 0.093, 0.18); // (the slot for the coins)
  box(lid, 0.06, 0.09, 0.02, iron, 0, -0.01, 0.38);
  g.add(blob(0.8));
  return keep(g, [lid]);
}

/** A reliquary chest: dark wood on a plinth, a rounded lid, bands of bone (gilt on a gilded one) over box and lid, a lock
    plate, and the ward seal standing before it. */
function chest(gilded: boolean) {
  const g = new THREE.Group(),
    lid = new THREE.Group(),
    wood = tone(DARK_OAK, 0.14),
    band = gilded ? metal(GILT) : tone(BONE, 0.06),
    dark = tone(shade(DARK_OAK, 0.55));
  box(g, 0.76, 0.04, 0.5, tone(shade(DARK_OAK, 0.8), 0.08), 0, 0.02, 0);
  box(g, 0.72, 0.32, 0.46, wood, 0, 0.2, 0);
  for (const y of [0.13, 0.25]) box(g, 0.72, 0.012, 0.004, dark, 0, y, 0.231);
  for (const x of [-0.24, 0.24]) box(g, 0.06, 0.34, 0.48, band, x, 0.19, 0);
  for (const x of [-1, 1]) for (const z of [-1, 1]) box(g, 0.05, 0.07, 0.05, band, x * 0.35, 0.06, z * 0.22);
  box(g, 0.13, 0.13, 0.02, band, 0, 0.28, 0.238);
  box(g, 0.025, 0.05, 0.01, tone(0x16100c), 0, 0.27, 0.25); // (the lock plate, its keyhole)
  lid.name = 'lid';
  lid.position.set(0, 0.36, -0.23);
  g.add(lid);
  put(
    mesh(
      lid,
      new THREE.CylinderGeometry(0.23, 0.23, 0.74, 12, 1, false, 0, Math.PI),
      tone(shade(DARK_OAK, 1.2), 0.14),
      0,
      0,
      0.23,
    ),
    0,
    0,
    Math.PI / 2,
  );
  for (const x of [-0.24, 0.24])
    put(mesh(lid, new THREE.TorusGeometry(0.235, 0.03, 4, 12, Math.PI), band, x, 0, 0.23), 0, Math.PI / 2, 0);
  if (gilded)
    put(
      mesh(lid, new THREE.OctahedronGeometry(0.05, 0), glowTone(GOLD), 0, 0.24, 0.23),
      0,
      Math.PI / 4,
      0,
      [1, 0.6, 1],
    );
  const ward = wardSeal(gilded);
  ward.position.set(0, 0.24, 0.26);
  g.add(ward);
  g.add(blob(1));
  return keep(g, [lid], [ward]); // (the seal, merged above, turns on its own)
}
/** A chest's ward seal, standing tilted back a little (or lying `flat`, wider, over a made chest's lid): a circle of runes
    in ward blue (a pale gold on a gilded chest, which a deeper gold over its red wood turned pink), its rings two pixels
    thick, merged. */
function wardSeal(gilded: boolean, flat = false) {
  const ward = new THREE.Group();
  ward.name = 'ward';
  ward.rotation.x = flat ? -Math.PI / 2 : -0.3;
  ward.userData.flat = flat;
  const seal = new THREE.Group(),
    light = glowTone(gilded ? SEAL_GOLD : WARD);
  if (flat) seal.scale.setScalar(CFG.roomKit.sealFlatScale);
  ward.add(seal);
  mesh(seal, new THREE.TorusGeometry(0.19, 0.018, 3, 28), light);
  mesh(seal, new THREE.TorusGeometry(0.13, 0.012, 3, 24), light);
  mesh(seal, GEO.stamp, light);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    put(mesh(seal, SEAL_RUNE, light, Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0), 0, 0, a - Math.PI / 2);
  }
  mergeStill(seal);
  return ward;
}
const SEAL_RUNE = shared(runeStrokes(0.045)),
  SEAL_GOLD = 0xffeaa0;

/** A look merged (the parts that move, `moving` each merged on its own, `apart` left as they are) and kept to be copied: its geometry marked shared,
    so taking one copy away frees nothing the others use. */
export function keep(g: THREE.Group, moving: THREE.Object3D[] = [], apart: THREE.Object3D[] = []) {
  for (const m of moving) mergeStill(m);
  g.userData.parts = Object.fromEntries([...moving, ...apart].map((m, i) => [i, m]));
  mergeStill(g);
  delete g.userData.parts; // (a copy copies its userData through JSON: objects left in it would be written out every time)
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.geometry) m.geometry.userData.shared = true;
  });
  return g;
}
