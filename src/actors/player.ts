import { G, player } from '../state';
import { blockers, collide } from '../world/collision';
import { DH } from '../world/dims';
import { SIDE_DIR } from '../world/shapes';
import { moveInput, pressed, shootDir } from '../input';
import { spawnBolt } from '../combat/projectiles';
import { placeGlyph } from '../combat/glyphs';
import { castSpell } from '../magic/spells';
import { answerPage, checkPages } from '../magic/pages';
import { checkArtifactPickup } from '../items/artifacts';
import { checkWares } from '../items/merchant';
import { checkShrine } from '../world/shrine';
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
  const k = 1 - Math.exp(-14 * dt);
  const st = player.stats;
  player.vx = lerp(player.vx, mv.x * st.speed, k); player.vz = lerp(player.vz, mv.z * st.speed, k);
  player.x += player.vx * dt; player.z += player.vz * dt;
  collide(player, blockers(cur, 'player', st.effects.has('pitWalker')));
  if (tryTransition()) return;
  // shooting; spells go where the mage aims, or where they last aimed or walked
  const aim = shootDir();
  if (aim) player.aim = { ...aim };
  else if (Math.hypot(mv.x, mv.z) > .3) { const l = Math.hypot(mv.x, mv.z); player.aim = { x: mv.x / l, z: mv.z / l }; }
  player.fireCd -= dt;
  if (aim && player.fireCd <= 0) { spawnBolt(); player.fireCd = st.fireDelay; }
  if (pressed.glyph) { pressed.glyph = false; placeGlyph(); }
  // a spell key answers a grimoire page's question, if one is asking; otherwise it casts
  for (const i of [0, 1]) if (pressed.spells[i]) { pressed.spells[i] = false; if (!answerPage(i)) castSpell(i, aim); }
  if (player.invuln > 0) player.invuln -= dt;
  // artifacts and the trapdoor down
  checkArtifactPickup(); checkWares(); checkPages(); checkVaultDoors(); checkShrine();
  const trapdoor = G.trapdoor;
  if (trapdoor && Math.hypot(player.x - trapdoor.x, player.z - trapdoor.z) < .55) descend();
}
