/* Themed rooms in play (the data is in themeData.ts and data/themes.json): the dressing a theme scatters
   over the floor, which never blocks, and the twists:
   - risingBones  the ossuary's bone piles and skull heaps burst, one at a time, if the fight drags on, and the floor's
                  walker comes out of what nested in them;
   - pages        a scroll heap in the scriptorium sometimes hides a torn grimoire page;
   - sleepers     the pilgrims' rest's foes sleep until hurt, or until the mage comes close;
   - caveIn       a glyph's blast in the collapsed crypt brings more of the ceiling down: stones fall round it a moment
                  later (their shadows show where), hurting what they land on and leaving rubble;
   - garden       the overgrown garden's Overgrown holds longer (`inflict` in magic/statusFx.ts, `CFG.themes.gardenGrow`). */
import * as THREE from 'three';
import { CFG } from '../config';
import { callFoe } from '../actors/foeData';
import type { Enemy, FloorLook, Room } from '../types';
import { G, after, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { M, blob, glow, markShared, mergeStill } from '../render/materials';
import type { FlameSpec } from '../render/fire';
import { burst } from '../combat/fx';
import { damageEnemy, hurtPlayer } from '../combat/damage';
import { makeEnemy } from '../actors/enemies';
import { dropPage } from '../magic/pages';
import { toast } from '../notify';
import { mulberry } from '../util';
import { FLOORS } from './generate';
import { addProp, removeProp } from './props';
import type { ScatterKind } from './themeData';
import { OBJECT_LOOKS, candleFire, put } from './objectLooks';
import { mesh, tone } from './kitParts';
import { waxFor } from './fireLooks';

const C = CFG.themes;
/** The ice a frozen mausoleum's foes wait in. */
const ICE = {
  geo: (() => {
    const g = new THREE.IcosahedronGeometry(0.55, 0);
    g.userData.shared = true;
    return g;
  })(),
  mat: markShared(
    new THREE.MeshStandardMaterial({
      color: 0xcfeeff,
      transparent: true,
      opacity: 0.5,
      roughness: 0.15,
      metalness: 0.1,
      emissive: 0x1a3a4a,
      depthWrite: false,
    }),
  ),
};

/* ---------- scatter ---------- */

const shared = <T extends THREE.BufferGeometry>(g: T) => {
  g.userData.shared = true;
  return g;
};
const std = (color: number, o: THREE.MeshStandardMaterialParameters = {}) =>
  markShared(new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...o }));
