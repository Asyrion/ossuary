import type { Vec2 } from '../types';
import { CFG } from '../config';
import { STR } from '../strings';
import { potionHold, pressed, releasePotion, type InputActions } from './index';

export const pad = {
  move: { x: 0, z: 0 },
  shoot: null as Vec2 | null,
  startWas: false,
  confirmWas: false,
  glyphWas: false,
  blinkWas: false,
  spellWas: [false, false],
  menuWas: new Set<number>(),
  potionWas: false,
  chooseWas: {} as Record<number, boolean>,
};
/** Buttons menus may use: A (the level-up screen takes, the alchemy table acts), B, LB, RB, View and the d-pad. */
const MENU_BUTTONS = [0, 1, 4, 5, 8, 12, 13, 14, 15];

/** Every connected pad, read together: each stick from the pad pushing it furthest, each button pressed on any. A second,
    idle device the browser lists first (a wireless adapter, a virtual pad, the same pad seen twice) no longer hides the one
    in hand. */
const pads = () =>
  [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter((g): g is Gamepad => !!g && g.connected);
function stick(gps: Gamepad[], ax: number, az: number) {
  let x = 0,
    z = 0;
  for (const g of gps) {
    const gx = g.axes[ax] || 0,
      gz = g.axes[az] || 0;
    if (Math.hypot(gx, gz) > Math.hypot(x, z)) {
      x = gx;
      z = gz;
    }
  }
  return { x, z };
}

export function pollGamepad(act: InputActions) {
  pad.move.x = pad.move.z = 0;
  pad.shoot = null;
  const gps = pads();
  if (!gps.length) return;
  const dz = (v: number) => (Math.abs(v) < 0.2 ? 0 : v);
  const left = stick(gps, 0, 1),
    right = stick(gps, 2, 3);
  pad.move.x = dz(left.x);
  pad.move.z = dz(left.z);
  const sx = right.x,
    sz = right.z;
  if (Math.hypot(sx, sz) > 0.5)
    pad.shoot = Math.abs(sx) > Math.abs(sz) ? { x: Math.sign(sx), z: 0 } : { x: 0, z: Math.sign(sz) };
  const b = (i: number) => gps.some((g) => !!g.buttons[i]?.pressed);
  // menu buttons first: while a menu (the inventory) uses one, the game doesn't see it
  let menu = false;
  for (const i of MENU_BUTTONS) {
    const on = b(i);
    if (on && !pad.menuWas.has(i) && act.padButton(i)) menu = true;
    if (on) pad.menuWas.add(i);
    else pad.menuWas.delete(i);
  }
  if (menu) return;
  // A starts a run from the title or the end screen, as Start does (and Enter)
  const confirm = b(0);
  if (confirm && !pad.confirmWas && !act.playing()) {
    act.unlockAudio();
    act.confirm();
  }
  pad.confirmWas = confirm;
  // face buttons: Y up, A down, X left, B right
  if (!pad.shoot) {
    if (b(3)) pad.shoot = { x: 0, z: -1 };
    else if (b(0)) pad.shoot = { x: 0, z: 1 };
    else if (b(2)) pad.shoot = { x: -1, z: 0 };
    else if (b(1)) pad.shoot = { x: 1, z: 0 };
  }
  const glyph = b(6); // left trigger: chalk a blast glyph
  if (glyph && !pad.glyphWas && act.playing()) pressed.glyph = true;
  pad.glyphWas = glyph;
  const blink = b(7); // right trigger: the Shadowstep's blink (M4.6)
  if (blink && !pad.blinkWas && act.playing()) pressed.blink = true;
  pad.blinkWas = blink;
  for (const i of [0, 1]) {
    // shoulder buttons: LB and RB cast the spells in slots 1 and 2
    const on = b(4 + i);
    if (on && !pad.spellWas[i] && act.playing()) pressed.spells[i] = true;
    pad.spellWas[i] = on;
  }
  // M5: the d-pad's up uses the chosen potion (tap to drink, hold to throw), its left and right choose another
  const pot = b(12);
  if (pot && !pad.potionWas && act.playing()) potionHold.since = performance.now();
  if (!pot && pad.potionWas && act.playing()) releasePotion(performance.now(), CFG.alchemy.hold);
  pad.potionWas = pot;
  for (const [i, d] of [
    [14, -1],
    [15, 1],
  ] as const) {
    const on = b(i);
    if (on && !pad.chooseWas[i] && act.playing()) pressed.nextPotion += d;
    pad.chooseWas[i] = on;
  }
  const start = b(9);
  if (start && !pad.startWas) {
    act.unlockAudio();
    act.startButton();
  }
  pad.startWas = start;
}

/** What the browser reports of each pad (the dev menu, the tests): its name, layout, and what is held now. */
export const padsNow = () =>
  pads().map((g) => ({
    index: g.index,
    id: g.id,
    mapping: g.mapping,
    buttons: g.buttons.map((x, i) => (x.pressed ? i : -1)).filter((i) => i >= 0),
    axes: g.axes.map((v) => Math.round(v * 100) / 100),
  }));

/** A pad connecting says so, by name (Nothing silent): the browser shows a pad only once one of its buttons is pressed on
    the page, so this is the sign it was heard; one that reports an unusual layout says its buttons may be off. */
export function initGamepad(say: (text: string) => void) {
  window.addEventListener('gamepadconnected', (e) => {
    const g = (e as GamepadEvent).gamepad,
      name = g.id.replace(/\s*\(.*$/, '').trim() || g.id;
    say(g.mapping === 'standard' ? STR.pad.connected(name) : STR.pad.unusual(name));
  });
}
