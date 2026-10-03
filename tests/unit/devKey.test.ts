/* The dev menu's keys (src/input/devKey.ts): the key left of 1 and F2 everywhere; IntlBackslash, the key left of 1 on a
   Mac's ISO keyboard, only on a Mac (elsewhere it is the key beside left Shift, the blink's). */
import { describe, expect, it } from 'vitest';
import { isDevKey } from '../../src/input/devKey';

describe('isDevKey', () => {
  it('opens on the key left of 1 and F2 on any machine', () => {
    for (const mac of [true, false]) for (const code of ['Backquote', 'F2']) expect(isDevKey(code, mac)).toBe(true);
  });
  it('takes IntlBackslash only on a Mac', () => {
    expect(isDevKey('IntlBackslash', true)).toBe(true);
    expect(isDevKey('IntlBackslash', false)).toBe(false);
  });
  it('leaves the other keys to the game', () => {
    for (const code of ['ShiftLeft', 'KeyQ', 'Digit1', 'Escape']) expect(isDevKey(code, true)).toBe(false);
  });
});
