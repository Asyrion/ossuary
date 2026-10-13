/* The room kit's doors, gates, niches and pilasters (M3.5 step 3; docs/archive/M3.5-plan.md), built in code in the style of the
   spell effects (docs/effects.md), in the stone of the floor's walls (`stoneOf`):
   - a door: jambs of dressed blocks, a threshold of worn stone; through a tall north wall, a lintel and an arch of
     voussoirs crowning it above the wall's line, its keystone carrying what lies beyond (a horned skull for the boss,
     a skull on iron spikes for an ordeal, crossed bones for an altar, a gem for treasure, a lantern for the merchant, a
     ring of runes for the shrine, an open book for the library); each style's trim on its capitals; a side door carries
     its emblem over the doorway, a low south door a pair of them on its gateposts, always turned to the camera;
   - its gate: an iron portcullis of spear-tipped bars, crossbars and rivets, rising from the floor when the doors lock;
   - the tall walls' pilasters (a base, a fluted shaft, a capital) and niches (an arched recess framed in blocks, a sill,
     and what the floor keeps there: a skull, candles, a hand bell, a small urn in its clay, bones, or a few pebbles).
   What they do is unchanged (rooms.ts, dressing.ts); `DEV.roomKit` off keeps the old looks. Every piece is painted, so a
   door's frame, its gate and a wall's dressing each draw in one or two calls. */
import * as THREE from 'three';
import type { DoorStyle, FloorLook, NicheKind } from '../types';
import { glow, mergeStill } from '../render/materials';
import type { FlameSpec } from '../render/fire';
import { MAT, glowTone, mesh, runeStrokes, shade, shared, stoneOf, tone } from './kitParts';
import { C, URN_BODY, URN_LID, bone, box, put, skull } from './objectLooks';
import { waxFor } from './fireLooks';
import { DH, H_TALL, WT } from './dims';

/** The black of the walls' tops (M.wallTop), for a door's tops. */
const WALL_TOP = glowTone(0x0d0a08);
/** How deep a north door's arch is, set on the wall's room face. */
const ARCH_DEPTH = 0.34;
const lathe = (pts: number[][], seg: number) =>
  new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    seg,
  ); // (from the bottom up)
/** A gate's spear tips, how tall. */
const TIP = 0.15;
const GEO = {
  rune: shared(runeStrokes(0.12)),
  smallRune: shared(runeStrokes(0.07)),
  spot: shared(new THREE.SphereGeometry(0.025, 5, 4)),
  tip: shared(new THREE.ConeGeometry(0.05, TIP, 4)),
  horn: shared(new THREE.ConeGeometry(0.045, 0.26, 5)),
  handbell: shared(
    lathe(
      [
        [0, 0],
        [0.085, 0],
        [0.07, 0.03],
        [0.05, 0.13],
        [0.02, 0.15],
        [0.02, 0.2],
        [0, 0.2],
      ],
      10,
    ),
  ),
  glass: shared(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 6)),
  cap: shared(new THREE.ConeGeometry(0.1, 0.09, 6)),
  ring: shared(new THREE.TorusGeometry(0.19, 0.018, 4, 24)),
  candle: shared(new THREE.CylinderGeometry(0.028, 0.032, 1, 6).translate(0, 0.5, 0)),
  drip: shared(new THREE.SphereGeometry(0.015, 5, 4).scale(1, 1.6, 1)),
  pebble: shared(new THREE.DodecahedronGeometry(0.03, 0)),
  gem: shared(new THREE.OctahedronGeometry(0.08, 0)),
};

/** The trim of each style of door: its capitals and keystone. */
const TRIM: Record<DoorStyle, { color: number; metal: number } | null> = {
  normal: null,
  secret: null,
  treasure: { color: 0xc49a4a, metal: 0.5 },
  boss: { color: 0x7a1c14, metal: 0 },
  ordeal: { color: 0x3a3a42, metal: 0.5 },
  altar: { color: 0xd6cab0, metal: 0 },
  merchant: { color: 0xa27a3e, metal: 0.4 },
  vault: { color: 0x5e5e68, metal: 0.6 },
  shrine: { color: 0xd8d0b8, metal: 0 },
  library: { color: 0x6e4c30, metal: 0 },
  laboratory: { color: 0x4e6a3a, metal: 0.35 },
  waystone: { color: 0x8e929c, metal: 0 },
};

