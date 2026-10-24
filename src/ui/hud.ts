import * as THREE from 'three';
import type { Enemy, Room } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { CFG } from '../config';
import { camera } from '../render/renderer';
import { iconUrl } from '../assets/models';
import { obolFace } from '../items/obolFace';
import { HEART_PATH, coinIconBody, spellIcon, spellIconSvg } from '../render/icons';
import { onPixelIcons, pixelIcon } from '../render/pixelIcons';
import { spell } from '../magic/spellData';
import { artifactIconUrl } from '../items/artifactIcons';
import { artifact } from '../items/artifactData';
import { payment, slotDef, spellCooldown, spellCost } from '../magic/cost';
import { rune } from '../magic/runeData';
import { $, clamp } from '../util';
import { on } from '../events';

/** The two spell slots, each an octagonal medallion: the spell's icon, its key and its mana cost (empty slots dimmed); a
    pip for each place in the slot's socket, in the colour of the rune carved there (hollow while empty), and Vein's half
    heart, shown while it would pay. */
export function renderSpells() {
  const u = hudPixel();
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
      ? `${spellPixelIcon(id, u)}<i class="cd"></i><b>${key}</b><small>${slotDef(i)!.mana}</small><span class="pips">${pips}</span>` +
        (socket?.runes.includes('vein')
          ? `<svg class="blood" viewBox="0 0 24 24" aria-hidden="true"><path d="${HEART_PATH}" fill="#c42c1f" clip-path="url(#halfclip)"/></svg>`
          : '')
      : `<b>${key}</b>`; // (as its runes make it)
  });
}
/** The size of the HUD's pixel in screen pixels (art bible 4.6: its panels and icons are pixel art, one HUD pixel a
    screen pixel at 720 lines, two from `CFG.hud.tall`), and its text's scale beside it. */
export const hudPixel = () => (innerHeight >= CFG.hud.tall ? CFG.hud.pixel[1] : CFG.hud.pixel[0]);
const hudText = () => (innerHeight >= CFG.hud.tall ? CFG.hud.text[1] : CFG.hud.text[0]);
/** The CSS's `--u` and `--t`, from CFG.hud alone (style.css reads them and holds no sizes of its own for them). */
function setHudScale() {
  const root = document.documentElement.style;
  root.setProperty('--u', `${hudPixel()}px`);
  root.setProperty('--t', String(hudText()));
}
setHudScale();
/** A spell's icon made pixel art (render/pixelIcons.ts), or its drawn icon while that is being made. */
function spellPixelIcon(id: string, u: number) {
  const def = spell(id),
    url = pixelIcon(`spell:${id}`, spellIconSvg(id, def.color), CFG.hud.spellIcon);
  return url
    ? `<img class="px icon" src="${url}" width="${(CFG.hud.spellIcon + 2) * u}" height="${(CFG.hud.spellIcon + 2) * u}" alt="${def.name}" title="${def.name}: ${def.text}">`
    : spellIcon(id);
}
onPixelIcons(() => renderSpells()); // (an icon made: the slots drawn again with it)
addEventListener('resize', () => {
  setHudScale();
  lastHearts = lastPurse = '';
  lastMana = -1;
  renderSpells();
  renderHearts();
  renderPurse();
}); // (the HUD's pixel follows the window's height)
let lastMana = -1;
const cdWas = [0, 0];
/** Every frame: the mana vial (filled in whole HUD pixels, its number beside it), and each slot's cooldown (draining in
    steps, the medallion lit a moment as it comes ready) and whether mana is short. */
function updateMagicHud() {
  const max = player.stats.maxMana,
    m = Math.round(player.mana);
  if (m !== lastMana) {
    lastMana = m;
    const fill = Math.round(CFG.hud.vial * (max ? clamp(player.mana / max, 0, 1) : 0));
    el.manaFill.style.width = `calc(var(--u) * ${fill})`;
    el.manaNum.textContent = String(m);
    el.mana.setAttribute('aria-valuemax', String(max));
    el.mana.setAttribute('aria-valuenow', String(m));
    el.mana.setAttribute('aria-label', STR.manaLabel(m, max));
  }
  player.spells.forEach((id, i) => {
    if (!id) return;
    const slot = $(`slot${i}`),
      cd = slot.querySelector<HTMLElement>('.cd'),
      def = slotDef(i)!,
      left = Math.min(1, player.spellCd[i] / spellCooldown(def)),
      steps = CFG.hud.cdSteps;
    if (cd) cd.style.height = `${(Math.ceil(left * steps) / steps) * 100}%`;
    if (cdWas[i] > 0 && left <= 0) blink(slot, 'ready', CFG.hud.ready);
    cdWas[i] = left;
    const cost = Math.round(spellCost(def)),
      small = slot.querySelector('small');
    if (small && small.textContent !== String(cost)) small.textContent = String(cost); // the Witch's Knot changes it
    slot.classList.toggle('poor', player.mana < spellCost(def));
    slot.classList.toggle('vein', payment(i) === 'vein'); // (Vein would pay in blood)
  });
}
/** Class `cls` on `e` for `sec` seconds (a held frame of the CSS's: a flash, a spell come ready). */
function blink(e: Element, cls: string, sec: number) {
  e.classList.add(cls);
  setTimeout(() => e.classList.remove(cls), sec * 1000);
}
/** A refused cast: the slot flashes red, and the mana vial too when mana was short. */
export function flashMana(slot: number, why: 'cooldown' | 'mana' | 'target') {
  blink($(`slot${slot}`), 'flash', 0.22);
  if (why === 'mana') blink(el.mana, 'flash', 0.26);
}

