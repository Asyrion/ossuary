import type { Vec2 } from '../types';
import { ARROWS, arrowOrder, keys } from './keyboard';
import { pad } from './gamepad';
import { touch } from './touch';

export { initKeyboard, keys, arrowOrder } from './keyboard';
export { initGamepad, padsNow, pollGamepad } from './gamepad';
export { initTouch } from './touch';

/** What input can trigger in the game flow (wired up in main.ts). */
export interface InputActions {
  unlockAudio(): void;
  /** Esc / P: pause while playing, resume while paused. */
  togglePause(): void;
  /** Enter / Space (or a gamepad's A): start from the title or end screen. */
  confirm(): void;
  /** Gamepad Start: pause, resume or start. */
  startButton(): void;
  toggleSound(): void;
  /** Window lost focus or tab hidden. */
  autoPause(): void;
  /** The key left of 1, or F2: open or close the dev menu. */
  toggleDev(): void;
  /** A key for the inventory (I or Tab opens it; inside, arrows choose and Q and E change tabs): true when used. */
  inventoryKey(code: string): boolean;
  /** A gamepad button just pressed that menus may use (B, LB, RB, View, the d-pad): true when used. */
  padButton(i: number): boolean;
  playing(): boolean;
}

/** One-shot presses, set by the keyboard or gamepad while playing and consumed by the game: a glyph, and a
    spell from slot 1 (Q, LB) or 2 (E, RB); M5: the chosen potion drunk (R or the d-pad's up, tapped) or thrown (held and
    let go), and the next or the last potion chosen (F, the d-pad's right; the d-pad's left). */
export const pressed = { glyph: false, spells: [false, false], blink: false, potion: null as null | 'drink' | 'throw', nextPotion: 0 };
/** M5: since when the potion key has been held (performance.now(), 0 when it isn't): held past CFG.alchemy.hold it is
    a throw, aimed while held (items/potions.ts shows where it will land). */
export const potionHold = { since: 0 };
/** Let go of the potion key: a tap drinks, a hold throws. */
export function releasePotion(now: number, hold: number) {
  if (!potionHold.since) return;
  pressed.potion = now - potionHold.since < hold * 1000 ? 'drink' : 'throw'; potionHold.since = 0;
}

/** M5: the Hex Brew, drunk, sends the mage's hands and feet the wrong way (items/potions.ts sets it while it lasts). */
export const inputFx = { reversed: false };

/** Movement from all devices combined, length at most 1. */
export function moveInput(): Vec2 {
  let x = 0, z = 0;
  if (keys.has('KeyA')) x -= 1; if (keys.has('KeyD')) x += 1; if (keys.has('KeyW')) z -= 1; if (keys.has('KeyS')) z += 1;
  x += pad.move.x + touch.mv.x; z += pad.move.z + touch.mv.z;
  const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
  return inputFx.reversed ? { x: -x, z: -z } : { x, z };
}

/** Four-direction shot: the latest held arrow key wins, then gamepad, then touch. */
export function shootDir(): Vec2 | null {
  let d: Vec2 | null;
  if (arrowOrder.length) { const a = ARROWS[arrowOrder[arrowOrder.length - 1]]; d = { x: a[0], z: a[1] }; }
  else d = pad.shoot || touch.sd;
  return d && inputFx.reversed ? { x: -d.x, z: -d.z } : d;
}