/** A door in the room kit's style, built at the door's middle on the wall's centre line, facing +z (into the room), with
    x along the wall; rooms.ts turns it by `turn` and places it. `h` is the wall's height, `low` a low (south) wall's door,
    `barH` the gate's height. Returns the frame (still, merged) and the gate (`bars`, which rooms.ts moves up and down). */
export function doorLook(
  style: DoorStyle,
  look: FloorLook,
  h: number,
  low: boolean,
  north: boolean,
  barH: number,
  turn: number,
) {
  const frame = new THREE.Group(),
    st = stoneOf(look, 1.45),
    trim = TRIM[style];
  const stone = tone(st, 0.1),
    stoneDark = tone(shade(st, 0.85), 0.1),
    trimMat = trim ? tone(trim.color, 0.06, trim.metal) : tone(shade(st, 1.15), 0.08);
  const top = h + (low ? 0.05 : 0.1),
    courses = Math.max(2, Math.round(top / 0.3)),
    ch = top / courses;
  for (const s of [-1, 1]) {
    for (let i = 0; i < courses; i++) {
      // quoins, long and short in turn
      const w = i % 2 ? 0.24 : 0.3;
      box(frame, w, ch - 0.012, WT + 0.14, i % 2 ? stoneDark : stone, s * (DH + w / 2 - 0.01), i * ch + ch / 2, 0);
    }
    if (low)
      box(frame, 0.36, 0.07, WT + 0.2, tone(shade(st, 1.15), 0.08), s * (DH + 0.14), top + 0.035, 0); // its capital: on a low wall, stone (its whole top is
    else box(frame, 0.36, 0.07, 0.4, trimMat, s * (DH + 0.14), top + 0.035, WT / 2 - 0.12); // seen); on a tall one the style's trim, on the room's face only (a deep one reads as a post)
    if (style === 'vault')
      for (let i = 1; i < courses; i++)
        mesh(frame, GEO.spot, tone(0x2c2a2c, 0, 0.6), s * (DH + 0.12), i * ch, WT / 2 + 0.07).scale.setScalar(1.3); // iron studs
  }
  if (!low) for (const sx of [-1, 1]) box(frame, 0.3, 0.006, WT + 0.14, WALL_TOP, sx * (DH + 0.14), top + 0.003, -0.05); // (tops black like the walls': seen from above, stone reads as a slab)
  box(frame, DH * 2, 0.03, WT, tone(shade(st, 0.7), 0.08), 0, 0.015, 0); // the threshold
  let emblemY = h + (low ? 0.3 : 0.1);
  if (north) {
    // a lintel, and an arch crowning the door above the wall's line
    box(frame, DH * 2 + 0.1, 0.26, WT + 0.12, stone, 0, h - 0.13, 0);
    box(frame, DH * 2 + 0.1, 0.006, WT + 0.12, WALL_TOP, 0, h + 0.003, 0);
    const c = DH + 0.27,
      rise = 0.38,
      R = (c * c + rise * rise) / (2 * rise),
      yc = top + rise - R,
      a = Math.asin(c / R),
      n = 9;
    const zf = WT / 2 - ARCH_DEPTH / 2 + 0.06; // (a ring on the room's face, open over the lintel: from above, a deep or filled arch reads as a hood)
    for (let i = 0; i < n; i++) {
      const t = -a + ((i + 0.5) * 2 * a) / n,
        len = (2 * a * R) / n - 0.015,
        key = i === (n - 1) / 2,
        d = ARCH_DEPTH + (key ? 0.06 : 0);
      put(
        box(
          frame,
          len,
          key ? 0.26 : 0.2,
          d,
          key ? trimMat : i % 2 ? stone : stoneDark,
          Math.sin(t) * (R - 0.1),
          yc + Math.cos(t) * (R - 0.1) + (key ? 0.03 : 0),
          zf + (key ? 0.03 : 0),
        ),
        0,
        0,
        -t,
        [len, key ? 0.26 : 0.2, d],
      );
    }
    emblemY = top + rise - 0.08;
  }
  // the emblem: on the keystone; over a side door's doorway; on a low door's gateposts (it has no lintel), a pair; always
  // turned back to face the camera, whichever way the door faces
  const spots = north
    ? [[0, emblemY, WT / 2 + 0.02]]
    : low
      ? [
          [-(DH + 0.14), top + 0.2, 0],
          [DH + 0.14, top + 0.2, 0],
        ]
      : [[0, emblemY, WT / 2 + 0.06]];
  const emblem = EMBLEMS[style];
  if (emblem)
    for (const [x, y, z] of spots) {
      const em = new THREE.Group();
      em.position.set(x, y, z);
      em.rotation.y = -turn;
      if (low) em.scale.setScalar(0.8);
      frame.add(em);
      emblem(em, trimMat);
    }
  mergeStill(frame);
  return { frame, bars: gateLook(barH) };
}

