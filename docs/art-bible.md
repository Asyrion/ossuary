# Art bible

**R3 step 1** (`docs/RESET-plan.md`, Phase 3). The rules every picture in Ossuary follows: rooms, foes, the mage,
effects, the HUD. Made with the owner from five reference pictures (section 5). The owner took the decisions in section 4
on 2026-10-15. Where `docs/assets.md` (House style) or `docs/effects.md` (colour) say otherwise, this file wins.

The looks it describes are built in R3's later steps: the game shows today's look until then (section 2).

## 1. What is fixed

These follow from the camera and the renderer. The look has to work inside them.

- **One pixel for everything.** The game is drawn at the room kit's texel, 48 game pixels to a unit across and 34 down
  (`CFG.roomKit.texel`), and blown up: about 2.6 screen pixels to a game pixel at 1080 lines in a one-cell room, and 2
  in a great hall.
- **The camera:** orthographic, tilted 45°, about eight tiles away, fitted to a 13 × 7 cell. The north wall is tall
  (1.35), the south wall low (0.5). Only the current room is drawn.
- **What reads at play distance** (found in play): dark bodies with bright emissive features, and shapes that stick out
  sideways. Pale bodies wash out, and detail on a forward face is lost.
- **Sizes** in game pixels, at the texel. These come from the budgets in `docs/assets.md`; we check them against a shot
  before they are final:

| What | Units | Game pixels (about) |
| --- | --- | --- |
| A floor tile | 1 × 1 | 48 across, 34 down |
| The mage | 1.3 tall | 45 tall |
| A foe | 0.8 to 1.2 | 28 to 42 tall |
| A boss | about 2 | about 70 tall |
| A prop | urn 0.6, pedestal 0.7, tomb 0.55 tall | 15 to 30 tall |
| An artifact on its pedestal | 0.3 to 0.45 | 10 to 16 |
| A coin | 0.5 across | 24 across |
| An icon | | 28 (HUD), 44 (lore card) screen pixels |

## 2. Where the look is today (measured 2026-10-15)

These are shots of the first room of every theme (`npm run inspect -- themes`, seed K3F9QX, 1280 × 720), measured over the
middle of the room:
- **Near black:** the share of pixels with lightness under 8 %.
- **Shadow hue:** the mean hue of the saturated dark pixels (lightness 8 to 22 %).
- **Light hue:** the mean hue of the saturated light pixels (lightness over 50 %).

At this window size a game pixel is about 1.7 screen pixels and the blow-up smooths, so colour counts and texture
density aren't measured here. They need a shot at the texel.

| Theme | Floors | Near black | Shadow hue | Light hue |
| --- | --- | --- | --- | --- |
| chapel | 1, 2, 4 | 23 % | 15° | 30° |
| ossuary | 1, 3, 5 | 43 % | 11° | 27° |
| scriptorium | 1, 4 | 24 % | 23° | 29° |
| pilgrims | 1, 2, 5 | 31 % | 15° | 29° |
| reliquary | 1, 2, 4 | 38 % | 20° | 35° |
| bells | 1, 3, 4 | 39 % | 14° | 29° |
| garden | 1, 2, 3 | 21 % | 74° | 38° |
| cistern | 2, 5 | 21 % | 202° | 184° |
| grotto | 2, 5 | 25 % | 132° | 116° |
| collapsed | 2, 3, 5 | 35 % | 10° | 27° |
| mausoleum | 2, 4, 5 | 5 % | 223° | 215° |
| garth | 2, 3 | 27 % | 20° | 28° |
| embalmers | 3 | 29 % | 26° | 30° |
| treasury | 4 | 20 % | 20° | 38° |
| landing | 5 | 19 % | 202° | 136° |

What the numbers say:
- **No hue shift.** In most rooms the shadows and the lights sit within about 15° of each other: one orange-brown ramp
  that only changes lightness. The torchlight warms everything, so shadows are a darker orange, not a cooler colour.
- **A lot of black.** A fifth to two fifths of the middle of a room is near black. That is where foes hide (the known
  issues in `docs/STATUS.md`: the Gloom Raven, the Mandrake, the Hex Imps and the Deep Angler).
- **The floors share one look.** Floors 1, 3 and 4 are made of the same warm brown themes. Only the cistern, the grotto,
  the mausoleum and the landing bring a colour of their own.

## 3. What Godot-Tamer found (the owner's other game, `docs/14_ART_STYLE.md` there)

Its rules, measured on its reference pictures. They are a starting point for us, not decided:

- **Hue-shifted ramps:** shadows go toward blue and teal, lights toward yellow and amber. No ramp is one hue that only
  changes lightness.
- **Ramps:** 4 to 6 colours a material, up to 8 to 10 for large ones (ground, foliage); 16 to 24 colours a creature.
- **Texture:** surfaces carry fine clusters of 1 to 3 pixels; about 40 to 50 % of neighbouring pixels differ on the
  ground. Creatures are calmer, at about 35 %, so they stand out.
- **Outlines:** creatures and characters get a closed outline, near black tinted per material. Discrete objects get one
  too. Terrain (floor, sky, water) gets none.
- **Light:** one key light from the top left; cast shadows cool and soft, never black; warm pools around candles over a
  cool ambient light.
- **No soft alpha** on sprites: fades are dithers, slides or clips.
- **Readability first:** where texture and readability conflict, readability wins.

## 4. The decisions (the owner, 2026-10-15)

### 4.1 A palette per floor

Each floor has its own family of colours, so the player knows at a glance where they are (as each region of Hades, each
dungeon of Moonlighter and each place of Sea of Stars does):
- **a base ramp** of 5 or 6 colours, from shadow to highlight;
- **a shadow hue** the ramp leans to;
- **one accent** that stands against it.

