/* Sounds played from files (data/sounds.json; docs/assets.md, Sound): fetched and decoded once for each audio context
   (the game's, or an offline one for a preview), then played as the synthesised sound of the same name would be, on its
   own context, into its own output. Until a file has loaded, or if it fails, the caller plays the synthesised one. */
import table from '../../data/sounds.json';
import { soundsOf } from './soundData';
import { CFG } from '../config';
import type { Ctx, Rand } from './synth';

const SOUNDS = soundsOf(table);
/** Every sound played from files, by name. */
export const SOUND_FILES: Readonly<Record<string, { files: readonly string[] }>> = SOUNDS;
const loaded = new WeakMap<Ctx, Map<string, Promise<AudioBuffer | null> & { buffer?: AudioBuffer | null }>>();

/** Whether a sound plays from a file. */
export const hasSample = (name: string) => name in SOUNDS;
function load(ctx: Ctx, file: string) {
  let m = loaded.get(ctx);
  if (!m) loaded.set(ctx, (m = new Map<string, Promise<AudioBuffer | null> & { buffer?: AudioBuffer | null }>()));
  let p = m.get(file);
  if (!p) {
    const q = fetch(`${import.meta.env.BASE_URL}assets/sounds/${file}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.arrayBuffer();
      })
      .then((b) => ctx.decodeAudioData(b))
      .catch((e) => {
        console.warn(`sound ${file} could not be loaded (${e}); its synthesised sound plays`);
        return null;
      }) as Promise<AudioBuffer | null> & { buffer?: AudioBuffer | null };
    void q.then((b) => {
      q.buffer = b;
    });
    m.set(file, (p = q));
  }
  return p;
}
/** Load every file of `names` on `ctx` (an offline preview waits for them before it renders). */
export const preloadSamples = (ctx: Ctx, names: Iterable<string>) =>
  Promise.all([...new Set(names)].flatMap((n) => SOUNDS[n]?.files.map((f) => load(ctx, f)) ?? []));

/** Play sound `name` from its file at time `t` into `out`, at `gain` times its own (a variant chosen with `r`, its pitch
    moved a hair): whether it did. Asked before its file has loaded, it starts loading it and answers no. */
export function playSample(ctx: Ctx, name: string, t: number, out: AudioNode, gain: number, r: Rand) {
  const s = SOUNDS[name];
  if (!s) return false;
  const file = s.files[Math.min(s.files.length - 1, Math.floor(r.next() * s.files.length))],
    p = load(ctx, file);
  if (!p.buffer) {
    void preloadSamples(ctx, [name]);
    return false;
  }
  const src = ctx.createBufferSource(),
    g = ctx.createGain();
  src.buffer = p.buffer;
  src.playbackRate.value = r.range(1 - CFG.audio.fileSpread, 1 + CFG.audio.fileSpread);
  g.gain.value = s.gain * gain;
  src.connect(g).connect(out);
  src.start(t);
  return true;
}