/** What a door's keystone carries: what lies beyond. Built facing +z at the keystone's face. */
const EMBLEMS: Partial<Record<DoorStyle, (g: THREE.Group, trim: THREE.Material) => void>> = {
  boss(g) {
    // a horned skull, its eyes burning
    skull(g, 0, 0, 0.06, 0, 0, 1.05);
    for (const s of [-1, 1]) put(mesh(g, GEO.horn, tone(0x3a2a24, 0.08), s * 0.13, 0.1, 0.04), 0, 0, -s * 0.9);
    for (const s of [-1, 1]) mesh(g, GEO.spot, glowTone(0xff4a1a), s * 0.048, 0.02, 0.18);
    const gl = glow(0xff3a1a, 0.7, 0.9);
    gl.position.z = 0.15;
    g.add(gl);
  },
  ordeal(g) {
    // a skull on crossed iron spikes
    for (const s of [-1, 1])
      put(box(g, 0.04, 0.5, 0.04, tone(0x3a3a42, 0, 0.5), 0, 0, 0), 0, 0, s * 0.7, [0.04, 0.5, 0.04]);
    skull(g, 0, 0, 0.08, 0, 0, 0.95);
  },
  altar(g) {
    // crossed bones, a small skull on them
    for (const s of [-1, 1])
      put(mesh(g, new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5), tone(C.bone, 0.05), 0, 0, 0.04), 0, 0, s * 0.75);
    skull(g, 0, 0.02, 0.1, 0, 0, 0.65);
  },
  treasure(g, trim) {
    // a glowing gem set in a gilded boss
    mesh(g, new THREE.CylinderGeometry(0.13, 0.13, 0.04, 8).rotateX(Math.PI / 2), trim, 0, 0, 0.02);
    put(mesh(g, GEO.gem, glowTone(0xffc850), 0, 0, 0.07), 0, Math.PI / 4, 0, [1, 1.3, 0.7]);
    const gl = glow(0xffc050, 0.8, 0.7);
    gl.position.z = 0.1;
    g.add(gl);
  },
  merchant(g) {
    // a lantern hanging from an iron arm
    box(g, 0.04, 0.04, 0.24, tone(0x3a3638, 0, 0.4), 0, 0.14, -0.05);
    mesh(g, GEO.cap, tone(0x3a3638, 0, 0.4), 0, 0.1, 0.08);
    mesh(g, GEO.glass, glowTone(0xffd890), 0, -0.03, 0.08);
    box(g, 0.14, 0.03, 0.14, tone(0x3a3638, 0, 0.4), 0, -0.12, 0.08);
    const gl = glow(0xffb050, 1.1, 0.85);
    gl.position.set(0, -0.03, 0.12);
    g.add(gl);
  },
  shrine(g) {
    // a halo of runes
    const light = glowTone(0xf4e2b0);
    mesh(g, GEO.ring, light, 0, 0, 0.02);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      put(mesh(g, GEO.smallRune, light, Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0.03), 0, 0, a - Math.PI / 2, 0.8);
    }
    const gl = glow(0xffe8b0, 0.9, 0.8);
    gl.position.z = 0.06;
    g.add(gl);
  },
  laboratory(g) {
    // a round flask of green jelly, glowing, on a copper ring (M5: Dr. Jelly's laboratory)
    mesh(g, new THREE.SphereGeometry(0.12, 10, 8), glowTone(0x7ae070), 0, -0.02, 0.1);
    mesh(g, new THREE.CylinderGeometry(0.035, 0.04, 0.1, 6), tone(0x9ebed8, 0.04, 0.35), 0, 0.13, 0.1);
    mesh(g, GEO.ring, tone(0x8a5a30, 0.06, 0.6), 0, -0.02, 0.02).scale.setScalar(0.75);
    const gl = glow(0x7ae070, 0.9, 0.8);
    gl.position.z = 0.14;
    g.add(gl);
  },
  waystone(g) {
    // a menhir of grey stone with a pointed top, a rune burning gold down its face (M6 step 10: the waystone room)
    const s = new THREE.Group();
    s.rotation.x = -0.6;
    s.scale.setScalar(1.35);
    g.add(s); // (tipped up to the light, as the library's book)
    const stone = tone(0x7e828c, 0.1);
    put(box(s, 0.24, 0.4, 0.08, stone, 0, -0.04, 0.05), 0, 0, 0.05, [0.24, 0.4, 0.08]);
    put(box(s, 0.17, 0.17, 0.08, stone, 0, 0.16, 0.05), 0, 0, Math.PI / 4, [0.17, 0.17, 0.08]); // (its shoulders: a point)
    put(mesh(s, GEO.rune, glowTone(0xffbe3a), 0, -0.03, 0.1), 0, 0, 0, 0.95);
    const gl = glow(0xffbe3a, 0.35, 0.45);
    gl.position.z = 0.12;
    g.add(gl);
  },
  library(g) {
    // an open book tipped up to the light, a rune glowing on its page
    const b = new THREE.Group();
    b.rotation.x = -0.75;
    g.add(b);
    box(b, 0.46, 0.3, 0.02, tone(C.leather, 0.06), 0, 0, 0.01);
    for (const s of [-1, 1])
      put(box(b, 0.2, 0.27, 0.03, tone(0xe8dcc0, 0.04), s * 0.105, 0, 0.035), 0, s * 0.25, 0, [0.2, 0.27, 0.03]);
    put(mesh(b, GEO.smallRune, glowTone(0x8fd0ff), 0.1, 0, 0.06), 0, 0.25, 0);
    const gl = glow(0xffe0a0, 0.8, 0.7);
    gl.position.z = 0.1;
    g.add(gl);
  },
};

