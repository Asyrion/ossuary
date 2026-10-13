# Creatures from Tripo, animated and voiced in code

A rigged Tripo model gets its clips (idle, walk, roar) and sounds in code, and is shown in the dev menu. The owlbear is
the first and the template (2026-10-03, approved by the owner); the dragonling the second (2026-10-03, a dragonling
the size of a horse, 1.8 tiles, boss budget: `tools/creatures/dragonling.ts`, the recipe for a model that came facing the wrong way, on a
two-legged rig, in a mid-stride pose); the Chameleon Wyvern the third (2026-10-05, a feathered wyvern the size of a pony,
1.4 tiles, boss budget: `tools/creatures/chameleon.ts`, the recipe for a model that came through the owner's
EDA-ModelWebViewer, for wings, and the first with sound files). For now creatures are looks only; they don't fight.
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
7. **Dev menu.** Add a name in `STR.dev.creatureNames`; the menu lists creatures from the data by itself. It's under
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
| In the game | `src/actors/madeCreatures.ts`, `CFG.creatures`, `bakeHeroPixel` in `src/actors/heroPixel.ts` |
| Sounds | `src/audio/creatureSounds.ts`; from files: `tools/prepare-sound.ts`, `data/sounds.json`, `src/audio/samples.ts` |
| Pixel art from its texture | `tools/texel-bake.ts`, `src/render/texelBake.ts`, `src/actors/texturePixel.ts`, `CFG.creatures.texel` |
| Tests | `tests/unit/creatureTools.test.ts`, `tests/unit/sounds.test.ts`; the browser test "a creature made in Tripo…" |

**Next:** a creature that fights would get a behaviour in `foes.ts` or `bosses.ts`, playing `walk` while it moves and its
attack clip at the telegraph. That waits on the owner's choice of creature.
