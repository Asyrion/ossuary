# M5 Alchemy: plan

**Status: under way (2026-10-01): steps 1 to 9 built (GDD: Potions and alchemy, M5 as built); the close next.** GDD: Potions and alchemy; the roadmap's M5 row. The second game inside a run: every
potion has a drink effect on the mage and a throw effect on the room, found potions are unidentified, and the mage brews
their own from reagents at an alchemy table in Dr. Jelly's laboratory. The second half is the sixth school, Verdant, and
its garden rooms (GDD: Magic system, A sixth school), planned in its own section when the first half is built.

## Decisions taken as this plan proposes them (the owner may change any)

1. **Six reagents, as the GDD's table lists** (the roadmap's "4 reagents" is older). Their placeholder sources are
   remapped to the foes and objects that exist now (below).
2. **The magic take: a thrown potion is a spell's splash.** Its throw effect lands through the hooks the spells use
   (`fireAt`, `frostAt`, `shockAt`, `inflict`, the hexes), so a splash lights oil, freezes water, wakes mechanisms and
   sets off reactions and weaves like any spell.
3. **Controls:** R (the gamepad's D-pad up) uses the chosen potion: a tap drinks it, held and let go it is thrown where
   the mage aims (the cast direction). F (D-pad left and right) chooses the next potion in the belt. Shown on the title's
   controls and the belt itself.
4. **Grave Draught's drink** costs half a heart for a pale soul mote until M6 brings XP (then it gives the 15 XP the GDD
   names instead).
5. **Shadowstep Tincture's drink** (invisible, foes lose track): for 4 s the foes' shots go wide (as from inside steam)
   and their touch misses. Its throw is a cloud of darkness that does the same to the foes inside it.
6. **Philter of Echoes' throw**: each foe in the splash strikes the nearest other foe once, as hard as its own touch.
7. **Bitter Remedy's drink** lifts one held curse's price until the floor ends (the newest curse), its gift kept whole.
8. **Dr. Jelly** keeps the laboratory as the merchant's shade keeps the shop: an alchemist built in code (a figure in a
   stained coat, goggles, a jelly in a jar for a familiar), who identifies a potion and trades recipes for obols.
9. **What a run knows and what is kept:** a potion identified in a run stays identified for that run; a recipe brewed is
   kept between runs (`ossuary.recipes`, as spell knowledge is) and keeps its potion identified in every run after.
10. **Bottles are pixel art like everything else** (the GDD's one pixel for everything): six bottle shapes built in code,
    their liquid colours (each potion its own) and shapes shuffled per run on the run's seed; their HUD icons made as the
    artifacts' are.

## The pieces

| Potion | Drink | Throw (its school) |
| --- | --- | --- |
| Healing Draught | Heal 1 heart | Heals the mage standing in the splash (Hallow) |
| Mana Tonic | +50 mana | Foes in the splash lose their next attack |
| Liquid Ember | The cantrip burns for 20 s | A pool of fire for 5 s (Ember) |
| Frostbrew | Immune to Chill, +20% speed for 20 s | Freezes everything in the splash for 2 s (Frost) |
| Bottled Storm | The next 3 spells are free | A lightning storm on the splash for 3 s (Storm) |
| Philter of Echoes | The next spell casts twice | Foes in the splash strike each other |
| Giant's Brew | Bigger, +50% damage, −20% speed for a room | Foes in the splash grow slower and bigger |
| Shadowstep Tincture | Foes lose track for 4 s | A cloud of darkness: foes inside can't aim (Umbral) |
| Bitter Remedy | A curse's price lifted until the floor ends | Clears the statuses in the splash |
| Volatile Mixture | A random potion's drink | An explosion (a glyph's blast) |
| Hex Brew (bad) | Controls reversed for 5 s | Foes in the splash are Hexed (Umbral) |
| Grave Draught (bad) | Half a heart for a pale soul mote | A friendly skeleton for the room |

| Reagent | Comes from | Leans towards |
| --- | --- | --- |
| Grave Moss | Sporelings, Rootlings, grave roots and glowcaps, damp rooms | Healing |
| Wisp Essence | The creatures of light: Vesper Moths, Lantern Jellies, Firefly Swarms, wisps of curses | Mana, echoes |
| Bone Dust | Bone piles, skull heaps, tombs, Rubble Crabs and golems | Strength, grave magic |
| Ember Salt | Braziers, Ember foes, burning foes | Fire |
| Rimewater | Frozen water, Frost foes | Frost |
| Warden's Ash | Bosses | Rare potions |

