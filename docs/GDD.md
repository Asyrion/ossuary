# Ossuary — Game Design Document

Sep 24, 2026 · @Azyrion

## Vision and pillars

Ossuary is a top-down roguelike with RPG elements, set in the high/dark fantasy world of Eda. It borrows the room-by-room structure of The Binding of Isaac, but its identity is magic: every run is a spellbook the player assembles from spells, runes, magical artifacts and potions they brew themselves. It runs in desktop browsers (a mobile version may come later); its rooms, creatures and effects are built in code, with Tripo3D for special models (the mage, bosses where wanted). It is a hobby project; the current goal is to prove the core loop is fun before adding content.

**Pitch:** An apprentice mage, Asyrion, breaks into the vault beneath the Gate of Uzulim, room by room, floor by floor, where the gate's Wardens sealed away what they took from the wilderness. They learn spells from torn grimoire pages, bind cursed artifacts to their will, brew potions from what the dead leave behind, and grow with every floor from an apprentice into a chaos mage of fire and runes. Every run builds a different mage; what the mage learns is never fully lost.

**Setting (from the owner's Eda lore, adopted 2026-09-30; `docs/ideas.md` has the reading of the notes and images).**
The Pass of Buluiain runs through the valleys of the Huruhui, guarded at each end by a gate: Belregi, carved and bright,
towards the valleys, and Uzulim, dark volcanic stone, towards the wild lands beyond. The Uzulim Wardens keep the dark
gate, and beneath it a vault of what they took from the wilderness over the centuries, "a source of great strength and
a potential danger". The runs go down into that vault. The chapel above the first floor is the Wardens' own; the crypts
are theirs, and their dead lie there with the sextons and pilgrims who served them; the artifacts on the pedestals are
what they sealed away; the Hollow Warden is a Warden who never came back up. Below the vault lies what Kaelith, the
Shadow Sentinel, gave their life to seal: the horde from the wilderness, whose creatures are the dungeon's foes. **The
world above** (the Huruhui's green valleys and cliff towns, the Longwood and its World Trees, the Plains of Belerial) is
lush and hopeful where the vault is dark: it is what the gate keeps safe. The game shows it at the edges only: through
the Vigil, a cave mouth over the valleys, and at a run's end, in daylight. The dark stays below; the light is what the
mage climbs back to.


**Pillars**

- **Magic is the build.** Spells, runes, artifacts and potions interact with each other and with the room. The fun is discovering combinations, not collecting stat-ups.
- **Readable twin-stick combat.** Fixed rooms, four-direction casting, clear telegraphs. Every hit the player takes should feel fair.
- **Nothing silent** (the owner's rule, 2026-10-01). Every mechanic tells the player that it is happening, even if only
  in a word or a cryptic line: what holds the mage shows beside the mana bar, a reaction's or a weakness's name rises
  over the foe, a counter found says so. A new mechanic is not done until it shows.
- **Growth you can feel.** RPG levels and choices inside a run; knowledge (recipes, spells, bestiary), the freed dead and a few powers that carry over between runs.
- **Alchemy as a second game.** Unknown potions to identify, reagents to harvest, recipes to discover. Every potion can be drunk or thrown.
- **Eda, not Isaac.** The room structure is borrowed; the world, magic schools, creatures and tone come from Eda. Medieval high fantasy turned dark: crypts, chapels, relics, the unquiet dead.
- **A pixel-art diorama.** Each room is a candle-lit cutaway diorama drawn in pixel-art 3D: everything (the room, the mage, foes, artifacts and spells) drawn at one pixel size, the room kit's texel, and blown up, with outlines.
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
| Unlocks are new items | The Vigil: the dead the mage frees become its people, and it opens to the magic the mage knows |

**Rule of thumb:** when a system is borrowed from Isaac, it gets a magic take. It answers to the cantrip, glyphs, spells, schools or the room, or to the dead of Eda (souls, shades, the Ferryman), never only to walking over it and waiting. Unscheduled ideas in that spirit, such as more pickup families, are collected in `docs/ideas.md`.

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
| Death | Everything lost | Run items lost; Arcane Dust, the freed, spell knowledge, discovered recipes and bestiary entries kept; the run's echo waits at the Vigil |
| Run start | Same hero, same stats | At the Vigil: a discipline, vows and gifts inscribed in the Great Circle, then the Ferryman's crossing |

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

**What is done to the mage shows** (built 2026-10-01, from the owner's answer to the review: "Nothing silent" above). A row
of chips beside the mana bar names each thing holding the mage now, in its school's colour: *Hexed* with the mana the
last blow took (the bar flashes violet and the loss rises over the mage), *Chilled*, *Heavy as stone*, *Sight dimmed*,
*Webbed* or *Ink-slowed*, *Snagged*, *Sliding*, *Drawn in* (the Angler's lure, a Lodestone Golem, a Griffin's wings) and
*Sapped* (an obelisk's field). The first time each comes in a run, a line says what it is ("A hexed blow drew mana out
of you."), one line at a time. `src/ui/afflictions.ts`; the dev menu's Mage tab lists them and sets each.

**Animation mapping.** Legs play idle, walk or run by speed; the upper body can overlay a cast, a hit reaction or a gesture (drinking, eating); death plays on the whole body. Extras are used when a model has them.

| Game state | Clip | Body part | Notes |
| --- | --- | --- | --- |
| Standing | standing\_relax | Whole body | Loops |
| Moving | run | Whole body | Plays at up to 3× speed to match move speed |
| Moving slowly | walk | Whole body | Below 30% of full speed (a gamepad stick barely tilted) the walk takes over from the run |
| Casting | cast\_a\_spell | Upper body | Only the forward thrust is replayed per bolt |
| Taking damage | hit\_to\_body\_01 | Upper body | Played at 1.6× |
| Healed by a heart | Drink Potion | Upper body | Only the draught, around the moment the flask is raised; ready for the potions of M5 |
| Standing still a while | Eat | Upper body | A fidget after 9 to 16 s standing still; moving or casting puts it away |
| Death | fall or defeat\_03 | Whole body | One of the two at random; the end screen waits for it; a model without a death clip topples over instead |

## Combat and enemies

Combat is Isaac-style: bolts travel in straight lines, drop to the floor at the end of their range, and are blocked by rocks and walls. Enemies deal contact damage and some shoot slow, readable projectiles.

- Bolts inherit 30% of the player's movement and alternate between two spawn points, like Isaac's two eyes.
- Hits flash the enemy white and knock it back; deaths leave a stain on the floor.
- Every attack is telegraphed: a glow, a shake or a pause before it lands.
- Contact and shots cost half a heart; touching a boss costs a full heart.

**Enemies in prototype 0.3** (placeholder shapes; M4 replaced them with the enemies built in code below: the wisp and
crypt hound are gone, and the rotling is kept only as a plain foe for testing, in no floor's fights; the Hollow Warden
wears a look built in code, below, and the other two bosses remain until theirs are built; a boss now calls its floor's
foes rather than the three)

| Enemy | HP | Behaviour | Isaac equivalent |
| --- | --- | --- | --- |
| Rotling | 10 | Walks straight at the player with a wobble | Gaper |
| Wisp | 7 | Flies over rocks, drifts, fires an aimed orb every 2 to 3 s | Fly with shot |
| Crypt hound | 12 | Wanders; charges when lined up with the player; stunned on impact | Charger |
| Hollow Warden (boss) | 120 | Walks, 12-shot radial burst, three aimed 3-shot volleys; summons two Rotlings below 50% | Floor 1 boss |
| Drowned Abbess (boss, M1; built in code 2026-10-01) | 120 | A great pale cave olm (Frost) whose glowing gills hang like a veil. Drifts; opens its jaw and wails fans of aimed shots; sinks into the floor and follows the mage as a ripple that can't be hurt, then a widening ring marks where it surfaces with a ring of shots; calls the floor's flyers below 50%. Weak to Storm, resists Frost | Pin |
| Pyre Knight (boss, M1; built in code 2026-10-01) | 135 | A hollow suit of blackened plate full of fire (Ember), a burning greatsword. Stalks; leaps at where the mage stands (the landing spot glows) and lands blade first with a shockwave ring; levels its sword and charges in a line until a wall stuns it; raises it and sweeps cones of embers; calls the floor's heavies below 50%. Weak to Frost, resists Ember | Monstro |

When a boss falls, the foes it called fall with it, so no fight drags on while its rewards rise.

**Enemies built in code** (decided with the owner 2026-09-29; M4 makes them foes). The owner liked the code-built
models in the pixel look and chose code over Tripo for the enemies. Ten were drawn up as options
(`src/actors/modelOptions.ts`, shown by the dev menu). On the owner's second look each took its school's light
(runes, crystals, rune rings, motes, spirit fire); on the third (2026-09-30) they became critters and small fantasy
creatures rather than the dead: round, big-eyed and smaller than the mage. All ten are divided over the three floors:

| Floor | Enemy (placeholder name) | School | The look, and how it could fight |
| --- | --- | --- | --- |
| 1 | Sporeling | Umbral | A mushroom that walks, hopping on stubby feet; its violet-spotted cap puffs spores that blind |
| 1 | Vesper Moth | Hallow | A fuzzy moth drawn to candles, gold eyespots on its wings; flutters in loops and dusts the mage with light |
| 1 | Rune Beetle | Storm | A scarab with runes lit on its shell; charges in a line, and its wing-cases part to throw a spark |
| 1 | Urn Mimic | Ember | A kiln-fired urn on stubby feet with a fire in its belly; waits among the urns, peeks, then spits embers |
| 2 | Mire Toad | Frost | A fat toad with frost crystals on its back; leaps, and breathes a cone of cold |
| 2 | Cistern Lurker | Storm | A round-headed eel rising from a rune-edged pool, a glowing lure on each whisker; spits sparks, then dives |
| 2 | Lantern Jelly | Hallow | A jellyfish floating like a lantern, a little flame in its bell; drifts close and pulses light |
| 3 | Cinder Salamander | Ember | A salamander with a crest of flame; scurries, and leaves a trail of burning ground |
| 3 | Hex Imp | Umbral | A big-eared imp on bat wings holding up a violet flame; blinks about the room and throws it |
| 3 | Rime Drakeling (elite) | Frost | A small dragon with ice crystals for horns and spines; breathes rime and takes to its wings |
| 4 | Wickmouse | Ember | A mouse with a candle stub burning on its back; darts from cover to cover, and its candle falls burning when it dies |
| 4 | Chime Bat | Storm | A round bat with a bell at its throat; its chime marks the ground under the mage, and a spark strikes the mark |
| 4 | Gargoyle Whelp | Frost | A stone pup that bolts glance off while it perches; wakes, pounces twice with a ring of frost, turns to stone again |
| 4 | Moonstag Fawn | Hallow | A gold-dappled fawn that keeps away from the mage and heals the foes near it (a boss only a little) |
| 5 | Rootling | Umbral | A seed-bulb on root feet; burrows, creeps after the mage as a mound and bursts up under it; fire keeps it up |
| 5 | Storm Ray | Storm | A little manta of storm cloud; makes long passes, leaving a line of sparks on the floor |
| 5 | Void Mote | Umbral | A knot of the dark that swallows the cantrip's bolts and spills them back as a ring; spells hurt it |
| 5 | Lantern Tortoise (elite) | Frost | A big tortoise with a shrine of candles on its shell; hides and spins off the walls, then lies dizzy |

The last eight arrived with M4.1 (two floors deeper, `docs/M4.1-plan.md`), four a floor, each a new kind of fight.

Behaviour, health, sounds and the affinities (Enemy affinities, below) are M4's to design; a foe's school is a
starting point for them.

**As built in M4 (2026-09-30; `docs/M4-plan.md` holds the table of health, weaknesses and resistances).** Templates mark
roles rather than kinds: a walker that comes at the mage, a flyer or shooter that keeps its distance, a charger or heavy;
each floor fills them from its own foes, weighted, with one elite a room at most. Each foe fights by its look: the
Sporeling hops and puffs a stinging spore cloud that dims the mage's sight (fire makes it flash); the Vesper Moth loops
round the mage or round a lit brazier or candle stand and scatters light motes; the Rune Beetle charges when lined up and
throws a spark when it stuns itself on a wall; the Urn Mimic waits beside the room's urns as one of them and spits embers
that light oil; the Mire Toad leaps and breathes cold that chills the mage and freezes water; the Cistern Lurker lives
under water (bringing a pool where the room has none), rises to spit sparks, is hurt through a shocked pool and trapped
by a frozen one (since 2026-10-01 any build can bring it up: see Every build brings the water foes up); the Lantern Jelly drifts over rocks and pulses light; the Cinder Salamander zigzags and leaves burning
ground; the Hex Imp blinks about and throws a hex that drains mana; the Rime Drakeling stalks, breathes rime, and flies
across the room to land in a ring of frost. Every attack has its tell and a sound in its school's palette. Each foe takes
+50% from its weakness and −50% from its resistance, and the first time the mage finds one the word rises over the foe;
what it has found is kept between runs for the bestiary.

**The floor-1 boss built in code (M4, 2026-09-30).** The Hollow Warden keeps its fight (it walks, winds up and bursts a
ring of shots, fires aimed volleys, calls the floor's walkers below half health) and takes one of three looks drawn up
for the owner, its shots in its school's light: the **Bell Warden** (Storm; a great beetle under an old cracked bronze
bell), the **Mother of Spores** (Umbral; a mushroom as tall as a door whose young are the Sporelings it calls) and the
**Hollow Owl** (Hallow; a round barn owl with a crown of candles). The owner chooses one after the play-test (the dev
menu's Galleries tab stands them and switches the one the Warden wears).

**Bosses from the Eda lore (M4.2, decided 2026-09-30).** Three bosses from the owner's images, built in code like the
others and drawn into the floors' pools:
- **The War-Tiger** (a white-maned tiger armoured in plates of bronze and stone): it stands as a statue in its hall until
  the mage comes in, charges and swipes, and its plates turn most of a blow; a glyph's blast or a Shatter breaks a plate
  off, and each plate lost leaves it faster and more open. As built (step 6): a statue until the mage comes within three
  tiles or strikes it (so a glyph can be chalked beside it first); it prowls, circles the mage at claw reach and swipes a
  fan of claws, crouches with the spot it will land on marked and pounces there (a wall stuns it; frost flies from its
  plates as it lands), and roars rings. Four plates (two bronze pauldrons, a stone slab on its back, a bronze brow) let
  only 40% of a blow through at first; bosses never freeze, so its Shatter is a shock on plates rimed by two chills; enough
  blows turned also wear a plate through. Weak to Storm (it fears the Wardens' bells), resisting Frost (its plates rime).
  In the pools of floors 3 and 4.
- **The Pillar Dragon** (a long dragon with antlers, a spiked mane and a beard, orange and blue-grey): it coils round the
  top of the room's pillars and moves from one to the next; bolts reach only its head where it leans out, and it breathes
  down on the floor, fire from its orange side and frost from its blue, as it faces. Knocking it off a pillar (a blast at
  the pillar's foot, a bell) brings it down to the floor for a while, open. As built (step 7): orange down its left flank,
  blue-grey down its right; a room with fewer than three pillars raises four as it comes down from above, and a belfry
  (four pillars, two bells) joins the boss rooms. Coiled round a pillar it leans out, only its head in reach, and breathes
  twice, fire and frost by turns (its maw glows with what is coming, then a stream sweeps across where the mage stood),
  then flies to another pillar, most often the one nearest the mage; below half health it throws a ring of fire and frost
  as it lands. Knocked down it lies four seconds, taking half again of each blow. Weak to Umbral, resisting Ember. In
  floor 5's pool.
- **The Twin Guardians** (the colossal bearded guardians crouched in the gate's towers, lion-pawed): two statues that wake
  together. One strikes while the other shields it (bolts glance off the shielding one); they trade places as the mage
  moves; when one falls, the other rages. The Uzulim statues whose eyes follow whoever approaches are their kind. As
  built (step 8): statues whose heads follow the mage until the mage comes near or strikes one; the shielding twin holds
  its post behind its stone shield and a drinking ward (bolts glance off, spells are drunk), the other slams the floor and
  fixes the mage with a gaze of gold, and the shield passes across every six seconds. A shielder that put itself between
  the mage and its twin blocked every line on the striker, so it holds its post until the owner's play-test says
  otherwise. They share one bar and one reward. Hallow; weak to Frost, resisting Hallow. In the pools of floors 3 and 4.

**The Bestiary (M4.5, decided 2026-09-30).** The owner liked the critters and wants a whole host more: small critters,
fantasy creatures and elementals, and new kinds of enemy behaviour. They come after M4, which builds the enemy
framework on the ten. Each is drawn up in code as a look first (the dev menu's gallery), chosen by the owner, then
made a foe. The rules of the ten hold: round, readable shapes; big eyes on the critters; a school's light; smaller than
the mage (elites and bosses aside); a floor each. The ideas to choose from are in `docs/ideas.md` (Bestiary).

The owner's redesign (2026-10-01): all thirty-one candidates and four more, thirty-five, as fantasy animals and
creatures rather than cute critters: readable at a glance as what they are, fierce, their real size, and no undead. Each
brings a kind of fight from the idea bank with a magic take that changes it. Elementals follow the idea bank's rule: their
own school heals them, blows and statuses alike ("Drinks it"), and their weakness hurts them twice over (the Puddle
Elemental, Thunderhead, Cinder Djinn, Magma Ooze, Lodestone, Hearth and Glacier Golems).

As built (the table and steps in `docs/M4.5-plan.md`), seven a floor beside M4's and M4.1's:

- **Floor 1, the crypt.** The Crypt Spider drops from out of reach and spits webs that slow (fire burns them); the Ink
  Octopus smears ink that slows and splits at half (chilled, it cracks instead); the Grimoire Mimic lies shut as a book,
  then flies, riffles cutting pages and bites; the Firefly Swarm is several beetles with one mind; the Choir Lark perches
  and sings the foes round it faster (a hex silences it); the Storm Mantis parries bolts from the front (chilled, it
  can't); the Rubble Crab hides as rubble and a glyph's blast flips it.
- **Floor 2, the drowned.** The Rime Snail leaves rime the mage slides on and hides in an ice shell fire cracks; the Glass
  Newt swims unseen and lunges with a chilling bite (a shocked or frozen pool shows it); the Brine Serpent rises from its
  pool to spit brine (ice traps it); the Puddle Elemental pours water as it walks, and frozen, a shock shatters it; the
  Thunderhead rains sparks over the mage; the Storm Darter dashes laying sparks (chilled, it hangs); the Puffcap bursts in
  stinging spores (fire pops it early).
- **Floor 3, the burning crypt.** The Ember Wasps' nest, set in a wall, lets out wasps whose sting burns the ground, and
  only fire truly harms it; the Cinder Djinn lights braziers and hurls fire (frost snuffs it); the Magma Ooze leaves
  burning ground, splits, and frozen hard a blow shatters it; the Phoenix (elite) dives in a burning line and rises once
  from its ashes unless frost or a blast puts them out; the Basilisk's stare makes the mage heavy as stone (anything tall
  blocks it, holy light blinds it); the Salt Golem stands between the mage and the other foes (fire slows it); the Rubble
  Golem drops stones from the roof, and a blast breaks it into stones that roll back together unless put down.
- **Floor 4, the Gilded Reliquary.** The Griffin (elite) soars out of reach and swoops down a marked line (a hex grounds
  it); the Radiant Eye fires a ray where the mage stood (shut, it takes half; a hex shuts it); the Harpy screeches glyphs
  away and bolts aside, and dives; the Lodestone Golem draws the mage and bends bolts towards itself (frozen, it can't);
  the Hearth Golem (elite) turns blows while its fire burns, until frost puts it out; the Shadow Fox blinks from shadow to
  shadow (lights deny it ground, holy light holds it); the Rime Scarab throws a growing snowball (fire melts it).
- **Floor 5, the Ferryman's Shore.** The Glacier Golem (elite) turns blows from the front, stomps ice spikes, and frozen
  stiff a shock shatters it; the Hydra (elite) loses heads that grow back as two unless fire sears the stump; the Gloom
  Raven darkens the mage's sight and flees light; the Rime Wolves hunt as a pack, howl themselves faster and scatter from
  fire; the Dust Pangolin rolls (bolts glance off) until a wall dazes it, open to twice the harm; the Frost Jackalope keeps
  its distance stamping rime (burning ground stops its leaps); the Manticore looses hexing spikes and pounces (holy light
  stills its tail).

The mage is the Tripo model of the play-tests again: a version of Asyrion built in code from the owner's picture was tried
on 2026-10-01 and reverted at the owner's ask the same day.

**The review of 2026-10-01** (the owner's ask after M4.5; Depth for what's built holds what it proposes). What it changed:

- **Slowing works by its factor.** Chill, wading and cobwebs slowed a foe by multiplying its velocity every step, so a
  foe that eases into its speed (fliers, swarms, the stone, M4's moths and jellies) was slowed again each step: one chill
  stack left it at about a tenth of its pace instead of the 78% the Magic system promises. Slows and a song's haste now
  scale the foe's step, never its velocity: one stack is 78% for every foe.
- **One pack a room**, as one elite: a second wolf pack or firefly swarm in a room's roll goes to another foe, a pack's
  size comes from the room's seed (a replayed seed fights the same packs), and quiet rooms keep no pack.
- **No foe waits for ever.** The Rubble Crab wakes once nothing else in the room is awake (crabs aside), as the urn and the
  book do; the Shadow Fox, finding no shadow near the mage for a while, rises in the light; the Brine Serpent, kept from
  the water nearest the mage, makes for the water nearest itself (and kept from that too, rises where it is). Each could
  have held a room's doors shut.
- **Songs don't reach bosses**: a Choir Lark called up as a boss's helper hastens the helpers, not the boss.
- **What the room inspector found:** an Ink Octopus's ink beside a pit read as more pit (it is a violet sheen now, fading
  at its edges), a Rime Snail's trail stacked into a white plank (fainter and bluer), a wasps' nest set over a niche (a
  nest or a harpy's perch keeps off the north wall's niches), and a Glass Newt stunned by slipping past its own pool's
  edge (only ice or a shock stuns it).
- **Smaller things:** the Shadow Fox rises within its reach of the mage (a free spot past a pillar could leave its bite
  short); the shared parts of the bestiary's looks (a spider's thread, a basilisk's stare) are built once; the dashes,
  brakes and wind-ups of the thirty-five share three helpers in `foeKit.ts`.

**Every build brings the water foes up** (built 2026-10-01, the owner's answer to the review). The Cistern Lurker, the
Brine Serpent and the Glass Newt hide in water, and Frost (freezing it) was the only sure way to bring them up. Now each
school has one, and the glyph is everyone's: a glyph's blast in their water, or near them, throws them up; fire on their
water boils it to steam, which scalds them (Steam's damage) and brings them up; a shock through it brings them up as it
always hurt them. Brought up, the Lurker and the Serpent lie stranded for 3 s (`stranded` in `data/foes.json`), the Newt
stunned, and each is open to every blow. Fire on still water steams at most once every 2.5 s a pool (`CFG.surface`).

**Spell effects in the same style (decided 2026-09-30).** The owner liked the Cinder Lance in the new style, so every
spell's effect is redone in it, and `docs/effects.md` is the guide for every effect to come.

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

**Mana:** a blue bar under the hearts, 100 at start. It refills 4 per second out of combat and 1 per second in combat; killing an enemy with the cantrip gives 3. Mana vials drop from rooms like hearts, and like hearts stay on the floor while mana is full; the first time in a run the mage walks into one it can't take (a vial at full mana, a heart at full health) a message says why. While the mage knows no spell nothing spends mana, so loot gives an obol in place of a mana vial until the first spell is learned.

**Spells aim like the cantrip:** a spell fires in the current cast direction, or the move direction when not casting. Some spells are placed at the mage's feet or target the nearest enemy.

**Schools and status effects**

| School | Status effect | Strong against | Feel |
| --- | --- | --- | --- |
| Ember | Burn: damage over time, spreads to burning ground | Rot and undead flesh | Aggressive, area |
| Frost | Chill slows; 3 stacks freeze; frozen enemies shatter for bonus damage | Fast enemies | Control |
| Storm | Shock: chains to nearby enemies, brief stun | Groups, anything wet | Burst |
| Hallow | Sanctified: takes more damage, can't regenerate | Wraiths, the Warden's kind | Precise, defensive |
| Umbral | Hex: drains life or mana back to the mage | Living things | Risky, sustain |

**A sixth school: Verdant** (adopted 2026-09-30 from the Huruhui's biomancy; designed and built with M5's gardens and
reagents). Growth, roots, pollen and healing: the school the valleys practise. Its status, *Overgrown*: vines that slow a
foe more the longer they hold, and flower when it falls (a little healing for the mage, once a room). Reactions to
design with it: Verdant + Ember, *Wildfire* (the burn runs to every overgrown foe); Verdant + Frost, *Frostbloom* (ice
flowers that shatter); Verdant + Storm, *Pollen spark* (a cloud of pollen that shocks); and, designed with M4.10,
Verdant + Hallow, *Bloom*, and Verdant + Umbral, *Blight*. Spells to design: a snare of thorns, a cloud of healing
pollen, a wall of living wood. Its sound: wood and breath, reeds and seed pods.

**Element reactions** (two effects on the same enemy or tile)

| Combination | Reaction |
| --- | --- |
| Ember + Frost | Steam cloud: enemies inside can't aim; eyes can't see through it (built 2026-10-01) |
| Frost + Storm | Shatter: frozen enemy explodes into ice shards |
| Ember + Storm | Overload: small explosion, knockback |
| Hallow + Umbral | Eclipse: the enemy is removed from the fight for 3 s, then takes all stored damage |
| Umbral + Ember | Blackfire: burn that never goes out until the enemy dies |
| Ember + Hallow | Searing: the foe's guard burnt away a while (built, M4.8) |
| Frost + Hallow | Prism: a frozen, sanctified foe splits the cantrip in three (built, M4.8) |
| Storm + Hallow | Verdict: lightning on every sanctified foe in the room (built, M4.8) |
| Frost + Umbral | Black Ice: ice under the foe where walkers slide and can't stop (built, M4.8) |
| Storm + Umbral | Void Spark: a spark that leaps, carrying a hex; each it marks gives mana as it falls (built, M4.8) |

**Hallow and Umbral as built (M4.1).** Sanctified: for a few seconds the foe takes a quarter more damage from everything
and nothing heals it. Hex: stacks (up to five) that fade a while after the last; each blow the mage lands on a hexed foe
spends one and gives back 3 mana, and a foe that falls with three or more leaves a black soul mote one time in two.
Root (Umbral's hands): held where it stands, still striking; a boss only for a moment. Eclipse: the foe is out of the
fight for 2 s under a black sun, nothing reaching it, then struck for 18 (a boss is only struck). Blackfire: a violet
burn that never goes out while the foe lives. Tuning in `data/magic.json`.

**Steam as built (2026-10-01, the owner's ask).** A chilled or frozen foe set burning, or a burning foe chilled, puts
both out and steams: a scald (6) and a cloud 1.7 tiles across for 4.5 s (a Blackfire's burn doesn't go out, so it doesn't
steam). The floor makes it too: fire on frozen water melts it to steam, frost on burning oil snuffs it to steam, and fire
on still water boils a little. Foes inside the cloud can't aim (their shots go up to 1.1 radians wide), and eyes can't see
the mage through it: the Basilisk's stare, the Radiant Eye's ray and a watching statue's charge all lose it. Water under
it is scalded and what hides there comes up. `src/magic/steam.ts`; tuning in `data/magic.json`; the dev menu's Magic tab
has "Steam ahead".

**The full wheel as built (M4.8).** Every pair of the five schools reacts, on a foe and, for three of them, on the floor.
Searing (a burning foe sanctified, or a sanctified one set burning): struck for 4 in holy fire, and for 4 s its guard is
gone, so shut shells, lids, clay and a lit Hearth Golem take full blows (one rule in `damageEnemy`); a War-Tiger loses a
plate at once. Prism (a frozen foe sanctified, or a sanctified one frozen): while the ice holds it glints every colour,
and each cantrip bolt that strikes it breaks into three of the rainbow's colours, one on and one 24° to either side, each
at 70% for 4.5 tiles. Verdict (a sanctified foe shocked, or a shocked one sanctified): lightning falls on it and on every
other sanctified foe in the room, each struck for 8 and stunned for half a second. Black Ice (a chilled or frozen foe
hexed, or a hexed one chilled): a glassy indigo patch that glints, 2.3 tiles across, for 7 s; every walking foe on it slides,
its grip a fifth of rime's, so it can hardly turn or stop; the mage crosses it at full speed, and fire melts it. Void
Spark (a hexed foe shocked, or a shocked one hexed): the spark leaps to the three foes nearest within 3.4 tiles, striking
each for 4 and laying a hex stack on it, and marks them for 5 s; a marked foe that falls gives 6 mana. On the floor, a
shock through burning oil is an Overload at the pool's middle that blows the fire out, and a hex landing on Consecrate's
holy ground (Grasp of the Grave's hands, a hexing bolt crossing it, a hex on a foe standing in it) darkens the ground at
once and takes everyone standing in it under a black sun. The first time ever a reaction goes off its name rises larger than it does after;
the spells tab's book ends with the wheel: an entry for each pair, lit once found (kept between runs in the browser,
`ossuary.reactions`), its chord drawn on a wheel of the schools whose sixth spoke, Verdant's, is sealed until M5. A
spell's panel marks the reactions it can set off that are not found yet. The dev menu's Magic tab has "Reactions here"
(each set off on training dummies ahead) and finds or forgets them; tuning in `data/magic.json`.

**Rooms react to magic.** Oil puddles ignite, water conducts shock across the whole puddle, braziers lit by Ember empower Ember spells in that room, cobwebs burn away to open shortcuts, gravestones can be shattered by Frost. This is the main systemic difference from Isaac and gives room templates a second purpose.

**As built in M3** (numbers in `data/spells.json`, `data/magic.json` and `CFG`; see `docs/M3-plan.md`):

- Ember, Frost and Storm, two spells each (the six in the Spells table without Phoenix Step, Winter's Breath and
  Thundercall). The run starts with no spell; the first comes from floor 1's library or its boss.
- Burn: 2.5 damage a second. Chill: each stack 22% slower, thawing after 3 s; the third freezes for 2 s (frozen foes
  take ×1.5 and can't act), then 1.5 s before it can freeze again. Shock: a 0.35 s stun, and the next hit on the foe
  leaps half its damage to a neighbour. Bosses slow (two stacks at most) but never freeze, and are stunned at most
  once every 3 s.
- Shatter and Overload are the two reactions; Steam waits (built 2026-10-01, below). Reaction names rise in the air so
  players learn them.
- Rooms that react: oil burns for 5 s (walking foes on it burn, the mage in it is hurt) and is then spent; water is
  shallow (wading at 60% speed), carries a shock to everything standing in it, the mage too, and freezes over from
  Frost into ice crossed at full speed; fire melts it. The drowned floor grows real puddles in its fights.
- A cantrip kill gives 3 mana; kills by spells don't (burn keeps whoever lit it). Spells are refused in the
  merchant's warded shop.

**Runes** modify one spell each and are socketed at waystones. Each spell has 1 socket (2 with a boon).

| Rune | Effect |
| --- | --- |
| Split | Projectile spells fire 3 weaker copies in a fan |
| Echo | The spell repeats 0.5 s later at 50% power |
| Seeking | Projectiles curve towards enemies |
| Wide | Area spells +50% radius, −20% damage |
| Swift | −30% cooldown, +20% mana cost |
| Blood | Costs half a heart instead of mana when mana runs out |

**Enemy affinities (RPG layer):** every enemy has one weakness (+50% damage) and one resistance (−50%), shown in the bestiary once discovered. Placeholder examples: Rotlings are weak to Ember; Wisps resist Umbral and are weak to Hallow; the Hollow Warden resists Frost. As built in M4, each of the ten foes has its pair (`data/foes.json`, the table in `docs/M4-plan.md`); the bosses of floors 4 and 5 have theirs (M4.1), and so do M4.2's (the War-Tiger weak to Storm and resisting Frost, the Pillar Dragon weak to Umbral and resisting Ember, the Twin Guardians weak to Frost and resisting Hallow).

## Spells

Fifteen spells, three per school, are enough for M1 to M5. Spells are learned from grimoire pages (library rooms, bosses, rare drops); a new spell replaces one of the two slots, and the replaced one can be rebought at the next library. All names are placeholders until the Eda lore arrives.

| School | Spell | Mana | Cooldown | Effect |
| --- | --- | --- | --- | --- |
| Ember | Cinder Lance | 20 | 2 s | Piercing fire beam, burns everything in a line |
| Ember | Pyre Seal | 35 | 8 s | Rune on the floor erupts after 1 s in a ring of flame, leaves burning ground |
| Ember | Phoenix Step | 25 | 6 s | Short dash through enemies, leaving a fire trail; 0.3 s invulnerable |
| Frost | Rime Shards | 15 | 1.5 s | Shotgun of 5 ice shards, each applies Chill |
| Frost | Glacial Wall | 30 | 10 s | Wall of ice across the cast direction; for 5 s it stops enemies and their shots (not the mage's bolts), then shatters on enemies near it |
| Frost | Winter's Breath | 40 | 12 s | Cone that freezes everything it touches for 2 s |
| Storm | Arc | 15 | 1 s | Lightning hits the nearest enemy and chains to 3 more |
| Storm | Thundercall | 40 | 10 s | Three strikes on random enemies; hits on water spread to the whole puddle |
| Storm | Static Mantle | 30 | 15 s | For 6 s, shocks any enemy that touches the mage and throws it back |
| Hallow | Lantern of Vigil | 30 | 14 s | Floating lantern follows the mage and fires at enemies for 8 s |
| Hallow | Consecrate | 35 | 12 s | Holy ground at the feet: the mage heals half a heart per 3 s inside, undead take damage |
| Hallow | Judgement | 50 | 16 s | Beam from above on the strongest enemy after 1 s delay, huge damage |
| Umbral | Hex Bolt | 15 | 2 s | Slow bolt, applies Hex; hexed enemies return mana on hit |
| Umbral | Grasp of the Grave | 30 | 10 s | Hands rise from the floor and root enemies in an area for 2 s |
| Umbral | Soul Harvest | 0 | 20 s | Consumes all Hex stacks in the room: damage per stack, +1 mana per stack |

**As built in M4.1** (`data/spells.json`): six spells for Hallow and Umbral, four from this table and two new ones.
Consecrate (35 mana, 12 s: holy ground at the mage's feet for 6 s that sears and sanctifies what walks in it, heals the
mage half a heart once, and kindles the candle stands on it), Judgement (45, 14 s: a closing ring of gold marks the
strongest foe in reach, then a pillar of light falls on it), Wardlight (new; 30, 14 s: six motes circle the mage for
8 s, breaking the shots they meet and searing what they touch), Hex Bolt (14, 1.8 s: a slow dark bolt, two stacks of
Hex), Grasp of the Grave (30, 10 s: hands rise where the mage aims and hold every foe there, hexed) and the Ferryman's
Toll (new; 20, 6 s: the nearest foe is marked with a coin of shadow; blows on it give back mana, and if it falls marked
it pays an obol and its hex spreads). Lantern of Vigil and Soul Harvest wait.

**Spell data shape**

```json
{
  "id": "cinder_lance", "name": "Cinder Lance", "school": "ember", "shape": "beam",
  "mana": 20, "cooldown": 2, "damage": 8, "status": { "burn": 3 },
  "params": { "range": 7, "width": 0.3 },
  "tags": ["beam", "pierce"], "color": "#ff8a3a", "icon": "lance",
  "text": "A beam of fire pierces every foe in a line and sets them burning",
  "lore": "The pyre-keepers lit the chapel's lamps from across the nave..."
}
```

`shape` picks a behaviour in code; M3 built beam, placed, shotgun, wall, chain and self, and cone, dash and summon come with the spells that need them. `params` holds the numbers only the shape reads (each shape's list is checked). Everything else is data, so new spells are mostly new entries. Tags decide which runes and boons apply; sockets arrive with runes (M6).

**Casting animation:** the hero's `cast_a_spell` window is reused for every spell; strong spells can play a longer part of the same clip. A second Tripo clip (a two-handed channel) would help beams and cones later.

**Spell knowledge (M3.7, built 2026-09-29).** The mage comes to know spells in stages, and what the mage knows is kept between runs (in the browser until the Vigil, the hub between runs, takes it over; see RPG progression: Between runs).

| Stage | Reached when | What a spell's panel shows |
| --- | --- | --- |
| Seen | Its page is first approached | Name, school (in its colour), the one-line effect |
| Learned | A page of it is taken | Adds mana, cooldown, damage and statuses |
| Used | It has been cast about ten times (over all runs) | Adds its lore and the reactions it can set off (Frost and Storm: Shatter) |
| Upgraded | Runes or school mastery change it (M6) | Adds what changed it |

- **At a page:** coming within about two tiles of a grimoire page (library, boss, loose) shows a small panel above it at the spell's stage, so the library's choice of three is an informed one; walking into the page still takes it.
- **In the inventory:** the spells tab keeps the two carried slots on top, then one section per school, shown only once a spell of that school has been learned. A school's section lists every spell of it the mage has met (carried ones marked Q or E, given-up ones dimmed) and a sealed blank entry for each one not yet met, so there is more to find. Each entry's description is filled to its stage.
- **Dev menu:** know every spell, and forget everything.

**Spell marks (M4.11, the owner's ask, built 2026-10-01; `docs/M4.11-plan.md`).** The spells the mage carries and what they
know show on the mage, small and in each school's light (embers rise, rime falls, sparks crackle, motes drift up, shadow
sinks). Purely visual for now; attunement or mastery could give something in M6. Each says what it is the first time.

| Mark | Comes from | What shows |
| --- | --- | --- |
| Spell in hand | Each slot: Q at the casting hand, E at the off hand | A light with its school's motion. Ready: full. Cooling down: faint, filling back, a flash when ready. Short of mana: grey and flickering. It tells what the HUD's slot tells, where the eye is. |
| Master's ring | A slotted spell whose whole school is known well (every spell of it at the Used stage) | A thin rune ring turning round that wrist; a line the first time ("You know every Ember spell well") |
| Attunement | Both slots holding one school's spells | The school's light about the whole mage; a line the first time in a run ("Attuned to Ember") |
| Knowledge circle | Every spell known well, kept between runs | Standing still a moment: a rune circle at the feet, an arc per school, a rune for each spell known well and a faint tick for each still to know; a school known in full closes its arc in a bright line. It fades as the mage moves. |

Frame cost: all of them at once add about 12 draw calls (the circle is one mesh, its colours in its vertices).

## Artifacts

Artifacts replace Isaac's items. There are four kinds: one focus that reshapes the cantrip, any number of passive artifacts, cursed artifacts with a price, and sets that reward collecting pieces. The prototype's Ember Sigil becomes the first passive artifact.

| Kind | Slots | Role |
| --- | --- | --- |
| Focus (wand, staff, orb, tome) | 1; picking a new one drops the old | Changes how the cantrip fires: count, path, element |
| Passive | Unlimited, stack | Stats, triggers, new behaviours |
| Cursed | Unlimited | Strong effect plus a drawback; cleansed at a shrine, which removes the drawback and halves the effect |
| Set piece | Unlimited | 2 or 3 pieces of a set grant a bonus |

**M4.1's twelve** (the artifacts now number 56 besides the starting wand; `data/artifacts.json`): two foci, the
Pendulum of Hours (bolts swing out to one side and curve back onto the aim, the side alternating by cast) and the
Lodestar Wand (bolts hang as small stars where their range ends); passives: the Twin Vigil Candles (standing still,
bolts strike half again as hard, two flames at the shoulders), the Ossuary Choir (the fifth foe put to rest in a room
makes the dead sing, striking every foe there), the Echo Stone (a bolt comes back off a wall once), the Blood Moon
Pendant (at half health, faster bolts, a quicker hand, crimson), the Salt Circle (standing still a moment, a ring that
walking foes can't cross), the Gilded Halo (the first bolt sanctifies each foe), the Ferryman's Lantern (hexes give
back half again the mana, soul motes come twice as often) and the Hart's Antler (every sixth cast a lance of light that
pierces and sanctifies); cursed: the Gravemonger's Contract (half the foes put to rest leave an obol; price: fights
leave no hearts and hearts cost twice as much) and the Last Rite (once a floor a killing blow is refused; price: a
heart container).

**Artifacts per floor: at least 3; a budget of 6, and now and then luck gives more.** Three sources are on every floor; optional ones can add up to three more, enough for the merchant, a vault and a bone altar on the same floor. The boss's choice of two counts as one, since only one can be taken. Some finds sit outside the budget, so a lucky floor can hold more (decided 2026-09-28): a gilded reliquary chest (see Containers), and from step 4 of M2 the secret room.

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
| Mourner's Censer | Three bolts fan out, −40% damage each and −40% range | M2 (added 2026-09-28) |
| Gravewarden's Spear | One slow, heavy, larger bolt: ×2.4 damage, passes through every foe, casts 1.9× slower | M2 (added 2026-09-28) |
| Serpent Rod | Bolts weave from side to side like a serpent, +10% damage | M2 (added 2026-09-28) |
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
| Raven's Eye | One cast in five is a strong one: bigger white-hot bolts that strike thrice as hard | M2 (added 2026-09-28) |
| Cracked Mirror | A bolt that strikes a foe splits into two halves that fly on either side of it | M2 (added 2026-09-28) |
| Hawk-Bone Fletching | Bolts fly 35% faster and 30% farther | M2 (added 2026-09-28) |
| Ram's Skull | Bolts knock foes back 2.6 times as far, damage +0.5 | M2 (added 2026-09-28) |
| Leech Jar | Every tenth foe put to rest gives back half a heart, as a red mote | M2 (added 2026-09-28) |
| Candle Moth | A pale moth flutters about the mage and stings the nearest foe with a lesser bolt every second or so | M2 (added 2026-09-28) |
| Weeping Skull | A skull circles the mage, swallowing enemy shots it meets and biting foes it passes | M2 (added 2026-09-28) |
| Unbroken Oath | A fight won without being hurt returns half a heart | M2 (added 2026-09-28) |
| Mana Lantern | Max mana +40 | M3 |
| Candle of the Vigil | Each room clear refills 25 mana | M3 |
| Frostbitten Ring | Every 5th cantrip bolt applies Chill | M3 |
| Stormglass Pendant | Shocked enemies take +25% cantrip damage | M3 |
| Thurible of Ash | Burning enemies spread Burn when they die | M3 |
| Witch's Knot | Spells cost 20% less at half health or below (below half alone was too rare with 3 hearts) | M3 |
| Alchemist's Satchel | Potion belt +1 slot, reagents drop 30% more often | M5 |

**Cursed artifacts**

| Artifact | Gift | Price | Arrives |
| --- | --- | --- | --- |
| Mask of the Drowned | Cantrip damage doubled | Vision limited to a circle around the mage | M1 |
| Chain of the Penitent | Invulnerability after a hit lasts 3 s | Move speed −25% | M1 |
| Leaden Heart | Two more heart containers | Bolts reach 40% less far | M2 (added 2026-09-28) |
| Bloodied Covenant | Damage +2.5 | Every fight the mage begins takes half a heart (never the last) | M2 (added 2026-09-28) |
| Crown of Thorns | Spell damage +50% | Max health −1 heart | M3 |
| Hungering Tome | Every kill refills 5 mana | Mana doesn't regenerate on its own | M3 |

**The M1 set** is the 10 artifacts and 3 foci marked M1 above. Rules that apply from M1 on:

- **Every artifact is noticeable.** Picking one up changes something the player sees (the bolts, the mage, the HUD or the room), never only a hidden number. The pickup banner names it and says what it does in a few words, and a lore card in the corner of the screen describes it, the way a soulslike describes an item but plainer: its icon, name and kind, what it does and a few lines of lore. Items and containers get the same card the first time they're taken in a run; spells and potions will too.
- **The cantrip combines automatically.** The focus sets the pattern (how many bolts, and their path); passives add modifiers (damage, size, fire rate, piercing, triggers). There are no hand-written pairings: Twin-Headed Staff with Bone Lens fires two piercing bolts, Shepherd's Crook with Bone Lens pierces on the way out and back.
- **Taking a focus leaves the old one on the pedestal,** so the player can swap back.
- **Each artifact appears at most once per run.** If a source's pool is empty, it falls back to any unseen artifact, then to a heart. M1 had 13 items against up to 15 offers per run; 13 more joined on 2026-09-28 so play-tests see different runs, then the 7 economy artifacts (33 in all, besides the starting wand), and more are brainstormed in `docs/ideas.md`. More artifacts are the cheapest way to add variety.
- **Companions** (the Candle Moth, the Weeping Skull) circle the mage and act on their own; they belong to their artifact and leave with it.

**Sets** (from M3, when their pieces exist)

| Set | Pieces | Bonus |
| --- | --- | --- |
| The Pyromancer's Regalia | Ember Sigil, Emberwood Wand, Thurible of Ash | Burning ground heals the mage instead of hurting it |
| The Vigil | Candle of the Vigil, Mana Lantern | Hallow spells cost no mana while at full health |
| The Drowned Choir | Drowned Orb, Mask of the Drowned | Water puddles appear in every room; the mage is immune to shock |

**Costumes and transformations** (decided with the owner 2026-09-30, after the Pilgrim's Cowl proved the idea)

Picking up an artifact shows on the mage, as Isaac's items do, but in a high fantasy and magic way.

- **Costumes.** Most artifacts wear a piece, built in code and hung from a bone of the rig, one per slot: head,
  face, shoulders, back, hands, belt and aura. The one taken last wins its slot. A cursed artifact shows its curse
  (the mask weeps, the chain drags on the floor) until a shrine cleanses it; then its piece changes to its cleansed
  look.
- **Transformations.** Three artifacts of one kind (a `kind` tag in `data/artifacts.json`) transform the mage for
  the rest of the run. The look takes several slots, an aura and a tint of the robes. A banner and a lore card name
  it, and the mage gains a gift in its spirit (as Isaac's transformations do, with a magic take). Sets (above) keep
  their bonus; a transformation counts any artifacts of its kind. Proposed, to be chosen with the owner:
- **Every artifact to come shows too** (the owner's ask, 2026-10-01). A new artifact is designed with its look on the
  mage, chosen by what it stands for: a piece built for the body (a crown, a mask, cuffs), its own model carried at a spot
  (a lantern at the belt, a sigil on the back, a pendant on the chest), held (every focus), or nothing when it already
  shows round the mage (a companion, flames at the shoulders, a ring at the feet), named in `SHOWS_OTHERWISE`. A rule or a
  bargain with no shape (a better price at the merchant, a ledger of debts) is best carried as the object it is. The
  validator refuses an artifact that hasn't decided.

| Transformation | Kind | The look | The gift |
| --- | --- | --- | --- |
| Pyromancer | Ember | A crown of flame, smouldering sleeves, burning footprints | The cantrip leaves embers where it strikes |
| Frostborn | Frost | An ice crown, rimed robes, frosted breath | Foes that touch the mage are chilled |
| Stormcaller | Storm | Boketto's look (the owner's image): white hair, black spirals down the arms, a violet and teal glow across the face and shoulder, eyes lit blue when a Storm spell is cast | Every fifth cast leaps to a second foe |
| Lightbearer | Hallow | A halo and wings of candle-light | The mage floats over pits and water |
| Shadowstep | Umbral | A cloak of shadow, violet eyes | A short blink in the moving direction |
| Runescribe | Runes and scrolls | Runes glowing across the robes, a floating grimoire | Bolts leave a rune that bursts a moment later |
| Pilgrim | Pilgrim's things (the Cowl, the Boots, the Rosary of Haste) | A pilgrim's robes, a lantern at the belt | The lantern's light shows each floor's map and makes cracked walls glow; the mage walks faster |
| Beastcaller | Familiars | A circlet of antlers, motes circling | One more familiar, and familiars strike harder |
| Alchemist (M5) | Potions | A bandolier of vials, a stained apron | Thrown potions split in two |

**Asyrion's arc** (from the owner's two sheets, adopted 2026-09-30). The mage is Asyrion. A run begins in the
apprentice's look (a young man with tousled fair hair over a dark undercut, green eyes, a grey-green hooded tunic, a
traveller's pack) and grows towards the chaos mage's (long dark hair, a dark coat worked all over in bronze, a flame in one
hand, red rune orbs circling in thin gold rings, white arcs of wind): the more of their power the mage holds (artifacts for
now; levels from M6), the more of the fire mage's pieces replace the apprentice's, slot by slot, as costumes do. The Tripo
model is made from the sheets (docs/assets.md); the pieces that change are built in code.

**M4.6 as built (2026-10-01; `docs/M4.6-plan.md`, its decisions taken as proposed, the owner to change any).**
- *Costumes.* Eight slots (the seven above and the feet) and the focus, always held in the casting hand. 52 of the 57
  artifacts show: their own model carried at a spot (belt, back, shoulder, chest, wrist) or a piece built for the body
  (crowns, halo, antlers, masks, lens, third eye, feathers, stole, manacles, ring, band, beads, knot, boots). A cursed
  piece glows red and weeps until cleansed; then it takes its cleansed look (the thorns flower, the mask is pushed up,
  the chains break, the stole turns white).
- *Transformations.* The table above, the Alchemist waiting for M5, each counting the artifacts tagged with its `family`
  (4 to 6 each). The latest formed wears its look over the artifacts' pieces in those slots, with an aura in its light and
  the robes tinted towards it. The Stormcaller's look is built from Boketto's (marks of storm on the face, black spirals
  down the arms, eyes that flare blue when a Storm spell is cast) but does not whiten the model's hair. Every gift formed
  stays. The gifts as built: the Pyromancer's embers, where a cantrip bolt strikes, burn foes and never the mage; the
  Stormcaller's leap comes on every fifth bolt that strikes; the Lightbearer floats over pits and water (no wading, no
  current); the Shadowstep blinks 2.4 tiles on Shift or the right trigger, every 1.6 s, briefly untouchable, and a
  blink pressed too soon fizzles; the Runescribe's rune bursts 0.55 s after a strike for 60% of the bolt; the Pilgrim's
  map is shown as each floor begins, cracked walls glow, and the mage walks 12% faster; the Beastcaller has one more
  moth, and every familiar strikes half again as hard.
- *Asyrion's arc.* Four stages at 3, 6, 9 and 12 artifacts held (every one taken, and the focus unless it is the first
  wand): bronze-worked bracers; the dark coat's collar and shoulders; three red rune orbs in gold rings circling at the
  chest; a flame in the off hand and white arcs of wind. Each fills its slot only where no artifact or transformation
  does (the orbs and the flame have slots of their own). Each stage says so in a line the first time it is reached in a
  run.
- *Frame cost.* Filling every slot at once adds about 21 draw calls in all (68 to 89); the arc's last stage about 20 more;
  a transformation's look a few more over what it replaces.

**Fen-Nex** (the owner's Fen-Nex, "fox man", adopted 2026-09-30). The Rune Fox familiar built from the owner's drawing is
Fen-Nex, Asyrion's companion: an artifact binds it as a small rune fox that runs at the mage's heel and bites; as the run
goes on (floors cleared) it grows into its full shape, a long white beast between fox, cat and dragon, its fur blown back
into flame-tipped feathers, its legs plated dark blue with red spiral runes, and it breathes Ember. Three beast artifacts
make its pelt a transformation (the Beastcaller's look takes it). As built (M4.2 step 9): the Rune of Fen-Nex binds it; it
grows a stage a floor (the rune fox, full-grown with a burning bite, then its full shape that also breathes Ember).

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

A cursed artifact keeps its gift in `stats` and `effects` and its price in `curse`, with what it says of itself
once a shrine has cleansed it: the Mask of the Drowned is `"stats": { "damageMul": 2 }, "curse": { "effects":
["vision"], "cleansed": "Your bolts strike half again as hard" }`. Cleansing drops the `curse` and halves the gift:
half of an added stat, half the way to 1 of a multiplied one (×2 becomes ×1.5).

**Their looks are built in code** (the owner's decision 2026-09-30): the models over the pedestals, the costume pieces and the icons. Tripo is kept for special models (the mage, and bosses where wanted).

## Potions and alchemy

Potions are the second game inside a run: every potion has a drink effect on the mage and a throw effect on the room, found potions are unidentified, and the mage can brew their own from reagents.

**The potion belt:** 3 slots (4 with the Alchemist's Satchel). Tap the potion button to drink the selected potion, hold it to aim and throw in the cast direction. Thrown potions shatter in a 2-tile splash.

**Dr. Jelly's laboratory** (the owner's Dr. Jelly's House, adopted 2026-09-30). The alchemy table stands in a
laboratory lit green: glass globes of glowing jelly on stands, and behind a great arched window a vat where a jelly serpent
coils. Dr. Jelly, the alchemist who keeps it, identifies a potion and trades recipes. The globes burst to a bolt and spill a
jelly (the Lantern Jelly's kin) or a reagent. Once a run the serpent may break out of its vat as a boss, flooding the room
with jelly that slows and conducts shock.

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

**Their looks** are built in code: reagents and potion bottles are small props; bottles can share one mesh with shuffled colours.

## RPG progression

Growth happens on two timescales: levels, attributes and boons inside a run (lost on death), and knowledge, unlocks and a few powers at the Vigil between runs (kept). Power mostly stays inside the run; the few powers kept are offset by deeper floors and the vows.

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

**Between runs: the Vigil** (decided with the owner 2026-09-29; built in M7)

The Vigil is a candle-lit crypt above the dungeon, where the dead the mage frees come to rest. With the Eda lore
(2026-09-30) it opens at the back into a cave mouth over the Huruhui valleys: as the mage frees shades, the cave fills in
as the Huruhui's cave cities do (a terrace, a house, a garden bed and a fall of water for each), and the light of the
valleys reaches further in. Its first shades include Boketto the Storm Caller and the Cloud Forest Wizard, who teach
their schools (Storm, and Verdant); Huruhui foragers (flower crowns, bows and spears) bring reagents back between runs.
Kaelith, the Shadow Sentinel, is the voice under the vault: heard in the Vigil, met as the final boss (M7), the seal they
became the last thing between the horde and the pass. A run won ends in daylight, at the cave mouth. The mage wakes there
after every run and goes down from there. It grows by who the mage has freed and by the magic the mage knows, not by
coin, and it is no shop: nothing is sold there. It replaces the Sanctum placeholder; its name and every name below are
placeholders until the Eda lore arrives. The concepts it was chosen from are in `docs/ideas.md` (A hub between runs).

**Magic take:** the Vigil answers to magic as the dungeon does. Its rooms open to the spells the mage knows; its
candles, bells, water and skull niches work like the dungeon's own mechanisms; its people are the dungeon's dead.

*The heart: free or bind.* In runs the mage finds bound shades, about one a floor: in secret rooms, behind ordeals, in a
boss's keeping, now and then in a library or vault. Each shade is someone who died in the dungeon (a sexton, a
chorister, a pilgrim, a bell-ringer, a novice, an embalmer, a scribe). Breaking its binding takes magic, and then the
mage chooses:

- **Free it:** it rises to the Vigil and becomes one of its people. It talks, remembers and gives (below).
- **Bind it:** it serves as a familiar in the next run only. Then it slips back into its chains somewhere in the
  dungeon, to be met again.

Freeing grows the Vigil; binding is power for one run. That choice is the Vigil's heart.

*Townspeople and dialogue.* The freed are the game's first NPCs, with a small dialogue system:

- A few lines for each moment (the first meeting, after a death, after a boss, a quest open or done) and a choice or
  two. What a townsperson says depends on what the mage has found.
- They tell what they know: bestiary lore, where secret rooms hide, what a boss fears.
- Each gives one thing when freed, and more as its bond deepens: a spell added to the library's pool, a discipline, a
  recipe (M5), a way through the Vigil, or one of the few powers (below).
- Some give small quests into the dungeon ("bring back my ring from the drowned floor") and open something when helped.
- Dialogue is data (lines, conditions, choices), like rooms and spells.

*The Vigil unfolds.* At first it is one dark crypt. Its other parts open to the magic the mage knows, like a small
Metroidvania:

- a frozen stair melts once an Ember spell is known;
- a flooded cellar is crossed with Frost;
- a sealed door answers only to Storm (Hallow and Umbral later).

Every part opened holds a resting place for more of the freed, a workshop, or a way down.

*The Great Circle: the choice before a run.* In the Vigil's nave the mage inscribes sigils into a ritual circle with
Arcane Dust. The circle has three rings:

- **The ring of vows:** a harder run for a better reward (more foes, faster shots, a curse from the start, a boss's
  second phase). The vows keep the challenge ahead of the powers.
- **The ring of gifts:** the discipline (starting spell and focus), and a spell or potion to start with.
- **The ring of omens:** which themes and schools the floors lean towards.

Sigils side by side combine, so placing them is a small puzzle. Casting the finished circle calls the way down.

*The Ferryman's crossing: the way down.* The Ferryman takes the mage down across dark water, for a toll. What is paid
decides where he lands the mage: the first floor, or a deeper one once it has been reached. A deeper landing is a
shortcut that skips the upper floors' rewards.

*Echoes.* Every run that ends leaves an echo of the mage at the Vigil (the last few runs at most): a pale figure
holding what that run carried. The mage can do one thing with each echo:

- speak to it, to hear how it fell (a hint);
- take a faded copy of one of its artifacts into the next run (weaker, one use);
- lay it to rest, for Arcane Dust.

The Vigil fills with the mage's own history.

*What carries over.* **Arcane Dust** is earned from every run (depth reached, bosses, discoveries, shades freed,
vows kept, echoes laid to rest) and spent at the Vigil. Kept between runs:

- Arcane Dust, the freed and their bonds and quests, and the Vigil's opened parts;
- spell knowledge (M3.7; it moves here from the browser's own store), recipes, the bestiary and the disciplines;
- the echoes.

Everything carried in the run is lost at death.

*Permanent upgrades: options first, a few powers* (the owner's decision 2026-09-29; it replaces the earlier rule of
no permanent stat increases).

- **Options**, most of what the Vigil gives: spells and artifacts added to the pools, disciplines, recipes, bestiary
  entries, gifts and omens, parts of the Vigil. They widen what a run can be.
- **Powers**, few and costly: for example more mana, a second rune socket, one heart container, a glyph to start
  with. Each comes from a freed townsperson and is paid in Arcane Dust. There are about six in all, each a small step.
- **The offset:** the dungeon grows bigger, more explorable and harder the deeper it goes (M7's descent), and the
  vows add challenge on top. The vows can always make a run harder than the powers make it easier.

| Feature | Where in the Vigil | What it keeps or unlocks |
| --- | --- | --- |
| Grimoire | A lectern, kept by a freed scribe | Every spell, recipe and artifact ever found; recipes stay known; spell knowledge (M3.7) |
| Bestiary | The crypt's walls | Enemy weaknesses and resistances once discovered (the record kept in the Vigil; the M4.5 milestone of the same name adds the creatures themselves) |
| Disciplines | The Great Circle's ring of gifts | Starting loadouts: Pyromancer (Cinder Lance, Emberwood Wand), Frostwarden, Stormcaller, Vigil Keeper, Hexer; each unlocked by a freed shade |
| Library shelves | Given by the freed | New spells and artifacts in the pools of future runs |
| Alchemy garden | A garden of the dead, tended by a freed embalmer (M5) | Start runs with one reagent of choice |

*The first run and the return.* The first run starts in the dungeon, as now. When it ends, the mage wakes in the
Vigil: dark and empty but for its first candle. From then on the title screen leads to the Vigil, and every run,
won or lost, ends there.

*More of the Vigil's magic* (Claude's additions at the owner's request, 2026-09-29; the owner keeps or strikes each):

1. **The candle wall.** The Vigil starts dark, and every shade freed lights a candle on its wall: the Vigil's light
   shows how far it has come. Before a run, the mage can light one townsperson's candle to carry a small blessing
   from them for that run, like a chapel's candle stands in the dungeon.
2. **The wall of skulls.** The bestiary is a wall of skull niches, like the ossuary's. Each kind of foe put to rest
   leaves a skull; looking at one reads its weaknesses and resistances. A skull that still watches is a foe not yet
   understood.
3. **The scrying pool.** A pool of still water that answers to the spell cast into it, once per run and for Arcane
   Dust: Frost freezes an image of the next floor's map, Storm shows where its secret room hides, Ember shows its
   boss.
4. **The practice crypt.** Shades that fight back, for trying every known spell and its reactions before a run.
   Casts there count towards knowing a spell well (M3.7).
5. **The bell that calls the boat.** With the circle cast, the mage rings the Vigil's bell, and the Ferryman's boat
   comes out of the dark water: the way down as a small rite.
6. **Obols on the eyes.** An obol laid on a townsperson's eyes deepens their bond: a new memory, a second gift. This
   is the dungeon's own burial custom, and the reason obols matter beyond one run. Open question: where the Vigil's
   obols come from (for example the obols still carried when a run ends: all of them after a win, a tenth after a
   death).

## Floors and rooms

Rooms are built from cells of 13 × 7 tiles. A standard room is one cell, with a door in the middle of any wall that has a neighbour; larger rooms combine cells and have a door slot on every cell edge. Floors are generated from hand-built room templates.

**Room anatomy.** Walls are 1 tile thick; the north wall is tall and carries two torches, the south wall is low so the player stays visible. Doors have iron gates that rise when enemies are present. Rocks block walking and bolts; flying enemies ignore them.

**Architecture (M3.6).** Rooms are places, not boxes. A template can carve its outline: `x` inside the shape turns tiles into wall, for cut corners, a stepped apse, bays, a pinched waist between the cells of a hall, or a partition or pier standing free. A wall is tall only where it runs unbroken to the room's north edge (the north wall, the side walls, a spur coming down from the north); anywhere the floor lies north of it, it is low, so it never hides the mage, and low walls carved inside the room carry a cap of dark stone. The tall walls facing into the room are dressed by the floor's look: pilasters at intervals and niches between them, holding a skull, candle stubs, a small urn or a few bones. Doors move along their cell edge half the time (per floor, `doorShift`), two or four tiles along a north or south edge and two along an east or west one, where both rooms' templates leave the lane clear; shops, vaults, libraries, shrines and secret cells keep theirs in the middle.

**Objects and piles (M3.6).** Beside rocks, pillars, tombs and urns, templates place the dungeon's remains and furnishings, each answering to magic. Tall ones block walking and bolts; low ones block walking while bolts fly over them, unless a bolt breaks them; soft ones are walked into.

| Object | Blocks | What magic does |
| --- | --- | --- |
| Bone pile | Low | A bolt scatters it; now and then something is left (the poorer `remains` loot: mostly nothing, an obol, a glyph stone, a mana vial, rarely half a heart) |
| Skull heap | Low | Two bolts; `remains` loot |
| Grave sacks | Low | A bolt spills one to three small things (`bundle` loot); fire burns them |
| Oil cask | Tall | A bolt breaks it and its oil spills over the tiles round it, a pool that fire lights |
| Rubble | Low | Only a glyph's blast clears it |
| Grave roots | Tall | Fire burns them away in a few seconds |
| Thorn briar | Soft | Stings the mage (half a heart) and walking foes; fire or a blast clears it |
| Cobwebs | Soft | Slow the mage and walking foes; burn in a flash |
| Glowcaps | Low | Give soft light; a bolt bursts them into a cloud of spores that flashes when fire finds it, burning every foe in reach, and the mage too if they stand in it |
| Pews | Low | Side by side they make one bench; cover for movement, not for bolts |

Fire spreads between what burns, and lights oil; anything that burns or blasts (Burn, the lance, the seal, a glyph, burning oil) reaches them.

**Mechanisms (M3.6).** Some furnishings answer to magic with more than breaking: they turn a spell or a bolt into something the room does. They hear what everything else hears: fire, frost or shock landing near them (a spell, a status on a foe beside them, a glyph's blast), and the mage's bolts.

| Mechanism | Blocks | What magic does |
| --- | --- | --- |
| Brazier | Low | Fire lights it; a bolt flying through a lit brazier's flame catches fire and burns what it strikes |
| Candle stand | Low | Fire lights it; with every stand still standing lit, the room's reliquary opens, a dark room's dark lifts, and in a chapel nave the next six casts are blessed (harder, in gold). A blast knocks a stand over in burning wax; with every stand knocked over, the reliquary breaks open, but the dark and the blessing stay away |
| Bell | Tall | A bolt or a blast rings it: every foe in the room reels for a moment (bosses shrug it off); it must settle before it rings again |
| Rune stone | Tall | The first status that reaches it (a bolt carrying one, fire, frost or shock landing near) charges it with that school; charged, it pulses that status on the foes round it while the fight lasts |
| Lodestone | Tall | Shock reaching it leaps to every other lodestone near enough, hurting and shocking what stands between, the mage too |
| Hanging censer | None (hangs overhead) | A bolt through its chain brings it down on what is under it, and its oil spills burning |
| Reliquary | Tall | Sealed until the room's candle stands are all lit (or all knocked over); then it opens and gives a chest's hoard |
| Dead tree | Tall | Burns, like grave roots, but longer; a burning bolt (from a brazier) sets it alight, as it does roots |

**From the Eda lore (M4.2, adopted 2026-09-30).** Six more pieces that answer to magic:

| Piece | Blocks | What magic does |
| --- | --- | --- |
| Watching statue | Tall | A hooded Warden's statue whose gaze follows the mage; standing in its gaze charges it, and full, it strikes a ray at where the mage stands. Umbral (a hex) blinds it for a while; a pillar between breaks its gaze |
| Sapping obelisk | Tall | Its field saps the mage within it: the cantrip weakens and mana drains. Each obelisk's ward answers to one school, as a rune stone does; break its ward with that school and its field goes out |
| Drinking ward | None (a door's or a boss's shield) | Drinks every spell thrown at it, filling; full, it breaks and releases an elemental of the school it drank most (a vault door's ward, a boss's shield): the mage chooses the fight by what they cast |
| Rope bridge | Walked on | Carries the mage and foes over a chasm; fire burns it through, and what stands on it falls |
| Current | Walked through | Flowing water that carries the mage, foes, bolts and pickups along; frost stops it (it freezes), and shock runs down it. A waterfall down a wall feeds it |
| Candle stand in water | Low | Stands in water and lights as any candle stand does; lit, it lights the water round it (the flooded hall of the owner's image), and shock through the water knocks it out |

As built (M4.2 steps 2 to 4; `docs/M4.2-plan.md`): a watching statue charges while the mage is in its sight during a fight
(7.5 tiles), marks the spot and strikes it with a ray; a hex blinds it for 7 seconds. A sapping obelisk's field (2.8 tiles)
halves the cantrip and drains 5 mana a second until its ward's school lands on it. A vault's drinking ward drinks the
spells cast within 4 tiles of it (60 of harm); full, it bursts and the vault's warden is a Wardling (one for each school)
of the school it drank most; a foe's ward (the Twin Guardians' shield) drinks the spells that strike it and keeps statuses
off, and breaks into a Wardling. A rope bridge burns through in four seconds; a foe on it falls, and the mage takes a
heart's fall and climbs out beside the chasm. A current carries the mage at 1.7 tiles a second (bolts, shots and pickups
too) and stops when frozen; its waterfall pours from the wall upstream. Candle stands in water are lit and knocked out as
the table says. The dev menu's rooms show each piece.

**Themed rooms (M3.6).** Twelve kinds of place. About two fights in five (per floor, `themeChance`) take place in a themed room: a kind of place in the dungeon, dressed its own way (torch light, floor stains, what the niches hold, scatter on the floor, how its rocks and tombs look) and with one twist to learn. The mage learns its name on first entering. Each floor draws on some of them (weights in `data/floors.json`).

| Theme | Floors | What is in it | Its twist |
| --- | --- | --- | --- |
| Chapel nave | 1, 2 | Rows of pews, an altar, candle stands, candles in the niches and on the floor | Light every candle stand and the next six casts are blessed |
| Ossuary | 1, 3 | Bone piles, skull heaps, niches full of skulls | If the fight drags on, piles rise as rotlings, one every few seconds; the skulls' eyes glow in the colour of the last spell cast |
| Scriptorium | 1 | Desks, scroll heaps, loose pages | A scroll heap sometimes hides a torn grimoire page |
| Pilgrims' rest | 1, 2 | Bedrolls, grave sacks, a cold fire | Its foes sleep until hurt, or until the mage comes close |
| Flooded cistern | 2 | Water between stepping stones and pillars | Frost makes paths; Shock runs through it all |
| Fungal grotto | 2 | Stalagmites, glowcaps, moss, cobwebs | Glowcap spores that flash in fire |
| Collapsed crypt | 2, 3 | Rubble, roots, a shaft of daylight | A glyph's blast brings stones down round it a moment later, shadows first, hurting what they land on and leaving rubble |
| Embalmers' hall | 3 | Slabs with shrouded dead, oil casks, oil | One spark and the room burns |
| Bell chamber | 1, 3 | A bronze bell (two in the long hall), bell ropes hanging from the dark, hand bells in the niches, pillars | Ring the bell and every foe reels |
| Frozen mausoleum | 2 | Tombs, rune stones that hold frost, frozen water, rime on the floor, pale stone | Its dead wait in ice until struck or thawed by fire; its stones chill foes near them; the rime lets the mage slide |
| Reliquary gallery | 1, 2 | Candle stands round a sealed reliquary, bays in its walls | Light every candle stand and the reliquary opens |
| Cloister garth | 2, 3 | A dead tree, briars, roots and braziers, and daylight through the open roof | Braziers set bolts alight; the tree and the briars burn |
| Gilded treasury (M4.1) | 4 | Gilded walls, heaps of offerings, spilled obols, candle stands round a sealed reliquary | Its foes stand as statues among the gold until the mage takes an obol there; a glyph's blast spills a heap's obols |
| Ferry landing (M4.1) | 5 | A river between boards, moored boats that burn, lamps on poles | While the fight lasts the drowned climb out of the river, until it is frozen |

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

**A run is three floors (M1), five from M4.1** (the Gilded Reliquary and the Ferryman's Shore below the Scriptorium; `docs/M4.1-plan.md`). Each floor is generated fresh, so no two runs share a map:

- **Map:** start in the centre of a 9 × 8 grid and grow outwards by random walk until the floor has its room count, rolled per floor: 8 to 12 rooms on floor 1, 10 to 14 on floor 2, 12 to 16 on floor 3. From M2 each floor gets one more (9 to 13, 11 to 15, 13 to 17), since the merchant, and the shrine on floor 2, each take a dead end that would otherwise hold a fight. From M3 the library takes one more on every floor (10 to 14, 13 to 17, 14 to 18: floor 2 gets two, so its vault and altar still find dead ends beside the shrine).
- **Special rooms** go into dead ends (rooms with one neighbour): the farthest from the start is the boss room, then treasure, ordeal and (from M2) the merchant; optional rooms (bone altar, and from M2 the locked vault) need a spare dead end. Each floor rolls the optional rooms it wants first (chances per floor in `data/floors.json`); if the walk leaves too few dead ends for the required and wanted rooms, it tries again, and after a while makes do with fewer. The boss room never touches the start room.
- **Secret room (M2):** one per floor, in an empty cell with hidden doorways into two or more rooms (the cell that could open into the most rooms wins). It never opens into the boss room (no way round the fight), a locked vault (no way round its ward) or the merchant (whose warded shop won't let a glyph be chalked). It comes on top of the floor's room count, and the other rooms keep their distances from the start as if it weren't there.
- **Shapes:** while growing the map, the walk sometimes places a larger shape when the cells it needs are free.
- **Difficulty:** floor 1 is easy, and each later floor raises the baseline a little (harder templates, about 15% more enemy health per floor). Within a floor, rooms vary randomly around the baseline rather than rising steadily, and variants push single rooms clearly above or below it; deeper floors roll more hard variants. The rooms next to the start on floor 1 are never hard variants. All numbers are found by play-testing.
- **Between floors:** the boss opens a trapdoor; stepping in starts the next floor (waystones join in M6). Beating the last floor's boss wins the run (floor 3's until M4.1, floor 5's since). Each floor draws its boss from a pool in `data/floors.json`, never one the run has already met, and scales it (health, speed, shot speed, summons, volleys). Every boss is built in code since 2026-10-01 (the Drowned Abbess and the Pyre Knight were the last placeholder shapes): the Hollow Warden on floor 1, the Drowned Abbess and the Pyre Knight on floors 2 and 3 in either order, with the War-Tiger and the Twin Guardians joining floor 3's pool (M4.2).
- **Seeds:** every run has a seed, shown in the pause menu, so a run can be replayed and bugs reproduced.
- **End of a run:** won or lost, the end screen sums up the run: the deepest floor, the time, foes put to rest, obols found, every artifact carried (cursed ones ringed in red, cleansed ones in pale gold) and the seed, with a button to replay the same seed.
- **Floor looks:** each floor already looks a little different, as placeholders until the biome pass (M8): floor 1 has warm stone and iron torches, floor 2 cool damp stone with moss, puddles and cage lanterns, floor 3 scorched brick with soot, ash and braziers; from M4.1 floor 4 (the Gilded Reliquary) pale limestone and marble, gold and candle wax in white-gold light, and floor 5 (the Ferryman's Shore) black slate, wet stone, tarred boards and salt under pale teal and violet spirit fire. Colours and torch styles live in `data/floors.json`.
- **The bosses of floors 4 and 5 (M4.1, built in code):** the Hallowed Hart (Hallow; a great white stag with candles in its antlers: it charges along a lane lit on the floor and stuns itself on the wall, turns firing spokes of light, rears and stamps a ring of motes, and calls its fawns below half health) and the Deep Angler (Umbral; a great round anglerfish afloat in the mist: its lure draws the mage in towards its jaws until it bites, unless struck hard enough meanwhile, it spits volleys of shadow that hex and breathes rings of dark motes, and calls the floor's flyers below half health). Both have a weakness and a resistance: the Hart fears Umbral and shrugs off Hallow, the Angler the other way round.

**Room templates are data:** a character grid in the size of the room's shape (rock, pit, pillar, stone tomb, enemy spawn, empty; urns and rune-sealed urns from M2) plus a difficulty value and the room types it suits, stored as JSON so new rooms need no code. Pillars and tombs block walking and bolts like rocks but never break; tomb tiles side by side make one longer tomb. Larger halls are furnished with them so they don't feel empty. Ordeal templates list two or three waves. M1 needs at least two templates per shape and 50 or more in total.

## Pickups and room types

Pickups feed the three resources of a run (health, mana, gold) plus reagents for alchemy. New room types give the magic systems a place on the map. More pickup families, each a magic take on something Isaac has (scrolls for cards, talismans for trinkets, soul motes, coloured chalk, shades and others), are brainstormed in `docs/ideas.md` for later milestones.

| Pickup | Effect | Arrives |
| --- | --- | --- |
| Heart (half, full) | Heals; ignored at full health | 0.3 |
| Obol (coin; single, or a purse of 5) | Spent at the merchant, shrine and library | M2 |
| Bone key | Opens locked vaults and reliquary chests | M2 |
| Glyph stone | One more blast glyph to chalk: its blast breaks rocks, urns and cracked walls and opens secret rooms | M2 |
| Mana vial | +25 mana | M3 |
| Soul mote (pale, black, hallowed) | Kept beside the hearts: takes a hit before them, can't be healed back; a black one hexes the room as it goes, a hallowed one goes last and mends half a heart at every floor's end; a spell short of mana burns one for the rest. More on the deep floors | M4.1 |
| Lodestone shard | Ends every spell's cooldown and gives 25 mana | M4.1 |
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

**Economy target:** about 12 to 18 obols per floor, so a merchant artifact means saving or skipping hearts. From M2, a room clear drops one pickup about half the time: a heart, obols, a bone key or a glyph stone, now and then a coffer or a reliquary chest. Obols are drawn to the living: from close by they drift to the mage.

**Blast glyphs**

- Chalked at the mage's feet (Space, or LT on a gamepad). The rune turns and flickers faster as its 1.5 s fuse burns down, ticking as it goes, and a faint ring shows how far the blast will reach.
- It flares when the fuse runs out, or at once when one of the mage's own bolts crosses it (a bolt leaving the mage doesn't set off the glyph at their feet). So the focus shapes how glyphs are used: bouncing bolts set them off round corners, the crook's bolt on its way back, twin bolts two at a time.
- The blast (1.5 tiles) deals 10 damage to every foe in reach (bosses too), knocks them back, breaks rocks (not pillars or tombs), urns and cracked walls, snuffs out enemy shots and sets off other glyphs in reach, so glyphs chain. A mage caught in it loses a full heart.
- It burns in the colour of the mage's bolts, so artifacts that change the bolts show in the glyphs too. Idea for M3: a glyph takes the school of the mage's focus, so an Ember glyph leaves burning ground and a Frost glyph chills.

**The Wandering Merchant of Belerial** (M4.2, adopted 2026-09-30). A second trader, rare: once a run the merchant rides into an
ordinary room after its fight, an old man with a white beard, a turban and a staff on a huge shaggy pack beast, a crow on
its head. The wares are in the beast's packs: things the Bound Shade doesn't sell (a foreign focus, soul motes, reagents
from M5). The crow sells what it has seen: the floor's map, or where the secret room is. The merchant is gone when the mage leaves the
room. As built (M4.2 step 5): from the second floor on, an ordinary room's cleared fight calls the merchant one time in seven,
once a run; the merchant rides in through the door furthest from the mage and lays out a focus the run hasn't met (18 obols),
a hallowed or black soul mote (7), the crow's map (5) and, while there is one to find, the secret room (8).

**The merchant** (1 per floor, in a dead end). A hooded trader (placeholder): a bound shade who deals in the obols of the dead, with 3 or 4 items per visit; the first is an artifact while the floor's budget allows. His wares float in ward circles that paying breaks: walking into one buys it, or he refuses (too few obols, a heart at full health). His shop is warded: bolts fizzle there and a glyph's chalk won't take, so there is no fighting or robbing him.

| Item | Price | Arrives |
| --- | --- | --- |
| Artifact (merchant pool) | 15 | M2 |
| Heart | 3 | M2 |
| Key or glyph | 5 | M2 |
| Mana vial | 3 | M3 |
| Unknown potion / reagent | 4 / 2 | M5 |
| Rune | 10 | M6 |

**Secret room** (1 per floor). Entered through a cracked wall that a glyph's blast breaks open, on both sides at once. The hints are a hairline crack and dust drifting from it, and the cantrip divines them: a bolt striking a cracked wall rings hollow, with a chime and a puff of dust, and the crack keeps a faint pale-blue glow. Inside is a forgotten mage's cell in pale blue light: a faded circle of runes on the floor, loose pages, a stone bed. Half the time (per floor, in `data/floors.json`) it holds an artifact from the secret pool, where cursed artifacts are common, outside the floor's budget; otherwise a hoard of obols, keys and glyph stones with two coffers and a reliquary chest (`data/loot.json`). It isn't shown on the minimap until found.

**Locked vault** (0 or 1 per floor, in a dead end). Its door is sealed by a ward that one bone key unbinds; bolts glance off it. Two glyph blasts can force the ward too (the first cracks it), but forcing it wakes the vault's warden: a champion rises inside to guard the prize, which can't be taken until it falls. Behind the door, inside is an artifact while the floor's budget allows, otherwise a hoard of obols and glyphs around a reliquary chest.

**Containers.** A broken urn lets out a puff of grave dust, and the soul inside rises as whatever it held. A reliquary chest is sealed by a ward: a bone key unbinds it cleanly, and a glyph's blast breaks it too but burns half of what's inside, so the player chooses between a key and a glyph. Now and then (10% of chests, in `data/loot.json`) a reliquary is gilded: gold bands and a golden ward that no blast breaks. A bone key unbinds it, and a relic rises out of it: an artifact from the vault's pool that doesn't count against the floor's budget. It is the one container that holds an artifact, and it is rare: about one floor in fifteen.

| Container | Opened by | Holds | Found |
| --- | --- | --- | --- |
| Urn | Bolts or blasts | Usually nothing; sometimes an obol, half a heart or a glyph stone | Room templates |
| Rune-sealed urn | Only a glyph's blast (bolts glance off) | Always something better: obols, a purse, a bone key or a heart (never a glyph stone, since it costs one) | Room templates |
| Coffer | Walking into it | 1 to 3 obols, keys, glyphs or hearts | Room clears, secret rooms |
| Reliquary chest | A bone key, or a blast that burns half of it | Better loot: purses, several keys or glyphs, a full heart | Room clears, secret rooms, vaults |
| Gilded reliquary (rare chest) | Only a bone key | A relic: an artifact outside the floor's budget | Wherever a reliquary chest turns up |

**Shrine cleansing** (the shrine on floor 2, in a dead end of its own; which floors have one is in `data/floors.json`). For 10 obols (`data/loot.json`), the shrine cleanses one cursed artifact: the drawback goes and the gift is halved (see Artifacts). The room is lit warm white, with a circle of pale runes in the middle of the floor. The mage chooses which curse: each cursed artifact held gets an offering stone, the artifact floating above it; with too few obols, walking into a stone is refused. The curse fights back: walking into its stone draws it out as a wisp that flits about the room, lingering in the circle now and then, and spits at the mage. Bolts pass through it outside the circle and strike it inside (a glyph's blast there strikes twice); four strikes within 10 s put it down, while the motes of light around the circle go out one by one and the curse's strength shows on the boss bar. Then the artifact is cleansed (its red ring in the HUD and on the end screen turns pale), the obols are paid and the stone crumbles. If time runs out, or the mage leaves the room, the wisp flees back into its stone, and the mage can try again. The heart-for-boon bargain joins in M6.

**Artifacts that bend the economy** (joined the pools in step 6 of M2; placeholder names). Each shows in the magic, not only in the numbers.

| Artifact | Effect | How it shows | Pools |
| --- | --- | --- | --- |
| Sexton's Keyring | +3 keys; the locked vault opens for free once per floor | The keyring turns in the ward, in a flurry of bone dust | treasure, drop, merchant |
| Miser's Purse | +0.5 cantrip damage for every 10 obols held | The bolts turn gold, a fifth of the way for every 10 obols, and gold glints off each cast | treasure, merchant, vault |
| Glyphwright's Chalk | +5 glyphs; blasts are 50% wider | The glyph's reach ring is drawn wider | treasure, drop, secret |
| Ferryman's Obol | Every fight won also drops an obol | It falls between the mage and the middle of the room, with a pale glint and a chime | merchant, secret |
| Warding Band | Your glyphs don't hurt you, and their fuse burns 1 s | A ward rings the mage's feet as they chalk, and again as it turns their own blast aside | merchant, vault |
| Grave Lantern | Cracked walls glow when you enter a room, and secret rooms show on the minimap before they're found | The walls ring hollow from anywhere in the room; the cell shows as a faint eye on the map | treasure, merchant, secret |
| Pedlar's Scale | Merchant prices −30% (rounded, at least 1) | The price tags show the lower price, in pale green | vault, secret |

**Ideas for later** (not scheduled; more in `docs/ideas.md`): an alms box in chapel rooms where donated coins buy small blessings; sarcophagi that hold loot, or a Rotling; a bone-caster who throws the dice of the dead for coins.

## Art, camera and audio

The look is a candle-lit cutaway diorama in pixel-art 3D: dark stone rooms, warm torchlight and chibi characters, everything drawn at one pixel size (the room kit's texel) and blown up, with outlines.

- **Camera:** orthographic, tilted 45° from horizontal, fixed per room; it pans between rooms in 0.42 s. Only the current room is drawn.
- **Scale:** 1 tile = 1 unit. The hero is 1.3 units tall; enemies 0.4 to 1.2 (the critters built in code mostly under 0.9); bosses about 2.
- **Light:** a dim fill, a cold moonlight from above, two flickering torch lights per room, and a warm lantern following the hero. Characters get a faint self-light from their colour texture so they stay readable.
- **Palette:** worn stone browns, torch amber for the hero's magic, verdigris greens for the undead, violet for wisp magic, rust red for the boss.
- **Characters:** the mage is a Tripo3D model (chibi proportions, textured, rigged; see the Tripo asset checklist); Tripo stays for special models like it (bosses, where wanted). Enemies and familiars are built in code (Combat and enemies).
- **Environment:** built in code in the pixel look (the owner's decision 2026-09-30: no Tripo props): objects, mechanisms, walls and floors, the floors and walls with pixel-art textures drawn in code at the game's own pixel size. The room kit is redone in the style of the spell effects (`docs/M3.5-plan.md`, step 3): the fire objects, every floor's floors and walls in three kinds each, the mechanisms, objects and piles, doors, gates, niches and pilasters, and the artifacts with their icons rendered from them; the owner's review is next.
- **How assets are made:** everything is built in code in the pixel look, in the style of the spell effects (`docs/effects.md`); `docs/assets.md` holds the pipeline, house style and budgets for the special models that still come from Tripo (the mage, bosses where wanted). Milestone M3.5 (`docs/M3.5-plan.md`) is the look: the pixel look, and the room kit redone in code.
- **UI:** hearts top left, mana bar, spell slots with cooldowns, potion belt, artifacts and obol, key and glyph counters below them, minimap top right, boss bar bottom centre, lore cards bottom right. Typefaces Cinzel (titles), Alegreya (lore and banners) and Alegreya Sans (UI).
- **Audio:** simple synthesised effects for now; the full plan is in Audio design, and where sounds come from (sources, licences, specs, pipeline) is in `docs/assets.md` (Sound).

**The pixel look (decided 2026-09-30, M3.5 step 2).** The owner was drawn to a cartoony or pixel-art style and chose pixel-art 3D over cartoon 3D at full resolution, after comparing them in the game. The models and the game's lights are drawn at 1080 lines at most and blown up in whole pixels, with outlines from depth; light in bands stays off. It started at 270 (4 × 4 at 1080p, the mage about 32 pixels), then 360; in the play-tests of 2026-09-30 neither let the mage and small things read in a full-screen window on a high-resolution monitor, and 540 was the first that did (a 960 × 540 grid, the mage about 64 pixels tall). After playing the room kit's proof the owner set 1080 as the default (2026-09-30): 720 rows on a 1440p screen, 1080 on a 4K one. The rows are at most: each game pixel is a whole number of screen pixels, rounded up, so a smaller window keeps the look at fewer rows rather than turning sharp. The dev menu offers the rows that fall on whole pixels on the owner's screens (a full-screen browser):

| Choice | 1080p | 1440p (2K) | 2160p (4K) |
| --- | --- | --- | --- |
| 1080 (the default) | 1080 (sharp, no pixel look) | 720 | 1080 |
| 720 | 540 | 720 | 720 |
| 540 | 540 | 480 | 540 |
| 360 | 360 | 360 | 360 |
| 270 | 270 | 240 | 270 |

At 180 small objects stop reading, so it is no longer offered. Tiles, icons and effects are drawn as pixel art; concept art for Tripo stays clean cartoon. The game starts in it; the dev menu and `?pixel=` still switch it (`src/render/pixelLook.ts`). It replaces the painted-miniature direction, and the house style in `docs/assets.md` follows it.

**One pixel for everything (the owner, 2026-10-01).** At 1080 lines on a 1080p screen a game pixel is a screen pixel, so from the room kit's proof on only what was drawn texel by texel (the floors and walls) looked like pixel art: the mage, foes, artifacts, costumes, transformations and spells were drawn at full resolution, and the mage's painted texture read as a smooth render on a pixel-art floor. The owner asked for everything in the one pixel-art look. Since then:

- **The game starts at the texel.** A game pixel is one of the room kit's texels (a 48th of a unit across, a floor texel's height down the screen), so everything is drawn at the floors' and walls' pixel size and they land on the grid texel for texel: about 420 rows in a one-cell room whatever the window, about 2.6 screen pixels a game pixel at 1080p and 2 in a great hall. That doesn't fall on whole screen pixels, so the blow-up is a sharp one (each pixel the same size, its edges blended over one screen pixel), and the camera glides between pixels while the room stays on its texels. The rows of earlier (1080 to 270) stay in the dev menu.
- **The mage in pixel art.** The Tripo model stays (the owner's choice), its texture (a thousand small islands of fine strokes, which broke into speckle and mush some 45 pixels tall) baked into its vertices and cut down to 20 colours, its light in four flat bands, as pixel art keeps them. The dev menu's Look tab shows it as made, to compare.
- **Glows and shadows in steps.** Every glow (artifacts, torches, spells, motes) and the shadows under things fade in a few flat rings, as pixel art draws them.
- **Icons in pixel art.** An artifact's icon is pixel art at about its size in the room (24 pixels), hard-edged and outlined, shown in whole steps.
- **The rule from here:** anything new is drawn in the game at the texel, so it is pixel art by being there; its glows use the stepped glow, its icon is made the same way. The HUD's text and drawn icons stay sharp.

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

**Floor biomes and their soundscapes** (proposal; the biomes themselves are a new idea and need Eda lore). Floors 4 and 5 exist since M4.1 (the Gilded Reliquary and the Ferryman's Shore), with placeholder sounds; the table's floors 4 and 5 are still ideas for their biomes.

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

Reactions (steam, shatter, overload, eclipse, blackfire; M4.8's searing, prism, verdict, black ice and void spark) each get their own signature sound, louder than a normal hit, so a combo feels like a reward.

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

**As built in M3:** the synthesised placeholders run through two buses, effects and interface, under a master, each
with a slider in the pause menu (remembered in the browser; music and ambience sliders come with M8). Effects that
happen somewhere in the room are panned left or right of the mage and a little quieter further away (plain stereo;
HRTF, reverb and the headphones or speakers setting stay for M8).

**Technical notes:** Web Audio API through three.js positional audio for effects; ambience and music streamed rather than loaded up front; short effects packed into a few files to cut download size; audio unlocked on the first tap or key press, as browsers require. Files ship as Ogg Vorbis, each synthesised sound staying as the fallback; sources, licences, budgets and the pipeline are in `docs/assets.md` (Sound).

## Asset list

A full five-floor game needs roughly 85 3D models, about 300 sound files, 5 music pieces with stems, and about 80 icons. Counts are estimates for the scope in this document; each milestone only needs its own slice.

**Current scope: three floors.** The counts below assume five. With three, the rows that scale with floors (floor music, ambience beds and one-shots, bosses, biome props, footstep surfaces) shrink to about three fifths.

**Audio**

| Category | Contents | Files (approx.) |
| --- | --- | --- |
| Music | 5 floor pieces × 3 to 4 stems, 3 boss themes, title, the Vigil, death | 25 to 30 |
| Stingers | Room clear, level up, artifact, curse, secret, death, victory | 10 |
| Ambience beds | 1 loop per floor biome + library, shrine, alchemy, the Vigil | 9 |
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
| The Vigil's pieces (crypt dressing, the Great Circle, candle wall, the Ferryman's boat) | About 8 | Static |
| Townspeople (the freed shades) | 6 to 8 | Idle, a talking gesture |

**Visual effects** (code and particles, no Tripo): cantrip bolts per focus, 15 spell effects, 5 status visuals, 5 reaction bursts, potion splashes, level-up glow, portal and waystone.

**2D and interface:** icons for about 15 spells, 25 artifacts, 12 potions (plus unknown bottles), 6 reagents, 6 runes and 12 boons; floor and wall textures per biome (procedural now, painted later); fonts already chosen.

**Sourcing options (to decide)**

| Asset | Options |
| --- | --- |
| 3D | Tripo3D (Master plan), from concepts made in MidJourney, Tripo's own image models or others (`docs/assets.md`) |
| Floor and wall textures | MidJourney seamless tiles (`--tile`) in the house style, over the procedural details |
| Sound effects | Royalty-free libraries, AI sound effect generators, own recordings (foley is easy: glass, water, paper, fire) |
| Music | AI music generators, royalty-free libraries, a commissioned composer later |
| Icons | Rendered from the artifacts' models built in code (M3.5, 2026-09-30); a painted icon (MidJourney) for a special model |

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
public/assets/     hero_default.glb, enemies/, bosses/, props/, artifacts/ (GLB), textures/, icons/, audio/
tools/             prepare-asset script
```

**Proven techniques to carry over:** layered hero animation (legs vs upper body), automatic clip recognition by name, the cast release window found from hand motion, hip-offset re-centring, miniature-base removal for static models, drag-and-drop model swapping for quick Tripo tests.

## Depth for what's built (proposed 2026-10-01; M4.7 approved the same day)

After M4.5 the owner asked for a review of the recent work, for open ends in its mechanics and balance, and for ideas
that add depth to what is already in the game. The fixes are in Combat and enemies (The review of 2026-10-01). What is
left open, and the milestones that deepen the systems already built rather than adding new ones, follow. The owner
approved M4.7 on 2026-10-01 and it was built the same day (M4.7 as built, below), then asked for M4.8 to M4.10 to follow
(2026-10-01); M4.8, M4.9 and M4.10 are built (The full wheel as built, in Magic system; M4.9 and M4.10 as built, below).

**The open ends, and the owner's answers (2026-10-01).** The review measured six; the owner answered each.

- **Floor 3 feeds on fire.** Weighted by the floor's rolls, about half of floor 3's foes resist Ember and a quarter drink
  it (the elementals), so three in four shrug off a mage built on Ember. *The owner: it may be hard; change it only if it
  proves nearly impossible.* Left as it is; M4.9's balance bot and the play-test measure it.
- **Water foes without Frost.** *The owner: there must be another way.* Built: a glyph's blast, fire boiling the water to
  steam, or a shock through it brings them up (Combat and enemies: Every build brings the water foes up).
- **Hex drain doesn't read.** *The owner: show it, and let every mechanic say what is going on, even cryptically.* Built:
  the chips beside the mana bar and the first-time lines (Player: What is done to the mage shows), and the rule is a
  pillar now (Nothing silent).
- **Hallow and Umbral have few foes weak to them** on floors 1 to 3. *The owner: fine for now; look again if it becomes a
  problem.* M4.7's champion mantles and M4.8's reactions give them work everywhere meanwhile.
- **The Drowned Abbess and the Pyre Knight** were placeholder shapes. *The owner: remake them, and change them later if
  they don't please.* Built in code: a great cave olm and a hollow knight of fire (Combat and enemies, the bosses' table).
- **Steam** (Ember + Frost) was in the table but not built. *The owner: build it, and design more combinations like it.*
  Built (Magic system: Steam as built); the further combinations are M4.10 below.

### M4.7 Living foes: foes you read and outwit

The bestiary gave every foe a counter (a school or a mechanism that changes its fight). This milestone makes the counters
something the mage learns, and makes foes part of the room, not only in it.

- **Champion mantles.** A champion today is bigger, tinted, double health and a little faster. It gains a mantle of one
  school, drawn from the floor's: *Kindled* (it leaves burning ground and can't burn), *Rimebound* (its blows chill, it
  can't be chilled), *Stormcharged* (struck, it sparks at the mage), *Hallowed* (it mends the foes round it), *Hexbound*
  (its shots drain mana, and it hexes the room as it falls). The opposite school strips the mantle ("Unbound!"): the
  mantle goes and the champion is stunned and open for a moment. One rule, five mantles, every foe.
- **Foes in each other's ground.** What the bestiary leaves on the floor works on foes as on the mage: webs and ink slow
  walkers, rime makes them slide, burning ground burns them, sparks shock them, a Puffcap's spores sting them. A foe's
  own ground spares it and its kind. Beasts blunder into it; golems and elementals step round it. The mage can lure a
  pack of wolves across a Magma Ooze's trail.
- **Counters found.** Each foe's counter is a sealed line in its bestiary entry. The first time the mage brings it about
  (a hex grounds a griffin, frost snuffs a djinn, a blast flips a crab), a word rises ("Grounded!", "Snuffed!",
  "Flipped!") and the line opens, kept between runs beside its weakness and resistance (`ossuary.bestiary`). The
  inventory gains a Foes tab: the foes met, the words found, the counters known; M7's bestiary at the Vigil grows from it.
- **Rooms with a pair.** Some foes are better together: a Salt Golem shielding a Basilisk, a Choir Lark singing to the
  wolves, a Moonstag Fawn behind a Gargoyle Whelp, a Cinder Djinn lighting braziers that drive the Gloom Ravens off (a
  pair that works against itself). A floor's rolls name pairs (`pairs` in `data/floors.json`, weighted), and a room that
  rolls one places them together, so a few fights a floor are a small puzzle to read.

**M4.7 as built (2026-10-01, approved and built the same day; `docs/M4.7-plan.md`).**

- *Mantles.* A champion draws its mantle from its floor's weights (`mantles` in `data/floors.json`; tuning in
  `data/magic.json`): its aura and body glow in the school's light, a ring of runes turns under it, and its mantle's name
  rises as it comes; the first time in a run a line says what the mantle does and what unbinds it. Kindled leaves burning
  ground as it goes and can't burn; Rimebound's touch and shots chill, and it can't be chilled; Stormcharged throws a
  spark under the mage when struck (now and then); Hallowed mends the foes within 3 tiles (a boss a little), not while it
  is sanctified; Hexbound's shots drink mana, and as it falls its curse closes on the ground round it, draining the
  mage's mana if they stay inside. What strips each: Frost the Kindled and the Stormcharged (as chill stills the storm
  creatures), Ember the Rimebound, Umbral the Hallowed, Hallow the Hexbound. Unbound, the champion is stunned 1.6 s and
  takes a quarter more for 3 s. A Hexbound champion unbound before it falls doesn't curse.
- *Ground.* Every patch, fire, spark and cloud knows the kind of foe that left it and spares that kind; a foe is also at
  home in ground of its own school (a Frost foe on rime, an Ember one in fire, a Storm one on sparks, an Umbral one in
  webs, ink and spores). Fliers and bosses pass over it. A puff in the ground's colour shows a foe stepping in, and the
  first time in a run a line says foes fall foul of each other's ground. The golems and the elementals look two points
  ahead and go round.
- *Counters.* Thirty-eight foes have one or two (the Storm Mantis is numbed by cold and flanked from behind; the water
  foes are iced in or driven up). The word rises each time, the first time ever a chime and a line; the Foes tab shows
  each foe met by floor, then the bosses, its weakness and resistance once found (an elemental's "Drinks"), and its
  counters found or sealed.
- *Pairs.* Two or three a floor, a fight rolling one one time in ten on floor 1 up to a little more than one in five on floor 5; the pair
  takes the first two places of the first wave, the second beside the first, and its line says what they do together
  the first time in a run.

### M4.8 The full wheel: every pair of schools reacts

**Built 2026-10-01**, as below (numbers in Magic system, The full wheel as built). Five schools make ten pairs; five reacted before it (Shatter, Overload, Eclipse, Blackfire, and Steam since 2026-10-01). This
milestone builds the other five, so any two schools on a foe or a tile do something, and the mage learns them like spells. M5's Verdant
brings three reactions of its own (with Ember, Frost and Storm); its pairs with Hallow and Umbral are left to design with
it, so the wheel is whole again by M5's end.

| Combination | Reaction | What it does |
| --- | --- | --- |
| Ember + Frost | Steam (built 2026-10-01) | A cloud where they meet: foes inside can't aim (their shots go wide), and sight-based foes (the Basilisk's stare, the Radiant Eye, a watching statue) lose the mage inside it. Fire on frozen water makes it too. |
| Ember + Hallow | Searing | Holy fire burns a foe's guard away for a few seconds: the crab's and snail's shells, the eye's lids, the mimic's clay, the Hearth Golem's fire, a War-Tiger plate. One rule, every guarded foe. |
| Frost + Hallow | Prism | The foe, frozen and sanctified, is a prism: the cantrip's bolts that strike it split in three. |
| Storm + Hallow | Verdict | The shock leaps at once to every sanctified foe in the room. |
| Frost + Umbral | Black Ice | Black ice under the foe: foes on it slide and can't stop (into the room's hazards and each other); the mage crosses it at full speed. |
| Storm + Umbral | Void Spark | Each leap of the shock carries a hex stack, and a foe that falls shocked gives the mage mana. |

- **Reactions on tiles.** The same pairs work on the room's tiles: fire on frozen water steams, a shock through burning
  oil overloads, a hex on consecrated ground eclipses what stands in it.
- **The codex.** M3.7's panels list the reactions a spell can set off. A reaction found for the first time is marked in
  the spell book (kept between runs), and the spells tab gains a wheel of the schools whose spokes light as reactions are
  found.

### M4.9 The curve: harder for the right reasons

**Built 2026-10-01** (M4.9 as built, below). Floors 2 to 5 differ from floor 1 mostly by their foes and their health (×1.15 to ×1.6). This milestone makes the descent's
pressure a set of dials, and gives every build a way through.

- **Pressure dials** per floor in `data/floors.json`: foes added to a room, the elite and champion chances, waves in an
  ordeal, and how often a room rolls a pair (M4.7). Floor 5 should feel like the end of a descent, not floor 1 with more
  health. A test holds the dials rising from floor to floor.
- **The floor teaches its counter.** A floor's library and merchant lean to the schools its foes are weak to (floor 1
  Ember and Frost, floor 2 Storm, floor 3 Frost, floor 4 Frost, floor 5 Ember and Hallow), worked out from the rolls. A floor
  whose foes resist or drink the school the mage's spells lean on says so in its banner's line ("The heat here feeds on
  fire").
- **Hex reads.** Built in part on 2026-10-01: a hexing blow that lands flashes the mana bar violet, the loss rises over
  the mage, a chip says how much, and the first time in a run a line says what happened. Still to build: the mana it
  took runs out of the bar in a violet trail to the foe that threw it, and a hexed mage's next Hallow cast gives back
  what the last blow took.
- **The sluice.** A mechanism for water rooms: a bolt or a blast opens it and a pool drains to mud for a while (wading
  still slows, but nothing hides in it). Every build can already bring the water foes up (2026-10-01); the sluice stays
  as a piece for water rooms, a way to win the water itself.
- **A balance bot in the repo.** The bot of M4.5's balance pass becomes `npm run balance` (`tools/balance.ts`): it
  fights each foe alone on its floor, with and without a school's spells, and writes time to kill and hearts lost to
  `docs/balance.md`, flagging any foe past twice its floor's middle. Tuning is measured, not guessed.

**M4.9 as built (2026-10-01).**

- *Pressure dials* (`pressure` per floor in `data/floors.json`; the variants' champion share and M4.7's pair chance were
  already per floor): one more walker or flier in 0% of fights on floor 1, 10%, 18%, 25% and 33% on floor 5 (never the boss,
  a heavy, an elite or a pack, set beside the one it copies); elites weighed ×1, 1.1, 1.2, 1.3, 1.4 (one a room still);
  ordeals one wave more on floors 4 and 5. A unit test holds every dial rising floor by floor.
- *The floor teaches its counter.* A floor's weaknesses are worked out from its rolls (each role alike, each foe by its
  weight): a library's lecterns, and a page a boss or a fight drops, offer first a school at least 30% of its foes are weak
  to (floor 1 Ember or Frost, floor 2 Storm, floors 3 and 4 Frost, floor 5 Ember) while the mage holds no spell of one. A
  floor where 45% or more of the foes resist or drink the one school the mage carries says so as the mage arrives (floor 1
  Storm: "Shell and stone down here turn the storm"; floor 2 Frost; floor 3 Ember: "The heat down here feeds on fire").
  The first time in a run a library leans, a line says one page answers what lives on the floor. The merchant sells no
  pages, so it doesn't lean.
- *Hex reads.* The mana a hexing blow takes (a foe's shot or a boss's) runs from the mage back to the foe that threw it in violet motes, and a Hallow
  spell cast within 8 s gives it back (gold over the mage; the first time in a run, a line).
- *The sluice gate* (`Z` in a template): seven water rooms have one against the north wall, in the floor's own stone
  (`flooded_crypt`, `drowned_pools`, `flooded_hall`, `oil_and_water`, `mill_race`, and the cisterns `cistern_steps` and
  `lodestone_cistern`); the great cistern has none (its north wall is all door lanes), nor the landing's river. A bolt or a
  blast lifts its iron gate under its lintel, water falls through the gap, and the room's water drains to wet brown mud for
  8 s ("Drained" rises over it): wading still slows, and every water foe in it is driven up and kept up. Then the gate drops
  and the water comes back; it rests 3 s before it lifts again. Torches and the wall's niches keep clear of it. In the rooms
  without one, the blast, steam and a shock still bring a water foe up.
- *The balance bot* (`npm run balance`, against a running server; `-- floor=3 foe=hydra school=frost seeds=1`): every
  foe alone, two seeds, the cantrip and each school's two spells. Its first run (`docs/balance.md`): most foes fall in
  1 to 3 s to a build with spells; the elites (the Phoenix, the Hearth and Glacier Golems, the Griffin) take 5 to 18 s; the
  bot never brings up a water foe without a spell that finds it (it chalks no glyphs), and a cantrip alone struggles to
  line up on the circling Phoenix. Nothing was retuned from it yet: the owner's play-test decides (floor 3 may be hard).
- *Whole runs* (`npm run balance -- runs`, 2026-10-01; `docs/balance-runs.md`): every fight room of each floor, three
  seeds, each build, cleared room by room (90 s a room). It found wasp nests set in the wall behind a pillar (out of reach
  of a straight bolt, letting wasps out for ever) and two nests stacked in one narrow shaft; a nest now sits where the room
  is open in front of it, away from another, and counts as a pack (one a room). Floor 3 then fell from 5.4 to 4.5 hearts a
  room and every room cleared. Still standing out, for the owner's play-test: floor 3 costs the bot more hearts than floor
  4 (4.5 against 3.0 a room, mostly burning ground it doesn't step out of); on floor 5 the Frost Jackalope (it bounds away
  from a mage who comes near; only burning ground pins it) and the Void Mote (it swallows the cantrip) are often left
  standing by builds without their counter.

### M4.10 Weaves: spells meet spells, reactions meet a third school

**Built 2026-10-01** (M4.10 as built, below). The owner asked for more combinations like Steam (2026-10-01). M4.8 makes every pair of schools react on a foe or a tile.
This milestone goes a step further in two ways, and designs the last two pairs of the six-school wheel for M5. Every
weave and chain has its name rise when it happens and is marked in the spell book once found (Nothing silent).

**Weaves: what one spell leaves in the room, struck by another.** The lasting spells (the ice wall, the seal and its
ground, holy ground, the motes, the mantle, a toll's mark) each answer to the spells that strike them.

| Spells | Weave | What it does |
| --- | --- | --- |
| Glacial Wall + Cinder Lance | Steam Curtain | The lance melts the wall into a curtain of steam for the wall's time left: shots through it go wide, and eyes can't see through it. |
| Glacial Wall + Arc | Conductor | The chain runs along the wall: every foe touching it is shocked, and the wall bursts outward in shards that chill. |
| Pyre Seal + Arc | Overload Seal | The seal bursts at once: an Overload over its whole circle, throwing every foe out of it. |
| Pyre Seal + Hex Bolt | Black Pyre | The seal's burning ground burns black for its time left: what burns in it burns with Blackfire. |
| Consecrate + Grasp of the Grave | Eclipse Ground | Hands that rise in holy ground pull each foe they hold under a black sun (an Eclipse each). |
| Consecrate + Rime Shards | Hallowed Hail | Shards fired across holy ground come out of it sanctifying what they strike. |
| Wardlight + Cinder Lance | Lantern Fan | The lance passing through a mote splits off a thinner beam through each of them. |
| Static Mantle + water | Live Wade | While the mantle holds, water the mage wades in shocks the foes in it once a second (the mage spared). |
| Judgement + Glacial Wall | Refraction | The pillar of light striking the wall breaks into rays along its length. |
| Ferryman's Toll + Arc | Toll Chain | The chain carries the toll's mark to each foe it leaps to. |

**Chains: what a reaction leaves, met by a third school.**

| Left by | Meets | Chain | What it does |
| --- | --- | --- | --- |
| A steam cloud | Storm | Thundercloud | The cloud is charged: it shocks every foe inside once a second for its time left. |
| A steam cloud | Hallow | Incense | The cloud sanctifies the foes inside, and mends half a heart of the mage once if it stands in it. |
| A steam cloud | Umbral | Miasma | A black fog: foes inside take a hex stack a second and lose the mage, as in steam. |
| Black Ice (M4.8) | Ember | Black Melt | It melts into a black pool that burns with Blackfire, as oil burns. |
| An Overload's blast | Frost | Hailburst | The blast throws ice shards that chill. |
| Shatter's shards | Ember | Molten Glass | Shards caught by fire lie glowing on the floor a few seconds, burning walkers. |
| An Eclipse's black sun | Storm | Corona | When the stored damage falls, it leaps as lightning to each foe near. |

**Verdant's last two pairs** (designed now, built with M5): Verdant + Hallow, *Bloom*: an overgrown foe sanctified
flowers, and when it falls its lily mends half a heart (once a room). Verdant + Umbral, *Blight*: the vines rot to
thorns that hex the foe and creep to the nearest other foe. With Wildfire, Frostbloom and Pollen Spark, all fifteen
pairs of the six schools react.

**The room joins in** (smaller, through the hooks mechanisms already hear): a brazier lit by Blackfire burns violet
and bolts through it carry a hex; a rune stone struck by two schools in turn sets off their reaction at its foot; a bell
rung by a shock rings a ring of sparks.

**M4.10 as built (2026-10-01).** All ten weaves and seven chains above, and the room joining in, as the tables say, with
these numbers and choices (tuning in `weaves` in `data/magic.json`). Weaves cost nothing beyond the two spells (decision 2
as proposed); the lasting spell is spent where the weave consumes it (the wall in a Steam Curtain or a Conductor, the
seal in an Overload Seal, the holy ground in Eclipse Ground), and kept where it isn't (Black Pyre, Hallowed Hail, the
motes, the mantle, Refraction's wall).

- *Steam Curtain:* a cloud 2.3 tiles across on every block of the wall, for the wall's time left. *Conductor:* every foe
  within 0.8 of the wall is struck for 6 and shocked; each block throws a chilling shard each way across the wall.
  *Overload Seal:* an Overload the seal's size. *Black Pyre:* a Hex Bolt crossing the erupted seal's ground; its flames go
  violet and what burns in it burns black. *Eclipse Ground:* the Grasp's hands closing on Consecrate's ground take it
  dark at once (it is spent) and every foe standing in it goes under a black sun whose blow strikes half again as hard.
  *Hallowed Hail:* each shard crossing holy ground carries Sanctified (2 s). *Lantern Fan:* the lance through a mote (it
  must reach it); every mote throws a beam 4 tiles outward at half the lance's damage. *Live Wade:* wading in still water
  inside the mantle shocks the pool once a second, the mage spared. *Refraction:* the pillar within 1.2 of the wall lights
  every block of it, striking (10) and sanctifying foes at the wall. *Toll Chain:* every foe the chain leaps through takes
  the toll's mark.
- *Chains:* a cloud of steam takes the first of Storm, Hallow or Umbral that lands in it (a status on a foe inside, a
  shock through water, holy light, darkness): a thundercloud (yellow, crackling) strikes (3) and shocks the foes inside
  each second, incense (gold) sanctifies them and mends the mage half a heart once, a miasma (violet) hexes them. Black
  Melt: fire on black ice lays ground burning with Blackfire (violet) in its place for 5 s. Hailburst: an Overload with a
  chilled or frozen foe, an ice wall or frozen water in its reach throws eight chilling shards. Molten Glass: a Shatter's
  shard crossing fire (burning ground, burning oil, a seal's ground) falls there as burning ground for 4 s. Corona: a
  shock landing within 3.5 of a black sun marks it; when the eclipse ends its blow leaps as lightning at half to every
  foe near.
- *The room joins in:* darkness on a lit brazier, or a hexing bolt through it, turns its fire black (a violet glow, the
  name Blackfire rising), and the bolts it lights carry a hex; a rune stone charged with one school and struck or reached
  by another sets off their reaction at its foot (on the foes in its reach, its name rising even with none) and takes the
  new school; a bell rung by a shock, or a shock landing beside it, rings out a ring of sparks.
- *The book:* the spells tab closes with the weaves and chains, each found or sealed (its two schools named), kept between
  runs (`ossuary.weaves`); a spell's panel lists the weaves it takes part in. A weave's name rises in pale gold, a chain's
  in pale blue, larger the first time ever, at most once every 2 s for those that go on; each sounds both its schools. The
  wheel itself keeps the reactions; the weaves are a list beside it.
- *The dev menu:* Magic's "Weaves and chains here" sets each up ahead of the mage and sets it off; the knowledge row finds
  or forgets them.

## Roadmap and milestones

Milestones 1 to 3 decide whether the game is fun: the loop and its variety, exploration worth the risk, and magic as the build. Everything after them deepens it. Milestones have no dates, since this is a hobby project.

| Milestone | Goal | Done when |
| --- | --- | --- |
| M0 Move to Claude Code | Same game, proper project | Prototype 0.3 runs from the repo, deployed, playable on phone |
| M1 Core loop | Runs feel different | Three generated floors with varied maps, room counts and room shapes; a different boss on each floor; 50+ room templates; room variants from quiet to ordeal, and bone altars; 3 to 5 artifacts per floor from 10 artifacts and 3 foci as data |
| M2 Plunder | Exploration pays | Obols, bone keys and blast glyphs; merchant, secret room, locked vault and shrine cleansing; urns and chests |
| M3 Magic | Magic is the build | Mana, 2 spell slots, 6 spells across 3 schools, status effects, 2 reactions, library room |
| M3.5 The look | One set | The asset pipeline's tooling (built); the pixel look (decided; at the room kit's texel since 2026-10-01, one pixel for everything); the room kit (objects, mechanisms, floors and walls) redone in code in the style of the spell effects, at 60 fps; Tripo kept for special models such as the mage (the owner's decision 2026-09-30, `docs/M3.5-plan.md`) |
| M3.6 Rooms of Eda | Places, not arenas | Carved outlines, dressed walls and doors off the middle; twelve themed rooms with their own objects and twists; new objects and piles, and mechanisms that answer to magic (`docs/M3.6-plan.md`) |
| M3.7 Spell knowledge | Know your spells | Panels over grimoire pages and in the inventory that fill in as spells are seen, learned, used and later upgraded; the spells tab by school; knowledge kept between runs (Spells: Spell knowledge) |
| M4 Enemies in code | Own creatures | The ten enemies built in code (Enemies built in code: four on floor 1, three on each of the others) as foes with behaviour, health, sounds and elemental affinities, and a boss built the same way (the owner chose code over Tripo, 2026-09-29) |
| M4.1 Two floors deeper | A longer descent | Floors 4 and 5 with their own looks, room kit, foes, bosses and themes; Hallow and Umbral spells and statuses; soul motes; twelve more artifacts (the owner's ask, 2026-09-30; `docs/M4.1-plan.md`) |
| M4.2 Beneath the Gate | The vault has a story | The Eda setting in the game's text (the Gate of Uzulim, its Wardens, Kaelith, Asyrion); the six pieces from the lore (watching statues, sapping obelisks, the drinking ward, rope bridges, currents and waterfalls, candle stands in water); the Wandering Merchant of Belerial; three bosses (the War-Tiger, the Pillar Dragon, the Twin Guardians); Fen-Nex as the familiar that grows (adopted 2026-09-30; `docs/M4.2-plan.md`) |
| M4.5 Bestiary | A living dungeon | More critters, fantasy creatures and elementals built in code, and new kinds of enemy behaviour, spread over the floors; each drawn up as a look, chosen by the owner, then made a foe (Combat and enemies: The Bestiary; ideas in `docs/ideas.md`, decided 2026-09-30) |
| M4.6 Costumes and transformations | You can see your build | **Built 2026-10-01** (Artifacts: M4.6 as built). Most artifacts wear a costume piece built in code; transformations when three artifacts of a kind are held, Boketto's look for the Stormcaller; Asyrion's arc from apprentice to chaos mage (Artifacts: Costumes and transformations; decided 2026-09-30, its place in the order the owner's to move) |
| M4.7 Living foes | Foes you read and outwit | Champions wear a school's mantle that the opposite school strips; the ground foes leave works on foes as on the mage; counters found fill a Foes tab, kept between runs; rooms that roll a pair of foes made to work together (Depth for what's built; approved and built 2026-10-01, `docs/M4.7-plan.md`) |
| M4.8 The full wheel | Every pair of schools reacts | Five new reactions (Searing, Prism, Verdict, Black Ice, Void Spark) beside Steam, on foes and on tiles; reactions found mark the spell book's wheel (Depth for what's built; built 2026-10-01, `docs/M4.8-plan.md`) |
| M4.9 The curve | Harder for the right reasons | Pressure dials per floor in data; libraries and merchants lean to the floor's weakness; a hex's drain traced to its foe; the sluice for water rooms; `npm run balance` measuring every foe (Depth for what's built; proposed 2026-10-01, `docs/M4.9-plan.md`) |
| M4.10 Weaves | Combinations beyond pairs | Ten weaves (a spell striking what another left: the Steam Curtain, the Overload Seal, Eclipse Ground...), seven chains (a reaction's leavings met by a third school: Thundercloud, Incense, Miasma...), the room's mechanisms joining in; Verdant's Bloom and Blight designed for M5 (Depth for what's built; built 2026-10-01 at the owner's ask, `docs/M4.10-plan.md`) |
| M4.11 Spell marks | You can see your magic | **Built 2026-10-01** (Spells: Spell marks; the owner's ask). The slotted spells shown at the hands with their state, attunement, a master's ring, the knowledge circle |
| M5 Alchemy | The second game | Potion belt, drink or throw, identification, 4 reagents, alchemy table in Dr. Jelly's laboratory; the Verdant school and its garden rooms |
| M6 RPG growth | Growth you can feel | XP, levels, attributes, 12 boons, runes and waystones |
| M7 Descent and the Vigil | A full run with a reason to return | Final boss (Kaelith, the Shadow Sentinel); the Vigil (RPG progression: Between runs) at the cave mouth over the valleys: freed shades as townspeople with dialogue (Boketto, the Cloud Forest Wizard, the Huruhui foragers), its unfolding, the Great Circle, the Ferryman's crossing, echoes, grimoire, bestiary and disciplines; a won run ends in daylight |
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
| The old chapel of Eda | Setting of floor 1 | The Uzulim Wardens' chapel over their vault, beneath the Gate of Uzulim (adopted 2026-09-30) |
| Hero (no name) | Player character | Asyrion, apprentice turned chaos mage (adopted 2026-09-30) |
| Rotling, Wisp, Crypt hound | Enemy types | Eda creatures |
| The Hollow Warden | Floor 1 boss | A fallen Uzulim Warden (adopted 2026-09-30; its look is the owner's choice) |
| The Drowned Abbess, the Pyre Knight | Floor 2 and 3 bosses | Eda boss creatures |
| Ember Sigil | First artifact | Eda artifact |
| Ordeal, Bone altar | M1 room types | Eda names for these rooms |
| Coins | Currency | An Eda currency (idea: obols, the coins laid on the eyes of the dead) |
| The merchant | Trader NPC | Who trades with the dead in Eda |

- [x] Who is the hero, and why do they descend? Asyrion, an apprentice who becomes a chaos mage, breaking into the Wardens' vault beneath the Gate of Uzulim (Vision: Setting)
- [x] Which region of Eda is the dungeon in, and what are floors 2 and 3? The Pass of Buluiain, beneath the Gate of Uzulim; the floors are the vault's levels, their biomes for M8
- [x] Does Eda have its own schools or traditions of magic that should replace Ember, Frost, Storm, Hallow and Umbral? They stay, and the Huruhui's biomancy adds a sixth, Verdant (Magic system)
- [ ] Should artifacts come from Eda's factions or gods (for example one pool per faction)?
- [ ] Who teaches alchemy in Eda, and is it respected or forbidden?
- [ ] Should the disciplines be separate playable characters with their own Tripo models, or one mage with different loadouts?
- [ ] For a later mobile port: is four-direction casting right on phones, and do the spell, potion and glyph buttons fit on screen?
