# Creatures from Tripo, animated and voiced in code

A rigged Tripo model gets its clips (idle, walk, roar) and sounds in code, and is shown in the dev menu. The owlbear is
the first and the template (2026-10-03, approved by the owner); the dragonling the second (2026-10-03, a dragonling
the size of a horse, 1.8 tiles, boss budget: `tools/creatures/dragonling.ts`, the recipe for a model that came facing the wrong way, on a
two-legged rig, in a mid-stride pose); the Chameleon Wyvern the third (2026-10-05, a feathered wyvern the size of a pony,
1.4 tiles, boss budget: `tools/creatures/chameleon.ts`, the recipe for a model that came through the owner's
EDA-ModelWebViewer, for wings, and the first with sound files). The Hallowed Hart (2026-10-23) is the first that
fights, the Hollow Warden the second, then the War-Tiger, the Drowned Abbess, the Pyre Knight, both Twin Guardians and
Kaelith (below, "A creature that fights"); Fen-Nex runs at the mage's heel as two (below, "A familiar as a creature");
the others are looks only.
The thirteen people of M7 (2026-10-09: the ten townspeople, the Ferryman, Dr. Jelly and Kaelith) came a third way,
rigged by Tripo with its humanoid **Mixamo** skeleton and no clips: one recipe for all of them (below, "People on a Mixamo
rig").

## Two ways a model comes

- **Straight from Tripo** (the owlbear, the dragonling): bones named `bone_0` to `bone_N`, broken weights, no sounds. The
  tool mends what Tripo gets wrong (below) and the recipe binds the skin again (`SKIN`); its sounds are made in code here
  (`CREATURE_SOUNDS`).
- **Through the owner's EDA-ModelWebViewer** (github.com/Asyrion/EDA-ModelWebViewer; the Chameleon Wyvern): the viewer has
  already named the bones (`root`, `spine_01`, `head_01`, `arm_L_02`, `leg_R_03`, `toe_L_04`, `tail_05`, sockets such as
  `socket_hand_L`) and mended their weights, and it makes the creature's sounds as WAV files (footstep, breath, growl,
  roar, bite and hit, synthesised in its `web/js/sounds.js`). Look at the weights first (a bone's share drawn red) and keep
  them (`SKIN = null`); the sounds go in through `prepare-sound` (step 5). Its sounds come at 22,050 Hz, below the
  44.1 kHz the asset guide asks for: until the viewer makes them at 48 kHz, make them again from its own recipe with
  `npm run viewer-sounds -- <viewer checkout> "<the model's source file name>" <out dir> growl_2 roar_1 ...`
  (`tools/viewer-sounds.ts`: the viewer's `web/js/sounds.js` run with its `SAMPLE_RATE` at 48,000, seeded by the hash of
  the source file name as the viewer seeds it; at 22,050 Hz it gives the Chameleon Wyvern's files byte for byte, so the
  48 kHz ones are the same sounds with their full top end). A voice changed in the viewer's settings isn't read yet.

## Handover message

To start a new session, attach the rigged GLB (and its sound files, if it came through the viewer), fill in the brackets
and delete the choices that don't apply:

```
New creature from Tripo: [name]. The rigged GLB is attached.
Follow docs/creatures.md, steps 2 to 8.

- How it came: straight from Tripo / through EDA-ModelWebViewer (source file name: [its .glb's name there]), its sounds attached

- What it is: [four-legged / two-legged / winged / a serpent / ...], [a line on its character]
- Size: about [N] tiles tall; budget [enemy, 8,000 triangles / boss, 15,000]
- Showpiece clip (played as roar): [a roar / a bite / a swipe / a charge / ...]
- Feel: [heavy and slow / quick and snapping / ...]
- Sounds: [its voice, its steps, anything special]
- In the game: looks only / [a foe or boss: where, and what it does]

Send me a preview video before anything ships. Ship only when I say so.
```

## What Tripo gets wrong (the tool fixes it)

- **Skin weights.** Tripo's skeleton is usable but its bones are named only `bone_0` to `bone_N` plus `neutral_bone`, and
  the weights are broken: the owlbear had half its vertices on `neutral_bone`, and none on the upper legs. The tool
  binds the skin again from the bones' segments (`reskin`). A model through the owner's viewer keeps its weights: a
  recipe with `SKIN = null`; `REMAP` moves the weights on some bones to another (the Chameleon Wyvern's head chain ran on
  down the jaw and out along the tongue, smearing the whole head over it, so those went to the skull), and `jawOf` still
  claims the jaw outright.
- **Inside-out faces.** About half the surface faced inward, hidden by Tripo's two-sided material. The tool turns each
  face outward (`orientOutward`); the look stays two-sided for single-sheet parts such as feather flaps.
- **Texture seams.** The texture is hundreds of islands with no gutter, so black bled into the seams. The tool pads the
  islands (`padIslands`).
- **Facing.** The dragonling came facing +x. A recipe's `face` (degrees about the vertical) turns the model to +z before
  anything reads it (`faceForward`: its vertices, the skeleton's top joints and the inverse bind matrices together);
  `--bones --face=-90` reads the rig already turned.
- **The rig and the pose.** The dragonling, a four-legged beast, was rigged as a two-legged one: its forelegs hang from
  the chest as arms, its hind legs and tail from the root (`bone_0`), so the root is what moves and the hips (`bone_1`)
  what pitches the body. Its rest pose was caught mid-stride (one hind leg stretched back with its foot upright, the
  head turned): the recipe's `STANCE` moves each foot from where Tripo left it to stand square, tips the upright foot to
  its pair's slope, and turns the head straight in every clip. A digitigrade hind leg is hip, knee and hock in the IK,
  the foot below the hock its `paw` (kept at its slope) and the toes below that its `toes` (kept flat; `place`'s
  `toePitch` curls them as the foot lifts).
- **Wings.** Turning a wing's bones by angles about the frame's axes left them sticking out sideways. The Chameleon
  Wyvern's are laid by direction instead: each pose (folded along the flanks, raised as it came, thrown wide) gives the way
  the upper arm, the forearm and the hand lie, and `rig.point(bone, child, dir)` turns each bone to lie that way;
  between poses the directions are blended, the fingers fanned about the wing's own plane.
- **Turning round.** A clip that turns the whole body (its hop round) turns the root last, after every other turn, since
  each turn is about the frame's axes and a body already turned round would bend its tail the wrong way; the feet are
  then carried round with it (`place`'s `turn`) and planted where they land.
- **Size.** Over budget (the owlbear had 20,076 triangles, the dragonling 19,367). The tool simplifies to the budget
  (again, tighter, while the simplifier stops short of it), drops the normal map and cuts the textures to 1,024 px.

## Steps

1. **Tripo.** Rest pose, feet on the ground, no base, auto-rig, export GLB with textures. Facing +z, as the owlbear did
   (another way is turned by the recipe's `face`).
2. **Read the rig.** `npm run animate-creature -- --bones <model.glb>` prints each bone's joint position (x left-right,
   y up, z forward) and its vertex count. The spine runs along z, the head is its front end, and the jaw is the low bone
   at the very front. Legs are the chains down to y ≈ 0 (hip, knee, ankle, toes), and the x sign tells left from right.
3. **Write the recipe.** Copy `tools/creatures/owlbear.ts` to `<id>.ts`. It exports:
   - `LEGS`: root, mid, end, paw bones;
   - `SKIN`: segments, with `side` and `below` gates per limb;
   - `jawOf`: the jaw's vertices, or `null`;
   - `MOVING`: usually just the pelvis;
   - `CLIPS`: `idle`, `walk`, `roar`, the only names the game plays. Each has `duration`, `loop`, `pose(rig, t)` and
     `events`. A pose uses `rig.turn`, `rig.move`, `rig.update` and `rig.place` (two-bone IK, paws planted);
   - `WALK_SPEED`;
   - `face`, if Tripo set it facing other than +z (the dragonling's `-90`, the Chameleon Wyvern's `-38`);
   - `SKIN = null` and `REMAP`, for a rig whose own weights hold (a model through the owner's viewer).

   Add it to `RECIPES` in `tools/animate-creature.ts` with `height` (tiles) and `budget` (`enemy` or `boss`). For a
   four-legged model on a two-legged rig or in a pose that isn't at rest, start from `tools/creatures/dragonling.ts`; for a
   model through the owner's viewer, two legs, wings or a clip that turns round, from `tools/creatures/chameleon.ts`.
4. **Run it.** `npm run animate-creature -- <id> <model.glb>` writes `public/assets/creatures/<id>.glb` and `data/creatures.json`, then bakes
   its texture (5b). It stops before writing if the model is over budget.
5. **Sounds.** Events name sounds in `CREATURE_SOUNDS` (`src/audio/creatureSounds.ts`). Reuse the owlbear's (`pawFront`,
   `pawRear`, `inhale`, `roar`, `slam`) or the dragonling's (`clawFront`, `clawRear`, `hiss`, `snap`, `shriek`,
   `chitter`), or add new ones. `loud` events play at `CFG.creatures.roarGain`. Sound files (the Chameleon
   Wyvern's growl, screech and slams from the owner's viewer, the game's first): `npm run prepare-sound -- <in.wav> <family>/<id>_<n>`
   (`tools/prepare-sound.ts`: mono, the silence before it cut, its peak at -1 dB, Ogg Vorbis, a report against the
   budget) into `public/assets/sounds/`, a line in `data/sounds.json` (its files, variants chosen at random, and its
   `gain`), and its name in `CREATURE_SOUNDS` through `fromFile(name, fallback)`, the synthesised sound it plays while the
   file loads or if it fails (`src/audio/samples.ts`). Its source and licence go in `CREDITS.md`.
5b. **Pixel art from its texture** (every Tripo model, the owner's rule of 2026-10-05; the game's look). Step 4 runs it:
   the texture made pixel art at the size the game draws the creature, `<id>.texel.png` and `<id>.glow.png`, named in
   `data/creatures.json`'s `texel` (a unit test fails for a creature without them). Tuning is `CFG.creatures.texel`. It
   reads the game's file, so it needs no source model; after changing the tuning or a creature's height, run
   `npm run texel-bake -- <id>` (`-- all` for every creature).
6. **Preview.** With `npm run dev` running, `npm run creature-preview -- <id>` writes `creature-previews/<id>.mp4`.
7. **Dev menu.** Add a name in `DEV_STR.creatureNames` (`src/dev/strings.ts`); the menu lists creatures from the data by itself. It's under
   Galleries → Animated creatures:
   - "stand it here", "Roar now", "Take them away";

   The texel grid is the Look tab's pixel look switch. Hooks: `__game.showCreature(id)`, `creatures`, `roarNow()`,
   `takeCreatures()`.
8. **Record.** Add a row in the asset log of `docs/assets.md`.

A creature on two legs, with wings or with no legs needs its own walk.

## People on a Mixamo rig (the townspeople, 2026-10-09)

Tripo's humanoid rig gives every figure the same skeleton (`mixamorig:Hips` to the fingers; the loader drops the colon,
`mixamorigHead`), so one recipe serves all thirteen: `tools/creatures/townsfolk.ts` (`TOWNSFOLK_RECIPES`, one row of
`FIGURES` each: height in tiles, budget, the hand that gestures, extras). `npm run animate-creature -- scribe <in.glb>`.

- **Facing:** `face: 'mixamo'` turns each to face +z from its own hips and shoulders (`mixamoFacing` in creatureRig.ts),
  since figures caught mid-stride or with a prop held out don't face their bounding box.
- **A lost rest pose:** a model that went through an FBX converter (here the storm caller, the wizard and the forager)
  arrives with every joint at the origin and every vertex on the hips. `restFromBind` (creatureRig.ts) rebuilds the rest
  from the inverse bind matrices, turns the skeleton onto the mesh (the left hip at +x) and centres the hips on it; then
  `weightsLost` (more than 80% of vertices on one bone) or `rebind: true` binds the skin again from `MIXAMO_SKIN`. The other
  ten keep Tripo's weights.
- **Clips from the rest pose,** whatever it is (each stands as Tripo left it, a prop in hand): `idle` (4 s, breathing and
  settling), `talk` (2.5 s, nods and a gesture of the free hand; `hand` per figure), Dr. Jelly's `give`, Kaelith's `sweep`
  and `kneel` (one knee down, the feet held by the legs' IK, `MIXAMO_LEGS`). A figure left in a T-pose has its arms brought
  down (`armsDown`, degrees; the wizard's 62).
- **Budget:** `enemy` (8,000) for the people, `boss` for Kaelith; `triangles` raises one where the simplifier stalls on
  cloth (the wizard and Dr. Jelly, 10,000).
- **In the game:** `madeModel(id, still)` in madeCreatures.ts loads and dresses one (the texel bake, its height, a
  shadow) for anything that wants a made figure; vigil/town.ts stands the townspeople and the Ferryman with it
  (`standMade`, `moveMade`: idle, talk while it speaks, the head bone turned to the mage after the clip; a little taller than the mage and drawn on the pixel look's fine layer at half-size pixels (the owner's ask, 2026-10-09: `fine` in the recipe and data/creatures.json, the texture baked at that pixel by texel-bake) and lit of themselves, `CFG.vigil.town.madeLight` through texturePixel.ts's `selfLight`; the code-built
  figure stays until the model has loaded, and is the fallback). The dev menu's Townspeople switches made and code looks
  (`setTownWear`, `ossuary.townWear`). Dr. Jelly and Kaelith are baked and in the Galleries, but their fights and gestures
  still drive the code-built looks.

## Where things are

| What | Where |
| --- | --- |
| Tool, `--bones` | `tools/animate-creature.ts` |
| Rig, IK, bake, skin | `tools/creatureRig.ts` |
| Faces, texture | `tools/orientFaces.ts`, `tools/padIslands.ts` |
| Recipes | `tools/creatures/<id>.ts`; the thirteen people `tools/creatures/townsfolk.ts` |
| Preview | `tools/creature-preview.ts` and `.html` |
| In the game | `src/actors/madeCreatures.ts`, `CFG.creatures`, `src/actors/texturePixel.ts`; the gallery `src/dev/creatureGallery.ts` |
| Sounds | `src/audio/creatureSounds.ts`; from files: `tools/prepare-sound.ts`, `data/sounds.json`, `src/audio/samples.ts` |
| Pixel art from its texture | `tools/texel-bake.ts`, `src/render/texelBake.ts`, `src/actors/texturePixel.ts`, `CFG.creatures.texel` |
| Tests | `tests/unit/creatureTools.test.ts`, `tests/unit/sounds.test.ts`; the browser test "a creature made in Tripo…" |

## A creature that fights: the Hallowed Hart (2026-10-23)

Floor 4's boss, the first creature that fights (`tools/creatures/hart.ts`). Tripo's quadruped rig (`rig.glb` carried no
armature; `walk.glb`, with Tripo's preset walk, did and was the input) named most bones (`tripo::Spine_0`, the legs'
`Limb`s) and bound the skin well enough to keep (`SKIN = null`); it came facing +x (`face = -90`). Tripo has only `walk`
for a quadruped (idle and run answer "invalid parameter"), so all five clips are made in code: `idle`, `walk` (a
lateral-sequence walk), `charge` (a rotary gallop, neck low), `stamp` (rearing about the hind hips, `rear`, both forefeet
driven down at its `at`, 0.55 s) and `hit` (a flinch and a dazed shake). A clip may say how fast it carries the creature
(`speed`) and when its blow falls (`at`); both go into data/creatures.json. Height 2.8 tiles (the still model's size in
the fight), boss budget (1.48 million triangles simplified to 14,548).

**How a boss plays its clips** (`madeBosses.ts`): a boss whose `CFG.madeBosses` entry names a `creature` is loaded at
boot (`preloadBossCreatures`, `preloadCreature`), since a boss's look is built at once; once loaded it replaces the
still model, fitted and dressed the same way (its surface `madeSurface` on the creature's baked pixel-art texture, so a
hit lights it as it lit the still). The look returns `clip(name, { speed, beat })`, which the fight calls each step in
its states (`updateHart`): the clip is cross-faded in once (`blend`) and paced, to the speed it covers (the walk by
`walkSpeed`, the gallop by its `speed`, times the model's scale) or so its `at` falls in `beat` seconds, within `pace`.
The mixer runs on the boss's own clock in its `idle(t)`. What the fight did to its code look's parts still shows: the
head it lowers to aim and shakes when stunned bows the neck's bones (`bow`) on top of the clip, about the creature's own
left-right axis, and the eye's glow rides the head bone (`head`). The kept parts (ring, halo, floor circle) are as for a
still. ?assets=off, a model that failed, or the dev menu's switch (Galleries → Animated creatures, "Hallowed Hart,
Hollow Warden fight as", one switch for every boss with a creature; `__game.bossCreatures(on)`, `__game.bossClip`) leave
the still model, and without that the look in code. A clip named in the entry's `over` (with the seconds it rests before
it plays again) is played over the others rather than in their place: made additive from its first frame, so it must
start and end at rest and leave the legs alone (the Warden's flinch, over its walk). A clip asked for `after` waits until
a blow that does not loop has played out (the Warden standing to throw its volleys once its rear has settled).

The gallery plays every clip a creature has besides `idle` and `walk` in turn (its roar first); "Roar now" plays the
first. `disposeTree` disposes a skinned mesh's skeleton (its bones' texture) with it.

### The Hollow Warden (2026-10-23)

Floor 1's boss, the brown owlbear under a crown of five candles that the still `foe_warden.glb` was baked from
(`tools/creatures/warden.ts`, its clips after the grey owlbear's). Tripo's quadruped rig again: `walk.glb` carried the
armature (`rig.glb` none), facing +x (`face = -90`), its bones named (`tripo::Root` carries the spine and the hind legs,
`Spine_2` the chest with the forelegs and the neck `Head_0`, the head `bone_5` the candles), the skin kept (`SKIN =
null`). Four clips, all in code: `idle`, `walk` (heavy, lateral-sequence, swaying over the planted side), `rear` (a
crouch, up on its hind legs with its forelegs raised and its claws out, its head thrown back roaring, both forepaws
slammed down at its `at`, 0.75 s) and `hit` (a flinch of the head and shoulders, played `over` the others when it is
struck, resting 1.4 s between). `updateWarden` plays `walk` at its pace (its bob in code left to the still), `rear` timed
to each wind-up so the slam falls as the burst or the volley goes out, and `idle` through the volleys once the rear has
settled. Its config keeps the still's `hot` (the candle crown's glow) and `tint`; it has no `bow` (its fight lowers no
head). Height 2.2 tiles in the gallery (in the fight it is fitted to the look in code, as the still), boss budget (1.46
million triangles simplified to 14,550).

**What the later bosses added** (2026-10-23): `moves` names a part whose place the fight moves (the War-Tiger's pounce
arc and shakes, Kaelith sinking into shadow, `under`, may go below the floor); `fire` the bone a boss's flames ride (the
Pyre Knight's helm); `look` the neck bones the fight's head turning turns (the Twin Guardian's gaze, even as stone);
`tint` the creature's own tint where its texture is lighter or darker than the still's. A clip with no `at` is timed by
its first sound (Kaelith's sweep). A boss that stands as a statue holds a `statue` clip (the fight calls its `idle` in
that state too). `__game.bossClip` reads the first boss in the room that is a creature (of the twins, the first), `__game.bossClips` every
boss in it.
Recipes share `tools/creatures/moves.ts` (keys, turns, a step cycle, rearing, Tripo's preset clips read and replayed)
and, for Tripo's biped rig, `tools/creatures/biped.ts`. Frames of each fight, creature on and off:
`npx tsx asset-previews/rig/fightshots.ts <boss> on|off` (asset-previews is not in the repo, nor are the rigged sources
and presets the recipes read from it: `asset-previews/rig/<id>/`).

### The War-Tiger

Floor 3's boss (`tools/creatures/tiger.ts`): Tripo's quadruped rig (`walk.glb`), facing -z (`face = 180`), the skin kept.
All clips in code: `idle`, `statue` (held still as stone), `walk` (a low prowl), `crouch` (sinking to spring, tail
lashing, deepest at its `at`), `pounce` (stretched, forepaws down at its `at`; the fight's `body` lifts it, `moves`),
`swipe` (a forepaw raised and raked down at its `at`), `roar` (also its waking) and `hit` (dazed, its stun). Height 1.8,
14,543 triangles. Its still model (`foe_tiger.glb`) faces a quarter turn off its walk; the creature faces it.

### The Drowned Abbess

Floor 2's boss (`tools/creatures/abbess.ts`), an axolotl: quadruped rig, facing +x (`face = -90`), the skin kept, its
gills on their own bones. In code: `idle`, `walk` (swimming over the floor, body and tail weaving), `wail` (reared up,
gills flung wide, risen by its `at` and held through the volleys; also its burst up out of the water), `dive` and `hit`
(`over`). It has no jaw bone; its chin drops a little. Height 1.5, 14,547 triangles.

### The Pyre Knight

Floor 2's knight (`tools/creatures/pyre.ts`): Tripo's biped rig and its preset clips. `idle` and `walk` (in place) are
Tripo's; `slash` a window of Tripo's (the blade overhead and down at its `at`, timed to the first embers, played on
through the spray); in code on the presets: `aim`, `charge` (the walk at a run, bent forward), `crouch` (held through the
leap) and `hit` (Tripo's `hurt` sits him on the floor for 14 s). His flames ride his `Head` bone (`fire`); his texture is
lighter than the still's (`tint` 0.75). Height 3.2, 14,548 triangles.

### The Twin Guardians

Floor 3's pair (`tools/creatures/twins.ts`). The first guardian on Tripo's biped rig: `idle`, `walk` (in place) and `slam`
(a window of Tripo's slash, its hips kept square to the mage: `square`) from the presets; `statue`, `guard` (its left paw
raised as a shield), `rear` (its gaze) and `hit` (`over`) in code; `look` turns its neck after the mage. Height 2.45,
14,548 triangles.

The second guardian (`tools/creatures/twins2.ts`, height 2.6, 14,549 triangles) is **the recipe for a model Tripo can't
rig**. Tripo's biped auto-rig failed on it twice (the thighs' rest heights 0.41 and 0.61 of the top bone, the head 0.44;
then 0.65, 0.95 and 0.81; the first guardian's are 0.49, 0.49 and 1.00), so it was rigged in Blender 5.2 headless on the
first guardian's Tripo skeleton (the scripts in `tools/creatures/twins2-rig/`; `build.sh` runs them in turn, what they
make goes in asset-previews/rig/twins2/blender/: Rebuilding a creature, below):
- **The fit** (`fitjoints.py`): both came from Tripo in the same frame (facing +x, a metre wide), so the armature is not
  scaled; the key joints (knees, ankles, toes, neck and head, shoulders, elbows and wrists, mirrored) are placed by hand
  inside twins2's mesh, read off side and front slabs of it with the joints drawn in (`fitcheck.py`), every other bone
  following its placed ancestor and the twist bones kept at their fraction of the limb. Its body is more upright and
  shallower than the first's: the knees come forward, the arms and the head back.
- **The bind** (`rig2.py`): Blender's automatic (bone heat) weights on a welded, decimated proxy (85,000 faces; heat finds
  no solution at the model's size, so it is weighed ten times larger), carried to the full mesh by nearest-face
  interpolation. The model is one fused shell, its forearms grown into its thighs and its beard onto its knees, so heat
  spreads across them: a mask (`mask.py`) keeps the neck and head bones to the head, crest and beard and each side's
  bones to its side, and below the shoulders the arms are **cut free** (each face goes to an arm or to the rest by its
  weights, the edges between them are split, each side keeps only its own bones); else a raised arm drags a sheet of
  skin up from the thigh. Bones Tripo bound nothing to (twists, share bones, the root) bind nothing here.
- **The GLB** (`assemble.ts`): not Blender's export of the armature (its importer changes the bones' rest rotations) but
  the first guardian's GLB itself, only its joints' translations moved to the fitted places, its inverse binds made
  again from them and its mesh replaced by Blender's (joints matched by name, twins2's textures). The bones' rest
  rotations stay the first guardian's, so Tripo's preset clips (local rotations, read from asset-previews/rig/twins/ by
  bone name) replay on it as on the first: its seven clips are the first's, and its recipe re-exports twins.ts. Its skin
  is kept (`SKIN = null`).
- **The check** (`build.sh --check`): `clips.py` renders frames of each baked clip beside the first guardian's (sheets by
  `sheet.py`, which needs Pillow); `stretch.py` marks on the rest pose the edges a frame stretches, `colors.py` colours
  each vertex by its strongest bone, `fitcheck.py` draws the fitted joints on slabs of the mesh. Weak points: its fists and inner thighs stretch in the slam's highest frames, the
  slam twists it as Tripo's slash twists the first, and its feet slide a little in the walk (the first's legs were
  shorter); nothing tears into sheets. In the game: `npx tsx asset-previews/rig/twins2/fightshots.ts` (both guardians
  side by side in each state).

### Kaelith

The Seal's boss fights as the rigged Mixamo figure baked for the galleries (`kaelith`, "People on a Mixamo rig"): `idle`
while it stalks, `sweep` timed to its fan, `talk` (its free hand) for its volleys and the black sun's pull, `kneel` as it
holds the seal (its body no longer lowered in code) and at the end, played through and held (`kaelith_kneel`). Its
sinking and reeling come from the fight's `body` (`moves`, `under`). No walk or hit clip: it glides and reels as before.

**Next:** another boss or foe fights as its creature the same way: a `creature` in its `CFG.madeBosses` entry and
`e.clip?.(...)` in its states.

## Rebuilding a creature

The Tripo GLBs a recipe reads are 40 to 60 MB each and stay out of the repo (asset-previews/ is gitignored); the game's
files they make are in it (`public/assets/creatures/<id>.glb`, `data/creatures.json`, the texel bake). To make one again,
fetch its inputs into `asset-previews/rig/<id>/` and run the recipe:

```sh
# Tripo's preset clip on the rig already made (retargeted again, no new rig; `walk.glb` carries the armature and the
# skin the recipe binds, and is its input)
tripo process animate <project> --rig-type <type> --animations preset:<type>:walk -o asset-previews/rig/<id>/walk.glb --timeout 20m
npm run animate-creature -- <id> asset-previews/rig/<id>/walk.glb
# the model as rigged, without its armature (only the second Twin Guardian needs it)
tripo export <project> -o asset-previews/rig/<id>/rig.glb --export-timeout 10m
```

A biped's recipe (`biped.ts` `presets`) also reads `idle.glb`, `slash.glb` and `hurt.glb` from the same folder, fetched
the same way (`preset:biped:idle`, `:slash`, `:hurt`). `tripo project history <project>` lists a project's operations;
the rigging operator is in the table for reference only: `tripo export --operator-id` downloads it meshopt-compressed
(a quarter of the size), which neither Blender's importer nor the tools here read without a decoder. Note that Tripo's
CLI ran a real export under `--dry-run` (2026-10-23). A fresh export is the same model and textures but not the same
file: twins2's came back with 737,012 vertices against the 737,268 of the `rig.glb` it was rigged from (fetched by
`tripo process rig` itself), so a rebuild from it is close, not byte for byte.

| Creature | Tripo project | Rigging operator | Rig type | Fetch into `asset-previews/rig/<id>/` | Rebuild |
| --- | --- | --- | --- | --- | --- |
| `hart` | `234b5943-6de7-4050-b797-3f7fe9c688f8` | `5859e51f-7c25-4240-86d2-403398e4eea9` | quadruped | `walk` | `animate-creature -- hart …/walk.glb` |
| `warden` | `392a24e0-0b9b-46f4-b14a-c8570b807d45` | `4fce911c-6134-4afb-9589-a8c3a26172ca` | quadruped | `walk` | `animate-creature -- warden …/walk.glb` |
| `tiger` | `17b1bdb3-b9d9-4b06-ae3e-b8557e5a6b6d` | `4da8097c-a297-44a6-b470-bf066a04e4b9` | quadruped | `walk` | `animate-creature -- tiger …/walk.glb` |
| `abbess` | `2dd0cfe4-4d3e-4c86-9f97-6d72af637100` | `045c46cd-a6fb-475c-a46c-488a96a63d3b` | quadruped | `walk` | `animate-creature -- abbess …/walk.glb` |
| `pyre` | `2a631aee-2c79-47c6-8567-9416f79a10ff` | `5921990b-d67f-4370-b439-d1068a21a0d1` | biped | `idle`, `walk`, `slash`, `hurt` | `animate-creature -- pyre …/walk.glb` |
| `twins` | `598be10b-fc8b-4070-b6d1-9dacfa7608e8` | `e3a2a983-7345-4d9e-8e9a-1776233efbe1` | biped | `idle`, `walk`, `slash`, `hurt` | `animate-creature -- twins …/walk.glb` |
| `twins2` | `00fd5c62-0710-4ec4-9043-d9740f9725d3` | `40bf7641-e737-4655-a0f8-3fee57b5ceab` (its rig unusable) | biped | `rig.glb` only; and `twins`' `walk` and presets | `tools/creatures/twins2-rig/build.sh` |
| `fennex` | `5ff71fbe-4053-496a-bcd9-d5715897b146` | `22403fc2-c52f-4c25-98c8-739ad72f21f6` | quadruped | `walk` | `animate-creature -- fennex …/walk.glb` |
| `fennex_full` | `955ffb1a-8d94-4e67-b5c4-64a68777d5f9` | `b195ec2f-d9d2-41e6-b9c4-10f06fbc6797` | quadruped | `walk` | `animate-creature -- fennex_full …/walk.glb` |

The second Twin Guardian's rig from Tripo is unusable (its two auto-rigs failed), so only its mesh is fetched: its rigging
operator's `rig.glb` as `asset-previews/rig/twins2/rig.glb`, with the first guardian's `walk.glb` and presets in
`asset-previews/rig/twins/`. `tools/creatures/twins2-rig/build.sh [--check] [twins walk.glb] [twins2 rig.glb] [work dir]`
(Git Bash; Blender 5.2 at its default Windows path or `$BLENDER`) fits the joints, binds the mesh, assembles the GLB in
`asset-previews/rig/twins2/blender/` and bakes the clips; run on the same inputs it makes the same `rigged.glb`, byte for
byte (checked 2026-10-23). Kaelith and the townspeople come from the owner's Mixamo exports (People on a Mixamo rig), not from these.

## A familiar as a creature: Fen-Nex (2026-10-23)

The familiar of the Rune of Fen-Nex as two creatures (`tools/creatures/fennex.ts` holds the recipe both share,
`foxClips`; `fennex_full.ts` its full shape's bones and gaits): `fennex`, the Rune Fox (stages 1 and 2), and
`fennex_full`, its full shape (stage 3). Tripo's quadruped rig, `walk.glb` the input, both facing +z (`face = 0`), the
skin kept; no jaw bone in either. The fox's hind legs end at the hock (its foot has no bone: `paw` only); the full
shape's legs have four bones, its shoulder feathers their own (`wings`), and Tripo named its right hind leg `0_Right`.
Clips, all in code: `idle`, `trot` (diagonal pairs, at the heel), `run` (a rotary gallop, its dart), `bite` (the neck
and head snapped forward at its `at`), `breathe` (the full shape only: head drawn back, thrown forward at its `at`),
`shake` (a dog's shake). `trot` and `run` carry their `speed`. Enemy budget (14,752 and 14,806 triangles simplified to
about 7,760). Heights: the Rune Fox 0.85 (its look in code at stage 2, to its ears: its texel baked for the larger), the
full shape 0.92 (stage 3).

**How it plays them** (`actors/fennexLook.ts`, `combat/fennex.ts`): both are loaded at boot (`preloadFennex`), as its
look is built at once; once loaded, `fennexLook(stage)` returns the creature (scaled so the familiar's own stage scale,
`CFG.artifacts.fennex.scale`, gives its look in code's size), else the look in code. It wears the creature's baked
pixel-art material itself (`readyCreature(id).mat`, shared, its glowing markings lit: no hit lights a familiar), and is
an actor in the pixel look (`markActor`: outline and rim, as the bosses' creatures). Its gait follows its smoothed speed
(`CFG.artifacts.fennex.made`: `idle` below `still`, `run` on a dart or above `run` times its heel speed, else
`trot`), paced by the clip's `speed` within `pace`, cross-faded by `blend`. `bite` and `breathe` are played over the
gait (additive, `overClip` in madeCreatures.ts: neck, head and wings only, rest to rest): the bite starts as far out as
the dart covers in its `at`, and the breath is drawn first, its bolts going out at its `at` (in code they go out at
once). `shake` plays once as it grows and the gait waits for it. What the texture paints (the fox's runes, gold swirls,
spine line and starry plume; the full shape's flame-tipped feathers, ear flames, leg spirals and tail flame) is no longer
built; what rides its bones in code: the fox's eye glows, paw mist, plume aura, twinkling stars and motes; the full
shape's eye glows, mouth glow (lit by the breath) and tail-flame glow, and embers. Bones are found by their name as
three.js sanitises it (`tripo::Head_2` is `tripoHead_2`). ?assets=off, a file that failed, or the dev switch (Galleries
→ Animated creatures, "Fen-Nex is", `__game.fennexCreature(on)`: built again at once) leave the looks in code.
`__game.fennex` names its `creature` and `clip` (time, pace, the clips over it). Both stand in the gallery like the
others. Frames on and off: `npx tsx asset-previews/rig/fennex/shots.ts on|off`.
