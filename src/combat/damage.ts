import * as THREE from 'three';
import { foeReagent } from '../items/reagents';
import { giantDamageMul } from '../items/potionFx';
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
import { serpentFell } from '../world/laboratory';
import { banner, flashHurt, renderHearts, updateBossBar } from '../ui/hud';
import { ringFx } from '../magic/spellFx';
import { addDecal, burst } from './fx';
import { spawnBurst } from './projectiles';
import { spawnHeart, spawnPickup } from '../items/pickups';
import { rollEnemyDrop } from '../items/loot';
import { freeSpotNear } from '../world/rooms';
import { gainMana } from '../magic/spells';
import { MAGIC, damageTakenMul, spendHex } from '../magic/status';
import { dummyHit, floatText, flowerFell, inflict, shockLeap } from '../magic/statusFx';
import { fireAt } from '../world/pools';
import { foeDied, foeStruck } from '../actors/foes';
import { payToll } from '../magic/shapes';
import { guardHit, soulsHere } from '../items/souls';
import { SOUL_COLOR } from '../items/loot';
import { drinkBlow } from '../actors/wardShield';
import { wearPlates } from '../actors/bosses';
import { glance, twinFell } from '../actors/twinGuardians';
import { mantleFell, mantleStruck } from '../actors/mantles';
import { payPurse, paySerpent } from '../progression/insight';
import { boonActs, boonRank, laidBare, thirstHex } from '../progression/boonHooks';
import { sowBlossom } from '../world/props';

/** Hurt a foe, knocking it along (dx, dz); `kbMul` scales the knockback (the Ram's Skull on bolts); `by` says
    what struck it (a foe the cantrip puts to rest gives mana back); `school`, the magic it struck with, if any: a foe in
    code takes half again from its weakness and half from its resistance (M4), and the first time the word rises. */
