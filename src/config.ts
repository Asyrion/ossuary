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
    abbess: { hp: 120, r: 0.7, speed: .95, dive: 2.7, under: 1.8, weak: 'storm' as const, resist: 'frost' as const }, // dive: speed of her ripple; under: seconds below
    pyre: { hp: 135, r: 0.72, speed: 1.25, charge: 8.2, weak: 'frost' as const, resist: 'ember' as const },
    // floors 4 and 5 (M4.1), built in code, with a weakness and a resistance like the foes: the hart's charge speed; the
    // angler's pull on the mage (units a second), how long it pulls, how close its bite reaches, and the share of its
    // health that, struck off while it pulls, makes it flinch
    hart: { hp: 150, r: 0.85, speed: 1.35, charge: 8.6, weak: 'umbral' as const, resist: 'hallow' as const,
      spokes: { every: .16, count: 4, hurtCount: 6, speed: 3.1 }, stamp: { count: 18, speed: 3, later: 2.6 } }, // its spokes of light, and its stamp's ring (a second below half health)
    angler: { hp: 165, r: 0.9, speed: 1.1, pull: 2.6, pullTime: 2.4, reach: 1.7, flinch: .06, weak: 'hallow' as const, resist: 'umbral' as const,
      bite: 2, spit: { count: 3, spread: .55, speed: 3.3, hex: 10 }, ring: { count: 16, speed: 2.7, later: 2.3 } }, // half hearts a bite; its hexing volleys; its breath's ring
    // the War-Tiger (M4.2, from the Eda lore): a statue until the mage comes within `wake` (or strikes it); its `plates` let
    // through only `guard` of a blow at first, more with each lost, until all of it; a plate falls to a glyph's blast, a
    // Shatter (a shock on its rimed plates) or `wear` damage turned; each lost makes it `plateSpeed` faster (below half
    // health, `hurtSpeed` times as fast). Its pounce
    // (a tell, then a leap at where the mage stood, throwing frost shards on landing), its swipe (a tell, then a fan of
    // claws fanning out from its paw), its roar (a ring; a second below half health)
    tiger: { hp: 110, r: .85, speed: 1.5, weak: 'storm' as const, resist: 'frost' as const, wake: 3, plates: 4, guard: .4, wear: 30, plateSpeed: .14, hurtSpeed: 1.15,
      pounce: { tell: .6, speed: 8.5, time: .9, shards: 8, shardSpeed: 3, chill: 1 }, swipe: { reach: 2, tell: .55, count: 5, spread: 1.1, speed: 3.6 },
      roar: { tell: .7, count: 14, speed: 2.9, later: 2.5 } },
    // the Pillar Dragon (M4.2, from the Eda lore): `r` is its head's, all a bolt can reach; it comes down from `enter` high
    // onto a coil round a pillar's top (`coil`), leans out `lean` beyond it, waits `settle` (then `pause` between breaths),
    // breathes `breaths` times (fire and frost by turns: a tell, then a stream sweeping across the mage), then flies to
    // another pillar (`nearest`: how often the one nearest the mage). Knocked off, it lies `down` seconds, taking `open`
    // times each blow, then climbs at `climb`. Pillars it raises rise `depth` in `time`; below half health a `ring` as it lands,
    // and its waits `hurtQuick` times as long
    dragon: { hp: 115, r: .6, speed: 0, hurtQuick: .75, weak: 'umbral' as const, resist: 'ember' as const, enter: 5, lean: 1.1, settle: 1.1, pause: 1, breaths: 2, down: 4, open: 1.5, climb: 5,
      coil: { radius: .62, turns: 1.25, drop: 1.2 }, fly: { speed: 7, lift: 1.4, nearest: .65 }, rise: { time: 1.2, depth: 2 },
      breath: { tell: .7, time: 1, every: .08, speed: 4.2, sweep: .75 }, ring: { count: 12, speed: 2.8 } },
    // the Twin Guardians (M4.2, from the Eda lore): each has `hp`; they stand `apart`, statues until the mage comes within
    // `wake` of either; the shielding twin goes back to its post (at `guardSpeed`),
    // its drinking ward holding `wardNeed`, `wardSize` across; they trade the shield every `swap` seconds; the striker pauses `pause` between
    // blows: its slam (a tell, a ring of stone, a blow within `reach`) and its gaze (a tell, then `count` shots of gold,
    // `every` apart); the striker stops `keep` from the mage, and the shielder's touch is only `shieldContact`. The last one standing rages: `speed` times faster, its waits `quick` times as long
    // the jelly serpent (M5 step 7): it swims hidden through its jelly at `swim` for `under` seconds (`hurtQuick` times as
    // long below half health), rises where it will come up (a `tell`), then lunges at a mage within `reach` (a tell, then
    // `speed` for `time`) or spits `spit.count` globs `spit.every` apart (each landing in `flight` s, half a heart to the
    // mage where it lands, and a puddle of jelly, `spit.puddles` in the room at most); stays up `open` seconds; out of the
    // jelly it crawls at `crawl`. A shock through its jelly, or the jelly freezing, traps it at the surface for `trapped`
    // seconds (a shock hurts it `shock` too); below half health it surfaces with a `ring` of jelly. `flood`: the tiles of
    // jelly poured round it where it has none (a floor's boss)
    serpent: { hp: 95, r: .55, speed: 0, weak: 'storm' as const, resist: 'frost' as const, swim: 3.4, under: 2.2, hurtQuick: .7, crawl: 1.1, reach: 3.4, tell: .6, open: 1.5, trapped: 3, shock: 6, flood: 34,
      lunge: { tell: .4, speed: 8.5, time: .42 }, spit: { count: 3, every: .28, flight: .7, spread: 1.6, puddles: 6 }, ring: { count: 10, speed: 2.6 } },
    twins: { hp: 65, r: .9, speed: 1.1, keep: 1.5, shieldContact: 1, weak: 'frost' as const, resist: 'hallow' as const, wake: 3.2, apart: 3.4, swap: 6, guardSpeed: 2.8, wardNeed: 45, wardSize: 1.3, pause: 1.4,
      slam: { tell: .65, count: 12, speed: 3, reach: 1.9, hurt: 1 }, gaze: { tell: .7, count: 6, every: .1, speed: 5.5 }, rage: { speed: 1.4, quick: .7 } },
  },
  // what the foes in code do to the mage (M4): chilled by cold breath and rime, this much slower; a salamander's burning
  // ground burns the mage within `groundReach` (plus half the mage's size) and licks up a flame `groundLicks` times a
  // second; foes' embers and cold touch what they pass every `touchEvery` seconds, within `emberReach` and `coldReach`;
  // the dev hook's test shot (`__game.shoot`) flies at `testShot`; a storm ray's sparks arm after `sparkArm` seconds
  // (hexShow: seconds the hexed chip stays beside the mana bar after a hexing blow; drawnMin: how strong a pull must be,
  // units a second, to show the drawn-in chip, which stays drawnShow seconds; lineShow: seconds each first-time line stays)
  afflict: { chillSlow: .4, groundReach: .3, groundLicks: .7, sparkArm: .35, touchEvery: .1, emberReach: .2, coldReach: .1, testShot: 3.8, hexShow: 2.5, drawnMin: .4, drawnShow: .5, lineShow: 3.5 },
  // M4.5's bestiary: how fast the mage walks through a spider's web and an ink octopus's smear; how much faster a lark's
  // song makes the foes round it; how much grip the mage keeps on a rime snail's trail; the health an elemental drinks from
  // each stack of its own school's status; how fast the mage walks in a basilisk's stare; a nest's or a perch's spot in the
  // wall: open to the room `wallOpen` units in front (no pillar hiding it from bolts) and `wallApart` from another nest
  bestiary: { webSlow: .45, inkSlow: .65, songHaste: 1.4, rimeGrip: 3.5, statusHeal: 2, gazeSlow: .3, wallOpen: 2.6, wallApart: 2.2 },
  /** M4.9 The curve: a floor leans its library to a school its foes are weak to when that many of them are (`lean`), and
      walls off a school when that many resist or drink it (`wall`, its banner's line); a hex's debt lasts `hexDebt` s. */
  curve: { lean: .3, wall: .45, hexDebt: 8, trail: 7, trailStep: .045, lineShow: 4.5, extraAt: [-.9, .7] as [number, number] }, // (trail: motes in a hex's trail back to its thrower, trailStep the seconds between them; lineShow: the floor's warning; extraAt: where an extra foe stands beside the one it copies)
  // foes in each other's ground (M4.7): how often the ground's harm comes again, the burn, shock and sting it brings, a
  // spark's damage, and how far ahead a golem or elemental looks to step round it
  foeGround: { every: .5, burn: 1.5, shock: .4, sparkDamage: 2, sting: 1.5, look: .75, lookAt: [.5, 1], steer: [.7, -.7, 1.4, -1.4] },
  // a leap or a dash with stone in its way turns off by the least of these (radians, either side) that is clear (wayRound)
  foeWay: { turns: [.6, 1.1, 1.6] },
  /** M4.6 transformations (items/transforms.ts): how long the banner stays; the gifts: the Pyromancer's embers (seconds they
      burn), the Frostborn's chill on a touch (stacks, and how often one foe can be chilled so), the Stormcaller's leap (every
      how many bolts, how far, and the share of the bolt's blow), the Shadowstep's blink (how far, how often, and how long
      the mage can't be struck), the Runescribe's rune (how soon it bursts, how far, the share of the bolt's blow), the
      Pilgrim's step, the Lightbearer's float (how high, and its bob), the Beastcaller's familiars (how many more, and how
      much harder they strike); and how far the robes are tinted towards the transformation's light. */
  transform: {
    banner: 3.2, after: 1.8, // (after: seconds between an artifact's own card and the transformation it completes)
    ember: { time: 1.6 }, frost: { chill: 1, every: .8 }, storm: { every: 5, reach: 4.5, share: .8 },
    blink: { dist: 2.4, every: 1.6, invuln: .25 }, rune: { delay: .55, reach: 1.1, share: .6 },
    pilgrim: { speed: 1.12 }, float: { lift: .14, bob: .035 }, beast: { more: 1, damageMul: 1.5 }, tint: .3,
  },
  /** M4.11 spell marks (actors/spellMarks.ts): a spell in hand (its light's size, motes, brightness ready and cooling, how
      far above the hand, the ready flash's reach, how often a Storm spell crackles), the master's ring (radius, turn), the
      attunement aura (motes, how far round the mage, its glow), the knowledge circle (radius, how far out its runes stand
      and their size, the gap between arcs, how long the mage stands still before it shows, how fast it fades in and out,
      its turn), each school's motion (how far its motes travel, up or down), and how long a mark's first line stays. */
  marks: {
    hand: { size: .34, motes: 7, ready: 1, dim: .25, lift: .04, flash: .26, spark: .45, pulse: 3, shimmer: 6, shimmerBy: .06, flicker: 9, grey: .7, cooling: .7 },
    ring: { radius: .085, spin: 2.2 },
    /** M6 step 7: the runes carved in a slot show at its hand: a speck in each rune's colour (Thrice three, fanned) circling
        it (`r` out, `spin` a second, Quicken's `quick` times faster; Seeking's wider, swaying), Wide a faint disc under it,
        Vein's red in the glow (`vein` of it), Lasting's slower fade, Reprise's second, fainter flash `echo` s later. */
    runes: { r: .085, seek: .13, size: .022, spin: 2.4, quick: 2, disc: .17, discOpacity: .18, vein: .45, lasting: .5, echo: .22 },
    aura: { motes: 16, radius: .32, glow: 1.5 },
    circle: { radius: .6, out: .09, rune: .085, gap: .06, after: 1, fadeIn: .6, fadeOut: .25, spin: .15 },
    rise: { ember: .4, frost: -.3, storm: .15, hallow: .35, umbral: -.25, verdant: .2 } as Record<string, number>, // (M5: Verdant's leaves drift up slowly)
    line: 4,
  },
  /** M4.6 Asyrion's arc (items/arc.ts): how many artifacts held bring each stage of the chaos mage's pieces, and how long
      each stage's line stays. */
  arc: { at: [3, 6, 9, 12], line: 4.5 },
  // M6 (docs/M6-plan.md): insight, the GDD's XP, and levels. `at`: the insight each level from 2 to the cap needs (the
  // last is the cap's; the curve measured over 2,000 seeds is the plan's table); a foe's purse is its health on its floor
  // ÷ `foeDiv`; a room's first clear gives `perFloor` × the floor (an ordeal `ordealMul` times that), as does each potion's
  // kind first used in a run; the jelly serpent gives its health ÷ `serpentDiv`. Each boss's insight is its floor's
  // (data/floors.json), the Grave Draught's in data/alchemy.json. `streak`: the light that runs from a fallen foe to the
  // casting hand (seconds, size, how many fly at once at most, motes in its trail and how far apart, how high it arcs); `gold`: insight's
  // own light (a foe of no school, a room, a potion); `chimeGap`: seconds between its chimes at least.
  // M6 step 2, the four attributes (progression/attributes.ts), per point: Vigor half a heart container every
  // `pointsPerHalf`; Arcana spell damage +`spell`; Will max mana +`mana` and its coming back +`regen`; Swiftness move speed
  // +`speed` and the cantrip's delay −`delay` (its floor kept). Each in a line with its points, never compounding.
  attributes: { vigor: { pointsPerHalf: 2 }, arcana: { spell: .06 }, will: { mana: 10, regen: .05 }, swiftness: { speed: .03, delay: .03 } },
  levels: { at: [20, 70, 145, 240, 340, 450, 700, 1030, 1400, 1780, 2500], foeDiv: 4, perFloor: 4, ordealMul: 2, serpentDiv: 2,
    streak: { time: .6, size: .36, max: 48, trail: 5, gap: .05, rise: .9 }, gold: 0xe8c878, chimeGap: .12,
    // the level-up screen: seconds of calm after a fight before it opens, and seconds a choice is locked as it opens (a key held from the fight)
    calm: .8, lock: .4,
    lineFirst: 4.5, lineCap: 4 }, // (how long the first insight's line and the cap's stay)
  // M6 step 8: runes as things: how often a dropped rune leans to the spells in the slots (else any of the seven), and the
  // chip's size lying on the floor
  runeDrops: { lean: 2 / 3, chip: .24 },
  // M6 step 9, the waystone: how near (beside its half-width) the mage must stand to reach it or cast into it, how long it
  // takes to rise and from how deep, where it rises in the boss room (from the middle: to the side and back, out of reach of
  // the page, the pedestals, the heart and the trapdoor), the rest's streaks of mana and the gap between them, its blocker's
  // half-width
  waystone: { reach: .75, rise: 1.4, depth: 1.95, at: [4.4, -1.8], streaks: 7, streakGap: .08, half: .38 },
  // M6 step 5, the school boons at work (progression/boonHooks.ts): half hearts boons mend in one room at most (Votive
  // Heart and Thirsting Hex together); Seedfall's plants, `seedMax` a room at most, sought within `sowReach` tiles of the
  // fall and kept `sowClear` tiles from the mage, a door's lane and the room's middle; Spark Wake's spark refreshed rather
  // than laid again within `sparkMerge` of another of the mage's; Flamekeeper's embers run from each flame to the hand
  // every `emberEvery` seconds.
  boons: { mendPerRoom: 1, seedMax: 4, sowReach: 2, sowClear: { mage: 1, door: 1.6, middle: 1.2, foe: .5, item: .6 }, sparkMerge: .6, emberEvery: .35,
    // M6 step 3, the deal's lean (progression/boonData.ts): every school's weight starts at `base`, and gains `slot` for each
    // of its spells in the slots, one for every `castsPer` casts of it this run (`castsMax` at most), `boon` for each rank of
    // its boons taken and `pledge` for a pledge
    lean: { base: 1, slot: 3, castsPer: 5, castsMax: 3, boon: 2, pledge: 2 } },
  /** M4.6 costumes (actors/costume.ts): the focus held in the casting hand (its scale, where along it the hand grips: 0 its
      middle, negative below; how far it leans forward and out), each spot's scale for an artifact's own model carried
      there, and a cursed piece's glow (a share of its height) and how often it weeps a red drop. */
  costume: {
    focus: { scale: 1.05, grip: -.22, lean: .35, tilt: .18 },
    carry: { belt: { scale: .42 }, back: { scale: .62 }, shoulder: { scale: .48 }, chest: { scale: .36 }, wrist: { scale: .34 } },
    curse: { glow: 2.2, drip: .35 },
    closeUp: { zoom: 4.5, y: .75 }, // (the dev menu's close-up on the mage: how near, and how high it looks)
  },
  // how the Stormcharged and Hallowed mantles look apart (M4.7): the storm's segments of lightning at most, its bolts round
  // the ring and arcs on the body, how often they crackle anew, its cloud's size and height over the head and how often it
  // strikes; the halo's size and height over the head
  mantleLooks: { storm: { segments: 40, ringBolts: 7, arcs: 3, flicker: .07, cloudSize: .55, cloudOver: .55, strikeEvery: 1.4 }, halo: { size: .26, over: .28 } },
  // rooms with a pair (M4.7): how far beside the first foe the second is set
  pairs: { gap: 1.1 },
  // a foe's weakness and resistance (M4; GDD: Enemy affinities): the damage of its weak school and of its resisted one; an
  // elemental's (M4.5): its weakness's, and the share of a blow of its own school it drinks as health
  affinity: { weak: 1.5, resist: .5, elemental: 2, drink: .5 },
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
  merchant: { shadeAt: -1.9, waresAt: .9, spacing: 2.3, reach: .45, boltFizzle: .6, panelReach: 1.5 }, // (panelReach, 2026-10-02: how near a ware its panel shows)
  // the lore card on pickup: seconds on screen, at least, a little more per word of lore, and at most
  lore: { least: 4, perWord: .04, most: 6 },
  // water and oil (world/pools.ts): wading speed (the mage and walking foes), seconds oil burns and water stays
  // frozen, the burn burning oil sets on foes and how often, the half hearts it and a shocked pool take from the
  // mage, how long a shocked pool crackles, and the drowned floor's puddles (how many per fight, tiles each)
  // M4.2: how fast a current carries the mage and walking foes, bolts and shots over it, and pickups lying in it (units a second)
  flow: { carry: 1.7, bolts: 1.1, pickups: 1.3 },
  surface: { wade: .6, jellyWade: .42, oilBurn: 5, iceTime: 8, groundBurn: 2, tick: .25, mageHurt: 1, charged: .5, shockSpread: 1.5, shockDamage: 2, puddles: [1, 2] as [number, number], puddleSize: [2, 4] as [number, number], boilEvery: 2.5, boilSteam: 1.3, driveReach: 1 }, // (jellyWade: M5, walking through the jelly serpent's jelly; boilEvery: seconds before fire on a pool of water boils it into steam again; boilSteam: that cloud's size; driveReach: how far beyond a blast or a cloud a water foe hiding in other water is driven up)
  // the rooms' objects (M3.6, world/props.ts): how long each flammable one burns (seconds), how often burning spreads
  // to what burns beside it, cobwebs' slowing, the briar's sting (half hearts to the mage, damage a second to walkers),
  // the oil a broken cask spills (tiles beyond its own), and glowcap spores (how long a cloud hangs, its reach, the
  // flash when fire finds it: damage to foes, Burn stacks, half hearts to the mage within reach)
  props: {
    burn: { roots: 3.5, tree: 6, briar: 2, web: .45, sacks: 1.6, desk: 3, scrolls: .7, bridge: 4, blossom: 1.2 } as Record<string, number>, spread: .5,
    // M4.2: half hearts a fall through a burnt rope bridge takes from the mage
    fallHurt: 2,
    webSlow: .45, briarHurt: 1, briarDamage: 2, caskSpill: 3,
    spores: { time: 4, reach: 1.3, stingReach: 1.04, damage: 6, burn: 2, mageHurt: 1 }, // (stingReach: where a stinging cloud's thick enough to sting)
    // M5: a flowering plant's burst: how far its pollen reaches, and the seconds it overgrows the foes there
    blossom: { reach: 1.8, grow: 4 },
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
    // M4.10: the stacks of each school a rune stone's reaction lays on the foes in its reach (Chill as many as freeze); the
    // sparks a bell rung by a shock rings out (how many, how far round it, how long they lie)
    runeStacks: 2, bellSparks: { n: 10, d: 1.7, time: 6 },
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
    // M4.9: a sluice gate: seconds the room's water stays drained once it opens; how often the water foes in the mud are
    // driven up again; seconds before it can be opened again once shut
    sluice: { open: 8, drive: .5, rest: 3, lift: .42 }, // (lift: how far the gate rises)
  },
  // M4.2: the drinking ward: how close to a sealed vault door a spell is drunk; the mana of spells a vault's ward holds, and
  // a foe's shield (the foe's blows it drinks, as damage); where the Wardling rises beside a foe whose shield broke
  ward: { reach: 4, need: 60, foeNeed: 60, beside: 1.2 },
  themes: { wakeReach: 2.6, riseAfter: 10, riseEvery: 6, riseMost: 3, pageChance: .3, caveReach: 3.5, caveStones: 3, caveDelay: .8, caveDamage: 8, daylightClear: 3, bedrollClear: 2,
    // M4.1: the drowned climb out of the landing's river this long into a fight, then this often, at most this many
    drownAfter: 5, drownEvery: 7, drownMost: 3,
    // M5: how much longer Overgrown holds on foes in the overgrown garden
    gardenGrow: 1.75 },
  // the library: how close the mage must come to a page, the gap between lecterns, and how far into the room
  // (from the door) their row stands, for a door on a long side and on a short one
  library: { reach: .4, spacing: 2.3, spacingShort: 1.9, rowIn: 1.1, rowInShort: 2.6 },
  // spell knowledge (M3.7): casts over all runs that make a learned spell known well (its lore and reactions shown), and
  // how near a grimoire page (in tiles) its panel shows
  knowledge: { usedCasts: 10, pageReach: 2 },
  // locked vaults: glyph blasts that force the ward, and where the warden rises (room-relative z)
  vault: { blastsToForce: 2, wardenAt: -1.8 },
  // M4.2: the Wandering Merchant: the chance an ordinary room's cleared fight calls the merchant (once a run), from which floor
  // (0-based); seconds riding in from the door; where the beast stops (from the room's middle), how far in front of it
  // and how far apart the wares lie; the box the beast blocks
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
  // obols drift to the mage from this close; a coin sways this far (radians) either way as it turns; a coin face's light
  // from within, and how many game pixels a coin wearing one is across (2026-10-02: the owner's coins; its face is drawn
  // on the fine layer, pixelLook.fineLayer pixels to each of these)
  pickups: { obolDrift: 1.8, coinSway: .45, coinGlow: .2, coinPixels: 24 },
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
    // Fen-Nex (M4.2): its size at each stage, and how much faster each stage runs; how far behind the mage it keeps, how fast it runs and darts; how far off it
    // spies prey (plus its stage), and past how far from the mage it comes back to their side; its bite (every so often, the
    // cantrip's damage times `mul` at each stage) and its full shape's breath of Ember
    fennex: { scale: [.62, .9, .8], stageSpeed: .15, heel: .9, speed: 4.2, dash: 8, reach: 4, leash: 9, bite: { every: 1.3, mul: [.6, .85, 1.1] },
      breath: { every: 3.2, range: 3.2, count: 5, spread: .6, speed: 7, mul: .45, burn: 2 } },
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
  // the pixel look (render/pixelLook.ts, the game's look since 2026-09-30): the grid it starts on and the rows it offers
  // besides. It starts at the texel (2026-10-01, the owner: everything in the one pixel-art look): a game pixel is one of
  // the room kit's texels (roomKit.texel below), so everything is drawn at the floors' and walls' pixel size, about 2.6
  // screen pixels at 1080p in a one-cell room and 2 in a great hall. The rows offered besides fall on whole screen
  // pixels: 1080 (the default from the room kit's proof until then: at 1080p the screen's own pixels, so only what was
  // drawn texel by texel looked like pixel art), 720, 540 (the default before that), 360 and 270 (too coarse full-screen
  // on a high-resolution monitor). Outlines where a nearer surface stands more than outlineGap units before a farther one
  // (darkened by outlineDark), and light bands; a glow's fade (render/textures.ts, every glow sprite) and a shadow's held in
  // so many flat steps, as pixel art draws them; the fine layer's pixels to a game pixel each way (pixelLook.ts, FINE:
  // 2026-10-02, the owner's coins drawn finer than the rest, so their faces read)
  pixelLook: { lines: [1080, 720, 540, 360, 270], start: 'texel' as const, outlineGap: 0.3, outlineDark: 0.72, bands: 7, glowSteps: 5, shadowSteps: 3, fineLayer: 2 },
  // alchemy (M5, items/potions.ts and potionThrow.ts; docs/M5-plan.md): the belt's slots, a bottle's and a reagent's size as built, the
  // chance a fallen foe or a broken object leaves its reagent (items/reagents.ts; the Alchemist's Satchel's more), what Dr.
  // Jelly asks for a recipe (obols), the laboratory's: how near the table or Dr. Jelly opens the table, how far behind the
  // table Dr. Jelly stands, the chance a burst jelly globe lets out a jelly (else a reagent), how far its vat window keeps
  // from a door in the north wall, how low Dr. Jelly crouches while the room is locked (his height); the jelly serpent's vat (M5 step 7): bolts that crack its window open (`cracks`, a
  // crack counted at most every `crackGap` seconds), the chance a run's serpent is restless (it breaks out by itself
  // `restlessAfter` seconds after the first brew in its laboratory), the jelly it floods the room with (tiles); how
  // long the potion key is held before it throws rather than drinks (seconds); a throw's reach, its flight (seconds) and
  // how high it arcs, the splash's reach; a foe in a Philter's splash strikes another this many times its touch, and a drunk Philter's echo comes so
  // many seconds after the cast; the Grave Draught's thrall (its pace, a blow, seconds between blows, how near it strikes);
  // M5 step 8: the Cracked Retort's splash (times as wide) and its glass's cut, and how far apart the Alchemist's split
  // bottles land (across the aim)
  alchemy: { belt: 3, bottleScale: 1.45, reagentScale: 1.8, reagent: { foe: 0.12, object: 0.3, blossom: 0.6, satchelMul: 1.3 }, recipePrice: 6, lab: { reach: 0.55, jellyAt: 1.6, globeJelly: 0.4, windowClear: 2.5, duck: 0.3, give: { reach: .35, hold: .6, toss: .4, back: .45, size: .22, arc: .45, shoulder: -2.1, out: -.55, elbow: -.4, lean: .1, nod: .15 } }, vat: { cracks: 3, crackGap: 0.25, restless: 0.35, restlessAfter: 1.4, flood: 30 }, hold: 0.25, reach: 4.5, flight: 0.45, arc: 1.1, splash: 1.1, echoMul: 6, echoAfter: 0.3, thrall: { speed: 2.4, damage: 7, every: 0.7, near: 0.7 }, retort: { splashMul: 1.5, cut: 6 }, split: 2 },
  // the soundscapes and the music (docs/sound-plan.md, audio/director.ts): scheduled `ahead` seconds before they sound
  // (`hiddenAhead` in a hidden tab, whose timers run once a second; the scheduler's own timer every `tick` ms); the music
  // thins at `lowHp` half-hearts or fewer; the floor's bed ducks to `fightDuck` while the doors are locked, `bossDuck`
  // with a boss alive, `pauseDuck` in the pause menu, and `themeDuck` under a themed room's touch; a bed layer sends
  // `bedSend` of itself to the space; the music plays at `music.level` (under the bus), `music.send` of it to its space,
  // muffled to `music.muffle` Hz when paused, through a compressor (`glue`) holding a boss's full stems under the effects;
  // the dev menu's preview lasts `preview` seconds; a sound played from a file (audio/samples.ts) has its pitch moved by up
  // to `fileSpread` either way each time, so a sound heard again isn't the same
  audio: {
    ahead: 0.6, hiddenAhead: 1.6, tick: 250, lowHp: 2, fightDuck: 0.65, bossDuck: 0.45, pauseDuck: 0.5, themeDuck: 0.9, bedSend: 0.3,
    music: { level: 0.5, send: 0.55, muffle: 700, glue: { threshold: -16, ratio: 3.5, knee: 10, attack: 0.02, release: 0.3 } },
    preview: 40, fileSpread: 0.03,
  },
  // creatures made in Tripo and animated in code (actors/madeCreatures.ts, docs/creatures.md): the lap walked (its radius),
  // seconds walking and resting (and resting first), how long one clip blends into the next, how fast it turns to the mage
  // to roar, its shadow's size against its length, where the dev menu stands it from the mage (to the side, and south),
  // and the loudness of its footsteps and of its loud events (the roar, the slam)
  creatures: {
    lap: 1.3, walkFor: 6, restFor: 1.4, firstRest: 0.8, blend: 0.3, turn: 6, shadow: 0.55, standSide: 2.6, standSouth: 0.6, stepGain: 0.3, roarGain: 0.4,
    // the look made from its own texture (actors/texturePixel.ts, render/texelBake.ts, 2026-10-05): the texture shrunk to at
    // least one texel a game pixel (times `detail`, a power of two within [min, max]; `facing`, the share of its faces
    // turned to the camera); texels at least `glowLight` light
    // and `glowChroma` colourful (OKLab) kept where they are `glowShare` of a block, and lit at `glowGain`; its shadows
    // lifted (lightness to the power `lift`) and its `contrast` set; cut to `colours` (k-means `refine` rounds, hue counted
    // `chroma` times)
    texel: { detail: 1, facing: 0.5, min: 64, max: 512, glowLight: 0.65, glowChroma: 0.12, glowShare: 0.2, glowGain: 0.7, lift: 0.8, contrast: 1.1, colours: 24, refine: 8, chroma: 3 },
  },
  // the mage in the pixel-art look (actors/heroPixel.ts, 2026-10-01): its texture baked into its vertices (each the mean of
  // the texels within `sample` of where it lies) and cut down to `colours`; light in the `tones` (darkest first, a toon
  // ramp's steps) with `glow` of its own colour as self-light, as the model had, so it reads in dark rooms
  heroPixel: { colours: 20, refine: 8, chroma: 3, tones: [.06, .16, .5, .95], glow: .14, sample: 1 },
  // the room kit (M3.5 step 3): the floors' and walls' texels to a unit across and down the screen (render/pixelTextures.ts;
  // at 540 lines a one-cell room shows a unit as about 62 × 44 pixels, the floor seen from 45° above, a great hall as
  // 50 × 35; 48 × 34 keeps a texel square on screen and at least a pixel in both, at 1080 lines 2 to 3), how brightly
  // embers glow in the walls and floors that have them (basalt seams, charred beams), a floor's the less in a dark room;
  // the artifacts built in code: how much larger than built they float, how far a tall one is lifted clear of its pedestal
  // (its half height past this); their HUD icons (items/artifactIcons.ts): drawn at `size` pixels and made pixel art of
  // `out` (shown at whole multiples), turned (x, y) to the camera, the margin round them, the light (fill, key, the rim in
  // the artifact's colour), and how much of an icon pixel must be drawn (its alpha, 0 to 255) for it to be `solid`
  roomKit: {
    texel: [48, 34] as [number, number], glow: 0.6, glowDark: 0.5,
    artifactScale: 1.2, artifactClear: .24,
    icon: { size: 96, out: 24, turn: [.35, -.55] as [number, number], margin: 1.12, fill: 1.6, key: 2.4, rim: 1.6, solid: 110 },
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
    weaveName: 2, // (M4.10: seconds before the same weave's name rises again, for those that go on and on)
    nameGap: .44, nameStack: .5, // (a name rising where another rose under `nameStack` s ago stands `nameGap` above it on screen)
  },
  lights: {
    hemi: 1.57, moon: 1.26,
    torch: 4.3, torchDistance: 9, torchDecay: 0.5,
    lantern: 3.8, lanternDistance: 6.5, lanternDecay: 0.5,
    exposure: 1.2,
  },
};

export type EnemyType = keyof typeof CFG.enemy;
/** Enemy types that are bosses; each floor draws its boss from a pool of these (data/floors.json). The jelly serpent (M5)
    is in no pool: it breaks out of its vat in Dr. Jelly's laboratory (or comes with `?boss=serpent` and the dev menu). */
export const BOSS_TYPES = ['warden', 'abbess', 'pyre', 'hart', 'angler', 'tiger', 'dragon', 'twins', 'serpent'] as const satisfies readonly EnemyType[];
export type BossType = (typeof BOSS_TYPES)[number];
