/* The dev menu (the key left of 1, or F2): a panel over the paused game for testing features quickly, in tabs: the
   mage (and their curses, resources, drops and artifacts); magic (spells, mana, knowledge, statuses, water and oil);
   foes and objects; rooms and runs (this floor's special rooms, a test room, a themed room, a boss fight, a new run);
   the look (the pixel look, made assets); and the galleries of options. A thin layer over the same calls as the dev hooks; its lists come from the data,
   so new artifacts, drops, rooms and bosses show up by themselves. Kept in production builds, like the
   hooks, for testing the deployed site. */
import { BOSS_TYPES, type BossType, type EnemyType } from '../config';
import { PROP_KINDS, isMechanism } from '../world/propData';
import { THEME_DEFS } from '../world/themeData';
import { placeProp } from '../world/props';
import { elementDev } from '../world/mechanisms';
import { DEV, G, player } from '../state';
import { wardFoe } from '../actors/wardShield';
import { fennexInfo, growFennex } from '../combat/fennex';
import { callWanderer } from '../items/wanderer';
import { STR, foeName } from '../strings';
import { FOES, FOE_IDS, pickFoe } from '../actors/foeData';
import { forgetBestiary } from '../actors/bestiary';
import { findEveryCounter } from '../actors/counters';
import { ARTIFACT_DEFS, START_FOCUS, artifact } from '../items/artifactData';
import { giveById, grantArtifact, placeArtifact, refreshStats, removeArtifactGallery, resetArtifacts, showArtifactGallery } from '../items/artifacts';
import { DROPS, RESOURCES, SOULS, soulItem, type Drop, type Resource } from '../items/loot';
import { gainSoul, hallowedMend, resetSouls } from '../items/souls';
import { giveResources, spawnPickup } from '../items/pickups';
import { makeEnemy, spawnFoe } from '../actors/enemies';
import { buildFloor, clearRoom, descend, resume, startGame, warp, type RunOptions } from '../flow';
import { assetList, assetsOn, setAssetsOn } from '../assets/models';
import { Vector2 } from 'three';
import { renderer } from '../render/renderer';
import { drawnRows, pixelLook, setPixelLook } from '../render/pixelLook';
import { FAMILIAR_OPTIONS, MODEL_OPTIONS, removeModelOptions, showBestiary, showBossLooks, showFamiliarOptions, showModelOptions } from '../actors/modelOptions';
import { BESTIARY_OPTIONS } from '../actors/bestiaryLooks';
import { BOSS_LOOKS, bossLook, setBossLook } from '../actors/bossLooks';
import { EFFECT_OPTIONS, removeEffectOptions, showEffectOptions } from '../magic/effectOptions';
import { CFG } from '../config';
import { freeSpotNear, placeUrn } from '../world/rooms';
import { SIDE_DIR } from '../world/shapes';
import type { Room } from '../types';
import { openSecretRoom, revealCracks } from '../world/secret';
import { cleanseAtOnce } from '../world/shrine';
import { SPELL_DEFS } from '../magic/spellData';
import { forgetSpells, gainMana, learnSpell } from '../magic/spells';
import { forgetKnowledge, knowEvery, knowledgeNow } from '../magic/memory';
import { dropPage } from '../magic/pages';
import { hexDrained } from './afflictions';
import { steamAt } from '../magic/steam';
import { fireAt, poolsDo } from '../world/pools';
import { inflict } from '../magic/statusFx';
import type { SpellStatus, StatusKind } from '../magic/spellData';
import { TEMPLATE_DEFS } from '../world/templates';
import { FLOORS, VARIANTS, type RoomVariant } from '../world/generate';
import { KIT_PARTS, kindsOf, type KitPart, type Kinds } from '../world/kitData';
import { renderHearts, renderItems, renderMinimap, toast } from './hud';
import { MANTLE_IDS } from '../actors/mantleData';
import { lureTest } from '../actors/foeGround';

