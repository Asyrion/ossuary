# Creatures from Tripo, animated and voiced in code

**Status: works, and it's how we'll make models like this from now on.** The owner's experiment of 2026-10-03 was the
owlbear: a rigged model from Tripo3D, given a walk, a roar and an idle in code, plus sounds on its paws and its roar, all
synthesised. The owner checked it in the game and called it a success ("the animations look really good"). This file
records what we found and how to do it again.

So far the creatures are looks only. They stand in the room, walk, roar and rest, but they don't fight. Making one a foe
or a boss is a later step (see [Next](#next-a-creature-that-fights)).

## Handing a new model to a new session

A new session doesn't remember the owlbear's conversation, only what is written here. Start it with the message below:
attach the rigged GLB, fill in the brackets, and delete the choices that don't apply. Naming this file in the message
makes sure the session reads the guide before it starts.

```
New creature from Tripo: [name]. The rigged GLB is attached.

Follow docs/creatures.md, the owlbear's workflow, from step 2 of the guide:
read its rig with --bones, write its recipe from tools/creatures/owlbear.ts,
run npm run animate-creature, give it sounds, and add it to the dev menu
(Galleries, Animated creatures) with its three looks.

About it:
- What it is: [four-legged / two-legged / winged / a serpent / ...], [a line on its character]
- Size in the game: about [N] tiles tall; budget [enemy, 8,000 triangles / boss, 15,000]
- Clips: idle, walk and [roar / bite / swipe / charge / ...];
  how they should feel: [heavy and slow / quick and snapping / ...]
- Sounds: [its voice, its steps, anything special]; reuse the owlbear's where they fit
- In the game: looks only for now / [plan it as a foe or boss: where, and what it does]

Send me a preview video (npm run creature-preview) before anything ships.
I'll check it in the game. Ship only when I say so.
```

A creature on four legs follows the owlbear closely. One on two legs, with wings or with no legs needs its own walk,
so expect an extra round of previews.

## What we found

What Tripo gives:

- **The rig is usable, the skin is not.** Tripo's auto-rig produced a sensible skeleton: 39 bones for the owlbear, a spine
  to the head, four legs and toes. They are named only `bone_0` to `bone_38`, plus a `neutral_bone` at the origin, so
  you tell which is which by where each one stands (`--bones`, below).
  - The skin weights were broken. Each vertex was bound rigidly to a single bone, and half of them (12,507 of 25,475)
    went to `neutral_bone`, which never moves.
  - The legs' upper bones carried no vertices at all; only the toes did. Bending a leg tore the paw off the body.
  - The tool therefore throws Tripo's weights away and binds the skin again from the bones' segments (`reskin`). Each
    vertex follows the three nearest segments, with gates that keep a leg's skin to its own side and height. A hand rule
    gives the lower beak to the jaw.
- **About half the surface was inside out.** Those faces were wound, and lit, facing into the body. Tripo marks its
  material two-sided, so in its own viewer you don't notice.
  - In the game the pixel-art material was one-sided, so those faces vanished: the floor showed through the owlbear.
  - Where an inside-out patch met an outward one, the light broke along a jagged line. It showed as orange specks under
    the torches.
  - The tool turns every face outward: each one faces the side from which rays get out of the model (`orientOutward`).
    The look stays two-sided, because some parts are genuinely single sheets, such as the feather flaps over the rump.
- **The texture is hundreds of tiny islands on black, with no gutter between them.** Scaled down, or sampled a few texels
  round each vertex for the pixel-art bake, the seams picked up black. The tool grows every island outward into the gaps
  before anything else reads the texture (`padIslands`). The mesh uses only about a quarter of the texture: Tripo paints
  fur beyond its islands, and the padding is free to overwrite that.
- **Too many triangles for the game.** The owlbear had 20,076. The tool simplifies it to the kind's budget before
  binding the skin (14,550 for a boss's budget of 15,000). It also drops the normal map, which the pixel-art look never
  reads, and cuts the textures to 1,024 px JPEG. The game's file is 1.7 MB.

What code can do with it:

- **Animation in code works well for a four-legged creature.** A clip is a function from time to pose, built from a few
  moves:
  - turn a bone about the creature's own axes;
  - move the pelvis;
  - place a paw where it should stand, with two-bone IK that bends each leg the way it bends at rest.

  A walk keeps each paw planted while the body passes over it (no sliding feet), in a heavy lateral walk with a bob, roll
  and sway. The roar crouches, rears onto the hind legs, throws the head up with the beak wide, shakes it, and slams the
  forepaws down. The tool bakes each clip at 30 frames a second into ordinary glTF animations that any engine can play.
- **The game's own techniques carry over unchanged.** The mage's pixel-art bake (`bakeHeroPixel`: texture into vertex
  colours, a small palette, light in bands) and the texel grid fit a Tripo creature as they fit the mage. It costs one
  skinned mesh and a shadow: under 8 draw calls.
- **Sound in code works.** Each clip carries events: a paw coming down, the inhale, the roar, the slam. The game plays a
  synthesised sound on each, placed where the creature stands:
  - footfalls: a thump, fur and claw clicks, heavier at the front;
  - the roar: a growling voice through moving formants with grit and breath, under it a chest boom, over it an owl's
    screech;
  - the slam.

  The preview video renders the same sounds offline on the same timeline.
- **The walk's speed comes from its paws.** The tool works out how far a stride carries the body each second. The game
  moves the creature at exactly that pace, so its feet don't slide.

## The guide: a new creature

### 1. In Tripo

- Make the model standing in its rest pose, all four feet (or two) on the ground, with no base.
- Rig it with Tripo's auto-rig: the skeleton is kept, the weights are replaced anyway. Export GLB with textures.
- Any size or orientation that Tripo exports is fine. The tool scales it to the height its recipe asks for. The recipe
  assumes the creature faces +z, as the owlbear did. `--bones` shows which way the head lies.

### 2. Read the rig

```
npm run animate-creature -- --bones path/to/model.glb
```

This prints the skeleton as a tree. Each line is a bone with where its joint stands (x left-right, y up, z forward, in
the model's units) and how many vertices Tripo bound to it most. Then come the triangle count, the textures and whether
the material is two-sided.

From the positions, name the bones:
- **Spine:** the chain running along z at the body's height.
- **Head:** the forward end of the spine. The jaw is the bone low at the very front.
- **Legs:** the chains that run down to y ≈ 0. Each has a hip or shoulder, a knee or elbow, and an ankle or wrist, then
  the toes. Their x sign tells the two sides apart; the owlbear's recipe calls its +x legs the right ones.

### 3. Write the recipe

The recipe is `tools/creatures/<id>.ts`; copy `owlbear.ts` and change it. It exports:
- **`LEGS`:** each leg's `root`, `mid`, `end` and its `paw` bones, for the IK.
- **`SKIN`:** the segments the skin binds to. Use wide reach for the spine and head, and gate each limb segment to its
  side (`side`) and below a height (`below`), so a leg never pulls the belly.
- **`jawOf`:** returns the jaw bone for vertices in a box round the lower beak or jaw, or `null` if there's no jaw.
- **`MOVING`:** the bones whose position (not only their turn) changes; usually just the pelvis.
- **`CLIPS`:** `idle`, `walk` and `roar` (the names the game plays). Each has its `duration`, `loop`, a `pose(rig, t)`
  and its sound `events`. In a pose, use `rig.turn(bone, axis, degrees)`, `rig.move(bone, [x, y, z])`,
  `rig.update()` after moving the body, then `rig.place(leg, [x, y, z], pitch)` for each paw.
- **`WALK_SPEED`:** the stride over the time a paw is down.

Add the recipe to `RECIPES` in `tools/animate-creature.ts`, with how tall it stands in the game (`height`, in tiles) and
its budget (`budget`: a kind from `data/assets.json`, such as `boss` or `enemy`).

### 4. Run the tool

```
npm run animate-creature -- <id> path/to/model.glb
```

In order, it:
1. simplifies the mesh to the budget;
2. turns the faces outward;
3. binds the skin again;
4. bakes the clips;
5. pads the texture's islands;
6. writes `public/assets/creatures/<id>.full.glb` (the textures as imported, with the normal map);
7. drops the normal map and cuts the textures to 1,024 px;
8. writes `public/assets/creatures/<id>.glb`, the game's file;
9. writes `data/creatures.json`: the files, the height, the walk's speed, each clip's length, loop and events.

It stops with an error, before writing anything, if the model is still over its budget. Rerun it after every change to the recipe; it takes a few
seconds.

### 5. Sounds

A clip's events name sounds in `CREATURE_SOUNDS` (`src/audio/creatureSounds.ts`). Reuse the owlbear's (`pawFront`,
`pawRear`, `inhale`, `roar`, `slam`) or add new ones in the same way, synthesised with Web Audio. Mark an event `loud`
to play it at the roar's level (`CFG.creatures.roarGain`) instead of a step's (`stepGain`).

### 6. Preview

```
npm run dev
npm run creature-preview -- <id>
```

This renders `creature-previews/<id>.mp4`, about 8 seconds: the creature rests, walks across, turns, roars and rests,
with its sounds and the first floor's soundscape under them. It's quick to send for a first look before checking in the
game.

### 7. In the game

- Give it a name in `STR.dev.creatureNames`. The dev menu lists the creatures from `data/creatures.json` by itself.
- The dev menu's **Galleries** tab, under **Animated creatures**, has:
  - "<name>: stand it here" puts it beside the mage. It walks a lap, stops, turns to roar at the mage and rests, and
    loops.
  - "Roar now" makes it roar.
  - **Look** switches how it's drawn, for every creature at once:
    - **pixel art** is the game's look: its texture baked into its colours and light in bands, as the mage is drawn;
    - **as made** is the game's file, with its 1,024 px texture and smooth light;
    - **as imported** is Tripo's textures at their own size, with the normal map, from `<id>.full.glb`. It's loaded
      only when chosen, freed when you switch away, and outside the budget.

    The choice is remembered in the browser.
  - "Take them away" removes it.
- The texel grid is separate: the dev menu's **Look** tab turns the pixel look on or off for the whole screen. So
  pixel art with the grid on is exactly how a creature would appear in the game. As imported with the grid off shows
  Tripo's model in full detail.
- Hooks: `__game.showCreature(id)`, `__game.creatures` (each one's look, texture size, clip and place),
  `__game.roarNow()`, `__game.takeCreatures()`, `__game.creatureLook`, `__game.setCreatureLook('pixel' | 'made' | 'full')`.
- The browser test "a creature made in Tripo and animated in code" covers the owlbear: it stands, walks, roars, switches
  between the three looks and goes away. A new creature can join it.

### 8. Record it

Give the creature a row in the asset log of `docs/assets.md`. It must stay within its budget; `<id>.full.glb` is named
there as the comparison outside it.

## Where things are

| What | Where |
| --- | --- |
| The tool (and `--bones`) | `tools/animate-creature.ts` |
| Rig, IK, baking, the new skin | `tools/creatureRig.ts` (`Rig`: `turn`, `move`, `leg`, `place`; `bake`; `reskin`) |
| Faces turned outward | `tools/orientFaces.ts` (`orientOutward`) |
| Texture islands padded | `tools/padIslands.ts` (`padIslands`) |
| A creature's recipe | `tools/creatures/<id>.ts` (`owlbear.ts`) |
| The preview video | `tools/creature-preview.ts` and `.html`, into `creature-previews/` |
| Files for the game | `public/assets/creatures/<id>.glb` and `<id>.full.glb`, `data/creatures.json` |
| In the game | `src/actors/madeCreatures.ts` (`showCreature`, `updateCreatures`, `setCreatureLook`), tuning `CFG.creatures` |
| Sounds | `src/audio/creatureSounds.ts` (`CREATURE_SOUNDS`), played through `Sfx.place(x, z)` |
| The pixel-art bake | `src/actors/heroPixel.ts` (`bakeHeroPixel`, keeping the model's material side) |
| Tests | `tests/unit/creatureTools.test.ts` (faces turned, islands padded); the browser test above |

## Next: a creature that fights

The clips are ordinary glTF animations and the game already plays them, so a creature from Tripo can become a foe or a
boss. Its behaviour would go in `foes.ts` or `bosses.ts` as the code-built ones' do, playing `walk` while it moves and an
attack clip (the roar, or new ones such as a swipe or a charge) at its telegraph. Its events would then carry the blow as
well as the sound. A biped would need its own walk (arms swinging, two legs), but the same tools serve it. Nothing is
planned yet; it waits for the owner's say on which creature and where.