The room themes stay, coloured into their floor's palette: a chapel on floor 4 is gilded, on floor 2 mossy. **Foes and
the mage never wear their floor's base colour**, so they stand out from it.

The starting ramps, shadow to highlight, then the accent. They are refined when each floor is built (R3 step 6):

| Floor (GDD) | Mood | Shadow | Dark | Mid | Light | Highlight | Accent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 The crypt | Sandstone by candlelight; verdigris for the undead | `#2b3047` | `#4a3f45` | `#7a6250` | `#b8956a` | `#f2d49a` | `#5fa38a` |
| 2 The drowned | Flooded stone, moss and rime; a glow like the cave's fungi | `#1b2440` | `#23434c` | `#3f6f63` | `#7fb39a` | `#d6f0e0` | `#b8f070` |
| 3 The burning crypt | Ember and charcoal; violet shadows, brimstone | `#2d1f3d` | `#4a2a2e` | `#8a3b2a` | `#d9732e` | `#ffd27a` | `#f0e070` |
| 4 The Gilded Reliquary | Ivory and gold over deep blue; rust red for menace | `#1f2546` | `#3a3352` | `#8a7a5c` | `#d4b469` | `#fff1c4` | `#b8402e` |
| 5 The Ferryman's Shore | Mist, frost and dark water; a lantern's amber | `#141f33` | `#26364a` | `#57707e` | `#a8bcc0` | `#e8f2f4` | `#e8a84a` |
| The Seal and Kaelith | Deep violet, the seals' ward blue, gold for daylight | `#1a1433` | `#2e2350` | `#5a4a8a` | `#8ab8ff` | `#e6f0ff` | `#ffd878` |
| The Vigil | A garden at dusk; lantern orange | `#2a2a48` | `#3d4a3a` | `#6f8a4f` | `#c9b27a` | `#ffe2a8` | `#f08a3c` |

### 4.2 Hue shift: cool shadows, warm lights

Every ramp shifts its hue: shadows turn about 40 to 60° toward blue and violet, lights 10 to 20° toward amber. A dark
orange reads as dirt; a dark blue reads as shadow. Torches stay warm: they make warm pools in a cool room instead of
colouring the whole room orange. Black appears only in outlines and in the void outside the room.

### 4.3 Light and dark: balanced

Mid tones carry the room; the dark sits at its edges and outside it (Hades is gloomy, never black where the fight is).
The owner's references have a mean lightness of 34 to 49 %; two rooms measured today (chapel nave and ossuary) have 8 to 10 %.
- **The walkable floor:** mean lightness 30 to 40 %, at most 8 % near black (lightness under 8 %).
- **A room meant to be dark:** at most 15 % near black, and never so dark a foe disappears.

### 4.4 Outlines: hard

As in Godot-Tamer:
- **Who gets one:** the mage, foes, bosses, townsfolk and every discrete object (props, pickups, artifacts).
- **What it looks like:** a closed outline one game pixel wide, near black, tinted only slightly toward the material's
  hue. It is unbroken all round the silhouette, also on the lit side.
- **Who gets none:** terrain (floors, water, the outer faces of walls). It gets a dark edge on its shadow side instead.

### 4.5 The key light: from above, a little from the left

At the 45° camera it lights heads, shoulders and the tops of things; south faces lie in cool shadow. Three layers:
- **Ambient:** cool, from above, in the floor's shadow hue. It makes the room readable on its own.
- **Torches and magic:** warm pools, or pools in a school's colour, brighter at the core and falling off sooner than
  today.
- **A rim light on actors:** a bright edge at the top left of the mage and the foes, as Hades uses it. It lifts dark foes
  off a dark floor; today the Gloom Raven, the Mandrake, the Hex Imps and the Deep Angler are lost there.

### 4.6 The HUD: framed (variant B)

Small pixel-art panels with brass and stone frames, matching the diorama and the vault's materials (as in Moonlighter):
- **Top left:** the hearts and the mana bar.
- **Top right:** obols, keys and glyph stones.
- **Bottom centre:** the spells.

Panels stay small and appear only where something stands. Icons are pixel art with the hard outline. The panels and
icons are built in R3 step 5.

**The artifact icons are drawn pixel art (2026-10-23, the owner's choice).** Each of the 61 artifacts shows an icon
drawn in Aseprite at 24 pixels (the sources in `inspiration/icons/`, their prompts in `docs/art/icons/`; `tools/aseprite/`:
`redraw.py` traces a picture to an indexed sprite on a palette ramp, round-trips a text grid for hand edits and exports
at size). `npm run prepare-texture -- --drawn` keeps a drawn icon as drawn: exactly the icon's size, no soft pixels,
checked pixel for pixel against its export. It is shown wherever an artifact's icon is (the HUD, the cards, the
merchant's shelf, the dev menu's sheet of every icon), scaled only in whole steps (1x in the HUD, 2x on the cards and at
the merchant). An artifact without a drawn icon keeps its icon rendered from its model.

### 4.7 Humanoid proportions

The humanoids (the mage, townsfolk, human foes) follow the ranger's proportions (reference 2): chibi, a little over three
heads tall, a large head and readable hands.

### 4.8 Models at the texel, rooms from the code kit (the owner, 2026-10-15, from the proof)

**Actors stay models drawn at the texel (route A)**, not sprites baked from 3D. Drawn through the same ramps and outline,
both routes look nearly the same at play size (section 7); baked sprites are a little calmer, but models keep what the
game has: eight directions and smooth turning, torch and spell light on the actors, costume pieces on the bones (M4.6)
without new sheets, and no sprite runtime. What route A needs is a pass in the pixel look: each actor's pixels on its
materials' ramps, the closed outline from its silhouette, the rim light (4.5).