const el = {
  purse: $('purse'),
  mana: $('mana'),
  manaFill: $('mana').querySelector('i') as HTMLElement,
  manaNum: $('manaNum'),
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

let lastHearts = '',
  lastFill: number[] = [];
export function resetHearts() {
  lastHearts = '';
  lastFill = [];
}
/** The hearts as rubies in gold settings (`.ht`, style.css: a frame of public/assets/hud/hearts.png each), Vigor's half
    container a half setting, the soul motes after them; a heart that lost blood since it was last drawn plays its crack. */
export function renderHearts() {
  const key = player.hp + '/' + player.maxHp + '/' + player.souls.join();
  if (key === lastHearts) return;
  lastHearts = key;
  let html = '';
  const fill: number[] = [];
  for (let i = 0; i < player.maxHp / 2; i++) {
    const half = player.maxHp - i * 2 === 1,
      v = clamp(player.hp - i * 2, 0, half ? 1 : 2), // (Vigor's half container holds one half)
      was = lastFill[i],
      crack = was !== undefined && v < was ? ` c${was}${v}` : ''; // (its five frames: style.css, `.ht.c21` and the rest)
    fill.push(v);
    html += `<i class="ht f${v}${half ? ' half' : ''}${crack}" aria-hidden="true"></i>`;
  }
  lastFill = fill;
  for (const kind of player.souls) html += `<i class="ht soul ${kind}" aria-hidden="true"></i>`; // (in the order taken)
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
        `<span class="${k}">${k === 'coins' ? `<svg viewBox="0 0 24 24" aria-hidden="true">${coinIconBody()}</svg>` : '<i aria-hidden="true"></i>'}<b>${String(player[k]).padStart(2, '0')}</b></span>`,
    )
    .join('');
  el.purse.setAttribute('aria-label', STR.purse(player.coins, player.keys, player.glyphs));
}

/** An artifact's icon as inline SVG in its colour: the focus framed, cursed ones ringed in red until a
    shrine cleanses them (then a pale ring). Its picture is 24 pixels of pixel art, shown in whole steps (`svg.art` in the
    CSS: 1× in the HUD, 2× on the cards): drawn in Aseprite where data/assets.json lists one (it carries its own ink
    outline), else rendered from the artifact's model (items/artifactIcons.ts). */
export function artifactIcon(id: string, isFocus: boolean, cleansed = player.cleansed.includes(id)) {
  const def = artifact(id),
    clean = cleansed && !!def.curse;
  const cls = isFocus ? 'focus' : clean ? 'cleansed' : def.kind === 'cursed' ? 'cursed' : '';
  const text = clean ? def.curse!.cleansed : def.text;
  const url = iconUrl(id) ?? artifactIconUrl(def); // (the drawn icon, or the room kit's, rendered from its model)
  const art = `<image href="${url}" width="24" height="24" style="image-rendering:pixelated"/>`;
  return `<svg viewBox="0 0 24 24" class="art${cls ? ' ' + cls : ''}" style="color:${def.color}" role="img" aria-label="${def.name}"><title>${def.name}: ${text}\n\n${def.lore}</title>${art}</svg>`;
}
/** The focus followed by every other artifact held. */
export function renderItems() {
  el.items.innerHTML = [player.focus, ...player.items].map((id, i) => artifactIcon(id, i === 0)).join('');
}

/** Mask of the Drowned: darkness everywhere but a circle around the mage. */
const vision = $('vision'),
  v3 = new THREE.Vector3();
