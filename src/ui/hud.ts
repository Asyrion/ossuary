import * as THREE from 'three';
import type { Enemy } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { CFG } from '../config';
import { camera } from '../render/renderer';
import { artifact } from '../items/artifactData';
import { $, clamp } from '../util';

const HEART_PATH = 'M12 21.2s-7.6-4.7-9.7-9.3C.8 8.3 3 4.4 6.7 4.4c2.1 0 3.6 1.1 4.4 2.7.8-1.6 2.3-2.7 4.4-2.7 3.7 0 5.9 3.9 4.3 7.5-2.1 4.6-9.8 9.3-9.8 9.3z';
/* Placeholder artifact icons (24 × 24, drawn in the artifact's colour) until icons are rendered from Tripo models. */
const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const ICONS: Record<string, string> = {
  wand: `<path d="M5 19L16 8" ${S}/><path d="M17 3l1.2 3.3L21.5 7l-3.3 1.2L17 11.5l-1.2-3.3L12.5 7l3.3-1.2z" fill="currentColor"/>`,
  staff: `<path d="M12 22V9M12 9L7 3M12 9l5-6" ${S}/><circle cx="7" cy="3.5" r="2" fill="currentColor"/><circle cx="17" cy="3.5" r="2" fill="currentColor"/>`,
  orb: `<circle cx="12" cy="12" r="8" ${S}/><path d="M6 13c2-2 4 2 6 0s4 2 6 0" ${S}/>`,
  crook: `<path d="M9 22V9a5 5 0 0 1 10 0v1.5" ${S}/>`,
  sigil: `<circle cx="12" cy="12" r="8" ${S}/><path d="M12 5l3.5 7L12 19l-3.5-7z" fill="currentColor"/>`,
  boots: `<path d="M8 3h5v10l6 3v4H6V13z" ${S}/>`,
  beads: [0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle cx="${12 + 7 * Math.cos(i * .785)}" cy="${12 + 7 * Math.sin(i * .785)}" r="1.8" fill="currentColor"/>`).join(''),
  lens: `<circle cx="12" cy="12" r="8" ${S}/><circle cx="12" cy="12" r="3" fill="currentColor"/>`,
  shard: `<path d="M12 20s-7-4.4-8.6-8.6C2.2 8 4.2 4.8 7.3 4.8c2 0 3.3 1 4.1 2.4L10 11l3 1-1 8z" fill="currentColor"/>`,
  knuckle: `<path d="M7 17l10-10" ${S}/><circle cx="6" cy="15.5" r="2.2" fill="currentColor"/><circle cx="8.5" cy="18" r="2.2" fill="currentColor"/><circle cx="15.5" cy="6" r="2.2" fill="currentColor"/><circle cx="18" cy="8.5" r="2.2" fill="currentColor"/>`,
  bell: `<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4z" ${S}/><circle cx="12" cy="21" r="1.5" fill="currentColor"/>`,
  chisel: `<path d="M14 3l4 4-9 9-4-4z" ${S}/><path d="M5 12l-2 7 7-2" ${S}/>`,
  mask: `<path d="M4 6c5-2 11-2 16 0 0 7-3 13-8 13S4 13 4 6z" ${S}/><path d="M8 10h2.5M13.5 10H16" ${S}/>`,
  chain: `<rect x="3" y="8" width="10" height="7" rx="3.5" ${S}/><rect x="11" y="9" width="10" height="7" rx="3.5" ${S}/>`,
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

/** The focus (framed) followed by every other artifact held; cursed ones are ringed in red. */
export function renderItems() {
  el.items.innerHTML = [player.focus, ...player.items].map((id, i) => {
    const def = artifact(id), cls = i === 0 ? 'focus' : def.kind === 'cursed' ? 'cursed' : '';
    return `<svg viewBox="0 0 24 24" class="${cls}" style="color:${def.color}" role="img" aria-label="${def.name}"><title>${def.name}: ${def.text}</title>${ICONS[def.icon] ?? ICONS.sigil}</svg>`;
  }).join('');
}

/** Mask of the Drowned: darkness everywhere but a circle around the mage. */
const vision = $('vision'), v3 = new THREE.Vector3();
export function updateVision() {
  const on = player.stats.effects.has('vision') && G.state !== 'title' && G.state !== 'end';
  vision.style.display = on ? 'block' : 'none';
  if (!on) return;
  v3.set(player.x, .6, player.z).project(camera);
  const x = (v3.x + 1) / 2 * innerWidth, y = (1 - v3.y) / 2 * innerHeight;
  const r = CFG.artifacts.visionRadius * innerHeight / (camera.top - camera.bottom);
  vision.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(3,2,2,0) ${r * .55}px, rgba(3,2,2,.96) ${r}px)`;
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
      mg.fillStyle = r.spots.some(s => !s.taken) ? '#e8b04a' : '#6a5a3a';
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
