/* Boot: wire input and UI, build the floor, load the hero, start the loop, expose dev hooks. */
// fonts are bundled with the game (Fontsource), so starting it makes no requests to Google
import { kaelithInfo, kaelithToPhase, kneltAt, shutAllWards } from './actors/kaelith';
import { daylightInfo, enterDaylight } from './world/daylight';
import { exportSave, giveHome, importSave, veteranSave, vigil, wipeSave } from './vigil/save';
import '@fontsource/cinzel/400.css';
import { POTION_IDS, isPotion, type PotionId, type ReagentId } from './items/alchemyData';
import { addPotion, addReagent, beltSlots, choosePotion, identify, knownPotion, moveInBelt, potionFx, renderBelt, usePotion } from './items/potions';
import { throwsNow, flightsNow } from './items/potionThrow';
import { forgetBrews } from './items/alchemyMemory';
import { buyRecipe, jellyIdentifies, knownRecipes } from './items/brewing';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/alegreya/400.css';
import '@fontsource/alegreya/400-italic.css';
import '@fontsource/alegreya-sans/400.css';
import '@fontsource/alegreya-sans/500.css';
import '@fontsource/alegreya-sans/700.css';
import './style.css';
import { DEV, G, player } from './state';
import { applyStrings } from './strings';
import { Sfx } from './audio/sfx';
import { camera, canvas, draw, renderer, resize, setCloseUp } from './render/renderer';
import './render/lights';
import { fallbackHero, hero, loadHeroBuffer, setHero } from './actors/hero';
import { heroPixel, setHeroPixel } from './actors/heroPixel';
import { givingNow, jellyGives, type Gift } from './world/jellyGives';
import { arrowOrder, initGamepad, initKeyboard, initTouch, keys, padsNow, type InputActions } from './input';
import { RUNE_IDS, isRune, type RuneId } from './magic/runeData';
import { carve, clearRunes, liftRune, runeOdds, setSockets } from './magic/runes';
import { slotDef } from './magic/cost';
import { initScreens, showScreen } from './ui/screens';
import { closeDev, devOpen, dropsHere, forceKinds, objectsHere, rebuildFloor, showAssetsHere, showCoins, takeCoins, toggleDev, useAssets, useMadeLook, useRoomKit, wearFace } from './ui/devMenu';
import { obolFace, obolFaces } from './items/obolFace';
import type { Kinds } from './world/kitData';
import { closeInventory, initInventory, inventoryKey, inventoryOpen, inventoryPad, openInventory } from './ui/inventory';
import { serpentInfo } from './actors/jellySerpent';
import { breakOut, crackVat } from './world/laboratory';
import { brewAtTable, closeLab, initLab, labKey, labNow, labOpen, labPad, openLab, type LabTab } from './ui/alchemyTable';
import { carveHere, closeWaystone, initWaystone, openWaystone, secondSocket, stoneKey, stonePad, takeFromStone, waystoneNow, waystoneOpen, type StoneTab } from './ui/waystone';
import { raiseWaystone } from './world/waystone';
import { warePanelNow } from './ui/warePanel';
import { FOE_LOOK_MODES, type FoeLooks } from './actors/fantasyLooks';
import { lookContract, showLookPairs } from './actors/lookPairs';
import { promptShowing, renderHearts, roomFinished, setHeroInfo, toast, updateVision } from './ui/hud';
import { bargainNow, openBargainHere } from './world/bargain';
import { levelAtFloor } from './progression/levelData';
import { chooseFor, initLevelUp, levelEsc, levelKey, levelOpen, levelPad, offerNow, openLevelUp, takeBargainCard } from './ui/levelUp';
import { giveById, refreshStats, removeArtifactGallery, showArtifactGallery } from './items/artifacts';
import { ARTIFACTS } from './items/artifactData';
import { askVigil, begin, clearRoom, descend, pause, prepareTitle, resetPlayer, resume, setNextRun, startGame, startsAtVigil, toggleSound, wakeAtVigil, warp } from './flow';
import { STR } from './strings';
import { closeLectern, holdIn, initLectern, lecternKey, lecternNow, lecternOpen, lecternPad, openLectern } from './ui/lectern';
import { board, vigilActs, vigilInfo } from './vigil/place';
import { gainInsight, insightNow, setLevel } from './progression/insight';
import { pointsToSpend, spendPoint } from './progression/points';
import { boonsNow, dealNow, takeBoon } from './progression/boons';
import { BOONS } from './progression/boonData';
import { boonsActed, boonsSaid } from './progression/boonHooks';
import { setOffBoon } from './progression/boonTest';
import type { Attr } from './progression/attributes';
import { STEP, startLoop, step } from './loop';
import { cleanSeed } from './rng';
import { VARIANTS, planToText, type RoomVariant } from './world/generate';
import { BOSS_TYPES, CFG, type BossType } from './config';
import { damageEnemy } from './combat/damage';
import { DROPS, RESOURCES, type Drop, type Resource, type Soul } from './items/loot';
import { gainSoul, hallowedMend } from './items/souls';
import { giveResources, spawnPickup } from './items/pickups';
import { openSecretRoom } from './world/secret';
import { cleanseAtOnce, riteState } from './world/shrine';
import { SPELLS, type SpellStatus, type StatusKind } from './magic/spellData';
import { inflict, pollenNow } from './magic/statusFx';
import { makeEnemy, spawnFoe } from './actors/enemies';
import { attuneTo, castSpell, learnSpell } from './magic/spells';
import { mantleLeft, wardLeft } from './magic/shapes';
import { mothCount, saltCircle } from './combat/familiars';
import { fxShowing } from './magic/spellFx';
import { answerPage, dropPage, pagePanelSpell } from './magic/pages';
import { fireAt, poolsDo } from './world/pools';
import { spawnShot } from './combat/projectiles';
import { lightLevels } from './render/lights';
import { TEMPLATES } from './world/templates';
import { isTouch } from './util';
import { dress, heldNow, robeTint, takeAllOff, tryOn, wornDetail, wornNow } from './actors/costume';
import { clearTransforms, formTransform } from './items/transforms';
import { blinkRest } from './items/gifts';
import { arcHeld, arcNow } from './items/arc';
import { marksNow } from './actors/spellMarks';
import type { TransformId } from './items/transformData';
import { THEMES } from './world/themeData';
import { placeProp } from './world/props';
import { assetList, assetsOn, loadAssets, madeLookNow } from './assets/models';
import { drawnRows, pixelLook, setPixelLook, type PixelLook, fineLayerDrawn } from './render/pixelLook';
import { removeModelOptions, showBestiary, showBossLooks, showFamiliarOptions, showJellyLooks, showModelOptions } from './actors/modelOptions';
import { removeEffectOptions, showEffectOptions } from './magic/effectOptions';
import { elementDev, sapMul } from './world/mechanisms';
import { wardFoe } from './actors/wardShield';
import { callWanderer, wandererState } from './items/wanderer';
import { dragonInfo } from './actors/pillarDragon';
import { fennexInfo, growFennex } from './combat/fennex';
import { fullness, mostDrunk } from './magic/drinking';
import { findEveryReaction, findEveryWeave, forgetKnowledge, forgetReactions, forgetWeaves, knowledgeNow, reactionsFound, setStage, weavesFound } from './magic/memory';
import { WEAVE_IDS, type WeaveId } from './magic/weaves';
import { setOffWeave } from './magic/weaveTest';
import { REACTION_IDS, type Stage } from './magic/knowledge';
import { setOffReaction } from './magic/reactionTest';
import type { Reaction } from './magic/status';
import type { PropKind } from './world/propData';
import { FOE_IDS, isFoe, type FoeType, type School } from './actors/foeData';
import { bestiary, forgetBestiary } from './actors/bestiary';
import { findEveryCounter } from './actors/counters';
import { burningGround, sparkGround } from './actors/foes';
import { groundCount, groundDrawn } from './actors/bestiaryGround';
import { blastAt } from './combat/glyphs';
import { inSteam, steamAt, steamCount } from './magic/steam';
import type { MantleId } from './actors/mantleData';
import { groundPace, layDevGround } from './actors/foeGround';
import { AudioDirector, type Forced } from './audio/director';
import { creatureLook, creaturesNow, roarNow, setCreatureLook, showCreature, takeCreatures, type CreatureLook } from './actors/madeCreatures';
import { freeSpotNear } from './world/rooms';
import { renderAudio, type RenderAsk } from './audio/render';
import { SOUND_FILES, preloadSamples } from './audio/samples';

