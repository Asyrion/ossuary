/* The Vigil as a place (M7 step 5; docs/M7-plan.md, decisions 8, 9 and 16): what stands in its three rooms once flow.ts
   has built them from data/vigil.json (`furnishVigil`), and what happens there each step (`updateVigil`): the candle wall
   lit (one candle for each candle earned; the first lights itself on the first waking, in the dark), the lectern opening
   its screen when the mage walks up (ui/lectern.ts), the Ferryman's boat taking the mage down when it steps aboard, each
   barred way saying what bars it (and opening to its school, M7 step 9), and the Ferryman's head turning to the mage. Nothing here can hurt the mage, and nothing
   is fought. `leaveVigil` (from flow's `buildFloor`) forgets it. */
import * as THREE from 'three';
import type { Room, RockBox, Torch } from '../types';
import { unplugDoor } from '../world/rooms';
import { disposeTree } from '../render/materials';
import { CFG } from '../config';
import { G, after, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { setDarkness } from '../render/lights';
import { banner, line } from '../ui/hud';
import { burst } from '../combat/fx';
import { schoolOf, type School } from '../actors/foeData';
import { lightCandle, openPart, vigil } from './save';
import { VIGIL, roomIndex, type VigilBar, type VigilPiece } from './vigilMap';
import { FACE_TURN, barLook, candleWallLook, circleLook, moveFerryman, moveVeil, pieceLook } from './vigilLooks';
import { atVigil, hearLanding, setAtVigil, vigilHooks } from './where';
import { at, block, keep, middle } from './tiles';
import { clearUnfold, furnishUnfold, updateUnfold } from './unfold';
import { clearTown, ferryAt, standFerryman, standTown, updateTown, wearsMade } from './town';
import { closeTalk, updateTalk } from '../ui/talk';

const C = () => CFG.vigil.place;
interface Bar { school: School; room: Room; x: number; z: number; said: boolean; stirred?: boolean; open: boolean; look: THREE.Group; def: VigilBar }
interface Here {
  first: boolean; t: number; candles: ReturnType<typeof candleWallLook>; lectern: { room: Room; x: number; z: number; armed: boolean };
  boat: { room: Room; x: number; z: number; look: THREE.Object3D; step: { x: number; z: number }; boarded: boolean };
  bars: Bar[]; veils: THREE.Mesh[]; circle: { room: Room; x: number; z: number; r: number; said: boolean }; seen: Set<Room>;
}
let here: Here | null = null;
/** What the Vigil calls in flow.ts (set there): take the boat down (a run on floor 1), and open the lectern's screen. */
export const vigilActs = { board: () => {}, openLectern: () => {} };

/** Furnish the Vigil's rooms (G.rooms, built from its plan, before their walls): its pieces, barred ways and circle.
    `first`: the first waking, in the dark, its first candle about to light. */
export function furnishVigil(first: boolean) {
  const rooms = G.rooms, room = (name: string) => rooms[roomIndex(VIGIL, name)];
  let candles: Here['candles'] | null = null, lectern: Here['lectern'] | null = null, boat: Here['boat'] | null = null;
  for (const p of VIGIL.pieces) {
    const r = room(p.room), m = middle(r, p);
    const g = p.kind === 'candleWall' ? (candles = candleWallLook(r.look)).group : pieceLook(p.kind, r.look, { ferryman: !wearsMade('ferryman') });
    const wall = wallOf(r, p);
    g.position.set(m.x - r.cx, 0, (wall === 'n' ? r.bounds.minZ : m.z) - r.cz);
    r.group.add(g); block(r, p);
    if (wall) keep(r, wall, p);
    if (p.kind === 'lectern') lectern = { room: r, x: m.x, z: m.z, armed: true };
    if (p.kind === 'boat') {
      g.position.y = -.08; // (it rides low in the water)
      boat = { room: r, x: m.x, z: m.z, look: g, step: { x: r.bounds.minX + p.at[0] - .25, z: m.z - .5 }, boarded: false };
    }
    if (p.kind === 'candleWall' || p.kind === 'bier') { // (each a light the room's torch lights can go to)
      const lightAt = { x: m.x, z: wall === 'n' ? r.bounds.minZ + .7 : m.z };
      const glowOf = (g.userData.parts?.light as THREE.Sprite | undefined) ?? new THREE.Sprite();
      const flame = new THREE.Object3D(); flame.userData.fire = true; flame.userData.piece = p.kind; // (its fire moves by itself: no flicker from rooms.ts)
      r.torches.push({ flame, glow: glowOf, ...lightAt, lit: p.kind === 'bier' } as Torch);
    }
  }
  const bars: Bar[] = [], veils: THREE.Mesh[] = [];
  for (const b of VIGIL.bars) {
    const r = room(b.room), m = middle(r, b), open = vigil().parts.includes(b.school), built = buildBar(b, r, open);
    if (!open) block(r, b, b.school);
    keep(r, b.side, b);
    if (built.veil) veils.push(built.veil);
    bars.push({ school: b.school, room: r, x: m.x, z: m.z, said: false, open, look: built.group, def: b });
  }
  const cr = room(VIGIL.circle.room), cm = at(cr, VIGIL.circle.at[0], VIGIL.circle.at[1]), ring = circleLook(VIGIL.circle.radius);
  ring.position.set(cm.x - cr.cx, 0, cm.z - cr.cz); cr.group.add(ring);
  here = { first, t: 0, candles: candles!, lectern: lectern!, boat: boat!, bars, veils, circle: { room: cr, ...cm, r: VIGIL.circle.radius, said: false }, seen: new Set() };
  here.candles.setLit(first ? 0 : litCandles()); refreshCandleLight();
  furnishUnfold(); // (M7 step 9: the rooms behind the barred ways)
  standTown(rooms); ferryAt(here.boat.room, here.boat.step.x, here.boat.step.z); standFerryman(here.boat.look); // (M7 step 7: the freed, and the Ferryman's first word)
  setAtVigil(true);
}
/** A barred way's look (closed, or as its school left it), set against its wall in its room. */
function buildBar(b: VigilBar, r: Room, open: boolean) {
  const m = middle(r, b), [w, h] = b.size ?? [1, 1], built = barLook(b.school, b.side === 'n' || b.side === 's' ? w : h, r.look, open);
  const face = { n: { x: m.x, z: r.bounds.minZ }, s: { x: m.x, z: r.bounds.maxZ }, w: { x: r.bounds.minX, z: m.z }, e: { x: r.bounds.maxX, z: m.z } }[b.side];
  built.group.position.set(face.x - r.cx, 0, face.z - r.cz); built.group.rotation.y = FACE_TURN[b.side];
  r.group.add(built.group);
  return built;
}
/** The wall a piece stands against (the north one, for those on its first row), if any. */
const wallOf = (_r: Room, p: Pick<VigilPiece, 'at' | 'kind'>): 'n' | null => p.at[1] === 0 && p.kind !== 'boat' ? 'n' : null;
/** The candles the candle wall burns: one for the mage's own once it has woken here (each shade freed lights one more,
    step 9). */
export const litCandles = () => (vigil().candle ? 1 : 0) + vigil().freed.length; // (M7 step 6: each shade freed lights one more)

/** The mage has woken in the Crypt (flow.ts placed it): the Vigil's name, and on the first waking the dark, then its first
    candle lighting itself. */
export function wokeAtVigil() {
  if (!here) return;
  banner(STR.vigil.name, STR.vigil.rooms.crypt[1]);
  if (!here.first) { line(STR.vigil.wake, 4); return; }
  setDarkness(1, true);
  after(C().candleAt, () => {
    if (!here) return;
    lightCandle(); here.candles.setLit(litCandles()); refreshCandleLight();
    const w = here.candles.group.getWorldPosition(new THREE.Vector3());
    Sfx.at(w.x, w.z + .6).kindle(); burst(w.x, .8, w.z + .5, 0xffc870, 10, 1.2, .04);
    line(STR.vigil.firstWake, 5);
  });
  after(C().candleAt + C().dawn, () => { if (here) setDarkness(0); });
}
function refreshCandleLight() {
  for (const r of G.rooms) for (const t of r.torches) if (t.flame.userData.piece === 'candleWall') t.lit = !!here && here.candles.lit > 0;
}

/** Each step at the Vigil: the veil stirs, the Ferryman watches, and what the mage walks up to answers. */
export function updateVigil(dt: number) {
  if (!here) return;
  renderVigilHud();
  updateTalk(dt); updateTown(dt, G.state === 'play' && !G.trans);
  updateUnfold(dt); // (M7 step 9) // (M7 step 7: the townspeople, even while one talks)
  if (G.state !== 'play') return;
  const h = here, room = G.current; h.t += dt;
  for (const v of h.veils) moveVeil(v, h.t);
  const b = h.boat, toMage = room === b.room ? Math.atan2(player.x - (b.x + .88), player.z - b.z) : null;
  moveFerryman(b.look, h.t, toMage === null ? null : toMage);
  if (!h.seen.has(room)) { // (each room's name, the first time it is entered this waking)
    h.seen.add(room);
    const name = VIGIL.rooms[G.rooms.indexOf(room)]?.name as keyof typeof STR.vigil.rooms | undefined;
    if (name && name !== 'crypt') banner(...STR.vigil.rooms[name]);
  }
  // the lectern: walked up to, its screen opens (once, until the mage steps away)
  const L = h.lectern, dl = Math.hypot(player.x - L.x, player.z - L.z);
  if (room === L.room && dl < C().lecternReach && L.armed) { L.armed = false; vigilActs.openLectern(); }
  else if (dl > C().lecternReach + C().rearm) L.armed = true;
  // the boat: stepped into from the jetty's end
  if (room === b.room && !b.boarded && Math.hypot(player.x - b.step.x, player.z - b.step.z) < C().boatReach) board();
  // a barred way says what bars it, once a waking
  for (const bar of h.bars) if (!bar.open && !bar.said && room === bar.room && Math.hypot(player.x - bar.x, player.z - bar.z) < C().barReach) { bar.said = true; line(STR.vigil.bars[bar.school], 5); }
  if (!h.circle.said && room === h.circle.room && Math.hypot(player.x - h.circle.x, player.z - h.circle.z) < h.circle.r) { h.circle.said = true; line(STR.vigil.circle, 4.5); }
}

let shown = '';
/** The Vigil's HUD: what is kept between descents (the Arcane Dust, the obols), redrawn when it changes. */
function renderVigilHud() {
  const v = vigil(), H = STR.vigil.hud, key = v.dust + ':' + v.obols; if (key === shown) return; shown = key;
  document.getElementById('vigilHud')!.innerHTML = `<span><b>${v.dust}</b><small>${H.dust}</small></span><span><b>${v.obols}</b><small>${H.obols}</small></span>`;
}

/** Step into the Ferryman's boat: his line, then down to the first floor (flow.ts). */
export function board() {
  if (!here || here.boat.boarded) return;
  here.boat.boarded = true; Sfx.at(here.boat.x, here.boat.z).boat();
  line(STR.vigil.boat, C().boatDelay + 1);
  after(C().boatDelay, () => { if (atVigil()) vigilActs.board(); });
}

/** A bolt or beam of the mage's struck a barred way: its own school opens it (M7 step 9; before, it only stirred). */
vigilHooks.barStruck = (rock, x, z, status, beam) => {
  const school = rock.bar, by = beam ?? schoolOf(status); if (!here || !school) return;
  const bar = here.bars.find(b => b.school === school);
  if (!bar || bar.open) return;
  if (by === school) { openWay(bar); return; }
  if (by && !bar.stirred) { bar.stirred = true; burst(x, .8, z, SCHOOL_LIGHT[by], 6, 1, .03); Sfx.at(x, z).wardTink(); line(STR.vigil.unmoved, 3.5); } // (another school: it holds)
};
/** A school landing at the Vigil (a seal's fire, the ice wall's frost, holy ground, the grasp's dark, the thorns): a way
    barred by it, within reach, opens. */
hearLanding((school, x, z, r) => {
  if (!here || school === 'blast') return;
  for (const bar of here.bars) if (!bar.open && bar.school === school && bar.room === G.current && Math.hypot(bar.x - x, bar.z - z) < C().barCatch + r) openWay(bar);
});
/** A barred way opens: its look as its school left it, its tiles free, the wall filling its doorway gone (both sides), the
    room behind it known; kept in the save. Nothing silent: a burst in its light, its sound, its line. */
function openWay(bar: Bar) {
  if (bar.open || !here) return;
  bar.open = true; openPart(bar.school);
  const r = bar.room;
  r.rocks = r.rocks.filter(k => (k as RockBox).bar !== bar.school);
  const veil = bar.look.userData.parts?.veil as THREE.Mesh | undefined; if (veil) here.veils = here.veils.filter(v => v !== veil);
  bar.look.removeFromParent(); disposeTree(bar.look);
  bar.look = buildBar(bar.def, r, true).group;
  const d = r.doors.filter(o => o.plug).sort((a, b) => Math.hypot(a.x - bar.x, a.z - bar.z) - Math.hypot(b.x - bar.x, b.z - bar.z))[0];
  if (d) { unplugDoor(d); d.nb.known = true; }
  const light = SCHOOL_LIGHT[bar.school];
  burst(bar.x, .9, bar.z, light, 26, 2.4, .06); burst(bar.x, .4, bar.z, 0xfff2d0, 10, 1.4, .05);
  Sfx.at(bar.x, bar.z).wayOpens(); G.shake = Math.max(G.shake, .18);
  line(STR.vigil.opened[bar.school], 6);
}
/** The dev menu: a way opened at once (where the mage is or not). */
export function openWayNow(school: School) { const bar = here?.bars.find(b => b.school === school); if (bar) openWay(bar); else openPart(school); }

/** Leave the Vigil (a floor is built): forget it. */
export function leaveVigil() { closeTalk(); clearTown(); clearUnfold(); here = null; shown = ''; setAtVigil(false); }

/** For the dev menu and the tests: where the mage is, the candles lit, the lectern and boat. */
export function vigilInfo() {
  if (!here) return { here: false as const };
  const name = VIGIL.rooms[G.rooms.indexOf(G.current)]?.name ?? null;
  return {
    here: true as const, room: name, first: here.first, candles: here.candles.lit, slots: [...player.spells],
    lectern: { x: here.lectern.x, z: here.lectern.z }, boat: { x: here.boat.step.x, z: here.boat.step.z, boarded: here.boat.boarded },
    bars: here.bars.map(b => ({ school: b.school, x: b.x, z: b.z, said: b.said, stirred: !!b.stirred, open: b.open })), parts: [...vigil().parts], circle: { x: here.circle.x, z: here.circle.z, r: here.circle.r },
  };
}
/** Where the mage wakes, in the world (the Crypt, beside the bier). */
export function wakePoint() {
  const r = G.rooms[roomIndex(VIGIL, VIGIL.wake.room)];
  return { room: r, ...at(r, VIGIL.wake.at[0], VIGIL.wake.at[1]) };
}
export type { VigilBar };