const S = STR.dev;
let panel: HTMLElement | null = null, floorBox: HTMLElement, artBox: HTMLElement, spellBox: HTMLElement, info: HTMLElement, godBtn: HTMLButtonElement, foeBtn: HTMLButtonElement, lookBtn: HTMLButtonElement, manaBtn: HTMLButtonElement, moveBtn: HTMLButtonElement, doorBtn: HTMLButtonElement, assetBtn: HTMLButtonElement, kitBtn: HTMLButtonElement, kitPartBtns = {} as Record<KitPart, HTMLButtonElement>, fpsBtn: HTMLButtonElement, assetBox: HTMLElement, pxBtn: HTMLButtonElement, lineBtn: HTMLButtonElement, bandBtn: HTMLButtonElement;
let spellSlot = 0, knowBox: HTMLElement;
/** The menu's tabs, each a page of sections; the one open last is remembered in this browser. */
const TABS = ['mage', 'magic', 'foes', 'rooms', 'look', 'galleries'] as const;
type Tab = (typeof TABS)[number];
const TAB_KEY = 'ossuary.devTab';
let pages: Record<Tab, HTMLElement>, tabBtns: Record<Tab, HTMLButtonElement>;
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
/** Open one tab's page (and remember it). */
function showTab(t: Tab) {
  for (const k of TABS) { pages[k].hidden = k !== t; tabBtns[k].classList.toggle('on', k === t); tabBtns[k].setAttribute('aria-selected', String(k === t)); }
  try { localStorage.setItem(TAB_KEY, t); } catch { /* not remembered */ }
}
/** Somewhere free just ahead of the mage. */
const ahead = (d = 1.5) => freeSpotNear(G.current, player.x, player.z - d);
/** The living foe nearest the mage. */
const nearestFoe = () => G.enemies.filter(e => !e.dead).sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[0];

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

/** Made assets on or off: this floor is built again (`rebuildFloor`), to compare. */
export function useAssets(on: boolean) { setAssetsOn(on); renderItems(); rebuildFloor(); }
/** The room kit (M3.5 step 3's proof) on or off: this floor is built again in the new or the old look, to compare. */
export function useRoomKit(on: boolean) { DEV.roomKit = on; rebuildFloor(); renderItems(); } // (the HUD's icons too: drawn, or rendered from the kit's models)
/** The room kit's kinds forced on every room of this floor (or drawn per room again, for a part left out): built again. */
export function forceKinds(k: Partial<Kinds>) { DEV.kitKinds = { ...k }; rebuildFloor(); }
/** This floor built again on its seed (the same rooms and boss), and the mage back in the room they were in. */
function rebuildFloor() {
  if (G.state === 'title') return;
  const id = G.current.plan.id;
  if (G.run.bossesMet.at(-1) === G.run.boss) G.run.bossesMet.pop(); // (built again, the floor draws the same boss)
  buildFloor(G.run.floor); warp(id);
}

/** Ahead of the mage: a plain and a rune-sealed urn, and an artifact on its pedestal (the first artifact with a made
    model, or the Ember Sigil), to look at the made assets, or their placeholders, in any room. */
export function showAssetsHere() {
  const room = G.current, at = (dx: number, dz: number) => freeSpotNear(room, player.x + dx, player.z + dz);
  const plain = at(-1.6, -2), sealed = at(0, -2.6);
  placeUrn(plain.x, plain.z, false); placeUrn(sealed.x, sealed.z, true);
  const made = assetList().filter(a => a.status === 'loaded' && a.where.startsWith('artifacts.')).map(a => a.where.split('.')[1]);
  const p = at(1.8, -2); placeArtifact(room, artifact(made[0] ?? 'ember_sigil'), p.x, p.z);
}

/** Ahead of the mage, in rows: one of every object and pile (the dead tree among them) and a plain and a rune-sealed urn,
    to look at the room kit's objects (or, with the room kit off, the old ones) in any room. */
export function objectsHere() {
  const kinds = PROP_KINDS.filter(k => !isMechanism(k) || k === 'tree'), room = G.current;
  kinds.forEach((k, i) => { const q = freeSpotNear(room, player.x + (i % 8 - 3.5) * 1.1, player.z - 1.8 - Math.floor(i / 8) * 1.4); placeProp(k, q.x, q.z); }); // (eight a row: two rows fit a room)
  for (const [dx, sealed] of [[-.6, false], [.6, true]] as const) { const q = freeSpotNear(room, player.x + dx, player.z - 1.8 - Math.ceil(kinds.length / 8) * 1.4); placeUrn(q.x, q.z, sealed); }
}

