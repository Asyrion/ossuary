/* Fixed-step game loop: the simulation always advances in 1/60 s steps; a frame never feeds it more than
   1/30 s, so a long hitch slows the game down instead of teleporting it. */
import { G, player, updateTimers } from './state';
import { updateTorchLights } from './render/lights';
import { updateRoomFx } from './world/rooms';
import { heroVisual } from './actors/hero';
import { updatePlayer } from './actors/player';
import { updateEnemies } from './actors/enemies';
import { updateBolts, updateShots } from './combat/projectiles';
import { updateGlyphs } from './combat/glyphs';
import { updateParticles } from './combat/fx';
import { updatePickups, updateTrapdoor } from './items/pickups';
import { updateArtifacts } from './items/artifacts';
import { updateShop } from './items/merchant';
import { updateVaultSeals } from './world/vault';
import { updateSecretWalls } from './world/secret';
import { pollGamepad, type InputActions } from './input';
import { updateHud, updateVision } from './ui/hud';
import { ease, lerp } from './util';
import { camTarget, cameraTargetFor, draw, setViewScale } from './render/renderer';
import { checkAmbush, enterRoom } from './flow';

export const STEP = 1 / 60;
const MAX_FRAME = 1 / 30;

let inputActions: InputActions;
let last = 0, acc = 0;

export function resetClock() { last = performance.now(); acc = 0; }

/** Advance the game by one fixed step. */
export function step(dt: number) {
  G.simClock += dt; const now = G.simClock;
  pollGamepad(inputActions);
  if (G.state === 'play' || G.state === 'dying') {
    updateTimers(dt);
    const tr = G.trans;
    if (tr) {
      tr.t += dt; const k = ease(Math.min(1, tr.t / tr.dur));
      player.x = lerp(tr.fx, tr.tx, k); player.z = lerp(tr.fz, tr.tz, k);
      camTarget.x = lerp(tr.cfx, tr.ctx, k); camTarget.z = lerp(tr.cfz, tr.ctz, k); setViewScale(lerp(tr.vf, tr.vt, k));
      if (tr.t >= tr.dur) { G.trans = null; player.vx *= .5; player.vz *= .5; enterRoom(tr.nb); }
    } else if (G.state === 'play') {
      G.stats.time += dt;
      updatePlayer(dt); checkAmbush(); updateEnemies(dt); updateBolts(dt); updateShots(dt); updateGlyphs(dt); updatePickups(dt);
      // in rooms larger than the view the camera follows the mage, stopping at the walls
      const t = cameraTargetFor(G.current, player.x, player.z), k = 1 - Math.exp(-8 * dt);
      camTarget.x += (t.x - camTarget.x) * k; camTarget.z += (t.z - camTarget.z) * k;
    } else updateEnemies(0);
  }
  updateParticles(dt); updateWorldFx(dt, now); heroVisual(dt, now);
}

function updateWorldFx(dt: number, now: number) {
  updateRoomFx(dt, now); updateArtifacts(now); updateTrapdoor(dt); updateShop(now); updateVaultSeals(dt, now); updateSecretWalls(dt, now);
  const tf = .92 + Math.sin(now * 13) * .05 + Math.sin(now * 23) * .04;
  updateTorchLights(G.current.torches, player.x, player.z, dt, tf);
  G.shake = Math.max(0, G.shake - dt * 1.4);
  updateHud(dt);
}

function frame(nowMs: number) {
  requestAnimationFrame(frame);
  if (window.__manual) { last = nowMs; return; }
  acc += Math.min(MAX_FRAME, (nowMs - last) / 1000); last = nowMs;
  // small tolerance so rAF jitter at 60 Hz doesn't alternate between 0 and 2 steps
  while (acc >= STEP - 1e-3) { step(STEP); acc -= STEP; }
  draw(); updateVision();
}

export function startLoop(actions: InputActions) {
  inputActions = actions;
  requestAnimationFrame(t => { last = t; frame(t); });
}

declare global { interface Window { __manual?: boolean; __game?: unknown } }
