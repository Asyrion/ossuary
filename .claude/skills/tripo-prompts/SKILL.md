---
name: tripo-prompts
description: Write prompts for Ossuary's characters and creatures to be made in Tripo Studio (Nano Banana 2 in its model generator or Image tab), rigged and animated in code. Use when the owner asks for Tripo prompts, image-to-3D or text-to-3D prompts, or a new character, townsperson, boss or creature model for the game. Use this instead of the general miniature or concept-art prompt skills: those write figurines for 3D printing, which rig badly in this game.
---

# Tripo prompts for Ossuary

The method lives in `docs/assets.md`, section "Prompts for game characters in Tripo". Read it first; it is the source of
truth and says why each rule is there (the first batch, in `docs/tripo-prompts.md`, went wrong in the miniature format).

In short:
- **Purpose first:** start each prompt with `Stylised 3D game character reference:`. Never write `Miniature`, `figurine`,
  `statue`, `toy`, `base` or an action word.
- **Pose:** full body, front view, relaxed A-pose, feet flat and visible, arms down and out at forty-five degrees, head
  level. For a creature: standing square, tail straight back, wings folded or spread flat. Personality goes in the
  silhouette and props, never in a frozen action; every gesture is animated in code.
- **One or two props**, held clear of the body (a long shaft vertical beside it, its length against the figure), the rest
  hung from belt or back.
- **Readable at 50 pixels:** chibi proportions for characters, big shapes, two or three colours and one accent, glows
  painted as colour, solid surfaces.
- **The shot:** even shadowless light, plain light-grey background, whole figure, alone.
- **Under Tripo's 1,000 characters**: the two fixed sentences in the doc take about 300.
- Give the **negative-prompt field** and the **Tripo settings** from the doc with the prompts. Ask for the GLB straight
  from Tripo: one that goes through an FBX converter can lose its rig.

The output for each figure: its prompt as one copy-paste block, under a short heading. Add the
negative field and settings once, not per prompt. Keep the game's lore limits (CLAUDE.md, Rules: lore limits; `docs/lore/`) in any prompt that
names something.
