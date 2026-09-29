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

## A hub between runs (owner's idea, 2026-09-29)

The owner plans a place between runs where the mage does other things (a hub, a square, another plane), something
like Moonlighter's town before its dungeon portals, and a bigger part of the game once the RPG layers come. Not
designed yet; the GDD's Sanctum (M7) is the current placeholder for it. Spell knowledge (M3.7) is kept for it.

- **The loop:** what the mage brings up from the dungeon (relics, reagents, pages, the dead's remains) is sold,
  traded or given to the hub's people, and investing in them opens new things, as Moonlighter's shops do.
- **Its people** (placeholder roles, within the lore limits): a scribe who keeps the grimoire and can copy a known
  page for the next run; a chandler or herbalist for potions and reagents (M5); a sexton who keeps the bestiary; the
  Ferryman, who takes the mage down and, for obols, carries one thing across from one run to the next.
- **Before a run:** buy one consumable (a potion, a scroll, a glyph stone) with what carries over; pick a
  discipline (the starting loadouts); take a vow that makes the run harder for a better reward (like Hades' pact).
- **What carries over:** a currency of its own (the GDD's Arcane Dust, or a share of the obols a run found, paid
  as a tithe), knowledge, and unlocks.
- **Permanent upgrades, the open question:** the GDD says unlocks widen the options but never make the mage
  stronger. Moonlighter and Rogue Legacy do make the hero stronger over time, which changes the feel (early floors
  get easy). A middle way: unlocks and bought consumables for a run, and at most a few small, capped boosts.
- **The magic take:** the hub answers to the mage's magic too; a ward, a well or an altar there reacts to the
  spells learned, and the Ferryman's crossing is the way down.

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
