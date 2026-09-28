import * as THREE from 'three';
import type { Enemy } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { CFG } from '../config';
import { camera } from '../render/renderer';
import { artifact } from '../items/artifactData';
import { spell } from '../magic/spellData';
import { $, clamp } from '../util';

export const HEART_PATH = 'M12 21.2s-7.6-4.7-9.7-9.3C.8 8.3 3 4.4 6.7 4.4c2.1 0 3.6 1.1 4.4 2.7.8-1.6 2.3-2.7 4.4-2.7 3.7 0 5.9 3.9 4.3 7.5-2.1 4.6-9.8 9.3-9.8 9.3z';
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
  censer: `<path d="M12 2v5M7 9h10l-1.5 7h-7z" ${S}/><path d="M9 20h6M12 16v4" ${S}/><path d="M6 5c1 1 1 2 0 3M18 5c-1 1-1 2 0 3" ${S}/>`,
  spear: `<path d="M4 20L16 8" ${S}/><path d="M20 4l-2.2 6.6-4.4-4.4z" fill="currentColor"/><path d="M6 15l3 3" ${S}/>`,
  serpent: `<path d="M5 21c0-4 6-3 6-7s-6-3-6-7 5-5 8-3" ${S}/><circle cx="15" cy="5" r="2.2" fill="currentColor"/><path d="M17 5h3" ${S}/>`,
  eye: `<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" ${S}/><circle cx="12" cy="12" r="3" fill="currentColor"/>`,
  mirror: `<ellipse cx="12" cy="10" rx="6" ry="7.5" ${S}/><path d="M12 17.5V22M9 22h6M10 5l2 4-1 3 2 3" ${S}/>`,
  feather: `<path d="M20 4C11 4 6 10 5 19l14-14" ${S}/><path d="M5 19l-2 2M9 11h5M7 15h5" ${S}/>`,
  ram: `<path d="M8 8a4 4 0 1 0-4 5M16 8a4 4 0 1 1 4 5" ${S}/><path d="M8 8h8l-1 8-3 4-3-4z" ${S}/>`,
  jar: `<path d="M8 3h8M9 3v3L6 9v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9l-3-3V3" ${S}/><path d="M9 14c1.5-2 4.5 2 6 0" ${S}/>`,
  moth: `<path d="M12 6v14" ${S}/><path d="M12 9C8 4 3 5 4 10s5 4 8 2M12 9c4-5 9-4 8 1s-5 4-8 2M12 14c-3 1-5 4-3 6M12 14c3 1 5 4 3 6" ${S}/>`,
  skull: `<path d="M5 11a7 7 0 1 1 14 0v3l-2 2v3H7v-3l-2-2z" ${S}/><circle cx="9" cy="11" r="1.6" fill="currentColor"/><circle cx="15" cy="11" r="1.6" fill="currentColor"/><path d="M15 13.5v3" ${S}/>`,
  oath: `<path d="M12 21s-7-4.4-8.6-8.6C2.2 8 4.2 4.8 7.3 4.8c2 0 3.3 1 4.7 2.6 1.4-1.6 2.7-2.6 4.7-2.6 3.1 0 5.1 3.2 3.9 6.6C19 16.6 12 21 12 21z" ${S}/><path d="M9 12l2 2 4-4" ${S}/>`,
  leadheart: `<path d="M12 21s-7-4.4-8.6-8.6C2.2 8 4.2 4.8 7.3 4.8c2 0 3.3 1 4.7 2.6 1.4-1.6 2.7-2.6 4.7-2.6 3.1 0 5.1 3.2 3.9 6.6C19 16.6 12 21 12 21z" fill="currentColor"/><path d="M8 3h8" ${S}/>`,
  covenant: `<path d="M6 3h9l3 3v15H6z" ${S}/><path d="M9 9h6M9 12h6" ${S}/><path d="M12 15c-1.5 1.8-1.5 3 0 4 1.5-1 1.5-2.2 0-4z" fill="currentColor"/>`,
  keyring: `<circle cx="9" cy="9" r="5.5" ${S}/><path d="M12.5 12.5L20 20M17 17l2-2M15 15l1.5-1.5" ${S}/><path d="M9 14.5V21M9 18h2.5" ${S}/>`,
  purse: `<path d="M8 6c-3 3-4 6-4 9a8 5 0 0 0 16 0c0-3-1-6-4-9z" ${S}/><path d="M7 6h10M10 3l2 3 2-3" ${S}/><circle cx="12" cy="14" r="2.4" fill="currentColor"/>`,
  chalk: `<path d="M4 17l9-9 3 3-9 9H4z" ${S}/><path d="M13 8l3-3 3 3-3 3" fill="currentColor"/><path d="M14 20h6" ${S}/>`,
  obol: `<circle cx="12" cy="12" r="8" ${S}/><circle cx="12" cy="12" r="4" ${S}/><path d="M12 2v3M12 19v3" ${S}/>`,
  band: `<ellipse cx="12" cy="13" rx="8" ry="5" ${S}/><path d="M8 7.6v2.2M12 7v2.2M16 7.6v2.2M8 16.2v2.2M12 16.8v2.2M16 16.2v2.2" ${S}/>`,
  lantern: `<path d="M9 5h6M12 2v3M8 5l-1 4v8l2 3h6l2-3V9l-1-4" ${S}/><path d="M12 10c-1.5 1.5-1.5 3 0 4 1.5-1 1.5-2.5 0-4z" fill="currentColor"/>`,
  scale: `<path d="M12 3v17M7 20h10M4 7h16" ${S}/><path d="M4 7l-2.5 6h5zM20 7l-2.5 6h5z" ${S}/>`,
};

