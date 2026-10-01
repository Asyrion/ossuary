/* Dr. Jelly's laboratory (M5 step 6, docs/M5-plan.md; GDD: Potions and alchemy): a special room on floors 1 and 3. The
   alchemy table stands in the middle, facing the way in, and Dr. Jelly behind it; the vat window is on the north wall,
   the jelly serpent coiled behind its glass (M5 step 7 lets it out). Walking up to the table opens it (ui/alchemyTable.ts:
   brewing, items/brewing.ts), walking up to Dr. Jelly opens it at the recipes he sells; it opens again only after the
   mage has stepped away. The jelly globes on their stands (`globe`, the template's `J`) burst to a bolt or a blast and
   let out a jelly, or a reagent. Looks in labLooks.ts; tuning `CFG.alchemy.lab`. */
import * as THREE from 'three';
import { CFG } from '../config';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { burst } from '../combat/fx';
import { banner, line } from '../ui/hud';
import { spawnFoe } from '../actors/enemies';
import { spawnPickup } from '../items/pickups';
import { COMMON_REAGENTS } from '../items/alchemyData';
import { openLab } from '../ui/alchemyTable';
import { mulberry } from '../util';
import { SIDE_DIR } from './shapes';
import { PX } from './dims';
import { stoneOf } from './kitParts';
import { freeSpotNear } from './rooms';
import { JELLY, drJellyLook, tableLook, vatWindowLook } from './labLooks';
import type { Room } from '../types';

const L = () => CFG.alchemy.lab;

/** Furnish a laboratory: the table in the middle (turned to face the room's one door), Dr. Jelly behind it, the vat window
    on the north wall beside the middle, away from any door there (the wall's torches keep clear of it: rooms.ts). */
export function furnishLab(room: Room) {
  const door = room.plan.doors[0], [dx, dz] = door ? SIDE_DIR[door.side] : [0, 1], R = mulberry(room.plan.seed ^ 0x1ab);
  const along = dx === 0; // (a door north or south: the table lies east to west)
  const table = tableLook(); table.position.set(0, 0, 0); if (!along) table.rotation.y = Math.PI / 2; room.group.add(table);
  const tb = { x: room.cx, z: room.cz, hx: along ? .78 : .4, hz: along ? .4 : .78 };
  room.rocks.push({ x: tb.x, z: tb.z, hx: tb.hx, hz: tb.hz, hp: Infinity, breakable: false });
  const jx = room.cx - dx * L().jellyAt, jz = room.cz - dz * L().jellyAt, jelly = drJellyLook();
  jelly.position.set(jx - room.cx, 0, jz - room.cz); jelly.rotation.y = Math.atan2(dx, dz); room.group.add(jelly);
  room.rocks.push({ x: jx, z: jz, hx: .3, hz: .3, hp: Infinity, breakable: false });
  // the vat window: on the north wall, to one side, away from a door there
  const { minZ } = room.bounds, north = room.plan.doors.find(d => d.side === 'n');
  let wx = (R() < .5 ? -1 : 1) * 2;
  if (north && Math.abs(room.cx + wx - (north.gx * PX + (north.shift ?? 0))) < 1.9) wx = -wx;
  const vat = vatWindowLook(stoneOf(room.look, 1.3)); vat.position.set(wx, 0, minZ - room.cz + .04); room.group.add(vat);
  room.lab = { table: tb, jelly: { x: jx, z: jz, g: jelly }, vat, tableLook: table, identified: false, armedTable: true, armedJelly: true };
}

/** The mage comes into a laboratory: Dr. Jelly will look at one potion again this visit; the first time, the banner and
    his greeting. */
export function enterLab(room: Room, firstVisit: boolean) {
  if (!room.lab) return;
  room.lab.identified = false; room.lab.armedTable = room.lab.armedJelly = true;
  if (!firstVisit) return;
  banner(...STR.banner.laboratory); line(STR.lab.greet, 5); Sfx.at(room.lab.jelly.x, room.lab.jelly.z).brew();
}

/** Every step in a laboratory: walking up to the table opens it; to Dr. Jelly, at his recipes (each only after stepping
    away from it). */
export function checkLab() {
  const lab = G.current.lab; if (!lab) return;
  const t = lab.table, reach = L().reach + player.r;
  const atTable = Math.abs(player.x - t.x) < t.hx + reach && Math.abs(player.z - t.z) < t.hz + reach;
  const atJelly = Math.hypot(player.x - lab.jelly.x, player.z - lab.jelly.z) < .3 + reach;
  if (!atTable) lab.armedTable = true; if (!atJelly) lab.armedJelly = true;
  if (atJelly && lab.armedJelly) { lab.armedJelly = lab.armedTable = false; openLab('recipes'); }
  else if (atTable && lab.armedTable) { lab.armedTable = false; openLab('brew'); }
}

/** Every frame: Dr. Jelly bobs and turns to watch the mage, the jelly in its jar wobbles; the serpent behind the glass
    turns in its coil and lifts its head. */
export function updateLab(now: number) {
  const lab = G.current.lab; if (!lab) return;
  const body = lab.jelly.g.userData.body as THREE.Object3D, jelly = lab.jelly.g.userData.jelly as THREE.Object3D;
  body.position.y = Math.sin(now * 2.1) * .02;
  const want = Math.atan2(player.x - lab.jelly.x, player.z - lab.jelly.z) - lab.jelly.g.rotation.y;
  body.rotation.y += (Math.atan2(Math.sin(want), Math.cos(want)) - body.rotation.y) * .06;
  jelly.scale.set(1 + Math.sin(now * 5) * .08, 1 - Math.sin(now * 5) * .08, 1 + Math.sin(now * 5) * .08);
  const serpent = lab.vat.userData.serpent as THREE.Object3D, head = lab.vat.userData.head as THREE.Object3D | undefined;
  serpent.rotation.y = Math.sin(now * .35) * .5; serpent.position.y = .2 + Math.sin(now * .8) * .04;
  if (head) head.position.y = .85 + Math.sin(now * 1.3) * .06;
}

/** A jelly globe bursts at (x, z): now and then a jelly drifts out of it, else a reagent drops. */
export function globeBurst(room: Room, x: number, z: number) {
  if (G.run.reagents.chance(L().globeJelly)) { spawnFoe('lanternJelly', x, z, 1); burst(x, .6, z, JELLY, 10, 1.4, .05); return; }
  const p = freeSpotNear(room, x, z), r = COMMON_REAGENTS[G.run.reagents.int(0, COMMON_REAGENTS.length - 1)];
  spawnPickup('reagent', p.x, p.z, { reagent: r, rise: true });
}
