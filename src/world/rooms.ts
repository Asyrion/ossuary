/* Building rooms from the floor plan: floor, rocks and pits from the template, walls traced along the
   room's outline (any shape), doors on shared cell edges, torches, pedestals and altars. */
import * as THREE from 'three';
import { furnishLab } from './laboratory';
import { CFG } from '../config';
import type { Box, Door, DoorStyle, FloorLook, RockBox, Room, Side } from '../types';
import { DEV, G } from '../state';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { floorOwnedTexture, floorTexture } from '../render/textures';
import { softenCanvas } from '../render/softEdge';
import { pixelFloorTexture } from '../render/pixelTextures';
import {
  M,
  basicMat,
  blob,
  boxUV,
  cappedWallMaterials,
  disposeTree,
  glow,
  markShared,
  mergeStill,
  wallMaterials,
} from '../render/materials';
import { tickFire } from '../render/fire';
import { offerGuaranteed, placeArtifact } from '../items/artifacts';
import { burst } from '../combat/fx';
import { mulberry } from '../util';
import { DH, H_LOW, H_TALL, HD, HW, PX, PZ, WT } from './dims';
import { FLOORS, type PlannedRoom } from './generate';
import { fillRoles } from './fill';
import { OPPOSITE, SHAPES, SIDE_DIR, cellHalfExtents, shapeMask, shapeSize } from './shapes';
import { TEMPLATES, fallRuns, growPuddles, parseTemplate, tombRuns } from './templates';
import { buildPools } from './pools';
import { chargeRunes } from './mechanisms';
import { LOOT, rollTable } from '../items/loot';
import { soulsHere } from '../items/souls';
import { spawnPickup } from '../items/pickups';
import { buildShop } from '../items/merchant';
import { furnishLibrary } from '../magic/pages';
import { fillVault } from './vault';
import { buildCrackedWall, fillSecret, secretLook } from './secret';
import { buildShrine, shrineLook } from './shrine';
import { subtractRect, wallRects, type Rect } from './walls';
import { dressNorthWall } from './dressing';
import { torchLook } from './fireLooks';
import { pillarLook, rockLook, tombLook, urnLook } from './objectLooks';
import { doorLook } from './wallLooks';
import { buildProps } from './props';
import { THEMES, themedLook } from './themeData';
import { pickKinds } from './kitData';
import { dressTheme } from './themes';
import { floorTile, modelFor, sealedLook } from '../assets/models';

export const roomAt = (gx: number, gy: number) => G.roomMap.get(gx + ',' + gy);
/** World position of the centre of template tile (c, r). */
export const toWorld = (room: Room, c: number, r: number) => ({
  x: room.bounds.minX + c + 0.5,
  z: room.bounds.minZ + r + 0.5,
});
export const doorsOf = (room: Room) => room.doors;
const isNS = (side: Side) => side === 'n' || side === 's';

/** Build a planned room of floor `floorIndex` in its floor's look, or in `own` (M7 step 5: the Vigil's, no floor's). */
export function buildRoom(plan: PlannedRoom, floorIndex: number, own?: FloorLook) {
  const def = TEMPLATES.get(plan.templateId);
  if (!def) throw new Error(`no template "${plan.templateId}"`);
  const template = parseTemplate(def, plan.mirrorX, plan.mirrorY);
  const { w, h } = shapeSize(plan.shape),
    inset = SHAPES[plan.shape].inset;
  const minX = plan.anchor.gx * PX - HW + (inset?.c0 ?? 0),
    minZ = plan.anchor.gy * PZ - HD + (inset?.r0 ?? 0);
  const cx = minX + w / 2,
    cz = minZ + h / 2;
  const floorLook = own ?? FLOORS[Math.min(floorIndex, FLOORS.length - 1)].look;
  const theme = def.theme ? THEMES.get(def.theme) : undefined; // a themed room dresses the floor's look its own way
  const dressed =
    plan.type === 'secret'
      ? secretLook(floorLook)
      : plan.type === 'shrine'
        ? shrineLook(floorLook)
        : themedLook(floorLook, theme);
  const look: FloorLook = dressed.kit
    ? { ...dressed, kinds: pickKinds(dressed.kit, plan.seed, DEV.kitKinds) }
    : dressed; // (the room kit's kinds, drawn on its seed)
  const room: Room = {
    plan,
    template,
    look,
    theme,
    type: plan.type,
    gx: plan.anchor.gx,
    gy: plan.anchor.gy,
    cx,
    cz,
    // the room's inside: its shape, less the tiles the template carves into wall
    bounds: { minX, maxX: minX + w, minZ, maxZ: minZ + h },
    w,
    h,
    mask: shapeMask(plan.shape, plan.mirrorX, plan.mirrorY).map((row, r) =>
      row.map((inShape, c) => inShape && template.tiles[r][c] !== 'void'),
    ),
    group: new THREE.Group(),
    doors: [],
    walls: [],
    rocks: [],
    pits: [],
    torches: [],
    waves: [],
    wave: 0,
    wavePending: false,
    spots: [],
    cleared: true,
    visited: false,
    known: false,
    locked: false,
    flow: template.current,
  };
  room.group.position.set(cx, 0, cz);
  scene.add(room.group);
  // the controls are chalked on the floor of the very first room only
  const kind = plan.type === 'start' && floorIndex > 0 ? 'normal' : plan.type;
  // water and oil, and where oil may spill (round a cask or a censer): no embers glow under them
  const spills: [number, number, number][] = [];
  template.tiles.forEach((row, r) =>
    row.forEach((t, c) => {
      if (t === 'cask') spills.push([c, r, CFG.props.caskSpill]);
      else if (t === 'censer') spills.push([c, r, CFG.mech.censerSpill]);
    }),
  );
  const wet = (c: number, r: number) =>
    template.tiles[r]?.[c] === 'water' ||
    template.tiles[r]?.[c] === 'oil' ||
    spills.some(([sc, sr, n]) => Math.abs(sc - c) + Math.abs(sr - r) <= n);
  const art = kitFloor(look)
    ? pixelFloorTexture(plan.seed, kind, look, room.mask, wet)
    : { map: floorTexture(plan.seed, kind, look, room.mask), glow: undefined };
  const glowK = CFG.roomKit.glow * (plan.variant === 'dark' ? CFG.roomKit.glowDark : 1); // (embers dimmer in a dark room)
  const floor = new THREE.Mesh(
    maskGeometry(room.mask, w, h),
    new THREE.MeshStandardMaterial({
      map: art.map,
      roughness: 0.95,
      ...(art.glow && { emissive: 0xffffff, emissiveMap: art.glow, emissiveIntensity: glowK }),
    }),
  );
  room.group.add(floor);
  // the drowned floor's standing water is real in its fights: a puddle or two to wade through
  if (look.floor.decor === 'puddles' && plan.type === 'normal' && !template.current) {
    // (a room whose water runs has its own)
    const R = mulberry(plan.seed ^ 0xd20e),
      [lo, hi] = CFG.surface.puddles;
    growPuddles(template, R, lo + Math.floor(R() * (hi - lo + 1)), CFG.surface.puddleSize);
  }
  template.tiles.forEach((row, r) =>
    row.forEach((tile, c) => {
      if (tile === 'rock') addRock(room, c, r);
      else if (tile === 'pit') addPit(room, c, r);
      else if (tile === 'pillar') addPillar(room, c, r);
      else if (tile === 'urn' || tile === 'sealedUrn') addUrn(room, c, r, tile === 'sealedUrn');
    }),
  );
  for (const run of tombRuns(template)) addTomb(room, run);
  buildProps(room); // bone piles, casks, roots, briars, cobwebs, glowcaps, pews (M3.6)
  if (theme?.twist === 'rime') chargeRunes(room, 'chill'); // the frozen mausoleum's rune stones hold frost
  dressTheme(room); // a themed room's scatter: candles, pages, moss, bedrolls, daylight...
  drawPits(room);
  mergePits(room);
  buildPools(room);
  // the template's roles filled with the floor's foes, on the room's seed (world/fill.ts: one elite at most, one pack or
  // nest, a pair, the pressure's one more, a quiet room's few), then placed
  const filled =
    plan.type === 'vigil'
      ? ({ waves: [], quietHeart: false } as ReturnType<typeof fillRoles>)
      : fillRoles(plan, template.waves, FLOORS[Math.min(floorIndex, FLOORS.length - 1)], DEV.foe); // (the Vigil: nothing to fight)
  room.waves = filled.waves.map((wv) => wv.map((f) => ({ kind: f.kind, role: f.role, ...toWorld(room, f.c, f.r) })));
  if (filled.pair) {
    // (M4.7: two foes made to work together, the second set beside the first)
    const wave = room.waves[0],
      [a, b] = filled.pair,
      p = freeSpotNear(room, wave[a].x + CFG.pairs.gap, wave[a].z);
    wave[b].x = p.x;
    wave[b].z = p.z;
    room.pair = [wave[a].kind, wave[b].kind];
  }
  if (filled.extraFrom !== undefined) {
    // (M4.9's pressure: the one more stands beside the foe it was drawn from)
    const wave = room.waves[0],
      f = wave[filled.extraFrom],
      x = wave[wave.length - 1],
      p = freeSpotNear(room, f.x + CFG.curve.extraAt[0], f.z + CFG.curve.extraAt[1]);
    x.x = p.x;
    x.z = p.z;
  }
  if (plan.variant === 'quiet') room.quietHeart = filled.quietHeart;
  room.cleared = room.waves.length === 0;
  if (plan.type === 'treasure') addPedestal(room);
  if (plan.type === 'altar') addAltar(room);
  if (plan.type === 'merchant') buildShop(room);
  if (plan.type === 'vault') fillVault(room);
  if (plan.type === 'secret') fillSecret(room);
  if (plan.type === 'shrine') buildShrine(room);
  if (plan.type === 'library') furnishLibrary(room);
  if (plan.type === 'laboratory') furnishLab(room); // (M5)
  G.rooms.push(room);
  for (const c of plan.cells) G.roomMap.set(c.gx + ',' + c.gy, room);
  return room;
}

