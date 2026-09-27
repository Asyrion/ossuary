# Ossuary — Game Design Document

Sep 24, 2026 · @Azyrion

## Vision and pillars

Ossuary is a top-down roguelike with RPG elements, set in the high/dark fantasy world of Eda. It borrows the room-by-room structure of The Binding of Isaac, but its identity is magic: every run is a spellbook the player assembles from spells, runes, magical artifacts and potions they brew themselves. It runs in desktop browsers (a mobile version may come later), with all characters and creatures built in Tripo3D. It is a hobby project; the current goal is to prove the core loop is fun before adding content.

**Pitch:** An apprentice mage descends beneath a ruined chapel of Eda, room by room, floor by floor. They learn spells from torn grimoire pages, bind cursed artifacts to their will, brew potions from what the dead leave behind, and grow stronger with every floor. Every run builds a different mage; what the mage learns is never fully lost.

**Pillars**

- **Magic is the build.** Spells, runes, artifacts and potions interact with each other and with the room. The fun is discovering combinations, not collecting stat-ups.
- **Readable twin-stick combat.** Fixed rooms, four-direction casting, clear telegraphs. Every hit the player takes should feel fair.
- **Growth you can feel.** RPG levels and choices inside a run; knowledge (recipes, spells, bestiary) that carries over between runs.
- **Alchemy as a second game.** Unknown potions to identify, reagents to harvest, recipes to discover. Every potion can be drunk or thrown.
- **Eda, not Isaac.** The room structure is borrowed; the world, magic schools, creatures and tone come from Eda. Medieval high fantasy turned dark: crypts, chapels, relics, the unquiet dead.
- **A tabletop miniature look.** Characters read like painted miniatures lit by candle and torch, in a cutaway diorama of each room.
- **Tripo in, game out.** Any model exported to the checklist drops into the game without hand-fixing.

**What separates Ossuary from an Isaac clone**

| Isaac | Ossuary |
| --- | --- |
| One attack (tears) changed by items | A free cantrip plus two active spells with mana, cooldowns and runes |
| Pills with random effects | Potions to identify, brew from reagents, and drink or throw |
| Items are mostly passive stat and tear changes | Artifacts include foci that reshape the cantrip, cursed artifacts and set bonuses |
| No character growth inside a run beyond items | XP, levels, attributes and boon choices |
| Rooms are obstacles | Rooms react to magic: oil burns, water conducts, braziers empower |
| Bombs: placed, then wait | Blast glyphs: chalked runes the cantrip sets off from afar, chaining and burning in the bolts' colour |
| Unlocks are new items | The Sanctum: a hub where knowledge persists between runs |

**Scope:** hobby project for desktop browsers, played with keyboard or gamepad. A mobile version may come later and is not designed for until then. No monetisation plans.

## Core loop

A run is a descent through floors; each floor is a grid of rooms ending in a boss. Death ends the run and everything restarts from floor 1.

```mermaid
flowchart LR
  A[Enter room] --> B{Enemies?}
  B -- yes --> C[Doors lock<br/>fight]
  C --> D[Room cleared<br/>doors open, chance of drop]
  B -- no --> E[Loot or rest]
  D --> F[Choose next door]
  E --> F
  F --> A
  F --> G[Boss room]
  G --> H[Boss dies<br/>way down opens]
  H --> I[Next floor]
```

One room at a time fills the screen. Entering a room with enemies locks its doors until every enemy is dead; clearing it opens the doors and may drop a reward. The boss room's defeat opens a trapdoor to the next floor.

**Prototype 0.3 has:** one hand-built floor of six rooms, one boss, a win screen after the boss. **Target (M1):** three generated floors with rising difficulty, and every run differs in map, room count and room types; a run takes 20 to 40 minutes.

### Game loop changes for the magic RPG

The room loop stays; what the player gets from each room, and what they do between rooms, changes.

```mermaid
flowchart LR
  A[Clear room] --> B[XP + reagents<br/>+ chance of drop]
  B --> C{Level up?}
  C -- yes --> D[Choose 1 of 3 boons]
  C -- no --> E[Explore]
  D --> E
  E --> F[Library: learn a spell]
  E --> G[Alchemy table: brew]
  E --> H[Shrine: cleanse or bargain]
  E --> I[Treasure: artifact]
  E --> J[Boss: artifact + grimoire page]
  J --> K[Waystone between floors<br/>rest, socket runes]
```

| Loop element | Isaac-style prototype | Magic RPG version |
| --- | --- | --- |
| Room reward | Chance of a heart | XP always; reagents from enemies; chance of heart, mana vial or coin |
| Growth in a run | Items only | Items plus levels: each level offers 3 boons, pick 1 |
| Special rooms per floor | Treasure, boss | Treasure, ordeal, boss, merchant, secret, library, alchemy table or shrine (alternating); sometimes a bone altar or locked vault |
| Between floors | Trapdoor, straight on | Waystone room: full mana, socket runes into spells, sell or brew |
| Death | Everything lost | Run items lost; Arcane Dust, discovered recipes and bestiary entries kept |
| Run start | Same hero, same stats | Choose a discipline (starting spell and focus) unlocked in the Sanctum |

**Pacing target:** level 2 after the first two rooms, about 3 levels per floor, first active spell no later than the first library or boss. Floor 1 should give a clear build direction (a school) by its boss.

## Player

The player moves in eight directions and casts in four, independently, with three hearts of health counted in halves.

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move | W A S D | Left stick |
| Cast | Arrow keys (last pressed wins) | Right stick or face buttons |
| Blast glyph (M2) | Space | Left trigger |
| Pause | Esc or P | Start |
| Mute | M |  |

The touch twin-stick from prototype 0.3 stays in the code but is frozen: it isn't extended or tested, and new actions get no touch controls until a mobile port.

Planned inputs for the magic layer: spell 1 and 2 on Q and E (LB and RB) and potion on F (Y; hold to throw). See Magic system.

**Starting stats (prototype 0.3)**

| Stat | Value |
| --- | --- |
| Move speed | 4.3 tiles/s |
| Damage per bolt | 3.5 |
| Fire delay | 0.36 s |
| Bolt speed | 8.8 tiles/s |
| Range | 6.8 tiles |
| Health | 3 hearts (6 halves) |
| Invulnerability after a hit | 1.0 s |

Hearts can't be picked up at full health. The hero faces the cast direction while casting, otherwise the move direction.

**Animation mapping.** Legs play idle or run; the upper body can overlay a cast or hit reaction; death plays on the whole body.

| Game state | Clip | Body part | Notes |
| --- | --- | --- | --- |
| Standing | standing\_relax | Whole body | Loops |
| Moving | run | Whole body | Plays at up to 3.6× speed to match move speed |
| Casting | cast\_a\_spell | Upper body | Only the forward thrust (about 2.25 to 2.85 s) is replayed per bolt |
| Taking damage | hit\_to\_body\_01 | Upper body | Played at 1.6× |
| Death | fall | Whole body | End screen waits for it |

## Combat and enemies

