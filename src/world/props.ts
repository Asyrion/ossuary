/* The rooms' objects in play (docs/archive/M3.6-plan.md): bone piles, skull heaps, grave sacks, oil casks, rubble,
   grave roots, thorn briars, cobwebs, glowcaps and pews. What each is and how it blocks is in propData.ts; this is
   how they look and what the mage's magic does to them:
   - a bolt breaks bone piles, skull heaps (two), grave sacks, oil casks and glowcaps; a glyph's blast breaks those,
     clears rubble and tears briars and cobwebs away;
   - piles leave the poorer `remains` loot, sacks spill a `bundle`; a cask spills a pool of oil; a glowcap bursts into
     a cloud of spores that flashes when fire finds it;
   - fire (anything that calls `fireAt`) burns roots, briars, cobwebs and sacks away, and it spreads between them;
   - cobwebs slow whoever walks through them; briars sting the mage and walking foes.
   Their looks are the room kit's, in objectLooks.ts, and the mechanisms' in mechanisms.ts. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { PropBox, PropState, Room, RockBox, SporeCloud } from '../types';
import { G, after, player } from '../state';
import { Sfx } from '../audio/sfx';
import { disposeTree, glow, mergeStill } from '../render/materials';
import { addDecal, burst } from '../combat/fx';
import { damageEnemy, hurtPlayer } from '../combat/damage';
import { inflict } from '../magic/statusFx';
import { riseMote } from '../magic/shapes';
import { ringFx } from '../magic/spellFx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { LOOT, rollTable } from '../items/loot';
import { objectReagent } from '../items/reagents';
import { JELLY } from './labLooks';
import { globeBurst } from './laboratory';
import { soulsHere } from '../items/souls';
import { spawnPickup } from '../items/pickups';
import { mulberry } from '../util';
import { PROPS, isMechanism, type PropKind } from './propData';
import { MECH_LOOKS, elementAt, strikeMechanism } from './mechanisms';
import type { SpellStatus } from '../magic/spellData';
import { addPool, fireAt } from './pools';
import { scrollsBroken } from './themes';
import { OBJECT_LOOKS, burningFire } from './objectLooks';
import { addPit, freeSpotNear, isFreeAt, openChasm } from './rooms';
import { actingKind } from '../actors/acting';
import { counterAt } from '../actors/counters';
import { boonActs, boonParam } from '../progression/boonHooks';

const P = CFG.props;
const FIRE = 0xff7a2a,
  EMBER = 0xffc060,
  SPORE = 0x9fe8b0,
  BONE = 0xd8ccb2,
  PETAL = 0xf0a8c8,
  POLLEN = 0xf0e890;

/* ---------- building ---------- */

const worldOf = (room: Room, c: number, r: number) => ({
  x: room.bounds.minX + c + 0.5,
  z: room.bounds.minZ + r + 0.5,
});

/** The objects in a room's template: pews side by side join into one, and a rope bridge's tiles, across or down,
    into one over the chasm drawn under it. */
export function buildProps(room: Room) {
  const t = room.template;
  for (let r = 0; r < t.h; r++)
    for (let c = 0; c < t.w; c++) {
      const kind = t.tiles[r][c] as PropKind;
      if (!(kind in PROPS)) continue;
      if (kind === 'bridge') addPit(room, c, r, false); // (the chasm's dark under it; it falls open when the bridge burns)
      const long = kind === 'pew' || kind === 'boat' || kind === 'bridge'; // (a run of them is one long pew, one boat, one bridge)
      if (long && t.tiles[r][c - 1] === kind) continue; // part of the one begun to its left
      const down =
        kind === 'bridge' &&
        t.tiles[r][c + 1] !== kind &&
        (t.tiles[r + 1]?.[c] === kind || t.tiles[r - 1]?.[c] === kind);
      if (down && t.tiles[r - 1]?.[c] === kind) continue; // part of the one begun above it
      let len = 1;
      if (long) while ((down ? t.tiles[r + len]?.[c] : t.tiles[r][c + len]) === kind) len++;
      addProp(room, kind, c, r, len, down);
    }
}

