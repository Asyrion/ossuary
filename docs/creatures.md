# Creatures from Tripo, animated and voiced in code

A rigged Tripo model gets its clips (idle, walk, roar) and sounds in code, and is shown in the dev menu. The owlbear is
the first and the template (2026-10-03, approved by the owner); the dragonling the second (2026-10-03, a dragonling
the size of a horse, 1.8 tiles, boss budget: `tools/creatures/dragonling.ts`, the recipe for a model that came facing the wrong way, on a
two-legged rig, in a mid-stride pose); the Pukei-Pukei the third (2026-10-05, a feathered wyvern the size of a pony, 1.4
tiles, boss budget: `tools/creatures/pukei.ts`, the recipe for Tripo's newer rig with named bones whose weights are kept,
for wings, and the first with the owner's own sound files). For now creatures are looks only; they don't fight.

## Handover message

To start a new session, attach the rigged GLB, fill in the brackets and delete the choices that don't apply:

```
New creature from Tripo: [name]. The rigged GLB is attached.
Follow docs/creatures.md, steps 2 to 8.

- What it is: [four-legged / two-legged / winged / a serpent / ...], [a line on its character]
- Size: about [N] tiles tall; budget [enemy, 8,000 triangles / boss, 15,000]
- Showpiece clip (played as roar): [a roar / a bite / a swipe / a charge / ...]
- Feel: [heavy and slow / quick and snapping / ...]
- Sounds: [its voice, its steps, anything special]
- In the game: looks only / [a foe or boss: where, and what it does]

Send me a preview video before anything ships. Ship only when I say so.
```

## What Tripo gets wrong (the tool fixes it)

- **Skin weights.** Tripo's older skeleton is usable but its bones are named only `bone_0` to `bone_N` plus `neutral_bone`,
  and the weights are broken: the owlbear had half its vertices on `neutral_bone`, and none on the upper legs. The tool
  binds the skin again from the bones' segments (`reskin`). Tripo's newer rig (the Pukei-Pukei's, 2026-10-05) names its
  bones (`root`, `spine_01`, `head_01`, `arm_L_02`, `leg_R_03`, `toe_L_04`, `tail_05`, sockets such as `socket_hand_L`)
  and weights them well: look at its weights first (a bone's share drawn red) and keep them where they hold. A recipe
  with `SKIN = null` keeps them; `REMAP` moves the weights on some bones to another (its head chain ran on down the jaw
  and out along the tongue, smearing the whole head over it, so those went to the skull), and `jawOf` still claims the
  jaw outright.
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
- **Wings.** Turning a wing's bones by angles about the frame's axes left them sticking out sideways. The Pukei-Pukei's
  are laid by direction instead: each pose (folded along the flanks, raised as Tripo left them, thrown wide) gives the way
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
   - `face`, if Tripo set it facing other than +z (the dragonling's `-90`, the Pukei-Pukei's `-38`);
   - `SKIN = null` and `REMAP`, for a rig whose own weights hold (the Pukei-Pukei's).

   Add it to `RECIPES` in `tools/animate-creature.ts` with `height` (tiles) and `budget` (`enemy` or `boss`). For a
   four-legged model on a two-legged rig or in a pose that isn't at rest, start from `tools/creatures/dragonling.ts`; for a
   named rig, two legs, wings or a clip that turns round, from `tools/creatures/pukei.ts`.
4. **Run it.** `npm run animate-creature -- <id> <model.glb>` writes `public/assets/creatures/<id>.glb`, `<id>.full.glb`
   (textures as imported) and `data/creatures.json`. It stops before writing if the model is over budget.
5. **Sounds.** Events name sounds in `CREATURE_SOUNDS` (`src/audio/creatureSounds.ts`). Reuse the owlbear's (`pawFront`,
   `pawRear`, `inhale`, `roar`, `slam`) or the dragonling's (`clawFront`, `clawRear`, `hiss`, `snap`, `shriek`,
   `chitter`), or add new ones. `loud` events play at `CFG.creatures.roarGain`. Sound files from the owner (the
   Pukei-Pukei's growl, screech and slams, the game's first): `npm run prepare-sound -- <in.wav> <family>/<id>_<n>`
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
   - **Look**, for every creature: pixel art from its texture (the game's look), pixel art from its vertices (the first
     look), as made (1,024 px) or as imported (`<id>.full.glb`).

   The texel grid is the Look tab's pixel look switch. Hooks: `__game.showCreature(id)`, `creatures`, `roarNow()`,
   `takeCreatures()`, `setCreatureLook(l)`.
8. **Record.** Add a row in the asset log of `docs/assets.md`.

A creature on two legs, with wings or with no legs needs its own walk.

## Where things are

| What | Where |
| --- | --- |
| Tool, `--bones` | `tools/animate-creature.ts` |
| Rig, IK, bake, skin | `tools/creatureRig.ts` |
| Faces, texture | `tools/orientFaces.ts`, `tools/padIslands.ts` |
| Recipes | `tools/creatures/<id>.ts` |
| Preview | `tools/creature-preview.ts` and `.html` |
| In the game | `src/actors/madeCreatures.ts`, `CFG.creatures`, `bakeHeroPixel` in `src/actors/heroPixel.ts` |
| Sounds | `src/audio/creatureSounds.ts`; from files: `tools/prepare-sound.ts`, `data/sounds.json`, `src/audio/samples.ts` |
| Pixel art from its texture | `tools/texel-bake.ts`, `src/render/texelBake.ts`, `src/actors/texturePixel.ts`, `CFG.creatures.texel` |
| Tests | `tests/unit/creatureTools.test.ts`, `tests/unit/sounds.test.ts`; the browser test "a creature made in Tripo…" |

**Next:** a creature that fights would get a behaviour in `foes.ts` or `bosses.ts`, playing `walk` while it moves and its
attack clip at the telegraph. That waits on the owner's choice of creature.
