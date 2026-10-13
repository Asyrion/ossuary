/* Chained shades in a run (M7 step 6; docs/M7-plan.md, decision 10; the pure rules in shadeData.ts). About one a floor, on
   the run's own stream (`'shades' + floor`), so a seed keeps its floors: a shade lies chained in a secret room, a library or a
   vault from the first, and at an ordeal's end or in a boss's keeping once the fight there is won. The mage meeting it
   draws its chains' schools from what it can land then (its spells that reach a spot, the cantrip's statuses, a brazier in
   the room); each chain breaks to its school landing on it (a bolt or beam striking the shade, a school landing beside it:
   `vigilHooks.shadeStruck`, `landed`), a plain one to anything the mage casts, any one to a glyph's blast. All broken, the
   mage standing by it is asked: Q frees it (it rises to the Vigil in a column of light, kept at once), E binds it (it walks
   with the mage through the next run, vigil/shadeHelp.ts). Nothing silent: a line when it is first seen and how to break
   its chains (once a run), "Broken" over each chain, a line when it is loose, the question, and a line as it goes. */
import * as THREE from 'three';
import type { Room, RockBox } from '../types';
import { CFG } from '../config';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { Rng } from '../rng';
import { SCHOOL_LIGHT } from '../render/arcane';
import { disposeTree } from '../render/materials';
import { burst } from '../combat/fx';
import { floatText } from '../magic/statusFx';
import { hidePrompt, line, showPrompt } from '../notify';
import { freeSpotNear } from '../world/rooms';
import { shaftLook } from '../world/daylightLooks';
import { SPELLS, type School } from '../magic/spellData';
import { emberCantrip } from '../items/potionFx';
import { bindShade, freeShade, vigil } from './save';
import { breaks, chainCount, chainSchools, pickShade, shade, shadeRoom } from './shadeData';
import { chainedShadeLook } from './shadeLooks';
import { hearLanding, vigilHooks } from './where';
import { giftOnFree } from './gifts';

const C = () => CFG.shades;
/** The shapes of spell that land on a spot (and so can strike a chain): not those that seek a foe or stay on the mage. */
const LANDS = new Set(['beam', 'placed', 'shotgun', 'wall', 'zone', 'bolt', 'grasp']);
type State = 'waiting' | 'chained' | 'loose' | 'freeing' | 'binding' | 'gone';
interface Chain {
  ward: School | null;
  broken: boolean;
  look: ReturnType<typeof chainedShadeLook>['chains'][number];
}
interface Chained {
  id: string;
  room: Room;
  x: number;
  z: number;
  state: State;
  t: number;
  asking: boolean;
  look: ReturnType<typeof chainedShadeLook> | null;
  chains: Chain[];
  rock: RockBox | null;
  column: THREE.Group | null;
}
let here: Chained | null = null;
const name = (id: string) => STR.shades.names[id] ?? id;

/** The schools the mage can land now: its spells that reach a spot, its cantrip's statuses, and Ember where the room has a
    brazier (a bolt through its fire burns). */
export function landable(room: Room): School[] {
  const out: School[] = [];
  for (const id of player.spells) {
    const d = id ? SPELLS.get(id) : undefined;
    if (d && LANDS.has(d.shape)) out.push(d.school);
  }
  const fx = player.stats.effects;
  if (fx.has('emberBolts') || emberCantrip()) out.push('ember');
  if (fx.has('frostbite')) out.push('frost');
  if (fx.has('antler')) out.push('hallow');
  if ((room.props ?? []).some((b) => b.prop.kind === 'brazier')) out.push('ember');
  return out;
}

