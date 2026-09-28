import { pressed, type InputActions } from './index';

export const keys = new Set<string>();
/** Held arrow keys in press order; the most recent one sets the shot direction. */
export const arrowOrder: string[] = [];
export const ARROWS: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

export function initKeyboard(act: InputActions) {
  window.addEventListener('keydown', e => {
    act.unlockAudio();
    if (ARROWS[e.code] || e.code === 'Space') e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'Backquote' || e.code === 'F2') { e.preventDefault(); act.toggleDev(); return; }
    keys.add(e.code);
    if (ARROWS[e.code]) { const i = arrowOrder.indexOf(e.code); if (i >= 0) arrowOrder.splice(i, 1); arrowOrder.push(e.code); }
    if (e.code === 'Escape' || e.code === 'KeyP') act.togglePause();
    if (e.code === 'Space' && act.playing()) pressed.glyph = true; // chalk a blast glyph
    if ((e.code === 'KeyQ' || e.code === 'KeyE') && act.playing()) pressed.spells[e.code === 'KeyQ' ? 0 : 1] = true; // cast a spell
    if (e.code === 'Enter' || e.code === 'Space') act.confirm();
    if (e.code === 'KeyM') act.toggleSound();
  });
  window.addEventListener('keyup', e => { keys.delete(e.code); const i = arrowOrder.indexOf(e.code); if (i >= 0) arrowOrder.splice(i, 1); });
  const release = () => { keys.clear(); arrowOrder.length = 0; act.autoPause(); };
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => { if (document.hidden) act.autoPause(); });
}
