# Ossuary architecture

A reference for developers: what each system does and where it lives, as the code is now. Design intent is in
`docs/GDD.md` (the GDD wins on design); the plan for the current phase is `docs/RESET-plan.md`.

## Rules that constrain new work

- Tuning values live in `src/config.ts` (`CFG`); content lives in `data/`. No magic numbers in code.
- All player-facing text lives in `src/strings.ts` (`STR`); HTML uses `data-s` keys. Names are placeholders.
- Nothing silent: every mechanic shows the player it is happening, if only in a word or a cryptic line. What holds
  the mage shows as a chip beside the mana bar; a reaction's, weakness's or counter's word rises over the foe. A
  mechanic is not finished until it shows.
- Difficulty never comes from more foe health (no bullet sponges). It comes from more foes, pressure dials, new
  behaviours and fewer hearts.
- Every new feature gets a dev menu entry in the same change (see [UI](#ui)).
- Every Tripo model wears its texture as pixel art. The mage alone keeps its vertex look.
- One pixel for everything: anything new is drawn at the room kit's texel, with stepped glows and pixel-art icons.
  Only the coin faces and the made Vigil figures use the fine layer; nothing else goes on it without a decision.
- Gameplay delays run on simulation time (`after()` in `state.ts`), so they pause with the game and advance under
  `__game.sim()`.
- Share geometries and materials for projectiles and particles; dispose what is removed. Target 60 fps on
  integrated graphics.
- Anything that must replay from a seed (floors, rooms, loot, pages, boons, shades) draws from a named stream in
  `src/rng.ts`. Combat and visual jitter use `Math.random`.
- Lore text stays inside what the GDD adopted (the Gate of Uzulim and its Wardens, the Pass of Buluiain, Kaelith,
  Azyrion, Belerial, Fen-Nex, Dr. Jelly) plus dungeon furniture (chapel, crypts, sextons, pilgrims, the Ferryman).
  Invent no gods, factions or places.
- Rules live in pure `*Data.ts` modules (no three.js, no DOM) with a unit test; the game side calls them.
- The simulation (world, actors, magic, items, combat, progression, vigil, `flow.ts`, `loop.ts`, `state.ts`) never
  imports `src/ui/` (a lint rule fails if it does): it tells the UI through `events.ts` (`notify.ts`), opens panels
  through `panels.ts`, and the loop runs the UI in hook slots (see [Events and the panel
  door](#events-and-the-panel-door)).

## Overview and code map

Vite + TypeScript (strict) + three.js r186; a desktop browser game (keyboard and gamepad). A fixed 1/60 s step,
an orthographic camera tilted 45 degrees. Room cell 13 x 7 tiles, 1 tile = 1 unit, walls 1 thick, doors 1.44
wide; the north wall is tall (1.35), the south wall low (0.5). Four-direction casting, eight-direction movement,
three hearts counted in halves, one second of invulnerability after a hit.

| Root file (`src/`) | Role |
| --- | --- |
| `main.ts` | Boot, input wiring, the UI wired to the game (`wireUi`), `?seed` (`readSeed`); loads the dev code (`src/dev/`) with a dynamic import. |
| `devDoor.ts` | The dev door: the only way the game reaches dev code (see [The dev door](#the-dev-door-and-srcdev)). |
| `state.ts` | Shared mutable state: `G` in typed slices (see [Shared state](#shared-state)), `player`, `DEV` switches, `after()` timers. |
| `flow.ts` | Game states, floor setup (`startGame`, `buildFloor`, `buildVigil`), `warp`, clears, `endGame`. |
| `flowHooks.ts` | What actors and combat ask of the flow (`tryTransition`, `descend`, `onWaveCleared`, `onBossDead`, `endGame`); `flow.ts` fills it. |
| `loop.ts`, `clock.ts` | The fixed 1/60 step: calls every system's `update*` and the UI's hook slots (`uiHooks`), then draws; the real-time clock it steps by. |
| `events.ts`, `notify.ts`, `panels.ts` | The event bus, the simulation's notifications on it, the panel door (see [Events and the panel door](#events-and-the-panel-door)). |
| `config.ts` | `CFG` tuning block, `BOSS_TYPES`. |
| `strings.ts`, `types.ts` | `STR` (all player-facing text; the dev menu's is `DEV_STR` in `dev/strings.ts`), `struckName`; shared types (`RoomType`, `Room`, `Door`, `Vec2`, `LoreEntry`, `RunSummary`). |
| `rng.ts`, `util.ts` | Seeded random streams; small helpers. |
| `style.css` (and `index.html`) | HUD and screen styles; the overlay markup. |

| Folder (`src/`) | Holds |
| --- | --- |
| `actors/` | The mage, foes and their looks, bosses, costumes, made (Tripo) creatures, bestiary memory. |
| `assets/` | Loader and pure data rules for made assets. |
| `audio/` | Effects, instruments, soundscapes, music, the director, offline render. |
| `combat/` | Damage, projectiles, glyphs, familiars, Fen-Nex, particle effects (`fx.ts`). |
| `dev/` | Dev code behind the door: the dev menu, `window.__game`, the URL's dev options, galleries, test harnesses. |
| `input/` | Keyboard, gamepad, frozen touch, the shared `pressed` state. |
| `items/` | Artifacts, pickups, loot, merchants, potions, reagents, transformations, Azyrion's arc. |
| `magic/` | Spells, shapes, statuses and reactions, weaves, knowledge, runes, grimoire pages, spell effects. |
| `progression/` | Insight, levels, attributes, boons. |
| `render/` | Renderer and pixel look, textures, lights, fire, materials, rig merging, palette, texel bake, the drawn icons (`icons.ts`). |
| `ui/` | HUD, screens, inventory, panels, level-up, lore cards; it listens to the game and is wired by `main.ts`. |
| `vigil/` | The hub between runs: save, place, shades, townspeople, dialogue, gifts, unfolding. |
| `world/` | Floor generation, rooms, walls, templates, props, mechanisms, pools, themes, special rooms. |

Outside `src/`: `data/` (JSON content), `public/assets/` (`hero_default.glb`, `creatures/`, `sounds/`, `coins/`),
`tools/` (Node scripts), `tests/`, `docs/`.

Most systems follow one pattern: rules in a pure `xData.ts` with a `validateX`, the game side in `x.ts`, looks in
`xLooks.ts`, tuning in `CFG.x`, text in `STR.x`, a dev menu section (`dev/menu.ts`) and `__game` hooks (`dev/hooks.ts`).

### Shared state

`G` (`state.ts`) is one object in slices, each a named type with a few owners that write it; everyone else reads. The
owners are documented beside each type, not enforced.

| Slice | Type | Holds | Written by |
| --- | --- | --- | --- |
| `G.flow` | `FlowState` | `state`, `trans` (the pan between rooms), `clock` (simulation time) | `flow.ts`; `combat/damage.ts` (dying), `world/daylight.ts` (daylight, cuts the pan short), the dev menu (pause); `loop.ts` ends the pan and alone advances the clock |
| `G.floor` | `FloorState` | `rooms`, `roomMap`, `trapdoor` (the way down) | `flow.ts`, `world/rooms.ts`; `items/pickups.ts` and `world/daylight.ts` open the way down |
| `G.room` | `RoomState` | `current` (the mage's room), `enemies`, `bolts`, `shots`, `pickups`, `glyphs` | `flow.ts` (the current room, clears), `actors/enemies.ts`, `combat/projectiles.ts`, `items/pickups.ts`, `combat/glyphs.ts`; glyphs, familiars, shapes and the shades' help end shots |
| `G.fx` | `FxState` | `particles`, `decals`, `shake` | `combat/fx.ts`, `flow.ts` (clears); any blow raises the shake, `loop.ts` decays it, the renderer reads it |
| `G.run` | `RunState` | The current run: its seed, floor, seeded streams and everything it has done | `flow.ts` makes a fresh one per run (`newRun`); the systems keep their own fields |
| `G.stats` | | The run's time, kills and obols | `flow.ts` resets it; `loop.ts` (time), `combat/damage.ts` (kills), `items/pickups.ts` (obols) |

A reset that truncates an array (`length = 0`) keeps the same array, as code may hold it; one that replaces it makes a
new one. Keep each reset as it is.

## Runs and floor generation

A run is five generated floors, then the Seal (a hand-laid sixth floor). Floors are named by their look: `crypt`,
`drowned`, `burning`, `reliquary` (the Gilded Reliquary), `shore` (the Ferryman's Shore), `seal`.

- `src/world/generate.ts`: `generateFloor` (pure, unit-tested on hundreds of seeds) builds the room graph: types,
  cells, shapes, doors, templates (`assignTemplates`), the artifact budget. Extra rooms added on top of the count:
  secret room (every floor), laboratory (`placeLaboratory`), waystone room (`placeWaystone`). `fixedPlan` lays a
  `fixed` floor (the Seal); `hubPlan` lays the Vigil.
- `src/world/shapes.ts`: room shapes (cells, tile mask, door slots). Rooms span several cells.
- `src/world/templates.ts`: parses and validates templates. `src/world/fill.ts` (pure): fills `R W H` roles with
  foes (`fillRoles`, `packRoll`, `packCount`, `championIndex`).
- `src/world/curve.ts`: `floorLean` (library pages lean to the floor's weakness), `warnFloor` (banner line naming
  the school the floor walls off).
- `src/flow.ts`: `startGame`, `buildFloor` (every room, shades, laboratory, artifacts), `warp`, `onRoomCleared`,
  `descend`, `endGame`. Game states: `title | play | pause | dying | end | daylight`.

`data/floors.json` is an array, one entry per floor. An entry holds `rooms` (a range), `enemyHp`, `pressure`,
chances (`altarChance`, `vaultChance`, `secretArtifactChance`, `themeChance`, `bossHallChance`, `doorShift`,
`shade`, `runes`), flags (`shrine`, `library`, `waystone`, `laboratory`), `vaultWarden`, `foes` (weighted lists for
the `R`, `W`, `H` roles), `pairs`, `mantles`, `variants` (normal, quiet, champion, ambush, dark), `templateWeights`,
`shapes`, `themes`, `souls`, `boss` (pool, tuning, insight) and `look` (name, kit kinds, colours, decor).

Artifact budget (`CFG.artifacts.maxPerFloor`, 6): the generator marks which rooms hold an artifact (always the
treasure room, ordeal and boss; merchant, vault and altar in a shuffled order while the budget lasts); `buildFloor`
reserves them and room clears drop what is left. A gilded chest and the secret room hold artifacts outside the
budget (`offerBeyondBudget`). Artifacts cannot be taken while a room's doors are locked. A bone altar sells one for
a heart container.

Later floors have more rooms and fewer hearts, and the pressure dials rise; deeper starts begin at their
expected level (`levelAtFloor`).

Tuning: `CFG.generator`, `CFG.quiet`, `CFG.ambush`, `CFG.artifacts`, `CFG.curve`. Dev: dev menu Rooms & runs (new
runs, floor jump, special rooms, test rooms, the floor's dials, lean and walls); `__game.map()`, `warp`, `descend`.

## Rooms

- `src/world/rooms.ts`: `buildRoom` assembles a room: traces walls along any outline, cuts doors, places props,
  torches, pillars (`raisePillar`), pits and urns (`strikeUrn`), every piece the room kit's (its looks in `*Looks.ts`).
  `openChasm` burns a rope bridge through; `plugDoor`/`unplugDoor` wall a barred doorway.
- `src/world/walls.ts` (pure): the walls as a grid of wall tiles (tall or low by where the floor lies) merged into
  non-overlapping boxes. `dressing.ts`: pilasters and niches on tall walls (`wall.dress` in the floor's look;
  `room.dressed` keeps nests and perches off them). `dims.ts`, `collision.ts` (`blockers()`: obstacles for the mage,
  foes and shots, including `room.barriers` such as ice walls).
- Doors: `buildDoor` in `rooms.ts`; looks in `wallLooks.ts`. A door shifts along its cell edge by `shift`
  (`doorShift` per floor), chosen in `generate.ts` where both templates leave the lane clear. Doors lock while foes
  live. A secret door has `secret` set until `openSecret`.
- Camera (`src/render/renderer.ts`): `cameraTargetFor` follows the mage in rooms larger than the view;
  `viewScaleFor` pulls back in multi-cell halls (`CFG.camHallView`). It pans between rooms in 0.42 s; only the
  current room is drawn. Four torch lights move to the torches nearest the mage.

Templates (`data/templates/`: `standard`, `themed`, `special`, `shapes` for larger and narrow rooms, `vigil`) are
grids of letters:

| Letters | Meaning |
| --- | --- |
| `.` `#` `o` `i` `=` `x` | floor, rock, pit, pillar, stone tomb, void (outside an L, or carved inside a shape) |
| `u` `$` | urn, rune-sealed urn |
| `~` `%` | water, oil |
| `b k s c r t v : g p d e` | bones, skulls, sacks, cask, rubble, roots, briar, cobwebs, glowcaps, pew, desk, scrolls |
| `h m +` | offering heap, moored boat, rope bridge |
| `J F` | jelly globe (laboratory), flowering plant (garden) |
| `f l a n y * q T` | brazier, candle stand, bell, rune stone, lodestone, censer, reliquary, dead tree |
| `w ! L Z` | watching statue, sapping obelisk, candle stand in water, sluice gate |
| `R W H`, `B` | enemy roles (filled from the floor's `foes`), boss |

Ordeal templates list enemies per wave in `waves`. A template's `theme` makes a themed room, its `current` makes
water run, `fixed` keeps it out of generated floors. `boss_belfry` (four pillars, two bells) is a boss room for any
boss. `?room=<id>` plays one template next to the start.

Room types (`RoomType`): `start normal treasure boss ordeal altar merchant vault secret shrine library laboratory
waystone vigil`. A new type needs a `DoorStyle`, a template, a name in `DEV_STR.roomNames` and a dev menu entry.

## Objects and mechanisms

Objects are scenery the mage can break, burn, walk through or be stung by.
- `src/world/propData.ts` (pure): each object's letter, class (`tall`: `rocks`; `low`: `room.lows`, walking only
  unless a bolt breaks it; `soft`: `room.soft`, walked into; `hanging`), hit points, blast and burn behaviour, loot
  table. `MECHANISMS` lists the objects that answer to magic.
- `src/world/props.ts`: behaviour (`strikeProp`, `blastProps`, `burnPropsAt`, `snagAt`, glowcap spores `addSpores`,
  briar stings, `blossomBurst`). `objectLooks.ts`: looks (`OBJECT_LOOKS`) in the floor's colours; still meshes are
  merged by material (`mergeStill`), so an object costs 2 to 5 draw calls. Tuning `CFG.props`; poorer loot
  (`remains`, `bundle`, `hoard`) in `data/loot.json`.

Mechanisms: `src/world/mechanisms.ts` (behaviour, tuning `CFG.mech`), `mechLooks.ts` (looks; `updateMechLook`),
`kitParts.ts` (painted materials and shape helpers). They hear the same hooks as everything else:
- `elementAt(kind, x, z, r)` from `fireAt`, `frostAt`, `shockAt`, `touchPools`: braziers and candle stands light,
  rune stones take a school, lodestones leap.
- `strikeMechanism` (from `strikeProp`): bells ring, candles fall. `boltThrough` (from `updateBolts`): a lit brazier
  sets a bolt alight, a bolt cuts a censer's chain.
- `src/world/groundHooks.ts`: `hearGround(kind)` lets ground (webs, rime, ink, living wood, steam) hear fire,
  frost, shock and blasts.

| Mechanism | Does |
| --- | --- |
| Candle stand, brazier | Lit by fire. All stands lit open reliquaries, lift a dark room, bless casts in a chapel. |
| Rune stone, lodestone | Takes a school's charge; leaps toward bolts. |
| Bell, censer, reliquary | Rings (can bring a dragon down); a chain a bolt cuts; opens when candles are lit. |
| Watching statue | In sight during a fight it charges, marks the mage's spot, strikes; a hex blinds it. |
| Sapping obelisk | Its field halves the cantrip (`sapMul`) and drains mana until its ward's school hits it. |
| Sluice gate | Opens to flood or drain mud (`setMud`); water foes are driven up (`driveUpAll`). |
| Jelly globe | Bursts into a Lantern Jelly or a reagent (`globeBurst`). |
| Rope bridge | Lies over a chasm until fire burns it (`openChasm`): a foe on it falls; the mage loses a heart. |

Dev: `__game.prop('cask')`, `props` (lit, school, charge, `open`), `burn(x, z, r)`, `element('burn' | 'chill' |
'shock' | 'sanct' | 'hex', x, z)`, `sap`; dev menu Foes & objects, Look tab ("Objects here", "Fire objects here").
To add one: a row in `propData.ts` (letter, class), a look in `OBJECT_LOOKS`, behaviour in `props.ts`; a mechanism
also a row in `MECHANISMS`, a look in `mechLooks.ts` and an update in `mechanisms.ts`.

## Themed rooms

Fifteen themes in `data/themes.json` (chapel, ossuary, scriptorium, pilgrims, cistern, grotto, collapsed,
embalmers, bells, mausoleum, reliquary, garth, treasury, landing, garden): look changes, floor scatter, a twist.
Pure `src/world/themeData.ts` (`themedLook`, `validateThemes`). A template's `theme` makes it a themed room
(`themed.json`); floors draw them by `themeChance` and `themes`. `src/world/themes.ts` scatters dressing
(`dressTheme`) and runs the twists; tuning `CFG.themes`. `?theme=ossuary` makes every fight one theme's.

A floor's look may carry its own `scatter` (floor 1: bones, pebbles, verdigris, cobwebs, stains): a plain
fight or the start is strewn with it, each kind's count varied a room (`CFG.themes.plainSpread`); never on other room
types. Cobwebs (`webs`) keep to a wall. The kinds with nothing moving in them are merged into one mesh a material (`STILL`); the room's counts are `room.strewn`. A floor's `wall.dress.fill` is the chance a spot between pilasters holds a
niche. The `relics` kind strews made models (data/assets.json `props`, ids in `PROP_SLOTS`: a grave marker, a coffin
lid, a fallen candelabrum, an angel's head, a skull pile, a broken urn; `relicLook`), one to a tile whose eight
neighbours are free, none in the start, two in a room two different ones; none while assets are off. The standing ones
(`CFG.themes.relicBlock`) block as breakable rocks (`standRelic`: a collider from the model's footprint, `relicFit`, its
tile `rock` until it breaks). Dev:
`__game.scatterHere`, `relicsHere()`; the Look tab's readout under Objects here, and Relics here.

Twists: sleepers (`asleep` foes wake when hit or approached); rising bones; scroll heaps break to pages; cave-in on
a blast (`caveIn`); the chapel's blessing; the mausoleum's rime (entombs foes, freezes water, charges rune stones,
lets the mage slide); an ossuary's watching niches (`skullsWatch`); a treasury's statue guardians (woken by
`goldTaken`); the landing's drowned climbing from its river; the garden (`inflict` scales Overgrown).

To add one: an entry in `themes.json`, a template with `theme`, a twist branch in `themes.ts` if it needs
behaviour. The dev menu lists a test room of each.

## Pools, water and oil

`src/world/pools.ts`: water and oil tiles are joined into `room.pools`. Pool and pit outlines are blurred on the
CPU (`softenCanvas` in `render/softEdge.ts`; a canvas `blur()` filter stalls software GPUs). Anything elemental
reports where it lands:
- `fireAt` lights oil, melts ice, boils still water to steam. `frostAt` freezes water; frost on burning oil makes
  steam. `shockAt` runs a shock through a pool; on burning oil it is `overloadAt`. `inflict` calls `touchPools`.
- `wadeAt` slows the mage and walkers in unfrozen water. `addPool` makes a pool (a `jelly` option for jelly).
- Currents: a template's `current` makes water run (`room.flow`), carrying the mage, walkers, bolts, shots and
  pickups; frozen water stops; a waterfall feeds it (`buildFalls`). Tuning `CFG.flow`.
- Steam (`src/magic/steam.ts`: `steamAt`, `inSteam`, `steamBetween`): shooters in steam shoot wide; eyes and statues
  lose the mage across it; over water it brings up what hides there.
- `src/world/flood.ts` (pure): how a room floods (`pourJelly`). Tuning `CFG.surface`.

Dev: `__game.pools`, `pool('fire' | 'frost' | 'shock')`, `flow`, `steam`, `steamAt`, `inSteam`; "Steam ahead".

## Foes

A foe is data plus a behaviour. `data/foes.json` has 61 entries: floor (0 = Wardlings), school, `weak` / `resist`,
`hp`, size `r`, `speed`, `contact`, `flying`, `elite`, `elemental`, `pack`, `behaviour` and `params`, gib and stain
colours. Pure `src/actors/foeData.ts` reads it (`validateFoes`, `BEHAVIOUR_PARAMS`, `affinityMul`, `drinksStatus`,
`pickFoe`, `schoolOf`, `pairRoom`, `callFoe`).

- `enemies.ts`: `makeEnemy`, `spawnFoe` (makes a pack whole), `updateEnemies` (`pace` scales a foe's step by slows
  and song haste, never its velocity). `flow.ts`'s `spawnWave` rolls a fight.
- `foes.ts`: `buildFoe` (model merged by `mergeRig`, about 15 draw calls), `updateFoe` (runs the behaviour from
  `BEHAVIOURS`), `poseFoe` (telegraph swell and glow in its school's light, hit squash), `hazardAt`, `laySpark`.
  `foeKit.ts`: what behaviours are written against (`Behaviour` hooks `struck`, `blasted`, `afflicted`, `die`,
  `driven`; `rush`, `brake`, `ramp`). The bestiary behaviours, a file a floor: `bestiaryFloor1.ts`,
  `bestiaryFloor2.ts`, `bestiaryFloor3.ts`, `bestiaryFloor4.ts`, `bestiaryFloor5.ts`; `bestiaryFoes.ts` keeps the helpers more than one floor uses and merges them into `BESTIARY_BEHAVIOURS`, spread
  into `BEHAVIOURS`.
  `bestiaryGround.ts`: what foes leave and throw (webs, ink, rime, `lob`, `spikeAt`, `fallOn`, `layBlackFire`).
  `acting.ts`: `actAs`, `actor()` record whose ground and shots they are.
- Looks: `fennexLook.ts` (Fen-Nex), `dev/modelGallery.ts` (the Galleries tab's bosses, bestiary and Dr. Jelly), `bestiaryLooks.ts` with `bestiaryBeasts.ts`, `bestiaryCreatures.ts`, `bestiaryElementals.ts`,
  `beastParts.ts`; fantasy looks in `fantasyFloor1.ts` to
  `fantasyFloor5.ts`, `fantasyWardlings.ts`, gathered in `FANTASY_LOOKS` (`fantasyLooks.ts`) with `MOVED_PARTS`, the parts each foe's behaviour moves (the
  `lookContract` hook checks every look keeps them). A foe's look is the fantasy look, else the bestiary look or
  `FOE_LOOKS` entry of its id (or `look`). Keep draw calls low: move small repeated parts together; pulse a glow, not a material's colour.
- Roles: templates' `R W H` are filled from the floor's `foes` on the room's seed; one elite a room at most; one
  pack a room at most (a wasp nest counts); quiet rooms get none. `callFoe` passes over waiters and packs.
- Damage (`combat/damage.ts`: `damageEnemy`, `killEnemy`, `hurtPlayer`, `crumble`, `bleed`): a blow carries a
  school (spells by theirs, burns Ember, shocks Storm, bolts by their statuses). +50% from a weakness, -50% from a
  resistance (`CFG.affinity`); elementals are healed by their own school and take double from their weakness.
- Mage afflictions (only when a blow lands): `player.dim`, `chill`, `stone`, drained mana, `pull`; each is a chip.

| Behaviour | Foe (placeholder name) | What it does | Counter |
| --- | --- | --- | --- |
| **Floor 1** | | | |
| `hopper` | sporeling (Spore Fiend) | Hops; bursts in stinging spores that dim sight | Fire |
| `flutter` | vesperMoth (Seraph Moth) | Loops, drawn to lit braziers and candles | Fire |
| `charger` | runeBeetle (Runehorn) | Charges in a line; plates part to throw a spark | Frost |
| `mimic` | urnMimic | Hides among urns, spits embers; `guard` halves blows | Frost |
| `dropper` | cryptSpider (Gloom Weaver) | Hangs on a thread, drops, spits webs | Fire burns webs |
| `splitter` | inkOctopus (Quill Kraken) | Leaves slowing ink; splits at half | Chill: shatters |
| `tome` | grimoireMimic | Shut book (`guard`); wakes to fly; may leave a page | Fire |
| `swarm` | fireflySwarm (Lampwyrms) | Pack of 5-7 sharing one mind | Arc leaps through |
| `singer` | choirLark (Caladrius) | Perches, sings: hastens foes round it | A hex silences it |
| `mantis` | stormMantis (Mantis Knight) | Parries the cantrip at its front, lunges | Frost; from behind |
| `crab` | rubbleCrab (Helm Hermit) | Hidden as rubble; its helm turns bolts | A blast flips it |
| **Floor 2** | | | |
| `leaper` | mireToad (Hoarfrost Toad) | Leaps; chill breath freezes water | Storm |
| `lurker` | cisternLurker (Kelpie) | Hidden under water, spits sparks | Freeze the pool |
| `drifter` | lanternJelly (Reliquary Medusa) | Drifts close; pulses light | Storm |
| `snail` | rimeSnail (Rime Crawler) | Rime trail freezes water; shell `guard` | Fire cracks it |
| `newt` | glassNewt (Glass Wyrm) | Hidden in water, lunges, bite chills | Shock or freeze pool |
| `serpent` | brineSerpent | Rises from a pool, fans of brine, sinks | Freeze the pool |
| `wave` | puddleElemental | Pours water as it walks, rears into a ring | Chill, then shock |
| `cloud` | thunderhead | Gathers over the mage, rains sparks | Frost |
| `darter` | stormDarter (Spark Wyvern) | Dashes wall to wall laying sparks | Chill hangs it |
| `mine` | puffcap | Swells and bursts in stinging spores | Fire pops it early |
| **Floor 3** | | | |
| `scurrier` | cinderSalamander | Scurries, leaves burning ground | Frost |
| `blinker` | hexImp | Blinks about; its hex shot drains mana | Storm |
| `drake` | rimeDrakeling (elite) | Breath, flight, a frost ring | Ember |
| `nest`, `wasp` | waspNest, emberWasp | A wall nest lets wasps out; only fire harms it | Fire |
| `djinn` | cinderDjinn | Lights braziers, hurls fire, mends in a lit one | Frost snuffs it |
| `ooze` | magmaOoze | Burning trail; splits (`halve`) | Chill: rock, then a blow |
| `phoenix` | phoenix (elite) | Dives in burning lines; rises from `ashes` once | Frost or blast ashes |
| `basilisk` | basilisk | Sweeping stare slows the mage; tall things block it | Holy light |
| `bodyguard` | saltGolem | Stands between the mage and the nearest foe | Fire slows it |
| `breaker` | rubbleGolem, rubbleStone | Slams bring rocks down; breaks into stones | A blast |
| **Floor 4** | | | |
| `scamper` | wickmouse (Candle Kobold) | Cover to cover, a dart; its candle falls burning | Frost |
| `chimer` | chimeBat (Bell Fiend) | A closing ring marks the mage's spot, a spark strikes | Frost |
| `gargoyle` | gargoyleWhelp | Stone turns most of a blow; two pounces | Storm |
| `healer` | moonstagFawn (Pale Unicorn) | Keeps off, heals hurt foes (a boss a little) | Umbral; `canHeal` |
| `griffin` | griffin (elite) | Soars hidden, marks a line, swoops, buffets | A hex grounds it |
| `eye` | radiantEye | Shut `guard`, then a ray where the mage stood | A hex shuts it |
| `harpy` | harpy | Perches high; screech moves glyphs, turns bolts | Frost |
| `magnet` | lodestoneGolem | Draws the mage, bends bolts | Frost stops the pull |
| `hearth` | hearthGolem (elite) | Lit `guard`, throws coals, stokes at braziers | Frost puts it out |
| `shade` | shadowFox | Shadow to shadow (`inShadow`) | Lit props; holy light |
| `roller` | rimeScarab (Frost Scarab) | Pushes a growing ball, thrown to burst cold | Fire melts it |
| **Floor 5** | | | |
| `burrower` | rootling (Mandrake) | A mound under the floor bursts up under the mage | Fire keeps it up |
| `glider` | stormRay (Sky Ray) | Long passes laying arming sparks | Frost |
| `absorber` | voidMote (Void Maw) | Swallows the cantrip, spills it back as a ring | Spells hurt it |
| `shell` | lanternTortoise (elite) | Hides, spins off walls, lies dizzy | Storm |
| `glacier` | glacierGolem (elite) | Front turns blows; ice spikes in lines | Chill, then shock |
| `hydra` | hydra (elite) | Heads in a `WeakMap`; a cut head regrows as two | Fire sears the stump |
| `raven` | gloomRaven | Gloom disc dims sight; hexing shots | Lights drive it off |
| `wolf` | rimeWolf (Rime Warg) | Pack rings and lunges by turns; howl hastens | Fire scatters them |
| `pangolin` | dustPangolin (Tarasque) | Rolls; the cantrip glances off | A wall dazes it |
| `kiter` | frostJackalope | Bounds away, stamps shards and rime | Burning ground |
| `manticore` | manticore | Tail volleys of hexing spikes, a pounce | Holy light stills it |
| **Floor 0** | | | |
| `wardling` | wardEmber to wardVerdant (six) | Ward cores a drinking ward lets out | Their weakness |

`rotling` is a plain test foe (`CFG.enemy`); `CFG.enemy.dummy` (the training dummy) never falls.

To add a foe: an entry in `data/foes.json` and in its floor's `foes` weights, a look, a name in `STR.options` or
`STR.bestiary`, a behaviour in `BEHAVIOURS` (or its floor's `bestiaryFloorN.ts`) if new, a counter line in
`STR.foes.counterLines` and a `counter(e, kind)` call where the counter happens. The dev menu lists it from data.

- Champions: a foe may wear a school's mantle. Pure `mantleData.ts` (`pickMantle`, `stripsMantle`, `mantleImmune`);
  `mantles.ts` (`giveMantle` from `makeEnemy`, rolled in `spawnWave` by each floor's `mantles` weights; `unbind`,
  `shrugOff`, `mantleStruck`, `mantleFell`, `updateMantles`). An unbound champion takes x1.25; a champion's shots
  carry its mantle. Tuning `mantles`, `unbound` in `data/magic.json`. Dev: `__game.champion(kind, mantle)`.
- Foe ground: `foeGround.ts` (`groundPace`, `groundSlide`, `steerAround`, `groundHarm`): foes feel each other's
  ground, except their own kind's and school's. `CFG.foeGround`. Dev: `layGround(kind, x, z, by)`, `foeGround(i)`,
  `ground`, `burningGround`, `sparkGround`.
- Counters: lines in `STR.foes.counterLines`; pure `counterData.ts` (`countersOf`, `validateCounters`); a behaviour
  calls `counter(e, kind)` or `counterAt(...)` (`counters.ts`); found ones are kept by `bestiary.ts` and listed in
  the inventory's Foes tab. Dev: `findCounters()`.
- Pairs: rooms with two complementary foes: `pairs` in `data/floors.json`, `pairRoom`/`validatePairs`, placed in
  `buildRoom` (`room.pair`), its line in `STR.foes.pairs`. `CFG.pairs`.
- Wards: `wardShield.ts` (`wardFoe`, `drinkBlow`, `unwardFoe`): a foe's ward drinks spells that strike it, keeps
  statuses off and breaks into a Wardling. A vault's ward is under [Items](#items-and-economy).

## Bosses

`src/actors/bosses.ts` runs bosses (`BOSS_TYPES` in `config.ts`). Each floor draws one from its `boss.pool` in
`data/floors.json`, never one already met. Tuning `CFG.enemy.<boss>`; weakness and resistance are `weak`/`resist` in
`CFG.enemy` (`bossAff`). `onBossDead` (`flow.ts`) pays insight, drops a grimoire page and raises the waystone. A boss
with `hidden` set cannot be hit and does not hurt on contact. Looks: `bossLooks.ts` (names the fights call) built in
`fantasyBosses.ts`; the Galleries tab stands every boss (`__game.bossLooks()`). `?boss=<id>` forces one.

| Boss | Id | Fight |
| --- | --- | --- |
| Hollow Warden | `warden` | Floor 1. Wears the Owlbear; rings, summons, Hallow volleys. |
| Drowned Abbess | `abbess` | A cave olm under the floor, Frost (`updateAbbess`). |
| Pyre Knight | `pyre` | A hollow knight of fire, Ember; leaps (`updateKnight`). |
| Hallowed Hart | `hart` | Charges down a lit lane, turns spokes of light, stamps rings. |
| Deep Angler | `angler` | Lure pulls the mage in (`player.pull`); hexing volleys, rings. |
| War-Tiger | `tiger` | A statue until woken; claw fans, marked pounce; plates removed by `breakPlate`. |
| Pillar Dragon | `dragon` | `pillarDragon.ts`: instanced body on `dragonPath.ts` trails; coils round pillars. |
| Twin Guardians | `twins` | `twinGuardians.ts`: one strikes, one shields; one bar; the second to fall pays. |
| Jelly serpent | `serpent` | In no pool; the laboratory vat's boss (`jellySerpent.ts`); floods the room. |
| Kaelith | `kaelith` | The Seal's boss; see [The Seal](#the-seal-kaelith-daylight). |

The dragon is brought down by a glyph blast at its pillar's foot (`dragonBlast`) or a bell (`dragonBell`); a room
with fewer than three pillars raises its own. The boss bar's marks are `bossBarMarks` (`hud.ts`); each boss has its
music under `bosses` in `data/music.json`. To add a boss: an id in `BOSS_TYPES`, tuning, a look, an update function,
a pool entry, an `insight` value, music, a dev menu entry and a gallery entry.

## Magic

Six schools: Ember, Frost, Storm, Hallow, Umbral, Verdant (`School`, light in `SCHOOL_LIGHT`). The mage has a cantrip
(the focus's bolt, `combat/projectiles.ts`: `spawnBolt`, `updateBolts`, `strikeSolid`, `spawnShot`) and two spell
slots, Q and E.

### Spells and shapes

Spells are data in `data/spells.json` (17: school, shape, mana, cooldown, damage, statuses, params, colour, icon,
text, lore), read by pure `src/magic/spellData.ts` (`SHAPE_PARAMS` lists each shape's params, checked by the
validator). `spells.ts`: the slots (`player.spells`), `castSpell`, `updateMagic`, mana (`player.mana`,
`CFG.mana`; 3 mana per foe the cantrip puts to rest), `leaveRoomSpells`. Spells are refused in the shop; a cast short
of mana burns a soul mote. `cost.ts`: `slotDef`, `spellCost`, `spellCooldown`, `payment`, the one reader of a
slotted spell so runes apply everywhere. `shapes.ts`: `CAST` maps each shape to a function.

| Shape | Spell(s) | Leaves |
| --- | --- | --- |
| `beam` | Cinder Lance | A line of fire |
| `placed` | Pyre Seal | A seal and burning ground |
| `shotgun` | Rime Shards | Spell bolts (`fireSpellBolt`) |
| `wall` | Glacial Wall, Living Wall | Boxes in `room.barriers` (fire burns living wood) |
| `chain` | Arc | Leaps between foes |
| `self` | Static Mantle | `mantleShields` stops contact damage |
| `zone` | Consecrate, Pollen Cloud | Holy ground or pollen clouds |
| `smite` | Judgement | A pillar on the strongest foe |
| `orbit` | Wardlight | Motes that go with the mage and break shots |
| `bolt` | Hex Bolt | A hexing bolt |
| `grasp` | Grasp of the Grave, Thorn Snare | Hands from the floor |
| `mark` | The Ferryman's Toll | `toll` on a foe: mana for blows; `payToll` pays an obol |
| `lantern`, `harvest` | Lantern of Vigil, Soul Harvest | Granted by freed townspeople |

Looks: `spellFx.ts` (`boltLook`, `animateBolt`, `impactFx`, pooled `ringFx`/`strikeFx`, `lanceFx`, `sealFx`,
`iceColumn`, `mantleFx`; `hideSpellFx`; tuning `CFG.spellFx`) built from `render/arcane.ts`. `docs/effects.md` is the
style guide; `dev/effectOptions.ts` is the looping effect gallery (`__game.effectOptions(ids?)`).
To add one: a spell of a known shape is an entry in `data/spells.json` (the dev menu lists it). A new shape is a
function in `CAST`, params in `SHAPE_PARAMS`, a look in `spellFx.ts`. A new school needs a `SCHOOL_LIGHT` entry, a
`CFG.marks.rise` motion, a wheel spoke and reactions with every other school.

### Statuses and reactions

Statuses: Burn, Chill (with freeze), Shock, Sanctified, Hex, Root, Overgrown. Pure rules `status.ts` (`applyStatus`,
`REACTIONS`, `canAct`, `speedFactor`, `damageTakenMul`), tuning in `data/magic.json`. `statusFx.ts` carries them out
(`inflict(foe, status)`, burn damage, the shock's leap, `react`, `verdantReact`, `pollenClouds`). `REACTIONS` maps
each of the fifteen status pairs to a reaction; found ones are kept by `memory.ts` (`foundReaction`).

| Reaction | Pair | Effect |
| --- | --- | --- |
| Shatter, Overload | Chill + Shock, Burn + Shock | Burst damage; a chain |
| Eclipse, Blackfire | Sanctified + Hex, Burn + Hex | A black sun takes the foe out; fire that never goes out |
| Steam | Burn + Chill | A cloud: shooters shoot wide, targets hidden |
| Searing, Prism, Verdict | Burn, Chill, Shock + Sanctified | Ignores `guard`; splits the cantrip; lightning |
| Black Ice, Void Spark | Chill + Hex, Shock + Hex | Slippery ground (`blackIceAt`); leaps carrying a hex |
| Wildfire, Frostbloom, Pollen Spark, Bloom, Blight | Overgrown + Burn, Chill, Shock, Sanctified, Hex | Verdant's five |

Tile reactions: `overloadAt`, and `hexGround` in `shapes.ts` (a hex on holy ground); `tileReaction` raises the name.
`dev/reactionTest.ts` sets each off on dummies (`RECIPES`): dev menu "Reactions here", `__game.reaction(r)`, `reactions`,
`findReactions()`, `forgetReactions()`. To add one: a row in `REACTIONS`, its rule in `applyStatus`, its effect in
`react`, a name, text, sound and a recipe.

### Weaves

A weave is a spell striking what another left; a chain is a reaction's leavings met by a third school. Pure table
`weaves.ts` (`WEAVES`, `weaveOf`, `weavesOf`, `validateWeaves`), tuning `weaves` in `data/magic.json`, names in
`STR.weaves`. `weaveAt(id, x, z)` (`weaveFx.ts`) raises the name, sounds both schools and marks it found
(`foundWeave`). Weaves live where their spells do, in `shapes.ts` (`chainWeaves`, `steamCurtain`, `lanternFan`,
`boltOverGround`, `hexGround`, `refraction`); chains in `steam.ts` (`chargeSteam`), `bestiaryGround.ts`,
`pools.ts` and `statusFx.ts` (`endEclipse`); mechanisms join in (`blacken`, `runeReaction`, `sparkRing`).
`dev/weaveTest.ts` sets each up: dev menu "Weaves and chains here", `__game.weave(id)`, `weaves`, `findWeaves()`.
To add one: a row in `WEAVES`, tuning, a name and text, its hook, and a setup in `dev/weaveTest.ts`.

### Knowledge, the grimoire, marks, runes

- Knowledge: how well each spell is known, kept between runs. Pure `knowledge.ts` (stages seen, learned, used after
  `CFG.knowledge.usedCasts` casts, upgraded); stored by `memory.ts` in the save. `ui/spellPanel.ts` describes a spell
  at its stage (`spellSheet`, `reactionWheel`) for the panel over a grimoire page and the inventory's Spells tab.
  Dev: `__game.knowledge`, `know(id, stage)`, `forgetKnowledge()`, `learn(id, slot)`.
- Grimoire and library: `pages.ts` (`room.pages`: lectern, shelf or loose; `pageNear`, `answerPage`, `dropPage`,
  `maybeDropPage`); the panel over a page and its question are `ui/pagePanel.ts`. The library is a one-cell dead end on
  every floor. A page with both slots full asks through the panel door (`askPage`); given-up spells go to
  `G.run.forgotten` and libraries sell them back (`grimoire` in `data/loot.json`). Pure `pickPages`, `shelfPages` in
  `spellData.ts`. Dev: `page()`, `pages`, `forgotten`.
- Spell marks: the slotted spells at the hands with their state. Pure `marksData.ts` (`handState`, `attunedTo`,
  `circleOf`, `masteredSchools`); look `actors/spellMarks.ts` (`updateSpellMarks`, master's ring, attunement aura,
  knowledge circle); `CFG.marks`, `STR.marks`. Dev: Magic tab, `spellMarks`, `attune(school)`.
- Runes: `data/runes.json` (seven: Thrice, Reprise, Seeking, Wide, Quicken, Vein, Lasting; each fits by shape).
  Pure `runeData.ts` (`runedDef`, `reprisedDef`, `payment`, `canCarve`, `pickRune`); `runes.ts` (`carve`,
  `setSockets`, `unslot`, `dealRune`, `runeHere`, `addRune`); each slot has a socket (`player.sockets`) and a pouch
  (`player.runes`). A rune is a pickup (chances: `runes` in `data/loot.json` times a floor's `runes`); look
  `items/runeLooks.ts`; carved at the waystone. Dev: Magic tab Runes; `sockets`, `socket(slot, id, size)`,
  `runesAlways(on)`, `drop('rune', x, z, { rune })`.

Dev: dev menu Magic tab (spells into Q or E, mana, pages, reactions, weaves, boons, runes); `__game.learn`,
`cast(slot)`, `mana(n)`, `inflict({ chill: 1 })`, `shoot(x, z, dx, dz, o)`, `spellFx`.

## Artifacts, costumes, transformations

Artifacts (61 in `data/artifacts.json`: foci, passive, cursed): stats, effects, pools, colours, icons, a required
`lore` line and, for cursed ones, a `curse` price. Pure `items/artifactData.ts` (`computeStats`, picking, the
`Effect` and stat keys); game side `artifacts.ts` (pedestals, taking, focus swap, budget, `refreshStats`,
`cleanseArtifact`, `growth`). The mage's stats are `player.stats`, recomputed on every pickup; read those, not
`CFG.hero`, for anything artifacts change. `gives` hands over obols, keys or glyphs once.

Effects are carried out where they apply: the cantrip in `projectiles.ts`; companions in `combat/familiars.ts`;
economy hooks (`freeVault`, `ferryman`, `glyphWard`, `blastMul`, `graveLantern`, `pedlar`, `obolDamage`); magic hooks
(`spellDamageMul`, `killMana`, `thurible`, `witchKnot` in `spellCost`, `noRegen` in `updateMagic`). Looks:
`artifactLooks.ts`; HUD icons are rendered from them (`artifactIcons.ts`; a painted icon wins if `data/assets.json`
has one). To add an artifact: an entry in `data/artifacts.json` (stats or an `Effect`, `lore`, a `costume` decision),
a look in `artifactLooks.ts`, and for a new mechanic an `Effect` or stat key in `artifactData.ts` with its hook.
Dev: `__game.give(...ids)`, `artifactGallery()` (`dev/artifactGallery.ts`).

Costumes: an artifact's `costume` puts a piece on the mage. Pure `costumeData.ts` (slots head, face, shoulders,
back, hands, belt, feet, aura), fitting `costumeFit.ts`, game side `costume.ts` (`dress`, `fitCostumes`, `handAt`),
pieces `costumePieces.ts`. One piece per slot (the latest wins), hung from a rig bone; every focus is held in the
casting hand. Rule: every artifact decides how it shows: a `costume` (a built piece, or a spot for its own model) only
where logical to wear, `"none"` where not, or a line in `SHOWS_OTHERWISE`; the validator refuses an undecided
artifact. Dev: Costumes (Mage tab) with a close-up (`DEV.closeUp`); `__game.costume`, `held`, `wear(id)`.

Transformations: three artifacts of a `family` transform the mage (a look and a gift). Pure `transformData.ts`
(`TRANSFORMS`, `formed`, `validateFamilies`); `transforms.ts` (`updateTransforms`, `giftsFor`, `announce`); gifts in
`items/gifts.ts` (`cantripStruck`, `touched`, `blink` on Shift/RT, `pilgrimMap`, `floatLift`); looks
`transformPieces.ts` and `TRANSFORM_LOOKS`; `CFG.transform`. To add one: a row in `TRANSFORMS`, `family` tags, a look
in `TRANSFORM_LOOKS`, its gift's hook, its lines in `STR.transforms`. Dev: `__game.transforms`, `transform(id)`.

Azyrion's arc: four stages by artifacts held (every `CFG.arc.perLevels` levels count as one). `arcStage`,
`ARC_PIECES` (`costumeData.ts`), `items/arc.ts` (`arcNow`, `updateArc`), `actors/arcPieces.ts`, `CFG.arc`.
Dev: `DEV.arc`, `__game.arc`, `setArc(n)`.

Fen-Nex, the Rune Fox (Rune of Fen-Nex): `combat/fennex.ts`; keeps at the mage's heel, darts to bite, grows a stage
a floor from the floor it was bound on (`G.run.fennexFrom`), breathes Ember in its full shape. `__game.fennex`.

## Items and economy

- Currencies: obols, bone keys, blast glyphs. Loot tables `data/loot.json` (pure `items/loot.ts`; the economy is
  simulated in `tests/unit/loot.test.ts`).
- Pickups: `items/pickups.ts` (`spawnPickup`, `useItem`/`cantUse`, `giveResources`, coffers, warded and gilded
  chests); looks `pickupLooks.ts`. Hearts are not taken at full health, mana vials at full mana, soul motes past
  `CFG.souls.max`, a lodestone shard with spells ready and mana full (a message says why, once). While the mage knows
  no spell, an obol drops in place of a vial or shard. Obol faces: `items/obolFace.ts`; `__game.obolFace`.
- Glyphs (`combat/glyphs.ts`): chalked with Space or LT, set off by a fuse or the mage's bolts, chaining.
  `CFG.glyph`; `__game.blast(x, z)`.
- Soul motes (`items/souls.ts`): pale, black, hallowed in `player.souls`, drawn after the hearts and taking a hit
  before them (`guardHit`); black hexes the room as it goes; hallowed mends half a heart at a floor's end
  (`hallowedMend`); a floor's `souls` weights them. `__game.souls`, `soul('black')`.
- Merchant (`items/merchant.ts`: a bound shade, wares in ward circles; `layWare`, `refusal`; `ui/warePanel.ts`).
  Wandering Merchant (`items/wanderer.ts`: rides into a cleared ordinary room once a run; `CFG.wanderer`;
  `callWanderer()`). Tuning `CFG.merchant`.
- Vault (`world/vault.ts`): a warded door opened by a key or two blasts that wake a warden. `CFG.vault`.
- Secret rooms (`world/secret.ts`): a cell behind cracked walls that ring hollow to bolts and break to a blast; one
  per floor on top of the room count; `openSecret`. `CFG.secret`.
- Shrine (`world/shrine.ts`, floors 2 and 4): an offering stone per curse held; walking into one (10 obols) draws
  the curse out as a wisp that bolts only strike inside the circle; four strikes in 10 s cleanse the artifact,
  otherwise it flees back. `CFG.shrine`; `__game.cleanse()`, `rite`.
- Bargain (`world/bargain.ts`): in the shrine, a heart container for a boon of the school cast into its stone
  (`buildBargain`, `castIntoBargain`, `keepBargain`, `refuseBargain`; `room.bargain`). `CFG.bargain`;
  `__game.bargain`, `openBargain(school)`.
- Drinking ward (`magic/drinking.ts`, `CFG.ward`): a vault's ward drinks spells cast near it (`wardNear`,
  `drinkSpell`) and, full, bursts: the warden is a Wardling of the school it drank most. `__game.wards`.

## Alchemy

Potions, reagents, brewing. Pure `items/alchemyData.ts` over `data/alchemy.json` (potions with drink and throw
effects, reagents, recipes, `sources`, bottles; `validateAlchemy`, `bottlesFor`, `brew`, `reagentFor`, `pickPotion`).
Brews are kept between runs (`alchemyMemory.ts`, in the save). Tuning `CFG.alchemy`.
- Belt: `items/potions.ts` (`player.belt`, `player.reagents`, `addPotion`, `identify`, `usePotion`, `choosePotion`,
  `moveInBelt`; the HUD's belt is `ui/belt.ts`). R tapped drinks, held throws; F chooses. Effects on the mage:
  `potionFx.ts`. Throws: `potionThrow.ts` (`THROW`). Looks: `alchemyLooks.ts`.
- Reagents: `items/reagents.ts` (`foeReagent`, `objectReagent`; `G.run.reagents`; `DEV.reagents` always drops).
- Dr. Jelly's laboratory (floors 1 and 3; templates `lab_*`): `world/laboratory.ts` (`furnishLab`, `enterLab`,
  `checkLab`, `updateLab`, the vat: `vatStruck`, `breakOut`, `serpentFell`), `labLooks.ts`, Dr. Jelly `jellyLooks.ts`,
  what he hands over `jellyGives.ts`. The table's screen is `ui/alchemyTable.ts` (`#scrLab`: Brew, Dr. Jelly looks,
  Recipes); rules in `items/brewing.ts` (`brewNow`, `buyRecipe`, `jellyIdentifies`).
- Jelly serpent: `actors/jellySerpent.ts` (`buildSerpent`, `updateSerpent`, `pourJelly`), `serpentLooks.ts`. Jelly
  is a pool with `jelly` set (the "In jelly" chip). `CFG.enemy.serpent`.
- The Alchemist family (Satchel, Taster's Spoon, Cracked Retort, Leech Jar; gift `splitThrow`).
- Verdant, the sixth school: status Overgrown (`growSlow`), spells Thorn Snare, Pollen Cloud and Living Wall, five
  reactions, the `garden` theme (templates `garden_beds`, `garden_long`), the flowering plant, Bloom Petal.

Dev: Mage tab Alchemy, "Open the alchemy table here", `?potions=healing,hexBrew`, `?room=lab_plain`; `__game.belt`,
`givePotion(id)`, `giveReagent(id, n)`, `usePotion(how)`, `identifyAll()`, `lab`, `openLab(tab)`, `brew(a, b)`,
`buyRecipe(id)`, `serpent`, `crackVat()`, `breakVat()`.

## Progression

- Insight and levels: pure `progression/levelData.ts` (`levelFor`, `levelProgress`, `purseOf`, `clearInsight`,
  `bossInsight`, `levelAtFloor`, `LEVEL_CAP` 12), tuning `CFG.levels`. Game side `insight.ts` (`gainInsight`,
  `payClear`, `payBoss`, `paySerpent`, `potionUsed`; a foe's `e.purse` is paid by `killEnemy`; `ui/insightHud.ts` draws
  the HUD strip and level badge). Dev: `__game.insight`, `level`, `giveInsight(n)`, `setLevel(n)`.
- Attributes: Vigor, Arcana, Will, Swiftness. `attributes.ts` (`ATTRS`, `attrBonus`), `points.ts` (`spendPoint`),
  folded in by `computeStats`; `CFG.attributes`. Vigor's half containers make `maxHp` odd (half a heart).
- Boons: `data/boons.json` (eighteen: two per school, each taken twice, plus six general). Pure `boonData.ts`
  (`validateBoons`, `dealBoons`, `pledgeFor`, `boonTuning`, `statusMul`); `boons.ts` (`dealNow`, `takeBoon`, `boonRank`,
  `boonParam`); hooks ask `boonHooks.ts` (`boonMul`, `magicNow`, `boonActs`: a boon's name once a room, its line once a
  run). `CFG.boons`. The level-up screen `ui/levelUp.ts` (`#scrLevel`: three cards, then a point;
  `progression/levelGate.ts`' `checkLevelUp` opens it through the panel door once a fight is won). `DEV.autoLevel` is
  `'choose'` (`?autolevel=1`, the balance bot) or `'skip'` (`?autolevel=skip`, added by the browser tests). Dev: Magic
  tab Boons here (`dev/boonTest.ts`); `__game.boons`, `giveBoon(id)`, `offer`, `openLevelUp()`, `boonHere(id)`;
  `?boons=deepWinter:2`.
- The waystone: rises where a boss fell, in its own room beside the boss room on floors 1 to 5, which holds the way
  down. `world/waystone.ts` (`raiseWaystone`, `enterWaystone`, `castIntoStone`, `restAtStone`, `openWayDown`;
  `room.waystone`), look `waystoneLook`, screen `ui/waystone.ts` (`#scrStone`: Runes tab to carve and lift runes,
  take a pair, Second Socket; Belt tab). Templates `waystone_plain`, `waystone_cairns`. `CFG.waystone`. Dev: Rooms &
  runs, `?room=waystone_plain`; `__game.waystone`, `raiseWaystone`, `openWaystone(tab, slot)`, `wayDown`.

## The Seal, Kaelith, daylight

The Seal is a fixed floor of three rooms below floor 5 (templates `seal_stair`, `seal_last_hall`, `seal_kaelith`,
`fixed` in `special.json`, laid by `fixedPlan`). `world/seal.ts` (`atSeal`, `arriveAtSeal`, `enterSealRoom`: the
horde at the Last Hall), kit kinds `warded`/`scoria` walls and `sealstone` floor, its soundscape and piece `seal`,
lines `STR.seal`. Tests over every floor use `FLOORS.filter(f => !f.fixed)`. Dev: "To the Seal", `?floor=6`.

Kaelith: `actors/kaelith.ts` (`buildKaelith`, `updateKaelith`, `kaelithKneels`, `kaelithToPhase`, `shutAllWards`),
pure `kaelithData.ts` (`phaseOf`, `sealWards`), look `kaelithLooks.ts` (`wingedWatcher`). Three phases; its ward
pillars are `seal_kaelith`'s obelisks made dormant (`sealWard`, `wakeWard` in `mechanisms.ts`). `CFG.enemy.kaelith`,
`STR.bosses.kaelith`. Dev: "Kaelith's fight", `?boss=kaelith`; `__game.kaelith`, `kaelithToPhase(n)`.

Daylight: when Kaelith falls the way out is a shaft of light (`G.floor.trapdoor.kind === 'shaft'`). `world/daylight.ts`
(`openShaft`, `enterDaylight`, `updateDaylight`, `leaveDaylight`; state `daylight`; `body.daylight` hides the HUD;
`daylightHooks.done` calls `endGame(true)`), looks `daylightLooks.ts` (`shaftLook`, `buildVista`), pure
`daylightData.ts`, `CFG.daylight`, light `setDaylight`, piece `daylight`, soundscape `rooms.daylight`, text
`STR.end`. Dev: "Daylight now"; `__game.daylight`, `daylightNow()`.

## The Vigil

The hub between runs, at the cave mouth: the mage wakes there after every run. It has a lectern, a boat that starts
a run, six barred ways, and townspeople who are the shades freed in runs. Dust and obols are carried home.

- Save: pure `vigil/vigilData.ts` (`VigilSave`, `migrate` over `LEGACY_KEYS`, `validate`, `dustFor`, `obolsHome`;
  `CFG.vigil`) and `save.ts`: one record `ossuary.vigil` (`readSlot`/`writeSlot` for knowledge, bestiary, reactions,
  weaves, recipes; `recordRun` from `endGame`; `exportSave`/`importSave` from the pause menu; `giveHome`, `wipeSave`).
  Settings keep their own keys. Dev: "The keeping"; `__game.vigil`, `giveHome(d, o)`, `wipeSave()`, `veteranSave()`.
- Place: `data/vigil.json` (rooms laid by hand, room type `vigil`: no foes, no loot, doors open; pieces, barred
  ways, the circle, where the mage wakes, `town` spots, its own `look`) and `data/templates/vigil.json`, checked by
  pure `vigilMap.ts` (`VIGIL`, `vigilPlan`, `validateVigil`). Built by `flow.ts`'s `buildVigil`, furnished by `place.ts`
  (`furnishVigil`, `updateVigil`, `openWay`), looks `vigilLooks.ts`; `where.ts` has `atVigil()` and `hearLanding`.
  `flow.ts`'s `begin()` wakes the mage there (`wakeAtVigil`); the lectern `ui/lectern.ts` chooses the hands.
  Kit kinds `cryptstone` walls, `slabs` floor. `CFG.vigil.place`, `STR.vigil`. Dev: "The Vigil", `?vigil=1`,
  `?vigil=first`; `__game.vigilPlace`, `toVigil(first)`, `openLectern`, `takeBoat()`.
- Chained shades: `data/shades.json` (ten shades) plus each floor's `shade` chance. Pure `shadeData.ts` (`pickShade`,
  `shadeRoom`, `chainSchools`, `breaks`); `shades.ts` (`placeShade` from `buildFloor`; chains break when their
  school lands: `shadeStruck`, `landed`; `answerShade`: Q frees, E binds). A freed shade goes to the Vigil (a candle
  lit, 20 Dust); a bound one helps the next run (`shadeHelp.ts`, `walking.ts`). Looks `shadeLooks.ts`; `CFG.shades`,
  `CFG.shadeHelp`. Dev: "Chained shades"; `__game.shade`, `shadeHere(id)`, `freeShade()`, `bindShade()`.
- Townspeople and dialogue: the freed stand round the Nave; `town.ts` stands them (`townLooks.ts` figures), opens a
  talk when the mage walks up, glints while one has news, builds what the talk knows (`talkContext`), has the
  Ferryman speak at the jetty. Lines are `data/dialogue.json` (speakers, moments `first/death/won/boss/idle/reply/
  gift`, `when` conditions, `fill`, two choices that set flags), pure `dialogueData.ts` (`pickLine`, `holds`,
  `validateDialogue`); the save keeps `heard` and `flags`. Panel `ui/talk.ts` (`#scrTalk`; the game waits).
  `STR.town`. Dev: "Townspeople"; `__game.town`, `talkTo(id, moment)`, `say(i)`, `setFlag(k, v)`, `forgetHeard`.
- Gifts, bonds, powers: `data/townsfolk.json` (each one's `gift` and `second`, `bonds` costs, six `powers`, three
  `quests`, six `disciplines`), pure `giftData.ts` (`startOf`, `giftsInForce`, `questMet`, `bondCost`,
  `blessingOf`), `gifts.ts` (`giftOnFree`, `giftsAtStart`, `offersFor`/`actOn`, `questState`). Powers add mana and
  hearts through `growth` in `artifacts.ts`. `lantern_of_vigil` and `soul_harvest` stay out of libraries until their
  townsperson is freed (`givenBy`, `inPool`). `STR.gifts`. Dev: "Gifts, bonds and powers"; `__game.gifts`,
  `givePower(id, owned)`, `bondTo(who, n)`, `questTo(who, state)`.
- The unfolding: six rooms behind barred ways (Cave Mouth: Ember; candle chapel: Hallow; scrying pool: Storm;
  echoes' gallery: Umbral; garden of the dead: Verdant; practice crypt: Frost). A way opens when its school lands
  near it (`openWay`). `unfold.ts` (`furnishUnfold`, `updateUnfold`, looks `unfoldLooks.ts`): the Cave Mouth's vista
  fills with what the freed build; the chapel's candles give a blessing for one descent (`lightBlessing`,
  `G.run.blessing`); the garden's beds give a reagent each descent (`chooseGarden`). `CFG.vigil.unfold`. Dev: "The
  unfolding"; `__game.unfold`, `openPart(school)`, `setParts(schools)`.
- Made figures: thirteen Tripo models (ten townspeople, the Ferryman, Dr. Jelly, Kaelith; Mixamo rig) animated by
  `tools/creatures/townsfolk.ts` (`idle`, `talk`; Jelly's `give`, Kaelith's `sweep` and `kneel`). `madeModel(id,
  still)` in `madeCreatures.ts` dresses one; `town.ts` stands them on the fine layer (`markFine`), with code
  figures as the fallback. The Townspeople's "wear" button switches (`setTownWear`); their gallery is
  `dev/townGallery.ts`.

Not built: the Great Circle (vows, gifts, omens), the Ferryman's crossing as the way down, echoes of past runs,
the grimoire and bestiary rooms (`docs/M7-plan.md`).

## Rendering

### Pixel look

`render/pixelLook.ts` (`CFG.pixelLook`): a game pixel is one of the room kit's texels (`texelPixel`: a 48th of a
unit; about 420 rows in a one-cell room, `drawnRows()`). Three passes: the scene into a grid target (with depth), the
grid shaded at its own size (`shade`: outlines from depth, light in bands), and a sharp blow-up to the window
(`blit`: equal pixels, edges blended over one screen pixel, the camera's part-pixel put back so it glides). The scene
is tone-mapped by its own shaders; the HUD stays sharp. `draw()` in `render/renderer.ts` picks the path and counts
draw calls over all passes.

The fine layer (`FINE`, layer 1) is drawn into its own target at `CFG.pixelLook.fineLayer` pixels to a game pixel
and laid over the window after the blow-up (`drawFine`): coin faces and the made Vigil figures only. The blow-up
stays free of it (software renderers pay for every shader line).

The floor's grade (`grade` in a floor's look, data/floors.json; `setGrade`, called by `applyFloorLook`): the shade
pass and the fine layer lean the darks toward the floor's shadow colour and lift black toward it (art bible 4.2). A
floor without one is drawn as it is; the dawn outside clears it. The floor's `light.fill` scales the fill and the
moonlight (`lightState.fill`). The grade's `ink` draws the outlines toward a near black tinted by the shadow colour,
and its `gap` sets how far a nearer surface must stand before a farther one to be outlined (art bible 4.4). A floor's
`materials` recolours the room kit's shared materials (`MAT`) and the objects' colours (`C`) by name, before its rooms
are built (`applyKitColours`, world/kitColours.ts). Dev: `__game.grade`, `lightLevels().fill`; the Look tab's readout under the pixel look.

Everything else stays pixel art by: the mage's texture baked into vertex colours (`actors/heroPixel.ts`, cut to
`CFG.heroPixel.colours` by pure `render/palette.ts`), stepped glows and shadows (`glowTex`, `shadowTex`), and 24 px
artifact icons (`toIcon`). Dev: `__game.pixelLook`, `setPixelLook({ lines, outline, bands })`, `pixelRows`,
`renderInfo()` (draw calls, triangles, geometries, textures); Look tab; `DEV.fps` frame readout (`dev/frameInfo.ts`).

### Room kit

Everything in a room is drawn in code in the floor's colours.
- `render/pixelTextures.ts`: floors (`PAVING`) and walls (`WALLS`) drawn texel by texel (`CFG.roomKit.texel`), in the
  kinds the room drew; a made floor tile (data/assets.json) paints the floor instead (`floorTexture` in `textures.ts`),
  and a look's made wall face for a kind (`walls.<look>.<kind>`, `wallTile` in `assets/models.ts`, made by
  `tools/art/walltile.py` at the texel in the floor's colours) takes the place of the drawn one (`wallMaterials` in
  `materials.ts`, `pixelWallTexture`); the look's stains are laid on either.
  `textures.ts`: special rooms' marks (`drawMarks`) and stepped glows.
- Variety: each floor's `look.kit` lists weighted kinds of wall, floor, torch and brazier; each room draws one of
  each on its seed (`pickKinds` in pure `world/kitData.ts`, into `room.look.kinds`); a theme may pin some. Dev:
  Look tab steps each kind (`DEV.kitKinds`); `__game.kinds`, `forceKinds({ wall: 'ashlar' })`.
- Fire: `render/fire.ts` (`makeFire`: layered flames and embers moved on the GPU by `tickFire`);
  `world/fireLooks.ts` (`TORCHES`, `BRAZIERS`, `candleStandLook`).
- Pieces: `kitParts.ts` (painted materials, `mesh`, `joinAll`, `taperTube`), `materials.ts` (`mergeStill`),
  `objectLooks.ts`, `mechLooks.ts`, `wallLooks.ts`, `specialLooks.ts`, `pickupLooks.ts`, `artifactLooks.ts`,
  `alchemyLooks.ts`. Foes and bosses merge through `render/rig.ts` (`mergeRig`).
- Lights: `render/lights.ts` (`CFG.lights`; physically based, decay exponent 0.5).
- Dev: Look tab "Objects here", "Drops here", "Fire objects here"; `__game.objectsHere()`, `dropsHere()`.

### The mage

`public/assets/hero_default.glb` (65-bone Mixamo-style rig). `actors/hero.ts` (`setHero`, `heroVisual`, `prepareHero`
normalises any GLB to 1.3 units tall, feet on the floor), `heroAnim.ts` (`updateHeroAnim`: lower body idle/run by
speed, upper body base/cast/hit, death overrides; `castWindow` replays the fastest forward thrust of the cast clip
as a 0.6 s window per shot). `clipRoles.ts` and `baseDetect.ts` (pure) match clip names and detect hips offset and
round bases; `tools/prepare-asset.ts` shares them. Clips: `standing_relax`, `run`, `walk`, `cast_a_spell`,
`hit_to_body_01`, `fall`, `defeat_03`, `Drink Potion`, `Eat`. A GLB dropped on the window swaps the hero.
`CFG.hero`.

### Made assets and Tripo creatures

- Made assets: `data/assets.json` holds budgets per kind and which file replaces which placeholder (props,
  artifacts, floor tiles, wall faces, icons, coins, models); pure `assets/assetData.ts`; `assets/models.ts` loads them at boot
  (hooks `modelFor`, `floorTile`, `wallTile`, `iconUrl`); a missing file leaves the placeholder. `tools/make-standins.ts` makes
  the test stand-ins. `docs/assets.md` has the house style, budgets and log. `?assets=off` keeps placeholders.
  Dev: Made assets section; `__game.assets`, `useAssets(false)`, `showAssets()`.
- Tripo creatures animated in code (guide: `docs/creatures.md`): `tools/animate-creature.ts` simplifies the mesh to
  its budget, turns inside-out patches outward, rebinds the skin (`reskin` in `creatureRig.ts`), bakes the recipe's
  clips (`tools/creatures/<id>.ts`: owlbear, dragonling, chameleon, townsfolk), pads texture islands and writes
  `public/assets/creatures/<id>.glb` plus clip data in `data/creatures.json`. In the game `actors/madeCreatures.ts`
  dresses one in the pixel-art look (`madeModel`, for any use); `dev/creatureGallery.ts` stands one to look at. Sounds: `audio/creatureSounds.ts`
  (`Sfx.place(x, z)`) and WAVs listed in `data/sounds.json` (`soundData.ts`, `samples.ts`). Dev: Galleries Animated
  creatures; `__game.showCreature(id)`, `creatures`, `roarNow()`, `soundFiles()`.
- Texel bake: `tools/texel-bake.ts` (run by `animate-creature` and `prepare-asset`) shrinks a model's texture to one
  texel a game pixel within each UV island, keeps glowing markings, lifts painted shadows, cuts it to a palette (pure
  `render/texelBake.ts`, `CFG.creatures.texel`) into `<file>.texel.png` and `<file>.glow.png`;
  `actors/texturePixel.ts` (`wearTexel`) wears them. A unit test fails for a model without them.

## Audio

All sound is synthesised in code, except creature WAV files.
- `audio/sfx.ts` (`Sfx`): effects and interface buses (`UI_SOUNDS`), music and ambience buses, under a master;
  sliders in the pause menu. Play an effect where it happens with `Sfx.at(x, z).blast()` (panned from the mage,
  quieter further off). New sounds go in `sounds`, in their school's palette for magic. `synth.ts`: the instruments.
- Soundscapes: `data/ambience.json` (each floor's space, bed and one-shots; rooms and themes over them), pure
  `ambienceData.ts`, played by `ambience.ts` (`AmbienceMix`, `ScapePlayer`); one-shots in `ambienceShots.ts`
  (`SHOTS`, `SHOT_KINDS`).
- Music: `data/music.json` (pieces per floor and title, moods' stem levels, `bosses`), composed by pure
  `musicData.ts` (`planBar`, `phrase`), played by `music.ts` (`MusicPlayer`: stems, moods, `stinger`).
- `audio/director.ts` (`updateAudio` from the loop) chooses soundscape and piece from the game state (floor, room,
  doors locked, a boss alive, `CFG.audio.lowHp`, Vigil, daylight). Off under `window.__manual` until `audioOn()`.
- Offline: `audio/render.ts` and `npm run render-audio`. `docs/archive/sound-plan.md` has the design.

Tuning `CFG.audio`. Dev: Sound tab (any soundscape, any piece in any mood, stingers, a 40 s WAV); `__game.audio`,
`forceAudio(f)`, `audioOn()`. To add one: a one-shot is a kind in `SHOT_KINDS` plus a recipe in `SHOTS`; a piece or
soundscape an entry in `data/music.json` or `data/ambience.json`; an effect an entry in `sounds`.

## UI

HTML/CSS over the canvas (`index.html`, `src/style.css`).
- HUD `ui/hud.ts`: hearts, mana bar and slots (`renderSpells`), resources, soul motes, boss bar, banners,
  `showPrompt`, the minimap (`renderMinimap`; finished rooms are drawn darker with a tick, `roomFinished`). The potion
  belt `#belt` is `ui/belt.ts`; the insight strip and level badge `ui/insightHud.ts`; the Vigil's `#vigilHud`
  `ui/vigilHud.ts`; the dawn flash `ui/dawn.ts`. The icons they draw are `render/icons.ts`.
- Afflictions `ui/afflictions.ts`: chips beside the mana bar with a first-time line each (`STR.afflict`). A new
  affliction gets a chip, a colour and a line there.
- Screens `ui/screens.ts`: title, pause, death, end (`showEndScreen`: obols found, level, "Replay this seed"), shown on
  flow's events (`paused`, `resumed`, `screensClosed`, `runEnded`).
- Lore cards `ui/lore.ts` (`showLore`): picking something up shows its icon, name, kind, effect and lore for 4 to 6 s
  (`CFG.lore`). Artifacts every time (`lore` is required), items and containers the first time in a run
  (`STR.lore.items`). Anything new the mage can take gets lore.
- Inventory `ui/inventory.ts` (I or Tab, View, or the pause menu; pauses the game): tabs for artifacts, spells (slots,
  runes, a book by school, the reaction wheel), potions, items, the mage's numbers (growth, boons) and the foes met
  (`foeEntries`). Arrows choose, Q/E (LB/RB) change tabs. Anything new the mage can carry gets a tab or a place in one.
- Panels: `spellPanel.ts`, `warePanel.ts`, `levelUp.ts`, `waystone.ts`, `alchemyTable.ts`, `lectern.ts`, `talk.ts`.
  Open menus take keys first (routed in `main.ts`).
- Dev menu `dev/menu.ts` (the key left of 1, or F2; it pauses the game). Seven tabs (`TABS`, `DEV_STR.tabs`): Mage,
  Magic, Foes & objects, Rooms & runs, Look, Galleries, Sound. It does by buttons what the dev hooks do (heal, god
  mode `DEV.god`, resources, drops, artifacts, foes, test rooms, boss fights, new runs, spells, mana). Lists come
  from data, so new artifacts, spells, drops, room types and bosses appear by themselves; a new kind of thing needs
  a button or a line in `refresh()` in the tab it belongs to, and a new room type a name in `DEV_STR.roomNames`. The
  menu uses public APIs and `DEV`, never the reverse; the game reaches it only through the door (`devDoor.ts`).
- Dev board: `tools/devboard/` (see [Tools](#tools)).

## Events and the panel door

The simulation (world, actors, magic, items, combat, progression, vigil, `flow.ts`, `loop.ts`, `state.ts`) imports
nothing from `src/ui/`; ESLint's `no-restricted-imports` (`tools/lint/config.js`) fails the lint if it does. `main.ts`
(boot) and `src/dev/` may import anything. The UI reaches the game freely. Four ways connect them:

- **Events** (`src/events.ts`): a typed bus, `emit(name, payload)` and `on(name, fn)` over `GameEvents`. It is
  synchronous: `emit` calls every listener at once, in the order they were added, before it returns, so a notification
  lands at the same moment and in the same order as a direct call would. The UI subscribes in its `init*` functions,
  which `main.ts`'s `wireUi()` calls first thing at boot.
- **`src/notify.ts`**: the simulation's notifications under the UI's old names (`toast`, `line`, `banner`,
  `renderHearts`, `showLore`...), each a one-line emitter carrying exactly its arguments. Defaults stay in the UI.
- **The panel door** (`src/panels.ts`, like `devDoor.ts`): what the game opens or asks of the UI, no-ops until
  `main.ts` registers the panels. `UI` holds what the UI writes and the game reads (`labOpen`, `waystoneOpen`,
  `levelOpen`, `talking`), as `DEV` does for dev code.
- **Hook slots**: `uiHooks` in `loop.ts` (`panels(page, live)` mid-step where the page and ware panels update,
  `endOfStep(dt)` before the sound for the HUD, the affliction chips and the lore card's time, `afterDraw()` for the
  vision mask) and `vigilUi.step(dt)` in `vigil/place.ts` (the Vigil's HUD and a talk's line written out); `main.ts`
  fills them.

| Event | Payload | Emitted by | Heard by |
| --- | --- | --- | --- |
| `toast`, `line` | `{ msg, dur? }` | notify (everywhere) | `ui/hud.ts` |
| `linesCleared` | none | notify (flow, daylight, laboratory) | `ui/hud.ts` |
| `banner` | `{ title, sub?, dur? }` | notify | `ui/hud.ts` |
| `heartsChanged`, `heartsReset` | none | notify | `ui/hud.ts` |
| `mapChanged`, `spellsChanged`, `purseChanged`, `itemsChanged` | none | notify | `ui/hud.ts` |
| `castRefused` | `{ slot, why }` | notify (`magic/spells.ts`) | `ui/hud.ts` |
| `hurt` | none | notify (`combat/damage.ts`) | `ui/hud.ts` |
| `bossBarShown`, `bossHealth`, `bossBarHidden`, `bossBarMarks` | `{ name, foe }`, `{ foe }`, none, `{ at }` | notify | `ui/hud.ts` |
| `promptShown`, `promptHidden` | `{ html }`, none | notify (`vigil/shades.ts`; pages hide theirs) | `ui/hud.ts` |
| `fadeFromBlack` | none | notify (flow) | `ui/hud.ts` |
| `manaHexed` | none | `magic/hex.ts` | `ui/hud.ts` |
| `loreShown`, `artifactLore`, `itemLore`, `loreHidden` | `{ entry }`, `{ def }`, `{ item }`, none | notify (`itemLore` keeps `G.run.loreSeen`) | `ui/lore.ts` |
| `pagesCleared` | none | `magic/pages.ts` | `ui/pagePanel.ts` |
| `beltChanged` | none | notify (`items/potions.ts`, flow) | `ui/belt.ts` |
| `insightChanged`, `insightReset` | none | notify (progression), `progression/insight.ts` | `ui/insightHud.ts` |
| `atVigil`, `vigilLeft` | `{ on }`, none | `vigil/where.ts`, `vigil/place.ts` | `ui/vigilHud.ts` |
| `dawn`, `daylightGone` | none | `world/daylight.ts` | `ui/dawn.ts` |
| `paused`, `resumed`, `screensClosed`, `runEnded`, `soundToggled` | none, none, none, `{ summary }`, `{ muted }` | `flow.ts` | `ui/screens.ts` |
| `afflictionsReset` | none | `flow.ts` | `ui/afflictions.ts` |

| Panel door call | Opens or answers | UI side |
| --- | --- | --- |
| `openLab(tab)`, `closeLab()` | The alchemy table (`world/laboratory.ts`) | `ui/alchemyTable.ts` |
| `openWaystone(tab, slot?)` | The waystone's screen (`world/waystone.ts`) | `ui/waystone.ts` |
| `openBargain(school)` | The shrine's deal; false if another screen holds it (`world/bargain.ts`) | `ui/levelUp.ts` |
| `openTalk(...)`, `closeTalk()` | A townsperson's talk (`vigil/town.ts`, `vigil/place.ts`) | `ui/talk.ts` |
| `openLevelUp()` | The level-up screen (`progression/levelGate.ts`) | `ui/levelUp.ts` |
| `askPage(spell)` | A full hand's question at a page (`magic/pages.ts`); the answer is a spell key (`answerPage`) | `ui/pagePanel.ts` |
| `otherScreenUp()` | Whether another screen is up, which a level waits for | `main.ts` |

The flow's own back-edges are cut the same way: `flowHooks.ts` (filled by `flow.ts`) for the mage's step, the foes and
damage; `clock.ts` for the loop's clock that `resume()` restarts. A new notification is a `GameEvents` entry, an emitter
(in `notify.ts` when it keeps a UI name) and an `on` in the UI's `init*`; a new screen the game opens goes on the door.

## Input

`input/index.ts` (the shared `pressed` state, `InputActions`, `inputFx`), `keyboard.ts`, `gamepad.ts`, `touch.ts`
(frozen), `devKey.ts`.

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move (eight directions) | WASD | Left stick |
| Cast the cantrip (four directions) | Arrow keys (latest sets the direction) | Right stick or face buttons |
| Spell slots | Q, E | LB, RB |
| Blast glyph, blink | Space, Shift | LT, RT |
| Potion: tap drinks, hold throws | R (F chooses) | D-pad up (left/right choose) |
| Inventory | I or Tab | View |
| Pause, sound, dev menu | Esc or P, M, key left of 1 or F2 | Start |

Every connected pad is read together (sticks from the one pushed furthest, buttons from any). A begins from the
title as Start does and drives the level-up screen and the alchemy table (`MENU_BUTTONS`); `initGamepad` says by name
when the browser first reports a pad (`STR.pad`). Dev: `__game.pads`, the dev menu's Gamepads (Rooms & runs).

## Tools

`npm run <script>`; code in `tools/`.

| Script | Purpose (code in `tools/`) |
| --- | --- |
| `dev`, `build`, `typecheck`, `test`, `test:unit`, `test:e2e`, `test:fast` | Vite server; build; Vitest and Playwright (`test:fast`: the browser tests tagged `@fast`). |
| `lint`, `lint:install`, `format`, `format:check` | ESLint (type-checked rules); its own install; Prettier. |
| `prepare-asset`, `prepare-texture`, `prepare-sound` | Prepare GLBs, tiles, icons, coin faces, WAVs. |
| `animate-creature`, `texel-bake` | Rig and clips for a Tripo creature; pixel-art texture. |
| `creature-preview`, `foe-sheet` | Render a creature video; contact sheets of boss looks. |
| `balance` | Bot fighting each foe (`docs/balance.md`) or whole floors (`-- runs`). |
| `inspect` | `inspect-rooms.ts`: shoots rooms; flags errors, hidden mage, dark rooms. |
| `render-audio`, `review-checks`, `milestone` | Offline audio; diff checks; GitHub milestones. |
| `devboard`, `devboard:selftest` | The content dev board (`tools/devboard/`). |
| (none; Python and `npx tsx`) | `tools/art/`: R3's art tools, the bake, pixelize to a floor's ramps, rooms at the game pixel (`tools/art/README.md`). |

Dev board: `npm run devboard` serves http://127.0.0.1:8770, a local page to browse, create, edit and delete the
content in `data/`, validated by the game's own validators after every save. A new kind of content in `data/` gets
an entry in `tools/devboard/kinds.ts` and a validator in `validate.ts`; `npm run devboard:selftest` must pass when
the board changes. See `tools/devboard/README.md`.

Lint and format: Prettier (`.prettierrc.json`: 120 columns, single quotes) formats every `.ts` and `.js` file, not
`data/` (the dev board writes that JSON itself) nor the docs. ESLint runs typescript-eslint's type-checked rules
(`tools/lint/config.js`; the root `eslint.config.js` points at it). It lives in its own package, `tools/lint/`, with
TypeScript 6: typescript-eslint needs TypeScript's JS API, which TypeScript 7 (the typecheck and build) no longer
ships. Install it once with `npm run lint:install`. Unused names are left to the typecheck. A formatting-only commit
goes into `.git-blame-ignore-revs` once it is on `main` (a rebase-merge gives it a new hash).

Agents and skills (`.claude/`): subagents `rules-reviewer` (before opening a PR) and `room-inspector` (after changes
to how rooms look); skills `ship`, `tripo-prompts`, `game-dev-board`. CI is `.github/workflows/deploy.yml`: `build`
(typecheck, unit tests, build), `lint` (format check and ESLint) and three Playwright shards; on `main` the Pages
deploy waits for `build` only.

## Testing

- Unit: `npm run test:unit` (Vitest, `tests/unit/*.test.ts`): generator rules on hundreds of seeds, every template
  and data file validated, pure rules for statuses, weaves, runes, boons, loot, dialogue, the save, texel bake.
  Anything pure gets a unit test.
- Browser: `npm run test:e2e` (Playwright, `tests/e2e/`, `fullyParallel`; 148 tests). Software WebGL; set `PW_CHROMIUM`
  to a Chromium binary where Playwright's is not installed. Tests drive the game through `window.__game` and
  `window.__manual`.
- The browser files, one a system: `core-run`, `pickups-and-loot`, `spells`, `statuses-and-reactions`, `runes`,
  `artifacts`, `mage-look`, `potions-and-alchemy`, `foes-floor1` to `foes-floor5`, `foes-common`, `bosses`, `rooms`,
  `special-rooms`, `progression`, `vigil`, `ui-and-input`, `audio`, `room-kit`, `look-and-assets` (each `.spec.ts`).
  A new test goes in its system's file; a title says what is tested, never a milestone, a date or a doc.
- `tests/e2e/helpers.ts`: `start(page, query)` (collects console errors, sets `__manual` and the seeded `Math.random`,
  adds `?autolevel=skip`, waits for the title and the rigged hero, presses Start, installs the auto-player `__fight`),
  `SEEDED_RANDOM`, the views of `__game` the tests read (`GameHooks`, `RoomView`, `Foe`, `W`) and the hook types several
  files share (`G5` to `G14`, `GP`, ...).
- Deterministic: `start()` replaces `Math.random` in the test browser with a fixed stream before the page loads (the
  game keeps it unseeded for combat and visual jitter), and every test names its `?seed=`, so a test plays out the same on
  every run. A test finds a room by what it is (`?room=<template>`, a room's `type`, its `plan.templateId`), never by a
  seed's layout. Where a test checks what a chance does, it forces the chance (`dropsAlways`, `pairsAlways`,
  `runesAlways`, `reagentsAlways`) instead of hoping for it. A test that passes by luck is a bug in the test.
- The fast suite: 22 light tests tagged `@fast` (`test(title, { tag: '@fast' }, ...)`), one or two a system;
  `npm run test:fast` runs them, about a minute and a half with two workers. Keep it under 3 minutes.
- Cadence (CI): a pull request runs `build`, `lint` and the full suite in three shards (`e2e`); a push to `main` runs
  `build`, `lint` and the fast suite (`e2e-fast`); `nightly.yml` runs the full suite on `main` every night and opens the issue
  "Nightly e2e failed" (or comments on the open one) when it goes red. The Pages deploy waits for `build` only.
- Fixtures: `tests/fixtures/assets/` (`?assets=/tests/fixtures/assets/assets.json`).
- Verify a change in the browser before calling it done (Playwright screenshots are fine).

## Dev hooks and URL options

`window.__game` (`installHooks` in `dev/hooks.ts`) and `window.__manual` exist in production builds too. Under
`__manual` the loop does not step in real time; tests advance it with `__game.sim(seconds)`. `warp` does not despawn
the previous room's foes.

`?seed` is the game's own (`readSeed` in `main.ts`); every other option is dev code's (`applyUrlOptions` in
`dev/urlOptions.ts`), applied before the game reads them.

| URL option | Effect |
| --- | --- |
| `?seed=K3F9QX` | Replays a run's floors. |
| `?floor=2` | Starts on that floor (`?floor=6` is the Seal). |
| `?room=<id>` | One template next to the start (`merchant_plain`, `vault_urns`, `secret_cell`, `shrine_henge`, ...). |
| `?variant=dark` | Dresses that room: `quiet`, `champion`, `ambush`, `dark`. |
| `?give=bone_lens,twin_staff` | Starts with artifacts. |
| `?loot=coins:20,keys:2,glyphs:5` | Hands out obols, keys, glyphs. |
| `?spells=arc`, `?potions=healing` | Spells in the slots; potions in the belt. |
| `?level=5` | Starts at that level (`?level=auto`: the floor's expected level). |
| `?autolevel=1` or `skip` | Level-ups choose themselves (bot) or are skipped (tests). |
| `?boons=deepWinter:2,coldSnap` | Boons taken, with ranks. |
| `?runes=q:quicken,e:lasting+vein` | Runes carved into the slots. |
| `?boss=pyre` | Every floor's boss is that one (any id in `BOSS_TYPES`). |
| `?theme=ossuary` | Every fight in one theme's rooms. |
| `?foe=sporeling` | One foe fills every fight. |
| `?vigil=1` or `first` | Starts at the Vigil, or its first waking. |
| `?assets=off` | Keeps placeholders (`?assets=<url>` loads another manifest). |
| `?pixel=off` | Turns the pixel look off (also `texel`, `fine`); the dev menu offers only `texel` and `fine`. |

`__game` hooks by group (the dev menu covers all of them):
- Run: `sim`, `draw`, `warp`, `descend`, `startGame`, `rooms()`, `map()`, `clearRoom()`, `openSecret()`, `state`,
  `player`, `enemies`, `current`, `seed`, `floor`, `run`, `bolts`, `camera`, `keys`, `clock`.
- Giving: `give(...ids)`, `loot({ glyphs: 3 })`, `drop(kind, x, z, opts)`, `learn`, `cast(slot)`, `mana(n)`, `page()`,
  `cleanse()`, `giveBoon`, `giveInsight`, `setLevel`, `givePotion`, `giveHome`.
- Foes and world: `spawn('dummy')`, `hit(i, dmg, school, by, dx, dz)`, `inflict({ chill: 1 })`, `shoot`, `champion`,
  `prop(kind)`, `props`, `burn`, `element`, `pool`, `pools`, `steam`, `ground`, `blast`, `wards`, `callWanderer()`.
- Forcing a chance, for a test of what it does rather than how often: `dropsAlways(on)` (every roll of the run's drop
  stream comes up, the stream still drawn), `pairsAlways(on)` (every fight of the floor that can hold a pair rolls one;
  the floor built again), beside `runesAlways(on)` and `reagentsAlways(on)`.
- Systems: `reaction(r)`, `weave(id)`, `know(id, stage)`, `attune`, `socket`, `transform(id)`, `setArc(n)`,
  `toVigil`, `shade`, `talkTo`, `openLab`, `openWaystone`, `openLevelUp()`, `audioOn()`, `forceAudio`.
- Rendering and assets: `renderInfo()`, `pixelLook`, `setPixelLook`, `assets`, `useAssets`, `showCreature`,
  `bossLooks()`, `bestiaryOptions()`, `jellyLooks()`, `fineLayerDrawn`,
  `obolFaces`, `wearFace(id)`, `coinGallery()`, `renderAudio(ask)`; galleries and their `take*` counterparts
  (`takeArtifactGallery`, `takeCoinGallery`, `takeEffectOptions`, `takeModelOptions`).
- Reading state: `attrs`, `flights`, `pagePanel`, `growFennex()`, `forgetBestiary()`.
- A hook's name appears here in backticks (`name` or `__game.name`); `npm run review-checks` looks for it.

Browser storage: `ossuary.vigil` (the save; also migrates the older per-module keys `ossuary.knowledge`,
`.bestiary`, `.reactions`, `.weaves`, `.recipes`), `ossuary.look`, `.devTab`, `.volume`, `.obolFace`,
`.townWear`, `.insightTold`.

## The dev door and `src/dev/`

Dev code (the dev menu `dev/menu.ts` and its text `dev/strings.ts`, `window.__game` in `dev/hooks.ts`, the URL's dev
options in `dev/urlOptions.ts`, the galleries, the test harnesses and the frame readout) lives in `src/dev/`. No game
module imports from it (ESLint's `no-restricted-imports` in `tools/lint/config.js` fails the lint if one does); dev
code imports the game freely. `main.ts` loads it with one dynamic `import('./dev')`, its own chunk, started at boot
beside the fonts and assets; if it fails to load, the game logs an error and runs without the menu and hooks.

The game reaches dev code only through `src/devDoor.ts`:
- the menu: `devMenuOpen()`, `closeDevMenu()`, `toggleDevMenu()` (no-ops until `registerDevMenu`), for the input
  routing in `main.ts` and the level-up screen;
- callbacks dev code registers when it loads: `onDevStep((dt, room, playing) => ...)` each fixed step (the loop),
  `onDevClear(() => ...)` when a floor's rooms go (`flow.ts`), `onDevFrame((ms) => ...)` each drawn frame outside
  `__manual`.

Boot order: `dev/index.ts`'s `applyUrlOptions()` runs where the URL options always applied (after the fonts, before
the player is reset and the title is prepared) and writes `#devHint`; `install()` registers the menu on the door and
sets `window.__game` once the title is up and the hero has loaded. A new dev feature goes in `src/dev/`; anything the
game must call goes through the door. `DEV` (`state.ts`) stays game-side: dev code writes it, the game reads it.

## Legacy and comparison switches

These exist to compare an old way against the current one. They are not part of the game; the reset
(`docs/RESET-plan.md`, phase R2) removes them. Do not build on them.

| Switch | What it is |
| --- | --- |
| `rotling` | A plain test foe. |
| `src/input/touch.ts` | Frozen 0.3 touch controls: do not extend or test them. |