/** The floor: one quad per run of inside tiles, UV-mapped onto the room's floor texture. */
function maskGeometry(mask: boolean[][], w: number, h: number) {
  const pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  mask.forEach((row, r) => {
    for (let c = 0; c < w;) {
      if (!row[c]) {
        c++;
        continue;
      }
      const c0 = c;
      while (c < w && row[c]) c++;
      const x0 = c0 - w / 2,
        x1 = c - w / 2,
        z0 = r - h / 2,
        z1 = r + 1 - h / 2,
        i = pos.length / 3;
      pos.push(x0, 0, z0, x0, 0, z1, x1, 0, z1, x1, 0, z0);
      uv.push(c0 / w, 1 - r / h, c0 / w, 1 - (r + 1) / h, c / w, 1 - (r + 1) / h, c / w, 1 - r / h);
      idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Whether a room's rocks, pillars, tombs and urns are the room kit's (objectLooks.ts). */
export const kitPieces = (room: Room) => DEV.roomKit && !!room.look.kinds;

function addRock(room: Room, c: number, r: number) {
  const p = toWorld(room, c, r);
  const R = mulberry(c * 31 + r * 7 + room.plan.seed);
  let g = new THREE.Group();
  if (kitPieces(room)) {
    g = rockLook(R, room.look, room.theme?.rock === 'dripstone');
    mergeStill(g);
  } else if (room.theme?.rock === 'dripstone') {
    // a fungal grotto's rocks are stalagmites, dripped up from the floor
    for (const [x, z, h, r] of [
      [0, 0, 1 + R() * 0.5, 0.3],
      [R() * 0.4 - 0.2, 0.25, 0.45 + R() * 0.3, 0.16],
      [0.25, R() * 0.3 - 0.2, 0.3 + R() * 0.2, 0.12],
    ]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), M.rock);
      cone.position.set(x, h / 2, z);
      g.add(cone);
    }
    g.add(blob(1.2));
  } else {
    const big = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0), M.rock);
    big.scale.set(1, 0.78 + R() * 0.2, 1);
    big.position.y = 0.3;
    big.rotation.set(R() * 3, R() * 3, R() * 3);
    const small = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), M.rock);
    small.position.set(R() * 0.5 - 0.25, 0.12, 0.3);
    small.rotation.set(R() * 3, R() * 3, 0);
    g.add(big, small, blob(1.3));
  }
  g.position.set(p.x - room.cx, 0, p.z - room.cz);
  room.group.add(g);
  room.rocks.push({
    x: p.x,
    z: p.z,
    hx: 0.42,
    hz: 0.42,
    hp: CFG.artifacts.rockHp,
    breakable: true,
    mesh: g,
    tile: { c, r },
  });
}

/** A stone pillar: plinth, shaft and capital, or broken off partway (chosen by the room's seed). Blocks like
    a rock but never breaks; it keeps how tall it stands (`pillar`: the Pillar Dragon coils round its top). */
function addPillar(room: Room, c: number, r: number) {
  const p = toWorld(room, c, r),
    R = mulberry(c * 131 + r * 17 + room.plan.seed);
  const broken = R() < 0.35 && room.type !== 'boss',
    shaft = broken ? 0.55 + R() * 0.45 : 1.3; // (a boss's hall keeps its pillars whole: the Pillar Dragon coils on them)
  room.group.add(pillarAt(room, p.x, p.z, R, broken, shaft));
  room.rocks.push({
    x: p.x,
    z: p.z,
    hx: 0.4,
    hz: 0.4,
    hp: 0,
    breakable: false,
    pillar: broken ? shaft + 0.3 : PILLAR_TOP,
  });
}
/** How tall a whole pillar stands, to the top of its capital. */
export const PILLAR_TOP = 1.75;
/** A whole pillar raised at (x, z) where there was none (M4.2: the Pillar Dragon brings its own when the room has too
    few); returns its look, standing at the floor, for the caller to raise out of it. */
export function raisePillar(room: Room, x: number, z: number) {
  const g = pillarAt(room, x, z, mulberry(Math.round(x * 131 + z * 17) + room.plan.seed), false, 1.3);
  room.group.add(g);
  room.rocks.push({ x, z, hx: 0.4, hz: 0.4, hp: 0, breakable: false, pillar: PILLAR_TOP });
  return g;
}
function pillarAt(room: Room, x: number, z: number, R: () => number, broken: boolean, shaft: number) {
  if (kitPieces(room)) {
    const g = pillarLook(R, room.look, broken, shaft - 0.06);
    mergeStill(g);
    g.position.set(x - room.cx, 0, z - room.cz);
    return g;
  }
  const g = new THREE.Group();
  g.position.set(x - room.cx, 0, z - room.cz);
  const part = (geo: THREE.BufferGeometry, y: number, rot = 0) => {
    const m = new THREE.Mesh(geo, M.stone);
    m.position.y = y;
    m.rotation.y = rot;
    g.add(m);
    return m;
  };
  part(new THREE.BoxGeometry(0.86, 0.22, 0.86), 0.11);
  part(new THREE.CylinderGeometry(0.27, 0.3, shaft, 8), 0.22 + shaft / 2, R());
  if (broken) {
    // a jagged top and a fallen chunk beside it
    part(new THREE.CylinderGeometry(0.2, 0.27, 0.14, 8), 0.22 + shaft + 0.07, R()).rotation.z = 0.25;
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), M.stone);
    const a = R() * Math.PI * 2;
    chunk.position.set(Math.cos(a) * 0.42, 0.1, Math.sin(a) * 0.42);
    g.add(chunk);
  } else part(new THREE.BoxGeometry(0.72, 0.18, 0.72), 0.22 + shaft + 0.09);
  g.add(blob(1.25));
  return g;
}

