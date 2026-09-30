/* Boot: wire input and UI, build the floor, load the hero, start the loop, expose dev hooks. */
// fonts are bundled with the game (Fontsource), so starting it makes no requests to Google
import '@fontsource/cinzel/400.css';
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
import { camera, canvas, draw, renderer, resize } from './render/renderer';
import './render/lights';
import { fallbackHero, hero, loadHeroBuffer, setHero } from './actors/hero';
import { arrowOrder, initKeyboard, initTouch, keys, type InputActions } from './input';
import { initScreens, showScreen } from './ui/screens';
import { closeDev, devOpen, showAssetsHere, toggleDev, useAssets } from './ui/devMenu';
import { closeInventory, initInventory, inventoryKey, inventoryOpen, inventoryPad, openInventory } from './ui/inventory';
import { setHeroInfo, updateVision } from './ui/hud';
import { giveById } from './items/artifacts';
import { ARTIFACTS } from './items/artifactData';
import { clearRoom, descend, pause, prepareTitle, resetPlayer, resume, setNextRun, startGame, toggleSound, warp } from './flow';
import { STEP, startLoop, step } from './loop';
import { cleanSeed } from './rng';
import { VARIANTS, planToText, type RoomVariant } from './world/generate';
import { BOSS_TYPES, CFG, type BossType, type EnemyType } from './config';
import { DROPS, RESOURCES, type Drop, type Resource } from './items/loot';
import { giveResources, spawnPickup } from './items/pickups';
import { openSecretRoom } from './world/secret';
import { cleanseAtOnce, riteState } from './world/shrine';
import { SPELLS, type StatusKind } from './magic/spellData';
import { inflict } from './magic/statusFx';
import { makeEnemy } from './actors/enemies';
import { castSpell, learnSpell } from './magic/spells';
import { mantleLeft } from './magic/shapes';
import { lanceShowing } from './magic/lanceFx';
import { answerPage, dropPage, pagePanelSpell } from './magic/pages';
import { fireAt, poolsDo } from './world/pools';
import { spawnShot } from './combat/projectiles';
import { lightLevels } from './render/lights';
import { TEMPLATES } from './world/templates';
import { isTouch } from './util';
import { wornNow } from './actors/costume';
import { THEMES } from './world/themeData';
import { placeProp } from './world/props';
import { assetList, assetsOn, loadAssets } from './assets/models';
import { pixelLook, setPixelLook, type PixelLook } from './render/pixelLook';
import { removeModelOptions, showModelOptions } from './actors/modelOptions';
import { removeEffectOptions, showEffectOptions } from './magic/effectOptions';
import { elementDev } from './world/mechanisms';
import { forgetKnowledge, knowledgeNow, setStage } from './magic/memory';
import type { Stage } from './magic/knowledge';
import type { PropKind } from './world/propData';

const HERO_URL = `${import.meta.env.BASE_URL}assets/hero_default.glb`;