**Rooms stay the code-drawn kit**, recoloured to their floor's palette. Generator tiles may replace a piece where they
clearly win (the proof's wall faces were good; its floor tiles repeated, their joints forming a grid).

### 4.9 Floor 1 in the game, step A (built 2026-10-19)

Floor 1's colours and its fill light are in its look (data/floors.json: `floor`, `wall`, `torch`, `urn`, `light`
with `fill` 1.45), and its `grade` (shadow `#273352`, amount 0.5, lift 0.03) leans the pixel look's darks toward slate
blue (docs/architecture.md, Pixel look). Measured in the middle of each room: mean lightness 29 to 42 % (8 to 20 %
before), near black 1 to 6 % in most rooms, shadows at about 230 to 260 degrees and lights at about 20 to 25. **The owner
accepted it as it stands (2026-10-19)**, to be tuned again after the asset rounds; dark rooms stay as they are for now
(35 % near black, above 4.3's 15 %).

### 4.10 Floor 1 in the game, steps B and C (built 2026-10-19)

Step B: the grade inks the outlines in the shadow's blue (`ink` 1, `gap` 0.08) and floor 1's kit wears its own
materials (`materials` in its look, docs/architecture.md, Pixel look). Step C: plain rooms are strewn from the floor's
`scatter` (bones, pebbles, verdigris, cobwebs on the north wall, stains, one relic), clear of doors and the start's
middle; the walls carry moss and more niches. The six relics are Tripo models (docs/assets.md, asset log), cut to under
3,500 triangles as closed hulls with their colour baked (`tools/art/`). **The owner accepted B and C (2026-10-19).**

### 4.11 Floor 1 in the game, step D: made wall faces (built 2026-10-19)

Floor 1's three kinds of wall (bricks, ashlar, bones) are faces made from Tripo Studio pictures, reduced to the kit's
texel by a majority colour a block and moved into the floor's wall colours (`tools/art/walltile.py`; docs/assets.md,
Wall faces; the pictures in `docs/art/walls/`). The code still draws its stains, moss, niches and pillars over them.
**The owner chose the made faces for all three (2026-10-19).** The other floors keep the kit's drawn walls until their
own pass. Floor tiles stay drawn (4.8).

### 4.12 The actors, step E1: outline and rim (built 2026-10-19)

The mage, the foes and the bosses get the closed outline of 4.4 (one pixel outside the silhouette, all round, in its
colour darkened toward the floor's shadow) and the rim of 4.5 (a warm edge on the top and left where the actor is four
pixels thick or more, `CFG.pixelLook.actors`). Built in the pixel look, not in the models: the actors stamp the stencil
as they are drawn, for one draw call more a frame (docs/architecture.md, Pixel look). **The owner accepted it
(2026-10-20).**

### 4.13 The actors, step E2: light in steps (built 2026-10-20)

The light on an actor falls in five steps even to the eye; its darks turn 30 % toward the floor's shadow colour and its
lights 22 % toward the rim's warm amber (4.2), each material keeping its own colour (`CFG.pixelLook.actors`: `steps`,
`cool`, `warm`). Like E1 it is done in the shade pass, at no draw call. **The owner accepted it (2026-10-20).**

### 4.14 The actors, step E3: reading floor 1's foes (2026-10-20)

All eleven of floor 1's foes read in a lit room. The Helm Hermit, the Urn Mimic and the Grimoire Mimic hide on purpose. In
a dark room the Quill Kraken and the Mantis Knight, black bodies, are carried only by their outline, rim and the
Mantis's lit blade edges; **the owner chose to leave them so (2026-10-20)**, dark rooms being darker by design (4.3).
From the room inspection: the light's top step stays short of white (`top`), its turns tint rather than replace, and
the outline is near black on every floor.

### 4.15 Floor 1's spells, steps F1 and F2 (2026-10-20)

F1 surveyed every spell and the cantrip in a room of floor 1. F2 gave six spells solid parts made in Tripo (the Glacial
Wall's ice, the Living Wall's hedge, Grasp of the Grave's hands, the Thorn Snare's thorns, Judgement's sword, the
Lantern of Vigil) and three their circles as pixel art from Tripo pictures (the Pyre Seal, Consecrate, the Ferryman's
obol; `tools/art/sigil.py`): a real alphabet's runes in a picture are replaced by the Wardens' glyphs. From F1: small
things two game pixels thick at least (shards, lightning), each school's colour drawn rather than added where added
light came out white, and a pillar of light under 0.6 over a foe. **The owner accepted F2 (2026-10-20).**