Combat is Isaac-style: bolts travel in straight lines, drop to the floor at the end of their range, and are blocked by rocks and walls. Enemies deal contact damage and some shoot slow, readable projectiles.

- Bolts inherit 30% of the player's movement and alternate between two spawn points, like Isaac's two eyes.
- Hits flash the enemy white and knock it back; deaths leave a stain on the floor.
- Every attack is telegraphed: a glow, a shake or a pause before it lands.
- Contact and shots cost half a heart; touching a boss costs a full heart.

**Enemies in prototype 0.3** (placeholder shapes, to be replaced by Tripo models)

| Enemy | HP | Behaviour | Isaac equivalent |
| --- | --- | --- | --- |
| Rotling | 10 | Walks straight at the player with a wobble | Gaper |
| Wisp | 7 | Flies over rocks, drifts, fires an aimed orb every 2 to 3 s | Fly with shot |
| Crypt hound | 12 | Wanders; charges when lined up with the player; stunned on impact | Charger |
| Hollow Warden (boss) | 120 | Walks, 12-shot radial burst, three aimed 3-shot volleys; summons two Rotlings below 50% | Floor 1 boss |
| Drowned Abbess (boss, M1) | 120 | Drifts; wails fans of aimed shots; sinks into the floor and follows the mage as a ripple that can't be hurt, then a widening ring marks where she surfaces with a ring of shots; summons Wisps below 50% | Pin |
| Pyre Knight (boss, M1) | 135 | Stalks; leaps at where the mage stands (the landing spot glows) and lands with a shockwave ring; charges in a line until a wall stuns him; sprays cones of embers; summons Crypt hounds below 50% | Monstro |

**Enemy asset needs per creature:** a run or move clip, an attack clip, a hit reaction and a death. The hero's layered animation system is reused for enemies.

**Planned archetypes:** a slow tank that blocks shots, an enemy that splits on death, a burrower that surfaces under the player, a turret bound to a wall.

## Magic system

The mage has three layers of magic: a free cantrip that is always firing, two active spell slots paid with mana, and potions. Five schools of magic apply status effects that combine with each other and with the room.

**Layers**

| Layer | Input | Cost | Changed by |
| --- | --- | --- | --- |
| Cantrip (today's bolt) | Arrow keys, 4 directions | Free | The equipped focus artifact, boons, passive artifacts |
| Spell 1 and 2 | Q and E / LB and RB | Mana + cooldown | Runes socketed into the spell, school mastery |
| Potion | F / Y, hold to throw | One potion from the belt | Alchemy boons, some artifacts |

**Mana:** a blue bar under the hearts, 100 at start. It refills 4 per second out of combat and 1 per second in combat; killing an enemy with the cantrip gives 3. Mana vials drop from rooms like hearts.

**Spells aim like the cantrip:** a spell fires in the current cast direction, or the move direction when not casting. Some spells are placed at the mage's feet or target the nearest enemy.

**Schools and status effects**

| School | Status effect | Strong against | Feel |
| --- | --- | --- | --- |
| Ember | Burn: damage over time, spreads to burning ground | Rot and undead flesh | Aggressive, area |
| Frost | Chill slows; 3 stacks freeze; frozen enemies shatter for bonus damage | Fast enemies | Control |
| Storm | Shock: chains to nearby enemies, brief stun | Groups, anything wet | Burst |
| Hallow | Sanctified: takes more damage, can't regenerate | Wraiths, the Warden's kind | Precise, defensive |
| Umbral | Hex: drains life or mana back to the mage | Living things | Risky, sustain |

**Element reactions** (two effects on the same enemy or tile)

| Combination | Reaction |
| --- | --- |
| Ember + Frost | Steam cloud: enemies inside can't aim |
| Frost + Storm | Shatter: frozen enemy explodes into ice shards |
| Ember + Storm | Overload: small explosion, knockback |
| Hallow + Umbral | Eclipse: the enemy is removed from the fight for 3 s, then takes all stored damage |
| Umbral + Ember | Blackfire: burn that never goes out until the enemy dies |

**Rooms react to magic.** Oil puddles ignite, water conducts shock across the whole puddle, braziers lit by Ember empower Ember spells in that room, cobwebs burn away to open shortcuts, gravestones can be shattered by Frost. This is the main systemic difference from Isaac and gives room templates a second purpose.

**Runes** modify one spell each and are socketed at waystones. Each spell has 1 socket (2 with a boon).

| Rune | Effect |
| --- | --- |
| Split | Projectile spells fire 3 weaker copies in a fan |
| Echo | The spell repeats 0.5 s later at 50% power |
| Seeking | Projectiles curve towards enemies |
| Wide | Area spells +50% radius, −20% damage |
| Swift | −30% cooldown, +20% mana cost |
| Blood | Costs half a heart instead of mana when mana runs out |

**Enemy affinities (RPG layer):** every enemy has one weakness (+50% damage) and one resistance (−50%), shown in the bestiary once discovered. Placeholder examples: Rotlings are weak to Ember; Wisps resist Umbral and are weak to Hallow; the Hollow Warden resists Frost.

## Spells

Fifteen spells, three per school, are enough for M1 to M5. Spells are learned from grimoire pages (library rooms, bosses, rare drops); a new spell replaces one of the two slots, and the replaced one can be rebought at the next library. All names are placeholders until the Eda lore arrives.

| School | Spell | Mana | Cooldown | Effect |
| --- | --- | --- | --- | --- |
| Ember | Cinder Lance | 20 | 2 s | Piercing fire beam, burns everything in a line |
| Ember | Pyre Seal | 35 | 8 s | Rune on the floor erupts after 1 s in a ring of flame, leaves burning ground |
| Ember | Phoenix Step | 25 | 6 s | Short dash through enemies, leaving a fire trail; 0.3 s invulnerable |
| Frost | Rime Shards | 15 | 1.5 s | Shotgun of 5 ice shards, each applies Chill |
| Frost | Glacial Wall | 30 | 10 s | Wall of ice across the cast direction; blocks shots for 5 s, shatters on enemies when it ends |
| Frost | Winter's Breath | 40 | 12 s | Cone that freezes everything it touches for 2 s |
| Storm | Arc | 15 | 1 s | Lightning hits the nearest enemy and chains to 3 more |
| Storm | Thundercall | 40 | 10 s | Three strikes on random enemies; hits on water spread to the whole puddle |
| Storm | Static Mantle | 30 | 15 s | For 6 s, shocks any enemy that touches the mage |
| Hallow | Lantern of Vigil | 30 | 14 s | Floating lantern follows the mage and fires at enemies for 8 s |
| Hallow | Consecrate | 35 | 12 s | Holy ground at the feet: the mage heals half a heart per 3 s inside, undead take damage |
| Hallow | Judgement | 50 | 16 s | Beam from above on the strongest enemy after 1 s delay, huge damage |
| Umbral | Hex Bolt | 15 | 2 s | Slow bolt, applies Hex; hexed enemies return mana on hit |
| Umbral | Grasp of the Grave | 30 | 10 s | Hands rise from the floor and root enemies in an area for 2 s |
| Umbral | Soul Harvest | 0 | 20 s | Consumes all Hex stacks in the room: damage per stack, +1 mana per stack |

**Spell data shape**

```json
{
  "id": "cinder_lance",
  "name": "Cinder Lance",
  "school": "ember",
  "mana": 20,
  "cooldown": 2.0,
  "shape": "beam",
  "damage": 12,
  "status": { "burn": 3 },
  "sockets": 1,
  "tags": ["projectile", "piercing"]
}
```

`shape` picks a behaviour in code (bolt, beam, cone, area, wall, dash, summon, self-buff); everything else is data, so new spells are mostly new entries. Tags decide which runes and boons apply.

**Casting animation:** the hero's `cast_a_spell` window is reused for every spell; strong spells can play a longer part of the same clip. A second Tripo clip (a two-handed channel) would help beams and cones later.

## Artifacts

Artifacts replace Isaac's items. There are four kinds: one focus that reshapes the cantrip, any number of passive artifacts, cursed artifacts with a price, and sets that reward collecting pieces. The prototype's Ember Sigil becomes the first passive artifact.

| Kind | Slots | Role |
| --- | --- | --- |
| Focus (wand, staff, orb, tome) | 1; picking a new one drops the old | Changes how the cantrip fires: count, path, element |
| Passive | Unlimited, stack | Stats, triggers, new behaviours |
| Cursed | Unlimited | Strong effect plus a drawback; cleansed at a shrine, which removes the drawback and halves the effect |
| Set piece | Unlimited | 2 or 3 pieces of a set grant a bonus |

**Artifacts per floor: at least 3, at most 5.** Three sources are on every floor; optional ones can add up to two more. The boss's choice of two counts as one, since only one can be taken.

| Source | Artifacts | Per floor | Arrives |
| --- | --- | --- | --- |
| Treasure room | 1 on a pedestal | Always | 0.3 |
| Ordeal | 1 after the last wave | Always | M1 |
| Boss | Choice of 2, take 1 | Always | M1 |
| Bone altar | 1 for a heart container, often cursed | Sometimes | M1 |
| Room-clear drop | 1, rare (about 3%) | Sometimes | M1 |
| Merchant | 1 for coins | While the budget lasts | M2 |
| Secret room | 1, often cursed | Sometimes | M2 |
| Locked vault | 1 behind a key | Sometimes | M2 |

The generator places the three guaranteed sources first, then gives artifacts to optional sources while the floor has budget left, in an order shuffled with the floor's seed so no optional source is always the one left out; optional sources without one hold obols, keys, glyphs or hearts instead (the merchant sells only wares, the vault holds a hoard, the secret room coffers and a chest, and a bone altar without an artifact isn't placed). Room-clear drops only roll while budget is left. Each artifact lists the pools it can appear in (treasure, ordeal, boss, altar, merchant, secret, vault); cursed artifacts live mostly in the altar and secret pools.

