import * as THREE from 'three';
import { CFG } from '../config';
import type { Box, Door, DoorStyle, FloorLook, RockBox, Room, Side } from '../types';
import { G } from '../state';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { floorTexture, pitTexture } from '../render/textures';
import { M, basicMat, blob, boxUV, glow, markShared, wallMaterials } from '../render/materials';
import { offerGuaranteed, placeArtifact } from '../items/artifacts';
import { burst } from '../combat/fx';
import { mulberry } from '../util';
import { DH, DIR, H_LOW, H_TALL, HD, HW, PX, PZ, SIDES, WT } from './dims';
import { FLOORS, type PlannedRoom } from './generate';
import { TEMPLATES, parseTemplate } from './templates';

export const roomAt = (gx: number, gy: number) => G.roomMap.get(gx + ',' + gy);
/** World position of the centre of template tile (c, r). */
export const toWorld = (room: Room, c: number, r: number) =>
  ({ x: room.bounds.minX + c + .5, z: room.bounds.minZ + r + .5 });
export const doorsOf = (room: Room) => Object.values(room.doors) as Door[];

/** Maps (along, across) in a wall's frame to room-local (x, z). */
export function wallFrame(side: Side, along: number, across: number) {
  switch (side) {
    case 'n': return { x: along, z: -HD - WT / 2 + across };
    case 's': return { x: along, z: HD + WT / 2 + across };
    case 'e': return { x: HW + WT / 2 + across, z: along };
    case 'w': return { x: -HW - WT / 2 + across, z: along };
  }
}
function wallBox(room: Room, side: Side, a0: number, a1: number, h: number, mats: THREE.Material | THREE.Material[],
  acrossLen = WT, acrossOff = 0, y0 = 0): Box {
  const len = a1 - a0, mid = (a0 + a1) / 2; const p = wallFrame(side, mid, acrossOff);
  const ns = side === 'n' || side === 's';
  const geo = ns ? boxUV(len, h, acrossLen) : boxUV(acrossLen, h, len);
  const m = new THREE.Mesh(geo, mats); m.position.set(p.x, y0 + h / 2, p.z); room.group.add(m);
  return { x: room.cx + p.x, z: room.cz + p.z, hx: ns ? len / 2 : acrossLen / 2, hz: ns ? acrossLen / 2 : len / 2 };
}
const wallHeight = (side: Side) => side === 's' ? H_LOW : H_TALL;
const wallSpan = (side: Side) => (side === 'n' || side === 's') ? [-HW - WT, HW + WT] : [-HD - WT, HD];

export function buildRoom(plan: PlannedRoom, floorIndex: number) {
  const def = TEMPLATES.get(plan.templateId);
  if (!def) throw new Error(`no template "${plan.templateId}"`);
  const template = parseTemplate(def, plan.mirrorX, plan.mirrorY);
  const { gx, gy } = plan.cells[0];
  const cx = gx * PX, cz = gy * PZ;
  const look = FLOORS[Math.min(floorIndex, FLOORS.length - 1)].look;
  const room: Room = {
    plan, template, look, type: plan.type, gx, gy, cx, cz,
    bounds: { minX: cx - HW, maxX: cx + HW, minZ: cz - HD, maxZ: cz + HD },
    group: new THREE.Group(), doors: {}, walls: [], rocks: [], pits: [], torches: [], foes: [], spots: [],
    cleared: true, visited: false, known: false, locked: false,
  };
  room.group.position.set(cx, 0, cz); scene.add(room.group);
  // the controls are chalked on the floor of the very first room only
  const kind = plan.type === 'start' && floorIndex > 0 ? 'normal' : plan.type;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(13, 7), new THREE.MeshStandardMaterial({ map: floorTexture(plan.seed, kind, look), roughness: .95 }));
  floor.rotation.x = -Math.PI / 2; room.group.add(floor);
  template.tiles.forEach((row, r) => row.forEach((tile, c) => {
    if (tile === 'rock') addRock(room, c, r);
    else if (tile === 'pit') addPit(room, c, r);
  }));
  mergePits(room);
  for (const f of template.foes) room.foes.push({ kind: f.kind, ...toWorld(room, f.c, f.r) });
  room.cleared = room.foes.length === 0;
  for (const tx of [-3.5, 3.5]) addTorch(room, tx, look.torch);
  if (plan.type === 'treasure') addPedestal(room);
  G.rooms.push(room);
  for (const c of plan.cells) G.roomMap.set(c.gx + ',' + c.gy, room);
  return room;
}

