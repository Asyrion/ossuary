import type { Vec2 } from '../types';
import { $ } from '../util';
import type { InputActions } from './index';

type Slot = 'move' | 'shoot';
interface Hold { id: number; ox: number; oy: number }
/** Twin-stick touch: left half of the screen moves, right half shoots (4 directions). */
export const touch = { move: null as Hold | null, shoot: null as Hold | null, mv: { x: 0, z: 0 }, sd: null as Vec2 | null };

export function initTouch(canvas: HTMLCanvasElement, act: InputActions) {
  const stickEls = { move: $('stickL'), shoot: $('stickR') };
  const stickPos = (el: HTMLElement, x: number, y: number, kx: number, ky: number) => {
    el.style.left = x + 'px'; el.style.top = y + 'px'; (el.firstElementChild as HTMLElement).style.transform = `translate(${kx}px,${ky}px)`;
  };
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return; act.unlockAudio(); e.preventDefault();
    if (!act.playing()) return;
    const slot: Slot = e.clientX < window.innerWidth / 2 ? 'move' : 'shoot';
    if (touch[slot]) return;
    touch[slot] = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
    const el = stickEls[slot]; el.classList.add('on'); stickPos(el, e.clientX, e.clientY, 0, 0);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    for (const slot of ['move', 'shoot'] as const) {
      const t = touch[slot]; if (!t || t.id !== e.pointerId) continue;
      let dx = e.clientX - t.ox, dy = e.clientY - t.oy; const d = Math.hypot(dx, dy), max = 50;
      if (d > max) { dx *= max / d; dy *= max / d; }
      stickPos(stickEls[slot], t.ox, t.oy, dx, dy);
      if (slot === 'move') { touch.mv.x = dx / max; touch.mv.z = dy / max; }
      else touch.sd = d < 14 ? null : (Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), z: 0 } : { x: 0, z: Math.sign(dy) });
    }
  });
  const endTouch = (e: PointerEvent) => {
    for (const slot of ['move', 'shoot'] as const) {
      const t = touch[slot]; if (!t || t.id !== e.pointerId) continue;
      touch[slot] = null; stickEls[slot].classList.remove('on');
      if (slot === 'move') touch.mv.x = touch.mv.z = 0; else touch.sd = null;
    }
  };
  canvas.addEventListener('pointerup', endTouch); canvas.addEventListener('pointercancel', endTouch);
}