**Foci**

| Focus | Cantrip becomes | Arrives |
| --- | --- | --- |
| Apprentice's Wand (start) | Single bolt, as now | 0.3 |
| Twin-Headed Staff | Two parallel bolts, −30% damage each | M1 |
| Drowned Orb | Bolts bounce off walls twice, +35% range | M1 |
| Shepherd's Crook | Bolts fly out and back like a boomerang, passing through foes and hitting each twice, −20% damage | M1 |
| Emberwood Wand | Bolts apply Burn, −10% range | M3 |
| Tome of Whispers | Slow bolts that curve towards enemies, +40% damage | M3 |

**Passive artifacts (first list)**

| Artifact | Effect | Arrives |
| --- | --- | --- |
| Ember Sigil | Damage +1.5, bigger white-hot bolts (exists in 0.3) | M1 |
| Pilgrim's Boots | Move speed +0.6; the mage can walk over pits | M1 |
| Rosary of Haste | Cantrip fire delay −25% | M1 |
| Bone Lens | Cantrip pierces one enemy | M1 |
| Reliquary Shard | +1 heart container, fully healed | M1 |
| Saint's Knucklebone | Enemies burst into four bolts (north, east, south, west) when they die | M1 |
| Mourning Bell | When the mage is hit, a bell tolls and a ring of 8 bolts bursts outwards | M1 |
| Mason's Chisel | Bolts crack rocks; three hits break one | M1 |
| Mana Lantern | Max mana +40 | M3 |
| Candle of the Vigil | Each room clear refills 25 mana | M3 |
| Frostbitten Ring | Every 5th cantrip bolt applies Chill | M3 |
| Stormglass Pendant | Shocked enemies take +25% cantrip damage | M3 |
| Thurible of Ash | Burning enemies spread Burn when they die | M3 |
| Witch's Knot | Spells cost 20% less while below half health | M3 |
| Alchemist's Satchel | Potion belt +1 slot, reagents drop 30% more often | M5 |

**Cursed artifacts**

| Artifact | Gift | Price | Arrives |
| --- | --- | --- | --- |
| Mask of the Drowned | Cantrip damage doubled | Vision limited to a circle around the mage | M1 |
| Chain of the Penitent | Invulnerability after a hit lasts 3 s | Move speed −25% | M1 |
| Crown of Thorns | Spell damage +50% | Max health −1 heart | M3 |
| Hungering Tome | Every kill refills 5 mana | Mana doesn't regenerate on its own | M3 |

**The M1 set** is the 10 artifacts and 3 foci marked M1 above. Rules that apply from M1 on:

- **Every artifact is noticeable.** Picking one up changes something the player sees (the bolts, the mage, the HUD or the room), never only a hidden number. The pickup banner names it and says what it does in a few words.
- **The cantrip combines automatically.** The focus sets the pattern (how many bolts, and their path); passives add modifiers (damage, size, fire rate, piercing, triggers). There are no hand-written pairings: Twin-Headed Staff with Bone Lens fires two piercing bolts, Shepherd's Crook with Bone Lens pierces on the way out and back.
- **Taking a focus leaves the old one on the pedestal,** so the player can swap back.
- **Each artifact appears at most once per run.** If a source's pool is empty, it falls back to any unseen artifact, then to a heart. With 13 M1 items and up to 15 offers per run, runs differ mostly in order and choice; more artifacts are the cheapest way to add variety, since they are data.

**Sets** (from M3, when their pieces exist)

| Set | Pieces | Bonus |
| --- | --- | --- |
| The Pyromancer's Regalia | Ember Sigil, Emberwood Wand, Thurible of Ash | Burning ground heals the mage instead of hurting it |
| The Vigil | Candle of the Vigil, Mana Lantern | Hallow spells cost no mana while at full health |
| The Drowned Choir | Drowned Orb, Mask of the Drowned | Water puddles appear in every room; the mage is immune to shock |

**Artifact data shape**

```json
{
  "id": "ember_sigil",
  "name": "Ember Sigil",
  "kind": "passive",
  "text": "Your bolts burn hotter",
  "pool": ["treasure", "boss"],
  "stats": { "damage": 1.5, "boltScale": 0.35 },
  "effects": [],
  "set": "pyromancer",
  "curse": null
}
```

