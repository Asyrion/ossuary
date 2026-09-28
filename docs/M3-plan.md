# M3 plan: Magic

Approved 2026-09-28 with the decisions below as proposed. Design lives in `docs/GDD.md`
(Magic system, Spells, Artifacts, Pickups and room types, Audio design); this file tracks the build. Each step
ends playable, with unit and browser tests passing, and is pushed to GitHub Pages.

**Done when** (GDD roadmap): mana, 2 spell slots, 6 spells across 3 schools, status effects, 2 reactions,
library room. M1 to M3 decide whether the game is fun; M3's question is whether magic is the build: after a
floor or two, does the mage feel like a Frost mage or a Storm mage, and do combinations surprise?

## Decisions (2026-09-28)

1. **Three schools: Ember, Frost and Storm.** They're the three whose pairs make the GDD's reactions without
   needing the others, and each has a clear feel (Ember area and damage over time, Frost control, Storm burst
   and groups). Hallow and Umbral follow later with their spells and the Eclipse and Blackfire reactions.
2. **Six spells, an attack and a utility per school**, so every shape the code needs early is covered:

   | School | Spell | Shape | Mana | Cooldown | Effect |
   | --- | --- | --- | --- | --- | --- |
   | Ember | Cinder Lance | beam | 20 | 2 s | Piercing fire beam; Burn on everything in the line |
   | Ember | Pyre Seal | placed area | 35 | 8 s | A seal at the mage's feet erupts after 1 s in a ring of flame and leaves burning ground |
   | Frost | Rime Shards | shotgun | 15 | 1.5 s | Five ice shards in a fan, each adds a Chill stack |
   | Frost | Glacial Wall | wall | 30 | 10 s | Ice wall across the cast direction; blocks shots for 5 s, then shatters on foes near it |
   | Storm | Arc | chain | 15 | 1 s | Lightning strikes the nearest foe and leaps to 3 more; Shock |
   | Storm | Static Mantle | self | 30 | 15 s | For 6 s, any foe that touches the mage is shocked and thrown back |

   Winter's Breath, Thundercall and Phoenix Step, and the Hallow and Umbral spells, stay in the GDD for later.
3. **Status effects:** Burn (damage over time; burning ground sets it again), Chill (slows; the third stack
   freezes for 2 s), Shock (a brief stun, and the next hit leaps to a foe nearby). Bosses slow but never
   freeze, and shrug off stuns after the first each few seconds. Numbers in data.
4. **Two reactions: Shatter and Overload.** Shatter (Frost + Storm): a frozen foe struck by Shock bursts into
   ice shards that hurt its neighbours. Overload (Ember + Storm): a burning foe shocked explodes, knocking
   everything near it back. Steam (Ember + Frost) is the natural third and is cheap to add if the two feel good.
5. **The run starts with no spell.** The first comes from floor 1's library or the floor 1 boss's grimoire
   page (GDD pacing: no later than the first library or boss). `?spells=` and the dev menu give spells for
   testing.
6. **Learning a spell with both slots full:** the page asks which slot (Q or E, LB or RB) while the mage stands
   at it; walking away cancels. The replaced spell's page stays on the lectern, free to take back while in
   the library, like a focus left on its pedestal; later libraries sell the pages of replaced spells for obols.
7. **The library: one per floor, in a dead end of its own** (room counts +1: 10 to 14, 12 to 16, 14 to 18), with
   three pages of different schools. Bosses also leave a grimoire page beside their artifacts, and room clears
   drop one rarely.
8. **Mana as the GDD has it:** 100 to start, 4 a second out of combat and 1 in combat, 3 for each foe the cantrip
   puts to rest, mana vials (+25) from room clears, urns and the merchant (3 obols). A blue bar under the hearts.
9. **Rooms react to magic, in a small first form:** water and oil tiles in some templates. Oil catches fire from
   Burn (burning ground); water carries Shock to everything standing in it, and Frost freezes it for a while
   (a floor that can be crossed). The drowned floor's puddles become real water there. Braziers and the
   elemental trial room come later.
10. **Sound:** a synthesised palette per school (Ember crackle and whoosh, Frost chime and shatter, Storm zap
    and thunder), signature sounds for the reactions, and the GDD's positional sound for effects: panned to
    where they happen in the room, the listener just above the mage, with volume sliders (master, effects,
    interface) in the pause menu. Per-floor reverb and music stay for M8.
11. **The M3 artifacts from the GDD join the pools** (with lore, icons and dev menu entries): Emberwood Wand,
    Tome of Whispers (foci); Mana Lantern, Candle of the Vigil, Frostbitten Ring, Stormglass Pendant, Thurible
    of Ash, Witch's Knot (passives); Crown of Thorns, Hungering Tome (cursed). 43 artifacts in all.

