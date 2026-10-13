import * as THREE from 'three';
import type { Enemy, Room } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { CFG } from '../config';
import { camera } from '../render/renderer';
import { iconUrl } from '../assets/models';
import { obolFace } from '../items/obolFace';
import { HEART_PATH, RES_ICONS, coinIconBody, soulSvg, spellIcon } from '../render/icons';
import { artifactIconUrl } from '../items/artifactIcons';
import { artifact } from '../items/artifactData';
import { payment, slotDef, spellCooldown, spellCost } from '../magic/cost';
import { rune } from '../magic/runeData';
import { $, clamp } from '../util';
import { on } from '../events';

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
export function setHeroInfo(text: string) {
  el.heroInfo.textContent = text;
}

/** The HUD listens to the game (events.ts): main.ts calls this at boot, before anything is played. */
export function initHud() {
  on('toast', (p) => toast(p.msg, p.dur));
  on('line', (p) => line(p.msg, p.dur));
  on('linesCleared', () => clearLines());
  on('banner', (p) => banner(p.title, p.sub, p.dur));
  on('heartsChanged', () => renderHearts());
  on('heartsReset', () => resetHearts());
  on('mapChanged', () => renderMinimap());
  on('spellsChanged', () => renderSpells());
  on('purseChanged', () => renderPurse());
  on('itemsChanged', () => renderItems());
  on('castRefused', (p) => flashMana(p.slot, p.why));
  on('hurt', () => flashHurt());
  on('bossBarShown', (p) => showBossBar(p.name, p.foe));
  on('bossHealth', (p) => updateBossBar(p.foe));
  on('bossBarHidden', () => hideBossBar());
  on('bossBarMarks', (p) => bossBarMarks(p.at));
  on('promptShown', (p) => showPrompt(p.html));
  on('promptHidden', () => hidePrompt());
  on('fadeFromBlack', () => fadeFromBlack());
  on('manaHexed', () => {
    el.mana.classList.add('hexed');
    setTimeout(() => el.mana.classList.remove('hexed'), 420);
  });
}
