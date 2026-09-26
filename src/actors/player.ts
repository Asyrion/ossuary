import { G, player } from '../state';
import { blockers, collide } from '../world/collision';
import { DH, HD, HW } from '../world/dims';
import { moveInput, shootDir } from '../input';
import { spawnBolt } from '../combat/projectiles';
import { checkArtifactPickup } from '../items/artifacts';
import { descend, tryTransition } from '../flow';
import { clamp, lerp } from '../util';

export function updatePlayer(dt: number) {
  const cur = G.current;
  const mv = moveInput();
  // gentle pull toward an open doorway when pushing into it, so corners don't snag
  const lx = player.x - cur.cx, lz = player.z - cur.cz, d = cur.doors;
  if (mv.z < -.3 && lz < -HD + 1 && d.n?.open && Math.abs(lx) < DH + .45) mv.x += clamp(-lx * 2.2, -1, 1) * .8;
  if (mv.z > .3 && lz > HD - 1 && d.s?.open && Math.abs(lx) < DH + .45) mv.x += clamp(-lx * 2.2, -1, 1) * .8;
  if (mv.x > .3 && lx > HW - 1 && d.e?.open && Math.abs(lz) < DH + .45) mv.z += clamp(-lz * 2.2, -1, 1) * .8;
  if (mv.x < -.3 && lx < -HW + 1 && d.w?.open && Math.abs(lz) < DH + .45) mv.z += clamp(-lz * 2.2, -1, 1) * .8;
  const k = 1 - Math.exp(-14 * dt);
  const st = player.stats;
  player.vx = lerp(player.vx, mv.x * st.speed, k); player.vz = lerp(player.vz, mv.z * st.speed, k);
  player.x += player.vx * dt; player.z += player.vz * dt;
  collide(player, blockers(cur, 'player', st.effects.has('pitWalker')));
  if (tryTransition()) return;
  // shooting
  player.fireCd -= dt;
  if (shootDir() && player.fireCd <= 0) { spawnBolt(); player.fireCd = st.fireDelay; }
  if (player.invuln > 0) player.invuln -= dt;
  // artifacts and the trapdoor down
  checkArtifactPickup();
  const trapdoor = G.trapdoor;
  if (trapdoor && Math.hypot(player.x - trapdoor.x, player.z - trapdoor.z) < .55) descend();
}
