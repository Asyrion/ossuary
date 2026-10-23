# Asset creation guide

How Ossuary's art and sound get made and get into the game: which tool does what, the house style, the budgets
each kind of asset has to fit, and the pipeline from a first image to a model in a room. Sound has its own section
(Sound: sources, licences, the house sound, specs and its pipeline). The GDD (Art, camera
and audio; Asset list) says what the game needs; this file says how to make it. Tripo's export settings stay
in the owner's Tripo asset checklist (claude.ai project "Tripo3D-GameDev"); keep the two consistent when either
changes. The first run through this pipeline is milestone M3.5 (`docs/archive/M3.5-plan.md`).

Written 2026-09-28. **Changed 2026-09-30:** the owner is happy with the models and textures built in code, so
everything in the game is built in code in the pixel look, in the style of the spell effects (`docs/effects.md`):
creatures, familiars, the room kit (objects, mechanisms, floors, walls), artifacts and icons. Tripo, and the image
tools, house style and pipeline below, stay for special models: the mage, and bosses where wanted. The M3.5 pilot of
Tripo props was dropped (`docs/archive/M3.5-plan.md`).

## Tools and what each is for

| Tool | Plan | Use it for | Not for |
| --- | --- | --- | --- |
| MidJourney | Standard | Concept art for props, creatures and artifacts; the house style reference (`--sref`); seamless floor and wall textures (`--tile`); painted icons; title and loading art | Final 3D; anything with legible text |
| Tripo3D | Master | Turning a concept image (or several views) into a textured 3D model; texturing and re-texturing; lowering the face count; rigging and animating characters; its own image models for concepts and alternative views | Flames, light, magic and particles (made in code); tiling floor and wall textures |
| Hi3D | MAX (the owner's) | A second route to images and models beside Tripo, when Tripo's results fall short; not used yet | |
| Other image models (Tripo's own, Gemini / Nano Banana and others) | As available | Alternative concepts, front, side and back views of one design for better 3D, edits (clean background, change a pose, fix a detail) | Skipping the style check |
| Tripo CLI (`@tripo3d/cli`) | The owner's Studio credits | Concept images that Claude makes from the session (Route 2 below): Nano Banana 2 through Tripo, four a round, 8 credits a round; image-to-3D, rigging and preset clips (proven in R3's proof, below) | Negative prompts (it has no flag for them); its own textures need the pixel-art bake as any Tripo model's do |
| Aseprite 1.3.18 | The owner's (Steam) | 2D pixel art drawn rather than built in code, when the owner asks for it: artifact icons (24 px), coin faces (48 px), HUD pieces, a redraw of a generated image. Runs headless on the owner's PC (its path in Aseprite (2D pixel art), below) | 3D; anything the game already builds in code |
| Code | | Lights, torch flames and flicker, bolts, spell and glyph effects, particles, glows, decals, the cracks, stains, bones and puddles drawn over the floor, the whole UI | |

Images move freely between tools: a MidJourney concept can be edited in another image model, turned into
views in Tripo, and made into a model there. What keeps the look together is not the tool but the house
style reference, which goes into every image made in any tool, and the style check before anything becomes
3D (see Pipeline, step 3). Note which tool made which image (the asset log below): it's needed for the credits
and for making a matching asset later.

## House style

**`docs/art-bible.md` wins** where it differs from this section: its palettes per floor, cool shadows and warm lights,
hard outlines on actors and objects, and its light (decided 2026-10-15, built in R3).

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

### Prompts for game characters in Tripo (written 2026-10-09)

This is how to prompt a **character or creature that will be rigged and animated** in Tripo Studio, through Nano Banana 2
in its model generator or its Image tab. It replaces the miniature format of the first batch (`docs/tripo-prompts.md`, the
townspeople, 2026-10-09). That format was written for painted figurines to 3D-print. The owner had to rewrite most of those
prompts, and what came back shows why.

**What went wrong with the miniature format** (13 models, rigged in Tripo with its Mixamo skeleton):
- **"Miniature" brings a figurine.** The word pulls in a base, a sculpted toy finish and a display pose. One model came
  back on a round base.
- **Action poses rig badly.** The forager crouched on one knee with a drawn bow: its rig and its bow came back broken, with
  stray flat shards. A kneel, a lunge or a lifted foot leaves Mixamo's leg bones guessing.
- **Long robes hide the legs.** Several robes fell to the ground over the feet, so the leg bones bend cloth they can't see.
- **Glowing, see-through shades don't survive.** Image-to-3D makes solid surfaces. The owner turned the shades into
  living, solid characters instead.
- **A re-export can lose the rig.** Three models came back with every bone at the origin and every vertex on the hips.
  Their files carry `FB_ngon_encoding`, so they went through an FBX converter. Export the GLB straight from Tripo.

**What the game needs from a character model:**
- **A rest pose an animator can start from.** An A-pose (arms down and out at about 45 degrees) is what Mixamo-style auto
  rigs expect. Tripo's own guidance names the pose in the prompt for cleaner rigs, and many game engines prefer the A-pose
  to the T-pose for its shoulders. Every gesture the game plays (an idle's breath, a talking hand, a boss's swing) is
  animated in code from that rest (`docs/creatures.md`), so the character's personality goes in its silhouette and props,
  not in a frozen pose.
- **Limbs clear of the body and of each other, feet visible.** Auto-riggers want arms and legs well apart from the torso,
  and the figure symmetrical, because they find joints by mirroring.
- **Big readable shapes and flat colour.** The game draws a character about 50 pixels tall, and its texture is baked down
  to pixel art (`tools/texel-bake.ts`). Fine painted detail, small patterns and thin parts are lost.
- **Even light, a plain background, nothing else in the frame.** Light or shadow baked into the image ends up in the
  texture and fights the game's own lighting. A cluttered background or a cropped figure confuses the reconstruction.

**The structure** (prose, under Tripo's 1,000 characters, in this order):

1. **What it is, for what.** Start with `Stylised 3D game character reference:` and say who it is in one sentence.
2. **The pose, in body mechanics.** `Full body, front view, relaxed A-pose: feet flat a little apart, legs straight, arms
   down and out at forty-five degrees, hands open, head level.` For a creature: standing square on all its feet, head level,
   tail straight out behind, wings folded along its sides (or spread flat and level, if it is shown flying).
3. **Its one prop, where it is held.** `holding <prop> upright in its right hand, the shaft vertical beside the body,
   clear of the robe`. A long prop gets its length against the figure (`as tall as the figure`). Anything else hangs from
   the belt or the back. One or two props at most.
4. **Why it looks so.** One sentence of design logic.
5. **Silhouette and proportions.** `chibi proportions, the head about a third of its height`; the two or three big shapes
   that make it; clothing that ends above the ankles with both boots showing, or a robe split at the front to show both
   feet.
6. **Materials and palette.** Surfaces as nouns, two or three colours and one accent. A glow is painted, not lit:
   `eyes painted bright violet`.
7. **The look and the shot.** `Clean stylised game-asset look, simple forms, flat colour, soft shading; even shadowless
   light, plain light-grey background, whole figure in frame, alone.`

The two fixed sentences (2 and 7) take about 300 characters, which leaves some 650 for the character itself.

Never write `Miniature`, `figurine`, `statue`, `toy`, `diorama`, `base`, `display` or an action word (`leaping`,
`lunging`, `mid-swing`) in the prompt.

**Tripo's negative-prompt field:** `base, pedestal, platform, ground, cast shadow, action pose, crouching, kneeling,
perspective, cropped, text, letters, second figure, scenery, transparent, glowing aura, particles, smoke`.

**In Tripo**, when its panel offers the setting:
- **The image first.** Generate in the Image tab, choose the one whose silhouette reads, then send it to image-to-3D. Pick
  for silhouette first and colour second.
- **More views help.** A back view from a follow-up (`Same character, seen from directly behind, same pose, same light`)
  gives the back of the robe something to go on.
- **Face count:** Smart Low Poly on, with a face limit of the kind's budget (8,000 for a character, 15,000 for a boss).
  The animate tool lowers the count too.
- **Texture on, the rig humanoid (Mixamo), export GLB from Tripo directly.**
- **Facing:** the model facing the front view is what the tools expect (+z). The animate tool turns any other way round.

**A worked example: the scribe, in the new structure**

```
Stylised 3D game character reference: a monastery scribe, kindly and short-sighted. Full body, front view, relaxed A-pose: feet flat a little apart, legs straight, arms down and out at forty-five degrees, hands open, head level. A large closed book hangs on a strap at its left hip and a long quill sits behind one ear, because a scribe never puts its tools down. Chibi proportions, the head a third of its height, a deep hood over round brass spectacles, a plain robe ending above the ankles with both soft boots showing, a rope belt with an ink pot. Surfaces: undyed wool, vellum, brass, ink. Palette: cream and dove grey, ink black on the quill, book and pot. Clean stylised game-asset look, simple forms, flat colour, soft shading; even shadowless light, plain light-grey background, whole figure in frame, alone.
```

Sources for the general guidance (vendor blogs and guides, not official Tripo documentation, so check the current Studio
panel): Tripo's own blog on [poseable characters](https://www.tripo3d.ai/blog/poseable-3d-character), on
[rigging for Mixamo](https://www.tripo3d.ai/blog/rig-ai-generated-character-for-mixamo) and on
[skeleton standards](https://www.tripo3d.ai/blog/explore/common-skeleton-standards-for-auto-rigging);
[neural4d on preparing models for auto-rigging](https://neural4d.com/how-tos/how-to-prepare-3d-models-for-auto-rigging-and-animation);
[Meshy's image-generation guide](https://docs.meshy.ai/en/webapp/guides/image/ai-image-generation);
[Scenario's Tripo 3.1 essentials](https://help.scenario.com/en/articles/tripo-3-1-suite-the-essentials) (Smart Low Poly,
face limit). What the first batch taught is our own evidence, above.

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

### Two routes to the concept images (2026-10-09)

Steps 2 to 4 (concept, style check, clean input) can go two ways; both end in the same image going into Tripo Studio at
step 5. **Before the design questions, Claude asks which route to take** (buttons). The route was proven in the owner's
Godot project (Azyrion Tamer, its docs 04 §11 and docs 06 §0, 2026-10-07: two rounds of four on one creature) and is
adapted here; Ossuary has not run it yet.

| | **Route 1: the owner makes the concepts** | **Route 2: Claude makes them with the Tripo CLI** |
| --- | --- | --- |
| Who runs the image model | The owner, by hand: MidJourney, Tripo Studio's Image tab or Nano Banana, from the prompts Claude writes | Claude, through the Tripo CLI on the owner's Studio credits (Nano Banana 2) |
| Questions | The brief (step 1), then the design questions (what it is, its silhouette, colours, the telling detail) | The same, always as buttons with concrete options, follow-up questions too |
| Images | The owner uploads the picks to the session | Four a round (about 8 credits), downloaded to `asset-previews/tripo/<id>/round<n>/` |
| Pick | The owner chooses | Claude makes a numbered contact sheet, checks each image, recommends one and asks with buttons (keep it, take another, or one more round); more rounds until the owner is happy |
| Login | | The owner runs `tripo auth login` in their own terminal (email and a code; Claude never sees the code); the session lasts about 2 hours (`tripo auth whoami`) |

Route 1 keeps **image-to-3D, texturing, rigging and export with the owner in Tripo Studio** (steps 5 and 6), where the
owner checks the model before it leaves Tripo. In Route 2 the CLI can take them too, when the owner says so (proven on
the Gloom Weaver in R3's proof, 2026-10-15; below, "From the picked image to clips").

**Prompt rules** (both routes; Tamer's docs 04 §2, measured there):
- Under **1,000 characters**: Tripo's Image tab cuts the prompt there.
- Positive phrasing only: a negation in the prompt summons what it names ("no text" invites text). In Route 1 the
  exclusions go in the negative-prompt field (MidJourney's `--no`, Tripo's negative field): `text, letters, labels,
  watermark, border, frame, floor, scene, drop shadow, blur, photo, several objects`. The CLI has no flag for them, so
  Route 2 prompts carry the wanted thing instead ("a plain neutral grey background, the object alone").
- Aspect **1:1**, in the settings and in the prompt.
- **Four images a run**, and keep the best: about one in four comes back broken.
- **One subject** an image: one object, one creature, one character.
- The house style (prompt pattern above) and, for anything going to Tripo, the "Concept images for Tripo" rules in
  step 7: big flat colour areas, bold markings a few texels wide, little painted shadow, a silhouette that reads at
  about 80 game pixels.

**Route 2, step by step:**
1. **Install** once on the owner's PC: `npm install -g @tripo3d/cli` (0.8.1; npm marks it deprecated, it still works).
   The install and the login must be on the owner's own machine: one made from Claude's sandboxed shell is invisible to
   the owner's terminal. The Tripo API (platform.tripo3d.ai) is billed apart from the Studio plan; since 2026-10-21 a cloud session uses it on the owner's API key (`tools/art/tripo_api.py`).
2. **Ask** the route, then the design questions, as buttons; one asset at a time.
3. **Prompt** by the rules above, then
   `tripo image "<prompt>" -m gemini_3.1_flash_image_preview -n 4 --scale 1:1` (Nano Banana 2, four images, square).
4. **Fetch.** 0.8.1 has a bug: it ends with `no image URLs in result`, or returns while the task is still running. Take
   the task id from its "Task created" line and poll `tripo image get <id> --output-format json` until `status` is
   `success`, then download the four `urls` (signed links, good for a few hours) as
   `asset-previews/tripo/<id>/round<n>/<id>_r<n>_<i>.png`.
5. **Check and recommend.** A numbered contact sheet of the round; each image checked for one object whole and in
   frame, a plain background, even light, the house style and the step 7 rules (shrink it to 80 pixels and look);
   Claude recommends one and shows them all. Another round rewrites the prompt where the last one missed.
6. **Pick** by buttons. The pick (and any part the owner wants from another image, named as a reference) goes on to
   the style check (step 3), the clean input (step 4) and the owner's Tripo Studio work (step 5).

**From the picked image to clips** (Route 2, the CLI; proven 2026-10-15 on the Gloom Weaver; the owner says yes to
each paid step):
1. **Model:** `tripo generate image <pick.png> --face-limit 8000 --visibility private -o <raw.glb>` (25 credits;
   `--face-limit` to the budget, `--visibility` private, which defaults to public). About three minutes.
2. **Project id:** the rig and animate commands want the project, not the task: `tripo project list --output-format
   json` shows it beside the model's task id.
3. **Rig:** `tripo process rig <project> --check` names the rig type it found (`biped`, `quadruped`, `octopod`, ...);
   then `tripo process rig <project> --rig-type <type> -o <rig.glb>` (20 credits). Its GLB carried no armature here;
   the animated one does.
4. **Clips:** `tripo process animate <project> --rig-type <type> --animations preset:<type>:walk -o <walk.glb>` (10
   credits a clip). The presets differ by rig: a biped has idle, walk, run, slash, hurt and more; an octopod only walk
   (`preset:octopod:idle` answers "invalid parameter"). Ossuary's own clips come from `tools/animate-creature.ts`.
5. **Look at it** with `tools/art/render_glb.py` (Blender) in the game's camera before anything else; the Weaver came
   facing +x (`--front +X`).
In PowerShell the CLI's progress on stderr shows as an error with exit code 255 while the download succeeded: check the
file and the balance (`tripo account balance`), not the exit code. `tripo image` may end in "no image URLs in result"
and a model's download in "tls: bad record MAC" though both were made: take the images' `urls` from `tripo image get
<task>`, and a model again with `tripo export <project> --operator-id <operator> -o <file>` (both from `tripo project
list`), at no cost. Costs seen 2026-10-21: four images 8 credits, a model 25.

**The Blender scripts on the owner's PC** (`remesh.py`, `bake.py`, `turn.py`, `upright.py`) read `sys.argv` as if `bpy`
were a Python module, which needs Python 3.13 (the `bpy` wheel's). Blender 5.2 runs them as they are, headless:
`& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python-expr "import sys,runpy;
i=sys.argv.index('--'); sys.argv=sys.argv[i+1:]; runpy.run_path(sys.argv[0], run_name='__main__')" -- tools/art/remesh.py
<args>`. `render_glb.py` parses its own arguments (`blender -b -P tools/art/render_glb.py -- ...`). The scripts that need
Pillow (`pixelize.py`, `walltile.py`, `sigil.py`) run on the system Python.

`asset-previews/` is ignored by git, so the rounds and contact sheets are never committed; only an image the game's
asset actually came from is kept, in the asset log's record of what made it (the rest stays in the owner's Tripo
account).

### The nine steps

1. **Brief** (Claude, on request). What the asset is, which placeholder it replaces, where it's seen, its
   kind and budget from the table above, and anything special (an urn breaks into shards, a chest has a lid
   that opens, an artifact floats and turns).
2. **Concept** (owner; Claude in Route 2, above). Images with the house style reference, in MidJourney or any other image model; pick
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
fallback.

**Floor faces** (R3, floor 2) take the place of the room kit's paving where a look's `floor.face` (or its `themeFloor` or `bossFloor`) names one: a top-down picture from Tripo Studio's image tab, seamless, evenly lit, nothing on it, through `python tools/art/floortile.py <image> --units <across> --levels <n> --out public/assets/textures/<look>/<name>.png`, which cuts it where it repeats and keeps only its steps of light at the texel (48 across, 34 down a unit); the game paints them in the room's own floor colours, so a theme's or a boss room's floor still differs. It goes in `data/assets.json` under `floorFaces.<look>.<name>`. A picture whose slabs lie in a grid near the tile's size reads as a grid in the game: choose irregular stones.

**Decals** (R3 polish) are marks made from pictures that lie on the floor and take their colour in the game: a top-down
picture on a plain light ground, through `python tools/art/splash.py <image> --units <across> --out
public/assets/textures/decals/<name>.png [--preview <png>]`, which cuts it from its ground (the dark rims and what they
close round; a soft glow outside them is dropped), reduces it to the texel (48 across, 34 down a unit) by a majority tone
a block, closes it in its rim and keeps only its tones: the rim, the glass and the liquid's steps of light. It goes in
`data/assets.json` under `decals` by a name `DECAL_SLOTS` knows (`images.decal.size` is the splash's width); the game
lies it as many units across as it is texels over 48 and paints it per potion and floor (`items/potionThrow.ts`
`splashPaint`). The splash is the first; its picture is kept in `docs/art/items/`.

**Wall faces** (R3, floor 1 step D) are made at the room kit's texel instead: a front view from Tripo Studio's
image tab (flat, evenly lit, no moss or cracks: the game lays its stains on it), checked with `--kind wall --out
<scratch dir>` for seams and light, then `python tools/art/walltile.py <image> --floor <n> --units <across> --out
public/assets/textures/<look>/<kind>.png` cuts it where it repeats, reduces it to the texel by a majority colour a
block and moves its colours into the floor's wall colours. It goes in `data/assets.json` under `walls.<look>.<kind>`
(a kind of the room kit's walls, `src/world/kitData.ts`); the kinds a look leaves out stay drawn in code. The
pictures it was made from are kept in `docs/art/walls/`.

**Icons** also follow them without 3D: one object, centred, a strong silhouette on a dark or plain
background, cropped square, background removed, 256 px kept and 128 px shipped.
`npm run prepare-texture -- <image> --kind icon --id <artifact id>` pads it to a square and writes the 128 px
PNG to `icons/<id>.png`. It warns when the background isn't transparent, and makes a sheet in
`asset-previews/`: the icon at 28 px (the HUD) and 44 px (the lore card), plain, cursed and cleansed, on the
game's dark background. The check is how it reads there. An icon can also be rendered from the artifact's 3D
model instead of painted. (Since 2026-09-30 the game's icons are rendered from the artifacts' models built in code,
`src/items/artifactIcons.ts`; since 2026-10-23 an icon drawn in Aseprite replaces that for the artifacts that have one,
`--drawn` below, in Aseprite (2D pixel art).)

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

### Aseprite (2D pixel art)

Everything in the game is still built in code (2026-09-30). Aseprite is for the 2D pixel art the owner asks to be
**drawn** instead: an artifact icon (24 px, the size the code-built icons are rendered at), a coin face (48 px), a HUD
piece, or a redraw of a generated image. Aseprite 1.3.18 runs headless on the owner's PC
(`"C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe" -b --script <lua>`), so Claude can trace,
export and preview without opening it; the owner draws and edits in it by hand.

1. **Source.** Either drawn at its final size in Aseprite, or redrawn from a generated image (a Route 1 or 2 concept):
   the image traced into an indexed `.aseprite` with a small hand palette (index 0 transparent, index 1 the outline
   ink), its colours mapped to the nearest palette colour, the silhouette's outline forced to ink and stray single
   pixels and tiny colour islands replaced by what surrounds them. In Tamer the trace took one creature from 29
   near-duplicate colours to 12 and removed 194 noise pixels.
2. **The `.aseprite` is the source of truth** from then on: the trace never overwrites one that exists (only with a
   `--force`), so hand edits survive every export. It is kept beside the owner's other sources (as `inspiration/` holds
   the coins), not in `public/`.
3. **Edit** in Aseprite (the owner, or Claude by a Lua script for a mechanical change).
4. **Export** with `Aseprite -b`: the PNG at its final size, and a copy 8× larger with nearest scaling for review.
5. **Review** (the rule from Tamer, 2026-10-06): the 8× preview and the `.aseprite` are shown to the owner before
   anything goes into the game. Back to step 3 until the owner accepts it.
6. **Prepare** an icon with `python tools/aseprite/redraw.py export --id <artifact id> --game`: the `.aseprite`
   exported fresh (never a review export lying about) and handed to
   `npm run prepare-texture -- <png> --kind icon --id <artifact id> --drawn`, which keeps its pixels exactly (no
   resample), fails unless it is `images.icon.drawn` (24) px square with every pixel drawn or clear, warns when its
   outline isn't closed in ink, writes `public/assets/icons/<id>.png`, reads it back and compares it pixel for pixel,
   and makes a sheet at 1× and 2× in `asset-previews/icons/game/`. Then its line in `data/assets.json` `icons` (it
   prints it) and a row in the asset log. The game shows a drawn icon instead of the one rendered from the model,
   wherever an artifact's icon shows (`artifactIcon` in `ui/hud.ts`: the HUD, the lore card, the inventory, the
   merchant's panel, the end screen; the dev menu's artifacts and its icon sheet in Galleries), with no outline added
   (it carries its own ink) and in whole steps only: 1× in the HUD and the end screen, 2× on the cards (`svg.art` in
   `style.css`). The made-assets switch (dev menu, Look) shows the model-rendered ones again to compare. A coin face
   has no drawn path yet: `--kind coin` warns below 512 px and cuts it to 16 colours, so export a coin at a whole
   multiple of its size and compare the result pixel for pixel.

**The tool** (2026-10-23, made for the first ten artifact icons, after Tamer's `tools/aseprite/redraw.py`):
`tools/aseprite/redraw.py` (Python with Pillow and numpy, the colour maths from `tools/art/oklab.py`) drives
`tools/aseprite/sprite.lua` in `Aseprite -b`. The sources live in `inspiration/icons/` (tracked by git like the rest of
`inspiration/`): `<id>.aseprite` and its hand palette `<id>.palette.json` (`colors` are indices 2 and up after 0 clear
and 1 the ink `#0b0910`; `keep` names indices the cleaning leaves alone, a highlight or a spark).
- `redraw.py ramp --color <hex> [--floor 1]`: a five-colour ramp round the item's colour, its shadows toward the floor's
  shadow and its lights toward its highlight (art bible 4.2), to start a palette from.
- `redraw.py trace <picture> --id <id> [--force]`: steps 1 and 2 above. The background is flooded in from the border
  (and from holes it closes round, a loop of beads), a concept's own dark outline is cut off, each of the 22 inner
  pixels the majority palette colour of its block, specks and pinholes and colour islands (`--islands`) cleaned, the
  outline forced to ink. It refuses to overwrite a source without `--force`.
- `redraw.py dump --id <id>` prints the sprite as a text grid (a character a pixel: `.` clear, `#` ink, then `2`..`9`,
  `a`..); `redraw.py paint --id <id> <grid.txt> [--outline] [--repalette]` writes an edited grid back (step 3 by
  script), `--outline` closing the outline again, `--repalette` taking the palette from its JSON again.
- `redraw.py export --id <id>`: step 4, `asset-previews/icons/out/<id>.png` and `<id>@8x.png`; with `--game`, step 6.

The first ten's concepts were made in Route 2 from `docs/art/icons/icons-prompts.json` (pictures in
`asset-previews/icons/<id>/`); the trace gave each a start, and each was then redrawn by hand as a grid, so the
picture's mush and its painted shading did not survive.

## Sound

Where the game's sounds come from and how they get in. The GDD's Audio design says what the game needs to hear:
the four layers (music, ambience, effects, interface), the school palettes, floor soundscapes, adaptive music and
mixing rules. The Asset list's Audio table gives the counts. This section says how to get and make them. Written
2026-09-29, with the licence terms as they stood that day: **check a source's current terms before downloading or
subscribing**, since they change (AI music most of all).

Today almost every sound is synthesised in code (`src/audio/sfx.ts`) and each one stays as its fallback; since 2026-10-02 the
soundscapes and the music are made in code too (`docs/archive/sound-plan.md`; `npm run render-audio` writes them to files to
listen to). Real sounds replace or join them in M8 (the final mix), or earlier for single effects. The first went through
the pipeline below on 2026-10-05: four for the Chameleon Wyvern from the owner's EDA-ModelWebViewer (its growl, screech
and two tail slams; see the asset log), with `prepare-sound`, `data/sounds.json` and the game's player (`src/audio/samples.ts`) written for them.

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
  first real sounds of the game's own effects: the Chameleon Wyvern's (2026-10-05) are a creature's voice, not part of it.

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
- **Shipped format:** Ogg Vorbis (Chrome, Edge and Firefox; Safari since 18.4). Safari isn't checked yet (the first
  sounds, 2026-10-05, were tested in Chromium only); where a file won't decode the game plays the synthesised sound in
  its place, and an MP3 copy is added if Safari needs one.
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
6. **Prepare** (Claude). `npm run prepare-sound -- <in.wav> <family>/<id>_<n>` (`tools/prepare-sound.ts`, written with
   the first real sounds; needs ffmpeg): makes it mono, trims the silence before it, sets its peak to -1 dB, encodes Ogg
   Vorbis at its own sample rate into `public/assets/sounds/`, and reports length, size and peak against an effect's
   budget. Loudness against the other sounds is the entry's `gain` (step 7), set by listening and measuring in a
   preview. A loop's seam is checked when the first loop comes.
