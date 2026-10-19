/* The dev menu (the key left of 1, or F2): a panel over the paused game for testing features quickly, in tabs: the
   mage (and their curses, resources, drops and artifacts); magic (spells, mana, knowledge, statuses, water and oil);
   foes and objects; rooms and runs (this floor's special rooms, a test room, a themed room, a boss fight, a new run);
   the look (the pixel look, made assets); and the galleries of options. A thin layer over the same calls as the dev hooks; its lists come from the data,
   so new artifacts, drops, rooms and bosses show up by themselves. Kept in production builds, like the
   hooks, for testing the deployed site. */
import type * as THREE from 'three';
import { BOSS_TYPES, type EnemyType } from '../config';
import { PROP_KINDS, isMechanism } from '../world/propData';
import { THEME_DEFS } from '../world/themeData';
import { placeProp } from '../world/props';
import { padsNow } from '../input/gamepad';
import { jellyGives } from '../world/jellyGives';
import { elementDev } from '../world/mechanisms';
import { DEV, G, player } from '../state';
import { wardFoe } from '../actors/wardShield';
import { fennexInfo, growFennex } from '../combat/fennex';
import { dress, heldNow, takeAllOff, triedOn, tryOn, wornNow } from '../actors/costume';
import { isCostume } from '../actors/costumeData';
import { clearTransforms, formTransform } from '../items/transforms';
import { TRANSFORM_IDS } from '../items/transformData';
import { blinkRest } from '../items/gifts';
import { arcHeld, arcLevels, arcNow } from '../items/arc';
import { marksNow } from '../actors/spellMarks';
import { callWanderer } from '../items/wanderer';
import { STR, foeName } from '../strings';
import { DEV_STR } from './strings';
import { FOES, FOE_IDS, pickFoe, type FoeType } from '../actors/foeData';
import { forgetBestiary } from '../actors/bestiary';
import { findEveryCounter } from '../actors/counters';
import { ARTIFACT_DEFS, START_FOCUS, artifact } from '../items/artifactData';
import { giveById, grantArtifact, placeArtifact, refreshStats, resetArtifacts } from '../items/artifacts';
import { removeArtifactGallery, showArtifactGallery } from './artifactGallery';
import { DROPS, RESOURCES, SOULS, soulItem, type Drop, type Resource } from '../items/loot';
import { POTIONS, POTION_IDS, REAGENTS, REAGENT_IDS, type PotionId, type ReagentId } from '../items/alchemyData';
import { addPotion, addReagent, beltSlots, identify, knownPotion, usePotion } from '../items/potions';
import { renderBelt } from '../notify';
import { brewedPotions, forgetBrews } from '../items/alchemyMemory';
import { openLab } from '../ui/alchemyTable';
import { openWaystone } from '../ui/waystone';
import { raiseWaystone } from '../world/waystone';
import { levelAtFloor } from '../progression/levelData';
import { kaelithInfo, kaelithToPhase, shutAllWards } from '../actors/kaelith';
import { daylightInfo, enterDaylight } from '../world/daylight';
import { forgetHeard, giveHome, setFlag, setFreed, setParts, veteranSave, vigil, wipeSave } from '../vigil/save';
import { setTownWear, speakerName, talkTo, townWear } from '../vigil/town';
import { takeTownGallery, townGallery } from './townGallery';
import { bondTo, giftsInfo, givePower, questState, questTo } from '../vigil/gifts';
import { chooseGarden, lightBlessing, unfoldInfo } from '../vigil/unfold';
import { openWayNow } from '../vigil/place';
import { BAR_SCHOOLS } from '../vigil/vigilMap';
import { BOND_MAX, TOWNSFOLK, disciplinesOpen } from '../vigil/giftData';
import { DIALOGUE, SPEAKERS } from '../vigil/dialogueData';
import { buildBargain, openBargainHere } from '../world/bargain';
import { breakOut, crackVat } from '../world/laboratory';
import { gainSoul, hallowedMend, resetSouls } from '../items/souls';
import { giveResources, restyleObols, spawnPickup } from '../items/pickups';
import { coinGallery } from '../items/pickupLooks';
import { obolFace, obolFaces, setObolFace } from '../items/obolFace';
import { disposeTree } from '../render/materials';
import { makeEnemy, spawnFoe } from '../actors/enemies';
import { buildFloor, clearRoom, descend, resume, startGame, wakeAtVigil, warp, type RunOptions } from '../flow';
import { board, vigilInfo } from '../vigil/place';
import { bindIt, breakAllChains, freeIt, layShade, shadeInfo } from '../vigil/shades';
import { walkWith } from '../vigil/shadeHelp';
import { SHADE_IDS } from '../vigil/shadeData';
import { openLectern } from '../ui/lectern';
import { assetList, assetsOn, setAssetsOn } from '../assets/models';
import { setCloseUp } from '../render/renderer';
import { LINES, drawnRows, gradeNow, pixelLook, setPixelLook } from '../render/pixelLook';
import { lightLevels } from '../render/lights';
import { RELICS, relicLook, scatterOf } from '../world/themes';
import { removeModelOptions, showBestiary, showBossLooks, showJellyLooks } from './modelGallery';
import { BESTIARY_OPTIONS } from '../actors/bestiaryLooks';
import { EFFECT_OPTIONS, removeEffectOptions, showEffectOptions } from './effectOptions';
import { CFG } from '../config';
import { freeSpotNear, placeUrn } from '../world/rooms';
import { SIDE_DIR } from '../world/shapes';
import type { Room } from '../types';
import { openSecretRoom, revealCracks } from '../world/secret';
import { cleanseAtOnce } from '../world/shrine';
import { SCHOOLS, SPELL_DEFS, spell } from '../magic/spellData';
import { attuneTo, forgetSpells, gainMana, learnSpell } from '../magic/spells';
import { addRune, carve, clearRunes, setSockets } from '../magic/runes';
import { RUNE_DEFS, rune } from '../magic/runeData';
import { runeIconImg } from '../items/runeLooks';
import {
  findEveryReaction,
  findEveryWeave,
  forgetKnowledge,
  forgetReactions,
  forgetWeaves,
  knowEvery,
  knowledgeNow,
  reactionsFound,
  weavesFound,
} from '../magic/memory';
import { WEAVE_IDS } from '../magic/weaves';
import { setOffWeave } from './weaveTest';
import { BENCH_BOONS, setOffBoon } from './boonTest';
import { REACTION_IDS } from '../magic/knowledge';
import { setOffReaction } from './reactionTest';
import { dropPage } from '../magic/pages';
import { hexDrained } from '../magic/hex';
import { steamAt } from '../magic/steam';
import { fireAt, poolsDo } from '../world/pools';
import { inflict } from '../magic/statusFx';
import type { SpellStatus, StatusKind } from '../magic/spellData';
import { TEMPLATE_DEFS } from '../world/templates';
import { FLOORS, VARIANTS, type RoomVariant } from '../world/generate';
import { KIT_PARTS, kindsOf, type KitPart, type Kinds } from '../world/kitData';
import { renderHearts, renderItems, renderMinimap, renderPurse, toast } from '../ui/hud';
import { MANTLE_IDS } from '../actors/mantleData';
import { lureTest } from '../actors/foeGround';
import { floorLean, floorWalls, warnFloor } from '../world/curve';
import { gainInsight, insightNow, setLevel, toNextLevel } from '../progression/insight';
import { LEVEL_CAP } from '../progression/levelData';
import { ATTRS, noAttrs } from '../progression/attributes';
import { attrText, pointsToSpend, spendPoint } from '../progression/points';
import { dealNow, takeBoon } from '../progression/boons';
import { openLevelUp } from '../ui/levelUp';
import { BOON_DEFS, boon } from '../progression/boonData';
import { AudioDirector, type Forced } from '../audio/director';
import { FLOOR_SCAPES, ROOM_SCAPES, THEME_SCAPES } from '../audio/ambienceData';
import { MOODS, PIECES, type Mood } from '../audio/musicData';
import { renderAudio } from '../audio/render';
import { CREATURES } from '../actors/madeCreatures';
import { roarNow, showCreature, takeCreatures } from './creatureGallery';
import { THEMES } from '../world/themeData';

const S = DEV_STR;
let kaelithBox: HTMLElement,
  daylightBox: HTMLElement,
  keepBox: HTMLElement,
  vigilBox: HTMLElement,
  shadeBox: HTMLElement,
  townBox: HTMLElement,
  momentBtn: HTMLButtonElement;
let talkMoment: 'death' | 'won' | 'boss' | null | undefined; // (the moment the dev menu's talks are at; undefined: the last run's)
const flagBtns: [string, HTMLButtonElement][] = [];
let wearBtn: HTMLButtonElement, giftBox: HTMLElement, unfoldBox: HTMLElement;
const kitPartBtns = {} as Record<KitPart, HTMLButtonElement>;
const powerBtns: [string, HTMLButtonElement][] = [],
  bondBtns: [string, HTMLButtonElement][] = [],
  questBtns: [string, HTMLButtonElement][] = [];
let panel: HTMLElement | null = null,
  soundInfo: HTMLElement,
  soundBtn: HTMLButtonElement,
  marksInfo: HTMLElement,
  floorBox: HTMLElement,
  artBox: HTMLElement,
  costBox: HTMLElement,
  costInfo: HTMLElement,
  transInfo: HTMLElement,
  transBox: HTMLElement,
  arcInfo: HTMLElement,
  closeBtn: HTMLButtonElement,
  spellBox: HTMLElement,
  info: HTMLElement,
  godBtn: HTMLButtonElement,
  foeBtn: HTMLButtonElement,
  manaBtn: HTMLButtonElement,
  assetBtn: HTMLButtonElement,
  fpsBtn: HTMLButtonElement,
  assetBox: HTMLElement,
  pxBtn: HTMLButtonElement,
  lineBtn: HTMLButtonElement,
  bandBtn: HTMLButtonElement,
  gradeInfo: HTMLElement,
  scatterInfo: HTMLElement;