**Tripo use:** each artifact can get a small Tripo model floating on its pedestal (static, under 5,000 triangles), rendered as an icon for the HUD.

## Potions and alchemy

Potions are the second game inside a run: every potion has a drink effect on the mage and a throw effect on the room, found potions are unidentified, and the mage can brew their own from reagents.

**The potion belt:** 3 slots (4 with the Alchemist's Satchel). Tap the potion button to drink the selected potion, hold it to aim and throw in the cast direction. Thrown potions shatter in a 2-tile splash.

**Identification.** Bottle shapes and colours are shuffled every run, like Isaac's pills. Unknown potions show only their bottle. A potion is identified by drinking or throwing it, by an identify boon, or at an alchemy table. Once a recipe has been brewed, that potion is always identified in future runs.

| Potion | Drink | Throw |
| --- | --- | --- |
| Healing Draught | Heal 1 heart | Heals the mage if they stand in the splash |
| Mana Tonic | Refill 50 mana | Enemies in the splash lose their next attack |
| Liquid Ember | Cantrip applies Burn for 20 s | Pool of fire for 5 s |
| Frostbrew | Immune to Chill; move speed +20% for 20 s | Freezes everything in the splash for 2 s |
| Bottled Storm | Next 3 spells are free | Lightning storm on the splash for 3 s |
| Philter of Echoes | Next spell casts twice | Enemies in the splash repeat their last hit on each other |
| Giant's Brew | Bigger, +50% damage, −20% speed for a room | Enemies in the splash grow slower and bigger |
| Shadowstep Tincture | Invisible for 4 s; enemies lose track | Darkness cloud; enemies inside can't aim |
| Bitter Remedy | Suppresses one curse's drawback until the next floor | Cleanses status effects in the splash |
| Volatile Mixture | A random potion effect | Explosion |
| Hex Brew (bad) | Controls reversed for 5 s | Enemies in the splash are Hexed |
| Grave Draught (bad) | Lose half a heart, gain 15 XP | Summons a friendly skeleton for the room |

Bad potions are still useful when thrown, so there is always a reason to pick up an unknown bottle.

**Reagents** drop from enemies and room objects and stack in an ingredient pouch (no slot limit).

| Reagent | Source (placeholder) | Leans towards |
| --- | --- | --- |
| Grave Moss | Rotlings, damp rooms | Healing |
| Wisp Essence | Wisps | Mana, echoes |
| Bone Dust | Crypt hounds, gravestones | Strength, grave magic |
| Ember Salt | Braziers, burning enemies | Fire |
| Rimewater | Frozen puddles | Frost |
| Warden's Ash | Bosses | Rare potions |

**Brewing:** at an alchemy table, combine two reagents. Known recipes show their result; unknown combinations are experiments that can fail into Volatile Mixture. Discovered recipes are written into the grimoire and kept forever. Example recipes: Grave Moss + Grave Moss = Healing Draught; Wisp Essence + Grave Moss = Mana Tonic; Ember Salt + Bone Dust = Liquid Ember; Rimewater + Wisp Essence = Frostbrew; Warden's Ash + any = a rare potion.

**Tripo use:** reagents and potion bottles are small static props; bottles can share one mesh with shuffled colours.

## RPG progression

Growth happens on two timescales: levels, attributes and boons inside a run (lost on death), and knowledge and unlocks in the Sanctum between runs (kept). Power mostly stays inside the run, so every run starts fair.

**Inside a run**

- **XP** from kills (bosses give a lot), first-time room clears and potion discoveries. Level cap 12 per run.
- **Each level up:** +1 attribute point to spend, and the player picks 1 of 3 boons (the game pauses, like a card choice).

| Attribute | Per point | Starts at |
| --- | --- | --- |
| Vigor | +half a heart container every 2 points | 0 |
| Arcana | Spell damage +6% | 0 |
| Focus | Max mana +10, mana regeneration +5% | 0 |
| Swiftness | Move speed +3%, cantrip fire delay −3% | 0 |

**Boons (examples)**

| Boon | Effect |
| --- | --- |
| Kindling | Ember: Burn lasts 50% longer |
| Deep Winter | Frost: freeze needs 2 Chill stacks instead of 3 |
| Conductor | Storm: chains jump to +2 enemies |
| Warden's Oath | Hallow: +1 heart container, Hallow spells heal a little |
| Bloodprice | Umbral: Hex drains +50%; spells can be paid with health |
| Second Socket | One spell gets a second rune socket |
| Keen Nose | All potions are identified on sight this run |
| Scavenger | Reagent drops +50% |
| Attuned | Choose any attribute: +3 points |

Boons are weighted towards the schools the player already uses, so a build forms by floor 2.

**Between runs: the Sanctum**

A small hub room the mage returns to after each run. **Arcane Dust** is earned from every run (depth reached, bosses, discoveries) and spent here.

| Sanctum feature | What it keeps or unlocks |
| --- | --- |
| Grimoire | Every spell, recipe and artifact ever found; recipes stay known |
| Bestiary | Enemy weaknesses and resistances once discovered |
| Disciplines | Starting loadouts: Pyromancer (Cinder Lance, Emberwood Wand), Frostwarden, Stormcaller, Vigil Keeper, Hexer |
| Library shelves | Adds new spells and artifacts to the pools in future runs |
| Alchemy garden | Start runs with one reagent of choice |

No permanent stat increases: unlocks widen the options, they don't make the mage stronger. This keeps difficulty honest and matches the roguelike core.

## Floors and rooms

Rooms are built from cells of 13 × 7 tiles. A standard room is one cell, with a door in the middle of any wall that has a neighbour; larger rooms combine cells and have a door slot on every cell edge. Floors are generated from hand-built room templates.

**Room anatomy.** Walls are 1 tile thick; the north wall is tall and carries two torches, the south wall is low so the player stays visible. Doors have iron gates that rise when enemies are present. Rocks block walking and bolts; flying enemies ignore them.

| Room type | Purpose | Door style | Arrives |
| --- | --- | --- | --- |
| Start | No enemies, controls chalked on the floor | Plain | 0.3 |
| Normal | Enemy encounter from a template | Plain | 0.3 |
| Treasure | One artifact on a pedestal | Gold | 0.3 |
| Boss | Boss fight, then trapdoor | Red, glowing eye | 0.3 |
| Ordeal | Waves of enemies, then an artifact | Iron, skull above the lintel | M1 |
| Bone altar | Artifact for a heart container | Arch of bones | M1 |
| Merchant | Buy with coins | Lantern above the door | M2 |
| Secret | Hidden, opened by a glyph's blast | None, a cracked wall | M2 |
| Locked vault | Opened with a key | Padlocked iron | M2 |

**Room shapes (M1).** The cell size stays 13 × 7; shapes combine cells on the floor grid, Isaac-style.

| Shape | Cells | Inside (tiles) | Doors |
| --- | --- | --- | --- |
| Standard | 1 × 1 | 13 × 7 | Up to 4 |
| Narrow corridor, east–west | 1 × 1 | 13 × 3 | East and west only |
| Narrow corridor, north–south | 1 × 1 | 5 × 7 | North and south only |
| Long hall | 2 × 1 | 28 × 7 | Up to 6 |
| Tall hall | 1 × 2 | 13 × 16 | Up to 6 |
| Great hall | 2 × 2 | 28 × 16 | Up to 8 |
| L-shaped hall | 3 cells of a 2 × 2, four rotations | 28 × 16 minus a corner | Up to 8 |

Between two cells of the same room, the two wall tiles become floor, which is why two cells make 28 tiles, not 26. Doors sit in the middle of every outer cell edge, including the two edges facing an L's missing corner.

- **Camera:** fixed and fitted in one-cell rooms, as now. In larger rooms it pulls back a little (the view is 20% wider and deeper, `camHallView` in `config.ts`) so halls don't feel too vast, follows the mage and stops at the walls; the zoom blends during the pan between rooms. The minimap shows the whole shape.
- **Which rooms can be large:** normal rooms and the boss room, which sometimes widens into a great hall. Ordeals stay one cell until they get large templates; start, treasure, bone altar, merchant, secret and vault rooms stay one cell.
- **Mix:** most rooms stay standard; larger shapes and corridors make up a quarter to a third of a floor, a little more on deeper floors (weights per floor in `data/floors.json`).

**Room variants (M1).** Normal rooms can roll a variant that makes them clearly easier or harder than the floor's baseline, so a floor has peaks and breathers. Chances per floor are in `data/floors.json` (floor 1: about 18% hard, floor 3: about 40%); champion, quiet and ambush tuning is in `config.ts`.

| Variant | Difficulty | What changes |
| --- | --- | --- |
| Quiet | Easier | One or two weak enemies or none; often a heart |
| Normal | Floor baseline | A template at the floor's difficulty |
| Champion | Harder | One enemy is a champion: bigger, tinted, double health, a little faster; drops a heart |
| Ambush | Harder | The room looks empty and its doors stay open; enemies rise from the floor (never on top of the mage) and the doors lock when the mage reaches the middle, or walks four tiles away from every door in a large room |
| Dark | Harder | The torches are out and the fill light is low; the mage's lantern burns a little brighter and lights the way |
| Ordeal | Much harder | Two or three waves, then an artifact (a special room, see above) |

**A run is three floors (M1).** Each floor is generated fresh, so no two runs share a map:

- **Map:** start in the centre of a 9 × 8 grid and grow outwards by random walk until the floor has its room count, rolled per floor: 8 to 12 rooms on floor 1, 10 to 14 on floor 2, 12 to 16 on floor 3. From M2 each floor gets one more (9 to 13, 11 to 15, 13 to 17), since the merchant, and the shrine on floor 2, each take a dead end that would otherwise hold a fight.
- **Special rooms** go into dead ends (rooms with one neighbour): the farthest from the start is the boss room, then treasure, ordeal and (from M2) the merchant; optional rooms (bone altar, and from M2 the locked vault) only appear when a spare dead end exists. If the walk leaves too few dead ends for the required rooms, it tries again. The boss room never touches the start room.
- **Secret room (M2):** one per floor, in an empty cell touching at least two rooms.
- **Shapes:** while growing the map, the walk sometimes places a larger shape when the cells it needs are free.
- **Difficulty:** floor 1 is easy, and each later floor raises the baseline a little (harder templates, about 15% more enemy health per floor). Within a floor, rooms vary randomly around the baseline rather than rising steadily, and variants push single rooms clearly above or below it; deeper floors roll more hard variants. The rooms next to the start on floor 1 are never hard variants. All numbers are found by play-testing.
- **Between floors:** the boss opens a trapdoor; stepping in starts the next floor (waystones join in M6). Beating the floor 3 boss wins the run. Each floor draws its boss from a pool in `data/floors.json`, never one the run has already met, and scales it (health, speed, shot speed, summons, volleys). Until Tripo bosses arrive (M4), the bosses are placeholder shapes: the Hollow Warden on floor 1, the Drowned Abbess and the Pyre Knight on floors 2 and 3 in either order.
- **Seeds:** every run has a seed, shown in the pause menu, so a run can be replayed and bugs reproduced.
- **End of a run:** won or lost, the end screen sums up the run: the deepest floor, the time, foes put to rest, every artifact carried and the seed, with a button to replay the same seed.
- **Floor looks:** each floor already looks a little different, as placeholders until the biome pass (M8): floor 1 has warm stone and iron torches, floor 2 cool damp stone with moss, puddles and cage lanterns, floor 3 scorched brick with soot, ash and braziers. Colours and torch styles live in `data/floors.json`.

**Room templates are data:** a character grid in the size of the room's shape (rock, pit, pillar, stone tomb, enemy spawn, empty; urns from M2) plus a difficulty value and the room types it suits, stored as JSON so new rooms need no code. Pillars and tombs block walking and bolts like rocks but never break; tomb tiles side by side make one longer tomb. Larger halls are furnished with them so they don't feel empty. Ordeal templates list two or three waves. M1 needs at least two templates per shape and 50 or more in total.

## Pickups and room types

Pickups feed the three resources of a run (health, mana, gold) plus reagents for alchemy. New room types give the magic systems a place on the map.

| Pickup | Effect | Arrives |
| --- | --- | --- |
| Heart (half, full) | Heals; ignored at full health | 0.3 |
| Obol (coin; single, or a purse of 5) | Spent at the merchant, shrine and library | M2 |
| Bone key | Opens locked vaults and reliquary chests | M2 |
| Glyph stone | One more blast glyph to chalk: its blast breaks rocks, urns and cracked walls and opens secret rooms | M2 |
| Mana vial | +25 mana | M3 |
| Grimoire page | Learn a spell (replaces a slot) | M3 |
| Reagent | Goes into the ingredient pouch | M5 |
| Unknown potion | Goes into the potion belt | M5 |
| Rune | Socket into a spell at a waystone | M6 |

| Room type | What happens | Per floor | Arrives |
| --- | --- | --- | --- |
| Ordeal | Doors lock; two or three waves, harder than the floor's normal rooms; an artifact rises on a pedestal after the last wave | 1 | M1 |
| Bone altar | An artifact from the altar pool (strong or cursed) for one heart container; can't be taken with only one container left | 0 or 1 | M1 |
| Merchant | Artifact, hearts, keys and glyphs for obols; stock grows with later milestones | 1 | M2 |
| Secret room | Behind a cracked wall; obols, glyphs and keys, or an artifact from the secret pool | 1 | M2 |
| Locked vault | Behind a padlocked door; an artifact while the budget lasts, otherwise a hoard | 0 or 1 | M2 |
| Shrine | Cleanse a curse for coins; bargain a heart container for a boon from M6 | 1 on floor 2 | M2 |
| Library | Choose 1 of 3 grimoire pages; rebuy a replaced spell for coins | 1 | M3 |
| Elemental trial | Room full of oil, water or braziers; clear it with the right school for a bonus reward | Optional, 0 or 1 | M3 |
| Alchemy table | Brew from reagents, identify one potion for free | 1 on floors 1 and 3 | M5 |
| Waystone | Between floors: full mana, socket runes, reorder the belt | After each boss | M6 |

## Coins, keys and blast glyphs

Arrives in M2 (Plunder). Three small resources turn exploring into choices: which chest to open, whether to blast a suspicious wall, whether to spend at the merchant now or save. In Eda they are grave obols (coins), bone keys and blast glyphs: where Isaac has bombs, the mage has a spell to chalk on the floor, and the cantrip is its trigger. They are counted in the HUD under the artifacts, capped at 99 each. A run starts with one glyph, no keys and no obols. All numbers are placeholders for play-testing and live in `data/loot.json` and `config.ts`.

| Resource | Found in | Spent on |
| --- | --- | --- |
| Obols (coins) | Room clears, urns, coffers, now and then an enemy | Merchant, shrine cleansing, rebuying spells at the library (M3) |
| Bone keys | Room clears, coffers, the merchant | Locked vaults and reliquary chests |
| Blast glyphs | Room clears (glyph stones), coffers, the merchant | Rocks, urns, cracked walls and enemies; gravestones from M5 |

**Economy target:** about 12 to 18 obols per floor, so a merchant artifact means saving or skipping hearts. From M2, a room clear drops one pickup about half the time: a heart, obols, a bone key or a glyph stone. Obols are drawn to the living: from close by they drift to the mage.

**Blast glyphs**

- Chalked at the mage's feet (Space, or LT on a gamepad). The rune turns and flickers faster as its 1.5 s fuse burns down, ticking as it goes, and a faint ring shows how far the blast will reach.
- It flares when the fuse runs out, or at once when one of the mage's own bolts crosses it (a bolt leaving the mage doesn't set off the glyph at their feet). So the focus shapes how glyphs are used: bouncing bolts set them off round corners, the crook's bolt on its way back, twin bolts two at a time.
- The blast (1.5 tiles) deals 10 damage to every foe in reach (bosses too), knocks them back, breaks rocks (not pillars or tombs), urns and cracked walls, snuffs out enemy shots and sets off other glyphs in reach, so glyphs chain. A mage caught in it loses a full heart.
- It burns in the colour of the mage's bolts, so artifacts that change the bolts show in the glyphs too. Idea for M3: a glyph takes the school of the mage's focus, so an Ember glyph leaves burning ground and a Frost glyph chills.