/** Ahead of the mage, in a row: one of every drop and a gilded chest, to look at the room kit's pickups and containers (or,
    with the room kit off, the old ones) in any room. */
export function dropsHere() {
  const all: [Drop, boolean][] = [...DROPS.map(d => [d, false] as [Drop, boolean]), ['chest', true]];
  all.forEach(([d, gilded], i) => { const q = freeSpotNear(G.current, player.x + (i - (all.length - 1) / 2) * 1.05, player.z - 2.2 - (i % 2) * .5); spawnPickup(d, q.x, q.z, { gilded, asIs: true }); });
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
  // the tabs: the mage; magic; foes and objects; rooms and runs; the look; the galleries of options
  const bar = el('nav', 'dv-tabs'); bar.setAttribute('role', 'tablist'); p.append(bar);
  pages = {} as Record<Tab, HTMLElement>; tabBtns = {} as Record<Tab, HTMLButtonElement>;
  for (const t of TABS) {
    const b = el('button', 'dv-tab', S.tabs[t]); b.type = 'button'; b.setAttribute('role', 'tab'); b.addEventListener('click', () => showTab(t));
    bar.append(b); tabBtns[t] = b;
    const page = el('div', 'dv-page'); page.setAttribute('role', 'tabpanel'); p.append(page); pages[t] = page;
  }

  // the mage
  const mage = section(pages.mage, S.mage);
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
  const res = section(pages.mage, S.resources);
  for (const [r, n] of [['coins', 10], ['keys', 1], ['keys', 5], ['glyphs', 1], ['glyphs', 5]] as [Resource, number][]) {
    res.append(btn(S.give(n, S.names[r]), () => giveResources({ [r]: n })));
  }
  res.append(btn(S.emptyPurse, () => giveResources({ coins: -99, keys: -99, glyphs: -99 })));
  // soul motes (M4.1): one of each kind straight into the HUD, none, and a floor's end for the hallowed ones
  for (const k of SOULS) res.append(btn(S.giveSoul(S.dropNames[soulItem(k)]), () => { if (!gainSoul(k)) toast(STR.toast.fullSouls, 2); }));
  res.append(btn(S.noSouls, () => resetSouls()), btn(S.floorEnd, () => hallowedMend()));

  // drops, just ahead of the mage
  const drops = section(pages.mage, S.drops);
  for (const d of DROPS) drops.append(btn(S.dropNames[d] ?? d, () => { const q = ahead(); spawnPickup(d as Drop, q.x, q.z, { gilded: false, asIs: true }); }));
  drops.append(btn(S.gildedChest, () => { const q = ahead(); spawnPickup('chest', q.x, q.z, { gilded: true }); }));
  drops.append(btn(S.loreAgain, () => G.run.loreSeen.clear(), S.loreAgainTitle)); // their lore cards show again

  // artifacts: every one in the data, marked when held
  artBox = section(pages.mage, S.artifacts);
  // afflictions (2026-10-01): each one landed on the mage, to see its chip beside the mana bar and its line
  const aff = section(pages.mage, S.afflictions);
  aff.append(btn(S.afflictNames.hexed, () => { const took = Math.min(player.mana, 8); gainMana(-8); hexDrained(took); }),
    btn(S.afflictNames.chill, () => { player.chill = 3; }), btn(S.afflictNames.stone, () => { player.stone = 3; }),
    btn(S.afflictNames.dim, () => { player.dim = 3; }), btn(S.afflictNames.hints, () => { for (const k of [...G.run.hinted]) if (k.startsWith('afflict:')) G.run.hinted.delete(k); }));
  // Fen-Nex (M4.2): bound by its artifact above; grown a stage here, as if a floor had gone by
  section(pages.mage, S.fennex).append(btn(S.growFennex, () => { if (fennexInfo()) growFennex(); else toast(S.noFennex, 2); }));

  // spells: every one in the data, learned into the chosen slot; mana
  spellBox = section(pages.magic, S.spells);
  const slotSel = el('select'); slotSel.setAttribute('aria-label', S.slot);
  for (const [i, k] of STR.controls.spellsKeys.split(' and ').entries()) { const o = el('option', '', `${S.slot} ${k}`); o.value = String(i); slotSel.append(o); }
  slotSel.addEventListener('change', () => { spellSlot = Number(slotSel.value); });
  spellBox.parentElement!.insertBefore(slotSel, spellBox);
  const mana = section(pages.magic, S.mana);
  mana.append(
    btn(S.fullMana, () => gainMana(player.stats.maxMana)),
    manaBtn = btn('', () => { DEV.mana = !DEV.mana; toast(DEV.mana ? S.manaOn : S.manaOff, 2); }),
    btn(S.forget, () => forgetSpells()),
    btn(S.page, () => { if (!dropPage(G.current, player.x, player.z - 1.5)) toast(S.noPage, 2); }),
  );
  // spell knowledge (M3.7): kept between runs in this browser
  const know = section(pages.magic, S.knowledge);
  know.append(knowBox = el('p', 'dv-info'), btn(S.knowAll, () => { knowEvery(); refresh(); }), btn(S.forgetKnowledge, () => { forgetKnowledge(); refresh(); }));
  // water and oil in this room (the test rooms with them are on the Rooms & runs tab)
  const pools = section(pages.magic, S.pools);
  pools.append(btn(S.ignite, () => poolsDo('fire')), btn(S.freezeWater, () => poolsDo('frost')), btn(S.shockWater, () => poolsDo('shock')));

  // foes, a little further ahead (they don't lock the doors)
  const foes = section(pages.foes, S.foes);
  const floorHp = () => FLOORS[Math.min(G.run.floor, FLOORS.length - 1)].enemyHp;
  for (const kind of ['rotling', 'dummy'] as EnemyType[]) foes.append(btn(S.foeNames[kind], () => { const q = ahead(3); makeEnemy(kind, q.x, q.z, floorHp()); }));
  foes.append(btn(S.championHeavy, () => { // this floor's heavy, as a champion room has one
    const q = ahead(3), floor = FLOORS[Math.min(G.run.floor, FLOORS.length - 1)];
    makeEnemy(pickFoe(floor.foes, 'H', Math.random, true), q.x, q.z, floorHp(), undefined, { champion: true });
  }));
  // foes in each other's ground (M4.7): a band of fire, webs and rime between the mage and a wolf pack and a salt golem
  foes.append(btn(S.lureTest, () => { closeDev(); lureTest(player.x, player.z); }));
  // a champion in each school's mantle (M4.7): the floor's heavy, wearing it
  foes.append(el('p', 'dv-info', S.mantles), ...MANTLE_IDS.map(id => btn(STR.foes.mantles[id].name, () => {
    const q = ahead(3), floor = FLOORS[Math.min(G.run.floor, FLOORS.length - 1)];
    makeEnemy(pickFoe(floor.foes, 'H', Math.random, true), q.x, q.z, floorHp(), undefined, { champion: true, mantle: id });
  })));
  // the foes built in code (M4), by floor, from data/foes.json; and one of them in every fight, to test it
  for (const floor of [...FLOORS.map((_, i) => i + 1), 0]) { // (0: the Wardlings, no floor's own)
    const row = FOE_IDS.filter(id => FOES[id].floor === floor);
    if (row.length) foes.append(el('p', 'dv-info', S.foesOfFloor(floor)), ...row.map(id => btn(foeName(id), () => { const q = ahead(3); spawnFoe(id, q.x, q.z, floorHp()); })));
  }
  // the drinking ward as a foe's shield (M4.2): round the foe nearest the mage
  foes.append(btn(S.wardFoe, () => { const e = nearestFoe(); if (e) wardFoe(e); else toast(S.noFoe, 2); }));
  foes.append(el('p', 'dv-info', S.bestiaryNote), foeBtn = btn('', () => { // (the floor is built again with it)
    const list = [undefined, ...FOE_IDS], at = list.indexOf(DEV.foe); DEV.foe = list[(at + 1) % list.length]; rebuildFloor(); refresh();
  }), btn(S.findCounters, () => { findEveryCounter(); refresh(); }), btn(S.forgetBestiary, () => { forgetBestiary(); refresh(); }));

  // the rooms' objects (M3.6), put down just ahead of the mage
  const objs = section(pages.foes, S.objects);
  for (const kind of PROP_KINDS) objs.append(btn(S.propNames[kind], () => { const q = ahead(1.5); if (!placeProp(kind, q.x, q.z)) toast(S.noRoom, 2); }));
  // fire, frost or shock landing just ahead, as a spell's would: to light braziers and candles, charge runes, set lodestones leaping
  for (const [kind, label] of [['burn', S.kindle], ['chill', S.frost], ['shock', S.shock], ['sanct', S.hallowAhead], ['hex', S.umbralAhead]] as [StatusKind | 'sanct' | 'hex', string][]) objs.append(btn(label, () => { const q = ahead(1.5); elementDev(kind, q.x, q.z); }));
  objs.append(btn(S.steamAhead, () => { const q = ahead(1.5); steamAt(q.x, q.z); })); // (Steam, Ember + Frost: foes inside can't aim, eyes can't see through it)

  // statuses on every foe in the room: to see them, and to set off reactions by hand
  const sts = section(pages.magic, S.statuses);
  for (const [kind, amount] of [['burn', 4], ['chill', 1], ['shock', 2], ['sanct', 3], ['hex', 1], ['root', 2]] as [SpellStatus, number][]) {
    sts.append(btn(S.inflictOn(STR.statusNames[kind]), () => { for (const e of G.enemies) inflict(e, { [kind]: amount }); }));
  }

  // this floor: its special rooms, and ways through it
  floorBox = section(pages.rooms, S.floor);
  // the Wandering Merchant (M4.2): rides into this room now, whatever the run's luck
  section(pages.rooms, STR.banner.wanderer[0]).append(btn(S.wanderer, () => { closeDev(); callWanderer(); }));

  // the pixel look (the game's look, M3.5 step 2): the rows of pixels, outlines, light in bands; kept in this browser
  const px = section(pages.look, S.pixel);
  px.append(
    pxBtn = btn('', () => { const ls = [0, ...CFG.pixelLook.lines]; setPixelLook({ lines: ls[(ls.indexOf(pixelLook().lines) + 1) % ls.length] }); }),
    lineBtn = btn('', () => setPixelLook({ outline: !pixelLook().outline })),
    bandBtn = btn('', () => setPixelLook({ bands: !pixelLook().bands })),
  );

  // the room kit (M3.5 step 3's proof): the pieces built in code, or the old ones to compare; the fire objects to look at
  const kit = section(pages.look, S.kit);
  // each part's kind: drawn per room, or one stepped through the floor's list and forced on every room, to compare
  for (const part of KIT_PARTS) kitPartBtns[part] = btn('', () => {
    const list = kindsOf(FLOORS[G.run.floor].look.kit!, part), at = list.indexOf(DEV.kitKinds[part] as never);
    DEV.kitKinds = { ...DEV.kitKinds, [part]: list[at + 1] }; // (past the last: drawn per room again)
    if (!DEV.kitKinds[part]) delete DEV.kitKinds[part];
    rebuildFloor();
  });
  kit.append(el('p', 'dv-info', S.kitNote), kitBtn = btn('', () => useRoomKit(!DEV.roomKit)), ...KIT_PARTS.map(p => kitPartBtns[p]), btn(S.fireHere, () => {
    closeDev();
    for (const [kind, dx, dz, lit] of [['brazier', -1.4, -1.8, false], ['brazier', 0, -2.2, true], ['candles', 1.3, -1.8, false], ['candles', 2.4, -2.2, true]] as const) {
      const q = freeSpotNear(G.current, player.x + dx, player.z + dz);
      if (placeProp(kind, q.x, q.z) && lit) fireAt(q.x, q.z, .3);
    }
  }), btn(S.objectsHere, () => { closeDev(); objectsHere(); }), btn(S.dropsHere, () => { closeDev(); dropsHere(); }));

  // the made assets (M3.5): on or off to compare with the placeholders, what loaded, and what a frame costs
  const assets = section(pages.look, S.assets);
  assets.append(
    assetBox = el('div', 'dv-info'),
    assetBtn = btn('', () => useAssets(!assetsOn())),
    btn(S.showAssets, () => { closeDev(); showAssetsHere(); }),
    fpsBtn = btn('', () => { DEV.fps = !DEV.fps; }),
  );

  // the artifacts as the room kit builds them (looks only), in rows
  const arts = section(pages.galleries, S.artifactGallery);
  arts.append(el('p', 'dv-info', S.artifactsNote), btn(S.showOptions, () => { closeDev(); showArtifactGallery(G.current, player.x, player.z); }), btn(S.takeOptions, () => removeArtifactGallery(G.current)));

  // enemy model options (looks only, for the owner to choose from): a row of them ahead of the mage
  const opts = section(pages.galleries, S.options);
  opts.append(el('p', 'dv-info', [...new Set(MODEL_OPTIONS.map(o => o.floor))].sort((a, b) => a - b).map(f => S.floorOptions(f, MODEL_OPTIONS.filter(o => o.floor === f).map(o => STR.options[o.id].name).join(', '))).join(' · ')), btn(S.showOptions, () => { closeDev(); showModelOptions(G.current, player.x, player.z); }), btn(S.takeOptions, () => removeModelOptions(G.current)));

  // the Hollow Warden's looks (M4): the three ahead of the mage, and the one it wears in its fight (a new floor 1 shows it)
  const bl = section(pages.galleries, S.bossLooks);
  bl.append(el('p', 'dv-info', [...BOSS_LOOKS.map(o => `${STR.bossLooks[o.id].name}: ${STR.bossLooks[o.id].note}`), STR.bosses.abbess.name, STR.bosses.pyre.name, STR.bosses.hart.name, STR.bosses.angler.name, STR.bosses.tiger.name, STR.bosses.dragon.name, STR.bosses.twins.name].join(' · ')),
    btn(S.showOptions, () => { closeDev(); showBossLooks(G.current, player.x, player.z); }), btn(S.takeOptions, () => removeModelOptions(G.current)),
    lookBtn = btn('', () => { const i = BOSS_LOOKS.findIndex(o => o.id === bossLook()); setBossLook(BOSS_LOOKS[(i + 1) % BOSS_LOOKS.length].id); refresh(); }));
  // familiar options (looks only, the owner's drawings built in code): in a row ahead of the mage
  // the bestiary (M4.5): looks only for now, in rows by kind, each named with the fight it brings
  const best = section(pages.galleries, S.bestiary);
  best.append(el('p', 'dv-info', (['beast', 'creature', 'elemental'] as const).map(k => `${S.bestiaryKinds[k]}: ${BESTIARY_OPTIONS.filter(o => o.kind === k).map(o => STR.bestiary[o.id].name).join(', ')}`).join(' · ')),
    btn(S.showOptions, () => { closeDev(); showBestiary(G.current, player.x, player.z); }), btn(S.takeOptions, () => removeModelOptions(G.current)));
  const fam = section(pages.galleries, S.familiars);
  fam.append(el('p', 'dv-info', FAMILIAR_OPTIONS.map(o => STR.familiars[o.id].name).join(', ')), btn(S.showOptions, () => { closeDev(); showFamiliarOptions(G.current, player.x, player.z); }), btn(S.takeOptions, () => removeModelOptions(G.current)));

  // spell effect options (looks only): each plays one cast over and over, ahead of the mage
  const fx = section(pages.galleries, S.effects);
  fx.append(el('p', 'dv-info', EFFECT_OPTIONS.map(o => STR.effects[o.id].name).join(', ')), btn(S.showOptions, () => { closeDev(); showEffectOptions(G.current, player.x, player.z); }), btn(S.takeOptions, () => removeEffectOptions(G.current)));

  // start something: a test room in a variant, a boss fight, a new run
  const test = section(pages.rooms, S.test);
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
  // themed rooms (M3.6): a test room of each theme, next to the start
  const themes = section(pages.rooms, S.themes);
  for (const t of THEME_DEFS) { const first = TEMPLATE_DEFS.find(d => d.theme === t.id); if (first) themes.append(btn(t.name, () => start({ testTemplate: first.id }))); }

  const bosses = section(pages.rooms, S.bosses);
  for (const b of BOSS_TYPES) bosses.append(btn(STR.bosses[b as BossType].name, () => start({ testTemplate: bossRoom(), boss: b })));
  const runs = section(pages.rooms, S.newRun);
  FLOORS.forEach((_, i) => runs.append(btn(S.floorN(i + 1), () => start({ floor: i }))));
  const keep = el('label', 'dv-check'); const box = el('input'); box.type = 'checkbox'; box.checked = keepCarried;
  box.addEventListener('change', () => { keepCarried = box.checked; });
  keep.append(box, document.createTextNode(S.keep)); runs.parentElement!.append(keep);
  // doors off the middle of their edges, in the floors made from now on: as the floor has it, always, or never
  runs.append(doorBtn = btn('', () => { const order = ['data', 'shifted', 'middle'] as const; DEV.doors = order[(order.indexOf(DEV.doors) + 1) % order.length]; toast(S.doors[DEV.doors], 2); refresh(); }));

  let first: Tab = 'mage';
  try { const v = localStorage.getItem(TAB_KEY) as Tab | null; if (v && TABS.includes(v)) first = v; } catch { /* the first tab */ }
  showTab(first);
  document.body.append(p);
  return p;
}

