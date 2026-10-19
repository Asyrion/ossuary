/* Dressed walls: the tall walls facing into a room stop being flat brick. Pilasters stand out from them
   at intervals, and between the pilasters niches are set into the wall, holding what the floor keeps there (a
   skull, a candle stub, a small urn, a few bones). What a floor's walls carry comes from its look
   (`wall.dress` in data/floors.json). Dressing is only seen: it never blocks, and keeps clear of doors and torches.
   The pieces are the room kit's (wallLooks.ts), a wall's merged into one mesh, so a room of them costs little. */
import * as THREE from 'three';
import type { NicheKind, Room } from '../types';
import { mergeStill } from '../render/materials';
import type { FlameSpec } from '../render/fire';
import { mulberry } from '../util';
import { candleFire } from './objectLooks';
import { nicheLook, pilasterLook } from './wallLooks';

/** Dress a stretch of tall wall facing south into the room: its inner face at world z `face`, spanning world
    x [x0, x1]; `avoid` are world x positions to keep clear (doors, torches), each with how much room it needs. */
export function dressNorthWall(room: Room, face: number, x0: number, x1: number, avoid: { x: number; room: number }[]) {
  const dress = room.look.wall.dress;
  if (!dress || room.type === 'library' || room.type === 'laboratory') return; // (its shelves line the north wall; the vat window fills a laboratory's)
  const R = mulberry(room.plan.seed ^ Math.round(face * 131 + x0 * 7));
  const clear = (x: number, need: number) =>
    x - need >= x0 && x + need <= x1 && avoid.every((a) => Math.abs(x - a.x) >= a.room + need);
  const spots: number[] = [];
  for (let x = Math.floor(x0) + 0.5; x < x1; x++) spots.push(x);
  const wall = new THREE.Group(); // (the wall's dressing merged into one)
  const add = (mesh: THREE.Object3D, x: number) => {
    mesh.position.x += x - room.cx;
    mesh.position.z += face - room.cz;
    wall.add(mesh);
    (room.dressed ??= []).push({ x, z: face });
  };
  const niches = Object.entries(dress.niches) as [NicheKind, number][],
    total = niches.reduce((s, [, w]) => s + w, 0);
  const eyes = room.theme?.watchers ? (room.eyes ??= new THREE.MeshBasicMaterial({ color: 0x000000 })) : undefined; // an ossuary's skulls watch
  const flames: FlameSpec[] = []; // (every candle's flame on this wall in one fire)
  spots.forEach((x, i) => {
    if (dress.pilaster && (i + 1) % dress.pilaster === 0) {
      if (clear(x, 0.25)) add(pilasterLook(room.look), x);
      return;
    }
    if (!total || !clear(x, 0.32) || R() < 1 - (dress.fill ?? 0.65)) return;
    let pick = R() * total,
      kind: NicheKind = niches[0][0];
    for (const [k, w] of niches) {
      pick -= w;
      if (pick <= 0) {
        kind = k;
        break;
      }
    }
    const n = flames.length;
    add(nicheLook(kind, R, room.look, eyes, flames), x);
    for (const f of flames.slice(n)) {
      f.x += x - room.cx;
      f.z += face - room.cz;
    }
  });
  if (flames.length) room.group.add(candleFire(flames, room.look));
  if (wall.children.length) {
    mergeStill(wall);
    room.group.add(wall);
  }
}

/** A spell was cast in `room`: if its skulls watch (an ossuary), their eyes take the spell's colour. */
export function skullsWatch(room: Room, color: string) {
  room.eyes?.color.set(color);
}