/** A light on the north wall, in the floor's style: iron bracket (crypt), cage lantern (drowned) or brazier (burning). */
function addTorch(room: Room, tx: number, t: FloorLook['torch']) {
  const flameMat = basicMat(new THREE.Color(t.flame).getHex());
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); room.group.add(m); return m;
  };
  const w = -HD; // the inner face of the north wall
  let flame: THREE.Mesh, glowAt: [number, number], glowSize = 1.1;
  if (t.style === 'lantern') {
    const z = w + .2;
    add(new THREE.BoxGeometry(.04, .04, .22), M.iron, tx, 1.3, w + .1);                  // arm from the wall
    add(new THREE.ConeGeometry(.13, .1, 4), M.iron, tx, 1.24, z).rotation.y = Math.PI / 4; // cap
    add(new THREE.BoxGeometry(.18, .03, .18), M.iron, tx, .97, z);                        // base
    for (const [dx, dz] of [[-.08, -.08], [.08, -.08], [-.08, .08], [.08, .08]]) add(new THREE.BoxGeometry(.02, .26, .02), M.iron, tx + dx, 1.1, z + dz);
    flame = add(new THREE.SphereGeometry(.05, 8, 6), flameMat, tx, 1.08, z); flame.scale.y = 1.6;
    glowAt = [1.1, z + .02];
  } else if (t.style === 'brazier') {
    const z = w + .22;
    add(new THREE.BoxGeometry(.12, .34, .16), M.iron, tx, .66, w + .06);                  // bracket
    add(new THREE.CylinderGeometry(.21, .1, .14, 8), M.iron, tx, .88, z);                 // bowl
    flame = add(new THREE.ConeGeometry(.14, .42, 7), flameMat, tx, 1.14, z);
    glowAt = [1.12, z + .03]; glowSize = 1.5;
  } else {
    add(new THREE.BoxGeometry(.12, .3, .16), M.iron, tx, .85, w + .06);
    flame = add(new THREE.ConeGeometry(.08, .26, 6), flameMat, tx, 1.1, w + .12);
    glowAt = [1.12, w + .15];
  }
  const gl = glow(new THREE.Color(t.light).getHex(), glowSize, .8); gl.position.set(tx, glowAt[0], glowAt[1]); room.group.add(gl);
  room.torches.push({ flame, glow: gl, x: room.cx + tx, z: room.cz - HD + .6 });
}

