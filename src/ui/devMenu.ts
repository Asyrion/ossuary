/* The dev menu (the key left of 1, or F2): a panel over the paused game for testing features quickly, in tabs: the
   mage (and their curses, resources, drops and artifacts); magic (spells, mana, knowledge, statuses, water and oil);
   foes and objects; rooms and runs (this floor's special rooms, a test room, a themed room, a boss fight, a new run);
   the look (the pixel look, made assets); and the galleries of options. A thin layer over the same calls as the dev hooks; its lists come from the data,
   so new artifacts, drops, rooms and bosses show up by themselves. Kept in production builds, like the
   hooks, for testing the deployed site. */
import type * as THREE from 'three';
import { BOSS_TYPES, type BossType, type EnemyType } from '../config';
import { PROP_KINDS, isMechanism } from '../world/propData';
import { THEME_DEFS } from '../world/themeData';
import { placeProp } from '../world/props';
import { padsNow } from '../input/gamepad';
import { APPROVED, FANTASY_LOOKS, FOE_LOOK_MODES } from '../actors/fantasyLooks';
import { showLookPairs } from '../actors/lookPairs';
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
import { FOES, FOE_IDS, pickFoe, type FoeType } from '../actors/foeData';
import { forgetBestiary } from '../actors/bestiary';
import { findEveryCounter } from '../actors/counters';
import { ARTIFACT_DEFS, START_FOCUS, artifact } from '../items/artifactData';
import { giveById, grantArtifact, placeArtifact, refreshStats, removeArtifactGallery, resetArtifacts, showArtifactGallery } from '../items/artifacts';
import { DROPS, RESOURCES, SOULS, soulItem, type Drop, type Resource } from '../items/loot';
import { POTIONS, POTION_IDS, REAGENT_IDS, type PotionId } from '../items/alchemyData';
import { addPotion, addReagent, beltSlots, identify, knownPotion, renderBelt, usePotion } from '../items/potions';
import { brewedPotions, forgetBrews } from '../items/alchemyMemory';
import { openLab } from './alchemyTable';
import { openWaystone } from './waystone';
import { raiseWaystone } from '../world/waystone';
import { levelAtFloor } from '../progression/levelData';
import { buildBargain, openBargainHere } from '../world/bargain';
import { breakOut, crackVat } from '../world/laboratory';
import { gainSoul, hallowedMend, resetSouls } from '../items/souls';
import { giveResources, restyleObols, spawnPickup } from '../items/pickups';
import { coinGallery } from '../items/pickupLooks';
import { obolFace, obolFaces, setObolFace } from '../items/obolFace';
import { disposeTree } from '../render/materials';
import { makeEnemy, spawnFoe } from '../actors/enemies';
import { buildFloor, clearRoom, descend, resume, startGame, warp, type RunOptions } from '../flow';
import { assetList, assetsOn, madeLookNow, madeLooks, setAssetsOn, setMadeLook, type MadeLook } from '../assets/models';
import { setCloseUp } from '../render/renderer';
import { LINES, drawnRows, pixelLook, setPixelLook } from '../render/pixelLook';
import { heroPixel, setHeroPixel } from '../actors/heroPixel';
import { hero } from '../actors/hero';
import { FAMILIAR_OPTIONS, MODEL_OPTIONS, removeModelOptions, showBestiary, showBossLooks, showFamiliarOptions, showJellyLooks, showModelOptions } from '../actors/modelOptions';
import { BESTIARY_OPTIONS } from '../actors/bestiaryLooks';
import { EFFECT_OPTIONS, removeEffectOptions, showEffectOptions } from '../magic/effectOptions';
import { CFG } from '../config';
import { freeSpotNear, placeUrn } from '../world/rooms';
import { SIDE_DIR } from '../world/shapes';
import type { Room } from '../types';
import { openSecretRoom, revealCracks } from '../world/secret';
import { cleanseAtOnce } from '../world/shrine';
import { SCHOOLS, SPELL_DEFS } from '../magic/spellData';
import { attuneTo, forgetSpells, gainMana, learnSpell } from '../magic/spells';
import { addRune, carve, clearRunes, setSockets } from '../magic/runes';
import { RUNE_DEFS, rune } from '../magic/runeData';
import { runeIconImg } from '../items/runeLooks';
import { findEveryReaction, findEveryWeave, forgetKnowledge, forgetReactions, forgetWeaves, knowEvery, knowledgeNow, reactionsFound, weavesFound } from '../magic/memory';
import { WEAVE_IDS } from '../magic/weaves';
import { setOffWeave } from '../magic/weaveTest';
import { BENCH_BOONS, setOffBoon } from '../progression/boonTest';
import { REACTION_IDS } from '../magic/knowledge';
import { setOffReaction } from '../magic/reactionTest';
import { dropPage } from '../magic/pages';
import { hexDrained } from './afflictions';
import { steamAt } from '../magic/steam';
import { fireAt, poolsDo } from '../world/pools';
import { inflict } from '../magic/statusFx';
import type { SpellStatus, StatusKind } from '../magic/spellData';
import { TEMPLATE_DEFS } from '../world/templates';
import { FLOORS, VARIANTS, type RoomVariant } from '../world/generate';
import { KIT_PARTS, kindsOf, type KitPart, type Kinds } from '../world/kitData';
import { renderHearts, renderItems, renderMinimap, renderPurse, toast } from './hud';
import { MANTLE_IDS } from '../actors/mantleData';
import { lureTest } from '../actors/foeGround';
import { floorLean, floorWalls, warnFloor } from '../world/curve';
import { gainInsight, insightNow, setLevel, toNextLevel } from '../progression/insight';
import { LEVEL_CAP } from '../progression/levelData';
import { ATTRS, noAttrs } from '../progression/attributes';
import { attrText, pointsToSpend, spendPoint } from '../progression/points';
import { dealNow, takeBoon } from '../progression/boons';
import { openLevelUp } from './levelUp';
import { BOON_DEFS, boon } from '../progression/boonData';
import { AudioDirector, type Forced } from '../audio/director';
import { FLOOR_SCAPES, ROOM_SCAPES, THEME_SCAPES } from '../audio/ambienceData';
import { MOODS, PIECES, type Mood } from '../audio/musicData';
import { renderAudio } from '../audio/render';
import { CREATURES, CREATURE_LOOKS, creatureLook, roarNow, setCreatureLook, showCreature, takeCreatures } from '../actors/madeCreatures';
import { THEMES } from '../world/themeData';