/** An object on tile (c, r) (a pew `len` tiles long from there; a rope bridge that long across, or `down`). */
export function addProp(room: Room, kind: PropKind, c: number, r: number, len = 1, down = false) {
  const def = PROPS[kind],
    R = mulberry(c * 97 + r * 13 + room.plan.seed);
  const a = worldOf(room, c, r),
    x = a.x + (down ? 0 : (len - 1) / 2),
    z = a.z + (down ? (len - 1) / 2 : 0);
  const mesh = isMechanism(kind) ? MECH_LOOKS[kind](R, len, room.look) : OBJECT_LOOKS[kind](R, len, room.look);
  mergeStill(mesh); // a few draw calls, not a dozen
  mesh.position.set(x - room.cx, 0, z - room.cz);
  if (down) mesh.rotation.y = Math.PI / 2;
  room.group.add(mesh);
  const tiles = Array.from({ length: len }, (_, i) => (down ? { c, r: r + i } : { c: c + i, r }));
  for (const tl of tiles) room.template.tiles[tl.r][tl.c] = kind;
  const prop: PropState = {
    kind,
    hits: def.hits,
    burning: 0,
    tiles,
    mesh,
    parts: mesh.userData.parts as PropState['parts'],
    ward: mesh.userData.ward as PropState['ward'],
  };
  const half =
    kind === 'cask'
      ? 0.3
      : kind === 'roots'
        ? 0.42
        : kind === 'candles' || kind === 'wetCandles'
          ? 0.22
          : kind === 'lodestone' || kind === 'rune' || kind === 'obelisk'
            ? 0.32
            : kind === 'bell'
              ? 0.45
              : 0.38;
  const long = len > 1 ? len / 2 - 0.06 : half,
    wide = kind === 'pew' ? 0.3 : kind === 'boat' ? 0.34 : kind === 'bridge' ? 0.45 : half;
  const box: PropBox = {
    x,
    z,
    hx: down ? wide : long,
    hz: down ? long : wide,
    hp: def.hits,
    breakable: false,
    mesh,
    tile: { c, r },
    prop,
  };
  (room.props ??= []).push(box);
  if (def.class === 'hanging') {
    /* over the floor: nothing blocks, only bolts reach it (mechanisms.ts) */
  } else if (def.class === 'soft') (room.soft ??= []).push(box);
  else if (def.class === 'low' && def.hits === 0)
    (room.lows ??= []).push(box); // bolts fly over pews and rubble
  else room.rocks.push(box); // tall ones, and piles a bolt breaks
  return box;
}

/** Take an object away: its look, its box, and its tiles back to floor. */
export function removeProp(room: Room, box: PropBox) {
  room.group.remove(box.prop.mesh);
  disposeTree(box.prop.mesh);
  room.props = room.props?.filter((b) => b !== box);
  room.lows = room.lows?.filter((b) => b !== box);
  room.soft = room.soft?.filter((b) => b !== box);
  room.rocks = room.rocks.filter((b) => b !== box);
  for (const t of box.prop.tiles)
    if (room.template.tiles[t.r][t.c] === box.prop.kind) room.template.tiles[t.r][t.c] = 'floor';
}

/* ---------- what bolts and blasts do ---------- */

/** A bolt (or, with `blast`, a glyph's blast) struck an object. Returns whether it broke. */
export function strikeProp(room: Room, rock: RockBox, blast: boolean, status?: Partial<Record<SpellStatus, number>>) {
  const box = rock as PropBox,
    p = box.prop;
  if (!p || !room.props?.includes(box)) return false;
  if (status?.burn && PROPS[p.kind].burns && p.burning <= 0) ignite(room, box); // a burning bolt sets it alight
  if (isMechanism(p.kind)) {
    strikeMechanism(room, box, blast, status);
    return false;
  } // bells ring, runes charge...
  const def = PROPS[p.kind];
  if (blast ? !def.blast : !def.hits) {
    burst(box.x, 0.4, box.z, 0x8a8078, 3, 1.2, 0.04);
    return false;
  }
  if (!blast && --p.hits > 0) {
    // a skull heap loses its top skull first
    burst(box.x, 0.5, box.z, BONE, 6, 1.8, 0.045);
    Sfx.at(box.x, box.z).bones();
    p.mesh.scale.multiplyScalar(0.85);
    return false;
  }
  breakProp(room, box);
  return true;
}

