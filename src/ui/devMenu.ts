/* The dev menu (the key left of 1, or F2): a panel over the paused game for testing features quickly:
   the mage (and their curses), resources, drops, artifacts and foes, this floor's special rooms, and starting
   a test room, a boss fight or a new run. A thin layer over the same calls as the dev hooks; its lists come from the data,
   so new artifacts, drops, rooms and bosses show up by themselves. Kept in production builds, like the
   hooks, for testing the deployed site. */
import { BOSS_TYPES, type BossType, type EnemyType } from '../config';
import { PROP_KINDS } from '../world/propData';
import { THEME_DEFS } from '../world/themeData';
import { placeProp } from '../world/props';
import { elementDev } from '../world/mechanisms';
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
import { SPELL_DEFS } from '../magic/spellData';
import { forgetSpells, gainMana, learnSpell } from '../magic/spells';
import { dropPage } from '../magic/pages';
import { poolsDo } from '../world/pools';
import { inflict } from '../magic/statusFx';
import type { StatusKind } from '../magic/spellData';
import { TEMPLATE_DEFS } from '../world/templates';
import { FLOORS, VARIANTS, type RoomVariant } from '../world/generate';
import { renderHearts, renderMinimap, toast } from './hud';

const S = STR.dev;
let panel: HTMLElement | null = null, floorBox: HTMLElement, artBox: HTMLElement, spellBox: HTMLElement, info: HTMLElement, godBtn: HTMLButtonElement, manaBtn: HTMLButtonElement, moveBtn: HTMLButtonElement, doorBtn: HTMLButtonElement;
let spellSlot = 0;
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
    // which clip the mage moves with: the run, or the walk (in step, or at a natural pace), to compare
    moveBtn = btn('', () => { const order = ['run', 'walkInStep', 'walkNatural'] as const; DEV.moveClip = order[(order.indexOf(DEV.moveClip) + 1) % order.length]; toast(S.moveClip[DEV.moveClip], 2); }),
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
  for (const d of DROPS) drops.append(btn(S.dropNames[d] ?? d, () => { const q = ahead(); spawnPickup(d as Drop, q.x, q.z, { gilded: false, asIs: true }); }));
  drops.append(btn(S.gildedChest, () => { const q = ahead(); spawnPickup('chest', q.x, q.z, { gilded: true }); }));
  drops.append(btn(S.loreAgain, () => G.run.loreSeen.clear(), S.loreAgainTitle)); // their lore cards show again

  // artifacts: every one in the data, marked when held
  artBox = section(p, S.artifacts);

  // spells: every one in the data, learned into the chosen slot; mana
  spellBox = section(p, S.spells);
  const slotSel = el('select'); slotSel.setAttribute('aria-label', S.slot);
  for (const [i, k] of STR.controls.spellsKeys.split(' and ').entries()) { const o = el('option', '', `${S.slot} ${k}`); o.value = String(i); slotSel.append(o); }
  slotSel.addEventListener('change', () => { spellSlot = Number(slotSel.value); });
  spellBox.parentElement!.insertBefore(slotSel, spellBox);
  const mana = section(p, S.mana);
  mana.append(
    btn(S.fullMana, () => gainMana(player.stats.maxMana)),
    manaBtn = btn('', () => { DEV.mana = !DEV.mana; toast(DEV.mana ? S.manaOn : S.manaOff, 2); }),
    btn(S.forget, () => forgetSpells()),
    btn(S.page, () => { if (!dropPage(G.current, player.x, player.z - 1.5)) toast(S.noPage, 2); }),
  );
  // water and oil in this room (the test rooms with them are in the list above)
  const pools = section(p, S.pools);
  pools.append(btn(S.ignite, () => poolsDo('fire')), btn(S.freezeWater, () => poolsDo('frost')), btn(S.shockWater, () => poolsDo('shock')));

  // themed rooms (M3.6): a test room of each theme, next to the start
  const themes = section(p, S.themes);
  for (const t of THEME_DEFS) { const first = TEMPLATE_DEFS.find(d => d.theme === t.id); if (first) themes.append(btn(t.name, () => start({ testTemplate: first.id }))); }

  // the rooms' objects (M3.6), put down just ahead of the mage
  const objs = section(p, S.objects);
  for (const kind of PROP_KINDS) objs.append(btn(S.propNames[kind], () => { const q = ahead(1.5); if (!placeProp(kind, q.x, q.z)) toast(S.noRoom, 2); }));
  // fire, frost or shock landing just ahead, as a spell's would: to light braziers and candles, charge runes, set lodestones leaping
  for (const [kind, label] of [['burn', S.kindle], ['chill', S.frost], ['shock', S.shock]] as [StatusKind, string][]) objs.append(btn(label, () => { const q = ahead(1.5); elementDev(kind, q.x, q.z); }));

  // foes, a little further ahead (they don't lock the doors)
  const foes = section(p, S.foes);
  const floorHp = () => FLOORS[Math.min(G.run.floor, FLOORS.length - 1)].enemyHp;
  for (const [kind, champion] of [['rotling', false], ['wisp', false], ['hound', false], ['hound', true], ['dummy', false]] as [EnemyType, boolean][]) {
    foes.append(btn(champion ? S.champion(S.foeNames[kind]) : S.foeNames[kind], () => { const q = ahead(3); makeEnemy(kind, q.x, q.z, floorHp(), undefined, { champion }); }));
  }

  // statuses on every foe in the room: to see them, and to set off reactions by hand
  const sts = section(p, S.statuses);
  for (const [kind, amount] of [['burn', 4], ['chill', 1], ['shock', 2]] as [StatusKind, number][]) {
    sts.append(btn(S.inflictOn(STR.statusNames[kind]), () => { for (const e of G.enemies) inflict(e, { [kind]: amount }); }));
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
  // doors off the middle of their edges, in the floors made from now on: as the floor has it, always, or never
  runs.append(doorBtn = btn('', () => { const order = ['data', 'shifted', 'middle'] as const; DEV.doors = order[(order.indexOf(DEV.doors) + 1) % order.length]; toast(S.doors[DEV.doors], 2); refresh(); }));

  document.body.append(p);
  return p;
}

/** Bring the parts that change up to date: the info line, god mode, held artifacts, this floor's rooms. */
function refresh() {
  const cur = G.current;
  info.textContent = S.info(G.run.seed, G.run.floor + 1, cur.plan.id, S.roomNames[cur.type] ?? cur.type);
  godBtn.textContent = DEV.god ? S.godOn : S.godOff; godBtn.classList.toggle('on', DEV.god);
  moveBtn.textContent = S.moveClip[DEV.moveClip]; moveBtn.classList.toggle('on', DEV.moveClip !== 'run');
  doorBtn.textContent = S.doors[DEV.doors]; doorBtn.classList.toggle('on', DEV.doors !== 'data');
  manaBtn.textContent = DEV.mana ? S.manaOn : S.manaOff; manaBtn.classList.toggle('on', DEV.mana);
  spellBox.replaceChildren(...SPELL_DEFS.map(s => {
    const b = btn(s.name, () => learnSpell(s.id, spellSlot), `${STR.schools[s.school]}: ${s.text}`);
    const dot = el('i'); dot.style.background = s.color; b.prepend(dot);
    b.append(el('small', '', STR.schools[s.school]));
    b.classList.toggle('on', player.spells.includes(s.id));
    return b;
  }));
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
