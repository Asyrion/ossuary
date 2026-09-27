/* Building rooms from the floor plan: floor, rocks and pits from the template, walls traced along the
   room's outline (any shape), doors on shared cell edges, torches, pedestals and altars. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Box, Door, DoorStyle, FloorLook, RockBox, Room, Side } from '../types';
import { G } from '../state';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { floorTexture, pitTexture } from '../render/textures';
import { M, basicMat, blob, boxUV, glow, markShared, wallMaterials } from '../render/materials';
import { offerGuaranteed, offerOptional, placeArtifact } from '../items/artifacts';
import { burst } from '../combat/fx';
import { mulberry } from '../util';
import { DH, H_LOW, H_TALL, HD, HW, PX, PZ, WT } from './dims';
import { FLOORS, type PlannedRoom } from './generate';
import { OPPOSITE, SHAPES, SIDE_DIR, cellHalfExtents, shapeMask, shapeSize } from './shapes';
import { TEMPLATES, parseTemplate, tombRuns } from './templates';

export const roomAt = (gx: number, gy: number) => G.roomMap.get(gx + ',' + gy);
/** World position of the centre of template tile (c, r). */
export const toWorld = (room: Room, c: number, r: number) =>
  ({ x: room.bounds.minX + c + .5, z: room.bounds.minZ + r + .5 });
export const doorsOf = (room: Room) => room.doors;
const isNS = (side: Side) => side === 'n' || side === 's';

export function buildRoom(plan: PlannedRoom, floorIndex: number) {
  const def = TEMPLATES.get(plan.templateId);
  if (!def) throw new Error(`no template "${plan.templateId}"`);
  const template = parseTemplate(def, plan.mirrorX, plan.mirrorY);
  const { w, h } = shapeSize(plan.shape), inset = SHAPES[plan.shape].inset;
  const minX = plan.anchor.gx * PX - HW + (inset?.c0 ?? 0), minZ = plan.anchor.gy * PZ - HD + (inset?.r0 ?? 0);
  const cx = minX + w / 2, cz = minZ + h / 2;
  const look = FLOORS[Math.min(floorIndex, FLOORS.length - 1)].look;
  const room: Room = {
    plan, template, look, type: plan.type, gx: plan.anchor.gx, gy: plan.anchor.gy, cx, cz,
    bounds: { minX, maxX: minX + w, minZ, maxZ: minZ + h }, w, h, mask: shapeMask(plan.shape, plan.mirrorX, plan.mirrorY),
    group: new THREE.Group(), doors: [], walls: [], rocks: [], pits: [], torches: [], waves: [], wave: 0, wavePending: false, spots: [],
    cleared: true, visited: false, known: false, locked: false,
  };
  room.group.position.set(cx, 0, cz); scene.add(room.group);
  // the controls are chalked on the floor of the very first room only
  const kind = plan.type === 'start' && floorIndex > 0 ? 'normal' : plan.type;
  const floor = new THREE.Mesh(maskGeometry(room.mask, w, h), new THREE.MeshStandardMaterial({ map: floorTexture(plan.seed, kind, look, room.mask), roughness: .95 }));
  room.group.add(floor);
  template.tiles.forEach((row, r) => row.forEach((tile, c) => {
    if (tile === 'rock') addRock(room, c, r);
    else if (tile === 'pit') addPit(room, c, r);
    else if (tile === 'pillar') addPillar(room, c, r);
  }));
  for (const run of tombRuns(template)) addTomb(room, run);
  mergePits(room);
  room.waves = template.waves.map(wv => wv.map(f => ({ kind: f.kind, ...toWorld(room, f.c, f.r) })));
  if (plan.variant === 'quiet') quieten(room);
  room.cleared = room.waves.length === 0;
  if (plan.type === 'treasure') addPedestal(room);
  if (plan.type === 'altar') addAltar(room);
  G.rooms.push(room);
  for (const c of plan.cells) G.roomMap.set(c.gx + ',' + c.gy, room);
  return room;
}