function addRock(room: Room, c: number, r: number) {
  const p = toWorld(room, c, r); const R = mulberry(c * 31 + r * 7 + room.plan.seed);
  const g = new THREE.Group(); g.position.set(p.x - room.cx, 0, p.z - room.cz);
  const big = new THREE.Mesh(new THREE.DodecahedronGeometry(.46, 0), M.rock); big.scale.set(1, .78 + R() * .2, 1); big.position.y = .3; big.rotation.set(R() * 3, R() * 3, R() * 3);
  const small = new THREE.Mesh(new THREE.DodecahedronGeometry(.2, 0), M.rock); small.position.set(R() * .5 - .25, .12, .3); small.rotation.set(R() * 3, R() * 3, 0);
  g.add(big, small, blob(1.3)); room.group.add(g);
  room.rocks.push({ x: p.x, z: p.z, hx: .42, hz: .42, hp: CFG.artifacts.rockHp, breakable: true, mesh: g, tile: { c, r } });
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

/** Is the tile under (x, z) open floor, clear of rocks and pedestals? */
export function isFreeAt(room: Room, x: number, z: number) {
  const c = Math.floor(x - room.bounds.minX), r = Math.floor(z - room.bounds.minZ);
  return room.template.tiles[r]?.[c] === 'floor' && !room.rocks.some(b => Math.abs(x - b.x) < b.hx + .3 && Math.abs(z - b.z) < b.hz + .3);
}
/** The nearest open floor spot to (x, z), searching outwards tile by tile. */
export function freeSpotNear(room: Room, x: number, z: number) {
  const b = room.bounds;
  for (let ring = 0; ring < 8; ring++) for (let dz = -ring; dz <= ring; dz++) for (let dx = -ring; dx <= ring; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
    const px = x + dx, pz = z + dz;
    if (px > b.minX + .5 && px < b.maxX - .5 && pz > b.minZ + .5 && pz < b.maxZ - .5 && isFreeAt(room, px, pz)) return { x: px, z: pz };
  }
  return { x, z };
}

export function buildWallsAndDoors(room: Room) {
  for (const side of SIDES) {
    const nb = roomAt(room.gx + DIR[side].gx, room.gy + DIR[side].gy);
    const h = wallHeight(side), [a0, a1] = wallSpan(side);
    if (!nb) { room.walls.push(wallBox(room, side, a0, a1, h, wallMaterials(room.look.wall))); continue; }
    room.walls.push(wallBox(room, side, a0, -DH, h, wallMaterials(room.look.wall)));
    room.walls.push(wallBox(room, side, DH, a1, h, wallMaterials(room.look.wall)));
    const style: DoorStyle = (room.type === 'boss' || nb.type === 'boss') ? 'boss' : (room.type === 'treasure' || nb.type === 'treasure') ? 'treasure' : 'normal';
    const fm = M.frame[style];
    const ns = side === 'n' || side === 's';
    // posts, lintel, threshold
    const pH = h + (side === 's' ? .05 : .12);
    wallBox(room, side, -DH - .2, -DH, pH, fm, WT + .12);
    wallBox(room, side, DH, DH + .2, pH, fm, WT + .12);
    if (side === 'n') wallBox(room, side, -DH, DH, .28, fm, WT + .04, 0, h - .28);
    const th = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), M.threshold);
    th.rotation.x = -Math.PI / 2; const tp = wallFrame(side, 0, 0); th.position.set(tp.x, .003, tp.z);
    if (ns) th.scale.set(DH * 2, WT, 1); else th.scale.set(WT, DH * 2, 1);
    room.group.add(th);
    if (style === 'boss') {
      const eye = glow(0xff3a1a, .7, .9);
      const ep = wallFrame(side, 0, side === 'n' ? .55 : side === 's' ? -.55 : side === 'e' ? -.55 : .55);
      eye.position.set(ep.x, h + .05, ep.z); room.group.add(eye);
    }
    // bars (sink into the floor when open)
    const bars = new THREE.Group(); const barH = side === 's' ? H_LOW + .1 : h - .25;
    for (let i = 0; i < 5; i++) {
      const along = -DH + .16 + i * ((DH * 2 - .32) / 4);
      const b = new THREE.Mesh(new THREE.BoxGeometry(.1, barH, .1), M.gate); const p = wallFrame(side, along, 0);
      b.position.set(p.x, barH / 2, p.z); bars.add(b);
    }
    for (const yy of [.3, .75]) {
      if (yy > barH) continue;
      const cb = new THREE.Mesh(ns ? new THREE.BoxGeometry(DH * 2, .08, .12) : new THREE.BoxGeometry(.12, .08, DH * 2), M.gate);
      const p = wallFrame(side, 0, 0); cb.position.set(p.x, yy * barH / (side === 's' ? .75 : 1.1), p.z); bars.add(cb);
    }
    bars.position.y = -barH - .05; room.group.add(bars);
    const gp = wallFrame(side, 0, 0);
    room.doors[side] = {
      side, nb, bars, barH, open: true, style,
      box: { x: room.cx + gp.x, z: room.cz + gp.z, hx: ns ? DH : WT / 2, hz: ns ? WT / 2 : DH },
    };
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
      const f = .85 + Math.sin(now * 17 + t.x) * .08 + Math.sin(now * 29 + t.x * 2) * .06;
      t.flame.scale.set(1, f, 1); t.glow.material.opacity = .6 + f * .25;
    }
  }
}
