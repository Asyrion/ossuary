/* The game's event bus: the simulation says what happened (`emit`) and the UI listens (`on`), so the simulation imports
   nothing from src/ui/. It is synchronous on purpose: `emit` calls every listener at once, in the order they were added,
   and returns only when the last has run, so a notification lands at the same moment, and in the same order, as the
   direct call it replaced. No queue and nothing async: a listener that throws stops the emit as a direct call would. */

import type { ArtifactDef } from './items/artifactData';
import type { Enemy, LoreEntry, LoreItem } from './types';

/** A listener for one event: takes its payload (nothing for an event without one). */
export type Listener<P> = (payload: P) => void;
/** The arguments `emit` takes for an event: its payload, or none when the payload is `void`. */
type Args<P> = [P] extends [void] ? [] : [payload: P];

export interface Bus<E> {
  /** Listen to `name`; returns a function that stops listening. */
  on: <K extends keyof E>(name: K, fn: Listener<E[K]>) => () => void;
  /** Call every listener of `name` now, in the order they were added. */
  emit: <K extends keyof E>(name: K, ...args: Args<E[K]>) => void;
}

/** A bus over the event map `E` (event name to payload type). */
export function createBus<E>(): Bus<E> {
  const lists = new Map<keyof E, Listener<never>[]>();
  return {
    on: (name, fn) => {
      let list = lists.get(name);
      if (!list) lists.set(name, (list = []));
      list.push(fn);
      return () => {
        const i = list.indexOf(fn);
        if (i >= 0) list.splice(i, 1);
      };
    },
    emit: (name, ...args) => {
      const list = lists.get(name);
      if (!list) return;
      // (a listener that stops listening mid-emit doesn't make the next one be skipped)
      for (const fn of list.length > 1 ? list.slice() : list) (fn as Listener<unknown>)(args[0]);
    },
  };
}

/** The game's events, by name, with their payloads: who emits each and who listens is in docs/architecture.md (Events and
    the panel door). */
export interface GameEvents {
  /* ---- the HUD (notify.ts emits them under the HUD's old names; ui/hud.ts listens) ---- */
  toast: { msg: string; dur?: number };
  line: { msg: string; dur?: number };
  linesCleared: void;
  banner: { title: string; sub?: string; dur?: number };
  heartsChanged: void;
  heartsReset: void;
  mapChanged: void;
  spellsChanged: void;
  purseChanged: void;
  itemsChanged: void;
  castRefused: { slot: number; why: 'cooldown' | 'mana' | 'target' };
  hurt: void;
  bossBarShown: { name: string; foe: Pick<Enemy, 'hp' | 'maxHp'> };
  bossHealth: { foe: Pick<Enemy, 'hp' | 'maxHp'> };
  bossBarHidden: void;
  bossBarMarks: { at: readonly number[] };
  promptShown: { html: string };
  promptHidden: void;
  fadeFromBlack: void;
  /* ---- the lore card (notify.ts; ui/lore.ts listens) ---- */
  loreShown: { entry: LoreEntry };
  artifactLore: { def: ArtifactDef };
  /** An item or container described, the first time in a run (notify.ts keeps the run's count). */
  itemLore: { item: LoreItem };
  loreHidden: void;
  /** A new floor or run: no page near, so no panel over one (magic/pages.ts; ui/pagePanel.ts listens). */
  pagesCleared: void;
  /* ---- the HUD's other parts ---- */
  /** The potion belt changed (items/potions.ts, flow.ts; ui/belt.ts). */
  beltChanged: void;
  /** Insight or the levels waiting changed (progression/; ui/insightHud.ts); a new run shows them afresh. */
  insightChanged: void;
  insightReset: void;
  /** The mage arrives at the Vigil or leaves it (vigil/where.ts; ui/vigilHud.ts: the body's `vigil` class). */
  atVigil: { on: boolean };
  /** The Vigil is left for a floor (vigil/place.ts): its HUD is drawn afresh next time. */
  vigilLeft: void;
  /** Stepping into the daylight (world/daylight.ts; ui/dawn.ts: the white flash, the body's `daylight` class); and the
      daylight taken away. */
  dawn: void;
  daylightGone: void;
  /* ---- the screens (flow.ts; ui/screens.ts) ---- */
  /** The game paused: the pause screen's run line, Resume focused. */
  paused: void;
  soundToggled: { muted: boolean };
  /** A hexing blow took mana (magic/hex.ts): the mana bar flashes violet. */
  manaHexed: void;
}

const bus = createBus<GameEvents>();
/** Listen to one of the game's events (the UI, from its `init*`, which main.ts calls at boot). */
export const on = bus.on;
/** Say that something happened in the game: its listeners run now, before `emit` returns. */
export const emit = bus.emit;