/** The floor: one quad per run of inside tiles, UV-mapped onto the room's floor texture. */
function maskGeometry(mask: boolean[][], w: number, h: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  mask.forEach((row, r) => {
    for (let c = 0; c < w;) {
      if (!row[c]) { c++; continue; }
      const c0 = c; while (c < w && row[c]) c++;
      const x0 = c0 - w / 2, x1 = c - w / 2, z0 = r - h / 2, z1 = r + 1 - h / 2, i = pos.length / 3;
      pos.push(x0, 0, z0, x0, 0, z1, x1, 0, z1, x1, 0, z0);
      uv.push(c0 / w, 1 - r / h, c0 / w, 1 - (r + 1) / h, c / w, 1 - (r + 1) / h, c / w, 1 - r / h);
      idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Quiet rooms keep none, one or two of the template's weak enemies (never hounds), and often a heart. */
function quieten(room: Room) {
  const R = mulberry(room.plan.seed ^ 0x51ee7);
  const weak = (room.waves[0] ?? []).filter(f => f.kind === 'rotling' || f.kind === 'wisp');
  for (let i = weak.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [weak[i], weak[j]] = [weak[j], weak[i]]; }
  const keep = Math.min(weak.length, Math.floor(R() * (CFG.quiet.maxEnemies + 1)));
  room.waves = keep ? [weak.slice(0, keep)] : [];
  room.quietHeart = R() < CFG.quiet.heartChance;
}

function addRock(room: Room, c: number, r: number) {
  const p = toWorld(room, c, r); const R = mulberry(c * 31 + r * 7 + room.plan.seed);
  const g = new THREE.Group(); g.position.set(p.x - room.cx, 0, p.z - room.cz);
  const big = new THREE.Mesh(new THREE.DodecahedronGeometry(.46, 0), M.rock); big.scale.set(1, .78 + R() * .2, 1); big.position.y = .3; big.rotation.set(R() * 3, R() * 3, R() * 3);
  const small = new THREE.Mesh(new THREE.DodecahedronGeometry(.2, 0), M.rock); small.position.set(R() * .5 - .25, .12, .3); small.rotation.set(R() * 3, R() * 3, 0);
  g.add(big, small, blob(1.3)); room.group.add(g);
  room.rocks.push({ x: p.x, z: p.z, hx: .42, hz: .42, hp: CFG.artifacts.rockHp, breakable: true, mesh: g, tile: { c, r } });
}

/** A stone pillar: plinth, shaft and capital, or broken off partway (chosen by the room's seed). Blocks like
    a rock but never breaks. */
function addPillar(room: Room, c: number, r: number) {
  const p = toWorld(room, c, r), R = mulberry(c * 131 + r * 17 + room.plan.seed);
  const g = new THREE.Group(); g.position.set(p.x - room.cx, 0, p.z - room.cz);
  const part = (geo: THREE.BufferGeometry, y: number, rot = 0) => { const m = new THREE.Mesh(geo, M.stone); m.position.y = y; m.rotation.y = rot; g.add(m); return m; };
  part(new THREE.BoxGeometry(.86, .22, .86), .11);
  const broken = R() < .35, shaft = broken ? .55 + R() * .45 : 1.3;
  part(new THREE.CylinderGeometry(.27, .3, shaft, 8), .22 + shaft / 2, R());
  if (broken) { // a jagged top and a fallen chunk beside it
    part(new THREE.CylinderGeometry(.2, .27, .14, 8), .22 + shaft + .07, R()).rotation.z = .25;
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(.16, 0), M.stone);
    const a = R() * Math.PI * 2; chunk.position.set(Math.cos(a) * .42, .1, Math.sin(a) * .42); g.add(chunk);
  } else part(new THREE.BoxGeometry(.72, .18, .72), .22 + shaft + .09);
  g.add(blob(1.25)); room.group.add(g);
  room.rocks.push({ x: p.x, z: p.z, hx: .4, hz: .4, hp: 0, breakable: false });
}

/** A stone tomb `len` tiles long, across (along x) or up and down: a plinth, a lid with a raised ridge and a
    carved cross. Blocks like a rock but never breaks. */
function addTomb(room: Room, run: { c: number; r: number; len: number; across: boolean }) {
  const a = toWorld(room, run.c, run.r), b = toWorld(room, run.c + (run.across ? run.len - 1 : 0), run.r + (run.across ? 0 : run.len - 1));
  const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2, long = run.len - .16, wide = .78;
  const g = new THREE.Group(); g.position.set(x - room.cx, 0, z - room.cz); if (!run.across) g.rotation.y = Math.PI / 2;
  const part = (w: number, h: number, d: number, y: number, mat: THREE.Material = M.tomb) => { const m = new THREE.Mesh(boxUV(w, h, d), mat); m.position.y = y; g.add(m); return m; };
  part(long, .42, wide, .21);
  part(long + .08, .1, wide + .08, .47);
  part(long - .2, .07, .2, .555, M.stone);                                  // ridge along the lid
  const cx = -long / 2 + Math.min(.45, long * .3);                            // a cross at the head end
  part(.07, .04, .38, .6, M.bone).position.x = cx;
  part(.24, .04, .07, .6, M.bone).position.set(cx, .6, -.06);
  const shadow = blob(1); shadow.scale.set(long + .6, 1, wide + .6); g.add(shadow); room.group.add(g);
  room.rocks.push({ x, z, hx: (run.across ? long : wide) / 2 + .02, hz: (run.across ? wide : long) / 2 + .02, hp: 0, breakable: false });
}

/** A bolt from a mage holding Mason's Chisel struck a rock: it cracks, and breaks on the last hit. */
export function hitRock(room: Room, rock: RockBox) {
  if (!rock.breakable || !rock.mesh) return;
  rock.hp--;
  burst(rock.x, .4, rock.z, 0x8a8078, 4, 1.4, .05);
  if (rock.hp > 0) { rock.mesh.scale.multiplyScalar(.88); rock.mesh.position.y = -.04 * (CFG.artifacts.rockHp - rock.hp); Sfx.crack(); return; }
  room.group.remove(rock.mesh);
  room.rocks = room.rocks.filter(r => r !== rock);
  if (rock.tile) room.template.tiles[rock.tile.r][rock.tile.c] = 'floor';
  burst(rock.x, .5, rock.z, 0x6b625a, 16, 2.6, .09); Sfx.rubble(); G.shake = Math.max(G.shake, .1);
}

// Pits: a dark hole drawn over the floor. Walkers and the mage can't cross them; bolts and wisps can.
const PIT_GEO = new THREE.PlaneGeometry(1, 1); PIT_GEO.rotateX(-Math.PI / 2); PIT_GEO.userData.shared = true;
let pitMat: THREE.MeshBasicMaterial | null = null;
function addPit(room: Room, c: number, r: number) {
  pitMat ??= markShared(new THREE.MeshBasicMaterial({ map: pitTexture(), transparent: true, depthWrite: false }));
  const p = toWorld(room, c, r);
  const m = new THREE.Mesh(PIT_GEO, pitMat); m.position.set(p.x - room.cx, .006, p.z - room.cz); room.group.add(m);
  room.pits.push({ x: p.x, z: p.z, hx: .5, hz: .5 });
}
/** Join pit tiles in the same row into one collision box, so the mage slides along them smoothly. */
function mergePits(room: Room) {
  const rows = new Map<number, Box[]>();
  for (const b of room.pits) { const list = rows.get(b.z) ?? []; list.push(b); rows.set(b.z, list); }
  const merged: Box[] = [];
  for (const list of rows.values()) {
    list.sort((a, b) => a.x - b.x);
    let cur = { ...list[0] };
    for (const b of list.slice(1)) {
      if (Math.abs(b.x - b.hx - (cur.x + cur.hx)) < 1e-6) {
        const x0 = cur.x - cur.hx, x1 = b.x + b.hx; cur = { x: (x0 + x1) / 2, z: cur.z, hx: (x1 - x0) / 2, hz: .5 };
      } else { merged.push(cur); cur = { ...b }; }
    }
    merged.push(cur);
  }
  room.pits = merged;
}

function addPedestal(room: Room) {
  const def = offerGuaranteed('treasure');
  if (def) placeArtifact(room, def, room.cx, room.cz); // else nothing is left to find: enterRoom offers a heart
}

/** A bone altar: an artifact from the altar pool for one heart container. Optional, so only while the
    floor's budget allows; an altar with nothing to offer stays bare. */
function addAltar(room: Room) {
  const def = offerOptional('altar');
  if (def) placeArtifact(room, def, room.cx, room.cz, { altar: true });
}

/** Is the tile under (x, z) open floor, clear of rocks and pedestals? */
export function isFreeAt(room: Room, x: number, z: number) {
  const c = Math.floor(x - room.bounds.minX), r = Math.floor(z - room.bounds.minZ);
  return room.template.tiles[r]?.[c] === 'floor' && !room.rocks.some(b => Math.abs(x - b.x) < b.hx + .3 && Math.abs(z - b.z) < b.hz + .3);
}
/** The nearest open floor spot to (x, z), searching outwards tile by tile. */
export function freeSpotNear(room: Room, x: number, z: number) {
  const b = room.bounds;
  for (let ring = 0; ring < 12; ring++) for (let dz = -ring; dz <= ring; dz++) for (let dx = -ring; dx <= ring; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
    const px = x + dx, pz = z + dz;
    if (px > b.minX + .5 && px < b.maxX - .5 && pz > b.minZ + .5 && pz < b.maxZ - .5 && isFreeAt(room, px, pz)) return { x: px, z: pz };
  }
  return { x, z };
}
/** A random point over the room's inside (floor or pit), for things that fly. */
export function randomSpot(room: Room) {
  for (let i = 0; i < 40; i++) {
    const c = Math.floor(Math.random() * room.w), r = Math.floor(Math.random() * room.h);
    if (room.mask[r][c] && c > 0 && r > 0 && c < room.w - 1 && r < room.h - 1) return toWorld(room, c, r);
  }
  return { x: room.cx, z: room.cz };
}
/** Where the mage stands after walking in through a door. */
export function entryPoint(door: Door) {
  const [dx, dz] = SIDE_DIR[door.side];
  return { x: door.x - dx * .6, z: door.z - dz * .6 };
}

/* ---------- walls, doors and torches ---------- */

/** A stretch of wall along one side of the outline, in tiles: `line` is the tile row (n/s) or column (e/w)
    of the wall band, [a0, a1) the tiles it spans (over outer corners), [i0, i1) the part along the inside. */
interface WallRun { facing: Side; line: number; a0: number; a1: number; i0: number; i1: number }

/** Trace the outline of the room's mask into wall runs. Runs on the north and south are stretched over
    outer corners so the corners are closed; inner corners are covered by the side walls. */
function outline(mask: boolean[][], w: number, h: number): WallRun[] {
  const inside = (c: number, r: number) => r >= 0 && r < h && c >= 0 && c < w && mask[r][c];
  const runs: WallRun[] = [];
  const scan = (facing: Side, lines: number, span: number, edge: (line: number, a: number) => boolean, band: (line: number) => number) => {
    for (let l = 0; l < lines; l++) for (let a = 0; a < span;) {
      if (!edge(l, a)) { a++; continue; }
      const a0 = a; while (a < span && edge(l, a)) a++;
      runs.push({ facing, line: band(l), a0, a1: a, i0: a0, i1: a });
    }
  };
  scan('n', h, w, (r, c) => inside(c, r) && !inside(c, r - 1), r => r - 1);
  scan('s', h, w, (r, c) => inside(c, r) && !inside(c, r + 1), r => r + 1);
  scan('w', w, h, (c, r) => inside(c, r) && !inside(c - 1, r), c => c - 1);
  scan('e', w, h, (c, r) => inside(c, r) && !inside(c + 1, r), c => c + 1);
  for (const run of runs) if (isNS(run.facing)) {
    if (!inside(run.a0 - 1, run.line)) run.a0--;
    if (!inside(run.a1, run.line)) run.a1++;
  }
  return runs;
}

const wallHeight = (facing: Side) => facing === 's' ? H_LOW : H_TALL;

/** A wall box from world x0..x1, z0..z1; returns its collider. */
function wallBox(room: Room, x0: number, x1: number, z0: number, z1: number, h: number, mats: THREE.Material | THREE.Material[], y0 = 0): Box {
  const m = new THREE.Mesh(boxUV(x1 - x0, h, z1 - z0), mats);
  m.position.set((x0 + x1) / 2 - room.cx, y0 + h / 2, (z0 + z1) / 2 - room.cz); room.group.add(m);
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: (x1 - x0) / 2, hz: (z1 - z0) / 2 };
}

/** Walls along the outline with gaps for the doors, the doors themselves, and torches. Needs every room of
    the floor built, since a door's look depends on the room behind it. */
export function buildWallsAndDoors(room: Room) {
  const { minX, minZ } = room.bounds, mats = wallMaterials(room.look.wall);
  const { hx, hz } = cellHalfExtents(room.plan.shape);
  // doors first: where they are decides where the walls have gaps
  for (const pd of room.plan.doors) {
    const nb = G.rooms.find(r => r.plan.id === pd.to)!;
    const [dx, dz] = SIDE_DIR[pd.side];
    const x = pd.gx * PX + dx * hx, z = pd.gy * PZ + dz * hz; // middle of the doorway on the room's inside edge
    const either = (t: string) => room.type === t || nb.type === t;
    const style: DoorStyle = either('boss') ? 'boss' : either('ordeal') ? 'ordeal' : either('altar') ? 'altar' : either('treasure') ? 'treasure' : 'normal';
    room.doors.push(buildDoor(room, pd.side, nb, style, x, z));
  }
  const runs = outline(room.mask, room.w, room.h);
  for (const run of runs) {
    const ns = isNS(run.facing);
    // the run in world units: along x for north/south walls, along z for east/west ones
    const along0 = (ns ? minX : minZ) + run.a0, along1 = (ns ? minX : minZ) + run.a1;
    const across0 = (ns ? minZ : minX) + run.line, across1 = across0 + WT;
    let pieces = [[along0, along1]];
    for (const d of room.doors) {
      if (d.side !== run.facing) continue;
      const at = ns ? d.x : d.z, line = ns ? d.z + SIDE_DIR[d.side][1] * WT / 2 : d.x + SIDE_DIR[d.side][0] * WT / 2;
      if (Math.abs(line - (across0 + across1) / 2) > .01 || at < along0 || at > along1) continue;
      pieces = pieces.flatMap(([a, b]) => [[a, Math.min(b, at - DH)], [Math.max(a, at + DH), b]]).filter(([a, b]) => b - a > .02);
    }
    for (const [a, b] of pieces) {
      room.walls.push(ns ? wallBox(room, a, b, across0, across1, wallHeight(run.facing), mats) : wallBox(room, across0, across1, a, b, wallHeight(run.facing), mats));
    }
    placeTorches(room, run, across0);
  }
}

/** Torches along a wall run: on every north wall, and on long east/west walls (tall rooms). */
function placeTorches(room: Room, run: WallRun, across0: number) {
  const ns = isNS(run.facing);
  if (run.facing === 's') return;
  const base = ns ? room.bounds.minX : room.bounds.minZ;
  const inner0 = base + run.i0, inner1 = base + run.i1, len = inner1 - inner0;
  if (!ns && len < 14) return;
  const count = ns ? Math.max(1, Math.round(len / 6.5)) : Math.floor(len / 8);
  const spots = count === 1 ? [len / 2] : ns ? Array.from({ length: count }, (_, i) => 3 + i * (len - 6) / (count - 1)) : Array.from({ length: count }, (_, i) => (i + .5) * len / count);
  const doorsHere = room.doors.filter(d => d.side === run.facing).map(d => ns ? d.x : d.z);
  const face = run.facing === 'n' ? across0 + WT : run.facing === 'w' ? across0 + WT : across0; // the wall's inner face
  for (let s of spots) {
    let at = inner0 + s;
    const blocked = doorsHere.find(d => Math.abs(at - d) < DH + .5);
    if (blocked !== undefined) { // move clear of the door, or skip if there's no room
      const options = [blocked - DH - .6, blocked + DH + .6].filter(p => p > inner0 + .5 && p < inner1 - .5);
      if (!options.length) continue;
      at = options[0];
    }
    const normal: [number, number] = run.facing === 'n' ? [0, 1] : run.facing === 'w' ? [1, 0] : [-1, 0];
    addTorch(room, ns ? at : face, ns ? face : at, normal, room.look.torch);
  }
}

/** A light on a wall, in the floor's style: iron bracket (crypt), cage lantern (drowned) or brazier (burning).
    Built facing south and turned to face the room along `normal`. */
function addTorch(room: Room, x: number, z: number, normal: [number, number], t: FloorLook['torch']) {
  const flameMat = basicMat(new THREE.Color(t.flame).getHex());
  const holder = new THREE.Group(); holder.position.set(x - room.cx, 0, z - room.cz);
  holder.rotation.y = Math.atan2(normal[0], normal[1]);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); holder.add(m); return m;
  };
  let flame: THREE.Mesh, glowAt: [number, number], glowSize = 1.1;
  if (t.style === 'lantern') {
    add(new THREE.BoxGeometry(.04, .04, .22), M.iron, 0, 1.3, .1);                          // arm from the wall
    add(new THREE.ConeGeometry(.13, .1, 4), M.iron, 0, 1.24, .2).rotation.y = Math.PI / 4;  // cap
    add(new THREE.BoxGeometry(.18, .03, .18), M.iron, 0, .97, .2);                          // base
    for (const [dx, dz] of [[-.08, -.08], [.08, -.08], [-.08, .08], [.08, .08]]) add(new THREE.BoxGeometry(.02, .26, .02), M.iron, dx, 1.1, .2 + dz);
    flame = add(new THREE.SphereGeometry(.05, 8, 6), flameMat, 0, 1.08, .2); flame.scale.y = 1.6;
    glowAt = [1.1, .22];
  } else if (t.style === 'brazier') {
    add(new THREE.BoxGeometry(.12, .34, .16), M.iron, 0, .66, .06);                         // bracket
    add(new THREE.CylinderGeometry(.21, .1, .14, 8), M.iron, 0, .88, .22);                  // bowl
    flame = add(new THREE.ConeGeometry(.14, .42, 7), flameMat, 0, 1.14, .22);
    glowAt = [1.12, .25]; glowSize = 1.5;
  } else {
    add(new THREE.BoxGeometry(.12, .3, .16), M.iron, 0, .85, .06);
    flame = add(new THREE.ConeGeometry(.08, .26, 6), flameMat, 0, 1.1, .12);
    glowAt = [1.12, .15];
  }
  const gl = glow(new THREE.Color(t.light).getHex(), glowSize, .8); gl.position.set(0, glowAt[0], glowAt[1]); holder.add(gl);
  room.group.add(holder);
  // dark rooms: the torch hangs cold, its flame out
  const lit = room.plan.variant !== 'dark';
  flame.visible = gl.visible = lit;
  room.torches.push({ flame, glow: gl, x: x + normal[0] * .6, z: z + normal[1] * .6, lit });
}