const MAT = {
  wax: std(0xe8dcc0, { emissive: 0x2a2010 }),
  paper: std(0xd8cbaa, { side: THREE.DoubleSide }),
  gold: std(0xd8b050, { roughness: 0.4, metalness: 0.6, emissive: 0x3a2808 }),
  pole: std(0x2e2620, { roughness: 1 }),
  spirit: markShared(new THREE.MeshBasicMaterial({ color: 0xcfe8ff })),
  blanket: std(0x5a3e34, { roughness: 1 }),
  leaf: std(0x46442a, { roughness: 1, side: THREE.DoubleSide }),
  blanket2: std(0x3e4a5a, { roughness: 1 }),
  ash: std(0x2a2622, { roughness: 1 }),
  stone: M.rock,
};
const GEO = {
  candle: shared(new THREE.CylinderGeometry(0.035, 0.04, 0.16, 6)),
  drip: shared(new THREE.SphereGeometry(0.016, 5, 4).scale(1, 1.6, 1)),
  page: shared(new THREE.PlaneGeometry(0.22, 0.28).rotateX(-Math.PI / 2)),
  bone: shared(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 5)),
  roll: shared(new THREE.CylinderGeometry(0.13, 0.13, 0.7, 10)),
  blanket: shared(new THREE.BoxGeometry(0.7, 0.04, 1.1)),
  pebble: shared(new THREE.DodecahedronGeometry(0.07, 0)),
  ash: shared(new THREE.CircleGeometry(0.3, 12).rotateX(-Math.PI / 2)),
  coin: shared(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 9)),
  pole: shared(new THREE.CylinderGeometry(0.035, 0.05, 1.8, 6)),
  arm: shared(new THREE.BoxGeometry(0.34, 0.04, 0.04)),
  lamp: shared(new THREE.CylinderGeometry(0.07, 0.06, 0.16, 6)),
  cap: shared(new THREE.ConeGeometry(0.09, 0.08, 6)),
  patch: shared(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)),
  shaft: shared(new THREE.CylinderGeometry(0.5, 0.75, 6, 12, 1, true)),
  rope: shared(new THREE.CylinderGeometry(0.02, 0.02, 3.2, 4)),
  tuft: shared(new THREE.ConeGeometry(0.05, 0.16, 6)),
};
/** The garden's flowers: a blade of grass, a stem and a bloom, and the colours the blooms come in. */
const FLOWER = {
  blade: shared(new THREE.ConeGeometry(0.018, 0.16, 3).translate(0, 0.08, 0)),
  stem: shared(new THREE.CylinderGeometry(0.008, 0.01, 1, 4).translate(0, 0.5, 0)),
  head: shared(new THREE.SphereGeometry(0.03, 6, 4).scale(1, 0.6, 1)),
  colours: [0xf0a8c8, 0xfae6ee, 0xf0d860, 0xc8a0f0],
};
let patchTex: THREE.CanvasTexture | null = null;
/** A soft round blotch, for moss and stains. */
function blotch() {
  if (patchTex) return patchTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 9; i++) {
    const x = 16 + Math.random() * 32,
      y = 16 + Math.random() * 32,
      r = 8 + Math.random() * 14,
      gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,.7)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  }
  patchTex = new THREE.CanvasTexture(c);
  return patchTex;
}
const patchMats = new Map<string, THREE.Material>();
const patchMat = (color: number, glowing = false, opacity = 0.8) => {
  const key = color + (glowing ? 'g' : '') + opacity;
  let m = patchMats.get(key);
  if (!m) {
    m = markShared(
      glowing
        ? new THREE.MeshBasicMaterial({
            color,
            alphaMap: blotch(),
            transparent: true,
            depthWrite: false,
            opacity,
            blending: THREE.AdditiveBlending,
          })
        : new THREE.MeshStandardMaterial({
            color,
            alphaMap: blotch(),
            transparent: true,
            depthWrite: false,
            roughness: 1,
            opacity,
          }),
    );
    patchMats.set(key, m);
  }
  return m;
};
let shaftMat: THREE.Material | null = null,
  fadeTex: THREE.CanvasTexture | null = null;
/** Bright below, fading to nothing above: the daylight's shaft has no top edge to see. */
function fadeUp() {
  if (fadeTex) return fadeTex;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 64;
  const g = c.getContext('2d')!,
    gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, '#000');
  gr.addColorStop(0.3, '#000');
  gr.addColorStop(0.7, '#8c8c8c');
  gr.addColorStop(1, '#fff');
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 64); // (grey levels: an alpha map reads them, not the canvas's own alpha; its top is the cylinder's top)
  fadeTex = new THREE.CanvasTexture(c);
  return fadeTex;
}
const ropeMat = markShared(new THREE.MeshStandardMaterial({ color: 0x6a5238, roughness: 1 }));
let ropeFade: THREE.Material | null = null; // a rope fading into the dark above