Recipes (two reagents, order not counted; GDD: Brewing): Grave Moss + Grave Moss = Healing Draught; Wisp Essence + Grave
Moss = Mana Tonic; Ember Salt + Bone Dust = Liquid Ember; Rimewater + Wisp Essence = Frostbrew; the rest drawn up in step 1
so every potion but Volatile Mixture has one; Warden's Ash + any = a rare potion (Philter of Echoes, Giant's Brew or
Bottled Storm); an unknown pair that matches no recipe brews a Volatile Mixture.

## Steps

1. **The pure rules** (`data/alchemy.json`, `src/items/alchemyData.ts`, unit-tested): potions with their drink and throw
   effects and params, reagents and where they come from, recipes; the validator; bottles shuffled on the run's seed
   (`bottlesFor`); what is identified (`isKnown`); brewing (`brew`); a reagent for a fallen foe or a broken object
   (`reagentFor`).
2. **The belt**: `player.belt` (3 slots, 4 with the Alchemist's Satchel), potions as pickups (the unknown bottle), the
   HUD's belt beside the spell slots (bottle icons in pixel art), choosing and using (R and F, the gamepad's D-pad), the
   lore card the first time a potion is known, the inventory's Potions tab, the dev menu (give a potion, identify all,
   forget what is known).
3. **Drinking**: the twelve drink effects, each with its chip beside the mana bar and its line (Nothing silent), the
   model's Drink Potion clip.
4. **Throwing**: the arc and the 2-tile splash (a ring on the floor in the potion's colour), the twelve throw effects
   through the magic hooks.
5. **Reagents and the pouch**: drops from foes by school and from objects; the pouch in the inventory; the loot tables
   and the merchant (a potion 4 obols, a reagent 2).
6. **Dr. Jelly's laboratory**: a special room on floors 1 and 3, the alchemy table (choose two reagents, brew; one potion
   identified free a visit), Dr. Jelly and the recipe trade, the jelly globes (a bolt bursts one: a jelly foe or a
   reagent), recipes kept between runs and written into the book (the inventory).
7. **The jelly serpent**: once a run it may break out of its vat as a boss, flooding the room with jelly that slows and
   carries a shock; built in code like the other bosses.
   *As designed (2026-10-01, before building it):* the serpent breaks out once a run at most: when the mage cracks the vat
   window with three bolts (a fight they choose), or by itself after the first brew in a laboratory whose serpent the
   run rolled restless (CFG). The glass bursts, green jelly floods part of the room (pools of water marked `jelly`: slower
   to wade, a shock runs through them as through water, frost freezes them), the doors lock and Dr. Jelly ducks behind his
   table. The serpent (a boss built in code: a head and a chain of jelly rings that follow it) swims submerged through the
   jelly where bolts can't reach it, surfaces to lunge or spit slowing globs; a shock through its jelly or a freeze traps it
   at the surface, open; out of the jelly it slows. Weak to Storm, resisting Frost. Fallen, it leaves Warden's Ash, a rare
   potion and Dr. Jelly's thanks (a recipe for free); it is not the floor's boss (no trapdoor). `?boss=serpent` and the dev
   menu's boss fights put it in a boss room, its own jelly poured round it.
   *Built (2026-10-01)* as designed: `actors/jellySerpent.ts` (the fight), `actors/serpentLooks.ts` (the look),
   `world/flood.ts` (which tiles a flood covers, pure), jelly pools in `world/pools.ts`, the vat in `world/laboratory.ts`.
   Also fixed on the way: a boss put to rest from above half health no longer calls its helpers in its last step.
8. **The Alchemist**: the Alchemist's Satchel and two more artifacts of the family, each showing on the mage; the
   Alchemist transformation (a bandolier of vials and a stained apron; thrown potions split in two).
   *Built (2026-10-01):* the Alchemist's Satchel (one more belt slot, reagents more often), the Taster's Spoon (every
   potion carried known) and the Cracked Retort (a splash half again as wide whose glass cuts), with the Leech Jar counted
   in the family; the transformation's bandolier and apron, and the split throw (`splitThrow`, `CFG.alchemy.split`).
