import { G, player } from '../state';
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
import { checkArtifactPickup } from '../items/artifacts';
import { checkWares } from '../items/merchant';
import { checkShrine } from '../world/shrine';
import { wadeAt } from '../world/pools';
import { slipAt, stickyAt } from './bestiaryGround';
import { checkVaultDoors } from '../world/vault';
import { descend, tryTransition } from '../flow';
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
  const st = player.stats, speed = st.speed * wadeAt(player.x, player.z) * snagAt(player.x, player.z) * stickyAt(player.x, player.z) * (player.chill > 0 ? 1 - CFG.afflict.chillSlow : 1) * (player.stone > 0 ? CFG.bestiary.gazeSlow : 1); // slower wading through water, or cobwebs, a spider's web or ink (M4.5), or chilled, or in a basilisk's stare
  player.vx = lerp(player.vx, mv.x * speed, k); player.vz = lerp(player.vz, mv.z * speed, k);
  player.x += (player.vx + player.pull.x) * dt; player.z += (player.vz + player.pull.z) * dt; player.pull.x = player.pull.z = 0; // (a lure's draw: spent each step)
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
  // a spell key answers a grimoire page's question, if one is asking; otherwise it casts
  for (const i of [0, 1]) if (pressed.spells[i]) { pressed.spells[i] = false; if (!answerPage(i)) castSpell(i, aim); }
  if (player.invuln > 0) player.invuln -= dt;
  if (player.dim > 0) player.dim = Math.max(0, player.dim - dt);
  if (player.chill > 0) player.chill = Math.max(0, player.chill - dt);
  if (player.stone > 0) player.stone = Math.max(0, player.stone - dt);
  // artifacts and the trapdoor down
  checkArtifactPickup(); checkWares(); checkPages(); checkVaultDoors(); checkShrine();
  const trapdoor = G.trapdoor;
  if (trapdoor && Math.hypot(player.x - trapdoor.x, player.z - trapdoor.z) < .55) descend();
}