let levelInfo: HTMLElement,
  padInfo: HTMLElement,
  runeInfo: HTMLElement,
  runesBtn: HTMLButtonElement,
  socketBtn: HTMLButtonElement,
  boonInfo: HTMLElement,
  autoBtn: HTMLButtonElement,
  spellSlot = 0,
  knowBox: HTMLElement,
  alchInfo: HTMLElement,
  reagentBtn: HTMLButtonElement,
  obolBtn: HTMLButtonElement;
/** The menu's tabs, each a page of sections; the one open last is remembered in this browser. */
const TABS = ['mage', 'magic', 'foes', 'rooms', 'look', 'galleries', 'sound'] as const;
type Tab = (typeof TABS)[number];
const TAB_KEY = 'ossuary.devTab';
let pages: Record<Tab, HTMLElement>, tabBtns: Record<Tab, HTMLButtonElement>;
let wasPlaying = false,
  keepCarried = true;

export const devOpen = () => !!panel && !panel.hidden;
export function toggleDev() {
  if (devOpen()) closeDev();
  else openDev();
}

/** Open over a run (playing or paused); the game waits while it's open. */
function openDev() {
  if (G.flow.state !== 'play' && G.flow.state !== 'pause') return;
  panel ??= build();
  wasPlaying = G.flow.state === 'play';
  if (wasPlaying) G.flow.state = 'pause';
  refresh();
  panel.hidden = false;
}
export function closeDev() {
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  (document.activeElement as HTMLElement | null)?.blur?.();
  if (wasPlaying && G.flow.state === 'pause') resume();
}

/* ---------- building blocks ---------- */

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
function btn(label: string, fn: () => void, title = '') {
  const b = el('button', 'dv-b', label);
  b.type = 'button';
  if (title) b.title = title;
  b.addEventListener('click', () => {
    fn();
    if (panel && !panel.hidden) refresh();
  });
  return b;
}
function section(parent: HTMLElement, title: string) {
  const s = el('section', 'dv-s');
  s.append(el('h3', '', title));
  const row = el('div', 'dv-row');
  s.append(row);
  parent.append(s);
  return row;
}
/** Open one tab's page (and remember it). */
function showTab(t: Tab) {
  for (const k of TABS) {
    pages[k].hidden = k !== t;
    tabBtns[k].classList.toggle('on', k === t);
    tabBtns[k].setAttribute('aria-selected', String(k === t));
  }
  try {
    localStorage.setItem(TAB_KEY, t);
  } catch {
    /* not remembered */
  }
}
/** Somewhere free just ahead of the mage. */
const ahead = (d = 1.5) => freeSpotNear(G.room.current, player.x, player.z - d);
/** The living foe nearest the mage. */
const nearestFoe = () =>
  G.room.enemies
    .filter((e) => !e.dead)
    .sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[0];

/** Go to a room: into it, or, for a vault still sealed, to the room outside it, a couple of steps from the
    warded door (to try a key, a blast or the Sexton's Keyring on it). The secret room opens as the mage
    arrives, so the way back out is there. */
function goTo(r: Room) {
  const seal = r.doors.find((d) => d.seal?.sealed)?.seal;
  if (r.type === 'secret') openSecretRoom(r);
  closeDev();
  if (!seal) {
    warp(r.plan.id);
    return;
  }
  warp(seal.outerRoom.plan.id);
  const [dx, dz] = SIDE_DIR[seal.outer.side];
  player.x = seal.outer.x - dx * 1.8;
  player.z = seal.outer.z - dz * 1.8;
}

/** Made assets on or off: this floor is built again (`rebuildFloor`), to compare. */
export function useAssets(on: boolean) {
  setAssetsOn(on);
  renderItems();
  renderPurse();
  rebuildFloor();
}
/** The room kit's kinds forced on every room of this floor (or drawn per room again, for a part left out): built again. */
export function forceKinds(k: Partial<Kinds>) {
  DEV.kitKinds = { ...k };
  rebuildFloor();
}
/** This floor built again on its seed (the same rooms and boss), and the mage back in the room they were in. */
export function rebuildFloor() {
  if (G.flow.state === 'title') return;
  const id = G.room.current.plan.id;
  if (G.run.bossesMet.at(-1) === G.run.boss) G.run.bossesMet.pop(); // (built again, the floor draws the same boss)
  buildFloor(G.run.floor);
  warp(id);
}

/** The obols wear another coin face (or the rune): those lying in the room and the HUD's counter change with them. */
export function wearFace(id: string) {
  setObolFace(id);
  restyleObols();
  renderPurse();
}
/** Every coin face side by side ahead of the mage (the Galleries tab); `takeCoins` takes them away. */
export function showCoins() {
  takeCoins();
  const room = G.room.current;
  room.group.userData.coinGallery = coinGallery(room.group, player.x - room.cx, player.z - room.cz - 1.6);
  return obolFaces().length;
}
export function takeCoins() {
  const g = G.room.current.group.userData.coinGallery as THREE.Object3D | undefined;
  if (!g) return;
  g.parent?.remove(g);
  disposeTree(g);
  delete G.room.current.group.userData.coinGallery;
}

/** Ahead of the mage: a plain and a rune-sealed urn, and an artifact on its pedestal (the first artifact with a made
    model, or the Ember Sigil), to look at the made assets, or their placeholders, in any room. */
export function showAssetsHere() {
  const room = G.room.current,
    at = (dx: number, dz: number) => freeSpotNear(room, player.x + dx, player.z + dz);
  const plain = at(-1.6, -2),
    sealed = at(0, -2.6);
  placeUrn(plain.x, plain.z, false);
  placeUrn(sealed.x, sealed.z, true);
  const made = assetList()
    .filter((a) => a.status === 'loaded' && a.where.startsWith('artifacts.'))
    .map((a) => a.where.split('.')[1]);
  const p = at(1.8, -2);
  placeArtifact(room, artifact(made[0] ?? 'ember_sigil'), p.x, p.z);
}

/** Ahead of the mage, in rows: one of every object and pile (the dead tree among them) and a plain and a rune-sealed urn,
    to look at the room kit's objects in any room. */
export function objectsHere() {
  const kinds = PROP_KINDS.filter((k) => !isMechanism(k) || k === 'tree'),
    room = G.room.current;
  kinds.forEach((k, i) => {
    const q = freeSpotNear(room, player.x + ((i % 9) - 4) * 1.05, player.z - 1.8 - Math.floor(i / 9) * 1.4);
    placeProp(k, q.x, q.z);
  }); // (nine a row: two rows fit a room)
  for (const [dx, sealed] of [
    [-0.6, false],
    [0.6, true],
  ] as const) {
    const q = freeSpotNear(room, player.x + dx, player.z - 1.8 - Math.ceil(kinds.length / 9) * 1.4);
    placeUrn(q.x, q.z, sealed);
  }
}

/** Ahead of the mage, in a row: one of each relic of the vault (the made models floor 1 strews), to look at them. */
export function relicsHere() {
  const room = G.room.current;
  RELICS.forEach((id, i) => {
    const q = freeSpotNear(room, player.x + (i - 2.5) * 1.2, player.z - 1.6),
      o = relicLook(id, () => 0.5);
    o.position.set(q.x - room.cx, 0, q.z - room.cz);
    room.group.add(o);
  });
}

/** Ahead of the mage, in a row: one of every drop and a gilded chest, to look at the room kit's pickups and containers in
    any room. */
export function dropsHere() {
  const all: [Drop, boolean][] = [...DROPS.map((d) => [d, false] as [Drop, boolean]), ['chest', true]];
  all.forEach(([d, gilded], i) => {
    const q = freeSpotNear(
      G.room.current,
      player.x + (i - (all.length - 1) / 2) * 1.05,
      player.z - 2.2 - (i % 2) * 0.5,
    );
    spawnPickup(d, q.x, q.z, { gilded, asIs: true });
  });
}

/* ---------- starting runs and test rooms ---------- */

/** Start a run, carrying over the mage's artifacts, obols, keys and glyphs when asked. */
function start(opts: RunOptions) {
  const kept = keepCarried
    ? { ids: [player.focus, ...player.items].filter((id) => id !== START_FOCUS), res: RESOURCES.map((r) => player[r]) }
    : null;
  closeDev();
  startGame(opts);
  if (kept) {
    giveById(kept.ids);
    giveResources(Object.fromEntries(RESOURCES.map((r, i) => [r, kept.res[i] - player[r]])));
  }
}
const bossRoom = () => TEMPLATE_DEFS.find((t) => t.types.includes('boss') && t.shape === 'standard')!.id;

