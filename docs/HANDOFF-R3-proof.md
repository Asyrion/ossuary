# Handoff: R3 step 2, the proof

**A task handoff** (one job). It lives until the proof is done; the session that finishes it moves what should outlast
it (the chosen route, the measured results, the proven commands) into `docs/art-bible.md` and `docs/assets.md`, then
deletes this file in its final commit. Written 2026-10-15 by the cloud session that built R2 and the art bible; it is to
be run in a **local Claude Code session on the owner's machine**, which has the Tripo CLI and Blender.

## Where things stand

- **Branch:** `r3-art-bible`, based on `main` after R2 step 6. It holds the art bible, the owner's reference pictures
  (`docs/art/reference/`) and this file. **No PR yet:** the owner wants the art bible and the proof to go to `main`
  together, and only when the owner says so.
- **R2 is done** (steps 1 to 6 merged and live); its done-when check, a week of CI without a flake fix, runs on its own
  (`nightly.yml` opens an issue "Nightly e2e failed" on a red night).
- **The art bible is decided** (`docs/art-bible.md`, section 4, the owner on 2026-10-15): a palette a floor, cool shadows
  and warm lights, mid tones carrying the room, hard closed outlines on actors and objects, the key light from above with
  a rim on actors, the framed HUD (variant B), chibi humanoids like the ranger reference. **One question is open:** code
  models or baked sprites for the actors (section 4.8). The proof is there to answer it, together with the owner.
- The decision page the owner saw (palettes, graded rooms, HUD variants):
  https://claude.ai/artifact/9e2aEXFeAtrWcMMjop9kkr

## The job

`docs/RESET-plan.md`, Phase 3, step 2:
- Port Godot-Tamer's tools to `tools/art/`.
- Draw **one room of floor 1, the mage, one foe and the Warden** both ways, in the art bible's style.
- Show them side by side.
- **The owner chooses.**

**Budget:** one round of four images a picture, one reroll at most.

The two routes for the actors:

| | Route A: models at the texel (today's renderer) | Route B: sprites baked from 3D (Godot-Tamer's route) |
| --- | --- | --- |
| How | The GLB in three.js, drawn at the texel by the pixel look, recoloured to the art bible: floor 1's ramps, hard outline, rim light | The GLB rigged and animated (Ossuary's clips, `tools/animate-creature.ts`), rendered in Blender at the game's 45° camera from four directions, then pixelized to floor 1's palette with a closed outline |
| Tools | `src/actors/`, `src/render/pixelLook.ts`, `tools/texel-bake.ts` | `tools/bake/render_glb.py` and `tools/bake/pixelize.py` from Godot-Tamer, ported |
| Shown as | Game screenshots (`npm run inspect`, `npm run foe-sheet`) | Sprite sheets and a short GIF a clip, plus a mock-up of the sprites in a game screenshot |

The room both ways:
- **Code-drawn:** today's room kit, recoloured to floor 1's palette.
- **2D route:** tiles and wall pieces made with Nano Banana through the Tripo CLI, then reduced with Godot-Tamer's
  `tools/pipeline/pixel.py`.

## The subjects

