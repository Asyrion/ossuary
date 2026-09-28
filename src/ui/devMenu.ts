/* The dev menu (the key left of 1, or F2): a panel over the paused game for testing features quickly:
   the mage (and their curses), resources, drops, artifacts and foes, this floor's special rooms, and starting
   a test room, a boss fight or a new run. A thin layer over the same calls as the dev hooks; its lists come from the data,
   so new artifacts, drops, rooms and bosses show up by themselves. Kept in production builds, like the
   hooks, for testing the deployed site. */
import { BOSS_TYPES, type BossType, type EnemyType } from '../config';
import { DEV, G, player } from '../state';
import { STR } from '../strings';
import { ARTIFACT_DEFS, START_FOCUS } from '../items/artifactData';
import { giveById, grantArtifact, refreshStats, resetArtifacts } from '../items/artifacts';
import { DROPS, RESOURCES, type Drop, type Resource } from '../items/loot';
import { giveResources, spawnPickup } from '../items/pickups';
import { makeEnemy } from '../actors/enemies';
import { clearRoom, descend, resume, startGame, warp, type RunOptions } from '../flow';
import { freeSpotNear } from '../world/rooms';
import { SIDE_DIR } from '../world/shapes';
import type { Room } from '../types';
import { openSecretRoom, revealCracks } from '../world/secret';
import { cleanseAtOnce } from '../world/shrine';
import { TEMPLATE_DEFS } from '../world/templates';
import { FLOORS, VARIANTS, type RoomVariant } from '../world/generate';
import { renderHearts, renderMinimap, toast } from './hud';

const S = STR.dev;
let panel: HTMLElement | null = null, floorBox: HTMLElement, artBox: HTMLElement, info: HTMLElement, godBtn: HTMLButtonElement;
let wasPlaying = false, keepCarried = true;

export const devOpen = () => !!panel && !panel.hidden;
export function toggleDev() { if (devOpen()) closeDev(); else openDev(); }

/** Open over a run (playing or paused); the game waits while it's open. */
function openDev() {
  if (G.state !== 'play' && G.state !== 'pause') return;
  panel ??= build();
  wasPlaying = G.state === 'play';
  if (wasPlaying) G.state = 'pause';
  refresh(); panel.hidden = false;
}
export function closeDev() {
  if (!panel || panel.hidden) return;
  panel.hidden = true; (document.activeElement as HTMLElement | null)?.blur?.();
  if (wasPlaying && G.state === 'pause') resume();
}

/* ---------- building blocks ---------- */

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
}
function btn(label: string, fn: () => void, title = '') {
  const b = el('button', 'dv-b', label); b.type = 'button'; if (title) b.title = title;
  b.addEventListener('click', () => { fn(); if (panel && !panel.hidden) refresh(); });
  return b;
}
function section(parent: HTMLElement, title: string) {
  const s = el('section', 'dv-s'); s.append(el('h3', '', title));
  const row = el('div', 'dv-row'); s.append(row); parent.append(s); return row;
}
/** Somewhere free just ahead of the mage. */
const ahead = (d = 1.5) => freeSpotNear(G.current, player.x, player.z - d);

/** Go to a room: into it, or, for a vault still sealed, to the room outside it, a couple of steps from the
    warded door (to try a key, a blast or the Sexton's Keyring on it). The secret room opens as the mage
    arrives, so the way back out is there. */
function goTo(r: Room) {
  const seal = r.doors.find(d => d.seal?.sealed)?.seal;
  if (r.type === 'secret') openSecretRoom(r);
  closeDev();
  if (!seal) { warp(r.plan.id); return; }
  warp(seal.outerRoom.plan.id);
  const [dx, dz] = SIDE_DIR[seal.outer.side];
  player.x = seal.outer.x - dx * 1.8; player.z = seal.outer.z - dz * 1.8;
}

/* ---------- starting runs and test rooms ---------- */

/** Start a run, carrying over the mage's artifacts, obols, keys and glyphs when asked. */
function start(opts: RunOptions) {
  const kept = keepCarried ? { ids: [player.focus, ...player.items].filter(id => id !== START_FOCUS), res: RESOURCES.map(r => player[r]) } : null;
  closeDev(); startGame(opts);
  if (kept) { giveById(kept.ids); giveResources(Object.fromEntries(RESOURCES.map((r, i) => [r, kept.res[i] - player[r]])) as Record<Resource, number>); }
}
const bossRoom = () => TEMPLATE_DEFS.find(t => t.types.includes('boss') && t.shape === 'standard')!.id;

