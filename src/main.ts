/* Boot: wire input and UI, build the floor, load the hero, start the loop, open the dev door (src/dev/). */
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
import { G } from './state';
import { closeDevMenu, devMenuOpen, toggleDevMenu } from './devDoor';
import { applyStrings } from './strings';
import { Sfx } from './audio/sfx';
import { canvas, resize } from './render/renderer';
import './render/lights';
import { fallbackHero, hero, loadHeroBuffer, setHero } from './actors/hero';
import { initGamepad, initKeyboard, initTouch, type InputActions } from './input';
import { initScreens, showScreen } from './ui/screens';
import {
  closeInventory,
  initInventory,
  inventoryKey,
  inventoryOpen,
  inventoryPad,
  openInventory,
} from './ui/inventory';
import { closeLab, initLab, labKey, labOpen, labPad, openLab } from './ui/alchemyTable';
import { closeWaystone, initWaystone, openWaystone, stoneKey, stonePad, waystoneOpen } from './ui/waystone';
import { initHud, promptShowing, setHeroInfo, toast, updateHud, updateVision } from './ui/hud';
import { hideWarePanel, updateWarePanel } from './ui/warePanel';
import { initAfflictions, updateAfflictions } from './ui/afflictions';
import { initLore, updateLore } from './ui/lore';
import { initBelt } from './ui/belt';
import { initInsightHud } from './ui/insightHud';
import { initVigilHud, renderVigilHud } from './ui/vigilHud';
import { initDawn } from './ui/dawn';
import { askPage, hidePagePanel, initPagePanel, updatePagePanel } from './ui/pagePanel';
import { registerPanels } from './panels';
import { initLevelUp, levelEsc, levelKey, levelOpen, levelPad, openBargainDeal, openLevelUp } from './ui/levelUp';
import {
  begin,
  pause,
  prepareTitle,
  resetPlayer,
  resume,
  addToNextRun,
  startGame,
  startsAtVigil,
  toggleSound,
} from './flow';
import { STR } from './strings';
import { closeLectern, initLectern, lecternKey, lecternOpen, lecternPad, openLectern } from './ui/lectern';
import { vigilActs, vigilUi } from './vigil/place';
import { actOn, offersFor } from './vigil/gifts';
import { closeTalk, initTalk, openTalk, talkKey, talkOpen, talkPad, updateTalk } from './ui/talk';
import { startLoop, uiHooks } from './loop';
import { cleanSeed } from './rng';
import { isTouch } from './util';
import { loadAssets } from './assets/models';

const HERO_URL = `${import.meta.env.BASE_URL}assets/hero_default.glb`;

const input: InputActions = {
  unlockAudio: () => Sfx.init(),
  togglePause: () => {
    if (devMenuOpen()) closeDevMenu();
    else if (talkOpen()) closeTalk();
    else if (lecternOpen()) closeLectern();
    else if (levelOpen()) levelEsc();
    else if (labOpen()) closeLab();
    else if (waystoneOpen()) closeWaystone();
    else if (inventoryOpen()) closeInventory();
    else if (G.flow.state === 'play') pause();
    else if (G.flow.state === 'pause') resume();
  },
  confirm: () => {
    if (G.flow.state === 'title' || G.flow.state === 'end') begin();
  }, // (to the Vigil once a run has been played)
  startButton: () => {
    if (devMenuOpen()) closeDevMenu();
    else if (talkOpen()) closeTalk();
    else if (lecternOpen()) closeLectern();
    else if (levelOpen()) levelEsc();
    else if (labOpen()) closeLab();
    else if (waystoneOpen()) closeWaystone();
    else if (inventoryOpen()) closeInventory();
    else if (G.flow.state === 'play') pause();
    else if (G.flow.state === 'pause') resume();
    else begin();
  },
  toggleSound,
  autoPause: () => {
    if (G.flow.state === 'play') pause();
  },
  toggleDev: () => {
    if (inventoryOpen()) closeInventory();
    toggleDevMenu();
  },
  inventoryKey: (code) => {
    if (devMenuOpen()) return false;
    if (talkOpen()) return talkKey(code); // (a townsperson's talk)
    if (lecternOpen()) return lecternKey(code); // (the Vigil's lectern)
    if (levelOpen()) return levelKey(code); // (the level-up screen's choice waits)
    if (labOpen()) return labKey(code); // (the alchemy table takes its keys first)
    if (waystoneOpen()) return stoneKey(code); // (the waystone's screen, the same)
    const used = inventoryKey(code, G.flow.state === 'play');
    if (used === 'open') {
      pause();
      openInventory('play');
      return true;
    }
    if (!used && code === 'KeyI' && G.flow.state === 'pause') {
      openInventory('pause');
      return true;
    } // from the pause menu
    return used;
  },
  padButton: (i) => {
    if (devMenuOpen()) return false;
    if (talkOpen()) return talkPad(i);
    if (lecternOpen()) return lecternPad(i);
    if (levelOpen()) return levelPad(i);
    if (labOpen()) return labPad(i);
    if (waystoneOpen()) return stonePad(i);
    if (inventoryOpen()) return inventoryPad(i);
    if (i !== 8) return false; // View opens the inventory, while playing or paused
    if (G.flow.state === 'play') {
      pause();
      openInventory('play');
      return true;
    }
    if (G.flow.state === 'pause') {
      openInventory('pause');
      return true;
    }
    return false;
  },
  playing: () => G.flow.state === 'play',
};