/** A piece of a theme's dressing, in the room's `look` (its candles burn in the floor's light). */
type Dress = (R: () => number, look: FloorLook) => THREE.Object3D;
const DRESS: Record<ScatterKind, Dress> = {
  candles(R, look) {
    // candles in the floor's wax, burning in its light, drips down them
    const g = new THREE.Group(),
      wax = look.torch.wax ? waxFor(look.torch.wax) : MAT.wax,
      specs: FlameSpec[] = [];
    for (let i = 0, n = 1 + Math.floor(R() * 3); i < n; i++) {
      const h = 0.6 + R() * 0.8,
        x = (R() - 0.5) * 0.3,
        z = (R() - 0.5) * 0.3;
      const c = new THREE.Mesh(GEO.candle, wax);
      c.scale.y = h;
      c.position.set(x, 0.08 * h, z);
      g.add(c);
      const d = new THREE.Mesh(GEO.drip, wax);
      d.position.set(x + 0.03, 0.12 * h, z + 0.02);
      g.add(d);
      specs.push({ x, y: 0.16 * h, z, h: 0.15, w: 0.07 });
    }
    const fire = candleFire(specs, look),
      gl = glow(0xffc36a, 0.7, 0.5);
    gl.position.y = 0.2;
    g.userData.parts = { fire };
    g.add(fire, gl);
    mergeStill(g);
    return g;
  },
  pages(R) {
    const g = new THREE.Group();
    for (let i = 0, n = 2 + Math.floor(R() * 3); i < n; i++) {
      const p = new THREE.Mesh(GEO.page, MAT.paper);
      p.position.set((R() - 0.5) * 0.5, 0.006 + i * 0.002, (R() - 0.5) * 0.5);
      p.rotation.y = R() * 6;
      g.add(p);
    }
    return g;
  },
  bones(R) {
    const g = new THREE.Group();
    for (let i = 0; i < 2; i++) {
      const b = new THREE.Mesh(GEO.bone, M.bone);
      b.rotation.set(0, R() * 6, Math.PI / 2);
      b.position.set((R() - 0.5) * 0.4, 0.03, (R() - 0.5) * 0.4);
      g.add(b);
    }
    return g;
  },
  bedrolls(R) {
    const g = new THREE.Group(),
      m = R() < 0.5 ? MAT.blanket : MAT.blanket2;
    const b = new THREE.Mesh(GEO.blanket, m);
    b.position.y = 0.02;
    const r = new THREE.Mesh(GEO.roll, m);
    r.rotation.z = Math.PI / 2;
    r.position.set(0, 0.12, -0.5);
    g.add(b, r);
    g.rotation.y = R() * 6;
    return g;
  },
  embers(R) {
    // a cold fire: a ring of stones round the ash, a last glow in it
    const g = new THREE.Group(),
      ash = new THREE.Mesh(GEO.ash, MAT.ash);
    ash.position.y = 0.005;
    g.add(ash);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2,
        s = new THREE.Mesh(GEO.pebble, MAT.stone);
      s.scale.setScalar(1.3 + R() * 0.5);
      s.position.set(Math.cos(a) * 0.36, 0.05, Math.sin(a) * 0.36);
      g.add(s);
    }
    const gl = glow(0xff6a2a, 0.6, 0.35);
    gl.position.y = 0.08;
    g.add(gl);
    return g;
  },
  /** Verdigris: the floor 1 accent (art bible 4.1), a patch of green-blue copper bloom and damp moss. */
  verdigris(R) {
    const m = new THREE.Mesh(GEO.patch, patchMat(0x2e5c4e, false, 0.6));
    m.scale.setScalar(0.4 + R() * 0.55);
    m.position.y = 0.004;
    m.rotation.y = R() * 6;
    return m;
  },
  /** A cobweb by the wall, smaller than the template's (OBJECT_LOOKS.web). */
  webs(R) {
    const o = OBJECT_LOOKS.web();
    o.scale.setScalar(0.55 + R() * 0.25);
    return o;
  },
  moss(R) {
    const m = new THREE.Mesh(GEO.patch, patchMat(0x1e2c16, false, 0.7));
    m.scale.setScalar(0.6 + R() * 0.6);
    m.position.y = 0.004;
    m.rotation.y = R() * 6;
    return m;
  },
  glowmoss(R) {
    const g = new THREE.Group(),
      m = new THREE.Mesh(GEO.patch, patchMat(0x2a8a6a, true, 0.35));
    m.scale.setScalar(0.5 + R() * 0.5);
    m.position.y = 0.005;
    g.add(m);
    const gl = glow(0x5fe8b0, 0.9, 0.35);
    gl.position.y = 0.1;
    g.add(gl);
    return g;
  },
  pebbles(R) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(GEO.pebble, MAT.stone);
      p.scale.setScalar(0.6 + R());
      p.position.set((R() - 0.5) * 0.7, 0.03, (R() - 0.5) * 0.7);
      p.rotation.set(R() * 3, R() * 3, 0);
      g.add(p);
    }
    return g;
  },
  daylight() {
    // a shaft of daylight down through the broken ceiling, and the pale disc it makes on the floor
    shaftMat ??= markShared(
      new THREE.MeshBasicMaterial({
        color: 0xfff2c8,
        alphaMap: fadeUp(),
        transparent: true,
        opacity: 0.09,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const g = new THREE.Group(),
      s = new THREE.Mesh(GEO.shaft, shaftMat);
    s.position.y = 3;
    g.add(s);
    const disc = new THREE.Mesh(GEO.patch, patchMat(0xfff0c0, true, 0.16));
    disc.scale.setScalar(1.6);
    disc.position.y = 0.006;
    g.add(disc);
    return g;
  },
  ropes(R) {
    // a bell rope hanging from the dark above, its tuft at waist height
    ropeFade ??= markShared(
      new THREE.MeshStandardMaterial({
        color: 0x6a5238,
        roughness: 1,
        alphaMap: fadeUp(),
        transparent: true,
        depthWrite: false,
      }),
    );
    const g = new THREE.Group(),
      y = 0.8 + R() * 0.3,
      rope = new THREE.Mesh(GEO.rope, ropeFade);
    rope.position.y = y + 1.6;
    const tuft = new THREE.Mesh(GEO.tuft, ropeMat);
    tuft.position.y = y;
    tuft.rotation.x = Math.PI;
    g.add(rope, tuft);
    return g;
  },
  rime(R) {
    const m = new THREE.Mesh(GEO.patch, patchMat(0x9fd0f0, true, 0.22));
    m.scale.setScalar(0.7 + R() * 0.5);
    m.position.y = 0.005;
    m.rotation.y = R() * 6;
    return m;
  },
  leaves(R) {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const l = new THREE.Mesh(GEO.page, MAT.leaf);
      l.scale.setScalar(0.35 + R() * 0.3);
      l.position.set((R() - 0.5) * 0.8, 0.006 + i * 0.001, (R() - 0.5) * 0.8);
      l.rotation.y = R() * 6;
      g.add(l);
    }
    return g;
  },
  stains(R) {
    const m = new THREE.Mesh(GEO.patch, patchMat(0x3a2e0c, false, 0.7));
    m.scale.setScalar(0.7 + R() * 0.7);
    m.position.y = 0.004;
    m.rotation.y = R() * 6;
    return m;
  },
  // obols spilled from the treasury's heaps (only to look at: the heaps hold the ones to take), and the landing's
  // lamps on poles, burning with the shore's pale spirit fire
  coins(R) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(GEO.coin, MAT.gold);
      c.position.set((R() - 0.5) * 0.6, 0.012 + i * 0.002, (R() - 0.5) * 0.6);
      c.rotation.set((R() - 0.5) * 0.3, R() * 6, (R() - 0.5) * 0.3);
      g.add(c);
    }
    const gl = glow(0xffd27a, 0.45, 0.35);
    gl.position.y = 0.1;
    g.add(gl);
    return g;
  },
  lamps(R) {
    const g = new THREE.Group(),
      pole = new THREE.Mesh(GEO.pole, MAT.pole);
    pole.position.y = 0.9;
    g.add(pole);
    const arm = new THREE.Mesh(GEO.arm, MAT.pole);
    arm.position.set(0.16, 1.72, 0);
    g.add(arm);
    const lamp = new THREE.Mesh(GEO.lamp, MAT.spirit);
    lamp.position.set(0.3, 1.55, 0);
    g.add(lamp);
    const cap = new THREE.Mesh(GEO.cap, MAT.pole);
    cap.position.set(0.3, 1.66, 0);
    g.add(cap);
    const gl = glow(0x9ad0ff, 1.1, 0.55);
    gl.position.set(0.3, 1.55, 0);
    g.add(gl);
    g.rotation.y = R() * 6;
    g.add(blob(0.5));
    return g;
  },
  // the overgrown garden's flowers: a tuft of grass and small blooms on short stems, rose, pale and gold
  flowers(R) {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++)
      put(
        mesh(g, FLOWER.blade, tone(i % 2 ? 0x5e8a34 : 0x4a7428, 0.1), (R() - 0.5) * 0.2, 0, (R() - 0.5) * 0.2),
        (R() - 0.5) * 0.5,
        R() * 6,
        (R() - 0.5) * 0.5,
      );
    for (let i = 0, n = 3 + Math.floor(R() * 3); i < n; i++) {
      const x = (R() - 0.5) * 0.6,
        z = (R() - 0.5) * 0.6,
        h = 0.07 + R() * 0.1;
      put(mesh(g, FLOWER.stem, tone(0x6a9a3a, 0.06), x, 0, z), 0, 0, 0, [1, h, 1]);
      mesh(g, FLOWER.head, tone(FLOWER.colours[Math.floor(R() * FLOWER.colours.length)], 0.06), x, h, z);
    }
    mergeStill(g);
    return g;
  },
};

