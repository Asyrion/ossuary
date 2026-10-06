# M7 Descent and the Vigil: plan

**Status: approved (2026-10-05), the owner taking Claude's recommendations on the four questions asked (decisions 1 to 4)
and the plan's proposals for the rest (decisions 5 to 17); step 1 built (2026-10-05), step 2 next (planned with the owner first).** GDD: RPG progression, Between runs: the
Vigil; Vision, Setting (Kaelith, the world above); Core loop, Game loop changes (death, run start); the roadmap's M7 row
("Final boss (Kaelith, the Shadow Sentinel); the Vigil at the cave mouth over the valleys: freed shades as townspeople with
dialogue (Boketto, the Cloud Forest Wizard, the Huruhui foragers), its unfolding, the Great Circle, the Ferryman's
crossing, echoes, grimoire, bestiary and disciplines; a won run ends in daylight").

The owner's ask (2026-10-05): "Next is M7 Descent and the Vigil: read the GDD's M7 parts and plan docs/M7-plan.md with me
in plan mode before building anything." M7 is a full run with a reason to return. It has two halves:

- **The end of the descent:** a run gets its ending. Kaelith, the Shadow Sentinel, waits in the Seal below floor 5, and a
  won run climbs out into daylight.
- **The Vigil:** a place between runs, where the dead the mage frees come to rest. It grows by who the mage has freed and
  by the magic the mage knows, never by coin, and it is no shop. What a run carries is still lost at death. What the Vigil
  keeps is:
  - knowledge (spells, recipes, the bestiary);
  - the freed and their bonds;
  - Arcane Dust and the obols carried home;
  - a few powers, which the vows can always outweigh.

**What is there to build on:**

- **The run's end:** `descend()` wins on floor 5's trapdoor (flow.ts), and `STR.end.wonText` already names Kaelith's seal.
- **What is kept between runs:** five `localStorage` keys, each kept by its own module with no shared save:
  `ossuary.knowledge`, `ossuary.reactions`, `ossuary.weaves`, `ossuary.bestiary` and `ossuary.recipes`.
- **The boss framework:**
  - `bosses.ts` and `BOSS_TYPES`, with plug-in files such as `twinGuardians.ts` and `jellySerpent.ts`, and the boss bar;
  - `levelAtFloor` for deeper starts;
  - `placeLaboratory` and `placeWaystone` for rooms added on their own stream.
- **Pieces to reuse:**
  - Dr. Jelly's figure on pivots and his gestures (`jellyLooks.ts`, `jellyGives.ts`);
  - the walk-up latch (`checkLab`, `checkWaystone`) and the tabbed screens (`ui/waystone.ts`);
  - familiars (`familiars.ts`, `fennex.ts`), the sapping obelisk's `ward`, and pools and mechanisms answering to schools;
  - the Shadow Fox's `inShadow`, the dark-room variant and the eclipse's black sun.
- **There is no dialogue system yet:** only `banner`, `line`, `toast`, `showPrompt` and lore cards.

## Decisions (taken with the owner, 2026-10-05)

The owner answered four questions, each with Claude's recommendation (decisions 1 to 4). The rest were the plan's
proposals, approved with it. Each has its other way.

1. **Kaelith first, then the Vigil.** A run gets its ending first (the Seal, Kaelith's fight, daylight): it is smaller, it
   is playable soon, and the Vigil's story hangs on it (Kaelith's voice). *Other way:* the Vigil first.
2. **Kaelith waits in the Seal, below floor 5.**
   - Floor 5's boss opens the way down like every other floor's. Its waystone room comes back (a rest and a pair of runes;
     M6 left floor 5 without one "until M7 puts Kaelith below"). The trapdoor leads to the Seal.
   - **The Seal is a short fixed level of three rooms:**
     - **the Stair:** quiet; Kaelith's voice speaks the first time;
     - **the Wardens' Last Hall:** one fight of two waves drawn from every floor's foes, the horde pressing at the seal;
     - **Kaelith's Hall.**
   - Floor 5 keeps its boss pool.
   - *Other ways:* Kaelith as floor 5's boss (cheaper, but the Deep Angler and the Pillar Dragon lose their place and
     nothing lies below the vault), or a whole generated sixth floor (much of it belongs with M8's biomes).
3. **Two currencies come home.**
   - **Arcane Dust** is the magic the mage brings back. It is earned from every run and spent at the Vigil on the Great
     Circle's sigils and the powers.
   - **Obols** are the dead's coin. Those still carried when a run ends come home: all of them after a win, a tenth after a
     death (the GDD's own suggestion for its open question). They pay the Ferryman's toll and buy obols on the eyes.
   - *Other way:* Dust only, for everything.
4. **All six of the GDD's extras for the Vigil go in:**
   - the candle wall;
   - the wall of skulls;
   - the scrying pool;
   - the practice crypt;
   - the bell that calls the boat;
   - obols on the eyes.

   *Other ways:* five without the scrying pool, or only the candle wall, the skulls and the bell.
5. **Who Kaelith is to the mage** (a placeholder story within the lore limits; the owner may rewrite it).
   - Kaelith's shade has stood as the seal for centuries, the last thing between the horde and the pass. To the Sentinel, a
     mage reaching past the vault is one more thing from outside reaching for the seal, so Kaelith bars the way.
   - Beaten, Kaelith kneels: the mage is strong enough, and the seal holds by the magic the mage brought down.
   - A shaft of daylight opens: the way up.
   - Kaelith is not destroyed. Their voice is heard at the Vigil afterwards.
   - *Other way:* Kaelith corrupted by the horde, and destroyed.
6. **Kaelith's fight, in three phases.** Kaelith is Umbral, weak to Hallow and resistant to Umbral.
   - **The Sentinel.** Kaelith steps from shadow to shadow (the Shadow Fox's `inShadow`), with sweeping blade arcs and hex
     volleys. Candle stands the mage lights make light Kaelith can't step through.
   - **The seal cracks (at ⅔).**
     - The horde claws out of the rune ring on the floor.
     - Kaelith holds the seal shut with one hand, guarded.
     - Four ward pillars each want a school (the sapping obelisk's rule) and shut the cracks. With them shut, Kaelith is
       open to blows.
   - **The last light (at ⅓).** The hall goes dark (the dark-room variant) and a black sun pulls (the eclipse's look). Only
     the mage's light and the lit candles hold it off.
   - **Its look is built in code, like every boss:** three looks on a sheet for the owner, as the Warden's were. A Tripo
     model can replace it later through the creature pipeline (`docs/creatures.md`).
   - *Other way:* a Tripo model first, which waits on the owner's model.
7. **One mage, many loadouts.**
   - The disciplines are loadouts for Asyrion (a starting spell and focus), not separate characters. This answers the GDD's
     open question.
   - The Pyromancer (the GDD's Cinder Lance and an Ember focus) is open from the start; each of the others is unlocked by a
     freed shade (decision 11).
   - *Other way:* separate characters with their own Tripo models.
8. **The Vigil is a place to walk, built from the room kit.**
   - It is a small fixed map (`data/vigil.json`, its templates in `data/templates/vigil.json`) built by the same rooms,
     doors and camera, with fights off and casting allowed.
   - In the Vigil the two slots hold any two spells the mage has learned, chosen at the grimoire lectern. The unfolding then
     answers to the real spells through the dungeon's own hooks: `fireAt` melts, `frostAt` freezes water to walk on, rune
     stones take a school.
   - *Other way:* a hub of menu screens (cheaper, but with no magic take).
9. **The Vigil's map.**
   - **Three parts are open from the start:**
     - **the Crypt:** where the mage wakes; the candle wall, the wall of skulls and the grimoire lectern;
     - **the Nave:** the Great Circle, the bell and the echoes;
     - **the Landing:** dark water and the Ferryman's boat.
   - **Six parts each wait behind one school** (the GDD's frozen stair, flooded cellar and sealed door, and one each for the
     schools that came after):

   | School | What bars it | What it opens to |
   | --- | --- | --- |
   | Ember | A frozen stair, melted | The Cave Mouth: terraces where the freed live, the valleys' daylight |
   | Frost | A flooded cellar, frozen over | The practice crypt |
   | Storm | A sealed door of rune stones | The scrying pool |
   | Hallow | A dark chapel, lit by holy light | The candle chapel, where the candle wall's blessings are chosen |
   | Umbral | A veil that a hex parts | The echoes' gallery (more echoes kept) |
   | Verdant | A dead root made to bloom into a ladder | The garden of the dead (the GDD's alchemy garden) |

   The freed wait in the Crypt's alcoves until the Cave Mouth opens. There, each one freed adds a terrace, a house, a
   garden bed or a fall of water, and the valleys' light reaches further in.
10. **Shades in runs are chained shades.**
    - The merchant keeps his name, the Bound Shade: he took his binding to trade. The new ones are chained shades.
    - **Where they lie:** about one a floor, in the secret room, at an ordeal's end or in the boss's keeping, and now and
      then in the library or a vault. It is rolled on its own stream, so seeds keep their floors.
    - **Breaking the chains:** two or three chains, each warded by a school, are struck with that school's status. The
      schools are drawn from what the mage can land: held spells, the cantrip's statuses, potions, the room's braziers.
      Never one the mage can't reach.
    - **Then the choice:**
      - **Free:** it rises as a column of light and goes to the Vigil. It is kept at once, even if the run ends in death.
      - **Bind:** it serves as a familiar in the next run, then slips back into chains, to be met again.
11. **Ten townspeople** (placeholders; the owner's to rename or strike). Kaelith's voice and the Ferryman speak too but
    are not freed.

    | Townsperson | Found | Freed, gives | Bound, helps |
    | --- | --- | --- | --- |
    | Boketto the Storm Caller | Floors 2 to 3 | The Stormcaller discipline; teaches Storm | A storm cloud over the mage that strikes what it shocks |
    | The Cloud Forest Wizard | Floors 3 to 4 | A Verdant discipline; teaches Verdant | Roots that hold foes near the mage |
    | A Huruhui forager | Floors 1 to 2 | A reagent brought back each run | A bow: arrows at the nearest foe |
    | The scribe | Floors 1 to 2 | Tends the grimoire lectern; **Lantern of Vigil** into the library's pool; +10 mana (a power) | Turns aside one shot a room |
    | The sexton | Floors 1 to 2 | One heart container (a power) | Digs a heart out of a cleared room now and then |
    | The chorister | Floors 3 to 4 | The Vigil Keeper discipline | Sings: the mage's casts come round a little quicker |
    | The bell-ringer | Floors 2 to 5 | The bell that calls the boat, and deeper landings; a glyph to start with (a power) | Rings: foes' shots near the mage stall |
    | The novice | Floors 3 to 4 | The Hexer discipline; **Soul Harvest** into the library's pool | Hexes the foe the mage strikes first |
    | The embalmer | Floors 2 to 3 | The garden of the dead: start with a reagent of choice; recipes; a potion to start with (a power) | Brews a draught a floor |
    | The pilgrim | Floors 4 to 5 | The Frostwarden discipline; omens for the circle; 5 obols to start with (a power) | Maps the floor's way |

    - The second socket for the starting spell is the sixth power, from the novice.
    - Each townsperson gives one thing when freed and more as the bond deepens (obols on the eyes: a new memory and a second
      gift).
    - Three give a small quest into the dungeon that opens something when helped.
    - The two spells the GDD left waiting, Lantern of Vigil and Soul Harvest, get a home this way.
12. **Six powers, few and costly.** Each comes from a townsperson and is paid in Dust: +10 maximum mana, one heart
    container, a glyph to start with, a second socket for the starting spell, 5 obols to start with, and one potion to start
    with.
    - The vows always outweigh them, and every vow keeps the owner's rule: **never more foe health**.
    - The vows: more foes (the pressure dials), faster shots, a curse from the start, bosses in a champion's mantle, fewer
      hearts, no merchant.
13. **The Great Circle.**
    - It has three rings:
      - **vows:** a harder run for more Dust;
      - **gifts:** a discipline, then a spell or potion to start with;
      - **omens:** the themes and schools the floors lean to, through `themeChance` and `floorLean`.
    - Sigils are bought once with Dust, then placed freely before any run.
    - Six named pairs combine when set side by side, the small puzzle the GDD asks for.
    - Casting the circle and ringing the bell call the boat.
    - *Other way:* no pairs.
14. **The Ferryman's toll.** Floor 1 is free. A deeper floor, once reached in a run, costs obols that grow with the depth.
    The run then starts at that floor's expected level, its choices waiting (`levelAtFloor`, as `?level=auto` does), and
    skips the rewards above it.
15. **Echoes.** The last three runs stand in the Nave as pale figures holding what they carried (five with the Umbral
    part open). The mage can do one thing with each:
    - **speak to it** and hear how it fell: the floor, the room and what struck last;
    - **take one faded artifact** into the next run: half its numbers, lasting until the first boss falls;
    - **lay it to rest** for Dust.
16. **The first run starts in the dungeon, as now.**
    - When it ends, the mage wakes in a dark Vigil with its first candle.
    - From then on the title leads to the Vigil, and every run ends there. A win shows the daylight first.
17. **One save.**
    - `ossuary.vigil` is one versioned record. It takes over the five keys once; they stay until the close, then go.
    - It can be exported and imported as a file from the pause menu, so the owner's progress survives a change of browser.
    - The settings (`ossuary.look`, `ossuary.volume` and the like) keep their own keys.

## The pieces

**Arcane Dust: its sources.** These are first numbers, to be measured with the bot in step 13. A run to floor 3 with one
shade freed should buy a sigil; a power should take three or four runs.

| Source | Dust |
| --- | --- |
| Each floor reached | 10 × the floor |
| Each boss put to rest | 15 (Kaelith 60) |
| Each first find in the run (a spell learned, a reaction, weave, counter or recipe) | 3 |
| Each shade freed | 20 |
| The vows kept | +25% of the run's Dust each, paid only if the run reaches floor 3 |
| An echo laid to rest | 10 |

| Spent on | Dust or obols |
| --- | --- |
| A sigil (once each) | 20 to 60 Dust |
| A power (once each) | 100 to 200 Dust |
| The Ferryman's deeper landing | 10 obols × the floor |
| Obols on the eyes (a bond deepened) | 5, then 15 obols |
| The scrying pool (once a run) | 15 Dust |

**What the save keeps:**

- knowledge (spells, reactions, weaves), the bestiary and the recipes;
- Dust and obols;
- the freed and the bound, the bonds, quests and flags;
- the parts opened, the candle lit;
- sigils owned and placed, the powers;
- the echoes, with what each run carried, where it ended and what struck last;
- the artifacts ever found;
- runs, wins and the deepest floor reached.

## Steps

Each step names its pure rules (unit-tested), its dev menu entry (the owner's standing rule), its browser test, its lines
(Nothing silent) and its placeholder sounds. The room inspector runs where rooms look different. **(P)** marks a step
planned with the owner in plan mode first, as M6's steps 5 and 7 to 11 were. Names marked (new) don't exist yet.

**Part A: the end of the descent**

1. **The Seal.**
   - Floor 5 gets its waystone room: `waystone` in data/floors.json, with floor 5's rune drops still at 0, but the stone's
     pair offered.
   - A sixth entry in data/floors.json marked `fixed` (new), with a hand-laid plan of three rooms (the Stair, the Last
     Hall, Kaelith's Hall), built through a `fixedPlan` (new) path beside `testPlan` in `buildFloor`.
   - Its look: Uzulim's dark volcanic stone, as new kit kinds (a wall, a floor, a wall light and a brazier) in
     `pixelTextures.ts` and `fireLooks.ts`, under a shadow-violet light.
   - The Last Hall's two waves are drawn from every floor's foes.
   - Its soundscape goes in data/ambience.json.
   - Everything kept per floor gets its entry: pressure, music, the curve's lean, insight.
   - **Dev menu:** "To the Seal"; `?floor=6`.
   - **Browser test:** floor 5's boss leads to the waystone room and down to the Seal; the Last Hall's waves are fought;
     every floor's foes appear there.

   *Built (2026-10-05).*
   - **The plan:** `fixedPlan` in generate.ts lays the rooms from the floor's `fixed` list: doors on every shared edge, kept in
     the middle; distances walked from the start; the seeds from the run's stream, so a seed still dresses the Seal.
     - The three templates are marked `fixed` (`seal_stair`, `seal_last_hall`, `seal_kaelith`), and the generated floors
       never draw them.
     - The Stair lies under the Last Hall's left cell, and Kaelith's Hall over its right, so there is one door between each
       two rooms.
   - **The Last Hall:** a great hall with eight pillars, four rune stones, two braziers, rubble, bones and two candle stands.
     - Its two waves are filled from the Seal's table, which mixes every floor's foes: walkers from floors 1, 3, 4 and 5,
       fliers from 1 to 5, and heavies from 1, 3, 4 and 5.
     - Its foes' health is floor 5's (×1.6), never more, by the owner's rule. Its ordeal's artifact rises as an ordeal's
       does.
   - **The voice and the horde:** `src/world/seal.ts` speaks. On arrival, the Seal's banner ("Where Kaelith stands between
     the horde and the pass"), then Kaelith's voice: `Kaelith: "Go back up, mage. What I hold here stays held."`, with
     `Sfx.sealVoice`. The first time in the Last Hall: "The horde presses against the seal from below".
   - **Kaelith's Hall:** until step 2, its boss is drawn from the deeper floors' pools (the Hart, the War-Tiger, the Twin
     Guardians, the Deep Angler, the Pillar Dragon), one the run hasn't met. It holds four pillars and four candle stands
     for step 2's fight.
   - **The Seal's look:**
     - **walls:** `warded` (great blocks of dark volcanic stone, with a band of the Wardens' glyphs between courses, some lit
       violet through a glow map) and `scoria` (rough black-red blocks full of holes), with floor 3's `basalt` now and then;
     - **floor:** `sealstone` (great dark slabs, a glyph cut in some, a few lit), with plain flags now and then. Floor 3's
       basalt floor was tried and dropped: its ember seams read as a field of red dashes in a great hall;
     - **light and braziers:** the `shard` wall light (a shard of black glass in an iron collar, its rune and flame lit) and
       the `stepped` brazier (a black glass bowl on three tiers with a rune on each), under a shadow-violet light;
     - **sound:** its soundscape ("seal": a deep bed, whispers, an underground bell, stones, dust, a slow pulse) and its piece
       ("What the Sentinel Holds", A harmonic minor, 42 a minute).
   - **The win:** it moved with the floors. The Seal is the last level, so its boss's trapdoor ends the run, and floor 5's
     no longer does.
   - **The waystone on floor 5:** it rises in its room (the pair offered; floor 5's rune drops stay at 0).
   - **Dev menu:** the new runs' last button is "To the Seal (below floor 5)", at its expected level; `?floor=6` goes there.
   - **Tests:**
     - **Unit:** the Seal laid by hand, three rooms with a door between each, its templates its own; generated floors never
       draw them; floor 5's waystone. The floor-by-floor tests (the generator's rules, the economy, the dials, the variants,
       the themes, a floor's own foes) run on the generated floors.
     - **Browser:** floor 5's waystone room, the way down to the Seal, Kaelith's line, the horde's line, the two waves from
       two floors or more, and the boss's way out winning the run. The M6 waystone test checks the Seal for no stone.
   - **The room inspector:** nothing blocking, no console errors. Its polish was taken at once:
     - a lighter floor and sky;
     - the `stepped` brazier's middle tier in pale stone and its rim in bronze, since unlit, away from the light, it read as
       a hole;
     - pale wax on the candle stands, which were hard to find on the dark floor;
     - a smaller glow on the `shard` light, which hid the shard and the glyphs round it.
   - **The suites:** 441 unit tests and 130 browser tests green. Two browser tests had counted the run as five floors ("1 of 5"
     on the end screen, the Shore's boss winning), and now count the Seal.
2. **(P) Kaelith's fight.**
   - The look sheet comes first: three looks for the owner.
   - Then `src/actors/kaelith.ts` (new), in the boss plug-in shape: `kaelith` in `BOSS_TYPES`, in no pool but the Seal's,
     with its tuning in `CFG.enemy.kaelith`, and the three phases of decision 6.
   - The boss bar marks the phases. Kaelith's lines go in `STR.bosses.kaelith`, and Kaelith's theme in data/music.json.
   - The win moves from floor 5's trapdoor to Kaelith's fall.
   - **Dev menu:** the fight, and a jump to any phase; `?boss=kaelith`.

   *Planned with the owner (2026-10-05):* the owner chose two of four directions for the look, the Hooded Sentinel and the
   Winged Watcher (the Seal Made Flesh and Shadow and Lantern were left out). Both wear the same fight, and the owner picks
   one from the sheet.

   *Built (2026-10-05). The owner chose the Winged Watcher (2026-10-06): the Hooded Sentinel, the Look tab's switch and its
   key (`ossuary.kaelithLook`) went; `kaelithLook()` builds the Watcher, the Galleries stand it as `kaelith`, and
   `npm run foe-sheet -- bosses=kaelith` shoots it.*
   - **The looks:** `src/actors/kaelithLooks.ts` holds both (`hoodedSentinel`, `wingedWatcher`).
     - **The Hooded Sentinel:** a tall hooded Warden in dark plate, a robe fraying into shadow, violet slits under the
       cowl, a great glaive held out to the side, three Warden glyphs turning over its head.
     - **The Winged Watcher:** gaunt plate on long legs, great tattered wings of shadow, the stone mask of the Gate's
       watching statues with violet slits, a two-handed sword held up and out.
     - **Their parts:** each carries what the fight moves (`eye`, `ring`, `halo`, `body`, `blade`, `mantle`, `hand`,
       `head`).
     - **The switch:** the Look tab's "Kaelith's look" (`ossuary.kaelithLook`, `kaelithLookNow`/`setKaelithLook`); the
       Galleries tab stands both (`KAELITH_GALLERY` in `ALL_BOSS_LOOKS`).
     - **The sheet:** `npm run foe-sheet -- bosses=kaelithHooded,kaelithWinged` writes `bosses-texel.png` and
       `bosses-off.png` (`asset-previews/kaelith/`, sent to the owner).
     - The first pass was too dark under the cowl: its plate, robe and wings were lifted, and the slits made bigger with a
       glow behind them.
   - **The fight:** `src/actors/kaelith.ts` (`buildKaelith`, `updateKaelith`, `kaelithKneels`; dispatched from bosses.ts),
     its pure rules `src/actors/kaelithData.ts` (`phaseOf`, `sealWards`), tuning `CFG.enemy.kaelith` (hp 210, ×1.6 in the
     Seal).
     - **Phase 1:** it stalks at blade's reach (2.2). It sweeps nine hexing blades after a tell (its blade raised, its
       mantle spread), fires hexing volleys, and steps through shadow (sink, gone, rise in a shadow 2.2 to 4.2 from the mage,
       a ring of cuts). Light from a lit brazier, candle stand or wall light within 2.4 keeps it from stepping; with nowhere
       dark it fires instead.
     - **Phase 2, at ⅔:** "The seal cracks". It goes to the hall's middle and holds the seal: a quarter of each blow, a
       volley every 2.4 s.
       - **The wards:** `seal_kaelith`'s four pillars are now sapping obelisks made ward pillars (`sealWard`/`wakeWard` in
         mechanisms.ts, `prop.seal`: no field, no drain). They are dormant until now, then wake in the schools the mage
         holds, then Ember and Hallow, then the rest.
       - **The horde:** each open ward lets out a foe of the Seal's table every 5 s, at most four alive.
       - **Shutting them:** a ward shuts to its school, or to any glyph's blast. "Shut" rises over it (`wardHooks.shut`).
         All four shut, it reels for 4 s, taking 1.5 times each blow ("Open"), then fights as in phase 1.
     - **Phase 3, at ⅓:** "The last light". The hall goes dark (unless every candle stand is already lit, as a dark room
       does), the wards go out, and a black sun hangs over it.
       - Every few seconds it pulls the mage for 2 s (the drawn chip shows), then rings out sixteen blades.
       - Within 2.2 of a lit candle stand the mage isn't drawn, and it steps through the dark everywhere but there. Its waits
         are shorter (×0.7).
     - **Its fall:** it kneels (`kaelithKneels` from `onBossDead`): a figure of its look stays where it fell, posed kneeling,
       its eyes dim; the dark lifts; "The seal holds", and its line ("Then hold it, mage. Hold it better than I could.").
       The way out (`STR.banner.wayOut`, now "The way out lies open") wins the run until step 3's daylight.
   - **What shows:**
     - lines the first time: "Strike each ward with its own school, or a glyph's blast" and "Stand by a lit candle: the
       dark cannot draw you there";
     - the boss bar's marks at ⅔ and ⅓ (`bossBarMarks` in hud.ts, cleared with the bar);
     - the sounds `kaelithSweep`, `shadowStep`, `sealCrack`, `wardShut`, `eclipsePull` and `kneel`;
     - its theme "The Sentinel" (data/music.json's `bosses`, read by the director in its fight).
   - **The data:** the Seal's pool is `["kaelith"]`.
   - **Dev menu:**
     - Rooms & runs: "Kaelith's fight", its phase and wards, phase 2, phase 3, and shut the wards;
     - "Fight a boss" puts Kaelith in `seal_kaelith`;
     - Look: "Kaelith's look" (until the owner's choice);
     - `__game.kaelith`, `kaelithToPhase(n)`, `shutAllWards()` (and `kaelithLook()`, `setKaelithLook(l)` until the choice).
   - **Tests:**
     - unit: the phases, the wards, the pool;
     - browser: the whole fight, start to fall: its states, the wards woken in the held schools, a quarter of a blow, the
       horde, all four shut and the reel, the dark, the pull and the candle's safety, the kneeling, the run won;
     - the step-1 test's boss is Kaelith now.
   - **The room inspector:**
     - **Blocking, fixed:** the kneeling figure sat on the way out at the hall's middle. It now kneels where it fell unless
       that lies within 4.4 of the middle (`kneelClear`), and then out past the way out, the heart, the page and the gifts.
       The browser test holds it more than three tiles from the way out.
     - **Polish taken:**
       - in the last light each unlit candle stand shows a wick's warm glow, so it can be found in the dark;
       - the Seal's candles burn warm (`candle` in a floor look's `torch`), not in the violet of its wall lights, which read
         like Kaelith's shots.
     - **Left:** `?room=seal_kaelith` without `&boss=kaelith` shows the pillars as plain sapping obelisks (only in the dev
       path).
   - **The suites:** 444 unit tests and 131 browser tests green. The Warden's test lists the gallery's bosses, and now
     counts Kaelith's two looks. The floor-1 bestiary test failed once in the full run (the Choir Lark hadn't sung within its
     10 s), then passed three times running alone.
   - **The ship's CI (2026-10-06)** found two more:
     - The lark again. It sings only on a perch it flies to, picked at random, so the test now perches it where it was
       spawned.
     - The door test's page never started inside 30 s (`?seed=DOORS1&floor=2`, whose floor the harder runs had redrawn).
       Its first frame took 15 s: a pool's and a pit's soft outline was a canvas `blur()` filter, rasterised on the GPU,
       which on a software GPU (the tests' SwiftShader, a machine without a graphics card) cost seconds each. The blur is
       now done on the CPU (`src/render/softEdge.ts`, a Gaussian in two passes, `CFG.surface.poolBlur` and `pitBlur`): the
       first frame takes 0.2 s, and the pools and pits look the same (compared shot against shot).
3. **Daylight.**
   - Kaelith kneels and a shaft of light opens. Stepping in plays the cave mouth at dawn, built in code in the pixel look:
     the terrace's edge, the valleys in layered silhouettes, mist and falling water.
   - The end screen lies over it, with the won text rewritten and a short daylight piece.
   - The scene becomes the Vigil's Cave Mouth in step 9.
   - **Dev menu:** "Daylight now".

**Part B: the Vigil**

4. **The keeping.**
   - `src/vigil/save.ts` (new) and the pure `src/vigil/vigilData.ts` (new: `migrate`, `validate`, `dustFor(summary)`,
     `obolsHome`).
   - The five modules that keep their own keys read and write through it, keeping their own functions.
   - `endGame` records the run: its depth, what struck last, the room, and what was carried.
   - The end screen's tally shows the Dust and obols carried home, a line for each source.
   - The save's export and import.
   - **Dev menu:** give Dust and obols; a wiped save; a veteran save (every shade freed, every part open).
5. **(P) The Vigil as a place.**
   - `data/vigil.json` (new) and its templates, built by the rooms, doors and camera with fights off.
   - The Crypt, the Nave and the Landing; waking there; the title leading there after the first run.
   - The lectern's slots for the Vigil.
   - For now the boat takes the mage to floor 1 for nothing; the toll comes in step 10.
   - Its kit (crypt stone, candles), its soundscape and a piece.
   - **Dev menu:** "To the Vigil"; `?vigil=1`.
6. **Chained shades in runs.**
   - Where they lie: data per floor, on their own stream.
   - The look: a shade in chains, told apart from the merchant.
   - The chains' wards (the obelisk's rule), and freeing or binding them; a bound shade's familiar in `familiars.ts`.
   - **Dev menu:** a shade here; break its chains; free it or bind it.
7. **(P) Townspeople and dialogue.**
   - `data/dialogue.json` (new) holds the lines:
     - by moment: the first meeting, after a death, after a boss, a quest opened or done;
     - with conditions on the save;
     - with up to two choices and their effects.
   - The pure `src/vigil/dialogueData.ts` (new: `pickLine`, `validateDialogue`), and the talk panel `src/ui/talk.ts` (new;
     keys and pad).
   - The ten figures, built in code: one shade material, each with its silhouette and light. Their sheet goes to the owner
     before they go in.
   - **Dev menu:** talk to anyone at any moment; set any flag.
8. **Gifts, bonds and powers.**
   - What each townsperson gives when freed:
     - spells into the library's pools (Lantern of Vigil and Soul Harvest built here, as data on the shapes that are there
       where they fit);
     - disciplines, recipes and the powers.
   - Obols on the eyes, and the three quests.
   - **Dev menu:** each power, each bond.
9. **The unfolding and the candle wall.**
   - The six parts behind a school, on the dungeon's hooks.
   - The Cave Mouth filling in with each shade freed.
   - The candle wall: a candle lit before a run carries that townsperson's blessing through the run.
   - **Dev menu:** open any part; close them all.
10. **(P) The Great Circle and the Ferryman's crossing.**
    - `data/sigils.json` (new: the vows, gifts and omens, and the pairs), and the circle's screen `#scrCircle` (new).
    - The disciplines as gifts, the bell, and the toll with its deeper landings.
    - The vows' hooks: the pressure dials, shot speed, a curse at the start, mantled bosses, the hearts, no merchant.
    - **Dev menu:** place any sigil; cast the circle; land on any floor.
11. **Echoes.**
    - Kept in the save and stood in the Nave: speak, take a faded artifact (a `faded` flag read by `computeStats`), or lay
      to rest.
    - **Dev menu:** make an echo of this run.
12. **The grimoire, the wall of skulls, the practice crypt and the scrying pool.**
    - **The lectern:** every spell, recipe and artifact ever found.
    - **The skulls:** each watches until its foe's weakness and resistance are both known. Reading one shows its Foes tab
      entry.
    - **The practice crypt:** shades that fight back. Casts there count toward knowing a spell.
    - **The pool:** once a run, for Dust. Frost shows the landing floor's map, Storm its secret room, Ember its boss.
    - **Dev menu:** each one, at once.
13. **The close.**
    - The GDD as built, the rules reviewer, a room-inspector sweep (the Seal, the Vigil), the frame cost, and the suites.
    - Balance with the bot: a veteran save with every power, against every vow.
    - The five old keys deleted.
    - The handoff, CLAUDE.md, and `npm run milestone -- close M7`.

**What could be cut if it runs long**, without hurting the core:

- the sigils' pairs;
- the quests;
- the scrying pool;
- the Umbral part's extra echoes;
- the bound shades' familiars, which could become one shared kind of help.

**Done when:**

- a run ends with Kaelith in the Seal, and a won run in daylight;
- every run wakes the mage in the Vigil, which keeps what it should in one save;
- shades are freed or bound, talk, give and remember;
- the Vigil opens to the spells the mage knows;
- the Great Circle, the bell and the Ferryman start a run where it should start;
- echoes, the grimoire, the skulls, the practice crypt and the pool work;
- every new piece has its dev menu entry, tests, lines, sound and a look in the pixel art.