**The merchant** (1 per floor, in a dead end). A hooded trader (placeholder) with 3 or 4 items per visit; the first is an artifact while the floor's budget allows.

| Item | Price | Arrives |
| --- | --- | --- |
| Artifact (merchant pool) | 15 | M2 |
| Heart | 3 | M2 |
| Key or glyph | 5 | M2 |
| Mana vial | 3 | M3 |
| Unknown potion / reagent | 4 / 2 | M5 |
| Rune | 10 | M6 |

**Secret room** (1 per floor). Entered through a cracked wall that a glyph's blast breaks open. The hints are a hairline crack and dust drifting from it. It holds obols, glyphs and keys, or an artifact from the secret pool, where cursed artifacts are common. It isn't shown on the minimap until found.

**Locked vault** (0 or 1 per floor, in a dead end). One key opens the padlocked door; inside is an artifact while the floor's budget allows, otherwise a hoard of obols and glyphs.

**Containers.** None of them hold artifacts, so the per-floor budget stays readable.

| Container | Opened by | Holds | Found |
| --- | --- | --- | --- |
| Urn | Bolts or blasts | Usually nothing; sometimes a coin or half a heart | Room templates |
| Coffer | Walking into it | 1 to 3 obols, keys, glyphs or hearts | Room clears, secret rooms |
| Reliquary chest | A key | Better loot: purses, several keys or glyphs, a full heart | Room clears, secret rooms, vaults |

