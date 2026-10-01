/* What the potions drunk leave on the mage (M5; items/potions.ts drinks them), in a module of its own (state and data
   only) so the cantrip, a spell's cost, damage and the foes can read it without pulling in the belt and its looks. */
import { POTIONS } from './alchemyData';

/** What the drinks leave on the mage, while they last (seconds, or casts; `echo` and `giant` are on or off). A new run
    clears them all; the giant shrinks back in the next room. */
export const potionFx = { ember: 0, frost: 0, free: 0, echo: 0, giant: 0, unseen: 0, reversed: 0 };

/** What the drinks change, read where it matters: the cantrip burns (Liquid Ember); spells are free (the Bottled
    Storm); harder and slower as a giant; quicker under the Frostbrew; unseen (Shadowstep); controls reversed. */
export const emberCantrip = () => potionFx.ember > 0;
export const freeCasts = () => potionFx.free > 0;
export const giantDamageMul = () => potionFx.giant ? 1 + Number(POTIONS.giants.drink.damage) : 1;
export const potionSpeedMul = () => (potionFx.frost > 0 ? 1 + Number(POTIONS.frostbrew.drink.speed) : 1) * (potionFx.giant ? 1 - Number(POTIONS.giants.drink.speed) : 1);
export const unseen = () => potionFx.unseen > 0;
export const reversedControls = () => potionFx.reversed > 0;
/** A spell cast: one free cast spent (the Bottled Storm). */
export function spendFreeCast() { if (potionFx.free > 0) potionFx.free--; }
/** Whether this cast echoes (the Philter of Echoes): once, then it is spent. */
export function takeEcho() { const e = potionFx.echo > 0; potionFx.echo = 0; return e; }
