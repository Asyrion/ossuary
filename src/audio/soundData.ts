/* Sounds played from files (data/sounds.json; docs/assets.md, Sound): which files a sound plays, one of its variants
   chosen at random, and how loud. Pure: the game loads and plays them in samples.ts. */
export interface SoundEntry { files: string[]; gain: number }

/** What is wrong with the table: each entry needs files under the sounds' folder in the shipped format (lower case,
    `<family>/<id>_<n>.ogg`) and a gain above 0. */
export function validateSounds(table: Record<string, unknown>) {
  const errors: string[] = [];
  for (const [name, e] of Object.entries(table)) {
    if (name === '_comment') continue;
    const s = e as Partial<SoundEntry>;
    if (!Array.isArray(s.files) || !s.files.length) { errors.push(`${name}: no files`); continue; }
    for (const f of s.files) if (typeof f !== 'string' || !/^[a-z0-9]+\/[a-z0-9]+(_[a-z0-9]+)*_\d+\.ogg$/.test(f)) errors.push(`${name}: "${f}" is not <family>/<id>_<n>.ogg`);
    if (!(typeof s.gain === 'number' && s.gain > 0 && s.gain <= 2)) errors.push(`${name}: gain must be above 0 (and at most 2)`);
  }
  return errors;
}
/** The table without its comment. */
export const soundsOf = (table: Record<string, unknown>) => Object.fromEntries(Object.entries(table).filter(([k]) => k !== '_comment')) as Record<string, SoundEntry>;