/** Scatter a themed room's dressing over its free floor (seeded, so a room looks the same every time). */
export function dressTheme(room: Room) {
  // a themed room's own scatter; a plain fight or the start in the floor's, each kind a little more or less a room
  const theme = room.theme,
    plain = !theme && (room.type === 'normal' || room.type === 'start') && room.look.scatter;
  const scatter = theme?.scatter ?? (plain ? room.look.scatter : undefined);
  if (!scatter) return;
  const still = new THREE.Group();
  const R = mulberry(room.plan.seed ^ 0x7e3e),
    t = room.template,
    free: { c: number; r: number }[] = [];
  for (let r = 0; r < t.h; r++)
    for (let c = 0; c < t.w; c++)
      if (t.tiles[r][c] === 'floor' && !room.template.foes.some((f) => f.c === c && f.r === r)) free.push({ c, r });
  const scale = Math.max(1, ((t.w * t.h) / (13 * 7)) * 0.7); // larger rooms get more of it
  // where daylight may fall: at least three tiles from any wall (the grid's edge, or carved and missing corners), near
  // the middle of the room's own floor (an L's middle is its missing corner)
  const voids: { c: number; r: number }[] = [],
    inside: { c: number; r: number }[] = [];
  for (let r = 0; r < t.h; r++)
    for (let c = 0; c < t.w; c++) (t.tiles[r][c] === 'void' ? voids : inside).push({ c, r });
  const clear = (c: number, r: number) =>
    Math.min(c + 1, r + 1, t.w - c, t.h - r, ...voids.map((v) => Math.max(Math.abs(v.c - c), Math.abs(v.r - r))));
  const mid = {
    c: inside.reduce((s, q) => s + q.c, 0) / inside.length,
    r: inside.reduce((s, q) => s + q.r, 0) / inside.length,
  };
  for (const [kind, n] of Object.entries(scatter) as [ScatterKind, number][]) {
    const count =
      kind === 'daylight' ? n : Math.round(n * scale * (plain ? C.plainSpread[0] + R() * C.plainSpread[1] : 1));
    for (let i = 0; i < count && free.length; i++) {
      // daylight falls near the middle, clear of the walls; bedrolls keep off them; the rest anywhere
      const need = kind === 'daylight' ? C.daylightClear : kind === 'bedrolls' ? C.bedrollClear : 0; // tiles from any wall
      // cobwebs hang by a wall
      const open =
          kind === 'webs'
            ? free.filter((q) => clear(q.c, q.r) === 1)
            : need
              ? free.filter((q) => clear(q.c, q.r) >= need)
              : free,
        from = open.length ? open : free;
      const pick =
        kind === 'daylight'
          ? from.sort((a, b) => Math.hypot(a.c - mid.c, a.r - mid.r) - Math.hypot(b.c - mid.c, b.r - mid.r))[
              Math.floor(R() * Math.min(6, from.length))
            ]
          : from[Math.floor(R() * from.length)];
      free.splice(free.indexOf(pick), 1);
      const o = DRESS[kind](R, room.look);
      o.position.x += room.bounds.minX + pick.c + 0.5 + (R() - 0.5) * 0.3 - room.cx;
      o.position.z += room.bounds.minZ + pick.r + 0.5 + (R() - 0.5) * 0.3 - room.cz;
      (STILL.has(kind) ? still : room.group).add(o);
      (room.strewn ??= {})[kind] = (room.strewn[kind] ?? 0) + 1;
    }
  }
  // the pieces that never move drawn together: a room strewn with bones and pebbles costs a call or two, not dozens
  mergeStill(still);
  room.group.add(still);
}
/** The scatter kinds with nothing moving in them (merged into one mesh a material); candles, embers, lamps, ropes and
    the like keep their own, for their flames and sway. */
