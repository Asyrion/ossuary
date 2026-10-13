/* Filling a room's template roles with the floor's foes, on the room's seed (pure, so the tests fill rooms as the game
   does: M6's curve is measured on it). One elite a room at most, and one pack or nest (M4.5); an ordeal deeper down gains
   waves (M4.9); some fights roll a pair (M4.7) and the pressure's one foe more (M4.9); a quiet room keeps a few of its
   weak foes. `buildRoom` (rooms.ts) places what this fills; `spawnWave` (flow.ts) sizes the packs and picks the
   champion with the two helpers below. */
import { CFG } from '../config';
import { FOES, comesMany, extraSlot, isFoe, pairRoom, pickFoe, type FoeType, type Role } from '../actors/foeData';
import type { FloorConfig, PlannedRoom } from './generate';
import type { Foe } from './templates';
import { mulberry } from '../rng';

/** A template's slot filled: the foe, the role it filled, and its tile. */
export interface Filled {
  kind: FoeType | 'boss';
  role: Foe['kind'];
  c: number;
  r: number;
}
/** The waves filled; the pair's two slots in the first wave, if one was rolled; the slot the pressure's extra foe was
    drawn beside (the extra is the first wave's last), if one was; and whether a quiet room holds a heart. */
export interface Fill {
  waves: Filled[][];
  pair?: [number, number];
  extraFrom?: number;
  quietHeart: boolean;
}

/** Fill `slots` (the template's waves) for `plan` on `floor`; `only` puts that foe in every role (`?foe=`, the dev menu),
    with no pair and no extra. The order of the draws is the game's since M4.9, so seeds replay their fights. */
export function fillRoles(plan: PlannedRoom, slots: Foe[][], floor: FloorConfig, only?: FoeType): Fill {
  const pick = mulberry(plan.seed ^ 0xf0e5),
    table = floor.foes,
    P = floor.pressure;
  let elite = false,
    pack = false;
  const fill = (f: Foe): Filled => {
    const kind: FoeType | 'boss' =
      f.kind === 'boss' ? 'boss' : (only ?? pickFoe(table, f.kind, pick, elite, pack, P.eliteMul)); // (deeper, elites come more often: M4.9)
    if (kind !== 'boss' && isFoe(kind) && FOES[kind].elite) elite = true;
    if (kind !== 'boss' && comesMany(kind)) pack = true;
    return { kind, role: f.kind, c: f.c, r: f.r };
  };
  const waves = slots.map((wv) => wv.map(fill));
  if (plan.type === 'ordeal')
    for (let k = 0; k < P.ordealWaves && slots.length; k++) waves.push(slots[slots.length - 1].map(fill)); // (an ordeal deeper down gains waves: its last, drawn afresh)
  const out: Fill = { waves, quietHeart: false };
  if (plan.variant !== 'quiet' && !only && waves[0])
    out.pair = pairRoom(waves[0], floor.pairs, table, mulberry(plan.seed ^ 0x9a17));
  if (plan.variant !== 'quiet' && plan.type !== 'boss' && !only && waves[0]) {
    // deeper floors' fights now and then gain one more walker or flier
    const wave = waves[0],
      i = extraSlot(wave, P.extra, mulberry(plan.seed ^ 0x3c1b));
    if (i >= 0) {
      wave.push({ ...wave[i], kind: pickFoe(table, wave[i].role as Role, pick, true, true) });
      out.extraFrom = i;
    }
  }
  if (plan.variant === 'quiet') {
    // none, one or two of the weak foes (walkers and fliers, never a heavy, an elite or a pack), and often a heart
    const R = mulberry(plan.seed ^ 0x51ee7);
    const weak = (waves[0] ?? []).filter(
      (f) => (f.role === 'R' || f.role === 'W') && !(isFoe(f.kind) && FOES[f.kind].elite) && !comesMany(f.kind),
    );
    for (let i = weak.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [weak[i], weak[j]] = [weak[j], weak[i]];
    }
    const keep = Math.min(weak.length, Math.floor(R() * (CFG.quiet.maxEnemies + 1)));
    out.waves = keep ? [weak.slice(0, keep)] : [];
    out.quietHeart = R() < CFG.quiet.heartChance;
  }
  return out;
}

/** The stream that sizes the packs of a room's wave (the pack's size from the room's seed). */
export const packRoll = (seed: number, wave: number) => mulberry((seed ^ 0x5ac5) + wave);
/** How many come of foe `type`: one, or a pack's size drawn from `roll`. */
export function packCount(type: string, roll: () => number) {
  const pack = isFoe(type) ? FOES[type].pack : undefined;
  return pack ? pack[0] + Math.floor(roll() * (pack[1] - pack[0] + 1)) : 1;
}
/** Which of the first wave's `n` foes (not the boss) is a champion room's champion. */
export const championIndex = (seed: number, n: number) => Math.floor(mulberry(seed)() * n);