const S = STR.dev;
let panel: HTMLElement | null = null, soundInfo: HTMLElement, soundBtn: HTMLButtonElement, marksInfo: HTMLElement, floorBox: HTMLElement, artBox: HTMLElement, costBox: HTMLElement, costInfo: HTMLElement, transInfo: HTMLElement, transBox: HTMLElement, arcInfo: HTMLElement, closeBtn: HTMLButtonElement, spellBox: HTMLElement, info: HTMLElement, godBtn: HTMLButtonElement, foeBtn: HTMLButtonElement, manaBtn: HTMLButtonElement, moveBtn: HTMLButtonElement, doorBtn: HTMLButtonElement, assetBtn: HTMLButtonElement, kitBtn: HTMLButtonElement, kitPartBtns = {} as Record<KitPart, HTMLButtonElement>, fpsBtn: HTMLButtonElement, assetBox: HTMLElement, madeLookBtn: HTMLButtonElement, pxBtn: HTMLButtonElement, lineBtn: HTMLButtonElement, bandBtn: HTMLButtonElement, heroPxBtn: HTMLButtonElement;
let levelInfo: HTMLElement, padInfo: HTMLElement, foeLookBtn: HTMLButtonElement, runeInfo: HTMLElement, runesBtn: HTMLButtonElement, socketBtn: HTMLButtonElement, boonInfo: HTMLElement, autoBtn: HTMLButtonElement, spellSlot = 0, knowBox: HTMLElement, alchInfo: HTMLElement, reagentBtn: HTMLButtonElement, obolBtn: HTMLButtonElement, creatureLookBtn: HTMLButtonElement;
/** The menu's tabs, each a page of sections; the one open last is remembered in this browser. */
const TABS = ['mage', 'magic', 'foes', 'rooms', 'look', 'galleries', 'sound'] as const;
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
/** The new foe looks (M4.12) still waiting on the owner's yes: the foe-look switch and the old-and-new gallery compare them. */
const looksWaiting = () => Object.keys(FANTASY_LOOKS).filter(id => !APPROVED.has(id));
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
export function useAssets(on: boolean) { setAssetsOn(on); renderItems(); renderPurse(); rebuildFloor(); }
/** The room kit (M3.5 step 3's proof) on or off: this floor is built again in the new or the old look, to compare. */
export function useRoomKit(on: boolean) { DEV.roomKit = on; rebuildFloor(); renderItems(); } // (the HUD's icons too: drawn, or rendered from the kit's models)
/** The room kit's kinds forced on every room of this floor (or drawn per room again, for a part left out): built again. */
export function forceKinds(k: Partial<Kinds>) { DEV.kitKinds = { ...k }; rebuildFloor(); }
/** This floor built again on its seed (the same rooms and boss), and the mage back in the room they were in. */
export function rebuildFloor() {
  if (G.state === 'title') return;
  const id = G.current.plan.id;
  if (G.run.bossesMet.at(-1) === G.run.boss) G.run.bossesMet.pop(); // (built again, the floor draws the same boss)
  buildFloor(G.run.floor); warp(id);
}

/** The made assets drawn in look `l` (their texture as pixel art, or as made) on this floor and from now on, to compare. */
export function useMadeLook(l: MadeLook) { setMadeLook(l, G.rooms.map(r => r.group)); }

