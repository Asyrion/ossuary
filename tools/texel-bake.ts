/* Pixel art from a creature's own texture (2026-10-05; docs/creatures.md): npm run texel-bake -- dragonling   (or: all)
   Reads the game's file (public/assets/creatures/<id>.glb, so the owner's source model isn't needed) and how tall the
   game draws it (data/creatures.json), and makes its texture pixel art at that size (src/render/texelBake.ts, tuning
   CFG.creatures.texel): <id>.texel.png, the colour, and <id>.glow.png, the markings kept lit. Written beside it and named
   in data/creatures.json (`texel`); the game wears them in the creature look "pixel art from its texture"
   (src/actors/texturePixel.ts). animate-creature runs it after every bake. */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CFG } from '../src/config';
import { bakeTexel } from '../src/render/texelBake';

const DIR = resolve(import.meta.dirname, '../public/assets/creatures'), DATA = resolve(import.meta.dirname, '../data/creatures.json');

/** Bake creature `id`'s texture as pixel art and name the files in data/creatures.json. */
export async function texelBake(id: string) {
  const data = JSON.parse(readFileSync(DATA, 'utf8')), info = data[id];
  if (!info) throw new Error(`no creature "${id}" in data/creatures.json`);
  const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(resolve(DIR, `${id}.glb`));
  const tex = doc.getRoot().listMaterials().map(m => m.getBaseColorTexture()).find(Boolean);
  if (!tex) throw new Error(`${id}: no base colour texture`);
  const { data: px, info: size } = await sharp(Buffer.from(tex.getImage()!)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const meshes = doc.getRoot().listMeshes().flatMap(m => m.listPrimitives()).filter(p => p.getMaterial()?.getBaseColorTexture() === tex && p.getAttribute('TEXCOORD_0')).map(p => {
    const pos = p.getAttribute('POSITION')!.getArray()!, uv = p.getAttribute('TEXCOORD_0')!.getArray()!;
    return { pos, uv, index: p.getIndices()?.getArray() ?? Uint32Array.from({ length: pos.length / 3 }, (_, i) => i) };
  });
  const pxPerUnit = CFG.roomKit.texel[0] * info.height / info.modelHeight; // (the game's pixels a model unit, as it stands)
  const b = bakeTexel(px, size.width, size.height, meshes, pxPerUnit, CFG.creatures.texel);
  const png = (bytes: Uint8Array, name: string) => sharp(Buffer.from(bytes), { raw: { width: b.side, height: b.side, channels: 4 } }).removeAlpha().png({ compressionLevel: 9, palette: true }).toFile(resolve(DIR, name));
  await png(b.colour, `${id}.texel.png`); await png(b.glow, `${id}.glow.png`);
  info.texel = { file: `assets/creatures/${id}.texel.png`, glow: `assets/creatures/${id}.glow.png`, side: b.side, colours: b.colours, glowing: b.glowing };
  writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
  const kb = (n: string) => (statSync(resolve(DIR, n)).size / 1024).toFixed(0);
  console.log(`${id}: ${size.width} px texture -> ${b.side} px pixel art, ${b.colours} colours, ${b.glowing} texels glowing (${kb(`${id}.texel.png`)} KB + ${kb(`${id}.glow.png`)} KB)`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const want = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const ids = want[0] === 'all' ? Object.keys(JSON.parse(readFileSync(DATA, 'utf8'))).filter(k => k !== '_comment') : want;
  if (!ids.length) { console.error('usage: npm run texel-bake -- <id>|all'); process.exit(1); }
  (async () => { for (const id of ids) await texelBake(id); })().catch(e => { console.error(e); process.exit(1); });
}
