import * as THREE from 'three';
import type { Enemy, Room } from '../types';
import { DEV, G, player } from '../state';
import { STR } from '../strings';
import { CFG } from '../config';
import { camera, renderer } from '../render/renderer';
import { iconUrl } from '../assets/models';
import { obolFace, obolIconUrl } from '../items/obolFace';
import { artifactIconUrl } from '../items/artifactIcons';
import { artifact } from '../items/artifactData';
import { spell } from '../magic/spellData';
import { payment, slotDef, spellCooldown, spellCost } from '../magic/cost';
import { rune } from '../magic/runeData';
import { $, clamp } from '../util';

/** A soul mote's flame (M4.1), and its colours: fill, rim, and the brighter core. */
export const SOUL_PATH =
  'M12 2.8c2.4 3.4 6.3 6.8 6.3 11.3a6.3 6.3 0 0 1-12.6 0c0-2.9 1.5-4.5 2.8-6.1.3 1.7 1.1 2.9 2.3 3.4-.4-3.1 0-5.9 1.2-8.6z';
export const SOUL_HUES = {
  pale: ['#cfe0ff', '#5a6a8a', '#ffffff'],
  black: ['#2a1640', '#a266ff', '#c8a0ff'],
  hallowed: ['#ffe39a', '#9a7a2a', '#fffbe8'],
} as const;
export const soulSvg = (kind: keyof typeof SOUL_HUES) => {
  const [fill, rim, core] = SOUL_HUES[kind];
  return `<svg viewBox="0 0 24 24" class="soul ${kind}"><path d="${SOUL_PATH}" fill="${fill}" stroke="${rim}" stroke-width="1.4"/><ellipse cx="12" cy="15.2" rx="2.3" ry="3" fill="${core}" opacity=".75"/></svg>`;
};
export const HEART_PATH =
  'M12 21.2s-7.6-4.7-9.7-9.3C.8 8.3 3 4.4 6.7 4.4c2.1 0 3.6 1.1 4.4 2.7.8-1.6 2.3-2.7 4.4-2.7 3.7 0 5.9 3.9 4.3 7.5-2.1 4.6-9.8 9.3-9.8 9.3z';
/** How the drawn icons (spells, resources) stroke their lines. */
const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