**Magic takes** (the rule of thumb for every borrowed system): Isaac's active items with charges become
spells paid with mana that the dead give back (the cantrip's kills refill it); Isaac's item rooms for learning
become a library of torn grimoire pages that whisper in their school's colour, the chosen page burning into the
mage's hand; the pages of spells given up stay behind as ash-edged leaves that can be bought back.

## Groundwork (all steps)

- [x] Spells as data: `data/spells.json` (school, shape, mana, cooldown, damage, statuses, tags, colour, icon,
      lore) read by a pure `src/magic/spellData.ts` with validation and unit tests; `shape` picks the code in
      `src/magic/spells.ts`
- [x] Statuses and reactions as a pure module (`src/magic/status.ts`): stacks, durations, ticks, boss rules and
      which reaction two statuses make, unit-tested without three.js; tuning in `data/magic.json`
- [x] Spells and statuses use the existing pipelines: projectile spells through `projectiles.ts`, damage through
      `damageEnemy`, particles and decals through `fx.ts`, shared geometries and materials
- [x] Lore cards for spells and grimoire pages (the M2 lore card), and a spell icon for each
- [x] Dev menu: spells (give to slot 1 or 2), full mana, endless mana, statuses on the foes in the room, a
      training dummy (a foe that stands still and never dies, showing its statuses), the library in the floor
      list; `?spells=cinder_lance,arc`, `__game.cast()`, `__game.mana()`
- [x] Placeholder sounds for everything added, per school palette

## Step 1: Mana and spell slots

- [x] Mana: the bar under the hearts, regeneration in and out of combat (`CFG.mana`: 4 and 1 a second), 3 for
      each foe the cantrip puts to rest (`lastHit` on the foe), mana vials (+25, `manaVial` in `data/loot.json`)
      from room clears, urns and the merchant (3 obols), left lying at full mana like hearts at full health.
      Economy: room clears drop a little more often (0.65) so the vial doesn't thin the rest; obols 12.5, 15.3
      and 17.4 per floor, glyphs still ahead, about one vial a floor
- [x] Spell slots on Q and E (LB and RB): cast in the cast direction, or where the mage last aimed or walked;
      mana and cooldown per spell; the HUD shows both slots with icon, key, cost and a cooldown sweep, dimmed
      when mana is short; refused casts (empty slot, cooling down, too little mana, nothing in reach) give a
      small sound and a red flash, the mana bar's too when mana was short. The title screen lists the keys
- [x] The cast plays the hero's cast window (the same thrust as the cantrip)
- [x] One spell end to end: Arc (chain) strikes the foe nearest in front and leaps to three more, each strike
      weaker (falloff 0.85), as braided, flickering lightning; learning a spell shows its lore card
- [x] Dev menu: spells into slot Q or E, full mana, endless mana, forget spells; `?spells=arc`,
      `__game.learn()`, `__game.cast()`, `__game.mana()`; browser test: cast, mana spent, leap, cooldown,
      refusal, mana from the cantrip's kills, the vial

## Step 2: Status effects and reactions

- [x] Burn (seconds; 2.5 damage a second in half-second ticks), Chill (stacks, each 22% slower, thawing after
      3 s; the third freezes for 2 s, a frozen foe takes ×1.5 damage, then 1.5 s before it can freeze again),
      Shock (seconds of a mark; a 0.35 s stun; the next hit on a marked foe leaps half its damage to a
      neighbour within 2.8 tiles) as `src/magic/status.ts` says; `src/magic/statusFx.ts` shows them on any foe
      (embers rising from a burning one, a bluer tint with each chill stack, a block of ice round a frozen one,
      sparks on a shocked one, all readable on placeholder shapes and later on Tripo models). Frozen and stunned
      foes don't move, attack or hurt on contact; chilled ones move slower
- [x] Boss rules: slowed (two stacks at most) but never frozen; stunned at most once every 3 s
- [x] Shatter (Frost + Storm): the frozen foe takes a heavy blow and bursts into six ice shards that fly at its
      neighbours; Overload (Ember + Storm): an explosion that hurts and throws back every foe near it. Each has a
      burst, a flash or shards, a signature sound, and its name rising in the air so players learn them
- [x] Training dummy in the dev menu (stands still, never falls, shows every hit and its statuses), buttons to
      burn, chill or shock the foes in the room; `__game.spawn()`, `__game.inflict()`; unit tests for every
      stack and reaction rule; browser test: freezing stops a foe, Shatter, Overload, a boss that won't freeze,
      the dummy

## Step 3: The six spells

- [x] Ember: Cinder Lance (beam: from just ahead of the mage until a wall, closed door or rock stops it, 7 tiles
      at most; 8 damage and 3 s of Burn on every foe in the line; what it ends on is struck like a bolt, so an urn
      breaks and a cracked wall rings hollow; fire sets off the glyphs it crosses), Pyre Seal (chalked in fire at
      the mage's feet, it brightens and turns for 1 s, then a ring of flame 1.8 tiles out strikes for 14, burns 4 s
      and throws back; the ground burns 4 s more, setting walkers on it burning again, not flyers; glyphs in the
      ring go off)
- [x] Frost: Rime Shards (five ice splinters in a fan, spell bolts through the bolt pipeline: 3 damage and a Chill
      stack each, so at close range all five land and the third freezes), Glacial Wall (ice crystals 3 tiles
      across the cast direction, 2 ahead or nearer when something is in the way, stopping at walls and rocks: they
      stop the mage, foes and their shots, not the mage's bolts, so the wall is a firing line; after 5 s it
      cracks and shatters for 8 and two Chill stacks on foes within 1.3 tiles)
- [x] Storm: Arc (chain), Static Mantle (6 s of sparks and small arcs around the mage; a foe that touches it is
      struck for 4, shocked for 2 s and thrown back, each foe at most every half second, and doesn't hurt the
      mage; a boss is too heavy to throw and still hurts, unless the shock stunned it)
- [x] School sound palettes (Ember crackle and whoosh, Frost chime and shatter, Storm zap and hum); icons and lore
      for all six; Shatter's shards are spell bolts now (ice splinters). Balance against the cantrip (about 10
      damage a second): a full bar is three to five spells and a fight gives back 20 to 35 mana, so a fight has
      a spell or two in it and the cantrip does the rest; a lance through a line or a seal under a crowd kills
      floor 1's foes with the burn, a single target is still the cantrip's work. Spells are refused in the
      merchant's warded shop. The validator checks each shape's params (`SHAPE_PARAMS`); unit tests check the
      six spells (two per school, every shape once) and their costs
