# Soundscapes and music: the sound design concept

The owner's ask (2026-10-02): an ambience for every floor, designed and then made procedurally, and then ambient
background music for the game. This pulls the GDD's ambience beds and adaptive music forward from M8 (GDD: Audio
design), made in code like everything else in the game is, with no recordings. Real recordings and the final mix can still
replace or join them later (`docs/assets.md`: Sound); the synthesised versions stay as the fallback, as the effects do.

## What it should sound like

The house sound holds (`docs/assets.md`: House sound): **physical, old and close**. The game is small stone rooms lit by
candles, deep underground. So nothing here is a synth pad for its own sake. Every sound is built from the way the real
thing makes its sound:

- **Air and water** are noise shaped as the real thing is: wind is coloured noise through a band that wanders and
  gusts; a stream is hundreds of tiny bubbles (a bubble is a sine that rises in pitch as it dies); fire is a low roar
  and a crackle of clicks in clusters.
- **Strings** are plucked strings (Karplus-Strong: a burst of noise in a delay line that loses its brightness on every
  pass, as a lyre's string does).
- **Bells and chimes** are struck metal: inharmonic partials, each dying at its own rate, higher ones first.
- **Voices** are a buzzing source through the formants of a vowel ("ah", "oh", "oo"), several voices slightly out of
  tune with each other, as a choir is.
- **Drums** are a skin: a falling thump and a slap of noise.
- **Wood and stone** creak and grind: a stick-slip train of clicks through the resonance of a beam, or brown noise
  rumbling under a lowpass.

Every floor has **its own space** (a reverb made in code: a burst of noise dying at the floor's rate and darkening as it
dies), and the ambience and the music both sit in it, so they sound as if they are in the same room. Effects stay dry,
as the house sound asks; the floor's reverb on effects is left for the final mix.

**Ambience is felt, not listened to.** A bed that never stops (air, water, fire, the hum of stone) and, over it, one-shots
at random places around the mage, rare enough to be noticed: a drip off to the left, bones settling behind, a chant far
off. One-shots never repeat exactly (pitch, length, place and loudness vary each time). The bed sits well below the
effects and ducks a little when the doors lock, when the music takes over.

## The floors

| Floor | Space | The bed | The one-shots | Under it all |
| --- | --- | --- | --- | --- |
| 1 The Ossuary | A stone crypt: 2.2 s, mid-bright | Wind moaning far off through passages, the low hum of stone | Drips into still water; bones settling; a monks' chant far off; rats scurrying; the chapel's bell above, muffled through the rock | Cold, still, old. The quietest floor: silence is part of it |
| 2 The Drowned Catacombs | Flooded tunnels: 3 s, dark and wet | Running water (a stream of bubbles), a deep cistern rumble, a tunnel's whistle as air moves over the water | Many drips; bubbles rising; water sloshing against stone; a bell under water; stones shifting under the flood | Water everywhere, close and far |
| 3 The Burning Scriptorium | A hall of shelves on fire: 1.6 s, warm and dark (fire eats the echo) | A low roar of fire somewhere, a crackle near, hot wind whistling through the shelves | Pages turning and fluttering in the draught; beams groaning; embers popping; a stack of books collapsing | Restless and hot: never quite still |
| 4 The Gilded Reliquary | A marble hall: 4.5 s, bright | The air of a vast hall, the faint hum of an organ pipe left sounding somewhere, candle flames | Small golden chimes; coins settling on a heap; a censer's chain creaking as it swings; a high voice far off holding one note; wax dripping | Sacred, cold gold: beautiful, and wrong |
| 5 The Ferryman's Shore | A cavern over a black river: 3.5 s, very dark and wide | Water lapping at a shingle shore in slow waves, the river's deep pull, a sub-pulse slow as a sleeping heart | The ferry's bell tolling across the water; whispers of the dead who wait; a moored boat creaking; an oar's splash; the shingle rattling as a wave draws back | The end of the road: vast, patient, waiting |

**Special rooms** lay a second bed over the floor's, and change the space:

| Room | Space | Its own bed and one-shots |
| --- | --- | --- |
| Library | Dry and close (0.8 s) | A hush of still air; pages turning; a book settling on its shelf; a candle |
| Shrine | Rings (5 s, bright) | A singing bowl's hum that beats slowly; a chime now and then |
| Dr. Jelly's laboratory | The floor's | The vat bubbling (thick, slow bubbles), the jelly's low wobbling hum, glass clinking |
| The merchant's shop | The floor's | The bound shade's murmur; the ward's low hum |
| Locked vault and secret room | Close (1.2 s) | Stillness: dust trickling, the ward's hum in a vault |
| Boss room | The floor's | The bed drops away: the music has the room |

**Themed rooms** add a touch where one fits: the overgrown garden rustles and an insect chirrs; a cistern or grotto
adds water; a chapel a faint choir; a collapsed room trickling dust and settling rubble; the treasury coins and chimes;
the landing the river close.

## The music

**One piece per floor, made while it plays.** Each piece is written as data (`data/music.json`): its key and mode,
its tempo, a progression of chords, the motifs its melody is built from, and its voices. A small composer plays it:
the chords move on the bar, the melody takes a motif, places it on the chord, varies it (moved up or down the scale,
turned upside down, slowed, cut short) and leaves rests between phrases, so the piece never loops the same way twice
but always sounds like itself.

**Stems, as the GDD asks,** that fade in and out with what happens:

| Stem | What it is |
| --- | --- |
| Drone | The floor's held root and fifth: low strings, an organ, or a hum |
| Harmony | The chord: bowed strings, or the choir |
| Melody | The motifs: a lyre or harp, a bowed voice, or bells |
| Pulse | Drums and a low ostinato: frame drum, taiko, a bass string |

| Mood | When | What plays |
| --- | --- | --- |
| Title | The title screen | The game's theme (below) |
| Explore | A room with no fight | Drone, a quiet harmony, the melody sparse |
| Fight | The doors locked | The pulse joins; the melody more often, the harmony fuller |
| Boss | A boss lives | Everything: the pulse doubled, the choir at full voice |
| Low | Under one heart | The music thins to the drone and a heartbeat joins |
| Quiet | Paused, dead, the end screen | Fades, leaving the ambience |

Two stingers, in the piece's key: **room cleared** (a short cadence, struck on a bell or the lyre) and **death** (a
falling phrase as the music stops).

