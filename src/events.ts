/* The game's event bus: the simulation says what happened (`emit`) and the UI listens (`on`), so the simulation imports
   nothing from src/ui/. It is synchronous on purpose: `emit` calls every listener at once, in the order they were added,
   and returns only when the last has run, so a notification lands at the same moment, and in the same order, as the
   direct call it replaced. No queue and nothing async: a listener that throws stops the emit as a direct call would. */

/** A listener for one event: takes its payload (nothing for an event without one). */
export type Listener<P> = (payload: P) => void;
/** The arguments `emit` takes for an event: its payload, or none when the payload is `void`. */
type Args<P> = [P] extends [void] ? [] : [payload: P];

export interface Bus<E> {
  /** Listen to `name`; returns a function that stops listening. */
  on<K extends keyof E>(name: K, fn: Listener<E[K]>): () => void;
  /** Call every listener of `name` now, in the order they were added. */
  emit<K extends keyof E>(name: K, ...args: Args<E[K]>): void;
}

/** A bus over the event map `E` (event name to payload type). */
export function createBus<E>(): Bus<E> {
  const lists = new Map<keyof E, Listener<never>[]>();
  return {
    on(name, fn) {
      let list = lists.get(name);
      if (!list) lists.set(name, (list = []));
      list.push(fn);
      return () => {
        const i = list.indexOf(fn);
        if (i >= 0) list.splice(i, 1);
      };
    },
    emit(name, ...args) {
      const list = lists.get(name);
      if (!list) return;
      // (a listener that stops listening mid-emit doesn't make the next one be skipped)
      for (const fn of list.length > 1 ? list.slice() : list) (fn as Listener<unknown>)(args[0]);
    },
  };
}
