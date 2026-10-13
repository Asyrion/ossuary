/* The dev menu's galleries of the bosses, the bestiary and Dr. Jelly: stood ahead of the mage, idling, until taken
   away. */
import * as THREE from 'three';
import { drJellyLook, type JellyParts } from '../world/jellyLooks';
import { givePose } from '../world/jellyGives';
import { glowTone } from '../world/kitParts';
import type { Room } from '../types';
import { blob, disposeTree } from '../render/materials';
import { freeSpotNear, isFreeAt } from '../world/rooms';
import { mergeRig } from '../render/rig';
import { ALL_BOSS_LOOKS } from '../actors/bossLooks';
import { BESTIARY_OPTIONS } from '../actors/bestiaryLooks';
import { onDevClear, onDevStep } from '../devDoor';

const shown: { room: Room; group: THREE.Group; idle: (t: number) => void }[] = [];
let clock = 0;
/** Stand the bosses built in code (bossLooks.ts: the Hollow Warden, M4, and the bosses of the floors below and the
    Eda lore's; every one, or those in `only`) in a row ahead of world (x, z). */
export function showBossLooks(room: Room, x: number, z: number, only?: readonly string[]) {
  const list = ALL_BOSS_LOOKS.filter((o) => !only || only.includes(o.id));
  return list.map((o, i) => {
    const at = freeSpotNear(room, x + (i - (list.length - 1) / 2) * 2.9, z - 3);
    const b = o.build();
    mergeRig(b.group, b.idle, 'boss:' + o.id);
    b.group.position.set(at.x - room.cx, 0, at.z - room.cz);
    b.group.add(blob(b.shadow));
    room.group.add(b.group);
    shown.push({ room, group: b.group, idle: b.idle });
    return { id: o.id, x: at.x, z: at.z };
  });
}
/** Stand Dr. Jelly (world/jellyLooks.ts: the plague doctor, the owner's choice of 2026-10-02) ahead of world (x, z),
    looping the giving gesture with a flask of jelly on his palm. */
export function showJellyLooks(room: Room, x: number, z: number) {
  return [0].map((i) => {
    const at = freeSpotNear(room, x, z - 2),
      g = drJellyLook(),
      P = g.userData.parts as JellyParts;
    const vial = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), glowTone(0x7ae070));
    vial.position.y = 0.05;
    P.gift.add(vial);
    g.position.set(at.x - room.cx, 0, at.z - room.cz);
    room.group.add(g);
    shown.push({
      room,
      group: g,
      idle: (t) => {
        const c = (t + i * 0.9) % 3.2,
          k = c < 0.5 ? c / 0.5 : c < 1.6 ? 1 : c < 2.1 ? 1 - (c - 1.6) / 0.5 : 0;
        givePose(P, k * k * (3 - 2 * k));
        vial.visible = k > 0.05;
        P.body.position.y = Math.sin(t * 2.1 + i) * 0.02;
      },
    });
    return { id: 'plague', x: at.x, z: at.z };
  });
}
/** The nearest open floor to (x, z), searching outwards half a tile at a time, at least `gap` from every spot `taken`
    (so a crowd of looks never stands one on another); the nearest open floor at all if the room has no such place. */
function clearSpot(room: Room, x: number, z: number, taken: readonly { x: number; z: number }[], gap = 1) {
  const b = room.bounds;
  for (let ring = 0; ring < 24; ring++)
    for (let dz = -ring; dz <= ring; dz++)
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        const px = x + dx * 0.5,
          pz = z + dz * 0.5;
        if (
          px > b.minX + 0.5 &&
          px < b.maxX - 0.5 &&
          pz > b.minZ + 0.5 &&
          pz < b.maxZ - 0.5 &&
          isFreeAt(room, px, pz) &&
          taken.every((q) => Math.hypot(q.x - px, q.z - pz) >= gap)
        )
          return { x: px, z: pz };
      }
  return freeSpotNear(room, x, z);
}
/** Stand the bestiary (M4.5; every one, or those in `only`) ahead of world (x, z) in `room`: rows for each kind (beasts,
    creatures of myth, elementals), nearest the mage first, each turned a little to show its side. They are the size of
    the foes they will be, so the whole bestiary wants a great hall (`?room=great_hall`). */
export function showBestiary(room: Room, x: number, z: number, only?: readonly string[]) {
  const out: { id: string; x: number; z: number }[] = [];
  const kinds = (['beast', 'creature', 'elemental'] as const)
    .map((kind) => BESTIARY_OPTIONS.filter((o) => o.kind === kind && (!only || only.includes(o.id))))
    .filter((l) => l.length);
  const across = Math.max(1, Math.min(8, Math.floor((room.bounds.maxX - room.bounds.minX) / 2.4)));
  let row = 0;
  for (const list of kinds) {
    list.forEach((o, i) => {
      const n = Math.min(across, list.length - Math.floor(i / across) * across);
      const wx = x + ((i % across) - (n - 1) / 2) * 2.4,
        wz = z - 1.9 - (row + Math.floor(i / across)) * 2.1;
      const at = clearSpot(room, wx, wz, out, 1.7);
      const b = o.build();
      mergeRig(b.group, b.idle, 'bestiary:' + o.id);
      b.group.position.set(at.x - room.cx, 0, at.z - room.cz);
      b.group.rotation.y = 0.5;
      if (b.shadow) b.group.add(blob(b.shadow));
      room.group.add(b.group);
      shown.push({ room, group: b.group, idle: b.idle });
      out.push({ id: o.id, x: at.x, z: at.z });
    });
    row += Math.ceil(list.length / across);
  }
  return out;
}
/** Every step of play: the looks shown in the room move as they idle. */
onDevStep((dt, current, playing) => {
  if (!playing) return;
  clock += dt;
  for (const s of shown) if (s.room === current) s.idle(clock);
});
/** Take the looks shown in `room` away. */
export function removeModelOptions(room: Room) {
  for (let i = shown.length - 1; i >= 0; i--)
    if (shown[i].room === room) {
      room.group.remove(shown[i].group);
      disposeTree(shown[i].group);
      shown.splice(i, 1);
    }
}
/** A new floor: its rooms are gone, and the looks with them. */
onDevClear(() => {
  shown.length = 0;
});
