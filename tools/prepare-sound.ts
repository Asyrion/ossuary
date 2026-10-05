/* Prepare one of the owner's sounds for the game (docs/assets.md, Sound, Pipeline step 6):
     npm run prepare-sound -- <in.wav> <family>/<id>_<n>      e.g.  -- growl_2.wav chameleon/growl_1
   writes public/assets/sounds/<family>/<id>_<n>.ogg: mono (the game places it left or right), the silence before it cut
   (every effect starts at once), its peak set to -1 dB, Ogg Vorbis at its own sample rate; then reports its length, size
   and peak against the effects' budget (data/sounds.json names it for the game). Needs ffmpeg on the path. */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** The budget of an effect heard in the room (docs/assets.md, Specs and budgets). */
const EFFECT = { seconds: 2, kb: 100, peak: -1 };

const ff = (args: string[]) => execFileSync('ffmpeg', ['-hide_banner', '-nostats', '-loglevel', 'error', ...args], { stdio: 'inherit' });
/** What ffmpeg reports (on stderr) running `args`. */
const measure = (args: string[]) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8' }).stderr;

function main() {
  const [input, name] = process.argv.slice(2);
  if (!input || !name || !/^[a-z0-9]+\/[a-z0-9]+(_[a-z0-9]+)*_\d+$/.test(name)) {
    console.error('usage: npm run prepare-sound -- <in.wav> <family>/<id>_<n>   (lower case, such as chameleon/growl_1)'); process.exit(1);
  }
  const out = resolve(import.meta.dirname, `../public/assets/sounds/${name}.ogg`);
  mkdirSync(dirname(out), { recursive: true });
  // its peak, once mono and trimmed, to set it to -1 dB
  const shape = 'aformat=channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.005';
  const before = measure(['-i', input, '-af', `${shape},volumedetect`, '-f', 'null', '-']);
  const peak = +(/max_volume: (-?[\d.]+) dB/.exec(before)?.[1] ?? NaN);
  if (!Number.isFinite(peak)) throw new Error(`could not read the peak of ${input}`);
  ff(['-y', '-i', input, '-af', `${shape},volume=${(EFFECT.peak - peak).toFixed(2)}dB`, '-c:a', 'libvorbis', '-q:a', '5', out]);
  // the report: what was written against the budget
  const after = measure(['-i', out, '-af', 'volumedetect', '-f', 'null', '-']);
  const seconds = +(/Duration: (\d+):(\d+):([\d.]+)/.exec(after) ?? []).slice(1).reduce((s, x, i) => s + +x * [3600, 60, 1][i], 0).toFixed(2);
  const kb = statSync(out).size / 1024, got = +(/max_volume: (-?[\d.]+) dB/.exec(after)?.[1] ?? NaN);
  const rate = /(\d+) Hz/.exec(after)?.[1];
  const notes = [seconds > EFFECT.seconds && `longer than an effect's ${EFFECT.seconds} s`, kb > EFFECT.kb && `over an effect's ${EFFECT.kb} KB`].filter(Boolean);
  console.log(`${name}: ${seconds} s, ${rate} Hz mono, peak ${got} dB (was ${peak} dB), ${kb.toFixed(0)} KB -> ${out}${notes.length ? `\n  note: ${notes.join('; ')}` : ''}`);
}
main();