/** A gate: a portcullis of iron bars with spear tips, `barH` tall in all (so it sinks out of sight when open), two
    crossbars riveted to them, built across x at z = 0 (rooms.ts turns it with its door and moves it up and down). One mesh. */
export function gateLook(barH: number) {
  const g = new THREE.Group(),
    iron = tone(0x2e2c2e, 0.06, 0.5),
    tips = tone(0x5a5658, 0, 0.5);
  const xs = Array.from({ length: 5 }, (_, i) => -DH + 0.16 + i * ((DH * 2 - 0.32) / 4));
  const bar = barH - TIP;
  for (const x of xs) {
    box(g, 0.06, bar, 0.06, iron, x, bar / 2, 0);
    mesh(g, GEO.tip, tips, x, bar + TIP / 2, 0).rotation.y = Math.PI / 4;
  }
  for (const y of [barH * 0.28, barH * 0.7]) {
    box(g, DH * 2, 0.07, 0.08, iron, 0, y, 0);
    for (const x of xs) for (const z of [-0.05, 0.05]) mesh(g, GEO.spot, tips, x, y, z);
  }
  mergeStill(g);
  return g;
}

/* ---------- the tall walls' dressing (dressing.ts) ---------- */

/** A pilaster on a tall wall, built with the wall's face at z = 0, facing +z: a stepped base, a shaft with two flutes, a
    moulded capital. */
export function pilasterLook(look: FloorLook) {
  const g = new THREE.Group(),
    st = stoneOf(look, 1.45),
    stone = tone(st, 0.08),
    light = tone(shade(st, 1.12), 0.08),
    L = H_TALL - 0.36;
  box(g, 0.46, 0.12, 0.2, tone(shade(st, 0.85), 0.08), 0, 0.06, 0.1);
  box(g, 0.4, 0.06, 0.17, light, 0, 0.15, 0.085);
  box(g, 0.32, L, 0.12, stone, 0, 0.18 + L / 2, 0.06);
  for (const x of [-0.07, 0.07]) box(g, 0.045, L - 0.14, 0.02, tone(shade(st, 0.68), 0.06), x, 0.18 + L / 2, 0.125);
  box(g, 0.4, 0.08, 0.17, light, 0, H_TALL - 0.14, 0.085);
  box(g, 0.46, 0.07, 0.2, stone, 0, H_TALL - 0.065, 0.1);
  return g;
}

