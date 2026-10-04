/* M6 step 11: the shrine's bargain (docs/M6-plan.md, decision 12; GDD: Shrine cleansing, the bargain). A stele stands at
   the head of the shrine's circle. Walking up to it says how: a spell cast into it (caught, nothing paid) sets the deal's
   school, and its runes run red with the price. The deal is the level-up screen's three cards (two of that school, one
   general: `dealNow(school)`); taking one pays a heart container (never the last) and the runes turn gold, once a shrine.
   Esc backs out with nothing paid, and the stone waits to be tried again. */
import * as THREE from 'three';
import { CFG } from '../config';
import { DEV, G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { burst } from '../combat/fx';
import { line, renderHearts, renderMinimap } from '../ui/hud';
import { strikeFx } from '../magic/spellFx';
import type { School, SpellDef } from '../magic/spellData';
import { takeBoon } from '../progression/boons';
import { refreshStats } from '../items/artifacts';
import { openBargainDeal } from '../ui/levelUp';
import { bargainStoneLook, BARGAIN_RUNES } from './specialLooks';
import { riteState } from './shrine';
import { M, basicMat } from '../render/materials';
import type { Room } from '../types';

const C = () => CFG.bargain;
type Bargain = NonNullable<Room['bargain']>;

/** Where the stone stands in a shrine: the circle's head (north), or its foot (south) where a doorway's lane would run
    through the head, or beside the circle (west, east) where both would; local to the room's middle. */
export function bargainSpot(room: Room): [number, number] {
  const [ax, az] = C().at, lane = C().lane;
  const blocked = ([x, z]: [number, number]) => room.plan.doors.some(d => {
    const shift = d.shift ?? 0;
    if (d.side === 'n' || d.side === 's') return (d.side === 'n' ? z < 0 : z > 0) && Math.abs(x - shift) < lane;
    return (d.side === 'w' ? x < 0 : x > 0) && Math.abs(z - shift) < lane;
  });
  const spots: [number, number][] = [[ax, az], [ax, -az], [-C().aside, 0], [C().aside, 0]];
  return spots.find(p => !blocked(p)) ?? spots[0];
}
/** Stand the bargain stone in `room` at local (lx, lz) (in a shrine, `bargainSpot`; ahead of the mage from the dev menu). */
export function buildBargain(room: Room, at?: [number, number]) {
  if (room.bargain) return room.bargain;
  const [lx, lz] = at ?? bargainSpot(room);
  const look = DEV.roomKit ? bargainStoneLook(room.look) : oldLook();
  look.group.position.set(lx, 0, lz); room.group.add(look.group);
  const x = room.cx + lx, z = room.cz + lz;
  // its blocker reaches the wall behind it where the gap would be narrow (no space to hide in)
  const toWall = lz < 0 ? (z - C().half) - (room.cz - room.h / 2) : lz > 0 ? (room.cz + room.h / 2) - (z + C().half) : Infinity;
  const deep = toWall < C().wallGap ? toWall : 0, dz = lz < 0 ? -deep / 2 : deep / 2;
  room.rocks.push({ x, z: z + dz, hx: C().half, hz: C().half + deep / 2, hp: Infinity, breakable: false });
  room.bargain = { x, z, state: 'idle', school: null, armed: true, look };
  return room.bargain;
}
/** The stone before the room kit: a grey slab, its rune a sphere of light. */
function oldLook() {
  const group = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.2, .26), M.stone); slab.position.y = .6;
  const rune = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), basicMat(BARGAIN_RUNES.idle)); rune.position.set(0, .8, .15);
  group.add(slab, rune);
  return { group, runes: rune.material as THREE.MeshBasicMaterial };
}
function setRunes(b: Bargain, color: number) {
  b.look.runes.color.setHex(color);
  const gl = b.look.glows; if (gl) { gl.price.visible = color === BARGAIN_RUNES.price; gl.kept.visible = color === BARGAIN_RUNES.kept; }
}

/** Whether the mage stands within reach of the room's bargain stone. */
function inReach(b: Bargain) {
  const r = C().half + C().reach + player.r;
  return Math.abs(player.x - b.x) < r && Math.abs(player.z - b.z) < r;
}
/** Each step: walking up to the stone while it waits says how to bargain (once a visit, with the latch the lab has). */
export function checkBargain() {
  const b = G.current.bargain; if (!b || b.state !== 'idle') return;
  if (!inReach(b)) { b.armed = true; return; }
  if (b.armed) { b.armed = false; line(STR.bargain.how, CFG.afflict.lineShow); }
}

/** A spell cast within reach of a waiting bargain stone: caught (nothing paid), struck into the stone in the
    spell's light, its runes run red, and the deal opens on the spell's school. False when no stone waits in reach (a kept one
    lets the cast go on); true for a refusal too (the last heart: the cast is spent on asking). */
export function castIntoBargain(def: SpellDef) {
  const b = G.current.bargain; if (!b || b.state !== 'idle' || riteState() || !inReach(b)) return false;
  const color = parseInt(def.color.slice(1), 16), at = { x: b.x, y: 1, z: b.z };
  strikeFx({ x: player.x, y: .9, z: player.z }, at, color, .3, true); burst(at.x, at.y, at.z, color, 10, 1.6, .04);
  if (player.maxHp - 2 < 2) { line(STR.bargain.refused, CFG.afflict.lineShow); Sfx.refuse(); return true; } // (never the last container)
  openStone(b, def.school);
  return true;
}
/** The deal opened on `school` (not while another screen holds the level-up screen, leaving the stone waiting). */
function openStone(b: Bargain, school: School) {
  if (!openBargainDeal(school)) return false;
  b.state = 'open'; b.school = school; setRunes(b, BARGAIN_RUNES.price);
  Sfx.at(b.x, b.z).bargain(); burst(b.x, 1.1, b.z, BARGAIN_RUNES.price, 14, 1.6, .05);
  return true;
}
/** Open the deal on `school` at the room's stone at once (the dev menu and the tests), or false. */
export function openBargainHere(school: School) {
  const b = G.current.bargain; if (!b || b.state !== 'idle') return false;
  return openStone(b, school);
}

/** A boon taken from the bargain's deal: the heart container paid, the boon taken (its card), the runes gold, once a shrine. */
export function keepBargain(id: string) {
  const b = G.current.bargain;
  player.heartsPaid++; refreshStats(); renderHearts();
  takeBoon(id);
  if (b) { b.state = 'kept'; setRunes(b, BARGAIN_RUNES.kept); burst(b.x, 1.2, b.z, BARGAIN_RUNES.kept, 20, 2, .05); Sfx.at(b.x, b.z).bargainKept(); }
  burst(player.x, 1, player.z, 0xd23a3a, 10, 1.4, .05); // (the heart paid)
  line(STR.bargain.kept, CFG.afflict.lineShow); renderMinimap();
}
/** The deal backed out of: nothing paid, the runes dark again, and the stone waits to be tried again. */
export function refuseBargain() {
  const b = G.current.bargain; if (!b || b.state !== 'open') return;
  b.state = 'idle'; b.school = null; b.armed = false; setRunes(b, BARGAIN_RUNES.idle);
  line(STR.bargain.backed, CFG.afflict.lineShow);
}
/** The room's bargain stone, for the tests and the dev menu. */
export const bargainNow = () => { const b = G.current.bargain; return b ? { x: b.x, z: b.z, state: b.state, school: b.school, runes: b.look.runes.color.getHex() } : null; };