**Shrine cleansing** (the shrine on floor 2). For 10 coins, the shrine cleanses one cursed artifact: the drawback goes and the gift is halved (see Artifacts). The heart-for-boon bargain joins in M6.

**Artifacts that bend the economy** (join the pools in M2; placeholder names)

| Artifact | Effect |
| --- | --- |
| Sexton's Keyring | +3 keys; the locked vault opens for free once per floor |
| Miser's Purse | +0.5 cantrip damage for every 10 coins held |
| Glyphwright's Chalk | +5 glyphs; blasts are 50% wider |
| Ferryman's Obol | Every room clear also drops an obol |
| Warding Band | Your glyphs don't hurt you, and their fuse burns 1 s |
| Grave Lantern | Cracked walls glow when you enter a room, and secret rooms show on the minimap before they're found |
| Pedlar's Scale | Merchant prices −30% |

**Ideas for later** (not scheduled): an alms box in chapel rooms where donated coins buy small blessings; sarcophagi that hold loot, or a Rotling; a bone-caster who throws the dice of the dead for coins.

## Art, camera and audio

The look is a candle-lit cutaway diorama: dark stone rooms, warm torchlight, and chibi characters that read like painted miniatures.

- **Camera:** orthographic, tilted 45° from horizontal, fixed per room; it pans between rooms in 0.42 s. Only the current room is drawn.
- **Scale:** 1 tile = 1 unit. The hero is 1.3 units tall; enemies 0.8 to 1.2; bosses about 2.
- **Light:** a dim fill, a cold moonlight from above, two flickering torch lights per room, and a warm lantern following the hero. Characters get a faint self-light from their colour texture so they stay readable.
- **Palette:** worn stone browns, torch amber for the hero's magic, verdigris greens for the undead, violet for wisp magic, rust red for the boss.
- **Characters:** Tripo3D models, chibi proportions, textured, rigged; see the Tripo asset checklist.
- **Environment:** procedural in code for now (floor textures, walls, rocks, pillars, stone tombs). Tripo props such as urns, coffins and statues can replace them later.
- **UI:** hearts top left, mana bar, spell slots with cooldowns, potion belt, artifacts and obol, key and glyph counters below them, minimap top right, boss bar bottom centre. Typefaces IM Fell English (titles) and Alegreya Sans (UI).
- **Audio:** simple synthesised effects for now; the full plan is in Audio design.

**Identity note.** The current hero is close to the Isaac art style. Fine for a hobby prototype; if the game is ever published, characters and art need their own look.

## Audio design

Audio is designed for headphones first: every sound has a position in the room, every floor has its own soundscape, every magic school has its own sound palette, and the music reacts to what is happening. The world should sound alive even when nothing moves.

**Four layers**

| Layer | What it is | Reacts to |
| --- | --- | --- |
| Music | Layered stems per floor: explore, combat, boss | Enemies alive in the room, boss phase, low health |
| Ambience | A looping bed per floor biome plus random one-shots placed around the room | Floor, room type (library, shrine, alchemy) |
| Sound effects | Spells, cantrip, potions, enemies, footsteps, doors, pickups | Every gameplay event, positioned in space |
| Interface | Menus, level up, boon choice, artifact pickup fanfare | Player actions outside the room |

