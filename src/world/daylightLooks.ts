/* Daylight's looks (M7 step 3; docs/M7-plan.md): the shaft of light where Kaelith's way out opens, and the cave mouth at
   dawn the mage steps out into, built in code and drawn in the pixel look like everything else.

   The view is laid in two parts. The terrace is real ground (its stone from the room kit's paving, in the morning's
   colours; rocks along its edge), so the mage walks out on it. Beyond the edge, the valleys are flat layers turned to face
   the camera (`facing`: the camera is orthographic, so a layer's depth changes nothing but what hides what, and the pixel
   look outlines each against the next): the sky in bands of dawn, the sun, thin cloud, three ranges of hills fading into
   the haze, banks of mist that drift, a cliff with water falling from it into spray, and the cave's own rock framing the
   top and the sides, which lifts off the view as the mage steps out. Their colours are drawn as they are (`toneMapped`
   off), so the dawn is the dawn. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { pixelFloorTexture } from '../render/pixelTextures';
import { TILT } from '../render/renderer';
import { FLOORS } from './generate';
import { MAT, mesh, rough, tone } from './kitParts';
import { ridge } from './daylightData';
import type { FloorLook } from '../types';

/** A flat colour drawn as it is (no light, no tone mapping): the vista's every layer. */
const flat = (color: number, opacity = 1) =>
  new THREE.MeshBasicMaterial({
    color,
    toneMapped: false,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });

/** A shape from the points of an outline (closed), as one flat layer at depth `z`. */
function layer(parent: THREE.Object3D, pts: [number, number][], color: number, z: number, opacity = 1) {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  return mesh(parent, new THREE.ShapeGeometry(shape), flat(color, opacity), 0, 0, z);
}
/** A range of hills: its ridge (daylightData.ts) filled down to `bottom`. */
const range = (
  parent: THREE.Object3D,
  seed: number,
  base: number,
  amp: number,
  color: number,
  z: number,
  bottom = -5,
  step = 0.3,
) => {
  const top = ridge(seed, -15, 15, step, base, amp);
  return { mesh: layer(parent, [[-15, bottom], ...top, [15, bottom]], color, z), top };
};

/** The shaft of daylight where Kaelith knelt: a pale gold column falling from above onto a bright ring of floor, dust
    turning in it. `ring` is what the way out pulses (the trapdoor's part). */
