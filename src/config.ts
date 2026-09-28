/* Tuning: everything worth tweaking lives here. Values are unchanged from prototype 0.3 except `lights`,
   which were re-tuned for three.js physically based lighting. */
export const CFG = {
  hero: {
    speed: 4.3, radius: 0.3, height: 1.3, hearts: 3, damage: 3.5, fireDelay: 0.36,
    shotSpeed: 8.8, range: 6.8, invuln: 1.0, shotInherit: 0.3, stripBase: true,
    runAnimSpeed: 3.0,  // playback speed of the run clip at full speed; raise if feet slide
    walkAnimSpeed: 10.5, // playback speed the walk clip would need at full speed (it only plays when slow)
    walkToRun: [.12, .3] as [number, number], // between these fractions of full speed the walk hands over to the run
    drinkSpeed: 1.4,    // playback speed of the draught when the mage is healed
    fidget: [9, 16] as [number, number], // seconds standing still before the mage eats something
  },
  enemy: {
    rotling: { hp: 10, r: 0.32, speed: 1.35 },
    wisp: { hp: 7, r: 0.28, speed: 1.1, fireMin: 2.0, fireMax: 3.0, shotSpeed: 3.8 },
    hound: { hp: 12, r: 0.34, speed: 1.1, charge: 7.2 },
    // bosses (each floor's boss block in data/floors.json scales them)
    warden: { hp: 120, r: 0.78, speed: 1.15 },
    abbess: { hp: 120, r: 0.7, speed: .95, dive: 2.7, under: 1.8 }, // dive: speed of her ripple; under: seconds below
    pyre: { hp: 135, r: 0.72, speed: 1.25, charge: 8.2 },
  },
  // champion rooms: one enemy is bigger, tinted, tougher and a little faster, and drops a heart
  champion: { hpMul: 2, scale: 1.3, radiusMul: 1.2, speedMul: 1.15, tint: 0x6a1a0a, aura: 0xff5a2a },
  // quiet rooms keep at most this many weak enemies; how often a heart waits there
  quiet: { maxEnemies: 2, heartChance: .7 },
  // ambush rooms spring when the mage is this close to the middle, or this far from every door
  ambush: { middle: 1.8, fromDoors: 4 },
  // floor generation: how many walks may be retried to leave spare dead ends for a wanted altar or vault
  generator: { optionalTries: 60 },
  // the merchant's shop (room-relative z of the shade and the row of wares, the gap between wares), how
  // close the mage must come to buy, and how far a bolt flies in the warded shop before it fizzles
  merchant: { shadeAt: -1.9, waresAt: .9, spacing: 2.3, reach: .45, boltFizzle: .6 },
  // locked vaults: glyph blasts that force the ward, and where the warden rises (room-relative z)
  vault: { blastsToForce: 2, wardenAt: -1.8 },
  camTiltDeg: 45,
  camHallView: 1.2,    // larger halls: the camera pulls back so the view is this much wider and deeper
  pickups: { obolDrift: 1.8 },  // obols drift to the mage from this close
  // blast glyphs: fuse (s), reach (tiles), damage to foes, halves of hearts off the mage, knockback, time
  // between two glyphs, how close a bolt must pass to set one off (after flying boltArm, so a bolt leaving
  // the mage doesn't set off the glyph at their feet), and the pause before a blast sets off its neighbours
  glyph: { fuse: 1.5, radius: 1.5, damage: 10, selfDamage: 2, knockback: 7, cooldown: .35, boltReach: .5, boltArm: .9, chainDelay: .1 },
  artifacts: {
    maxPerFloor: 6,      // the floor's budget (the boss's pair counts as one); gilded reliquaries don't count
    dropChance: 0.03,    // chance a cleared room drops one, while the floor's budget allows
    rockHp: 3,           // Mason's Chisel: bolt hits to break a rock
    visionRadius: 3.4,   // Mask of the Drowned: how far the mage sees
    burst: { damageMul: 0.6, range: 4.5, speed: 7, scale: 0.7 }, // Knucklebone and Bell bolts
  },
  lights: {
    hemi: 1.57, moon: 1.26,
    torch: 4.3, torchDistance: 9, torchDecay: 0.5,
    lantern: 3.8, lanternDistance: 6.5, lanternDecay: 0.5,
    exposure: 1.2,
  },
};

export type EnemyType = keyof typeof CFG.enemy;
/** Enemy types that are bosses; each floor draws its boss from a pool of these (data/floors.json). */
export const BOSS_TYPES = ['warden', 'abbess', 'pyre'] as const satisfies readonly EnemyType[];
export type BossType = (typeof BOSS_TYPES)[number];
