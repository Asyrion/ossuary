/* The Wandering Merchant of Belerial (M4.2, from the Eda lore; GDD: Pickups and room types). A second trader, rare: once
   a run, after an ordinary room's fight, an old merchant rides in through one of its doors on a huge shaggy pack beast
   with a crow on its head, and lays out what the Bound Shade doesn't sell: a focus from far off and a soul mote from the
   packs. The crow sells what it has seen: the floor's map, and where its secret room lies. The merchant is gone when the
   mage leaves the room. The wares are bought as the shade's are, walking into their ward circles (merchant.ts). */
import * as THREE from 'three';
import type { RockBox, Room } from '../types';
import { CFG } from '../config';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { disposeTree } from '../render/materials';
import { banner, renderMinimap, toast } from '../ui/hud';
import { freeSpotNear } from '../world/rooms';
import { wandererLook } from '../world/specialLooks';
import { revealCracks } from '../world/secret';
import { LOOT, type Item, type Ware } from './loot';
import { pickFocus, type ArtifactDef } from './artifactData';
import { layWare } from './merchant';
import { runeHere } from '../magic/runes';

const C = CFG.wanderer;
type Parts = { beast: THREE.Group; legs: THREE.Object3D[]; head: THREE.Object3D; crow: THREE.Object3D };
/** The merchant in the current room: where from and where to, how long riding, whether the wares are out. */
let here: {
  room: Room;
  g: THREE.Group;
  t: number;
  from: { x: number; z: number };
  to: { x: number; z: number };
  laid: boolean;
  block?: RockBox;
} | null = null;

/** An ordinary room's fight is over: once a run, from the second floor on, now and then the merchant rides in. */
export function maybeWanderer(room: Room) {
  if (G.run.wandererMet || room.type !== 'normal' || G.run.floor < C.fromFloor) return;
  if (G.run.wanderer.chance(C.chance)) callWanderer(room);
}

/** The merchant rides into `room` through its door furthest from the mage (and the dev menu calls it here). */
export function callWanderer(room: Room = G.current) {
  leave();
  G.run.wandererMet = true;
  const doors = room.doors.filter((d) => d.open && !d.secret && !d.seal);
  const door = doors.sort(
    (a, b) => Math.hypot(b.x - player.x, b.z - player.z) - Math.hypot(a.x - player.x, a.z - player.z),
  )[0];
  const to = freeSpotNear(room, room.cx, room.cz + C.standAt),
    from = door ? { x: door.x, z: door.z } : to;
  const g = wandererLook();
  g.position.set(from.x - room.cx, 0, from.z - room.cz);
  room.group.add(g);
  here = { room, g, t: 0, from, to, laid: false };
  banner(...STR.banner.wanderer);
  Sfx.at(from.x, from.z).wandererBell();
}

/** Once the beast has stopped: the wares in their circles in front of it (the crow's secret only while there is one). */
function layOut() {
  const h = here!,
    room = h.room,
    P = LOOT.wanderer.prices,
    list: { ware: Ware; def?: ArtifactDef }[] = [];
  const focus = pickFocus(G.run.wanderer, G.run.seen, player.focus);
  if (focus) {
    G.run.seen.add(focus.id);
    list.push({ ware: 'artifact', def: focus });
  }
  list.push({ ware: G.run.wanderer.weighted(LOOT.wanderer.souls as Record<Item, number>) });
  list.push({ ware: 'map' });
  if (!crowRefuses('secret')) list.push({ ware: 'secret' });
  if (runeHere('wanderer')) list.push({ ware: 'rune' }); // (M6 step 8: half the time a rune in the beast's packs, on the runes' own stream)
  const taken = [h.to]; // (each on open floor, clear of the beast and of each other: never over a pit, a pillar or an obelisk)
  room.wares = list.map((w, i) => {
    const x = h.to.x + (i - (list.length - 1) / 2) * C.spacing,
      z = h.to.z + C.waresAt;
    let at = freeSpotNear(room, x, z);
    for (let k = 1; k < 8 && taken.some((q) => Math.hypot(q.x - at.x, q.z - at.z) < C.spacing * 0.7); k++)
      at = freeSpotNear(room, x + (k % 2 ? k : -k) * C.spacing * 0.5, z + Math.floor(k / 2));
    taken.push(at);
    return layWare(room, w.ware, w.def, at.x, at.z, P[w.ware]!); // (every ware it lays has its price in data/loot.json: tests/unit/m42rules.test.ts)
  });
  h.block = { x: h.to.x, z: h.to.z, hx: C.block[0], hz: C.block[1], hp: Infinity, breakable: false };
  room.rocks.push(h.block);
  toast(STR.toast.wandererGreets, 3.5);
}

