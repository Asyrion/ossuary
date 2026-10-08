import { G, player } from '../state';
import { enterDaylight } from '../world/daylight';
import { snagAt } from '../world/props';
import { CFG } from '../config';
import { blockers, collide } from '../world/collision';
import { DH } from '../world/dims';
import { SIDE_DIR } from '../world/shapes';
import { moveInput, pressed, shootDir } from '../input';
import { bloodMoon, spawnBolt } from '../combat/projectiles';
import { placeGlyph } from '../combat/glyphs';
import { castSpell } from '../magic/spells';
import { answerPage, checkPages } from '../magic/pages';
import { answerShade } from '../vigil/shades';
import { checkArtifactPickup } from '../items/artifacts';
import { checkWares } from '../items/merchant';
import { checkShrine } from '../world/shrine';
import { wadeAt } from '../world/pools';
import { slipAt, stickyAt } from './bestiaryGround';
import { checkVaultDoors } from '../world/vault';
import { descend, tryTransition } from '../flow';
import { blink, updateGifts } from '../items/gifts';
import { choosePotion, potionSpeedMul, usePotion } from '../items/potions';
import { checkLab } from '../world/laboratory';
import { checkWaystone } from '../world/waystone';
import { checkBargain } from '../world/bargain';
import { clamp, lerp } from '../util';

export function updatePlayer(dt: number) {
  const cur = G.current;
  const mv = moveInput();
  // gentle pull toward an open doorway when pushing into it, so corners don't snag
  for (const d of cur.doors) {
    if (!d.open) continue;
    const [dx, dz] = SIDE_DIR[d.side], ns = dx === 0;
    const out = (player.x - d.x) * dx + (player.z - d.z) * dz, along = ns ? player.x - d.x : player.z - d.z;
    if (mv.x * dx + mv.z * dz > .3 && out > -1 && Math.abs(along) < DH + .45) {
      if (ns) mv.x += clamp(-along * 2.2, -1, 1) * .8; else mv.z += clamp(-along * 2.2, -1, 1) * .8;
    }
  }
  const k = 1 - Math.exp(-(cur.theme?.twist === 'rime' ? CFG.mech.rimeGrip : slipAt(player.x, player.z) ? CFG.bestiary.rimeGrip : 14) * dt); // rime underfoot (the frozen mausoleum's, a rime snail's trail): the mage slides
  const st = player.stats, speed = st.speed * (st.effects.has('float') ? 1 : wadeAt(player.x, player.z)) * snagAt(player.x, player.z) * stickyAt(player.x, player.z) * (player.chill > 0 ? 1 - CFG.afflict.chillSlow : 1) * (player.stone > 0 ? CFG.bestiary.gazeSlow : 1) * potionSpeedMul(); // slower wading through water (unless floating: M4.6), or cobwebs, a spider's web or ink (M4.5), or chilled, or in a basilisk's stare; M5: quicker under the Frostbrew, slower as a giant
  player.vx = lerp(player.vx, mv.x * speed, k); player.vz = lerp(player.vz, mv.z * speed, k);
  if (Math.hypot(player.pull.x, player.pull.z) > CFG.afflict.drawnMin) player.drawn = CFG.afflict.drawnShow; // (shown beside the mana bar)
  const was = { x: player.x, z: player.z };
  player.x += (player.vx + player.pull.x) * dt; player.z += (player.vz + player.pull.z) * dt; player.pull.x = player.pull.z = 0; // (a lure's draw: spent each step)
  if (!Number.isFinite(player.x) || !Number.isFinite(player.z)) { player.x = was.x; player.z = was.z; player.vx = player.vz = 0; } // (a pull gone wrong never loses the mage)
  collide(player, blockers(cur, 'player', st.effects.has('pitWalker')));
  player.still = Math.hypot(player.vx, player.vz) < CFG.artifacts.still.speed ? player.still + dt : 0; // (the Twin Vigil Candles, the Salt Circle)
  if (tryTransition()) return;
  // shooting; spells go where the mage aims, or where they last aimed or walked
  const aim = shootDir();
  if (aim) player.aim = { ...aim };
  else if (Math.hypot(mv.x, mv.z) > .3) { const l = Math.hypot(mv.x, mv.z); player.aim = { x: mv.x / l, z: mv.z / l }; }
  player.fireCd -= dt;
  if (aim && player.fireCd <= 0) { spawnBolt(); player.fireCd = st.fireDelay * (bloodMoon() ? CFG.artifacts.bloodMoon.fireDelayMul : 1); } // (quicker in the Blood Moon's hour)
  if (pressed.glyph) { pressed.glyph = false; placeGlyph(); }
  if (pressed.blink) { pressed.blink = false; blink(mv); } // (M4.6: the Shadowstep's)
  updateGifts(dt);
  // a spell key answers a grimoire page's question, if one is asking; otherwise it casts
  for (const i of [0, 1]) if (pressed.spells[i]) { pressed.spells[i] = false; if (!answerShade(i) && !answerPage(i)) castSpell(i, aim); } // (M7 step 6: a loose shade's question first)
  // M5: the potion belt (a tap drinks the chosen potion, a hold throws it; another key chooses)
  if (pressed.nextPotion) { choosePotion(pressed.nextPotion); pressed.nextPotion = 0; }
  if (pressed.potion) { usePotion(pressed.potion); pressed.potion = null; }
  if (player.invuln > 0) player.invuln -= dt;
  if (player.dim > 0) player.dim = Math.max(0, player.dim - dt);
  if (player.chill > 0) player.chill = Math.max(0, player.chill - dt);
  if (player.stone > 0) player.stone = Math.max(0, player.stone - dt);
  if (player.hexed > 0) player.hexed = Math.max(0, player.hexed - dt);
  if (player.drawn > 0) player.drawn = Math.max(0, player.drawn - dt);
  // artifacts and the trapdoor down
  checkArtifactPickup(); checkWares(); checkPages(); checkVaultDoors(); checkShrine(); checkLab(); checkWaystone(); checkBargain(); // (M5: the alchemy table; M6: the waystone, the shrine's bargain)
  const trapdoor = G.trapdoor;
  if (trapdoor?.kind === 'shaft') { if (Math.hypot(player.x - trapdoor.x, player.z - trapdoor.z) < CFG.daylight.reach) enterDaylight(); } // (M7 step 3: into the daylight)
  else if (trapdoor && Math.hypot(player.x - trapdoor.x, player.z - trapdoor.z) < .55) descend();
}