/* Placeholder spell icons, drawn in the spell's colour. */
const SPELL_ICONS: Record<string, string> = {
  arc: `<path d="M13 2L5 13h6l-2 9 9-12h-6z" fill="currentColor"/>`,
  lance: `<path d="M3 21L21 3" ${S}/><path d="M14 3h7v7" ${S}/><path d="M5 13c2 1 4 3 5 6" ${S}/>`,
  seal: `<circle cx="12" cy="12" r="8" ${S}/><path d="M12 6c2 3 3 5 0 8-3-3-2-5 0-8z" fill="currentColor"/><path d="M8 17h8" ${S}/>`,
  shards: `<path d="M4 20l4-9 2 5zM12 20l0-11 2 6zM20 20l-4-9-2 5z" fill="currentColor"/>`,
  wall: `<path d="M3 20h18M4 20V9l3-4 3 4v11M10 20V7l3-4 3 4v13M16 20V10l3-3 2 3v10" ${S}/>`,
  mantle: `<circle cx="12" cy="8" r="3" ${S}/><path d="M6 21c0-5 3-8 6-8s6 3 6 8" ${S}/><path d="M3 12l3-2-1 4 3-1M21 12l-3-2 1 4-3-1" ${S}/>`,
};
/** A spell's icon as inline SVG in its colour. */
export function spellIcon(id: string) {
  const def = spell(id);
  return `<svg viewBox="0 0 24 24" style="color:${def.color}" role="img" aria-label="${def.name}"><title>${def.name}: ${def.text}\n\n${def.lore}</title>${SPELL_ICONS[def.icon] ?? SPELL_ICONS.arc}</svg>`;
}

