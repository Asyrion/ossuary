# Ossuary: idea bank

Ideas that aren't scheduled yet, to pick from when a milestone is planned. `docs/GDD.md` stays the source of
truth: an idea becomes design when it moves into the GDD. Names and numbers are placeholders.

**The rule for everything here:** when a system is borrowed from Isaac, it gets a magic take. It answers to
the cantrip, glyphs, spells, schools or the room, or to the dead of Eda (souls, shades, the Ferryman), never
only to walking over it and waiting.

## Pickups (brainstorm, 2026-09-28)

Isaac fills its floors with small things: cards, runes, pills, trinkets, batteries, sacks, dice and special
hearts. Ossuary already has its answer to some of them; the families below cover the rest.

| Isaac | Ossuary | Status |
| --- | --- | --- |
| Coins, keys, bombs | Grave obols, bone keys, blast glyphs | M2 |
| Pills | Potions to identify, brew, drink or throw | M5 |
| Runes | Runes socketed into spells at waystones | M6 |
| Hearts | Hearts, half hearts, heart containers | Built |
| Cards | Scrolls, read or bound into a glyph | Idea |
| Trinkets | Talismans that wake on the floor's dead | Idea |
| Soul and black hearts | Soul motes | Idea |
| Batteries | Lodestones | Idea |
| Sacks | Burial bundles | Idea |
| Dice | Augury bones | Idea |
| Familiars (from items) | Shades of fallen foes | Idea |
| Tarot's floor effects | Omens | Idea |
| – | Coloured chalk | Idea |
| – | Vigil candles | Idea |

### Guardrails for any new pickup