const STILL = new Set<ScatterKind>([
  'bones',
  'pebbles',
  'moss',
  'verdigris',
  'stains',
  'webs',
  'pages',
  'leaves',
  'rime',
  'coins',
  'flowers',
]);

/** What a room's scatter put down, by kind (the dev menu's readout, tests). */
export function scatterOf(room: Room) {
  return { ...room.strewn };
}

/* ---------- twists ---------- */

/** Entering a themed room: its name the first time, and the pilgrims' rest's foes asleep. */
export function enterTheme(room: Room, firstVisit: boolean, spawned: Enemy[]) {
  const theme = room.theme;
  if (!theme) return;
  if (firstVisit) toast(STR.themeEntered(theme.name), 2.5);
  if (theme.twist === 'sleepers')
    for (const e of spawned)
      if (!e.isBoss) {
        e.asleep = true;
        e.spawn = 0;
      }
  // the treasury's guardians stand among the gold like statues: coming close won't wake them, taking their gold will
  if (theme.twist === 'guardians')
    for (const e of spawned)
      if (!e.isBoss) {
        e.asleep = true;
        e.statue = true;
        e.spawn = 0;
      }
  // the frozen mausoleum's dead wait in ice, until struck or thawed by fire
  if (theme.twist === 'rime')
    for (const e of spawned)
      if (!e.isBoss) {
        e.asleep = true;
        e.spawn = 0;
        e.entombed = new THREE.Mesh(ICE.geo, ICE.mat);
        e.entombed.position.y = e.flying ? 0.8 : 0.5;
        e.entombed.scale.set(1, 1.3, 1);
        e.group.add(e.entombed);
      }
  riseT = C.riseAfter;
  risen = 0;
  drownT = C.drownAfter;
  drowned = 0;
}