/** A niche on a tall wall, built with the wall's face at z = 0, facing +z: an arched recess framed in small blocks, its
    keystone paler, a sill, and what the floor keeps in it. `eyes` (an ossuary's) watch from a skull's sockets; with
    `flames`, a candle's flame is put there for the kit's fire, not built. */
export function nicheLook(
  kind: NicheKind,
  R: () => number,
  look: FloorLook,
  eyes?: THREE.Material,
  flames?: FlameSpec[],
) {
  const g = new THREE.Group(),
    y0 = 0.42,
    st = stoneOf(look, 1.35),
    stone = tone(st, 0.1),
    dark = tone(shade(st, 0.85), 0.1);
  mesh(g, RECESS, glowTone(0x0a0806), 0, y0, 0.004);
  for (const s of [-1, 1]) box(g, 0.08, 0.38, 0.08, s < 0 ? stone : dark, s * 0.27, y0 + 0.19, 0.03);
  for (let i = 0; i < 5; i++) {
    // the arch's blocks, round the recess's head
    const t = (Math.PI * (i + 0.5)) / 5,
      key = i === 2;
    put(
      box(
        g,
        0.16,
        0.08,
        0.08,
        key ? tone(shade(st, 1.2), 0.06) : i % 2 ? dark : stone,
        Math.cos(t) * 0.27,
        y0 + 0.37 + Math.sin(t) * 0.27,
        0.03,
      ),
      0,
      0,
      t - Math.PI / 2,
      [0.16, key ? 0.1 : 0.08, 0.08],
    );
  }
  box(g, 0.64, 0.05, 0.16, tone(shade(st, 1.1), 0.08), 0, y0, 0.07);
  const on = y0 + 0.025;
  if (kind === 'skull') {
    const x = (R() - 0.5) * 0.1;
    skull(g, x, on + 0.085, 0.06, 0, 0, 0.7);
    if (eyes) for (const dx of [-0.032, 0.032]) mesh(g, GEO.spot, eyes, x + dx, on + 0.085, 0.135).scale.setScalar(1.1);
  } else if (kind === 'candle') {
    const wax = look.torch.wax ? waxFor(look.torch.wax) : MAT.wax;
    for (const dx of R() < 0.5 ? [0] : [-0.09, 0.07]) {
      const hgt = 0.1 + R() * 0.06;
      put(mesh(g, GEO.candle, wax, dx, on, 0.06), 0, 0, 0, [1, hgt, 1]);
      mesh(g, GEO.drip, wax, dx + 0.025, on + hgt * 0.6, 0.075);
      flames?.push({ x: dx, y: on + hgt, z: 0.06, h: 0.12, w: 0.06, beat: flames.length * 1.7 });
    }
  } else if (kind === 'bell') {
    put(mesh(g, GEO.handbell, tone(0xa27a3e, 0.05, 0.4), 0, on, 0.06), 0, 0, 0, 1.5);
  } else if (kind === 'urn') {
    const clay = tone(new THREE.Color(look.urn.clay).getHex(), 0.06);
    put(mesh(g, URN_BODY, clay, 0, on, 0.06), 0, R() * 6, 0, 0.32);
    put(mesh(g, URN_LID, clay, 0, on, 0.06), 0, 0, 0, 0.32);
  } else if (kind === 'bones') {
    for (const [a, dx] of [
      [0.4, -0.04],
      [-0.5, 0.05],
      [0.1, 0],
    ])
      bone(g, dx, on + 0.03, 0.07, a, 0, true);
  } else for (let i = 0; i < 3; i++) mesh(g, GEO.pebble, dark, (R() - 0.5) * 0.3, on + 0.02, 0.06 + R() * 0.04);
  return g;
}
/** A niche's dark recess: a rectangle with a round head, .46 wide and .6 tall to its crown. */
const RECESS = shared(
  (() => {
    const s = new THREE.Shape(),
      r = 0.23;
    s.moveTo(-r, 0);
    s.lineTo(r, 0);
    s.lineTo(r, 0.6 - r);
    s.absarc(0, 0.6 - r, r, 0, Math.PI, false);
    s.lineTo(-r, 0);
    return new THREE.ShapeGeometry(s, 8);
  })(),
);
