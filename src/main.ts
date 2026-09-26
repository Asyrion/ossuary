/* Boot: wire input and UI, build the floor, load the hero, start the loop, expose dev hooks. */
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
import { buildFloor, pause, resetPlayer, resume, startGame, toggleSound, warp } from './flow';
import { STEP, startLoop, step } from './loop';
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

/** Dev and test hooks. Kept in production builds so the game can be poked at on a phone. */
function installDevHooks() {
  window.__game = {
    get state() { return G.state; }, player, get enemies() { return G.enemies; }, get current() { return G.current; },
    rooms: () => G.rooms, startGame, hero, camera, keys, arrowOrder, warp,
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
  // the chalk texture in the start room uses the IM Fell font, so give it a moment to arrive
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]); } catch { /* ignore */ }
  resetPlayer(); buildFloor();
  await loadDefaultHero();
  showScreen('title');
  startLoop(input);
  installDevHooks();
}

void boot();
