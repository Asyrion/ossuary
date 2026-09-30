# Ossuary: project brief for Claude Code

Ossuary is a hobby desktop-browser game: a top-down roguelike in the style of The Binding of Isaac, set in
the owner's fantasy world **Eda** (high fantasy turned dark, medieval). The mage is made in **Tripo3D**
and exported as GLB; everything else is built in code (the owner's decision, 2026-09-30). The owner (Azyrion) designs; you build.

**`docs/GDD.md` is the source of truth for game design.** Read the relevant section before starting a
milestone; if this file disagrees with it on design, the GDD wins. `docs/ideas.md` is an idea bank of
unscheduled designs (pickup families and more); an idea only counts once it moves into the GDD. Every
system borrowed from Isaac gets a magic take (GDD: What separates Ossuary from an Isaac clone). The Tripo
asset checklist lives in the owner's claude.ai project "Tripo3D-GameDev"; `docs/assets.md` is the repo's
side of asset making: which tool for what (MidJourney, Tripo3D and other image models), the house style (one
style reference in every image), budgets per kind of asset, the pipeline from image to game, and the asset
log; its Sound section does the same for sound (sources and their licences, the house sound, specs, pipeline).
`docs/effects.md` is the house style for magic effects (every spell's look, the schools' light, budgets, how to add one).
When the owner hands over an asset, follow its pipeline and budgets. This file holds what you need to
work in the repo.

## Current state: M4.1 built (two floors deeper, `docs/M4.1-plan.md`, the owner's ask of 2026-09-30): steps 1 to 10 built (a run of five floors, the Gilded Reliquary and the Ferryman's Shore, each with its room kit, four foes and a boss built in code, the Hallowed Hart and the Deep Angler; Hallow and Umbral magic: six spells, Sanctified, Hex and Root, Eclipse and Blackfire; soul motes and the lodestone shard; twelve artifacts; two themes, the Gilded Treasury and the Ferry Landing); closed with the reviews, the GDD as built and a sweep of the rooms, and shipped; M4.2 Beneath the Gate under way (`docs/M4.2-plan.md`, from the owner's Eda lore drop): step 1 built (the setting in the game's text: the title's `place`, the banners, the Warden, the end screen and some lore), step 2 built (watching statues and sapping obelisks), step 3 built (the drinking ward and the five Wardlings), step 4 built (rope bridges, currents and waterfalls, candle stands in water), step 5 built (the Wandering Merchant of Belerial), step 6 built (the War-Tiger), the Pillar Dragon next; M4 built (enemies in code, `docs/M4-plan.md`): the foe framework and all ten foes (every floor's fights, a boss's helpers, a vault's warden and the ossuary's rising bones are foes in code; the wisp and crypt hound gone, the rotling kept as a plain test foe) and the floor-1 boss built in code in three looks, the owner to choose one (the Galleries tab); the owner's play-test next; M3.5 signed off by the owner 2026-09-30 (the look, `docs/M3.5-plan.md`): step 1 built (the asset pipeline's tooling), step 2 decided (the pixel look, on by default at 1080 lines since the proof's play-test), step 3 under way: the room kit redone in code in the new style (the proof accepted 2026-09-30; variety built: three kinds of wall, floor, wall light and brazier per floor, drawn per room; every mechanism, object, door, niche and artifact rebuilt, the list done, then pickups, chests and the special rooms' pieces; the owner's review next); code over Tripo for everything but special models (the mage, bosses where wanted), decided 2026-09-30; every spell's effect redone in the new style (`docs/effects.md`); M4.5 Bestiary added (more creatures, ideas in `docs/ideas.md`); M3.7 spell knowledge built (`docs/M3.7-plan.md`); M3.6 built (`docs/M3.6-plan.md`: architecture, objects, themed rooms, mechanisms and the close); M3 done (see `docs/M3-plan.md`; the play-tests of 2026-09-29 left its balance as it is); M2 done (`docs/M2-plan.md`); M1 built (`docs/M1-plan.md`)

The prototype was ported to Vite + TypeScript (strict) + three.js r186 in M0; M1 turned it into
generated three-floor runs. See `README.md` for scripts and deployment.

- `src/`: the game, split as in the M0 layout. Plus `state.ts` (shared mutable state `G` and `player`,
  and sim-time timers `after()`), `flow.ts` (game states, floor setup, room transitions, `warp`),
  `loop.ts` (fixed 1/60 step), `strings.ts` (all player-facing text; HTML uses `data-s` keys) and
  `types.ts`.
- `src/actors/clipRoles.ts` and `src/actors/baseDetect.ts` hold the clip-name matching, hips-offset and
  round-base tests with no three.js dependency; the game and `tools/prepare-asset.ts` both use them.
- Runs are seeded (`src/rng.ts`: named streams per system). `src/world/generate.ts` builds each floor
  (pure, unit-tested); `src/world/shapes.ts` defines room shapes (cells, tile mask, door slots);
  `src/world/templates.ts` parses and validates room templates. `src/world/rooms.ts` traces walls along
  any outline and cuts doors into them (M3.6: the pure `src/world/walls.ts` makes the walls a grid of wall tiles,
  tall or low by where the floor lies, merged into boxes that never overlap; `src/world/dressing.ts` puts pilasters
  and niches on the tall walls, from `wall.dress` in each floor's look; doors move along their cell edge by
  `shift` on the planned door, chosen in `generate.ts` where both rooms' templates leave the lane clear, per floor
  `doorShift`, and the dev menu's door switch moves all or none in new floors); the camera follows the mage in rooms larger than the view
  (`cameraTargetFor`) and pulls back in multi-cell halls (`viewScaleFor`, `CFG.camHallView`); four
  torch lights move to the torches nearest the mage. Content:
  `data/floors.json` (room counts, difficulty weights, enemy health, altar and vault chances, which floors have
  a shrine, the vault's warden, boss tuning and look per floor),
  `data/templates/*.json` (room grids: `.` floor, `#` rock, `o` pit, `i` pillar, `=` stone tomb, `u` urn,
  `$` rune-sealed urn, `~` water, `%` oil, the M3.6 objects `b k s c r t v : g p d e` (bone pile, skull heap, grave sacks,
  oil cask, rubble, grave roots, thorn briar, cobwebs, glowcaps, pew, desk, scroll heap; M4.1: `h` offering heap, `m` moored boat; M4.2: `+` rope bridge) and mechanisms `f l a n y * q T`
  (brazier, candle stand, bell, rune stone, lodestone, hanging censer, reliquary, dead tree; M4.2: `w` watching statue, `!` sapping obelisk, `L` candle stand in water), `R W H` enemies, `B` boss; `x` wall: outside an L's missing corner, and
  inside the shape to carve it (cut corners, bays, a pinched waist, a free-standing pier); ordeal templates list
  their enemies per wave in `waves`; `special.json` holds ordeals, altars, merchants, vaults, secret rooms and shrines,
  `shapes.json` the larger and narrow rooms) and
  `data/artifacts.json` (foci, passive and cursed artifacts: stats, effects, pools, colours, icons; a cursed
  artifact's price is its `curse`, which a shrine removes while halving the gift).
- Artifacts: `src/items/artifactData.ts` (pure: data, `computeStats` combining, picking) and
  `src/items/artifacts.ts` (pedestals, taking and focus swap, per-floor budget). The mage's stats are
  `player.stats`, recomputed on every pickup (and cleansing: `player.cleansed`); read those, not `CFG.hero`,
  for anything artifacts change.
  The cantrip pipeline is in `src/combat/projectiles.ts` (fans, the serpent's weave, the tome's homing, strong
  casts, split bolts, burning and chilling bolts); companions that artifacts bind (the Candle Moth, the Weeping Skull) in `src/combat/familiars.ts`.
  New artifacts are data plus, for a new mechanic, an `Effect` or stat key in `artifactData.ts`, a look in
  `src/items/artifactLooks.ts` (its HUD icon is rendered from it) and a drawn icon in `hud.ts` for the room kit off (56
  artifacts and the starting wand; more ideas in `docs/ideas.md`). M4.1's twelve: the Pendulum of Hours (the `swing` path,
  `curve` on a bolt) and the Lodestar Wand (`star`: bolts hang where their range ends), the Echo Stone (`echoed`), the Gilded
  Halo (`haloed`) and the Hart's Antler in `projectiles.ts`; the Twin Vigil Candles and the Salt Circle from `player.still`,
  drawn in `familiars.ts` (`saltHolds`, `__game.salt`); the Blood Moon Pendant (`bloodMoon()`), the Ossuary Choir
  (`room.choir`), the Ferryman's Lantern, the Gravemonger's Contract and the Last Rite (`G.run.riteFloor`). The M3 ten reach into
  magic: `spellDamageMul` and `killMana` stats (`damageEnemy`, `killEnemy`), `emberBolts`, `frostbite` and
  `stormglass` on the cantrip, `thurible` on a burning death, `vigil` in `onRoomCleared`, `witchKnot` in
  `spellCost` (`src/magic/cost.ts`), `noRegen` in `updateMagic`. An artifact's `gives`
  hands over obols, keys or glyphs once, when it's taken. An artifact's `costume` puts a piece on the mage
  (`src/actors/costume.ts`, the pure rules in `costumeData.ts`): one piece per slot (head, shoulders, back, hands,
  aura; the one taken last wins), hung from a bone of the rig so it follows every clip, and fitted in the rest pose to
  the part of the body it covers (the head and hair the head bone moves); a static model wears it on the top of its
  silhouette. `setHero` refits (`fitCostumes`), `refreshStats` dresses (`dress`). The Pilgrim's Cowl's hood is the
  first piece, built in code like the ones to come (M4.6: most artifacts, and transformations); `__game.costume` reads what is worn. The economy artifacts (step 6 of M2) reach into the
  systems they bend: `freeVault` in `world/vault.ts`, `ferryman` in `flow.ts` (`onRoomCleared`), `glyphWard`
  and `blastMul` in `combat/glyphs.ts`, `graveLantern` in `world/secret.ts` and the minimap, `pedlar` in
  `items/merchant.ts`; the Miser's Purse's `obolDamage` makes `player.stats` depend on obols held, so
  `giveResources` recomputes them when the hoard crosses a ten.
- Magic (M3): spells are data in `data/spells.json` (school, shape, mana, cooldown, damage, statuses, params,
  colour, icon, text, lore), read by the pure `src/magic/spellData.ts`; `src/magic/spells.ts` holds the two
  slots (`player.spells`, Q and E, LB and RB), casting (aimed at the cast direction or `player.aim`), mana
  (`player.mana`, `stats.maxMana`, regeneration from `CFG.mana`, 3 for each foe the cantrip puts to rest via the
  foe's `lastHit`). Each `shape` is a function in `CAST` in `src/magic/shapes.ts` (the params it needs are in
  `SHAPE_PARAMS`, checked by the validator), with what it leaves behind: the beam (Cinder Lance), the placed
  seal and its burning ground (Pyre Seal), the shotgun (Rime Shards, spell bolts through `fireSpellBolt` in
  `projectiles.ts`), the ice wall (Glacial Wall: boxes in `room.barriers`, which `blockers()` gives to all but the
  mage's bolts and `updateShots` to foes' shots), the chain (Arc) and the self aura (Static Mantle:
  `mantleShields` stops contact damage); M4.1 adds Hallow's and Umbral's: `zone` (Consecrate's holy ground), `smite`
  (Judgement's pillar on the strongest foe), `orbit` (Wardlight's motes, which go with the mage and break shots; `wardLeft`),
  `bolt` (Hex Bolt), `grasp` (Grasp of the Grave's hands) and `mark` (the Ferryman's Toll: `toll` on a foe gives mana for
  blows in `damageEnemy`, and `payToll` in `killEnemy` pays an obol and spreads its hex). Seals and walls go when the mage leaves the room (`leaveRoomSpells`); spells
  are refused in the merchant's shop. A new spell of a known shape is a new entry; a new shape is a function in
  `CAST`. The HUD's mana bar and slots are in `hud.ts` (`renderSpells`, `spellIcon`).
  Statuses (Burn, Chill with freeze, Shock; M4.1: Sanctified, Hex and Root, `SpellStatus`) and the reactions (Shatter,
  Overload; M4.1: Eclipse, Hallow and Umbral, and Blackfire, Umbral and Ember) are rules in the pure
  `src/magic/status.ts` (tuning in `data/magic.json`, unit-tested) carried out by `src/magic/statusFx.ts`
  (`inflict(foe, status)`, looks, burn damage, the shock's leap, reactions, the eclipse's black sun); enemies read `canAct`
  and `speedFactor`, `damageEnemy` applies `damageTakenMul` and the leap, and gives back mana for a hex (`spendHex`); a
  sanctified foe can't be healed (`canHeal`). Props and mechanisms hear only the elemental ones (`elemental()`). The training dummy (`dummy` in
  `CFG.enemy`) never falls and shows its hits and statuses.
  Soul motes (M4.1, `src/items/souls.ts`): `player.souls` (pale, black, hallowed) drawn after the hearts, taking a hit
  before them (`guardHit` in `hurtPlayer`; which goes first is the pure `soulToLose` in `loot.ts`); a black one hexes the
  room as it goes, a hallowed one mends half a heart at every floor's end (`hallowedMend` in `descend`), and a spell cast
  short of mana burns one (`burnSoul` in `castSpell`). A floor's `souls` in `data/floors.json` weights them in all its loot
  (`soulsHere`); a foe that falls deep in a hex leaves a black one (`CFG.souls`). The lodestone shard ends every cooldown and
  gives mana. Taking an item and the merchant's refusals share `cantUse` and `useItem` (`pickups.ts`). `__game.souls`,
  `__game.soul('black')`, `__game.hallowedMend()`; the dev menu's resources row gives them.
  Grimoire pages and the library (a one-cell dead end on every floor) are in `src/magic/pages.ts`: `room.pages`
  (lectern, shelf or loose), laid out on the library's first visit from the pure `pickPages` and `shelfPages`
  (`spellData.ts`, the run's `pages` stream); a page with both slots full asks through `showPrompt` and a spell
  key answers it (`answerPage`, before casting); spells given up go to `G.run.forgotten` and later libraries
  sell them back (`grimoire` in `data/loot.json`). Bosses drop a page (`dropPage` in `onBossDead`), cleared rooms
  rarely (`maybeDropPage`).
  Spell knowledge (M3.7): how well the mage knows each spell, kept between runs. The pure rules are in
  `src/magic/knowledge.ts` (stages seen, learned, used after `CFG.knowledge.usedCasts` casts, upgraded in M6; the
  reactions a spell sets off, from its statuses); `src/magic/memory.ts` keeps them in `localStorage`
  (`ossuary.knowledge`), fed by `learnSpell`, `castSpell` and a page's approach. `src/ui/spellPanel.ts` describes a
  spell at its stage (`spellSheet`), for the panel over the nearest grimoire page (`updatePagePanel` in `pages.ts`,
  over the page or beside it on its outer side) and the inventory's spells tab, a book by school with sealed entries
  for spells not met. The dev menu's knowledge row knows every spell or forgets all; `__game.knowledge` reads every
  stage, `__game.know(id, stage)` sets one, `__game.forgetKnowledge()` clears them, `__game.pagePanel` reads the panel.
  Rooms react to magic through `src/world/pools.ts`: water (`~`) and oil (`%`) tiles joined into `room.pools`
  (`poolGrid` per tile). Anything elemental reports where it lands: `fireAt` (Burn, the lance, the seal, blasts)
  lights oil and melts ice, `frostAt` (Chill, frost bolts, the ice wall) freezes water, `shockAt` runs a shock
  through a pool; `inflict` calls `touchPools` for every status on a foe standing in one. `wadeAt` slows the mage
  and walkers in unfrozen water. The drowned floor grows puddles in its fights (`growPuddles`). M4.2: a template's `current`
  makes its water run (`room.flow`: it carries the mage, walkers, bolts, shots and pickups downstream, `CFG.flow`; frozen,
  it stops), fed by a waterfall where it leaves the wall upstream (`buildFalls`); `__game.flow` reads it. A rope bridge
  (`+`) lies over a chasm until fire burns it through (`openChasm`: a foe on it falls, the mage takes a heart's fall).
- Objects (M3.6): what each is, its letter and how it blocks (tall: `rocks`; low: `room.lows`, walking only, unless a
  bolt breaks it; soft: `room.soft`, walked into) are in the pure `src/world/propData.ts`; looks and behaviour in
  `src/world/props.ts` (the room kit's looks in `objectLooks.ts`; `strikeProp` from bolts and blasts, `blastProps`, `burnPropsAt` from `fireAt`, a cask's
  `addPool`, glowcap spores, `snagAt` for cobwebs, briar stings in `updateProps`), tuning in `CFG.props`, the
  poorer loot in `remains` and `bundle` (`data/loot.json`). Each object's still meshes are merged by material when it is
  built (`mergeStill` in `render/materials.ts`; its `userData.parts` stay apart), so an object costs 2 to 5 draw calls.
  `__game.prop('cask')` puts one down, `__game.props` and
  `__game.spores` read them, `__game.burn(x, z, r)` sets fire there; the dev menu has a row of them.
- Mechanisms (M3.6): objects that answer to magic with more than breaking (`MECHANISMS` in `propData.ts`); their looks
  and what they do are in `src/world/mechanisms.ts`, tuning in `CFG.mech`. They hear the same hooks as everything
  else: `elementAt(kind, x, z, r)` from `fireAt`, `frostAt`, `shockAt` and `touchPools` (braziers and candle stands
  light, rune stones take a school, lodestones leap), `strikeMechanism` from `strikeProp` (a bolt with its status, or
  a blast: bells ring, candles are knocked over), `boltThrough` from `updateBolts` (a lit brazier sets a bolt
  alight, a bolt cuts a censer's chain). M4.2's two from the Eda lore: the watching statue (`updateStatue`: in sight while a
  fight lasts it charges, marks the mage's spot and strikes it with a ray; a hex blinds it, through `umbralAt` or a bolt
  carrying one) and the sapping obelisk (`updateSapping`: its field halves the cantrip, `sapMul`, and drains mana until its
  ward's school lands on it; `ward` and `broken` on the prop); bolts carry every status to what they strike. Every candle stand in a room lit (`room.candlesLit`) opens its reliquaries,
  lifts a dark room and, in a chapel, blesses the next casts (`player.blessed`, in `spawnBolt`); with every stand knocked
  over by blasts, only the reliquaries open. The frozen
  mausoleum's twist (`rime`) entombs its foes in ice (`entombed` on a foe, freed by a hit or fire), freezes its water,
  charges its rune stones with frost (`chargeRunes`) and lets the mage slide; an ossuary's skull niches watch (`watchers` on a theme; `skullsWatch` from `castSpell`).
  `__game.element('burn' | 'chill' | 'shock' | 'sanct' | 'hex', x, z)` lands a status there, as the dev menu's Fire, Frost,
  Shock, Holy light and Darkness buttons do; `__game.props` reads `lit`, `school` and `cd` too (and a statue's `charge`,
  `blind` and `aiming`, an obelisk's `ward` and `broken`), `__game.sap` the cantrip's worth where the mage stands.
- Themed rooms (M3.6): themes are data in `data/themes.json` (look changes, floor scatter, a twist, rock and tomb looks),
  read by the pure `src/world/themeData.ts` (`themedLook`, `validateThemes`); a template's `theme` makes it a themed
  room (all in `data/templates/themed.json`); floors draw on them with `themeChance` and `themes` in
  `data/floors.json`, picked in `assignTemplates`. `src/world/themes.ts` scatters the dressing (`dressTheme`) and runs
  the twists: sleepers (`asleep` on a foe; a hit or the mage coming close wakes it), rising bones, pages in scroll
  heaps (`scrollsBroken`), the cave-in on a blast (`caveIn`), and with mechanisms the chapel's blessing and the
  mausoleum's rime; M4.1's treasury guardians (`statue` on a foe, woken by `goldTaken` when an obol is taken there) and
  the landing's drowned (floor foes climbing out of its river until it freezes); tuning in `CFG.themes`. M4.1's objects:
  the offering heap `h` (a blast spills its obols, the `hoard` table) and the moored boat `m` (a run of letters is one
  boat, as pews are). `?theme=ossuary` makes every
  fight one theme's; the dev menu lists a test room of each.
- Sound (`src/audio/sfx.ts`, synthesised placeholders): an effects bus and an interface bus (`UI_SOUNDS`) under a
  master, set by the pause menu's sliders and remembered in the browser. Play an effect where it happens with
  `Sfx.at(x, z).blast()`: panned from the mage (`Sfx.listen` every step) and quieter further off. New sounds go in
  `sounds`, in their school's palette for magic.
- Tests: `npm run test:unit` (Vitest: generator rules on hundreds of seeds, every template validated),
  `npm run test:e2e` (Playwright smoke tests), `npm test` runs both.
- URL options: `?seed=K3F9QX` replays a run's floors, `?floor=2` starts deeper, `?room=<template id>`
  plays one template (for reviewing rooms), `?variant=dark` dresses it in a room variant (quiet,
  champion, ambush, dark), `?give=bone_lens,twin_staff` starts with artifacts, `?boss=pyre` makes
  every floor's boss that one (warden, abbess, pyre, hart, angler, tiger), `?loot=coins:20,keys:2,glyphs:5` hands out obols,
  keys and glyphs, `?spells=arc` starts with spells in the slots, `?theme=ossuary` puts every fight in one theme's rooms, `?foe=sporeling` fills every fight with one foe in code, `?assets=off` keeps every placeholder, `?assets=/tests/fixtures/assets/assets.json` loads the stand-in assets and `?pixel=off` turns the pixel look off (`?pixel=1080`, `720`, `540`, `360` or `270` sets its rows), `?kit=old` builds the rooms in the old look (before the room kit). `?room=merchant_plain`, `?room=vault_urns` and `?room=secret_cell` put a shop, a sealed
  vault, a secret room (behind a cracked wall), a shrine (`?room=shrine_henge`) or a library
  (`?room=library_plain`) next to the start.
  `__game.map()` prints the floor, `__game.give(...ids)` hands out artifacts, `__game.loot({ glyphs: 3 })`
  resources, `__game.drop('purse')` drops a pickup ahead of the mage, `__game.clearRoom()`
  ends the current fight, `__game.openSecret()` breaks open the floor's secret room,
  `__game.cleanse()` cleanses the oldest curse held at once, `__game.rite` reads the shrine's rite under way,
  `__game.learn('arc', 0)`, `__game.cast(0)` and `__game.mana(50)` learn, cast and set mana,
  `__game.spawn('dummy')` spawns a foe ahead of the mage, `__game.inflict({ chill: 1 })` statuses every foe,
  `__game.shoot(x, z, dx, dz)` fires a foe's shot, `__game.mantle` and `__game.ward` read the Static Mantle's and Wardlight's seconds left,
  `__game.page()` drops a grimoire page, `__game.pages` and `__game.forgotten` read the room's pages and the
  spells given up; `__game.cast(slot)` answers a page that asks, as the key does; `__game.pools` reads the room's
  water and oil, `__game.pool('fire' | 'frost' | 'shock')` sets it alight, freezes or shocks it;
  `__game.prop('brazier')` puts an object or mechanism down, `__game.props` reads them, `__game.burn(x, z, r)` sets
  fire there and `__game.element('shock', x, z)` lands fire, frost or shock there; `__game.renderInfo()` reads the last
  frame's draw calls and triangles, and the geometries and textures held; `__game.assets` reads the made assets and
  their status, `__game.useAssets(false)` builds the floor again with the placeholders, `__game.showAssets()` puts
  urns and a pedestal ahead of the mage.
- The dev menu (`src/ui/devMenu.ts`; the key left of 1, or F2) pauses the game and does the same from
  buttons, in six tabs (Mage, Magic, Foes & objects, Rooms & runs, Look, Galleries; `TABS`, names in `STR.dev.tabs`, the
  last one open remembered in the browser as `ossuary.devTab`; a new section goes on the page of the tab it belongs to): heal, god mode (`DEV.god` in `state.ts`), resources, drops, artifacts, foes, this floor's
  special rooms (a sealed vault leads to its warded door), test rooms, boss fights and new runs, taking or
  cleansing a curse, the clip the mage moves with, spells (into slot Q or E), a grimoire page and mana (full,
  endless). Its lists come from the data, so new
  artifacts, spells,
  drops, room types and bosses show up by themselves; give a new room type a name in `STR.dev.roomNames`.
- Lore cards (`src/ui/lore.ts`): picking something up shows its icon, name, kind, effect and lore in the
  middle of the screen for 4 to 6 seconds (`CFG.lore`), soulslike but plainer. Artifacts every time (`lore` in `data/artifacts.json`, required by
  the validator), items and containers the first time in a run (`STR.lore.items`, one for every drop). Anything
  new the mage can take (spells in M3, potions in M5) gets lore and shows it through `showLore`. The lore is a
  placeholder until the Eda lore arrives: keep it to the dungeon (chapel, crypts, sextons, pilgrims, the
  Ferryman) and invent no gods, factions or places. Since the owner's lore drop (2026-09-30; GDD: Vision, Setting) it may
  also name what the GDD adopted from it: the Gate of Uzulim and its Wardens, their vault, the Pass of Buluiain, Kaelith
  the Shadow Sentinel, and Asyrion (the mage); the rest of the owner's names wait for M8.
- The inventory (`src/ui/inventory.ts`; I or Tab, the gamepad's View button, or the pause menu) pauses the game and
  lists what the mage carries and knows in tabs: artifacts (with their stat changes and a curse's price), spells
  (the two slots, then a book by school, M3.7), items (hearts, mana, soul motes, obols, keys, glyphs) and the mage's own numbers;
  the chosen entry is described beside them. Arrows choose, Q and E (LB and RB) change tabs. Anything new the
  mage can carry (potions in M5) gets a tab or a place in one.
- Made assets (M3.5, `docs/assets.md`): `data/assets.json` holds the budgets per kind and which file replaces which
  placeholder (`props`: urn, pedestal; `artifacts` by id; `floors`: a look's painted tile; `icons` by id), read by
  the pure `src/assets/assetData.ts`. `src/assets/models.ts` loads them at boot, before the first floor, and every use
  shares the model's geometry and materials; a missing or broken file leaves the placeholder (a warning). The hooks
  are `modelFor` in `addUrn` and `placeArtifact`, `makeArtifactVisual`, `floorTile` in `floorTexture` and `iconUrl` in
  `artifactIcon`. `tools/prepare-asset.ts` (checks in `tools/assetReport.ts`) and `tools/prepare-texture.ts` (checks
  in `tools/imageChecks.ts`, previews in `asset-previews/`) prepare the owner's files; `tools/make-standins.ts` makes
  the stand-ins in `tests/fixtures/assets/` that the tests load. The dev menu's Made assets section lists them,
  turns them off to compare, shows them ahead of the mage, and puts a frame readout on screen (`DEV.fps`).
- Enemy model options (`src/actors/modelOptions.ts`, the owner's request; M4 makes them foes): ten critters and small
  fantasy creatures built in code from simple shapes (round, big eyes from `bigEyes`, smaller than the mage; not the dead),
  each with a school's light and a floor (GDD: Enemies built in code), looks only for now, each with an idle motion
  (`updateModelOptions` in the loop); the dev menu stands them ahead of the mage in rows by floor, or takes them
  away; `__game.modelOptions(ids?)`, `__game.takeModelOptions()`; names and notes in `STR.options`. Familiars built the
  same way from the owner's drawings (`FAMILIAR_OPTIONS`: the Rune Fox) have their own dev menu section,
  `__game.familiarOptions(ids?)`, names in `STR.familiars`.
- Foes in code (M4, `docs/M4-plan.md`): the enemy model options made foes. What each is lives in `data/foes.json` (floor,
  school, weakness and resistance, health, size, speed, contact, flying, elite, behaviour and its params, gib and stain
  colours), read by the pure `src/actors/foeData.ts` (`validateFoes`, `BEHAVIOUR_PARAMS`, `affinityMul`, `pickFoe`,
  `schoolOf`, unit-tested); its look is the model option of the same id. `src/actors/foes.ts` builds one (`buildFoe` from
  `makeEnemy`: the model merged by `mergeRig` in `src/render/rig.ts`, which samples the idle to find the moving parts and
  merges the still meshes within each, about 50 draw calls down to about 15) and runs it (`updateFoe`: a behaviour by
  kind in `BEHAVIOURS`, the idle on the foe's own clock `at`; `poseFoe`: a telegraph's swell and glow in its school's
  light, `tele`, and a hit's squash; a behaviour may `pose` the model's `parts` after the idle, and hears a `bump` into a
  wall). The behaviours so far: `hopper` (Sporeling), `flutter` (Vesper Moth: lured by lit braziers and candle stands),
  `charger` (Rune Beetle), `mimic` (Urn Mimic: placed beside the room's urns by `mimicSpot`, hidden until the mage comes
  near, it is struck or nothing in the room is awake; `guard` halves blows while shut; its embers are shots with `fire`,
  lighting what they pass); `leaper` (Mire Toad: breath of `chill` shots that freeze water they pass), `lurker` (Cistern
  Lurker: hidden under water, `addPool`s its own where the room has none, trapped when it freezes), `drifter` (Lantern
  Jelly: a pulse of light), `scurrier` (Cinder Salamander: burning ground, `updateFoeHazards`, one instanced glow),
  `blinker` (Hex Imp: its `hex` shot drains mana), `drake` (Rime Drakeling, the elite: breath, flight, a frost ring); floor 4's
  (M4.1): `scamper` (Wickmouse: cover to cover, a dart; its candle falls burning, a behaviour's `die` through `foeDied`),
  `chimer` (Chime Bat: a closing ring marks the mage's spot, then a spark strikes it), `gargoyle` (Gargoyle Whelp: stone
  that turns most of a blow, two pounces landing in frost), `healer` (Moonstag Fawn: keeps off, heals the hurt round it, a boss only a little, `bossShare`);
  floor 5's: `burrower` (Rootling: a mound under the floor that bursts up under the mage; burning, it stays up), `glider`
  (Storm Ray: passes laying sparks, `laySpark`, that arm and sting; `__game.sparkGround`), `absorber` (Void Mote: swallows
  the cantrip through a behaviour's `struck` hook in `damageEnemy`, spills it back as a ring, then hangs open),
  `shell` (Lantern Tortoise, the elite: hides, spins off the walls, lies dizzy); M4.2's `wardling` (the five Wardlings,
  `wardEmber` to `wardUmbral`, floor 0: no floor's own, let out by a drinking ward). `__game.hit(i, dmg, school, by)`.
  Templates' `R W H` are roles now: each floor fills them from `foes` in
  `data/floors.json`, on the room's seed, one elite a room at most (`buildRoom`); `?foe=sporeling` (`DEV.foe`, the dev
  menu's Fights switch) puts one foe in every fight. Damage carries a school (`damageEnemy`'s last argument: spells by
  theirs, burns Ember, shocks and shocked pools Storm, bolts by the statuses they bring): a foe takes +50% from its
  weakness and −50% from its resistance (`CFG.affinity`), and the first time the word rises (`STR.foes`); what the mage has found is kept
  in `localStorage` (`ossuary.bestiary`, `src/actors/bestiary.ts`) for M7's bestiary. The mage's afflictions: `player.dim`
  (a Sporeling's stinging spores, `addSpores` with `sting` in `props.ts`; `#dim` darkens round the mage), `player.chill`
  (cold shots: slower by `CFG.afflict.chillSlow`, `#chill` frosts the rim) and a hex's drained mana, each only with a
  blow that lands (`hurtPlayer` says whether it did). The dev menu's
  Foes lists each floor's foes from the data; `__game.spawn('sporeling')`, `__game.hit(i, dmg, school)`,
  `__game.bestiary`, `__game.forgetBestiary()`, `__game.burningGround`.
- Spell effect options (`src/magic/effectOptions.ts`, the owner's request): the spells' effects redone in the same style,
  each a looping demo of one cast worked out from the time (the cantrip, Cinder Lance, Pyre Seal, Rime Shards, Glacial
  Wall, Arc, Static Mantle, Shatter, Overload, and previews of Hallow and Umbral); the dev menu plays them ahead of the
  mage; `__game.effectOptions(ids?)`, `__game.takeEffectOptions()`; names in `STR.effects`. The gallery is the style book:
  every spell now wears its look (2026-09-30). The looks are in `src/magic/spellFx.ts` (`boltLook` and `animateBolt` for
  the cantrip and shards, `impactFx`, pooled `ringFx` and `strikeFx`, `lanceFx`, `sealFx`, `iceColumn`, `mantleFx`;
  timings in `CFG.spellFx`), called from `shapes.ts`, `projectiles.ts` and `statusFx.ts`, which keep what the spells do;
  `__game.spellFx` reads what shows (the lance, rings, lightning); `hideSpellFx` returns them all to their pools. `docs/effects.md` is the guide for new effects. Both
  galleries build from `src/render/arcane.ts`: materials, parts, rods, runes, rune rings, magic circles, crystals, motes,
  lightning and waves.
- The pixel look (the game's look since 2026-09-30, on by default at 1080 lines, `CFG.pixelLook.start`; chosen in M3.5
  step 2; `src/render/pixelLook.ts`, tuning in `CFG.pixelLook`): the scene drawn into
  a target of at most 1080, 720, 540, 360 or 270 lines (a game pixel a whole number of screen pixels, rounded up, so a
  smaller window keeps the look at fewer rows; `drawnRows()` and the dev menu say how many) with no smoothing, the camera snapped to its grid, and blown up to the window in
  whole pixels by one full-screen pass (outlines from depth, light in bands); the HUD stays sharp. The scene is tone-mapped
  and encoded by its own shaders (the target flagged as an XR target, stored as plain RGBA8), so it blends as on the canvas.
  `draw()` in `render/renderer.ts` picks it; draw calls are counted per frame over both passes (`renderer.info`
  reset in `draw()`). The dev menu switches it, remembered in the browser (`ossuary.look`, with the default it was chosen
  against: a new default shows once); `?pixel=off` or
  `?pixel=720`; `__game.pixelLook` reads it and `__game.setPixelLook({ lines, outline, bands })` sets it.
- The room kit (M3.5 step 3; `docs/M3.5-plan.md`): the room's pieces redone in code in the style of the spell
  effects. Fire is `src/render/fire.ts` (`makeFire`: layered flames and embers moved on the GPU from `tickFire`, colours in
  the geometry, four shared materials); the fire objects are `src/world/fireLooks.ts` (`torchLook` in each floor's style,
  `brazierLook` with runes that kindle, `candleStandLook`), called from `addTorch` in `rooms.ts` and `MECH_LOOKS` in
  `mechanisms.ts`. Their still pieces are painted (`paint`; `mergeStill` bakes the colours into one mesh, `KIT_MAT`). Every
  floor's floors and walls are pixel art drawn texel by texel in `src/render/pixelTextures.ts` (`CFG.roomKit.texel`,
  `kitWalls` and `kitFloor` in `rooms.ts`); the special rooms' marks come from `drawMarks` in `textures.ts`, hardened into texels.
  `DEV.roomKit` (the dev menu's Look tab, `?kit=old`, `__game.roomKit`, `__game.useRoomKit(on)`) builds the floor again in
  the new or old look; "Fire objects here" stands braziers and candle stands ahead of the mage, cold and lit. The other
  mechanisms are `src/world/mechLooks.ts` (rune stone, lodestone, bell, censer, reliquary; `updateMechLook` moves their
  magic each step: a charged stone's runes, the floating shard, the reliquary's seal), built from `src/world/kitParts.ts`
  (the painted materials, `tone` with its mottle and metalness, `mesh`, `joinAll`, `runeStrokes`, `taperTube`, `rough`,
  `stoneOf`); a look from the kit is flagged `userData.kit`. The objects and piles, the dead tree, rocks, pillars, tombs,
  urns, the pedestal and the bone altar are `src/world/objectLooks.ts` (`OBJECT_LOOKS` from `addProp`, the rest from
  `rooms.ts`, `mechanisms.ts` and `placeArtifact`; `kitPieces` in `rooms.ts`), in the floor's colours (stone from the
  walls, `urn` clay in each look, wax); a burning object's fire and the niches' and themes' candles use `makeFire` too.
  "Objects here" in the Look tab (`__game.objectsHere()`) stands every object and two urns ahead of the mage. Doors and
  their gates, pilasters and niches are `src/world/wallLooks.ts` (`doorLook` from `buildDoor`, turned by `DOOR_TURN`;
  `pilasterLook` and `nicheLook` from `dressNorthWall`, each wall's dressing merged into one mesh). The 57 artifacts are
  `src/items/artifactLooks.ts` (`artifactLook(icon, color)`, from `makeArtifactVisual`), and their HUD icons are rendered
  from them (`artifactIconUrl` in `src/items/artifactIcons.ts`, cached, from `artifactIcon` in `hud.ts`; a painted icon
  first); the Galleries tab floats them all ahead of the mage (`__game.artifactGallery()`, `__game.takeArtifactGallery()`).
  Pickups, coffers and chests are `src/items/pickupLooks.ts` (`itemLook`, `containerLook` from `itemVisual` and
  `containerVisual` in `pickups.ts`: built once a kind, merged and copied; a chest's `lid` and `ward` named in it); "Drops
  here" in the Look tab (`__game.dropsHere()`) lays out every drop. The merchant's shade, the library's lecterns and
  bookcases, the shrine's offering stones and a vault's padlock are `src/world/specialLooks.ts` (from `makeShade`,
  `addPage` and `furnishLibrary`, `makeStone`, `sealMark`); the secret wall's crack is drawn in texels (`crackTexelTexture`).
  Variety (the owner's ask after the proof): each floor's look lists its kinds of wall, floor, wall light and brazier,
  weighted (`kit` in `data/floors.json`); each room draws one of each on its seed (`pickKinds` in the pure
  `src/world/kitData.ts`, into `room.look.kinds`); a theme pins some (`kit` in a theme's look: the ossuary's bone wall). The
  kinds are `WALLS` and `PAVING` in `pixelTextures.ts` (embers glow through an emissive map, `CFG.roomKit.glow`) and
  `TORCHES` and `BRAZIERS` in `fireLooks.ts` (M4.1 adds floor 4's: marble, gilded and tracery walls, checker and inlay floors,
  sconce and crown lights, chalice and censer braziers; its `gilt` stains and `wax` decor; and floor 5's: slate, drystone and
  pilings walls, boards and shingle floors, pole and cairn lights, boat and urn braziers; its `salt` stains). The dev menu's Look tab steps each part's kind on every room of the floor
  (`DEV.kitKinds`, cleared on a new floor or run); `__game.kinds` reads the room's, `__game.forceKinds({ wall: 'ashlar' })`
  forces them.
- `public/assets/hero_default.glb`: the hero for the play-tests (18,632 triangles, 65-bone Mixamo-style rig,
  1,024 px JPEG textures). Clips: `standing_relax`, `run`, `walk` (slow movement), `cast_a_spell`,
  `hit_to_body_01`, `fall` and `defeat_03` (two deaths, one at random), `Drink Potion` (when healed) and
  `Eat` (a fidget after standing still a while). Its walk is a slow one (0.4 units a second of foot contact
  against the run's 1.4), so the mage moves with the run; the dev menu's "Moving" switch (`DEV.moveClip`) tries
  the walk for all movement, in step (10.7× faster) or at a natural pace (`CFG.hero.walkNatural`, feet sliding).
- `prototype/`: the 0.3 single file (`-source` to read, `-playable` to run). Still the reference for look
  and behaviour; `npm run compare` screenshots the same rooms in both.
- Lights were re-tuned for physically based lighting: decay exponents dropped to 0.5 so the falloff
  matches r147's legacy curve, intensities matched to the prototype within about 5% by region
  brightness (`CFG.lights`).
- The end screen (`showEndScreen` in `src/ui/screens.ts`) sums up a run (obols found are `G.stats.obols`); "Replay this seed" starts a new
  run on the same seed.
- M2 (Plunder) takes the magic first: obols (coins, `coins` in code), bone keys and blast glyphs instead
  of bombs. Loot tables are in `data/loot.json` (pure `src/items/loot.ts`, economy simulated in
  `tests/unit/loot.test.ts`); glyphs are in `src/combat/glyphs.ts` (chalked with Space or LT, set off by the
  fuse or the mage's own bolts, chaining; tuning in `CFG.glyph`); pickups, coffers and warded reliquary
  chests in `src/items/pickups.ts`; urns (a room's "rocks" with `urn` set) in `src/world/rooms.ts`
  (`strikeUrn`). The merchant (a bound shade, wares in ward circles, a warded shop) is in
  `src/items/merchant.ts` (M4.2: the Wandering Merchant, `src/items/wanderer.ts`, rides into a cleared ordinary room once a
  run with a focus from far off, a soul mote and the crow's map and secret, laid out by the shade's `layWare`; gone when
  the mage leaves; `__game.callWanderer()`, `__game.wanderer`), the locked vault (a warded door: a key, or two blasts that wake a warden) in
  `src/world/vault.ts`; stock, prices and the vault's hoard are in `data/loot.json`. Secret rooms (a
  forgotten mage's cell behind cracked walls that ring hollow to bolts and break to a glyph's blast) are in
  `src/world/secret.ts`: the generator adds one per floor on top of the room count, and each hidden doorway
  is a door with `secret` set (closed, a wall piece filling it) until `openSecret` opens both sides. The
  shrine (floor 2) is in `src/world/shrine.ts`: an offering stone per curse held; walking into one (10 obols)
  draws the curse out as a wisp that bolts only strike inside the shrine's circle (`strikeWisp`, `blastWisp`);
  four strikes in 10 s cleanse the artifact (`cleanseArtifact` in `items/artifacts.ts`), otherwise it flees
  back into its stone. Tuning in `CFG.shrine`, the price in `data/loot.json`. The drinking ward (M4.2; rules in the pure
  `src/magic/drinking.ts`, tuning in `CFG.ward`): a vault's ward drinks the spells cast near it (`wardNear`, `drinkSpell`
  from `castSpell`) and, full, bursts, the vault's warden a Wardling of the school it drank most (`room.drunk`); a foe's
  (`e.ward`, `src/actors/wardShield.ts`: `wardFoe`, `drinkBlow` from `damageEnemy`) drinks the spells that strike it, keeps
  statuses off, and breaks into a Wardling beside it. `__game.wards` reads them, `__game.wardFoe(i)` wards a foe; the dev
  menu's Foes has "Ward the nearest foe".
- The per-floor artifact budget (`CFG.artifacts.maxPerFloor`, 6): the generator marks which rooms hold one
  (`artifact` on each planned room: always the treasure room, ordeal and boss; the merchant, vault and altar
  in a shuffled order while the budget lasts). `buildFloor` reserves them all; room-clear drops take what
  is left. A gilded reliquary chest (rare; only a key opens it) and the secret room hold artifacts outside
  the budget (`offerBeyondBudget`). While a room's doors are locked, its artifacts can't be taken.
- Bosses are in `src/actors/bosses.ts`: each floor draws one from its pool in `data/floors.json`, never one the run has met.
  The Hollow Warden (floor 1's, met first) is built in code (M4): three looks in `src/actors/bossLooks.ts` (Bell Warden,
  Mother of Spores, Hollow Owl; names in `STR.bossLooks`), each giving its fight the parts it moves (`eye`, `ring`, `halo`)
  and its school, whose light its shots take (`bossSchool`); its still parts merged by `mergeRig` (about 20 draw calls).
  The one it wears is the owner's choice for now: the dev menu's Galleries tab stands the three and switches it
  (`ossuary.bossLook` in the browser; `__game.bossLooks()`, `__game.bossLook`, `__game.setBossLook(id)`). The bosses of
  floors 4 and 5 (M4.1) are built in code the same way (`hartLook`, `anglerLook` in `bossLooks.ts`; `updateHart`,
  `updateAngler`): the Hallowed Hart charges along a lane lit on the floor (`parts.lane`), turns firing spokes of light
  (`spin`) and stamps rings; the Deep Angler draws the mage in with its lure (`player.pull`, spent each step) until it
  bites or flinches, spits hexing volleys and breathes rings. They have a weakness and a resistance (`weak`/`resist` in
  `CFG.enemy`, `bossAff` on the boss, read by `damageEnemy`; the bestiary keeps bosses beside foes), and the Galleries tab
  stands them beside the Warden's looks (`ALL_BOSS_LOOKS`). M4.2's War-Tiger (`tigerLook`, `updateTiger`; floors 3 and 4's
  pools) stands as a statue (`state: 'statue'`, no contact, a stone tint in `statusTint`) until the mage comes within
  `wake` or strikes it; it prowls, circles at claw reach and swipes a fan of claws, crouches with its landing spot marked
  (`marker`) and pounces (a wall stuns it; frost shards on landing), and roars rings. Its plates (`e.plates`, the parts
  `plate0` to `plate3`) make `e.guard`; `breakPlate` knocks one off from a glyph's blast (`glyphs.ts`), a Shatter (a shock
  on its rimed plates, `inflict` in `statusFx.ts`) or `wear` damage turned (`wearPlates` in `damageEnemy`), each lost
  leaving it faster (`plateSpeed`). The abbess and the knight are still placeholder shapes. A boss with `hidden` set (the abbess under the floor, the knight in mid-leap)
  can't be hit and doesn't hurt on contact.
- Gameplay delays (the warden's second ring, the pause before the death screen) run on simulation time,
  so they pause with the game and advance under `__game.sim()`.
- Dev hooks (`window.__game`, `window.__manual`) are also in production builds, for testing the deployed site.
  `warp(id)` or `warp(gx, gy)` does not despawn the previous room's foes (as in 0.3).

Prototype content: one hand-built floor of six rooms (start, 3 combat, treasure, boss), 3 enemy types plus
a boss (placeholder primitive shapes), one relic, hearts, minimap, boss bar, keyboard/gamepad/touch
twin-stick input, synthesised sound, pause/title/end screens, drag-and-drop GLB hero swapping.

## Milestone M0: move to a proper project (done)

Goal: the same game, playable, in a maintainable project. No new features.

1. Vite + TypeScript (strict) + **current three.js** from npm, ES modules.
2. Split the prototype into modules:

   ```
   src/
     main.ts          boot, game loop (fixed 1/60 step, max dt 1/30), states
     config.ts        the CFG tuning block, unchanged values
     render/          renderer, camera, lights, procedural textures
     world/           floor data, rooms, walls, doors, collision
     actors/          hero, enemies, animation controller
     combat/          bolts, enemy shots, damage, particles, decals
     items/           relic, pickups
     input/           keyboard, gamepad, touch
     ui/              HUD, minimap, banner, menus (HTML/CSS overlay as now)
     audio/           WebAudio synth effects
   data/              floor1.json (rooms, rocks, foes), relics.json
   public/assets/     hero_default.glb (loaded at runtime, never base64)
   tools/             prepare-asset (Node)
   ```
3. Move hard-coded content to JSON: the `FLOOR` table (rooms, rocks, foes) and the Ember Sigil relic.
4. `tools/prepare-asset`: a Node script using `@gltf-transform/core` + `@gltf-transform/functions`
   (+ `sharp`) that takes a Tripo GLB and writes an optimised copy to `public/assets/`: textures resized to
   1,024 px and JPEG, then prints a report: triangle count, rigged yes/no, clip names and the role each
   would be matched to, whether the hips track has a horizontal offset, whether a round base is present.
5. Deploy to **GitHub Pages** with a GitHub Actions workflow (set Vite `base` to the repo name).
6. Keep the dev hooks: `window.__game` with `sim(seconds)`, `draw()`, `warp(gx, gy)`, `keys`, `arrowOrder`,
   `player`, `enemies`, `camera`. Add a Playwright smoke test that starts a run, clears room A with the
   hooks and checks there are no console errors.

**Done when:** `npm run dev` plays exactly like the playable prototype; `npm run build` succeeds; the Pages
URL loads on a phone in landscape; the smoke test passes.

## three.js upgrade notes (r147 → current)

- Colour management is on by default now: delete `THREE.ColorManagement.legacyMode = false`.
- `renderer.outputEncoding = sRGBEncoding` → `renderer.outputColorSpace = THREE.SRGBColorSpace`;
  canvas textures: `texture.encoding` → `texture.colorSpace = THREE.SRGBColorSpace`.
- Lights are physically based now. Point-light and hemisphere intensities from the prototype will look
  far too dark. Re-tune by eye against the playable prototype (screenshots side by side).
- `GLTFLoader` comes from `three/addons/loaders/GLTFLoader.js`.
- WebGPU is optional; stay on `WebGLRenderer` for M0 unless it's a drop-in.

## Techniques that must survive the port

These were each found by testing real Tripo exports. Keep them, with the same behaviour.

| Function in the prototype | What it does | Why |
| --- | --- | --- |
| `prepareHero` | Normalises any GLB to 1.3 units tall, centred, feet on the floor | Tripo sizes vary |
| `stripMiniatureBase` | Detects and cuts a round base off static meshes | Tripo figurines often stand on a base |
| `setHero` | Recognises clips by name keywords (idle/stand/relax, run/walk, cast/spell/attack, hit/hurt, fall/death) | Tripo names vary (`standing_relax.001`) |
| `bodyPart` | Splits clips into upper body (spine and above) and lower body | Run with legs while casting with arms |
| `alignUpperToHips` | Moves an overlay clip's hip rotation into the spine | `cast_a_spell` turns the whole body 75° at the hips |
| `centreHips` | Removes horizontal hip offsets from clips | `run` shifts the body 0.28 units forward |
| `castWindow` | Finds the fastest forward hand thrust and replays only that 0.6 s window per shot | The cast clip is 5.4 s long |
| `updateHeroAnim` | Blends weights: lower = idle/run by speed; upper = base, cast, hit; death overrides | Clean layering |
| Drag-and-drop / Load hero .glb | Swap the hero at runtime and show a report in the pause menu | Quick Tripo tests |

Run clip playback speed is `CFG.hero.runAnimSpeed` (3.0 at full speed, measured from the run clip's stride so
the feet don't slide: the feet's ground speed while planted, against `CFG.hero.speed`); a
walk, when the model has one, takes over below `CFG.hero.walkToRun` of full speed at `walkAnimSpeed`. A model
with a walk but no run runs with its walk. Extras used when present: a second death clip (one of the two
at random), a drink (played when healed, only the draught around the raised flask) and an eat (a fidget
after `CFG.hero.fidget` seconds standing still). A rig with no death clip topples over like a static model.

## Design facts to keep consistent

- Room cell 13 × 7 tiles, 1 tile = 1 unit, walls 1 thick, doors centred, 1.44 wide. From M1, larger rooms
  combine cells (GDD: Room shapes).
- Orthographic camera tilted 45°, fitted to one-cell rooms and following the mage in larger ones, pulled
  back 20% there; pans between rooms in 0.42 s, blending the zoom; only the current room is drawn. North
  wall tall (1.35), south wall low (0.5).
- Desktop browser first (keyboard, gamepad). The 0.3 touch controls stay but are frozen: don't extend or
  test them, and add no touch UI for new actions until a mobile port.
- Four-direction casting, eight-direction movement, 3 hearts counted in halves, 1 s invulnerability.
- Hearts can't be picked up at full health, mana vials at full mana, soul motes past `CFG.souls.max`, a lodestone shard
  with the spells ready and mana full (the first time in a run a message says why); while the mage knows no spell, loot
  drops an obol in place of a mana vial or a shard (`spawnPickup`). Doors lock while enemies live.
- Placeholder names (Ossuary, the ten foes in code (Sporeling to Rime Drakeling) and M4.1's eight (Wickmouse to Lantern
  Tortoise), Hollow Warden, Drowned Abbess, Pyre Knight, the Hallowed Hart, the Deep Angler, Ember Sigil) will be replaced with Eda lore later; keep all player-facing strings in one place to make that easy.

## After M0: roadmap

Order and scope from `docs/GDD.md` (Roadmap and milestones); details are in the GDD. Every milestone
ships placeholder sounds for what it adds; spatial audio and the mixer arrive with M3 (GDD: Audio design).

- **M1 Core loop:** three generated floors (varied maps, room counts and room shapes), 20+ room templates,
  room variants from quiet to ordeal, bone altars, 3 to 5 artifacts per floor from 10 artifacts and 3 foci.
- **M2 Plunder:** obols, bone keys and blast glyphs; merchant, secret room, locked vault, shrine cleansing;
  urns, chests.
- **M3 Magic:** mana, 2 spell slots, 6 spells across 3 schools, status effects, 2 reactions, library room.
- **M3.5 The look:** the asset pipeline's tooling (for special models from Tripo: the mage, bosses where wanted), the
  pixel look (1080 lines by default), and the room kit redone in code in the style of the spell effects (the owner's decision
  2026-09-30: code, not Tripo, for everything else); steps and checks in `docs/M3.5-plan.md`.
- **M3.6 Rooms of Eda** (from the first play-test; runs beside M3.5): carved outlines, dressed walls, doors off
  the middle, themed rooms, new objects and piles, mechanisms that answer to magic; steps in `docs/M3.6-plan.md`.
- **M3.7 Spell knowledge** (decided 2026-09-29, after M3.6 step 5): panels over grimoire pages and in the inventory
  that fill in as spells are seen, learned, used and later upgraded; the spells tab by school; knowledge kept between
  runs in the browser until the hub takes it over (GDD: Spells, Spell knowledge).
- **M4 Enemies in code** (the owner's decision, 2026-09-29, instead of Tripo): the ten enemy options (GDD: Enemies built in
  code; four on floor 1, three on each other floor) made foes with behaviour, health, sounds and elemental affinities, and a
  boss built the same way.
- **M4.1 Two floors deeper** (the owner's ask, 2026-09-30, before M4.5): floors 4 and 5 (the Gilded Reliquary, the
  Ferryman's Shore) with their room kit, eight foes and two bosses in code, two themes; Hallow and Umbral spells and
  statuses; soul motes; twelve artifacts; steps in `docs/M4.1-plan.md`.
- **M4.2 Beneath the Gate** (the owner's ask, 2026-09-30, from their Eda lore drop): the setting in the game's text (the
  Wardens' vault beneath the Gate of Uzulim, Asyrion, Kaelith), six pieces from the lore that answer to magic (watching
  statues, sapping obelisks, the drinking ward, rope bridges, currents and waterfalls, candle stands in water), the
  Wandering Merchant of Belerial, three bosses in code (the War-Tiger, the Pillar Dragon, the Twin Guardians) and Fen-Nex;
  steps in `docs/M4.2-plan.md`. The lore's other ideas went into M4.6 (Asyrion's arc, Boketto's look), M5 (Dr. Jelly's
  laboratory, the Verdant school) and M7 (the Vigil at the cave mouth, Kaelith).
- **M4.5 Bestiary** (decided 2026-09-30): a whole host more creatures built in code (small critters, fantasy creatures,
  elementals) and new kinds of enemy behaviour, each a look in the dev menu's gallery first, chosen by the owner, then a
  foe (GDD: The Bestiary; ideas in `docs/ideas.md`, Bestiary).
- **M4.6 Costumes and transformations** (decided 2026-09-30): most artifacts wear a costume piece built in code;
  three artifacts of a kind transform the mage (a look and a gift; GDD: Artifacts, Costumes and transformations).
- **M5 Alchemy:** potion belt, drink or throw, identification, 4 reagents, alchemy table.
- **M6 RPG growth:** XP, levels, attributes, 12 boons, runes and waystones.
- **M7 Descent and the Vigil:** final boss; the hub between runs, decided 2026-09-29 (GDD: RPG progression, Between runs:
  the Vigil): shades the mage frees in runs become its townspeople, with a small dialogue system (or are bound as a
  familiar for one run); it unfolds to the spells the mage knows; the Great Circle (vows, gifts, omens) before a run and
  the Ferryman's crossing as the way down; echoes of past runs; grimoire, bestiary and disciplines. Permanent upgrades:
  options first, a few powers, offset by deeper floors and the vows.
- **M8 Eda:** lore names, floor biomes, adaptive music, ambience beds and final mix.

## Agents and skills (standing instructions from the owner, 2026-09-29)

Two subagents in `.claude/agents/` and one skill in `.claude/skills/`. The owner asked for them to be used as
below without being asked each time; in a cloud session this line is that request.

- **`rules-reviewer`** (subagent): before opening every PR, run it on `origin/main...HEAD` and fix its blocking
  findings. It checks the diff against these working agreements, the GDD and the lore limits. It starts from
  `npm run review-checks` (`tools/review-checks.ts`: what a script can find in the diff, per rule, plus the typecheck
  and unit tests) and reads only the hunks it flags and the changed source; tell it `--no-tests` when those just ran.
- **`room-inspector`** (subagent): after every step that changes how rooms look (walls, doors, objects, themes,
  lights, mechanisms), run it on what changed (a routine check); before a milestone's play-test build, a closing
  sweep (every theme, carved rooms, objects, a floor of each look). It uses `npm run inspect`
  (`tools/inspect-rooms.ts`): `changed` picks the rooms from the diff, `--against origin/main` shoots them on the base
  too and marks what changed (with before | after images), and checks flag console errors, a hidden mage, pools that
  read like pits and rooms too dark to read; it looks only at changed or flagged rooms, with a budget of close-ups
  (`inspect -- crop`). Fix its blocking findings; list the polish ones for the owner.
- **`ship`** (skill): when the owner asks to open a PR and merge it. Checks, PR, CI, rebase merge, the branch back
  in step with `main`, the Pages deploy confirmed. Never ship without being asked.

Later: an **asset-pipeline** subagent when M3.5 starts (the recipe in `docs/assets.md` for each asset the owner
hands over), and a **template-builder** subagent if a step needs many templates at once. New agent and skill files
load when a session starts. In a cloud session the browser for Playwright is under `/opt/pw-browsers`: set
`PW_CHROMIUM` to it for `npx playwright test` and `npm run inspect`.

## Working agreements

- Plan before large changes; keep commits small with clear messages.
- **Every new feature gets its dev menu entry in the same step** (`src/ui/devMenu.ts`, in the tab it belongs to): a way
  to spawn, give, reach or trigger it, so testing stays quick. Things listed from data show up by themselves; new
  kinds of things (a room type, a mechanic, a switch) need a button or a line in `refresh()`. The HUD and the
  title screen's controls show the menu's key during the play-tests (`#devHint`, `STR.dev.hint`,
  `STR.controls.dev`); remove them when they're over.
- Before calling something done, verify it in the browser (Playwright screenshots are fine).
- Tuning values live in `config.ts`; content lives in `data/`. Don't scatter magic numbers.
- Performance target: 60 fps in desktop browsers on mid-range hardware, including integrated graphics.
  Share geometries and materials for projectiles and particles; dispose what you remove.
- The owner is an IT professional, comfortable with PowerShell; work on this project is in English.