function build() {
  const p = el('aside');
  p.id = 'dev';
  p.hidden = true;
  p.setAttribute('aria-label', S.title);
  const head = el('header');
  head.append(el('h2', '', S.title), btn(S.close, closeDev));
  info = el('p', 'dv-info');
  p.append(head, info);
  // the tabs: the mage; magic; foes and objects; rooms and runs; the look; the galleries of options
  const bar = el('nav', 'dv-tabs');
  bar.setAttribute('role', 'tablist');
  p.append(bar);
  pages = {} as Record<Tab, HTMLElement>;
  tabBtns = {} as Record<Tab, HTMLButtonElement>;
  for (const t of TABS) {
    const b = el('button', 'dv-tab', S.tabs[t]);
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => showTab(t));
    bar.append(b);
    tabBtns[t] = b;
    const page = el('div', 'dv-page');
    page.setAttribute('role', 'tabpanel');
    p.append(page);
    pages[t] = page;
  }

  // the mage
  const mage = section(pages.mage, S.mage);
  mage.append(
    btn(S.heal, () => {
      player.hp = player.maxHp;
      renderHearts();
    }),
    btn(S.container, () => {
      player.heartsPaid--;
      refreshStats();
    }),
    (godBtn = btn('', () => {
      DEV.god = !DEV.god;
      toast(DEV.god ? S.godOn : S.godOff, 2);
    })),
    btn(S.resetArtifacts, () => resetArtifacts()),
    // curses to try the shrine with, and cleansing one at once (no fight, no obols)
    btn(S.takeCurse, () => {
      const free = ARTIFACT_DEFS.filter((a) => a.curse && !player.items.includes(a.id));
      if (free.length) grantArtifact(free[Math.floor(Math.random() * free.length)]);
      else toast(S.allCurses, 2);
    }),
    btn(S.cleanse, () => {
      if (!cleanseAtOnce()) toast(S.noCurse, 2);
    }),
  );
  // insight and levels (the choice a level brings waits for the level-up screen)
  const lv = section(pages.mage, S.levels);
  lv.append(
    (levelInfo = el('p', 'dv-info')),
    btn(S.nextLevel, () => gainInsight(toNextLevel() || 10)),
    btn(S.maxLevel, () => setLevel(LEVEL_CAP)),
    btn(S.firstLevel, () => setLevel(1)),
  );
  for (const a of ATTRS) lv.append(btn(S.plusAttr(STR.attrs[a].name), () => spendPoint(a, true), attrText(a))); // (a point without a level's)
  lv.append(
    btn(S.offerNow, () => {
      closeDev();
      if (!openLevelUp()) toast(S.noLevelWaits, 2);
    }),
    (autoBtn = btn('', () => {
      DEV.autoLevel = DEV.autoLevel ? false : 'choose';
    })),
  );
  lv.append(
    btn(S.noAttrs, () => {
      G.run.attrs = noAttrs();
      refreshStats(false);
    }),
  );
  // boons: take each (its next rank), deal three as a level would, none
  const bn = section(pages.mage, S.boons);
  bn.append(
    (boonInfo = el('p', 'dv-info')),
    btn(S.dealNow, () =>
      toast(
        dealNow()
          .map((c) => `${boon(c.id).name}${c.rank > 1 ? ' II' : ''}${c.lean ? ' *' : ''}`)
          .join(' · '),
        4,
      ),
    ),
    btn(S.noBoons, () => {
      G.run.boons = {};
      G.run.pledge = null;
      refreshStats(false);
    }),
  );
  const bnBox = el('div', 'dv-row');
  bn.parentElement!.append(bnBox);
  for (const b of BOON_DEFS) {
    const x = btn(
      b.name,
      () => {
        if (!takeBoon(b.id)) toast(S.boonFull, 2);
      },
      b.text,
    );
    const dot = el('i');
    dot.style.background = b.color;
    x.prepend(dot);
    bnBox.append(x);
  }
  const res = section(pages.mage, S.resources);
  for (const [r, n] of [
    ['coins', 10],
    ['keys', 1],
    ['keys', 5],
    ['glyphs', 1],
    ['glyphs', 5],
  ] as [Resource, number][]) {
    res.append(btn(S.give(n, S.names[r]), () => giveResources({ [r]: n })));
  }
  res.append(btn(S.emptyPurse, () => giveResources({ coins: -99, keys: -99, glyphs: -99 })));
  // soul motes: one of each kind straight into the HUD, none, and a floor's end for the hallowed ones
  for (const k of SOULS)
    res.append(
      btn(S.giveSoul(S.dropNames[soulItem(k)]), () => {
        if (!gainSoul(k)) toast(STR.toast.fullSouls, 2);
      }),
    );
  res.append(
    btn(S.noSouls, () => resetSouls()),
    btn(S.floorEnd, () => hallowedMend()),
  );

  // drops, just ahead of the mage
  const drops = section(pages.mage, S.drops);
  for (const d of DROPS)
    drops.append(
      btn(S.dropNames[d] ?? d, () => {
        const q = ahead();
        spawnPickup(d, q.x, q.z, { gilded: false, asIs: true });
      }),
    );
  drops.append(
    btn(S.gildedChest, () => {
      const q = ahead();
      spawnPickup('chest', q.x, q.z, { gilded: true });
    }),
  );
  drops.append(btn(S.loreAgain, () => G.run.loreSeen.clear(), S.loreAgainTitle)); // their lore cards show again

  // alchemy: each potion into the belt, every potion laid out ahead, what is known identified or forgotten, the belt
  // used as R and F use it, and reagents into the pouch
  const alch = section(pages.mage, S.alchemy);
  alch.append(
    (alchInfo = el('p', 'dv-info')),
    btn(S.potionsHere, () =>
      POTION_IDS.forEach((id, i) => {
        const q = freeSpotNear(
          G.room.current,
          player.x + ((i % 6) - 2.5) * 0.8,
          player.z - 1.4 - Math.floor(i / 6) * 0.9,
        );
        spawnPickup('potion', q.x, q.z, { potion: id });
      }),
    ),
    btn(S.identifyAll, () => {
      for (const id of POTION_IDS) identify(id);
    }),
    btn(S.forgetPotions, () => {
      G.run.identified.length = 0;
      forgetBrews();
      renderBelt();
    }),
    btn(S.emptyBelt, () => {
      player.belt.length = 0;
      player.beltAt = 0;
      renderBelt();
    }),
    btn(S.drinkChosen, () => {
      closeDev();
      usePotion('drink');
    }),
    btn(S.throwChosen, () => {
      closeDev();
      usePotion('throw');
    }),
    btn(S.reagentsAll, () => {
      for (const r of REAGENT_IDS) addReagent(r, 3);
    }),
    (reagentBtn = btn('', () => {
      DEV.reagents = !DEV.reagents;
    })),
    btn(S.openTable, () => {
      closeDev();
      openLab('brew');
    }),
    // the jelly serpent's vat in a laboratory: crack its window as a bolt does, let it out, make it restless
    btn(S.crackVat, () => {
      closeDev();
      if (!crackVat()) toast(S.noVat, 2);
    }),
    btn(S.serpentOut, () => {
      closeDev();
      if (!breakOut()) toast(S.noVat, 2);
    }),
    btn(S.restless, () => {
      G.run.restless = !G.run.restless;
    }),
    // Dr. Jelly hands something over: played when the menu closes
    ...(['potion', 'recipe', 'coins'] as const).map((k) =>
      btn(S.jellyGives[k], () => {
        if (!G.room.current.lab) {
          toast(S.noLab, 2.5);
          return;
        }
        jellyGives(k === 'potion' ? { kind: k, potion: (player.belt[0] ?? 'healing') as PotionId } : { kind: k });
        closeDev();
      }),
    ),
  );
  const alchBox = el('div', 'dv-row');
  alch.parentElement!.append(alchBox); // (a second row: one button a potion)
  alchBox.append(
    ...POTION_IDS.map((id) => {
      const b = btn(
        POTIONS[id].name,
        () => {
          if (!addPotion(id)) toast(STR.alchemy.full, 2);
        },
        `${POTIONS[id].text.drink} · ${POTIONS[id].text.throw}`,
      );
      const dot = el('i');
      dot.style.background = POTIONS[id].color;
      b.prepend(dot);
      return b;
    }),
  );

  // artifacts: every one in the data, marked when held
  artBox = section(pages.mage, S.artifacts);
  // afflictions: each one landed on the mage, to see its chip beside the mana bar and its line
  const aff = section(pages.mage, S.afflictions);
  aff.append(
    btn(S.afflictNames.hexed, () => {
      const took = Math.min(player.mana, 8);
      gainMana(-8);
      hexDrained(took);
    }),
    btn(S.afflictNames.chill, () => {
      player.chill = 3;
    }),
    btn(S.afflictNames.stone, () => {
      player.stone = 3;
    }),
    btn(S.afflictNames.dim, () => {
      player.dim = 3;
    }),
    btn(S.afflictNames.hints, () => {
      for (const k of [...G.run.hinted]) if (k.startsWith('afflict:')) G.run.hinted.delete(k);
    }),
  );
  // Fen-Nex: bound by its artifact above; grown a stage here, as if a floor had gone by
  section(pages.mage, S.fennex).append(
    btn(S.growFennex, () => {
      if (fennexInfo()) growFennex();
      else toast(S.noFennex, 2);
    }),
  );
  // costumes: any artifact's piece tried on as if held (a focus held in the casting hand), or all taken off
  const cost = section(pages.mage, S.costumes);
  cost.append(
    (costInfo = el('p', 'dv-info')),
    btn(S.takeAllOff, () => {
      takeAllOff();
      refresh();
    }),
    (closeBtn = btn(S.closeUp, () => {
      setCloseUp(!DEV.closeUp);
      refresh();
    })),
  );
  // Azyrion's arc: a stage forced, or from what is held
  const arcRow = section(pages.mage, S.arc);
  arcRow.append(
    (arcInfo = el('p', 'dv-info')),
    ...[undefined, 0, 1, 2, 3, 4].map((n) => {
      const b = btn(n === undefined ? S.arcHeld : S.arcStage(n), () => {
        DEV.arc = n;
        dress();
        refresh();
      });
      b.dataset.arc = String(n);
      return b;
    }),
  );
  costBox = section(pages.mage, S.costumesTry);
  // transformations: each formed at once (its banner, lore card, gift and look), or all undone
  transBox = section(pages.mage, S.transforms);
  transBox.append(
    (transInfo = el('p', 'dv-info')),
    btn(S.clearTransforms, () => {
      clearTransforms();
      refresh();
    }),
    ...TRANSFORM_IDS.map((t) => {
      const b = btn(
        STR.transforms[t].name,
        () => {
          formTransform(t);
          refresh();
        },
        STR.transforms[t].gift,
      );
      b.dataset.t = t;
      return b;
    }),
  );

  // spells: every one in the data, learned into the chosen slot; mana
  spellBox = section(pages.magic, S.spells);
  const slotSel = el('select');
  slotSel.setAttribute('aria-label', S.slot);
  for (const [i, k] of STR.controls.spellsKeys.split(' and ').entries()) {
    const o = el('option', '', `${S.slot} ${k}`);
    o.value = String(i);
    slotSel.append(o);
  }
  slotSel.addEventListener('change', () => {
    spellSlot = Number(slotSel.value);
    refresh();
  }); // (the socket's button shows the chosen slot's)
  spellBox.parentElement!.insertBefore(slotSel, spellBox);
  // runes: carved into the chosen slot's socket; refused with the reason when one doesn't fit
  const runes = section(pages.magic, S.runes);
  runes.append(
    (runeInfo = el('p', 'dv-info')),
    ...RUNE_DEFS.map((r) => {
      const b = btn(
        r.name,
        () => {
          const why = carve(spellSlot, r.id);
          if (why) toast(STR.runes.refused[why], 2);
        },
        r.text,
      );
      b.insertAdjacentHTML('afterbegin', runeIconImg(r.id));
      return b; // (its glyph, as the panel shows it)
    }),
    btn(S.clearRunes, () => clearRunes(spellSlot)),
    (socketBtn = btn('', () => setSockets(spellSlot, player.sockets[spellSlot].size > 1 ? 1 : 2))),
    el('p', 'dv-info', S.toPouch),
    ...RUNE_DEFS.map((r) => {
      // (into the pouch, as found, its card the first time)
      const b = btn(
        r.name,
        () => {
          addRune(r.id);
          refresh();
        },
        r.text,
      );
      b.insertAdjacentHTML('afterbegin', runeIconImg(r.id));
      return b;
    }),
    btn(S.runeAhead, () => {
      closeDev();
      spawnPickup('rune', player.x, player.z - 1.5, { asIs: true });
    }),
    (runesBtn = btn('', () => {
      DEV.runes = !DEV.runes;
      rebuildFloor();
      refresh();
    })),
  );
  const mana = section(pages.magic, S.mana);
  mana.append(
    btn(S.fullMana, () => gainMana(player.stats.maxMana)),
    (manaBtn = btn('', () => {
      DEV.mana = !DEV.mana;
      toast(DEV.mana ? S.manaOn : S.manaOff, 2);
    })),
    btn(S.forget, () => forgetSpells()),
    btn(S.page, () => {
      if (!dropPage(G.room.current, player.x, player.z - 1.5)) toast(S.noPage, 2);
    }),
  );
  // spell knowledge: kept between runs in this browser
  const know = section(pages.magic, S.knowledge);
  know.append(
    (knowBox = el('p', 'dv-info')),
    btn(S.knowAll, () => {
      knowEvery();
      refresh();
    }),
    btn(S.forgetKnowledge, () => {
      forgetKnowledge();
      refresh();
    }),
    btn(S.findReactions, () => {
      findEveryReaction(REACTION_IDS);
      refresh();
    }),
    btn(S.forgetReactions, () => {
      forgetReactions();
      refresh();
    }), // (the book's wheel)
    btn(S.findWeaves, () => {
      findEveryWeave(WEAVE_IDS);
      refresh();
    }),
    btn(S.forgetWeaves, () => {
      forgetWeaves();
      refresh();
    }),
  );
  // spell marks: what the slotted spells and the knowledge show on the mage; attune to a school, show the circle
  const marks = section(pages.magic, S.marks);
  marks.append(
    (marksInfo = el('p', 'dv-info')),
    ...SCHOOLS.map((sc) =>
      btn(S.attune(STR.schools[sc]), () => {
        attuneTo(sc);
        refresh();
      }),
    ),
    btn(S.showCircle, () => {
      player.still = CFG.marks.circle.after + 3;
      closeDev();
    }),
  );
  // every reaction, set off on training dummies just ahead
  const reacts = section(pages.magic, S.reactionsHere);
  for (const r of REACTION_IDS)
    reacts.append(
      btn(
        STR.reactions[r],
        () => {
          closeDev();
          const q = ahead(3);
          setOffReaction(r, q.x, q.z);
        },
        STR.knowledge.reactionText[r],
      ),
    );
  // every boon that acts on something, taken if need be and set off just ahead
  const boonsHere = section(pages.magic, S.boonsHere);
  for (const id of BENCH_BOONS) {
    const b = boon(id),
      x = btn(
        b.name,
        () => {
          closeDev();
          setOffBoon(id);
        },
        b.text,
      );
    const dot = el('i');
    dot.style.background = b.color;
    x.prepend(dot);
    boonsHere.append(x);
  }
  // every weave and chain, set up just ahead (north of the mage) and set off
  const weaves = section(pages.magic, S.weavesHere);
  for (const w of WEAVE_IDS)
    weaves.append(
      btn(
        STR.weaves[w].name,
        () => {
          closeDev();
          setOffWeave(w);
        },
        STR.weaves[w].text,
      ),
    );
  // water and oil in this room (the test rooms with them are on the Rooms & runs tab)
  const pools = section(pages.magic, S.pools);
  pools.append(
    btn(S.ignite, () => poolsDo('fire')),
    btn(S.freezeWater, () => poolsDo('frost')),
    btn(S.shockWater, () => poolsDo('shock')),
  );

  // foes, a little further ahead (they don't lock the doors)
  const foes = section(pages.foes, S.foes);
  const floorHp = () => FLOORS[Math.min(G.run.floor, FLOORS.length - 1)].enemyHp;
  for (const kind of ['rotling', 'dummy'] as EnemyType[])
    foes.append(
      btn(S.foeNames[kind], () => {
        const q = ahead(3);
        makeEnemy(kind, q.x, q.z, floorHp());
      }),
    );
  foes.append(
    btn(S.championHeavy, () => {
      // this floor's heavy, as a champion room has one
      const q = ahead(3),
        floor = FLOORS[Math.min(G.run.floor, FLOORS.length - 1)];
      makeEnemy(pickFoe(floor.foes, 'H', Math.random, true), q.x, q.z, floorHp(), undefined, { champion: true });
    }),
  );
  // rooms with a pair: each floor's pairs, the two side by side ahead of the mage
  const pairList = [...new Set(FLOORS.flatMap((f) => (f.pairs?.list ?? []).map(([a, b]) => `${a}+${b}`)))];
  foes.append(
    el('p', 'dv-info', S.pairs),
    ...pairList.map((k) =>
      btn(k.split('+').map(foeName).join(' + '), () => {
        const [a, b] = k.split('+') as FoeType[],
          q = ahead(3.5);
        spawnFoe(a, q.x - 0.6, q.z, floorHp());
        spawnFoe(b, q.x + 0.6, q.z, floorHp());
      }),
    ),
  );
  // foes in each other's ground: a band of fire, webs and rime between the mage and a wolf pack and a salt golem
  foes.append(
    btn(S.lureTest, () => {
      closeDev();
      lureTest(player.x, player.z);
    }),
  );
  // a champion in each school's mantle: the floor's heavy, wearing it
  foes.append(
    el('p', 'dv-info', S.mantles),
    ...MANTLE_IDS.map((id) =>
      btn(STR.foes.mantles[id].name, () => {
        const q = ahead(3),
          floor = FLOORS[Math.min(G.run.floor, FLOORS.length - 1)];
        makeEnemy(pickFoe(floor.foes, 'H', Math.random, true), q.x, q.z, floorHp(), undefined, {
          champion: true,
          mantle: id,
        });
      }),
    ),
  );
  // the foes built in code, by floor, from data/foes.json; and one of them in every fight, to test it
  for (const floor of [...FLOORS.map((_, i) => i + 1), 0]) {
    // (0: the Wardlings, no floor's own)
    const row = FOE_IDS.filter((id) => FOES[id].floor === floor);
    if (row.length)
      foes.append(
        el('p', 'dv-info', S.foesOfFloor(floor)),
        ...row.map((id) =>
          btn(foeName(id), () => {
            const q = ahead(3);
            spawnFoe(id, q.x, q.z, floorHp());
          }),
        ),
      );
  }
  // the drinking ward as a foe's shield: round the foe nearest the mage
  foes.append(
    btn(S.wardFoe, () => {
      const e = nearestFoe();
      if (e) wardFoe(e);
      else toast(S.noFoe, 2);
    }),
  );
  foes.append(
    el('p', 'dv-info', S.bestiaryNote),
    (foeBtn = btn('', () => {
      // (the floor is built again with it)
      const list = [undefined, ...FOE_IDS],
        at = list.indexOf(DEV.foe);
      DEV.foe = list[(at + 1) % list.length];
      rebuildFloor();
      refresh();
    })),
    btn(S.findCounters, () => {
      findEveryCounter();
      refresh();
    }),
    btn(S.forgetBestiary, () => {
      forgetBestiary();
      refresh();
    }),
  );

  // the rooms' objects, put down just ahead of the mage
  const objs = section(pages.foes, S.objects);
  for (const kind of PROP_KINDS)
    objs.append(
      btn(S.propNames[kind], () => {
        const q = ahead(1.5);
        if (!placeProp(kind, q.x, q.z)) toast(S.noRoom, 2);
      }),
    );
  // fire, frost or shock landing just ahead, as a spell's would: to light braziers and candles, charge runes, set lodestones leaping
  for (const [kind, label] of [
    ['burn', S.kindle],
    ['chill', S.frost],
    ['shock', S.shock],
    ['sanct', S.hallowAhead],
    ['hex', S.umbralAhead],
  ] as [StatusKind | 'sanct' | 'hex', string][])
    objs.append(
      btn(label, () => {
        const q = ahead(1.5);
        elementDev(kind, q.x, q.z);
      }),
    );
  objs.append(
    btn(S.steamAhead, () => {
      const q = ahead(1.5);
      steamAt(q.x, q.z);
    }),
  ); // (Steam, Ember + Frost: foes inside can't aim, eyes can't see through it)

  // statuses on every foe in the room: to see them, and to set off reactions by hand
  const sts = section(pages.magic, S.statuses);
  for (const [kind, amount] of [
    ['burn', 4],
    ['chill', 1],
    ['shock', 2],
    ['sanct', 3],
    ['hex', 1],
    ['root', 2],
    ['grow', 4],
  ] as [SpellStatus, number][]) {
    // (Overgrown)
    sts.append(
      btn(S.inflictOn(STR.statusNames[kind]), () => {
        for (const e of G.room.enemies) inflict(e, { [kind]: amount });
      }),
    );
  }

  // this floor: its special rooms, and ways through it
  floorBox = section(pages.rooms, S.floor);
  // the Wandering Merchant: rides into this room now, whatever the run's luck
  section(pages.rooms, STR.banner.wanderer[0]).append(
    btn(S.wanderer, () => {
      closeDev();
      callWanderer();
    }),
  );
  // the waystone (it rises in the boss room once the boss falls; here, ahead of the mage, kindled at once)
  section(pages.rooms, STR.waystone.title).append(
    btn(S.raiseStone, () => {
      closeDev();
      const w = raiseWaystone(G.room.current, player.x, player.z - 2.2);
      w.rise = Math.max(w.rise, 0.999);
    }),
    btn(S.openStone, () => {
      if (!G.room.current.waystone) {
        toast(S.noStone, 2);
        return;
      }
      closeDev();
      openWaystone('runes');
    }),
  );
  // the shrine's bargain (a stone at every shrine's circle; here, ahead of the mage), and its deal on any school
  section(pages.rooms, STR.bargain.title).append(
    btn(S.bargainHere, () => {
      closeDev();
      buildBargain(G.room.current, [player.x - G.room.current.cx, player.z - 2.2 - G.room.current.cz]);
    }),
    ...SCHOOLS.map((s) =>
      btn(S.bargainOn(STR.schools[s]), () => {
        if (!G.room.current.bargain) {
          toast(S.noBargain, 2);
          return;
        }
        closeDev();
        openBargainHere(s);
      }),
    ),
  );
  // the gamepads the browser reports: name, layout, and what is held
  const gp = section(pages.rooms, S.pads);
  gp.append((padInfo = el('div', 'dv-info'))); // (read again whenever a pad comes or goes while the menu is open)
  for (const ev of ['gamepadconnected', 'gamepaddisconnected'])
    window.addEventListener(ev, () => {
      if (devOpen()) refresh();
    });

  // the pixel look (the game's look): the grid of pixels (texel or fine), outlines, light in bands; kept in this browser
  const px = section(pages.look, S.pixel);
  px.append(
    (pxBtn = btn('', () => {
      setPixelLook({ lines: LINES[(LINES.indexOf(pixelLook().lines) + 1) % LINES.length] });
    })),
    (lineBtn = btn('', () => setPixelLook({ outline: !pixelLook().outline }))),
    (bandBtn = btn('', () => setPixelLook({ bands: !pixelLook().bands }))),
    (gradeInfo = el('div', 'dv-info')), // (the floor's grade and fill, art bible 4.2 and 4.3)
  );

  // the room kit: each part's kind; the fire objects, the objects and the drops to look at
  const kit = section(pages.look, S.kit);
  // each part's kind: drawn per room, or one stepped through the floor's list and forced on every room, to compare
  for (const part of KIT_PARTS)
    kitPartBtns[part] = btn('', () => {
      // (from the kind forced, or the one this room drew: the first click shows the next one)
      const forced = DEV.kitKinds[part],
        list = kindsOf(FLOORS[G.run.floor].look.kit, part),
        at = list.indexOf(forced ?? G.room.current.look.kinds[part]);
      DEV.kitKinds = { ...DEV.kitKinds, [part]: forced ? list[at + 1] : list[(at + 1) % list.length] }; // (past the last forced: drawn per room again)
      if (!DEV.kitKinds[part]) delete DEV.kitKinds[part];
      rebuildFloor();
    });
  kit.append(
    el('p', 'dv-info', S.kitNote),
    ...KIT_PARTS.map((p) => kitPartBtns[p]),
    btn(S.fireHere, () => {
      closeDev();
      for (const [kind, dx, dz, lit] of [
        ['brazier', -1.4, -1.8, false],
        ['brazier', 0, -2.2, true],
        ['candles', 1.3, -1.8, false],
        ['candles', 2.4, -2.2, true],
      ] as const) {
        const q = freeSpotNear(G.room.current, player.x + dx, player.z + dz);
        if (placeProp(kind, q.x, q.z) && lit) fireAt(q.x, q.z, 0.3);
      }
    }),
    btn(S.objectsHere, () => {
      closeDev();
      objectsHere();
    }),
    (scatterInfo = el('div', 'dv-info')), // (what the room's scatter put down)
    btn(S.dropsHere, () => {
      closeDev();
      dropsHere();
    }),
    btn(S.relicsHere, () => {
      closeDev();
      relicsHere();
    }),
  );

  // the made assets: on or off to compare with the placeholders, what loaded, and what a frame costs
  const assets = section(pages.look, S.assets);
  assets.append(
    (assetBox = el('div', 'dv-info')),
    (assetBtn = btn('', () => useAssets(!assetsOn()))),
    btn(S.showAssets, () => {
      closeDev();
      showAssetsHere();
    }),
    (obolBtn = btn('', () => {
      const all = obolFaces();
      wearFace(all[(all.indexOf(obolFace()) + 1) % all.length]);
      refresh();
    })),
    (fpsBtn = btn('', () => {
      DEV.fps = !DEV.fps;
    })),
  );

  // the soundscapes and the music (docs/archive/sound-plan.md): any floor's, a room's or a theme's over it, any piece in any mood
  const snd: { floor: number; over: string; piece: string; mood: Mood } = {
    floor: 0,
    over: '',
    piece: PIECES[1].id,
    mood: 'explore',
  };
  const playScape = () =>
    AudioDirector.force({
      ...AudioDirector.forced,
      floor: snd.floor,
      room: snd.over in ROOM_SCAPES ? snd.over : 'normal',
      theme: snd.over in THEME_SCAPES ? snd.over : undefined,
    });
  const playMusic = () => AudioDirector.force({ ...AudioDirector.forced, piece: snd.piece, mood: snd.mood });
  const sc = section(pages.sound, S.scapes);
  sc.append(
    (soundInfo = el('p', 'dv-info')),
    el('p', 'dv-info', S.scapeNote),
    (soundBtn = btn('', () => AudioDirector.set(!AudioDirector.on))),
    btn(S.soundGame, () => AudioDirector.force(null)),
    ...FLOOR_SCAPES.map((_, i) =>
      btn(STR.floors[i]?.[0] ?? S.floorN(i + 1), () => {
        snd.floor = i;
        playScape();
      }),
    ),
    ...['', ...Object.keys(ROOM_SCAPES), ...Object.keys(THEME_SCAPES)].map((id) =>
      btn(S.scapeRoom(id ? (S.roomNames[id] ?? THEMES.get(id)?.name ?? id) : S.scapeNone), () => {
        snd.over = id;
        playScape();
      }),
    ),
  );
  const mu = section(pages.sound, S.music);
  mu.append(
    ...PIECES.map((p) =>
      btn(p.name, () => {
        snd.piece = p.id;
        playMusic();
      }),
    ),
    ...MOODS.map((m) =>
      btn(S.moodIs(S.moods[m]), () => {
        snd.mood = m;
        playMusic();
      }),
    ),
    ...(['cleared', 'death'] as const).map((k) => btn(S.stingers[k], () => AudioDirector.stinger(k))),
    btn(S.savePreview(CFG.audio.preview), () => {
      toast(S.rendering, 2);
      void savePreview(AudioDirector.forced);
    }),
  );

  // the artifacts as the room kit builds them (looks only), in rows
  const arts = section(pages.galleries, S.artifactGallery);
  arts.append(
    el('p', 'dv-info', S.artifactsNote),
    btn(S.showOptions, () => {
      closeDev();
      showArtifactGallery(G.room.current, player.x, player.z);
    }),
    btn(S.takeOptions, () => removeArtifactGallery(G.room.current)),
  );

  // creatures made in Tripo and animated in code (docs/creatures.md): one stood ahead of the mage, walking, roaring, resting
  const made = section(pages.galleries, S.creatures);
  made.append(
    el('p', 'dv-info', S.creaturesNote),
    ...Object.keys(CREATURES).map((id) =>
      btn(S.creatureHere(S.creatureNames[id] ?? id), () => {
        closeDev();
        const at = freeSpotNear(
          G.room.current,
          player.x + CFG.creatures.standSide,
          player.z + CFG.creatures.standSouth,
        );
        void showCreature(id, G.room.current, at.x, at.z);
      }),
    ),
    btn(S.roarNow, () => {
      closeDev();
      roarNow();
    }),
    btn(S.takeOptions, () => takeCreatures(G.room.current)),
  );

  // the coin faces: every face side by side ahead of the mage, as the room draws them
  const coins = section(pages.galleries, S.coinGallery);
  coins.append(
    el('p', 'dv-info', S.coinsNote),
    btn(S.showOptions, () => {
      closeDev();
      showCoins();
    }),
    btn(S.takeOptions, () => takeCoins()),
  );

  // Dr. Jelly (the plague doctor) ahead of the mage, giving
  const jl = section(pages.galleries, S.jellyLooks);
  jl.append(
    el('p', 'dv-info', S.jellyNote),
    btn(S.showOptions, () => {
      closeDev();
      showJellyLooks(G.room.current, player.x, player.z);
    }),
    btn(S.takeOptions, () => removeModelOptions(G.room.current)),
  );

  // the bosses built in code: every one ahead of the mage
  const bl = section(pages.galleries, S.bossLooks);
  bl.append(
    el(
      'p',
      'dv-info',
      [
        STR.bosses.warden.name,
        STR.bosses.abbess.name,
        STR.bosses.pyre.name,
        STR.bosses.hart.name,
        STR.bosses.angler.name,
        STR.bosses.tiger.name,
        STR.bosses.dragon.name,
        STR.bosses.twins.name,
        STR.bosses.kaelith.name,
      ].join(' · '),
    ),
    btn(S.showOptions, () => {
      closeDev();
      showBossLooks(G.room.current, player.x, player.z);
    }),
    btn(S.takeOptions, () => removeModelOptions(G.room.current)),
  );
  // the townspeople's ten figures: in a row ahead of the mage, gesturing in turn
  const tg = section(pages.galleries, S.townGallery);
  tg.append(
    btn(S.showOptions, () => {
      closeDev();
      townGallery(player.x, player.z);
    }),
    btn(S.takeOptions, () => takeTownGallery()),
  );
  // the bestiary: looks only, in rows by kind, each named with the fight it brings
  const best = section(pages.galleries, S.bestiary);
  best.append(
    el(
      'p',
      'dv-info',
      (['beast', 'creature', 'elemental'] as const)
        .map(
          (k) =>
            `${S.bestiaryKinds[k]}: ${BESTIARY_OPTIONS.filter((o) => o.kind === k)
              .map((o) => STR.bestiary[o.id].name)
              .join(', ')}`,
        )
        .join(' · '),
    ),
    btn(S.showOptions, () => {
      closeDev();
      showBestiary(G.room.current, player.x, player.z);
    }),
    btn(S.takeOptions, () => removeModelOptions(G.room.current)),
  );
  // spell effect options (looks only): each plays one cast over and over, ahead of the mage
  const fx = section(pages.galleries, S.effects);
  fx.append(
    el('p', 'dv-info', EFFECT_OPTIONS.map((o) => DEV_STR.effectOptions[o.id].name).join(', ')),
    btn(S.showOptions, () => {
      closeDev();
      showEffectOptions(G.room.current, player.x, player.z);
    }),
    btn(S.takeOptions, () => removeEffectOptions(G.room.current)),
  );

  // start something: a test room in a variant, a boss fight, a new run
  const test = section(pages.rooms, S.test);
  const tpl = el('select');
  tpl.setAttribute('aria-label', S.template);
  const types = [...new Set(TEMPLATE_DEFS.flatMap((t) => t.types))];
  for (const ty of types) {
    const g = el('optgroup');
    g.label = S.roomNames[ty] ?? ty;
    for (const t of TEMPLATE_DEFS.filter((d) => d.types[0] === ty)) {
      const o = el('option', '', `${t.id} (${t.shape}${t.difficulty ? `, ${t.difficulty}` : ''})`);
      o.value = t.id;
      g.append(o);
    }
    tpl.append(g);
  }
  tpl.value = TEMPLATE_DEFS.find((t) => t.types.includes('normal'))!.id; // a fight to start with
  const variant = el('select');
  variant.setAttribute('aria-label', S.variant);
  for (const v of VARIANTS) {
    const o = el('option', '', S.variants[v] ?? v);
    o.value = v;
    variant.append(o);
  }
  test.append(
    tpl,
    variant,
    btn(S.play, () => start({ testTemplate: tpl.value, testVariant: variant.value as RoomVariant })),
  );
  // themed rooms: a test room of each theme, next to the start
  const themes = section(pages.rooms, S.themes);
  for (const t of THEME_DEFS) {
    const first = TEMPLATE_DEFS.find((d) => d.theme === t.id);
    if (first) themes.append(btn(t.name, () => start({ testTemplate: first.id })));
  }

  const bosses = section(pages.rooms, S.bosses);
  for (const b of BOSS_TYPES)
    bosses.append(
      btn(STR.bosses[b].name, () => start({ testTemplate: b === 'kaelith' ? 'seal_kaelith' : bossRoom(), boss: b })),
    ); // (Kaelith in its own hall, its ward pillars round it)
  // Kaelith's fight: its phase, its wards; to a phase, the wards shut
  const kae = section(pages.rooms, S.kaelith);
  kae.append(
    (kaelithBox = el('p', 'dv-info')),
    btn(S.kaelithPhase2, () => {
      if (!kaelithToPhase(2)) toast(S.noKaelith, 2);
    }),
    btn(S.kaelithPhase3, () => {
      if (!kaelithToPhase(3)) toast(S.noKaelith, 2);
    }),
    btn(S.shutWards, () => {
      if (!shutAllWards()) toast(S.noKaelith, 2);
    }),
  );
  // a won run's dawn, from wherever the mage is (the end screen follows it, as after Kaelith)
  const day = section(pages.rooms, S.daylight);
  day.append(
    (daylightBox = el('p', 'dv-info')),
    btn(S.daylightNow, () => {
      closeDev();
      enterDaylight();
    }),
  );
  // the save that carries from run to run (Dust, obols, the runs remembered); wiped or a veteran's, the page
  // starts again from it
  const saved = section(pages.rooms, S.keeping);
  saved.append(
    (keepBox = el('p', 'dv-info')),
    btn(S.giveDust, () => {
      giveHome(100, 0);
      refresh();
    }),
    btn(S.giveObols, () => {
      giveHome(0, 50);
      refresh();
    }),
    btn(S.wipeSave, () => {
      wipeSave();
      location.reload();
    }),
    btn(S.veteranSave, () => {
      veteranSave();
      location.reload();
    }),
  );
  // the Vigil as a place: waking there (as after a run, or the first time, dark with its first candle), its
  // lectern's screen, and the Ferryman's boat down to floor 1
  const vig = section(pages.rooms, S.vigil);
  vig.append(
    (vigilBox = el('p', 'dv-info')),
    btn(S.toVigil, () => {
      closeDev();
      wakeAtVigil(false);
    }),
    btn(S.vigilFirst, () => {
      closeDev();
      wakeAtVigil(true);
    }),
    btn(S.vigilLectern, () => {
      if (!vigilInfo().here) {
        toast(S.notAtVigil, 2);
        return;
      }
      closeDev();
      openLectern();
    }),
    btn(S.vigilBoat, () => {
      if (!vigilInfo().here) {
        toast(S.notAtVigil, 2);
        return;
      }
      closeDev();
      board();
    }),
  );
  // chained shades: the floor's (where it lies, its chains), one chained beside the mage, its chains broken, freed
  // or bound; a shade walking with the mage this run, to see its help at work
  const sh = section(pages.rooms, S.shades);
  sh.append(
    (shadeBox = el('p', 'dv-info')),
    btn(S.shadeGo, () => {
      const i = shadeInfo();
      if (!i) {
        toast(S.noShade, 2);
        return;
      }
      if (G.room.current.plan.id !== i.room) {
        warp(i.room);
      }
      closeDev();
    }),
    btn(S.shadeBreak, () => {
      if (!breakAllChains()) toast(S.noShade, 2);
      refresh();
    }),
    btn(S.shadeFree, () => {
      if (!freeIt()) toast(S.noShade, 2);
      refresh();
    }),
    btn(S.shadeBind, () => {
      if (!bindIt()) toast(S.noShade, 2);
      refresh();
    }),
  );
  const shRow = el('div', 'dv-row'),
    walkRow = el('div', 'dv-row');
  for (const id of SHADE_IDS) {
    shRow.append(
      btn(S.shadeHere(STR.shades.names[id]), () => {
        const p = freeSpotNear(G.room.current, player.x, player.z - 1.6);
        layShade(id, G.room.current, p.x, p.z);
        closeDev();
      }),
    );
    walkRow.append(
      btn(S.shadeWalks(STR.shades.names[id]), () => {
        walkWith(id);
        refresh();
      }),
    );
  }
  sh.parentElement!.append(shRow, walkRow);
  // the townspeople: any one talks, at the last run's moment or one chosen; every shade freed or none (the Vigil
  // woken again to stand them), the lines forgotten, the flags their choices set
  const tw = section(pages.rooms, S.town);
  const again = () => {
    if (vigilInfo().here) {
      closeDev();
      wakeAtVigil(false);
    } else refresh();
  };
  tw.append(
    (townBox = el('p', 'dv-info')),
    (momentBtn = btn('', () => {
      const order = [undefined, 'death', 'won', 'boss', null] as const;
      talkMoment = order[(order.indexOf(talkMoment) + 1) % order.length];
      refresh();
    })),
    btn(S.freeAll, () => {
      setFreed(SHADE_IDS);
      again();
    }),
    btn(S.freeNone, () => {
      setFreed([]);
      again();
    }),
    btn(S.forgetHeard, () => {
      forgetHeard();
      again();
    }),
    (wearBtn = btn('', () => {
      setTownWear(townWear() === 'made' ? 'code' : 'made');
      again();
    })),
  ); // (the made models, or the figures in code)
  const talkRow = el('div', 'dv-row'),
    flagRow = el('div', 'dv-row');
  for (const id of SPEAKERS)
    talkRow.append(
      btn(S.talkTo(speakerName(id)), () => {
        closeDev();
        if (!talkTo(id, talkMoment)) toast(S.nothingToSay, 2);
      }),
    );
  for (const k of [
    ...new Set(DIALOGUE.lines.flatMap((l) => (l.choices ?? []).flatMap((c) => Object.keys(c.set ?? {})))),
  ]) {
    const b = btn(k, () => {
      setFlag(k, vigil().flags[k] === undefined ? true : undefined);
      refresh();
    });
    flagBtns.push([k, b]);
    flagRow.append(b);
  }
  tw.parentElement!.append(talkRow, flagRow);
  // gifts, bonds and powers: what a descent begins with; each power owned or not, each bond a step deeper (round
  // to none), each quest given, done or forgotten
  const gf = section(pages.rooms, S.gifts);
  gf.append((giftBox = el('p', 'dv-info')));
  const powerRow = el('div', 'dv-row'),
    bondRow = el('div', 'dv-row'),
    questRow = el('div', 'dv-row');
  for (const p of TOWNSFOLK.powers) {
    const b = btn(STR.gifts.powers[p.id][0], () => {
      givePower(p.id, !vigil().powers.includes(p.id));
      refreshStats(false);
      refresh();
    });
    powerBtns.push([p.id, b]);
    powerRow.append(b);
  }
  for (const id of SHADE_IDS) {
    const b = btn('', () => {
      bondTo(id, ((vigil().bonds[id] ?? 0) + 1) % (BOND_MAX + 1));
      refresh();
    });
    bondBtns.push([id, b]);
    bondRow.append(b);
  }
  for (const q of TOWNSFOLK.quests) {
    const b = btn('', () => {
      const s = questState(q.by);
      questTo(q.by, s === 'done' ? null : s === 'open' || s === 'ready' ? 'done' : 'open');
      refresh();
    });
    questBtns.push([q.by, b]);
    questRow.append(b);
  }
  gf.parentElement!.append(powerRow, bondRow, questRow);
  // the unfolding: each barred way opened at once (at the Vigil, there and then), or every way closed again (the
  // Vigil woken again); a townsperson's candle lit in the chapel for the next descent; the garden's reagent
  const uf = section(pages.rooms, S.unfold);
  uf.append((unfoldBox = el('p', 'dv-info')));
  const partRow = el('div', 'dv-row'),
    blessRow = el('div', 'dv-row'),
    gardenRow = el('div', 'dv-row');
  for (const sc of BAR_SCHOOLS)
    partRow.append(
      btn(S.openPart(STR.schools[sc] ?? sc), () => {
        openWayNow(sc);
        refresh();
      }),
    );
  partRow.append(
    btn(S.partsAll, () => {
      setParts([...BAR_SCHOOLS]);
      again();
    }),
    btn(S.closeParts, () => {
      setParts([]);
      again();
    }),
  );
  blessRow.append(
    btn(S.blessNone, () => {
      lightBlessing(null);
      refresh();
    }),
  );
  for (const id of SHADE_IDS)
    blessRow.append(
      btn(S.bless(STR.shades.names[id]), () => {
        lightBlessing(id);
        refresh();
      }),
    );
  gardenRow.append(
    btn(S.gardenNone, () => {
      chooseGarden(null);
      refresh();
    }),
  );
  for (const id of REAGENT_IDS)
    gardenRow.append(
      btn(S.gardenOf(REAGENTS[id].name), () => {
        chooseGarden(id);
        refresh();
      }),
    );
  uf.parentElement!.append(partRow, blessRow, gardenRow);
  const runs = section(pages.rooms, S.newRun);
  FLOORS.forEach((f, i) =>
    runs.append(
      btn(f.fixed ? S.toSeal : S.floorN(i + 1), () =>
        start({ floor: i, level: levelAtFloor(i) > 1 ? levelAtFloor(i) : undefined }),
      ),
    ),
  ); // (at the floor's expected level, its choices waiting)
  const keep = el('label', 'dv-check');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = keepCarried;
  box.addEventListener('change', () => {
    keepCarried = box.checked;
  });
  keep.append(box, document.createTextNode(S.keep));
  runs.parentElement!.append(keep);

  let first: Tab = 'mage';
  try {
    const v = localStorage.getItem(TAB_KEY) as Tab | null;
    if (v && TABS.includes(v)) first = v;
  } catch {
    /* the first tab */
  }
  showTab(first);
  document.body.append(p);
  return p;
}

