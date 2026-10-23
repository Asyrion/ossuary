/* Tuning: everything worth tweaking lives here (the `lights` are tuned for three.js physically based lighting). */
export const CFG = {
  hero: {
    speed: 4.3,
    radius: 0.3,
    height: 1.3,
    hearts: 3,
    damage: 3.5,
    fireDelay: 0.36,
    shotSpeed: 8.8,
    range: 6.8,
    invuln: 1.0,
    shotInherit: 0.3,
    stripBase: true,
    mana: 100,
    runAnimSpeed: 3.0, // playback speed of the run clip at full speed; raise if feet slide
    walkAnimSpeed: 10.5, // playback speed the walk clip would need at full speed (it only plays when slow)
    walkToRun: [0.12, 0.3] as [number, number], // between these fractions of full speed the walk hands over to the run
    drinkSpeed: 1.4, // playback speed of the draught when the mage is healed
    fidget: [9, 16] as [number, number], // seconds standing still before the mage eats something
  },
  // mana (GDD: Magic system): regained each second out of a fight and in one, and for each foe the cantrip
  // puts to rest (a mana vial's worth is in data/loot.json); a foe marked by the Ferryman's Toll pays at most every
  // `tollEvery` seconds
  mana: { calm: 4, fight: 1, perKill: 3, tollEvery: 0.2 },
  enemy: {
    // a plain walker with no school, in no floor's fights (the foes in code fill them): the browser tests' target
    rotling: { hp: 10, r: 0.32, speed: 1.35 },
    dummy: { hp: 1000, r: 0.34, speed: 0 }, // the dev menu's training dummy: stands still, never falls
    // bosses (each floor's boss block in data/floors.json scales them)
    warden: { hp: 120, r: 0.78, speed: 1.15, windUp: { windBurst: 0.75, windAim: 0.5 } }, // windUp: seconds of each wind-up
    abbess: { hp: 120, r: 0.7, speed: 0.95, dive: 2.7, under: 1.8, weak: 'storm' as const, resist: 'frost' as const }, // dive: speed of her ripple; under: seconds below
    pyre: { hp: 135, r: 0.72, speed: 1.25, charge: 8.2, weak: 'frost' as const, resist: 'ember' as const },
    // floors 4 and 5, built in code, with a weakness and a resistance like the foes: the hart's charge speed; the
    // angler's pull on the mage (units a second), how long it pulls, how close its bite reaches, and the share of its
    // health that, struck off while it pulls, makes it flinch
    hart: {
      hp: 150,
      r: 0.85,
      speed: 1.35,
      charge: 8.6,
      weak: 'umbral' as const,
      resist: 'hallow' as const,
      spokes: { every: 0.16, count: 4, hurtCount: 6, speed: 3.1 },
      stamp: { count: 18, speed: 3, later: 2.6 },
      shotFrom: 0.5,
    }, // its spokes of light, and its stamp's ring (a second below half health), each shot leaving `shotFrom` out from its middle (all on its centre, their halos piled into one white disc)
    angler: {
      hp: 165,
      r: 0.9,
      speed: 1.1,
      pull: 2.6,
      pullTime: 2.4,
      reach: 1.7,
      flinch: 0.06,
      weak: 'hallow' as const,
      resist: 'umbral' as const,
      bite: 2,
      spit: { count: 3, spread: 0.55, speed: 3.3, hex: 10 },
      ring: { count: 16, speed: 2.7, later: 2.3 },
      // its lure (fantasyBosses.ts anglerFierce): an amber lamp (`core`, the shore's lantern accent) in a glow of hard bands
      // (`rings`) of `color`, `size` across at rest and at most `most` as it brightens, from `opacity` up to `peak` (a soft
      // added glow 3.5 across at full strength flooded the mage it draws in), `dim` when struck off its pull; its halo's
      // pool at most `haloMost` as it winds up (at 0.95 it burnt near white)
      lure: {
        core: 0xe8a84a,
        color: 0xe8a84a,
        rings: [
          [0.3, 0.9],
          [0.6, 0.5],
          [1, 0.22],
        ] as readonly (readonly [number, number])[],
        size: 1.3,
        most: 2.4,
        opacity: 0.35,
        peak: 0.55,
        dim: 0.15,
      },
      haloMost: 0.6,
    }, // half hearts a bite; its hexing volleys; its breath's ring
    // the War-Tiger (from the Eda lore): a statue until the mage comes within `wake` (or strikes it); its `plates` let
    // through only `guard` of a blow at first, more with each lost, until all of it; a plate falls to a glyph's blast, a
    // Shatter (a shock on its rimed plates) or `wear` damage turned; each lost makes it `plateSpeed` faster (below half
    // health, `hurtSpeed` times as fast). Its pounce
    // (a tell, then a leap at where the mage stood, throwing frost shards on landing), its swipe (a tell, then a fan of
    // claws fanning out from its paw), its roar (a ring; a second below half health)
    tiger: {
      hp: 110,
      r: 0.85,
      speed: 1.5,
      weak: 'storm' as const,
      resist: 'frost' as const,
      wake: 3,
      plates: 4,
      guard: 0.4,
      wear: 30,
      plateSpeed: 0.14,
      hurtSpeed: 1.15,
      pounce: { tell: 0.6, speed: 8.5, time: 0.9, shards: 8, shardSpeed: 3, chill: 1 },
      swipe: { reach: 2, tell: 0.55, count: 5, spread: 1.1, speed: 3.6 },
      roar: { tell: 0.7, count: 14, speed: 2.9, later: 2.5 },
    },
    // the Pillar Dragon (from the Eda lore): `r` is its head's, all a bolt can reach; it comes down from `enter` high
    // onto a coil round a pillar's top (`coil`), leans out `lean` beyond it, waits `settle` (then `pause` between breaths),
    // breathes `breaths` times (fire and frost by turns: a tell, then a stream sweeping across the mage), then flies to
    // another pillar (`nearest`: how often the one nearest the mage). Knocked off, it lies `down` seconds, taking `open`
    // times each blow, then climbs at `climb`. Pillars it raises rise `depth` in `time`; below half health a `ring` as it lands,
    // and its waits `hurtQuick` times as long
    dragon: {
      hp: 115,
      r: 0.6,
      speed: 0,
      hurtQuick: 0.75,
      weak: 'umbral' as const,
      resist: 'ember' as const,
      enter: 5,
      lean: 1.1,
      settle: 1.1,
      pause: 1,
      breaths: 2,
      down: 4,
      open: 1.5,
      climb: 5,
      coil: { radius: 0.62, turns: 1.25, drop: 1.2 },
      fly: { speed: 7, lift: 1.4, nearest: 0.65 },
      rise: { time: 1.2, depth: 2 },
      breath: { tell: 0.7, time: 1, every: 0.08, speed: 4.2, sweep: 0.75 },
      ring: { count: 12, speed: 2.8 },
    },
    // the Twin Guardians (from the Eda lore): each has `hp`; they stand `apart`, statues until the mage comes within
    // `wake` of either; the shielding twin goes back to its post (at `guardSpeed`),
    // its drinking ward holding `wardNeed`, `wardSize` across; they trade the shield every `swap` seconds; the striker pauses `pause` between
    // blows: its slam (a tell, a ring of stone, a blow within `reach`) and its gaze (a tell, then `count` shots of gold,
    // `every` apart); the striker stops `keep` from the mage, and the shielder's touch is only `shieldContact`. The last one standing rages: `speed` times faster, its waits `quick` times as long
    // the jelly serpent: it swims hidden through its jelly at `swim` for `under` seconds (`hurtQuick` times as
    // long below half health), rises where it will come up (a `tell`), then lunges at a mage within `reach` (a tell, then
    // `speed` for `time`) or spits `spit.count` globs `spit.every` apart (each landing in `flight` s, half a heart to the
    // mage where it lands, and a puddle of jelly, `spit.puddles` in the room at most); stays up `open` seconds; out of the
    // jelly it crawls at `crawl`. A shock through its jelly, or the jelly freezing, traps it at the surface for `trapped`
    // seconds (a shock hurts it `shock` too); below half health it surfaces with a `ring` of jelly. `flood`: the tiles of
    // jelly poured round it where it has none (a floor's boss)
    serpent: {
      hp: 95,
      r: 0.55,
      speed: 0,
      weak: 'storm' as const,
      resist: 'frost' as const,
      swim: 3.4,
      under: 2.2,
      hurtQuick: 0.7,
      crawl: 1.1,
      reach: 3.4,
      tell: 0.6,
      open: 1.5,
      trapped: 3,
      shock: 6,
      flood: 34,
      lunge: { tell: 0.4, speed: 8.5, time: 0.42 },
      spit: { count: 3, every: 0.28, flight: 0.7, spread: 1.6, puddles: 6 },
      ring: { count: 10, speed: 2.6 },
    },
    // Kaelith, the Shadow Sentinel (docs/M7-plan.md): the Seal's boss, in three phases (actors/kaelith.ts). It keeps
    // `keep` from the mage; its sweep (a tell, then `count` blades over `spread`, each hexing `hex`); its volleys (`count`
    // shots, `every` apart, each hexing); its shadow step (`sink` down, `gone` below, a ring of `cuts` as it rises `near` to
    // `far` from the mage, never where a light within `light` falls). Phase 2 (`phases[0]` of its health): it holds the seal at
    // the hall's middle, taking `guard` of each blow, a volley every `holdVolley` s; each ward still open lets out a foe every
    // `crackEvery` s (at most `hordeMax` alive); all shut, it `reel`s, taking `open` times each blow. Phase 3 (`phases[1]`):
    // the dark; every `pullEvery` s it pulls the mage (`pull` units a second for `pullTime`) unless they stand within
    // `candleSafe` of a lit candle stand, then a ring of `ring` blades; its waits `quick` times as long
    kaelith: {
      hp: 210,
      r: 0.8,
      speed: 1.3,
      weak: 'hallow' as const,
      resist: 'umbral' as const,
      keep: 2.2,
      phases: [2 / 3, 1 / 3],
      quick: 0.7,
      sweep: { tell: 0.7, count: 9, spread: 1.7, speed: 4, hex: 6 },
      volley: { tell: 0.45, count: 3, spread: 0.5, speed: 4.2, every: 0.4, hex: 8 },
      step: { sink: 0.5, gone: 0.8, rise: 0.4, near: 2.2, far: 4.2, light: 2.4, cuts: 8, cutSpeed: 3.2 },
      guard: 0.25,
      holdVolley: 2.4,
      crackEvery: 5,
      hordeMax: 4,
      reel: 4,
      open: 1.5,
      pullEvery: 7,
      pullTime: 2,
      pull: 2.4,
      candleSafe: 2.2,
      ring: { count: 16, speed: 3.2 },
      kneelClear: 4.4,
    }, // (kneelClear: how far from the hall's middle it kneels, clear of the way out and the gifts)
    twins: {
      hp: 65,
      r: 0.9,
      speed: 1.1,
      keep: 1.5,
      shieldContact: 1,
      weak: 'frost' as const,
      resist: 'hallow' as const,
      wake: 3.2,
      apart: 3.4,
      swap: 6,
      guardSpeed: 2.8,
      wardNeed: 45,
      wardSize: 1.3,
      pause: 1.4,
      slam: { tell: 0.65, count: 12, speed: 3, reach: 1.9, hurt: 1 },
      gaze: { tell: 0.7, count: 6, every: 0.1, speed: 5.5 },
      rage: { speed: 1.4, quick: 0.7 },
    },
  },
  // what the foes in code do to the mage: chilled by cold breath and rime, this much slower; a salamander's burning
  // ground burns the mage within `groundReach` (plus half the mage's size) and licks up a flame `groundLicks` times a
  // second; foes' embers and cold touch what they pass every `touchEvery` seconds, within `emberReach` and `coldReach`;
  // the dev hook's test shot (`__game.shoot`) flies at `testShot`; a storm ray's sparks arm after `sparkArm` seconds
  // (hexShow: seconds the hexed chip stays beside the mana bar after a hexing blow; drawnMin: how strong a pull must be,
  // units a second, to show the drawn-in chip, which stays drawnShow seconds; lineShow: seconds each first-time line stays)
  afflict: {
    chillSlow: 0.4,
    groundReach: 0.3,
    groundLicks: 0.7,
    sparkArm: 0.35,
    touchEvery: 0.1,
    emberReach: 0.2,
    coldReach: 0.1,
    testShot: 3.8,
    hexShow: 2.5,
    drawnMin: 0.4,
    drawnShow: 0.5,
    lineShow: 3.5,
  },
  // bestiary: how fast the mage walks through a spider's web and an ink octopus's smear; how much faster a lark's
  // song makes the foes round it; how much grip the mage keeps on a rime snail's trail; the health an elemental drinks from
  // each stack of its own school's status; how fast the mage walks in a basilisk's stare; a nest's or a perch's spot in the
  // wall: open to the room `wallOpen` units in front (no pillar hiding it from bolts) and `wallApart` from another nest
  bestiary: {
    webSlow: 0.45,
    inkSlow: 0.65,
    songHaste: 1.4,
    rimeGrip: 3.5,
    statusHeal: 2,
    gazeSlow: 0.3,
    wallOpen: 2.6,
    wallApart: 2.2,
  },
  // how some foes look in a moment of their fight (actors/bestiaryFloor3.ts, art bible 4.21): a fallen phoenix's ashes,
  // lumps [x, z, size] in grey ash tones (pale to dark) with `specks` of ember `speck` across; a burning salt golem's wax
  // running: drips a second, its colours, and the share of the burn's tint its pale made body takes (enemies.ts)
  foeLook: {
    flashMin: 0.45, // (the least of a hit's flash on a pale made body: actors/enemies.ts)
    ashes: {
      lumps: [
        [0, 0, 0.32],
        [0.24, 0.12, 0.22],
        [-0.23, 0.1, 0.21],
        [0.05, -0.2, 0.2],
        [-0.08, 0.26, 0.17],
      ] as readonly [number, number, number][],
      ash: [0x8a8288, 0x6a6068, 0x4e444e] as readonly number[],
      embers: [0xff6a20, 0xf0e070, 0xc83a14] as readonly number[],
      specks: 12,
      speck: 0.06,
    },
    wax: { drips: 14, size: 0.06, colors: [0xf4e8cc, 0xe8b060, 0xd88a30] as readonly number[] },
    tintK: { saltGolem: 0.3 } as Partial<Record<string, number>>,
    // a hydra's stump (actors/bestiaryCreatures.ts): its cut face `r` across in a raw red (`cut`) that reads on the dark
    // body; a seared one capped in charcoal (`char`) with `specks` ember specks (`ember`), so fire's work shows
    stump: { r: 0.16, tall: 0.32, cut: 0xc8404a, char: 0x3a3234, ember: 0xff8a2a, specks: 7, speck: 0.035 },
    // the dust pangolin (actors/bestiaryFloor5.ts): rolling, it rocks `swing` radians fore and aft `rate` times a second
    // (spun whole about its axle the made model showed its underside or its edge and was gone); dazed against a wall, a
    // puff of dust `size` across in `color`, dithered (`art` pixels across, the texel), for as long as it lies dazed
    pangolin: { rate: 14, swing: 0.5, dust: { size: 1.3, color: 0x9a8a72, art: 62, y: 0.35, opacity: 0.8 } },
  },
  /** The curve: a floor leans its library to a school its foes are weak to when that many of them are (`lean`), and
      walls off a school when that many resist or drink it (`wall`, its banner's line); a hex's debt lasts `hexDebt` s. */
  curve: {
    lean: 0.3,
    wall: 0.45,
    hexDebt: 8,
    trail: 7,
    trailStep: 0.045,
    lineShow: 4.5,
    extraAt: [-0.9, 0.7] as [number, number],
  }, // (trail: motes in a hex's trail back to its thrower, trailStep the seconds between them; lineShow: the floor's warning; extraAt: where an extra foe stands beside the one it copies)
  // foes in each other's ground: how often the ground's harm comes again, the burn, shock and sting it brings, a
  // spark's damage, and how far ahead a golem or elemental looks to step round it
  foeGround: {
    every: 0.5,
    burn: 1.5,
    shock: 0.4,
    sparkDamage: 2,
    sting: 1.5,
    look: 0.75,
    lookAt: [0.5, 1],
    steer: [0.7, -0.7, 1.4, -1.4],
    sparkArt: 26, // (a spark on the floor drawn as a cross this many pixels across: actors/foes.ts)
    rimeArt: 40, // (a rime snail's patch of rime drawn this many pixels across: actors/bestiaryGround.ts)
    // burning ground as pixel art (actors/foes.ts, art bible 4.21): a patch `size` units across drawn `art` pixels across
    // (the texel at that size), a charcoal scorch shaded toward the floor's shadow colour (`scorch`, turned `scorchShade`
    // toward it) under flame tongues in `frames` frames a patch, `fps` a second, each patch on its own frame
    fire: { size: 0.75, art: 36, frames: 3, fps: 9, scorch: 0x1a0e0a, scorchShade: 0.45 },
    // the rubble golem's falling stone: its warning on the floor, a ring `ring` pixels thick in a warm accent that fills
    // from the middle as the stone falls (actors/bestiaryGround.ts fallOn)
    fallWarn: { art: 32, ring: 2, color: 0xf0b040, fill: 0.55 },
  },
  // foes' magic on a pale floor (floor 4's ivory and gold, the looks named in `looks`: world/kitColours.ts paleFx): light
  // added there burnt white or pink, so it is drawn instead, in the school's light held at lightness `deep` at most
  // (render/arcane.ts deepen), edged in the floor's shadow colour (its grade's). Every other floor keeps its own.
  paleFx: {
    looks: ['reliquary'] as readonly string[],
    deep: 0.45,
    // a foe's telegraph (actors/foes.ts): bands from the middle out ([outer edge, strength], as pixelLook.teleRings) in
    // the deepened light, then from `edge` to the rim a band of the floor's shadow colour at `edgeAlpha`, at most
    // `opacity` strong as it nears
    tele: {
      rings: [
        [0.38, 0.3],
        [0.62, 0.85],
        [0.8, 0.6],
      ] as readonly (readonly [number, number])[],
      edge: 0.8,
      edgeAlpha: 0.75,
      opacity: 0.9,
    },
    // a school's own deep tone where holding it at `deep` turns it olive (a gold, a yellow): what is drawn in its light
    // (world/paleFx.ts paleTone), and a pale school's shots' sheath (as pixelLook.shotSheath, which this adds to); a shot's
    // halo drawn in the sheath's tone at `haloOpacity` (added, a ring of them piled up to white)
    tones: { hallow: 0xc0841a, storm: 0xc89a10 } as Partial<Record<'hallow' | 'frost' | 'storm' | 'umbral', number>>,
    haloOpacity: 0.4,
    // a ring on the floor (magic/spellFx.ts ringFx `drawn`): the ring (radius 0.84 to 1) in the deepened light over a
    // ring under it in the floor's shadow colour (`under`: its inner and outer radius) at `underAlpha` of the ring's
    // strength, fading in `steps` steps
    ring: { under: [0.76, 1.08] as readonly [number, number], underAlpha: 0.85, steps: 3 },
    // a strip on the floor (the hart's charge lane, a griffin's or a harpy's line): the deepened light at `alpha` inside
    // `edge` game pixels of the floor's shadow colour, its strength in `steps` steps
    strip: { edge: 2, alpha: 0.6, steps: 3 },
    // a strip's own tone where the school's deep one, laid at `alpha` over the floor's dark squares, read brown (the hart's
    // lane, a griffin's line: Hallow's), and that strip's strength (world/paleFx.ts paleStripTone)
    stripTones: { hallow: 0xf0b02a } as Partial<Record<'hallow' | 'frost' | 'storm' | 'umbral', number>>,
    stripToneAlpha: 0.75,
    // a ray (the radiant eye's: magic/spellFx.ts beamFx): straight, `width` game pixels across in the school's deep tone
    // inside `edge` pixels of the floor's shadow colour, at `alpha`, fading in `steps` steps (lightning read as a storm's)
    beam: { width: 4, edge: 1, alpha: 0.95, steps: 3 },
    // a stunned or shocked foe's flash (magic/statusFx.ts statusTint): a deep storm gold at `strength` (the pale yellow
    // turned bodies cream on the ivory)
    stun: { color: 0x9a6c0c, strength: 0.6 },
    // what foes leave on the floor (actors/bestiaryGround.ts): rime's crystals in a deep frost blue, a web a dark violet
    // grey at `webOpacity` (pale, both washed into the ivory)
    ground: { rime: 0x2a64a0, web: 0x3a3046, webOpacity: 0.75 },
    // the Pollen Cloud (magic/spellFx.ts pollenFx): its circle drawn in a deep Verdant green (`tone`) at `line` on an edge
    // of the floor's shadow colour at `edge` of that, its haze drawn in it at `haze` (added, its lime washed out), no glow
    pollen: { tone: 0x4a8a26, line: 0.9, edge: 0.75, haze: 0.14 },
    // a blob shadow (render/materials.ts paleBlobs): at most `most` dark (its stepped middle was a black dot on ivory)
    blob: { most: 0.67 },
    // a sealed vault's ward at its door (world/vault.ts): its rune drawn in the ward's deep tone over a disc of the floor's
    // shadow colour, `under` of the rune's size across, at `underAlpha`, and no glow
    ward: { under: 0.5, underAlpha: 0.7 },
    // a pickup's and an artifact's dark halo (items/pickups.ts, items/artifacts.ts): drawn behind it in the floor's shadow
    // colour, `pickup` or `artifact` across, in bands ([outer edge, strength], from the middle out), `back` units below
    // the thing and drawn as much higher (so it is behind it, however an artifact turns: world/paleFx.ts paleHalo); the bone key and the pale and hallowed souls in deeper colours (their pale bodies
    // showed only their outline)
    halo: {
      pickup: 0.7,
      artifact: 1.15,
      rings: [
        [0.62, 0.6],
        [1, 0.35],
      ] as readonly (readonly [number, number])[],
      back: 0.2,
    },
    items: {
      bone: 0xa89470,
      paleSoul: [0x3a64b8, 0xb8d0ff] as [number, number],
      hallowedSoul: [0xc08a18, 0xffe7a0] as [number, number],
    },
    // black ice (actors/bestiaryGround.ts): its edge drawn `art` pixels across, in `steps` flat steps with a hard rim
    blackIce: { art: 32, steps: 3 },
    // what is thrown (actors/bestiaryGround.ts lob): solid and flat-shaded, outlined as a thing is; a snowball pale
    // frost blue, a coal charcoal round an ember core (`ember`, `core` of its size, out through its face toward the camera);
    // where it lands marked by the falling stone's ring (foeGround.fallWarn), `warn` across, in the deepened light
    lob: { snow: 0xcfe6f6, coal: 0x2c2428, ember: 0xff8a2a, core: 0.4, warn: 0.42 },
  },
  // foes' magic on floor 5's dark shore (the looks named in `looks`: world/paleFx.ts shoreFx), where what floor 1 to 4
  // draw was lost or burnt white: a foe's telegraph drawn (not added) in its school's light in bands (`tele.rings`, as
  // paleFx.tele) to an edge in the floor's shadow colour, at most `tele.opacity` (a school's own in `tele.school`: frost's
  // pale blue at 0.85 burnt pale foes white), and over what stands round it (no depth test: the floor cut it into a lit
  // box); rime a deeper frost (`rime`), its crystals `rimeStroke` pixels thick; the gloom raven's darkness deep umbral
  // bands (`gloom`) inside a violet rim `rimPx` game pixels thick; a spore cloud's puffs each one flat disc (`spores`,
  // overlapping in hard steps); the scorch under burning ground a charcoal of its own (`scorch`: shaded to the floor's
  // shadow it was near black on the shore)
  shoreFx: {
    looks: ['shore'] as readonly string[],
    tele: {
      rings: [
        [0.38, 0.2],
        [0.62, 0.7],
        [0.8, 0.5],
      ] as readonly (readonly [number, number])[],
      edge: 0.8,
      edgeAlpha: 0.6,
      opacity: 0.85,
      school: { frost: 0.5 } as Partial<Record<'ember' | 'frost' | 'storm' | 'hallow' | 'umbral' | 'verdant', number>>,
    },
    rime: 0x6a9cc4,
    rimeStroke: 2,
    gloom: {
      color: 0x2e1f4a,
      rim: 0x8a5ad8,
      rings: [
        [0.55, 0.8],
        [1, 0.6],
      ] as readonly (readonly [number, number])[],
      rimPx: 2,
      rimAlpha: 0.9,
    },
    spores: [[1, 0.45]] as readonly (readonly [number, number])[],
    scorch: 0x4a4448,
  },
  // a leap or a dash with stone in its way turns off by the least of these (radians, either side) that is clear (wayRound)
  foeWay: { turns: [0.6, 1.1, 1.6] },
  /** Transformations (items/transforms.ts): how long the banner stays; the gifts: the Pyromancer's embers (seconds they
      burn), the Frostborn's chill on a touch (stacks, and how often one foe can be chilled so), the Stormcaller's leap (every
      how many bolts, how far, and the share of the bolt's blow), the Shadowstep's blink (how far, how often, and how long
      the mage can't be struck), the Runescribe's rune (how soon it bursts, how far, the share of the bolt's blow), the
      Pilgrim's step, the Lightbearer's float (how high, and its bob), the Beastcaller's familiars (how many more, and how
      much harder they strike); and how far the robes are tinted towards the transformation's light. */
  transform: {
    banner: 3.2,
    after: 1.8, // (after: seconds between an artifact's own card and the transformation it completes)
    ember: { time: 1.6 },
    frost: { chill: 1, every: 0.8 },
    storm: { every: 5, reach: 4.5, share: 0.8 },
    blink: { dist: 2.4, every: 1.6, invuln: 0.25 },
    rune: { delay: 0.55, reach: 1.1, share: 0.6 },
    pilgrim: { speed: 1.12 },
    float: { lift: 0.14, bob: 0.035 },
    beast: { more: 1, damageMul: 1.5 },
    tint: 0.3,
  },
  /** Spell marks (actors/spellMarks.ts): a spell in hand (its light's size, motes, brightness ready and cooling, how
      far above the hand, the ready flash's reach, how often a Storm spell crackles), the master's ring (radius, turn), the
      attunement aura (motes, how far round the mage, its glow), the knowledge circle (radius, how far out its runes stand
      and their size, the gap between arcs, how long the mage stands still before it shows, how fast it fades in and out,
      its turn), each school's motion (how far its motes travel, up or down), and how long a mark's first line stays. */
  marks: {
    hand: {
      size: 0.34,
      motes: 7,
      ready: 1,
      dim: 0.25,
      lift: 0.04,
      flash: 0.26,
      spark: 0.45,
      pulse: 3,
      shimmer: 6,
      shimmerBy: 0.06,
      flicker: 9,
      grey: 0.7,
      cooling: 0.7,
    },
    ring: { radius: 0.085, spin: 2.2 },
    /** The runes carved in a slot show at its hand: a speck in each rune's colour (Thrice three, fanned) circling
        it (`r` out, `spin` a second, Quicken's `quick` times faster; Seeking's wider, swaying), Wide a faint disc under it,
        Vein's red in the glow (`vein` of it), Lasting's slower fade, Reprise's second, fainter flash `echo` s later. */
    runes: {
      r: 0.085,
      seek: 0.13,
      size: 0.022,
      spin: 2.4,
      quick: 2,
      disc: 0.17,
      discOpacity: 0.18,
      vein: 0.45,
      lasting: 0.5,
      echo: 0.22,
    },
    aura: { motes: 16, radius: 0.32, glow: 1.5 },
    circle: { radius: 0.6, out: 0.09, rune: 0.085, gap: 0.06, after: 1, fadeIn: 0.6, fadeOut: 0.25, spin: 0.15 },
    rise: { ember: 0.4, frost: -0.3, storm: 0.15, hallow: 0.35, umbral: -0.25, verdant: 0.2 } as Record<string, number>, // (Verdant's leaves drift up slowly)
    line: 4,
  },
  /** Azyrion's arc (items/arc.ts): how many artifacts held bring each stage of the chaos mage's pieces, and how long
      each stage's line stays. */
  arc: { at: [3, 6, 9, 12], line: 4.5, perLevels: 3 }, // (every three levels gained count as one artifact held)
  // insight, the GDD's XP, and levels (docs/archive/M6-plan.md). `at`: the insight each level from 2 to the cap needs (the
  // last is the cap's; the curve measured over 2,000 seeds is the plan's table); a foe's purse is its health on its floor
  // ÷ `foeDiv`; a room's first clear gives `perFloor` × the floor (an ordeal `ordealMul` times that), as does each potion's
  // kind first used in a run; the jelly serpent gives its health ÷ `serpentDiv`. Each boss's insight is its floor's
  // (data/floors.json), the Grave Draught's in data/alchemy.json. `streak`: the light that runs from a fallen foe to the
  // casting hand (seconds, size, how many fly at once at most, motes in its trail and how far apart, how high it arcs); `gold`: insight's
  // own light (a foe of no school, a room, a potion); `chimeGap`: seconds between its chimes at least.
  // the four attributes (progression/attributes.ts), per point: Vigor half a heart container every
  // `pointsPerHalf`; Arcana spell damage +`spell`; Will max mana +`mana` and its coming back +`regen`; Swiftness move speed
  // +`speed` and the cantrip's delay −`delay` (its floor kept). Each in a line with its points, never compounding.
  attributes: {
    vigor: { pointsPerHalf: 2 },
    arcana: { spell: 0.06 },
    will: { mana: 10, regen: 0.05 },
    swiftness: { speed: 0.03, delay: 0.03 },
  },
  // floorInsight: the insight each floor gives a run that clears it (the medians measured in docs/archive/M6-plan.md, The curve), which
  // a deeper start's level is drawn from (levelAtFloor)
  levels: {
    at: [20, 80, 170, 280, 395, 520, 810, 1185, 1600, 2025, 2825],
    floorInsight: [204, 400, 735, 932, 1302],
    foeDiv: 4,
    perFloor: 4,
    ordealMul: 2,
    serpentDiv: 2,
    streak: { time: 0.6, size: 0.36, max: 48, trail: 5, gap: 0.05, rise: 0.9 },
    gold: 0xe8c878,
    chimeGap: 0.12,
    // the level-up screen: seconds of calm after a fight before it opens, and seconds a choice is locked as it opens (a key held from the fight)
    calm: 0.8,
    lock: 0.4,
    lineFirst: 4.5,
    lineCap: 4,
  }, // (how long the first insight's line and the cap's stay)
  // runes as things: how often a dropped rune leans to the spells in the slots (else any of the seven), the
  // chip's size lying on the floor, and the pale core down a dark glyph's strokes (a glyph under lightness `below`: the
  // vein's red; `pale` of the way to white, `width` of the glyph's disc)
  runeDrops: { lean: 2 / 3, chip: 0.24, core: { below: 0.6, pale: 0.6, width: 0.09 } },
  // the shrine's bargain: where its stone stands in the shrine (from the middle: the circle's head), how near (beside
  // its half-width) the mage must stand to cast into it, its blocker's half-width, how narrow a gap to the wall behind it
  // its blocker closes (no space to hide in), how far either side of a doorway's middle its lane runs (the stone stands
  // elsewhere then: the circle's foot, or beside it), and how far beside the circle that is
  bargain: { at: [0, -2.55] as [number, number], reach: 0.9, half: 0.3, wallGap: 1.2, lane: 1.6, aside: 4.6 },
  // the waystone: how near (beside its half-width) the mage must stand to reach it or cast into it, how long it
  // takes to rise and from how deep, where it rises in the boss room where a floor has no waystone room (from the middle: to
  // the side and back, out of reach of the page, the pedestals, the heart and the trapdoor), the rest's streaks of mana and
  // the gap between them, its blocker's half-width; the waystone room: how far beyond the stone (away from the door) the
  // trapdoor opens, across the room for a door in the east or west wall and down it for one in the north or south, and how
  // dark the room waits until the stone kindles; how far from the middle toward the door the stone stands (so the trapdoor's
  // ring, beyond it, clears the stone's top from the camera); the
  // lane to its door in the boss room that the boss's gifts keep off (how deep, how wide either side, how far aside)
  waystone: {
    reach: 0.75,
    rise: 1.4,
    depth: 1.95,
    at: [4.4, -1.8],
    streaks: 7,
    streakGap: 0.08,
    half: 0.38,
    trapdoor: [3.5, 1.9],
    toDoor: [1.5, 0.8],
    dark: 0.55,
    lane: [4.5, 1.2, 2.6],
  },
  // daylight (world/daylight.ts): the shaft of light where Kaelith's way out opens (how near the mage steps into
  // it); the cave mouth at dawn: where it is built, far from every floor (x, z), how far behind the terrace's edge the camera
  // looks; the mage's walk out of the cave (from how far back, to how far short of the edge, how fast); the timeline (the
  // white fading, the cave's overhang lifting, the end screen laid over it); how fast the mist drifts and the water falls;
  // the dawn's light on the terrace and the mage (fill, sun, their colours; the lantern turned down)
  // the keeping (vigil/vigilData.ts): the Arcane Dust a run carries home from each source (each floor reached
  // pays `floor` × the deepest; a boss put to rest, Kaelith more; each first find in the run; each shade freed; each vow kept
  // pays a share of the run's Dust once the run reaches `vowFloor`; an echo laid to rest), the share of the obols carried
  // that come home after a death (all after a win), and how many runs the save keeps (the echoes)
  vigil: {
    dust: { floor: 10, boss: 15, kaelith: 60, first: 3, shade: 20, vow: 0.25, vowFloor: 3, echo: 10 },
    obolsAfterDeath: 0.1,
    runsKept: 5,
    // the place: how near the lectern opens and the boat is boarded (from the jetty's end), how near a barred
    // way says what bars it; how far to step back before the lectern opens again; on the first waking, when the candle
    // lights itself and how long the dark takes to lift after; the boat's line before it pushes off
    place: {
      lecternReach: 0.95,
      rearm: 0.5,
      boatReach: 0.6,
      barReach: 1.9,
      barCatch: 1.4,
      candleAt: 1.4,
      dawn: 2.2,
      boatDelay: 1.6,
    },
    // the townspeople: how near the mage walks to a figure for it to talk (and steps back before it talks again),
    // how near the jetty's end the Ferryman says his first line, how near a figure turns its head to the mage, how many
    // letters of a line show each second
    // the unfolding (vigil/unfold.ts): how near a chapel candle or a garden bed is walked up to, how fast the Cave
    // Mouth's falls run, and the valleys' light laid on its floor from the open edge: how far in it reaches with none freed and
    // further for each one freed (tiles), and how strong it is at the edge
    unfold: { reach: 0.85, fall: 1.4, caveLight: { depth: 1.5, deeper: 0.4, strength: 0.32 } },
    town: { reach: 1.05, rearm: 0.6, ferryReach: 2.3, watch: 4.5, typeRate: 75, madeLight: 0.2 }, // (madeLight: the made figures lit of themselves, to read in the Nave; they stand bigger too, in their heights in tools/creatures/townsfolk.ts, drawn on the pixel look's fine layer, their textures baked at that size and pixel)
  },
  // chained shades: where one lies in its room (a share of the room's width and depth from its middle), how near a
  // school landing or a bolt must come to strike its chains, how near the mage stands to be asked, how long freeing (the
  // rise) and binding (to the mage) take
  shades: { at: [0.28, -0.18] as [number, number], reach: 1.3, ask: 1.6, rise: 2.4, bindTime: 0.9 },
  // a bound shade at work in the run it walks with the mage (vigil/shadeHelp.ts): how often each acts (seconds, counted only
  // in a fight), how far it reaches and how hard; the sexton's chance a room; the chorister's cooldowns; the bell-ringer's stall
  shadeHelp: {
    storm: { every: 5, reach: 6, damage: 3, shock: 1.2 },
    roots: { every: 6, reach: 2.2, root: 1.6 },
    bow: { every: 2.2, reach: 7, damageMul: 0.6, speed: 9 },
    turn: { reach: 0.8 },
    dig: { chance: 0.3 },
    sing: { mul: 0.88 },
    ring: { every: 6, reach: 2.6, stall: 0.3 },
    hex: { hex: 1 },
  },
  daylight: {
    reach: 0.7,
    at: [-400, 0] as [number, number],
    look: 1.5,
    walk: { from: 3.4, to: 0.9, speed: 1.05 },
    flash: 1.2,
    lift: 3,
    endAt: 6.5,
    mist: 0.18,
    fall: 1.6,
    light: { hemi: 2.4, sun: 2.2, sky: '#ffd8b4', ground: '#4a4238', sunColour: '#ffc690', lantern: 0.25 },
  },
  // the school boons at work (progression/boonHooks.ts): half hearts boons mend in one room at most (Votive
  // Heart and Thirsting Hex together); Seedfall's plants, `seedMax` a room at most, sought within `sowReach` tiles of the
  // fall and kept `sowClear` tiles from the mage, a door's lane and the room's middle; Spark Wake's spark refreshed rather
  // than laid again within `sparkMerge` of another of the mage's; Flamekeeper's embers run from each flame to the hand
  // every `emberEvery` seconds.
  boons: {
    mendPerRoom: 1,
    seedMax: 4,
    sowReach: 2,
    sowClear: { mage: 1, door: 1.6, middle: 1.2, foe: 0.5, item: 0.6 },
    sparkMerge: 0.6,
    emberEvery: 0.35,
    // the deal's lean (progression/boonData.ts): every school's weight starts at `base`, and gains `slot` for each
    // of its spells in the slots, one for every `castsPer` casts of it this run (`castsMax` at most), `boon` for each rank of
    // its boons taken and `pledge` for a pledge
    lean: { base: 1, slot: 3, castsPer: 5, castsMax: 3, boon: 2, pledge: 2 },
  },
  /** Costumes (actors/costume.ts): the focus held in the casting hand (its scale, where along it the hand grips: 0 its
      middle, negative below; how far it leans forward and out), each spot's scale for an artifact's own model carried
      there, and a cursed piece's glow (a share of its height) and how often it weeps a red drop. */
  costume: {
    focus: { scale: 1.05, grip: -0.22, lean: 0.35, tilt: 0.18 },
    carry: {
      belt: { scale: 0.42 },
      back: { scale: 0.62 },
      shoulder: { scale: 0.48 },
      chest: { scale: 0.36 },
      wrist: { scale: 0.34 },
    },
    curse: { glow: 2.2, drip: 0.35 },
    closeUp: { zoom: 4.5, y: 0.75 }, // (the dev menu's close-up on the mage: how near, and how high it looks)
  },
  // how the Stormcharged and Hallowed mantles look apart: the storm's segments of lightning at most, its bolts round
  // the ring and arcs on the body, how often they crackle anew, its cloud's size and height over the head and how often it
  // strikes; the halo's size and height over the head
  mantleLooks: {
    storm: { segments: 40, ringBolts: 7, arcs: 3, flicker: 0.07, cloudSize: 0.55, cloudOver: 0.55, strikeEvery: 1.4 },
    halo: { size: 0.26, over: 0.28 },
  },
  // rooms with a pair: how far beside the first foe the second is set
  pairs: { gap: 1.1 },
  // a foe's weakness and resistance (GDD: Enemy affinities): the damage of its weak school and of its resisted one; an
  // elemental's: its weakness's, and the share of a blow of its own school it drinks as health
  affinity: { weak: 1.5, resist: 0.5, elemental: 2, drink: 0.5 },
  // champion rooms: one enemy is bigger, tinted, tougher and a little faster, and drops a heart
  champion: { hpMul: 2, scale: 1.3, radiusMul: 1.2, speedMul: 1.15, tint: 0x6a1a0a, aura: 0xff5a2a },
  // quiet rooms keep at most this many weak enemies; how often a heart waits there
  quiet: { maxEnemies: 2, heartChance: 0.7 },
  // ambush rooms spring when the mage is this close to the middle, or this far from every door
  ambush: { middle: 1.8, fromDoors: 4 },
  // floor generation: how many walks may be retried to leave spare dead ends for a wanted altar or vault
  generator: { optionalTries: 400 },
  // the merchant's shop (room-relative z of the shade and the row of wares, the gap between wares), how
  // close the mage must come to buy, how far a bolt flies in the warded shop before it fizzles, and how strong a ward
  // circle is drawn on the floor and its column of light (items/merchant.ts: a brighter column washed a pale ware out)
  merchant: {
    shadeAt: -1.9,
    waresAt: 0.9,
    spacing: 2.3,
    reach: 0.45,
    boltFizzle: 0.6,
    panelReach: 1.5,
    ward: 0.85,
    column: 0.05,
  }, // (panelReach: how near a ware its panel shows)
  // the lore card on pickup: seconds on screen, at least, a little more per word of lore, and at most
  lore: { least: 4, perWord: 0.04, most: 6 },
  // water and oil (world/pools.ts): wading speed (the mage and walking foes), seconds oil burns and water stays
  // frozen, the burn burning oil sets on foes and how often, the half hearts it and a shocked pool take from the
  // mage, how long a shocked pool crackles, and the drowned floor's puddles (how many per fight, tiles each)
  // how fast a current carries the mage and walking foes, bolts and shots over it, and pickups lying in it (units a second)
  flow: { carry: 1.7, bolts: 1.1, pickups: 1.3 },
  surface: {
    wade: 0.6,
    jellyWade: 0.42,
    oilBurn: 5,
    iceTime: 8,
    groundBurn: 2,
    tick: 0.25,
    mageHurt: 1,
    charged: 0.5,
    shockSpread: 1.5,
    shockDamage: 2,
    puddles: [1, 2] as [number, number],
    puddleSize: [2, 4] as [number, number],
    boilEvery: 2.5,
    boilSteam: 1.3,
    driveReach: 1,
    poolBlur: 6,
    pit: { deep: 0.22, wall: [0.92, 0.66] as [number, number], lip: 1.2, band: 0.38 },
    shockRim: 2,
    poolArt: 96, // (a pool's surface drawn this many pixels across two tiles, the kit's texel: world/pools.ts pixelTile)
    burnFrames: 3, // (burning oil's flames in this many frames, `burnFps` a second)
    burnFps: 8,
  }, // (poolBlur: how round a pool's outline is (cut hard at half the blur), in its canvas's pixels (32 a tile), softEdge.ts; pit (world/rooms.ts drawPits): its depth the room's floor colour times `deep`, the inner wall under its far lip a `band` of a tile in the room's floor colour times `wall` (two steps), its lip times `lip`; shockRim: the width of a shocked pool's bright rim, in those pixels; jellyWade: walking through the jelly serpent's jelly; boilEvery: seconds before fire on a pool of water boils it into steam again; boilSteam: that cloud's size; driveReach: how far beyond a blast or a cloud a water foe hiding in other water is driven up)
  // steam drawn as pixel art draws fog (magic/steam.ts): its puffs' fade times `dense`; where that is `solid` or more the
  // pixels are solid, from `checker` every other pixel, from `sparse` one in four, below it none; round the mage (within
  // `hole` units of it on screen) only `holeK` as thick, so the mage and the fight inside still read
  steamLook: {
    dense: 1.2,
    solid: 0.42,
    checker: 0.26,
    sparse: 0.12,
    hole: 0.75,
    holeK: 0.4,
    edge: 0.85,
    fog: 0.4,
    shade: 0.05,
  },
  // (edge: the cloud is clipped to a round shape this many times its radius on screen, so its dither never runs out to its
  // puffs' square ends; fog: a fog of darkness, dithered as steam is, never denser than a checker of this thickness up)
  // the rooms' objects (world/props.ts): how long each flammable one burns (seconds), how often burning spreads
  // to what burns beside it, cobwebs' slowing, the briar's sting (half hearts to the mage, damage a second to walkers),
  // the oil a broken cask spills (tiles beyond its own), and glowcap spores (how long a cloud hangs, its reach, the
  // flash when fire finds it: damage to foes, Burn stacks, half hearts to the mage within reach)
  props: {
    burn: {
      roots: 3.5,
      tree: 6,
      briar: 2,
      web: 0.45,
      sacks: 1.6,
      desk: 3,
      scrolls: 0.7,
      bridge: 4,
      blossom: 1.2,
    } as Record<string, number>,
    spread: 0.5,
    // half hearts a fall through a burnt rope bridge takes from the mage
    fallHurt: 2,
    webSlow: 0.45,
    briarHurt: 1,
    briarDamage: 2,
    caskSpill: 3,
    spores: { time: 4, reach: 1.3, stingReach: 1.04, damage: 6, burn: 2, mageHurt: 1 }, // (stingReach: where a stinging cloud's thick enough to sting)
    // a flowering plant's burst: how far its pollen reaches, and the seconds it overgrows the foes there
    blossom: { reach: 1.8, grow: 4 },
  },
  // themed rooms' twists (world/themes.ts): how close the mage comes before a sleeper wakes; when the ossuary's
  // piles start rising (seconds into the fight), how often, and how many at most; the chance a scriptorium's scroll heap
  // hides a page; the collapsed crypt's cave-in: how far from a blast stones fall, how many, how long their shadows
  // show first, and the damage they do
  // mechanisms (world/mechanisms.ts): how close fire must come to light a brazier or candle stand, and the Burn a
  // bolt catches flying through a brazier's flame; casts a chapel's candles bless, and how much harder they strike; the
  // bell's stun and how often it can ring; a charged rune stone's pulse (seconds between, reach, status stacks); a
  // lodestone's leap (how near shock must land to reach it, how far it leaps, damage, cooldown); a falling censer's
  // blow (reach, damage, Burn) and the oil it spills (tiles beyond its own); a frozen mausoleum's rime (how quickly the
  // mage gets a grip: lower slides more)
  mech: {
    kindle: 0.6,
    brazierBurn: 3,
    blessCasts: 6,
    blessMul: 1.6,
    bellStun: 1.8,
    bellCooldown: 7,
    runeEvery: 2.2,
    runeReach: 2.4,
    runeAmount: 1,
    lodeCatch: 1.3,
    lodeReach: 8,
    lodeDamage: 5,
    lodeCooldown: 1.2,
    censerReach: 1,
    censerDamage: 10,
    censerBurn: 3,
    censerSpill: 2,
    rimeGrip: 3.5,
    // the stacks of each school a rune stone's reaction lays on the foes in its reach (Chill as many as freeze); the
    // sparks a bell rung by a shock rings out (how many, how far round it, how long they lie)
    runeStacks: 2,
    bellSparks: { n: 10, d: 1.7, time: 6 },
    // how close a bolt passes to catch a brazier's fire or cut a censer's chain; a status to charge a rune stone; fire
    // to thaw an entombed foe; how wide a lodestone's arc hurts (plus a foe's radius); a falling censer hurts the mage
    brazierCatch: 0.45,
    censerCatch: 0.35,
    runeCatch: 0.9,
    thawReach: 1.2,
    lodeWidth: 0.6,
    censerHitsMage: 0.7,
    // half hearts the lodestone's arc and a falling censer take from the mage; how hard they throw foes back (× the
    // usual knockback); how much bigger a blessed bolt is
    lodeHurt: 1,
    censerHurt: 1,
    lodeKnock: 0.3,
    censerKnock: 0.5,
    blessScale: 1.2,
    // a watching statue: how far it sees; seconds of gaze that charge it; how fast its charge cools out of its
    // gaze; the pause between its mark and its ray; how wide the ray strikes; half hearts it takes; seconds before it
    // watches again; seconds a hex blinds it; how close darkness landing reaches it; what its ray does to a foe
    statue: {
      reach: 7.5,
      charge: 2.2,
      cool: 1.5,
      delay: 0.75,
      radius: 0.75,
      hurt: 1,
      rest: 1.5,
      blind: 7,
      umbralCatch: 1.2,
      damage: 12,
    },
    // a sapping obelisk: how far its field reaches; what the cantrip's blows are worth inside it; mana drained a second;
    // how close its school must land to break its ward
    obelisk: { reach: 2.8, sap: 0.5, drain: 5, catch: 1 },
    // a sluice gate: seconds the room's water stays drained once it opens; how often the water foes in the mud are
    // driven up again; seconds before it can be opened again once shut
    sluice: { open: 8, drive: 0.5, rest: 3, lift: 0.42 }, // (lift: how far the gate rises)
  },
  // the drinking ward: how close to a sealed vault door a spell is drunk; the mana of spells a vault's ward holds, and
  // a foe's shield (the foe's blows it drinks, as damage); where the Wardling rises beside a foe whose shield broke
  ward: { reach: 4, need: 60, foeNeed: 60, beside: 1.2 },
  themes: {
    shaftLight: 0.12, // (a shaft of daylight through a broken ceiling: how much light its flat band adds, world/themes.ts)
    shaftPool: 0.22, // (and the pool of light it lays on the floor)
    wakeReach: 2.6,
    riseAfter: 10,
    riseEvery: 6,
    riseMost: 3,
    pageChance: 0.3,
    caveReach: 3.5,
    caveStones: 3,
    caveDelay: 0.8,
    caveDamage: 8,
    daylightClear: 3,
    bedrollClear: 2,
    // a lamp on its pole (the shore's): only where its tile's neighbours, and `lampNorth` tiles north of it, are free
    // floor, and it keeps them to itself (its tall pole stood over rocks, pillars and the walls, scatter on its post)
    lampNorth: 2,
    // a plain room's scatter (the floor's `scatter`): each kind's count times at least [0] and up to [0] + [1], so
    // rooms of one floor differ
    plainSpread: [0.4, 1.2] as [number, number],
    // and keeps this far (units) from a doorway's middle, and from the start room's middle (where the mage first stands)
    plainClear: { door: 1.8, start: 2.4 },
    // the relics that stand in the way like a rock (and break like one, to a glyph's blast or Mason's Chisel); the others
    // lie flat and are walked over. Their collider is this much of the model's footprint.
    relicBlock: [
      'grave_marker',
      'angel_head',
      'skull_pile',
      'broken_urn',
      'toppled_font',
      'pillar_stump',
      'fungus_log',
      'sunken_bell',
      'charred_beam',
      'toppled_brazier',
      'wax_mound',
      'brimstone_cluster',
      'gilded_reliquary',
      'fallen_saint',
      'candle_stand',
      'bell_fallen',
      'prayer_book_stand',
      'wrecked_skiff',
      'mooring_post',
      'ferry_lantern',
      'frozen_cairn',
    ],
    relicFit: 0.8,
    // the drowned climb out of the landing's river this long into a fight, then this often, at most this many
    drownAfter: 5,
    drownEvery: 7,
    drownMost: 3,
    // how much longer Overgrown holds on foes in the overgrown garden
    gardenGrow: 1.75,
  },
  // the library: how close the mage must come to a page, the gap between lecterns, and how far into the room
  // (from the door) their row stands, for a door on a long side and on a short one
  library: { reach: 0.4, spacing: 2.3, spacingShort: 1.9, rowIn: 1.1, rowInShort: 2.6 },
  // spell knowledge: casts over all runs that make a learned spell known well (its lore and reactions shown), and
  // how near a grimoire page (in tiles) its panel shows
  knowledge: { usedCasts: 10, pageReach: 2 },
  // locked vaults: glyph blasts that force the ward, and where the warden rises (room-relative z)
  vault: { blastsToForce: 2, wardenAt: -1.8 },
  // the Wandering Merchant: the chance an ordinary room's cleared fight calls the merchant (once a run), from which floor
  // (0-based); seconds riding in from the door; where the beast stops (from the room's middle), how far in front of it
  // and how far apart the wares lie; the box the beast blocks
  wanderer: {
    chance: 0.14,
    fromFloor: 1,
    rideTime: 2.4,
    standAt: -1.3,
    waresAt: 1.85,
    spacing: 1.55,
    block: [0.95, 0.5] as [number, number],
  },
  // secret rooms: the pale blue light of the forgotten mage's cell (torch flame and light colours, torch
  // brightness), and how often dust drifts from a cracked wall (seconds, least and most)
  secret: { flame: '#d8ecff', light: '#8ab8ff', torchMul: 0.85, dustEvery: [1.2, 2.8] as [number, number] },
  // the shrine: its circle's radius, the offering stones (room-relative spots, in the order curses take
  // them), how close the mage must come to walk into one, and the warm white light of its torches. The
  // curse's wisp: seconds to put it down, bolts that must strike it inside the circle, its speed and size,
  // how long it lingers in the circle (seconds, least and most), how close the mage may come before it
  // shies away, and its shots at the mage (seconds between, least and most; speed)
  shrine: {
    circle: 1.8,
    stones: [
      [-3.4, -1.9],
      [3.4, -1.9],
      [-3.4, 1.9],
      [3.4, 1.9],
    ] as [number, number][],
    reach: 0.12,
    flame: '#fff2d0',
    light: '#ffe2a8',
    torchMul: 1,
    time: 10,
    hits: 4,
    wispSpeed: 2.8,
    wispR: 0.32,
    linger: [0.9, 1.6] as [number, number],
    shy: 1.4,
    shotEvery: [1.5, 2.3] as [number, number],
    shotSpeed: 3.4,
  },
  camTiltDeg: 45,
  camHallView: 1.2, // larger halls: the camera pulls back so the view is this much wider and deeper
  // obols drift to the mage from this close; a coin sways this far (radians) either way as it turns; a coin face's light
  // from within, and how many game pixels a coin wearing one is across (its face is drawn
  // on the fine layer, pixelLook.fineLayer pixels to each of these); a heart's stepped glow (its colour, size and
  // strength: a red heart on floor 3's red-brown read only by its outline)
  pickups: {
    obolDrift: 1.8,
    coinSway: 0.45,
    coinGlow: 0.2,
    coinPixels: 24,
    heartGlow: { color: 0xff6a4a, size: 1, opacity: 0.35 },
  },
  /** Soul motes (items/souls.ts): most held; the hex a black one lays on every foe in the room when it goes; the
      chance a foe that falls with enough hex stacks (magic.json's `hex.soulAt`) leaves a black one. */
  souls: { max: 6, blackHex: 2, hexChance: 0.5 },
  // blast glyphs: fuse (s), reach (tiles), damage to foes, halves of hearts off the mage, knockback, time
  // between two glyphs, how close a bolt must pass to set one off (after flying boltArm, so a bolt leaving
  // the mage doesn't set off the glyph at their feet), and the pause before a blast sets off its neighbours
  glyph: {
    fuse: 1.5,
    radius: 1.5,
    damage: 10,
    selfDamage: 2,
    knockback: 7,
    cooldown: 0.35,
    boltReach: 0.5,
    boltArm: 0.9,
    chainDelay: 0.1,
  },
  artifacts: {
    maxPerFloor: 6, // the floor's budget (the boss's pair counts as one); gilded reliquaries don't count
    dropChance: 0.03, // chance a cleared room drops one, while the floor's budget allows
    rockHp: 3, // Mason's Chisel: bolt hits to break a rock
    visionRadius: 3.4, // Mask of the Drowned: how far the mage sees
    burst: { damageMul: 0.6, range: 4.5, speed: 7, scale: 0.7 }, // Knucklebone and Bell bolts
    crit: { chance: 0.2, damageMul: 3, scale: 1.4, color: 0xfff4dc }, // Raven's Eye: one bolt in five
    split: { angle: 0.7, damageMul: 0.5, range: 3.2 }, // Cracked Mirror: two halves, this far apart (radians)
    wave: { amp: 0.45, freq: 3.2 }, // Serpent Rod: how far bolts swing, and how often (per tile)
    leech: { every: 10 }, // Leech Jar: foes put to rest per half heart
    // Fen-Nex: its size at each stage, and how much faster each stage runs; how far behind the mage it keeps, how fast it runs and darts; how far off it
    // spies prey (plus its stage), and past how far from the mage it comes back to their side; its bite (every so often, the
    // cantrip's damage times `mul` at each stage) and its full shape's breath of Ember
    fennex: {
      scale: [0.62, 0.9, 0.8],
      stageSpeed: 0.15,
      heel: 0.9,
      speed: 4.2,
      dash: 8,
      reach: 4,
      leash: 9,
      bite: { every: 1.3, mul: [0.6, 0.85, 1.1] },
      breath: { every: 3.2, range: 3.2, count: 5, spread: 0.6, speed: 7, mul: 0.45, burn: 2 },
    },
    // Candle Moth: seconds between stings, reach (and its halo's size: a larger one read as a white blot in a soft cloud)
    moth: { every: 1.1, range: 7, damageMul: 0.45, orbit: 0.85, speed: 7, glow: 0.5 },
    // Weeping Skull: radius, radians/s, bite and its rest, its halo's size
    skull: { orbit: 1.15, spin: 2.6, damage: 3, every: 0.45, reach: 0.34, glow: 0.5 },
    wardingBand: { fuse: 1 }, // Warding Band: the glyph's fuse (s)
    pedlar: { priceMul: 0.7 }, // Pedlar's Scale: merchant prices (rounded, at least 1)
    emberwood: { burn: 1.5 }, // Emberwood Wand: seconds of Burn a bolt sets
    homing: { turn: 3.2, reach: 5 }, // Tome of Whispers: radians a second, how far a bolt looks
    vigil: { mana: 25 }, // Candle of the Vigil: mana for every fight won
    frostbite: { every: 5, chill: 1, color: 0xbfe6ff }, // Frostbitten Ring: which cast chills, and how much
    stormglass: { mul: 1.25 }, // Stormglass Pendant: cantrip damage on shocked foes
    thurible: { radius: 2.4, burn: 3 }, // Thurible of Ash: how far a burning death spreads Burn
    witchKnot: { costMul: 0.8 }, // Witch's Knot: spell costs at half health or below
    // twelve
    swing: { out: 0.55 }, // Pendulum of Hours: how far (radians) a bolt sets out from the aim, to curve back onto it at its range's end
    lodestar: { hang: 2, pulse: 7 }, // Lodestar Wand: seconds a bolt hangs as a star, and how fast it twinkles
    still: { after: 0.25, speed: 0.5 }, // standing still: this long below this speed (Twin Vigil Candles, Salt Circle)
    candles: { damageMul: 1.5 }, // Twin Vigil Candles: bolts while standing still
    choir: { every: 5, damage: 5, delay: 0.35 }, // Ossuary Choir: foes put to rest in a room per hymn; what it does; the beat before it
    echo: { damageMul: 0.75, least: 1.5 }, // Echo Stone: the echo's damage, and the least way back it flies
    bloodMoon: { fireDelayMul: 0.75, shotSpeedMul: 1.3, color: 0xe03040 }, // Blood Moon Pendant: at half health or below
    salt: { after: 1, radius: 1.35, keep: 0.25 }, // Salt Circle: seconds still before it forms; its radius; how far the mage may lean out of it before it breaks
    halo: { sanct: 3 }, // Gilded Halo: seconds of Sanctified the first bolt lays
    soulLantern: { hexMul: 1.5, souls: 2 }, // Ferryman's Lantern: mana from hexes; how much likelier soul motes
    antler: { every: 6, sanct: 2, damageMul: 1.25, scale: 1.3, color: 0xfff0b0 }, // Hart's Antler: which cast is a lance, and what it lays
    gravemonger: { chance: 0.5, heartPriceMul: 2 }, // Gravemonger's Contract: a foe's obol (halved when cleansed); the merchant's hearts
    lastRite: { rise: 1, every: 1, everyCleansed: 2 }, // The Last Rite: half hearts risen with; floors between refusals (cleansed: more)
  },
  // the pixel look (render/pixelLook.ts): the grid it starts on. It starts at the texel
  // (everything in the one pixel-art look): a game pixel is one of the room kit's texels
  // (roomKit.texel below), so everything is drawn at the floors' and walls' pixel size, about 2.6 screen pixels at 1080p
  // in a one-cell room and 2 in a great hall; 'fine' is half a texel. Outlines where a nearer surface stands more than outlineGap units before a farther one
  // (darkened by outlineDark), and light bands; a glow's fade (render/textures.ts, every glow sprite) and a shadow's held in
  // so many flat steps, as pixel art draws them; the fine layer's pixels to a game pixel each way (pixelLook.ts, FINE:
  // the coins drawn finer than the rest, so their faces read)
  pixelLook: {
    start: 'texel' as const,
    outlineGap: 0.3,
    outlineDark: 0.72,
    thingGap: 0.16, // (inside a pickup, a container or an artifact, a step deeper than this is drawn: markThing)
    bands: 7,
    glowSteps: 5,
    shadowSteps: 3,
    // a boss's halo as a pool of light on the floor under it (actors/bosses.ts haloOnFloor): this share of the halo's
    // size across, in `poolSteps` flat steps (render/textures.ts lightPoolTex)
    haloPool: 0.8,
    poolSteps: 3,
    // a patch of moss, a stain, the daylight's pale disc (world/themes.ts blotch): drawn `art` pixels across, its
    // lumps held in `steps` flat steps with a hard edge
    blotch: { art: 32, steps: 3 },
    openShadow: 0.55, // (the blob under a made boss, whose dark middle shows between its legs, and under a flyer: render/materials.ts)
    openSteps: [0.62, 0.62, 0.62, 0.45, 0.25] as readonly number[], // (that blob's alpha in rings from the middle out: flat, no dark dot)
    fineLayer: 2,
    // the actors (the mage, the foes, the bosses: art bible 4.4 and 4.5): a closed outline round each, and a rim of warm
    // light on its top and left edge (the colour as written, and how much of it); the light on an actor in `steps` steps
    // (even to the eye), the top one at `top` of white's (in the same terms), its darks turned toward the floor's shadow
    // colour by `cool` and its lights toward the rim's warm colour by `warm` (art bible 4.2)
    actors: { rim: '#ffd9a6', rimAmount: 0.4, steps: 5, top: 0.9, cool: 0.3, warm: 0.22 },
    // how far a foe's telegraph lights it in its school's colour at its height, pulsing `telePulse` times a second (a
    // steady glow washed a dark foe out to a flat shape)
    tele: 0.28,
    telePulse: 6,
    // the glow round a telegraphing foe in hard bands (render/textures.ts bandsTex: each band's outer edge, 0 the middle
    // to 1 the rim, and its strength), fainter at the middle so the foe isn't washed out in it: a soft blob hid the
    // ember wasp's thin body on floor 3
    teleRings: [
      [0.38, 0.45],
      [0.62, 1],
      [0.82, 0.6],
      [1, 0.25],
    ] as readonly (readonly [number, number])[],
    // a foe's shot of a pale or a dark school: its sheath in a deeper tone of the school's light, so the hot core reads
    // inside it (in the school's own pale light, core and sheath read as one white-blue orb: art bible 4.15, F3; umbral's
    // violet as one flat disc on floor 3's maroon)
    shotSheath: { frost: 0x2a86e0, storm: 0xe0ae10, umbral: 0x6a26d8 } as Partial<
      Record<'frost' | 'storm' | 'umbral', number>
    >,
    // a foe's shot's halo in hard bands outside its dark ring (as `teleRings`), at `shotHaloOpacity`: a soft one read as
    // a blur round the orb
    shotHalo: [
      [0.62, 1],
      [1, 0.45],
    ] as readonly (readonly [number, number])[],
    shotHaloOpacity: 0.55,
    // a stain, a scorch or soot on the floor lifted to the floor's shadow colour's lightness in its own hue, then turned
    // this far toward that colour (where the floor has one): a near-black mark read as a hole in the floor (art bible 4.2:
    // black only in outlines)
    decalShade: 0.3,
    // a fog of darkness (a miasma, a thrown Shadowstep Tincture) in hard bands: each puff a disc at full strength inside
    // `fogCore` of its radius and half outside, so where puffs overlap the bands stay hard (art bible 3: no soft alpha)
    fogCore: 0.55,
    // how far Eclipse's black sun is turned toward the floor's shadow colour (as `decalShade`; further, so its violet stays
    // dark rather than a bright blue)
    sunShade: 0.6,
  },
  // foes made in Tripo (actors/madeFoes.ts, art bible 4.19), by look: how code moves the still model as a whole, the
  // part of the look in code it takes the place of (the one its behaviour swells or lifts), and its span: the model's
  // longest side across the floor, in units (about one and a half times its body's width, data/foes.json `r`); a dark
  // one lost on floor 3's dark floor lit as madeFoes.ts `MadeSurface` says (`tint`, `lift`, `hot`)
  madeFoes: {
    mireToad: { motion: 'squat', main: 'body', span: 1.05 },
    lanternJelly: { motion: 'float', main: 'bell', span: 0.8 },
    thunderhead: { motion: 'float', main: 'cloud', span: 1.35 },
    puddleElemental: { motion: 'sway', main: 'body', span: 1.2 },
    puffcap: { motion: 'squat', main: 'ball', span: 0.85 },
    rimeSnail: { motion: 'crawl', main: 'body', span: 1.4 },
    glassNewt: { motion: 'crawl', main: 'body', span: 1.15 },
    stormDarter: { motion: 'bank', main: 'body', span: 1.15 },
    cisternLurker: { motion: 'sway', main: 'rise', span: 1.6, keep: ['disc'] },
    brineSerpent: { motion: 'sway', main: 'body', span: 1.5, keep: ['pool'] },
    // floor 3's (sized near their looks in code, which their fights were tuned with)
    cinderSalamander: { motion: 'crawl', main: 'body', span: 1.4 },
    magmaOoze: { motion: 'squat', main: 'body', span: 1.3, keep: ['disc'] },
    hexImp: { motion: 'float', main: 'body', span: 1.3, keep: ['ring'] },
    waspNest: { motion: 'squat', main: 'body', span: 1.0 },
    emberWasp: { motion: 'bank', main: 'body', span: 1.0, tint: 1.3, lift: '#4a1c0c', hot: 3 },
    cinderDjinn: { motion: 'float', main: 'body', span: 1.4 },
    rimeDrakeling: { motion: 'crawl', main: 'body', span: 1.5, keep: ['ground'] },
    phoenix: { motion: 'bank', main: 'body', span: 2.2 },
    basilisk: { motion: 'crawl', main: 'body', span: 2.0, tint: 1.5, lift: '#1c1a24', hot: 1.2 },
    saltGolem: { motion: 'sway', main: 'torso', span: 1.3 },
    rubbleGolem: { motion: 'sway', main: 'torso', span: 1.5, tint: 1.4, lift: '#201a1c', hot: 1.2 },
    // floor 4's (the wick mouse's flame is its model's own, not kept: its behaviour grows it each frame)
    wickmouse: { motion: 'squat', main: 'body', span: 0.75, tint: 0.6 }, // (its pale fur darkened off the ivory floor; its flame glows of itself)
    chimeBat: { motion: 'float', main: 'bell', span: 1.0 },
    gargoyleWhelp: { motion: 'squat', main: 'body', span: 0.95 },
    moonstagFawn: { motion: 'sway', main: 'body', span: 0.9 },
    radiantEye: { motion: 'float', main: 'core', span: 1.2 },
    harpy: { motion: 'bank', main: 'body', span: 1.7 },
    lodestoneGolem: { motion: 'sway', main: 'body', span: 1.3 },
    hearthGolem: { motion: 'sway', main: 'body', span: 1.3, keep: ['flames'] },
    shadowFox: { motion: 'crawl', main: 'body', span: 1.3 },
    rimeScarab: { motion: 'crawl', main: 'body', span: 1.15, keep: ['ball'] },
    griffin: { motion: 'bank', main: 'body', span: 2.2, roll: 0.1 }, // (its wide wings roll less)
    // floor 1's (the grimoire mimic stays built in code: its covers are its jaws; the rune ram's plates, the urn mimic's
    // lid and eyes, the helm hermit's claws are kept as built, so its fight still shows on them)
    sporeling: { motion: 'squat', main: 'body', span: 0.85, hot: 1 },
    vesperMoth: { motion: 'bank', main: 'body', span: 1.1 },
    runeBeetle: { motion: 'crawl', main: 'body', span: 0.95, keep: ['halfL', 'halfR'] },
    urnMimic: { motion: 'squat', main: 'body', span: 0.75, keep: ['lid', 'peek'] },
    cryptSpider: { motion: 'crawl', main: 'body', span: 1.3 },
    inkOctopus: { motion: 'sway', main: 'body', span: 1.2 },
    fireflyBeetle: { motion: 'bank', main: 'body', span: 0.6, hot: 2, tint: 0.8 },
    choirLark: { motion: 'float', main: 'body', span: 1.1, tint: 0.75 }, // (its white plumage held off the sandstone)
    stormMantis: { motion: 'sway', main: 'chest', span: 1.1 },
    rubbleCrab: { motion: 'crawl', main: 'body', span: 1.4, keep: ['big', 'small'] },
    // floor 5's (the hydra stays built in code: its necks cut and stumps seared are its fight; the lantern tortoise's
    // model is its shell alone, its head and legs kept as built, so it is seen to shut itself in)
    rootling: { motion: 'squat', main: 'body', span: 0.9, keep: ['mound'], tint: 1.3, lift: '#1e2a1c' }, // (its dark bark lifted off the shore)
    rimeWolf: { motion: 'crawl', main: 'body', span: 1.2 },
    frostJackalope: { motion: 'squat', main: 'body', span: 0.8, tint: 0.75 }, // (its pale fur held off the floor's mist)
    stormRay: { motion: 'bank', main: 'body', span: 1.0 },
    voidMote: { motion: 'float', main: 'body', span: 0.85, lift: '#22163a', hot: 1.5 }, // (its maw's violet of its own)
    gloomRaven: { motion: 'bank', main: 'body', span: 1.7, roll: 0.1, tint: 1.3, lift: '#1e1838' }, // (black wings lifted off the shore)
    // (its shrine's glow set `atop` units over the shell's top: the made shell stands taller than the look in code's,
    // which held the glow inside it)
    lanternTortoise: { motion: 'sway', main: 'body', span: 1.5, keep: ['head', 'legs'], atop: 0.04 },
    glacierGolem: { motion: 'sway', main: 'torso', span: 1.9, tint: 0.85 },
    dustPangolin: { motion: 'crawl', main: 'body', span: 1.45 },
    manticore: { motion: 'crawl', main: 'body', span: 1.8 },
  },
  // bosses made in Tripo (actors/madeBosses.ts), by boss: their size against their look in code, and the parts of that
  // look kept as built (the rune ring and the halo the fight turns and lights), the part whose fire is set on the
  // model (its painted flames don't light), and how its surface is lit (madeFoes.ts `MadeSurface`: `tint` times its
  // texture, the pale abbess darkened off her pale floor; `lift`, the knight's black cloak a hole in floor 3's)
  madeBosses: {
    abbess: {
      size: 1,
      keep: ['ring', 'halo'],
      tint: 0.66,
      creature: { id: 'abbess', head: 'tripo::Head_1', blend: 0.2, pace: [0.4, 2.5], over: { hit: 1.2 } },
    },
    pyre: {
      size: 1,
      keep: ['ring', 'halo'],
      fire: 'helm',
      tint: 1.7,
      lift: '#241d30',
      hot: 1.2,
      creature: { id: 'pyre', head: 'Head', blend: 0.18, pace: [0.4, 2.5], fire: 'Head', tint: 0.75 },
    },
    // (its pounce's arc and its shakes from the fight's `body`, its crouch and the rest its clips')
    tiger: {
      size: 1,
      keep: ['ring', 'halo', 'rime', 'floor'],
      creature: { id: 'tiger', head: 'bone_19', blend: 0.15, pace: [0.4, 2.5], moves: 'body' },
    },
    // (each guardian fights as its creature, its head turning after the mage by `look`; the second on the first's
    // skeleton, fitted to its body in Blender, so it plays the same clips)
    twins: {
      size: 1,
      keep: ['ring', 'halo'],
      eye: 0.74,
      creature: {
        id: 'twins',
        head: 'Head',
        look: { NeckTwist01: 0.5, Head: 0.5 },
        blend: 0.2,
        pace: [0.4, 2.5],
        over: { hit: 1.2 },
      },
    },
    twins2: {
      size: 1,
      keep: ['ring', 'halo'],
      eye: 0.74,
      creature: {
        id: 'twins2',
        head: 'Head',
        look: { NeckTwist01: 0.5, Head: 0.5 },
        blend: 0.2,
        pace: [0.4, 2.5],
        over: { hit: 1.2 },
      },
    },
    // (a boss with a `creature` fights as that animated creature once loaded, data/creatures.json `<id>`: the bone its eye's
    // glow rides (`head`), its neck's bones bowed by `bow` times the fight's lowered head, its clips cross-faded over
    // `blend` seconds and their pace (the walk to its speed, a blow to the fight's) held within `pace`, a clip played over
    // the others when it is struck (`over`: the seconds it rests before it plays again), the part whose place the fight
    // moves lifting and shaking it (`moves`), the bone its fire rides (`fire`), its neck turned after the fight's head
    // (`look`), its own texture's `tint`; else the still model)
    hart: {
      size: 1,
      keep: ['ring', 'halo', 'floor'],
      eye: 0.62,
      creature: { id: 'hart', head: 'bone_5', bow: { bone_3: 0.55, bone_5: 0.45 }, blend: 0.18, pace: [0.4, 2.5] },
    },
    // (its lamp kept as built, as the fight swells it; `hover`, how high it swims, as its look in code)
    // (its brown fur held off floor 1's brown; its candle crown glows of itself)
    warden: {
      size: 1,
      keep: ['ring', 'halo'],
      eye: 0.8,
      hot: 1.2,
      tint: 0.6,
      creature: { id: 'warden', head: 'bone_5', blend: 0.2, pace: [0.4, 2.2], over: { hit: 1.4 } },
    },
    angler: { size: 1, keep: ['ring', 'halo', 'lure'], eye: 0.6, hover: 0.4, tint: 1.3, lift: '#1c1630' }, // (its black body lifted off the shore)
    // (the Pillar Dragon's and the jelly serpent's heads alone, their bodies chains built in code: `centre`d on the head in
    // code, where the chain meets it, rather than stood on the floor; `at`, points of the model's box (0 to 1 across, up and
    // front to back) where a glow is set: their eyes, and the dragon's maw where its breath comes out)
    dragon: { size: 0.65, keep: ['ring', 'halo'], centre: true, at: { eye: [0.5, 0.7, 0.62], maw: [0.5, 0.3, 0.95] } },
    serpent: { size: 1.4, keep: ['ring', 'halo'], centre: true, at: { eye: [0.5, 0.62, 0.62] }, tint: 0.8 }, // (its pale bone held toward the jelly's green floor)
    // (Kaelith's violet-black plate lifted in the Seal's dark violet, so it reads on the Seal's floor; kneeling at the end,
    // its own model; its floor's circle and its eyes' glow kept)
    // (both fight and kneel as its rigged creature once loaded, data/creatures.json `kaelith`: its sinking into shadow and
    // its reeling from the fight's `body`)
    kaelith: {
      size: 1,
      keep: ['ring', 'halo', 'floor'],
      eye: 0.88,
      lift: '#221a3e',
      creature: { id: 'kaelith', head: 'mixamorigHead', blend: 0.2, pace: [0.4, 2.5], moves: 'body', under: true },
    },
    kaelith_kneel: {
      size: 1,
      keep: ['ring', 'halo', 'floor'],
      eye: 0.8,
      lift: '#221a3e',
      creature: { id: 'kaelith', head: 'mixamorigHead', blend: 0.2, pace: [0.4, 2.5] },
    },
  },
  // the HUD (ui/hud.ts, art bible 4.6): its pixel in screen pixels (below and from `tall` window pixels high), and a
  // spell's icon in pixels across, made pixel art (render/pixelIcons.ts), and the purse's obol in pixels across
  hud: { pixel: [2, 3] as [number, number], tall: 900, spellIcon: 16, coin: 12 },
  // alchemy (items/potions.ts and potionThrow.ts; docs/archive/M5-plan.md): the belt's slots, a bottle's and a reagent's size as built, the
  // chance a fallen foe or a broken object leaves its reagent (items/reagents.ts; the Alchemist's Satchel's more), what Dr.
  // Jelly asks for a recipe (obols), the laboratory's: how near the table or Dr. Jelly opens the table, how far behind the
  // table Dr. Jelly stands, the chance a burst jelly globe lets out a jelly (else a reagent), how far its vat window keeps
  // from a door in the north wall, how low Dr. Jelly crouches while the room is locked (his height); the jelly serpent's vat: bolts that crack its window open (`cracks`, a
  // crack counted at most every `crackGap` seconds), the chance a run's serpent is restless (it breaks out by itself
  // `restlessAfter` seconds after the first brew in its laboratory), the jelly it floods the room with (tiles); how
  // long the potion key is held before it throws rather than drinks (seconds); a throw's reach, its flight (seconds) and
  // how high it arcs, the splash's reach; a foe in a Philter's splash strikes another this many times its touch, and a drunk Philter's echo comes so
  // many seconds after the cast; the Grave Draught's thrall (its pace, a blow, seconds between blows, how near it strikes);
  // the Cracked Retort's splash (times as wide) and its glass's cut, and how far apart the Alchemist's split
  // bottles land (across the aim)
  alchemy: {
    belt: 3,
    bottleScale: 1.45,
    reagentScale: 1.8,
    reagent: { foe: 0.12, object: 0.3, blossom: 0.6, satchelMul: 1.3 },
    recipePrice: 6,
    lab: {
      reach: 0.55,
      jellyAt: 1.6,
      globeJelly: 0.4,
      windowClear: 2.5,
      duck: 0.3,
      give: {
        reach: 0.35,
        hold: 0.6,
        toss: 0.4,
        back: 0.45,
        size: 0.22,
        arc: 0.45,
        shoulder: -2.1,
        out: -0.55,
        elbow: -0.4,
        lean: 0.1,
        nod: 0.15,
      },
    },
    vat: { cracks: 3, crackGap: 0.25, restless: 0.35, restlessAfter: 1.4, flood: 30 },
    hold: 0.25,
    reach: 4.5,
    flight: 0.45,
    arc: 1.1,
    splash: 1.1,
    echoMul: 6,
    echoAfter: 0.3,
    thrall: { speed: 2.4, damage: 7, every: 0.7, near: 0.7 },
    retort: { splashMul: 1.5, cut: 6 },
    split: 2,
    // a splash's look (items/potionThrow.ts): a dark edge under its ring, fading in `steps` flat steps from `opacity`
    // (the ring alone vanished on a floor of its own colour), and its glass shards `shard` of the way to the floor's
    // shadow colour, drawn over the floor (in front of it they were outlined to near-black specks)
    splashEdge: { opacity: 0.5, steps: 3, inner: 0.72, outer: 1.1 },
    shard: 0.6,
    // the least lightness of a splash's ring, in the potion's hue (the hex brew's dark violet vanished into a dark floor)
    splashLight: 0.45,
  },
  // the soundscapes and the music (docs/archive/sound-plan.md, audio/director.ts): scheduled `ahead` seconds before they sound
  // (`hiddenAhead` in a hidden tab, whose timers run once a second; the scheduler's own timer every `tick` ms); the music
  // thins at `lowHp` half-hearts or fewer; the floor's bed ducks to `fightDuck` while the doors are locked, `bossDuck`
  // with a boss alive, `pauseDuck` in the pause menu, and `themeDuck` under a themed room's touch; a bed layer sends
  // `bedSend` of itself to the space; the music plays at `music.level` (under the bus), `music.send` of it to its space,
  // muffled to `music.muffle` Hz when paused, through a compressor (`glue`) holding a boss's full stems under the effects;
  // the dev menu's preview lasts `preview` seconds; a sound played from a file (audio/samples.ts) has its pitch moved by up
  // to `fileSpread` either way each time, so a sound heard again isn't the same
  audio: {
    ahead: 0.6,
    hiddenAhead: 1.6,
    tick: 250,
    lowHp: 2,
    fightDuck: 0.65,
    bossDuck: 0.45,
    pauseDuck: 0.5,
    themeDuck: 0.9,
    bedSend: 0.3,
    music: {
      level: 0.5,
      send: 0.55,
      muffle: 700,
      glue: { threshold: -16, ratio: 3.5, knee: 10, attack: 0.02, release: 0.3 },
    },
    preview: 40,
    fileSpread: 0.03,
  },
  // creatures made in Tripo and animated in code (actors/madeCreatures.ts, docs/creatures.md): the lap walked (its radius),
  // seconds walking and resting (and resting first), how long one clip blends into the next, how fast it turns to the mage
  // to roar, its shadow's size against its length, where the dev menu stands it from the mage (to the side, and south),
  // and the loudness of its footsteps and of its loud events (the roar, the slam)
  creatures: {
    lap: 1.3,
    walkFor: 6,
    restFor: 1.4,
    firstRest: 0.8,
    blend: 0.3,
    turn: 6,
    shadow: 0.55,
    standSide: 2.6,
    standSouth: 0.6,
    stepGain: 0.3,
    roarGain: 0.4,
    // the look made from its own texture (actors/texturePixel.ts, render/texelBake.ts): the texture shrunk to at
    // least one texel a game pixel (times `detail`, a power of two within [min, max]; `facing`, the share of its faces
    // turned to the camera); texels at least `glowLight` light
    // and `glowChroma` colourful (OKLab) kept where they are `glowShare` of a block, and lit at `glowGain`; its shadows
    // lifted (lightness to the power `lift`) and its `contrast` set; cut to `colours` (k-means `refine` rounds, hue counted
    // `chroma` times)
    texel: {
      detail: 1,
      facing: 0.5,
      min: 64,
      max: 512,
      glowLight: 0.65,
      glowChroma: 0.12,
      glowShare: 0.2,
      glowGain: 0.7,
      lift: 0.8,
      contrast: 1.1,
      colours: 24,
      refine: 8,
      chroma: 3,
    },
  },
  // the mage in the pixel-art look (actors/heroPixel.ts): its texture baked into its vertices (each the mean of
  // the texels within `sample` of where it lies) and cut down to `colours`; light in the `tones` (darkest first, a toon
  // ramp's steps) with `glow` of its own colour as self-light, as the model had, so it reads in dark rooms
  heroPixel: { colours: 20, refine: 8, chroma: 3, tones: [0.06, 0.16, 0.5, 0.95], glow: 0.14, sample: 1 },
  // the room kit: the floors' and walls' texels to a unit across and down the screen (render/pixelTextures.ts;
  // at 540 lines a one-cell room shows a unit as about 62 × 44 pixels, the floor seen from 45° above, a great hall as
  // 50 × 35; 48 × 34 keeps a texel square on screen and at least a pixel in both, at 1080 lines 2 to 3), how brightly
  // embers glow in the walls and floors that have them (basalt seams, charred beams), a floor's the less in a dark room;
  // the artifacts built in code: how much larger than built they float, how far a tall one is lifted clear of its pedestal
  // (its half height past this); their HUD icons (items/artifactIcons.ts): drawn at `size` pixels and made pixel art of
  // `out` (shown at whole multiples), turned (x, y) to the camera, the margin round them, the light (fill, key, the rim in
  // the artifact's colour), and how much of an icon pixel must be drawn (its alpha, 0 to 255) for it to be `solid`
  roomKit: {
    texel: [48, 34] as [number, number],
    glow: 0.6,
    glowDark: 0.5,
    artifactScale: 1.2,
    artifactClear: 0.24,
    // a made floor face's steps of light (render/pixelTextures.ts madeFloor): the room's base colour shaded from `dark`
    // (the step over the joints) to `light` (the brightest)
    floorFace: { dark: 0.7, light: 1.12 },
    // a floor's own made urn set in a wall niche (world/wallLooks.ts), scaled from its height on the floor
    nicheUrn: 0.42,
    // (the halo round an artifact built in code, its colour darkened by `dim`: a larger, brighter one washed a pale
    // artifact out and melted a green one into a green floor); a floor with its own
    // halo (`items.halo`) gives it to the artifacts in the `warm` hues (degrees, from and to round red)
    artifactGlow: { size: 0.8, opacity: 0.4, dim: 0.75, warm: [335, 30] as [number, number] },
    // a made chest's ward seal (items/pickupLooks.ts): how high it hovers over the lid, and how much wider it lies than the
    // seal that stands before a chest built in code
    sealHover: 0.1,
    sealFlatScale: 1.45,
    icon: {
      size: 96,
      out: 24,
      turn: [0.35, -0.55] as [number, number],
      margin: 1.12,
      fill: 1.6,
      key: 2.4,
      rim: 1.6,
      solid: 110,
    },
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
    impact: 0.22,
    strike: 0.22,
    chain: 0.3,
    soul: 0.55, // (Soul Harvest's sparks flying home)
    crackle: 0.25,
    ring: 0.3,
    flash: 0.3,
    shockwave: 0.45,
    seal: { rise: 0.15, crown: 0.5, pillar: 0.7, star: 0.6 },
    wallRise: 0.25,
    wallStagger: 0.03,
    weaveName: 2, // (seconds before the same weave's name rises again, for those that go on and on)
    nameGap: 0.44,
    nameStack: 0.5, // (a name rising where another rose under `nameStack` s ago stands `nameGap` above it on screen)
    // a school's colour drawn rather than added where added light came out white on a bright floor (art bible 4.15): its
    // lightness held at `deep` at most. Hallow's gold (Consecrate, Judgement, Wardlight), its rings edged a game pixel
    // round in `edge` at `edgeOpacity` of the gold's, its glow, fill and Wardlight's orbs' glow this strong; lightning a
    // white core `core` of the bolt's width in a drawn sheath `sheath` times it, at `sheathOpacity`; a shard's halo this
    // strong
    deep: 0.42,
    hallow: { gold: '#e09a2a', edge: '#3a1e0a', edgeOpacity: 0.75, glow: 0.14, fill: 0.1, orbGlow: 0.45 },
    lightning: { core: 0.45, sheath: 2.4, sheathOpacity: 0.95 },
    shardGlow: 0.3,
    // a dark school's orb (the Hex Bolt: spellFx.ts boltLook): a sheath `size` of the bolt's scale in its colour at
    // lightness `deep` at most, ringed in `edgeColor` out to `edge`, the white-hot core `core` of its usual size and
    // lifted `lift` out of its top, its glow this strong (a thin ring of added violet was lost on floor 3's maroon)
    sheath: { size: 0.1, deep: 0.5, edge: 0.125, edgeColor: '#1a0c26', core: 0.6, lift: 0.07, glow: 0.6 },
    // the Living Wall's made hedge: its weave tinted, and lit from within so its greens hold on a dark floor
    hedge: { tint: '#a8f088', glow: '#58b838' },
    // the Thorn Snare's made brambles the same way, a little less (near-black thin brambles were lost on floor 3's floor)
    thorns: { tint: '#c8eaa0', glow: '#70c034' },
    // the Lantern of Vigil's made lantern: its size (1.4 before, a tiny lantern on floor 3), its iron tinted and lit warm
    // from its own texture, its flame's size, its halo across in hard bands (`rings` as pixelLook.teleRings) in its gold
    // drawn at lightness `deep` at most, this strong
    lantern: {
      scale: 2,
      tint: '#ffe0b8',
      glow: '#a05a20',
      flame: 1.4,
      halo: 1.15,
      haloOpacity: 0.7,
      deep: 0.55,
      rings: [
        [0.3, 1],
        [0.55, 0.6],
        [0.8, 0.32],
        [1, 0.14],
      ] as readonly (readonly [number, number])[],
    },
    // Wardlight's motes: a gold crystal (`size` across and tall) in Hallow's dark edge (`edge` times it), a heart taken
    // `heart` toward white, a glow `glow` across in hard bands (Hallow's gold too near floor 3's orange cracks to read)
    wardMote: {
      size: [0.09, 0.15] as [number, number],
      edge: 1.35,
      heart: 0.6,
      glow: 0.55,
      rings: [
        [0.5, 1],
        [1, 0.4],
      ] as readonly (readonly [number, number])[],
    },
    // how strongly Grasp of the Grave and the Thorn Snare shade the ground in their circle (the floor's own shadow colour,
    // pixelLook.ts floorShade): the floor shows through, never a pit's black
    groundShade: 0.55,
  },
  lights: {
    hemi: 1.57,
    moon: 1.26,
    torch: 4.3,
    torchDistance: 9,
    torchDecay: 0.5,
    lantern: 3.8,
    lanternDistance: 6.5,
    lanternDecay: 0.5,
    exposure: 1.2,
  },
};

export type EnemyType = keyof typeof CFG.enemy;
/** Enemy types that are bosses; each floor draws its boss from a pool of these (data/floors.json). The jelly serpent
    is in no pool: it breaks out of its vat in Dr. Jelly's laboratory (or comes with `?boss=serpent` and the dev menu). */
export const BOSS_TYPES = [
  'warden',
  'abbess',
  'pyre',
  'hart',
  'angler',
  'tiger',
  'dragon',
  'twins',
  'serpent',
  'kaelith',
] as const satisfies readonly EnemyType[];
export type BossType = (typeof BOSS_TYPES)[number];