export function damageEnemy(e: Enemy, dmg: number, dx: number, dz: number, kbMul = 1, by?: Enemy['lastHit'], school?: School) {
  if (e.spawn > 0 || e.dead || e.hidden) return;
  if (e.ward && by === 'spell') { drinkBlow(e, dmg, school); return; } // (M4.2: its ward drinks the spells that strike it)
  if (e.glance && by === 'cantrip') { glance(e); return; } // (a Twin Guardian's shield turns bolts)
  const blow = dmg; // (the blow as dealt: what a shock's leap passes on, M6: the multipliers are the next foe's to apply)
  const seared = (e.status?.seared ?? 0) > 0, bare = !seared && (e.guard ?? 1) < 1 && laidBare(e.status?.sanct ?? 0); // (M6: Laid Bare, holy light strips it as Searing does)
  const raw = dmg * damageTakenMul(e.status) * (e.unbound ? MAGIC.unbound.damageMul : 1); dmg = raw * (seared || bare ? Math.max(1, e.guard ?? 1) : e.guard ?? 1); // a frozen foe cracks; a shut mimic's clay turns half a blow, unless Searing burnt its guard away (M4.8; an opening, a flipped crab's, stays)
  if (bare) boonActs('laidBare', e.x, e.z);
  if (e.plates) wearPlates(e, raw - dmg); // (M4.2: the War-Tiger's plates turn most of it, and wear)
  const aff = affinityMul(e.foe ?? e.bossAff, school); // (the bosses of floors 4 and 5 have theirs too)
  if (aff < 0) { drink(e, -dmg * aff); return; } // (M4.5: an elemental drinks its own school)
  if (aff !== 1) {
    dmg *= aff;
    if (foundAffinity(e.foe?.id ?? e.type as BossType, aff > 1 ? 'weak' : 'resist')) { floatText(e.x, 1.5, e.z, aff > 1 ? STR.foes.weak : STR.foes.resists, aff > 1 ? 0xffd070 : 0xa8a0b8); Sfx.at(e.x, e.z).affinity(aff > 1); }
  }
  if (by === 'spell') dmg *= player.stats.spellDamage; // Crown of Thorns
  if (by === 'cantrip' || by === 'spell') dmg *= giantDamageMul(); // (M5: the Giant's Brew, drunk)
  if (e.foe) { dmg = foeStruck(e, dmg, by, dx, dz, school); if (dmg <= 0) { e.flash = .09; return; } } // (a void mote swallows the cantrip)
  e.hp -= dmg; e.flash = .09; e.lastHit = by; e.asleep = false; // a sleeper wakes
  if (by && e.mantle) mantleStruck(e); // (M4.7: a Stormcharged champion sparks back)
  const hexed = e.status?.hex ?? 0; // (before the blow spends a stack: a foe that falls with enough leaves a soul mote)
  if (by) { // a hexed foe gives back mana for each stack a blow spends (M4.1); a foe marked by the Ferryman's Toll pays its toll
    const spent = spendHex(e.status); if (spent) thirstHex(e.x, e.z); // (M6: Thirsting Hex drinks the stacks spent)
    let back = spent * (player.stats.effects.has('soulLantern') ? CFG.artifacts.soulLantern.hexMul : 1); // (half again with the Ferryman's Lantern)
    if (e.toll && G.simClock >= (e.tollNext ?? 0)) { back += e.toll.mana; e.tollNext = G.simClock + CFG.mana.tollEvery; }
    if (back) { gainMana(back); burst(e.x, 1, e.z, SCHOOL_LIGHT.umbral, 3, 1.4, .03); }
  }
  if (e.type === 'dummy') { e.hp = e.maxHp; dummyHit(e, dmg); } // the training dummy never falls
  shockLeap(e, blow); // a shocked foe passes part of the hit on (the blow as dealt, so the spell's multipliers apply once, there)
  const kb = (e.isBoss ? .6 : 2.6) * kbMul; e.kx += dx * kb; e.kz += dz * kb;
  Sfx.at(e.x, e.z).hit();
  if (e.isBoss) updateBossBar(e.twin ? { hp: Math.max(0, e.hp) + Math.max(0, e.twin.hp), maxHp: e.maxHp + e.twin.maxHp } : e); // (the twins share one bar)
  if (e.hp <= 0) killEnemy(e, false, hexed);
}

/** An elemental drinks a blow of its own school (M4.5): it heals by `hp`, in its light, and the first time the word rises. */
export function drink(e: Enemy, hp: number) {
  e.hp = Math.min(e.maxHp, e.hp + hp); e.flash = .09; burst(e.x, .8, e.z, SCHOOL_LIGHT[e.foe!.school], 5, 1.4, .03);
  if (foundAffinity(e.foe!.id, 'resist')) { floatText(e.x, 1.5, e.z, STR.foes.drinks, SCHOOL_LIGHT[e.foe!.school]); Sfx.at(e.x, e.z).affinity(false); }
}

const GIB_COLOR: Record<keyof typeof CFG.enemy, number> = { rotling: 0x7f8a60, dummy: 0xc8a860, warden: 0xff6a3a, abbess: 0x6fe8d8, pyre: 0xff9a3a, hart: 0xffe8b0, angler: 0x8a6ad8, tiger: 0xd8e8f4, dragon: 0xe07a2c, twins: 0xc2ae8a, serpent: 0x7ae070 };
const STAIN_COLOR: Record<keyof typeof CFG.enemy, number | null> = { rotling: 0x1d2414, dummy: null, warden: 0x2a0a06, abbess: 0x0c2622, pyre: 0x1a0c06, hart: 0x3a2e14, angler: 0x140c24, tiger: 0x1c2a36, dragon: 0x2a1a14, twins: 0x3a3226, serpent: 0x1e4a24 };
/** What flies from a foe when it falls, and the stain it leaves: a foe in code's own (data/foes.json), else the old. */
const gibOf = (e: Enemy) => e.foe ? new THREE.Color(e.foe.gib).getHex() : GIB_COLOR[e.type as EnemyType];
const stainOf = (e: Enemy) => e.foe ? (e.foe.stain && new THREE.Color(e.foe.stain).getHex()) : STAIN_COLOR[e.type as EnemyType];

