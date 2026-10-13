/* The foe acting now (M4.7): set while a foe's behaviour steps or falls (foes.ts) or its mantle acts (mantles.ts), so what
   it leaves on the floor (webs, ink, rime, burning ground, sparks, spores) knows whose it is, and spares its own kind
   (actors/foeGround.ts), and what it throws carries its mantle (a champion's shots, combat/projectiles.ts). */
import type { Enemy } from '../types';

let now: Enemy | undefined;
/** `e` acts from now until `actAs()` (none). */
export function actAs(e?: Enemy) {
  now = e;
}
/** The foe acting now, if any. */
export const actor = () => now;
/** The kind of foe acting now (its id in data/foes.json), if any: its ground spares its own kind. */
export const actingKind = (): string | undefined => now?.foe?.id;
