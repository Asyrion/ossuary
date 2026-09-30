import * as THREE from 'three';
import { CFG, type BossType, type EnemyType } from '../config';
import { STR } from '../strings';
import { SCHOOL_LIGHT } from '../render/arcane';
import { affinityMul, type School } from '../actors/foeData';
import { foundAffinity } from '../actors/bestiary';
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
import { damageTakenMul, spendHex } from '../magic/status';
import { dummyHit, floatText, inflict, shockLeap } from '../magic/statusFx';
import { fireAt } from '../world/pools';
import { foeDied, foeStruck } from '../actors/foes';
import { payToll } from '../magic/shapes';

/** Hurt a foe, knocking it along (dx, dz); `kbMul` scales the knockback (the Ram's Skull on bolts); `by` says
    what struck it (a foe the cantrip puts to rest gives mana back); `school`, the magic it struck with, if any: a foe in
    code takes half again from its weakness and half from its resistance (M4), and the first time the word rises. */
export function damageEnemy(e: Enemy, dmg: number, dx: number, dz: number, kbMul = 1, by?: Enemy['lastHit'], school?: School) {
  if (e.spawn > 0 || e.dead || e.hidden) return;
  dmg *= damageTakenMul(e.status) * (e.guard ?? 1); // a frozen foe cracks; a shut mimic's clay turns half a blow
  const aff = affinityMul(e.foe ?? e.bossAff, school); // (the bosses of floors 4 and 5 have theirs too)
  if (aff !== 1) {
    dmg *= aff;
    if (foundAffinity(e.foe?.id ?? e.type as BossType, aff > 1 ? 'weak' : 'resist')) { floatText(e.x, 1.5, e.z, aff > 1 ? STR.foes.weak : STR.foes.resists, aff > 1 ? 0xffd070 : 0xa8a0b8); Sfx.at(e.x, e.z).affinity(aff > 1); }
  }
  if (by === 'spell') dmg *= player.stats.spellDamage; // Crown of Thorns
  if (e.foe) { dmg = foeStruck(e, dmg, by); if (dmg <= 0) { e.flash = .09; return; } } // (a void mote swallows the cantrip)
  e.hp -= dmg; e.flash = .09; e.lastHit = by; e.asleep = false; // a sleeper wakes
  if (by) { // a hexed foe gives back mana for each stack a blow spends (M4.1); a foe marked by the Ferryman's Toll pays its toll
    let back = spendHex(e.status);
    if (e.toll && G.simClock >= (e.tollNext ?? 0)) { back += e.toll.mana; e.tollNext = G.simClock + CFG.mana.tollEvery; }
    if (back) { gainMana(back); burst(e.x, 1, e.z, SCHOOL_LIGHT.umbral, 3, 1.4, .03); }
  }
  if (e.type === 'dummy') { e.hp = e.maxHp; dummyHit(e, dmg); } // the training dummy never falls
  shockLeap(e, dmg); // a shocked foe passes part of the hit on
  const kb = (e.isBoss ? .6 : 2.6) * kbMul; e.kx += dx * kb; e.kz += dz * kb;
  Sfx.at(e.x, e.z).hit();
  if (e.isBoss) updateBossBar(e);
  if (e.hp <= 0) killEnemy(e);
}

const GIB_COLOR: Record<keyof typeof CFG.enemy, number> = { rotling: 0x7f8a60, dummy: 0xc8a860, warden: 0xff6a3a, abbess: 0x6fe8d8, pyre: 0xff9a3a, hart: 0xffe8b0, angler: 0x8a6ad8 };
const STAIN_COLOR: Record<keyof typeof CFG.enemy, number | null> = { rotling: 0x1d2414, dummy: null, warden: 0x2a0a06, abbess: 0x0c2622, pyre: 0x1a0c06, hart: 0x3a2e14, angler: 0x140c24 };
/** What flies from a foe when it falls, and the stain it leaves: a foe in code's own (data/foes.json), else the old. */
const gibOf = (e: Enemy) => e.foe ? new THREE.Color(e.foe.gib).getHex() : GIB_COLOR[e.type as EnemyType];
const stainOf = (e: Enemy) => e.foe ? (e.foe.stain && new THREE.Color(e.foe.stain).getHex()) : STAIN_COLOR[e.type as EnemyType];

