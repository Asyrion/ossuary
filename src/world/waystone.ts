/* M6 step 9: the waystone (docs/M6-plan.md, decisions 10 and 11; GDD: the rest between floors). A menhir that answers
   casts: once a floor's boss falls it rises in the boss room (step 10 gives it a room of its own) on floors 1 to 4, and its
   runes kindle. Walking up to it opens its screen (ui/waystone.ts), with the alchemy table's latch (step away and back);
   a spell cast into it costs nothing and opens the screen on that spell's sockets. The first time it is reached it rests
   the mage: full mana, every cooldown ended, the mana streaming from the stone to the hand. It offers a pair of runes,
   dealt as it rises on the run's runes stream (`dealPair`): one taken, the other crumbles. */
import * as THREE from 'three';
import { CFG } from '../config';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { burst } from '../combat/fx';
import { line } from '../ui/hud';
import { dealPair } from '../magic/runes';
import { rune, type RuneId } from '../magic/runeData';
import { strikeFx } from '../magic/spellFx';
import type { SpellDef } from '../magic/spellData';
import { streakTo } from '../progression/insight';
import { openWaystone, waystoneOpen } from '../ui/waystone';
import { WAYSTONE_RUNES, waystoneLook } from './mechLooks';
import { FLOORS } from './generate';
import { freeSpotNear } from './rooms';
import type { Room } from '../types';

const C = () => CFG.waystone;
const MANA = 0x6fa8ff;

/** Raise a waystone in `room` at (x, z): it climbs out of the floor over `CFG.waystone.rise` seconds, then kindles. */
export function raiseWaystone(room: Room, x: number, z: number) {
  if (room.waystone) return room.waystone;
  const look = waystoneLook();
  look.group.position.set(x - room.cx, -C().depth, z - room.cz); room.group.add(look.group);
  room.rocks.push({ x, z, hx: C().half, hz: C().half, hp: Infinity, breakable: false });
  if (Math.abs(player.x - x) < C().half + player.r && Math.abs(player.z - z) < C().half + player.r) player.z = z + C().half + player.r + .1; // (never risen around the mage)
  for (const p of G.pickups) if (Math.abs(p.x - x) < C().half + p.r && Math.abs(p.z - z) < C().half + p.r) { // (nor over what lies there)
    const at = freeSpotNear(room, p.x, p.z); p.x = at.x; p.z = at.z; p.g.position.set(at.x, p.g.position.y, at.z);
  }
  room.waystone = { x, z, rise: 0, lit: false, rested: false, pair: dealPair(), armed: false, target: 0, look };
  Sfx.at(x, z).crumble(); G.shake = Math.max(G.shake, .25);
  return room.waystone;
}
/** A floor's boss has fallen: on floors 1 to 4 its waystone rises to the side at the back of the room (out of reach of the page and the pedestals) (before the boss's gifts are laid,
    so they keep clear of it). */
export function waystoneAfterBoss(room: Room) {
  if (G.run.floor >= FLOORS.length - 1) return; // (floor 5: nothing below to carry runes to)
  const p = freeSpotNear(room, room.cx + C().at[0], room.cz + C().at[1]);
  raiseWaystone(room, p.x, p.z); line(STR.waystone.risen, CFG.afflict.lineShow);
}

/** Each step: the stone rises, kindles when it is up, and while its screen is open shows the target slot's runes in its
    hollows. */
export function updateWaystone(dt: number) {
  const w = G.current.waystone; if (!w) return;
  const g = w.look.group;
  if (w.rise < 1) {
    w.rise = Math.min(1, w.rise + dt / C().rise);
    const e = 1 - (1 - w.rise) ** 3; g.position.y = -(1 - e) * C().depth;
    g.position.x = w.x - G.current.cx + (w.rise < 1 ? Math.sin(w.rise * 90) * .02 : 0); // (it shudders as it grinds up)
    if (w.rise >= 1) kindle(w);
  }
  if (!w.lit) return;
  const open = waystoneOpen(), socket = player.sockets[w.target];
  w.look.parts.hollows.forEach((h, i) => {
    const id = open ? socket?.runes[i] as RuneId | undefined : undefined, m = h.material as THREE.MeshBasicMaterial;
    if (id) m.color.set(rune(id).color); else m.color.setHex(open && i < (socket?.size ?? 1) ? 0x2a2018 : 0x0c0806); // (a socket the slot holds, a shade lighter)
  });
}
function kindle(w: NonNullable<Room['waystone']>) {
  w.lit = true;
  ((w.look.parts.runes.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(WAYSTONE_RUNES.lit); // (one material for every stroke)
  w.look.parts.glow.visible = true;
  Sfx.at(w.x, w.z).kindle(); burst(w.x, 1.6, w.z, WAYSTONE_RUNES.lit, 18, 1.8, .05);
}

/** Whether the mage stands within reach of the room's kindled waystone. */
export function stoneInReach() {
  const w = G.current.waystone;
  return !!w && w.lit && Math.abs(player.x - w.x) < C().half + C().reach + player.r && Math.abs(player.z - w.z) < C().half + C().reach + player.r;
}
/** Each step: walking up to the kindled stone opens its screen, once the mage has stepped away from it since. */
export function checkWaystone() {
  const w = G.current.waystone; if (!w || !w.lit || G.current.locked) return;
  if (!stoneInReach()) { w.armed = true; return; }
  if (w.armed) { w.armed = false; openWaystone('runes'); }
}
/** A spell cast from slot `slot` within reach of the stone: caught (nothing is paid), struck into it in the spell's light,
    and the screen opens on that spell's sockets. False when no stone is in reach. */
export function castIntoStone(slot: number, def: SpellDef) {
  const w = G.current.waystone; if (!w || G.current.locked || !stoneInReach()) return false; // (never mid-fight: a spell is a spell then)
  const color = parseInt(def.color.slice(1), 16), at = { x: w.x, y: 1, z: w.z };
  strikeFx({ x: player.x, y: .9, z: player.z }, at, color, .3, true); burst(at.x, at.y, at.z, color, 10, 1.6, .04);
  w.armed = false; openWaystone('runes', slot);
  return true;
}
/** The stone's rest, the first time it is reached: full mana, every cooldown ended, the mana streaming to the hand. */
export function restAtStone() {
  const w = G.current.waystone; if (!w || w.rested) return;
  w.rested = true;
  player.mana = player.stats.maxMana; player.spellCd.fill(0);
  for (let i = 0; i < C().streaks; i++) streakTo(w.x + (i % 2 ? .12 : -.12), 1.1 + i * .08, w.z, MANA, i * C().streakGap);
  Sfx.at(w.x, w.z).rest(); line(STR.waystone.rested, CFG.afflict.lineShow);
}
