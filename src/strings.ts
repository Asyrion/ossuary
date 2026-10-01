/* Every player-facing string, so the placeholder names can be swapped for Eda lore in one place.
   Artifact names and pickup lines live with the artifact data in data/artifacts.json. */
import type { BestiaryOptionId } from './actors/bestiaryLooks';
type Banner = [title: string, subtitle: string];

export const STR = {
  pageTitle: 'Ossuary, an Eda prototype',
  title: {
    heading: 'Ossuary',
    place: 'Beneath the Gate of Uzulim',
    intro: "Asyrion's first descent into the Wardens' vault. Clear the crypt, take the relic from its altar, and put the fallen Warden below to rest.",
    start: 'Descend',
    note: 'Prototype 0.4. Drop any Tripo .glb onto this page to play as it.',
  },
  controls: {
    keyboard: 'Keyboard', gamepad: 'Gamepad', touch: 'Touch',
    move: 'Move', moveKeys: 'W A S D', movePad: 'Left stick', moveTouch: 'Left thumb',
    shoot: 'Shoot', shootKeys: 'Arrow keys', shootPad: 'Right stick', shootTouch: 'Right thumb',
    glyph: 'Blast glyph', glyphKeys: 'Space', glyphPad: 'Left trigger', glyphTouch: '–',
    pause: 'Pause', pauseKeys: 'Esc or P', pausePad: 'Start', pauseTouch: 'II button',
    /** Play-test aid, like STR.dev.hint: remove with it. */
    spells: 'Spells', spellsKeys: 'Q and E', spellsPad: 'LB and RB', spellsTouch: '–',
    inventory: 'Inventory', inventoryKeys: 'I or Tab', inventoryPad: 'View', inventoryTouch: '–',
    dev: 'Dev menu', devKeys: '` / ^ or F2', devPad: '–', devTouch: '–',
  },
  chalk: { walk: 'walk', cast: 'cast', glyph: 'glyph', space: 'SPACE', touchMove: 'left thumb moves', touchShoot: 'right thumb shoots',
    spells: 'spells', q: 'Q', e: 'E', inventory: 'inventory', i: 'I', pause: 'pause', esc: 'ESC' },
  pause: {
    heading: 'Paused', resume: 'Resume', restart: 'Restart run', load: 'Load hero .glb',
    soundOn: 'Sound: on', soundOff: 'Sound: off',
    master: 'Volume', effects: 'Effects', interface: 'Interface', inventory: 'Inventory (I)',
  },
  end: {
    won: 'The descent is complete',
    lost: 'Asyrion fell in the vault',
    wonText: "Every floor of the Wardens' vault cleared, and every keeper put to rest. Below the last, Kaelith's seal still holds.",
    lostText: (floor: number, name: string) => `Asyrion's descent ended on floor ${floor}, ${name}.`,
    floor: 'Deepest floor', time: 'Time', kills: 'Foes put to rest', obols: 'Obols found', seed: 'Seed', artifacts: 'Artifacts carried',
    floorValue: (floor: number, floors: number) => `${floor} of ${floors}`,
    again: 'Descend again',
    replay: 'Replay this seed',
  },
  /** Banner when a floor begins, floor 1 first. */
  floors: [
    ['The Ossuary', "Beneath the Wardens' chapel, below the Gate of Uzulim"],
    ['The Drowned Catacombs', "Where the chapel's water gathers"],
    ['The Burning Scriptorium', 'Where the Wardens kept their books'],
    ['The Gilded Reliquary', 'Where the Wardens sealed what they took'],
    ["The Ferryman's Shore", 'Where the dead wait to cross'],
  ] as Banner[],
  /** The bosses: name and line on the boss bar banner, the banner when it calls help, the one when it dies. */
  bosses: {
    warden: { name: 'The Hollow Warden', sub: 'A Warden of Uzulim who never came back up', summon: 'The Warden calls its dead', dead: 'The Warden is still at last' },
    abbess: { name: 'The Drowned Abbess', sub: 'She still keeps the hours below', summon: 'The abbess calls the drowned lights', dead: 'The abbess sinks for good' },
    pyre: { name: 'The Pyre Knight', sub: 'Sworn to the burning books', summon: 'The knight calls the hounds', dead: 'The knight burns out' },
    hart: { name: 'The Hallowed Hart', sub: "It keeps the relics' light", summon: 'The hart calls its fawns', dead: 'The hart lies down at last' },
    angler: { name: 'The Deep Angler', sub: 'Its light calls the dead astray', summon: 'The angler calls the dark', dead: "The angler's light goes out" },
    tiger: { name: 'The War-Tiger', sub: 'The Wardens set it at the vault, and it never left its post', summon: 'Its roar wakes the halls', dead: 'The tiger lies down at its post', plate: 'A plate falls' },
    dragon: { name: 'The Pillar Dragon', sub: "It coils where the Wardens' columns still stand", summon: 'The dragon calls the dark down', dead: 'The dragon slides from the columns at last', fall: 'Knocked down' },
    twins: { name: 'The Twin Guardians', sub: 'They crouched in the towers of the Gate, and followed the Wardens down', summon: 'The guardians call the halls to arms', dead: 'The guardians are stone again', rage: 'The last guardian rages' },
  },
  banner: {
    wayDown: 'A way down has opened',
    wayOut: 'The way out lies below',
    artifactRises: ['Something rises from the dust', ''] as Banner,
    ordeal: (waves: number): Banner => ['The Ordeal', `Survive ${waves} waves, and be rewarded`],
    wave: (n: number, of: number): Banner => [`Wave ${n}`, `of ${of}`],
    ordealPassed: ['The ordeal is passed', 'Your reward rises'] as Banner,
    altar: ['A bone altar', 'It asks for a heart'] as Banner,
    altarRefuses: ['The altar refuses', 'You have no heart to spare'] as Banner,
    merchant: ['The Bound Shade', 'He deals in the obols of the dead'] as Banner,
    vault: ['The Vault', 'What the Wardens would not give up'] as Banner,
    vaultWarden: ["The vault's warden wakes", 'It will not give up the hoard'] as Banner,
    wanderer: ['The Wandering Merchant', 'Out of Belerial, with wares from far off'] as Banner,
    vaultWardling: (school: string): Banner => [`What the ward drank rises`, `${school} guards the vault now`],
    gildedRelic: ['A relic in the reliquary', 'Fortune favours the bold'] as Banner,
    secret: ['A forgotten cell', 'A Warden studied the dark here, long ago'] as Banner,
    library: ['The Library', 'Torn pages whisper on their lecterns'] as Banner,
    pageFalls: ['A torn page', 'It whispers of a spell'] as Banner,
    shrine: (price: number): Banner => ['A shrine', `For ${price} obols it cleanses a curse`],
    riteBegins: ['The curse fights back', 'Strike it down inside the circle'] as Banner,
    cleansed: (name: string, text: string): Banner => [`The ${name} is cleansed`, text],
    lastRite: ['The last rite holds', 'Death is refused, this once'] as Banner,
  },
  runInfo: (floor: number, floors: number, seed: string) => `Floor ${floor} of ${floors} · Seed ${seed}`,
  rotate: 'Turn your phone sideways to play.',
  drop: 'Release to play as this model',
  health: (hp: number, max: number, souls = 0) => `Health ${hp} of ${max} hearts` + (souls ? `, ${souls} soul mote${souls > 1 ? 's' : ''}` : ''),
  purse: (coins: number, keys: number, glyphs: number) => `${coins} obols, ${keys} bone keys, ${glyphs} blast glyphs`,
  /** What is being done to the mage (ui/afflictions.ts): the chips beside the mana bar, and the line said the first time
      each comes in a run (the sapping obelisk says its own). */
  afflict: {
    hexed: (n: number) => `Hexed −${n} mana`,
    label: { chill: 'Chilled', stone: 'Heavy as stone', dim: 'Sight dimmed', web: 'Webbed', ink: 'Ink-slowed', snag: 'Snagged',
      slide: 'Sliding', drawn: 'Drawn in', sapped: 'Sapped' } as Record<string, string>,
    why: {
      hexed: 'A hexed blow drew mana out of you.',
      chill: 'Cold in your bones: you move slower until it thaws.',
      stone: 'A stare turns your limbs heavy as stone while it holds you. Break its sight.',
      dim: 'Something stings your eyes: your sight closes in for a while.',
      web: 'Webs cling to your feet. Fire burns them away.',
      ink: 'Ink drags at your steps.',
      snag: 'Cobwebs snag you. Fire burns them away.',
      slide: 'Rime underfoot: you slide. Fire melts it.',
      drawn: 'Something draws you towards it.',
    } as Record<string, string | undefined>,
  },
  toast: {
    /** M4.2: Fen-Nex grows (to its second stage, then its full shape). */
    fennexGrows: ['Fen-Nex has grown', 'Fen-Nex comes into its full shape'],
    fullHealth: 'You are already at full health', fullMana: 'Your mana is already full',
    fullSouls: 'You can keep no more soul motes', shardIdle: 'Your spells are ready and your mana full: the shard has nothing to give',
    soulBurned: 'Short of mana, the spell burned a soul mote for the rest',
    notGlb: 'That file is not a .glb. Export the model from Tripo as GLB and try again.',
    badGlb: 'This .glb could not be read. Re-export it from Tripo as GLB and try again.',
    focusLeft: (name: string) => `You leave the ${name} on the pedestal`,
    focusLeftShop: (name: string) => `You leave the ${name} in the broken circle`,
    chestSealed: "A ward seals this chest. A bone key unbinds it; a glyph's blast breaks it, but burns half of what's inside.",
    gildedSealed: 'A golden ward seals this reliquary. No blast breaks it; only a bone key unbinds it. Something rare waits inside.',
    shopWarded: 'The shade has warded his shop: no spell takes hold here.',
    tooPoor: (price: number, coins: number) => `It costs ${price} obols; you carry ${coins}.`,
    wareWhole: 'You are whole; keep your obols.',
    wareFull: 'You can carry no more of those.',
    bought: (name: string) => `The ward breaks: the ${name} is yours`,
    vaultSealed: 'A ward seals the vault. A bone key unbinds it; two glyph blasts can force it, but forcing it wakes its warden. It drinks the spells cast near it, too.',
    wardDrinks: 'The ward drinks your spell. Fill it, and what it drank most rises to guard the vault.',
    wardBursts: (school: string) => `The ward bursts, full of ${school}`,
    shieldDrinks: 'Its ward drinks your spells. Fill it, and it breaks.',
    wandererGreets: 'The merchant has things the shade never will. The crow will sell what it has seen.',
    crowMapped: 'Every room of this floor is on your map already.',
    crowNoSecret: 'The crow has seen no secret on this floor that you have not.',
    crowMap: 'The crow tells you the floor: every room of it is on your map.',
    crowSecret: 'The crow saw a hollow wall: the secret room is on your map, and its cracked walls glow.',
    shieldBreaks: (school: string) => `The ward breaks, and lets out its ${school}`,
    wardCracks: 'The ward cracks. One more blast breaks it, and wakes what guards the vault.',
    vaultForced: 'The ward shatters. Something stirs inside the vault.',
    vaultUnbound: 'The bone key unbinds the ward.',
    hollow: "The wall rings hollow. A glyph's blast would break it.",
    secretFound: 'A hidden way lies open.',
    oathKept: 'The oath holds: half a heart returns.',
    shrineIdle: 'You carry no curse for the shrine to cleanse.',
    shrinePoor: (price: number, coins: number) => `The shrine asks ${price} obols to cleanse a curse; you carry ${coins}.`,
    outsideCircle: 'Outside the circle, your bolts pass through the curse.',
    keyringTurns: "The sexton's keyring turns in the ward: the vault opens.",
    lanternFinds: 'The Grave Lantern finds a hollow wall.',
    noSpell: 'No spell in that slot yet: grimoire pages teach them.',
    spellWarded: "The shop's ward smothers the spell.",
    wareBrimming: 'You brim with mana already; keep your obols.',
    wareSouls: 'You can keep no more soul motes; keep your obols.',
    wareIdle: 'Your spells are ready and your mana full; keep your obols.',
    curseEscaped: (name: string) => `The curse slips back into the ${name}. Walk into its stone to try again.`,
  },
  /** The schools of magic, and how a spell's lore card names it and says what it does. */
  schools: { ember: 'Ember', frost: 'Frost', storm: 'Storm', hallow: 'Hallow', umbral: 'Umbral' } as Record<string, string>,
  spellKind: (school: string) => `${school} spell`,
  spellEffect: (text: string, mana: number, cooldown: number) => `${text}. ${mana} mana, every ${cooldown} s`,
  /** Spell knowledge (M3.7). */
  knowledge: {
    knownWell: (name: string) => `You know ${name} well now: its lore and what it sets off`,
    /** What a spell's panel says of what isn't known yet. */
    seenOnly: 'Take its page to learn more of it.',
    castMore: (n: number) => `Cast it ${n} more time${n === 1 ? '' : 's'} to know it well.`,
    sealed: 'A page not yet found',
    sealedText: (school: string) => `A ${school} spell you have not come across. Libraries, bosses and now and then a fight leave pages.`,
    notCarried: 'Known, but not in a slot. A page of it, or a library, puts it back.',
    sets: 'What it sets off',
    /** A reaction the spell can set off, with the school whose status completes it. */
    reaction: (name: string, school: string, what: string) => `${name}, with ${school}: ${what}`,
    reactionText: {
      shatter: 'a frozen foe shocked, or a shocked foe frozen, bursts into shards',
      overload: 'a burning foe shocked, or a shocked foe set alight, explodes',
    } as Record<string, string>,
  },
  manaLabel: (mana: number, max: number) => `Mana ${Math.round(mana)} of ${max}`,
  /** Reactions name themselves in the air; statuses as the training dummy lists them. */
  reactions: { shatter: 'Shatter', overload: 'Overload', eclipse: 'Eclipse', blackfire: 'Blackfire', steam: 'Steam' } as Record<string, string>,
  /** Over a foe struck by its weakness or its resistance, the first time (M4; GDD: Enemy affinities). */
  foes: {
    weak: 'Weak', resists: 'Resists', drinks: 'Drinks it',
    /** Champion mantles (M4.7, actors/mantles.ts): the word over a stripped champion, the word when a mantle turns a
        status, each mantle's name (risen over the champion as it comes) and its line the first time in a run. */
    unbound: 'Unbound!', shrugs: 'Unmoved',
    mantles: {
      kindled: { name: 'Kindled', line: 'A Kindled champion: fire can\'t touch it, and it leaves the floor burning. Frost unbinds it.' },
      rimebound: { name: 'Rimebound', line: 'A Rimebound champion: cold can\'t touch it, and its blows chill. Fire unbinds it.' },
      stormcharged: { name: 'Stormcharged', line: 'A Stormcharged champion: strike it and the floor under you sparks. Frost unbinds it.' },
      hallowed: { name: 'Hallowed', line: 'A Hallowed champion mends the foes round it. Darkness unbinds it.' },
      hexbound: { name: 'Hexbound', line: 'A Hexbound champion: its shots drink mana, and it curses the ground it falls on. Holy light unbinds it.' },
    } as Record<string, { name: string; line: string }>,
  },
  /** Grimoire pages: the question a page asks when both slots are full, and what's left behind. */
  pages: {
    ask: (name: string) => `Learn ${name} in place of`,
    or: 'or',
    keep: 'Step away to keep both',
    known: (name: string) => `You already know ${name}`,
    left: (name: string, kind: string) => kind === 'loose' ? `The page of ${name} lies where the new one was` : `The page of ${name} stays on the lectern: take it back while you are here`,
  },
  statusNames: { burn: 'Burn', chill: 'Chill', frozen: 'Frozen', shock: 'Shock', sanct: 'Sanctified', hex: 'Hex', root: 'Rooted' } as Record<string, string>,
  /** The boss bar while a shrine draws a curse out. */
  curseOf: (name: string) => `The curse of the ${name}`,
  /** The lore card shown on picking something up (ui/lore.ts). Artifacts keep their lore in data/artifacts.json;
      items and containers are described here, the first time in a run. Placeholder lore until the Eda lore
      arrives. */
  lore: {
    kinds: { focus: 'Focus', passive: 'Artifact', cursed: 'Cursed artifact' } as Record<string, string>,
    items: {
      coin: {
        name: 'Grave obol', kind: 'Coin', effect: 'Spent at the merchant and the shrine',
        lore: 'The coin laid on the eyes of the dead to pay the Ferryman. The dead down here have no more use for theirs, and their obols drift towards the living.',
      },
      purse: {
        name: 'Mourner\'s purse', kind: 'Coins', effect: 'Five obols',
        lore: 'A purse of obols meant to pay a whole family\'s crossing. Whoever it belonged to will not be needing it now.',
      },
      key: {
        name: 'Bone key', kind: 'Key', effect: 'Unbinds a warded reliquary chest, or a vault\'s ward',
        lore: "Carved by the Wardens' sextons from a finger bone, for they knew that wards are woven by the dead and answer to the dead. One key, one ward.",
      },
      glyph: {
        name: 'Glyph stone', kind: 'Blast glyph', effect: 'One more glyph to chalk on the floor (Space); your own bolt sets it off',
        lore: 'A slate with a blast glyph scratched into it. Rub it, and the rune comes away on your fingers, ready to be chalked where the stone is weakest.',
      },
      halfHeart: {
        name: 'Half a heart', kind: 'Life', effect: 'Heals half a heart',
        lore: 'A red wisp of life, left where something living was not long ago. It is not yours, but it will do.',
      },
      mana: {
        name: 'Mana vial', kind: 'Mana', effect: 'Restores 25 mana; left lying while you brim with it',
        lore: 'Grave-light caught in a stoppered vial: the pale glow that gathers over old bones on still nights. Drink it, and the spells it feeds come easier.',
      },
      heart: {
        name: 'Heart', kind: 'Life', effect: 'Heals a heart',
        lore: 'A full measure of borrowed life, warm and red. The catacombs give back, now and then, a little of what they take.',
      },
      coffer: {
        name: 'Coffer', kind: 'Container', effect: 'Opens at a touch',
        lore: 'A small box of grave goods: a ring, a coin, a lock of hair. Most were buried with their owners. This one was left behind.',
      },
      chest: {
        name: 'Reliquary chest', kind: 'Container', effect: 'A bone key unbinds its ward; a blast breaks it, and burns half of what is inside',
        lore: 'A reliquary sealed with a Warden\'s ward so that no thief could open it. A bone key asks the ward politely; a blast does not, and the relics pay for it.',
      },
      paleSoul: {
        name: 'Pale soul mote', kind: 'Soul', effect: 'Kept beside your hearts: takes the next hit for you. A spell short of mana burns one for the rest',
        lore: 'Not every soul in the catacombs found the ferry. Some drift, pale and patient, and will stand between you and a blow if you let them walk beside you.',
      },
      blackSoul: {
        name: 'Black soul mote', kind: 'Soul', effect: 'Takes a hit for you, and going out, hexes every foe in the room',
        lore: 'A soul that went down angry and stayed that way. It guards you as willingly as any, and when it goes out it spills its grudge over everything nearby.',
      },
      hallowedSoul: {
        name: 'Hallowed soul mote', kind: 'Soul', effect: 'Takes a hit only when no other mote is left; each floor it lives through gives back half a heart',
        lore: 'A pilgrim who died with a prayer still on their lips. It goes last, as the faithful always did, and at every stair down it gives a little of its warmth to you.',
      },
      shard: {
        name: 'Lodestone shard', kind: 'Magic', effect: 'Ends every spell\'s cooldown and restores 25 mana; left lying while your spells are ready and your mana full',
        lore: 'A splinter of the stones the Wardens set in the vault walls to hold the old wards. It still pulls: at magic, at breath, at whatever the mage has spent.',
      },
      gilded: {
        name: 'Gilded reliquary', kind: 'Container', effect: 'Only a bone key opens it; a relic lies inside',
        lore: 'Gilded by the Wardens for a relic that mattered, and sealed with a golden ward that no blast has ever broken. Whatever they took from the wild and locked inside was worth the gold.',
      },
    } as Record<string, { name: string; kind: string; effect: string; lore: string }>,
  },
  /** Mechanisms (M3.6): every candle stand lit. */
  mech: {
    blessed: (n: number) => `The candles bless your next ${n} casts`,
    reliquary: 'The reliquary opens to the candle-light',
    darkLifted: 'The candle-light drives off the dark',
    /** M4.2: the mage steps into a sapping obelisk's field, the first time in a room; its ward breaks. */
    sapped: (school: string) => `The obelisk saps your magic. ${school} breaks its ward`,
    wardBroken: "The obelisk's ward breaks: its field goes out",
  },
  /** A themed room, the first time the mage enters it (M3.6; the names are in data/themes.json). */
  themeEntered: (name: string) => name,
  /** M4.1's twists: the treasury's guardians wake to their gold taken; the drowned rise from the landing's river. */
  guardiansWake: 'The guardians wake: that gold was theirs',
  drownedRise: 'The drowned climb out of the river. Freeze it, and they stay down',
  /** The inventory (I or Tab, the gamepad's View button, or from the pause menu): what the mage carries and knows. */
  inv: {
    title: 'Inventory',
    tabs: { artifacts: 'Artifacts', spells: 'Spells', items: 'Items', mage: 'The mage' } as Record<string, string>,
    hint: 'Arrows choose · Q and E (LB and RB) change tabs · I, Tab or Esc closes',
    carried: 'Carried', givenUpNote: (price: number) => `Given up for another spell. Later libraries sell its page back for ${price} obols.`,
    slot: (key: string) => `Slot ${key}`,
    empty: 'Empty slot', emptyText: 'Grimoire pages teach spells: every floor has a library, bosses leave a page, and now and then a fight does.',
    none: 'Nothing yet',
    cleansed: 'Cleansed artifact', cleansedNote: 'Cleansed at a shrine: the price is gone, and half the gift remains.',
    price: 'Price', school: (name: string) => `${name} spell`,
    shapes: { beam: 'Beam', placed: 'Seal', shotgun: 'Shards', wall: 'Wall', chain: 'Chain', self: 'Aura' } as Record<string, string>,
    mana: (cost: number, base: number) => cost === base ? `${cost} mana` : `${cost} mana (${base})`,
    cooldown: (s: number) => `every ${s} s`, damage: (d: number) => `${d} damage`,
    status: { burn: (v: number) => `Burn ${v} s`, chill: (v: number) => `Chill ×${v}`, shock: (v: number) => `Shock ${v} s` } as Record<string, (v: number) => string>,
    statusText: {
      burn: 'Burn: damage over time.',
      chill: 'Chill: each stack slows; the third freezes, and a frozen foe takes more damage.',
      shock: 'Shock: a brief stun, and the next hit leaps to a foe nearby.',
    } as Record<string, string>,
    stat: {
      damage: 'Damage', damageMul: 'Damage', fireDelayMul: 'Time between casts', speed: 'Speed', speedMul: 'Speed',
      boltScale: 'Bolt size', hearts: 'Hearts', invuln: 'Grace after a hit', pierce: 'Foes pierced', shotSpeedMul: 'Bolt speed',
      rangeMul: 'Range', knockbackMul: 'Knockback', obolDamage: 'Damage per ten obols', blastMul: 'Blast size', mana: 'Mana',
      spellDamageMul: 'Spell damage', killMana: 'Mana per foe put to rest',
    } as Record<string, string>,
    bolts: (n: number, fan: boolean) => `${n} bolts ${fan ? 'in a fan' : 'side by side'}`,
    paths: { bounce: 'Bounce off walls', boomerang: 'Come back', wave: 'Weave', homing: 'Curve towards foes' } as Record<string, string>,
    boltDamage: 'Bolt damage',
    hearts: { name: 'Hearts', kind: 'Life', effect: 'Your life, counted in halves. A heart or half a heart heals; a bone altar asks for a whole one.' },
    souls: {
      name: 'Soul motes', kind: 'Souls', none: 'None held',
      held: (pale: number, black: number, hallowed: number) => [[pale, 'pale'], [black, 'black'], [hallowed, 'hallowed']].filter(([n]) => n).map(([n, k]) => `${n} ${k}`).join(', '),
      effect: 'Pale flames kept beside your hearts: each takes a hit before your hearts do, and none can be healed back. A black one hexes the room when it goes out; a hallowed one goes last and gives back half a heart at every floor\'s end. A spell short of mana burns one for the rest.',
    },
    manaItem: { name: 'Mana', kind: 'Magic', effect: (calm: number, fight: number, kill: number) => `Spells cost it. It comes back ${calm} a second out of a fight and ${fight} in one, and ${kill} for every foe your cantrip puts to rest.`, noRegen: 'The Hungering Tome feeds it only on the dead: it no longer comes back on its own.' },
    of: (n: string, max: string) => `${n} of ${max}`,
    mage: {
      damage: { name: 'Damage', text: 'What each bolt of the cantrip does.' },
      rate: { name: 'Casts a second', text: 'How often the cantrip fires while you hold a direction.' },
      boltSpeed: { name: 'Bolt speed', text: 'How fast the bolts fly, in tiles a second.' },
      range: { name: 'Range', text: 'How far the bolts fly, in tiles, before they drop.' },
      speed: { name: 'Speed', text: 'How fast you move, in tiles a second (slower wading through water).' },
      hearts: { name: 'Hearts', text: 'Your life and your heart containers.' },
      mana: { name: 'Mana', text: 'What your spells cost, and how much you can hold.' },
      regen: { name: 'Mana back', text: 'Mana a second out of a fight and in one.' },
      spellDamage: { name: 'Spell damage', text: 'What your spells do, as a multiple (the Crown of Thorns raises it).' },
      killMana: { name: 'Mana per kill', text: 'Mana back for a foe your cantrip puts to rest, and for any foe with the Hungering Tome.' },
      pattern: { name: 'Bolts', text: 'How your focus casts: how many bolts, and the path they take.' },
      grace: { name: 'Grace', text: "Seconds you can't be hurt again after a hit." },
      extra: { name: 'Pierce, knockback, blasts', text: "Foes a bolt passes through, how hard bolts throw foes back, and how far your glyphs' blasts reach." },
    } as Record<string, { name: string; text: string }>,
    base: (v: string) => `Base ${v}`,
    straight: 'Straight',
  },
  /** Enemy model options (actors/modelOptions.ts): placeholder names and a note on where each would fit. */
  options: {
    sporeling: { name: 'Sporeling', note: 'Floor 1, Umbral: a mushroom that walks, hopping on stubby feet; its violet-spotted cap puffs spores that blind' },
    vesperMoth: { name: 'Vesper Moth', note: "Floor 1, Hallow: a fuzzy moth drawn to candles, gold eyespots on its wings; flutters in loops and dusts the mage with light" },
    runeBeetle: { name: 'Rune Beetle', note: 'Floor 1, Storm: a scarab with runes lit on its shell; charges in a line, and its wing-cases part to throw a spark' },
    urnMimic: { name: 'Urn Mimic', note: 'Floor 1, Ember: a kiln-fired urn on stubby feet with a fire in its belly; waits among the urns, peeks, then spits embers' },
    mireToad: { name: 'Mire Toad', note: 'Floor 2, Frost: a fat toad with frost crystals on its back; leaps, and breathes a cone of cold' },
    cisternLurker: { name: 'Cistern Lurker', note: 'Floor 2, Storm: a round-headed eel rising from a rune-edged pool, a glowing lure on each whisker; spits sparks, then dives' },
    lanternJelly: { name: 'Lantern Jelly', note: 'Floor 2, Hallow: a jellyfish floating like a lantern, a little flame in its bell; drifts close and pulses light' },
    cinderSalamander: { name: 'Cinder Salamander', note: 'Floor 3, Ember: a salamander with a crest of flame; scurries, and leaves a trail of burning ground' },
    hexImp: { name: 'Hex Imp', note: 'Floor 3, Umbral: a big-eared imp on bat wings holding up a violet flame; blinks about the room and throws it' },
    rimeDrakeling: { name: 'Rime Drakeling', note: 'Floor 3, Frost (elite): a small dragon with ice crystals for horns and spines; breathes rime and takes to its wings' },
    wickmouse: { name: 'Wickmouse', note: 'Floor 4, Ember: a mouse with a candle stub burning on its back; darts from cover to cover, and its candle falls burning when it dies' },
    chimeBat: { name: 'Chime Bat', note: 'Floor 4, Storm: a round bat with a bell at its throat; its chime marks the ground under the mage, and a spark strikes the mark' },
    gargoyleWhelp: { name: 'Gargoyle Whelp', note: 'Floor 4, Frost: a stone pup that bolts glance off while it perches; wakes, pounces twice with a ring of frost, and turns to stone again' },
    moonstagFawn: { name: 'Moonstag Fawn', note: 'Floor 4, Hallow: a gold-dappled fawn that keeps away from the mage and heals the foes near it' },
    rootling: { name: 'Rootling', note: 'Floor 5, Umbral: a seed-bulb on root feet; burrows, creeps after the mage as a mound and bursts up under it; fire keeps it above ground' },
    stormRay: { name: 'Storm Ray', note: 'Floor 5, Storm: a little manta of storm cloud; makes long passes, leaving a line of sparks on the floor' },
    voidMote: { name: 'Void Mote', note: 'Floor 5, Umbral: a knot of the dark that swallows the cantrip\'s bolts and spills them back as a ring; spells hurt it' },
    lanternTortoise: { name: 'Lantern Tortoise', note: 'Floor 5, Frost (elite): a big tortoise with a shrine of candles on its shell; hides and spins off the walls, then lies dizzy' },
    // M4.2: the Wardlings a drinking ward lets out, one for each school
    wardEmber: { name: 'Ember Wardling', note: 'From a drinking ward full of Ember: a drop of fire with a flame for a crest; its volleys light what they pass' },
    wardFrost: { name: 'Frost Wardling', note: 'From a drinking ward full of Frost: a drop of cold light crowned with ice; its volleys chill' },
    wardStorm: { name: 'Storm Wardling', note: 'From a drinking ward full of Storm: a drop of lightning with a crest of sparks; wide, fast volleys' },
    wardHallow: { name: 'Hallow Wardling', note: 'From a drinking ward full of Hallow: a drop of gold under a halo; it lets its light go in a ring' },
    wardUmbral: { name: 'Umbral Wardling', note: 'From a drinking ward full of Umbral: a drop of dark light with little horns; its volleys hex' },
  } as Record<string, { name: string; note: string }>,
  /** The Hollow Warden's looks built in code (M4, actors/bossLooks.ts), for the owner to choose; placeholder names. */
  bossLooks: {
    bellWarden: { name: 'Bell Warden', note: 'Storm: a great beetle under an old cracked bronze bell, peering out from under the lip' },
    motherOfSpores: { name: 'Mother of Spores', note: 'Umbral: a mushroom as tall as a door, her cap spotted with violet light; the Sporelings she calls are her young' },
    hollowOwl: { name: 'Hollow Owl', note: 'Hallow: a round barn owl the size of a wardrobe, a crown of candles, wings folded like a cloak' },
  } as Record<string, { name: string; note: string }>,
  /** Familiar options (actors/modelOptions.ts): the owner's drawings, built in code; placeholder names. */
  /** The bestiary (M4.5, actors/bestiaryLooks.ts): names (placeholders) and the fight each brings. */
  bestiary: {
    cryptSpider: { name: 'Crypt Spider', fight: 'Ambusher: hangs out of reach on a thread, drops where the mage stands, spits webs that slow; fire burns a web' },
    inkOctopus: { name: 'Ink Octopus', fight: 'Splitter: crawls out of scroll heaps, leaves ink that slows, splits in two when struck; frozen, it shatters' },
    grimoireMimic: { name: 'Grimoire Mimic', fight: 'Mimic: lies shut as a book, wakes to fly, bite and riffle fans of cutting pages; may leave a grimoire page' },
    fireflySwarm: { name: 'Firefly Swarm', fight: 'Swarm: five to seven lantern beetles with one mind, one blow each; streams at the mage; Arc leaps through them' },
    choirLark: { name: 'Choir Lark', fight: 'Support: sings from a high perch, hastening the foes round it; a hex silences it' },
    stormMantis: { name: 'Storm Mantis', fight: 'Mirror: parries bolts from the front, lunges, open from behind after; chilled, it can\'t parry' },
    rubbleCrab: { name: 'Rubble Crab', fight: 'Shielded: sits as rubble until the mage is near; its shell turns bolts; a blast flips it' },
    rimeSnail: { name: 'Rime Snail', fight: 'Trapper: its rime trail freezes water and sets the mage sliding; hides in its shell; fire cracks it' },
    glassNewt: { name: 'Glass Newt', fight: 'Ambusher: unseen in water but for a ripple, lunges out to bite and chill; a shocked pool shows it' },
    brineSerpent: { name: 'Brine Serpent', fight: 'Turret: rises out of a pool, spits arcs of brine, sinks to rise elsewhere; a frozen pool traps it' },
    puddleElemental: { name: 'Puddle Elemental', fight: 'Elemental: a walking wave that leaves water behind; frozen, it is ice, and a shock shatters it' },
    thunderhead: { name: 'Thunderhead', fight: 'Elemental: drifts over the mage and rains sparks under its shadow; water carries them' },
    stormDarter: { name: 'Storm Darter', fight: 'Darter: shoots wall to wall in straight lines, leaving sparks, and hovers at each turn' },
    puffcap: { name: 'Puffcap', fight: 'Walking mine: shambles up, swells and bursts into spores; fire bursts it early where it stands' },
    emberWasp: { name: 'Ember Wasp', fight: 'Summoner: a paper nest in a wall lets wasps out to sting; fire burns the nest' },
    cinderDjinn: { name: 'Cinder Djinn', fight: 'Elemental: flits from brazier to brazier lighting them, hurls fire; frost snuffs it to a cinder' },
    magmaOoze: { name: 'Magma Ooze', fight: 'Elemental splitter: leaves burning ground and splits when struck; frozen, it hardens and shatters' },
    phoenix: { name: 'Phoenix', fight: 'Elite: dives in burning lines; rises again from its ashes unless they are frozen or blasted' },
    basilisk: { name: 'Basilisk', fight: 'Gaze: its stare sweeps a cone that slows the mage; rocks block it; holy light blinds it' },
    saltGolem: { name: 'Salt Golem', fight: 'Bodyguard: stands between the mage and the other foes, taking the bolts; fire melts its joints' },
    rubbleGolem: { name: 'Rubble Golem', fight: 'Breaker: its slams bring rocks down; a blast breaks it into rolling stones that gather again' },
    griffin: { name: 'Griffin', fight: 'Elite: circles high, marks a line and swoops along it, lands to claw and buffet; a hex grounds it' },
    radiantEye: { name: 'Radiant Eye', fight: 'Ray turret: opens, follows the mage and fires a ray of light; shut, it takes half; a hex closes it' },
    harpy: { name: 'Harpy', fight: 'Diver: perches high, dives along a line; its screech scatters glyphs and knocks bolts aside' },
    lodestoneGolem: { name: 'Lodestone Golem', fight: 'Elemental magnet: bends the mage\'s bolts towards itself; frozen, its pull stops' },
    hearthGolem: { name: 'Hearth Golem', fight: 'Elite elemental: its fire turns blows until frost puts it out; throws coals, stokes at braziers' },
    shadowFox: { name: 'Shadow Fox', fight: 'Blinker: steps from shadow to shadow to bite; lit braziers deny it ground; holy light holds it' },
    rimeScarab: { name: 'Rime Scarab', fight: 'Roller: pushes a snowball that grows, then launches it to burst in a chill; fire melts the ball' },
    glacierGolem: { name: 'Glacier Golem', fight: 'Elite elemental: turns bolts from the front, stomps lines of ice spikes; Shatter cracks it' },
    hydra: { name: 'Hydra', fight: 'Elite: three heads bite and spit venom; a cut head grows back as two unless the stump is burned' },
    gloomRaven: { name: 'Gloom Raven', fight: 'Darkener: the room darkens round it; dives, caws hexing shots; lit braziers drive it off' },
    rimeWolf: { name: 'Rime Wolf', fight: 'Pack: two or three circle the mage and lunge in turn; a howl hastens them; fire scatters them' },
    dustPangolin: { name: 'Dust Pangolin', fight: 'Roller: curls up and rolls, bolts glancing off; dazed by a wall in a cloud of dust' },
    frostJackalope: { name: 'Frost Jackalope', fight: 'Kiter: bounds away to keep its distance and stamps out ice shards; burning ground stops it' },
    manticore: { name: 'Manticore', fight: 'Spiker: its tail looses volleys of hexing spikes, and it pounces; holy light stills the tail' },
  } satisfies Record<BestiaryOptionId, { name: string; fight: string }>, // (every one named, with the fight it brings)
  familiars: {
    runeFox: { name: 'Rune Fox', note: 'A spectral fox with runes along its flanks and a starry tail (the owner\'s drawing)' },
    fenNex: { name: 'Fen-Nex', note: 'The Rune Fox in its full shape: a long white beast, flame-tipped feathers, plated legs with red runes' },
  } as Record<string, { name: string; note: string }>,
  /** Spell effect options (magic/effectOptions.ts): names and what each shows. */
  effects: {
    arcaneBolt: { name: 'Arcane bolt', note: "The cantrip: a spinning missile trailing runes, bursting where it lands" },
    cinderLance: { name: 'Cinder Lance', note: 'Ember: runes gather, then a white-hot beam through turning rune rings' },
    pyreSeal: { name: 'Pyre Seal', note: 'Ember: a burning circle drawn on the floor, then a crown of flame and a pillar' },
    rimeShards: { name: 'Rime Shards', note: 'Frost: a fan of ice crystals with frost trails, splintering where they land' },
    glacialWall: { name: 'Glacial Wall', note: 'Frost: ice pillars bursting up out of a frost line, then cracking and sinking' },
    arc: { name: 'Arc', note: 'Storm: lightning leaping between floating sparks' },
    staticMantle: { name: 'Static Mantle', note: 'Storm: three rings of lightning turning round the mage, sparks jumping between them' },
    shatter: { name: 'Shatter', note: 'Frost and Storm: a frozen block charged with sparks bursts into shards' },
    overload: { name: 'Overload', note: 'Ember and Storm: a crackling ball of fire and lightning swells and bursts' },
    hallowPillar: { name: 'Hallow (to come)', note: 'A pillar of gold light falling on a rune circle' },
    umbralHex: { name: 'Umbral (to come)', note: 'A dark orb with violet tendrils coiling into a ring of shadow' },
  } as Record<string, { name: string; note: string }>,
  /** The dev menu (the key left of 1, or F2): for testing, not for players. */
  dev: {
    title: 'Dev menu', close: 'Close',
    tabs: { mage: 'Mage', magic: 'Magic', foes: 'Foes & objects', rooms: 'Rooms & runs', look: 'Look', galleries: 'Galleries' },
    assets: 'Made assets', showAssets: 'Show them here (urns, a pedestal)', assetsOn: 'Made assets: on', assetsOff: 'Made assets: off (placeholders)', noAssets: 'None named in data/assets.json yet',
    assetStatus: { loaded: 'loaded', missing: 'missing', failed: 'failed', off: 'off (?assets=off)' } as Record<string, string>,
    assetRow: (where: string, status: string, tris?: number) => `${where}: ${status}${tris ? `, ${tris.toLocaleString('en')} triangles` : ''}`,
    kit: 'Room kit (built in code)', kitNote: 'Wall lights, braziers, the mechanisms and the rooms\' objects built in code, and every floor\'s floors and walls in pixel art; each room draws its kinds, and the buttons below force one on every room of this floor',
    kitNew: 'Room kit: new (built in code)', kitOld: 'Room kit: old (to compare)', fireHere: 'Fire objects here (cold and lit)', objectsHere: 'Objects here (every pile and object, two urns)', dropsHere: 'Drops here (every pickup, coffer and chest)',
    kitPart: (part: string, kind: string, forced: boolean) => `${({ wall: 'Walls', floor: 'Floor', torch: 'Wall lights', brazier: 'Braziers' } as Record<string, string>)[part]}: ${kind}${forced ? ' (every room)' : ' (this room drew)'}`,
    kitKinds: {
      bricks: 'bricks', ashlar: 'ashlar', bones: 'bone wall', tide: 'tide-marked blocks', rubble: 'rubble stone', basalt: 'basalt', beams: 'charred beams',
      flags: 'flagstones', cobbles: 'cobbles', graves: 'grave slabs', mosaic: 'sunken mosaic', herringbone: 'herringbone brick',
      bracket: 'iron bracket', skull: 'skull sconce', candelabra: 'wall candelabra', lantern: 'cage lantern', witchlight: 'witchlight', brazier: 'wall brazier', mask: 'beast mask', basket: 'fire basket',
      tripod: 'iron tripod', font: 'stone font', column: 'verdigris column', plinth: 'pyre plinth', cauldron: 'cauldron',
    } as Record<string, string>,
    fpsOn: 'Frame readout: shown', fpsOff: 'Frame readout: hidden',
    artifactGallery: 'Artifacts (the room kit\'s: built in code, their icons rendered from them)', artifactsNote: 'Every artifact floating ahead of the mage in rows (foci, passives, cursed), to look at; they can\'t be taken',
    bossLooks: 'The bosses built in code: the Hollow Warden\'s three looks (the floor-1 boss: choose one), and the bosses of the floors below', wardenWears: (name: string) => `The Warden wears: ${name}`,
    options: 'Enemy model options (looks only)', familiars: 'Familiar options (looks only)', bestiary: 'The bestiary (M4.5: the thirty-five as they look, all of them foes now)', bestiaryKinds: { beast: 'Beasts', creature: 'Creatures of myth', elemental: 'Elementals and golems' } as Record<string, string>, effects: 'Spell effect options (looks only)', showOptions: 'Stand them here', takeOptions: 'Take them away', floorOptions: (floor: number, names: string) => `Floor ${floor}: ${names}`,
    pixel: 'Pixel look', pixelLines: (lines: number, drawn: number) => !lines ? 'Pixels: off' : drawn && drawn !== lines ? `Pixels: ${lines} lines (${drawn} in this window)` : `Pixels: ${lines} lines`,
    outlinesOn: 'Outlines: on', outlinesOff: 'Outlines: off', bandsOn: 'Light in bands: on', bandsOff: 'Light in bands: off',
    /** The on-screen readout: frame rate, and what the last frame drew. */
    frameInfo: (fps: number, calls: number, tris: number) => `${fps} fps · ${calls} draw calls · ${tris.toLocaleString('en')} triangles`,
    knowledge: 'Spell knowledge', knowAll: 'Know every spell', forgetKnowledge: 'Forget all knowledge',
    knowledgeInfo: (seen: number, learned: number, used: number) => `Known: ${seen} seen, ${learned} learned, ${used} known well (kept between runs)`,
    /** On the HUD during play-tests, so the key isn't forgotten. */ hint: 'Dev menu: ` / ^ or F2',
    info: (seed: string, floor: number, room: number, type: string) => `Seed ${seed} · floor ${floor} · room ${room} (${type})`,
    mage: 'The mage', heal: 'Full heal', container: '+1 heart container', resetArtifacts: 'Reset artifacts',
    godOn: 'God mode: on', godOff: 'God mode: off',
    doors: { data: 'Doors: as the floor has them', shifted: 'Doors: off the middle', middle: 'Doors: in the middle' } as Record<string, string>,
    moveClip: { run: 'Moving: run clip', walkInStep: 'Moving: walk clip, feet in step', walkNatural: 'Moving: walk clip, natural pace' } as Record<string, string>,
    resources: 'Obols, keys, glyphs and soul motes', emptyPurse: 'Empty the purse', giveSoul: (name: string) => `+ ${name}`, noSouls: 'No soul motes', floorEnd: "A floor's end (hallowed motes mend)",
    give: (n: number, what: string) => `+${n} ${what}${n === 1 ? '' : 's'}`,
    names: { coins: 'obol', keys: 'key', glyphs: 'glyph' } as Record<string, string>,
    drops: 'Drop ahead of the mage', gildedChest: 'Gilded chest', loreAgain: 'Describe items again', loreAgainTitle: 'Items and containers show their lore card again the next time one is taken',
    dropNames: { halfHeart: 'Half heart', heart: 'Heart', coin: 'Obol', purse: 'Purse', key: 'Bone key', glyph: 'Glyph stone', mana: 'Mana vial', paleSoul: 'Pale soul mote', blackSoul: 'Black soul mote', hallowedSoul: 'Hallowed soul mote', shard: 'Lodestone shard', coffer: 'Coffer', chest: 'Reliquary chest' } as Record<string, string>,
    spells: 'Spells (click to learn into the slot)', slot: 'Slot', mana: 'Mana', fullMana: 'Full mana', manaOn: 'Endless mana: on', manaOff: 'Endless mana: off', forget: 'Forget spells',
    page: 'Drop a grimoire page', noPage: 'No spell left to learn',
    themes: 'Themed rooms (a test room of each)', objects: 'Objects (put down ahead)', noRoom: 'No free floor there',
    propNames: { bones: 'Bone pile', skulls: 'Skull heap', sacks: 'Grave sacks', cask: 'Oil cask', rubble: 'Rubble', roots: 'Grave roots', briar: 'Thorn briar', web: 'Cobwebs', glowcap: 'Glowcaps', pew: 'Pew', desk: 'Desk', scrolls: 'Scroll heap', hoard: 'Offering heap', boat: 'Moored boat', brazier: 'Brazier', candles: 'Candle stand', bell: 'Bell', rune: 'Rune stone', lodestone: 'Lodestone', censer: 'Hanging censer', reliquary: 'Reliquary', tree: 'Dead tree', statue: 'Watching statue', obelisk: 'Sapping obelisk', bridge: 'Rope bridge', wetCandles: 'Candle stand in water' } as Record<string, string>,
    kindle: 'Fire ahead', frost: 'Frost ahead', shock: 'Shock ahead', hallowAhead: 'Holy light ahead', umbralAhead: 'Darkness ahead', steamAhead: 'Steam ahead',
    pools: 'Water and oil (this room)', ignite: 'Set the oil alight', freezeWater: 'Freeze the water', shockWater: 'Shock the water',
    artifacts: 'Artifacts (click to take)', kinds: { focus: 'focus', passive: 'passive', cursed: 'cursed' } as Record<string, string>,
    foes: 'Foes (they leave the doors open)', championHeavy: 'A champion of this floor\'s heavies',
    mantles: 'A champion of this floor\'s heavies, in a mantle (M4.7; the school that strips it unbinds it):',
    afflictions: 'Afflictions (each shows its chip beside the mana bar)', afflictNames: { hexed: 'A hexing blow', chill: 'Chill', stone: 'Heavy as stone', dim: 'Dimmed sight', hints: 'Their lines again' },
    wardFoe: 'Ward the nearest foe (it drinks spells)', fennex: 'Fen-Nex', growFennex: 'Grow Fen-Nex a stage', noFennex: 'Fen-Nex is not bound (take the Rune of Fen-Nex)', wanderer: 'The Wandering Merchant, here', noFoe: 'No foe in the room',
    foesOfFloor: (floor: number) => floor ? `Floor ${floor}'s foes, built in code:` : 'The Wardlings, let out by drinking wards:', foesAsFloor: 'Fights: each floor\'s own foes', foeEverywhere: (name: string) => `Fights: ${name} in every one`,
    bestiaryNote: 'Weaknesses and resistances found are kept between runs (the bestiary to come).', forgetBestiary: 'Forget the bestiary',
    foeNames: { rotling: 'Rotling (a plain foe, for testing)', dummy: 'Training dummy' } as Record<string, string>,
    statuses: 'Statuses on the foes here', inflictOn: (name: string) => `${name} them`,
    floor: 'This floor', sealed: 'sealed', hidden: 'hidden', clear: 'End this fight', reveal: 'Reveal the map', nextFloor: 'Next floor',
    revealCracks: 'Reveal cracked walls', openSecret: 'Open the secret room',
    cleanse: 'Cleanse a curse', takeCurse: 'Take a curse', noCurse: 'No curse to cleanse', allCurses: 'You hold every curse', cleansed: 'cleansed',
    roomNames: { start: 'Start', normal: 'Normal', treasure: 'Treasure', boss: 'Boss', ordeal: 'Ordeal', altar: 'Bone altar', merchant: 'Merchant', vault: 'Vault', secret: 'Secret room', shrine: 'Shrine', library: 'Library' } as Record<string, string>,
    test: 'Test a room', template: 'Room template', variant: 'Variant', play: 'Play it',
    variants: { normal: 'Normal', quiet: 'Quiet', champion: 'Champion', ambush: 'Ambush', dark: 'Dark' } as Record<string, string>,
    bosses: 'Fight a boss', newRun: 'New run', floorN: (n: number) => `Floor ${n}`,
    keep: ' Keep artifacts, obols, keys and glyphs when starting',
  },
  /** What a merchant's ware is called in messages. */
  wares: { heart: 'heart', halfHeart: 'half heart', key: 'bone key', glyph: 'glyph stone', coin: 'obol', purse: 'purse', mana: 'mana vial', paleSoul: 'pale soul mote', blackSoul: 'black soul mote', hallowedSoul: 'hallowed soul mote', shard: 'lodestone shard', map: "the crow's map", secret: "the crow's secret" } as Record<string, string>,
  heroInfo: (label: string, tris: number, stripped: boolean, skinned: boolean, clips: string) =>
    `${label}: ${tris.toLocaleString()} triangles${stripped ? ', base removed' : ''}` +
    `${skinned ? ', rigged' : ', static (procedural animation)'}${clips ? `. Clips used: ${clips}` : ''}.`,
};
/** A foe's name: M4's (STR.options) or M4.5's bestiary's (STR.bestiary). */
export const foeName = (id: string) => STR.options[id]?.name ?? (STR.bestiary as Record<string, { name: string }>)[id]?.name ?? id;

/** Fill every element with a data-s="path.to.string" attribute. */
export function applyStrings(root: ParentNode = document) {
  document.title = STR.pageTitle;
  for (const el of root.querySelectorAll<HTMLElement>('[data-s]')) {
    let v: unknown = STR;
    for (const k of el.dataset.s!.split('.')) v = (v as Record<string, unknown>)?.[k];
    if (typeof v === 'string') el.textContent = v;
    else console.warn('missing string', el.dataset.s);
  }
}
