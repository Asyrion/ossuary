# M2 plan: Plunder

Approved 2026-09-27. Design lives in `docs/GDD.md` (Coins, keys and bombs; Pickups and room types;
Artifacts); this file tracks the build. Each step ends playable, with unit and browser tests passing, and
is pushed to GitHub Pages.

**Done when** (GDD roadmap): coins, keys and bombs; merchant, secret room, locked vault and shrine
cleansing; urns and chests.

## Decisions (2026-09-27)

1. **Bomb button:** Space on the keyboard, the left trigger (LT / L2) on a gamepad, as the GDD planned;
   Q and E (LB and RB) stay for spells in M3, F for potions in M5. No touch button (touch is frozen).
2. **One more room per floor** (9–13, 11–15, 13–17): the merchant, and the shrine on floor 2, each take a
   dead end that would otherwise hold a fight. After M1's special rooms, floor 1 has no spare dead end on
   two floors out of three, so without more rooms fights would drop from about 6 to 5 on floor 1.
3. **Who gets an artifact when the budget runs short** (at most 5 per floor, 3 of them guaranteed): the
   optional sources on a floor (merchant, locked vault, secret room, bone altar) are shuffled with the
   floor's seed and take the budget in that order; room-clear drops use what is left. A source without an
   artifact falls back: the merchant sells only wares, the vault holds a hoard, the secret room holds
   coffers and a chest, and the bone altar isn't placed.
4. **Shrine** (proposed; can change before step 5): one offering stone per cursed artifact held; walking
   into a stone pays 10 coins and cleanses that artifact. Too few coins, and the shrine refuses.
5. **Artifacts:** the three from the GDD (Sexton's Keyring, Miser's Purse, Powder Horn) plus four more, to
   give the merchant, vault and secret pools enough to draw from (20 artifacts in all). Today those pools
   are empty, and 13 artifacts against up to 15 offers per run means nearly every run offers nearly all
   of them.

| New artifact | Effect | Pools |
| --- | --- | --- |
| Ferryman's Obol | Every room clear also drops a coin | merchant, secret |
| Sapper's Wick | Your bombs don't hurt you, and their fuse burns 1 s | merchant, vault |
| Grave Lantern | Cracked walls glow when you enter a room, and secret rooms show on the minimap before they're found | treasure, merchant, secret |
| Pedlar's Scale | Merchant prices −30% (the price tags show it) | vault, secret |

## Groundwork (all steps)

- [ ] Loot as data: `data/loot.json` (room-clear drop weights, enemy coin chance, urn, coffer and chest
      tables, merchant wares and prices, shrine price, starting coins, keys and bombs), read by a pure
      `src/items/loot.ts` with unit tests; loot rolls use the run's seeded loot stream
- [ ] Coins, keys and bombs in the run state, capped at 99
- [ ] Economy simulation in the unit tests: expected coins, keys and bombs per floor over hundreds of seeded
      floors, so tuning is checked in CI (GDD target: 12 to 18 coins per floor)
- [ ] Dev shortcuts: `?loot=coins:20,keys:2,bombs:5`, `__game.loot({ coins, keys, bombs })`, `?room=` for
      the new room types, `?give=` for the new artifacts

## Step 1: Coins, keys and bombs

- [ ] Pickups: coin, purse of 5, key, bomb; a room clear drops one pickup about half the time (heart,
      coins, key or bomb, weights from data); enemies now and then drop a coin; a run starts with 1 bomb
- [ ] HUD counters with coin, key and bomb icons under the artifacts
- [ ] Bombs: placed at the mage's feet; 1.5 s fuse with a flashing wick and a hiss; a 1.5-tile blast deals
      10 damage to every foe (bosses too), knocks everything back, breaks rocks (not pillars or tombs) and
      costs the mage a full heart if caught in it
- [ ] Bomb on Space and LT (decision 1), shown in the title screen's controls; strings in `strings.ts`
- [ ] Placeholder sounds: coin, key and bomb pickups, fuse, blast

## Step 2: Urns, coffers and reliquary chests

- [ ] Urns (`u` in templates): block walking and bolts; one bolt or a blast breaks them; usually empty,
      sometimes a coin or half a heart
- [ ] Coffers (open when walked into) and reliquary chests (need a key) as rarer room-clear drops
- [ ] Urns added to 20 or more existing templates
- [ ] Placeholder sounds: urn smash, coffer and chest opening, "locked" when a chest needs a key

## Step 3: Merchant and locked vault

- [ ] Generator: a merchant in a dead end on every floor; a locked vault in a spare dead end (chance per
      floor in `data/floors.json`); room counts from decision 2
- [ ] Merchant room: a hooded trader (placeholder shapes) and 3 or 4 wares on stands with floating prices:
      the first is an artifact while the budget allows, then hearts, keys and bombs; walking into a ware
      buys it, or it refuses (too few coins, or a heart at full health)
- [ ] Locked vault: a padlocked iron door that a key opens (refused without one); inside, an artifact while
      the budget allows, otherwise a hoard of coins and bombs and a reliquary chest
- [ ] Door styles (a lantern above the merchant's door, padlocked iron for the vault) and minimap marks
- [ ] Budget order for optional sources (decision 3); existing artifacts join the merchant and vault pools
- [ ] Placeholder sounds: purchase, refusal, unlocking

## Step 4: Secret rooms

- [ ] Generator: one per floor in an empty cell touching two or more rooms (never the boss room), with a
      hidden doorway on every edge it shares with them
- [ ] Cracked walls: a hairline crack and dust drifting from it; a blast opens the doorway on both sides
- [ ] Hidden from the minimap until found; holds coins, coffers and a reliquary chest, or an artifact from
      the secret pool (often cursed)
- [ ] Placeholder sounds: crumbling wall, a short sting when a secret room is found

## Step 5: The shrine

- [ ] Generator: a shrine in a dead end on floor 2 (which floors in `data/floors.json`)
- [ ] Cursed artifacts split their gift and price in `data/artifacts.json`; cleansing removes the price and
      halves the gift (Mask of the Drowned: damage ×1.5, no darkness; Chain of the Penitent: +1 s after a
      hit, no slowness); unit-tested in `computeStats`
- [ ] Offering stones (decision 4); cleansed artifacts lose their red ring in the HUD and on the end screen
- [ ] Placeholder sounds: cleansing, refusal

## Step 6: Economy artifacts, balance and polish

- [ ] Sexton's Keyring (+3 keys; the vault opens for free once per floor), Miser's Purse (+0.5 cantrip
      damage per 10 coins held), Powder Horn (+5 bombs; blasts 50% wider), Ferryman's Obol, Sapper's
      Wick, Grave Lantern and Pedlar's Scale (decision 5); pools and icons
- [ ] End screen: coins found
- [ ] Balance pass after play-tests (drop weights, prices, economy numbers); GDD and CLAUDE.md brought up
      to date