9. **Verdant** (the second half, planned here when step 8 is built): Overgrown, three spells, the five reactions that
   make the wheel whole, garden rooms and their reagent, its sound.
   *Planned (2026-10-01, when step 8 was built; GDD: Magic system, A sixth school; M4.10's Bloom and Blight).* Verdant
   is the sixth school: growth, roots and pollen, in a spring green, its sound wood and breath (reeds, seed pods). Built in
   four parts:
   - **9a. The school and Overgrown.** `verdant` joins the schools everywhere they are listed (its light, its name, the
     wheel's sixth spoke unsealed, a rune stone's emblem, the spell marks' motion, a Wardling of its own for the drinking
     ward). Its status, Overgrown (`grow`, seconds): vines that slow a foe more the longer they hold (from a little to
     more than half), shown on the foe as green vines; a foe that falls overgrown flowers, and the flower mends half a
     heart (once a room). Bosses are slowed half as much.
   - **9b. The five reactions** that make the wheel whole (all fifteen pairs of the six schools react), pure rules in
     status.ts with their unit tests, effects in statusFx.ts, names, lines, sounds and a recipe each for the dev menu's
     "Reactions here": *Wildfire* (Verdant + Ember: the burn runs along the vines to every overgrown foe in the room),
     *Frostbloom* (Verdant + Frost: ice flowers open on the foe and shatter a moment later, chilling and cutting the foes
     round it), *Pollen Spark* (Verdant + Storm: a cloud of pollen round the foe that shocks the foes inside it for a few
     seconds), *Bloom* (Verdant + Hallow: the foe flowers; when it falls its lily mends half a heart, beyond the room's
     one flower) and *Blight* (Verdant + Umbral: the vines rot to thorns that hex the foe and creep to the nearest other
     foe, overgrowing it).
   - **9c. Three spells** on shapes that exist, each with its own look in the effects' style: *Thorn Snare* (Grasp's
     shape: thorns burst from the floor where the mage aims and close, rooting and overgrowing the foes there), *Pollen
     Cloud* (Consecrate's: a cloud of golden pollen round the mage for a few seconds that overgrows foes in it and mends
     half a heart once) and *Living Wall* (the Glacial Wall's: trunks of living wood that stop foes and their shots, and
     overgrow the foes that touch them; fire burns it down). Pages for them come in libraries as every spell's do.
   - **9d. Garden rooms and their reagent.** A themed room, the overgrown garden (`garden` in data/themes.json, on floors
     1 to 3): moss and flowers over the floor, flowering plants (a new object) that burst into pollen when struck (the
     foes near overgrown) and leave the school's reagent, *Bloom Petal* (leaning to healing and growth; brewed with Grave
     Moss into a Healing Draught, with Wisp Essence into a Mana Tonic, with Ember Salt into Liquid Ember). Its twist: the
     garden grows, Overgrown lasting longer on foes there. Overgrown foes and Verdant spells may leave Bloom Petal too.
   Each part gets its dev menu entries, unit and browser tests, and the GDD as built. The Huruhui, the school's people in
   the owner's lore, stay out of the game's text until M8.
   *Built (2026-10-01):* all four parts. 9a to 9c as planned (GDD: M5 as built, Verdant). 9d: the overgrown garden
   (`garden`, two templates, `garden_beds` and `garden_long`, on floors 1 to 3, its floor pinned to cobbles so it reads as
   a garden on the burning floor too; moss, leaves and a new scatter of small flowers), the flowering plant (`blossom`,
   `F`: a low object a bolt or blast bursts into pollen, overgrowing the foes within 1.8 tiles for 4 s; fire burns it), its
   twist (`garden`: Overgrown ×1.75 there, `CFG.themes.gardenGrow`, a word the first time in a room) and Bloom Petal (a
   plant leaves one six times in ten, `CFG.alchemy.reagent.blossom`; Verdant's foes and a foe that falls overgrown leave
   it as other foes leave theirs; with Warden's Ash it brews a Giant's Brew, growth, so the Ash still makes a strong potion
   with every reagent).
10. **Close**: the GDD as built, CLAUDE.md, the rules reviewer, a room sweep, screenshots for the owner, the play-test
    build.

**Done when** potions are found, carried, drunk and thrown with their effects shown, brewed from reagents at Dr. Jelly's
table and remembered between runs, and every new piece has its dev menu entry, tests and pixel-art look.