/** Bring the parts that change up to date: the info line, god mode, held artifacts, this floor's rooms. */
function refresh() {
  const cur = G.current;
  info.textContent = S.info(G.run.seed, G.run.floor + 1, cur.plan.id, S.roomNames[cur.type] ?? cur.type);
  godBtn.textContent = DEV.god ? S.godOn : S.godOff; godBtn.classList.toggle('on', DEV.god);
  lookBtn.textContent = S.wardenWears(STR.bossLooks[bossLook()].name);
  foeBtn.textContent = DEV.foe ? S.foeEverywhere(foeName(DEV.foe)) : S.foesAsFloor; foeBtn.classList.toggle('on', !!DEV.foe);
  moveBtn.textContent = S.moveClip[DEV.moveClip]; moveBtn.classList.toggle('on', DEV.moveClip !== 'run');
  doorBtn.textContent = S.doors[DEV.doors]; doorBtn.classList.toggle('on', DEV.doors !== 'data');
  manaBtn.textContent = DEV.mana ? S.manaOn : S.manaOff; manaBtn.classList.toggle('on', DEV.mana);
  const list = assetList();
  assetBox.replaceChildren(...(list.length ? list.map(a => el('div', '', S.assetRow(a.where, S.assetStatus[a.status], a.triangles))) : [el('div', '', S.noAssets)]));
  assetBtn.textContent = assetsOn() ? S.assetsOn : S.assetsOff; assetBtn.classList.toggle('on', assetsOn()); assetBtn.disabled = !list.some(a => a.status === 'loaded');
  kitBtn.textContent = DEV.roomKit ? S.kitNew : S.kitOld; kitBtn.classList.toggle('on', DEV.roomKit);
  for (const part of KIT_PARTS) {
    const b = kitPartBtns[part], kind = cur.look.kinds?.[part];
    b.textContent = S.kitPart(part, kind ? S.kitKinds[kind] ?? kind : '-', !!DEV.kitKinds[part]); b.classList.toggle('on', !!DEV.kitKinds[part]); b.disabled = !DEV.roomKit || !kind;
  }
  fpsBtn.textContent = DEV.fps ? S.fpsOn : S.fpsOff; fpsBtn.classList.toggle('on', DEV.fps);
  const look = pixelLook();
  pxBtn.textContent = S.pixelLines(look.lines, drawnRows(renderer.getDrawingBufferSize(new Vector2()).y)); pxBtn.classList.toggle('on', !!look.lines);
  lineBtn.textContent = look.outline ? S.outlinesOn : S.outlinesOff; lineBtn.classList.toggle('on', look.outline); lineBtn.disabled = !look.lines;
  bandBtn.textContent = look.bands ? S.bandsOn : S.bandsOff; bandBtn.classList.toggle('on', look.bands); bandBtn.disabled = !look.lines;
  const stages = Object.values(knowledgeNow()), count = (...st: string[]) => stages.filter(s => st.includes(s)).length;
  knowBox.textContent = S.knowledgeInfo(count('seen', 'learned', 'used', 'upgraded'), count('learned', 'used', 'upgraded'), count('used', 'upgraded'));
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
