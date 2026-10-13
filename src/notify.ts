/* What the simulation tells the player, under the names the UI's own functions have: each is a thin emitter on the game's
   bus (events.ts) carrying exactly its arguments, and the UI (ui/hud.ts' `initHud`, ui/lore.ts' `initLore`) hears it at
   once and draws. So world, actors, magic, items, combat, progression, vigil and flow say what happened without importing
   src/ui/. The defaults (a toast's three seconds, a banner's empty subtitle) stay with the UI. */
import type { Enemy, LoreEntry, LoreItem } from './types';
import type { ArtifactDef } from './items/artifactData';
import { G } from './state';
import { emit } from './events';

/** A short line at the bottom of the screen for `dur` seconds, cutting short the one showing. */
export const toast = (msg: string, dur?: number) => emit('toast', { msg, dur });
/** A first-time line: shown now, or after the one showing, never cutting it short. */
export const line = (msg: string, dur?: number) => emit('line', { msg, dur });
/** Drop the lines waiting and the one showing. */
export const clearLines = () => emit('linesCleared');
/** The big title and subtitle across the screen (a room, a floor, a boss). */
export const banner = (title: string, sub?: string, dur?: number) => emit('banner', { title, sub, dur });
/** The hearts and soul motes changed. */
export const renderHearts = () => emit('heartsChanged');
/** A new run: the hearts are drawn again whatever they were. */
export const resetHearts = () => emit('heartsReset');
/** The rooms known, or what is in them, changed: the minimap again. */
export const renderMinimap = () => emit('mapChanged');
/** The spells in the slots, or their runes, changed. */
export const renderSpells = () => emit('spellsChanged');
/** Obols, keys or glyphs changed. */
export const renderPurse = () => emit('purseChanged');
/** The artifacts held changed. */
export const renderItems = () => emit('itemsChanged');
/** A refused cast: on cooldown, short of mana, or with nothing to aim at. */
export const flashMana = (slot: number, why: 'cooldown' | 'mana' | 'target') => emit('castRefused', { slot, why });
/** The mage was hurt: the screen's edge flashes red. */
export const flashHurt = () => emit('hurt');
/** A boss's bar comes up with its name. */
export const showBossBar = (name: string, foe: Pick<Enemy, 'hp' | 'maxHp'>) => emit('bossBarShown', { name, foe });
/** The boss's health changed. */
export const updateBossBar = (foe: Pick<Enemy, 'hp' | 'maxHp'>) => emit('bossHealth', { foe });
/** The boss bar goes. */
export const hideBossBar = () => emit('bossBarHidden');
/** Marks on the boss bar at these shares of its health (Kaelith's phases). */
export const bossBarMarks = (at: readonly number[]) => emit('bossBarMarks', { at });
/** A question that stays up until answered or walked away from (a chained shade's). */
export const showPrompt = (html: string) => emit('promptShown', { html });
export const hidePrompt = () => emit('promptHidden');
/** Cut to black and fade back in, to cover building a new floor. */
export const fadeFromBlack = () => emit('fadeFromBlack');

/** A lore card: what something taken is, for a few seconds. */
export const showLore = (entry: LoreEntry) => emit('loreShown', { entry });
/** An artifact taken: its card, every time. */
export const artifactLore = (def: ArtifactDef) => emit('artifactLore', { def });
/** An item or container taken or opened: its card the first time in a run (the run remembers what it has described). */
export function itemLore(item: LoreItem) {
  if (G.run.loreSeen.has(item)) return;
  G.run.loreSeen.add(item);
  emit('itemLore', { item });
}
/** A new run: no card left over. */
export const hideLore = () => emit('loreHidden');
/** The potion belt changed (a potion taken, drunk, moved, identified). */
export const renderBelt = () => emit('beltChanged');
/** Insight or the levels waiting changed: the strip under the mana bar and the level badge. */
export const renderInsight = () => emit('insightChanged');
