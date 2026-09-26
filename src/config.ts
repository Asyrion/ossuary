/* Tuning: everything worth tweaking lives here. Values are unchanged from prototype 0.3 except `lights`,
   which were re-tuned for three.js physically based lighting. */
export const CFG = {
  hero: {
    speed: 4.3, radius: 0.3, height: 1.3, hearts: 3, damage: 3.5, fireDelay: 0.36,
    shotSpeed: 8.8, range: 6.8, invuln: 1.0, shotInherit: 0.3, stripBase: true,
    runAnimSpeed: 3.6, // playback speed of the run clip at full speed; raise if feet slide
  },
  enemy: {
    rotling: { hp: 10, r: 0.32, speed: 1.35 },
    wisp: { hp: 7, r: 0.28, speed: 1.1, fireMin: 2.0, fireMax: 3.0, shotSpeed: 3.8 },
    hound: { hp: 12, r: 0.34, speed: 1.1, charge: 7.2 },
    warden: { hp: 120, r: 0.78, speed: 1.15 },
  },
  camTiltDeg: 45,
  heartDropChance: 0.45,
  artifacts: {
    maxPerFloor: 5,      // a floor never offers more (the boss's pair counts as one)
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
