import { describe, expect, it } from 'vitest';
import { FLOOR_SCAPES, ROOM_SCAPES, THEME_SCAPES, floorScape, roomScape, spaceFor, validateAmbience } from '../../src/audio/ambienceData';
import { MODES, MOODS, PIECES, barSeconds, chordAt, floorPiece, hits, newComposer, phrase, pieceById, planBar, progressionBars, scaleUnder, stepSemis, validateMusic } from '../../src/audio/musicData';
import { Rand } from '../../src/audio/synth';
import { THEME_DEFS } from '../../src/world/themeData';
import { FLOORS } from '../../src/world/generate';
import { STR } from '../../src/strings';

/* The soundscapes and the music (docs/archive/sound-plan.md): the data checked, and the composer's rules. */

const ROOM_TYPES = Object.keys(STR.dev.roomNames); // (every room type has a name there)

describe('soundscapes', () => {
  it('every floor has one, and the data passes its checks', () => {
    expect(validateAmbience(ROOM_TYPES, THEME_DEFS.map(t => t.id))).toEqual([]);
    expect(FLOOR_SCAPES.length).toBeGreaterThanOrEqual(FLOORS.length);
    for (let f = 0; f < FLOORS.length; f++) { expect(floorScape(f).bed!.length).toBeGreaterThan(0); expect(floorScape(f).shots!.length).toBeGreaterThanOrEqual(4); }
    expect(floorScape(99)).toBe(FLOOR_SCAPES[FLOOR_SCAPES.length - 1]); // (past the last floor, the last's)
  });
  it('a room\'s soundscape plays over the floor\'s, a theme\'s in an ordinary room, and the space follows the room', () => {
    expect(roomScape('library')?.id).toBe('library');
    expect(roomScape('normal', 'garden')?.id).toBe('garden');
    expect(roomScape('normal')).toBeNull();
    expect(spaceFor(0, ROOM_SCAPES.library)).toEqual(ROOM_SCAPES.library.space);
    expect(spaceFor(3, THEME_SCAPES.garden)).toEqual(floorScape(3).space);
  });
  it('refuses what it cannot play', () => {
    const bad = { floors: [{ id: 'x', space: { seconds: 9, bright: 2 }, bed: [{ kind: 'drone', gain: 1 }], shots: [{ kind: 'wolf', every: .1, gain: 2, far: [1, 0] }] }], rooms: { kitchen: {} }, themes: {} };
    const errs = validateAmbience(ROOM_TYPES, [], bad as never);
    for (const word of ['every floor', 'a space lasts', 'unknown kind "drone"', 'shot wolf: unknown', 'half a second', 'far is a range', 'no room type']) expect(errs.some(e => e.includes(word)), word).toBe(true);
  });
});

describe('music', () => {
  it('a piece for the title and every floor, and the data passes its checks', () => {
    expect(validateMusic()).toEqual([]);
    for (let f = 0; f < FLOORS.length; f++) expect(pieceById(floorPiece(f))).toBeTruthy();
    expect(pieceById('title')?.theme).toBeTruthy();
  });
  it('the melody never rubs against a borrowed chord: a step a semitone off its note takes the chord\'s note', () => {
    expect(scaleUnder('aeolian', [0, 3, 7])).toEqual([...MODES.aeolian]); // (the tonic chord leaves the mode as it is)
    expect(scaleUnder('aeolian', [1, 5, 8])).toContain(1); // (the Ossuary's flat second: E becomes E flat)
    expect(scaleUnder('aeolian', [1, 5, 8])).not.toContain(2);
    expect(scaleUnder('aeolian', [-5, -1, 2])).toContain(11); // (the major fifth's leading note)
    expect(stepSemis(MODES.dorian, 7)).toBe(12); expect(stepSemis(MODES.dorian, -1)).toBe(-2);
  });
  it('the chords move on their bars, round the progression', () => {
    for (const p of PIECES) {
      const n = progressionBars(p);
      expect(chordAt(p, 0).starts).toBe(true);
      expect(chordAt(p, n).chord).toBe(chordAt(p, 0).chord);
      expect(barSeconds(p)).toBeGreaterThan(1.5); expect(barSeconds(p)).toBeLessThan(8);
    }
  });
  it('drum patterns spread across the bar, x accented and o soft', () => {
    expect(hits('x.o.', 4)).toEqual([{ at: 0, vel: 1 }, { at: 2, vel: .55 }]);
    expect(hits('x..o..', 3).map(h => h.at)).toEqual([0, 1.5]);
  });
  it('every bar it writes is in the piece\'s key, in range, and sounds as the mood asks', () => {
    for (const p of PIECES) for (const mood of MOODS) {
      const st = newComposer(p), r = new Rand(9), notes = Array.from({ length: 48 }, (_, b) => planBar(p, b, mood, st, () => r.next())).flat();
      const melody = notes.filter(n => n.stem === 'melody'), pulse = notes.filter(n => n.stem === 'pulse');
      const calm = p.id === 'title' || p.id === 'daylight' || p.id === 'vigil'; // (the title's, the dawn's and the Vigil's: no drums, and the title mood is theirs)
      if (mood === 'quiet') { expect(notes, p.id).toEqual([]); continue; }
      if (mood === 'low') { expect(melody, p.id).toEqual([]); expect(pulse.every(n => n.voice === 'heart'), p.id).toBe(true); continue; }
      if (mood === 'title' && !calm) continue;
      expect(melody.length, `${p.id} ${mood}`).toBeGreaterThan(0);
      for (const n of melody) { // (a melody note belongs to the mode or to the chord under it, and stays singable)
        const off = n.midi[0] - p.root - 12 * p.melody.octave;
        expect(off, `${p.id} ${mood}`).toBeGreaterThanOrEqual(-12); expect(off, `${p.id} ${mood}`).toBeLessThanOrEqual(24);
        expect(n.at).toBeLessThan(p.beats); expect(n.dur).toBeGreaterThan(0);
      }
      if ((mood === 'fight' || mood === 'boss') && !calm) expect(pulse.length, `${p.id} ${mood}`).toBeGreaterThan(0);
    }
  });
  it('the title plays its theme as written, through its progression', () => {
    const p = pieceById('title')!, st = newComposer(p), r = new Rand(1);
    const notes = Array.from({ length: progressionBars(p) }, (_, b) => planBar(p, b, 'title', st, () => r.next())).flat().filter(n => n.stem === 'melody');
    expect(notes.length).toBe(p.theme!.filter(([s]) => s !== null).length);
  });
  it('phrases vary: placed on the chord, sometimes turned over or slowed, always ending on a rest', () => {
    const p = pieceById('ossuary')!, st = newComposer(p), r = new Rand(4), seen = new Set<string>();
    for (let i = 0; i < 40; i++) { const ph = phrase(p, [0, 3, 7], st, () => r.next(), 'explore'); expect(ph[ph.length - 1][0]).toBeNull(); seen.add(JSON.stringify(ph.slice(0, -1))); }
    expect(seen.size).toBeGreaterThan(8);
  });
});