function breakProp(room: Room, box: PropBox) {
  const { kind } = box.prop,
    { x, z } = box,
    def = PROPS[kind];
  removeProp(room, box);
  const sfx = Sfx.at(x, z);
  switch (kind) {
    case 'bones':
    case 'skulls':
      burst(x, 0.3, z, BONE, 12, 2.2, 0.05);
      burst(x, 0.15, z, 0x8a8278, 8, 0.8, 0.06);
      sfx.bones();
      break;
    case 'sacks':
      burst(x, 0.3, z, 0x9a8460, 10, 1.8, 0.05);
      sfx.sack();
      break;
    case 'cask':
      burst(x, 0.4, z, 0x5a3e28, 12, 2.4, 0.06);
      burst(x, 0.1, z, 0x1a1410, 8, 1.2, 0.07);
      sfx.cask();
      spillOil(room, box.prop.tiles[0]);
      break;
    case 'rubble':
      burst(x, 0.25, z, 0x6b625a, 14, 2.2, 0.08);
      burst(x, 0.15, z, 0x8a8278, 10, 1, 0.08);
      sfx.rubble();
      break;
    case 'glowcap':
      burst(x, 0.3, z, SPORE, 14, 1.4, 0.06);
      sfx.spores();
      addSpores(room, x, z);
      break;
    case 'scrolls':
      burst(x, 0.3, z, 0xd8cbaa, 12, 1.8, 0.05);
      sfx.sack();
      scrollsBroken(room, x, z);
      break;
    case 'briar':
    case 'web':
      burst(x, 0.25, z, kind === 'web' ? 0xe8e8f0 : 0x2e3a22, 8, 1.4, 0.04);
      sfx.tear();
      break;
    case 'hoard':
      burst(x, 0.3, z, 0xffd27a, 16, 2.4, 0.05);
      burst(x, 0.15, z, 0xc8a04a, 10, 1.2, 0.05);
      sfx.coin(true);
      break;
    case 'blossom':
      blossomBurst(x, z);
      break;
    case 'globe':
      burst(x, 0.7, z, JELLY, 20, 2.6, 0.06);
      burst(x, 0.5, z, 0xd8e8f0, 10, 2, 0.03);
      sfx.globeBreak();
      globeBurst(room, x, z);
      break; // (out spills a jelly or a reagent)
    default:
      burst(x, 0.3, z, 0x8a8078, 8, 1.6, 0.05);
  }
  if (def.loot)
    for (const item of rollTable(G.run.drops, def.loot, LOOT, soulsHere())) spawnPickup(item, x, z, { rise: true });
  if (!box.prop.sown) objectReagent(kind, x, z); // (now and then the reagent it held; a plant Seedfall sowed holds none)
}

/** Seedfall: a flowering plant where an overgrown foe fell, on the floor tile nearest the fall that is free (no pool,
    clear of the mage, the foes, what lies on the floor, the doors' lanes and the room's middle, where a pedestal or the
    trapdoor rises); none if no tile within `CFG.boons.sowReach` is, or the room holds `seedMax` already. At its second rank
    it bursts by itself a moment later, while the mage is still in the room. */
export function sowBlossom(room: Room, x: number, z: number) {
  const C = CFG.boons,
    K = C.sowClear;
  if ((room.props ?? []).filter((b) => b.prop.sown).length >= C.seedMax) return null;
  const c0 = Math.floor(x - room.bounds.minX),
    r0 = Math.floor(z - room.bounds.minZ),
    reach = Math.ceil(C.sowReach);
  let best: { c: number; r: number } | null = null,
    bd = Infinity;
  for (let r = r0 - reach; r <= r0 + reach; r++)
    for (let c = c0 - reach; c <= c0 + reach; c++) {
      if (room.template.tiles[r]?.[c] !== 'floor' || room.poolGrid?.[r]?.[c]) continue;
      const w = worldOf(room, c, r),
        d = Math.hypot(w.x - x, w.z - z);
      if (d > C.sowReach || d >= bd || !isFreeAt(room, w.x, w.z)) continue;
      if (
        Math.hypot(w.x - player.x, w.z - player.z) < K.mage + player.r ||
        Math.hypot(w.x - room.cx, w.z - room.cz) < K.middle
      )
        continue;
      if (room.doors.some((dr) => Math.hypot(w.x - dr.x, w.z - dr.z) < K.door)) continue;
      if (G.room.enemies.some((o) => !o.dead && !o.flying && Math.hypot(o.x - w.x, o.z - w.z) < o.r + K.foe)) continue;
      if (
        G.room.pickups.some((p) => Math.hypot(p.x - w.x, p.z - w.z) < K.item) ||
        G.room.glyphs.some((gl) => Math.hypot(gl.x - w.x, gl.z - w.z) < K.item)
      )
        continue;
      best = { c, r };
      bd = d;
    }
  if (!best) return null;
  const box = addProp(room, 'blossom', best.c, best.r);
  box.prop.sown = true;
  burst(box.x, 0.2, box.z, SCHOOL_LIGHT.verdant, 14, 1.6, 0.05);
  burst(box.x, 0.4, box.z, PETAL, 8, 1.2, 0.04);
  Sfx.at(box.x, box.z).bloom();
  boonActs('seedfall', box.x, box.z);
  const wait = boonParam('seedfall', 'burst');
  if (wait > 0)
    after(wait, () => {
      if (G.room.current === room && room.props?.includes(box)) breakProp(room, box);
    });
  return box;
}

