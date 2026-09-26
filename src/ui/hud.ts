import type { Enemy } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { $, clamp } from '../util';

const HEART_PATH = 'M12 21.2s-7.6-4.7-9.7-9.3C.8 8.3 3 4.4 6.7 4.4c2.1 0 3.6 1.1 4.4 2.7.8-1.6 2.3-2.7 4.4-2.7 3.7 0 5.9 3.9 4.3 7.5-2.1 4.6-9.8 9.3-9.8 9.3z';
const RELIC_ICONS: Record<string, string> = {
  ember: '<circle cx="12" cy="12" r="8" fill="none" stroke="#e0a64a" stroke-width="2"/><path d="M12 5l3.5 7L12 19l-3.5-7z" fill="#ffb04a"/>',
};

const el = {
  hearts: $('hearts'), items: $('items'), bossbar: $('bossbar'), bossname: $('bossname'), banner: $('banner'),
  toast: $('toast'), hurt: $('hurt'), heroInfo: $('heroInfo'),
};

let lastHearts = '';
export function resetHearts() { lastHearts = ''; }
export function renderHearts() {
  const key = player.hp + '/' + player.maxHp; if (key === lastHearts) return; lastHearts = key;
  let html = '';
  for (let i = 0; i < player.maxHp / 2; i++) {
    const v = clamp(player.hp - i * 2, 0, 2);
    html += `<svg viewBox="0 0 24 24"><path d="${HEART_PATH}" fill="#2a1210" stroke="#0b0504" stroke-width="1.6"/>` +
      (v === 2 ? `<path d="${HEART_PATH}" fill="#c42c1f"/>` : v === 1 ? `<path d="${HEART_PATH}" fill="#c42c1f" clip-path="url(#halfclip)"/>` : '') +
      `<path d="M7 7.2c-1.2.3-2 1.2-2.2 2.4" stroke="rgba(255,220,200,.55)" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>`;
  }
  el.hearts.innerHTML = html;
  el.hearts.setAttribute('aria-label', STR.health(player.hp / 2, player.maxHp / 2));
}

export function renderItems() {
  el.items.innerHTML = player.items.map(id => `<svg viewBox="0 0 24 24">${RELIC_ICONS[id] ?? RELIC_ICONS.ember}</svg>`).join('');
}

const mm = $<HTMLCanvasElement>('minimap'), mg = mm.getContext('2d')!;
export function renderMinimap() {
  const W = mm.width, H = mm.height, cw = 38, ch = 24, gap = 6, cur = G.current; mg.clearRect(0, 0, W, H);
  for (const r of G.rooms) {
    if (!r.visited && !r.known) continue;
    const x = W / 2 + (r.gx - cur.gx) * (cw + gap) - cw / 2, y = H / 2 + (r.gy - cur.gy) * (ch + gap) - ch / 2;
    if (x < -cw || x > W || y < -ch || y > H) continue;
    mg.fillStyle = 'rgba(0,0,0,.55)'; mg.fillRect(x - 3, y - 3, cw + 6, ch + 6);
    mg.fillStyle = r === cur ? '#efe2c3' : r.visited ? '#a2937a' : '#4d443a'; mg.fillRect(x, y, cw, ch);
    const cx = x + cw / 2, cy = y + ch / 2;
    if (r.type === 'boss') {
      mg.fillStyle = '#b3261a'; mg.beginPath(); mg.arc(cx, cy - 1, 7, 0, 7); mg.fill();
      mg.fillStyle = '#1a0806'; mg.fillRect(cx - 4, cy - 3, 3, 3); mg.fillRect(cx + 1, cy - 3, 3, 3);
    }
    if (r.type === 'treasure') {
      mg.fillStyle = r.relic?.taken ? '#6a5a3a' : '#e8b04a';
      mg.beginPath(); mg.moveTo(cx, cy - 8); mg.lineTo(cx + 7, cy); mg.lineTo(cx, cy + 8); mg.lineTo(cx - 7, cy); mg.fill();
    }
  }
}

export function showBossBar(name: string, e: Enemy) { el.bossname.textContent = name; updateBossBar(e); el.bossbar.classList.add('on'); }
export function hideBossBar() { el.bossbar.classList.remove('on'); }
export function updateBossBar(e: Enemy) {
  (el.bossbar.querySelector('.fill') as HTMLElement).style.width = Math.max(0, e.hp / e.maxHp * 100) + '%';
}

let bannerT = 0, toastT = 0;
export function banner(t: string, s = '', dur = 2.6) {
  el.banner.querySelector('.t')!.textContent = t; el.banner.querySelector('.s')!.textContent = s;
  el.banner.classList.add('on'); bannerT = dur;
}
export function toast(msg: string, dur = 3) { el.toast.textContent = msg; el.toast.classList.add('on'); toastT = dur; }
export function updateHud(dt: number) {
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) el.banner.classList.remove('on'); }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) el.toast.classList.remove('on'); }
}

/** Cut to black and fade back in, to cover building a new floor. */
export function fadeFromBlack() {
  const f = $('fade'); f.style.transition = 'none'; f.style.opacity = '1';
  void f.offsetWidth; // apply the black before starting the fade
  f.style.transition = 'opacity .7s ease-out'; f.style.opacity = '0';
}

/** Red screen-edge flash (CSS transition, so real time is fine here). */
export function flashHurt() { el.hurt.style.opacity = '1'; setTimeout(() => el.hurt.style.opacity = '0', 160); }
export function setHeroInfo(text: string) { el.heroInfo.textContent = text; }
