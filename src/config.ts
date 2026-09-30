/* Tuning: everything worth tweaking lives here. Values are unchanged from prototype 0.3 except `lights`,
   which were re-tuned for three.js physically based lighting. */
export const CFG = {
  hero: {
    speed: 4.3, radius: 0.3, height: 1.3, hearts: 3, damage: 3.5, fireDelay: 0.36,
    shotSpeed: 8.8, range: 6.8, invuln: 1.0, shotInherit: 0.3, stripBase: true, mana: 100,
    runAnimSpeed: 3.0,  // playback speed of the run clip at full speed; raise if feet slide
    walkAnimSpeed: 10.5, // playback speed the walk clip would need at full speed (it only plays when slow)
    walkToRun: [.12, .3] as [number, number], // between these fractions of full speed the walk hands over to the run
    walkNatural: 2.2,   // dev menu comparison: the walk's playback at full speed at a natural pace (the feet slide)
    drinkSpeed: 1.4,    // playback speed of the draught when the mage is healed
    fidget: [9, 16] as [number, number], // seconds standing still before the mage eats something
  },
  // mana (GDD: Magic system): regained each second out of a fight and in one, and for each foe the cantrip
  // puts to rest (a mana vial's worth is in data/loot.json); a foe marked by the Ferryman's Toll pays at most every
  // `tollEvery` seconds (M4.1)
  mana: { calm: 4, fight: 1, perKill: 3, tollEvery: .2 },
  enemy: {
    // a plain walker with no school, in no floor's fights (the foes in code fill them, M4): the browser tests' target
    rotling: { hp: 10, r: 0.32, speed: 1.35 },
    dummy: { hp: 1000, r: 0.34, speed: 0 },  // the dev menu's training dummy: stands still, never falls
    // bosses (each floor's boss block in data/floors.json scales them)
    warden: { hp: 120, r: 0.78, speed: 1.15 },
    abbess: { hp: 120, r: 0.7, speed: .95, dive: 2.7, under: 1.8 }, // dive: speed of her ripple; under: seconds below
    pyre: { hp: 135, r: 0.72, speed: 1.25, charge: 8.2 },
    // floors 4 and 5 (M4.1), built in code, with a weakness and a resistance like the foes: the hart's charge speed; the
    // angler's pull on the mage (units a second), how long it pulls, how close its bite reaches, and the share of its
    // health that, struck off while it pulls, makes it flinch
    hart: { hp: 150, r: 0.85, speed: 1.35, charge: 8.6, weak: 'umbral' as const, resist: 'hallow' as const,
      spokes: { every: .16, count: 4, hurtCount: 6, speed: 3.1 }, stamp: { count: 18, speed: 3, later: 2.6 } }, // its spokes of light, and its stamp's ring (a second below half health)
    angler: { hp: 165, r: 0.9, speed: 1.1, pull: 2.6, pullTime: 2.4, reach: 1.7, flinch: .06, weak: 'hallow' as const, resist: 'umbral' as const,
      bite: 2, spit: { count: 3, spread: .55, speed: 3.3, hex: 10 }, ring: { count: 16, speed: 2.7, later: 2.3 } }, // half hearts a bite; its hexing volleys; its breath's ring
    // the War-Tiger (M4.2, from the Eda lore): a statue until the mage comes within `wake` (or strikes it); its `plates` let
    // through only `guard` of a blow at first, more with each lost, until all of it; a plate falls to a glyph's blast, a
    // Shatter (a shock on its rimed plates) or `wear` damage turned; each lost makes it `plateSpeed` faster. Its pounce
    // (a tell, then a leap at where the mage stood, throwing frost shards on landing), its swipe (a tell, then a fan of
    // claws fanning out from its paw), its roar (a ring; a second below half health)
    tiger: { hp: 110, r: .85, speed: 1.5, weak: 'storm' as const, resist: 'frost' as const, wake: 3, plates: 4, guard: .4, wear: 30, plateSpeed: .14,
      pounce: { tell: .6, speed: 8.5, time: .9, shards: 8, shardSpeed: 3, chill: 1 }, swipe: { reach: 2, tell: .55, count: 5, spread: 1.1, speed: 3.6 },
      roar: { tell: .7, count: 14, speed: 2.9, later: 2.5 } },
  },
  // what the foes in code do to the mage (M4): chilled by cold breath and rime, this much slower; a salamander's burning
  // ground burns the mage within `groundReach` (plus half the mage's size) and licks up a flame `groundLicks` times a
  // second; foes' embers and cold touch what they pass every `touchEvery` seconds, within `emberReach` and `coldReach`;
  // the dev hook's test shot (`__game.shoot`) flies at `testShot`; a storm ray's sparks arm after `sparkArm` seconds
  afflict: { chillSlow: .4, groundReach: .3, groundLicks: .7, sparkArm: .35, touchEvery: .1, emberReach: .2, coldReach: .1, testShot: 3.8 },
  // a foe's weakness and resistance (M4; GDD: Enemy affinities): the damage of its weak school and of its resisted one
  affinity: { weak: 1.5, resist: .5 },
  // champion rooms: one enemy is bigger, tinted, tougher and a little faster, and drops a heart
  champion: { hpMul: 2, scale: 1.3, radiusMul: 1.2, speedMul: 1.15, tint: 0x6a1a0a, aura: 0xff5a2a },
  // quiet rooms keep at most this many weak enemies; how often a heart waits there
  quiet: { maxEnemies: 2, heartChance: .7 },
  // ambush rooms spring when the mage is this close to the middle, or this far from every door
  ambush: { middle: 1.8, fromDoors: 4 },
  // floor generation: how many walks may be retried to leave spare dead ends for a wanted altar or vault
  generator: { optionalTries: 400 },
  // the merchant's shop (room-relative z of the shade and the row of wares, the gap between wares), how
  // close the mage must come to buy, and how far a bolt flies in the warded shop before it fizzles
  merchant: { shadeAt: -1.9, waresAt: .9, spacing: 2.3, reach: .45, boltFizzle: .6 },
  // the lore card on pickup: seconds on screen, at least, a little more per word of lore, and at most
  lore: { least: 4, perWord: .04, most: 6 },
  // water and oil (world/pools.ts): wading speed (the mage and walking foes), seconds oil burns and water stays
  // frozen, the burn burning oil sets on foes and how often, the half hearts it and a shocked pool take from the
  // mage, how long a shocked pool crackles, and the drowned floor's puddles (how many per fight, tiles each)
  // M4.2: how fast a current carries the mage and walking foes, bolts and shots over it, and pickups lying in it (units a second)
  flow: { carry: 1.7, bolts: 1.1, pickups: 1.3 },
  surface: { wade: .6, oilBurn: 5, iceTime: 8, groundBurn: 2, tick: .25, mageHurt: 1, charged: .5, shockSpread: 1.5, shockDamage: 2, puddles: [1, 2] as [number, number], puddleSize: [2, 4] as [number, number] },
  // the rooms' objects (M3.6, world/props.ts): how long each flammable one burns (seconds), how often burning spreads
  // to what burns beside it, cobwebs' slowing, the briar's sting (half hearts to the mage, damage a second to walkers),
  // the oil a broken cask spills (tiles beyond its own), and glowcap spores (how long a cloud hangs, its reach, the
  // flash when fire finds it: damage to foes, Burn stacks, half hearts to the mage within reach)
  props: {
    burn: { roots: 3.5, tree: 6, briar: 2, web: .45, sacks: 1.6, desk: 3, scrolls: .7, bridge: 4 } as Record<string, number>, spread: .5,
    // M4.2: half hearts a fall through a burnt rope bridge takes from the mage
    fallHurt: 2,
    webSlow: .45, briarHurt: 1, briarDamage: 2, caskSpill: 3,
    spores: { time: 4, reach: 1.3, damage: 6, burn: 2, mageHurt: 1 },
  },
  // themed rooms' twists (M3.6, world/themes.ts): how close the mage comes before a sleeper wakes; when the ossuary's
  // piles start rising (seconds into the fight), how often, and how many at most; the chance a scriptorium's scroll heap
  // hides a page; the collapsed crypt's cave-in: how far from a blast stones fall, how many, how long their shadows
  // show first, and the damage they do
  // mechanisms (M3.6, world/mechanisms.ts): how close fire must come to light a brazier or candle stand, and the Burn a
  // bolt catches flying through a brazier's flame; casts a chapel's candles bless, and how much harder they strike; the
  // bell's stun and how often it can ring; a charged rune stone's pulse (seconds between, reach, status stacks); a
  // lodestone's leap (how near shock must land to reach it, how far it leaps, damage, cooldown); a falling censer's
  // blow (reach, damage, Burn) and the oil it spills (tiles beyond its own); a frozen mausoleum's rime (how quickly the
  // mage gets a grip: lower slides more)
  mech: {
    kindle: .6, brazierBurn: 3, blessCasts: 6, blessMul: 1.6, bellStun: 1.8, bellCooldown: 7,
    runeEvery: 2.2, runeReach: 2.4, runeAmount: 1, lodeCatch: 1.3, lodeReach: 8, lodeDamage: 5, lodeCooldown: 1.2,
    censerReach: 1, censerDamage: 10, censerBurn: 3, censerSpill: 2, rimeGrip: 3.5,
    // how close a bolt passes to catch a brazier's fire or cut a censer's chain; a status to charge a rune stone; fire
    // to thaw an entombed foe; how wide a lodestone's arc hurts (plus a foe's radius); a falling censer hurts the mage
    brazierCatch: .45, censerCatch: .35, runeCatch: .9, thawReach: 1.2, lodeWidth: .6, censerHitsMage: .7,
    // half hearts the lodestone's arc and a falling censer take from the mage; how hard they throw foes back (× the
    // usual knockback); how much bigger a blessed bolt is
    lodeHurt: 1, censerHurt: 1, lodeKnock: .3, censerKnock: .5, blessScale: 1.2,
    // M4.2: a watching statue: how far it sees; seconds of gaze that charge it; how fast its charge cools out of its
    // gaze; the pause between its mark and its ray; how wide the ray strikes; half hearts it takes; seconds before it
    // watches again; seconds a hex blinds it; how close darkness landing reaches it; what its ray does to a foe
    statue: { reach: 7.5, charge: 2.2, cool: 1.5, delay: .75, radius: .75, hurt: 1, rest: 1.5, blind: 7, umbralCatch: 1.2, damage: 12 },
    // a sapping obelisk: how far its field reaches; what the cantrip's blows are worth inside it; mana drained a second;
    // how close its school must land to break its ward
    obelisk: { reach: 2.8, sap: .5, drain: 5, catch: 1 },
  },
  // M4.2: the drinking ward: how close to a sealed vault door a spell is drunk; the mana of spells a vault's ward holds, and
  // a foe's shield (the foe's blows it drinks, as damage); where the Wardling rises beside a foe whose shield broke
  ward: { reach: 4, need: 60, foeNeed: 60, beside: 1.2 },
  themes: { wakeReach: 2.6, riseAfter: 10, riseEvery: 6, riseMost: 3, pageChance: .3, caveReach: 3.5, caveStones: 3, caveDelay: .8, caveDamage: 8, daylightClear: 3, bedrollClear: 2,
    // M4.1: the drowned climb out of the landing's river this long into a fight, then this often, at most this many
    drownAfter: 5, drownEvery: 7, drownMost: 3 },
  // the library: how close the mage must come to a page, the gap between lecterns, and how far into the room
  // (from the door) their row stands, for a door on a long side and on a short one
  library: { reach: .4, spacing: 2.3, spacingShort: 1.9, rowIn: 1.1, rowInShort: 2.6 },
  // spell knowledge (M3.7): casts over all runs that make a learned spell known well (its lore and reactions shown), and
  // how near a grimoire page (in tiles) its panel shows
  knowledge: { usedCasts: 10, pageReach: 2 },
  // locked vaults: glyph blasts that force the ward, and where the warden rises (room-relative z)
  vault: { blastsToForce: 2, wardenAt: -1.8 },
  // M4.2: the Wandering Merchant: the chance an ordinary room's cleared fight calls him (once a run), from which floor
  // (0-based); seconds riding in from the door; where he stops (from the room's middle), how far in front of him and
  // how far apart his wares lie; the box his beast blocks
  wanderer: { chance: .14, fromFloor: 1, rideTime: 2.4, standAt: -1.3, waresAt: 1.85, spacing: 1.55, block: [.95, .5] as [number, number] },
  // secret rooms: the pale blue light of the forgotten mage's cell (torch flame and light colours, torch
  // brightness), and how often dust drifts from a cracked wall (seconds, least and most)
  secret: { flame: '#d8ecff', light: '#8ab8ff', torchMul: .85, dustEvery: [1.2, 2.8] as [number, number] },
  // the shrine: its circle's radius, the offering stones (room-relative spots, in the order curses take
  // them), how close the mage must come to walk into one, and the warm white light of its torches. The
  // curse's wisp: seconds to put it down, bolts that must strike it inside the circle, its speed and size,
  // how long it lingers in the circle (seconds, least and most), how close the mage may come before it
  // shies away, and its shots at the mage (seconds between, least and most; speed)
  shrine: {
    circle: 1.8, stones: [[-3.4, -1.9], [3.4, -1.9], [-3.4, 1.9], [3.4, 1.9]] as [number, number][], reach: .12,
    flame: '#fff2d0', light: '#ffe2a8', torchMul: 1,
    time: 10, hits: 4, wispSpeed: 2.8, wispR: .32, linger: [.9, 1.6] as [number, number], shy: 1.4,
    shotEvery: [1.5, 2.3] as [number, number], shotSpeed: 3.4,
  },
  camTiltDeg: 45,
  camHallView: 1.2,    // larger halls: the camera pulls back so the view is this much wider and deeper
  pickups: { obolDrift: 1.8 },  // obols drift to the mage from this close
  /** Soul motes (M4.1, items/souls.ts): most held; the hex a black one lays on every foe in the room when it goes; the
      chance a foe that falls with enough hex stacks (magic.json's `hex.soulAt`) leaves a black one. */
  souls: { max: 6, blackHex: 2, hexChance: .5 },
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
    crit: { chance: 0.2, damageMul: 3, scale: 1.4, color: 0xfff4dc },   // Raven's Eye: one bolt in five
    split: { angle: 0.7, damageMul: 0.5, range: 3.2 },                  // Cracked Mirror: two halves, this far apart (radians)
    wave: { amp: 0.45, freq: 3.2 },                                     // Serpent Rod: how far bolts swing, and how often (per tile)
    leech: { every: 10 },                                               // Leech Jar: foes put to rest per half heart
    moth: { every: 1.1, range: 7, damageMul: 0.45, orbit: 0.85, speed: 7 }, // Candle Moth: seconds between stings, reach
    skull: { orbit: 1.15, spin: 2.6, damage: 3, every: 0.45, reach: 0.34 }, // Weeping Skull: radius, radians/s, bite and its rest
    wardingBand: { fuse: 1 },                                           // Warding Band: the glyph's fuse (s)
    pedlar: { priceMul: 0.7 },                                          // Pedlar's Scale: merchant prices (rounded, at least 1)
    emberwood: { burn: 1.5 },                                           // Emberwood Wand: seconds of Burn a bolt sets
    homing: { turn: 3.2, reach: 5 },                                    // Tome of Whispers: radians a second, how far a bolt looks
    vigil: { mana: 25 },                                                // Candle of the Vigil: mana for every fight won
    frostbite: { every: 5, chill: 1, color: 0xbfe6ff },                 // Frostbitten Ring: which cast chills, and how much
    stormglass: { mul: 1.25 },                                          // Stormglass Pendant: cantrip damage on shocked foes
    thurible: { radius: 2.4, burn: 3 },                                 // Thurible of Ash: how far a burning death spreads Burn
    witchKnot: { costMul: 0.8 },                                        // Witch's Knot: spell costs at half health or below
    // M4.1's twelve
    swing: { out: 0.55 },                                               // Pendulum of Hours: how far (radians) a bolt sets out from the aim, to curve back onto it at its range's end
    lodestar: { hang: 2, pulse: 7 },                                    // Lodestar Wand: seconds a bolt hangs as a star, and how fast it twinkles
    still: { after: 0.25, speed: 0.5 },                                 // standing still: this long below this speed (Twin Vigil Candles, Salt Circle)
    candles: { damageMul: 1.5 },                                        // Twin Vigil Candles: bolts while standing still
    choir: { every: 5, damage: 5, delay: 0.35 },                        // Ossuary Choir: foes put to rest in a room per hymn; what it does; the beat before it
    echo: { damageMul: 0.75, least: 1.5 },                              // Echo Stone: the echo's damage, and the least way back it flies
    bloodMoon: { fireDelayMul: 0.75, shotSpeedMul: 1.3, color: 0xe03040 }, // Blood Moon Pendant: at half health or below
    salt: { after: 1, radius: 1.35, keep: 0.25 },                       // Salt Circle: seconds still before it forms; its radius; how far the mage may lean out of it before it breaks
    halo: { sanct: 3 },                                                 // Gilded Halo: seconds of Sanctified the first bolt lays
    soulLantern: { hexMul: 1.5, souls: 2 },                             // Ferryman's Lantern: mana from hexes; how much likelier soul motes
    antler: { every: 6, sanct: 2, damageMul: 1.25, scale: 1.3, color: 0xfff0b0 }, // Hart's Antler: which cast is a lance, and what it lays
    gravemonger: { chance: 0.5, heartPriceMul: 2 },                     // Gravemonger's Contract: a foe's obol (halved when cleansed); the merchant's hearts
    lastRite: { rise: 1, every: 1, everyCleansed: 2 },                  // The Last Rite: half hearts risen with; floors between refusals (cleansed: more)
  },
  // the pixel look (render/pixelLook.ts, the game's look since 2026-09-30): the rows of pixels it offers and the one it
  // starts at (1080 since the play-test of the room kit's proof, 2026-09-30; 540 before it: at 270, then 360, the mage
  // and small things didn't read full-screen on a high-resolution monitor). The offers are the rows that fall on whole screen pixels on the owner's
  // screens: 540 draws 540 rows at 1080p and 4K and 480 at 1440p; 720 draws 720 at 1440p and 4K; 1080 draws 1080 on
  // a 4K screen only; 360 and 270 are coarser. Outlines where a nearer surface stands more than outlineGap units before a
  // farther one (darkened by outlineDark), and light bands
  pixelLook: { lines: [1080, 720, 540, 360, 270], start: 1080, outlineGap: 0.3, outlineDark: 0.72, bands: 7 },
  // the room kit (M3.5 step 3): the floors' and walls' texels to a unit across and down the screen (render/pixelTextures.ts;
  // at 540 lines a one-cell room shows a unit as about 62 × 44 pixels, the floor seen from 45° above, a great hall as
  // 50 × 35; 48 × 34 keeps a texel square on screen and at least a pixel in both, at 1080 lines 2 to 3), how brightly
  // embers glow in the walls and floors that have them (basalt seams, charred beams), a floor's the less in a dark room;
  // the artifacts built in code: how much larger than built they float, how far a tall one is lifted clear of its pedestal
  // (its half height past this); their HUD icons (items/artifactIcons.ts): drawn at `size` pixels and scaled to `out`,
  // turned (x, y) to the camera, the margin round them, the light (fill, key, the rim in the artifact's colour), and the
  // alpha below which a pixel beside one above `solid` is outlined
  roomKit: {
    texel: [48, 34] as [number, number], glow: 0.6, glowDark: 0.5,
    artifactScale: 1.2, artifactClear: .24,
    icon: { size: 96, out: 48, turn: [.35, -.55] as [number, number], margin: 1.12, fill: 1.6, key: 2.4, rim: 1.6, edge: 60, solid: 140 },
  },
  // the spells' looks (magic/spellFx.ts, docs/effects.md), in seconds unless said: the Cinder Lance (how long it shows,
  // how quickly it swells to full, when it starts to fade, how long the rune ring at the hand flares, the space between
  // its rune rings in units, how fast its embers run down it in lengths a second); how long a bolt's impact flares, a
  // bolt of lightning lasts (Arc's a little longer, the crackles of Overload), a ring of light grows and fades (a flash
  // turned to the camera, a shockwave on the floor); the Pyre Seal's eruption (its flames and pillar rising, the crown
  // at full height, the pillar's fade, the star and rune ring going); the Glacial Wall's pillars rising, one step from
  // the middle after another
  spellFx: {
    lance: { life: 0.6, rise: 0.06, fade: 0.3, flare: 0.25, ringGap: 1.2, embers: 1.4 },
    impact: 0.22, strike: 0.22, chain: 0.3, crackle: 0.25, ring: 0.3, flash: 0.3, shockwave: 0.45,
    seal: { rise: 0.15, crown: 0.5, pillar: 0.7, star: 0.6 },
    wallRise: 0.25, wallStagger: 0.03,
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
export const BOSS_TYPES = ['warden', 'abbess', 'pyre', 'hart', 'angler', 'tiger'] as const satisfies readonly EnemyType[];
export type BossType = (typeof BOSS_TYPES)[number];