/** A stone tomb `len` tiles long, across (along x) or up and down: a plinth, a lid with a raised ridge and a
    carved cross. Blocks like a rock but never breaks. */
function addTomb(room: Room, run: { c: number; r: number; len: number; across: boolean }) {
  const a = toWorld(room, run.c, run.r),
    b = toWorld(room, run.c + (run.across ? run.len - 1 : 0), run.r + (run.across ? 0 : run.len - 1));
  const x = (a.x + b.x) / 2,
    z = (a.z + b.z) / 2,
    long = run.len - 0.16,
    wide = 0.78;
  if (kitPieces(room)) {
    const g = tombLook(
      mulberry(run.c * 71 + run.r * 29 + room.plan.seed),
      long,
      wide,
      room.look,
      room.theme?.tomb === 'slab',
    );
    mergeStill(g);
    g.position.set(x - room.cx, 0, z - room.cz);
    if (!run.across) g.rotation.y = Math.PI / 2;
    room.group.add(g);
    room.rocks.push({
      x,
      z,
      hx: (run.across ? long : wide) / 2 + 0.02,
      hz: (run.across ? wide : long) / 2 + 0.02,
      hp: 0,
      breakable: false,
    });
    return;
  }
  const g = new THREE.Group();
  g.position.set(x - room.cx, 0, z - room.cz);
  if (!run.across) g.rotation.y = Math.PI / 2;
  const part = (w: number, h: number, d: number, y: number, mat: THREE.Material = M.tomb) => {
    const m = new THREE.Mesh(boxUV(w, h, d), mat);
    m.position.y = y;
    g.add(m);
    return m;
  };
  if (room.theme?.tomb === 'slab') {
    // an embalmers' slab: a stone table on two plinths, and someone under a shroud on it
    part(long, 0.08, wide, 0.5, M.stone);
    for (const px of [-long / 2 + 0.25, long / 2 - 0.25]) part(0.3, 0.46, wide - 0.2, 0.23).position.x = px;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, Math.max(0.2, long - 0.7), 4, 8), shroud());
    body.rotation.z = Math.PI / 2;
    body.scale.set(1, 1, 0.75);
    body.position.y = 0.66;
    g.add(body);
    const shadow = blob(1);
    shadow.scale.set(long + 0.6, 1, wide + 0.6);
    g.add(shadow);
    room.group.add(g);
    room.rocks.push({
      x,
      z,
      hx: (run.across ? long : wide) / 2 + 0.02,
      hz: (run.across ? wide : long) / 2 + 0.02,
      hp: 0,
      breakable: false,
    });
    return;
  }
  part(long, 0.42, wide, 0.21);
  part(long + 0.08, 0.1, wide + 0.08, 0.47);
  part(long - 0.2, 0.07, 0.2, 0.555, M.stone); // ridge along the lid
  const cx = -long / 2 + Math.min(0.45, long * 0.3); // a cross at the head end
  part(0.07, 0.04, 0.38, 0.6, M.bone).position.x = cx;
  part(0.24, 0.04, 0.07, 0.6, M.bone).position.set(cx, 0.6, -0.06);
  const shadow = blob(1);
  shadow.scale.set(long + 0.6, 1, wide + 0.6);
  g.add(shadow);
  room.group.add(g);
  room.rocks.push({
    x,
    z,
    hx: (run.across ? long : wide) / 2 + 0.02,
    hz: (run.across ? wide : long) / 2 + 0.02,
    hp: 0,
    breakable: false,
  });
}

let shroudMat: THREE.Material | null = null;
const shroud = () =>
  (shroudMat ??= markShared(new THREE.MeshStandardMaterial({ color: 0xcfc6b0, roughness: 1, emissive: 0x14120c })));

/* Urns: funerary urns of clay, and rune-sealed ones of dark stone ringed by a ward. A made urn (data/assets.json,
   M3.5) takes the clay placeholder's place; the sealed one is the same model in darker, bluish stone. */
export const WARD_COLOR = 0x8ab8ff;
const SEALED_TINT = 0x8090b0,
  URN_BELLY = 0.25; // (the placeholder's widest radius, which the ward band fits)
let urnGeo: { body: THREE.LatheGeometry; lid: THREE.TorusGeometry; band: THREE.TorusGeometry } | null = null;
function urnShapes() {
  if (urnGeo) return urnGeo;
  const profile = [
    [0, 0],
    [0.15, 0],
    [0.2, 0.06],
    [0.25, 0.2],
    [0.23, 0.34],
    [0.15, 0.44],
    [0.11, 0.5],
    [0.14, 0.54],
    [0, 0.55],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.LatheGeometry(profile, 12),
    lid = new THREE.TorusGeometry(0.12, 0.03, 5, 12),
    band = new THREE.TorusGeometry(0.25, 0.022, 5, 20);
  lid.rotateX(Math.PI / 2);
  band.rotateX(Math.PI / 2);
  for (const g of [body, lid, band]) g.userData.shared = true;
  return (urnGeo = { body, lid, band });
}
function addUrn(room: Room, c: number, r: number, sealed: boolean) {
  const p = toWorld(room, c, r),
    R = mulberry(c * 53 + r * 11 + room.plan.seed),
    s = urnShapes();
  const g = new THREE.Group();
  g.position.set(p.x - room.cx + (R() - 0.5) * 0.12, 0, p.z - room.cz + (R() - 0.5) * 0.12);
  g.rotation.y = R() * 6;
  g.scale.setScalar(0.9 + R() * 0.2);
  const model = modelFor('props', 'urn');
  if (model) g.add(sealed ? sealedLook(model, SEALED_TINT) : model, blob(0.8));
  else if (kitPieces(room)) {
    // the room kit's urn, its ward its own (objectLooks.ts)
    const k = urnLook(R, room.look, sealed, WARD_COLOR);
    mergeStill(k);
    g.add(k);
    g.rotation.y = 0; // (turned a little, its ward's runes to the camera)
    room.group.add(g);
    room.rocks.push({
      x: p.x,
      z: p.z,
      hx: 0.26,
      hz: 0.26,
      hp: 1,
      breakable: false,
      mesh: g,
      tile: { c, r },
      urn: sealed ? 'sealed' : 'plain',
    });
    return;
  } else {
    const body = new THREE.Mesh(s.body, sealed ? M.urnStone : M.clay);
    const lid = new THREE.Mesh(s.lid, M.urnLid);
    lid.position.y = 0.52;
    g.add(body, lid, blob(0.8));
  }
  if (sealed) {
    // the ward round its belly: sized to a made urn's width, so the band shows outside it
    const size = model ? new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()) : null;
    const k = size ? ((Math.max(size.x, size.z) / 2) * 1.06) / URN_BELLY : 1,
      y = size ? size.y * 0.48 : 0.27;
    const band = new THREE.Mesh(s.band, M.ward);
    band.position.y = y;
    band.scale.set(k, 1, k);
    g.add(band);
    const gl = glow(WARD_COLOR, 0.9 * k, 0.45);
    gl.position.y = y + 0.03;
    g.add(gl);
  }
  room.group.add(g);
  room.rocks.push({
    x: p.x,
    z: p.z,
    hx: 0.26,
    hz: 0.26,
    hp: 1,
    breakable: false,
    mesh: g,
    tile: { c, r },
    urn: sealed ? 'sealed' : 'plain',
  });
}

