import type { Vec2 } from '../types';
import { ARROWS, arrowOrder, keys } from './keyboard';
import { pad } from './gamepad';
import { touch } from './touch';

export { initKeyboard, keys, arrowOrder } from './keyboard';
export { pollGamepad } from './gamepad';
export { initTouch } from './touch';

/** What input can trigger in the game flow (wired up in main.ts). */
export interface InputActions {
  unlockAudio(): void;
  /** Esc / P: pause while playing, resume while paused. */
  togglePause(): void;
  /** Enter / Space: start from the title or end screen. */
  confirm(): void;
  /** Gamepad Start: pause, resume or start. */
  startButton(): void;
  toggleSound(): void;
  /** Window lost focus or tab hidden. */
  autoPause(): void;
  playing(): boolean;
}

/** One-shot presses, set by the keyboard or gamepad while playing and consumed by the game. */
export const pressed = { glyph: false };

/** Movement from all devices combined, length at most 1. */
export function moveInput(): Vec2 {
  let x = 0, z = 0;
  if (keys.has('KeyA')) x -= 1; if (keys.has('KeyD')) x += 1; if (keys.has('KeyW')) z -= 1; if (keys.has('KeyS')) z += 1;
  x += pad.move.x + touch.mv.x; z += pad.move.z + touch.mv.z;
  const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
  return { x, z };
}

/** Four-direction shot: the latest held arrow key wins, then gamepad, then touch. */
export function shootDir(): Vec2 | null {
  if (arrowOrder.length) { const a = ARROWS[arrowOrder[arrowOrder.length - 1]]; return { x: a[0], z: a[1] }; }
  return pad.shoot || touch.sd;
}
