/* Building rooms from the floor plan: floor, rocks and pits from the template, walls traced along the
   room's outline (any shape), doors on shared cell edges, torches, pedestals and altars. */
import * as THREE from 'three';
import { furnishLab } from './laboratory';
import { CFG } from '../config';
import type { Box, Door, DoorStyle, FloorLook, RockBox, Room, RoomLook, Side } from '../types';
import { DEV, G } from '../state';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { floorOwnedTexture, floorTexture } from '../render/textures';
import { softenCanvas } from '../render/softEdge';
import { pixelFloorTexture } from '../render/pixelTextures';
import { M, blob, boxUV, cappedWallMaterials, disposeTree, glow, mergeStill, wallMaterials } from '../render/materials';
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

export const roomAt = (gx: number, gy: number) => G.floor.roomMap.get(gx + ',' + gy);
/** World position of the centre of template tile (c, r). */
export const toWorld = (room: Room, c: number, r: number) => ({
  x: room.bounds.minX + c + 0.5,
  z: room.bounds.minZ + r + 0.5,
});
export const doorsOf = (room: Room) => room.doors;
const isNS = (side: Side) => side === 'n' || side === 's';

/** Build a planned room of floor `floorIndex` in its floor's look, or in `own` (the Vigil's, no floor's). */
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
  const kit = plan.type === 'boss' && dressed.bossKit ? { ...dressed.kit, ...dressed.bossKit } : dressed.kit; // (a boss's floor calm)
  const look: RoomLook = { ...dressed, kinds: pickKinds(kit, plan.seed, DEV.kitKinds) }; // (the room kit's kinds, drawn on its seed)
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
  const tile = floorTile(look.name); // (a made floor tile, data/assets.json, paints the floor; else the room kit draws it)
  const art = tile
    ? { map: floorTexture(plan.seed, kind, look, room.mask, tile), glow: undefined }
    : pixelFloorTexture(plan.seed, kind, look, room.mask, wet);
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
  buildProps(room); // bone piles, casks, roots, briars, cobwebs, glowcaps, pews
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
    // (two foes made to work together, the second set beside the first)
    const wave = room.waves[0],
      [a, b] = filled.pair,
      p = freeSpotNear(room, wave[a].x + CFG.pairs.gap, wave[a].z);
    wave[b].x = p.x;
    wave[b].z = p.z;
    room.pair = [wave[a].kind, wave[b].kind];
  }
  if (filled.extraFrom !== undefined) {
    // (the pressure's one more stands beside the foe it was drawn from)
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
  if (plan.type === 'laboratory') furnishLab(room);
  G.floor.rooms.push(room);
  for (const c of plan.cells) G.floor.roomMap.set(c.gx + ',' + c.gy, room);
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

function addRock(room: Room, c: number, r: number) {
  const p = toWorld(room, c, r);
  const R = mulberry(c * 31 + r * 7 + room.plan.seed);
  const g = rockLook(R, room.look, room.theme?.rock === 'dripstone');
  mergeStill(g);
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
/** A whole pillar raised at (x, z) where there was none (the Pillar Dragon brings its own when the room has too
    few); returns its look, standing at the floor, for the caller to raise out of it. */
export function raisePillar(room: Room, x: number, z: number) {
  const g = pillarAt(room, x, z, mulberry(Math.round(x * 131 + z * 17) + room.plan.seed), false, 1.3);
  room.group.add(g);
  room.rocks.push({ x, z, hx: 0.4, hz: 0.4, hp: 0, breakable: false, pillar: PILLAR_TOP });
  return g;
}
function pillarAt(room: Room, x: number, z: number, R: () => number, broken: boolean, shaft: number) {
  const g = pillarLook(R, room.look, broken, shaft - 0.06);
  mergeStill(g);
  g.position.set(x - room.cx, 0, z - room.cz);
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
}

/* Urns: funerary urns in the floor's clay, and rune-sealed ones ringed by a ward (the room kit's, objectLooks.ts). A made
   urn (data/assets.json) takes their place where the asset list has one; sealed, it is the same model in darker,
   bluish stone with a ward band round its belly. */
export const WARD_COLOR = 0x8ab8ff;
const SEALED_TINT = 0x8090b0,
  BAND_R = 0.25; // (the ward band's radius, scaled to a made urn's width)
let bandGeo: THREE.TorusGeometry | null = null;
function wardBand() {
  if (bandGeo) return bandGeo;
  bandGeo = new THREE.TorusGeometry(BAND_R, 0.022, 5, 20);
  bandGeo.rotateX(Math.PI / 2);
  bandGeo.userData.shared = true;
  return bandGeo;
}
function addUrn(room: Room, c: number, r: number, sealed: boolean) {
  const p = toWorld(room, c, r),
    R = mulberry(c * 53 + r * 11 + room.plan.seed);
  const g = new THREE.Group();
  g.position.set(p.x - room.cx + (R() - 0.5) * 0.12, 0, p.z - room.cz + (R() - 0.5) * 0.12);
  g.rotation.y = R() * 6;
  g.scale.setScalar(0.9 + R() * 0.2);
  const model = modelFor('props', 'urn');
  if (model) {
    g.add(sealed ? sealedLook(model, SEALED_TINT) : model, blob(0.8));
    if (sealed) {
      // the ward round its belly: sized to the model's width, so the band shows outside it
      const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
      const k = ((Math.max(size.x, size.z) / 2) * 1.06) / BAND_R,
        y = size.y * 0.48;
      const band = new THREE.Mesh(wardBand(), M.ward);
      band.position.y = y;
      band.scale.set(k, 1, k);
      g.add(band);
      const gl = glow(WARD_COLOR, 0.9 * k, 0.45);
      gl.position.y = y + 0.03;
      g.add(gl);
    }
  } else {
    // the room kit's urn, its ward its own
    const k = urnLook(R, room.look, sealed, WARD_COLOR);
    mergeStill(k);
    g.add(k);
    g.rotation.y = 0; // (turned a little, its ward's runes to the camera)
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
  const room = G.room.current,
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
  const clay = new THREE.Color(room.look.urn.clay).getHex(); // (the urns are in the floor's clay)
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
  G.fx.shake = Math.max(G.fx.shake, 0.1);
}

// Pits: a dark hole drawn over the floor. Walkers and the mage can't cross them; bolts and wisps can. Pits side by side
// are drawn as one (a chasm, not a row of holes), their dark joined and soft at its rim (`drawPits`).
/** A pit on tile (c, r); not `solid`, only its dark (the chasm under a rope bridge: it falls when the bridge burns). */
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
/** A bridge burnt through: the chasm under tile (c, r) is a pit now (its dark was drawn with the bridge). */
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
    mats = wallMaterials(room.look, room.look.kinds.wall),
    capped = cappedWallMaterials(room.look, room.look.kinds.wall);
  const { hx, hz } = cellHalfExtents(room.plan.shape);
  // doors first: where they are decides where the walls have gaps
  for (const pd of room.plan.doors) {
    const nb = G.floor.rooms.find((r) => r.plan.id === pd.to)!;
    const [dx, dz] = SIDE_DIR[pd.side];
    const shift = pd.shift ?? 0; // how far the door has moved along its edge
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
    if (pd.barred) plugDoor(room, door); // (a way at the Vigil barred by a school, shut until it opens)
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
  const falls = fallRuns(room.template); // (waterfalls pour from these spans of wall; torches and dressing keep off them)
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
        ...sluices(room).map((b) => ({ x: b.x, room: 0.9 })), // (a sluice gate's frame stands against it)
        ...(room.keepClear ?? []).filter((k) => k.side === 'n').map((k) => ({ x: k.at, room: k.half + 0.3 })),
      ]; // (the Vigil's pieces and barred ways)
      dressNorthWall(room, face, minX + run.i0, minX + run.i1, avoid);
    }
}

/** The room's sluice gates: torches and the wall's dressing keep clear of them. */
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
    ...room.doors.filter((d) => d.side === run.facing).map((d) => ({ at: ns ? d.x : d.z, half: DH })), // doors, and waterfalls
    ...falls
      .filter((f) => f.side === run.facing)
      .map((f) => ({ at: base + (f.i0 + f.i1) / 2, half: (f.i1 - f.i0) / 2 })),
    ...(run.facing === 'n' ? sluices(room).map((b) => ({ at: b.x, half: 0.6 })) : []), // (and sluice gates)
    ...(run.facing === 'n' && room.lab ? [{ at: room.cx + room.lab.vat.position.x, half: 1.15 }] : []), // (and a laboratory's vat window)
    ...(room.keepClear ?? []).filter((k) => k.side === run.facing),
  ]; // (and what stands against the Vigil's walls)
  const face = run.facing === 'n' ? across0 + WT : run.facing === 'w' ? across0 + WT : across0; // the wall's inner face
  for (const s of spots) {
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

/** A light on a wall, the kind the room drew (fireLooks.ts), built facing south and turned to face the room along
    `normal`; its fire moves by itself. */
function addTorch(room: Room, x: number, z: number, normal: [number, number], t: FloorLook['torch']) {
  const lit = room.plan.variant !== 'dark',
    at = { x: x + normal[0] * 0.6, z: z + normal[1] * 0.6 };
  const { holder, lit: fire, glow: gl } = torchLook(t, room.look.kinds.torch);
  holder.userData.parts = { fire, gl };
  mergeStill(holder);
  holder.position.set(x - room.cx, 0, z - room.cz);
  holder.rotation.y = Math.atan2(normal[0], normal[1]);
  fire.visible = gl.visible = lit; // (dark rooms: the torch hangs cold, its flame out)
  room.group.add(holder);
  room.torches.push({ flame: fire, glow: gl, ...at, lit });
}

/** A doorway filled with the room's own wall (a way at the Vigil still barred), shut until `unplugDoor`. */
function plugDoor(room: Room, d: Door) {
  const [dx, dz] = SIDE_DIR[d.side],
    ns = isNS(d.side),
    h = d.side === 's' ? H_LOW : H_TALL;
  const plug = new THREE.Mesh(
    ns ? boxUV(DH * 2, h, WT) : boxUV(WT, h, DH * 2),
    wallMaterials(room.look, room.look.kinds.wall),
  );
  plug.position.set(d.x + (dx * WT) / 2 - room.cx, h / 2, d.z + (dz * WT) / 2 - room.cz);
  room.group.add(plug);
  d.plug = plug;
  d.open = false;
  d.bars.visible = false;
}
/** A barred way opens: the wall filling its doorway goes, on both sides. */
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

/** A doorway on `side` whose middle (on the room's inside edge) is at world (x, z): its frame, carrying the mark of a
    special room beyond it, and the gate that rises while enemies live. */
function buildDoor(room: Room, side: Side, nb: Room, style: DoorStyle, x: number, z: number): Door {
  if (style === 'secret') return buildCrackedWall(room, side, nb, x, z); // a hidden doorway: the wall carries on
  const ns = isNS(side),
    [dx, dz] = SIDE_DIR[side];
  const wx = x + (dx * WT) / 2,
    wz = z + (dz * WT) / 2; // the door's centre on the wall's centre line
  const h = wallHeight(side),
    barH = side === 's' ? H_LOW + 0.1 : h - 0.25;
  // the room kit's door and gate (wallLooks.ts), turned to face into the room
  const { frame, bars } = doorLook(style, room.look, h, side === 's', side === 'n', barH, DOOR_TURN[side]);
  for (const g of [frame, bars]) {
    g.position.set(wx - room.cx, 0, wz - room.cz);
    g.rotation.y = DOOR_TURN[side];
    room.group.add(g);
  }
  bars.position.y = -barH - 0.05; // (bars sink into the floor while the door is open)
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
  for (const r of G.floor.rooms) {
    for (const d of doorsOf(r)) {
      if (d.plug) continue; // (a barred way at the Vigil: its wall fills it, no gate)
      const target = d.open ? -d.barH - 0.05 : 0;
      d.bars.position.y += (target - d.bars.position.y) * (1 - Math.exp(-12 * dt));
      d.bars.visible = !d.open || d.bars.position.y > -d.barH; // (sunk out of sight: hidden, or it shows past a south door, where nothing is drawn)
    }
    if (r === G.room.current)
      for (const t of r.torches) {
        if (!t.lit) continue;
        const f = 0.85 + Math.sin(now * 17 + t.x) * 0.08 + Math.sin(now * 29 + t.x * 2) * 0.06;
        t.glow.material.opacity = 0.6 + f * 0.25;
      }
  }
}
