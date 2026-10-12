# M2 plan: Plunder

Approved 2026-09-27. Design lives in `docs/GDD.md` (Coins, keys and blast glyphs; Pickups and room types;
Artifacts); this file tracks the build. Each step ends playable, with unit and browser tests passing, and
is pushed to GitHub Pages.

**Done when** (GDD roadmap): obols, bone keys and blast glyphs; merchant, secret room, locked vault and
shrine cleansing; urns and chests.

## Decisions (2026-09-27)

1. **Glyph button:** Space on the keyboard, the left trigger (LT / L2) on a gamepad, as the GDD planned;
   Q and E (LB and RB) stay for spells in M3, F for potions in M5. No touch button (touch is frozen).
2. **One more room per floor** (9–13, 11–15, 13–17): the merchant, and the shrine on floor 2, each take a
   dead end that would otherwise hold a fight. After M1's special rooms, floor 1 has no spare dead end on
   two floors out of three, so without more rooms fights would drop from about 6 to 5 on floor 1.
3. **Who gets an artifact when the budget runs short** (at most 5 per floor, 3 of them guaranteed): the
   optional sources on a floor (merchant, locked vault, secret room, bone altar) are shuffled with the
   floor's seed and take the budget in that order; room-clear drops use what is left. A source without an
   artifact falls back: the merchant sells only wares, the vault holds a hoard, the secret room holds
   coffers and a chest, and the bone altar isn't placed.
4. **Shrine** (built as proposed in step 5): one offering stone per cursed artifact held; walking into a stone
   starts the cleansing (the curse fights back), paid with 10 obols when it's done. Too few obols, and the
   shrine refuses.
5. **Artifacts:** the three from the GDD (Sexton's Keyring, Miser's Purse, Powder Horn) plus four more, to
   give the merchant, vault and secret pools enough to draw from (20 artifacts in all). Today those pools
   are empty, and 13 artifacts against up to 15 offers per run means nearly every run offers nearly all
   of them.

| New artifact | Effect | Pools |
| --- | --- | --- |
| Ferryman's Obol | Every room clear also drops an obol | merchant, secret |
| Warding Band | Your glyphs don't hurt you, and their fuse burns 1 s | merchant, vault |
| Grave Lantern | Cracked walls glow when you enter a room, and secret rooms show on the minimap before they're found | treasure, merchant, secret |
| Pedlar's Scale | Merchant prices −30% (the price tags show it) | vault, secret |

6. **Magic first, even in M2** (owner, at step 1): Isaac's bombs become blast glyphs, runes the mage chalks
   on the floor and the cantrip sets off from afar; coins become grave obols that drift to the mage, keys
   bone keys. Powder Horn and Sapper's Wick are renamed Glyphwright's Chalk and Warding Band. Each later
   step has its magic takes, marked below (the owner asked to keep expanding them); future pickup families
   are brainstormed in `docs/ideas.md`.
7. **A looser artifact limit** (owner, 2026-09-28, after step 3): the budget goes from 5 to 6 artifacts per
   floor, enough for the merchant, a vault and a bone altar on the same floor, and some finds sit outside
   it so a lucky floor holds more: a gilded reliquary chest (10% of chests: a golden ward no blast breaks,
   a bone key finds an artifact inside) and, from step 4, the secret room's artifact.
8. **More artifacts for play-testing** (owner, 2026-09-28, after step 4): 13 original artifacts joined (26 in
   all besides the starting wand), each with a new mechanic rather than a bigger number: three foci (a fan,
   a heavy piercing spear, a weaving serpent), eight passives (strong casts, splitting bolts, speed and reach,
   knockback, a leech, a moth and a skull that act on their own, healing for a fight won unhurt) and two
   cursed ones; 15 more ideas went into `docs/ideas.md`. Step 6's economy seven still come on top.

## Groundwork (all steps)

- [x] Loot as data: `data/loot.json` (starting obols, keys and glyphs, the cap, room-clear drop weights,
      enemy obol chance), read by a pure `src/items/loot.ts` with unit tests; drops use the run's seeded
      drop stream. Later steps add urn, coffer and chest tables, merchant wares and prices, shrine price
