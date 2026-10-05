/* Prepare a model for the game (docs/assets.md: Pipeline, step 7): check it against its kind's budget, fix what can
   be fixed (centre and base, a character facing away, too many triangles), shrink its textures, write it where the
   game looks, and print a report with a verdict per check and the line for data/assets.json.

   Usage: npm run prepare-asset -- <input.glb> [--kind hero|enemy|boss|prop|large-prop|artifact] [--id <id>]
                                   [--out <dir>] [--check]
     --kind    the budget it's held to (default hero, as before M3.5)
     --id      the file name the game uses (default: the input's name in lower case with underscores)
     --out     the assets folder to write into (default public/assets)
     --check   report only: change nothing, write nothing
   Exits with 1 when a check fails. */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { BUDGETS, MODEL_KINDS, type ModelKind } from '../src/assets/assetData';
import { measure, prepareModel, reportLines } from './assetReport';
import { bakeModelFile } from './texel-bake';

const args = process.argv.slice(2), opt = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const input = args.find((a, i) => /\.glb$/i.test(a) && !args[i - 1]?.startsWith('--'));
const kind = (opt('kind') ?? 'hero') as ModelKind, check = args.includes('--check');
if (!input || !MODEL_KINDS.includes(kind)) {
  console.error(`Usage: npm run prepare-asset -- <input.glb> [--kind ${MODEL_KINDS.join('|')}] [--id <id>] [--out <dir>] [--check]`);
  process.exit(1);
}
const B = BUDGETS[kind];
const id = opt('id') ?? basename(input, '.glb').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const outDir = resolve(opt('out') ?? resolve(import.meta.dirname, '../public/assets'));
const output = join(outDir, B.folder, `${id}.glb`);

await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const checks = await prepareModel(doc, kind, { simplifier: MeshoptSimplifier, fix: !check });
const { lines, failed } = reportLines(checks);

const kb = (f: string) => `${Math.round(statSync(f).size / 1024).toLocaleString('en')} KB`;
console.log(`\n${basename(input)} (${kb(input)}) as ${/^[aeiou]/.test(kind) ? 'an' : 'a'} ${kind}: budget ${B.triangles.toLocaleString('en')} triangles, textures up to ${B.texture} px\n`);
console.log(lines.join('\n'));

if (!check && !failed) {
  // textures used with transparency stay PNG (JPEG has none); the rest become JPEG, normal maps a little finer
  const alpha = new Set(measure(doc).textures.filter(t => t.alpha).map(t => t.tex));
  for (const [i, tex] of doc.getRoot().listTextures().entries()) tex.setName(`${alpha.has(tex) ? 'alpha' : 'tex'}_${i}`);
  const size: [number, number] = [B.texture, B.texture];
  await doc.transform(
    textureCompress({ encoder: sharp, targetFormat: 'png', resize: size, pattern: /^alpha_/ }),
    textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: size, quality: 92, pattern: /^tex_/, slots: /^normalTexture$/ }),
    textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: size, quality: 88, pattern: /^tex_/, slots: /^(?!normalTexture$).*$/ }),
  );
  mkdirSync(join(outDir, B.folder), { recursive: true });
  await io.write(output, doc);
  const file = relative(outDir, output).split('\\').join('/');
  console.log(`\nwritten: ${relative(process.cwd(), output)} (${kb(output)})`);
  // its texture as pixel art at the size the game draws it, as every Tripo model wears it (2026-10-05; tools/texel-bake.ts)
  const baked = await bakeModelFile(output, B.height), rel = (f: string) => relative(outDir, f).split('\\').join('/');
  const texel = baked ? `, "texel": { "file": "${rel(baked.file)}", "glow": "${rel(baked.glow)}" }` : '';
  if (kind === 'prop' || kind === 'large-prop') console.log(`data/assets.json, "props": "${id}": { "file": "${file}", "height": ${B.height}${texel} }   (${id} must be a placeholder the game knows)`);
  else if (kind === 'artifact') console.log(`data/assets.json, "artifacts": "${id}": { "file": "${file}", "height": ${B.height}${texel} }   (${id} is the artifact's id)`);
}
if (failed) console.log(`\n${check ? '' : 'nothing written: '}fix the failed checks (in Tripo or the export) and run it again`);
process.exit(failed ? 1 : 0);