const input: InputActions = {
  unlockAudio: () => Sfx.init(),
  togglePause: () => { if (devOpen()) closeDev(); else if (inventoryOpen()) closeInventory(); else if (G.state === 'play') pause(); else if (G.state === 'pause') resume(); },
  confirm: () => { if (G.state === 'title' || G.state === 'end') startGame(); },
  startButton: () => { if (devOpen()) closeDev(); else if (inventoryOpen()) closeInventory(); else if (G.state === 'play') pause(); else if (G.state === 'pause') resume(); else startGame(); },
  toggleSound,
  autoPause: () => { if (G.state === 'play') pause(); },
  toggleDev: () => { if (inventoryOpen()) closeInventory(); toggleDev(); },
  inventoryKey: code => {
    if (devOpen()) return false;
    const used = inventoryKey(code, G.state === 'play');
    if (used === 'open') { pause(); openInventory('play'); return true; }
    if (!used && code === 'KeyI' && G.state === 'pause') { openInventory('pause'); return true; } // from the pause menu
    return used;
  },
  padButton: i => {
    if (devOpen()) return false;
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
    ?spells=arc starts with spells in the slots, ?theme=ossuary makes every fight one theme's. */
function readUrlOptions() {
  const q = new URLSearchParams(location.search);
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
  if (theme && !THEMES.has(theme)) console.warn(`?theme=${theme}: use one of ${[...THEMES.keys()].join(', ')}`);
  const give = (q.get('give') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const spells = (q.get('spells') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const badSpells = spells.filter(id => !SPELLS.has(id));
  if (badSpells.length) console.warn(`?spells: unknown ${badSpells.join(', ')}. Known: ${[...SPELLS.keys()].join(', ')}`);
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
    loot, spells: spells.filter(id => SPELLS.has(id)),
    theme: theme && THEMES.has(theme) ? theme : undefined,
  });
}

/** Dev and test hooks. Kept in production builds so the deployed site can be tested too. */
function installDevHooks() {
  window.__game = {
    get state() { return G.state; }, player, get enemies() { return G.enemies; }, get current() { return G.current; },
    get seed() { return G.run.seed; }, get floor() { return G.run.floor; }, get run() { return G.run; }, get bolts() { return G.bolts; },
    rooms: () => G.rooms, startGame, hero, camera, keys, arrowOrder, warp, descend, clearRoom,
    /** The current floor as text: S start, B boss, T treasure, # normal, @ you. */
    map() { return G.run.plan ? planToText(G.run.plan, G.current.plan.id) : ''; },
    /** Run the simulation for `sec` seconds in fixed steps; optionally render once afterwards. */
    sim(sec: number, render = false) { for (let t = 0; t < sec; t += STEP) step(STEP); if (render) { draw(); updateVision(); } },
    draw() { draw(); updateVision(); },
    /** The made assets (M3.5, data/assets.json): whether they are used, and each one's status; turn them on or off
        (this floor is built again to compare). */
    get assets() { return { on: assetsOn(), list: assetList().map(a => ({ ...a })) }; },
    useAssets: (on: boolean) => useAssets(on),
    /** The pixel look (a style test): rows of pixels (0 off), outlines, light in bands; set any of them. */
    get pixelLook() { return { ...pixelLook() }; },
    /** Enemy model options (looks only): stand them (or those named) ahead of the mage, a row per floor; returns where
        each stands; take them away again. */
    modelOptions: (ids?: string[]) => showModelOptions(G.current, player.x, player.z, ids),
    takeModelOptions: () => removeModelOptions(G.current),
    /** Spell effect options (looks only): play them (or those named) ahead of the mage; take them away again. */
    effectOptions: (ids?: string[]) => showEffectOptions(G.current, player.x, player.z, ids),
    takeEffectOptions: () => removeEffectOptions(G.current),
    setPixelLook: (change: Partial<PixelLook>) => setPixelLook(change),
    /** Ahead of the mage: a plain and a sealed urn, and an artifact on a pedestal (one with a made model if any). */
    showAssets: () => showAssetsHere(),
    /** What the last frame cost the GPU (draw calls, triangles) and what is held in memory (geometries, textures). */
    renderInfo: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }),
    lightLevels,
    /** Give the mage artifacts by id, e.g. give('bone_lens', 'twin_staff'). */
    give: (...ids: string[]) => giveById(ids),
    /** Hand out obols, keys or glyphs, e.g. loot({ glyphs: 3 }). */
    loot: (v: Partial<Record<Resource, number>>) => giveResources(v),
    /** Drop a pickup (halfHeart, heart, coin, purse, key, glyph, mana, coffer, chest) at (x, z), or just ahead of
        the mage; a chest is plain unless `gilded` is set; `asLoot` drops it as loot would (a mana vial turns into an
        obol while the mage knows no spell). */
    drop(kind: Drop, x = player.x, z = player.z - 1.5, opts: { gilded?: boolean; asLoot?: boolean } = {}) {
      if (!DROPS.includes(kind)) throw new Error(`drop: use one of ${DROPS.join(', ')}`);
      spawnPickup(kind, x, z, { gilded: opts.gilded ?? false, asIs: !opts.asLoot });
    },
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
    /** The spell whose panel shows over a page near the mage, and the panel's text. */
    get pagePanel() { return { spell: pagePanelSpell(), text: document.getElementById('pagePanel')?.classList.contains('on') ? document.getElementById('pagePanel')!.textContent : '' }; },
    /** Spawn a foe (e.g. 'dummy', the training dummy) at (x, z), or ahead of the mage; put statuses on every
        foe in the room, e.g. inflict({ burn: 3 }). */
    spawn(kind: EnemyType, x = player.x, z = player.z - 2.5) { return makeEnemy(kind, x, z, 1); },
    inflict(status: Partial<Record<StatusKind, number>>) { for (const e of G.enemies) inflict(e, status); },
    /** Fire a foe's shot from (x, z) along (dx, dz), as a wisp would (a wall of ice stops it); seconds of the
        Static Mantle left. */
    shoot(x: number, z: number, dx: number, dz: number) { const l = Math.hypot(dx, dz) || 1; spawnShot(x, z, dx / l, dz / l, CFG.enemy.wisp.shotSpeed, 0xb784ff, .8); },
    get mantle() { return mantleLeft(); },
    /** The Cinder Lance's new look (a proof of concept): whether it shows now, and the switch back to the old beam. */
    get lanceFx() { return lanceShowing(); }, oldLance(on = true) { DEV.oldLance = on; },
    /** Drop a grimoire page (of `id`, or a spell the mage doesn't know) at (x, z) or ahead of the mage; the pages
        in the room; the spells given up this run. */
    page(id?: string, x = player.x, z = player.z - 1.5) { return dropPage(G.current, x, z, id)?.spell ?? null; },
    get pages() { return G.current.pages ?? []; }, get forgotten() { return G.run.forgotten; },
    /** The water and oil in the room: kind, state, its tiles' centres. */
    get pools() { return (G.current.pools ?? []).map(p => ({ kind: p.kind, state: p.state, t: p.t, tiles: p.tiles.map(t => ({ x: t.x, z: t.z })) })); },
    /** Set the room's oil alight, freeze its water, or shock it (as the dev menu does). */
    pool: (what: 'fire' | 'frost' | 'shock') => poolsDo(what),
    /** Cleanse the oldest curse held at once (no fight, no obols); the shrine's rite under way, if any. */
    cleanse: () => cleanseAtOnce(), get rite() { return riteState(); },
    get pickups() { return G.pickups; }, get glyphs() { return G.glyphs; }, get shots() { return G.shots; },
    /** Put one of the rooms' objects down at (x, z) (on free floor), e.g. prop('cask'); the objects in the room. */
    prop(kind: PropKind, x = player.x, z = player.z - 1.5) { return !!placeProp(kind, x, z); },
    get props() { return (G.current.props ?? []).map(b => ({ kind: b.prop.kind, x: b.x, z: b.z, burning: b.prop.burning, hits: b.prop.hits, lit: !!b.prop.lit, school: b.prop.school ?? null, cd: b.prop.cd ?? 0 })); },
    /** Fire, frost or shock landing at (x, z), as a spell's would: lights braziers and candles, charges rune stones,
        sets lodestones leaping. */
    element: (kind: StatusKind, x = player.x, z = player.z - 1.5) => elementDev(kind, x, z),
    get spores() { return (G.current.spores ?? []).length; },
    /** Fire reaches (x, z) and `r` round it, as a burning bolt or a blast would: oil, roots, briars, webs, spores. */
    burn(x: number, z: number, r = 0) { fireAt(x, z, r); },
    /** The costume pieces the mage wears (a hood, from the Pilgrim's Cowl). */
    get costume() { return wornNow(); },
  };
}

async function boot() {
  if (isTouch) document.body.classList.add('touch');
  applyStrings();
  resize(); window.addEventListener('resize', resize);
  initKeyboard(input); initTouch(canvas, input);
  initScreens({
    start: () => startGame(), replay: () => startGame({ seed: G.run.seed }), resume, toggleSound,
    pauseIfPlaying: () => { if (G.state === 'play') pause(); },
  });
  initInventory({ resume });
  // the chalk texture in the start room is drawn with Cinzel, so load its weights first
  const chalkFonts = Promise.all(['600 16px "Cinzel"', '700 16px "Cinzel"'].map(f => document.fonts.load(f)));
  const assets = loadAssets(); // (models, tiles and icons from data/assets.json: before the first floor is built)
  try { await Promise.race([chalkFonts, new Promise(r => setTimeout(r, 1500))]); } catch { /* draw with the fallback font */ }
  readUrlOptions();
  await assets;
  resetPlayer(); prepareTitle();
  await loadDefaultHero();
  showScreen('title');
  startLoop(input);
  installDevHooks();
}

void boot();
