/* What every foe's behaviour is written against (M4, actors/foes.ts; M4.5's bestiary, actors/bestiaryFoes.ts): the shape of
   a behaviour, where the mage is from the foe, and reading its parameters. */
import type { Enemy, Room } from '../types';
import { SCHOOL_LIGHT } from '../render/arcane';
import { rand } from '../util';
import { G } from '../state';
import { CFG } from '../config';
import { blockers } from '../world/collision';
import type { FoeDef, School } from './foeData';
import type { SpellStatus } from '../magic/spellData';

/** Where the mage is from the foe: the unit direction and the distance. */
export interface Aim { ux: number; uz: number; dist: number }
export type Params = FoeDef['params'];
export interface Behaviour {
  /** Its first state and timers. */ init(e: Enemy, P: Params): void;
  /** One step: sets its velocity (and its state); returns the way it should face, if not at the mage. */
  step(e: Enemy, dt: number, a: Aim, P: Params, room: Room): number | void;
  /** After its idle: the parts it moves itself. */ pose?(e: Enemy, P: Params): void;
  /** It ran into a wall or a rock this step (`hit`), or didn't. */ bump?(e: Enemy, hit: boolean, P: Params): void;
  /** The lurker's: up out of the water. */ surface?(e: Enemy, P: Params): void;
  /** As it falls (the wickmouse's candle). */ die?(e: Enemy, P: Params): void;
  /** A blow lands on it, travelling (dx, dz), of `school` if it carries one: how much of `dmg` it takes (a void mote
      swallows the cantrip's bolts, a mantis parries from the front, a wasps' nest takes only fire). */
  struck?(e: Enemy, dmg: number, by: Enemy['lastHit'], P: Params, dx: number, dz: number, school?: School): number;
  /** A glyph's blast reaches it (M4.5: a rubble crab is flipped on its back). */ blasted?(e: Enemy, P: Params): void;
  /** Hidden in water, it is driven up out of it (2026-10-01): a glyph's blast in its water, steam over it (fire boiling it,
      Ember meeting Frost), a shock running through it, or (M4.9) a sluice draining it. Any build can bring a water foe up. */ driven?(e: Enemy, P: Params, why: 'blast' | 'steam' | 'shock' | 'sluice'): void;
  /** A status landed on it (or, on an elemental, was drunk), even while it can't act (a walking wave freezes to a chill and
      its ice shatters to a shock). */ afflicted?(e: Enemy, kind: SpellStatus, P: Params): void;
}
export const num = (v: number | number[]) => v as number, span = (v: number | number[]) => rand(...(v as [number, number]));
/** A foe's school's light. */
export const light = (e: Enemy) => SCHOOL_LIGHT[e.foe!.school];
/** How far through a wind-up of `of` seconds a foe is with `left` to go, 0 to 1 (its telegraph's swell). */
export const ramp = (left: number, of: number) => Math.min(1, 1 - left / of);
/** Straight along the foe's `dir` at `speed` (a dash, a lunge, a dive), its haste and slows on it; the way it faces. */
export function rush(e: Enemy, speed: number) { e.vx = e.dir!.x * speed * e.speedMul; e.vz = e.dir!.z * speed * e.speedMul; return Math.atan2(e.dir!.x, e.dir!.z); }
/** Slow to a stop, `k` the rate (higher, sooner). */
export function brake(e: Enemy, k: number, dt: number) { const f = Math.exp(-k * dt); e.vx *= f; e.vz *= f; }

const sides = new WeakMap<Enemy, number>();
/** The way for `e` to leap or dash `d` towards (ux, uz) without landing in stone: straight on if a walker's way is clear,
    else turned off to one side (each foe keeps to its own side, so it doesn't dither), the least turn that is clear
    (`CFG.foeWay.turns`). A leaper pressed against a tomb with the mage beyond goes round it, not into it for ever. */
export function wayRound(e: Enemy, ux: number, uz: number, d: number) {
  const solid = blockers(G.current, 'walker'), n = Math.max(2, Math.ceil(d / .2));
  const clear = (x: number, z: number) => {
    for (let i = 1; i <= n; i++) { const px = e.x + x * d * i / n, pz = e.z + z * d * i / n; if (solid.some(b => Math.abs(px - b.x) < b.hx + e.r && Math.abs(pz - b.z) < b.hz + e.r)) return false; }
    return true;
  };
  if (clear(ux, uz)) return { x: ux, z: uz };
  let side = sides.get(e); if (!side) sides.set(e, side = Math.random() < .5 ? 1 : -1);
  for (const t of CFG.foeWay.turns) for (const s of [side, -side]) {
    const c = Math.cos(t * s), sn = Math.sin(t * s), x = ux * c - uz * sn, z = ux * sn + uz * c;
    if (clear(x, z)) return { x, z };
  }
  return { x: ux, z: uz };
}
