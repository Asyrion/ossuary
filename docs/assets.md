# Asset creation guide

How Ossuary's art and sound get made and get into the game: which tool does what, the house style, the budgets
each kind of asset has to fit, and the pipeline from a first image to a model in a room. Sound has its own section
(Sound: sources, licences, the house sound, specs and its pipeline). The GDD (Art, camera
and audio; Asset list) says what the game needs; this file says how to make it. Tripo's export settings stay
in the owner's Tripo asset checklist (claude.ai project "Tripo3D-GameDev"); keep the two consistent when either
changes. The first run through this pipeline is milestone M3.5 (`docs/M3.5-plan.md`).

Written 2026-09-28. **Changed 2026-09-30:** the owner is happy with the models and textures built in code, so
everything in the game is built in code in the pixel look, in the style of the spell effects (`docs/effects.md`):
creatures, familiars, the room kit (objects, mechanisms, floors, walls), artifacts and icons. Tripo, and the image
tools, house style and pipeline below, stay for special models: the mage, and bosses where wanted. The M3.5 pilot of
Tripo props was dropped (`docs/M3.5-plan.md`).

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

- **A candle-lit cutaway diorama in pixel-art 3D** (the GDD's look, decided 2026-09-30). The game draws every model
  at the room kit's texel (since 2026-10-01: a 48th of a unit a game pixel, the floors' and walls' own) and blows it
  up, with outlines; tiles, icons and effects are drawn as pixel art, and concept art for Tripo is clean cartoon:
  clear shapes, slightly exaggerated proportions (chibi for characters), flat areas of colour, gentle edge highlights.
  Not photorealistic, not glossy.
- **A Tripo model in the game** is drawn as pixel art too: its texture baked into its vertices and cut down to a few
  colours, its light in flat bands (`src/actors/heroPixel.ts` does it for the mage; a boss from Tripo would go the same
  way). A model reads best there when its colours sit in large flat areas: fine painted strokes are lost at some 45
  pixels tall, and many tiny texture islands can't be shrunk cleanly.
- **A rigged creature from Tripo** (2026-10-03, the owlbear) is animated and voiced in code, not in Tripo:
  `docs/creatures.md` is its guide (reading the rig, the recipe, `npm run animate-creature`, the preview, the dev menu's
  three looks). The tool also mends what Tripo's export gets wrong: the skin weights, the faces it leaves inside out and
  the texture's islands without a gutter.
- **Materials:** worn stone, old bone, dark iron, tarnished brass and bronze, wax, clay, parchment, rotting
  wood, verdigris.
- **Palette:** worn stone browns, torch amber for the mage's magic, verdigris greens for the undead, violet for
  wisp magic, rust red for bosses; pale ward blue (#8ab8ff) for seals and wards. Keep colours muted: the
  game's torchlight adds the warmth.
- **Even, flat lighting on textures.** The game lights every scene itself; light or shadow baked into a
  texture fights it. Ask for soft, even studio light and no cast shadows.
- **Readable from above and far away.** The camera looks down at 45° from about eight tiles away, and at the
  texel (the game's grid since 2026-10-01) a prop is 15 to 30 game pixels tall (the mage about 45). Big shapes, clear
  silhouettes and a few flat colours matter; detail smaller than a hand at the object's scale is lost.
- **Avoid:** text and letters, modern or sci-fi materials, bright saturated colours, outlines drawn into a
  texture (the game draws its own), busy noise, anything that only works from one angle.

**Style references.** Every new image uses the house style reference; record each one here so any tool
can use the same:

| Name | Reference (MidJourney `--sref` code or image) | Use for | Since |
| --- | --- | --- | --- |
| House style | (none yet: set when the next special model is made in Tripo) | The mage, bosses where wanted | |

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
| Coin face | the obols, later coins of other kinds | | 512 px or more kept (the coin across), shipped at 48 px (the face) and 24 px (its icon), 16 colours, hard-edged | | a coin 24 game pixels across, facing the camera (0.5 units; 28 until the owner asked for it a little smaller, 2026-10-02), its face on the fine layer (two pixels to a game pixel) | `public/assets/coins/<id>.png`, `<id>-icon.png` |

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
7. **Prepare** (Claude). `npm run prepare-asset -- <file> --kind <kind> --id <id>` holds the model to its
   kind's budget (in `data/assets.json`) and writes it to the kind's folder. Each check passes, warns, fails, or
   was fixed:
   - **fixed** by the script: a model off its centre or not standing on y = 0 is moved; a character facing -Z
     (told from its hand bones) is turned round; too many triangles are lowered to the budget (meshoptimizer);
     textures are shrunk to the kind's size, JPEG, or PNG where a material uses transparency.
   - **checked**: the units (a model a thousand times too small or large fails), proportions against the kind,
     the rig (a character needs one, a prop ignores one), textures under 256 px (blurry), transparency, a round
     base, and for characters the clips and the roles the game gives them.

   A failed check writes nothing and says what to change in Tripo (back to step 5). `--check` only reports.
   - **pixel art from its texture** (every Tripo model, the owner's rule of 2026-10-05): the texture is made pixel art
     at the size the game draws the model (`tools/texel-bake.ts`: at least one texel a game pixel, averaged within each
     UV island, glowing markings kept, painted shadows lifted, 24 colours) and written beside it as `<id>.texel.png` and
     `<id>.glow.png`. The game wears these, not the 2k texture: Tripo's painted detail doesn't read at the game's size.

   The script prints the line for `data/assets.json`, with the model's `texel` (a unit test fails for a model named
   without it). The mage alone keeps its vertex look (the owner's choice, 2026-10-05, after comparing them: its full mesh
   already carries its detail, and the bake only added speckle).

   **Concept images for Tripo** (2026-10-05): the bake keeps only what the texture holds at about 80 game pixels tall,
   so ask for big flat colour areas and strong light against dark between the parts, bold markings a few texels wide
   (eyes, stripes, a crest; a thin line vanishes), little shadow or grime painted in (the game shades the model itself),
   and a silhouette that reads at that size. Textures and icons go through `npm run prepare-texture`
   (below).
8. **Integrate** (Claude). The file goes to its folder, and a line in `data/assets.json` says which
   placeholder it replaces, how tall it stands and its baked texture (`texel`; `props`: the urn and the pedestal; `artifacts`, by artifact
   id; `floors`, a floor look's tile; `icons`, by artifact id). The game loads it at boot and falls back to
   the placeholder if the file is missing or broken, with a warning in the console. To check it:
   - the dev menu's Made assets section: what loaded, with triangles; "Show them here" puts urns and an
     artifact's pedestal ahead of the mage; "Made assets: off" rebuilds the floor with the placeholders to
     compare; "Frame readout" shows the frame rate, draw calls and triangles;
   - `?assets=off` plays with the placeholders only;
   - screenshots in all three floor looks.
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
7. `npm run prepare-asset -- urn.glb --kind prop --id urn`: 1,480 triangles (budget 2,000), 1 texture at 512
   px, 0.62 × 0.63 × 0.61, centred and standing on y = 0 (fixed: it was 0.2 off).
8. `public/assets/props/urn.glb` (and `urn.texel.png`, `urn.glow.png`), `{ "urn": { "file": "props/urn.glb", "height": 0.6,
   "texel": { "file": "props/urn.texel.png", "glow": "props/urn.glow.png" } } }` in
   `data/assets.json`; screenshots on floors 1 to 3; a room with eight urns still at 60 fps.
9. Accepted; `CREDITS.md`: "urn.glb, made by Azyrion in MidJourney (Standard) and Tripo3D (Master)".

**Floor and wall textures** follow the same steps, without 3D. The concept is the texture: MidJourney with
`--tile` and the house style, top-down, evenly lit, no objects on it.
`npm run prepare-texture -- <image> --kind floor --id <look>` makes it a 1,024 px square JPEG in
`textures/<look>/floor.jpg`, and checks it:
- a seam score (about 1 is seamless; 2 or more means a seam will likely show);
- the light spread between its brightest and darkest quarter (baked-in light shows as a pattern);
- a 2 × 2 repeat in `asset-previews/` to look at.

Then a screenshot with the game's own stains, bones and puddles drawn over it. A floor look's tile goes in
`data/assets.json` (`floors`); the game lays it on every floor tile, and the procedural floor stays as the
fallback. Walls go through `--kind wall` the same way, but the game doesn't use them yet.

**Icons** also follow them without 3D: one object, centred, a strong silhouette on a dark or plain
background, cropped square, background removed, 256 px kept and 128 px shipped.
`npm run prepare-texture -- <image> --kind icon --id <artifact id>` pads it to a square and writes the 128 px
PNG to `icons/<id>.png`. It warns when the background isn't transparent, and makes a sheet in
`asset-previews/`: the icon at 28 px (the HUD) and 44 px (the lore card), plain, cursed and cleansed, on the
game's dark background. The check is how it reads there. An icon can also be rendered from the artifact's 3D
model instead of painted. (Since 2026-09-30 the game's icons are rendered from the artifacts' models built in code,
`src/items/artifactIcons.ts`; a painted icon is for a special model's.)

**Coins** (2026-10-02, from the owner's coins in `inspiration/coins/`) follow them without 3D too: a coin's face, flat
and seen straight on, on a plain ground (white is fine) or cut out, 512 px or more across.
`npm run prepare-texture -- <image> --kind coin --id <name>` finds the coin (the circle across its width, so a shadow
under it is left out; it warns when the coin is taller than wide), cuts it from its ground and writes two PNGs to
`coins/`: the face at the fine layer's pixel (`images.coin.size`, 48: the game draws a coin's face finer than the rest,
two pixels to each of its 24 game pixels across, so a coin facing the camera is drawn pixel for pixel; the owner's
exception to one pixel for everything, 2026-10-02) in 16 colours with a hard edge, and its 24 px icon outlined in dark as the
artifacts' are. Its sheet in `asset-previews/` shows the face as the room draws it and the icon at 28 and 44 px. A coin
goes in `data/assets.json` under `coins` by a name of its own, and `obol` names the face the obols wear; the game
draws the obol as a coin `CFG.pickups.coinPixels` across tipped back to the camera, the face on both sides and its edge
in the face's rim colour, both on the pixel look's fine layer, and puts the icon on the HUD's counter, the lore card and the inventory. Without a face loaded, the obol built
in code (a rune stamped on gold) stays. The dev menu's Look tab (Made assets) switches the face the obols wear, kept
in the browser, and the Galleries tab stands every face side by side (`__game.obolFace`, `wearFace(id)`,
`coinGallery()`). Fine text doesn't survive 48 pixels: the coin reads by its rim's colour, the shape at its middle and
its larger runes.

## Sound

Where the game's sounds come from and how they get in. The GDD's Audio design says what the game needs to hear:
the four layers (music, ambience, effects, interface), the school palettes, floor soundscapes, adaptive music and
mixing rules. The Asset list's Audio table gives the counts. This section says how to get and make them. Written
2026-09-29, with the licence terms as they stood that day: **check a source's current terms before downloading or
subscribing**, since they change (AI music most of all).

Today every sound is synthesised in code (`src/audio/sfx.ts`) and each one stays as its fallback; since 2026-10-02 the
soundscapes and the music are made in code too (`docs/sound-plan.md`; `npm run render-audio` writes them to files to
listen to). Real sounds replace or join them in M8 (the final mix), or earlier for single effects once the pipeline below
has been tried.

### Sources

**Libraries of recorded sounds** (the backbone: real fire, ice, stone, bells, chains, water, bone):

| Source | What | Licence | Credit |
| --- | --- | --- | --- |
| [Sonniss GDC Game Audio Bundle](https://gdc.sonniss.com/) | A free bundle every year of professional effects in WAV (2026: 7.5 GB), plus an archive of earlier years (about 200 GB) | Royalty-free, commercial use, unlimited projects | Not required |
| [Freesound](https://freesound.org/) | The largest library of community recordings: ambience, foley, field recordings | Per sound: CC0, CC BY 4.0 or CC BY-NC (see the licence rule below) | CC BY: author, title, link and licence |
| [Kenney](https://kenney.nl/assets?q=audio) | Small game-ready packs: interface clicks, impacts, RPG sounds | CC0 | Not required |
| [Pixabay sound effects and music](https://pixabay.com/sound-effects/) | Effects and music | Pixabay Content License: commercial use, not sold on its own | Not required |
| [ZapSplat](https://www.zapsplat.com/) | A large effects library | Free account: use in games allowed, credit required; Premium: no credit | "Sound effects from zapsplat.com" (free account) |
| [OpenGameArt](https://opengameart.org/) | Game sounds and music by hobbyists | Mixed per file (CC0, CC BY, CC BY-SA, GPL): check each | Per licence |
| [Incompetech](https://incompetech.com/) (Kevin MacLeod) | A large catalogue of placeholder-quality music, including dark and ambient pieces | CC BY 4.0 | Author, title, link |

**Generating sounds with AI:**

| Tool | For | Licence by plan |
| --- | --- | --- |
| [ElevenLabs](https://elevenlabs.io/sound-effects) | Sound effects from a text description (good for magic that no recording has: "a glassy inhale of frost magic"); voices (text to speech, voice design) | Free plan: non-commercial only, and "elevenlabs.io" in the credit. Paid plans: commercial use, no credit |
| [Suno](https://suno.com/) | Music, including instrumental pieces | Free plan: Suno owns the songs, personal non-commercial use. Paid plans (Pro, Premier): you own what you make while subscribed, commercial use. It announced changes for 2026 under its Warner Music deal: check the terms when subscribing |
| [Stable Audio](https://stableaudio.com/) | Music and ambience loops, short effects | Free tier: non-commercial. Paid plans: commercial use |
| Udio | Music | **Not usable:** it closed downloads after its settlement with Universal Music (2025), and generated works belong to Udio |

Only what is made **on a paid plan, while subscribed** can go into the game; subscribing later doesn't license
what was made on a free plan. Save the date and plan with every file.

**Making and editing:**
- [Audacity](https://www.audacityteam.org/) (free) or [ocenaudio](https://www.ocenaudio.com/) (free): trim, fade,
  layer two or three recordings into one sound, pitch and speed, make a loop, normalise.
- For composing music yourself: [Reaper](https://www.reaper.fm/) (a cheap digital audio workstation) with free
  orchestral sample libraries such as Spitfire LABS or BBC Symphony Orchestra Discover.
- Recording your own: a phone in a quiet room is enough for foley (crumpled parchment, a spoon on a glass, gravel,
  breath and whispers for Umbral), then edited as above.

### The licence rule

- **In the game:** CC0, CC BY (credited), Sonniss, Pixabay, Kenney, ZapSplat (credited on a free account), and AI
  output made on a paid plan.
- **Placeholders only,** marked in `CREDITS.md` to replace before the game is ever published: CC BY-NC and
  Freesound's old Sampling+ licence. The game makes no money today, but they would block publishing it.
- **Never:** CC BY-ND (no editing allowed), the BBC Sound Effects archive (its RemArc licence allows personal,
  educational and research use only), anything ripped from other games, films or music, and free-plan AI output.
- **Keep the paper trail:** for every file, its source link, author, licence, and for AI output the tool, plan and
  date. It goes into `CREDITS.md`. Once a CC BY sound ships, the game gets a credits screen too.

### House sound

The sound equivalent of the house style: everything happens in small stone rooms lit by candles.
- **Physical, old and close:** magic is made from real sounds (fire, ice, glass, bells, chains, breath, stone),
  shaped a little, so it feels ancient rather than electronic. No lasers, synth whooshes, cartoon boings or
  modern mechanics.
- **The school palettes** in the GDD's Audio design (Ember crackles and roars, Frost chimes and crunches, Storm
  zaps and thunders; Hallow bells and choir, Umbral whispers and reversed breath).
- **Dry effects:** no reverb or echo baked into an effect. The game adds each floor's own reverb (M8), and baked-in
  reverb would make the effect sound as if it were somewhere else. Ambience beds are the exception: they are the
  space.
- **A sound reference set**, like the image style reference: three to five accepted sounds (for example an Ember
  impact, a Frost cast, a door, a footstep on stone) that every new sound is compared against. It's chosen with the
  first real sounds.

| Name | Sounds | Use for | Since |
| --- | --- | --- | --- |
| House sound | (to be chosen with the first real sounds) | Everything | |

### Specs and budgets

| Kind | Channels | Length | Variants | Loudness | Shipped size |
| --- | --- | --- | --- | --- | --- |
| Effect heard in the room (spells, hits, doors, pickups) | Mono (the game places it left or right) | Under 1 s for hits, under 2 s for casts | 3 to 5 for frequent sounds | Peaks at -1 dB; matched to the reference set | Under 100 KB |
| Interface sound | Mono or stereo | Under 1 s | 1 to 3 | As effects, a little quieter | Under 50 KB |
| Stinger (room cleared, level up, secret) | Stereo | 2 to 5 s | 1 | Above effects | Under 200 KB |
| Ambience bed | Stereo | 30 to 90 s, a seamless loop | 1 per floor or room type | Well below effects | Under 1.5 MB, streamed |
| Ambience one-shot (drip, far chant, settling bones) | Mono | 1 to 6 s | 3 to 4 per floor | Quiet | Under 150 KB |
| Music stem | Stereo | 1 to 3 min, loop points on a bar line, every stem of a piece the same length and tempo | | Below effects | Under 3 MB, streamed |

- **Sources:** WAV at 44.1 or 48 kHz, 16 or 24 bit. The owner keeps them; the repository only gets the shipped files.
- **Shipped format:** Ogg Vorbis (Chrome, Edge and Firefox; Safari since 18.4). The first sounds through the
  pipeline confirm Safari; an MP3 copy is added if it needs one.
- **Every effect starts at once:** no silence before it, since a late sound feels like lag.
- **Files:** `public/assets/sounds/<family>/<id>_<n>.ogg`, such as `sounds/frost/cast_1.ogg`, in lower case with
  underscores.

### Pipeline

The same shape as the image pipeline:

1. **Brief** (Claude, on request). Which synthesised sound it replaces (`Sfx.<name>` in `src/audio/sfx.ts`), where
   and how often it plays, mono or stereo, length, variants, and its school's palette.
2. **Find or make** (owner). From the sources above, generated on a paid plan, or recorded. Note source, author and
   licence for every file.
3. **Edit** (owner, or Claude on request). Trim, layer, fade, make loops.
4. **Listening check** (owner, Claude on request). In the game, next to the placeholder it replaces and against the
   house sound. Does it sound like the same stone rooms? Is it clear under a fight?
5. **Hand over** (owner). The WAV or original file, with its source, author and licence (tool, plan and date for AI).
6. **Prepare** (Claude). A `prepare-sound` script, written with the first real sounds: converts to Ogg, makes
   effects mono, trims leading silence, matches loudness, checks a loop's seam, and reports length, size and peak.
7. **Integrate** (Claude). A line in `data/sounds.json` names the files and variants for a sound. The game plays the
   file, falling back to the synthesised sound if it's missing or fails to load.
8. **Review and record** (both). Accepted sounds get a row in `CREDITS.md` and in the asset log below.

**Voices and sound bites.** The mage's hurt and death sounds, and later the townspeople of the Vigil (M7), need
voices. Full voice acting isn't planned. Instead:
- a few short barks per character (a gasp, a laugh, a murmur);
- townspeople talking in a murmured, wordless voice while their lines show as text.

These come from ElevenLabs (voice design on a paid plan), recordings of your own voice, or libraries. Whispers,
chants and the dead's murmurs are a good first job for your own recordings.

## Asset log

Every asset made for the game, from its first image or sound to acceptance. Placeholders stay in the game until an
asset is accepted.

| Asset | Kind | Replaces | Tools | Style reference | Status |
| --- | --- | --- | --- | --- | --- |
| Hero (`hero_default.glb`) | hero | the 0.3 hero | Tripo3D | | in the game |
| Urn | small prop | procedural urn | | | dropped 2026-09-30 (built in code) |
| Pedestal | small prop | procedural pedestal | | | dropped 2026-09-30 (built in code) |
| Ember Sigil | artifact | gem placeholder | | | dropped 2026-09-30 (built in code) |
| Crypt floor | texture | procedural floor, floor 1 | | | dropped 2026-09-30 (drawn in code, M3.5 step 3) |
| Ember Sigil, Bone Lens and Mask of the Drowned icons | icons | SVG placeholders | | | dropped 2026-09-30 (rendered from the models built in code) |
| Seven coin faces (Arcane eye, Silver owl, Star and crystal, Grave coin, Arcane sigil, Pale obol, Plain profile; `inspiration/coins/`) | coin faces | the obol built in code (Star and crystal worn by the obols) | the owner's images | | in the game 2026-10-02; Star and crystal chosen by the owner, drawn on the fine layer; made again at 48 px the same day (the coin a little smaller, at the owner's ask) |
| Owlbear (`creatures/owlbear.glb`; `owlbear.full.glb` beside it) | creature, boss budget | nothing yet (the owner's experiment, called a success 2026-10-03: animated in code, looks only; `docs/creatures.md`) | Tripo3D (model, rig); code (faces turned outward, skin, clips, padding, sounds; `tools/animate-creature.ts`) | | in the dev menu 2026-10-03 (Galleries, Animated creatures); 14,550 triangles, 1,024 px. `owlbear.full.glb` keeps the textures as imported (2,048 px, normal map, about 4 MB): the dev menu's "as imported" comparison only, outside the budget, loaded only when asked |
| Dragonling (`creatures/dragonling.glb`; `dragonling.full.glb` beside it) | creature, boss budget | nothing yet (the owner's example of a new creature, 2026-10-03: about a horse, 1.8 tiles, after a first try at a medium dog's size; looks only; `docs/creatures.md`) | Tripo3D (model, rig); code (turned to face +z, skin, stance from a mid-stride pose, clips, padding, sounds; `tools/creatures/dragonling.ts`) | | in the dev menu 2026-10-03 (Galleries, Animated creatures), approved by the owner at horse size the same day; 14,550 triangles (from 19,367), 1,024 px. `dragonling.full.glb` keeps the textures as imported (2,048 px, normal map, about 3.8 MB), outside the budget |