/** The obols wear another coin face (or the rune): those lying in the room and the HUD's counter change with them. */
export function wearFace(id: string) { setObolFace(id); restyleObols(); renderPurse(); }
/** Every coin face side by side ahead of the mage (the Galleries tab); `takeCoins` takes them away. */
export function showCoins() {
  takeCoins(); const room = G.current;
  room.group.userData.coinGallery = coinGallery(room.group, player.x - room.cx, player.z - room.cz - 1.6);
  return obolFaces().length;
}
export function takeCoins() {
  const g = G.current.group.userData.coinGallery as THREE.Object3D | undefined; if (!g) return;
  g.parent?.remove(g); disposeTree(g); delete G.current.group.userData.coinGallery;
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
  kinds.forEach((k, i) => { const q = freeSpotNear(room, player.x + (i % 9 - 4) * 1.05, player.z - 1.8 - Math.floor(i / 9) * 1.4); placeProp(k, q.x, q.z); }); // (nine a row: two rows fit a room)
  for (const [dx, sealed] of [[-.6, false], [.6, true]] as const) { const q = freeSpotNear(room, player.x + dx, player.z - 1.8 - Math.ceil(kinds.length / 9) * 1.4); placeUrn(q.x, q.z, sealed); }
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
  // M6: insight and levels (the choice a level brings waits for the level-up screen, step 4)
  const lv = section(pages.mage, S.levels);
  lv.append(levelInfo = el('p', 'dv-info'),
    btn(S.nextLevel, () => gainInsight(toNextLevel() || 10)),
    btn(S.maxLevel, () => setLevel(LEVEL_CAP)),
    btn(S.firstLevel, () => setLevel(1)));
  for (const a of ATTRS) lv.append(btn(S.plusAttr(STR.attrs[a].name), () => spendPoint(a, true), attrText(a))); // (M6 step 2: a point without a level's)
  lv.append(btn(S.offerNow, () => { closeDev(); if (!openLevelUp()) toast(S.noLevelWaits, 2); }), autoBtn = btn('', () => { DEV.autoLevel = DEV.autoLevel ? false : 'choose'; })); // (M6 step 4)
  lv.append(btn(S.noAttrs, () => { G.run.attrs = noAttrs(); refreshStats(false); }));
  // M6 step 3: boons: take each (its next rank), deal three as a level would, none
  const bn = section(pages.mage, S.boons);
  bn.append(boonInfo = el('p', 'dv-info'),
    btn(S.dealNow, () => toast(dealNow().map(c => `${boon(c.id).name}${c.rank > 1 ? ' II' : ''}${c.lean ? ' *' : ''}`).join(' · '), 4)),
    btn(S.noBoons, () => { G.run.boons = {}; G.run.pledge = null; refreshStats(false); }));
  const bnBox = el('div', 'dv-row'); bn.parentElement!.append(bnBox);
  for (const b of BOON_DEFS) { const x = btn(b.name, () => { if (!takeBoon(b.id)) toast(S.boonFull, 2); }, b.text); const dot = el('i'); dot.style.background = b.color; x.prepend(dot); bnBox.append(x); }
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

  // alchemy (M5): each potion into the belt, every potion laid out ahead, what is known identified or forgotten, the belt
  // used as R and F use it, and reagents into the pouch
  const alch = section(pages.mage, S.alchemy);
  alch.append(alchInfo = el('p', 'dv-info'),
    btn(S.potionsHere, () => POTION_IDS.forEach((id, i) => { const q = freeSpotNear(G.current, player.x + (i % 6 - 2.5) * .8, player.z - 1.4 - Math.floor(i / 6) * .9); spawnPickup('potion', q.x, q.z, { potion: id }); })),
    btn(S.identifyAll, () => { for (const id of POTION_IDS) identify(id); }),
    btn(S.forgetPotions, () => { G.run.identified.length = 0; forgetBrews(); renderBelt(); }),
    btn(S.emptyBelt, () => { player.belt.length = 0; player.beltAt = 0; renderBelt(); }),
    btn(S.drinkChosen, () => { closeDev(); usePotion('drink'); }), btn(S.throwChosen, () => { closeDev(); usePotion('throw'); }),
    btn(S.reagentsAll, () => { for (const r of REAGENT_IDS) addReagent(r, 3); }),
    reagentBtn = btn('', () => { DEV.reagents = !DEV.reagents; }),
    btn(S.openTable, () => { closeDev(); openLab('brew'); }),
    // M5 step 7: the jelly serpent's vat in a laboratory: crack its window as a bolt does, let it out, make it restless
    btn(S.crackVat, () => { closeDev(); if (!crackVat()) toast(S.noVat, 2); }),
    btn(S.serpentOut, () => { closeDev(); if (!breakOut()) toast(S.noVat, 2); }),
    btn(S.restless, () => { G.run.restless = !G.run.restless; }),
    // Dr. Jelly hands something over (2026-10-02): played when the menu closes
    ...(['potion', 'recipe', 'coins'] as const).map(k => btn(S.jellyGives[k], () => {
      if (!G.current.lab) { toast(S.noLab, 2.5); return; }
      jellyGives(k === 'potion' ? { kind: k, potion: (player.belt[0] ?? 'healing') as PotionId } : { kind: k }); closeDev();
    })));
  const alchBox = el('div', 'dv-row'); alch.parentElement!.append(alchBox); // (a second row: one button a potion)
  alchBox.append(...POTION_IDS.map(id => {
    const b = btn(POTIONS[id].name, () => { if (!addPotion(id)) toast(STR.alchemy.full, 2); }, `${POTIONS[id].text.drink} · ${POTIONS[id].text.throw}`);
    const dot = el('i'); dot.style.background = POTIONS[id].color; b.prepend(dot); return b;
  }));

  // artifacts: every one in the data, marked when held
  artBox = section(pages.mage, S.artifacts);
  // afflictions (2026-10-01): each one landed on the mage, to see its chip beside the mana bar and its line
  const aff = section(pages.mage, S.afflictions);
  aff.append(btn(S.afflictNames.hexed, () => { const took = Math.min(player.mana, 8); gainMana(-8); hexDrained(took); }),
    btn(S.afflictNames.chill, () => { player.chill = 3; }), btn(S.afflictNames.stone, () => { player.stone = 3; }),
    btn(S.afflictNames.dim, () => { player.dim = 3; }), btn(S.afflictNames.hints, () => { for (const k of [...G.run.hinted]) if (k.startsWith('afflict:')) G.run.hinted.delete(k); }));
  // Fen-Nex (M4.2): bound by its artifact above; grown a stage here, as if a floor had gone by
  section(pages.mage, S.fennex).append(btn(S.growFennex, () => { if (fennexInfo()) growFennex(); else toast(S.noFennex, 2); }));
  // costumes (M4.6): any artifact's piece tried on as if held (a focus held in the casting hand), or all taken off
  const cost = section(pages.mage, S.costumes);
  cost.append(costInfo = el('p', 'dv-info'), btn(S.takeAllOff, () => { takeAllOff(); refresh(); }), closeBtn = btn(S.closeUp, () => { setCloseUp(!DEV.closeUp); refresh(); }));
  // Asyrion's arc (M4.6): a stage forced, or from what is held
  const arcRow = section(pages.mage, S.arc);
  arcRow.append(arcInfo = el('p', 'dv-info'), ...[undefined, 0, 1, 2, 3, 4].map(n => { const b = btn(n === undefined ? S.arcHeld : S.arcStage(n), () => { DEV.arc = n; dress(); refresh(); }); b.dataset.arc = String(n); return b; }));
  costBox = section(pages.mage, S.costumesTry);
  // transformations (M4.6): each formed at once (its banner, lore card, gift and look), or all undone
  transBox = section(pages.mage, S.transforms);
  transBox.append(transInfo = el('p', 'dv-info'), btn(S.clearTransforms, () => { clearTransforms(); refresh(); }), ...TRANSFORM_IDS.map(t => { const b = btn(STR.transforms[t].name, () => { formTransform(t); refresh(); }, STR.transforms[t].gift); b.dataset.t = t; return b; }));

  // spells: every one in the data, learned into the chosen slot; mana
  spellBox = section(pages.magic, S.spells);
  const slotSel = el('select'); slotSel.setAttribute('aria-label', S.slot);
  for (const [i, k] of STR.controls.spellsKeys.split(' and ').entries()) { const o = el('option', '', `${S.slot} ${k}`); o.value = String(i); slotSel.append(o); }
  slotSel.addEventListener('change', () => { spellSlot = Number(slotSel.value); refresh(); }); // (the socket's button shows the chosen slot's)
  spellBox.parentElement!.insertBefore(slotSel, spellBox);
  // runes (M6 step 7): carved into the chosen slot's socket; refused with the reason when one doesn't fit
  const runes = section(pages.magic, S.runes);
  runes.append(runeInfo = el('p', 'dv-info'), ...RUNE_DEFS.map(r => {
    const b = btn(r.name, () => { const why = carve(spellSlot, r.id); if (why) toast(STR.runes.refused[why], 2); }, r.text);
    b.insertAdjacentHTML('afterbegin', runeIconImg(r.id)); return b; // (its glyph, as the panel shows it)
  }), btn(S.clearRunes, () => clearRunes(spellSlot)), socketBtn = btn('', () => setSockets(spellSlot, player.sockets[spellSlot].size > 1 ? 1 : 2)),
    el('p', 'dv-info', S.toPouch), ...RUNE_DEFS.map(r => { // (M6 step 8: into the pouch, as found, its card the first time)
      const b = btn(r.name, () => { addRune(r.id); refresh(); }, r.text); b.insertAdjacentHTML('afterbegin', runeIconImg(r.id)); return b;
    }), btn(S.runeAhead, () => { closeDev(); spawnPickup('rune', player.x, player.z - 1.5, { asIs: true }); }),
    runesBtn = btn('', () => { DEV.runes = !DEV.runes; rebuildFloor(); refresh(); }));
  const mana = section(pages.magic, S.mana);
  mana.append(
    btn(S.fullMana, () => gainMana(player.stats.maxMana)),
    manaBtn = btn('', () => { DEV.mana = !DEV.mana; toast(DEV.mana ? S.manaOn : S.manaOff, 2); }),
    btn(S.forget, () => forgetSpells()),
    btn(S.page, () => { if (!dropPage(G.current, player.x, player.z - 1.5)) toast(S.noPage, 2); }),
  );
  // spell knowledge (M3.7): kept between runs in this browser
  const know = section(pages.magic, S.knowledge);
  know.append(knowBox = el('p', 'dv-info'), btn(S.knowAll, () => { knowEvery(); refresh(); }), btn(S.forgetKnowledge, () => { forgetKnowledge(); refresh(); }),
    btn(S.findReactions, () => { findEveryReaction(REACTION_IDS); refresh(); }), btn(S.forgetReactions, () => { forgetReactions(); refresh(); }), // (M4.8: the book's wheel)
    btn(S.findWeaves, () => { findEveryWeave(WEAVE_IDS); refresh(); }), btn(S.forgetWeaves, () => { forgetWeaves(); refresh(); })); // (M4.10)
  // spell marks (M4.11): what the slotted spells and the knowledge show on the mage; attune to a school, show the circle
  const marks = section(pages.magic, S.marks);
  marks.append(marksInfo = el('p', 'dv-info'), ...SCHOOLS.map(sc => btn(S.attune(STR.schools[sc]), () => { attuneTo(sc); refresh(); })), btn(S.showCircle, () => { player.still = CFG.marks.circle.after + 3; closeDev(); }));
  // every reaction (M4.8), set off on training dummies just ahead
  const reacts = section(pages.magic, S.reactionsHere);
  for (const r of REACTION_IDS) reacts.append(btn(STR.reactions[r], () => { closeDev(); const q = ahead(3); setOffReaction(r, q.x, q.z); }, STR.knowledge.reactionText[r]));
  // every boon that acts on something (M6 steps 5 and 6), taken if need be and set off just ahead
  const boonsHere = section(pages.magic, S.boonsHere);
  for (const id of BENCH_BOONS) { const b = boon(id), x = btn(b.name, () => { closeDev(); setOffBoon(id); }, b.text); const dot = el('i'); dot.style.background = b.color; x.prepend(dot); boonsHere.append(x); }
  // every weave and chain (M4.10), set up just ahead (north of the mage) and set off
  const weaves = section(pages.magic, S.weavesHere);
  for (const w of WEAVE_IDS) weaves.append(btn(STR.weaves[w].name, () => { closeDev(); setOffWeave(w); }, STR.weaves[w].text));
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
  // rooms with a pair (M4.7): each floor's pairs, the two side by side ahead of the mage
  const pairList = [...new Set(FLOORS.flatMap(f => (f.pairs?.list ?? []).map(([a, b]) => `${a}+${b}`)))];
  foes.append(el('p', 'dv-info', S.pairs), ...pairList.map(k => btn(k.split('+').map(foeName).join(' + '), () => {
    const [a, b] = k.split('+') as FoeType[], q = ahead(3.5); spawnFoe(a, q.x - .6, q.z, floorHp()); spawnFoe(b, q.x + .6, q.z, floorHp());
  })));
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
  for (const [kind, amount] of [['burn', 4], ['chill', 1], ['shock', 2], ['sanct', 3], ['hex', 1], ['root', 2], ['grow', 4]] as [SpellStatus, number][]) { // (M5: Overgrown)
    sts.append(btn(S.inflictOn(STR.statusNames[kind]), () => { for (const e of G.enemies) inflict(e, { [kind]: amount }); }));
  }

  // this floor: its special rooms, and ways through it
  floorBox = section(pages.rooms, S.floor);
  // the Wandering Merchant (M4.2): rides into this room now, whatever the run's luck
  section(pages.rooms, STR.banner.wanderer[0]).append(btn(S.wanderer, () => { closeDev(); callWanderer(); }));
  // M6 step 9: the waystone (it rises in the boss room once the boss falls; here, ahead of the mage, kindled at once)
  section(pages.rooms, STR.waystone.title).append(
    btn(S.raiseStone, () => { closeDev(); const w = raiseWaystone(G.current, player.x, player.z - 2.2); w.rise = Math.max(w.rise, .999); }),
    btn(S.openStone, () => { if (!G.current.waystone) { toast(S.noStone, 2); return; } closeDev(); openWaystone('runes'); }));
  // M6 step 11: the shrine's bargain (a stone at every shrine's circle; here, ahead of the mage), and its deal on any school
  section(pages.rooms, STR.bargain.title).append(
    btn(S.bargainHere, () => { closeDev(); buildBargain(G.current, [player.x - G.current.cx, player.z - 2.2 - G.current.cz]); }),
    ...SCHOOLS.map(s => btn(S.bargainOn(STR.schools[s]), () => { if (!G.current.bargain) { toast(S.noBargain, 2); return; } closeDev(); openBargainHere(s); })));
  // the gamepads the browser reports: name, layout, and what is held (the owner's Elite pad wasn't heard, 2026-10-02)
  const gp = section(pages.rooms, S.pads);
  gp.append(padInfo = el('div', 'dv-info')); // (read again whenever a pad comes or goes while the menu is open)
  for (const ev of ['gamepadconnected', 'gamepaddisconnected']) window.addEventListener(ev, () => { if (devOpen()) refresh(); });

  // the pixel look (the game's look, M3.5 step 2): the rows of pixels, outlines, light in bands; kept in this browser
  const px = section(pages.look, S.pixel);
  px.append(
    pxBtn = btn('', () => { const ls = [...LINES, 0]; setPixelLook({ lines: ls[(ls.indexOf(pixelLook().lines) + 1) % ls.length] }); }),
    lineBtn = btn('', () => setPixelLook({ outline: !pixelLook().outline })),
    bandBtn = btn('', () => setPixelLook({ bands: !pixelLook().bands })),
    // the mage in the pixel-art look (its colours baked, a few of them, light in bands), or the model as made, to compare
    heroPxBtn = btn('', () => { setHeroPixel(hero.model, !heroPixel()); dress(); }),
    // M4.12: the foes wear the approved new looks, every new one, or the old ones (new foes take it; a new floor all of them)
    foeLookBtn = btn('', () => { DEV.foeLooks = FOE_LOOK_MODES[(FOE_LOOK_MODES.indexOf(DEV.foeLooks) + 1) % FOE_LOOK_MODES.length]; rebuildFloor(); }),
  );

  // the room kit (M3.5 step 3's proof): the pieces built in code, or the old ones to compare; the fire objects to look at
  const kit = section(pages.look, S.kit);
  // each part's kind: drawn per room, or one stepped through the floor's list and forced on every room, to compare
  for (const part of KIT_PARTS) kitPartBtns[part] = btn('', () => {
    // (from the kind forced, or the one this room drew: the first click shows the next one)
    const forced = DEV.kitKinds[part], list = kindsOf(FLOORS[G.run.floor].look.kit!, part), at = list.indexOf((forced ?? G.current.look.kinds?.[part]) as never);
    DEV.kitKinds = { ...DEV.kitKinds, [part]: forced ? list[at + 1] : list[(at + 1) % list.length] }; // (past the last forced: drawn per room again)
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
    // (2026-10-05, the owner: every Tripo model wears its texture as pixel art; the props and artifacts as made, to compare)
    madeLookBtn = btn('', () => useMadeLook(madeLookNow() === 'texel' ? 'made' : 'texel')),
    btn(S.showAssets, () => { closeDev(); showAssetsHere(); }),
    obolBtn = btn('', () => { const all = obolFaces(); wearFace(all[(all.indexOf(obolFace()) + 1) % all.length]); refresh(); }),
    fpsBtn = btn('', () => { DEV.fps = !DEV.fps; }),
  );

  // the soundscapes and the music (docs/sound-plan.md): any floor's, a room's or a theme's over it, any piece in any mood
  const snd: { floor: number; over: string; piece: string; mood: Mood } = { floor: 0, over: '', piece: PIECES[1].id, mood: 'explore' };
  const playScape = () => AudioDirector.force({ ...AudioDirector.forced, floor: snd.floor, room: snd.over in ROOM_SCAPES ? snd.over : 'normal', theme: snd.over in THEME_SCAPES ? snd.over : undefined });
  const playMusic = () => AudioDirector.force({ ...AudioDirector.forced, piece: snd.piece, mood: snd.mood });
  const sc = section(pages.sound, S.scapes);
  sc.append(soundInfo = el('p', 'dv-info'), el('p', 'dv-info', S.scapeNote),
    soundBtn = btn('', () => AudioDirector.set(!AudioDirector.on)), btn(S.soundGame, () => AudioDirector.force(null)),
    ...FLOOR_SCAPES.map((_, i) => btn(STR.floors[i]?.[0] ?? S.floorN(i + 1), () => { snd.floor = i; playScape(); })),
    ...['', ...Object.keys(ROOM_SCAPES), ...Object.keys(THEME_SCAPES)].map(id => btn(S.scapeRoom(id ? S.roomNames[id] ?? THEMES.get(id)?.name ?? id : S.scapeNone), () => { snd.over = id; playScape(); })));
  const mu = section(pages.sound, S.music);
  mu.append(...PIECES.map(p => btn(p.name, () => { snd.piece = p.id; playMusic(); })),
    ...MOODS.map(m => btn(S.moodIs(S.moods[m]), () => { snd.mood = m; playMusic(); })),
    ...(['cleared', 'death'] as const).map(k => btn(S.stingers[k], () => AudioDirector.stinger(k))),
    btn(S.savePreview(CFG.audio.preview), () => { toast(S.rendering, 2); void savePreview(AudioDirector.forced); }));

  // the artifacts as the room kit builds them (looks only), in rows
  const arts = section(pages.galleries, S.artifactGallery);
  arts.append(el('p', 'dv-info', S.artifactsNote), btn(S.showOptions, () => { closeDev(); showArtifactGallery(G.current, player.x, player.z); }), btn(S.takeOptions, () => removeArtifactGallery(G.current)));

  // creatures made in Tripo and animated in code (docs/creatures.md): one stood ahead of the mage, walking, roaring, resting
  const made = section(pages.galleries, S.creatures);
  made.append(el('p', 'dv-info', S.creaturesNote),
    ...Object.keys(CREATURES).map(id => btn(S.creatureHere(S.creatureNames[id] ?? id), () => { closeDev(); const at = freeSpotNear(G.current, player.x + CFG.creatures.standSide, player.z + CFG.creatures.standSouth); void showCreature(id, G.current, at.x, at.z); })),
    creatureLookBtn = btn('', () => { void setCreatureLook(CREATURE_LOOKS[(CREATURE_LOOKS.indexOf(creatureLook()) + 1) % CREATURE_LOOKS.length]); refresh(); }),
    btn(S.roarNow, () => { closeDev(); roarNow(); }), btn(S.takeOptions, () => takeCreatures(G.current)));

  // the coin faces (2026-10-02, the owner's coins): every face side by side ahead of the mage, as the room draws them
  const coins = section(pages.galleries, S.coinGallery);
  coins.append(el('p', 'dv-info', S.coinsNote), btn(S.showOptions, () => { closeDev(); showCoins(); }), btn(S.takeOptions, () => takeCoins()));

  // enemy model options (looks only, for the owner to choose from): a row of them ahead of the mage
  const opts = section(pages.galleries, S.options);
  opts.append(el('p', 'dv-info', [...new Set(MODEL_OPTIONS.map(o => o.floor))].sort((a, b) => a - b).map(f => S.floorOptions(f, MODEL_OPTIONS.filter(o => o.floor === f).map(o => STR.options[o.id].name).join(', '))).join(' · ')), btn(S.showOptions, () => { closeDev(); showModelOptions(G.current, player.x, player.z); }), btn(S.takeOptions, () => removeModelOptions(G.current)));

  // Dr. Jelly (2026-10-02, from the owner's pictures: the plague doctor, the owner's choice) ahead of the mage, giving
  const jl = section(pages.galleries, S.jellyLooks);
  jl.append(el('p', 'dv-info', S.jellyNote),
    btn(S.showOptions, () => { closeDev(); showJellyLooks(G.current, player.x, player.z); }), btn(S.takeOptions, () => removeModelOptions(G.current)));

  // M4.12: the foes' old and new looks side by side, a floor at a time, for the owner to compare and approve
  // (with every new look approved there is nothing to compare: the row waits, disabled, for the next new look)
  const lp = section(pages.galleries, S.lookPairs), waiting = looksWaiting().length > 0;
  lp.append(...(waiting ? [] : [el('p', 'dv-info', S.noLooksWaiting)]), ...[...[1, 2, 3, 4, 5, 0].map(f => btn(S.floorLooks(f), () => { closeDev(); if (!showLookPairs(G.current, player.x, player.z, f).length) toast(S.noNewLooks, 2); })),
    btn(S.allLooks, () => { closeDev(); if (!showLookPairs(G.current, player.x, player.z).length) toast(S.noNewLooks, 2); }), btn(S.takeOptions, () => removeModelOptions(G.current))].map(b => { b.disabled = !waiting; return b; }));

  // the bosses built in code (M4 onwards): every one ahead of the mage
  const bl = section(pages.galleries, S.bossLooks);
  bl.append(el('p', 'dv-info', [STR.bosses.warden.name, STR.bosses.abbess.name, STR.bosses.pyre.name, STR.bosses.hart.name, STR.bosses.angler.name, STR.bosses.tiger.name, STR.bosses.dragon.name, STR.bosses.twins.name].join(' · ')),
    btn(S.showOptions, () => { closeDev(); showBossLooks(G.current, player.x, player.z); }), btn(S.takeOptions, () => removeModelOptions(G.current)));
  // the bestiary (M4.5): looks only for now, in rows by kind, each named with the fight it brings
  const best = section(pages.galleries, S.bestiary);
  best.append(el('p', 'dv-info', (['beast', 'creature', 'elemental'] as const).map(k => `${S.bestiaryKinds[k]}: ${BESTIARY_OPTIONS.filter(o => o.kind === k).map(o => STR.bestiary[o.id].name).join(', ')}`).join(' · ')),
    btn(S.showOptions, () => { closeDev(); showBestiary(G.current, player.x, player.z); }), btn(S.takeOptions, () => removeModelOptions(G.current)));
  // familiar options (looks only, the owner's drawings built in code): in a row ahead of the mage
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
  FLOORS.forEach((_, i) => runs.append(btn(S.floorN(i + 1), () => start({ floor: i, level: levelAtFloor(i) > 1 ? levelAtFloor(i) : undefined })))); // (M6 step 12: at the floor's expected level, its choices waiting)
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
  foeBtn.textContent = DEV.foe ? S.foeEverywhere(foeName(DEV.foe)) : S.foesAsFloor; foeBtn.classList.toggle('on', !!DEV.foe);
  moveBtn.textContent = S.moveClip[DEV.moveClip]; moveBtn.classList.toggle('on', DEV.moveClip !== 'run');
  doorBtn.textContent = S.doors[DEV.doors]; doorBtn.classList.toggle('on', DEV.doors !== 'data');
  manaBtn.textContent = DEV.mana ? S.manaOn : S.manaOff; manaBtn.classList.toggle('on', DEV.mana);
  const list = assetList();
  assetBox.replaceChildren(...(list.length ? list.map(a => el('div', '', S.assetRow(a.where, S.assetStatus[a.status], a.triangles))) : [el('div', '', S.noAssets)]));
  obolBtn.textContent = S.obolWears(S.coinFaces[obolFace()] ?? obolFace()); obolBtn.disabled = obolFaces().length < 2;
  assetBtn.textContent = assetsOn() ? S.assetsOn : S.assetsOff; assetBtn.classList.toggle('on', assetsOn()); assetBtn.disabled = !list.some(a => a.status === 'loaded');
  madeLookBtn.textContent = S.madeLooks[madeLookNow()]; madeLookBtn.classList.toggle('on', madeLookNow() !== 'texel'); madeLookBtn.disabled = !assetsOn() || !madeLooks();
  kitBtn.textContent = DEV.roomKit ? S.kitNew : S.kitOld; kitBtn.classList.toggle('on', DEV.roomKit);
  for (const part of KIT_PARTS) {
    const b = kitPartBtns[part], kind = cur.look.kinds?.[part];
    b.textContent = S.kitPart(part, kind ? S.kitKinds[kind] ?? kind : '-', !!DEV.kitKinds[part]); b.classList.toggle('on', !!DEV.kitKinds[part]); b.disabled = !DEV.roomKit || !kind;
  }
  fpsBtn.textContent = DEV.fps ? S.fpsOn : S.fpsOff; fpsBtn.classList.toggle('on', DEV.fps);
  const look = pixelLook();
  pxBtn.textContent = S.pixelLines(look.lines, drawnRows()); pxBtn.classList.toggle('on', !!look.lines);
  lineBtn.textContent = look.outline ? S.outlinesOn : S.outlinesOff; lineBtn.classList.toggle('on', look.outline); lineBtn.disabled = !look.lines;
  bandBtn.textContent = look.bands ? S.bandsOn : S.bandsOff; bandBtn.classList.toggle('on', look.bands); bandBtn.disabled = !look.lines;
  reagentBtn.textContent = DEV.reagents ? S.reagentsOn : S.reagentsOff; reagentBtn.classList.toggle('on', DEV.reagents);
  alchInfo.textContent = S.alchemyInfo(player.belt.length, beltSlots(), POTION_IDS.filter(knownPotion).length, POTION_IDS.length, brewedPotions().length, S.serpentState[G.run.serpent], G.run.restless);
  { const v = insightNow(); levelInfo.textContent = S.levelsInfo(v.level, Math.round(v.insight), Math.ceil(v.next), v.pending) + ' ' + S.attrsInfo(ATTRS.map(a => `${STR.attrs[a].name} ${G.run.attrs[a]}`).join(', '), pointsToSpend()); }
  runesBtn.textContent = DEV.runes ? S.runesAlwaysOn : S.runesAlwaysOff; runesBtn.classList.toggle('on', DEV.runes);
  runeInfo.textContent = S.runesInfo(player.sockets.map(k => k.runes.map(id => rune(id).name).join(' + ') + (k.size > 1 ? ` (${k.runes.length}/${k.size})` : '')), player.runes.map(id => rune(id).name).join(', '));
  socketBtn.textContent = player.sockets[spellSlot].size > 1 ? S.socketTwo : S.socketOne; socketBtn.classList.toggle('on', player.sockets[spellSlot].size > 1);
  { const list = padsNow(); padInfo.replaceChildren(...(list.length ? list.map(g => el('div', '', S.padRow(g.index, g.id, g.mapping, g.buttons, g.axes))) : [el('div', '', S.noPads)])); }
  autoBtn.textContent = DEV.autoLevel ? S.autoLevelOn : S.autoLevelOff; autoBtn.classList.toggle('on', !!DEV.autoLevel);
  boonInfo.textContent = S.boonsInfo(Object.entries(G.run.boons).map(([id, r]) => `${boon(id).name}${r > 1 ? ' II' : ''}`).join(', '));
  heroPxBtn.textContent = heroPixel() ? S.heroPixelOn : S.heroPixelOff;
  creatureLookBtn.textContent = S.creatureLooks[creatureLook()]; creatureLookBtn.classList.toggle('on', creatureLook() !== 'texel');
  { const waiting = looksWaiting().length > 0; // (every new look approved: the three ways draw the same foes)
    foeLookBtn.textContent = waiting ? S.foeLooks[DEV.foeLooks] : S.foeLooksAllApproved; foeLookBtn.disabled = !waiting; foeLookBtn.classList.toggle('on', DEV.foeLooks !== 'approved'); } heroPxBtn.classList.toggle('on', heroPixel());
  const stages = Object.values(knowledgeNow()), count = (...st: string[]) => stages.filter(s => st.includes(s)).length;
  knowBox.textContent = S.knowledgeInfo(count('seen', 'learned', 'used', 'upgraded'), count('learned', 'used', 'upgraded'), count('used', 'upgraded'), reactionsFound().length, REACTION_IDS.length) + ' ' + S.weavesInfo(weavesFound().length, WEAVE_IDS.length);
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
  costBox.replaceChildren(...ARTIFACT_DEFS.filter(a => isCostume(a.costume ?? '') || a.kind === 'focus').map(a => {
    const b = btn(a.name, () => { tryOn(a.id); refresh(); }, a.costume ? S.costumeAt(a.costume) : S.costumeHeld);
    const dot = el('i'); dot.style.background = a.color; b.prepend(dot);
    b.classList.toggle('on', triedOn().includes(a.id));
    return b;
  }));
  costInfo.textContent = S.costumeInfo(wornNow(), heldNow() ?? '');
  const au = AudioDirector.info;
  soundInfo.textContent = S.soundInfo(au.ambience?.scape ? `${au.ambience.scape}${au.ambience.room ? ` + ${au.ambience.room}` : ''} (${au.ambience.space.split('|')[0]} s)` : '—', au.music?.piece ? `${au.music.piece}, ${au.music.mood}, bar ${au.music.bar}` : '—');
  soundBtn.textContent = AudioDirector.on ? S.soundOn : S.soundOff; soundBtn.classList.toggle('on', AudioDirector.on);
  transInfo.textContent = S.transformInfo(G.run.transforms.map(t => STR.transforms[t].name), blinkRest());
  arcInfo.textContent = S.arcInfo(arcNow(), arcHeld(), arcLevels(), DEV.arc !== undefined);
  { const m = marksNow(); marksInfo.textContent = S.marksInfo(m.hands.map(h => h ? `${STR.schools[h.school]} (${h.state}${h.ring ? ', ring' : ''})` : '-'), m.attuned ? STR.schools[m.attuned] : '', m.circle.known.reduce((a, b) => a + b, 0), m.circle.mastered.map(sc => STR.schools[sc])); }
  arcInfo.parentElement?.querySelectorAll<HTMLButtonElement>('button[data-arc]').forEach(b => b.classList.toggle('on', b.dataset.arc === String(DEV.arc)));
  transBox.querySelectorAll<HTMLButtonElement>('button[data-t]').forEach(b => b.classList.toggle('on', G.run.transforms.includes(b.dataset.t as never)));
  closeBtn.classList.toggle('on', DEV.closeUp);
  const rooms = G.rooms.filter(r => r.type !== 'normal').sort((a, b) => a.plan.dist - b.plan.dist);
  const secret = G.rooms.find(r => r.type === 'secret');
  const dials = FLOORS[Math.min(G.run.floor, FLOORS.length - 1)].pressure, names = (l: string[]) => l.map(s => STR.schools[s]).join(', ');
  floorBox.replaceChildren(
    el('p', 'dv-info', S.dials(dials.extra, dials.eliteMul, dials.ordealWaves, names(floorLean()), names(floorWalls())) + ' ' + S.pledgeInfo(G.run.pledge ? STR.schools[G.run.pledge] : '')), // (M4.9: the descent's dials; M6: a boon's pledge)
    btn(S.warnFloor, () => { if (!warnFloor()) toast(S.noWall, 2); }),
    ...rooms.map(r => {
      const note = r.doors.some(d => d.seal?.sealed) ? S.sealed : r.type === 'secret' && !r.found ? S.hidden : '';
      return btn(`${S.roomNames[r.type] ?? r.type}${note ? ` (${note})` : ''}${r === cur ? ' ●' : ''}`, () => goTo(r));
    }),
    // (only while its doorways are still closed: the cracks to divine, the room to open)
    ...(secret && secret.doors.some(d => d.secret && !d.secret.open) ? [
      ...(secret.doors.some(d => d.secret && !d.secret.open && !d.secret.divined) ? [btn(S.revealCracks, () => revealCracks())] : []),
      btn(S.openSecret, () => openSecretRoom(secret))] : []),
    btn(S.clear, () => clearRoom()),
    btn(S.reveal, () => { for (const r of G.rooms) r.known = true; renderMinimap(); }),
    btn(DEV.mapFinished ? S.mapFinishedOn : S.mapFinishedOff, () => { DEV.mapFinished = !DEV.mapFinished; renderMinimap(); }), // (2026-10-02: finished rooms marked, or not, to compare)
    btn(S.nextFloor, () => { closeDev(); descend(); }),
  );
}

/** Render `CFG.audio.preview` seconds of what the Sound tab has chosen (or floor 1 and its piece) and hand it over as a WAV. */
async function savePreview(f: Forced | null) {
  const floor = f?.floor ?? G.run.floor, piece = f?.piece, mood = f?.mood ?? 'explore';
  const r = await renderAudio({ ambience: f?.floor !== undefined || !piece ? { floor, room: f?.room, theme: f?.theme } : undefined, music: piece ? { piece, mood } : undefined, seconds: CFG.audio.preview });
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([r.wav], { type: 'audio/wav' }));
  a.download = `ossuary-${piece ?? 'floor' + (floor + 1)}-${mood}.wav`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
