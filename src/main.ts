/* Boot: wire input and UI, build the floor, load the hero, start the loop, expose dev hooks. */
// fonts are bundled with the game (Fontsource), so starting it makes no requests to Google
import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/im-fell-english-sc/400.css';
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
import { setHeroInfo } from './ui/hud';
import { descend, pause, prepareTitle, resetPlayer, resume, setNextRun, startGame, toggleSound, warp } from './flow';
import { STEP, startLoop, step } from './loop';
import { cleanSeed } from './rng';
import { planToText } from './world/generate';
import { TEMPLATES } from './world/templates';
import { isTouch } from './util';

const HERO_URL = `${import.meta.env.BASE_URL}assets/hero_default.glb`;

const input: InputActions = {
  unlockAudio: () => Sfx.init(),
  togglePause: () => { if (G.state === 'play') pause(); else if (G.state === 'pause') resume(); },
  confirm: () => { if (G.state === 'title' || G.state === 'end') startGame(); },
  startButton: () => { if (G.state === 'play') pause(); else if (G.state === 'pause') resume(); else startGame(); },
  toggleSound,
  autoPause: () => { if (G.state === 'play') pause(); },
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
    ?room=<template id> plays one room template (for reviewing templates). */
function readUrlOptions() {
  const q = new URLSearchParams(location.search);
  const seed = q.get('seed'), floor = Number(q.get('floor')), room = q.get('room');
  if (room && !TEMPLATES.has(room)) console.warn(`?room=${room}: no such template. Known: ${[...TEMPLATES.keys()].join(', ')}`);
  setNextRun({
    seed: seed ? cleanSeed(seed) : undefined,
    floor: floor >= 1 ? floor - 1 : undefined,
    testTemplate: room && TEMPLATES.has(room) ? room : undefined,
  });
}

/** Dev and test hooks. Kept in production builds so the deployed site can be tested too. */
function installDevHooks() {
  window.__game = {
    get state() { return G.state; }, player, get enemies() { return G.enemies; }, get current() { return G.current; },
    get seed() { return G.run.seed; }, get floor() { return G.run.floor; },
    rooms: () => G.rooms, startGame, hero, camera, keys, arrowOrder, warp, descend,
    /** The current floor as text: S start, B boss, T treasure, # normal, @ you. */
    map() { return G.run.plan ? planToText(G.run.plan, G.current.plan.id) : ''; },
    /** Run the simulation for `sec` seconds in fixed steps; optionally render once afterwards. */
    sim(sec: number, render = false) { for (let t = 0; t < sec; t += STEP) step(STEP); if (render) draw(); },
    draw,
  };
}

async function boot() {
  if (isTouch) document.body.classList.add('touch');
  applyStrings();
  resize(); window.addEventListener('resize', resize);
  initKeyboard(input); initTouch(canvas, input);
  initScreens({ start: startGame, resume, toggleSound, pauseIfPlaying: () => { if (G.state === 'play') pause(); } });
  // the chalk texture in the start room is drawn with IM Fell English, so load both styles first
  const chalkFonts = Promise.all(['16px "IM Fell English"', 'italic 16px "IM Fell English"'].map(f => document.fonts.load(f)));
  try { await Promise.race([chalkFonts, new Promise(r => setTimeout(r, 1500))]); } catch { /* draw with the fallback font */ }
  readUrlOptions();
  resetPlayer(); prepareTitle();
  await loadDefaultHero();
  showScreen('title');
  startLoop(input);
  installDevHooks();
}

void boot();
