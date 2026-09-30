# Spell effects: the house style for magic

The owner chose this style on 2026-09-30, after seeing the Cinder Lance redone on the real spell. Every spell now wears
it, and every effect to come follows this guide:
- spells and reactions;
- the schools still to come (Hallow and Umbral);
- potions thrown in M5;
- the enemies' magic in M4 and M4.5.

The effect gallery (`src/magic/effectOptions.ts`, the dev menu's "Spell effect options") is the style book. The spells'
own looks are in `src/magic/spellFx.ts`.

## What makes the style

1. **Layers of light.** A beam or bolt is a white-hot core in a sheath of its school's colour, with a faint outer edge.
   In the pixel look it reads as a bright line with a coloured rim. The Cinder Lance is the model:
   - a cream-white core;
   - an orange sheath;
   - a faint red edge.
2. **Magic is drawn, not only glowing.** Use runes, rune rings, magic circles on the floor, stars and crystals. The
   player should see a spell being written as well as a light.
3. **Rings face the camera; circles lie on the floor.** A rune ring or a flash stands turned to the camera, which looks
   down at 45°, so it reads whichever way the spell runs. Seals, shockwaves and frost patches lie flat on the floor, just
   above it (y 0.02 to 0.05).
4. **A start, a body and an end.**
   - The start: a flare at the source, such as the rune ring flaring at the mage's hand.
   - The body: the effect itself.
   - The end: a mark where it lands, such as a ring of light, sparks, a shockwave on the floor, or shards.
5. **Everything moves.** Rings turn, embers spiral, lightning is re-jagged every step and flickers, and flames lick. A
   still effect looks like a sticker.
6. **Quick in, a hold, then a fade.**
   - Swell in 0.05 to 0.15 s.
   - Hold while the effect matters.
   - Fade in 0.2 to 0.4 s.
   - Where the gameplay is instant (the lance strikes at once), the look lingers a little, never much past the danger.
   - A warning (the seal before it erupts) brightens and turns faster as it comes due.
7. **Colour: one school, white for heat.** The school's light (below) and the spell's `color` in `data/spells.json`
   carry it, with white or cream for cores. A second colour is used sparingly: the lance's red edge, Overload's gold
   flash.
8. **Size for the pixel look.**
   - At 540 lines a unit of the room is about 50 game pixels (at 360, the lowest offered for play, about 33).
   - Parts thinner than about 0.03 units flicker or vanish at 360; build for that.
   - Keep silhouettes clear.
   - Keep added light that passes over a character at an opacity of 0.6 or less, or the mage washes out to white.
   - Check every effect over a dark floor and a lit one.

## The schools' light

| School | Light (`SCHOOL_LIGHT`) | The look |
| --- | --- | --- |
| Arcane (the cantrip) | The bolt's colour (artifacts change it) | A white-hot crystal, a rune ring turning round it, runes trailing |
| Ember | `0xff7a2a` | A white-yellow core, an orange sheath, a red edge; embers, tongues of flame, pillars of fire, rune circles |
| Frost | `0x7fd4ff` | Ice crystals and six-sided columns, frost patches, splinters with frost trails, mist |
| Storm | `0xf0e070` | Lightning (a white core in a yellow sheath), sparks at both ends, rings of lightning |
| Hallow (to come) | `0xffd878` | Gold light: pillars falling on rune circles, halos, motes rising |
| Umbral (to come) | `0xa266ff` | A dark core with a violet rim, tendrils, rings of shadow |

## The spells as they are now

| Spell | Its look (`spellFx.ts`) |
| --- | --- |
| Cantrip | `boltLook`: a crystal of the bolt's colour made white-hot, a rune ring turning round it, two runes trailing; a ring of light where it ends (`impactFx`) |
| Cinder Lance | `lanceFx`: a white-hot core, a sheath of fire and a red edge, rune rings turning along it, embers spiralling, a rune ring flaring at the hand, a glow at its end |
| Pyre Seal | `sealFx`: a circle drawn in fire with a rune ring and a six-pointed star, brightening and turning faster; a crown of flame, a pillar and a shockwave on the floor when it erupts; the circle smouldering while the ground burns |
| Rime Shards | `boltLook` (shard): splinters of ice with frost trails |
| Glacial Wall | `iceColumn`: six-sided columns of ice rising from the middle outwards, each with a cap, a crystal glinting in it and a patch of frost; they sink a little as they crack; a ring of frost on the floor when they shatter |
| Arc | `strikeFx`: lightning from the hand to each foe in turn, a spark at both ends, a ring of light on each one struck |
| Static Mantle | `mantleFx`: three rings of lightning turning round the mage, a glow at its heart, sparks jumping between the rings; thin arcs crackling over it, and lightning to each foe it throws back |
| Shatter | A white flash turned to the camera, a ring of frost thrown out over the floor, the shards (spell bolts) flying |
| Overload | A shockwave of fire on the floor, a gold flash, crackles of lightning leaping out |

Still to redo in this style: the statuses on foes (burning, chilled and frozen, shocked), the enemies' shots, and the
older sparks (`burst` in `combat/fx.ts`).

## The building blocks

- **`src/render/arcane.ts`:**
  - materials: `std` (a surface), `lit` (its own light) and `shine` (added light);
  - `part` and `limb` to place pieces;
  - the pieces: `rune`, `runeRing`, `circle`, `crystal`, `motes`, `lightningBolt` and `wave`.
- **`src/magic/spellFx.ts`:**
  - the pooled pieces: `ringFx` (rings of light, flat or facing the camera), `strikeFx` (lightning) and `impactFx`;
  - the bolts: `boltLook` and `animateBolt`;
  - the spells: `lanceFx`, `sealFx`, `iceColumn` and `mantleFx`.
- **Timings** are in `CFG.spellFx`.

## Performance

The target is 60 fps on integrated graphics (CLAUDE.md, Working agreements).

- **Pool what plays often.** Rings, lightning and the lance are built once, hidden when idle and shown again. After
  the first few casts, nothing is made or thrown away.
- **Share geometries** (`keep` in `spellFx.ts`). Share materials by colour for things that don't fade one by one, such as
  a bolt's rings and runes. Give each effect its own materials only where it fades by itself.
- **Merge still parts.** `mergeStill` (materials) or `oneGeometry` (`spellFx.ts`) makes a rune ring with its runes one
  draw call.
- **Budgets:**
  - a bolt: at most 6 draw calls (the cantrip uses 6: its core, glow, shadow, ring and two runes);
  - a cast's effect: about 40 while it shows;
  - a room in a fight: read `__game.renderInfo()`. A burst of cantrip fire with the Twin Staff peaks at about 180 calls,
    against about 130 at rest.
- **Clean up.** Whatever isn't pooled is disposed when it goes (`disposeTree`). The mage leaving a room clears it all
  (`clearSpellFx`).

## How to add an effect

1. **Try it in the gallery.** Add a demo to `effectOptions.ts`: a looping `play(t)` worked out from the time alone,
   built from the blocks above. Stand it up with the dev menu and show the owner.
2. **Move it to `spellFx.ts`** as a function the spell calls. Pool it if it plays often. Put its timings in
   `CFG.spellFx`.
3. **Call it from the spell's shape** in `shapes.ts` (or from `projectiles.ts` or `statusFx.ts`). What the spell does stays
   there; only the look moves.
4. **Screenshot it in the pixel look** at 540 lines, and once at 360:
   - in all four directions;
   - over a dark floor and a lit one;
   - with the mage and foes near it.
5. **Test it in the browser:** check that it shows on a cast and goes by itself, and that the pools empty
   (`__game.spellFx`).
