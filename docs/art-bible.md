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
