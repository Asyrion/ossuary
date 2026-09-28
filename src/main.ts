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
import { G, player } from './state';
import { applyStrings } from './strings';
import { Sfx } from './audio/sfx';
import { camera, canvas, draw, resize } from './render/renderer';
import './render/lights';
import { fallbackHero, hero, loadHeroBuffer, setHero } from './actors/hero';
import { arrowOrder, initKeyboard, initTouch, keys, type InputActions } from './input';
import { initScreens, showScreen } from './ui/screens';
import { closeDev, devOpen, toggleDev } from './ui/devMenu';
import { setHeroInfo, updateVision } from './ui/hud';
import { giveById } from './items/artifacts';
import { ARTIFACTS } from './items/artifactData';
import { clearRoom, descend, pause, prepareTitle, resetPlayer, resume, setNextRun, startGame, toggleSound, warp } from './flow';
import { STEP, startLoop, step } from './loop';
import { cleanSeed } from './rng';
import { VARIANTS, planToText, type RoomVariant } from './world/generate';
import { BOSS_TYPES, type BossType } from './config';
import { DROPS, RESOURCES, type Drop, type Resource } from './items/loot';
import { giveResources, spawnPickup } from './items/pickups';
import { openSecretRoom } from './world/secret';
import { lightLevels } from './render/lights';
import { TEMPLATES } from './world/templates';
import { isTouch } from './util';

const HERO_URL = `${import.meta.env.BASE_URL}assets/hero_default.glb`;

const input: InputActions = {
  unlockAudio: () => Sfx.init(),
  togglePause: () => { if (devOpen()) closeDev(); else if (G.state === 'play') pause(); else if (G.state === 'pause') resume(); },
  confirm: () => { if (G.state === 'title' || G.state === 'end') startGame(); },
  startButton: () => { if (devOpen()) closeDev(); else if (G.state === 'play') pause(); else if (G.state === 'pause') resume(); else startGame(); },
  toggleSound,
  autoPause: () => { if (G.state === 'play') pause(); },
  toggleDev,
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
    artifacts, ?boss=pyre picks every floor's boss, ?loot=coins:20,glyphs:5 hands out obols, keys and glyphs. */
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
  const give = (q.get('give') ?? '').split(',').map(s => s.trim()).filter(Boolean);
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
    loot,
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
    lightLevels,
    /** Give the mage artifacts by id, e.g. give('bone_lens', 'twin_staff'). */
    give: (...ids: string[]) => giveById(ids),
    /** Hand out obols, keys or glyphs, e.g. loot({ glyphs: 3 }). */
    loot: (v: Partial<Record<Resource, number>>) => giveResources(v),
    /** Drop a pickup (halfHeart, heart, coin, purse, key, glyph, coffer, chest) at (x, z), or just ahead of
        the mage; a chest is plain unless `gilded` is set. */
    drop(kind: Drop, x = player.x, z = player.z - 1.5, opts: { gilded?: boolean } = {}) {
      if (!DROPS.includes(kind)) throw new Error(`drop: use one of ${DROPS.join(', ')}`);
      spawnPickup(kind, x, z, { gilded: opts.gilded ?? false });
    },
    /** Break open every cracked wall of this floor's secret room. */
    openSecret() { const r = G.rooms.find(x => x.type === 'secret'); if (r) openSecretRoom(r); return !!r; },
    get pickups() { return G.pickups; }, get glyphs() { return G.glyphs; }, get shots() { return G.shots; },
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
  // the chalk texture in the start room is drawn with Cinzel, so load its weights first
  const chalkFonts = Promise.all(['600 16px "Cinzel"', '700 16px "Cinzel"'].map(f => document.fonts.load(f)));
  try { await Promise.race([chalkFonts, new Promise(r => setTimeout(r, 1500))]); } catch { /* draw with the fallback font */ }
  readUrlOptions();
  resetPlayer(); prepareTitle();
  await loadDefaultHero();
  showScreen('title');
  startLoop(input);
  installDevHooks();
}

void boot();