/** An obol taken: in the gilded treasury, every guardian still standing wakes at once. */
export function goldTaken(room: Room) {
  if (room.theme?.twist !== 'guardians' || !room.locked) return;
  const statues = G.room.enemies.filter((e) => e.statue && e.asleep && !e.dead);
  if (!statues.length) return;
  for (const e of statues) {
    e.asleep = false;
    e.statue = false;
    burst(e.x, 0.8, e.z, 0xffd27a, 12, 1.8, 0.05);
  }
  Sfx.guardians();
  toast(STR.guardiansWake, 3);
  G.fx.shake = Math.max(G.fx.shake, 0.15);
}

/** Whether a room's river runs (some of its water not frozen). */
const riverRuns = (room: Room) => (room.pools ?? []).some((p) => p.kind === 'water' && p.state !== 'frozen');

let riseT = 0,
  risen = 0,
  zzT = 0,
  drownT = 0,
  drowned = 0;
export function updateThemes(dt: number) {
  const room = G.room.current,
    twist = room.theme?.twist;
  // sleepers wake when the mage comes close (a hit wakes them in damageEnemy)
  if ((zzT -= dt) <= 0) zzT = 0.7;
  for (const e of G.room.enemies) {
    if (e.entombed && !e.asleep) {
      // the ice gives: a hit, or fire
      e.group.remove(e.entombed);
      e.entombed = undefined;
      burst(e.x, 0.7, e.z, 0xcfeeff, 14, 2.2, 0.06);
      Sfx.at(e.x, e.z).wallShatter();
    }
    if (e.statue && !e.asleep) e.statue = false; // (a guardian struck is a statue no more)
    if (e.statue) {
      if (zzT === 0.7 && Math.random() < 0.4) burst(e.x, 1, e.z, 0xffd27a, 1, 0.4, 0.03);
      continue;
    } // (a glint off the gilt; closeness won't wake it)
    if (!e.asleep || e.entombed) continue; // only sleepers wake as the mage comes close
    if (Math.hypot(player.x - e.x, player.z - e.z) < C.wakeReach) {
      e.asleep = false;
      burst(e.x, 0.8, e.z, 0xd8e0ff, 6, 1.4, 0.04);
      Sfx.at(e.x, e.z).wake();
    } else if (zzT === 0.7) burst(e.x + 0.15, 1, e.z, 0xd8e0ff, 1, 0.3, 0.05); // a breath of sleep
  }
  updateDrowned(dt);
  // the ossuary's dead don't all stay down
  if (
    twist === 'risingBones' &&
    room.locked &&
    G.room.enemies.some((e) => !e.dead) &&
    risen < C.riseMost &&
    (riseT -= dt) <= 0
  ) {
    riseT = C.riseEvery;
    const piles = (room.props ?? []).filter((b) => b.prop.kind === 'bones' || b.prop.kind === 'skulls');
    const pile = piles[Math.floor(Math.random() * piles.length)];
    if (pile) {
      removeProp(room, pile);
      burst(pile.x, 0.3, pile.z, 0xd8ccb2, 14, 2, 0.05);
      Sfx.at(pile.x, pile.z).bones();
      const floor = FLOORS[Math.min(G.run.floor, FLOORS.length - 1)]; // (what nested in the bones: the floor's walker)
      makeEnemy(callFoe(floor.foes, 'R', Math.random), pile.x, pile.z, floor.enemyHp);
      risen++;
    }
  }
}

