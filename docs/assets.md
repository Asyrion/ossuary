# Asset creation guide

How Ossuary's art gets made and gets into the game: which tool does what, the house style, the budgets
each kind of asset has to fit, and the pipeline from a first image to a model in a room. The GDD (Art, camera
and audio; Asset list) says what the game needs; this file says how to make it. Tripo's export settings stay
in the owner's Tripo asset checklist (claude.ai project "Tripo3D-GameDev"); keep the two consistent when either
changes. The first run through this pipeline is milestone M3.5 (`docs/M3.5-plan.md`).

Written 2026-09-28. Everything here is a starting point to be corrected by the M3.5 pilot.

## Tools and what each is for

| Tool | Plan | Use it for | Not for |
| --- | --- | --- | --- |
| MidJourney | Standard | Concept art for props, creatures and artifacts; the house style reference (`--sref`); seamless floor and wall textures (`--tile`); painted icons; title and loading art | Final 3D; anything with legible text |
| Tripo3D | Master | Turning a concept image (or several views) into a textured 3D model; texturing and re-texturing; lowering the face count; rigging and animating characters; its own image models for concepts and alternative views | Flames, light, magic and particles (made in code); tiling floor and wall textures |
| Other image models (Tripo's own, Gemini / Nano Banana and others) | As available | Alternative concepts, front, side and back views of one design for better 3D, edits (clean background, change a pose, fix a detail) | Skipping the style check |
| Code | | Lights, torch flames and flicker, bolts, spell and glyph effects, particles, glows, decals, the cracks, stains, bones and puddles drawn over the floor, the whole UI | |

Images move freely between tools: a MidJourney concept can be edited in another image model, turned into
views in Tripo, and made into a model there. What keeps the look together is not the tool but the house
style reference, which goes into every image made in any tool, and the style check before anything becomes
3D (see Pipeline, step 3). Note which tool made which image (the asset log below): it's needed for the credits
and for making a matching asset later.

## House style

The GDD's art direction, as rules for images:

- **A candle-lit cutaway diorama with painted miniatures.** Objects read like hand-painted tabletop pieces:
  clear shapes, slightly exaggerated proportions (chibi for characters), visible brush texture, gentle
  edge highlights. Not photorealistic, not glossy, not cel-shaded.
- **Materials:** worn stone, old bone, dark iron, tarnished brass and bronze, wax, clay, parchment, rotting
  wood, verdigris.
- **Palette:** worn stone browns, torch amber for the mage's magic, verdigris greens for the undead, violet for
  wisp magic, rust red for bosses; pale ward blue (#8ab8ff) for seals and wards. Keep colours muted: the
  game's torchlight adds the warmth.
- **Even, flat lighting on textures.** The game lights every scene itself; light or shadow baked into a
  texture fights it. Ask for soft, even studio light and no cast shadows.
- **Readable from above and far away.** The camera looks down at 45° from about eight tiles away, and a prop
  is 30 to 60 pixels tall on screen. Big shapes and clear silhouettes matter; detail smaller than a finger at
  the object's scale is lost.
- **Avoid:** text and letters, modern or sci-fi materials, bright saturated colours, heavy outlines, busy
  noise, anything that only works from one angle.

**Style references.** Every new image uses the house style reference; record each one here so any tool
can use the same:

| Name | Reference (MidJourney `--sref` code or image) | Use for | Since |
| --- | --- | --- | --- |
| House style | (to be set in M3.5, step 2) | Everything | |

Where a tool takes a style or reference image rather than a code, give it the reference images this
table points to.

**Prompt pattern** (adapt freely; the parts that matter are the object, the miniature look, the clean
background and the reference):

```
<object, one sentence: what it is, what it's made of, one telling detail>, painted tabletop miniature,
dark medieval fantasy crypt, muted colours, soft even lighting, no cast shadows, single object centred,
whole object in frame, three-quarter view from slightly above, plain neutral grey background
--sref <house style> --ar 1:1 --style raw --no text, letters, floor, scene, frame
```

For Tripo image-to-3D the input image should show one object whole, on a plain background, lit evenly, from
the three-quarter view above (props) or from the front in an A-pose with arms away from the body
(characters). Front, side and back views of the same design, when a tool can make them, give better 3D than
one image.

## Budgets and specs

The game has to hold 60 fps on integrated graphics (GDD: performance target) with a room of 10 to 20 props,
several enemies, particles and eight lights. Budgets per kind:

| Kind | Examples | Triangles | Textures | Rig | Size in the game | File |
| --- | --- | --- | --- | --- | --- | --- |
| Hero | the mage | up to 25,000 | 1,024 px | yes: idle, run, walk, cast, hit, death (+ drink, eat) | 1.3 units tall | `public/assets/hero_default.glb` |
| Enemy | rotling, wisp, crypt hound | up to 8,000 | 1,024 px | yes: idle, move, attack, hit, death | 0.8 to 1.2 units | `public/assets/enemies/<id>.glb` |
| Boss | warden, abbess, knight | up to 15,000 | 1,024 px | yes: as enemies, plus 1 or 2 attacks | about 2 units | `public/assets/bosses/<id>.glb` |
| Small prop, repeated | urn, coffer, chest, pedestal, obol, key | up to 2,000 | 512 px | no | urn 0.6 tall; pedestal 0.7 tall, 0.8 wide | `public/assets/props/<id>.glb` |
| Large prop | tomb, altar, statue, brazier, shrine stone | up to 4,000 | 1,024 px | no | tomb 0.8 × 1 to 3 tiles, 0.55 tall | `public/assets/props/<id>.glb` |
| Artifact | Ember Sigil on its pedestal | up to 3,000 | 512 px | no | 0.3 to 0.45 units, floating | `public/assets/artifacts/<id>.glb` |
| Floor and wall texture | crypt flagstones, drowned bricks | | 1,024 × 1,024 seamless tile, colour only (a normal map optional) | | 1 tile of the texture = 1 floor tile | `public/assets/textures/<floor>/<part>.jpg` |
| Icon | artifacts, later spells and potions | | 256 px source, 128 px shipped, transparent background | | shown at 28 px (HUD) and 44 px (lore card) | `public/assets/icons/<id>.png` |

Conventions for models: one object per file, facing +Z (towards the camera), standing on y = 0, centred on
the origin, real proportions (the game scales a prop to its size above, so absolute size doesn't matter).
Textures embedded in the GLB. Opaque materials (JPEG drops transparency). File names in lower case with
underscores, the id the game uses (`urn.glb`, `ember_sigil.glb`).

## Pipeline

Nine steps from a brief to an asset in the deployed game. Who does what: **owner** (Azyrion) or **Claude**.

1. **Brief** (Claude, on request). What the asset is, which placeholder it replaces, where it's seen, its
   kind and budget from the table above, and anything special (an urn breaks into shards, a chest has a lid
   that opens, an artifact floats and turns).
2. **Concept** (owner). Images with the house style reference, in MidJourney or any other image model; pick
   one design. For 3D, make front, side and back views of it if a tool can.
3. **Style check** (owner, Claude on request). Put the chosen image next to the reference images and a game
   screenshot of the room it's for. Does it look like the same set of miniatures? Colours muted, even light,
   shape readable when shrunk to 50 pixels? If not, back to step 2.
4. **Clean input** (owner). One object, whole, on a plain background, no cast shadow, upscaled if small.
5. **3D** (owner, in Tripo). Image or views to 3D; texture it; lower the face count to the budget if Tripo
   offers it (otherwise the preparation script does it); for characters, rig and animate, naming clips as the
   Tripo checklist says.
6. **Export** (owner). GLB with embedded textures, named `<id>.glb`. Upload it to the session with the concept
   image, and say which tools made what.
7. **Prepare** (Claude). `npm run prepare-asset -- <file> --kind <kind>` shrinks textures to the kind's
   size, lowers the face count to its budget, and reports: triangles against the budget, size and
   proportions, where the base sits, whether it faces +Z, textures, and for characters the clips and the roles
   the game gives them. Anything over budget or wrong is fixed here or sent back to step 5 with the reason.
   (The `--kind` option and the checks arrive in M3.5, step 1; today the script only shrinks textures and
   reports on characters.)
8. **Integrate** (Claude). The file goes to its folder, a line in `data/assets.json` says which placeholder it
   replaces and how big it is, and the game loads it, falling back to the placeholder if the file is missing
   or broken. Screenshots in all three floor looks, and the frame rate and triangle count from the dev menu.
9. **Review and record** (both). Owner checks the screenshots (or the Pages site) and accepts or sends it
   back to a named step. Accepted assets get a row in `CREDITS.md` (tool, plan) and in the asset log below.

**Example: the urn.**
1. Brief: replaces the procedural clay urn (`addUrn` in `src/world/rooms.ts`); small repeated prop, up to 2,000
   triangles, 512 px; about 0.6 units tall; up to eight in a room; bolts break it, so the model is only the
   whole urn (the break stays a burst of shards in code); the rune-sealed urn is the same model with a
   darker, bluish material and a ward band added in code.
2. Concept in MidJourney: `a squat clay funerary urn with a round lid and a chipped lip, finger-pressed
   ridges around its belly, painted tabletop miniature, ... --sref <house style> --ar 1:1 --style raw`, four
   variations, pick one; three views of it with another image model.
3. Style check: next to the reference and a screenshot of `?room=secret_cell` (which has urns).
4. Clean input: background removed, 1,024 px.
5. Tripo: views to 3D, textured, face count lowered to about 1,500.
6. Export `urn.glb`, uploaded with the concept image.
7. `npm run prepare-asset -- urn.glb --kind prop`: 1,480 triangles (budget 2,000), 1 texture at 512 px,
   0.62 × 0.63 × 0.61 (height 0.63), base at y = 0, facing +Z.
8. `public/assets/props/urn.glb`, `{ "urn": { "file": "props/urn.glb", "height": 0.6 } }` in
   `data/assets.json`; screenshots on floors 1 to 3; a room with eight urns still at 60 fps.
9. Accepted; `CREDITS.md`: "urn.glb, made by Azyrion in MidJourney (Standard) and Tripo3D (Master)".

**Floor and wall textures** follow the same steps, without 3D. The concept is the texture: MidJourney with
`--tile` and the house style, top-down, evenly lit, no objects on it. The check is a 2 × 2 repeat for seams
(Claude makes the preview) and a screenshot with the game's own cracks, stains and bones over it. Each floor
look in `data/floors.json` then names its textures, and the procedural texture stays as the fallback.

**Icons** also follow them without 3D: one object, centred, a strong silhouette on a dark or plain
background, cropped square, background removed, 256 px kept and 128 px shipped. The check is how it reads at
28 px on the HUD and 44 px on the lore card, and with the red (cursed) and pale (cleansed) rings. An icon can
also be rendered from the artifact's 3D model instead of painted; the pilot tries both.

## Asset log

Every asset made for the game, from its first image to acceptance. Placeholders stay in the game until an
asset is accepted.

| Asset | Kind | Replaces | Tools | Style reference | Status |
| --- | --- | --- | --- | --- | --- |
| Hero (`hero_default.glb`) | hero | the 0.3 hero | Tripo3D | | in the game |
| Urn | small prop | procedural urn | | | planned (M3.5) |
| Pedestal | small prop | procedural pedestal | | | planned (M3.5) |
| Ember Sigil | artifact | gem placeholder | | | planned (M3.5) |
| Crypt floor | texture | procedural floor, floor 1 | | | planned (M3.5) |
| Ember Sigil, Bone Lens and Mask of the Drowned icons | icons | SVG placeholders | | | planned (M3.5) |
