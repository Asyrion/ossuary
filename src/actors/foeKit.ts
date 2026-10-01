/* What every foe's behaviour is written against (M4, actors/foes.ts; M4.5's bestiary, actors/bestiaryFoes.ts): the shape of
   a behaviour, where the mage is from the foe, and reading its parameters. */
import type { Enemy, Room } from '../types';
import { SCHOOL_LIGHT } from '../render/arcane';
import { rand } from '../util';
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
      Ember meeting Frost), or a shock running through it. Any build can bring a water foe up. */ driven?(e: Enemy, P: Params, why: 'blast' | 'steam' | 'shock'): void;
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