/** A flowering plant bursts (Verdant): petals and a ring of pollen, and every foe in its reach overgrown. */
function blossomBurst(x: number, z: number) {
  const B = P.blossom;
  burst(x, 0.4, z, PETAL, 14, 1.8, 0.05);
  burst(x, 0.6, z, POLLEN, 18, 1.4, 0.04);
  ringFx(x, 0.05, z, SCHOOL_LIGHT.verdant, 0.2, B.reach, CFG.spellFx.shockwave, true);
  for (const e of G.room.enemies)
    if (!e.dead && e.spawn <= 0 && !e.hidden && Math.hypot(e.x - x, e.z - z) < B.reach + e.r)
      inflict(e, { grow: B.grow });
  Sfx.at(x, z).pollenCloud();
}

/** A broken cask's oil: its own tile and a few of the free floor tiles beside it, spreading outwards. */
function spillOil(room: Room, at: { c: number; r: number }) {
  const t = room.template.tiles,
    tiles = [at],
    seen = new Set([at.c + ',' + at.r]);
  for (let i = 0; i < tiles.length && tiles.length <= P.caskSpill; i++) {
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const c = tiles[i].c + dc,
        r = tiles[i].r + dr,
        k = c + ',' + r;
      if (seen.has(k) || tiles.length > P.caskSpill || t[r]?.[c] !== 'floor' || room.poolGrid?.[r]?.[c]) continue;
      seen.add(k);
      tiles.push({ c, r });
    }
  }
  addPool(room, 'oil', tiles);
}

/** A glyph's blast at (x, z), reach `R`: rubble is cleared, briars and cobwebs torn away and candle stands knocked
    over (piles, casks and glowcaps among the rocks break through `strikeProp`). */
export function blastProps(room: Room, x: number, z: number, R: number) {
  for (const box of [...(room.lows ?? []), ...(room.soft ?? [])]) {
    if (!PROPS[box.prop.kind].blast) continue;
    if (!(
      Math.abs(box.x - x) < box.hx + R &&
      Math.abs(box.z - z) < box.hz + R &&
      Math.hypot(box.x - x, box.z - z) < R + 0.6
    ))
      continue;
    if (isMechanism(box.prop.kind)) strikeMechanism(room, box, true);
    else breakProp(room, box); // a candle stand is knocked over
  }
}

/* ---------- fire ---------- */

/** Fire reaches (x, z) and `r` around it: what burns there catches, and glowcap spores flash. */
export function burnPropsAt(x: number, z: number, r = 0) {
  const room = G.room.current;
  elementAt('burn', x, z, r); // braziers and candles catch, runes take fire, ice round a frozen foe melts
  for (const box of room.props ?? []) {
    const p = box.prop;
    if (!PROPS[p.kind].burns || p.burning > 0) continue;
    if (Math.abs(box.x - x) < box.hx + r + 0.1 && Math.abs(box.z - z) < box.hz + r + 0.1) ignite(room, box);
  }
  for (const s of room.spores ?? []) if (Math.hypot(s.x - x, s.z - z) < P.spores.reach + r) flash(room, s);
}