/** A foe goes without falling (M4.5: a rubble golem takes its stones back): gone, leaving nothing, not counted as slain. */
export function crumble(e: Enemy) { e.dead = true; scene.remove(e.group); disposeTree(e.group); }

function killEnemy(e: Enemy, withBoss = false, hexed = 0) {
  e.dead = true; scene.remove(e.group); disposeTree(e.group); G.stats.kills++;
  if (withBoss) { burst(e.x, .45, e.z, gibOf(e), 12, 3, .08); return; } // its master fell: it crumbles, and drops nothing
  burst(e.x, e.isBoss ? 1 : .45, e.z, gibOf(e), e.isBoss ? 60 : 16, e.isBoss ? 6 : 3.5, e.isBoss ? .12 : .08);
  payPurse(e); // (M6: its insight runs to the mage's hand)
  if (e.foe) { burst(e.x, .5, e.z, SCHOOL_LIGHT[e.foe.school], 10, 2.2, .04); foeDied(e); } // (its school's light goes out of it; what it leaves behind)
  if (e.mantle) mantleFell(e); // (M4.7: a Hexbound champion's curse)
  if ((e.status?.grow ?? 0) > 0 || e.status?.bloom) { flowerFell(e); if (!e.isBoss && boonRank('seedfall')) sowBlossom(G.current, e.x, e.z); } // (M5: overgrown, it flowers; a lily mends besides; M6: Seedfall leaves a plant, before the drops find their spots)
  if (e.toll) payToll(e); // marked by the Ferryman's Toll: it pays in obols, and its hex spreads
  if ((e.status?.voidT ?? 0) > 0) { gainMana(MAGIC.reactions.voidspark.mana); burst(e.x, 1, e.z, SCHOOL_LIGHT.umbral, 8, 1.8, .04); } // (M4.8: a Void Spark's mark gives back mana as it falls)
  if (hexed >= MAGIC.hex.soulAt && e.type !== 'dummy' && G.run.drops.chance(Math.min(1, CFG.souls.hexChance * soulsHere()))) { // deep in a hex, its soul stays: a black mote
    const p = freeSpotNear(G.current, e.x, e.z); spawnPickup('blackSoul', p.x, p.z, { rise: true });
  }
  const stain = stainOf(e);
  if (stain) addDecal(e.x, e.z, stain, e.isBoss ? 1.6 : .7);
  if (player.stats.effects.has('deathBurst')) spawnBurst(e.x, e.z, 4); // Saint's Knucklebone
  if (player.stats.effects.has('leech')) leech(e);                   // Leech Jar
  if (e.lastHit === 'cantrip') gainMana(CFG.mana.perKill);            // the dead give back what spells spend
  if (player.stats.killMana) gainMana(player.stats.killMana);         // Hungering Tome
  if (player.stats.effects.has('thurible') && (e.status?.burn ?? 0) > 0) scatterEmbers(e); // Thurible of Ash
  if (e.champion) { const p = freeSpotNear(G.current, e.x, e.z); spawnHeart(p.x, p.z, 2); }
  if (player.stats.effects.has('choir')) choirCounts(e);                // Ossuary Choir
  if (player.stats.effects.has('gravemonger') && !e.isBoss) {         // Gravemonger's Contract: the dead pay (less, once cleansed)
    const A = CFG.artifacts.gravemonger, clean = player.cleansed.includes('gravemongers_contract');
    if (G.run.drops.chance(A.chance * (clean ? .5 : 1))) { const p = freeSpotNear(G.current, e.x, e.z); spawnPickup('coin', p.x, p.z); }
  }
  const drop = e.isBoss ? null : rollEnemyDrop(G.run.drops); // now and then an obol
  if (!(e.isBoss && e.twin && !e.twin.dead)) foeReagent(e); // (M5: now and then a reagent; a boss's every time, the second twin's)
  if (drop) { const p = freeSpotNear(G.current, e.x, e.z); spawnPickup(drop, p.x, p.z); }
  if (e.isBoss && e.twin && !e.twin.dead) { Sfx.at(e.x, e.z).boom(); G.shake = .45; twinFell(e.twin); } // (one twin down: the other fights on, raging)
  else if (e.isBoss) {
    for (const s of G.enemies) if (s.servant && !s.dead) killEnemy(s, true);
    Sfx.at(e.x, e.z).boom(); G.shake = .55;
    if (e.labBoss) { serpentFell(e); paySerpent(e); } else onBossDead(e); // (M5: the jelly serpent out of its vat has its own rewards, and no trapdoor)
  } else { if (e.foe) Sfx.at(e.x, e.z).critterDie(); else Sfx.at(e.x, e.z).die(); G.shake = Math.max(G.shake, .08); }
}

