import { CFG } from '../config';
import type { Enemy } from '../types';
import { DEV, G, after, player } from '../state';
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
import { gainMana } from '../magic/spells';
import { damageTakenMul } from '../magic/status';
import { dummyHit, shockLeap } from '../magic/statusFx';

/** Hurt a foe, knocking it along (dx, dz); `kbMul` scales the knockback (the Ram's Skull on bolts); `by` says
    what struck it (a foe the cantrip puts to rest gives mana back). */
export function damageEnemy(e: Enemy, dmg: number, dx: number, dz: number, kbMul = 1, by?: Enemy['lastHit']) {
  if (e.spawn > 0 || e.dead || e.hidden) return;
  dmg *= damageTakenMul(e.status); // a frozen foe cracks
  e.hp -= dmg; e.flash = .09; e.lastHit = by;
  if (e.type === 'dummy') { e.hp = e.maxHp; dummyHit(e, dmg); } // the training dummy never falls
  shockLeap(e, dmg); // a shocked foe passes part of the hit on
  const kb = (e.isBoss ? .6 : 2.6) * kbMul; e.kx += dx * kb; e.kz += dz * kb;
  Sfx.hit();
  if (e.isBoss) updateBossBar(e);
  if (e.hp <= 0) killEnemy(e);
}

const GIB_COLOR: Record<keyof typeof CFG.enemy, number> = { rotling: 0x7f8a60, wisp: 0xb07bff, hound: 0xd8ccb2, dummy: 0xc8a860, warden: 0xff6a3a, abbess: 0x6fe8d8, pyre: 0xff9a3a };
const STAIN_COLOR: Record<keyof typeof CFG.enemy, number | null> = { rotling: 0x1d2414, wisp: null, hound: 0x241812, dummy: null, warden: 0x2a0a06, abbess: 0x0c2622, pyre: 0x1a0c06 };

function killEnemy(e: Enemy, withBoss = false) {
  e.dead = true; scene.remove(e.group); disposeTree(e.group); G.stats.kills++;
  if (withBoss) { burst(e.x, .45, e.z, GIB_COLOR[e.type], 12, 3, .08); return; } // its master fell: it crumbles, and drops nothing
  burst(e.x, e.isBoss ? 1 : .45, e.z, GIB_COLOR[e.type], e.isBoss ? 60 : 16, e.isBoss ? 6 : 3.5, e.isBoss ? .12 : .08);
  const stain = STAIN_COLOR[e.type];
  if (stain !== null) addDecal(e.x, e.z, stain, e.isBoss ? 1.6 : .7);
  if (player.stats.effects.has('deathBurst')) spawnBurst(e.x, e.z, 4); // Saint's Knucklebone
  if (player.stats.effects.has('leech')) leech(e);                   // Leech Jar
  if (e.lastHit === 'cantrip') gainMana(CFG.mana.perKill);            // the dead give back what spells spend
  if (e.champion) { const p = freeSpotNear(G.current, e.x, e.z); spawnHeart(p.x, p.z, 2); }
  const drop = e.isBoss ? null : rollEnemyDrop(G.run.drops); // now and then an obol
  if (drop) { const p = freeSpotNear(G.current, e.x, e.z); spawnPickup(drop, p.x, p.z); }
  if (e.isBoss) {
    for (const s of G.enemies) if (s.servant && !s.dead) killEnemy(s, true);
    Sfx.boom(); G.shake = .55; onBossDead();
  } else { Sfx.die(); G.shake = Math.max(G.shake, .08); }
}

/** The Leech Jar: every so many foes put to rest, a red mote flies to the mage and heals half a heart. */
function leech(e: Enemy) {
  if (++G.run.leech < CFG.artifacts.leech.every || player.hp >= player.maxHp) return;
  G.run.leech = 0; player.hp = Math.min(player.maxHp, player.hp + 1); renderHearts();
  burst(e.x, .6, e.z, 0xd02a2a, 10, 1.6, .06); burst(player.x, .8, player.z, 0xe0473a, 12, 1.8, .05); Sfx.leech();
}

/** The Bloodied Covenant: every fight the mage begins takes half a heart, never the last. */
export function payBloodTithe() {
  if (!player.stats.effects.has('bloodTithe') || player.hp <= 1) return;
  player.hp -= 1; renderHearts(); flashHurt(); Sfx.tithe();
  burst(player.x, .8, player.z, 0x8a1a1a, 14, 2, .06);
}

/** Damage the hero by `halves` half-hearts, knocking them away from (fromX, fromZ). */
export function hurtPlayer(halves: number, fromX: number, fromZ: number) {
  if (player.invuln > 0 || G.state !== 'play' || DEV.god) return;
  player.hp -= halves; player.invuln = player.stats.invuln; renderHearts();
  if (G.current.locked) G.current.hurt = true; // no Unbroken Oath for this fight
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