export function shaftLook() {
  const g = new THREE.Group();
  // (a column of light fading upward: its colour falls to black toward the top, and black adds nothing)
  const beam = (r0: number, r1: number, h: number, color: number, opacity: number) => {
    const geo = new THREE.CylinderGeometry(r1, r0, h, 24, 6, true),
      pos = geo.attributes.position,
      c = new THREE.Color(color),
      out: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const k = Math.pow(1 - (pos.getY(i) / h + 0.5), 1.6);
      out.push(c.r * k, c.g * k, c.b * k);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(out, 3));
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    m.position.y = h / 2;
    g.add(m);
    return m;
  };
  beam(0.75, 0.55, 4, 0xb08a50, 0.3);
  beam(0.42, 0.3, 4, 0xc8a870, 0.28); // (dim on their own: added over the floor and each other, they come up to daylight)
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(0.78, 32),
    new THREE.MeshBasicMaterial({
      color: 0xc8a068,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.03;
  g.add(pool);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.05, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xfff0c8 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  g.add(ring);
  const gl = glow(0xffd890, 2.4, 0.3);
  gl.position.y = 0.4;
  g.add(gl);
  const motes = new THREE.Group();
  g.add(motes); // (dust turning in the light)
  for (let i = 0; i < 14; i++) {
    const m = glow(0xfff4d8, 0.12, 0.9);
    m.position.set(Math.cos(i * 2.4) * 0.35, 0.3 + ((i * 0.37) % 2.4), Math.sin(i * 2.4) * 0.35);
    motes.add(m);
  }
  return { group: g, ring, motes };
}

/** The terrace's stone: the room kit's flagstones in the morning's colours, moss in the joints. */
function terraceLook(): FloorLook {
  const base = FLOORS[0].look;
  return {
    ...base,
    name: 'dawn',
    floor: { base: [118, 104, 86], mortar: '#3a3326', stain: '74,98,50', decor: 'bones', bones: 0 },
    kinds: {
      wall: 'ashlar',
      floor: 'flags',
      torch: base.kinds?.torch ?? 'bracket',
      brazier: base.kinds?.brazier ?? 'tripod',
    } as FloorLook['kinds'],
  };
}

export interface Vista {
  /** The whole scene: the terrace (ground) and `facing` (the layers turned to the camera), at the terrace's edge. */
  root: THREE.Group;
  facing: THREE.Group;
  /** What moves: the cave's rock opening (its top lifting, its sides drawing apart), the banks of mist drifting, the water falling, the sun's glow. */
  overhang: THREE.Group;
  cave: { top: THREE.Group; left: THREE.Group; right: THREE.Group };
  mists: { m: THREE.Mesh; x: number; speed: number }[];
  fall: THREE.Texture;
  sun: THREE.Group;
  spray: THREE.Sprite[];
}

/** A soft band for an alpha map: white in its middle, fading to black above and below, in steps (an alpha map reads the
    colour's green, so the fade is drawn in the colour). */
function bandTexture() {
  const h = 32,
    d = new Uint8Array(h * 4);
  for (let y = 0; y < h; y++) {
    const v = Math.round((Math.round(Math.sin((Math.PI * (y + 0.5)) / h) ** 1.5 * 5) / 5) * 255);
    d.set([v, v, v, 255], y * 4);
  }
  const t = new THREE.DataTexture(d, 1, h);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
/** Falling water: streaks of white and pale blue down a strip, repeating, scrolled downward as it falls. */
function fallTexture() {
  const w = 8,
    h = 64,
    d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const n = Math.sin(x * 12.9898 + y * 0.7) * 43758.5453,
        r = n - Math.floor(n),
        streak = (x * 7 + Math.floor(y / 6) * 3) % 5 === 0;
      const v = streak ? 255 : 196 + Math.floor(r * 40),
        i = (y * w + x) * 4;
      d[i] = v - (streak ? 0 : 30);
      d[i + 1] = v - (streak ? 0 : 10);
      d[i + 2] = 255;
      d[i + 3] = 255;
    }
  const t = new THREE.DataTexture(d, w, h);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** The cave mouth at dawn, its terrace's edge at the root's origin (the mage walks out to it from +Z). M7 step 9: the
    Vigil's Cave Mouth looks out on the same valleys from its own floor, without the terrace (`terrace`) or the cave's
    rock framing the view (`cave`). */
export function buildVista(o: { terrace?: boolean; cave?: boolean } = {}): Vista {
  const root = new THREE.Group(),
    facing = new THREE.Group();
  root.add(facing);
  // the layers face the camera: the camera's own turn (it looks down at TILT from +Z)
  facing.rotation.x = -TILT;

  // the sky in bands of dawn: deep blue above, rose, gold at the horizon
  const sky = new THREE.PlaneGeometry(32, 16, 1, 32);
  sky.translate(0, 3, 0);
  const stops: [number, number][] = [
    [9, 0x1c2550],
    [5.4, 0x37477e],
    [3.4, 0x8a6f9c],
    [2.2, 0xd88b8a],
    [1.2, 0xffb070],
    [-1, 0xffd29a],
    [-5, 0xffd8a8],
  ];
  const colours: number[] = [],
    pos = sky.attributes.position,
    c = new THREE.Color(),
    c2 = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    let k = stops.findIndex((s) => s[0] <= y);
    if (k <= 0) k = Math.max(1, k === 0 ? 1 : stops.length - 1);
    const [y0, a] = stops[k - 1],
      [y1, b] = stops[k],
      t = Math.min(1, Math.max(0, (y0 - y) / (y0 - y1)));
    c.set(a).lerp(c2.set(b), Math.round(t * 6) / 6);
    colours.push(c.r, c.g, c.b); // (in steps, as the pixel look's light is)
  }
  sky.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  mesh(
    facing,
    sky,
    new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, depthWrite: true }),
    0,
    0,
    -70,
  );

  // the sun, low over the far range, and its glow
  const sun = new THREE.Group();
  sun.position.set(3.2, 1.7, -68);
  facing.add(sun);
  mesh(
    sun,
    new THREE.CircleGeometry(0.48, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff4d2, toneMapped: false, depthWrite: false }),
  ); // (no depth of its own: the pixel look draws no outline round the sun)
  const g1 = glow(0xffd890, 4.5, 0.75),
    g2 = glow(0xffb070, 11, 0.3);
  sun.add(g1, g2);
  // thin cloud, lit from below
  for (const [x, y, w, col] of [
    [-4.5, 4.2, 3.2, 0xe7a0a0],
    [-1.2, 4.9, 2.2, 0xc98fa8],
    [5.8, 3.6, 2.6, 0xf3b896],
    [1.8, 3.1, 1.6, 0xffc8a0],
  ] as const) {
    const cl = mesh(facing, new THREE.CircleGeometry(0.5, 20), flat(col), x, y, -66);
    cl.scale.set(w, 0.16, 1);
  }

  // three ranges into the haze, a bank of mist between each
  const mists: Vista['mists'] = [],
    band = bandTexture();
  const mist = (y: number, h: number, z: number, opacity: number, speed: number) => {
    const m = mesh(
      facing,
      new THREE.PlaneGeometry(34, h),
      new THREE.MeshBasicMaterial({
        color: 0xfbe6dc,
        alphaMap: band,
        transparent: true,
        opacity,
        depthWrite: false,
        toneMapped: false,
      }),
      0,
      y,
      z,
    );
    mists.push({ m, x: 0, speed });
  };
  range(facing, 11, 2.0, 0.75, 0x9a90bc, -60, -5, 0.4);
  mist(1.35, 1.3, -55, 0.55, 0.16);
  range(facing, 23, 1.05, 0.55, 0x7480a6, -45);
  mist(0.6, 1.1, -40, 0.5, -0.12);
  const near = range(facing, 37, 0.25, 0.4, 0x4c6a63, -30, -5, 0.25);
  // firs along the near hills
  for (let i = 0; i < near.top.length; i += 3) {
    const [x, y] = near.top[i],
      h = 0.28 + ((i * 7) % 5) * 0.05;
    layer(
      facing,
      [
        [x - h * 0.32, y - 0.05],
        [x, y + h],
        [x + h * 0.32, y - 0.05],
      ],
      0x2f4a44,
      -29,
    );
  }
  mist(-0.5, 1.6, -24, 0.6, 0.1);

  // a cliff on the left with water falling from its lip into spray
  layer(
    facing,
    [
      [-15, -5],
      [-15, 3.3],
      [-8.4, 3.1],
      [-7.1, 2.4],
      [-6.2, 2.05],
      [-5.55, 1.9],
      [-5.3, 0.3],
      [-5.05, -1.2],
      [-5.4, -5],
    ],
    0x34403f,
    -18,
  );
  layer(
    facing,
    [
      [-8.4, 3.1],
      [-7.1, 2.4],
      [-6.2, 2.05],
      [-5.55, 1.9],
      [-5.5, 1.78],
      [-6.3, 1.92],
      [-7.2, 2.28],
      [-8.4, 2.96],
    ],
    0x55684e,
    -17.9,
  ); // (moss along the lip)
  const fall = fallTexture();
  fall.repeat.set(1, 3);
  mesh(
    facing,
    new THREE.PlaneGeometry(0.42, 3.4),
    new THREE.MeshBasicMaterial({ map: fall, toneMapped: false }),
    -5.95,
    0.2,
    -17.5,
  );
  const spray: THREE.Sprite[] = [];
  for (let i = 0; i < 4; i++) {
    const s = glow(0xffffff, 1.1 + i * 0.3, 0.4);
    s.position.set(-5.95 + (i - 1.5) * 0.25, -1.45 + i * 0.06, -17);
    facing.add(s);
    spray.push(s);
  }

  // the cave's own rock, an arch framing the view (high in the middle, low at the sides); it opens as the mage steps out:
  // the top lifts, the sides draw apart
  const overhang = new THREE.Group(),
    top = new THREE.Group(),
    left = new THREE.Group(),
    right = new THREE.Group();
  overhang.add(top, left, right);
  if (o.cave !== false) facing.add(overhang);
  const archY = (x: number) => 5.05 - Math.max(0, Math.abs(x) - 2.5) * 0.26;
  const lip = ridge(51, -15, 15, 0.3, 0, 0.22).map(([x, y]) => [x, y + archY(x)] as [number, number]);
  layer(top, [[-15, 14], ...lip, [15, 14]], 0x0f0b14, 6);
  for (const [x, len] of [
    [-5.2, 0.9],
    [-3.6, 0.6],
    [-0.8, 1.1],
    [2.4, 0.7],
    [4.9, 1],
    [6.3, 0.5],
  ] as const) {
    // (roots hanging from the lip)
    const y0 = lip.reduce((b, p) => (Math.abs(p[0] - x) < Math.abs(b[0] - x) ? p : b))[1];
    layer(
      top,
      [
        [x - 0.03, y0 + 0.05],
        [x + 0.03, y0 + 0.05],
        [x + 0.015, y0 - len],
        [x - 0.015, y0 - len],
      ],
      0x241c18,
      6.2,
    );
  }
  layer(
    left,
    [
      [-15, 12],
      [-15, -7],
      [-8.7, -7],
      [-8.2, -1.2],
      [-8.7, 1.6],
      [-7.8, 3.6],
      [-7.2, 12],
    ],
    0x0f0b14,
    6.1,
  );
  layer(
    right,
    [
      [15, 12],
      [15, -7],
      [9, -7],
      [8.4, -0.8],
      [8.9, 2],
      [8.1, 3.8],
      [7.5, 12],
    ],
    0x0f0b14,
    6.1,
  );

  // the terrace: real ground, the room kit's flagstones in the morning's colours, and rocks along its edge
  if (o.terrace === false) return { root, facing, overhang, cave: { top, left, right }, mists, fall, sun, spray };
  const W = 26,
    H = 8,
    mask = Array.from({ length: H }, () => Array.from({ length: W }, () => true));
  const { map } = pixelFloorTexture(0x0da1, 'normal', terraceLook(), mask);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, H / 2);
  root.add(ground);
  const stone = tone(0x6e6a64, 0.12),
    moss = tone(0x56684a, 0.1);
  for (let i = 0; i < 22; i++) {
    const x = -12 + i * 1.15 + Math.sin(i * 3.7) * 0.3,
      r = 0.14 + ((i * 5) % 7) * 0.03;
    mesh(
      root,
      rough(new THREE.DodecahedronGeometry(r, 0), 0.18, i),
      i % 4 === 0 ? moss : stone,
      x,
      r * 0.55,
      0.12 + Math.sin(i * 1.9) * 0.1,
    );
  }
  for (let i = 0; i < 16; i++) {
    // tufts of grass in the joints near the edge
    const x = -11 + i * 1.45 + Math.cos(i * 2.3) * 0.4,
      z = 0.6 + ((i * 3) % 5) * 0.35;
    mesh(root, new THREE.ConeGeometry(0.06, 0.22, 4), MAT.lichen, x, 0.11, z);
    mesh(root, new THREE.ConeGeometry(0.05, 0.17, 4), MAT.lichen, x + 0.08, 0.085, z + 0.05);
  }
  return { root, facing, overhang, cave: { top, left, right }, mists, fall, sun, spray };
}