const HERO_URL = `${import.meta.env.BASE_URL}assets/hero_default.glb`;

const input: InputActions = {
  unlockAudio: () => Sfx.init(),
  togglePause: () => { if (devOpen()) closeDev(); else if (lecternOpen()) closeLectern(); else if (levelOpen()) levelEsc(); else if (labOpen()) closeLab(); else if (waystoneOpen()) closeWaystone(); else if (inventoryOpen()) closeInventory(); else if (G.state === 'play') pause(); else if (G.state === 'pause') resume(); },
  confirm: () => { if (G.state === 'title' || G.state === 'end') begin(); }, // (M7 step 5: to the Vigil once a run has been played)
  startButton: () => { if (devOpen()) closeDev(); else if (lecternOpen()) closeLectern(); else if (levelOpen()) levelEsc(); else if (labOpen()) closeLab(); else if (waystoneOpen()) closeWaystone(); else if (inventoryOpen()) closeInventory(); else if (G.state === 'play') pause(); else if (G.state === 'pause') resume(); else begin(); },
  toggleSound,
  autoPause: () => { if (G.state === 'play') pause(); },
  toggleDev: () => { if (inventoryOpen()) closeInventory(); toggleDev(); },
  inventoryKey: code => {
    if (devOpen()) return false;
    if (lecternOpen()) return lecternKey(code); // (M7 step 5: the Vigil's lectern)
    if (levelOpen()) return levelKey(code); // (M6: the level-up screen's choice waits)
    if (labOpen()) return labKey(code); // (M5: the alchemy table takes its keys first)
    if (waystoneOpen()) return stoneKey(code); // (M6: the waystone's screen, the same)
    const used = inventoryKey(code, G.state === 'play');
    if (used === 'open') { pause(); openInventory('play'); return true; }
    if (!used && code === 'KeyI' && G.state === 'pause') { openInventory('pause'); return true; } // from the pause menu
    return used;
  },
  padButton: i => {
    if (devOpen()) return false;
    if (lecternOpen()) return lecternPad(i);
    if (levelOpen()) return levelPad(i);
    if (labOpen()) return labPad(i);
    if (waystoneOpen()) return stonePad(i);
    if (inventoryOpen()) return inventoryPad(i);
    if (i !== 8) return false; // View opens the inventory, while playing or paused
    if (G.state === 'play') { pause(); openInventory('play'); return true; }
    if (G.state === 'pause') { openInventory('pause'); return true; }
    return false;
  },
  playing: () => G.state === 'play',
};

async function loadDefaultHero() {
  try {
    const res = await fetch(HERO_URL);
    if (!res.ok) throw new Error(`${HERO_URL}: HTTP ${res.status}`);
    await loadHeroBuffer(await res.arrayBuffer(), 'hero_default.glb');
  } catch (e) {
    console.error(e); setHero(fallbackHero(), { animations: [] }, 'fallback');
  }
  setHeroInfo(hero.info);
}

/** Run options from the address: ?seed=K3F9QX replays a run's floors, ?floor=2 starts deeper,
    ?room=<template id> plays one room template (for reviewing templates), ?variant=dark dresses that room
    in a variant (quiet, champion, ambush, dark), ?give=bone_lens,twin_staff starts the run holding those
    artifacts, ?boss=pyre picks every floor's boss, ?loot=coins:20,glyphs:5 hands out obols, keys and glyphs,
    ?spells=arc starts with spells in the slots, ?theme=ossuary makes every fight one theme's, ?kit=old builds the rooms
    in the old look (before the room kit), ?boons=deepWinter:2,coldSnap starts with boons taken (M6), ?runes=q:quicken,e:lasting+vein
    with runes carved into the slots' spells (M6 step 7). */
