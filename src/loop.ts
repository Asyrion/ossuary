/* Fixed-step game loop: the simulation always advances in 1/60 s steps; a frame never feeds it more than
   1/30 s, so a long hitch slows the game down instead of teleporting it. */
import { G, player, updateTimers } from './state';
import { updateProps } from './world/props';
import { updateThemes } from './world/themes';
import { updateMechanisms } from './world/mechanisms';
import { updateWardShields } from './actors/wardShield';
import { updateTorchLights } from './render/lights';
import { updateRoomFx } from './world/rooms';
import { heroVisual } from './actors/hero';
import { updatePlayer } from './actors/player';
import { Sfx } from './audio/sfx';
import { updateDaylight } from './world/daylight';
import { updateVigil } from './vigil/place';
import { updateShades } from './vigil/shades';
import { updateShadeHelp } from './vigil/shadeHelp';
import { updateAudio } from './audio/director';
import { updateEnemies } from './actors/enemies';
import { updateBolts, updateShots } from './combat/projectiles';
import { updateGlyphs } from './combat/glyphs';
import { updateParticles } from './combat/fx';
import { updatePickups, updateTrapdoor } from './items/pickups';
import { updateArtifacts } from './items/artifacts';
import { updateShop } from './items/merchant';
import { updateWanderer } from './items/wanderer';
import { hidePagePanel, updatePagePanel, updatePages } from './magic/pages';
import { updatePools } from './world/pools';
import { updateSteam } from './magic/steam';
import { updateVaultSeals } from './world/vault';
import { updateSecretWalls } from './world/secret';
import { updateShrine } from './world/shrine';
import { updateMagic } from './magic/spells';
import { updateStatusFx, updateStatuses } from './magic/statusFx';
import { updateFamiliars } from './combat/familiars';
import { pollGamepad, type InputActions } from './input';
import { updateHud, updateVision } from './ui/hud';
import { devFrame, devStep } from './devDoor';
import { hideWarePanel, updateWarePanel } from './ui/warePanel';
import { updateAfflictions } from './ui/afflictions';
import { updateLore } from './ui/lore';
import { ease, lerp } from './util';
import { camTarget, cameraTargetFor, draw, setViewScale } from './render/renderer';
import { checkAmbush, enterRoom } from './flow';
import { updateMantles } from './actors/mantles';
import { updatePotions } from './items/potions';
import { updateThrows } from './items/potionThrow';
import { updateLab } from './world/laboratory';
import { updateWaystone } from './world/waystone';
import { updateInsight } from './progression/insight';
import { checkLevelUp } from './ui/levelUp';

export const STEP = 1 / 60;
const MAX_FRAME = 1 / 30;

let inputActions: InputActions;
let last = 0,
  acc = 0;

export function resetClock() {
  last = performance.now();
  acc = 0;
}

/** Advance the game by one fixed step. */
export function step(dt: number) {
  G.simClock += dt;
  const now = G.simClock;
  pollGamepad(inputActions);
  if (G.state === 'play' || G.state === 'dying') {
    updateTimers(dt);
    const tr = G.trans;
    if (tr) {
      tr.t += dt;
      const k = ease(Math.min(1, tr.t / tr.dur));
      player.x = lerp(tr.fx, tr.tx, k);
      player.z = lerp(tr.fz, tr.tz, k);
      camTarget.x = lerp(tr.cfx, tr.ctx, k);
      camTarget.z = lerp(tr.cfz, tr.ctz, k);
      setViewScale(lerp(tr.vf, tr.vt, k));
      if (tr.t >= tr.dur) {
        G.trans = null;
        player.vx *= 0.5;
        player.vz *= 0.5;
        enterRoom(tr.nb);
      }
    } else if (G.state === 'play') {
      G.stats.time += dt;
      updatePlayer(dt);
      checkAmbush();
      updateEnemies(dt);
      updateMantles(dt);
      updateStatuses(dt, now);
      updateBolts(dt);
      updateShots(dt);
      updateGlyphs(dt);
      updatePickups(dt);
      updatePotions(dt);
      updateThrows(dt);
      checkLevelUp(dt); // (M6: a level waiting opens its screen once the fight is won)
      // in rooms larger than the view the camera follows the mage, stopping at the walls
      const t = cameraTargetFor(G.current, player.x, player.z),
        k = 1 - Math.exp(-8 * dt);
      camTarget.x += (t.x - camTarget.x) * k;
      camTarget.z += (t.z - camTarget.z) * k;
    } else updateEnemies(0);
  }
  updateDaylight(dt); // (M7 step 3: the cave mouth at dawn, and the shaft's dust before it)
  if (!G.trans) updateVigil(dt); // (M7 step 5: the Vigil's lectern, boat and barred ways)
  updateShades(dt); // (M7 step 6: a chained shade comes forth, asks, and goes)
  Sfx.listen(player.x, player.z); // effects are heard from just above the mage
  updateParticles(dt);
  updateWorldFx(dt, now);
  heroVisual(dt, now);
}