export function updateVision() {
  const on = player.stats.effects.has('vision') && G.flow.state !== 'title' && G.flow.state !== 'end';
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
mm.width = CFG.hud.map.w; // (drawn a HUD pixel a canvas pixel, shown at --u: style.css)
mm.height = CFG.hud.map.h;
mm.style.width = `calc(var(--u) * ${CFG.hud.map.w})`;
mm.style.height = `calc(var(--u) * ${CFG.hud.map.h})`;
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
/** Whether room `r` is finished: been in, its fight won, and nothing left in it to take (no
    pickup lying, no coffer or chest unopened, no artifact or page left). The minimap draws it a shade darker with a small
    tick, so the rooms still holding something stand out. */
export function roomFinished(r: Room) {
  if (!r.visited || !r.cleared || r.locked || OWN_MARK.has(r.type)) return false;
  if (r.spots.some((s) => !s.taken) || r.pages?.some((p) => !p.gone)) return false;
  const b = r.bounds;
  return !G.room.pickups.some(
    (p) => p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ && !(p.contents && p.opened),
  );
}
let finishedKey = '',
  finishedT = 0;
/** A few times a second: the minimap drawn again when a room becomes finished (its last thing taken) or stops being so. */
function watchFinished(dt: number) {
  if ((finishedT -= dt) > 0) return;
  finishedT = 0.25;
  const key = G.floor.rooms.map((r) => +roomFinished(r)).join('');
  if (key !== finishedKey) {
    finishedKey = key;
    renderMinimap();
  }
}
/* The minimap's marks as pixel art at the HUD's pixel (art bible 4.6): a character a pixel, '.' clear, each letter a
   colour the mark is drawn in. */
const MARKS = {
  boss: ['.rrrrr.', 'rrrrrrr', 'rkrrrkr', 'rrrrrrr', '.r.r.r.'],
  ordeal: ['x...x', '.x.x.', '..x..', '.x.x.', 'x...x'],
  altar: ['.aaa.', 'a...a', 'a...a', 'a...a'],
  secret: ['.eee.', 'e.p.e', '.eee.'],
  merchant: ['.ooo.', 'oodoo', '.ooo.'],
  vault: ['.lll.', '.l.l.', 'lllll', 'lllll', 'lllll'],
  shrine: ['.sss.', 's...s', 's.d.s', 's...s', '.sss.'],
  library: ['bbdbb', 'bbdbb', 'bbdbb', '.bdb.'],
  laboratory: ['.c.', '.f.', 'fff', 'fff'],
  waystone: ['..s..', '.sgs.', '.sgs.', '.sss.'],
  treasure: ['..t..', '.ttt.', 'ttttt', '.ttt.', '..t..'],
  done: ['...t', '..t.', 't.t.', '.t..'],
};
/** Mark `rows` centred on (cx, cy), its letters coloured by `pal`. */
function mark(rows: string[], cx: number, cy: number, pal: Record<string, string>) {
  const x0 = Math.round(cx - rows[0].length / 2),
    y0 = Math.round(cy - rows.length / 2);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      mg.fillStyle = pal[ch];
      mg.fillRect(x0 + x, y0 + y, 1, 1);
    }),
  );
}
/** The map of known rooms around the current one, at the HUD's pixel: rooms drawn cell by cell, joined where a room
    spans several cells, corridors narrow, each room's kind marked in pixels. */
