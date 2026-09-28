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