/** The ferry landing: while its fight lasts, the drowned climb out of the river, one at a time, until it is frozen. */
function updateDrowned(dt: number) {
  const room = G.room.current;
  if (room.theme?.twist !== 'drowned' || !room.locked || !G.room.enemies.some((e) => !e.dead) || drowned >= C.drownMost)
    return;
  if ((drownT -= dt) > 0) return;
  drownT = C.drownEvery;
  if (!riverRuns(room)) return; // frozen over: they stay down
  const open = (room.pools ?? []).filter((p) => p.kind === 'water' && p.state !== 'frozen').flatMap((p) => p.tiles);
  const far = open.filter((t) => Math.hypot(t.x - player.x, t.z - player.z) > 2.5),
    from = far.length ? far : open,
    at = from[Math.floor(Math.random() * from.length)];
  if (!at) return;
  const floor = FLOORS[Math.min(G.run.floor, FLOORS.length - 1)];
  makeEnemy(callFoe(floor.foes, 'W', Math.random), at.x, at.z, floor.enemyHp); // (what the river gives back: the floor's flyers and shooters)
  burst(at.x, 0.2, at.z, 0x9ad0ff, 16, 2.2, 0.05);
  burst(at.x, 0.1, at.z, 0x2a3a4a, 10, 1.2, 0.06);
  Sfx.at(at.x, at.z).splash();
  if (!drowned) toast(STR.drownedRise, 3.5);
  drowned++;
}

/** A scroll heap broke: in the scriptorium, now and then a torn grimoire page was in it. */
export function scrollsBroken(room: Room, x: number, z: number) {
  if (room.theme?.twist === 'pages' && Math.random() < C.pageChance) dropPage(room, x, z);
}

/** A glyph's blast at (x, z): in the collapsed crypt, stones fall round it a moment later. */
export function caveIn(room: Room, x: number, z: number) {
  if (room.theme?.twist !== 'caveIn') return;
  const t = room.template,
    spots: { x: number; z: number; c: number; r: number }[] = [];
  for (let r = 0; r < t.h; r++)
    for (let c = 0; c < t.w; c++) {
      const px = room.bounds.minX + c + 0.5,
        pz = room.bounds.minZ + r + 0.5,
        d = Math.hypot(px - x, pz - z);
      if (t.tiles[r][c] === 'floor' && d > 1 && d < C.caveReach) spots.push({ x: px, z: pz, c, r });
    }
  for (let i = 0; i < C.caveStones && spots.length; i++) {
    const s = spots.splice(Math.floor(Math.random() * spots.length), 1)[0];
    const shadow = blob(0.2);
    shadow.position.set(s.x - room.cx, 0.013, s.z - room.cz);
    room.group.add(shadow);
    let grow = 0;
    const tick = () => {
      grow += 0.05;
      shadow.scale.setScalar(0.2 + grow * 1.2);
      if (grow < 1) after(0.05 * C.caveDelay, tick);
    };
    tick();
    after(C.caveDelay + i * 0.15, () => {
      room.group.remove(shadow);
      if (G.room.current !== room) return;
      burst(s.x, 0.8, s.z, 0x6b625a, 16, 2.8, 0.09);
      burst(s.x, 0.2, s.z, 0x8a8278, 10, 1.2, 0.08);
      Sfx.at(s.x, s.z).rubble();
      G.fx.shake = Math.max(G.fx.shake, 0.18);
      for (const e of G.room.enemies)
        if (!e.dead && !e.hidden && e.spawn <= 0 && Math.hypot(e.x - s.x, e.z - s.z) < 0.8 + e.r)
          damageEnemy(e, C.caveDamage, 0, 0, 0, 'spell');
      if (Math.hypot(player.x - s.x, player.z - s.z) < 0.7) hurtPlayer(1, s.x, s.z);
      else if (
        room.template.tiles[s.r][s.c] === 'floor' &&
        !G.room.enemies.some((e) => !e.dead && Math.hypot(e.x - s.x, e.z - s.z) < 0.7)
      )
        addProp(room, 'rubble', s.c, s.r);
    });
  }
}