| Piece | Key and tempo | Voices | Character |
| --- | --- | --- | --- |
| Title: Beneath the Gate | A minor (Dorian), 60 | Harp, choir, drone | The game's theme: a melody written out, not generated, that the floors' motifs echo |
| 1 The Ossuary | D minor with the Phrygian E flat, 56 | Low strings drone, lyre, bowed viola, frame drum, low male choir | Sparse, low strings and drone (the GDD's mood) |
| 2 The Drowned Catacombs | F sharp minor, 50 | Drone that wavers like water, bells heard through water, detuned choir ("oo"), harp, hand drum with an echo | Slow, watery, a choir out of tune with itself |
| 3 The Burning Scriptorium | C minor (Phrygian dominant), 92 | Horn drone, oud, taiko and frame drums, bass ostinato | Driving: the drums carry it even exploring, softly |
| 4 The Gilded Reliquary | E (Lydian), 66 | Organ drone, high voices ("ah"), high bells, harp, timpani | Glassy, bells, high voices: holy and cold |
| 5 The Ferryman's Shore | B (Phrygian, with the tritone), 48 | Deep drone, low choir ("oh"), the ferry's bell, low plucked strings, a rowing drum | Dark, heavy choir, the bell tolling every few bars |

## How it is built

- `src/audio/sfx.ts` gains two buses under the master, **music** and **ambience**, each with its slider in the pause menu
  (remembered with the others), and lends its audio context to the rest.
- `src/audio/synth.ts`: the instruments, on any audio context (so the same code plays live and renders offline): noise
  in its colours, the floor's space, the plucked string, the bell, the choir voice, the drum, the drone, the bubble,
  the creak, the crackle; loops made in a ring so they never click where they join.
- `data/ambience.json` (each floor's space, bed and one-shots; the special rooms and themes) and `data/music.json` (the
  pieces), read and checked by the pure `src/audio/ambienceData.ts` and `src/audio/musicData.ts` (scales, chords, motifs,
  the composer's choices; unit-tested).
- `src/audio/ambience.ts` plays a floor's soundscape and a room's over it, crossfading when they change;
  `src/audio/music.ts` plays a piece with its stems and moods; both schedule a little ahead of time, so a hitch in the
  frame doesn't stutter the sound.
- `src/audio/director.ts`, one call a step from the loop, listens to the game (the state, the floor, the room and its
  doors, a boss alive, the mage's hearts) and tells both what to play.
- Dev menu (its Sound tab): play any floor's ambience, any room's, any piece in any mood, the stingers; `__game.audio`
  reads what plays; `__game.renderAudio(...)` renders a stretch of any of them to a file, for listening outside the
  game (`tools/render-audio.ts` writes them to `audio-previews/`).

## Cost

All of it is Web Audio nodes, cheap next to the drawing: the beds are a handful of looping buffers and filters, the
one-shots and notes a few nodes each for a few seconds. Plucks, bells and drums are rendered into buffers once per note
and reused. Nothing is downloaded.

## As built (2026-10-02)

Built as above, in one go. What to know:

- **Levels are set by measurement, not by ear.** The beds sit at about -25 to -32 dBFS in a preview (the five floors within
  a few dB of each other; the Reliquary's marble hall and the library quieter), the music at about -21 to -26 exploring
  and -16 to -22 in a boss's fight, a compressor holding the boss's full stems under the effects. The owner's listening sets them for good: every level is a number in the two data files.
- **The music's voices** as built: plucked strings for the lyre, harp, oud and the low strings; struck bells (and the
  Drowned Catacombs' bells heard through water); bowed notes; the choir in "oh", "oo", "ah"; drones of strings, organ,
  horn, wavering water and a deep one; frame drum, taiko, hand drum, timpani and a rowing thump.
- **Previews:** `npm run render-audio` (or `-- ossuary` for what names it) writes every floor's soundscape, the rooms',
  each piece exploring, fighting and in a boss's fight, and each floor's soundscape and music together (a fight starting
  at 30 s) to `audio-previews/` as MP3s.
- **Still to come** (the GDD's Audio design): boss themes as their own pieces with a phase at half health, the doors as
  acoustic windows, the floor's reverb on the effects, and real recordings where they would do better.
