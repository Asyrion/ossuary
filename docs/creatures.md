# Creatures from Tripo, animated and voiced in code

A rigged Tripo model gets its clips (idle, walk, roar) and sounds in code, and is shown in the dev menu. The owlbear is
the first and the template (2026-10-03, approved by the owner). For now creatures are looks only; they don't fight.

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

- **Skin weights.** Tripo's skeleton is usable but its bones are named only `bone_0` to `bone_N` plus `neutral_bone`, and
  the weights are broken: the owlbear had half its vertices on `neutral_bone`, and none on the upper legs. The tool
  binds the skin again from the bones' segments (`reskin`).
- **Inside-out faces.** About half the surface faced inward, hidden by Tripo's two-sided material. The tool turns each
  face outward (`orientOutward`); the look stays two-sided for single-sheet parts such as feather flaps.
- **Texture seams.** The texture is hundreds of islands with no gutter, so black bled into the seams. The tool pads the
  islands (`padIslands`).
- **Size.** Over budget (the owlbear had 20,076 triangles). The tool simplifies to the budget, drops the normal map and
  cuts the textures to 1,024 px.

## Steps

1. **Tripo.** Rest pose, feet on the ground, no base, auto-rig, export GLB with textures. Facing +z, as the owlbear did.
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
   - `WALK_SPEED`.

   Add it to `RECIPES` in `tools/animate-creature.ts` with `height` (tiles) and `budget` (`enemy` or `boss`).
4. **Run it.** `npm run animate-creature -- <id> <model.glb>` writes `public/assets/creatures/<id>.glb`, `<id>.full.glb`
   (textures as imported) and `data/creatures.json`. It stops before writing if the model is over budget.
5. **Sounds.** Events name sounds in `CREATURE_SOUNDS` (`src/audio/creatureSounds.ts`). Reuse the owlbear's (`pawFront`,
   `pawRear`, `inhale`, `roar`, `slam`) or add new ones. `loud` events play at `CFG.creatures.roarGain`.
6. **Preview.** With `npm run dev` running, `npm run creature-preview -- <id>` writes `creature-previews/<id>.mp4`.
7. **Dev menu.** Add a name in `STR.dev.creatureNames`; the menu lists creatures from the data by itself. It's under
   Galleries → Animated creatures:
   - "stand it here", "Roar now", "Take them away";
   - **Look**, for every creature: pixel art (the game's look), as made (1,024 px) or as imported (`<id>.full.glb`).

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
| Sounds | `src/audio/creatureSounds.ts` |
| Tests | `tests/unit/creatureTools.test.ts`; the browser test "a creature made in Tripo…" |

**Next:** a creature that fights would get a behaviour in `foes.ts` or `bosses.ts`, playing `walk` while it moves and its
attack clip at the telegraph. That waits on the owner's choice of creature.