function readUrlOptions() {
  const q = new URLSearchParams(location.search);
  const kit = q.get('kit');
  const vig = q.get('vigil'); if (vig && vig !== '0') askVigil(vig === 'first'); // (M7 step 5: ?vigil=1 starts at the Vigil, ?vigil=first wakes there for the first time)
  const looks = q.get('looks'); // (M4.12: ?looks=new tries every new look, ?looks=old wears the old ones)
  if (looks && FOE_LOOK_MODES.includes(looks as FoeLooks)) DEV.foeLooks = looks as FoeLooks; else if (looks) console.warn(`?looks=${looks}: use ${FOE_LOOK_MODES.join(', ')}`);
  if (kit === 'old') DEV.roomKit = false; else if (kit && kit !== 'new') console.warn(`?kit=${kit}: use new or old`);
  const seed = q.get('seed'), floor = Number(q.get('floor')), room = q.get('room'), variant = q.get('variant') as RoomVariant | null;
  if (variant && !VARIANTS.includes(variant)) console.warn(`?variant=${variant}: use one of ${VARIANTS.join(', ')}`);
  // ?loot=coins:20,keys:2,glyphs:5
  const loot: Partial<Record<Resource, number>> = {};
  for (const part of (q.get('loot') ?? '').split(',').filter(Boolean)) {
    const [k, v] = part.split(':'), n = Number(v);
    if (RESOURCES.includes(k as Resource) && n > 0) loot[k as Resource] = n; else console.warn(`?loot: "${part}" should be one of ${RESOURCES.join(', ')} with a count, e.g. coins:20`);
  }
  const boss = q.get('boss') as BossType | null, bossOk = !!boss && BOSS_TYPES.includes(boss);
  if (boss && !bossOk) console.warn(`?boss=${boss}: use one of ${BOSS_TYPES.join(', ')}`);
  const theme = q.get('theme');
  // ?foe=sporeling: that foe in every template role, on every floor (M4)
  const foe = q.get('foe');
  if (foe && isFoe(foe)) DEV.foe = foe; else if (foe) console.warn(`?foe=${foe}: use one of ${FOE_IDS.join(', ')}`);
  if (theme && !THEMES.has(theme)) console.warn(`?theme=${theme}: use one of ${[...THEMES.keys()].join(', ')}`);
  const give = (q.get('give') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const spells = (q.get('spells') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const badSpells = spells.filter(id => !SPELLS.has(id));
  if (badSpells.length) console.warn(`?spells: unknown ${badSpells.join(', ')}. Known: ${[...SPELLS.keys()].join(', ')}`);
  const potions = (q.get('potions') ?? '').split(',').map(s => s.trim()).filter(Boolean); // (M5: potions to start with in the belt)
  const level = q.get('level') === 'auto' ? levelAtFloor(Math.max(0, Number(q.get('floor') ?? 1) - 1)) : Number(q.get('level')); // (M6: ?level=5 starts at that level, its choices waiting; ?level=auto at the floor's expected level, step 12)
  const auto = q.get('autolevel'); if (auto && auto !== '0') DEV.autoLevel = auto === 'skip' ? 'skip' : 'choose'; // (M6: levels choose for themselves (the bot), or pass (the tests))
  if (q.get('level') && !(level >= 1 && level <= 12)) console.warn(`?level=${q.get('level')}: use 1 to 12, or auto`);
  const boons: Record<string, number> = {}; // (M6 step 5: ?boons=deepWinter:2,coldSnap starts with them taken, at those ranks)
  for (const part of (q.get('boons') ?? '').split(',').map(s => s.trim()).filter(Boolean)) {
    const [id, n] = part.split(':'), b = BOONS.get(id), rank = n ? Number(n) : 1;
    if (b && rank >= 1 && rank <= b.max) boons[id] = rank; else console.warn(`?boons: "${part}" should be a boon with a rank up to its most, e.g. deepWinter:2. Known: ${[...BOONS.keys()].join(', ')}`);
  }
  const runes: RuneId[][] = [[], []]; // (M6 step 7: ?runes=q:quicken,e:lasting+vein carves them into the slots)
  for (const part of (q.get('runes') ?? '').split(',').map(s => s.trim()).filter(Boolean)) {
    const [k, list = ''] = part.split(':'), slot = ['q', '0'].includes(k.toLowerCase()) ? 0 : ['e', '1'].includes(k.toLowerCase()) ? 1 : -1;
    const ids = list.split(/[+ ]/).filter(Boolean), bad = ids.filter(id => !isRune(id));
    if (slot < 0 || bad.length || ids.length > 2) { console.warn(`?runes: "${part}" should be q: or e: with one or two runes joined by +, e.g. q:quicken or e:lasting+vein. Known: ${RUNE_IDS.join(', ')}`); continue; }
    runes[slot] = ids as RuneId[];
  }
  const badPotions = potions.filter(id => !isPotion(id));
  if (badPotions.length) console.warn(`?potions: unknown ${badPotions.join(', ')}. Known: ${POTION_IDS.join(', ')}`);
  if (room && !TEMPLATES.has(room)) console.warn(`?room=${room}: no such template. Known: ${[...TEMPLATES.keys()].join(', ')}`);
  const unknown = give.filter(id => !ARTIFACTS.has(id));
  if (unknown.length) console.warn(`?give: unknown ${unknown.join(', ')}. Known: ${[...ARTIFACTS.keys()].join(', ')}`);
  setNextRun({
    seed: seed ? cleanSeed(seed) : undefined,
    floor: floor >= 1 ? floor - 1 : undefined,
    testTemplate: room && TEMPLATES.has(room) ? room : undefined,
    testVariant: variant && VARIANTS.includes(variant) ? variant : undefined,
    give: give.filter(id => ARTIFACTS.has(id)),
    boss: bossOk ? boss! : undefined,
    loot, spells: spells.filter(id => SPELLS.has(id)), potions: potions.filter(isPotion), level: level >= 1 ? level : undefined, boons, runes,
    theme: theme && THEMES.has(theme) ? theme : undefined,
  });
}

/** Dev and test hooks. Kept in production builds so the deployed site can be tested too. */
function installDevHooks() {
  window.__game = {
    get state() { return G.state; }, player, get enemies() { return G.enemies; }, get current() { return G.current; },
    get seed() { return G.run.seed; }, get floor() { return G.run.floor; }, get run() { return G.run; }, get bolts() { return G.bolts; },
    rooms: () => G.rooms, startGame, hero, camera, keys, arrowOrder, warp, descend, clearRoom,
    /** M6: insight and levels: the insight gained, the level, the level choices waiting, insight to the next level; gain
        some (it runs to the hand as a fallen foe's does) or set the level. */
    get insight() { return insightNow(); }, get level() { return G.run.level; },
    giveInsight: (n: number) => gainInsight(n), setLevel: (n: number) => setLevel(n),
    /** M6 step 2: the points spent on each attribute and those left to spend; spend one (a level's point, or `free`). */
    get attrs() { return { ...G.run.attrs, free: pointsToSpend() }; }, spend: (attr: Attr, free = false) => spendPoint(attr, free),
    /** M6 step 3: the boons taken (each one's rank), the pledge and the casts by school; deal three as a level would; take one. */
    /** M6 step 7: each slot's socket (its spell, size and runes, and the spell as they make it), the pouch, and which runes
        have acted (`acted`, counted) and said their line (`said`). */
    get sockets() {
      return { slots: player.sockets.map((k, i) => { const d = slotDef(i); return { spell: player.spells[i], size: k.size, runes: [...k.runes], def: d && { mana: d.mana, cooldown: d.cooldown, damage: d.damage, params: { ...d.params }, status: { ...d.status } } }; }),
        pouch: [...player.runes], acted: Object.fromEntries(Object.entries(G.run.acted).filter(([k]) => k.startsWith('rune:'))), said: [...G.run.hinted].filter(k => k.startsWith('rune:')) };
    },
    /** Carve rune `id` into slot `slot` (null: why not), or empty the socket (`id` null); `size` opens a second socket. */
    socket: (slot: number, id: RuneId | null, size?: number) => { if (size) setSockets(slot, size); if (!id) { clearRunes(slot); return null; } return carve(slot, id); },
    get boons() { return { taken: boonsNow(), pledge: G.run.pledge, casts: { ...G.run.casts }, acted: boonsActed(), said: boonsSaid() }; }, deal: () => dealNow(), giveBoon: (id: string) => takeBoon(id),
    /** M6 step 5: a school boon taken if need be and set off ahead (the dev menu's "Boons here"); `acted` above counts each
        boon at work this run, `said` the names risen in this room. */
    boonHere: (id: string) => setOffBoon(id),
    /** M6 step 4: the level-up screen: what it offers (open, phase, the level, its cards); open it now; choose for a level
        (card i, then attribute a: the screen's or, closed, as `?autolevel` does); levels choose for themselves. */
    get offer() { return offerNow(); }, openLevelUp: () => openLevelUp(), chooseLevel: (i = 0, a?: Attr) => chooseFor(i, a),
    set autoLevel(how: false | 'choose' | 'skip') { DEV.autoLevel = how; }, get autoLevel() { return DEV.autoLevel; },
    /** The current floor as text: S start, B boss, T treasure, # normal, @ you. */
    map() { return G.run.plan ? planToText(G.run.plan, G.current.plan.id) : ''; },
    /** Run the simulation for `sec` seconds in fixed steps; optionally render once afterwards. */
    sim(sec: number, render = false) { for (let t = 0; t < sec; t += STEP) step(STEP); if (render) { draw(); updateVision(); } },
    draw() { draw(); updateVision(); },
    /** The made assets (M3.5, data/assets.json): whether they are used, and each one's status; turn them on or off
        (this floor is built again to compare). */
    get assets() { return { on: assetsOn(), list: assetList().map(a => ({ ...a })) }; },
    useAssets: (on: boolean) => useAssets(on),
    /** How the made assets are drawn (2026-10-05): their texture as pixel art ('texel', the game's look) or as made; set it
        on this floor's rooms and every one placed from now on, to compare. */
    get madeLook() { return madeLookNow(); }, setMadeLook: (l: 'texel' | 'made') => useMadeLook(l),
    /** The room kit (M3.5 step 3's proof: fire objects, the crypt's floor and walls built in code): whether it is used;
        turn it on or off (this floor is built again to compare). */
    get roomKit() { return DEV.roomKit; },
    useRoomKit: (on: boolean) => useRoomKit(on),
    /** The kinds of wall, floor, wall light and brazier the room the mage is in drew (the room kit's variety). */
    get kinds() { return G.current.look.kinds ? { ...G.current.look.kinds } : null; },
    /** Force kinds on every room of this floor, e.g. forceKinds({ wall: 'ashlar' }) ({} to draw per room again); built again. */
    forceKinds: (k: Partial<Kinds>) => forceKinds(k),
    /** The pixel look: its grid ('texel', rows of pixels, or 0 for off), outlines, light in bands; set any of them. */
    get pixelLook() { return { ...pixelLook() }; },
    /** The rows of game pixels the pixel look drew in the last frame (at the texel: the view's height in texels). */
    get pixelRows() { return drawnRows(); },
    /** The mage in the pixel-art look (its colours baked, a few of them, light in bands), or as made; switch it. */
    get heroPixel() { return heroPixel(); },
    setHeroPixel: (on: boolean) => { setHeroPixel(hero.model, on); dress(); },
    /** Every artifact floating ahead of the mage, as the room kit builds them (the dev menu's artifact gallery); how many;
        and taken away again. */
    artifactGallery: () => showArtifactGallery(G.current, player.x, player.z),
    takeArtifactGallery: () => removeArtifactGallery(G.current),
    /** Enemy model options (looks only): stand them (or those named) ahead of the mage, a row per floor; returns where
        each stands; take them away again. */
    modelOptions: (ids?: string[]) => showModelOptions(G.current, player.x, player.z, ids),
    takeModelOptions: () => removeModelOptions(G.current),
    /** The familiar options (looks only, the owner's drawings built in code) ahead of the mage; taken away with the rest. */
    familiarOptions: (ids?: string[]) => showFamiliarOptions(G.current, player.x, player.z, ids),
    /** M4.5: stand the bestiary's candidates (every one, or those named) ahead of the mage, in rows by kind. */
    bestiaryOptions: (ids?: string[]) => showBestiary(G.current, player.x, player.z, ids),
    /** The bosses built in code (the Hollow Warden's looks, M4, and floors 4 and 5's, M4.1): stand them ahead of the mage; the look the Warden wears in its fight, and choosing it. */
    bossLooks: (ids?: string[]) => showBossLooks(G.current, player.x, player.z, ids),
    /** Dr. Jelly (2026-10-02, the plague doctor): stood ahead of the mage giving, a gift handed over in this laboratory,
        and what he is giving now. */
    jellyLooks: () => showJellyLooks(G.current, player.x, player.z), jellyGive: (gift: Gift) => jellyGives(gift), get giving() { return givingNow(); },
    /** Spell effect options (looks only): play them (or those named) ahead of the mage; take them away again. */
    effectOptions: (ids?: string[]) => showEffectOptions(G.current, player.x, player.z, ids),
    takeEffectOptions: () => removeEffectOptions(G.current),
    setPixelLook: (change: Partial<PixelLook>) => setPixelLook(change),
    /** Ahead of the mage: a plain and a sealed urn, and an artifact on a pedestal (one with a made model if any). */
    showAssets: () => showAssetsHere(),
    /** The coin face the obols wear (2026-10-02), every face they can wear, wearing another, and all side by side. */
    get obolFace() { return obolFace(); }, get obolFaces() { return obolFaces(); }, wearFace: (id: string) => wearFace(id),
    coinGallery: () => showCoins(), takeCoinGallery: () => takeCoins(),
    /** Whether the pixel look's fine layer (the coins' finer pixel) drew anything in the last frame. */
    get fineLayerDrawn() { return fineLayerDrawn(); },
    /** Every object and pile, and two urns, in rows ahead of the mage (the dev menu's "Objects here"). */
    objectsHere: () => objectsHere(),
    dropsHere: () => dropsHere(),
    /** The soundscapes and the music (docs/sound-plan.md): what plays; turned on (the browser tests start with it off);
        forced to a floor's soundscape, a room's, a piece and mood; a stretch of any rendered offline, as a base64 WAV. */
    get audio() { return AudioDirector.info; }, audioOn: (v = true) => AudioDirector.set(v), forceAudio: (f: Forced | null) => AudioDirector.force(f),
    renderAudio: async (ask: RenderAsk) => { const r = await renderAudio(ask); let bin = ''; const u8 = new Uint8Array(r.wav); for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return { wav: btoa(bin), seconds: r.seconds, peak: r.peak, rms: r.rms }; },
    /** Creatures made in Tripo and animated in code (docs/creatures.md): stand one ahead of the mage (resolves once it
        stands), what stands, a roar now, and all taken away. */
    get creatureLook() { return creatureLook(); }, setCreatureLook: async (l: CreatureLook) => { await setCreatureLook(l); return creaturesNow(); },
    showCreature: async (id = 'owlbear', side = CFG.creatures.standSide) => { const at = freeSpotNear(G.current, player.x + side, player.z + CFG.creatures.standSouth); await showCreature(id, G.current, at.x, at.z); return creaturesNow(); },
    get creatures() { return creaturesNow(); }, roarNow: () => roarNow(), takeCreatures: () => takeCreatures(G.current),
    // the sounds played from files (data/sounds.json), each loaded and decoded: its seconds, or null where it failed
    soundFiles: async () => { const ctx = new OfflineAudioContext(1, 44100, 44100), names = Object.keys(SOUND_FILES); const b = await Promise.all(names.map(n => preloadSamples(ctx, [n]))); return Object.fromEntries(names.map((n, i) => [n, b[i].map(x => x && +x.duration.toFixed(2))])); },
    /** What the last frame cost the GPU (draw calls, triangles) and what is held in memory (geometries, textures). */
    renderInfo: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }),
    lightLevels,
    /** Give the mage artifacts by id, e.g. give('bone_lens', 'twin_staff'). */
    give: (...ids: string[]) => giveById(ids),
    /** Hand out obols, keys or glyphs, e.g. loot({ glyphs: 3 }). */
    loot: (v: Partial<Record<Resource, number>>) => giveResources(v),
    /** Drop a pickup (halfHeart, heart, coin, purse, key, glyph, mana, the soul motes paleSoul, blackSoul and
        hallowedSoul, shard, coffer, chest) at (x, z), or just ahead of the mage; a chest is plain unless `gilded` is set; `asLoot` drops it as loot would (a mana vial turns into an
        obol while the mage knows no spell). */
    drop(kind: Drop, x = player.x, z = player.z - 1.5, opts: { gilded?: boolean; asLoot?: boolean; potion?: PotionId; reagent?: ReagentId; rune?: RuneId } = {}) {
      if (!DROPS.includes(kind)) throw new Error(`drop: use one of ${DROPS.join(', ')}`);
      spawnPickup(kind, x, z, { gilded: opts.gilded ?? false, asIs: !opts.asLoot, potion: opts.potion, reagent: opts.reagent, rune: opts.rune });
    },
    /** The soul motes held, in the order taken (M4.1); give one (false when as many are kept as can be); a floor's end
        for the hallowed ones (the half hearts they gave back). */
    get souls() { return [...player.souls]; }, soul: (kind: Soul) => gainSoul(kind), hallowedMend: () => hallowedMend(),
    /** Break open every cracked wall of this floor's secret room. */
    openSecret() { const r = G.rooms.find(x => x.type === 'secret'); if (r) openSecretRoom(r); return !!r; },
    /** Learn a spell into a slot (0 or 1); cast the spell in a slot, as if its key were pressed (optionally
        aiming); read or set mana. */
    learn: (id: string, slot?: number) => learnSpell(id, slot, true),
    cast: (slot: number, aim?: { x: number; z: number }) => answerPage(slot) || castSpell(slot, aim ?? null),
    mana(v?: number) { if (v !== undefined) player.mana = Math.min(player.stats.maxMana, Math.max(0, v)); return player.mana; },
    /** Spell knowledge (M3.7): every spell's stage; bring one to a stage; forget everything (kept between runs). */
    get knowledge() { return knowledgeNow(); },
    know: (id: string, stage: Stage) => setStage(id, stage), forgetKnowledge: () => forgetKnowledge(),
    /** The reactions found (M4.8's codex, kept between runs); find them all or forget them; set one off on dummies ahead. */
    get reactions() { return [...reactionsFound()]; }, findReactions: () => findEveryReaction(REACTION_IDS), forgetReactions: () => forgetReactions(),
    reaction: (r: Reaction, x = player.x, z = player.z - 3) => setOffReaction(r, x, z).map(d => G.enemies.indexOf(d)),
    /** M4.10: the weaves and chains found (kept between runs); find them all or forget them; set one up ahead of the mage. */
    get weaves() { return [...weavesFound()]; }, findWeaves: () => findEveryWeave(WEAVE_IDS), forgetWeaves: () => forgetWeaves(), weave: (id: WeaveId) => setOffWeave(id),
    /** The spell whose panel shows over a page near the mage, and the panel's text. */
    get pagePanel() { return { spell: pagePanelSpell(), text: document.getElementById('pagePanel')?.classList.contains('on') ? document.getElementById('pagePanel')!.textContent : '' }; },
    /** Spawn a foe (e.g. 'dummy', the training dummy) at (x, z), or ahead of the mage; put statuses on every
        foe in the room, e.g. inflict({ burn: 3 }). */
    spawn(kind: FoeType, x = player.x, z = player.z - 2.5) { return spawnFoe(kind, x, z, 1); }, // (a swarm comes whole)
    champion(kind: FoeType, mantle?: MantleId, x = player.x, z = player.z - 2.5) { return makeEnemy(kind, x, z, 1, undefined, { champion: true, mantle }); }, // (M4.7: a champion, in a mantle if named)
    layGround(kind: 'web' | 'ink' | 'rime' | 'blackice' | 'fire' | 'spark' | 'spores', x: number, z: number, by?: string) { layDevGround(kind, x, z, by); }, // (M4.7: ground left by a foe of kind `by`)
    foeGround(i: number) { const e = G.enemies[i]; return e && { pace: groundPace(e), at: e.inGround, slide: !!e.slide }; }, // (M4.7: what the ground under foe i does to it)
    /** Strike the room's foe `i` for `dmg`, of `school` if given (M4: its weakness and resistance count). */
    hit: (i: number, dmg: number, school?: School, by: 'spell' | 'cantrip' = 'spell', dx = 0, dz = 0) => { const e = G.enemies[i]; if (e) damageEnemy(e, dmg, dx, dz, 0, by, school); return e?.hp; }, // (dx, dz: the way the blow travels)
    /** What the mage has found of the foes (M4), kept between runs; forget it all. */
    get bestiary() { return bestiary(); }, forgetBestiary: () => forgetBestiary(), findCounters: () => findEveryCounter(), // (M4.7: every counter found)
    /** Patches of ground a salamander has set burning in this room (M4). */
    get burningGround() { return burningGround(); }, get sparkGround() { return sparkGround(); },
    get pollen() { return pollenNow(); }, // (M5: Pollen Spark's clouds in the room)
    get steam() { return steamCount(); }, steamAt(x: number, z: number) { steamAt(x, z); }, inSteam(x: number, z: number) { return inSteam(x, z); }, // (Steam's clouds in the room, 2026-10-01)
    /** M4.5: the webs, ink and rime on the floor of the current room; a glyph's blast at (x, z). */
    get ground() { return { web: groundCount('web'), ink: groundCount('ink'), rime: groundCount('rime'), blackice: groundCount('blackice'), blackiceDrawn: groundDrawn('blackice') }; }, blast: (x: number, z: number) => blastAt(x, z),
    /** The simulation's clock (seconds), against which timed states are kept (a lark's song). */
    get clock() { return G.simClock; },
    inflict(status: Partial<Record<SpellStatus, number>>) { for (const e of G.enemies) inflict(e, status); },
    /** Fire a foe's shot from (x, z) along (dx, dz) (a wall of ice stops it); seconds of the Static Mantle and of
        Wardlight left. */
    shoot(x: number, z: number, dx: number, dz: number, o: Parameters<typeof spawnShot>[8] = {}) { const l = Math.hypot(dx, dz) || 1; spawnShot(x, z, dx / l, dz / l, CFG.afflict.testShot, 0xb784ff, .8, undefined, o); }, // (o: what the shot carries, `{ hex: 8 }`)
    get mantle() { return mantleLeft(); }, get ward() { return wardLeft(); },
    /** The Salt Circle lying round the mage (M4.1): where, and how long; null when none. */
    get salt() { return saltCircle(); },
    /** The spells' looks showing now: the Cinder Lance, and how many rings of light and bolts of lightning. */
    get spellFx() { return fxShowing(); },
    /** Drop a grimoire page (of `id`, or a spell the mage doesn't know) at (x, z) or ahead of the mage; the pages
        in the room; the spells given up this run. */
    page(id?: string, x = player.x, z = player.z - 1.5) { return dropPage(G.current, x, z, id)?.spell ?? null; },
    get pages() { return G.current.pages ?? []; }, get forgotten() { return G.run.forgotten; },
    /** The water and oil in the room: kind, state, its tiles' centres. */
    get pools() { return (G.current.pools ?? []).map(p => ({ kind: p.kind, state: p.state, t: p.t, mud: !!p.mud, tiles: p.tiles.map(t => ({ x: t.x, z: t.z })) })); },
    /** Set the room's oil alight, freeze its water, or shock it (as the dev menu does). */
    pool: (what: 'fire' | 'frost' | 'shock') => poolsDo(what),
    /** Cleanse the oldest curse held at once (no fight, no obols); the shrine's rite under way, if any. */
    cleanse: () => cleanseAtOnce(), get rite() { return riteState(); },
    get pickups() { return G.pickups; }, get glyphs() { return G.glyphs; }, get shots() { return G.shots; },
    /** Put one of the rooms' objects down at (x, z) (on free floor), e.g. prop('cask'); the objects in the room. */
    prop(kind: PropKind, x = player.x, z = player.z - 1.5) { return !!placeProp(kind, x, z); },
    get props() { return (G.current.props ?? []).map(b => ({ kind: b.prop.kind, x: b.x, z: b.z, burning: b.prop.burning, hits: b.prop.hits, lit: !!b.prop.lit, school: b.prop.school ?? null, cd: b.prop.cd ?? 0,
      charge: b.prop.charge ?? 0, blind: b.prop.blind ?? 0, aiming: !!b.prop.aim, ward: b.prop.ward ?? null, broken: !!b.prop.broken, open: b.prop.open ?? 0, black: !!b.prop.black, sown: !!b.prop.sown })); }, // (open: M4.9's sluice; black: M4.10's brazier; sown: M6's Seedfall)
    /** M4.2: whether the mage stands in a sapping obelisk's field (what the cantrip's blows are worth there). */
    get sap() { return sapMul(); },
    /** M4.2: the drinking wards: every vault's on the floor (sealed or not, how full, what it drank most, the vault's
        warden) and every warded foe's; `wardFoe(i)` wards the i-th foe. */
    get wards() {
      const seals = [...new Set(G.rooms.flatMap(r => r.doors.map(d => d.seal)).filter(s => !!s))];
      return { vaults: seals.map(s => ({ sealed: s.sealed, fill: fullness(s.drink), top: s.drink.total ? mostDrunk(s.drink) : null, guard: s.vault.waves?.[0]?.[0]?.kind ?? null })),
        foes: G.enemies.filter(e => e.ward && !e.dead).map(e => ({ type: e.type, fill: fullness(e.ward!.drink), top: mostDrunk(e.ward!.drink) })) };
    },
    wardFoe(i: number) { const e = G.enemies[i]; if (e) wardFoe(e); return !!e?.ward; },
    /** M4.2: the way the room's water runs (n, s, e, w or none) and how many waterfalls feed it. */
    get flow() { return { dir: G.current.flow ?? null, falls: G.current.falls?.length ?? 0 }; },
    /** M4.2: the Wandering Merchant rides into this room (`callWanderer()`), and whether the merchant is here, the wares out, and what. */
    callWanderer() { callWanderer(); }, get wanderer() { return wandererState(); },
    /** M4.2: the Pillar Dragon's pillars, whether it is on one, how high its head is, and whether the pillars it raised are up. */
    get dragon() { return dragonInfo(); },
    get kaelith() { return kaelithInfo(); }, get kaelithKnelt() { return kneltAt; }, kaelithToPhase, shutAllWards, // (M7 step 2: Kaelith's fight)
    get daylight() { return daylightInfo(); }, daylightNow: () => enterDaylight(), // (M7 step 3: a won run's dawn)
    get vigil() { return JSON.parse(JSON.stringify(vigil())); }, giveHome, wipeSave, veteranSave, exportSave, importSave, // (M7 step 4: the save)
    /** M7 step 5: the Vigil as a place: where the mage is in it, the candles, the lectern's screen and hands, the boat; wake
        there (for the first time: dark, its candle lighting), put a spell in a hand at the lectern, take the boat down. */
    get vigilPlace() { return { ...vigilInfo(), lectern: { ...('lectern' in vigilInfo() ? (vigilInfo() as { lectern: object }).lectern : {}), ...lecternNow() } }; },
    toVigil: (first = false) => wakeAtVigil(first), lecternChoose: (hand: number, id: string | null) => holdIn(hand, id), openLectern, closeLectern, takeBoat: () => board(),
    /** M4.2: Fen-Nex (its stage, where it is, whether it hunts), and growing it a stage. */
    get fennex() { return fennexInfo(); }, growFennex() { growFennex(); },
    /** Fire, frost or shock landing at (x, z), as a spell's would: lights braziers and candles, charges rune stones,
        sets lodestones leaping. */
    element: (kind: StatusKind | 'sanct' | 'hex', x = player.x, z = player.z - 1.5) => elementDev(kind, x, z),
    get spores() { return (G.current.spores ?? []).length; },
    /** Fire reaches (x, z) and `r` round it, as a burning bolt or a blast would: oil, roots, briars, webs, spores. */
    burn(x: number, z: number, r = 0) { fireAt(x, z, r); },
    /** The costume pieces the mage wears (a hood, from the Pilgrim's Cowl; an artifact's id for one carried at a spot),
        and the focus held in the casting hand (M4.6); try a piece on as if held, or take all off. */
    get costume() { return wornNow(); }, get costumeDetail() { return wornDetail(); }, get held() { return heldNow(); }, wear: (id: string) => tryOn(id), takeAllOff: () => takeAllOff(), closeUp: (on = true) => setCloseUp(on),
    /** The run's transformations (M4.6), the latest last; form one at once, or undo them all; the blink's rest; how far the
        robes are tinted. */
    get transforms() { return [...G.run.transforms]; }, transform: (id: TransformId) => formTransform(id), clearTransforms: () => clearTransforms(),
    /** M4.11 spell marks: what the slotted spells and the knowledge show on the mage; attune to a school (both its spells
        in the slots). */
    get spellMarks() { return marksNow(); }, attune: (school: School) => attuneTo(school),
    // M5: the potion belt (ids, the chosen one), what each potion is (known or not, its bottle), what a drink left on the
    // mage, what is in the air; give, use and choose as the keys do
    get belt() { return { ids: [...player.belt], at: player.beltAt, slots: beltSlots(), known: player.belt.map(id => knownPotion(id as PotionId)), reagents: { ...player.reagents }, html: document.getElementById('belt')?.innerHTML ?? '' }; },
    get potionFx() { return { ...potionFx, remedy: G.run.remedy, scale: hero.root.scale.x }; },
    get bottles() { return G.run.bottles; },
    get throws() { return throwsNow(); }, get flights() { return flightsNow(); },
    givePotion: (id: PotionId) => addPotion(id), giveReagent: (id: ReagentId, n = 1) => addReagent(id, n),
    usePotion: (how: 'drink' | 'throw') => usePotion(how), choosePotion: (d: number) => choosePotion(d),
    /** M6 step 9: the waystone in this room (where, how far risen, kindled, rested, its pair, the slot it carves into, and
        its screen), raised ahead of the mage (`raiseWaystone`, kindled at once), its screen opened or closed, the pair
        taken, a rune carved from the pouch or lifted out, Second Socket's socket opened, the belt reordered. */
    // M6 step 11: the shrine's bargain: its stone (state, school, runes' colour), its deal opened on a school, a card taken
    // (the heart paid), or backed out of
    get bargain() { return bargainNow(); }, set heartsPaid(n: number) { player.heartsPaid = n; refreshStats(); renderHearts(); }, openBargain: (s: School) => openBargainHere(s), takeBargain: (i = 0) => takeBargainCard(i), refuseBargain: () => levelEsc(),
    get waystone() { const w = G.current.waystone; return w ? { x: w.x, z: w.z, rise: w.rise, lit: w.lit, rested: w.rested, pair: w.pair && [...w.pair], target: w.target, screen: waystoneNow() } : null; },
    raiseWaystone: (x = player.x, z = player.z - 2.2) => { const w = raiseWaystone(G.current, x, z); w.rise = Math.max(w.rise, .999); return true; },
    openWaystone: (tab: StoneTab = 'runes', slot?: number) => openWaystone(tab, slot), closeWaystone: () => closeWaystone(),
    stoneTake: (i: number) => takeFromStone(i), stoneCarve: (slot: number, id: RuneId) => carveHere(id, slot), stoneLift: (slot: number, id: RuneId) => liftRune(slot, id),
    stoneSocket: (slot: number) => secondSocket(slot), moveInBelt: (from: number, to: number) => moveInBelt(from, to),
    reagentsAlways: (on: boolean) => { DEV.reagents = on; },
    /** M6 step 8: a rune wherever one can lie (`DEV.runes`; this floor built again, so a shop restocks), and the chance of
        each here (times the floor's `runes`). */
    runesAlways: (on: boolean) => { DEV.runes = on; rebuildFloor(); },
    get runeOdds() { return { merchant: runeOdds('merchant'), secret: runeOdds('secret'), wanderer: runeOdds('wanderer'), gilded: runeOdds('gilded') }; },
    // M5 step 6: Dr. Jelly's laboratory: the table's screen (open, tab, mortar), the room's table and Dr. Jelly, the recipes
    // known; open or close the table, brew two reagents at it, buy a recipe, have Dr. Jelly look at a potion
    get lab() { const l = G.current.lab; return { ...labNow(), here: !!l, table: l && { ...l.table }, jelly: l && { x: l.jelly.x, z: l.jelly.z }, identified: l?.identified ?? false, recipes: knownRecipes() }; },
    openLab: (t: LabTab = 'brew') => openLab(t), closeLab: () => closeLab(),
    // M5 step 7: the jelly serpent: its state, whether it is under, where, its trap, and the jelly in the room (tiles, frozen);
    // the vat's cracks and whether it is broken; crack the vat window as a bolt does, or let the serpent out at once
    get serpent() { const l = G.current.lab; return { ...serpentInfo(), run: G.run.serpent, restless: G.run.restless, cracks: l?.cracks ?? 0, broken: l?.broken ?? false }; },
    crackVat: () => crackVat(), breakVat: () => !!breakOut(), set restless(on: boolean) { G.run.restless = on; },
    /** Whether a trapdoor lies open on this floor (a floor's boss fell; the serpent out of its vat leaves none). */
    get trapdoor() { return !!G.trapdoor; },
    /** Where the trapdoor lies (world x, z) and the room it is in (M6 step 10: the waystone room's, or the boss room's). */
    get wayDown() { const t = G.trapdoor; return t && { x: t.x, z: t.z, kind: t.kind ?? 'trapdoor', room: G.rooms.find(r => t.x >= r.bounds.minX && t.x <= r.bounds.maxX && t.z >= r.bounds.minZ && t.z <= r.bounds.maxZ)?.type ?? null }; },
    /** The gamepads the browser reports (name, layout, buttons held, sticks), as the dev menu's Gamepads shows them. */
    get pads() { return padsNow(); },
    /** M4.12: the old and new looks side by side ahead of the mage (a floor's, or all), what each new look keeps of its old
        one (`lookContract`), and which looks the foes wear (`foeLooks`: approved, new or old). */
    lookPairs: (floor?: number, only?: string[]) => showLookPairs(G.current, player.x, player.z, floor, only), lookContract: () => lookContract(),
    get foeLooks() { return DEV.foeLooks; }, set foeLooks(m: FoeLooks) { DEV.foeLooks = m; },
    /** The ware whose panel shows over it (2026-10-02): its name, and whether he would refuse it now. */
    get warePanel() { return warePanelNow(); },
    /** The rooms the minimap marks finished (2026-10-02): been in, the fight won, nothing left to take. */
    get finished() { return G.rooms.filter(r => roomFinished(r)).map(r => r.plan.id); },
    brew: (a: ReagentId, b: ReagentId) => brewAtTable(a, b), buyRecipe: (id: PotionId) => buyRecipe(id), jellyIdentifies: (id: PotionId) => jellyIdentifies(id),
    identifyAll: () => { for (const id of POTION_IDS) identify(id); }, forgetPotions: () => { G.run.identified.length = 0; forgetBrews(); renderBelt(); },
    get blinkRest() { return blinkRest(); }, get robeTint() { return robeTint(); }, get moths() { return mothCount(); },
    /** Asyrion's arc (M4.6): the stage now, the artifacts that count, the stage reached this run; force a stage (or `undefined`
        for as held). */
    get arc() { return { stage: arcNow(), held: arcHeld(), reached: G.run.arc }; }, setArc: (n?: number) => { DEV.arc = n; dress(); },
  };
}