- **It answers to magic** (the rule above).
- **It reads at a glance:** its own silhouette and colour, and a banner the first time it is found.
- **The HUD stays small:** held consumables share one **pocket** slot (R, or RT on a gamepad: the keys and
  buttons the GDD hasn't given to spells, potions or glyphs); passives are artifacts or talismans.
- **Data, not code:** a family is built once; its members are JSON entries, like artifacts.

### Scrolls (Isaac's cards)

Torn pages of unbound spells, one use each, carried in the pocket. Magic take: **every scroll has two
uses**. Read it with the pocket button and it acts at once, on the mage or the room. Or hold the pocket
button while chalking a glyph, and the scroll is **bound into the glyph**: the blast carries its effect over
the blast's reach, wherever and whenever the mage's bolt sets it off.

| Scroll | Read | Bound into a glyph |
| --- | --- | --- |
| Stillness | Foes freeze for 3 s | Foes in reach are rooted for 4 s |
| Passage | Unbinds every ward in the room (doors, chests, the vault) | The blast unbinds wards in reach |
| Lantern | Lights the room (ends a dark room) and shows cracked walls on the floor | A blinding flash: foes in reach can't aim for 3 s |
| Warding | A ward takes the next two hits | A dome over the reach unravels enemy shots for 4 s |
| Recall | Back to the floor's start room | Foes in reach are pulled into the centre before the blast |
| Transmutation | Pickups on the floor of the room turn to obols | Foes the blast kills drop an obol each |
| Echo (M3) | Casts the last spell again | The blast repeats a second later |
| Kindling (M3) | Every foe in the room starts burning | Burning ground over the reach |

### Talismans (Isaac's trinkets)

Small charms on a cord: one talisman slot, and walking over another swaps them. Magic take: **talismans feed
on the unquiet dead.** Each has a dormant effect and an awakened one. It wakes once the mage has put a
number of foes to rest on the current floor (the count shows as a ring filling around its HUD icon), and
sleeps again on the next floor. At a shrine, a talisman can be **bound to the mage**: it stays awake for
good and frees the slot (a use for obols once curses are cleansed).

| Talisman | Dormant | Awake |
| --- | --- | --- |
| Wren's Feather | Speed +0.2 | Speed +0.5, and the time unhurt after a hit grows by 0.5 s |
| Chipped Bone Die | A room clear drops two pickups 5% of the time | 15% of the time |
| Tallow Stub | Dark rooms are a little lighter | The mage's lantern light hurts wisps it touches |
| Grave Nail | Bolts knock foes back further | A foe knocked into a wall is stunned for 1 s |
| Salt Ring | The first enemy shot to hit the mage in each room unravels | Every fifth enemy shot unravels |
| Ferryman's Tooth | Each boss leaves 3 obols | Obols drift to the mage from twice as far |

### Soul motes (Isaac's soul and black hearts)

Pale flames that guard the mage's hearts: they take hits before red hearts and can't be healed back.
Magic take: **they are souls, not health.** From M3, when mana runs out, a spell can burn a soul mote for
50 mana instead; from M6, boons change what they do.

| Mote | Guards | When it's lost |
| --- | --- | --- |
| Pale mote | One hit | Nothing more |
| Black mote | One hit | Hexes every foe in the room (Umbral, M3) |
| Hallowed mote | One hit, and it is always lost last | Restores half a heart when the floor ends, if it survives |

### Coloured chalk (no Isaac equivalent)

Stubs of chalk that colour the mage's next three glyphs, with the stubs left shown by the glyph counter.
Magic take: **glyphs take on a school** (with M3's schools), so glyphs become part of the build.

| Chalk | The glyph's blast |
| --- | --- |
| Red (Ember) | Leaves burning ground over the reach |
| Blue (Frost) | Chills every foe in reach; frozen ones shatter |
| Yellow (Storm) | Shock arcs between foes in reach |
| White (Hallow) | Sanctifies foes; the mage caught in it isn't hurt |
| Black (Umbral) | Drains life: each foe hit heals the mage a little |
| Bone (none) | Twice the knockback and breaks urns and rocks further out |

### Shades (Isaac's familiars, which come from items)

Now and then a foe put to rest by magic (a glyph's blast, later a spell) leaves its **shade** for a few
seconds: a pale copy flickering where it fell. Walking into it **binds** it, and it fights for the mage for
the rest of the room. A rotling's shade bites, a wisp's shade fires orbs, a hound's shade charges. Magic
take: necromancy is a pickup; the dead of Eda serve the living mage. An artifact (the Shade Lantern) could
carry one shade from room to room.

### Lodestones (Isaac's batteries)

Stones that hold a charge. Magic take: **they charge magic, not an item.** Picking one up finishes the
spell cooldowns at once (M3); before spells exist, it **overcharges the next glyph** (twice the reach). A
great lodestone also fills the mana bar.

### Burial bundles (Isaac's sacks)

Linen-wrapped grave goods that spill 3 to 5 small things when opened. Magic take: **some are restless**. A
restless bundle creeps away when the mage comes near; a bolt pins it down.

### Augury bones (Isaac's dice)

Knucklebones to cast once, from the pocket. Casting them shows **a reading first**: each pedestal in the
room glows the colour of the pool its new artifact will come from. Then they re-roll it into an unseen
artifact from that pool. A gamble with a hint. Black bones re-roll only into cursed artifacts, and those
come cleansed.

### Vigil candles (no Isaac equivalent)

A candle set down from the pocket, burning for the rest of the room. It lights a dark room, shows cracked
walls within 4 tiles, and wisps shy away from its light. From M3 it empowers Hallow spells cast near it
(rooms react to magic).

### Omens (the floor-wide effects of Isaac's tarot cards and pills)

Sealed omens found in secret rooms, or drawn at a waystone (M6): pick one of three, and it bends the rules
of the next floor. Magic take: **fate is chosen, not rolled.** Most omens trade something good for
something bad.

| Omen | This floor |
| --- | --- |
| The Open Door | Special rooms are shown on the map |
| The Drowned Bell | Dark rooms are twice as common, and drop twice the obols |
| The Ferryman's Due | Merchant prices −30%, but room clears drop no obols |
| The Warden's Rest | The boss starts at three quarters of its health |
| The Hungry Dead | Twice the champions, and each drops a bone key too |
| The Chalk Moon | Glyph stones are twice as common; glyphs burn faster |

### Smaller ideas

- **Relic shards:** three shards of a broken relic (from bosses and secret rooms) restore a unique artifact at a
  bone altar.
- **Skeleton key:** opens every ward on the floor once. **Hollow key:** opens a cracked wall without a glyph.
- **Hallowed obol:** offered at the shrine for a small blessing (M6 boons).

## Artifacts (brainstorm, 2026-09-28)

More artifacts for later milestones, after the 13 added on 2026-09-28 (see the GDD's Artifacts). The same
rules hold: every artifact is noticeable, the cantrip combines everything automatically, and each one
answers to magic (the cantrip, glyphs, spells, the room) or to the dead of Eda. None of these overlap the
artifacts the GDD already plans for M2 (the economy seven) or M3 (Burn, Chill, Shock, mana, homing bolts).

| Artifact | Kind | Effect | Magic take |
| --- | --- | --- | --- |
| Pendulum of Hours | Focus | Bolts swing out in a curve, left on one cast and right on the next, sweeping round cover | Time swings like a pendulum: the cantrip reaches where straight bolts can't |
| Reaper's Crescent | Focus | No bolt: a crescent of pale light sweeps a short arc in front of the mage, cutting every foe in it; strong, but only a tile and a half of reach | A sexton's scythe made of the cantrip; the only close-quarters focus |
| Lodestar Wand | Focus | Bolts stop where their range ends and hang in the air for 2 s as small stars that hurt foes who touch them | Stars stay where they fall: the mage sows the room instead of aiming |
| Twin Vigil Candles | Passive | Standing still, the mage's bolts are 50% stronger; two candle flames at their shoulders brighten while it lasts, and gutter when they move | A vigil stance: holding ground is a choice with a reward |
| Ossuary Choir | Passive | Each foe put to rest in a room adds a voice (a small skull in the HUD); at five, the choir sings and every foe in the room takes 5 damage | The dead of Eda sing for the mage: the room's own fallen strike back |
| Turning Ward | Passive | An enemy shot that only just misses the mage is turned back as a bolt of the mage's own | A ward that reads near misses; rewards dodging close |
| Blood Moon Pendant | Passive | At half health or less, bolts turn crimson, fly 30% faster and come 25% quicker | Desperation feeds the cantrip; a reason not to heal too early |
| Weaver's Thread | Passive | Glyphs chalked near each other are joined by a thread of ward light; foes crossing it are hurt, and enemy shots snag on it | Glyphs become a web: two chalked in a doorway close it |
| Undertaker's Ledger | Passive | Every foe shows its health as a row of candle flames above it; a boss's weak moment glows | The mage reads the dead like a ledger; a first taste of the bestiary (M7) |
| Salt Circle | Passive | Standing still for a second, a ring of salt forms at the mage's feet; walking foes can't cross it until the mage steps out | An old ward against the restless; hounds break their charge on it |
| Echo Stone | Passive | A bolt that strikes a wall leaves an echo that fires once more, half a second later, back the way it came | The crypt answers the cantrip; walls become allies |
| Mirrored Shade | Passive | A shadow of the mage mirrors their steps across the middle of the room and casts when they cast | The mage's own shade, bound from the Ferryman's side of the river |
| Widow's Veil | Cursed | Gift: foes lose the mage often, and their shots scatter wider. Price: the hearts in the HUD are veiled; the mage no longer sees how hurt they are | Hidden from the dead, and from oneself |
| Gravemonger's Contract | Cursed | Gift: every foe put to rest drops an obol. Price: room clears never drop hearts, and hearts cost twice as much at the merchant | A bargain with those who rob the dead; the shrine cleanses it (M2 step 5) |
| The Last Rite | Cursed | Gift: once per floor, a killing blow is refused and the mage rises with half a heart. Price: one heart container less | A rite read too early; the mage walks with one foot in the grave |

## Rooms of Eda (play-test, 2026-09-28)

The first play-test's clearest finding: rooms feel and look too much like Isaac. Four things make them so: plain
rectangular boxes, a door in the middle of every wall, rocks on a grid, and "kill everything and the doors
open". The owner chose **A, B and C, in that order**; D and E stay ideas. Doors may move off-centre. The owner
left the rooms and objects to us ("surprise me"); the picks below are proposals.

**Built in M3.6** (2026-09-29; the GDD's Floors and rooms holds what was built): from A, carved outlines (cut
corners, apses, bays, piers), pilasters and niches, and doors off the middle; from B, all twelve themes, some with a
different twist than below (the garth's braziers and burning tree, the mausoleum's ice-bound dead and frost stones,
the reliquary gallery's candle-lit reliquary); from C, braziers, candle stands, bells, rune stones, lodestones and
hanging censers. **Still ideas:** levels (a dais, a sunken floor, a gallery), archways between a hall's cells,
buttresses, a bone chandelier, the garth's thorn seeds, the statue that isn't one, sluices, old wards on the floor,
and all of D and E.

**A. Architecture inside the cell.** The floor grid stays; what is inside a cell stops being a box.

- **Alcoves** in the walls: burial shelves (loculi) with a skull or an urn in them, niches with a candle.
- **Apses**: a rounded end to a room, where a chapel's altar stands; **cut corners** (chamfers) and
  **buttresses** standing out from the walls.
- **Levels**: a raised dais with steps, a sunken floor that water gathers in, a gallery along one wall.
- **Off-centre doors**: a door anywhere along a cell's edge, not only in its middle; sometimes an archway
  without a gate between the cells of one hall.

**B. Themed rooms.** Each has its own props and one twist, so a room is remembered as a place, not a layout.

| Room | What is in it | Its twist |
| --- | --- | --- |
| Chapel nave | Rows of pews, an altar in an apse, candle stands | Lighting the altar's candles with fire blesses the next casts |
| Ossuary | Walls of skulls, bone heaps, a bone chandelier | Skulls in their niches glow in the school last cast; bone heaps rattle and rise if the fight drags |
| Flooded cistern | Deep water, stepping stones, pillars | Frost makes paths; Shock runs through all of it |
| Scriptorium | Desks, lecterns, heaps of scrolls | Scrolls burn fast; now and then a torn grimoire page lies in a heap |
| Collapsed crypt | Rubble, roots through the ceiling, a shaft of daylight | A glyph brings more of the ceiling down (on foes, too) |
| Fungal grotto | Glowcaps, moss, dripstones | Glowcaps burst into spores when struck; spores catch fire in a flash |
| Bell chamber | A great bell, ropes, a gallery | A bolt rings the bell: every foe in the room reels |
| Embalmers' hall | Stone slabs, oil jars, hooks | Oil everywhere; one spark and the room burns |
| Pilgrims' rest | Bedrolls, sacks, a cold fire, packs | A quiet room: loot in the piles, sometimes a sleeping foe |
| Frozen mausoleum | Rime on the floor, frozen sarcophagi | The floor is slick; fire melts the rime and wakes what was frozen |
| Cloister garth | A dead tree, thorn briars, roots, moss | Briars burn; the tree drops seeds that sprout into thorns |
| Reliquary gallery | Statues of pilgrims in alcoves, reliquaries | One statue is not a statue |

**C. Mechanisms that answer to magic.**

- **Braziers**: lit by fire; a bolt flying through the flame catches fire (Burn).
- **Candle stands**: lit by fire; lighting every one in a room opens a reliquary or drives off the dark.
- **Bells**: a bolt rings one; foes near it reel for a moment (a cooldown keeps it from ringing all the time).
- **Rune stones** of a school: a spell of their school charges one, and it pulses that status round it for the
  rest of the fight.
- **Lodestone pillars**: Shock leaps between them; a line of them makes a fence of lightning.
- **Hanging censers and chandeliers**: a bolt cuts the chain; it crashes down, hurts what is under it, and
  spills burning oil.
- **Sluices**: a blast opens one, and the room floods (or drains).
- **Old wards on the floor**: a foe that steps on one sets it off (and so does the mage).

**D. Winning a fight another way** (later): break three ward stones while the dead keep rising; hold out until a
candle burns down; a room that slowly floods.

**E. The floor as a place** (later): short passages between rooms, stairs down within a floor, a map that isn't
a grid of cells.

## Objects and piles (play-test, 2026-09-28)

More objects like the rocks, pillars and tombs, magic and nature inspired, and heaps and piles. Each behaves as
one of: **tall** (blocks walking and bolts), **low** (blocks walking; bolts fly over it), **soft** (walkable,
slows), **breakable** (to a bolt, or only to a blast), **flammable** (fire burns it away, and may spread) or
**reactive** (a school does something to it). Breakable piles drop loot from **their own pool, poorer than an
urn's**: mostly nothing, sometimes an obol or a glyph stone, rarely half a heart; never keys or artifacts.

| Object | Kind | What it does |
| --- | --- | --- |
| Bone pile | Low, breakable | Scatters to a bolt; the poorer loot pool |
| Skull heap | Low, breakable (two hits) | A skull rolls loose; the poorer loot pool |
| Grave sacks | Low, breakable | Spill one to three small things |
| Oil cask | Tall, breakable | Leaks a pool of oil where it breaks |
| Rubble | Low | A glyph's blast clears it |
| Grave roots | Tall, flammable | Fire burns them away, slowly |
| Thorn briar | Soft, flammable | Hurts the mage and walkers passing through; burns |
| Glowcaps | Low, reactive | Soft light; struck, they burst into spores that catch fire |
| Candle stand | Tall, reactive | Fire lights it; a blast knocks it over into burning wax |
| Rune stone | Tall, reactive | Charged by its school's spell, it pulses that status |
| Crystal cluster | Tall, reactive | Shock leaps between clusters; Chill and a hit shatter one |
| Pews | Low | Cover in the chapel |
| Cobwebs | Soft, flammable | Slow the mage and walkers; burn in a flash |
| Brazier, bell | Reactive | The mechanisms of C |

Scatter without collision makes rooms feel lived in: moss, loose pages, candle stubs, roots down the walls,
rubble at the foot of a wall.

## Familiars (play-test, 2026-09-28)

The owner liked the Candle Moth and the Weeping Skull. Familiars become a family of their own, and artifacts are
only one way to get them.

- **A soft limit of three** at once. Artifacts, spells or boons can raise it. Binding a fourth asks which one to
  let go (as a grimoire page asks for a slot). The artifact familiars count towards it.
- **Ways to bind one:** caged in a rune-sealed urn (the seal broken, it follows the mage); a binding rite (weaken
  a wild one, then trap it in a chalked glyph); a cocoon carried through a few rooms until it hatches; the shade of
  a foe put to rest by magic (see Shades above); a true-name scroll from the merchant; the shrine, in exchange for a
  curse; hidden in a secret room; a boss's servant that changes sides; the prize of an ordeal.
- **Ideas:** an ink raven that steals pickups for the mage; a glass newt that chills what it bites; a lantern wisp
  that lights dark rooms and finds cracked walls; a grave rat that digs up obols; a toad that swallows shots; a
  bone hound pup that charges; a candle owl that marks the nearest foe.
- **Open:** whether they can die, and whether they grow with the mage's levels (M6).
- **The Rune Fox** (the owner's drawing, 2026-09-30; built in code as a look, the dev menu's Familiar options): a
  spectral fox with runes along its flanks and a starry tail. As a familiar it trots beside the mage and leaps at the
  nearest foe. Magic take: its runes take the colour of the last spell cast, and its bite carries that spell's status.

## A hub between runs (owner's idea, 2026-09-29)

**Decided 2026-09-29** (GDD: RPG progression, Between runs: the Vigil; built in M7): the Vigil of the Freed (2) is the
heart, joined by the Refuge's unfolding (5), the Great Circle (3), the Ferryman's crossing and the Echoes (6), with
permanent upgrades as options first and a few powers. The Unwritten Grimoire (1), the Orrery of Schools (4) and the
scribe's desk stay here as ideas; the garden of the dead is the GDD's alchemy garden (M5). What follows is the
brainstorm as it was.

The owner plans a place between runs where the mage does other things, and a bigger part of the game once the RPG
layers come. The GDD's Sanctum (M7) is the current placeholder; spell knowledge (M3.7) is kept for it. Not designed
yet: the concepts below are for choosing together. Names are placeholders within the lore limits.

**The owner's direction:**
- **No copy of Moonlighter or Hades:** no shop where the mage sells loot. Magic and the arcane come first.
- **Townspeople:** they will be the first NPCs, with a small dialogue system. They talk to the mage, tell what they
  know, and give things.
- **Permanent upgrades are allowed:** dungeons will grow bigger, more explorable and harder the deeper they go, which
  offsets the easing that permanent upgrades bring. The GDD's "no permanent stat increases" rule gets revisited when
  the hub is designed.

### Concepts (each a whole shape for the hub)

1. **The Unwritten Grimoire.** The hub is inside the mage's own spellbook, a pocket written into its pages, and it
   grows by knowledge, not by coin.
   - Every spell known opens a page-room: a study to try the spell on shades that fight back, read what the mage
     knows of it, and later etch its runes (M6).
   - Every school learned opens a wing in that school's colour.
   - The townspeople are marginalia: voices written into the margins by the book's earlier owners, who remember
     things.
2. **The Vigil of the Freed.** A quiet, candle-lit crypt above the dungeon, where the dead the mage frees come to
   rest.
   - In runs the mage finds bound shades: in secret rooms, behind ordeals, in a boss's keeping.
   - Released, a shade appears at the Vigil as a townsperson with its memories: one teaches a spell, one tells where
     secret rooms hide, one remembers a recipe.
   - Bound instead, it serves as a familiar for the next run only. That choice is the heart of it, and the hub grows
     by who the mage has freed.
3. **The Great Circle.** A vast ritual circle on the floor of a ruined nave. Between runs the mage inscribes sigils
   into its rings with essence carried up from the dungeon:
   - the ring of vows: a harder run, a better reward;
   - the ring of gifts: a spell or a potion to start with;
   - the ring of omens: which themes and schools the floors lean towards.

   Sigils side by side combine, so placing them is a small puzzle. Stepping into the finished circle casts it, and
   that is the way down.
4. **The Orrery of Schools.** A great orrery where the five schools turn as spheres.
   - The mage brings back resonance: stones charged, spells cast, foes of each school put to rest. It moves the
     spheres.
   - Two schools aligned make their reactions stronger in the next run; an eclipse opens something hidden (a sealed
     wing, a new spell in the library's pool).
   - Growth is more spheres and more rings.
5. **The Refuge that answers to magic.** A small, half-ruined pocket that is itself a puzzle to unfold, like a
   Metroidvania.
   - A frozen stair melts only once an Ember spell is known; a flooded cellar needs Frost to cross; a sealed door
     answers only to Storm.
   - Every spell learned in the dungeon opens more of it, and every part opened holds a resident, a workshop or a
     way down.
6. **The Echoes.** Every run that ends leaves an echo of the mage in the hub: a pale figure holding what that run
   carried. Speak to one to learn how it fell (a hint), take a faded copy of one of its artifacts into the next run
   (weaker, one use), or lay it to rest for essence. The hub fills with the mage's own history.

### Building blocks (fit any concept)

- **The Ferryman's crossing** as the way down: he takes a toll, and what is paid decides where he lands the mage (a
  deeper floor, a floor that leans to a theme).
- **A garden of the dead:** what the mage carries up (grave moss, wisp essence, bone dust) is planted and grows over
  runs into reagents (M5).
- **The scribe's desk:** copy a known spell into a page to start the next run with (M3.7 knowledge).
- **A currency that isn't coin:** essence (the GDD's Arcane Dust), or the souls and echoes themselves.
- **Townspeople and dialogue:** a few lines each, a choice or two, and what they say depends on what the mage has
  found. They tell bestiary lore, where secret rooms hide and what a boss fears. They give small quests that send the
  mage into the bigger dungeons ("bring back my ring from the drowned floor"), and open something when helped. Each
  concept gives them a reason to be there: marginalia, freed dead, keepers of the rite, the mage's own echoes.

**A first pick to talk over:** the Vigil of the Freed (2) as the heart. It gives the townspeople and the dialogue
their reason, and ties the hub to the dungeon's dead. Add the Refuge's unfolding (5) as its magic take, the Great
Circle's vows and gifts (3) as the choice before a run, and the Ferryman's crossing as the way down.

## Enemy model options (owner's request, 2026-09-29)

**Decided 2026-09-29:** made more high fantasy (a school's light each) and divided over the three floors; M4 makes all
ten foes, in code instead of Tripo (GDD: Enemies built in code). **2026-09-30:** the owner wanted critters and small
fantasy creatures rather than the dead, so eight were replaced and the Urn Mimic and Cistern Lurker made cuter (the GDD
lists the ten). What follows is the first round as it was.

The owner liked the code-built placeholder models in the pixel look, and asked for more enemy models to choose
from. Ten candidates are built in `src/actors/modelOptions.ts`, from simple shapes, each moving a little while it
idles. They are looks only: the dev menu's "Enemy model options" stands them in a row ahead of the mage
(`__game.modelOptions()`). The ones picked become foes, with behaviour, health, sounds and elemental affinities:
possibly M4, built in code instead of from Tripo, if the owner decides so. Names are placeholders.

1. **Bone Crawler** (crypt): a ribcage on six bone legs, a skull for a head; skitters in bursts.
2. **Candle Wraith** (chapel): a hooded robe with a candle for a head; its flame flares before it strikes.
3. **Sexton Ghoul** (crypt): a sexton who never left, with his shovel and lantern; slow, then a wide swing.
4. **Drowned Mourner** (drowned floor): a veiled mourner, always dripping; weeps a spray of cold water.
5. **Cistern Lurker** (drowned floor): an eel that rises from a pool and sinks again; bites, and spits from afar.
6. **Ember Husk** (burning floor): a charred body split by glowing cracks; bursts into embers when it falls.
7. **Crypt Knight** (elite): bones in rusted plate behind a tower shield; blocks bolts from the front.
8. **Censer Bearer** (chapel): a hooded monk swinging a burning censer; its smoke hides him.
9. **Skull Swarm** (any floor): skulls circling a violet flame; they scatter when hit and circle back.
10. **Urn Mimic** (among the urns): an urn that is not one; waits still, then scuttles and bites.

## Bestiary: more creatures and enemy types (owner's request, 2026-09-30)

**Scheduled as M4.5 Bestiary** (GDD: Combat and enemies, The Bestiary). The owner liked the critters and wants a whole
host more: small critters, fantasy creatures and elementals, and new kinds of enemies. Each is drawn up in code as a look
first, then chosen, then made a foe. The rules of the ten hold: round, readable shapes; big eyes on the critters; a
school's light; smaller than the mage (elites and bosses aside); a floor each. Names are placeholders.

**Small critters**

| Critter | School | Where | The look, and how it could fight |
| --- | --- | --- | --- |
| Wickmouse | Ember | Crypt, chapel | A mouse with a candle stub burning on its back; scurries from cover to cover and lights any oil it runs through |
| Inkling | Umbral | Library, scriptorium | A blot of ink with eyes that crawls out of scroll heaps; leaves a smear that slows, and splits in two when struck |
| Chime Bat | Storm | Bell chamber | A bat with a tiny bell round its neck; flits in loops, and its chime marks the mage for a spark that follows |
| Rime Snail | Frost | Drowned floor | A snail with a shell of ice; slow, leaves frost that freezes water, and turns its shell to bolts |
| Spiderling | Umbral | Ossuary, crypt | Drops from the ceiling on a thread; its webs slow; a clutch hatches from an egg sack when the room wakes |
| Firefly Cloud | Hallow | Garth, chapel | A cloud of fireflies pulsing as one; blinding when swatted; scatters and gathers again |
| Rubble Crab | Storm | Collapsed rooms | A crab wearing a shell of rubble, hiding among the piles; pinches; a blast flips it on its back |
| Dust Puff | Umbral | Any | A ball of dust with eyes that rolls at the mage and bursts into a dark cloud |
| Frost Hare | Frost | Frozen rooms | A white hare with ice-blue eyes that leaps in long bounds; hard to hit, slides on ice |
| Puffcap | Umbral | Grotto | A small Sporeling that swells and bursts into spores when the mage comes close |
| Ember Wasp | Ember | Burning floor | Streams from a nest set in a wall; fire destroys the nest, and the wasps with it |
| Glass Newt | Frost | Drowned floor | A clear little newt, cold to the touch; chills what it bites (also an idea for a familiar) |

**Fantasy creatures**

| Creature | School | Where | The look, and how it could fight |
| --- | --- | --- | --- |
| Basilisk Hatchling | Umbral | Crypt | A small lizard with a crest and a stare: its telegraphed gaze slows the mage while it lasts |
| Gargoyle Whelp | Frost | Chapel, bell chamber | Perches on a wall as stone; drops when the mage passes; bolts glance off it until it moves |
| Grimoire Mimic | Umbral | Library | A book that flaps and bites; drops a grimoire page when it falls |
| Brine Serpent | Frost | Drowned floor | Coils up out of a pool and spits; freezing the pool traps it |
| Moonstag Fawn | Hallow | Garth | A fawn with glowing antlers that heals the foes near it; put it to rest first |
| Rootling | Umbral | Crypt with grave roots | A sapling creature that burrows and bursts up under the mage; fire keeps it above ground |
| Phoenix Chick (elite) | Ember | Burning floor | Rises again from its ashes once, unless the ashes are frozen first |
| Storm Ray | Storm | Drowned floor | A manta of storm-cloud gliding over the room, shocking the floor and water beneath it |
| Griffin Fledgling (elite) | Storm | Burning floor | Circles high, then swoops along a marked line |
| Shadow Fox | Umbral | Any | Blinks from shadow to shadow; a lit brazier or a lifted dark keeps it in the open |
| Harpy Chick | Storm | Bell chamber | Dives from above and screeches; its screech scatters glyphs |
| Salt Golemling | Frost | Embalmers' hall | A small golem of salt and wax; slow, blocks bolts, melts in fire |

**Elementals** (one or more for every school; each is made of its element, so the room answers to it)

| Elemental | School | The look, and how it could fight |
| --- | --- | --- |
| Cinder Sprite | Ember | A flicker of flame with eyes; flits about, lights oil and braziers it touches |
| Magma Blob | Ember | Splits into smaller blobs when struck, each leaving burning ground |
| Hearth Golem (elite) | Ember | A walking brazier; its fire must be put out with frost before it can be hurt |
| Snowball Sprite | Frost | Rolls at the mage, growing as it rolls, and bursts into a chill |
| Glacier Golem (elite) | Frost | Slow, blocks bolts; storm on a frozen golem shatters it (Shatter) |
| Spark Sprite | Storm | Zips in straight lines from wall to wall, turning at each |
| Thunderhead | Storm | A small storm-cloud that rains sparks on where the mage stands; water under it carries them |
| Lodestone Golem | Storm | Bends the mage's bolts towards itself |
| Choir Wisp | Hallow | Sings: foes near it strike harder until it is silenced |
| Radiant Orb | Hallow | Drifts and flares, blinding for a moment when the mage looks its way too long |
| Gloom Sprite | Umbral | Darkens the room round it as it moves |
| Void Mote | Umbral | Swallows the mage's bolts, growing with each, until a spell bursts it |
| Puddle Elemental | (water) | A walking pool on the drowned floor; frozen, it becomes ice to stand on |
| Rubble Golem | (earth) | Breaks into rolling stones when a blast hits it |

Elemental rules to try: an elemental takes its own school's status as healing (a Cinder Sprite grows when burned);
the opposite school hurts it twice over (Ember and Frost, Hallow and Umbral; Storm and water); and it touches the room
as its element does (fire lights oil, frost freezes water, sparks run through pools).

**Enemy types** (how they fight, each with a magic take; any creature above can take one)

| Type | How it fights | Magic take |
| --- | --- | --- |
| Chaser | Walks straight at the mage | Leaves its school's trail (frost, embers) |
| Hopper | Leaps, lands, pauses | Lands with a small burst of its school |
| Charger | Lines up and charges until a wall stops it | Charging through a pool carries the pool's element |
| Flier | Ignores rocks and pits | Can't be slowed by water; ground spells miss it |
| Shooter | Aimed shots | Its shots carry its school's status |
| Spreader | Rings or fans of shots | A reaction on it bursts its next ring |
| Turret | Bound to a wall or floor | Can be turned: a rune of the mage's school captures it for the room |
| Burrower | Under the floor, surfaces under the mage | Fire or frost on its mound keeps it down |
| Swarm | Many weak ones with one mind | A chain spell (Arc) leaps through all of them |
| Splitter | Splits when it falls | Frozen, it shatters instead of splitting |
| Shielded | Blocks bolts from the front | A reaction breaks the shield |
| Healer | Heals or shields the foes near it | Hallow heals it, Umbral silences it |
| Summoner | Calls more foes | Its circle on the floor can be broken by a blast glyph |
| Mimic | Hides as an object (urn, book, chest) | Reveals itself to the mage's own school |
| Ambusher | Sleeps or waits above | Wakes to noise: a bell, a blast, a spell |
| Kiter | Keeps its distance | Slowed by chill, it can be caught |
| Blinker | Teleports | Shock stops it blinking |
| Trapper | Lays hazards (webs, burning ground, ice) | Its hazards take the mage's elements too (burn a web) |
| Leech | Drains mana on touch | Gives the mana back when put to rest |
| Absorber | Eats one school's spells to grow | Must be beaten with another school |
| Mirror | Reflects bolts unless struck from behind | Spells go through it |
| Tethered pair | Two foes joined by a beam that hurts | The beam carries statuses from one to the other |
| Champion | Any foe, bigger, with a school's aura | Drops more; its aura's school decides its weakness |

## Costumes (play-test, 2026-09-28)

Isaac's items change how Isaac looks; ours should too, in a medieval and magic way. **Built as a proof of
concept:** the Pilgrim's Cowl puts a hood on the mage (`src/actors/costume.ts`). Pieces hang from the rig's
bones, one per slot (head, shoulders, back, hands, aura; the one taken last wins the slot), and are fitted to
whatever model is loaded.

- **Pieces to come:** the Crown of Thorns on the head; the Mask of the Drowned over the face (a face slot, so it
  can go with a hood); the Chain of the Penitent on the wrists; the Mana Lantern at the belt; the Ember Sigil
  glowing on the back; the Frostbitten Ring rimed on one hand; the Candle Moth's light as an aura.
- **Magic take:** a cursed artifact shows its curse (the mask weeps, the chain drags on the floor) until a
  shrine cleanses it; then the piece changes to its cleansed look.
- **Tripo pieces:** small props made to the budgets in `docs/assets.md`, replacing the placeholder shapes.
- **Limits:** the hero is one mesh, so a piece can cover the hair but not hide it; a Tripo hero exported with its
  hair as a separate part would lift that.