7. **Integrate** (Claude). A line in `data/sounds.json` names the files (variants, one chosen at random) and the `gain`
   of a sound (`src/audio/soundData.ts` checks it; a unit test checks every file ships). `src/audio/samples.ts` loads
   and decodes them once for each audio context and plays them; a creature's sounds go through `fromFile` in
   `creatureSounds.ts`, falling back to the synthesised sound while the file loads or if it fails. Effects heard
   through `Sfx` will take the same path when the first one comes.
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
| Ten drawn artifact icons (`icons/apprentice_wand.png`, `drowned_orb`, `bone_lens`, `saints_knucklebone`, `mourning_bell`, `twin_staff`, `ember_sigil`, `pilgrims_boots`, `rosary_of_haste`, `reliquary_shard`; sources `inspiration/icons/<id>.aseprite`) | icons, 24 px | those ten's icons rendered from their models (the render stays for the others) | Nano Banana 2 concepts (`docs/art/icons/icons-prompts.json`), traced and redrawn by hand in Aseprite (`tools/aseprite/redraw.py`) | the art bible 4.6 | chosen by the owner 2026-10-23; in the game the same day (`redraw.py export --game`) |
| Seven coin faces (Arcane eye, Silver owl, Star and crystal, Grave coin, Arcane sigil, Pale obol, Plain profile; `inspiration/coins/`) | coin faces | the obol built in code (Star and crystal worn by the obols) | the owner's images | | in the game 2026-10-02; Star and crystal chosen by the owner, drawn on the fine layer; made again at 48 px the same day (the coin a little smaller, at the owner's ask) |
| Owlbear (`creatures/owlbear.glb`) | creature, boss budget | nothing yet (the owner's experiment, called a success 2026-10-03: animated in code, looks only; `docs/creatures.md`) | Tripo3D (model, rig); code (faces turned outward, skin, clips, padding, sounds; `tools/animate-creature.ts`) | | in the dev menu 2026-10-03 (Galleries, Animated creatures); 14,550 triangles, 1,024 px. |
| Dragonling (`creatures/dragonling.glb`) | creature, boss budget | nothing yet (the owner's example of a new creature, 2026-10-03: about a horse, 1.8 tiles, after a first try at a medium dog's size; looks only; `docs/creatures.md`) | Tripo3D (model, rig); code (turned to face +z, skin, stance from a mid-stride pose, clips, padding, sounds; `tools/creatures/dragonling.ts`) | | in the dev menu 2026-10-03 (Galleries, Animated creatures), approved by the owner at horse size the same day; 14,550 triangles (from 19,367), 1,024 px. |
| Chameleon Wyvern (`creatures/chameleon.glb`) | creature, boss budget | nothing yet (the owner's third creature, 2026-10-05: a feathered wyvern the size of a pony, 1.4 tiles; looks only; `docs/creatures.md`) | Tripo3D (model, rig), the owner's EDA-ModelWebViewer (bones named, weights mended, kept here); code (turned to face +z, its jaw carved from the head, wings laid by direction, clips; `tools/creatures/chameleon.ts`) | | in the dev menu 2026-10-05 (Galleries, Animated creatures); 14,549 triangles (from 19,531), 1,024 px, its texture as pixel art (256 px). |
| Chameleon Wyvern's sounds (`sounds/chameleon/growl_1.ogg`, `screech_1.ogg`, `slam_1.ogg`, `slam_2.ogg`) | effects, mono | the synthesised `roar`, `shriek` and `slam` (kept as their fallbacks) | The owner's EDA-ModelWebViewer (`web/js/sounds.js`: its growl 2, roar 1, hit 1 and hit 2 for this model), made in code there; ours | | in the game 2026-10-05 through `prepare-sound`: first at the viewer's 22,050 Hz, then made again from its recipe at 48 kHz (the owner's ask; the same seed, so the same sounds; `npm run viewer-sounds`): 17, 17, 12 and 12 KB, peaks at -1 dB, played at `gain` 1, 0.85 and 0.8 (`data/sounds.json`) |
| The townspeople, the Ferryman, Dr. Jelly and Kaelith (`creatures/<id>.glb`: stormcaller, wizard, forager, scribe, sexton, chorister, bellringer, novice, embalmer, pilgrim, ferryman, jelly, kaelith) | people, enemy budget (Kaelith boss) | the code-built figures of `townLooks.ts` and the Ferryman in `vigilLooks.ts` (kept as the fallback and the dev menu's code look) | Tripo3D (model from the prompts in `docs/tripo-prompts.md`, edited by the owner; Mixamo rig); code (rests rebuilt for three, turned, clips; `tools/creatures/townsfolk.ts`) | | in the game 2026-10-09: the ten and the Ferryman at the Vigil (idle, talk), Dr. Jelly and Kaelith in the Galleries only; 8,000 triangles each (the wizard and Dr. Jelly 10,000), their texture as pixel art; the ten and the Ferryman taller since (1.2 to 1.5 tiles) and on the fine layer, their pixel art 256 to 512 px |
| Gloom Weaver (R3 proof; Tripo project `51744b52-1ea8-47e3-b07c-e5ce02b28b80`) | creature, enemy budget | nothing yet (floor 1's Crypt Spider is drawn in code, `gloomWeaver` in `fantasyFloor1.ts`) | Nano Banana 2 through the Tripo CLI (lock: round 1, image 1 of 4, `docs/art/proof/weaver-design-lock.png`); Tripo3D through the CLI (model 7,770 triangles, octopod rig, its walk) | | proof only 2026-10-15 (`docs/art-bible.md` section 7); the GLBs stay in the owner's Tripo account and `asset-previews/`. For the foe: brighter eyes and rune (the rune came as a letter), legs spread wider |
| The relics of floor 1 (`props/grave_marker.glb`, `coffin_lid`, `fallen_candelabrum`, `angel_head`, `skull_pile`, `broken_urn`) | prop (the first three), large prop | nothing (new: floor 1's `relics` scatter, R3 step C2) | Nano Banana 2 in Tripo Studio (the owner; prompts and picks in the session, 2026-10-19), Tripo3D image to 3D (the owner, about 1.9 million triangles each); Blender `bpy` in the cloud session (`tools/art/remesh.py`, `bake.py`, `turn.py`: a closed hull at 2,000 or 3,500 triangles, the colour baked at 2048 px), `tools/art/darken.ts` for the pale four, `prepare-asset` | the art bible | accepted by the owner with floor 1 (2026-10-21): 0.28 to 0.7 tall (data/assets.json), one a plain room at most two |
| The spells' made parts (`props/ice_column.glb`, `bone_hand`, `thorn_vines`, `thorn_hedge`, `judgement_sword`, `vigil_lantern`) and circles (`textures/spells/pyre_seal.png`, `consecrate`, `ferrymans_toll`) | prop; circle masks | the code-built pillars, hands, vines, trunks, lantern and circles of `magic/spellFx.ts` (kept as the placeholder while a model isn't in) | Nano Banana 2 in Tripo Studio and Tripo3D image to 3D (the owner, prompts in the session, 2026-10-20); the models through `remesh.py` and `bake.py` (800 to 1,500 triangles), the sword stood up (`tools/art/upright.py`), the hedge turned; the circles through `tools/art/sigil.py` (their rune bands of real runes replaced by the Wardens' glyphs), the pictures in `docs/art/spells/` | the art bible, docs/effects.md | in the game 2026-10-20 on `r3-floor1` (R3 step F2), accepted by the owner the same day |
| The containers and the pedestal (`props/chest.glb`, `chest_gilded`, `coffer`, `pedestal`) | prop | the coffer, the chests and the pedestal built in code (`pickupLooks.ts`, `objectLooks.ts`), kept as the fallback | Nano Banana 2 and Tripo3D image to 3D through the Tripo API from the cloud session (`tools/art/tripo_api.py`, prompts in the session, the owner's picks of two each, 2026-10-21: `docs/art/items/`); `remesh.py` and `bake.py` (1,600 to 2,000 triangles), the chests turned to face the camera (`turn.py`), the lids cut off on their hinges (`tools/art/lid.py`), the pedestal darkened (`darken.ts` 0.7: its pale top outshone the artifact over it), `prepare-asset` | the art bible | accepted by the owner with floor 1 (2026-10-21): chests 0.62 tall, the coffer 0.36, the pedestal 0.72; a chest's ward seal built in code, hovering flat over the lid; inside, planks at the texel (`lid.py`) |
| The relics of floor 2 (`props/toppled_font.glb`, `pillar_stump`, `fungus_log`, `sunken_bell`, `rotten_planks`, `rimed_bones`) and its wall faces (`textures/drowned/bricks.png`, `tide`, `rubble`) | large prop (the first four), prop; wall faces | nothing (new: floor 2's `relics` scatter); the walls drawn in code | Nano Banana 2 and Tripo3D image to 3D through the Tripo API from the cloud session (`tools/art/tripo_api.py`, the owner's picks of two each, 2026-10-21; prompts and the contact sheet in `docs/art/relics/`); `remesh.py` and `bake.py` (2,000 or 3,500 triangles), the log turned across (`turn.py`), the font, the stump, the bell and the bones darkened (`darken.ts`), `prepare-asset`; the walls through `walltile.py --floor 2 --units 3` (`docs/art/walls/drowned-*.jpg`) | the art bible | in the game 2026-10-21 on `r3-floor2` (R3 floor 2, steps A to D), awaiting the owner's look |
| The foes of floor 2 (`props/foe_mireToad.glb`, `foe_lanternJelly`, `foe_thunderhead`, `foe_puddleElemental`, `foe_puffcap`, `foe_rimeSnail`, `foe_glassNewt`, `foe_stormDarter`) | prop | the looks in code (`actors/fantasyFloor2.ts`), still built for their lights and the parts their behaviour moves | Nano Banana 2 and Tripo3D image to 3D through the Tripo API (the owner's picks, 2026-10-21: the pictures and prompts in `docs/art/foes/`); `remesh.py` and `bake.py`, `prepare-asset` (turned a quarter: Tripo faces +X) | the art bible 4.19 | in the game 2026-10-21 on `r3-floor2`; accepted by the owner the same day, at the sizes shown (`span` in `CFG.madeFoes`) |
| Floor 2's water foes and bosses (`props/foe_cisternLurker.glb`, `foe_brineSerpent`, `foe_abbess`, `foe_pyre`) | prop (the foes), large prop (the bosses) | the looks in code (`actors/fantasyFloor2.ts`, `bestiaryCreatures.ts`, `bossLooks.ts`), still built for their pools, rune rings, halos and the knight's fire | Nano Banana 2 and Tripo3D image to 3D through the `tripo` CLI on the owner's Tripo Studio account (the owner's picks, 2026-10-21: the pictures and prompts in `docs/art/foes/`); `remesh.py` and `bake.py` in headless Blender (2,000 and 3,500 triangles), the knight darkened (`darken.ts` 0.62), `prepare-asset`; the kelpie turned three-quarters (`yaw` -0.7854) | the art bible 4.19 | accepted by the owner 2026-10-21 on `r3-floor2` |
| Floor 2's own urn, bargain stele and bone altar (`props/urn_drowned.glb`, `bargain_stone_drowned`, `altar_drowned`), its made floor faces (`textures/drowned/floor-boss.png`, `floor-collapsed`) and the merchant's ward circle (`textures/items/ward_circle.png`) | prop (urn, stele), large prop (altar); floor faces; a circle mask | the urn's, the stele's and the altar's bodies built in code (kept for the other floors), the paving of floor 2's boss rooms and collapsed crypt, the merchant's glyph | Nano Banana 2 and Tripo3D image to 3D through the `tripo` CLI on the owner's Tripo Studio account (picks made in the session by the owner's leave, 2026-10-21 and 22; prompts in `docs/art/items/floor2-prompts.json`); `remesh.py` and `bake.py` in headless Blender (1,500, 2,000 and 3,500 triangles), the urn darkened (`darken.ts` 0.7: its clay glowed) and the altar (0.8), the stele's pale cap texels recoloured to its basalt after `prepare-asset`; the floors through `tools/art/floortile.py --units 3` (7 and 5 levels), the circle through `sigil.py --size 56 --cut 0.22` with its rune band set in the Wardens' glyphs | the art bible 4.20 | accepted by the owner 2026-10-22 on `r3-floor2` |
| A thrown potion's splash (`textures/decals/splash.png`, `splash_wide` for the Cracked Retort) | decal | the stepped dark edge under the ring built in code (`items/potionThrow.ts` `splashEdge`), kept as the fallback | Tripo Studio's image tab (a top-down glowing splash of one pale liquid, a ring of droplets and glass shards in dark rims, on light grey; four made, the second chosen, 2026-10-23: `docs/art/items/splash.jpg`); `tools/art/splash.py --units 2.42` and `--units 3.63` (116 x 82 and 174 x 123 texels; rim, glass and four steps of liquid) | the art bible 4.20 | in the game 2026-10-23 on `r3-polish`, for the owner's look |
