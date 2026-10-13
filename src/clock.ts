/* The loop's real-time clock: when the last frame was drawn and the time owed to the fixed step. Its own module, so flow.ts
   can restart it on resuming (no catching up the time spent paused) without importing the loop. */
export const clock = {
  /** The last frame's time stamp (ms, requestAnimationFrame's). */
  last: 0,
  /** Seconds owed to the fixed step. */
  acc: 0,
};

/** Start counting from now: the time spent paused is not caught up. */
export function resetClock() {
  clock.last = performance.now();
  clock.acc = 0;
}
