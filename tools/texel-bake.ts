/* Every Tripo model's texture made pixel art at the size the game draws it (2026-10-05, the owner: every model from
   Tripo gets it; docs/creatures.md, docs/assets.md):
     npm run texel-bake -- dragonling            a creature, from public/assets/creatures/<id>.glb (or: all)
     npm run texel-bake -- <file.glb> 0.6        any model the game draws that many tiles tall
   It reads the game's own file (so no source model is needed), makes its texture pixel art (src/render/texelBake.ts,
   tuning CFG.creatures.texel) and writes <file>.texel.png (the colour) and <file>.glow.png (the markings kept lit) beside
   it. A creature's are named in data/creatures.json (`texel`); prepare-asset prints a made asset's for data/assets.json.
   animate-creature and prepare-asset run it on every model they write. */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { CFG } from '../src/config';
import { bakeTexel } from '../src/render/texelBake';

const DIR = resolve(import.meta.dirname, '../public/assets/creatures'), DATA = resolve(import.meta.dirname, '../data/creatures.json');

/** Bake the model `glb`, drawn `height` tiles tall, into <glb>.texel.png and <glb>.glow.png beside it; their paths, the
    size it shrank to, its colours and how many texels glow; null for a model with no texture. */
export async function bakeModelFile(glb: string, height: number) {
  const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(glb);
  const tex = doc.getRoot().listMaterials().map(m => m.getBaseColorTexture()).find(Boolean);
  if (!tex) return null;
  const { data: px, info: size } = await sharp(Buffer.from(tex.getImage()!)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const prims = doc.getRoot().listMeshes().flatMap(m => m.listPrimitives());
  const meshes = prims.filter(p => p.getMaterial()?.getBaseColorTexture() === tex && p.getAttribute('TEXCOORD_0')).map(p => {
    const pos = p.getAttribute('POSITION')!.getArray()!, uv = p.getAttribute('TEXCOORD_0')!.getArray()!;
    return { pos, uv, index: p.getIndices()?.getArray() ?? Uint32Array.from({ length: pos.length / 3 }, (_, i) => i) };
  });
  // (the game scales the model to `height` by its whole height: the model's units to game pixels likewise)
  let lo = Infinity, hi = -Infinity;
  for (const p of prims) { const b = p.getAttribute('POSITION')!; lo = Math.min(lo, b.getMinNormalized([])[1]); hi = Math.max(hi, b.getMaxNormalized([])[1]); }
  const b = bakeTexel(px, size.width, size.height, meshes, CFG.roomKit.texel[0] * height / (hi - lo || 1), CFG.creatures.texel);
  const base = glb.replace(/\.glb$/i, ''), file = `${base}.texel.png`, glow = `${base}.glow.png`;
  const png = (bytes: Uint8Array, to: string) => sharp(Buffer.from(bytes), { raw: { width: b.side, height: b.side, channels: 4 } }).removeAlpha().png({ compressionLevel: 9, palette: true }).toFile(to);
  await png(b.colour, file); await png(b.glow, glow);
  const kb = (f: string) => (statSync(f).size / 1024).toFixed(0);
  console.log(`${basename(glb)}: ${size.width} px texture -> ${b.side} px pixel art, ${b.colours} colours, ${b.glowing} texels glowing (${basename(file)} ${kb(file)} KB, ${basename(glow)} ${kb(glow)} KB)`);
  return { file, glow, side: b.side, colours: b.colours, glowing: b.glowing };
}

/** Bake creature `id` (as tall as data/creatures.json says) and name the files there. */
export async function texelBake(id: string) {
  const data = JSON.parse(readFileSync(DATA, 'utf8')), info = data[id];
  if (!info) throw new Error(`no creature "${id}" in data/creatures.json`);
  const b = await bakeModelFile(resolve(DIR, `${id}.glb`), info.height);
  if (!b) throw new Error(`${id}: no base colour texture`);
  const rel = (f: string) => `assets/creatures/${basename(f)}`;
  info.texel = { file: rel(b.file), glow: rel(b.glow), side: b.side, colours: b.colours, glowing: b.glowing };
  writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const want = process.argv.slice(2).filter(a => !a.startsWith('--'));
  (async () => {
    if (want[0]?.endsWith('.glb')) {
      const h = Number(want[1]); if (!(h > 0)) throw new Error('usage: npm run texel-bake -- <file.glb> <height in tiles>');
      if (!await bakeModelFile(resolve(want[0]), h)) console.log(`${want[0]}: no texture, nothing to bake`);
      return;
    }
    const ids = want[0] === 'all' ? Object.keys(JSON.parse(readFileSync(DATA, 'utf8'))).filter(k => k !== '_comment') : want;
    if (!ids.length) throw new Error('usage: npm run texel-bake -- <creature id>|all   or   -- <file.glb> <height in tiles>');
    for (const id of ids) await texelBake(id);
  })().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