/** A doorway on `side` whose middle (on the room's inside edge) is at world (x, z): posts, lintel, threshold,
    the mark above it for special rooms, and the bars that rise while enemies live. */
function buildDoor(room: Room, side: Side, nb: Room, style: DoorStyle, x: number, z: number): Door {
  const ns = isNS(side), [dx, dz] = SIDE_DIR[side];
  const wx = x + dx * WT / 2, wz = z + dz * WT / 2; // the door's centre on the wall's centre line
  // (along, across) around the wall centre line to room-local (x, z); across runs along +z (n/s) or +x (e/w)
  const at = (along: number, across: number) => ({ x: (ns ? wx + along : wx + across) - room.cx, z: (ns ? wz + across : wz + along) - room.cz });
  const box = (a0: number, a1: number, h: number, mats: THREE.Material, acrossLen: number, y0 = 0) => {
    const p = at((a0 + a1) / 2, 0), len = a1 - a0;
    const m = new THREE.Mesh(ns ? boxUV(len, h, acrossLen) : boxUV(acrossLen, h, len), mats);
    m.position.set(p.x, y0 + h / 2, p.z); room.group.add(m);
  };
  const h = wallHeight(side), fm = M.frame[style];
  const pH = h + (side === 's' ? .05 : .12);
  box(-DH - .2, -DH, pH, fm, WT + .12); box(DH, DH + .2, pH, fm, WT + .12);
  if (side === 'n') box(-DH, DH, .28, fm, WT + .04, h - .28);
  const th = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), M.threshold);
  th.rotation.x = -Math.PI / 2; const tp = at(0, 0); th.position.set(tp.x, .003, tp.z);
  if (ns) th.scale.set(DH * 2, WT, 1); else th.scale.set(WT, DH * 2, 1);
  room.group.add(th);
  // above the door, on this room's side: the boss's glowing eye, the ordeal's skull, the altar's crossed bones
  const ep = at(0, side === 'n' || side === 'w' ? .55 : -.55);
  if (style === 'boss') {
    const eye = glow(0xff3a1a, .7, .9); eye.position.set(ep.x, h + .05, ep.z); room.group.add(eye);
  } else if (style === 'ordeal') {
    const skull = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(.15, 8, 6), M.bone); head.scale.set(1, .9, .9);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(.16, .08, .12), M.bone); jaw.position.set(0, -.13, .02);
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(.16, .04, .02), M.wallTop); eyes.position.set(0, -.01, .13);
    skull.add(head, jaw, eyes); skull.position.set(ep.x, h + .12, ep.z);
    skull.rotation.y = side === 'n' ? 0 : side === 's' ? Math.PI : side === 'e' ? -Math.PI / 2 : Math.PI / 2;
    room.group.add(skull);
  } else if (style === 'altar') {
    for (const a of [.7, -.7]) {
      const bone = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .55, 6), M.bone);
      bone.position.set(ep.x, h + .1, ep.z); bone.rotation.set(0, ns ? 0 : Math.PI / 2, a);
      room.group.add(bone);
    }
  }
  // bars (sink into the floor when open)
  const bars = new THREE.Group(); const barH = side === 's' ? H_LOW + .1 : h - .25;
  for (let i = 0; i < 5; i++) {
    const along = -DH + .16 + i * ((DH * 2 - .32) / 4);
    const b = new THREE.Mesh(new THREE.BoxGeometry(.1, barH, .1), M.gate); const p = at(along, 0);
    b.position.set(p.x, barH / 2, p.z); bars.add(b);
  }
  for (const yy of [.3, .75]) {
    if (yy > barH) continue;
    const cb = new THREE.Mesh(ns ? new THREE.BoxGeometry(DH * 2, .08, .12) : new THREE.BoxGeometry(.12, .08, DH * 2), M.gate);
    const p = at(0, 0); cb.position.set(p.x, yy * barH / (side === 's' ? .75 : 1.1), p.z); bars.add(cb);
  }
  bars.position.y = -barH - .05; room.group.add(bars);
  return {
    side, nb, x, z, bars, barH, open: true, style,
    box: { x: wx, z: wz, hx: ns ? DH : WT / 2, hz: ns ? WT / 2 : DH },
  };
}

