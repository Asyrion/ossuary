import { CFG } from '../config';
import type { Enemy } from '../types';
import { G, after, player } from '../state';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { disposeTree } from '../render/materials';
import { heroDie, heroHit } from '../actors/hero';
import { endGame, onBossDead } from '../flow';
import { flashHurt, renderHearts, updateBossBar } from '../ui/hud';
import { addDecal, burst } from './fx';
import { spawnBurst } from './projectiles';
import { spawnHeart, spawnPickup } from '../items/pickups';
import { rollEnemyDrop } from '../items/loot';
import { freeSpotNear } from '../world/rooms';

export function damageEnemy(e: Enemy, dmg: number, dx: number, dz: number) {
  if (e.spawn > 0 || e.dead || e.hidden) return;
  e.hp -= dmg; e.flash = .09;
  const kb = e.isBoss ? .6 : 2.6; e.kx += dx * kb; e.kz += dz * kb;
  Sfx.hit();
  if (e.isBoss) updateBossBar(e);
  if (e.hp <= 0) killEnemy(e);
}

const GIB_COLOR: Record<keyof typeof CFG.enemy, number> = { rotling: 0x7f8a60, wisp: 0xb07bff, hound: 0xd8ccb2, warden: 0xff6a3a, abbess: 0x6fe8d8, pyre: 0xff9a3a };
const STAIN_COLOR: Record<keyof typeof CFG.enemy, number | null> = { rotling: 0x1d2414, wisp: null, hound: 0x241812, warden: 0x2a0a06, abbess: 0x0c2622, pyre: 0x1a0c06 };

function killEnemy(e: Enemy) {
  e.dead = true; scene.remove(e.group); disposeTree(e.group); G.stats.kills++;
  burst(e.x, e.isBoss ? 1 : .45, e.z, GIB_COLOR[e.type], e.isBoss ? 60 : 16, e.isBoss ? 6 : 3.5, e.isBoss ? .12 : .08);
  const stain = STAIN_COLOR[e.type];
  if (stain !== null) addDecal(e.x, e.z, stain, e.isBoss ? 1.6 : .7);
  if (player.stats.effects.has('deathBurst')) spawnBurst(e.x, e.z, 4); // Saint's Knucklebone
  if (e.champion) { const p = freeSpotNear(G.current, e.x, e.z); spawnHeart(p.x, p.z, 2); }
  const drop = e.isBoss ? null : rollEnemyDrop(G.run.drops); // now and then an obol
  if (drop) { const p = freeSpotNear(G.current, e.x, e.z); spawnPickup(drop, p.x, p.z); }
  if (e.isBoss) { Sfx.boom(); G.shake = .55; onBossDead(); } else { Sfx.die(); G.shake = Math.max(G.shake, .08); }
}

/** Damage the hero by `halves` half-hearts, knocking them away from (fromX, fromZ). */
export function hurtPlayer(halves: number, fromX: number, fromZ: number) {
  if (player.invuln > 0 || G.state !== 'play') return;
  player.hp -= halves; player.invuln = player.stats.invuln; renderHearts();
  const dx = player.x - fromX, dz = player.z - fromZ, d = Math.hypot(dx, dz) || 1; player.vx += dx / d * 7; player.vz += dz / d * 7;
  G.shake = .3; Sfx.hurt(); flashHurt();
  burst(player.x, .6, player.z, 0xb3261a, 10, 2.5, .07);
  if (player.hp <= 0) {
    player.hp = 0; renderHearts(); player.vx = player.vz = 0;
    const wait = heroDie(); G.state = 'dying';
    after(wait + .4, () => endGame(false));
  } else {
    heroHit();
    if (player.stats.effects.has('hurtRing')) { spawnBurst(player.x, player.z, 8, Math.PI / 8); Sfx.bell(); } // Mourning Bell
  }
}
