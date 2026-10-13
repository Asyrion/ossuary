/* Daylight's screen side (the scene: world/daylight.ts): stepping into the daylight flashes white and fades
   (`CFG.daylight.flash` seconds), and the body's `daylight` class is on while the mage is out in it. */
import { CFG } from '../config';
import { $ } from '../util';
import { on } from '../events';

/** Daylight listens to the game (main.ts calls this at boot). */
export function initDawn() {
  on('dawn', () => {
    document.body.classList.add('daylight');
    const f = $('dawn');
    f.style.transition = 'none';
    f.style.opacity = '1';
    void f.offsetWidth;
    f.style.transition = `opacity ${CFG.daylight.flash}s ease-out`;
    f.style.opacity = '0';
  });
  on('daylightGone', () => document.body.classList.remove('daylight'));
}