/** Pair every door with the one on the other side of its edge, in the neighbouring room. */
export function linkDoors(rooms: Room[]) {
  for (const r of rooms) for (const d of r.doors) {
    const [dx, dz] = SIDE_DIR[d.side];
    d.link = d.nb.doors.find(o => o.side === OPPOSITE[d.side] && Math.abs(o.x - (d.x + dx * 2 * WT)) < .01 && Math.abs(o.z - (d.z + dz * 2 * WT)) < .01);
    if (!d.link) throw new Error(`door ${d.side} of room ${r.plan.id} has no partner in room ${d.nb.plan.id}`);
  }
}

export function setDoors(room: Room, open: boolean, sound = true) {
  let changed = false;
  for (const d of doorsOf(room)) { if (d.open !== open) changed = true; d.open = open; }
  if (changed && sound) Sfx.door(open);
}

export function updateRoomFx(dt: number, now: number) {
  for (const r of G.rooms) {
    for (const d of doorsOf(r)) { const target = d.open ? -d.barH - .05 : 0; d.bars.position.y += (target - d.bars.position.y) * (1 - Math.exp(-12 * dt)); }
    if (r === G.current) for (const t of r.torches) {
      if (!t.lit) continue;
      const f = .85 + Math.sin(now * 17 + t.x) * .08 + Math.sin(now * 29 + t.x * 2) * .06;
      t.flame.scale.set(1, f, 1); t.glow.material.opacity = .6 + f * .25;
    }
  }
}