/** A spell's icon as a standalone SVG document in `color` (for drawing onto a canvas, a grimoire page). */
export function spellIconSvg(id: string, color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="128" height="128" style="color:${color}">${SPELL_ICONS[spell(id).icon] ?? SPELL_ICONS.arc}</svg>`;
}

/** The two spell slots: the spell's icon, its key and its mana cost (empty slots dimmed). */
export function renderSpells() {
  player.spells.forEach((id, i) => {
    const slot = $(`slot${i}`), key = STR.controls.spellsKeys.split(' and ')[i] ?? '';
    slot.classList.toggle('empty', !id);
    slot.innerHTML = id ? `${spellIcon(id)}<i class="cd"></i><b>${key}</b><small>${spell(id).mana}</small>` : `<b>${key}</b>`;
  });
}
let lastMana = -1;
/** Every frame: the mana bar, and each slot's cooldown and whether mana is short. */
function updateMagicHud() {
  const max = player.stats.maxMana, m = Math.round(player.mana);
  if (m !== lastMana) {
    lastMana = m; el.manaFill.style.transform = `scaleX(${max ? player.mana / max : 0})`;
    el.mana.setAttribute('aria-valuemax', String(max)); el.mana.setAttribute('aria-valuenow', String(m)); el.mana.setAttribute('aria-label', STR.manaLabel(m, max));
  }
  player.spells.forEach((id, i) => {
    if (!id) return;
    const slot = $(`slot${i}`), cd = slot.querySelector<HTMLElement>('.cd'), def = spell(id);
    if (cd) cd.style.height = `${Math.min(1, player.spellCd[i] / def.cooldown) * 100}%`;
    slot.classList.toggle('poor', player.mana < def.mana);
  });
}
/** A refused cast: the slot flashes red, and the mana bar too when mana was short. */
export function flashMana(slot: number, why: 'cooldown' | 'mana' | 'target') {
  const s = $(`slot${slot}`); s.classList.add('flash'); setTimeout(() => s.classList.remove('flash'), 220);
  if (why === 'mana') { el.mana.classList.add('flash'); setTimeout(() => el.mana.classList.remove('flash'), 260); }
}

/* Obol, bone key and glyph icons for the counters under the artifacts. */
export const RES_ICONS = {
  coins: `<circle cx="12" cy="12" r="8" fill="#b8903e" stroke="#5a4418" stroke-width="1.5"/><rect x="10" y="10" width="4" height="4" fill="#3a2a10"/>`,
  keys: `<circle cx="7" cy="12" r="3.6" fill="none" stroke="#e8dcc0" stroke-width="2.2"/><path d="M10.5 12H20M17 12v3.5M20 12v2.5" stroke="#e8dcc0" stroke-width="2.2" stroke-linecap="round"/>`,
  glyphs: `<circle cx="12" cy="12" r="9" fill="#2b2622" stroke="#6b6158" stroke-width="1.2"/><path d="M${Array.from({ length: 8 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI * 6 / 7; return `${(12 + Math.cos(a) * 6.3).toFixed(2)} ${(12 + Math.sin(a) * 6.3).toFixed(2)}`; }).join('L')}" fill="none" stroke="#ffb04a" stroke-width="1.2" stroke-linejoin="round"/>`,
};

const el = {
  purse: $('purse'), mana: $('mana'), manaFill: $('mana').querySelector('i') as HTMLElement,
  hearts: $('hearts'), items: $('items'), bossbar: $('bossbar'), bossname: $('bossname'), banner: $('banner'),
  toast: $('toast'), prompt: $('prompt'), hurt: $('hurt'), heroInfo: $('heroInfo'),
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

let lastPurse = '';
/** Obols, bone keys and blast glyphs carried, as icons and two-digit counts. */
export function renderPurse() {
  const key = `${player.coins}/${player.keys}/${player.glyphs}`; if (key === lastPurse) return; lastPurse = key;
  el.purse.innerHTML = (['coins', 'keys', 'glyphs'] as const).map(k =>
    `<span class="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${RES_ICONS[k]}</svg><b>${String(player[k]).padStart(2, '0')}</b></span>`).join('');
  el.purse.setAttribute('aria-label', STR.purse(player.coins, player.keys, player.glyphs));
}

/** An artifact's icon as inline SVG in its colour: the focus framed, cursed ones ringed in red until a
    shrine cleanses them (then a pale ring). */
export function artifactIcon(id: string, isFocus: boolean, cleansed = player.cleansed.includes(id)) {
  const def = artifact(id), clean = cleansed && !!def.curse;
  const cls = isFocus ? 'focus' : clean ? 'cleansed' : def.kind === 'cursed' ? 'cursed' : '';
  const text = clean ? def.curse!.cleansed : def.text;
  return `<svg viewBox="0 0 24 24" class="${cls}" style="color:${def.color}" role="img" aria-label="${def.name}"><title>${def.name}: ${text}\n\n${def.lore}</title>${ICONS[def.icon] ?? ICONS.sigil}</svg>`;
}
/** The focus followed by every other artifact held. */
export function renderItems() {
  el.items.innerHTML = [player.focus, ...player.items].map((id, i) => artifactIcon(id, i === 0)).join('');
}