function build() {
  const p = el('aside'); p.id = 'dev'; p.hidden = true; p.setAttribute('aria-label', S.title);
  const head = el('header'); head.append(el('h2', '', S.title), btn(S.close, closeDev));
  info = el('p', 'dv-info'); p.append(head, info);

  // the mage
  const mage = section(p, S.mage);
  mage.append(
    btn(S.heal, () => { player.hp = player.maxHp; renderHearts(); }),
    btn(S.container, () => { player.heartsPaid--; refreshStats(); }),
    godBtn = btn('', () => { DEV.god = !DEV.god; toast(DEV.god ? S.godOn : S.godOff, 2); }),
    btn(S.resetArtifacts, () => resetArtifacts()),
    // curses to try the shrine with, and cleansing one at once (no fight, no obols)
    btn(S.takeCurse, () => {
      const free = ARTIFACT_DEFS.filter(a => a.curse && !player.items.includes(a.id));
      if (free.length) grantArtifact(free[Math.floor(Math.random() * free.length)]); else toast(S.allCurses, 2);
    }),
    btn(S.cleanse, () => { if (!cleanseAtOnce()) toast(S.noCurse, 2); }),
  );
  const res = section(p, S.resources);
  for (const [r, n] of [['coins', 10], ['keys', 1], ['keys', 5], ['glyphs', 1], ['glyphs', 5]] as [Resource, number][]) {
    res.append(btn(S.give(n, S.names[r]), () => giveResources({ [r]: n })));
  }
  res.append(btn(S.emptyPurse, () => giveResources({ coins: -99, keys: -99, glyphs: -99 })));

  // drops, just ahead of the mage
  const drops = section(p, S.drops);
  for (const d of DROPS) drops.append(btn(S.dropNames[d] ?? d, () => { const q = ahead(); spawnPickup(d as Drop, q.x, q.z, { gilded: false }); }));
  drops.append(btn(S.gildedChest, () => { const q = ahead(); spawnPickup('chest', q.x, q.z, { gilded: true }); }));
  drops.append(btn(S.loreAgain, () => G.run.loreSeen.clear(), S.loreAgainTitle)); // their lore cards show again

  // artifacts: every one in the data, marked when held
  artBox = section(p, S.artifacts);

  // foes, a little further ahead (they don't lock the doors)
  const foes = section(p, S.foes);
  const floorHp = () => FLOORS[Math.min(G.run.floor, FLOORS.length - 1)].enemyHp;
  for (const [kind, champion] of [['rotling', false], ['wisp', false], ['hound', false], ['hound', true]] as [EnemyType, boolean][]) {
    foes.append(btn(champion ? S.champion(S.foeNames[kind]) : S.foeNames[kind], () => { const q = ahead(3); makeEnemy(kind, q.x, q.z, floorHp(), undefined, { champion }); }));
  }

  // this floor: its special rooms, and ways through it
  floorBox = section(p, S.floor);

  // start something: a test room in a variant, a boss fight, a new run
  const test = section(p, S.test);
  const tpl = el('select'); tpl.setAttribute('aria-label', S.template);
  const types = [...new Set(TEMPLATE_DEFS.flatMap(t => t.types))];
  for (const ty of types) {
    const g = el('optgroup'); g.label = S.roomNames[ty] ?? ty;
    for (const t of TEMPLATE_DEFS.filter(d => d.types[0] === ty)) { const o = el('option', '', `${t.id} (${t.shape}${t.difficulty ? `, ${t.difficulty}` : ''})`); o.value = t.id; g.append(o); }
    tpl.append(g);
  }
  tpl.value = TEMPLATE_DEFS.find(t => t.types.includes('normal'))!.id; // a fight to start with
  const variant = el('select'); variant.setAttribute('aria-label', S.variant);
  for (const v of VARIANTS) { const o = el('option', '', S.variants[v] ?? v); o.value = v; variant.append(o); }
  test.append(tpl, variant, btn(S.play, () => start({ testTemplate: tpl.value, testVariant: variant.value as RoomVariant })));
  const bosses = section(p, S.bosses);
  for (const b of BOSS_TYPES) bosses.append(btn(STR.bosses[b as BossType].name, () => start({ testTemplate: bossRoom(), boss: b })));
  const runs = section(p, S.newRun);
  FLOORS.forEach((_, i) => runs.append(btn(S.floorN(i + 1), () => start({ floor: i }))));
  const keep = el('label', 'dv-check'); const box = el('input'); box.type = 'checkbox'; box.checked = keepCarried;
  box.addEventListener('change', () => { keepCarried = box.checked; });
  keep.append(box, document.createTextNode(S.keep)); runs.parentElement!.append(keep);

  document.body.append(p);
  return p;
}

/** Bring the parts that change up to date: the info line, god mode, held artifacts, this floor's rooms. */
function refresh() {
  const cur = G.current;
  info.textContent = S.info(G.run.seed, G.run.floor + 1, cur.plan.id, S.roomNames[cur.type] ?? cur.type);
  godBtn.textContent = DEV.god ? S.godOn : S.godOff; godBtn.classList.toggle('on', DEV.god);
  artBox.replaceChildren(...ARTIFACT_DEFS.filter(a => !a.start).map(a => {
    const held = player.focus === a.id || player.items.includes(a.id);
    const b = btn(a.name, () => grantArtifact(a), `${S.kinds[a.kind]}: ${a.text}`);
    const dot = el('i'); dot.style.background = a.color; b.prepend(dot);
    if (a.kind !== 'passive') b.append(el('small', '', player.cleansed.includes(a.id) ? S.cleansed : S.kinds[a.kind]));
    b.classList.toggle('on', held);
    return b;
  }));
  const rooms = G.rooms.filter(r => r.type !== 'normal').sort((a, b) => a.plan.dist - b.plan.dist);
  const secret = G.rooms.find(r => r.type === 'secret');
  floorBox.replaceChildren(
    ...rooms.map(r => {
      const note = r.doors.some(d => d.seal?.sealed) ? S.sealed : r.type === 'secret' && !r.found ? S.hidden : '';
      return btn(`${S.roomNames[r.type] ?? r.type}${note ? ` (${note})` : ''}${r === cur ? ' ●' : ''}`, () => goTo(r));
    }),
    ...(secret ? [btn(S.revealCracks, () => revealCracks()), btn(S.openSecret, () => openSecretRoom(secret))] : []),
    btn(S.clear, () => clearRoom()),
    btn(S.reveal, () => { for (const r of G.rooms) r.known = true; renderMinimap(); }),
    btn(S.nextFloor, () => { closeDev(); descend(); }),
  );
}
