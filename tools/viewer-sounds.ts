/* A creature's sounds made again from the EDA-ModelWebViewer at a sample rate the asset guide accepts
   (docs/creatures.md, Two ways a model comes; the viewer writes 22,050 Hz):
     npm run viewer-sounds -- <viewer checkout> <the model's source file name> <out dir> [<type>_<n> ...] [--rate=48000]
   e.g.  -- ../EDA-ModelWebViewer "Pukei+Pukei+-+Monster+Hunter.glb" sounds-48k growl_2 roar_1 hit_1 hit_2
   It runs the viewer's own recipe (web/js/sounds.js) with its SAMPLE_RATE set to `rate`, seeded as the viewer seeds it
   (the hash of the model's source file name, the default voice unless the viewer's settings change it), so the sounds are
   the same ones with their full top end; each `<type>_<n>` is the viewer's file name (growl_2: the growl's second
   variant), all of them when none are named. The WAVs then go through `npm run prepare-sound`. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

interface Viewer {
  SOUND_TYPES: Record<string, { variants: number }>;
  DEFAULT_VOICE: Record<string, number>;
  hashString(s: string): number;
  synthesize(type: string, voice: Record<string, number>, seed: number, variant: number): Float32Array;
  encodeWav(samples: Float32Array, rate: number): ArrayBuffer;
}

async function main() {
  const rate = +(process.argv.find((a) => a.startsWith('--rate='))?.slice(7) ?? 48000);
  const [viewer, model, out, ...names] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!viewer || !model || !out) {
    console.error(
      'usage: npm run viewer-sounds -- <viewer checkout> <model source file name> <out dir> [<type>_<n> ...] [--rate=48000]',
    );
    process.exit(1);
  }
  // (the viewer's recipe with its rate changed, loaded from a copy beside the output)
  const src = readFileSync(resolve(viewer, 'web/js/sounds.js'), 'utf8');
  if (!/export const SAMPLE_RATE = \d+;/.test(src))
    throw new Error("the viewer's sounds.js no longer sets SAMPLE_RATE as expected");
  mkdirSync(out, { recursive: true });
  const copy = resolve(out, `.sounds-${rate}.mjs`);
  writeFileSync(copy, src.replace(/export const SAMPLE_RATE = \d+;/, `export const SAMPLE_RATE = ${rate};`));
  const v = (await import(pathToFileURL(copy).href)) as Viewer,
    seed = v.hashString(model);
  const all = Object.entries(v.SOUND_TYPES).flatMap(([type, { variants }]) =>
    Array.from({ length: variants }, (_, i) => `${type}_${i + 1}`),
  );
  for (const name of names.length ? names : all) {
    const [, type, n] = /^(\w+?)_(\d+)$/.exec(name) ?? [];
    if (!type || !v.SOUND_TYPES[type]) throw new Error(`"${name}" is no sound of the viewer's (${all.join(', ')})`);
    const file = join(out, `${name}.wav`);
    writeFileSync(file, new Uint8Array(v.encodeWav(v.synthesize(type, v.DEFAULT_VOICE, seed, +n - 1), rate)));
    console.log(`${file} (${rate} Hz)`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