/** Mask of the Drowned: darkness everywhere but a circle around the mage. */
const vision = $('vision'), v3 = new THREE.Vector3();
export function updateVision() {
  const on = player.stats.effects.has('vision') && G.state !== 'title' && G.state !== 'end';
  vision.style.display = on ? 'block' : 'none';
  if (!on) return;
  v3.set(player.x, .6, player.z).project(camera);
  const x = (v3.x + 1) / 2 * innerWidth, y = (1 - v3.y) / 2 * innerHeight;
  const r = CFG.artifacts.visionRadius * innerHeight * camera.zoom / (camera.top - camera.bottom);
  vision.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(3,2,2,0) ${r * .55}px, rgba(3,2,2,.96) ${r}px)`;
}

const mm = $<HTMLCanvasElement>('minimap'), mg = mm.getContext('2d')!;
/** The map of known rooms around the current one. Rooms are drawn cell by cell, joined where a room spans
    several cells; corridors are drawn narrow. */
export function renderMinimap() {
  const W = mm.width, H = mm.height, cw = 38, ch = 24, gap = 6, cur = G.current; mg.clearRect(0, 0, W, H);
  const mid = (r: typeof cur) => ({ gx: r.plan.cells.reduce((a, c) => a + c.gx, 0) / r.plan.cells.length, gy: r.plan.cells.reduce((a, c) => a + c.gy, 0) / r.plan.cells.length });
  const centre = mid(cur);
  const px = (gx: number) => W / 2 + (gx - centre.gx) * (cw + gap), py = (gy: number) => H / 2 + (gy - centre.gy) * (ch + gap);
  // the Grave Lantern shows the secret room before it's found
  const lantern = player.stats.effects.has('graveLantern');
  const shown = G.rooms.filter(r => r.visited || r.known || (lantern && r.type === 'secret'));
  // rectangles for a room: its cells (corridors narrow) and the gaps between neighbouring cells
  const rects = (r: typeof cur) => {
    const out: [number, number, number, number][] = [];
    const nx = r.plan.shape === 'corridor_ns' ? cw * .36 : cw, ny = r.plan.shape === 'corridor_ew' ? ch * .42 : ch;
    const has = (gx: number, gy: number) => r.plan.cells.some(c => c.gx === gx && c.gy === gy);
    for (const c of r.plan.cells) {
      out.push([px(c.gx) - nx / 2, py(c.gy) - ny / 2, nx, ny]);
      if (has(c.gx + 1, c.gy)) out.push([px(c.gx) + cw / 2 - 1, py(c.gy) - ch / 2, gap + 2, ch]);
      if (has(c.gx, c.gy + 1)) out.push([px(c.gx) - cw / 2, py(c.gy) + ch / 2 - 1, cw, gap + 2]);
      if (has(c.gx + 1, c.gy) && has(c.gx, c.gy + 1) && has(c.gx + 1, c.gy + 1)) out.push([px(c.gx) + cw / 2 - 1, py(c.gy) + ch / 2 - 1, gap + 2, gap + 2]);
    }
    return out;
  };
  mg.fillStyle = 'rgba(0,0,0,.55)';
  for (const r of shown) for (const [x, y, w, h] of rects(r)) mg.fillRect(x - 3, y - 3, w + 6, h + 6);
  for (const r of shown) {
    mg.fillStyle = r === cur ? '#efe2c3' : r.visited ? '#a2937a' : '#4d443a';
    for (const [x, y, w, h] of rects(r)) mg.fillRect(x, y, w, h);
    const m = mid(r), cx = px(m.gx), cy = py(m.gy);
    if (r.type === 'boss') {
      mg.fillStyle = '#b3261a'; mg.beginPath(); mg.arc(cx, cy - 1, 7, 0, 7); mg.fill();
      mg.fillStyle = '#1a0806'; mg.fillRect(cx - 4, cy - 3, 3, 3); mg.fillRect(cx + 1, cy - 3, 3, 3);
    }
    if (r.type === 'ordeal') { // crossed blades, dimmed once passed
      mg.strokeStyle = r.cleared ? '#5a5048' : '#2a2226'; mg.lineWidth = 3;
      mg.beginPath(); mg.moveTo(cx - 6, cy - 6); mg.lineTo(cx + 6, cy + 6); mg.moveTo(cx + 6, cy - 6); mg.lineTo(cx - 6, cy + 6); mg.stroke();
    }
    if (r.type === 'altar') { // an arch of bone, dimmed once paid
      mg.strokeStyle = r.spots.some(s => !s.taken) ? '#e8dcc0' : '#6a5a4a'; mg.lineWidth = 2.5;
      mg.beginPath(); mg.arc(cx, cy + 3, 6, Math.PI, 0); mg.moveTo(cx - 6, cy + 3); mg.lineTo(cx - 6, cy + 7); mg.moveTo(cx + 6, cy + 3); mg.lineTo(cx + 6, cy + 7); mg.stroke();
    }
    if (r.type === 'secret') { // an eye of pale blue chalk, once found (fainter while only the Grave Lantern knows of it)
      mg.strokeStyle = mg.fillStyle = r.found ? '#8ab8ff' : '#5a7aa8'; mg.lineWidth = 2;
      mg.beginPath(); mg.ellipse(cx, cy, 7, 4, 0, 0, 7); mg.stroke();
      mg.beginPath(); mg.arc(cx, cy, 2, 0, 7); mg.fill();
    }
    if (r.type === 'merchant') { // an obol
      mg.fillStyle = '#d8a848'; mg.beginPath(); mg.arc(cx, cy, 6, 0, 7); mg.fill();
      mg.fillStyle = '#5a3e14'; mg.beginPath(); mg.arc(cx, cy, 2.2, 0, 7); mg.fill();
    }
    if (r.type === 'vault') { // a padlock, pale blue while the ward holds, dimmed once the vault is emptied
      const sealed = r.doors.some(d => d.seal?.sealed), empty = r.visited && r.cleared && !r.spots.some(s => !s.taken);
      mg.strokeStyle = mg.fillStyle = sealed ? '#8ab8ff' : empty ? '#5a5a62' : '#c8c8d4'; mg.lineWidth = 2;
      mg.beginPath(); mg.arc(cx, cy - 2, 3.5, Math.PI, 0); mg.stroke();
      mg.fillRect(cx - 5.5, cy - 2, 11, 8);
    }
    if (r.type === 'shrine') { // a circle of pale gold, dimmed while there's no curse to cleanse
      mg.strokeStyle = mg.fillStyle = player.items.some(id => artifact(id).curse && !player.cleansed.includes(id)) ? '#c89a3a' : '#6a6250'; mg.lineWidth = 2;
      mg.beginPath(); mg.arc(cx, cy, 6, 0, 7); mg.stroke();
      mg.beginPath(); mg.arc(cx, cy, 2, 0, 7); mg.fill();
    }
    if (r.type === 'library') { // an open book, dimmed once its choice is made
      mg.fillStyle = !r.visited || r.pages?.some(p => p.set && !p.gone) ? '#e8d8b0' : '#6a6050';
      mg.beginPath(); mg.moveTo(cx, cy - 3); mg.lineTo(cx - 8, cy - 6); mg.lineTo(cx - 8, cy + 4); mg.lineTo(cx, cy + 7); mg.lineTo(cx + 8, cy + 4); mg.lineTo(cx + 8, cy - 6); mg.fill();
      mg.strokeStyle = '#3a2a1c'; mg.lineWidth = 1.5; mg.beginPath(); mg.moveTo(cx, cy - 3); mg.lineTo(cx, cy + 7); mg.stroke();
    }
    if (r.type === 'treasure') {
      mg.fillStyle = r.spots.some(s => !s.taken) ? '#e8b04a' : '#6a5a3a';
      mg.beginPath(); mg.moveTo(cx, cy - 8); mg.lineTo(cx + 7, cy); mg.lineTo(cx, cy + 8); mg.lineTo(cx - 7, cy); mg.fill();
    }
  }
}

export function showBossBar(name: string, e: Pick<Enemy, 'hp' | 'maxHp'>) { el.bossname.textContent = name; updateBossBar(e); el.bossbar.classList.add('on'); }
export function hideBossBar() { el.bossbar.classList.remove('on'); }
export function updateBossBar(e: Pick<Enemy, 'hp' | 'maxHp'>) {
  (el.bossbar.querySelector('.fill') as HTMLElement).style.width = Math.max(0, e.hp / e.maxHp * 100) + '%';
}

let bannerT = 0, toastT = 0;
export function banner(t: string, s = '', dur = 2.6) {
  el.banner.querySelector('.t')!.textContent = t; el.banner.querySelector('.s')!.textContent = s;
  el.banner.classList.add('on'); bannerT = dur;
}
/** A question that stays up until answered or walked away from (a grimoire page asking which spell to give up). */
export function showPrompt(html: string) { el.prompt.innerHTML = html; el.prompt.classList.add('on'); }
export function hidePrompt() { el.prompt.classList.remove('on'); }
export function toast(msg: string, dur = 3) { el.toast.textContent = msg; el.toast.classList.add('on'); toastT = dur; }
export function updateHud(dt: number) {
  updateMagicHud();
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