**Headphone-first spatial sound**

- Every sound in the room is placed in 3D with binaural (HRTF) panning, so an enemy on the left is heard on the left and a wisp charging behind the mage is heard behind.
- The listener sits just above the hero's head, not at the camera, so panning follows the mage.
- Each floor has its own reverb (small stone crypt, flooded tunnels, wide burning hall); special rooms get their own (the library is dry and close, the shrine rings).
- Doors are acoustic windows: the ambience of the next room is heard faintly through an open door and muffled when doors lock.
- Speakers get a simpler stereo mix; a setting chooses between headphones and speakers.

**Adaptive music**

- Each floor has one piece split into 3 to 4 stems (drone, percussion, melody, choir) that fade in and out: calm drone when exploring, percussion joins when doors lock, full stems in a boss fight.
- Short stingers: room cleared, level up, artifact found, curse taken, secret found, death.
- Under one heart, the music thins out and a heartbeat joins.
- Boss themes are separate pieces with a phase change at 50% health.

**Floor biomes and their soundscapes** (proposal; the biomes themselves are a new idea and need Eda lore). The current scope is three floors, so floors 4 and 5 are kept as ideas for later.

| Floor | Biome (placeholder) | Ambience bed | Random one-shots | Music mood |
| --- | --- | --- | --- | --- |
| 1 | The Ossuary | Dripping water, distant wind, low stone hum | Bones settling, far-off chant, rat scurry | Sparse, low strings and drone |
| 2 | Drowned Catacombs | Running water, deep echoes | Bubbles, sloshing, a bell under water | Slow, watery, detuned choir |
| 3 | Burning Scriptorium | Fire crackle, wind through shelves | Pages turning, beams groaning, embers popping | Driving percussion, brass |
| 4 | Frozen Reliquary | Howling cold wind, creaking ice | Ice cracking, chimes, distant avalanche | Glassy, bells, high voices |
| 5 | The Umbral Depths | Heartbeat-like pulse, whispers | Reversed voices, breathing walls | Dissonant, heavy choir |

**Sound palettes per magic school.** Each school has its own sonic identity, so players recognise spells, status effects and reactions by ear.

| School | Palette | Cast | Travel | Impact | Status loop |
| --- | --- | --- | --- | --- | --- |
| Ember | Crackle, whoosh, roar | Rising whoosh | Fire hiss loop | Burst of flame | Soft crackle on burning enemies |
| Frost | Crystal, chime, crunch | Glassy inhale | High shimmer | Ice shatter | Creaking; freeze is a sharp crack |
| Storm | Zap, buzz, thunder | Electric charge-up | Buzzing arc | Thunder snap | Intermittent sparks |
| Hallow | Bells, choir, warm tones | Single bell | Choir pad | Bright chord | Low hum |
| Umbral | Whispers, reversed sounds, sub-bass | Reversed breath | Whispering trail | Deep thud | Faint whisper on hexed enemies |

Reactions (steam, shatter, overload, eclipse, blackfire) each get their own signature sound, louder than a normal hit, so a combo feels like a reward.

**Other effect families**

- **Cantrip:** a light cast sound per focus (wand, staff, orb, tome) with 4 variants and ±5% random pitch so rapid fire never repeats.
- **Potions:** cork pop, drinking gulp, glass shatter on throw, then a fizz or effect sound per potion type; unknown potions share one neutral sound until identified.
- **Alchemy:** bubbling cauldron loop at the alchemy table, success chime, failed-brew hiss.
- **Enemies:** per type an idle sound, movement, an attack telegraph, hit and death. The telegraph is the most important: every attack has a sound cue slightly before it lands.
- **Hero:** footsteps per floor surface (stone, water, ash, ice), hurt voice, death, level-up flourish.
- **World:** doors grinding shut and open, gates, braziers igniting, oil catching fire, water splashing, secret wall crumbling.

**Mixing rules**

- Priority: telegraphs and player damage are never masked; music ducks under boss intros, stingers and level-ups.
- Voice limit: at most 3 copies of the same sound at once, oldest cut first; total voice cap around 32.
- Every frequent sound has 3 to 5 variants plus slight random pitch.
- Volume sliders for master, music, ambience, effects and interface.
- Accessibility: important sounds (telegraphs, off-screen spawns, low health) also have a visual cue.

**Technical notes:** Web Audio API through three.js positional audio for effects; ambience and music streamed rather than loaded up front; short effects packed into a few files to cut download size; audio unlocked on the first tap or key press, as browsers require.

## Asset list

A full five-floor game needs roughly 85 3D models, about 300 sound files, 5 music pieces with stems, and about 80 icons. Counts are estimates for the scope in this document; each milestone only needs its own slice.

**Current scope: three floors.** The counts below assume five. With three, the rows that scale with floors (floor music, ambience beds and one-shots, bosses, biome props, footstep surfaces) shrink to about three fifths.

**Audio**

| Category | Contents | Files (approx.) |
| --- | --- | --- |
| Music | 5 floor pieces × 3 to 4 stems, 3 boss themes, title, Sanctum, death | 25 to 30 |
| Stingers | Room clear, level up, artifact, curse, secret, death, victory | 10 |
| Ambience beds | 1 loop per floor biome + library, shrine, alchemy, Sanctum | 9 |
| Ambience one-shots | 3 to 4 per biome | 20 |
| Spells | 15 spells × cast, travel, impact | 45 |
| Status and reactions | 5 status loops + apply sounds, 5 reactions | 15 |
| Cantrip | 4 foci × 4 variants + impact | 20 |
| Potions and alchemy | Cork, gulp, shatter, 12 effect sounds, cauldron, brew success and fail | 18 |
| Enemies | About 12 enemy types × idle, move, telegraph, hit, death | 60 |
| Bosses | 5 bosses × roar, 2 to 3 attacks, phase change, death | 30 |
| Hero | Footsteps × 4 surfaces × 3 variants, hurt, death, level-up voice | 16 |
| World | Doors, gates, braziers, oil, water, secret walls, pickups | 20 |
| Economy | Coins (3 variants), key, lock, glyph chalk, fuse and blast, urn break, chest open, purchase | 12 |
| Interface | Menu, confirm, back, boon cards, grimoire pages | 10 |

**3D models (Tripo)**

| Category | Count | Rig and clips |
| --- | --- | --- |
| Hero (per discipline if separate characters) | 1 to 5 | Idle, run, cast, hit, death; later a two-handed channel |
| Enemies | About 12 | Idle, move, attack, hit, death |
| Bosses | 5 | As enemies + 1 to 2 extra attacks |
| Artifacts on pedestals | About 25 | Static |
| Potion bottles | 3 to 4 shapes, colours shuffled in code | Static |
| Reagents | 6 | Static |
| Pickups and containers (obol, purse, bone key, glyph stone, urn, coffer, reliquary chest) | 7 | Static |
| Merchant | 1 | Idle, a small gesture |
| Props per biome (urns, coffins, statues, bookshelves, braziers) | About 5 per biome | Static |
| Sanctum hub pieces | About 6 | Static |