/** The Ossuary Choir: every so many foes put to rest in a room, a beat later the dead sing, and every foe still in the room
    is struck by the hymn (Hallow). */
function choirCounts(e: Enemy) {
  const room = G.current, C = CFG.artifacts.choir;
  room.choir = (room.choir ?? 0) + 1;
  if (room.choir % C.every) return;
  burst(e.x, 1, e.z, SCHOOL_LIGHT.hallow, 10, 1.6, .04);
  after(C.delay, () => {
    if (G.current !== room) return; // (the mage has gone on: the hymn stays behind)
    Sfx.choir(); ringFx(player.x, .05, player.z, SCHOOL_LIGHT.hallow, .4, 7, CFG.spellFx.shockwave * 1.5, true);
    for (const o of G.enemies) if (!o.dead && o.spawn <= 0 && !o.hidden) { damageEnemy(o, C.damage, 0, 0, 0, 'spell', 'hallow'); burst(o.x, 1.2, o.z, 0xfff0c8, 6, 1.2, .03); }
  });
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

/** The Last Rite: whether it will refuse a killing blow now (once a floor; once every two when cleansed). */
function lastRite() {
  if (!player.stats.effects.has('lastRite')) return false;
  const R = CFG.artifacts.lastRite, every = player.cleansed.includes('the_last_rite') ? R.everyCleansed : R.every;
  return G.run.floor - G.run.riteFloor >= every;
}

/** Damage the hero by `halves` half-hearts, knocking them away from (fromX, fromZ). Whether the blow reached the mage
    (not shrugged off while invulnerable; in god mode it reaches but costs nothing), for what comes with it (a chill, a
    hex, dimmed sight). */
export function hurtPlayer(halves: number, fromX: number, fromZ: number): boolean {
  if (player.invuln > 0 || G.state !== 'play') return false;
  if (DEV.god) return true;
  const guarded = guardHit(); // a soul mote takes the blow before the hearts do (M4.1)
  if (!guarded) player.hp -= halves;
  if (player.hp <= 0 && lastRite()) { // the Last Rite: this blow is refused, once a floor, and the mage rises
    player.hp = CFG.artifacts.lastRite.rise; G.run.riteFloor = G.run.floor;
    burst(player.x, 1, player.z, 0xf0e8d8, 24, 2.4, .06); Sfx.lastRite(); banner(...STR.banner.lastRite);
  }
  player.invuln = player.stats.invuln; renderHearts();
  if (G.current.locked) G.current.hurt = true; // no Unbroken Oath for this fight
  const dx = player.x - fromX, dz = player.z - fromZ, d = Math.hypot(dx, dz) || 1; player.vx += dx / d * 7; player.vz += dz / d * 7;
  G.shake = .3; if (!guarded) Sfx.hurt(); flashHurt();
  burst(player.x, .6, player.z, guarded ? SOUL_COLOR[guarded] : 0xb3261a, 10, 2.5, .07);
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
