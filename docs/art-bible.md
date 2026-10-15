# Art bible

**Draft, R3 step 1** (`docs/RESET-plan.md`, Phase 3). The rules every picture in Ossuary follows: rooms, foes, the mage,
effects, the HUD. Made with the owner from three or four reference pictures. Until the owner approves it, the house style
in `docs/assets.md` and the colour rules in `docs/effects.md` still hold. Once it is approved, this file replaces them,
and they point here.

Sections marked **Open** wait on the owner's choice. The rest is fixed by the game as it is, or measured.

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

## 4. Open: the decisions

Each one is taken with the owner, from the reference pictures (section 5) and side-by-side shots.

1. **Palette per floor.** For each floor, its base ramp, its accent and the hue its shadows lean to:
   - floor 1, the crypt: chapel, ossuary, scriptorium, pilgrims;
   - floor 2, the drowned floor: cistern, grotto, mausoleum;
   - floor 3, the burning floor: embalmers, ossuary, bells;
   - floor 4, the reliquary: treasury, reliquary, chapel;
   - floor 5, the shore: landing, cistern;
   - the Seal and Kaelith;
   - the Vigil.
2. **Hue shift.** Whether the torchlit warm-to-black ramp gives way to warm lights over cool shadows (Godot-Tamer's rule),
   and how far.
3. **Darkness.** How much of a room may be near black, and how dark a dark room may get (today: up to 43 %).
4. **Outlines.** Today the renderer draws one dark outline where a near surface stands before a far one. The choices: a
   closed outline tinted per material on actors, objects outlined or not, terrain left without.
5. **The key light.** Where it comes from (today: torches on the walls and the mage's own light), and whether a fixed
   key from one side is added.
6. **How loud the HUD is.** Framed panels, pixel-art icons, and how much of the screen they take (R3 step 5).
7. **The route for actors.** Code-drawn and Tripo models at the texel (today), or sprites baked from 3D (Godot-Tamer's
   pixelize route). R3 step 2 decides this from the proof.

## 5. Open: the reference pictures

Three or four pictures the owner chooses, each with what to take from it (colour, light, outline, mood). Once they are
here, they are measured as in section 2.

| Picture | Taken for | Measured |
| --- | --- | --- |
| | | |

## 6. Working method

Filled in once the decisions in section 4 are taken. Godot-Tamer's method is the model:
- ramps taken from the reference palettes;
- checks against the tables (hue shift present, darkest colour not black, texture in range, outlines closed);
- the owner sees an enlarged preview before anything goes into the game.