**Visual effects** (code and particles, no Tripo): cantrip bolts per focus, 15 spell effects, 5 status visuals, 5 reaction bursts, potion splashes, level-up glow, portal and waystone.

**2D and interface:** icons for about 15 spells, 25 artifacts, 12 potions (plus unknown bottles), 6 reagents, 6 runes and 12 boons; floor and wall textures per biome (procedural now, painted later); fonts already chosen.

**Sourcing options (to decide)**

| Asset | Options |
| --- | --- |
| 3D | Tripo3D (current pipeline) |
| Sound effects | Royalty-free libraries, AI sound effect generators, own recordings (foley is easy: glass, water, paper, fire) |
| Music | AI music generators, royalty-free libraries, a commissioned composer later |
| Icons | Rendered from the Tripo models, or painted |

Licences differ per source and per subscription plan: for a hobby project most are fine, but if Ossuary is ever published, every asset's licence has to allow commercial use in a game. Keep a simple credits file in the repo from the start (asset, source, licence).

## Tech stack and architecture

The prototype is a single HTML file; the target is a Vite + TypeScript project on current three.js, developed in Claude Code and deployed to GitHub Pages or itch.io.

|  | Prototype 0.3 (now) | Target |
| --- | --- | --- |
| Code | One 2.7 MB HTML file, about 1,500 lines | Vite + TypeScript, one module per system |
| Engine | three.js r147 (UMD, due to artifact limits) | Current three.js (ES modules, WebGPU with WebGL fallback) |
| Assets | Hero GLB embedded as base64 | GLB files in `public/assets`, loaded at runtime |
| Asset prep | Done by hand in chat | Script: resize textures to 1024 px, check clips, report problems |
| Content | Rooms and relic hard-coded | JSON data: rooms, enemies, spells, runes, artifacts, potions, recipes, boons |
| Hosting | Claude artifact | GitHub Pages or itch.io, testable in any desktop browser |
| History | None | Git |

**Target module layout**

```
src/
  main.ts          boot, game loop, states
  render/          renderer, camera, lights, textures
  world/           floor generation, rooms, doors, collision, room hazards
  actors/          hero, enemies, animation controller
  combat/          cantrip, enemy shots, damage, status effects, reactions
  magic/           spells, runes, mana, schools
  items/           artifacts, sets, curses, pickups, glyphs, merchant stock
  alchemy/         potions, identification, reagents, brewing
  progression/     XP, levels, attributes, boons, sanctum save
  input/           keyboard, gamepad (touch frozen until a mobile port)
  ui/              HUD, minimap, menus, boon picker, grimoire
  audio/           spatial effects, ambience, adaptive music, mixer
data/              rooms, enemies, spells, runes, artifacts, potions, recipes, boons (JSON)
public/assets/     hero.glb, enemies/*.glb, props/*.glb, audio/
tools/             prepare-asset script
```

**Proven techniques to carry over:** layered hero animation (legs vs upper body), automatic clip recognition by name, the cast release window found from hand motion, hip-offset re-centring, miniature-base removal for static models, drag-and-drop model swapping for quick Tripo tests.

## Roadmap and milestones

Milestones 1 to 3 decide whether the game is fun: the loop and its variety, exploration worth the risk, and magic as the build. Everything after them deepens it. Milestones have no dates, since this is a hobby project.

| Milestone | Goal | Done when |
| --- | --- | --- |
| M0 Move to Claude Code | Same game, proper project | Prototype 0.3 runs from the repo, deployed, playable on phone |
| M1 Core loop | Runs feel different | Three generated floors with varied maps, room counts and room shapes; a different boss on each floor; 50+ room templates; room variants from quiet to ordeal, and bone altars; 3 to 5 artifacts per floor from 10 artifacts and 3 foci as data |
| M2 Plunder | Exploration pays | Obols, bone keys and blast glyphs; merchant, secret room, locked vault and shrine cleansing; urns and chests |
| M3 Magic | Magic is the build | Mana, 2 spell slots, 6 spells across 3 schools, status effects, 2 reactions, library room |
| M4 Tripo enemies | Own creatures | 3 enemies and 1 boss from Tripo, with elemental affinities |
| M5 Alchemy | The second game | Potion belt, drink or throw, identification, 4 reagents, alchemy table |
| M6 RPG growth | Growth you can feel | XP, levels, attributes, 12 boons, runes and waystones |
| M7 Descent and Sanctum | A full run with a reason to return | Final boss, Sanctum with grimoire, bestiary and disciplines |
| M8 Eda | It is Eda | Lore names, floor biomes, adaptive music, ambience beds and final mix |

**Why Plunder comes before Magic:** it builds straight on M1's floor generator and room templates, and Magic's library already sells spells back for coins.

**Sound in every milestone:** each milestone ships placeholder sounds for what it adds (M2 obols and glyphs, M3 the school palettes, M4 enemy telegraphs, M5 potion sounds). Spatial audio and the mixer belong in M3, since spells need them; M8 replaces placeholders and adds music and ambience.

**M0 tasks**

- [x] Install Node.js, Git and Claude Code
- [x] Create the repo and a Vite + TypeScript project
- [x] Port the prototype into modules, upgrade three.js
- [x] Move the hero GLB to `public/assets` and add the asset preparation script
- [x] Deploy to GitHub Pages and test on phone

## Open questions and placeholders

All names in the prototype are placeholders until the Eda lore is added to this project.

| Placeholder | Stands for | Replace with |
| --- | --- | --- |
| Ossuary (working title) | Game title and floor 1 | Title and first location from Eda |
| The old chapel of Eda | Setting of floor 1 | A real place in Eda |
| Hero (no name) | Player character | Name and short backstory |
| Rotling, Wisp, Crypt hound | Enemy types | Eda creatures |
| The Hollow Warden | Floor 1 boss | Eda boss creature |
| The Drowned Abbess, the Pyre Knight | Floor 2 and 3 bosses | Eda boss creatures |
| Ember Sigil | First artifact | Eda artifact |
| Ordeal, Bone altar | M1 room types | Eda names for these rooms |
| Coins | Currency | An Eda currency (idea: obols, the coins laid on the eyes of the dead) |
| The merchant | Trader NPC | Who trades with the dead in Eda |

- [ ] Who is the hero, and why do they descend?
- [ ] Which region of Eda is the dungeon in, and what are floors 2 and 3?
- [ ] Does Eda have its own schools or traditions of magic that should replace Ember, Frost, Storm, Hallow and Umbral?
- [ ] Should artifacts come from Eda's factions or gods (for example one pool per faction)?
- [ ] Who teaches alchemy in Eda, and is it respected or forbidden?
- [ ] Should the disciplines be separate playable characters with their own Tripo models, or one mage with different loadouts?
- [ ] For a later mobile port: is four-direction casting right on phones, and do the spell, potion and glyph buttons fit on screen?