function updateWorldFx(dt: number, now: number) {
  updateRoomFx(dt, now);
  updateLab(now);
  updateWaystone(dt);
  updateArtifacts(now);
  updateTrapdoor(dt);
  updateShop(now);
  updateWanderer(now, dt);
  updatePages(dt, now);
  updateVaultSeals(dt, now);
  updateSecretWalls(dt, now);
  if (G.state === 'play' && !G.trans) updatePagePanel();
  else hidePagePanel(); // a spell's panel over the page near the mage (M3.7)
  if (G.state === 'play' && !G.trans) updateWarePanel();
  else hideWarePanel(); // what a ware near the mage is, before it is bought (2026-10-02)
  updateFamiliars(dt, now, G.state === 'play' && !G.trans);
  updateShadeHelp(dt, now, G.state === 'play' && !G.trans); // (M7 step 6: the bound shades walking with the mage)
  updateShrine(dt, now, G.state === 'play' && !G.trans);
  updateMagic(dt, G.state === 'play' && !G.trans);
  updateStatusFx(dt);
  updatePools(dt, now, G.state === 'play' && !G.trans);
  updateSteam(G.state === 'play' ? dt : 0);
  if (G.state === 'play' && !G.trans) {
    updateProps(dt);
    updateThemes(dt);
    updateMechanisms(dt);
    updateWardShields(G.simClock);
  } // burning, briars, spores; sleepers, rising bones; bells, runes, censers
  devStep(dt, G.current, G.state === 'play' && !G.trans); // (the dev galleries, when dev code stood any)
  const tf = 0.92 + Math.sin(now * 13) * 0.05 + Math.sin(now * 23) * 0.04;
  updateTorchLights(G.current.torches, player.x, player.z, dt, tf);
  G.shake = Math.max(0, G.shake - dt * 1.4);
  updateInsight(G.state === 'play' ? dt : 0); // (M6: insight's streaks run to the hand)
  updateHud(dt);
  updateAfflictions();
  updateLore(dt); // (what is being done to the mage, beside the mana bar)
  updateAudio(); // (the soundscapes and the music: what the game is doing chooses them)
}

function frame(nowMs: number) {
  requestAnimationFrame(frame);
  if (window.__manual) {
    last = nowMs;
    return;
  }
  devFrame(nowMs - last); // (the dev menu's frame readout)
  acc += Math.min(MAX_FRAME, (nowMs - last) / 1000);
  last = nowMs;
  // small tolerance so rAF jitter at 60 Hz doesn't alternate between 0 and 2 steps
  while (acc >= STEP - 1e-3) {
    step(STEP);
    acc -= STEP;
  }
  draw();
  updateVision();
}

export function startLoop(actions: InputActions) {
  inputActions = actions;
  requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });
}

declare global {
  interface Window {
    __manual?: boolean;
    __game?: unknown;
  }
}