async function boot() {
  if (isTouch) document.body.classList.add('touch');
  applyStrings();
  resize(); window.addEventListener('resize', resize);
  initKeyboard(input); initTouch(canvas, input); initGamepad(text => toast(text, 5));
  initScreens({
    start: () => begin(), replay: () => startGame({ seed: G.run.seed }), resume, toggleSound,
    pauseIfPlaying: () => { if (G.state === 'play') pause(); },
  });
  initInventory({ resume }); initLab({ pause, resume }); initWaystone({ pause, resume }); initLectern({ pause, resume }); vigilActs.openLectern = openLectern;
  initLevelUp({ pause, resume, others: () => lecternOpen() || labOpen() || waystoneOpen() || inventoryOpen() || devOpen() || promptShowing() }); // (M6)
  // the chalk texture in the start room is drawn with Cinzel, so load its weights first
  const chalkFonts = Promise.all(['600 16px "Cinzel"', '700 16px "Cinzel"'].map(f => document.fonts.load(f)));
  const assets = loadAssets(); // (models, tiles and icons from data/assets.json: before the first floor is built)
  try { await Promise.race([chalkFonts, new Promise(r => setTimeout(r, 1500))]); } catch { /* draw with the fallback font */ }
  readUrlOptions();
  await assets;
  resetPlayer(); prepareTitle();
  await loadDefaultHero();
  showScreen('title');
  if (startsAtVigil()) document.getElementById('btnStart')!.textContent = STR.vigil.titleStart; // (M7 step 5: Start wakes the mage at the Vigil)
  startLoop(input);
  installDevHooks();
}

void boot();