function ignite(room: Room, box: PropBox) {
  const p = box.prop;
  p.burning = P.burn[p.kind] ?? 1;
  const f = new THREE.Group(),
    gl = glow(FIRE, 1.4, 0.8);
  gl.position.y = 0.35;
  f.add(burningFire(p.kind, p.tiles.length), gl);
  f.userData.fire = true; // (the kit's fire moves by itself)
  f.position.set(box.x - room.cx, 0, box.z - room.cz);
  room.group.add(f);
  p.flame = f;
  burst(box.x, 0.3, box.z, FIRE, 6, 2, 0.06);
  Sfx.at(box.x, box.z).catchFire();
}

/** A rope bridge burnt through: the chasm opens under it, and what stood on it falls. A foe is gone; the mage
    takes a heart's fall and climbs out on the nearest ledge. */
function collapse(room: Room, box: PropBox) {
  for (const t of box.prop.tiles) openChasm(room, t.c, t.r);
  for (const t of box.prop.tiles) {
    const w = worldOf(room, t.c, t.r);
    burst(w.x, 0.1, w.z, 0x6a5238, 5, 1.6, 0.05);
  }
  Sfx.at(box.x, box.z).rubble();
  for (const e of G.room.enemies)
    if (!e.dead && e.spawn <= 0 && !e.flying && !e.isBoss && standsIn(box, e.x, e.z)) {
      e.hp = Math.min(e.hp, 1);
      damageEnemy(e, 999, 0, 0, 0);
    }
  if (standsIn(box, player.x, player.z)) {
    hurtPlayer(P.fallHurt, player.x, player.z + 0.01);
    const ledge = freeSpotNear(room, player.x, player.z);
    player.x = ledge.x;
    player.z = ledge.z;
    player.vx = player.vz = 0;
  }
}

/* ---------- glowcap spores ---------- */

/** A cloud of spores at (x, z): a broken glowcap's, or a Sporeling's puff (`color` its violet, `sting` the seconds it
    dims the mage's sight who stands in it, with half a heart, once). Fire makes either flash. */
export function addSpores(room: Room, x: number, z: number, o: { color?: number; sting?: number; by?: string } = {}) {
  const g = new THREE.Group();
  g.position.set(x - room.cx, 0, z - room.cz);
  for (let i = 0; i < 5; i++) {
    const s = glow(o.color ?? SPORE, 0.9 + Math.random() * 0.6, 0.35);
    s.position.set((Math.random() - 0.5) * 1.4, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 1.4);
    g.add(s);
  }
  room.group.add(g);
  (room.spores ??= []).push({ x, z, t: P.spores.time, g, sting: o.sting, by: o.by ?? actingKind() });
}
/** Whether a cloud of stinging spores (a Sporeling's or a Puffcap's) hangs over (x, z) in the current room, not of the
    kind `who` (foes are stung by each other's spores, never their own). */
export const stingAt = (x: number, z: number, who?: string) =>
  (G.room.current.spores ?? []).some(
    (s) => s.sting && s.by !== who && Math.hypot(s.x - x, s.z - z) < P.spores.stingReach,
  );
function dropSpores(room: Room, s: SporeCloud) {
  room.group.remove(s.g);
  disposeTree(s.g);
  room.spores = room.spores?.filter((o) => o !== s);
}

/** Fire found a cloud of spores: it flashes, burning every foe in reach, and the mage too if they stand in it. */
function flash(room: Room, s: SporeCloud) {
  dropSpores(room, s);
  if (s.by) counterAt(s.by, 'flashed', s.x, s.z); // (a Sporeling's counter)
  const S = P.spores;
  for (const e of G.room.enemies) {
    if (e.dead || e.spawn > 0 || e.hidden) continue;
    const dx = e.x - s.x,
      dz = e.z - s.z,
      d = Math.hypot(dx, dz);
    if (d > S.reach + e.r) continue;
    damageEnemy(e, S.damage, d > 0.01 ? dx / d : 0, d > 0.01 ? dz / d : 0, 0.6, 'spell', 'ember');
    inflict(e, { burn: S.burn });
  }
  if (Math.hypot(player.x - s.x, player.z - s.z) < S.reach) hurtPlayer(S.mageHurt, s.x, s.z);
  burst(s.x, 0.5, s.z, FIRE, 18, 3.2, 0.07);
  burst(s.x, 0.5, s.z, SPORE, 10, 2.4, 0.05);
  for (let i = 0; i < 5; i++)
    riseMote(s.x + (Math.random() - 0.5) * 1.2, 0.3, s.z + (Math.random() - 0.5) * 1.2, EMBER, 0.5);
  Sfx.at(s.x, s.z).sporeFlash();
  G.fx.shake = Math.max(G.fx.shake, 0.15);
  fireAt(s.x, s.z, S.reach * 0.6); // and it lights what burns round it
}

