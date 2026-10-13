/* M6 step 9: the waystone (docs/archive/M6-plan.md, decisions 10 and 11; GDD: the rest between floors). A menhir that answers
   casts. Step 10 gives it a room of its own beside the boss room on floors 1 to 4, holding the way down: the room waits dark
   and empty until the mage first walks in after the boss falls, then the stone grinds up near its middle (a little toward
   the door), its runes kindle,
   the room lightens and the trapdoor opens beyond it, away from the door. Where the generator found no cell for the room,
   it rises in the boss room as the boss falls (`waystoneAfterBoss`). Walking up to it opens its screen (ui/waystone.ts), with the alchemy table's latch (step away and back);
   a spell cast into it costs nothing and opens the screen on that spell's sockets. The first time it is reached it rests
   the mage: full mana, every cooldown ended, the mana streaming from the stone to the hand. It offers a pair of runes,
   dealt as it rises on the run's runes stream (`dealPair`): one taken, the other crumbles. */
import * as THREE from 'three';
import { CFG } from '../config';
import { G, after, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { burst } from '../combat/fx';
import { banner, line, renderMinimap } from '../notify';
import { dealPair } from '../magic/runes';
import { rune, type RuneId } from '../magic/runeData';
import { strikeFx } from '../magic/spellFx';
import type { SpellDef } from '../magic/spellData';
import { streakTo } from '../progression/insight';
import { UI, openWaystone } from '../panels';
import { WAYSTONE_RUNES, waystoneLook } from './mechLooks';
import { FLOORS } from './generate';
import { freeSpotNear } from './rooms';
import { SIDE_DIR } from './shapes';
import { makeTrapdoor } from '../items/pickups';
import { setDarkness } from '../render/lights';
import type { Room } from '../types';

const C = () => CFG.waystone;
const MANA = 0x6fa8ff;

/** Raise a waystone in `room` at (x, z): it climbs out of the floor over `CFG.waystone.rise` seconds, then kindles. */
export function raiseWaystone(room: Room, x: number, z: number) {
  if (room.waystone) return room.waystone;
  const look = waystoneLook();
  look.group.position.set(x - room.cx, -C().depth, z - room.cz);
  room.group.add(look.group);
  room.rocks.push({ x, z, hx: C().half, hz: C().half, hp: Infinity, breakable: false });
  if (Math.abs(player.x - x) < C().half + player.r && Math.abs(player.z - z) < C().half + player.r)
    player.z = z + C().half + player.r + 0.1; // (never risen around the mage)
  for (const p of G.pickups)
    if (Math.abs(p.x - x) < C().half + p.r && Math.abs(p.z - z) < C().half + p.r) {
      // (nor over what lies there)
      const at = freeSpotNear(room, p.x, p.z);
      p.x = at.x;
      p.z = at.z;
      p.g.position.set(at.x, p.g.position.y, at.z);
    }
  room.waystone = { x, z, rise: 0, lit: false, rested: false, pair: dealPair(), armed: false, target: 0, look };
  Sfx.at(x, z).crumble();
  G.fx.shake = Math.max(G.fx.shake, 0.25);
  return room.waystone;
}
/** M6 step 10: the mage walks into the waystone room: its banner the first time; once the floor's boss is down (or on a floor
    with no boss room, `?room=waystone_plain`), the stone rises near its middle the first time; dark until it has kindled. */
export function enterWaystone(room: Room, firstVisit: boolean) {
  if (firstVisit) banner(...STR.banner.waystone);
  const boss = G.floor.rooms.find((r) => r.type === 'boss');
  if (!room.waystone && (!boss || boss.cleared)) {
    // (a little toward the door: the way down lies beyond it)
    const [dx, dz] = SIDE_DIR[room.plan.doors[0]?.side ?? 'n'];
    raiseWaystone(room, room.cx + dx * C().toDoor[0], room.cz + dz * C().toDoor[1]);
    line(STR.waystone.risenRoom, CFG.afflict.lineShow);
  }
  setDarkness(room.waystone?.lit ? 0 : C().dark);
}
/** The floor's waystone room, if the generator found it a cell (floors 1 to 5: floor 5's since M7). */
export function waystoneRoom() {
  return G.floor.rooms.find((r) => r.type === 'waystone');
}
/** The boss fell on a floor with a waystone room: the boss room's banner says where the way down lies, and a line which door. */
export function pointToStone(boss: Room, stone: Room) {
  const d = boss.plan.doors.find((x) => x.to === stone.plan.id);
  if (d) line(STR.waystone.beyond(STR.waystone.sides[d.side]), CFG.afflict.lineShow);
}

/** Step 10: (x, z) in the boss room moved off the lane to the waystone room's door, so the boss's gifts never stand in the
    way to it (`CFG.waystone.lane`: how far into the room the lane runs, how wide it is either side, how far aside a gift
    goes). */
export function offLane(boss: Room, stone: Room | undefined, x: number, z: number) {
  const d = stone && boss.doors.find((o) => o.nb === stone);
  if (!d) return { x, z };
  const [dx, dz] = SIDE_DIR[d.side],
    [deep, half, aside] = C().lane;
  const into = (d.x - x) * dx + (d.z - z) * dz,
    across = dx ? z - d.z : x - d.x;
  if (into < 0 || into > deep || Math.abs(across) >= half) return { x, z };
  const to = (across < 0 ? -1 : 1) * aside;
  return dx ? { x, z: d.z + to } : { x: d.x + to, z };
}

/** A floor's boss has fallen where it has no waystone room: on floors 1 to 5 its waystone rises to the side at the back of the room (out of reach of the page and the pedestals) (before the boss's gifts are laid,
    so they keep clear of it). */
export function waystoneAfterBoss(room: Room) {
  if (G.run.floor >= FLOORS.length - 1) return; // (the Seal, M7: nothing below to carry runes to)
  const p = freeSpotNear(room, room.cx + C().at[0], room.cz + C().at[1]);
  raiseWaystone(room, p.x, p.z);
  line(STR.waystone.risen, CFG.afflict.lineShow);
}

/** Each step: the stone rises, kindles when it is up, and while its screen is open shows the target slot's runes in its
    hollows. */
export function updateWaystone(dt: number) {
  const w = G.current.waystone;
  if (!w) return;
  const g = w.look.group;
  if (w.rise < 1) {
    w.rise = Math.min(1, w.rise + dt / C().rise);
    const e = 1 - (1 - w.rise) ** 3;
    g.position.y = -(1 - e) * C().depth;
    g.position.x = w.x - G.current.cx + (w.rise < 1 ? Math.sin(w.rise * 90) * 0.02 : 0); // (it shudders as it grinds up)
    if (w.rise >= 1) kindle(w);
  }
  if (!w.lit) return;
  const open = UI.waystoneOpen,
    socket = player.sockets[w.target];
  w.look.parts.hollows.forEach((h, i) => {
    const id = open ? (socket?.runes[i] as RuneId | undefined) : undefined,
      m = h.material as THREE.MeshBasicMaterial;
    if (id) m.color.set(rune(id).color);
    else m.color.setHex(open && i < (socket?.size ?? 1) ? 0x2a2018 : 0x0c0806); // (a socket the slot holds, a shade lighter)
  });
}
function kindle(w: NonNullable<Room['waystone']>) {
  w.lit = true;
  ((w.look.parts.runes.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(WAYSTONE_RUNES.lit); // (one material for every stroke)
  w.look.parts.glow.visible = true;
  Sfx.at(w.x, w.z).kindle();
  burst(w.x, 1.6, w.z, WAYSTONE_RUNES.lit, 18, 1.8, 0.05);
  const room = G.current;
  if (room.type === 'waystone') {
    setDarkness(0);
    openWayDown(room);
  }
}
/** Step 10: the trapdoor opens beyond the stone, on the side away from the room's one door. */
function openWayDown(room: Room) {
  if (G.floor.trapdoor) return;
  const [dx, dz] = SIDE_DIR[room.plan.doors[0]?.side ?? 'n'];
  makeTrapdoor(room.cx - dx * C().trapdoor[0], room.cz - dz * C().trapdoor[1], room);
  after(0.5, () => Sfx.trapdoor());
}

/** Whether the mage stands within reach of the room's kindled waystone. */
export function stoneInReach() {
  const w = G.current.waystone;
  return (
    !!w &&
    w.lit &&
    Math.abs(player.x - w.x) < C().half + C().reach + player.r &&
    Math.abs(player.z - w.z) < C().half + C().reach + player.r
  );
}
/** Each step: walking up to the kindled stone opens its screen, once the mage has stepped away from it since. */
export function checkWaystone() {
  const w = G.current.waystone;
  if (!w || !w.lit || G.current.locked) return;
  if (!stoneInReach()) {
    w.armed = true;
    return;
  }
  if (w.armed) {
    w.armed = false;
    openWaystone('runes');
  }
}
/** A spell cast from slot `slot` within reach of the stone: caught (nothing is paid), struck into it in the spell's light,
    and the screen opens on that spell's sockets. False when no stone is in reach. */
export function castIntoStone(slot: number, def: SpellDef) {
  const w = G.current.waystone;
  if (!w || G.current.locked || !stoneInReach()) return false; // (never mid-fight: a spell is a spell then)
  const color = parseInt(def.color.slice(1), 16),
    at = { x: w.x, y: 1, z: w.z };
  strikeFx({ x: player.x, y: 0.9, z: player.z }, at, color, 0.3, true);
  burst(at.x, at.y, at.z, color, 10, 1.6, 0.04);
  w.armed = false;
  openWaystone('runes', slot);
  return true;
}
/** The stone's rest, the first time it is reached: full mana, every cooldown ended, the mana streaming to the hand. */
export function restAtStone() {
  const w = G.current.waystone;
  if (!w || w.rested) return;
  w.rested = true;
  player.mana = player.stats.maxMana;
  player.spellCd.fill(0);
  for (let i = 0; i < C().streaks; i++)
    streakTo(w.x + (i % 2 ? 0.12 : -0.12), 1.1 + i * 0.08, w.z, MANA, i * C().streakGap);
  Sfx.at(w.x, w.z).rest();
  line(STR.waystone.rested, CFG.afflict.lineShow);
  renderMinimap(); // (its mark dims)
}
