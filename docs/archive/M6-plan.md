# M6 RPG growth: plan

**Status: approved (2026-10-02) with four changes, the owner taking Claude's recommendations (decisions 6, 8, 10 and 11);
built, steps 1 to 13 (2026-10-04), and closed on GitHub.** GDD: RPG progression, Inside a run; Magic
system, Runes; Core loop, Game loop changes for the magic RPG (the pacing target); Pickups and room types (the rune, the
shrine's bargain, the waystone); the roadmap's M6 row ("XP, levels, attributes, 12 boons, runes and waystones").

The owner's ask (2026-10-02): "Start with M6: read the GDD's M6 parts, write docs/archive/M6-plan.md, and show me the plan before
building." M6 is growth you can feel inside a run. Foes put to rest, rooms won and potions found give insight (the GDD's
XP); each level up to 12 brings an attribute point and a choice of one boon from three; runes are carved into spells at a
waystone after each boss; and the shrine opens its heart-for-boon bargain. All of it lasts one run and is lost at death.
What is kept between runs is M7's Vigil; M6 adds nothing to it beyond the spell knowledge M3.7 already keeps.

## Decisions (taken with the owner, 2026-10-02)

Each was a proposal with its other way. The owner asked for the best player experience and took Claude's
recommendations: the plan's proposal for nine of them, and a change to four (6, 8, 10 and 11, marked *Changed*).

1. **XP is insight.** It is what the mage learns from the magic of a foe put to rest, a room won or a potion known. A
   falling foe gives up a short streak of its school's light (parchment gold for a foe of no school) that runs into the
   mage's casting hand. It is a streak, not a round mote, so it can't be taken for a soul mote. The HUD says "Insight"
   and "Level". Both words are placeholders until M8. *Other way:* plain "XP".
2. **The cap stays at 12, and the levels taper over the five floors: 3, 3, 2, 2 and 1.** The GDD's "about 3 levels a
   floor" was written for three floors. Over five floors it would reach the cap on floor 4. Tapered, the bosses of floors
   1 to 4 each give their floor's last level, and the cap comes in floor 5 (the curve below, measured). *Other way:* a cap
   of 16 at three levels a floor. Its fifteen picks would show nearly the whole pool, so boons would have to grow in ranks.
3. **Where insight comes from: the GDD's three sources, and nothing that can be farmed.**
   - **A foe** carries a purse fixed when it is made: its health ÷ 4. It pays once, when it falls, never per blow. A
     splitter's two halves share one purse. A nest's brood, a golem's stones, a boss's helpers, the Wardlings a boss's ward
     breaks into and the dummies pay nothing.
   - **A room** pays on its first clear. A quiet room left empty pays nothing.
   - **A boss** pays its floor's sum.
   - **A potion** pays the first time each kind is drunk, thrown or named by Dr. Jelly in a run. Knowing it on sight (Keen
     Nose, the Taster's Spoon, a recipe brewed before) pays nothing until it is used.
   - **The Grave Draught's drink** gives 15 insight × the floor for its half heart, so it stays worth the heart deeper
     down. *Other way:* the GDD's flat 15.
   - Reactions, weaves and counters found pay nothing, since they are knowledge kept between runs.
4. **The GDD's four attributes, one renamed.** *Focus* becomes **Will**, because "focus" already names the artifacts held
   in the casting hand. They stay deliberately plain and small, so that boons and runes make the build (pillar: Magic is
   the build). Vigor gives half a heart container every 2 points, drawn as half a heart's outline. *Other way:* a whole
   container every 4 points, which needs no new look.
5. **A level waits for the fight to end.** Mid-fight, "Level 4" rises over the mage in a stepped glow and a chip waits
   beside the mana bar. The screen opens once the doors open and pauses the game. The mage takes one boon of three, then
   spends the point. Moving chooses, a cast key or Enter takes. *Other way:* open at once, mid-fight.
6. **Eighteen boons: two for each school and six general, and each school boon can be taken twice, stronger the second
   time** (*Changed*: the owner chose the plan's other way C). A run has up to thirteen picks (eleven levels and two
   bargains). One card of the three is always general, so the deal never runs dry. Tempered can be taken again and
   again, and Second Socket twice. With only one rank, a one-school build would take its school's two boons by about
   level 4, and from then on two cards of every three would be other schools': dead picks. With the second rank (rank II,
   its own numbers in the data, the same icon with a second ring), a two-school build, the usual one with two slots, has
   eight picks of its own, so the deal keeps feeding the build into floor 4. *Other ways, not taken:* (A) twelve, the
   roadmap's number: one a school with three ranks, and six general; (B) the eighteen with one rank each.
7. **The GDD's nine examples are kept in spirit; names that clash are changed** (all placeholders until M8):
   - *Conductor* is an M4.10 weave, so it becomes **Forking Arc**.
   - *Kindling* is too close to the Kindled mantle, so it becomes **Banked Coals**.
   - *Warden's Oath*: "Warden" and "Oath" are both taken, so it becomes **Votive Heart**.
   - *Attuned* is M4.11's attunement, so it becomes **Tempered**.
   - *Bloodprice* becomes **Thirsting Hex**, the GDD's unbuilt half of Hex: it drains life. Bloodprice's old parts are
     already in the game: its +50% hex mana is the Ferryman's Lantern, and paying in blood becomes the Vein rune.
   - Keen Nose, Scavenger, Deep Winter and Second Socket keep their names.
