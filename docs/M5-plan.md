# M5 Alchemy: plan

**Status: under way (2026-10-01).** GDD: Potions and alchemy; the roadmap's M5 row. The second game inside a run: every
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
10. **Bottles are pixel art like everything else** (the GDD's one pixel for everything): five bottle shapes built in code,
    their glass and liquid colours shuffled per run on the run's seed; their HUD icons made as the artifacts' are.

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
8. **The Alchemist**: the Alchemist's Satchel and two more artifacts of the family, each showing on the mage; the
   Alchemist transformation (a bandolier of vials and a stained apron; thrown potions split in two).
9. **Verdant** (the second half, planned here when step 8 is built): Overgrown, three spells, the five reactions that
   make the wheel whole, garden rooms and their reagent, its sound.
10. **Close**: the GDD as built, CLAUDE.md, the rules reviewer, a room sweep, screenshots for the owner, the play-test
    build.

**Done when** potions are found, carried, drunk and thrown with their effects shown, brewed from reagents at Dr. Jelly's
table and remembered between runs, and every new piece has its dev menu entry, tests and pixel-art look.