F3, floor 1's foes' magic (built 2026-10-20, the owner's go the same day): a foe's shot is a hot core in a sheath of its
school's light ringed in dark, unlike the mage's; the Warden's halo stays low as it winds up and a circle of runes on the
floor warns instead; a foe's telegraph pulses at 0.28 of its school's light rather than flooding it flat; the Quill
Kraken's ink lies as uneven splats; Soul Harvest's threads are full lightning and its stacks fly home as sparks. **The owner
accepted F3 (2026-10-21).**

### 4.16 Floor 1's items, effects and artifacts, steps G1 and G2 (2026-10-21)

G1 surveyed every drop and container, the twelve potions, seven reagents and seven runes, the 61 artifacts, the
companions and every potion's throw in floor 1's treasure room. What it found: the pickups and artifacts drew no outline
(4.4 asks one of every discrete object); the coin purse was brown on the ochre floor; the lodestone shard's veins a
pixel thin; a blast's scorch (a glyph, the Volatile Mixture) a near-black pool that read as a hole; the chests' pale
bone bands read as the bars of a cage, the pedestal pale. G2 (built, awaiting the owner's look): pickups, containers and
artifacts get the closed outline alone (`markThing` in the pixel look: their colours stay as made, no rim or light in
steps, which darkened the flat hearts), the purse in oxblood leather, the shard's veins two pixels wide and the key's
ward stone larger, and every mark on the floor (scorch, soot, a foe's stain) turned toward the floor's shadow colour
(`CFG.pixelLook.decalShade`, in each mark's own hue after the room inspection). **The owner kept the outline and the
softer marks (2026-10-21).** The reliquary chest, the gilded chest, the offering coffer and the artifacts' pedestal are
made in Tripo from the owner's picks (`docs/art/items/`; docs/assets.md, asset log), the chests' and the coffer's lids cut
off on their hinges so they still open (`tools/art/lid.py`; inside, planks drawn at the texel, the owner's choice). A
made chest's ward seal, still drawn in code, hovers flat over its lid and turns, its rings two pixels thick and a gilded
chest's a pale gold: standing before the chest it read as a pale smudge, and pink over the gilded chest's red wood (the
owner's "surprise me", 2026-10-21).

### 4.17 The HUD and screens, step H (built 2026-10-21)

Variant B of 4.6 built: the HUD in small framed panels of brass and stone, drawn as pixel art at about the room's pixel
(`--u`, two screen pixels a pixel, three from 900 window rows; `CFG.hud`) from nine-slices made by
`tools/art/hudframe.py` (`public/assets/hud/`). Top left the hearts and the mana bar (two flat tones in a brass trough,
the insight strip under it); top right the obols, keys and glyphs beside the framed map; bottom centre the spell slots,
the level and the potion belt; the boss bar moved to the top. The hearts, soul motes, key and glyph are pixel bitmaps
with the closed outline (`pixelSvg` in render/icons.ts); the spells' drawn icons are made pixel art when first shown
(render/pixelIcons.ts: drawn small, their edge cut hard, outlined). The hint, the prompt, the lore card and every
screen's card wear the same frame, dark whatever the system's theme (the cream cards of a light system are gone). From the
closing sweep: the screens stand over the hint, and the hint shows at the top, under the panels, its text at the HUD's
pixel (at the bottom it lay over a one-cell room's south door).

**The owner accepted floor 1 in the new look as a whole (2026-10-21): its rooms, actors, spells, items and HUD.**

### 4.18 Floor 2 in the game, steps A to D (built 2026-10-21, awaiting the owner)

Floor 2, the drowned, in its palette (4.1: slate blue to moss and sea green, the fungi's lime its accent): its floor and
wall colours, a fill light of 1.3 and the same grade as floor 1's in its own shadow (`#1b2440`), the kit's materials in
its ramps (wood soaked grey-green, bronze gone to verdigris), and plain rooms strewn with glowing moss, moss, pebbles,
stains, a few bones, rime and a relic. Measured on the walkable floor as in 4.9: mean lightness 34 to 41 % (17 to 27 %
before), near black 1 to 7 % (up to 38 % before), shadows at about 210 degrees and lights at about 148. Its six relics
are made in Tripo from the owner's picks (a stone font, a column's stump, a log grown with glowing fungi, a fallen bell,
waterlogged planks, rimed bones; `relics` in the floor's look), and its three walls (bricks, tide-worn blocks, rubble)
are made faces from Tripo pictures through `tools/art/walltile.py` (`docs/art/walls/drowned-*.jpg`).
From the room inspection (the owner's go, 2026-10-21): oil keeps a little light of its own (it read as a pit in a dim
room); the sunken mosaic laid in the floor's own tesserae (`floor.tesserae`: slate-blue rings, moss crosses) instead of
the kit's warm ones; rime as frost crystals in hard pixels, not a soft glowing blob; standing water and stains in deep
water and the floor's own stain, never a pit's black; the rubble wall cut four units wide, so it repeats less; the
collapsed crypt, the garth and the pilgrims' rest each on a floor of their own colour (`themeFloor` in the floor's
look); the Storm Darter in storm indigo with a gold belly and a thicker body (a thin dark-teal one vanished).

### 4.19 Floor 2's foes and bosses made in Tripo (built and accepted by the owner 2026-10-21)

The owner's call: foes may be made anew in Tripo where a better figure fits, as still models that code moves. The eight
weakest looks of floor 2 (the mire toad, lantern jelly, thunderhead, walking wave, puffcap, rime snail, glass newt and
storm darter) are Tripo models from the owner's picks, worn as pixel art from their own texture
(`props/foe_<look>.glb`), in place of the look in code (`actors/madeFoes.ts`). Code moves each as a whole (`CFG.madeFoes`:
it squats, floats, sways, crawls or banks), sizes it by its `span` across the floor (about one and a half times the
foe's body, so it reads at its reach), hangs a flyer where its body was, and keeps the code look's lights and the parts
its behaviour moves. Each foe wears its own copy of the surface, so a hit lights only it. The owner kept all eight at
the sizes first set (2026-10-21).
Then, from the owner's picks (2026-10-21, through the `tripo` CLI on the owner's Tripo Studio account), the kelpie and the
brine serpent, which rise from their own pools (kept from the look in code, `keep`; the kelpie turned three-quarters to
the camera, since a horse seen head-on is all mane), and the floor's two bosses (`actors/madeBosses.ts`), the Drowned
Abbess and the Pyre Knight: sized to their looks in code, keeping their rune ring and halo; what their fight did to a jaw,
gills, a sword arm or legs moves the model as a whole (she rears and swells as she wails, he leans into his blade and
bobs as he strides). The knight is darkened (`darken.ts` 0.62, charcoal plate) and burns with the code's fire out of his
helm (his painted flames don't light). Under a made boss the blob shadow is lighter at the middle (`pixelLook.openShadow`):
its dark middle showed between the knight's legs as a hole. Thin glowing marks (the kelpie's lightning, the serpent's
throat) are lost at 128 px; the kelpie reads less well on dark water than its look in code did, accepted by the owner.

### 4.20 Floor 2's spells, foes' magic and items (2026-10-21 and 22, accepted by the owner)

As F1 and G1 did for floor 1, a survey of every spell, floor 2's foes' magic, its pools and statuses, and every item,
container and special room on floor 2's floors found what didn't read on its pale sea-green and slate. The owner took
every fix; those for the spells hold on every floor.
- **Spells:** Hallow drawn in a deeper gold with dark-edged rings (it washed to white); lightning and Rime Shards in
  their school's colour round a thin white core; the Grasp's and the Thorn Snare's ground shaded toward the floor's
  shadow colour, never black (`floorShade`); the Living Wall greener, lit lime from within; Eclipse's suns in the
  floor's shadow; miasma and the Shadowstep's fog in hard bands (`fogTex`).
- **Foes' magic and water:** sparks on the floor as hard storm crosses, the thunderhead's rain bolt thick and gold with a
  circle on the floor as it gathers; the rime snail's trail in pixel frost crystals; frost and storm shots in a deeper
  sheath round a hot core; pools one flat deep-water tone with a hard edge, blue ice, a shocked pool's crackling rim,
  steam a stepped dither thinner round the mage; open shadows under flyers and a swimming newt; the Abbess darkened;
  the mire toad's gathering cold and the newt's spray shown.
- **Items and rooms, from Tripo** (the owner's call: solve with Tripo what a model or a picture solves): floor 2's own
  urn in warm clay with a lime band (in its wall niches too, so a room shows one urn), its bargain stele of dark basalt veined in lime (its cap's pale texels recoloured to
  the basalt, the game's runes on its blank face), its bone altar under a cloth with a red hem (the code's candles kept,
  the blood runes gone under the cloth), all three by look name (`urn_<look>`); made floor faces (`floorFaces`,
  `tools/art/floortile.py`: the picture's steps of light, painted in the room's own floor colours) for the boss rooms
  (large calm slabs, `bossFloor`) and the collapsed crypt (irregular broken stones; a first face of slabs in a grid fell
  on the tiles' and read as a grid); the merchant's ward circle a mask from a made picture, its runes the Wardens'
  glyphs, drawn rather than added, under a fainter column. A thrown potion's splash is a made picture (Tripo, a pool and
  its droplets in dark rims, glass beside it; `docs/art/items/splash.jpg`) cut out and turned into tones at the texel by
  `tools/art/splash.py` (`decals.splash` and the Cracked Retort's wider `splash_wide`): the game paints its liquid in the
  potion's colour in four flat steps, its rims leaning to the floor's shadow (floor 3's own deep violet there), its glass
  as the shards, under the ring; it spreads in a tenth of a second and fades in the ring's flat steps. Without it
  (`?assets=off`) the stepped dark edge stays under the ring. Painted once a colour and floor from its picture's tones
  (`CFG.alchemy.splashLook`), it lies a texel to a game pixel while it shows, flipped at random but never turned (a turn
  would break the texel grid), and the Retort's splash lies the wide picture as it is.
- **The waystone room's rubble** is the Wardens' cairns (2026-10-23): flat stones of the waystone's own cool grey stacked
  smaller to the top, each turned a little, a rune faintly lit amber on the capstone (`CFG.waystone.cairn`), so they
  read as set up by hand while the room waits dark, not as rubble. They stand and break as the rubble did.
- **Kept from code:** a thing's inner lines only at a deeper step (`thingGap`: a bottle's edge pixel sat outside its
  line), darker bottle glass, the lodestone shard's pale cyan veins, artifacts' smaller darker halos and thin parts two
  pixels, the lighter blob under the pedestal and the briar, Fen-Nex outlined.
- **Pits, on every floor** (from the room inspection): a hole with a hard edge, the room's floor darkened in its depth and
  its inner wall under a lit lip along the far side (`CFG.surface.pit`); a soft black blur read as a blot, not a pit.

### 4.21 Floor 3's items (2026-10-22, accepted by the owner)

A survey of every item on floor 3's red-brown floors with their orange cracks found what sank into them. Where a fix
belongs to floor 3 alone it is in its look (`items` in data/floors.json, and its `materials`); the rest hold on every
floor and were checked on floors 1 and 2.
- **Floor 3's own:** the coin purse in a dark leather with a brimstone clasp (the oxblood was red on red); the made
  pedestal tinted to a darker stone (its ochre was the cracks' colour); a splash's edge a deep violet near black under
  its ring (the floor's shadow colour was the floor's own value); a pale lilac halo for the dark and red artifacts (a dark
  halo vanished, a red one merged); the sealed urn's stone a little lighter (the darkest thing in the room); the garden
  burnt: ashen leaves and stalks, ember, ash-pale, brimstone and violet blooms, ash where moss lay.
- **On every floor:** a small stepped glow behind a heart; ember salt grown on a dark cinder lump; the warden's ash in
  a grey stone urn; a dark rune glyph (the vein's red) with a pale core down its strokes; a splash's ring lifted to a
  lightness of its own at least (the hex brew's dark violet now a lighter violet); the Candle Moth's and the Weeping
  Skull's halos smaller, both outlined as Fen-Nex is.
- **Left as they are:** the indigo shape at the mage's heel is Fen-Nex (the Rune Fox at the heel, its starry tail
  long); the garden's slate-blue pool is the pools' (world/pools.ts).

### 4.22 Fire, pools, steam and light on floor 3 (2026-10-22, accepted by the owner)

A survey of floor 3 (the burning crypt) found its fire and its soft glows lost in the floor's own ember cracks. The owner
took every fix; the code is shared, so each holds on every floor.
- **Burning ground** (a salamander's trail, the phoenix's dive, the djinn's landings, liquid ember, the dev menu's):
  pixel flame tongues in a few frames, stepped from a dark rim to a pale brimstone core, over a ragged charcoal scorch
  in the floor's shadow colour (`floorShade`); the sparks off it small (`CFG.foeGround.fire`, `render/pixelFire.ts`).
- **Pools:** water's and oil's surface a flat tone with a few hard pixel ripples (`CFG.surface.poolArt`); oil matt;
  burning oil drawn as charcoal and ember cracks under tongues of flame, licking in frames (`burnFrames`); ice cracks a
  pixel thick.
- **Steam:** clipped to the cloud's round shape and its room's width, drawn over what stands in it (a wall cut it into
  a rectangle with a stepped corner); the thick of each puff lit at its top left and shaded at its bottom right, never a
  flat white disc. A fog of darkness (the Shadowstep Tincture, a miasma) dithered as steam is, never solid: see-through
  puffs piled up into a soft purple blur (`CFG.steamLook`).
- **Light:** a boss's halo a round stepped pool of light on the floor under it (`CFG.pixelLook.haloPool`), not a glow
  standing behind it that cut into floor and wall as a lit box; the garth's daylight one flat stepped band over a round
  pool; moss and stains in flat steps with a hard edge (`blotch`). Floor 3's wall torches (2026-10-23): their glow a
  round glow in hard bands, smaller, where the soft one stood (`CFG.pixelLook.torchHalo`, by floor look: the soft glow
  read as a lit box on the burning crypt's walls). Daylight, on every floor (2026-10-23): a shaft keeps
  `CFG.themes.daylightDry` tiles (two) from any water or oil where the room has floor for it (in the overgrown garden it
  fell into the middle pool, its band cut off at the pool's edge and its pool of light sunk under the water).
- **Foes:** the phoenix's ashes a heap of flat-shaded grey lumps with ember specks (`CFG.foeLook.ashes`); the salt
  golem's pale made body takes a third of the burn's tint and a softer hit flash, its wax running off in drips
  (`CFG.foeLook`); the rubble golem's falling stones warned by a warm ring two pixels thick that fills as the stone
  falls (`CFG.foeGround.fallWarn`).

### 4.23 Floor 3 in the game: its rooms (2026-10-22, accepted by the owner)

Floor 3, the burning crypt, in its palette (4.1: ember and charcoal, violet shadows, brimstone the accent): its floor
and wall colours, a fill light of 1.3, the grade in its own shadow (`#2d1f3d`), the kit's materials in its ramps, and
plain rooms strewn with embers, stains, bones, pebbles, cobwebs and a relic. The walkable floor's mean lightness is
about 37 % (measured as in 4.9). Its six relics are made in Tripo (a charred beam, a toppled brazier, a wax mound, a
brimstone cluster, scorched bones, a slag heap; the wax darkened), its bricks and charred beams are made faces
(`docs/art/walls/burning-*.jpg`; its basalt stays drawn, since its seams glow and a picture's did not), its boss rooms
lie on large calm charred slabs and its collapsed crypt on broken stones (made floor faces), and it has its own urn
(charcoal clay with a brimstone band, painted, not lit) and bone altar (black basalt under a brimstone cloth).

### 4.24 Floor 3's foes and bosses made in Tripo (2026-10-22, accepted by the owner)

Eleven foes of floor 3 wear Tripo models moved whole by code (4.19), sized near their looks in code: the salamander,
the magma ooze (its floor disc kept), the hex imp (its hex circle kept), the cinder hornets and their nest in the wall,
the cinder djinn, the rime drake (its frost ring kept), the phoenix, the basilisk, and the salt and rubble golems (their
torso the model, so a slam shows). The War-Tiger and the Twin Guardians, bosses of floors 3 and 4, wear models through
`madeBosses.ts` as the Abbess and the Pyre Knight do, their fights' crouches, pounces and rearing carried onto the model;
the tiger's frost circle, ring, halo and rime are kept, and its falling plates no longer show on the still model. The
second guardian has its own model (a forked beard, a fan crest, cooler stone), as its look in code differs; a crouched
guardian's eyes sit high on its face (`eye`). The salt golem and the tiger were darkened, the salamander, imp and djinn
set larger than first made.

### 4.25 Figures and spells on a dark warm floor (2026-10-22, accepted by the owner)

From floor 3's survey: a made model's surface takes a `tint`, a `lift` and `hot` (4.19; the ember hornet, the
basilisk, the rubble golem and the Pyre Knight, whose black cloak read as a hole: it is violet slate now, on floor 2
too); every foe's telegraph and its shots' halos are drawn in hard bands; the Hex Bolt and the hex imp's shots a hot
core in a deep violet sheath ringed in dark (4.15's rule); the Thorn Snare's brambles lit lime as the Living Wall's;
the Lantern of Vigil larger and lit; the Wardlight's motes in Hallow's gold with a dark edge.

### 4.26 Floor 4 in the game: its rooms (2026-10-22, accepted by the owner)

Floor 4, the reliquary, in its palette (4.1: ivory and gold over deep blue): its floor toned to the lightness this bible
asks of a floor, deep-blue mortar and shadow (`#1f2546`), the grade in that shadow, a fill light of 1.0, a warm pale
flame, the kit's materials in its ramps, and plain rooms strewn with candles, coins, pages, stains, bones and a relic. Its
walls are made faces: ivory marble, gilded panels (their own navy and gold kept, since the floor's wall tone washed them
out) and gothic tracery; the tops of blocks carved inside a room wear the marble (`wall.cap`). It has its own urn (deep
blue clay with a gold band) and bone altar, made in Tripo. Its six relics are made in Tripo (a gilded reliquary, a fallen
saint, a candle stand, a coin heap, a fallen bell, a prayer-book stand); five stand in the way and one lies on the floor.
The fallen saint was laid down and the gilded reliquary brightened after the survey.

### 4.27 Floor 4's foes and the Hart made in Tripo (2026-10-22, accepted by the owner)

Eleven foes of floor 4 wear Tripo models moved whole by code (4.19). The wick mouse's pale fur is darkened off the ivory
floor (`tint`) while its candle flame glows of itself, as dark bodies with bright features read at play distance.
The frost scarab was made without a ball, so its snowball stays the code's. The radiant eye was remade in gold rings with
slate wings, the candle stand with lit candles, the wick mouse with a big candle flame. The griffin faces its heading and
rolls less (`roll`): rolled far, a wide wing stood on end under the camera. The Hallowed Hart goes through the
made-boss path (`madeBosses.ts`), its floor circle, ring and halo kept, its texture baked at its drawn height; its stride
bobs it and its charge lowers its antlers.

### 4.28 Magic on a pale floor (2026-10-22, accepted by the owner)

On a light floor added light burns white and a pale body shows only its outline. The rule (`CFG.paleFx`, floor 4 only, so
floors 1 to 3 stay as accepted): effects are drawn, in a deep school tone over an edge in the floor's shadow colour,
stepped, never added. Drawn this way: foes' telegraphs and ground rings, the Hart's lane (in its own gold) and the
griffin's line, hallow shots in deep gold with drawn halos, black ice in hard steps, lobbed snowballs and coals (shaded,
outlined, warned where they land), the radiant eye's ray as a stepped gold beam, a deep-gold stun, rime, webs and pollen in
deep tones, blob shadows capped, the vault's ward seal drawn dark, and pickups and artifacts on a dark halo with the key
and the souls in deeper colours.

### 4.29 Floor 5 in the game: its rooms (2026-10-22, accepted by the owner)

Floor 5, the shore, in its palette (4.1: mist, frost and dark water, a lantern's amber): its floor lifted to the lightness
this bible asks of a floor, deep-blue mortar and shadow (`#141f33`), the grade in that shadow, a fill light of 1.0, an
amber torch and lantern light, the kit's materials in its ramps, and rooms strewn with pebbles, stains, rime, bones, lamps
on poles, ropes and a relic. Its walls are made faces: slate, dry stone and pilings. It has its own urn (dark blue clay
with an amber band) and a boat-hull altar, darkened after the survey, the stone a shade deeper. Lamps burn amber from the
look and stand clear of rocks and walls: a lamp stands only where its eight neighbours and the tiles north of it
(`CFG.themes.lampNorth`, where its tall pole rises before the camera) are free floor, and keeps them to itself, so it
never shares a tile with a rock, a pillar or a relic. Its six relics are made in Tripo (a wrecked skiff, a mooring post,
a net heap, broken oars, a ferry lantern, a frozen cairn); four stand in the way, the net heap and the oars lie on the
floor (the oars, first dropped because the model stood upright, came back laid flat on 2026-10-23).

### 4.30 Floor 5's foes and the Deep Angler made in Tripo (2026-10-22, accepted by the owner)

Ten foes of floor 5 wear Tripo models moved whole by code (4.19). The hydra stays built in code: its necks cut and its
stumps seared are its fight, and a model cannot show them. The lantern tortoise is a shell alone, its head and legs kept
as built, so it is seen to shut itself in, and its lantern is lit above the shell. The gloom raven faces its heading. The
frost jackalope and the glacier golem are toned down (`tint`) off the mist, and the dark ones (rootling, void mote, gloom
raven, the Angler) are lifted (`lift`) with a light of their own, as dark bodies with bright features read at play
distance. The hydra's stumps are larger with a raw red cut, a seared one capped in charcoal with embers; the rolling
pangolin rocks instead of spinning (spun whole it showed its underside), and lies in a dithered dust puff when dazed. The
Deep Angler goes through the made-boss path (`madeBosses.ts`) at its drawn height: it swims, swells as it calls its ring
and rears as it gapes. Its lamp, ring and halo are kept as code: the lamp amber in stepped bands, the ring kept facing
the camera, the halo pool capped.

### 4.31 Magic on a dark floor (2026-10-22, accepted by the owner)

On the shore light added to frost burns pale foes white, and black or pale effects are lost on its mist and dark water.
The rule (`CFG.shoreFx`, floor 5 only, so floors 1 to 4 stay as accepted): dark effects get a violet or umbral band with a
rim, frost is held deep, and nothing is a lit box. Drawn this way: foes' telegraphs in the school's light in bands to an
edge in the floor's shadow colour, over what stands round them; rime a deeper frost in 2-pixel crystals; black ice in
hard steps; spores in flat bands; the gloom raven's gloom in umbral bands with a violet rim; the scorch a charcoal of its
own; the Deep Angler's lamp in amber bands; and pickups and artifacts on a pale lilac halo.

### 4.32 Fen-Nex made in Tripo (2026-10-23, for the owner to see)

Fen-Nex, the Rune Fox and its full shape, are rigged Tripo creatures (docs/creatures.md, "A familiar as a creature").
The rule that changes: as its creature it is drawn as an **actor** (the closed outline and the rim of 4.12, its light in
steps), as the bosses' creatures are, not as a thing; its look in code stays a thing. What the texture paints (runes,
swirls, the starry plume, the flame-tipped feathers, the leg spirals) is not built again in code; its glows are (eyes,
paw mist, the plume's aura and stars; the mouth and the tail flame's glow, embers), riding its bones. At its size its
texture bakes to 64 texels a side, so the fox's thinnest cyan lines are not kept lit (`glowShare`): its glows carry it.

## 5. The reference pictures

The owner's five pictures (2026-10-15), in `docs/art/reference/`. They are measured over the whole picture, the magenta
keying background left out:
- **Mean light:** the mean lightness of all pixels.
- **Near black:** the share of pixels with lightness under 8 %, as in section 2.
- **Shadow → light hue:** the shadow hue and the light hue, as in section 2. The thresholds differ a little here:
  dark pixels count from 8 to 25 % lightness, light pixels from 55 %.

| Picture | Taken for (the owner) | Mean light | Near black | Shadow → light hue |
| --- | --- | --- | --- | --- |
| `1-cat-spellsheet` | The sprite sheet and the animation made from it in Godot-Tamer | 46 % | 0 % | 192° → 83° |
| `2-ranger` | Colour and the drawing; its proportions for the game's humanoids | 38 % | 1 % | 36° → 25° |
| `3-cave` | Light and shadow, a good palette and contrast | 34 % | 6 % | 201° → 119° |
| `4-meadow-path` | Overall quality; many colours and contrasts among similar objects | 47 % | 1 % | 122° → 54° |
| `5-meadow-wild` | As 4 | 49 % | 1 % | 123° → 66° |

The same measure over the whole frame of two of today's rooms, the void around the room included: the chapel nave
has a mean light of 10 % and 60 % near black, the ossuary 8 % and 68 %.

Owner's direction (2026-10-15):
- **Outlines:** hard, as in Godot-Tamer.
- **Light and dark:** balanced, in the manner of Hades, Moonlighter and Sea of Stars.
- **The key light:** from above.

The decisions taken from them are in section 4.

## 6. Working method

Taken from Godot-Tamer:
1. **Ramps:** a new piece takes its ramps from its floor's palette (4.1), or extends them with the same hue shift (4.2).
2. **Drawing:** draw or reduce at the texel; generator art is reduced by majority colour a block, with no blending.
3. **Checks before the owner sees it:** shadows cooler than lights, the darkest colour not black (outlines aside),
   outlines closed where 4.4 asks for them.
4. **Rooms:** a room is checked at play size against 4.3 (mean lightness, the share near black). Use the measure from
   section 2, taken on the room's floor, not over the whole frame.
5. **The owner sees it first:** an enlarged preview, and the game beside it, before anything replaces an old look. The
   look that loses is deleted in the same step (CLAUDE.md).

## 7. The proof (R3 step 2, 2026-10-15)

The mage (`hero_default.glb`), the Gloom Weaver (a new Tripo model: `docs/assets.md`, asset log) and the Hollow Warden
(`creatures/owlbear.glb`) drawn both ways, and `chapel_nave` both ways; the pictures are in `docs/art/proof/`, the tools
and the commands in `tools/art/README.md`. The owner's page: https://claude.ai/artifact/5wAZAKsgyuzLZHzfAgsYpm

**How each route was drawn.** Both from the same GLB, the game's camera (45 degrees, 48 game pixels a unit), four
facings and the light of 4.5. Route B: Blender, rendered twice as large, box-filtered, its colours smoothed by a
majority vote. Route A: three.js at the game pixel, each pixel mapped alone (what a shader can do). Then the same
mapping for both (`tools/art/pixelize.py`): colour families clustered from the texture, a ramp a family turned 25 to 50
degrees toward floor 1's shadow and 8 to 16 toward its highlight, the step from how lit the pixel is, a closed outline.

**Actors** (outline closed in every frame; the darkest colour OKLab L 0.2, not black):

| Subject | Colours | Shadow to light hue (OKLab, the ramps) | Notes |
| --- | --- | --- | --- |
| The mage | 60 | B 328° to 54°, A 322° to 30° | Already chibi (4.7). Route B's face reads a little better. |
| The Gloom Weaver | 48 (A 45) | B 289° to 310°, A 292° to 326° | Seen from above, the legs hide under the body; the outline carries it. For the foe: brighter eyes and rune, legs spread wider. |
| The Hollow Warden | 42 | 299° to 330° | Its texture is nearly white (pale bodies wash out, section 1): both routes wore the same darker recolouring; its blotches come from the texture. |

In motion route A flickers a little more (each frame mapped alone); the game's texel-baked textures will calm it.

**The room** (on the walkable floor, as in section 2; the targets of 4.3: 30 to 40 %, at most 8 % near black):

| `chapel_nave` | Mean lightness | Near black | Shadow to light hue |
| --- | --- | --- | --- |
| Today | 15.1 % | 37.3 % | 17° to 26° |
| The code kit, recoloured to floor 1 by lightness | 32.4 % | 0.0 % | 249° to 28° |
| Generator tiles (one round of floor, one of wall), lit in steps | 41.0 % | 0.0 % | 249° to 27° |

Cost: 69 Studio credits (the Weaver's lock 8, model 25, rig 20; floor and wall tiles 16), no rerolls; its walk (10)
was not yet booked when the balance was read.