- [x] Obols, keys and glyphs on the mage, capped at 99
- [x] Economy simulation in the unit tests: obols, keys, glyphs and hearts per floor over hundreds of
      seeded floors (step 1: room clears and enemies give 2 to 7 obols; the GDD's 12 to 18 once urns,
      coffers, chests, the vault and the secret room join)
- [x] Dev shortcuts: `?loot=coins:20,keys:2,glyphs:5`, `__game.loot({ coins, keys, glyphs })`,
      `__game.drop(kind)`
- [x] Dev shortcuts: `?room=` for the new room types (`?room=merchant_plain`, `?room=vault_urns`)
- [ ] Dev shortcuts: `?give=` for the new artifacts
- [x] Dev menu (the key left of 1, or F2; shown on the HUD during play-tests): every step below adds its
      features to it (owner, 2026-09-28)

## Step 1: Obols, bone keys and blast glyphs

- [x] Pickups: obol, purse of 5, bone key, glyph stone; a room clear drops one pickup 60% of the time
      (heart, obols, key or glyph stone, weights from data); enemies now and then drop an obol; a run
      starts with 1 glyph; obols drift to the mage from close by
- [x] HUD counters with obol, key and glyph icons under the artifacts
- [x] Blast glyphs: chalked at the mage's feet; the rune turns and flickers faster as the 1.5 s fuse burns
      down, with a ring showing the blast's reach; the mage's own bolts set it off at once; a 1.5-tile
      blast deals 10 damage to every foe (bosses too), knocks them back, breaks rocks (not pillars or
      tombs), snuffs out enemy shots, sets off other glyphs, burns in the bolts' colour and costs the mage a
      full heart if caught in it
- [x] Glyph on Space and LT (decision 1), in the title screen's controls and chalked in the first room;
      strings in `strings.ts`
- [x] Placeholder sounds: obol, purse, key and glyph pickups, chalking, fuse ticks, blast, "no glyph"

## Step 2: Urns, coffers and reliquary chests

- [x] Urns (`u` in templates): block walking and bolts; one of the mage's bolts or a blast breaks them;
      a quarter of them hold something (an obol, half a heart or a glyph stone)
- [x] Coffers (open when walked into, 1 to 3 things) and reliquary chests (2 to 4) as rarer room-clear
      drops; container tables in `data/loot.json`
- [x] Magic take: a broken urn lets out a puff of grave dust, and the soul inside rises as the obol or half
      heart it held
- [x] Magic take: rune-sealed urns (`$` in templates): bolts glance off, only a glyph's blast breaks them,
      and they always hold something better (obols, a purse, a bone key or a heart; never a glyph stone,
      since they cost one)
- [x] Magic take: a reliquary chest is sealed by a ward; a bone key unbinds it cleanly, and a glyph's blast
      breaks it too but burns half of what's inside (a key or a glyph: the player chooses); walking up
      without a key says so
- [x] Urns in the corners of 31 normal templates (110 urns, 5 of them sealed); the economy simulation now
      counts urns and containers: 6 to 12 obols per floor so far, and more keys and glyphs than chests
      and sealed urns ask for
- [x] Placeholder sounds: urn smash, a bolt glancing off a ward, a ward breaking, coffer and chest
      opening, "locked" when a chest needs a key

## Step 3: Merchant and locked vault

- [x] Generator: a merchant in a dead end on every floor; a locked vault in a spare dead end (chance per
      floor in `data/floors.json`: 35%, 45%, 55%); room counts from decision 2. A floor rolls the altar and
      the vault it wants first, and the walk tries again (up to `CFG.generator.optionalTries` times) until it
      leaves them spare dead ends, so the chances in the data are the share of floors that get one. Floor 1
      still has about 6 fights
- [x] Merchant room (`src/items/merchant.ts`): a hooded shade (placeholder shapes) and 3 or 4 wares in a row
      with floating prices: the first is an artifact while the budget allows, then hearts, keys and glyphs
      (stock and prices in `data/loot.json`); walking into a ware buys it, or he refuses (too few obols, a
      heart at full health, a resource at its cap). A focus bought leaves the old one in the empty circle