function killEnemy(e: Enemy, withBoss = false) {
  e.dead = true; scene.remove(e.group); disposeTree(e.group); G.stats.kills++;
  if (withBoss) { burst(e.x, .45, e.z, gibOf(e), 12, 3, .08); return; } // its master fell: it crumbles, and drops nothing
  burst(e.x, e.isBoss ? 1 : .45, e.z, gibOf(e), e.isBoss ? 60 : 16, e.isBoss ? 6 : 3.5, e.isBoss ? .12 : .08);
  if (e.foe) { burst(e.x, .5, e.z, SCHOOL_LIGHT[e.foe.school], 10, 2.2, .04); foeDied(e); } // (its school's light goes out of it; what it leaves behind)
  if (e.toll) payToll(e); // marked by the Ferryman's Toll: it pays in obols, and its hex spreads
  const stain = stainOf(e);
  if (stain) addDecal(e.x, e.z, stain, e.isBoss ? 1.6 : .7);
  if (player.stats.effects.has('deathBurst')) spawnBurst(e.x, e.z, 4); // Saint's Knucklebone
  if (player.stats.effects.has('leech')) leech(e);                   // Leech Jar
  if (e.lastHit === 'cantrip') gainMana(CFG.mana.perKill);            // the dead give back what spells spend
  if (player.stats.killMana) gainMana(player.stats.killMana);         // Hungering Tome
  if (player.stats.effects.has('thurible') && (e.status?.burn ?? 0) > 0) scatterEmbers(e); // Thurible of Ash
  if (e.champion) { const p = freeSpotNear(G.current, e.x, e.z); spawnHeart(p.x, p.z, 2); }
  const drop = e.isBoss ? null : rollEnemyDrop(G.run.drops); // now and then an obol
  if (drop) { const p = freeSpotNear(G.current, e.x, e.z); spawnPickup(drop, p.x, p.z); }
  if (e.isBoss) {
    for (const s of G.enemies) if (s.servant && !s.dead) killEnemy(s, true);
    Sfx.at(e.x, e.z).boom(); G.shake = .55; onBossDead();
  } else { if (e.foe) Sfx.at(e.x, e.z).critterDie(); else Sfx.at(e.x, e.z).die(); G.shake = Math.max(G.shake, .08); }
}

/** The Thurible of Ash: a foe that dies burning scatters its embers over the foes around it, and any oil. */
function scatterEmbers(e: Enemy) {
  const T = CFG.artifacts.thurible;
  for (const o of G.enemies) {
    if (o === e || o.dead || o.spawn > 0 || o.hidden || Math.hypot(o.x - e.x, o.z - e.z) > T.radius) continue;
    inflict(o, { burn: T.burn });
    for (let k = 1; k <= 3; k++) burst(e.x + (o.x - e.x) * k / 4, .6, e.z + (o.z - e.z) * k / 4, 0xff8a3a, 1, .8, .04);
  }
  burst(e.x, .6, e.z, 0x6a5a50, 14, 2.2, .05); fireAt(e.x, e.z, .4); Sfx.at(e.x, e.z).crackle();
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

/** Damage the hero by `halves` half-hearts, knocking them away from (fromX, fromZ). Whether the blow reached the mage
    (not shrugged off while invulnerable; in god mode it reaches but costs nothing), for what comes with it (a chill, a
    hex, dimmed sight). */
export function hurtPlayer(halves: number, fromX: number, fromZ: number): boolean {
  if (player.invuln > 0 || G.state !== 'play') return false;
  if (DEV.god) return true;
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
  return true;
}