/** The dev menu: an urn (plain or rune-sealed) on the floor tile at (x, z) in this room, as a template's `u` or `$`
    puts one. Returns whether there was floor for it. */
export function placeUrn(x: number, z: number, sealed: boolean) {
  const room = G.current,
    c = Math.floor(x - room.bounds.minX),
    r = Math.floor(z - room.bounds.minZ);
  if (room.template.tiles[r]?.[c] !== 'floor') return false;
  addUrn(room, c, r, sealed);
  room.template.tiles[r][c] = sealed ? 'sealedUrn' : 'urn';
  return true;
}

/** A bolt or a blast struck an urn. Bolts glance off a rune-sealed urn; otherwise it breaks: grave dust puffs
    out, and the soul inside rises as whatever the urn held. Returns whether it broke. */
export function strikeUrn(room: Room, rock: RockBox, blast: boolean) {
  if (!rock.urn || !rock.mesh) return false;
  if (rock.urn === 'sealed' && !blast) {
    burst(rock.x, 0.35, rock.z, WARD_COLOR, 5, 1.6, 0.035);
    Sfx.at(rock.x, rock.z).wardTink();
    return false;
  }
  room.group.remove(rock.mesh);
  disposeTree(rock.mesh);
  room.rocks = room.rocks.filter((r) => r !== rock);
  if (rock.tile) room.template.tiles[rock.tile.r][rock.tile.c] = 'floor';
  const clay = kitPieces(room) ? new THREE.Color(room.look.urn.clay).getHex() : 0x8a5436; // (the room kit's urns are in the floor's clay)
  burst(rock.x, 0.3, rock.z, rock.urn === 'sealed' ? 0x4c4a54 : clay, 10, 2.2, 0.06); // shards
  burst(rock.x, 0.2, rock.z, 0x8a8278, 12, 0.9, 0.07); // grave dust
  if (rock.urn === 'sealed') burst(rock.x, 0.4, rock.z, WARD_COLOR, 10, 2, 0.04);
  Sfx.at(rock.x, rock.z).urn(rock.urn === 'sealed');
  for (const item of rollTable(G.run.drops, rock.urn === 'sealed' ? 'sealedUrn' : 'urn', LOOT, soulsHere()))
    spawnPickup(item, rock.x, rock.z, { rise: true });
  return true;
}

/** A bolt from a mage holding Mason's Chisel struck a rock: it cracks, and breaks on the last hit. A blast
    (`shatter`) breaks it at once. */
export function hitRock(room: Room, rock: RockBox, shatter = false) {
  if (!rock.breakable || !rock.mesh) return;
  rock.hp = shatter ? 0 : rock.hp - 1;
  burst(rock.x, 0.4, rock.z, 0x8a8078, 4, 1.4, 0.05);
  if (rock.hp > 0) {
    rock.mesh.scale.multiplyScalar(0.88);
    rock.mesh.position.y = -0.04 * (CFG.artifacts.rockHp - rock.hp);
    Sfx.at(rock.x, rock.z).crack();
    return;
  }
  room.group.remove(rock.mesh);
  disposeTree(rock.mesh);
  room.rocks = room.rocks.filter((r) => r !== rock);
  if (rock.tile) room.template.tiles[rock.tile.r][rock.tile.c] = 'floor';
  burst(rock.x, 0.5, rock.z, 0x6b625a, 16, 2.6, 0.09);
  Sfx.at(rock.x, rock.z).rubble();
  G.shake = Math.max(G.shake, 0.1);
}

// Pits: a dark hole drawn over the floor. Walkers and the mage can't cross them; bolts and wisps can. Pits side by side
// are drawn as one (M4.2: a chasm, not a row of holes), their dark joined and soft at its rim (`drawPits`).
/** A pit on tile (c, r); not `solid`, only its dark (the chasm under a rope bridge, M4.2: it falls when the bridge burns). */
export function addPit(room: Room, c: number, r: number, solid = true) {
  const p = toWorld(room, c, r);
  (room.pitTiles ??= []).push({ c, r });
  if (solid) room.pits.push({ x: p.x, z: p.z, hx: 0.5, hz: 0.5 });
}
/** The room's pits drawn: one dark shape over each stretch of pit tiles side by side, blurred at its rim. */
function drawPits(room: Room) {
  const tiles = room.pitTiles ?? [],
    has = new Set(tiles.map((t) => t.c + ',' + t.r)),
    seen = new Set<string>();
  for (const start of tiles) {
    if (seen.has(start.c + ',' + start.r)) continue;
    const region = [start],
      queue = [start];
    seen.add(start.c + ',' + start.r);
    while (queue.length) {
      const q = queue.pop()!;
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const k = q.c + dc + ',' + (q.r + dr);
        if (has.has(k) && !seen.has(k)) {
          seen.add(k);
          const n = { c: q.c + dc, r: q.r + dr };
          region.push(n);
          queue.push(n);
        }
      }
    }
    const P = 32,
      c0 = Math.min(...region.map((t) => t.c)),
      c1 = Math.max(...region.map((t) => t.c)),
      r0 = Math.min(...region.map((t) => t.r)),
      r1 = Math.max(...region.map((t) => t.r));
    const w = c1 - c0 + 2,
      h = r1 - r0 + 2,
      cv = document.createElement('canvas');
    cv.width = w * P;
    cv.height = h * P;
    const g = cv.getContext('2d', { willReadFrequently: true })!,
      inReg = new Set(region.map((t) => t.c + ',' + t.r));
    g.fillStyle = 'rgb(3,2,2)';
    for (const t of region) {
      // a rounded square per tile, bridged to its neighbours: one hole with a soft rim
      const x = (t.c - c0 + 1) * P,
        y = (t.r - r0 + 1) * P;
      g.beginPath();
      g.roundRect(x - P * 0.46, y - P * 0.46, P * 0.92, P * 0.92, P * 0.3);
      g.fill();
      if (inReg.has(t.c + 1 + ',' + t.r)) g.fillRect(x, y - P * 0.46, P, P * 0.92);
      if (inReg.has(t.c + ',' + (t.r + 1))) g.fillRect(x - P * 0.46, y, P * 0.92, P);
      if (inReg.has(t.c + 1 + ',' + t.r) && inReg.has(t.c + ',' + (t.r + 1)) && inReg.has(t.c + 1 + ',' + (t.r + 1)))
        g.fillRect(x, y, P, P);
    }
    softenCanvas(g, CFG.surface.pitBlur);
    const R = mulberry(room.plan.seed ^ 0x9175);
    for (const t of region)
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        // a crumbled rim: stones along its open edges
        if (inReg.has(t.c + dc + ',' + (t.r + dr))) continue;
        for (let k = 0; k < 5; k++) {
          const along = (R() - 0.5) * P * 0.9,
            x = (t.c - c0 + 1) * P + (dc ? dc * P * 0.44 : along),
            y = (t.r - r0 + 1) * P + (dr ? dr * P * 0.44 : along);
          g.fillStyle = `rgba(60,52,44,${0.35 + R() * 0.4})`;
          g.fillRect(x, y, 1 + R() * 2, 1 + R() * 2);
        }
      }
    const tex = floorOwnedTexture(new THREE.CanvasTexture(cv));
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), mat);
    m.position.set(room.bounds.minX + c0 - 0.5 + w / 2 - room.cx, 0.006, room.bounds.minZ + r0 - 0.5 + h / 2 - room.cz);
    room.group.add(m);
  }
}
/** A bridge burnt through (M4.2): the chasm under tile (c, r) is a pit now (its dark was drawn with the bridge). */
export function openChasm(room: Room, c: number, r: number) {
  const p = toWorld(room, c, r);
  room.template.tiles[r][c] = 'pit';
  room.pits.push({ x: p.x, z: p.z, hx: 0.5, hz: 0.5 });
  mergePits(room);
}
/** Join pit tiles in the same row into one collision box, so the mage slides along them smoothly. */
export function mergePits(room: Room) {
  const rows = new Map<number, Box[]>();
  for (const b of room.pits) {
    const list = rows.get(b.z) ?? [];
    list.push(b);
    rows.set(b.z, list);
  }
  const merged: Box[] = [];
  for (const list of rows.values()) {
    list.sort((a, b) => a.x - b.x);
    let cur = { ...list[0] };
    for (const b of list.slice(1)) {
      if (Math.abs(b.x - b.hx - (cur.x + cur.hx)) < 1e-6) {
        const x0 = cur.x - cur.hx,
          x1 = b.x + b.hx;
        cur = { x: (x0 + x1) / 2, z: cur.z, hx: (x1 - x0) / 2, hz: 0.5 };
      } else {
        merged.push(cur);
        cur = { ...b };
      }
    }
    merged.push(cur);
  }
  room.pits = merged;
}

