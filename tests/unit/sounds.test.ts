/* Sounds played from files (data/sounds.json; docs/assets.md, Sound): the table is sound, every file it names ships, and
   every sound a creature's clip plays exists (from a file, or synthesised). */
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import table from '../../data/sounds.json';
import creatures from '../../data/creatures.json';
import { soundsOf, validateSounds } from '../../src/audio/soundData';
import { CREATURE_SOUNDS } from '../../src/audio/creatureSounds';

describe('sounds from files', () => {
  it('names files in the shipped format, each with a gain', () => {
    expect(validateSounds(table)).toEqual([]);
    expect(validateSounds({ bad: { files: ['Growl.wav'], gain: 0 } })).toHaveLength(2);
  });
  it('ships every file it names', () => {
    for (const [name, s] of Object.entries(soundsOf(table)))
      for (const f of s.files)
        expect(existsSync(resolve(__dirname, '../../public/assets/sounds', f)), `${name}: ${f}`).toBe(true);
  });
  it('has a synthesised fallback for every sound from a file a creature plays, and a sound for every event', () => {
    for (const name of Object.keys(soundsOf(table))) expect(CREATURE_SOUNDS[name], name).toBeTypeOf('function');
    for (const [id, c] of Object.entries(creatures))
      if (id !== '_comment')
        for (const clip of Object.values((c as { clips: Record<string, { events: { sound: string }[] }> }).clips))
          for (const e of clip.events) expect(CREATURE_SOUNDS[e.sound], `${id}: ${e.sound}`).toBeTypeOf('function');
  });
});
