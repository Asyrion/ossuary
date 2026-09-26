import * as THREE from 'three';
import floorData from '../../data/floor1.json';
import type { Box, Door, DoorStyle, Room, RoomDef, Side } from '../types';
import { G } from '../state';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { floorTexture } from '../render/textures';
import { M, WALL_MATS, blob, boxUV, glow } from '../render/materials';
import { makeRelicVisual, relicDef } from '../items/relics';
import { mulberry } from '../util';
import { DH, DIR, H_LOW, H_TALL, HD, HW, PX, PZ, SIDES, WT } from './dims';

export const FLOOR1 = floorData.rooms as RoomDef[];

export const roomAt = (gx: number, gy: number) => G.roomMap.get(gx + ',' + gy);
export const toWorld = (room: Room, c: number, r: number) => ({ x: room.cx + (c - 6), z: room.cz + (r - 3) });
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

export function buildRoom(def: RoomDef) {
  const room: Room = {
    def, type: def.type, gx: def.gx, gy: def.gy, cx: def.gx * PX, cz: def.gy * PZ,
    group: new THREE.Group(), doors: {}, walls: [], rocks: [], torches: [], cleared: !(def.foes && def.foes.length),
    visited: false, known: false, locked: false,
  };
  room.group.position.set(room.cx, 0, room.cz); scene.add(room.group);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(13, 7), new THREE.MeshStandardMaterial({ map: floorTexture(def.seed, def.type), roughness: .95 }));
  floor.rotation.x = -Math.PI / 2; room.group.add(floor);
  for (const [c, r] of def.rocks ?? []) addRock(room, c, r);
  // torches on the north wall
  for (const tx of [-3.5, 3.5]) {
    const br = new THREE.Mesh(new THREE.BoxGeometry(.12, .3, .16), M.iron); br.position.set(tx, .85, -HD + .06); room.group.add(br);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(.08, .26, 6), M.flame); fl.position.set(tx, 1.1, -HD + .12); room.group.add(fl);
    const gl = glow(0xff9a3c, 1.1, .8); gl.position.set(tx, 1.12, -HD + .15); room.group.add(gl);
    room.torches.push({ flame: fl, glow: gl, x: room.cx + tx, z: room.cz - HD + .6 });
  }
  if (def.type === 'treasure') addPedestal(room);
  G.rooms.push(room); G.roomMap.set(def.gx + ',' + def.gy, room);
  return room;
}

function addRock(room: Room, c: number, r: number) {
  const p = toWorld(room, c, r); const R = mulberry(c * 31 + r * 7 + room.def.seed);
  const g = new THREE.Group(); g.position.set(p.x - room.cx, 0, p.z - room.cz);
  const big = new THREE.Mesh(new THREE.DodecahedronGeometry(.46, 0), M.rock); big.scale.set(1, .78 + R() * .2, 1); big.position.y = .3; big.rotation.set(R() * 3, R() * 3, R() * 3);
  const small = new THREE.Mesh(new THREE.DodecahedronGeometry(.2, 0), M.rock); small.position.set(R() * .5 - .25, .12, .3); small.rotation.set(R() * 3, R() * 3, 0);
  g.add(big, small, blob(1.3)); room.group.add(g);
  room.rocks.push({ x: p.x, z: p.z, hx: .42, hz: .42 });
}

function addPedestal(room: Room) {
  const g = new THREE.Group();
  const col = new THREE.Mesh(new THREE.CylinderGeometry(.3, .38, .6, 8), M.rock); col.position.y = .3;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .1, 8), M.rock); top.position.y = .64;
  g.add(col, top, blob(1.3));
  const def = relicDef(room.def.relic ?? 'ember');
  const relic = makeRelicVisual(def); relic.position.y = 1.05; g.add(relic);
  room.group.add(g);
  room.rocks.push({ x: room.cx, z: room.cz, hx: .4, hz: .4 });
  room.relic = { def, group: relic, taken: false, x: room.cx, z: room.cz };
}

export function buildWallsAndDoors(room: Room) {
  for (const side of SIDES) {
    const nb = roomAt(room.gx + DIR[side].gx, room.gy + DIR[side].gy);
    const h = wallHeight(side), [a0, a1] = wallSpan(side);
    if (!nb) { room.walls.push(wallBox(room, side, a0, a1, h, WALL_MATS)); continue; }
    room.walls.push(wallBox(room, side, a0, -DH, h, WALL_MATS));
    room.walls.push(wallBox(room, side, DH, a1, h, WALL_MATS));
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