function addPedestal(room: Room) {
  const def = offerGuaranteed('treasure');
  if (def) placeArtifact(room, def, room.cx, room.cz); // else nothing is left to find: enterRoom offers a heart
}

/** A bone altar: an artifact from the altar pool for one heart container. The generator only places one
    the floor's budget reaches; if every artifact has been offered already, it stays bare. */
function addAltar(room: Room) {
  const def = room.plan.artifact ? offerGuaranteed('altar') : null;
  if (def) placeArtifact(room, def, room.cx, room.cz, { altar: true });
}

/** Is the tile under (x, z) open floor, clear of rocks and pedestals? */
export function isFreeAt(room: Room, x: number, z: number) {
  const c = Math.floor(x - room.bounds.minX),
    r = Math.floor(z - room.bounds.minZ);
  return (
    room.template.tiles[r]?.[c] === 'floor' &&
    !room.rocks.some((b) => Math.abs(x - b.x) < b.hx + 0.3 && Math.abs(z - b.z) < b.hz + 0.3)
  );
}
/** The nearest open floor spot to (x, z), searching outwards tile by tile. */
export function freeSpotNear(room: Room, x: number, z: number) {
  const b = room.bounds;
  for (let ring = 0; ring < 12; ring++)
    for (let dz = -ring; dz <= ring; dz++)
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        const px = x + dx,
          pz = z + dz;
        if (px > b.minX + 0.5 && px < b.maxX - 0.5 && pz > b.minZ + 0.5 && pz < b.maxZ - 0.5 && isFreeAt(room, px, pz))
          return { x: px, z: pz };
      }
  return { x, z };
}
/** A random point over the room's inside (floor or pit), for things that fly. */
export function randomSpot(room: Room) {
  for (let i = 0; i < 40; i++) {
    const c = Math.floor(Math.random() * room.w),
      r = Math.floor(Math.random() * room.h);
    if (room.mask[r][c] && c > 0 && r > 0 && c < room.w - 1 && r < room.h - 1) return toWorld(room, c, r);
  }
  return { x: room.cx, z: room.cz };
}
/** Where the mage stands after walking in through a door. */
export function entryPoint(door: Door) {
  const [dx, dz] = SIDE_DIR[door.side];
  return { x: door.x - dx * 0.6, z: door.z - dz * 0.6 };
}

/* ---------- walls, doors and torches ---------- */

/** A stretch of wall along one side of the outline, in tiles: `line` is the tile row (n/s) or column (e/w)
    of the wall band, [a0, a1) the tiles it spans (over outer corners), [i0, i1) the part along the inside. */
interface WallRun {
  facing: Side;
  line: number;
  a0: number;
  a1: number;
  i0: number;
  i1: number;
}

/** Trace the outline of the room's mask into wall runs (where torches go; the walls themselves are built from
    walls.ts). Runs on the north and south are stretched over outer corners. */
function outline(mask: boolean[][], w: number, h: number): WallRun[] {
  const inside = (c: number, r: number) => r >= 0 && r < h && c >= 0 && c < w && mask[r][c];
  const runs: WallRun[] = [];
  const scan = (
    facing: Side,
    lines: number,
    span: number,
    edge: (line: number, a: number) => boolean,
    band: (line: number) => number,
  ) => {
    for (let l = 0; l < lines; l++)
      for (let a = 0; a < span;) {
        if (!edge(l, a)) {
          a++;
          continue;
        }
        const a0 = a;
        while (a < span && edge(l, a)) a++;
        runs.push({ facing, line: band(l), a0, a1: a, i0: a0, i1: a });
      }
  };
  scan(
    'n',
    h,
    w,
    (r, c) => inside(c, r) && !inside(c, r - 1),
    (r) => r - 1,
  );
  scan(
    's',
    h,
    w,
    (r, c) => inside(c, r) && !inside(c, r + 1),
    (r) => r + 1,
  );
  scan(
    'w',
    w,
    h,
    (c, r) => inside(c, r) && !inside(c - 1, r),
    (c) => c - 1,
  );
  scan(
    'e',
    w,
    h,
    (c, r) => inside(c, r) && !inside(c + 1, r),
    (c) => c + 1,
  );
  for (const run of runs)
    if (isNS(run.facing)) {
      if (!inside(run.a0 - 1, run.line)) run.a0--;
      if (!inside(run.a1, run.line)) run.a1++;
    }
  return runs;
}

const wallHeight = (facing: Side) => (facing === 's' ? H_LOW : H_TALL);

/** A wall box from world x0..x1, z0..z1; returns its collider. */
function wallBox(
  room: Room,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  h: number,
  mats: THREE.Material | THREE.Material[],
  y0 = 0,
): Box {
  const m = new THREE.Mesh(boxUV(x1 - x0, h, z1 - z0), mats);
  m.position.set((x0 + x1) / 2 - room.cx, y0 + h / 2, (z0 + z1) / 2 - room.cz);
  room.group.add(m);
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: (x1 - x0) / 2, hz: (z1 - z0) / 2 };
}

/** Walls along the outline with gaps for the doors, the doors themselves, and torches. Needs every room of
    the floor built, since a door's look depends on the room behind it. */