export function renderMinimap() {
  const W = mm.width,
    H = mm.height,
    [cw, ch, gap] = CFG.hud.map.cell,
    cur = G.room.current;
  mg.clearRect(0, 0, W, H);
  const mid = (r: typeof cur) => ({
    gx: r.plan.cells.reduce((a, c) => a + c.gx, 0) / r.plan.cells.length,
    gy: r.plan.cells.reduce((a, c) => a + c.gy, 0) / r.plan.cells.length,
  });
  const centre = mid(cur);
  const px = (gx: number) => Math.round(W / 2 + (gx - centre.gx) * (cw + gap)),
    py = (gy: number) => Math.round(H / 2 + (gy - centre.gy) * (ch + gap));
  // the Grave Lantern shows the secret room before it's found
  const lantern = player.stats.effects.has('graveLantern');
  const shown = G.floor.rooms.filter((r) => r.visited || r.known || (lantern && r.type === 'secret'));
  // rectangles for a room, in whole pixels: its cells (corridors narrow) and the gaps between neighbouring cells
  const rects = (r: typeof cur) => {
    const out: [number, number, number, number][] = [];
    const nx = r.plan.shape === 'corridor_ns' ? Math.round(cw * 0.36) : cw,
      ny = r.plan.shape === 'corridor_ew' ? Math.round(ch * 0.42) : ch;
    const has = (gx: number, gy: number) => r.plan.cells.some((c) => c.gx === gx && c.gy === gy);
    for (const c of r.plan.cells) {
      const x = px(c.gx) - cw / 2,
        y = py(c.gy) - ch / 2;
      out.push([px(c.gx) - Math.round(nx / 2), py(c.gy) - Math.round(ny / 2), nx, ny]);
      if (has(c.gx + 1, c.gy)) out.push([x + cw, y, gap, ch]);
      if (has(c.gx, c.gy + 1)) out.push([x, y + ch, cw, gap]);
      if (has(c.gx + 1, c.gy) && has(c.gx, c.gy + 1) && has(c.gx + 1, c.gy + 1)) out.push([x + cw, y + ch, gap, gap]);
    }
    return out;
  };
  mg.fillStyle = '#120f18'; // (a closed outline round every room, art bible 4.4)
  for (const r of shown) for (const [x, y, w, h] of rects(r)) mg.fillRect(x - 1, y - 1, w + 2, h + 2);
  for (const r of shown) {
    const done = roomFinished(r);
    mg.fillStyle = r === cur ? '#f2d49a' : r.visited ? (done ? '#4f5677' : '#6a7396') : '#2b3047'; // (finished: darker)
    for (const [x, y, w, h] of rects(r)) mg.fillRect(x, y, w, h);
    const m = mid(r),
      cx = px(m.gx),
      cy = py(m.gy);
    if (done) {
      // a small tick in the corner of its last cell
      const c = [...r.plan.cells].sort((a, b) => a.gy - b.gy || a.gx - b.gx).at(-1)!;
      mark(MARKS.done, px(c.gx) + cw / 2 - 3, py(c.gy) + ch / 2 - 3, { t: r === cur ? '#6a5a44' : '#2b3047' });
    }
    if (r.type === 'boss') mark(MARKS.boss, cx, cy, { r: '#d8392a', k: '#1a0806' });
    if (r.type === 'ordeal') mark(MARKS.ordeal, cx, cy, { x: r.cleared ? '#8a8494' : '#1a1622' }); // (dimmed once passed)
    if (r.type === 'altar') mark(MARKS.altar, cx, cy, { a: r.spots.some((s) => !s.taken) ? '#f0e4c8' : '#7a7068' }); // (dimmed once paid)
    if (r.type === 'secret') {
      // an eye of pale blue chalk, once found (fainter while only the Grave Lantern knows of it)
      const c = r.found ? '#9fd0ff' : '#5a7aa8';
      mark(MARKS.secret, cx, cy, { e: c, p: c });
    }
    if (r.type === 'merchant') mark(MARKS.merchant, cx, cy, { o: '#e8b84a', d: '#5a3e14' }); // (an obol)
    if (r.type === 'vault') {
      // a padlock, pale blue while the ward holds, dimmed once the vault is emptied
      const sealed = r.doors.some((d) => d.seal?.sealed),
        empty = r.visited && r.cleared && !r.spots.some((s) => !s.taken);
      mark(MARKS.vault, cx, cy, { l: sealed ? '#9fd0ff' : empty ? '#5a5a62' : '#d8d8e4' });
    }
    if (r.type === 'shrine') {
      // a circle of pale gold, dimmed while there's no curse to cleanse and no bargain waiting
      const c =
        player.items.some((id) => artifact(id).curse && !player.cleansed.includes(id)) ||
        (r.bargain?.state ?? 'idle') !== 'kept'
          ? '#e0b048'
          : '#6a6250';
      mark(MARKS.shrine, cx, cy, { s: c, d: c });
    }
    if (r.type === 'library') {
      // an open book, dimmed once its choice is made
      const open = !r.visited || r.pages?.some((p) => p.set && !p.gone);
      mark(MARKS.library, cx, cy, { b: open ? '#f0e0b8' : '#6a6050', d: '#3a2a1c' });
    }
    if (r.type === 'laboratory') mark(MARKS.laboratory, cx, cy, { f: '#7ae070', c: '#c8ffb0' }); // (a flask of green jelly)
    if (r.type === 'waystone') {
      // a standing stone with a gold rune, dimmed once it has given its rest
      const rested = !!r.waystone?.rested;
      mark(MARKS.waystone, cx, cy, { s: rested ? '#5a5c62' : '#b0b4be', g: rested ? '#7a6030' : '#ffbe3a' });
    }
    if (r.type === 'treasure')
      mark(MARKS.treasure, cx, cy, { t: r.spots.some((s) => !s.taken) ? '#f2c050' : '#6a5a3a' });
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
/** Marks on the boss bar at these shares of its health (Kaelith's phases); none for every other boss. */
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
/** Whether a page's question is up (the level-up screen waits for it). */
export const promptShowing = () => el.prompt.classList.contains('on');
export function toast(msg: string, dur = 3) {
  el.toast.textContent = msg;
  el.toast.classList.add('on');
  toastT = dur;
}
/** Whether a toast is showing now (a first-time line waits for it rather than cut it short). */
export const toastShowing = () => toastT > 0;
/** A first-time line (what a mantle, a pair or the ground does): shown now, or after the line showing, never cutting
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