/** Each step: the beast plods in from the door, then stands breathing; the merchant watches the mage; the crow looks
    about. */
export function updateWanderer(now: number, dt: number) {
  if (!here || here.room !== G.current) return;
  const h = here,
    room = h.room,
    u = h.g.userData as Parts;
  if (!h.laid) {
    h.t += dt;
    const k = Math.min(1, h.t / C.rideTime),
      e = 1 - (1 - k) * (1 - k);
    const x = h.from.x + (h.to.x - h.from.x) * e,
      z = h.from.z + (h.to.z - h.from.z) * e;
    h.g.position.set(x - room.cx, 0, z - room.cz);
    const dx = h.to.x - h.from.x,
      dz = h.to.z - h.from.z;
    h.g.rotation.y = k < 1 && Math.hypot(dx, dz) > 0.1 ? Math.atan2(-dz, dx) : dx < -0.1 ? Math.PI : 0; // (it faces the way it goes, then stands side on)
    u.legs.forEach((l, i) => {
      l.rotation.z = k < 1 ? Math.sin(now * 9 + (i % 2) * Math.PI + (i > 1 ? Math.PI / 2 : 0)) * 0.45 : 0;
    });
    u.beast.position.y = k < 1 ? Math.abs(Math.sin(now * 9)) * 0.04 : 0;
    if (k >= 1) {
      h.laid = true;
      layOut();
    }
  } else u.beast.position.y = Math.sin(now * 1.4) * 0.015;
  const bx = h.g.position.x + room.cx,
    bz = h.g.position.z + room.cz;
  u.head.rotation.y = Math.max(-1.2, Math.min(1.2, Math.atan2(player.x - bx, player.z - bz) - h.g.rotation.y));
  u.crow.rotation.y = Math.sin(now * 2.3) * 0.7;
  u.crow.rotation.z = Math.max(0, Math.sin(now * 1.7)) * 0.3;
}

/** The mage is somewhere else now (`room`): the merchant goes, and the wares too. */
export function wandererLeaves(room: Room) {
  if (here && here.room !== room) leave();
}
function leave() {
  if (!here) return;
  const { room, g, block } = here;
  here = null;
  room.group.remove(g);
  disposeTree(g);
  for (const w of room.wares ?? []) {
    room.group.remove(w.g);
    disposeTree(w.g);
  }
  room.wares = undefined;
  if (block) room.rocks = room.rocks.filter((b) => b !== block);
}
/** A new floor or run: nothing of the last one's merchant is left (its room is gone with it). */
export function clearWanderer() {
  here = null;
}
/** Dev hooks: whether the merchant is here, whether the wares are out, what they are and where. */
export const wandererState = () => ({
  here: !!here && here.room === G.current,
  laid: !!here?.laid,
  wares: here ? (here.room.wares ?? []).map((w) => w.ware) : [],
  at: here ? (here.room.wares ?? []).map((w) => ({ x: w.x, z: w.z })) : [],
});

/* ---------- the crow ---------- */

const secretRoom = () => G.rooms.find((r) => r.type === 'secret');
/** Why the crow won't sell what it knows now, if it won't: every room is on the map already; there's no secret left. */
export function crowRefuses(ware: 'map' | 'secret') {
  if (ware === 'map') return G.rooms.every((r) => r.type === 'secret' || r.known) ? STR.toast.crowMapped : null;
  const s = secretRoom();
  return !s || s.known || s.visited || s.doors.some((d) => d.secret?.open) ? STR.toast.crowNoSecret : null;
}
/** The crow tells what it saw: every room of the floor on the map, or the secret room on it and its cracked walls aglow. */
export function crowTells(ware: 'map' | 'secret') {
  if (ware === 'map') {
    for (const r of G.rooms) if (r.type !== 'secret') r.known = true;
    toast(STR.toast.crowMap, 3.5);
  } else {
    secretRoom()!.known = true;
    revealCracks();
    toast(STR.toast.crowSecret, 3.5);
  }
  Sfx.crow();
  renderMinimap();
}