export function buildWallsAndDoors(room: Room) {
  const { minX, minZ } = room.bounds,
    mats = wallMaterials(room.look.wall, kitWalls(room.look)),
    capped = cappedWallMaterials(room.look.wall, kitWalls(room.look));
  const { hx, hz } = cellHalfExtents(room.plan.shape);
  // doors first: where they are decides where the walls have gaps
  for (const pd of room.plan.doors) {
    const nb = G.rooms.find((r) => r.plan.id === pd.to)!;
    const [dx, dz] = SIDE_DIR[pd.side];
    const shift = pd.shift ?? 0; // how far the door has moved along its edge (M3.6)
    const x = pd.gx * PX + dx * hx + (dx ? 0 : shift),
      z = pd.gy * PZ + dz * hz + (dz ? 0 : shift); // middle of the doorway on the room's inside edge
    const either = (t: string) => room.type === t || nb.type === t;
    const style: DoorStyle = either('secret')
      ? 'secret'
      : either('waystone')
        ? 'waystone'
        : either('boss')
          ? 'boss'
          : either('ordeal')
            ? 'ordeal'
            : either('altar')
              ? 'altar'
              : either('treasure')
                ? 'treasure'
                : either('vault')
                  ? 'vault'
                  : either('merchant')
                    ? 'merchant'
                    : either('shrine')
                      ? 'shrine'
                      : either('library')
                        ? 'library'
                        : either('laboratory')
                          ? 'laboratory'
                          : 'normal';
    const door = buildDoor(room, pd.side, nb, style, x, z);
    if (pd.barred) plugDoor(room, door); // (M7 step 9: a way at the Vigil barred by a school, shut until it opens)
    room.doors.push(door);
  }
  // the walls: rectangles of wall tiles (walls.ts), with the doorways cut out of them
  const shape = shapeMask(room.plan.shape, room.plan.mirrorX, room.plan.mirrorY);
  const gaps: Rect[] = room.doors.map((d) => {
    const [dx, dz] = SIDE_DIR[d.side],
      ns = isNS(d.side);
    const a0 = dx > 0 || dz > 0 ? 0 : -WT,
      a1 = a0 + WT; // the wall band, beyond the doorway's inside edge
    return ns
      ? { x0: d.x - DH, x1: d.x + DH, z0: d.z + a0, z1: d.z + a1 }
      : { x0: d.x + a0, x1: d.x + a1, z0: d.z - DH, z1: d.z + DH };
  });
  const rects = wallRects(room.mask, shape);
  const tallAt = (c: number, r: number) => rects.some((q) => q.tall && c >= q.c0 && c < q.c1 && r >= q.r0 && r < q.r1);
  for (const w of rects) {
    let pieces: Rect[] = [{ x0: minX + w.c0, x1: minX + w.c1, z0: minZ + w.r0, z1: minZ + w.r1 }];
    for (const g of gaps) pieces = pieces.flatMap((p) => subtractRect(p, g));
    for (const p of pieces)
      room.walls.push(
        wallBox(room, p.x0, p.x1, p.z0, p.z1, w.tall ? H_TALL : H_LOW, w.inner && !w.tall ? capped : mats),
      );
  }
  // torches along the longer stretches of tall wall facing into the room
  const tallRuns = outline(room.mask, room.w, room.h).filter((run) => {
    const ns = isNS(run.facing),
      mid = Math.floor((run.i0 + run.i1) / 2);
    return run.i1 - run.i0 >= 3 && (ns ? tallAt(mid, run.line) : tallAt(run.line, mid));
  });
  const falls = fallRuns(room.template); // (M4.2: waterfalls pour from these spans of wall; torches and dressing keep off them)
  for (const run of tallRuns) placeTorches(room, run, (isNS(run.facing) ? minZ : minX) + run.line, falls);
  // pilasters and niches along the tall walls facing south into the room, clear of doors and torches
  for (const run of tallRuns)
    if (run.facing === 'n') {
      const face = minZ + run.line + WT;
      const avoid = [
        ...room.doors
          .filter((d) => d.side === 'n' && Math.abs(d.z - face) < 0.1)
          .map((d) => ({ x: d.x, room: DH + 0.3 })),
        ...room.torches.filter((t) => Math.abs(t.z - (face + 0.6)) < 0.1).map((t) => ({ x: t.x, room: 0.3 })),
        ...falls
          .filter((f) => f.side === 'n')
          .map((f) => ({ x: minX + (f.i0 + f.i1) / 2, room: (f.i1 - f.i0) / 2 + 0.3 })),
        ...sluices(room).map((b) => ({ x: b.x, room: 0.9 })), // (M4.9: a sluice gate's frame stands against it)
        ...(room.keepClear ?? []).filter((k) => k.side === 'n').map((k) => ({ x: k.at, room: k.half + 0.3 })),
      ]; // (M7: the Vigil's pieces and barred ways)
      dressNorthWall(room, face, minX + run.i0, minX + run.i1, avoid);
    }
}

/** The room's sluice gates (M4.9): torches and the wall's dressing keep clear of them. */
const sluices = (room: Room) => (room.props ?? []).filter((b) => b.prop.kind === 'sluice');
/** Torches along a wall run: on every north wall, and on long east/west walls (tall rooms). */
function placeTorches(room: Room, run: WallRun, across0: number, falls: ReturnType<typeof fallRuns>) {
  const ns = isNS(run.facing);
  if (run.facing === 's') return;
  const base = ns ? room.bounds.minX : room.bounds.minZ;
  const inner0 = base + run.i0,
    inner1 = base + run.i1,
    len = inner1 - inner0;
  if (!ns && len < 14) return;
  const count = ns ? Math.max(1, Math.round(len / 6.5)) : Math.floor(len / 8);
  const spots =
    count === 1
      ? [len / 2]
      : ns
        ? Array.from({ length: count }, (_, i) => 3 + (i * (len - 6)) / (count - 1))
        : Array.from({ length: count }, (_, i) => ((i + 0.5) * len) / count);
  const inTheWay = [
    ...room.doors.filter((d) => d.side === run.facing).map((d) => ({ at: ns ? d.x : d.z, half: DH })), // doors, and waterfalls (M4.2)
    ...falls
      .filter((f) => f.side === run.facing)
      .map((f) => ({ at: base + (f.i0 + f.i1) / 2, half: (f.i1 - f.i0) / 2 })),
    ...(run.facing === 'n' ? sluices(room).map((b) => ({ at: b.x, half: 0.6 })) : []), // (and sluice gates, M4.9)
    ...(run.facing === 'n' && room.lab ? [{ at: room.cx + room.lab.vat.position.x, half: 1.15 }] : []), // (and a laboratory's vat window, M5)
    ...(room.keepClear ?? []).filter((k) => k.side === run.facing),
  ]; // (and what stands against the Vigil's walls, M7)
  const face = run.facing === 'n' ? across0 + WT : run.facing === 'w' ? across0 + WT : across0; // the wall's inner face
  for (let s of spots) {
    let at = inner0 + s;
    const blocked = inTheWay.find((b) => Math.abs(at - b.at) < b.half + 0.5);
    if (blocked) {
      // move clear of the door, or skip if there's no room
      const options = [blocked.at - blocked.half - 0.6, blocked.at + blocked.half + 0.6].filter(
        (p) => p > inner0 + 0.5 && p < inner1 - 0.5 && !inTheWay.some((b) => Math.abs(p - b.at) < b.half + 0.4),
      );
      if (!options.length) continue;
      at = options[0];
    }
    const normal: [number, number] = run.facing === 'n' ? [0, 1] : run.facing === 'w' ? [1, 0] : [-1, 0];
    addTorch(room, ns ? at : face, ns ? face : at, normal, room.look.torch);
  }
}

