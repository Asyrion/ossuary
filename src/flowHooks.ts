/* What actors and combat ask of the run's flow (flow.ts fills these when it loads): a doorway walked through, the trapdoor
   taken, a wave cleared, a boss fallen, the mage dead. A hook object, as daylight.ts' `daylightHooks`, so player.ts,
   enemies.ts and damage.ts don't import flow.ts (which imports them). */
import type { Room } from './types';

export const flowHooks = {
  /** Start the pan to the next room when the mage walks out through a doorway; true if it started. */
  tryTransition: (): boolean => false,
  /** Down the trapdoor to the next floor (or out, after the last). */
  descend: () => {},
  /** The room's wave is down: the next comes, or the room is cleared. */
  onWaveCleared: (_room: Room) => {},
  /** The floor's boss fell (at its place). */
  onBossDead: (_at?: { x: number; z: number }) => {},
  /** The run ends: won, or the mage fell. */
  endGame: (_won: boolean) => {},
};