/** Bring the parts that change up to date: the info line, god mode, held artifacts, this floor's rooms. */
function refresh() {
  const cur = G.room.current;
  info.textContent = S.info(G.run.seed, G.run.floor + 1, cur.plan.id, S.roomNames[cur.type] ?? cur.type);
  godBtn.textContent = DEV.god ? S.godOn : S.godOff;
  godBtn.classList.toggle('on', DEV.god);
  foeBtn.textContent = DEV.foe ? S.foeEverywhere(foeName(DEV.foe)) : S.foesAsFloor;
  foeBtn.classList.toggle('on', !!DEV.foe);
  manaBtn.textContent = DEV.mana ? S.manaOn : S.manaOff;
  manaBtn.classList.toggle('on', DEV.mana);
  const list = assetList();
  assetBox.replaceChildren(
    ...(list.length
      ? list.map((a) => el('div', '', S.assetRow(a.where, S.assetStatus[a.status], a.triangles)))
      : [el('div', '', S.noAssets)]),
  );
  obolBtn.textContent = S.obolWears(S.coinFaces[obolFace()] ?? obolFace());
  obolBtn.disabled = obolFaces().length < 2;
  assetBtn.textContent = assetsOn() ? S.assetsOn : S.assetsOff;
  assetBtn.classList.toggle('on', assetsOn());
  assetBtn.disabled = !list.some((a) => a.status === 'loaded');
  const dl = daylightInfo();
  daylightBox.textContent = S.daylightInfo(dl.on, dl.t ?? 0);
  const v = vigil();
  keepBox.textContent = S.keepingInfo(v.dust, v.obols, v.runs, v.wins, v.deepest);
  townBox.textContent = S.townInfo(
    vigil().freed.length,
    Object.keys(vigil().heard).length,
    Object.keys(vigil().flags).length,
  );
  momentBtn.textContent = S.talkMoment(talkMoment === undefined ? S.lastRun : (talkMoment ?? S.idle));
  for (const [k, b] of flagBtns) b.classList.toggle('on', vigil().flags[k] !== undefined);
  {
    const u = unfoldInfo();
    unfoldBox.textContent = S.unfoldInfo(
      u.parts.map((p) => STR.schools[p] ?? p).join(', '),
      u.blessing ? STR.shades.names[u.blessing] : '-',
      u.garden ? REAGENTS[u.garden as ReagentId].name : '-',
      'cave' in u && u.cave ? u.cave.built : 0,
    );
  }
  const gi = giftsInfo();
  giftBox.textContent = S.giftsInfo(
    gi.powers.length,
    disciplinesOpen(vigil().freed)
      .map((d) => STR.gifts.disciplines[d])
      .join(', '),
    JSON.stringify(gi.start),
  );
  wearBtn.textContent = S.townWear[townWear()];
  wearBtn.classList.toggle('on', townWear() === 'code');
  for (const [id, b] of powerBtns) b.classList.toggle('on', vigil().powers.includes(id));
  for (const [id, b] of bondBtns) {
    const n = vigil().bonds[id] ?? 0;
    b.textContent = S.bond(STR.shades.names[id] ?? id, n, BOND_MAX);
    b.classList.toggle('on', n > 0);
  }
  for (const [by, b] of questBtns) {
    const s = questState(by) ?? 'none';
    b.textContent = S.quest(STR.shades.names[by] ?? by, s);
    b.classList.toggle('on', s !== 'none' && s !== 'offer');
  }
  const si = shadeInfo();
  shadeBox.textContent = si
    ? S.shadeInfo(
        si.name,
        S.roomNames[si.type] ?? si.type,
        si.state,
        si.chains.map((c) => (c.ward ? STR.schools[c.ward] : S.plainChain) + (c.broken ? ' ✓' : '')).join(', '),
        vigil().freed.length,
        G.run.walking.map((id) => STR.shades.names[id]).join(', ') || '–',
      )
    : S.noShade;
  const vp = vigilInfo();
  vigilBox.textContent = vp.here
    ? S.vigilInfo(vp.room ?? '?', vp.candles, vp.slots.map((id) => (id ? spell(id).name : '–')).join(', '))
    : S.notAtVigil;
  const kae = kaelithInfo();
  kaelithBox.textContent = kae
    ? S.kaelithInfo(
        kae.phase,
        kae.state,
        kae.wards.map((w) => (w.school ?? '-') + (w.shut ? ' (shut)' : '')).join(', '),
      )
    : S.noKaelith;
  for (const part of KIT_PARTS) {
    const b = kitPartBtns[part],
      kind = cur.look.kinds[part];
    b.textContent = S.kitPart(part, kind ? (S.kitKinds[kind] ?? kind) : '-', !!DEV.kitKinds[part]);
    b.classList.toggle('on', !!DEV.kitKinds[part]);
    b.disabled = !kind;
  }
  fpsBtn.textContent = DEV.fps ? S.fpsOn : S.fpsOff;
  fpsBtn.classList.toggle('on', DEV.fps);
  const look = pixelLook();
  pxBtn.textContent = S.pixelLines(look.lines, drawnRows());
  pxBtn.classList.toggle('on', !!look.lines);
  lineBtn.textContent = look.outline ? S.outlinesOn : S.outlinesOff;
  lineBtn.classList.toggle('on', look.outline);
  lineBtn.disabled = !look.lines;
  bandBtn.textContent = look.bands ? S.bandsOn : S.bandsOff;
  bandBtn.classList.toggle('on', look.bands);
  bandBtn.disabled = !look.lines;
  scatterInfo.textContent = S.scatterInfo(scatterOf(G.room.current));
  gradeInfo.textContent = S.gradeInfo(
    gradeNow(),
    lightLevels().fill,
    Object.keys(FLOORS[G.run.floor]?.look.materials ?? {}).length,
  );
  reagentBtn.textContent = DEV.reagents ? S.reagentsOn : S.reagentsOff;
  reagentBtn.classList.toggle('on', DEV.reagents);
  alchInfo.textContent = S.alchemyInfo(
    player.belt.length,
    beltSlots(),
    POTION_IDS.filter(knownPotion).length,
    POTION_IDS.length,
    brewedPotions().length,
    S.serpentState[G.run.serpent],
    G.run.restless,
  );
  {
    const v = insightNow();
    levelInfo.textContent =
      S.levelsInfo(v.level, Math.round(v.insight), Math.ceil(v.next), v.pending) +
      ' ' +
      S.attrsInfo(ATTRS.map((a) => `${STR.attrs[a].name} ${G.run.attrs[a]}`).join(', '), pointsToSpend());
  }
  runesBtn.textContent = DEV.runes ? S.runesAlwaysOn : S.runesAlwaysOff;
  runesBtn.classList.toggle('on', DEV.runes);
  runeInfo.textContent = S.runesInfo(
    player.sockets.map(
      (k) => k.runes.map((id) => rune(id).name).join(' + ') + (k.size > 1 ? ` (${k.runes.length}/${k.size})` : ''),
    ),
    player.runes.map((id) => rune(id).name).join(', '),
  );
  socketBtn.textContent = player.sockets[spellSlot].size > 1 ? S.socketTwo : S.socketOne;
  socketBtn.classList.toggle('on', player.sockets[spellSlot].size > 1);
  {
    const list = padsNow();
    padInfo.replaceChildren(
      ...(list.length
        ? list.map((g) => el('div', '', S.padRow(g.index, g.id, g.mapping, g.buttons, g.axes)))
        : [el('div', '', S.noPads)]),
    );
  }
  autoBtn.textContent = DEV.autoLevel ? S.autoLevelOn : S.autoLevelOff;
  autoBtn.classList.toggle('on', !!DEV.autoLevel);
  boonInfo.textContent = S.boonsInfo(
    Object.entries(G.run.boons)
      .map(([id, r]) => `${boon(id).name}${r > 1 ? ' II' : ''}`)
      .join(', '),
  );
  const stages = Object.values(knowledgeNow()),
    count = (...st: string[]) => stages.filter((s) => st.includes(s)).length;
  knowBox.textContent =
    S.knowledgeInfo(
      count('seen', 'learned', 'used', 'upgraded'),
      count('learned', 'used', 'upgraded'),
      count('used', 'upgraded'),
      reactionsFound().length,
      REACTION_IDS.length,
    ) +
    ' ' +
    S.weavesInfo(weavesFound().length, WEAVE_IDS.length);
  spellBox.replaceChildren(
    ...SPELL_DEFS.map((s) => {
      const b = btn(s.name, () => learnSpell(s.id, spellSlot), `${STR.schools[s.school]}: ${s.text}`);
      const dot = el('i');
      dot.style.background = s.color;
      b.prepend(dot);
      b.append(el('small', '', STR.schools[s.school]));
      b.classList.toggle('on', player.spells.includes(s.id));
      return b;
    }),
  );
  artBox.replaceChildren(
    ...ARTIFACT_DEFS.filter((a) => !a.start).map((a) => {
      const held = player.focus === a.id || player.items.includes(a.id);
      const b = btn(a.name, () => grantArtifact(a), `${S.kinds[a.kind]}: ${a.text}`);
      const dot = el('i');
      dot.style.background = a.color;
      b.prepend(dot);
      if (a.kind !== 'passive')
        b.append(el('small', '', player.cleansed.includes(a.id) ? S.cleansed : S.kinds[a.kind]));
      b.classList.toggle('on', held);
      return b;
    }),
  );
  costBox.replaceChildren(
    ...ARTIFACT_DEFS.filter((a) => isCostume(a.costume ?? '') || a.kind === 'focus').map((a) => {
      const b = btn(
        a.name,
        () => {
          tryOn(a.id);
          refresh();
        },
        a.costume ? S.costumeAt(a.costume) : S.costumeHeld,
      );
      const dot = el('i');
      dot.style.background = a.color;
      b.prepend(dot);
      b.classList.toggle('on', triedOn().includes(a.id));
      return b;
    }),
  );
  costInfo.textContent = S.costumeInfo(wornNow(), heldNow() ?? '');
  const au = AudioDirector.info;
  soundInfo.textContent = S.soundInfo(
    au.ambience?.scape
      ? `${au.ambience.scape}${au.ambience.room ? ` + ${au.ambience.room}` : ''} (${au.ambience.space.split('|')[0]} s)`
      : '—',
    au.music?.piece ? `${au.music.piece}, ${au.music.mood}, bar ${au.music.bar}` : '—',
  );
  soundBtn.textContent = AudioDirector.on ? S.soundOn : S.soundOff;
  soundBtn.classList.toggle('on', AudioDirector.on);
  transInfo.textContent = S.transformInfo(
    G.run.transforms.map((t) => STR.transforms[t].name),
    blinkRest(),
  );
  arcInfo.textContent = S.arcInfo(arcNow(), arcHeld(), arcLevels(), DEV.arc !== undefined);
  {
    const m = marksNow();
    marksInfo.textContent = S.marksInfo(
      m.hands.map((h) => (h ? `${STR.schools[h.school]} (${h.state}${h.ring ? ', ring' : ''})` : '-')),
      m.attuned ? STR.schools[m.attuned] : '',
      m.circle.known.reduce((a, b) => a + b, 0),
      m.circle.mastered.map((sc) => STR.schools[sc]),
    );
  }
  arcInfo.parentElement
    ?.querySelectorAll<HTMLButtonElement>('button[data-arc]')
    .forEach((b) => b.classList.toggle('on', b.dataset.arc === String(DEV.arc)));
  transBox
    .querySelectorAll<HTMLButtonElement>('button[data-t]')
    .forEach((b) => b.classList.toggle('on', G.run.transforms.includes(b.dataset.t as never)));
  closeBtn.classList.toggle('on', DEV.closeUp);
  const rooms = G.floor.rooms.filter((r) => r.type !== 'normal').sort((a, b) => a.plan.dist - b.plan.dist);
  const secret = G.floor.rooms.find((r) => r.type === 'secret');
  const dials = FLOORS[Math.min(G.run.floor, FLOORS.length - 1)].pressure,
    names = (l: string[]) => l.map((s) => STR.schools[s]).join(', ');
  floorBox.replaceChildren(
    el(
      'p',
      'dv-info',
      S.dials(dials.extra, dials.eliteMul, dials.ordealWaves, names(floorLean()), names(floorWalls())) +
        ' ' +
        S.pledgeInfo(G.run.pledge ? STR.schools[G.run.pledge] : ''),
    ), // (the descent's dials; a boon's pledge)
    btn(S.warnFloor, () => {
      if (!warnFloor()) toast(S.noWall, 2);
    }),
    ...rooms.map((r) => {
      const note = r.doors.some((d) => d.seal?.sealed) ? S.sealed : r.type === 'secret' && !r.found ? S.hidden : '';
      return btn(`${S.roomNames[r.type] ?? r.type}${note ? ` (${note})` : ''}${r === cur ? ' ●' : ''}`, () => goTo(r));
    }),
    // (only while its doorways are still closed: the cracks to divine, the room to open)
    ...(secret && secret.doors.some((d) => d.secret && !d.secret.open)
      ? [
          ...(secret.doors.some((d) => d.secret && !d.secret.open && !d.secret.divined)
            ? [btn(S.revealCracks, () => revealCracks())]
            : []),
          btn(S.openSecret, () => openSecretRoom(secret)),
        ]
      : []),
    btn(S.clear, () => clearRoom()),
    btn(S.reveal, () => {
      for (const r of G.floor.rooms) r.known = true;
      renderMinimap();
    }),
    btn(S.nextFloor, () => {
      closeDev();
      descend();
    }),
  );
}

/** Render `CFG.audio.preview` seconds of what the Sound tab has chosen (or floor 1 and its piece) and hand it over as a WAV. */
async function savePreview(f: Forced | null) {
  const floor = f?.floor ?? G.run.floor,
    piece = f?.piece,
    mood = f?.mood ?? 'explore';
  const r = await renderAudio({
    ambience: f?.floor !== undefined || !piece ? { floor, room: f?.room, theme: f?.theme } : undefined,
    music: piece ? { piece, mood } : undefined,
    seconds: CFG.audio.preview,
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([r.wav], { type: 'audio/wav' }));
  a.download = `ossuary-${piece ?? 'floor' + (floor + 1)}-${mood}.wav`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