/** The kind of wall the room kit draws for a room (M3.5 step 3), or false for the old look. */
export const kitWalls = (look: FloorLook) => DEV.roomKit && !!look.kinds && look.kinds.wall;
/** Whether the room kit draws the floor too: not where a made floor tile (data/assets.json) paints it. */
export const kitFloor = (look: FloorLook) => !!kitWalls(look) && !floorTile(look.name);

/** A light on a wall, in the floor's style: iron bracket (crypt), cage lantern (drowned) or brazier (burning).
    Built facing south and turned to face the room along `normal`. */
function addTorch(room: Room, x: number, z: number, normal: [number, number], t: FloorLook['torch']) {
  const lit = room.plan.variant !== 'dark',
    at = { x: x + normal[0] * 0.6, z: z + normal[1] * 0.6 };
  if (DEV.roomKit) {
    // the room kit's torch (fireLooks.ts): its fire moves by itself
    const { holder, lit: fire, glow: gl } = torchLook(t, room.look.kinds?.torch ?? t.style); // (the old looks' styles are kinds too)
    holder.userData.parts = { fire, gl };
    mergeStill(holder);
    holder.position.set(x - room.cx, 0, z - room.cz);
    holder.rotation.y = Math.atan2(normal[0], normal[1]);
    fire.visible = gl.visible = lit;
    room.group.add(holder);
    room.torches.push({ flame: fire, glow: gl, ...at, lit });
    return;
  }
  const flameMat = basicMat(new THREE.Color(t.flame).getHex());
  const holder = new THREE.Group();
  holder.position.set(x - room.cx, 0, z - room.cz);
  holder.rotation.y = Math.atan2(normal[0], normal[1]);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    holder.add(m);
    return m;
  };
  let flame: THREE.Mesh,
    glowAt: [number, number],
    glowSize = 1.1;
  if (t.style === 'lantern') {
    add(new THREE.BoxGeometry(0.04, 0.04, 0.22), M.iron, 0, 1.3, 0.1); // arm from the wall
    add(new THREE.ConeGeometry(0.13, 0.1, 4), M.iron, 0, 1.24, 0.2).rotation.y = Math.PI / 4; // cap
    add(new THREE.BoxGeometry(0.18, 0.03, 0.18), M.iron, 0, 0.97, 0.2); // base
    for (const [dx, dz] of [
      [-0.08, -0.08],
      [0.08, -0.08],
      [-0.08, 0.08],
      [0.08, 0.08],
    ])
      add(new THREE.BoxGeometry(0.02, 0.26, 0.02), M.iron, dx, 1.1, 0.2 + dz);
    flame = add(new THREE.SphereGeometry(0.05, 8, 6), flameMat, 0, 1.08, 0.2);
    flame.scale.y = 1.6;
    glowAt = [1.1, 0.22];
  } else if (t.style === 'brazier') {
    add(new THREE.BoxGeometry(0.12, 0.34, 0.16), M.iron, 0, 0.66, 0.06); // bracket
    add(new THREE.CylinderGeometry(0.21, 0.1, 0.14, 8), M.iron, 0, 0.88, 0.22); // bowl
    flame = add(new THREE.ConeGeometry(0.14, 0.42, 7), flameMat, 0, 1.14, 0.22);
    glowAt = [1.12, 0.25];
    glowSize = 1.5;
  } else {
    add(new THREE.BoxGeometry(0.12, 0.3, 0.16), M.iron, 0, 0.85, 0.06);
    flame = add(new THREE.ConeGeometry(0.08, 0.26, 6), flameMat, 0, 1.1, 0.12);
    glowAt = [1.12, 0.15];
  }
  const gl = glow(new THREE.Color(t.light).getHex(), glowSize, 0.8);
  gl.position.set(0, glowAt[0], glowAt[1]);
  holder.add(gl);
  room.group.add(holder);
  // dark rooms: the torch hangs cold, its flame out
  flame.visible = gl.visible = lit;
  room.torches.push({ flame, glow: gl, ...at, lit });
}

/** M7 step 9: a doorway filled with the room's own wall (a way at the Vigil still barred), shut until `unplugDoor`. */
function plugDoor(room: Room, d: Door) {
  const [dx, dz] = SIDE_DIR[d.side],
    ns = isNS(d.side),
    h = d.side === 's' ? H_LOW : H_TALL;
  const plug = new THREE.Mesh(
    ns ? boxUV(DH * 2, h, WT) : boxUV(WT, h, DH * 2),
    wallMaterials(room.look.wall, kitWalls(room.look)),
  );
  plug.position.set(d.x + (dx * WT) / 2 - room.cx, h / 2, d.z + (dz * WT) / 2 - room.cz);
  room.group.add(plug);
  d.plug = plug;
  d.open = false;
  d.bars.visible = false;
}
/** M7 step 9: a barred way opens: the wall filling its doorway goes, on both sides. */
export function unplugDoor(d: Door) {
  for (const door of [d, d.link]) {
    if (!door?.plug) continue;
    door.plug.removeFromParent();
    (door.plug as THREE.Mesh).geometry.dispose();
    delete door.plug;
    door.open = true;
  }
}

/** How a door built facing +z (the room kit's) is turned to face into the room from each wall. */
const DOOR_TURN: Record<Side, number> = { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 };

/** A doorway on `side` whose middle (on the room's inside edge) is at world (x, z): posts, lintel, threshold,
    the mark above it for special rooms, and the bars that rise while enemies live. */