8. **The deal leans to the build, and says so.** Each school's weight comes from its spells in the slots, its casts this
   run, its artifacts and its boons taken. An attuned run (both slots of one school) draws both of its non-general cards
   from that school while any are left. A card the lean brought carries a small mark ("Your Ember draws it"). A school boon
   taken before any spell of that school is a pledge: the next library holds at least one page of that school
   (*Changed*: a promise kept, not a lean that could miss). A line says so when the boon is taken ("The next library will
   remember Ember") and again at the library. So floor 1's first picks still give "a school by
   its boss".
9. **Runes fit by shape, not by tags** (the GDD said tags; tags stay as description). Read word for word, the GDD's six
   runes give every spell at least three: Echo, Swift and Blood fit any spell. Two changes:
   - **Reprise (Echo) leaves out the walls, the mantle and the ward.** A second wall, mantle or ward half a second later
     would be a second cast for nothing.
   - **A seventh rune, Lasting, serves the spells that linger:** what the spell leaves lasts half again as long. With it,
     every spell takes three to six runes.
   - **Four runes are renamed against clashes:**
     - *Split* becomes **Thrice** (the Cracked Mirror splits);
     - *Echo* becomes **Reprise** (the Echo Stone, the Philter of Echoes);
     - *Swift* becomes **Quicken** (Swiftness);
     - *Blood* becomes **Vein** (the Blood Moon Pendant, the Bloodied Covenant).
   - School runes, which would graft a second school's status onto a spell, stay out. One spell could then fill the
     wheel alone.

   *Other way:* keep six runes. The mantle and the ward then take two.
10. **A rune goes back to the pouch when its spell is given up** (*Changed*: keeping it on the given-up page would make
    swapping a runed spell at a library cost the rune, punishing the swap the library is there to offer). It waits in the
    pouch for the next waystone, and a waystone lifts any rune back into the pouch for nothing. Runes come about five or six a run, against two to four
    sockets:
    - a pair at each waystone (take one, the other crumbles);
    - the merchant, at the GDD's 10 obols;
    - now and then the Wandering Merchant, a secret room's hoard or a reliquary chest.

    Once no waystone lies ahead (floor 5), runes stop dropping and Second Socket leaves the deal.
11. **The waystone is a small room of its own beside the boss room, holding the way down, on floors 1 to 4.** It reads as
    the GDD's "waystone room between floors", it keeps the boss room clear, and it can't be missed. Its magic take: it is
    a rune stone's kin that answers casts. A spell cast into it opens that spell's sockets for carving, and the rune shows
    in the spell's light at the hand. It holds:
    - the GDD's rest: full mana and every cooldown ended, once;
    - carving and lifting runes;
    - reordering the belt, which the inventory's Potions tab also does at any time (*Changed*: kept only for waystones it
      would be friction with no magic in it).

    "Sell or brew" goes: nothing sells to the mage, and brewing is Dr. Jelly's. Omens wait for M7. Floor 5 has none
    until M7 puts Kaelith below. Where no cell is free (under half a percent of seeds), the stone rises in the boss room.
    *Other way:* always in the boss room, beside the trapdoor (cheaper; the room step goes).
12. **The shrine's bargain is in, on both shrines** (floors 2 and 4, as data/floors.json has them; the GDD's "floor 2" is
    fixed in the close). A bargain stone takes a heart container (never the last) and deals three boons. Its magic take:
    the mage casts a spell into the stone, and the deal draws from that spell's school (one card general). Once a shrine.
    *Other way:* leave it for a later milestone (step 11 goes).
13. **What M6 leaves alone.** Levels count toward Asyrion's arc: every three levels gained count as one artifact held,
    so a level-12 run with no artifacts reaches the arc's first stage. Mastery of a school gives nothing new in M6; a gift
    for it would be a power kept between runs, which is M7's. In M6 only runes mark a spell Upgraded (M3.7's last stage).
    Insight, levels, attributes, boons, runes and sockets live in the run and are lost at death.

## The pieces

