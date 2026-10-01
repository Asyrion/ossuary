/* What every foe's behaviour is written against (M4, actors/foes.ts; M4.5's bestiary, actors/bestiaryFoes.ts): the shape of
   a behaviour, where the mage is from the foe, and reading its parameters. */
import type { Enemy, Room } from '../types';
import { SCHOOL_LIGHT } from '../render/arcane';
import { rand } from '../util';
import type { FoeDef } from './foeData';
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
  /** A blow lands on it, travelling (dx, dz): how much of `dmg` it takes (a void mote swallows the cantrip's bolts, a
      mantis parries from the front). */ struck?(e: Enemy, dmg: number, by: Enemy['lastHit'], P: Params, dx: number, dz: number): number;
  /** A glyph's blast reaches it (M4.5: a rubble crab is flipped on its back). */ blasted?(e: Enemy, P: Params): void;
  /** A status landed on it (or, on an elemental, was drunk), even while it can't act (a walking wave freezes to a chill and
      its ice shatters to a shock). */ afflicted?(e: Enemy, kind: SpellStatus, P: Params): void;
}
export const num = (v: number | number[]) => v as number, span = (v: number | number[]) => rand(...(v as [number, number]));
/** A foe's school's light. */
export const light = (e: Enemy) => SCHOOL_LIGHT[e.foe!.school];