/* ---------- every step ---------- */

/** How fast one can walk at (x, z): slower through cobwebs. */
export function snagAt(x: number, z: number, room = G.room.current) {
  const kind = room.template.tiles[Math.floor(z - room.bounds.minZ)]?.[Math.floor(x - room.bounds.minX)];
  return kind === 'web' ? P.webSlow : 1;
}
const standsIn = (box: PropBox, x: number, z: number) =>
  Math.abs(x - box.x) < box.hx + 0.05 && Math.abs(z - box.z) < box.hz + 0.05;

let stingT = 0,
  spreadT = 0;
export function updateProps(dt: number) {
  const room = G.room.current;
  // briars sting the mage and walking foes that push through them
  if ((stingT -= dt) <= 0) {
    stingT = 0.5;
    for (const box of room.soft ?? []) {
      if (box.prop.kind !== 'briar' || box.prop.burning > 0) continue;
      if (standsIn(box, player.x, player.z)) {
        hurtPlayer(P.briarHurt, box.x, box.z);
        Sfx.at(box.x, box.z).tear();
      }
      for (const e of G.room.enemies)
        if (!e.dead && e.spawn <= 0 && !e.hidden && !e.flying && standsIn(box, e.x, e.z))
          damageEnemy(e, P.briarDamage * 0.5, 0, 0, 0, 'spell');
    }
  }
  // burning: embers, what stands in it catches, the fire spreads, and at the end it's gone, soot in its place
  const spread = (spreadT -= dt) <= 0;
  if (spread) spreadT = P.spread;
  for (const box of (room.props ?? []).filter((b) => b.prop.burning > 0)) {
    const p = box.prop;
    if (Math.random() < dt * 8)
      riseMote(box.x + (Math.random() - 0.5) * 0.6, 0.3, box.z + (Math.random() - 0.5) * 0.6, EMBER, 0.45);
    if (spread) {
      for (const e of G.room.enemies)
        if (!e.dead && e.spawn <= 0 && !e.hidden && !e.flying && standsIn(box, e.x, e.z)) inflict(e, { burn: 1 });
      if (standsIn(box, player.x, player.z)) hurtPlayer(1, box.x, box.z);
      fireAt(box.x, box.z, 0.6);
      if (Math.random() < 0.5) Sfx.at(box.x, box.z).crackle();
    }
    if ((p.burning -= dt) <= 0) {
      if (p.flame) {
        room.group.remove(p.flame);
        disposeTree(p.flame);
      }
      for (const t of p.tiles) {
        const w = worldOf(room, t.c, t.r);
        addDecal(w.x, w.z, 0x0a0806, 0.8);
      }
      burst(box.x, 0.3, box.z, 0x2a2420, 8, 1.2, 0.06);
      removeProp(room, box);
      if (p.kind === 'bridge') collapse(room, box);
    }
  }
  // spores drift and settle
  for (const s of room.spores ?? []) {
    s.t -= dt;
    s.g.rotation.y += dt * 0.4;
    s.g.position.y = Math.sin(s.t * 2) * 0.05;
    if (s.sting && !s.stung && Math.hypot(player.x - s.x, player.z - s.z) < P.spores.stingReach) {
      // a Sporeling's spores sting, and dim the sight
      if (hurtPlayer(1, s.x, s.z)) {
        s.stung = true;
        player.dim = Math.max(player.dim, s.sting);
      } // (while the mage shrugs off blows, the cloud waits)
    }
    for (const c of s.g.children) ((c as THREE.Mesh).material as THREE.Material).opacity = 0.35 * Math.min(1, s.t);
    if (s.t <= 0) dropSpores(room, s);
  }
}

/** Dev menu: put an object down on the free tile nearest (x, z) in the current room. */
export function placeProp(kind: PropKind, x: number, z: number) {
  const room = G.room.current,
    c = Math.floor(x - room.bounds.minX),
    r = Math.floor(z - room.bounds.minZ);
  if (room.template.tiles[r]?.[c] !== 'floor') return null;
  return addProp(room, kind, c, r);
}