| Source | Insight | Notes |
| --- | --- | --- |
| A foe put to rest | Its health on its floor (data `hp` × the floor's `enemyHp`, ×2 a champion) ÷ 4: a sporeling 2.3, a phoenix 10.4, a hydra 16.8 | Fixed when the foe is made; elites earn more through their health alone |
| A nest's brood, a golem's stones, a boss's helpers, a boss ward's Wardlings, dummies | 0 | The nest's purse counts its first brood; a vault's Wardling pays as a foe |
| A splitter's halves | Half the purse each | |
| A room's first clear | 4 × the floor; an ordeal twice that | A boss room pays only its boss; a room ended by the dev menu's clear pays the clear, not the kills |
| A boss | 60, 130, 230, 360, 540 by floor (the same for every boss in a floor's pool) | Once, the Twin Guardians included |
| The jelly serpent | Its health ÷ 2 (about 47 on floor 1, 62 on floor 3) | Once a run at most |
| A potion's kind first used in a run | 4 × the floor | Drunk, thrown or named by Dr. Jelly |
| The Grave Draught's drink | 15 × the floor | Its half heart is the price |

| Level | Insight | Reached (2,000 seeds; p10 / median / p90 of the way through the floor) |
| --- | --- | --- |
| 2 | 20 | Floor 1, the second fight room for 80% of runs (the first for 9%) |
| 3 | 70 | Floor 1, 50% / 67% / 86% |
| 4 | 145 | Floor 1's boss (94% of runs) |
| 5 | 240 | Floor 2, 20% / 36% / 55% |
| 6 | 340 | Floor 2, 60% / 78% / 90% |
| 7 | 450 | Floor 2's boss (98%) |
| 8 | 700 | Floor 3, 33% / 46% / 67% |
| 9 | 1,030 | Floor 3's boss (98%) |
| 10 | 1,400 | Floor 4, 33% / 55% / 78% |
| 11 | 1,780 | Floor 4's boss (99%) |
| 12 | 2,500 | Floor 5, 58% / 80% / its boss; every run by floor 5's boss |

**The curve.** Measured by running the real generator over 2,000 seeds, with each room filled as `buildRoom` fills it.
- **Kills, clears and bosses** give 176, 347, 640, 833 and 1,183 insight on floors 1 to 5, which is 2.9, 3.0, 2.0, 2.0 and
  1.0 levels a floor.
- **Thorough play** adds two new potion kinds a floor on floors 1 to 3 and one on floors 4 and 5, a Grave Draught, every
  vault forced and the serpent once. It runs a level ahead on floor 3 for 13% of runs and is back on the curve by floor
  4's end. It reaches the cap halfway through floor 5 (median), never before.
- **Skipping a quarter of the fights** ends floor 1 at level 4 in 73% of runs and still reaches the cap by floor 5's boss
  in 99%.
- **At the cap**, insight still runs to the hand, the strip stays full, and a line says so once: "You can learn no more
  this run."

| Attribute | Per point (`CFG.attributes`) | Feeds | Shows |
| --- | --- | --- | --- |
| Vigor | Half a heart container every 2 points | `heartHalves` (new stat key) | A half container on the HUD |
| Arcana | Spell damage +6% | `spellDamageMul` | The spell panel's numbers |
| Will (the GDD's Focus) | Max mana +10, regeneration +5% | `mana`, `regenMul` (new) | A longer mana bar; the inventory's "The mage" tab |
| Swiftness | Move speed +3%, cantrip delay −3% | `speedMul`, `fireDelayMul` (the delay's floor kept) | The run and cast clips play faster |

| Boon | School or area | Effect | Its magic take |
| --- | --- | --- | --- |
| Banked Coals | Ember | Burn lasts half again as long; so do burning oil and the mage's burning ground | The room's fire keeps the mage's pace |
| Flamekeeper | Ember | In a fight, each lit brazier or candle stand, burning oil pool or patch of the mage's burning ground within 2.5 tiles gives 1 mana a second | Flames feed the caster: embers run from the flame to the hand |
| Deep Winter | Frost | Freeze at 2 Chill stacks instead of 3 (bosses still never freeze; a chill that sets off a reaction doesn't stack, as now) | Shatter, Prism and Black Ice come oftener |
| Cold Snap | Frost | A frozen foe that thaws breathes a Chill stack onto every foe within 1.5 tiles | A freeze passes through a pack |
| Forking Arc | Storm | Arc leaps to two more foes; a shock's leap reaches two foes, not one | The chain forks |
| Spark Wake | Storm | A foe the mage's shock stuns leaves a spark on the floor for 3 s that stings foes, never the mage | The floor carries the charge |
| Votive Heart | Hallow | One more heart container; the first Hallow cast in a fight mends half a heart if hurt | Prayer answered in the hearts |
| Laid Bare | Hallow | A sanctified foe's guard is gone while it lasts, as Searing's is: shells, lids, stone and plates take full blows | Holy light lays the foe open |
| Thirsting Hex | Umbral | Every 6 hex stacks spent mend half a heart | The GDD's unbuilt half of Hex: it drains life |
| Gathering Dark | Umbral | Hex holds 7 stacks instead of 5 and fades a third slower | More mana back, more black motes, longer Blight and Eclipse |
| Seedfall | Verdant | An overgrown foe that falls leaves a flowering plant where it fell | The room grows a garden the mage can burst |
| Perennial | Verdant | Overgrown holds half again as long; a foe held at its full slow is rooted a moment | The vines take hold |
| Tempered | The mage | Three more attribute points; can be taken again | The pool's floor, never dead |
| Second Socket | Runes | The spell chosen on the card gets a second socket (two at most a spell) | Two runes carved in one spell |
| Keen Nose | Potions | Potions are known on sight (not dealt while the Taster's Spoon is held) | Knowing by scent what the Spoon knows by taste |
| Scavenger | Reagents | A foe put to rest by its weakness always leaves its reagent | The right school harvests |
| Brewer's Breath | Potions | A potion drunk also breathes out its throw round the mage's feet, sparing the mage | Drinking becomes a spell too |
| Afterglow | Cantrip | After a spell, the next three cantrip bolts carry half its statuses | The cantrip follows the hands |

A school boon's rank II is the same boon grown (Banked Coals II: burn lasts twice as long; Deep Winter II: a freeze
holds half again as long), its numbers in the data; its card says what the second rank adds. Boons that mend share one budget: half a heart a room at most (`CFG.boons.mendPerRoom`), so three hearts stay dangerous.

| Rune | Effect (numbers in data/runes.json) | Takes it (shapes: spells) | At the hand |
| --- | --- | --- | --- |
| Thrice (the GDD's Split) | Three copies in a fan at 40% damage; only the middle one carries statuses | bolt, shotgun: Hex Bolt, Rime Shards | Three motes fanned |
| Reprise (Echo) | The spell comes again 0.5 s later at half its damage and statuses; a zone's reprise mends nothing, a Toll's marks the next foe | beam, placed, shotgun, chain, zone, smite, bolt, grasp, mark | A second, fainter flash |
| Seeking | Bolts and shards curve to foes; the hands rise under the foe nearest the aim | bolt, shotgun, grasp | One mote circling |
| Wide | Radius or width +50%, damage −20% | placed, zone, smite, grasp, wall (longer), orbit (a wider ring) | A faint flat disc below the hand |
| Quicken (Swift) | Cooldown −30%, mana +20% | every shape | The motes run faster |
| Vein (Blood) | Short of mana, half a heart pays (never the last) | every shape | A red tint; the HUD slot says so |
| Lasting (new) | What the spell leaves lasts half again as long (burning ground, the wall, the mantle, the ground, the motes, the hold of a grasp, a mark); mana +20% | placed, wall, self, zone, orbit, grasp, mark | The light lingers after each flash |

The beam, the chain and the mantle take three runes; walls, the ward, the smite and the mark four; the seal, the shards,
the zone and the bolt five; the grasp six. Each socket shows as a pip on its HUD slot: a 24 px glyph in pixel art, made as
the artifacts' icons are.

## Steps

Each step names its pure rules (unit-tested), its dev menu entry (the owner's standing rule), its browser test, its
lines (Nothing silent) and its placeholder sounds. Names marked (new) don't exist yet.

1. **Insight and levels.** The pure rules are `src/progression/levelData.ts` (new; the GDD's `progression/` folder:
   `levelFor`, `purseOf`, `clearInsight`, `potionInsight`). Tuning goes in `CFG.levels` (`at`, `cap`, `foeDiv`, `perFloor`,
   `ordealMul`, `graveSip`, `serpentDiv`), and each boss's `insight` in data/floors.json. A pacing test runs the generator
   as `loot.test.ts` does: level 2 by the second fight room in 75% of seeds, level 4 at floor 1's end in 90%, the cap never
   before floor 5.
   - **The game side** is `src/progression/insight.ts` (new): `gainInsight(n, x, z)` and the purses.
     - The purse is set in `makeEnemy` and paid in `killEnemy`.
     - `halve` splits it between the two halves.
     - `breakWard` marks a boss's Wardling unpaid.
     - A clear pays at the top of `onRoomCleared` for normal and ordeal rooms.
     - A boss pays in `onBossDead`.
     - Potions pay through a run list of their own, `G.run.potionsUsed` (new).
     - The Grave Draught pays in `DRINK`.
   - **What shows:** the streaks (one instanced mesh, the stepped glow); a thin insight strip under the mana bar, the
     level beside it; levels queued in `G.run.pending` (new); a stepped level-up glow on the mage; the level on the end
     screen. The lines: "Level 3" over the mage, and once in a first run, "What a foe's magic held passes to you".
   - **Sounds:** `insight` and a `levelUp` stinger.
   - **Dev menu (Mage tab), Levels:** an info line, "+ insight to the next level", "Level 12", "Back to level 1";
     `__game.insight`, `level`, `giveInsight(n)`; `?level=N`.
   - **Browser test:** a foe struck down through `__game.hit` pays its purse; a room's clear and a boss pay theirs.
   *Built (2026-10-02)* as planned. The rooms' roles are filled by a pure `src/world/fill.ts` now (`fillRoles`, from
   `buildRoom`, in the same order of draws, so seeds replay their fights), so the pacing test measures the curve on the
   generator itself (300 seeds: every check holds). The streak is a white-hot head and a trail of five in the foe's light;
   a jump of several levels at once rises as one. Also: an empty icon link in index.html (the browser asked for
   /favicon.ico, a 404 that failed a browser test).
2. **Attributes.** `CFG.attributes` holds the per-point numbers. `attrBonus` (pure) is folded into `computeStats` after the
   artifact loop with the same additive and multiplier rules. The new stat keys `heartHalves` and `regenMul` are refused in
   data/artifacts.json by the validator. Spending Will fills the mana it adds (`refreshStats`' clamp stays as it is, so
   artifacts behave as now).
   - **On the way:** a half container in `renderHearts`, and the inventory's regen row read from the stat. `shockLeap`
     stops applying the spell multipliers a second time. This changes leap damage for the Crown of Thorns and Giant's Brew
     builds: tested with a spell multiplier other than 1, with `npm run balance` re-run for the Storm builds.
   - **The inventory's "The mage" tab** shows the level, insight and attributes.
   - **Dev menu (Mage tab):** +1 to each attribute; `__game.attrs`, `spend(attr)`.
   - **Tests:** unit tests of `computeStats` with points; a browser test of the half container.
   *Built (2026-10-02)* as planned: `src/progression/attributes.ts` (pure: `attrBonus`, `freePoints`, `ATTRS`) and
   `points.ts` (`spendPoint`, `pointsToSpend`; `G.run.attrs`), `computeStats`' last argument (the attributes' own keys stay
   off artifacts: the validator refuses them), `stats.regenMul` read by the mana's coming back, the half container drawn as
   half a heart, the inventory's Growth section on "The mage" tab (the level, its insight, the points to spend, each
   attribute). A point spent rises over the mage in its colour with a chime. The shock's leap passes the blow as dealt
   (`blow` in `damageEnemy`): the Crown of Thorns' ×1.5 now comes once (a browser test), and a leap no longer carries the
   first foe's weakness, guard or frozen ×1.5 to the next. The Storm build's balance run after it (`npm run balance --
   school=storm`, two seeds): the median foe still falls in 1.3 s, as in docs/balance.md; the long fights (the Phoenix, the
   Lodestone Golem) move within their noise.
3. **Boons: the data and the deal.** `data/boons.json` holds each boon's id, school or area, effect, params (a school
   boon's rank II params beside its first), how often it may be taken, weight, icon, colour, text and lore. `src/progression/boonData.ts` (new, pure) holds `validateBoons` and
   `dealBoons(state, rng)`, on the run's own `boons` stream, one draw a level.
   - **The deal** leans to the build: school weights, the attuned rule, the pledge (`G.run.pledge`: the next library's
     `pickPages` holds at least one page of that school, then the pledge is spent), the lean's mark on a card, Keen Nose kept out while the Spoon is held, and Second Socket
     only while a waystone lies ahead.
   - **Boon effects** are kept off artifacts as the transformations' `GIFTS` are, and `boonsFor(stats)` (new) adds them
     after `giftsFor` in `refreshStats`, so behaviours keep asking `stats.effects`.
   - **Lines:** the pledge's two lines, and once a run "Attuned: the deal leans to Ember".
   - **Dev menu (Rooms & runs):** the pledge beside the floor's lean.
   - **Unit tests:** no repeat in a deal, a general card always, Tempered never dealt out, the same state dealing the same
     cards, the lean, a school boon dealt again only as its rank II, and the pledge's page.
   *Built (2026-10-02):* data/boons.json (eighteen, each school's two with their rank II, all with lore), the pure
   `src/progression/boonData.ts` (`validateBoons`, `schoolWeights`, `dealBoons`, `pledgeFor`) and the game side
   `src/progression/boons.ts` (`dealNow`, `takeBoon`; `G.run.boons`, `casts`, `pledge`, `deals`). One change from the plan:
   the hooks ask `boonRank(id)` and `boonParam(id, key)` rather than tags in `stats.effects`, since a boon has two ranks with
   their own numbers. The pledge's page is `pickPages`' first (its last argument); Tempered's three points count already.
   Dev menu (Mage tab): Boons (take each, deal three); Rooms & runs: the pledge beside the floor's lean.
4. **The level-up screen.** It is `src/ui/levelUp.ts` (new, `#scrLevel`), built as `alchemyTable.ts` is
   (`initLevelUp({ pause, resume })`, keys and pad routed in `main.ts`). It opens only while the game is in play, with no
   doors locked and no other screen open (the table, the inventory, a page's prompt). Otherwise the level waits in
   `G.run.pending`. A short lock keeps a held cast key from choosing.
   - **What shows:** a boon taken shows its lore card (`showLore`, kind "Boon") and joins the inventory's "The mage" tab. Each
     boon is a sigil built in code in its school's light (`src/progression/boonLooks.ts`, new), its 24 px icon made
     through `iconUrlOf`.
   - **Sounds:** a card turned, a card taken.
   - **Choosing for tests:** `DEV.autoLevel` and `?autolevel` (new) choose without the screen. The browser tests' `start()`
     helper and `tools/balance.ts` turn them on, so the suites and the bot never meet a paused screen.
   - **Dev menu (Mage tab):** "Offer boons now", "Choose for me", each boon from the data; `__game.offer`, `chooseBoon(i)`,
     `giveBoon(id)`, `boons`; `?boons=`.
   - **Browser tests:** a level waits for the doors; a held cast key doesn't choose; a choice changes the stats.
   *Built (2026-10-02):* `src/ui/levelUp.ts` (`#scrLevel`: `checkLevelUp` from the loop, a calm of `CFG.levels.calm`
   after the fight; the lock of `CFG.levels.lock` counted from when the cards are drawn) and the sigils
   `src/progression/boonLooks.ts` (a stone medallion, its emblem in strokes of the boon's colour, a second ring at rank II).
   Arrows or WASD choose and Enter or Space take (the arrows are the cast keys, so the lock is what keeps a key from the
   fight from choosing). The level badge glows while a level waits, and the first time in a run a line says so.
   `DEV.autoLevel` is 'choose' (`?autolevel=1`, the dev menu, the balance bot) or 'skip' (`?autolevel=skip`: the browser
   tests, so a fight cleared changes none of the mage's numbers).
5. **The twelve school boons**, each through a hook that exists. A boon's name rises the first time it acts in a room,
   with a line the first time in a run (`STR.boons`) and a sound in its school's palette. A spell's panel says what a boon
   does to it this run. The Magic tab's "Boons here" sets each one off on dummies. Each has a browser test.
   - **5a. Tuning boons:** Banked Coals, Deep Winter, Gathering Dark, Perennial and Forking Arc. The run's tuning reaches
     `applyStatus`, and the direct writes of the hex's cap in `statusFx.ts` and `hexGround` go through it. Forking Arc
     uses `chain`'s jumps and the shock's leap.
   - **5b. Hook boons:**
     - **Flamekeeper:** `updateMagic`.
     - **Cold Snap:** `tickStatus`' `thawed`.
     - **Spark Wake:** `laySpark` by `'mage'`. `updateFoeHazards` spares the mage from its own spark, and `shockAt` gets
       `spareMage`. A browser test stands the mage on its own spark.
     - **Votive Heart:** `castSpell`'s Hallow branch.
     - **Laid Bare:** the guard rule in `damageEnemy`, beside `seared`.
     - **Thirsting Hex:** `spendHex`.
     - **Seedfall:** a `blossom` laid with `addProp` where the foe fell.
     - **The mend budget:** `CFG.boons.mendPerRoom`.
   *Built (2026-10-02)* as planned, after a plan of its own (the owner's ask: plan it first), in four commits. The hooks ask
   a light `src/progression/boonHooks.ts`: `boonRank`, `boonParam`, `boonMul` (1 while not taken), `magicNow()` (the
   statuses' tuning with Deep Winter's and Gathering Dark's numbers, made again only when their ranks change), `inFight()`,
   `boonActs(id, x, z)` (counted; the name rises once a room, the line once a run, `Sfx.boon` in the school's note) and
   `boonMend` (the room's budget, half a heart; a line the first time it stops one). The pure side in `boonData.ts`:
   `boonTuning`, `statusMul` and each school boon's `touches` (validated), which the spell's panel reads for its "Your
   boons" (a status's number as the boons make it, the spell's own beside it; the chill note from the tuned stack; chips
   for Sanctified, Hex, Root and Overgrown, which showed their keys before). `inflict(e, status, from)` takes who set it off:
   `'mage'` from the six shocks the mage casts (Arc, Conductor, Static Mantle, the thundercloud, spell bolts, the Bottled
   Storm), `'snap'` from Cold Snap's breath. Decisions taken in the plan: Votive Heart mends on the first Hallow cast while
   hurt in a fight; Cold Snap spreads one hop (a foe its breath froze breathes nothing, so Deep Winter II and Cold Snap II
   can't freeze two foes forever); Seedfall's plants hold no reagent, grow at most four a room, never at a boss's fall, on a
   pool, by a door, under the mage or at the room's middle; Flamekeeper counts four flames at most (its card says so), the
   mage's own burning ground being erupted seals and the Pyromancer's embers; Spark Wake's sparks come only from the mage's
   own shocks, never from a spark's sting; Perennial's root is laid straight on (Root is Umbral's: through `inflict` it would
   strip Hallowed mantles and feed Umbral elementals). Also: `?boons=deepWinter:2,coldSnap`, the Magic tab's "Boons here"
   (`src/progression/boonTest.ts`, `__game.boonHere(id)`), `__game.boons`' `acted` and `said`; words of size 40 (a counter's,
   a flower's) stack with the names rising from the same spot. Browser tests: three, one for the tuning boons, one for the
   mends and Laid Bare, one for what the boons leave behind. Before shipping (the rules review): the general boons whose
   hooks are still to come are held out of the deal (`NOT_YET` in boonData.ts; each step takes its own off), a level's
   screen spends every point it owes (Tempered's three with it), the inventory's "The mage" tab lists the boons taken, and
   the attributes' words are built from their tuning.
6. **The six general boons.**
   - **Tempered:** more points on the screen.
   - **Keen Nose:** `knownPotion` reads it.
   - **Scavenger:** the killing blow's affinity is kept for `foeReagent`.
   - **Brewer's Breath:** `usePotion` runs the potion's `THROW` at the feet. The mage is spared, and a throw that would
     only touch the mage adds nothing.
   - **Afterglow:** set in `castSpell`, read by the cantrip.
   - **Second Socket:** works from step 7.

   Lines, sounds, dev buttons and tests as in step 5.
   *Built (2026-10-02)* as planned. Tempered's points are spent on the level's own screen (step 5's review). Keen Nose:
   `knownPotion` reads it (the belt, the inventory, the shop, the aim ring), its name rising when a potion only its smell
   knows comes into the belt. Scavenger: `damageEnemy` keeps whether the last blow was the foe's weakness (`weakBlow`), and
   `foeReagent` drops its reagent when the roll fails (the roll still drawn, so seeds replay). Brewer's Breath: `breathe` in
   potionThrow.ts runs the throw at the feet after the drink, sparing the mage (its fire pool the mage's own, a blast turned
   aside: `blastAt`'s `spare`); the healing draught breathes nothing. Afterglow: `afterglowCast` from `castSpell` keeps half
   the spell's statuses (`afterglowOf`, pure: stacks rounded up) for the next three cantrip casts, which take the spell's
   colour (`takeAfterglow` in `spawnBolt`); its card says casts, not bolts (a fan is one cast). Second Socket stays out of
   the deal until step 7 (`NOT_YET`). The bench ("Boons here") sets off the four that act on something.
7. **Runes on the cast.**
   - **7a.** `data/runes.json` and `src/magic/runeData.ts` (new, pure):
     - `validateRunes`: every spell takes three or more.
     - `runeFits`.
     - `runedDef(def, runes)`: a copy of the spell for one cast, its damage, params and statuses changed.
     - `spellCooldown` (new), the one reader of a spell's cooldown, beside `spellCost`, which now counts rune mana.
       The HUD, the hand marks, the panel and `castSpell` all read these two, so they agree.

     Quicken, Wide, Lasting and Vein come first. Vein pays half a heart through `payBloodTithe`'s way. When a spell is
     short, the order is the Bottled Storm's free cast, then mana, then Vein, then a soul mote as built (`burnSoul`),
     and only then a refusal. Then the HUD's pips and the hand marks' look. A rune carved marks its spell Upgraded
     (`upgrade` in knowledge.ts, a wrapper in memory.ts). The Upgraded stage counts as Used and beyond, so `castSpellOnce`'s
     "known well" line still fires.
   - **7b.** Thrice, Reprise and Seeking, which change how a cast runs. Reprise follows the Philter of Echoes' echo
     (`takeEcho`). A Reprise spell under the Philter echoes twice, once for each, and the lance's look is pooled deep
     enough. Seeking gives `fireSpellBolt` a path to follow.
   - **Both:** each rune's name rises the first time it acts, with a sound in its spell's palette. Dev menu (Magic tab),
     Runes: give each, carve into Q or E, clear, a second socket; `__game.sockets`, `socket(slot, id)`; `?runes=q:seeking`.
     A browser test for each rune.

   *Built (2026-10-02)* after a plan of its own (the owner's ask), approved with six decisions: the HUD shows each socket
   as a pip (a diamond in the rune's colour, hollow while empty) and Vein's half heart, the glyphs showing in the panel,
   the inventory and the dev menu; Vein, short of mana, spends what mana there is and bleeds half a heart for the rest,
   never the last (a line says so once a run); Thrice on Rime Shards fires three volleys side by side (fifteen shards),
   only the middle one chilling; no rune twice in one spell; Second Socket stays out of the deal until the waystone (step
   9), the dev menu opening a slot's second socket now; sockets belong to the slot, so a spell given up or forgotten sends
   its runes to the pouch (`player.runes`) and the slot keeps its socket. In five commits: the rules (`data/runes.json`,
   the pure `runeData.ts`: `runedDef`, a frozen copy with its numbers rounded, the base def itself with no rune;
   `reprisedDef`; `payment`'s order; `canCarve`; knowledge reaching Upgraded only once used, `upgradedSpell` and
   `upgradesOf`); the sockets and the cast (`slotDef`, cached by the socket's array, `spellCooldown` and `payment(slot)`
   in cost.ts, read by `castSpell`, the HUD and the hands; `bleed` from the Bloodied Covenant's tithe; `runes.ts`: `carve`,
   `clearRunes`, `setSockets`, `unslot`, `runeActs` through `actsHere`, shared with the boons, and `Sfx.rune`; the dev
   menu's Runes, `?runes=q:quicken,e:lasting+vein`, `__game.sockets` and `socket(slot, id, size)`); the look
   (`items/runeLooks.ts`, a stone with its glyph cut in it, the strokes shared with the boons' sigils in
   `render/emblem.ts`; the pips; the panel's runed numbers with the base in brackets, the runes carved and, Upgraded, the
   runes borne; the hands' specks, Wide's disc, Vein's red, Lasting's slower fade, Reprise's second flash); Thrice,
   Seeking and Reprise (`thrice` and `seeks` in shapes.ts, `fireSpellBolt`'s `seek` taking the Tome's `homing` path, a
   Grasp reaching `reach` further, Reprise from `castSpell` after the Philter's echo, its holy ground mending nothing and
   its Toll skipping the foe marked; the lance's look a pool); the docs. Wide and Lasting needed no hook of their own: the
   shapes that last keep the def they were cast with, and the weaves read it.
8. **Runes as things.**
   - **The pickup:** `rune` in `ITEMS` and `spawnPickup`; the pouch, `player.runes`. Rune chances are rolled on a stream of
     their own after each table's roll, so a seed's chests, hoards and wares stay as they are. `runes` per floor goes in
     data/floors.json, none on floor 5.
   - **The look:** a chip of rune stone (`src/items/runeLooks.ts`, new), its icon through `iconUrlOf`.
   - **What shows:** lore cards; the pouch and the sockets in the inventory's Spells tab; a line when a spell given up sends
     its rune back to the pouch. Sounds for picking one up and the pair's crumble.
   - **Dev menu (Mage tab):** a rune in the Drops row.
   - **Tests:** `loot.test.ts` checks five or six a run; a browser test buys one, and gives up a runed spell
     for a page and finds the rune in the pouch.
   *Built (2026-10-03)* after a plan of its own (the owner's ask), with three decisions: a rune leans to the build (two
   times in three one that fits a slotted spell, else any of the seven: `pickRune`, `CFG.runeDrops.lean`); the merchant
   lays it as an extra ware, so a seed's other wares stay; the pouch shows in the Spells tab. `rune` is an `Item` (the
   Drops row lists it); `data/loot.json`'s `runes` holds the chances (merchant .5, secret .5, Wanderer .5, gilded 1),
   `rune` in both traders' prices (10, 12), each floor's `runes` scales them (0 on floor 5); every roll and every rune
   drawn on the run's own `runes` stream (`runeHere`, `dealRune` in magic/runes.ts), after the table beside it. The
   pickup is `runePickupLook` (runeLooks.ts: the stone as a chip, painted as the kit's pieces); taking one is `addRune`
   (`Sfx.runeTake`, its card through `runeCard`, also heard when a given-up spell's runes fall back). The ware panel and
   the card say what it does, what it fits (`runeFitsText`: shapes, and the spells in the hand) and that a waystone
   carves it. The inventory's Spells tab shows each slot's socket (◆ carved, ◇ empty) and the pouch. Dev menu (Magic
   tab, Runes): each rune into the pouch, a rune ahead, runes wherever they can lie (`DEV.runes`, the floor built again);
   `__game.runesAlways(on)`, `runeOdds`, `drop('rune', x, z, { rune })`. Tests: `pickRune`'s lean and replay
   (runes.test.ts), the economy's runes a run and the data's checks (loot.test.ts), and a browser test (a rune taken,
   one bought, a runed spell given up for a page, the Spells tab). The crumble of a waystone's pair waits for step 9.
9. **The waystone.** It is `src/world/waystone.ts` (new) and its own look, built from the kit's parts but not the rune
   stone's: a tall menhir with a hollow for each socket, dark until the boss falls, then kindling. It holds:
   - the rest, once, with mana streaming into the hand marks;
   - a spell cast into it (beside `wardNear` in `castSpell`), which is refunded and opens its sockets;
   - the screen `src/ui/waystone.ts` (new, `#scrStone`): the Runes tab (carve, lift out) and the Belt tab.

   The belt's order (`moveInBelt`, new) can also be changed in the inventory's Potions tab at any time.

   Lines for the first rest and each carving; sounds `kindle`, `rest`, `carve`. Dev menu (Rooms & runs): "Raise a
   waystone here", "Open the waystone"; `__game.waystone`, `openWaystone(tab)`. It is testable in any boss room before the
   room exists. Browser test: cast Q into it, carve Seeking. The room inspector runs on it (`changed`, `--against
   origin/main`).
   *Built (2026-10-03)* after a plan of its own (the owner's ask), with three decisions: the pair is offered in the stone's
   screen, the two side by side and described; walking up opens the screen and a cast into it (free) opens it on that
   spell; Second Socket comes into the deal now, its socket chosen at the stone. Until step 10 the stone rises in the boss
   room when the boss falls (`waystoneAfterBoss` from `onBossDead`, before the boss's gifts, to the side at the back, clear of the page's reach), on
   floors 1 to 4. `src/world/waystone.ts`: `raiseWaystone` (its look `waystoneLook` in mechLooks.ts: a menhir of grey
   stone, two hollows that show the target slot's runes while the screen is open, strokes that kindle gold),
   `updateWaystone` (it grinds up, then kindles: `Sfx.kindle`), `checkWaystone` (the lab's latch), `castIntoStone` (from
   `castSpell` before cooldown or payment: nothing paid, a strike of the spell's light), `restAtStone` (the first opening:
   full mana, every cooldown ended, mana streaks to the hand through insight.ts' `streakTo`, `Sfx.rest`); the pair dealt
   as it rises (`dealPair`, the pure `pickPair`). `src/ui/waystone.ts` (`#scrStone`, as the alchemy table's): the Runes
   tab (each slot's sockets: a carved rune lifts back for nothing, `liftRune`; an empty hollow makes its slot the target;
   Second Socket's owed sockets, `secondSocket`, `G.run.socketsOpened`; the pair, `takeFromStone`, the other crumbling;
   the pouch, `carveHere` through `carveFromPouch`, `Sfx.carve`) and the Belt tab (`moveInBelt` in potions.ts, which the
   inventory's Potions tab now does too: Enter picks up, Enter places). Dev menu (Rooms & runs): Raise a waystone here,
   Open the waystone; `__game.waystone`, `raiseWaystone`, `openWaystone(tab, slot)`, `closeWaystone`, `stoneTake`,
   `stoneCarve`, `stoneLift`, `stoneSocket`, `moveInBelt`. Tests: `pickPair` (unit), Second Socket dealt (boons.test.ts),
   a browser test from the boss's fall through the rest, the pair, carving, a cast caught, Second Socket and the belt, and
   none on floor 5.
10. **The waystone room.** It is placed by `placeWaystone` in `generate.ts`, after `placeLaboratory`, on a stream not drawn
    from the room list, so every room planned before it, the laboratory too, stays where it was. It opens only into the
    boss room, never beside the secret room, on an edge `doorFits` leaves clear for every boss template.
    - **Data:** `waystone` per floor in data/floors.json; templates `waystone_*` in special.json.
    - **Code:** `waystone` in `RoomType` and `DoorStyle`; `furnishWaystone`, `enterWaystone`; `onBossDead` opens the way
      down beside the stone; the fallback in the boss room.
    - **Dev menu:** a minimap icon; `STR.dev.roomNames.waystone`; `?room=waystone_plain`.
    - **Tests:** world.test.ts checks that the plan with and without waystones is the same but for the waystone, the
      single door, and every boss template. The smoke test's walk to the way down and its room-count bounds are updated,
      and a browser test runs from the boss to the next floor.
    - **The room inspector** runs on it.

    *Built (2026-10-03)* after a plan of its own, with the owner's two choices: the room waits empty and dark until the
    mage first walks in after the boss falls, and the stone then rises with the trapdoor beyond it, away from the door.
    `placeWaystone` (generate.ts) runs after the laboratory on a stream from the boss room's seed. It takes a free cell
    beside any boss cell (a great hall's too), never touching the secret room, a lone one where there is one; its one door
    pair has shift 0, which every boss template leaves clear. A free cell is there on over 99% of seeds. `waystone` is in
    `RoomType` and `DoorStyle`, and floors 1 to 4 have `"waystone": true`. The templates are `waystone_plain` and
    `waystone_cairns`.
    - **In the game:** `enterWaystone` (waystone.ts, from `enterRoom`) gives the banner, and on the first entry with the
      boss down (or no boss room, under `?room=`) `raiseWaystone` near the middle, a little toward the door
      (`CFG.waystone.toDoor`, so the ring beyond clears the stone's top). The room is dark (`CFG.waystone.dark`) until the
      stone kindles; then the trapdoor opens beyond it (`CFG.waystone.trapdoor`; `makeTrapdoor`'s `room` puts it in that
      room's group).
    - **The boss room:** `onBossDead` gives the boss room neither stone nor trapdoor where there is a waystone room. Its
      banner says the way down lies past the waystone and a line names the door (`pointToStone`); the gifts step off the
      lane to that door (`offLane`, `CFG.waystone.lane`). Elsewhere (floor 5, no cell) it does as before.
    - **Its look:** the door's style `'waystone'` (a grey menhir with a gold rune on the keystone, tested before `'boss'`)
      and a minimap mark that dims once rested (`OWN_MARK`).
    - **The dev menu** lists it with the floor's special rooms; `?room=waystone_plain`; `__game.wayDown`.
    - **Tests:** world.test.ts covers the rules, the plan the same with and without it, its door into every boss template
      and the rate. The browser tests cover the seeded floor's walk down through it, the serpent-as-boss pointing past it,
      and the room from the boss's fall to the next floor. Step 9's test stays as the fallback's.
11. **The shrine's bargain.** A bargain stone stands at the circle's head (`buildShrine`). Its price is a heart container
    (`heartsPaid`, never the last). A spell cast into it sets the deal's school, on the run's `boons` stream. The runes run
    red, then gold, with a line and a sound. Dev menu (Rooms & runs): "Bargain here". Browser test: the price, the deal,
    once a shrine. The room inspector runs on `shrine_*`.

    *Built (2026-10-03)* after a plan of its own, with the owner's two choices: the container is paid only when a boon is
    taken (Esc backs out with nothing paid and the stone waits to be tried again), and only a cast opens it (walking up
    says how).
    - **The stone:** `src/world/bargain.ts`. `buildBargain` (from `buildShrine`, at `bargainSpot`: the circle's head,
      or its foot or beside it where a doorway's lane runs there; its blocker reaching the wall behind it) and its look `bargainStoneLook` (specialLooks.ts: a stele on a slab, a carved heart and runes on one material,
      `BARGAIN_RUNES` dark, red, gold). `checkBargain` gives the walk-up line; `castIntoBargain` (from `castSpell` before the
      waystone's catch, cooldown and payment) refuses the last container (`maxHp - 2 < 2`), else strikes the spell's light
      into it, runs the runes red, plays `Sfx.bargain` and opens the deal on its school.
    - **The deal:** the level-up screen's bargain mode (`openBargainDeal`: `dealNow(school)`, each card's price, no point;
      `levelEsc` backs out through `refuseBargain`; `takeBargainCard` for the tests). `keepBargain` pays the container
      (`player.heartsPaid`, as the bone altar does), takes the boon (its card), turns the runes gold
      (`Sfx.bargainKept`) and keeps the stone shut. The shrine's banner and its minimap mark (bright while the bargain
      waits) say so.
    - **Dev menu (Rooms & runs):** "Bargain here", its deal on each school. Hooks: `__game.bargain`, `openBargain(school)`,
      `takeBargain(i)`, `refuseBargain()`, `heartsPaid = n`.
    - **Browser test:** the stone's place, the line, a free cast dealing two of its school and one general, Esc, a boon
      taken for a container, once, and the last heart refused.
12. **The run around it.**
    - **The arc:** `arcHeld` counts levels (`CFG.arc.perLevels`), and taking a level calls `updateArc`.
    - **Deeper starts:** `levelAtFloor` (pure) and `?level=auto` start a deeper floor at its expected level.
    - **The balance bot:** `tools/balance.ts` writes insight per room and each floor's end level into
      docs/balance-runs.md, and M4.9's dials are checked at those levels, with any changes made in data only.

    *Built (2026-10-03)* after a plan of its own (the owner's choices: a deeper start's choices wait; floors that come out
    easier get their dials raised), and with the owner's ask made while it was built: **the run had grown too easy**; make
    it harder with more rooms and scarcer hearts, **never with foes that soak blows**.
    - **The arc:** `arcHeld` adds `arcLevels()` (every `CFG.arc.perLevels`, 3, levels gained count as one artifact); a level
      reached calls `updateArc` and dresses the mage when the stage changes (`leveled` in insight.ts).
    - **Deeper starts:** `levelAtFloor` (levelData.ts) from `CFG.levels.floorInsight` (the measured medians): levels 1, 4,
      7, 9, 11 at the floors' starts; `?level=auto`, the dev menu's new runs.
    - **Harder runs:** every floor three more rooms (13 to 17, 16 to 20, 17 to 21, 18 to 22, 18 to 22); hearts half as
      likely a room (room clears, urns, piles, coffers: 2.7, 3.1, 3.6, 3.8 and 3.5 half hearts a floor, against 4.1, 4.7,
      5.2, 5.5 and 5.3 before); a room clear drops something half the time (0.65 before); obols kept in the GDD's 12 to 18
      (fewer from clears, foes, urns; a gilded chest 0.08); the level thresholds scaled to the extra insight (`CFG.levels.at`
      from 80 on), so floors still end at levels 4, 7, 9 and 11, the cap on floor 5.
    - **The bot** starts each floor at `levelAtFloor` and reports insight a room and each floor's end level (on the curve
      exactly: 4.0, 7.0, 9.0, 11.0, 12.0). At their levels floors 1, 3 and 5 came out 10 to 20% easier a room than the
      level-1 run of 2026-10-01, so every floor's pressure rose (extra 0.12, 0.16, 0.28, 0.32, 0.42; eliteMul 1.1, 1.15,
      1.3, 1.35, 1.5; floor 1 no longer bare). Verified on four seeds, six builds: a room's seconds · hearts lost are
      15.0 · 1.0, 17.6 · 1.0, 25.0 · 3.7, 24.9 · 3.6 and 42.5 · 4.9 (15.4 · 0.9, 15.6 · 1.1, 25.1 · 4.5, 25.3 · 3.0 and
      48.8 · 5.2 at level 1 before): each room as hard at its level as it was at level 1, three more of them a floor and
      fewer hearts. No foe's health changed.
    - **Found on the way:** the bot's first full run stopped on a Rootling's dig sound with no position; a sound from
      nowhere now plays in the middle, and a foe or the mage whose step goes non-finite keeps where it was.
13. **Close**:
    - the GDD as built, with its stale lines fixed: the pacing target, the waystone's three descriptions, the shrine's
      floors, Hex's "life or mana", the boons' and runes' names, shapes choosing runes, "five schools", the potion key,
      "three floors", "alchemy table or shrine (alternating)", the tech layout's folders and its sanctum save, and the
      asset list's icons (18 boons, 7 runes);
    - a line that carved runes don't count toward the Runescribe;
    - CLAUDE.md;
    - the rules reviewer;
    - a room sweep;
    - screenshots for the owner (the level-up screen, the waystone, the runed hands, the bargain);
    - the frame cost;
    - the suites green.

    The play-test build ships when the owner asks.

    *Built (2026-10-04).* **M6 is built**, and closed on GitHub.
    - **The GDD as built:** the runes (the seven, the shapes each fits, carved runes outside the Runescribe), the boons
      (the eighteen), "Insight and levels as built", the loop's special rooms and between floors, the waystone, the
      pacing target, six schools, Hex, the shrine's floors (2 and 4), the potion key, "three floors" of M4's time, the
      tech layout's `progression/` (the sanctum save waits for M7), the asset list (18 boons, 7 runes), the roadmap's M6 row.
    - **The rules reviewer** found nothing blocking. Its nits fixed: the generator's comment on the waystone room's order;
      the bargain stone opens only when its deal does (no stone left open under another screen); `castIntoBargain`'s
      unused slot; the arc's levels through the pure `levelsHeld` (costumeData.ts), tested; the dev menu's arc line counts
      artifacts and levels apart.
    - **Found on the way:** `?runes=e:lasting+vein` never carved its second rune, since a `+` in an address arrives as a
      space; the parser splits on both, and a browser test holds it.
    - **The room sweep** (every waystone and shrine template, every theme, the carved rooms, objects, a floor of each look)
      found nothing blocking. Fixed: the waystone room's trapdoor showed only half its ring behind the low south wall with a
      north door (`CFG.waystone.trapdoor` 2.4 → 1.9 down the room); `npm run inspect`'s floor mode now skips level-ups
      (they covered every shot after a few rooms) and shuts the alchemy table between shots. Polish for the owner: the
      `waystone_cairns` cairns read as rubble while the room waits dark; the bargain stone is brown on floor 1's brown
      walls (shrines are on floors 2 and 4, where it reads; floor 1 only under `?room=`); foes' dark stains can read as
      holes (from before M6).
    - **The frame cost:** the waystone room with its stone up 74 draw calls (the start room 64), the shrine with its
      bargain stone 99, a boss room 100.
    - **Screenshots** sent to the owner: the level-up screen, the runed hands, the waystone room (west and north doors) and
      its screen, the shrine's bargain stone and its deal.
    - **The suites:** 423 unit tests and 129 browser tests green, and the build. Two foe tests that had passed by luck (the
      floors' extra rooms moved their layouts) were made sure: the moths circle a mage in the room's middle and their motes
      are counted as made; the rootlings are set alight twice, so one caught digging climbs out before the watch.

**What could be cut if it runs long**, without hurting the core (one word each): the Lasting rune (keep six), Brewer's
Breath and Afterglow (sixteen boons), the shrine's bargain, the waystone room (the stone in the boss room).

**Done when** insight raises the mage through twelve levels on the measured curve, each level spends a point and takes one
of three boons that lean to the build and say so, runes are carved at a waystone after each boss and show at the hands and
on the HUD, the shrine deals a boon for a heart, and every new piece has its dev menu entry, tests, line, sound and
pixel-art icon.