function buildDoor(room: Room, side: Side, nb: Room, style: DoorStyle, x: number, z: number): Door {
  if (style === 'secret') return buildCrackedWall(room, side, nb, x, z); // a hidden doorway: the wall carries on
  const ns = isNS(side),
    [dx, dz] = SIDE_DIR[side];
  const wx = x + (dx * WT) / 2,
    wz = z + (dz * WT) / 2; // the door's centre on the wall's centre line
  // (along, across) around the wall centre line to room-local (x, z); across runs along +z (n/s) or +x (e/w)
  const at = (along: number, across: number) => ({
    x: (ns ? wx + along : wx + across) - room.cx,
    z: (ns ? wz + across : wz + along) - room.cz,
  });
  const box = (a0: number, a1: number, h: number, mats: THREE.Material, acrossLen: number, y0 = 0) => {
    const p = at((a0 + a1) / 2, 0),
      len = a1 - a0;
    const m = new THREE.Mesh(ns ? boxUV(len, h, acrossLen) : boxUV(acrossLen, h, len), mats);
    m.position.set(p.x, y0 + h / 2, p.z);
    room.group.add(m);
  };
  const h = wallHeight(side),
    fm = M.frame[style],
    barH = side === 's' ? H_LOW + 0.1 : h - 0.25;
  if (kitPieces(room)) {
    // the room kit's door and gate (wallLooks.ts), turned to face into the room
    const { frame, bars } = doorLook(style, room.look, h, side === 's', side === 'n', barH, DOOR_TURN[side]),
      p = at(0, 0);
    for (const g of [frame, bars]) {
      g.position.set(p.x, 0, p.z);
      g.rotation.y = DOOR_TURN[side];
      room.group.add(g);
    }
    bars.position.y = -barH - 0.05;
    return {
      side,
      nb,
      x,
      z,
      bars,
      barH,
      open: true,
      style,
      box: { x: wx, z: wz, hx: ns ? DH : WT / 2, hz: ns ? WT / 2 : DH },
    };
  }
  const pH = h + (side === 's' ? 0.05 : 0.12);
  // the posts reach a hair into the doorway, so their faces sit in front of the walls' cut ends rather than in the
  // same plane (two faces in one plane flicker as the camera moves)
  box(-DH - 0.2, -DH + 0.01, pH, fm, WT + 0.12);
  box(DH - 0.01, DH + 0.2, pH, fm, WT + 0.12);
  if (side === 'n') box(-DH, DH, 0.28, fm, WT + 0.04, h - 0.28);
  const th = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), M.threshold);
  th.rotation.x = -Math.PI / 2;
  const tp = at(0, 0);
  th.position.set(tp.x, 0.003, tp.z);
  if (ns) th.scale.set(DH * 2, WT, 1);
  else th.scale.set(WT, DH * 2, 1);
  room.group.add(th);
  // above the door, on this room's side: the boss's glowing eye, the ordeal's skull, the altar's crossed bones,
  // the merchant's lantern, the shrine's halo, the library's open book (a locked vault's ward and padlock are added
  // by vault.ts)
  const ep = at(0, side === 'n' || side === 'w' ? 0.55 : -0.55);
  if (style === 'boss') {
    const eye = glow(0xff3a1a, 0.7, 0.9);
    eye.position.set(ep.x, h + 0.05, ep.z);
    room.group.add(eye);
  } else if (style === 'ordeal') {
    const skull = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), M.bone);
    head.scale.set(1, 0.9, 0.9);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.12), M.bone);
    jaw.position.set(0, -0.13, 0.02);
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.02), M.wallTop);
    eyes.position.set(0, -0.01, 0.13);
    skull.add(head, jaw, eyes);
    skull.position.set(ep.x, h + 0.12, ep.z);
    skull.rotation.y = side === 'n' ? 0 : side === 's' ? Math.PI : side === 'e' ? -Math.PI / 2 : Math.PI / 2;
    room.group.add(skull);
  } else if (style === 'altar') {
    for (const a of [0.7, -0.7]) {
      const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 6), M.bone);
      bone.position.set(ep.x, h + 0.1, ep.z);
      bone.rotation.set(0, ns ? 0 : Math.PI / 2, a);
      room.group.add(bone);
    }
  } else if (style === 'merchant') {
    const lamp = new THREE.Group();
    lamp.position.set(ep.x, h + 0.02, ep.z);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.1, 4), M.iron);
    cap.position.y = 0.16;
    cap.rotation.y = Math.PI / 4;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.16), M.iron);
    base.position.y = -0.1;
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), basicMat(0xffc36a));
    flame.scale.y = 1.5;
    lamp.add(cap, base, flame, glow(0xffb050, 1.1, 0.85));
    room.group.add(lamp);
  } else if (style === 'shrine') {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 5, 24), basicMat(0xf4e2b0));
    halo.position.set(ep.x, h + 0.14, ep.z);
    halo.rotation.y = ns ? 0 : Math.PI / 2;
    const light = glow(0xffe8b0, 0.9, 0.8);
    light.position.copy(halo.position);
    room.group.add(halo, light);
  } else if (style === 'waystone') {
    // (M6 step 10) a small grey menhir, its rune lit gold
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.08), M.frame.waystone);
    stone.position.set(ep.x, h + 0.16, ep.z);
    stone.rotation.y = ns ? 0 : Math.PI / 2;
    const light = glow(0xffbe3a, 0.8, 0.7);
    light.position.copy(stone.position);
    room.group.add(stone, light);
  } else if (style === 'laboratory') {
    // (M5) a flask of green jelly
    const flask = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), basicMat(0x7ae070));
    flask.position.set(ep.x, h + 0.12, ep.z);
    const light = glow(0x7ae070, 0.9, 0.8);
    light.position.copy(flask.position);
    room.group.add(flask, light);
  } else if (style === 'library') {
    const book = new THREE.Group();
    book.position.set(ep.x, h + 0.1, ep.z);
    book.rotation.y = ns ? 0 : Math.PI / 2;
    for (const s of [-1, 1]) {
      // two leaves of an open book, and its spine
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.26), basicMat(0xe8d8b0));
      leaf.position.x = s * 0.1;
      leaf.rotation.z = s * 0.35;
      book.add(leaf);
    }
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.28), M.frame.library);
    spine.position.y = -0.04;
    book.add(spine);
    const light = glow(0xffe0a0, 0.8, 0.7);
    light.position.y = 0.05;
    book.add(light);
    room.group.add(book);
  }
  // bars (sink into the floor when open)
  const bars = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const along = -DH + 0.16 + i * ((DH * 2 - 0.32) / 4);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, barH, 0.1), M.gate);
    const p = at(along, 0);
    b.position.set(p.x, barH / 2, p.z);
    bars.add(b);
  }
  for (const yy of [0.3, 0.75]) {
    if (yy > barH) continue;
    const cb = new THREE.Mesh(
      ns ? new THREE.BoxGeometry(DH * 2, 0.08, 0.12) : new THREE.BoxGeometry(0.12, 0.08, DH * 2),
      M.gate,
    );
    const p = at(0, 0);
    cb.position.set(p.x, (yy * barH) / (side === 's' ? 0.75 : 1.1), p.z);
    bars.add(cb);
  }
  bars.position.y = -barH - 0.05;
  room.group.add(bars);
  return {
    side,
    nb,
    x,
    z,
    bars,
    barH,
    open: true,
    style,
    box: { x: wx, z: wz, hx: ns ? DH : WT / 2, hz: ns ? WT / 2 : DH },
  };
}

/** Pair every door with the one on the other side of its edge, in the neighbouring room. */
export function linkDoors(rooms: Room[]) {
  for (const r of rooms)
    for (const d of r.doors) {
      const [dx, dz] = SIDE_DIR[d.side];
      d.link = d.nb.doors.find(
        (o) =>
          o.side === OPPOSITE[d.side] &&
          Math.abs(o.x - (d.x + dx * 2 * WT)) < 0.01 &&
          Math.abs(o.z - (d.z + dz * 2 * WT)) < 0.01,
      );
      if (!d.link) throw new Error(`door ${d.side} of room ${r.plan.id} has no partner in room ${d.nb.plan.id}`);
    }
}

export function setDoors(room: Room, open: boolean, sound = true) {
  let changed = false;
  for (const d of doorsOf(room)) {
    if (d.seal?.sealed || (d.secret && !d.secret.open) || d.plug) continue; // sealed vault doors, cracked walls and the Vigil's barred ways stay shut
    if (d.open !== open) changed = true;
    d.open = open;
  }
  if (changed && sound) Sfx.door(open);
}

export function updateRoomFx(dt: number, now: number) {
  tickFire(now);
  for (const r of G.rooms) {
    for (const d of doorsOf(r)) {
      if (d.plug) continue; // (a barred way at the Vigil: its wall fills it, no gate)
      const target = d.open ? -d.barH - 0.05 : 0;
      d.bars.position.y += (target - d.bars.position.y) * (1 - Math.exp(-12 * dt));
      d.bars.visible = !d.open || d.bars.position.y > -d.barH; // (sunk out of sight: hidden, or it shows past a south door, where nothing is drawn)
    }
    if (r === G.current)
      for (const t of r.torches) {
        if (!t.lit) continue;
        const f = 0.85 + Math.sin(now * 17 + t.x) * 0.08 + Math.sin(now * 29 + t.x * 2) * 0.06;
        if (!t.flame.userData.fire) t.flame.scale.set(1, f, 1); // (the kit's fire flickers by itself)
        t.glow.material.opacity = 0.6 + f * 0.25;
      }
  }
}