async function loadDefaultHero() {
  try {
    const res = await fetch(HERO_URL);
    if (!res.ok) throw new Error(`${HERO_URL}: HTTP ${res.status}`);
    await loadHeroBuffer(await res.arrayBuffer(), 'hero_default.glb');
  } catch (e) {
    console.error(e);
    setHero(fallbackHero(), { animations: [] }, 'fallback');
  }
  setHeroInfo(hero.info);
}

/** ?seed=K3F9QX replays a run's floors: the game's own option; the rest of the address is dev code's (dev/urlOptions.ts). */
function readSeed() {
  const seed = new URLSearchParams(location.search).get('seed');
  if (seed) addToNextRun({ seed: cleanSeed(seed) });
}

/** The dev code (src/dev/: the dev menu, `window.__game`, the galleries), in its own chunk and reached only through the
    door (devDoor.ts). If it fails to load, the game runs without it. */
function loadDev() {
  return import('./dev').catch((e: unknown) => {
    console.error('The dev code failed to load; the game runs without it.', e);
    return null;
  });
}

/** The UI hears the game: its listeners on the event bus (events.ts), its panels on the panel door (panels.ts), and its
    per-step and per-frame work in the loop's and the Vigil's hook slots. */
function wireUi() {
  initHud();
  initLore();
  initPagePanel();
  initBelt();
  initInsightHud();
  initVigilHud();
  initDawn();
  initAfflictions();
  registerPanels({
    openLab,
    closeLab,
    openWaystone,
    openBargain: openBargainDeal,
    openTalk,
    closeTalk,
    openLevelUp,
    askPage,
    otherScreenUp: () =>
      talkOpen() || lecternOpen() || labOpen() || waystoneOpen() || inventoryOpen() || devMenuOpen() || promptShowing(),
  });
  uiHooks.panels = (page, live) => {
    if (live) updatePagePanel(page);
    else hidePagePanel();
    if (live) updateWarePanel();
    else hideWarePanel();
  };
  uiHooks.endOfStep = (dt) => {
    updateHud(dt);
    updateAfflictions();
    updateLore(dt);
  };
  uiHooks.afterDraw = updateVision;
  vigilUi.step = (dt) => {
    renderVigilHud();
    updateTalk(dt);
  };
}

async function boot() {
  const dev = loadDev(); // (loading beside the fonts and assets)
  wireUi(); // (before anything happens: the UI hears the game from the first event)
  if (isTouch) document.body.classList.add('touch');
  applyStrings();
  resize();
  window.addEventListener('resize', resize);
  initKeyboard(input);
  initTouch(canvas, input);
  initGamepad((text) => toast(text, 5));
  initScreens({
    start: () => begin(),
    replay: () => startGame({ seed: G.run.seed }),
    resume,
    toggleSound,
    pauseIfPlaying: () => {
      if (G.flow.state === 'play') pause();
    },
  });
  initInventory({ resume });
  initLab({ pause, resume });
  initWaystone({ pause, resume });
  initLectern({ pause, resume });
  vigilActs.openLectern = openLectern;
  initTalk({ pause, resume, offers: offersFor, act: actOn });
  initLevelUp({ pause, resume });
  // the chalk texture in the start room is drawn with Cinzel, so load its weights first
  const chalkFonts = Promise.all(['600 16px "Cinzel"', '700 16px "Cinzel"'].map((f) => document.fonts.load(f)));
  const assets = loadAssets(); // (models, tiles and icons from data/assets.json: before the first floor is built)
  try {
    await Promise.race([chalkFonts, new Promise((r) => setTimeout(r, 1500))]);
  } catch {
    /* draw with the fallback font */
  }
  readSeed();
  (await dev)?.applyUrlOptions(); // (before the game reads them: the player reset, the next run)
  await assets;
  resetPlayer();
  prepareTitle();
  await loadDefaultHero();
  showScreen('title');
  if (startsAtVigil()) document.getElementById('btnStart')!.textContent = STR.vigil.titleStart; // (Start wakes the mage at the Vigil)
  startLoop(input);
  (await dev)?.install(); // (window.__game once the title is up and the hero loaded, as the browser tests expect)
}

void boot();
