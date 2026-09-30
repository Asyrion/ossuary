# M4 Enemies in code: plan

The owner chose code over Tripo for the enemies (2026-09-29) and, on the third look (2026-09-30), critters and small
fantasy creatures rather than the dead. Ten were drawn up in `src/actors/modelOptions.ts` and divided over the floors
(GDD: Combat and enemies, Enemies built in code). M4 makes them foes: behaviour, health, sounds and elemental
affinities, and a boss built the same way. The owner signed off M3.5's look on 2026-09-30 ("assume everything was fine
and continue with M4"), so M4 starts.

## Decisions (2026-09-30; the design is M4's, the owner can change any of it)

1. **Roles, not kinds, in the templates.** The templates keep their letters, now read as roles: `R` a walker that comes
   at the mage, `W` a flyer or shooter that keeps its distance, `H` a charger or heavy. Each floor fills the roles from
   its own foes, weighted (`foes` in each floor of `data/floors.json`), picked on the room's seed when the room is
   built. `?foe=<id>` fills every role with one foe, for testing.
2. **The ten, by floor and role** (placeholder names, as in the GDD):

   | Floor | Foe | School | Role | Health | Fights by | Weak | Resists |
   | --- | --- | --- | --- | --- | --- | --- | --- |
   | 1 | Sporeling | Umbral | R | 9 | hops at the mage; swells and puffs a spore cloud that stings and dims the mage's sight; fire makes the cloud flash | Ember | Frost |
   | 1 | Vesper Moth | Hallow | W | 6 | flutters in loops round the mage, or round a lit brazier or candle stand it is drawn to; its wings flare and it scatters a ring of slow light motes | Ember | Storm |
   | 1 | Rune Beetle | Storm | H | 12 | wanders; its runes flash and it charges when lined up; stunned against a wall, its wing-cases part and throw a spark | Frost | Storm |
   | 1 | Urn Mimic | Ember | H (a quarter) | 11 | stands among the urns as an urn; wakes when struck or when the mage comes close; peeks and spits a fan of embers (they light oil); shuts to hide again | Frost | Ember |
   | 2 | Mire Toad | Frost | R, H | 13 | leaps at the mage in arcs; puffs its throat and breathes a cone of cold that chills the mage and freezes water | Storm | Frost |
   | 2 | Cistern Lurker | Storm | W, H | 10 | lives in water (or brings a rune-edged pool of its own); rises, spits sparks, dives and moves under water, out of reach; a shocked pool hurts it, a frozen one traps it at the surface | Frost | Storm |
   | 2 | Lantern Jelly | Hallow | W | 9 | drifts slowly at the mage over rocks; its bell brightens and it pulses a ring of light | Storm | Ember |
   | 3 | Cinder Salamander | Ember | R | 10 | scurries in quick zigzags, leaving a trail of burning ground (it lights oil and burns what burns) | Frost | Ember |
   | 3 | Hex Imp | Umbral | W | 8 | blinks about the room (a violet flicker where it will appear); holds up its flame and throws it: the hex drains mana as well as half a heart | Storm | Ember |
   | 3 | Rime Drakeling (elite) | Frost | H (one a room) | 34 | stalks; breathes a cone of rime; takes to its wings, crosses the room and lands with a ring of frost | Ember | Frost |

   Health is before the floor's `enemyHp`. Contact costs half a heart, as before. Every attack is telegraphed (a glow, a
   swell, a shake or a pause) and has a sound in its school's palette.
3. **Affinities** (GDD: Enemy affinities): each foe takes +50% from its weakness and −50% from its resistance. Damage
   carries a school where it has one: a spell's school, a burn's Ember, a chilling or shocking bolt's school, oil and
   braziers' Ember, a shocked pool's Storm. The cantrip itself has none. The first time the mage hits a foe with its
   weakness or resistance, the word rises over it ("Weak", "Resists"), and what the mage has found is kept between runs
   (`ossuary.bestiary` in the browser) for the bestiary to come (M7).
4. **The mage's afflictions** from the new attacks, small and readable: *dimmed* (spores: the edges of the view darken
   for 2 s), *chilled* (cold breath and rime: 40% slower for 1.5 s, a frost rim on the mage), *hexed* (the imp's flame:
   10 mana drained). Pure rules and tuning in `CFG`.
5. **Draw calls.** A critter as built for the gallery is about 50 draw calls. Each foe's still parts are merged
   within each part that moves (found by sampling its idle), colours in the vertices, so a foe costs about a tenth of
   that; the hit flash and the status glows light the merged materials.
6. **The old three retire.** Rotlings, wisps and crypt hounds go when the ten are in: the bosses call the floor's
   foes, a forced vault's warden is the floor's heavy as a champion, the ossuary's rising bones bring the floor's walker,
   and quiet rooms keep walkers and flyers, never an elite. The training dummy stays.
7. **The boss.** One boss built the same way (the GDD's M4 row). Its look is drawn up in the gallery first, as the ten
   were, for the owner to choose; its fight keeps the telegraphs and summons of the placeholder it replaces.

**Magic take:** the foes live in the rooms' magic. Moths are lured by fire the mage lights; spore clouds flash in
flame; mimics' embers and salamanders' trails light oil; the toad's and drakeling's breath freezes water and fire melts
it; the lurker is shocked through its pool and trapped when it freezes. A foe's school tells the mage what hurts it.

## Steps

1. **The framework, and the first foe** (built 2026-09-30). `data/foes.json` read by the pure `src/actors/foeData.ts` (stats, school,
   affinities, roles; validation and picking, unit-tested); the rig merge; a foe from its model (spawn, facing,
   hit flash and squash, status glows, a death in its school's colour and a stain); behaviours as functions by kind
   with shared telegraph and shot helpers; affinities in `damageEnemy` and the rising word; the bestiary record;
   floors' roles; the dev menu's foes by floor (and `?foe=`); the Sporeling built through all of it. Browser test.
2. **Floor 1** (built 2026-09-30): the Vesper Moth, the Rune Beetle and the Urn Mimic; dimmed sight. Floor 1's fights are
   all foes in code now (`R` Sporelings, `W` moths, `H` beetles three times in four and mimics the fourth). Browser tests.
3. **Floor 2** (built 2026-09-30): the Mire Toad, the Cistern Lurker (it brings a small pool of real water where the
   room has none, so shock and frost reach it) and the Lantern Jelly; chill on the mage. Browser tests.
4. **Floor 3** (built 2026-09-30): the Cinder Salamander (its burning ground drawn as one instanced mesh), the Hex Imp
   and the Rime Drakeling; the hex. Every floor's fights are foes in code now. Browser tests.
5. **The old three retire:** summons, the vault's warden, rising bones, quiet rooms; a balance pass over health and
   counts per floor; the room inspector over fights on each floor.
6. **The boss:** looks in the gallery for the owner, then the fight.
7. **Close:** GDD (as built), CLAUDE.md, the rules reviewer, and a build for the owner (when the owner asks to ship).

**Checks:** each foe readable at the game's camera in the pixel look (a silhouette, its telegraph, its hurt and
death); a fight of eight foes within its draw calls and at 60 fps in the dev menu's readout; every foe dies without
console errors; the rooms' reactions (oil, water, braziers) work with the foes' attacks.