- [x] Browser tests: the lance burns two dummies in a line; the seal waits, erupts (damage, burn, knockback) and
      leaves burning ground; five shards freeze a dummy at close range; the ice wall holds a rotling back, stops
      its shot, lets the cantrip through, then shatters and chills; the mantle's zaps keep two rotlings off
      without a hit, and they hurt again when it ends. Dev hooks `__game.shoot()` and `__game.mantle`

## Step 4: The library and grimoire pages

- [x] Generator: a library in a one-cell dead end on every floor (`library` in `data/floors.json`; room counts
      10 to 14 and 14 to 18 on floors 1 and 3, 13 to 17 on floor 2, which also carries the shrine, so that its
      vault and altar still find dead ends; the walk now retries up to 400 times for them). Two templates,
      `library_plain` and `library_urns`; unit tests: one library per floor, a one-cell dead end
- [x] The library room (`src/magic/pages.ts`): bookshelves along the north wall (not across a door or an urn),
      and on the first visit three candle-lit lecterns in a row on the far side from the door, each with a torn
      page of a different school (`pickPages`, its own seeded stream `pages`) whispering motes in its spell's
      colour. Walking into a page learns it into the empty slot and the other two burn to ash; with both slots
      full the page asks which spell to give up (a prompt over the HUD: Q or LB, E or RB; stepping away keeps
      both), and the given-up spell's page stays on that lectern, free to take back while in the library. The
      spells given up in the run (`G.run.forgotten`) come back at later libraries: up to two scorched pages on
      lecterns at the ends of the row, 7 obols each (`grimoire` in `data/loot.json`: lecterns, shelf, rebuy,
      clearChance)
- [x] Grimoire pages beside the boss's artifacts (north of the trapdoor), and as a rare room-clear drop (4%,
      when no artifact rises), with a banner; a page lies loose and swaps like a lectern's
- [x] Door style (dark wood, an open book glowing over the door), minimap mark (an open book, dimmed once the
      choice is made), dry and close placeholder cues: the whisper on entering, a rustle when a page asks or
      falls, ash crumbling
- [x] Dev menu: the library in the floor list (and `?room=library_plain`), "Drop a grimoire page";
      `__game.page()`, `__game.pages`, `__game.forgotten`, and `__game.cast(slot)` answers a page that asks, as the
      key does. Browser test: learn and burn, ask and step away, rebuy from the shelf with obols (refused when
      short), take back for free, the boss's page

## Step 5: Rooms that react to magic

- [ ] Water and oil tiles in the template legend (`~` water, `%` oil) and in some templates; the drowned floor's
      puddles become water there
- [ ] Oil: Burn sets it alight (burning ground for a few seconds, hurting foes and the mage alike)
- [ ] Water: Shock spreads to everything standing in it; Frost freezes it into ice for a while
- [ ] Templates validated for the new tiles; browser test for both

## Step 6: M3 artifacts, positional sound and balance

- [ ] The ten M3 artifacts (decision 11), with lore, icons and dev menu entries
- [ ] Positional sound for effects (panned to where they happen, listener above the mage) and volume sliders in
      the pause menu
- [ ] Balance pass after play-tests (mana, costs, cooldowns, status numbers, spell damage, library prices)
- [ ] GDD and CLAUDE.md brought up to date