/** A new floor: where its shade lies, if it has one (none at the Vigil, on a fixed level or a test room). */
export function placeShade(floor: number, chance: number) {
  clearShade();
  const rng = Rng.from(G.run.seed, 'shades' + floor),
    rnd = () => rng.next();
  const skip = [...G.run.shadesMet, ...G.run.walking],
    id = pickShade(floor + 1, chance, vigil().freed, skip, rnd);
  if (!id) return;
  const at = shadeRoom(
    G.floor.rooms.map((r) => ({ id: G.floor.rooms.indexOf(r), type: r.type })),
    rnd,
  );
  if (at === null) return;
  layShade(id, G.floor.rooms[at]);
}
/** A shade chained in `room` (the dev menu's "here" puts one beside the mage). */
export function layShade(id: string, room: Room, x?: number, z?: number) {
  clearShade();
  const p =
    x !== undefined && z !== undefined
      ? { x, z }
      : freeSpotNear(room, room.cx + room.w * C().at[0], room.cz + room.h * C().at[1]);
  here = {
    id,
    room,
    x: p.x,
    z: p.z,
    state: 'waiting',
    t: 0,
    asking: false,
    look: null,
    chains: [],
    rock: null,
    column: null,
  };
  G.run.shadesMet = [...G.run.shadesMet, id];
}

/** Bring it forth: its chains drawn from what the mage can land now, its look and its body (bolts strike it). */
function appear(s: Chained) {
  const wards = chainSchools(landable(s.room), chainCount(G.run.floor + 1), mulberryOf(s));
  s.look = chainedShadeLook(shade(s.id).light, wards);
  s.look.group.position.set(s.x - s.room.cx, 0, s.z - s.room.cz);
  s.room.group.add(s.look.group);
  s.chains = wards.map((ward, i) => ({ ward, broken: false, look: s.look!.chains[i] }));
  s.rock = { x: s.x, z: s.z, hx: 0.32, hz: 0.32, hp: 0, breakable: false, shade: true };
  s.room.rocks.push(s.rock);
  s.state = 'chained';
  s.t = 0;
  Sfx.at(s.x, s.z).chainRattle();
  line(STR.shades.found(name(s.id)), 4.5);
  if (!G.run.hinted.has('shades')) {
    G.run.hinted.add('shades');
    line(STR.shades.howTo, 6);
  }
}
const mulberryOf = (s: Chained) => {
  const r = Rng.from(G.run.seed, 'chains' + s.id);
  return () => r.next();
};

/** A chain struck by `school` (a bolt's or beam's, a school landing within `r` of it, or a glyph's blast): those it breaks
    break. `one`: a single blow (a bolt), which breaks the first chain it can. */
function strike(school: School | 'blast' | undefined, x: number, z: number, r: number, one: boolean) {
  const s = here;
  if (!s || s.state !== 'chained' || G.room.current !== s.room) return;
  if (Math.hypot(x - s.x, z - s.z) > C().reach + r) return;
  for (const c of s.chains) {
    if (c.broken || !breaks(c.ward, school)) continue;
    c.broken = true;
    c.look.group.visible = false;
    const w = c.look.lock.getWorldPosition(new THREE.Vector3());
    burst(w.x, w.y + 0.1, w.z, c.ward ? SCHOOL_LIGHT[c.ward] : 0xc0bcb0, 12, 1.6, 0.04);
    Sfx.at(w.x, w.z).chainSnap();
    floatText(w.x, 0.9, w.z, STR.shades.broken, c.ward ? SCHOOL_LIGHT[c.ward] : 0xe0dcd0);
    if (one) break;
  }
  if (s.chains.every((c) => c.broken)) {
    s.state = 'loose';
    line(STR.shades.loose(name(s.id)), 5);
    Sfx.at(s.x, s.z).shadeLoose();
  }
}
vigilHooks.shadeStruck = (x, z, school) => strike(school, x, z, 0, true);
hearLanding((school, x, z, r) => strike(school, x, z, r, false));

/** Each step: the shade comes forth once its room is won and the mage is there; loose, it asks the mage standing by it; it
    goes as it was answered. */