- [x] Locked vault (`src/world/vault.ts`): a warded iron door with a padlock that a key opens (refused
      without one); inside, an artifact while the budget allows, otherwise a hoard of obols and glyphs
      (`vaultHoard` in `data/loot.json`) around a reliquary chest
- [x] Magic take: the merchant is a bound shade who deals in the obols of the dead; his wares float in
      ward circles that paying breaks, and his shop is warded: bolts fizzle just after leaving the mage and
      the chalk of a glyph won't take (no glyph is spent), so there are no fights and no robbery in the shop
- [x] Magic take: the vault's door is a ward; a bone key unbinds it, and two glyph blasts can force it (the
      first cracks it), but forcing it wakes the vault's warden: a champion (a crypt hound, per floor in
      `data/floors.json`) rises inside, and the prize can't be taken until it falls. Bolts glance off the ward
- [x] Door styles (a lantern above the merchant's door, the vault's iron frame with a turning ward rune and
      a padlock) and minimap marks (an obol; a padlock, blue while sealed)
- [x] Budget order for optional sources (decision 3): the generator shuffles the floor's optional sources
      and gives artifacts to as many as the budget allows (`artifact` on each planned room); a bone altar
      left without one isn't placed. Existing artifacts joined the merchant and vault pools (6 each)
- [x] Economy simulation: vaults cost a key and, without an artifact, give a hoard and a chest: 7, 10 and 14
      obols per floor on floors 1 to 3, keys and glyphs still ahead of what chests, vaults and sealed urns ask
- [x] Placeholder sounds: purchase, refusal, the shade's greeting, a ward cracking, unlocking

## Step 4: Secret rooms

- [x] Generator: one per floor in the empty cell that could open into the most rooms (two or more), with a
      hidden doorway on every edge it shares with them; never into the boss room, a vault or the merchant.
      It comes on top of the room count; every floor of 1,200 tested had one
- [x] Cracked walls (`src/world/secret.ts`): the wall carries on across the doorway, with a hairline crack on
      its inner face and top and dust drifting from it; a blast opens the doorway on both sides
- [x] Magic take: the cantrip divines them: a bolt striking a cracked wall rings hollow, with a chime and a
      puff of dust, and the crack keeps a faint pale-blue glow, so the cantrip finds secret rooms and a
      glyph opens them
- [x] Magic take: inside, a forgotten mage's cell in pale blue light (blue torches, a faded rune circle and
      loose pages on the floor; templates `secret_cell` and `secret_study`)
- [x] Hidden from the minimap until found (then an eye in pale blue); holds an artifact from the secret pool
      (half the time, `secretArtifactChance` in `data/floors.json`; outside the budget, decision 7) or a
      hoard with two coffers and a reliquary chest (`secretHoard`, `secretRoom` in `data/loot.json`). The
      secret pool gained four artifacts, so a third of its draws are cursed
- [x] Economy: with every secret room opened, 12.6, 15.5 and 17.6 obols per floor, inside the GDD's 12 to 18;
      room clears drop glyph stones more often (26 of 105) so glyphs stay ahead, and gilded chests went from
      15% to 10% now that secret rooms and vaults bring more chests (a relic about one floor in fifteen)
- [x] Placeholder sounds: crumbling wall, a hollow ring, a short sting when a secret room is found
- [x] Dev menu: the secret room in this floor's list (hidden or found; going there opens it), reveal cracked
      walls, open the secret room; `__game.openSecret()`

## Step 5: The shrine

- [x] Generator: a shrine in a dead end of its own on floor 2 (`shrine` per floor in `data/floors.json`).
      It took a spare dead end from the vault and altar there (37% vaults instead of 45%), so the walk now
      tries again up to 200 times (`CFG.generator.optionalTries`, was 60) to leave them room: 41% altars and
      43% vaults on floor 2, still about 7 fights. Templates `shrine_henge` and `shrine_urns`
- [x] Cursed artifacts split their gift and price in `data/artifacts.json` (`curse`: the price, and a
      `cleansed` text); cleansing removes the price and halves the gift (Mask of the Drowned: damage ×1.5,
      no darkness; Chain of the Penitent: +1 s after a hit, no slowness; Leaden Heart: one more heart, full
      reach; Bloodied Covenant: +1.25 damage, no tithe); unit-tested in `computeStats`