/* Placeholder spell icons, drawn in the spell's colour. */
const SPELL_ICONS: Record<string, string> = {
  arc: `<path d="M13 2L5 13h6l-2 9 9-12h-6z" fill="currentColor"/>`,
  lance: `<path d="M3 21L21 3" ${S}/><path d="M14 3h7v7" ${S}/><path d="M5 13c2 1 4 3 5 6" ${S}/>`,
  seal: `<circle cx="12" cy="12" r="8" ${S}/><path d="M12 6c2 3 3 5 0 8-3-3-2-5 0-8z" fill="currentColor"/><path d="M8 17h8" ${S}/>`,
  shards: `<path d="M4 20l4-9 2 5zM12 20l0-11 2 6zM20 20l-4-9-2 5z" fill="currentColor"/>`,
  wall: `<path d="M3 20h18M4 20V9l3-4 3 4v11M10 20V7l3-4 3 4v13M16 20V10l3-3 2 3v10" ${S}/>`,
  mantle: `<circle cx="12" cy="8" r="3" ${S}/><path d="M6 21c0-5 3-8 6-8s6 3 6 8" ${S}/><path d="M3 12l3-2-1 4 3-1M21 12l-3-2 1 4-3-1" ${S}/>`,
  // Hallow and Umbral (M4.1)
  consecrate: `<ellipse cx="12" cy="17" rx="9" ry="3.5" ${S}/><path d="M12 3v9M8 6l2 5M16 6l-2 5" ${S}/>`,
  judgement: `<path d="M9 2h6v12H9z" fill="currentColor"/><path d="M4 20h16M7 17l5 3 5-3" ${S}/>`,
  wardlight: `<circle cx="12" cy="12" r="7" ${S} stroke-dasharray="2 3"/><circle cx="12" cy="5" r="2.2" fill="currentColor"/><circle cx="18" cy="15" r="2.2" fill="currentColor"/><circle cx="6" cy="15" r="2.2" fill="currentColor"/>`,
  hexbolt: `<path d="M3 21l7-7" ${S}/><circle cx="14" cy="10" r="5.5" fill="currentColor"/><circle cx="14" cy="10" r="1.8" fill="#120a1c"/>`,
  grasp: `<path d="M7 20v-7M10 20V8M13 20V7M16 20v-9M19 20v-5" ${S}/><path d="M4 21h17" ${S}/>`,
  lantern: `<path d="M12 2v3" ${S}/><path d="M8 7h8l-1 11H9z" ${S}/><path d="M9 20h6" ${S}/><circle cx="12" cy="12.5" r="2.2" fill="currentColor"/>`,
  harvest: `<path d="M5 19c2-8 8-13 15-14c-2 5-6 9-11 10" ${S}/><circle cx="7" cy="8" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/><circle cx="18" cy="14" r="1.6" fill="currentColor"/>`,
  toll: `<circle cx="12" cy="12" r="8" ${S}/><rect x="9.5" y="9.5" width="5" height="5" fill="currentColor"/>`,
  // Verdant (M5)
  thorns: `<path d="M5 21c1-6 4-9 7-11M19 21c-1-6-4-9-7-11M12 21V5" ${S}/><path d="M8 13l-2-1M16 13l2-1M12 9l-2-2M12 9l2-2" ${S}/><path d="M3 21h18" ${S}/>`,
  pollen: `<circle cx="12" cy="13" r="3" fill="currentColor"/><circle cx="6" cy="8" r="1.4" fill="currentColor"/><circle cx="18" cy="7" r="1.6" fill="currentColor"/><circle cx="7" cy="18" r="1.2" fill="currentColor"/><circle cx="17" cy="18" r="1.4" fill="currentColor"/><circle cx="12" cy="4" r="1.1" fill="currentColor"/>`,
  livingwall: `<path d="M3 21h18M6 21v-9M12 21V9M18 21v-8" ${S}/><circle cx="6" cy="9" r="3" ${S}/><circle cx="12" cy="6" r="3.2" ${S}/><circle cx="18" cy="10" r="2.8" ${S}/>`,
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

/** The two spell slots: the spell's icon, its key and its mana cost (empty slots dimmed); M6 step 7: a pip for each place
    in the slot's socket, in the colour of the rune carved there (hollow while empty), and Vein's half heart, shown while it
    would pay. */
export function renderSpells() {
  player.spells.forEach((id, i) => {
    const slot = $(`slot${i}`),
      key = STR.controls.spellsKeys.split(' and ')[i] ?? '',
      socket = player.sockets[i];
    slot.classList.toggle('empty', !id);
    const pips = socket
      ? Array.from({ length: socket.size }, (_, k) => {
          const r = socket.runes[k];
          return r ? `<i style="--c:${rune(r).color}"></i>` : '<i class="hollow"></i>';
        }).join('')
      : '';
    slot.innerHTML = id
      ? `${spellIcon(id)}<i class="cd"></i><b>${key}</b><small>${slotDef(i)!.mana}</small><span class="pips">${pips}</span>` +
        (socket?.runes.includes('vein')
          ? `<svg class="blood" viewBox="0 0 24 24" aria-hidden="true"><path d="${HEART_PATH}" fill="#c42c1f" clip-path="url(#halfclip)"/></svg>`
          : '')
      : `<b>${key}</b>`; // (M6: as its runes make it)
  });
}
let lastMana = -1;
/** Every frame: the mana bar, and each slot's cooldown and whether mana is short. */
function updateMagicHud() {
  const max = player.stats.maxMana,
    m = Math.round(player.mana);
  if (m !== lastMana) {
    lastMana = m;
    el.manaFill.style.transform = `scaleX(${max ? player.mana / max : 0})`;
    el.mana.setAttribute('aria-valuemax', String(max));
    el.mana.setAttribute('aria-valuenow', String(m));
    el.mana.setAttribute('aria-label', STR.manaLabel(m, max));
  }
  player.spells.forEach((id, i) => {
    if (!id) return;
    const slot = $(`slot${i}`),
      cd = slot.querySelector<HTMLElement>('.cd'),
      def = slotDef(i)!;
    if (cd) cd.style.height = `${Math.min(1, player.spellCd[i] / spellCooldown(def)) * 100}%`;
    const cost = Math.round(spellCost(def)),
      small = slot.querySelector('small');
    if (small && small.textContent !== String(cost)) small.textContent = String(cost); // the Witch's Knot changes it
    slot.classList.toggle('poor', player.mana < spellCost(def));
    slot.classList.toggle('vein', payment(i) === 'vein'); // (M6: Vein would pay in blood)
  });
}
/** A refused cast: the slot flashes red, and the mana bar too when mana was short. */
export function flashMana(slot: number, why: 'cooldown' | 'mana' | 'target') {
  const s = $(`slot${slot}`);
  s.classList.add('flash');
  setTimeout(() => s.classList.remove('flash'), 220);
  if (why === 'mana') {
    el.mana.classList.add('flash');
    setTimeout(() => el.mana.classList.remove('flash'), 260);
  }
}

/* Obol, bone key and glyph icons for the counters under the artifacts. */
export const RES_ICONS = {
  coins: `<circle cx="12" cy="12" r="8" fill="#b8903e" stroke="#5a4418" stroke-width="1.5"/><rect x="10" y="10" width="4" height="4" fill="#3a2a10"/>`,
  keys: `<circle cx="7" cy="12" r="3.6" fill="none" stroke="#e8dcc0" stroke-width="2.2"/><path d="M10.5 12H20M17 12v3.5M20 12v2.5" stroke="#e8dcc0" stroke-width="2.2" stroke-linecap="round"/>`,
  glyphs: `<circle cx="12" cy="12" r="9" fill="#2b2622" stroke="#6b6158" stroke-width="1.2"/><path d="M${Array.from(
    { length: 8 },
    (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 6) / 7;
      return `${(12 + Math.cos(a) * 6.3).toFixed(2)} ${(12 + Math.sin(a) * 6.3).toFixed(2)}`;
    },
  ).join('L')}" fill="none" stroke="#ffb04a" stroke-width="1.2" stroke-linejoin="round"/>`,
};

/** The obol's icon inside a 24 × 24 viewBox: the face the obols wear (2026-10-02, the owner's coins), or the drawn coin. */
export function coinIconBody() {
  const url = obolIconUrl();
  return url ? `<image href="${url}" width="24" height="24" style="image-rendering:pixelated"/>` : RES_ICONS.coins;
}

const el = {
  purse: $('purse'),
  mana: $('mana'),
  manaFill: $('mana').querySelector('i') as HTMLElement,
  hearts: $('hearts'),
  items: $('items'),
  bossbar: $('bossbar'),
  bossname: $('bossname'),
  banner: $('banner'),
  toast: $('toast'),
  prompt: $('prompt'),
  hurt: $('hurt'),
  dim: $('dim'),
  chill: $('chill'),
  stone: $('stone'),
  heroInfo: $('heroInfo'),
};

let lastHearts = '';
export function resetHearts() {
  lastHearts = '';
}
export function renderHearts() {
  const key = player.hp + '/' + player.maxHp + '/' + player.souls.join();
  if (key === lastHearts) return;
  lastHearts = key;
  let html = '';
  for (let i = 0; i < player.maxHp / 2; i++) {
    const half = player.maxHp - i * 2 === 1,
      v = clamp(player.hp - i * 2, 0, half ? 1 : 2); // (M6: Vigor's half container, a half heart's outline)
    html +=
      `<svg viewBox="0 0 24 24"${half ? ' class="half"' : ''}><path d="${HEART_PATH}" fill="#2a1210" stroke="#0b0504" stroke-width="1.6"${half ? ' clip-path="url(#halfclip)"' : ''}/>` +
      (v === 2
        ? `<path d="${HEART_PATH}" fill="#c42c1f"/>`
        : v === 1
          ? `<path d="${HEART_PATH}" fill="#c42c1f" clip-path="url(#halfclip)"/>`
          : '') +
      `<path d="M7 7.2c-1.2.3-2 1.2-2.2 2.4" stroke="rgba(255,220,200,.55)" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>`;
  }
  for (const kind of player.souls) html += soulSvg(kind); // soul motes after the hearts (M4.1), in the order taken
  el.hearts.innerHTML = html;
  el.hearts.setAttribute('aria-label', STR.health(player.hp / 2, player.maxHp / 2, player.souls.length));
}

let lastPurse = '';
/** Obols, bone keys and blast glyphs carried, as icons and two-digit counts. */
export function renderPurse() {
  const key = `${player.coins}/${player.keys}/${player.glyphs}/${obolFace()}`;
  if (key === lastPurse) return;
  lastPurse = key;
  el.purse.innerHTML = (['coins', 'keys', 'glyphs'] as const)
    .map(
      (k) =>
        `<span class="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${k === 'coins' ? coinIconBody() : RES_ICONS[k]}</svg><b>${String(player[k]).padStart(2, '0')}</b></span>`,
    )
    .join('');
  el.purse.setAttribute('aria-label', STR.purse(player.coins, player.keys, player.glyphs));
}

/** An artifact's icon as inline SVG in its colour: the focus framed, cursed ones ringed in red until a
    shrine cleanses them (then a pale ring). */
export function artifactIcon(id: string, isFocus: boolean, cleansed = player.cleansed.includes(id)) {
  const def = artifact(id),
    clean = cleansed && !!def.curse;
  const cls = isFocus ? 'focus' : clean ? 'cleansed' : def.kind === 'cursed' ? 'cursed' : '';
  const text = clean ? def.curse!.cleansed : def.text;
  const url = iconUrl(id) ?? artifactIconUrl(def); // (a painted icon, M3.5, or the room kit's, rendered from its model)
  const art = `<image href="${url}" width="24" height="24" style="image-rendering:pixelated"/>`;
  return `<svg viewBox="0 0 24 24" class="${cls}" style="color:${def.color}" role="img" aria-label="${def.name}"><title>${def.name}: ${text}\n\n${def.lore}</title>${art}</svg>`;
}
/** The focus followed by every other artifact held. */
export function renderItems() {
  el.items.innerHTML = [player.focus, ...player.items].map((id, i) => artifactIcon(id, i === 0)).join('');
}

/** Mask of the Drowned: darkness everywhere but a circle around the mage. */
const vision = $('vision'),
  v3 = new THREE.Vector3();
export function updateVision() {
  const on = player.stats.effects.has('vision') && G.state !== 'title' && G.state !== 'end';
  vision.style.display = on ? 'block' : 'none';
  if (!on) return;
  v3.set(player.x, 0.6, player.z).project(camera);
  const x = ((v3.x + 1) / 2) * innerWidth,
    y = ((1 - v3.y) / 2) * innerHeight;
  const r = (CFG.artifacts.visionRadius * innerHeight * camera.zoom) / (camera.top - camera.bottom);
  vision.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(3,2,2,0) ${r * 0.55}px, rgba(3,2,2,.96) ${r}px)`;
}

const mm = $<HTMLCanvasElement>('minimap'),
  mg = mm.getContext('2d')!;
/** Rooms whose mark on the minimap says already whether they are done (a shop, an altar, a vault, a shrine, a library, a
    laboratory, a waystone room, the treasure room, an ordeal): the finished mark leaves them be. */
const OWN_MARK = new Set([
  'merchant',
  'altar',
  'vault',
  'shrine',
  'library',
  'laboratory',
  'waystone',
  'treasure',
  'ordeal',
]);
/** Whether room `r` is finished (the owner's ask, 2026-10-02): been in, its fight won, and nothing left in it to take (no
    pickup lying, no coffer or chest unopened, no artifact or page left). The minimap draws it a shade darker with a small
    tick, so the rooms still holding something stand out. */
export function roomFinished(r: Room) {
  if (!r.visited || !r.cleared || r.locked || OWN_MARK.has(r.type)) return false;
  if (r.spots.some((s) => !s.taken) || r.pages?.some((p) => !p.gone)) return false;
  const b = r.bounds;
  return !G.pickups.some(
    (p) => p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ && !(p.contents && p.opened),
  );
}
let finishedKey = '',
  finishedT = 0;
/** A few times a second: the minimap drawn again when a room becomes finished (its last thing taken) or stops being so. */
function watchFinished(dt: number) {
  if ((finishedT -= dt) > 0) return;
  finishedT = 0.25;
  const key = G.rooms.map((r) => +roomFinished(r)).join('');
  if (key !== finishedKey) {
    finishedKey = key;
    renderMinimap();
  }
}
/** The map of known rooms around the current one. Rooms are drawn cell by cell, joined where a room spans
    several cells; corridors are drawn narrow. */
export function renderMinimap() {
  const W = mm.width,
    H = mm.height,
    cw = 38,
    ch = 24,
    gap = 6,
    cur = G.current;
  mg.clearRect(0, 0, W, H);
  const mid = (r: typeof cur) => ({
    gx: r.plan.cells.reduce((a, c) => a + c.gx, 0) / r.plan.cells.length,
    gy: r.plan.cells.reduce((a, c) => a + c.gy, 0) / r.plan.cells.length,
  });
  const centre = mid(cur);
  const px = (gx: number) => W / 2 + (gx - centre.gx) * (cw + gap),
    py = (gy: number) => H / 2 + (gy - centre.gy) * (ch + gap);
  // the Grave Lantern shows the secret room before it's found
  const lantern = player.stats.effects.has('graveLantern');
  const shown = G.rooms.filter((r) => r.visited || r.known || (lantern && r.type === 'secret'));
  // rectangles for a room: its cells (corridors narrow) and the gaps between neighbouring cells
  const rects = (r: typeof cur) => {
    const out: [number, number, number, number][] = [];
    const nx = r.plan.shape === 'corridor_ns' ? cw * 0.36 : cw,
      ny = r.plan.shape === 'corridor_ew' ? ch * 0.42 : ch;
    const has = (gx: number, gy: number) => r.plan.cells.some((c) => c.gx === gx && c.gy === gy);
    for (const c of r.plan.cells) {
      out.push([px(c.gx) - nx / 2, py(c.gy) - ny / 2, nx, ny]);
      if (has(c.gx + 1, c.gy)) out.push([px(c.gx) + cw / 2 - 1, py(c.gy) - ch / 2, gap + 2, ch]);
      if (has(c.gx, c.gy + 1)) out.push([px(c.gx) - cw / 2, py(c.gy) + ch / 2 - 1, cw, gap + 2]);
      if (has(c.gx + 1, c.gy) && has(c.gx, c.gy + 1) && has(c.gx + 1, c.gy + 1))
        out.push([px(c.gx) + cw / 2 - 1, py(c.gy) + ch / 2 - 1, gap + 2, gap + 2]);
    }
    return out;
  };
  mg.fillStyle = 'rgba(0,0,0,.55)';
  for (const r of shown) for (const [x, y, w, h] of rects(r)) mg.fillRect(x - 3, y - 3, w + 6, h + 6);
  for (const r of shown) {
    const done = roomFinished(r);
    mg.fillStyle = r === cur ? '#efe2c3' : r.visited ? (done ? '#837660' : '#a2937a') : '#4d443a'; // (finished: a shade darker)
    for (const [x, y, w, h] of rects(r)) mg.fillRect(x, y, w, h);
    const m = mid(r),
      cx = px(m.gx),
      cy = py(m.gy);
    if (done) {
      // a small tick in the corner of its last cell
      const c = [...r.plan.cells].sort((a, b) => a.gy - b.gy || a.gx - b.gx).at(-1)!,
        ex = px(c.gx) + cw / 2,
        ey = py(c.gy) + ch / 2;
      mg.strokeStyle = r === cur ? '#6a5a44' : '#4a3e30';
      mg.lineWidth = 1.6;
      mg.beginPath();
      mg.moveTo(ex - 10, ey - 6);
      mg.lineTo(ex - 7, ey - 3);
      mg.lineTo(ex - 3, ey - 9);
      mg.stroke();
    }
    if (r.type === 'boss') {
      mg.fillStyle = '#b3261a';
      mg.beginPath();
      mg.arc(cx, cy - 1, 7, 0, 7);
      mg.fill();
      mg.fillStyle = '#1a0806';
      mg.fillRect(cx - 4, cy - 3, 3, 3);
      mg.fillRect(cx + 1, cy - 3, 3, 3);
    }
    if (r.type === 'ordeal') {
      // crossed blades, dimmed once passed
      mg.strokeStyle = r.cleared ? '#5a5048' : '#2a2226';
      mg.lineWidth = 3;
      mg.beginPath();
      mg.moveTo(cx - 6, cy - 6);
      mg.lineTo(cx + 6, cy + 6);
      mg.moveTo(cx + 6, cy - 6);
      mg.lineTo(cx - 6, cy + 6);
      mg.stroke();
    }
    if (r.type === 'altar') {
      // an arch of bone, dimmed once paid
      mg.strokeStyle = r.spots.some((s) => !s.taken) ? '#e8dcc0' : '#6a5a4a';
      mg.lineWidth = 2.5;
      mg.beginPath();
      mg.arc(cx, cy + 3, 6, Math.PI, 0);
      mg.moveTo(cx - 6, cy + 3);
      mg.lineTo(cx - 6, cy + 7);
      mg.moveTo(cx + 6, cy + 3);
      mg.lineTo(cx + 6, cy + 7);
      mg.stroke();
    }
    if (r.type === 'secret') {
      // an eye of pale blue chalk, once found (fainter while only the Grave Lantern knows of it)
      mg.strokeStyle = mg.fillStyle = r.found ? '#8ab8ff' : '#5a7aa8';
      mg.lineWidth = 2;
      mg.beginPath();
      mg.ellipse(cx, cy, 7, 4, 0, 0, 7);
      mg.stroke();
      mg.beginPath();
      mg.arc(cx, cy, 2, 0, 7);
      mg.fill();
    }
    if (r.type === 'merchant') {
      // an obol
      mg.fillStyle = '#d8a848';
      mg.beginPath();
      mg.arc(cx, cy, 6, 0, 7);
      mg.fill();
      mg.fillStyle = '#5a3e14';
      mg.beginPath();
      mg.arc(cx, cy, 2.2, 0, 7);
      mg.fill();
    }
    if (r.type === 'vault') {
      // a padlock, pale blue while the ward holds, dimmed once the vault is emptied
      const sealed = r.doors.some((d) => d.seal?.sealed),
        empty = r.visited && r.cleared && !r.spots.some((s) => !s.taken);
      mg.strokeStyle = mg.fillStyle = sealed ? '#8ab8ff' : empty ? '#5a5a62' : '#c8c8d4';
      mg.lineWidth = 2;
      mg.beginPath();
      mg.arc(cx, cy - 2, 3.5, Math.PI, 0);
      mg.stroke();
      mg.fillRect(cx - 5.5, cy - 2, 11, 8);
    }
    if (r.type === 'shrine') {
      // a circle of pale gold, dimmed while there's no curse to cleanse and no bargain waiting (M6)
      mg.strokeStyle = mg.fillStyle =
        player.items.some((id) => artifact(id).curse && !player.cleansed.includes(id)) ||
        (r.bargain?.state ?? 'idle') !== 'kept'
          ? '#c89a3a'
          : '#6a6250';
      mg.lineWidth = 2;
      mg.beginPath();
      mg.arc(cx, cy, 6, 0, 7);
      mg.stroke();
      mg.beginPath();
      mg.arc(cx, cy, 2, 0, 7);
      mg.fill();
    }
    if (r.type === 'library') {
      // an open book, dimmed once its choice is made
      mg.fillStyle = !r.visited || r.pages?.some((p) => p.set && !p.gone) ? '#e8d8b0' : '#6a6050';
      mg.beginPath();
      mg.moveTo(cx, cy - 3);
      mg.lineTo(cx - 8, cy - 6);
      mg.lineTo(cx - 8, cy + 4);
      mg.lineTo(cx, cy + 7);
      mg.lineTo(cx + 8, cy + 4);
      mg.lineTo(cx + 8, cy - 6);
      mg.fill();
      mg.strokeStyle = '#3a2a1c';
      mg.lineWidth = 1.5;
      mg.beginPath();
      mg.moveTo(cx, cy - 3);
      mg.lineTo(cx, cy + 7);
      mg.stroke();
    }
    if (r.type === 'laboratory') {
      // (M5) a round flask of green jelly
      mg.fillStyle = '#7ae070';
      mg.beginPath();
      mg.arc(cx, cy + 2, 5.5, 0, 7);
      mg.fill();
      mg.fillRect(cx - 1.8, cy - 7, 3.6, 6);
      mg.fillStyle = '#c8ffb0';
      mg.fillRect(cx - 3, cy - 8, 6, 2);
    }
    if (r.type === 'waystone') {
      // (M6 step 10) a standing stone with a gold rune, dimmed once it has given its rest
      const rested = !!r.waystone?.rested;
      mg.fillStyle = rested ? '#5a5c62' : '#9a9ea8';
      mg.beginPath();
      mg.moveTo(cx - 4, cy + 7);
      mg.lineTo(cx - 3.5, cy - 5);
      mg.lineTo(cx, cy - 8);
      mg.lineTo(cx + 3.5, cy - 5);
      mg.lineTo(cx + 4, cy + 7);
      mg.fill();
      mg.fillStyle = rested ? '#7a6030' : '#ffbe3a';
      mg.fillRect(cx - 1, cy - 4, 2, 7);
      mg.fillRect(cx - 2.5, cy - 1, 5, 1.6);
    }
    if (r.type === 'treasure') {
      mg.fillStyle = r.spots.some((s) => !s.taken) ? '#e8b04a' : '#6a5a3a';
      mg.beginPath();
      mg.moveTo(cx, cy - 8);
      mg.lineTo(cx + 7, cy);
      mg.lineTo(cx, cy + 8);
      mg.lineTo(cx - 7, cy);
      mg.fill();
    }
  }
}

export function showBossBar(name: string, e: Pick<Enemy, 'hp' | 'maxHp'>) {
  el.bossname.textContent = name;
  updateBossBar(e);
  el.bossbar.classList.add('on');
}
export function hideBossBar() {
  el.bossbar.classList.remove('on');
  el.bossbar.querySelectorAll('.mark').forEach((m) => m.remove());
}
/** Marks on the boss bar at these shares of its health (M7: Kaelith's phases); none for every other boss. */
export function bossBarMarks(at: readonly number[]) {
  const track = el.bossbar.querySelector('.track') as HTMLElement;
  track.querySelectorAll('.mark').forEach((m) => m.remove());
  for (const f of at) {
    const m = document.createElement('div');
    m.className = 'mark';
    m.style.left = f * 100 + '%';
    track.append(m);
  }
}
export function updateBossBar(e: Pick<Enemy, 'hp' | 'maxHp'>) {
  (el.bossbar.querySelector('.fill') as HTMLElement).style.width = Math.max(0, (e.hp / e.maxHp) * 100) + '%';
}

let bannerT = 0,
  toastT = 0;
export function banner(t: string, s = '', dur = 2.6) {
  el.banner.querySelector('.t')!.textContent = t;
  el.banner.querySelector('.s')!.textContent = s;
  el.banner.classList.add('on');
  bannerT = dur;
}
/** A question that stays up until answered or walked away from (a grimoire page asking which spell to give up). */
export function showPrompt(html: string) {
  el.prompt.innerHTML = html;
  el.prompt.classList.add('on');
}
export function hidePrompt() {
  el.prompt.classList.remove('on');
}
/** Whether a page's question is up (M6: the level-up screen waits for it). */
export const promptShowing = () => el.prompt.classList.contains('on');
export function toast(msg: string, dur = 3) {
  el.toast.textContent = msg;
  el.toast.classList.add('on');
  toastT = dur;
}
/** Whether a toast is showing now (a first-time line waits for it rather than cut it short). */
export const toastShowing = () => toastT > 0;
/** A first-time line (what a mantle, a pair or the ground does, M4.7): shown now, or after the line showing, never cutting
    it short; several wait their turn. A new run drops any still waiting. */
const waiting: { msg: string; dur: number }[] = [];
export function line(msg: string, dur = 3.5) {
  if (toastT > 0) waiting.push({ msg, dur });
  else toast(msg, dur);
}
/** Drop the lines waiting and the one showing (a new run; the jelly serpent breaking out, which says its own). */
export function clearLines() {
  waiting.length = 0;
  toastT = 0;
  el.toast.classList.remove('on');
}
const dimAt = new THREE.Vector3();
export function updateHud(dt: number) {
  updateMagicHud();
  watchFinished(dt); // (the minimap's finished rooms)
  // dimmed sight (a Sporeling's spores): darkness closing in round the mage, fading as it wears off
  const dim = Math.min(1, player.dim / 0.6).toFixed(2);
  if (el.dim.style.opacity !== dim) el.dim.style.opacity = dim;
  const chill = player.chill > 0 ? '1' : '0';
  if (el.chill.style.opacity !== chill) el.chill.style.opacity = chill;
  const stone = player.stone > 0 ? '1' : '0';
  if (el.stone.style.opacity !== stone) el.stone.style.opacity = stone; // (a basilisk's stare: grey at the rim)
  if (player.dim > 0) {
    dimAt.set(player.x, 0.6, player.z).project(camera);
    el.dim.style.setProperty('--x', `${(dimAt.x + 1) * 50}%`);
    el.dim.style.setProperty('--y', `${(1 - dimAt.y) * 50}%`);
  }
  if (bannerT > 0) {
    bannerT -= dt;
    if (bannerT <= 0) el.banner.classList.remove('on');
  }
  if (toastT > 0) {
    toastT -= dt;
    if (toastT <= 0) {
      el.toast.classList.remove('on');
      const next = waiting.shift();
      if (next) toast(next.msg, next.dur);
    }
  }
}

/** Cut to black and fade back in, to cover building a new floor. */
export function fadeFromBlack() {
  const f = $('fade');
  f.style.transition = 'none';
  f.style.opacity = '1';
  void f.offsetWidth; // apply the black before starting the fade
  f.style.transition = 'opacity .7s ease-out';
  f.style.opacity = '0';
}

/** Red screen-edge flash (CSS transition, so real time is fine here). */
export function flashHurt() {
  el.hurt.style.opacity = '1';
  setTimeout(() => (el.hurt.style.opacity = '0'), 160);
}
/** The dev menu's frame readout (DEV.fps): the frame rate, as the median of the last half second's frames, and what
    the last frame drew. Written only when it changes. */
const frameEl = $('fpsInfo'),
  frameTimes: number[] = [],
  FRAME_WINDOW_MS = 500,
  STALL_MS = 1000;
let frameSpan = 0,
  frameText = '';
export function updateFrameInfo(ms: number) {
  if (frameEl.hidden === DEV.fps) frameEl.hidden = !DEV.fps;
  if (!DEV.fps || !(ms > 0) || ms > STALL_MS) return;
  frameTimes.push(ms);
  if ((frameSpan += ms) < FRAME_WINDOW_MS) return;
  const median = frameTimes.sort((a, b) => a - b)[frameTimes.length >> 1];
  frameTimes.length = 0;
  frameSpan = 0;
  const text = STR.dev.frameInfo(Math.round(1000 / median), renderer.info.render.calls, renderer.info.render.triangles);
  if (text !== frameText) frameEl.textContent = frameText = text;
}

export function setHeroInfo(text: string) {
  el.heroInfo.textContent = text;
}