export function updateShades(dt: number) {
  const s = here;
  if (!s) return;
  s.t += dt;
  if (s.state === 'waiting') {
    if (G.room.current === s.room && s.room.cleared && G.flow.state === 'play' && !G.flow.trans) appear(s);
    return;
  }
  if (!s.look) return;
  s.look.figure.position.y =
    s.state === 'chained' || s.state === 'loose' ? Math.sin(s.t * 1.6) * 0.02 : s.look.figure.position.y;
  s.look.aura.material.opacity = 0.35 + Math.sin(s.t * 2.2) * 0.1;
  if (s.state === 'loose') {
    const near = G.room.current === s.room && Math.hypot(player.x - s.x, player.z - s.z) < C().ask;
    if (near && !s.asking) {
      s.asking = true;
      const k = STR.controls.spellsKeys.split(' and ');
      showPrompt(STR.shades.ask(name(s.id), k[0], k[1]));
    } else if (!near && s.asking) {
      s.asking = false;
      hidePrompt();
    }
  } else if (s.state === 'freeing') {
    // it rises in its column of light and fades
    const k = Math.min(1, s.t / C().rise);
    s.look.figure.position.y = k * 2.2;
    s.look.mat.opacity = 0.62 * (1 - k);
    s.look.aura.material.opacity = 0.5 * (1 - k);
    if (k >= 1) gone(s);
  } else if (s.state === 'binding') {
    // it shrinks and goes to the mage
    const k = Math.min(1, s.t / C().bindTime),
      g = s.look.group;
    g.position.set(s.x - s.room.cx + (player.x - s.x) * k, k * 1.1, s.z - s.room.cz + (player.z - s.z) * k);
    g.scale.setScalar(1 - k * 0.7);
    if (k >= 1) gone(s);
  }
}
function gone(s: Chained) {
  s.state = 'gone';
  if (s.look) {
    s.room.group.remove(s.look.group);
    disposeTree(s.look.group);
    s.look = null;
  }
  if (s.column) {
    s.room.group.remove(s.column);
    disposeTree(s.column);
    s.column = null;
  }
}
function unblock(s: Chained) {
  if (s.rock) {
    const i = s.room.rocks.indexOf(s.rock);
    if (i >= 0) s.room.rocks.splice(i, 1);
    s.rock = null;
  }
}

/** Q or E while it asks (before a cast): Q frees it, E binds it. True when it answered. */
export function answerShade(slot: number) {
  const s = here;
  if (!s || !s.asking) return false;
  s.asking = false;
  hidePrompt();
  if (slot === 0) freeIt();
  else bindIt();
  return true;
}
/** Free it: it rises to the Vigil in a column of light, kept at once (even if the run ends in death). */
export function freeIt() {
  const s = here;
  if (!s || (s.state !== 'loose' && s.state !== 'chained') || !s.look) return false;
  for (const c of s.chains) {
    c.broken = true;
    c.look.group.visible = false;
  }
  s.state = 'freeing';
  s.t = 0;
  unblock(s);
  const col = shaftLook();
  col.group.position.set(s.x - s.room.cx, 0, s.z - s.room.cz);
  s.room.group.add(col.group);
  s.column = col.group;
  freeShade(s.id);
  G.run.freed = [...G.run.freed, s.id];
  giftOnFree(s.id); // (M7 step 8: its gift, at once)
  Sfx.at(s.x, s.z).shadeFree();
  line(STR.shades.freed(name(s.id)), 5);
  return true;
}
/** Bind it: it walks with the mage through the next run, then slips back into its chains somewhere below. */
export function bindIt() {
  const s = here;
  if (!s || (s.state !== 'loose' && s.state !== 'chained') || !s.look) return false;
  for (const c of s.chains) {
    c.broken = true;
    c.look.group.visible = false;
  }
  s.state = 'binding';
  s.t = 0;
  unblock(s);
  bindShade(s.id);
  Sfx.at(s.x, s.z).shadeBind();
  line(STR.shades.bound(name(s.id), STR.shades.helps[shade(s.id).help]), 6);
  return true;
}

/** Forget it (a new floor, the Vigil). */
export function clearShade() {
  if (here) {
    if (here.asking) hidePrompt();
    unblock(here);
    gone(here);
  }
  here = null;
}

/** The dev menu's and the tests' hand on it: where it lies, its chains, its state; break them all. */
export function shadeInfo() {
  const s = here;
  if (!s) return null;
  return {
    id: s.id,
    name: name(s.id),
    room: s.room.plan.id,
    type: s.room.type,
    x: s.x,
    z: s.z,
    state: s.state,
    asking: s.asking,
    chains: s.chains.map((c) => ({ ward: c.ward, broken: c.broken })),
  };
}
export function breakAllChains() {
  const s = here;
  if (!s || s.state !== 'chained') return false;
  strike('blast', s.x, s.z, 0, false);
  return true;
}
