import type { Vec2 } from '../types';
import { pressed, type InputActions } from './index';

export const pad = { move: { x: 0, z: 0 }, shoot: null as Vec2 | null, startWas: false, glyphWas: false, spellWas: [false, false], menuWas: new Set<number>() };
/** Buttons menus may use: B, LB, RB, View and the d-pad. */
const MENU_BUTTONS = [1, 4, 5, 8, 12, 13, 14, 15];

export function pollGamepad(act: InputActions) {
  pad.move.x = pad.move.z = 0; pad.shoot = null;
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = [...gps].find(g => g && g.connected); if (!gp) return;
  const dz = (v: number) => Math.abs(v) < .2 ? 0 : v;
  pad.move.x = dz(gp.axes[0] || 0); pad.move.z = dz(gp.axes[1] || 0);
  const sx = gp.axes[2] || 0, sz = gp.axes[3] || 0;
  if (Math.hypot(sx, sz) > .5) pad.shoot = Math.abs(sx) > Math.abs(sz) ? { x: Math.sign(sx), z: 0 } : { x: 0, z: Math.sign(sz) };
  const b = (i: number) => !!gp.buttons[i]?.pressed;
  // menu buttons first: while a menu (the inventory) uses one, the game doesn't see it
  let menu = false;
  for (const i of MENU_BUTTONS) {
    const on = b(i);
    if (on && !pad.menuWas.has(i) && act.padButton(i)) menu = true;
    if (on) pad.menuWas.add(i); else pad.menuWas.delete(i);
  }
  if (menu) return;
  // face buttons: Y up, A down, X left, B right
  if (!pad.shoot) { if (b(3)) pad.shoot = { x: 0, z: -1 }; else if (b(0)) pad.shoot = { x: 0, z: 1 }; else if (b(2)) pad.shoot = { x: -1, z: 0 }; else if (b(1)) pad.shoot = { x: 1, z: 0 }; }
  const glyph = b(6); // left trigger: chalk a blast glyph
  if (glyph && !pad.glyphWas && act.playing()) pressed.glyph = true;
  pad.glyphWas = glyph;
  for (const i of [0, 1]) { // shoulder buttons: LB and RB cast the spells in slots 1 and 2
    const on = b(4 + i);
    if (on && !pad.spellWas[i] && act.playing()) pressed.spells[i] = true;
    pad.spellWas[i] = on;
  }
  const start = b(9);
  if (start && !pad.startWas) { act.unlockAudio(); act.startButton(); }
  pad.startWas = start;
}