| Subject | Model today | Notes |
| --- | --- | --- |
| The mage | `public/assets/hero_default.glb` (rigged, clips found by `setHero`) | Proportions to the ranger (reference 2): chibi, a little over three heads tall. Route A may need a new Tripo model for that; say so before spending credits |
| One floor 1 foe | None: floor 1's foes are drawn in code | Proposed: the **Gloom Weaver** (GDD, floor 1), dark-bodied, a good test of the rim light. Ask the owner before generating; it needs a design lock and a Tripo model |
| The Warden | `public/assets/creatures/owlbear.glb` (the Hollow Warden wears the Owlbear; rigged, clips from `tools/animate-creature.ts`) | Already a Tripo model with Ossuary's own clips; the cheapest subject for route B |
| A room of floor 1 | The room kit (`src/world/`, `src/render/pixelTextures.ts`) | Take one template, e.g. `chapel_nave` (in the decision page's comparison) |

## Tools to bring over from Godot-Tamer

Repository `Asyrion/Godot-Tamer`, branch `main`. Port them to `tools/art/` (Python 3 with Pillow and numpy), keeping
what is engine-free and dropping Godot's paths. Godot-Tamer's own docs for each are named in the list.

- **`tools/bake/render_glb.py`:** a Blender 5.2 headless render of a GLB's clips to PNG frames from an orthographic
  camera.
  - Change: Ossuary's camera, pitch 45° and yaw 0, plus three more yaws for the four facings.
  - Change: the light, per art bible 4.5: a key from above and a little left, a cool fill.
  - Godot-Tamer docs: 13, docs 33 P5.
- **`tools/bake/pixelize.py`:** frames to palette pixel art: a box-downsample, the nearest palette colour in OKLab, and
  a closed outline in each family's outline colour, with no alpha left.
  - Change: the palette comes from floor 1's ramps (art bible 4.1) instead of a creature's `redraw.json`.
  - Change: the outline is near black, tinted per material (art bible 4.4).
- **`tools/pipeline/pixel.py`:** finds the drawn pixel grid of Nano Banana output (`detect_pitch`, `resample`), keys
  the magenta background, and quantises with no dither. It is used for the 2D route's room pieces and any design lock.
- **`tools/bake/compose_gif.py`:** GIFs for review.
- **The Tripo CLI method:** Godot-Tamer's docs 04 §11, with the prompt rules in docs 04 §2 and the effect-sheet method in
  docs 13 §4f.
  - Install: `npm install -g @tripo3d/cli`.
  - Login: `tripo auth login`, run by the owner in their own terminal.
  - Generate: `tripo image "<prompt>" -m gemini_3.1_flash_image_preview -n 4 --scale 1:1`.
  - Known bug: the CLI may end with "no image URLs in result" or return while the task is still running. Poll
    `tripo image get <id> --output-format json` until `success`, then download the `urls`.
  - Studio credits are the owner's: say what a round will cost before running it.

Ossuary's own pieces to use, not duplicate:
- **`tools/prepare-asset.ts`:** normalises a Tripo GLB (size, base, centring; CLAUDE.md, Hero model techniques).
- **`tools/animate-creature.ts` and `docs/creatures.md`:** rigging and clips made in code.
- **`tools/texel-bake.ts`:** a model's texture as pixel art.
- **The `tripo-prompts` skill:** Ossuary's prompts for Tripo characters and creatures. Use it for any new model or design
  lock, adding the art bible's palette, outline and proportions.

## How to show it to the owner

- One comparison a subject: **route A | route B**, at play size (the texel, 2 to 2.6 screen pixels a game pixel) and
  enlarged 4×. Add a still of each facing and one clip as a GIF for route B.
- The room: code-drawn | 2D route, each with the mage and the foe standing in it.
- Measure each against the art bible:
  - shadows cooler than lights;
  - the share near black on the walkable floor (section 2's measure);
  - outlines closed.
- Recommend one route and say why, then let the owner decide (an AskUserQuestion with the comparison images works well).
- A page like the decision page above (an artifact) is a good way to show it.

## Rules to keep (Ossuary's CLAUDE.md wins over anything here)

- **Nothing in the game changes yet.**
  - The proof is images and tools.
  - If a dev-only view helps, it goes in `src/dev/`, reached only through `src/devDoor.ts`.
  - After the owner's choice, the losing route's code is deleted in the step that builds the winner.
- Commit only the images actually used: picks, comparisons and design locks, under `docs/art/proof/`. Rounds, contact
  sheets and raw renders stay out of git (`asset-previews/` is ignored).
- **No PR and no push to `main` without the owner's word.** Push to `r3-art-bible`.
- Commits end with the session's attribution lines; never name a model in commits, PRs or code.
- The repo stays English; the owner writes German in chat, so answer in German.
- Plan briefly with the owner before building (the owner's standing rule for the reset), and keep the feature freeze:
  no new systems.

## Done when

- The owner has chosen a route for the actors (art bible 4.8 filled in) and seen the room both ways.
- `tools/art/` holds the ported tools with a short README.
- The results and the commands that worked are in `docs/art-bible.md` and `docs/assets.md`.
- `docs/STATUS.md` names R3 step 3 or 4 as next.
- This file is deleted.

## Prompt to start the local session

Paste into Claude Code on the owner's machine, in the Ossuary checkout:

> Check out the branch `r3-art-bible` and read `docs/HANDOFF-R3-proof.md`, `docs/art-bible.md` and CLAUDE.md. We are
> doing R3 step 2, the proof. Godot-Tamer is at `<path to the Godot-Tamer checkout>`, Blender at `<path to blender.exe>`.
> I am logged in to the Tripo CLI (`tripo auth whoami`). Plan the proof briefly with me first: the subjects, which of
> them needs new Tripo images or models and what that costs in credits. Then build it.