- [x] Offering stones (decision 4, `src/world/shrine.ts`): one per curse held, the artifact floating above it,
      in four spots around the circle (`CFG.shrine`); 10 obols (`shrine` in `data/loot.json`), refused with
      fewer. Cleansed artifacts lose their red ring in the HUD and on the end screen (a pale one instead)
- [x] Magic take: the curse fights back. Walking into an offering stone draws the curse out as a wisp that
      flits about the room, lingers in the circle now and then and spits at the mage; bolts pass through it
      outside the circle and strike it inside (a blast strikes twice). Four strikes within 10 s put it down
      (the motes around the circle go out as time runs; its strength is on the boss bar) and the artifact is
      cleansed, the obols paid; if time runs out or the mage leaves, it flees back into its stone and the mage
      can try again. Tuned with a bot: 0.2 s reactions win every time in 7 to 9 s, slower ones most times
- [x] Door style (a pale halo above the door), a warm white light, and a minimap mark (a gold circle, dim with
      no curse to cleanse)
- [x] Placeholder sounds: the curse drawn out, a strike, its shots, its escape, cleansing; refusal reused
- [x] Dev menu: the shrine in this floor's list, take a curse, cleanse a curse at once (cleansed artifacts
      are marked in the artifact list); `__game.cleanse()`, `__game.rite`

## Step 6: Economy artifacts, balance and polish

- [x] Sexton's Keyring (+3 keys; the vault opens for free once per floor), Miser's Purse (+0.5 cantrip
      damage per 10 obols held), Glyphwright's Chalk (+5 glyphs; blasts 50% wider), Ferryman's Obol,
      Warding Band, Grave Lantern and Pedlar's Scale (decision 5); pools and icons (33 artifacts in all
      besides the starting wand). New in the data: `gives` (resources handed over on taking one), the stats
      `obolDamage` and `blastMul`, and the effects `freeVault`, `ferryman`, `glyphWard`, `graveLantern` and
      `pedlar`; tuning in `CFG.artifacts` (`wardingBand`, `pedlar`)
- [x] Magic take: each economy artifact shows in the magic: Miser's Purse turns the bolts gold, a fifth of the
      way for every 10 obols, with gold glints off each cast; Glyphwright's Chalk widens the glyph's reach ring;
      Warding Band rings the mage's feet when a glyph is chalked, and when it turns their own blast aside;
      Grave Lantern makes cracked walls glow and their hollow ring heard from anywhere in the room, and shows
      the cell as a faint eye on the map; the Ferryman's obol falls with a pale glint and a chime; the Pedlar's
      Scale shows its lower prices in pale green on the tags
- [x] End screen: obols found (obols picked up during the run)
- [x] Dev menu: the new artifacts appear by themselves; a sealed vault in the floor list now leads to the room
      outside it, a couple of steps from the warded door, to try a key, a blast or the keyring on it
- [x] Balance pass after play-tests (drop weights, prices, economy numbers): the owner's play-tests found it
      fine (2026-09-28), so it stays as is. The numbers: 12.6, 15.5 and 17.6 obols per floor with everything
      opened, against a merchant's 3 to 15 obols a ware and the shrine's 10; the Ferryman's Obol adds about 7,
      8 and 10 a floor (one per fight won); the Miser's Purse is worth +1.5 damage at 30 obols held, +4.5 at the
      cap of 99

## After M2 (2026-09-28, owner's requests)

- [x] The dev menu's key is also in the controls on the title screen (a play-test aid, removed with the HUD's)
- [x] Lore cards (`src/ui/lore.ts`): picking something up shows, in the lower right corner, its icon, name and
      kind, what it does and a few lines of lore, soulslike but plainer. Artifacts every time (their `lore` in
      `data/artifacts.json`), items and containers the first time in a run (`STR.lore.items`); the card fades
      after 6 to 11 s of play. Spells (M3) and potions (M5) will show theirs through the same card. Dev menu:
      "Describe items again". The lore is placeholder until the Eda lore arrives
- [x] GDD and CLAUDE.md brought up to date
