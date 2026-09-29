/* Prepare a painted texture or icon for the game (docs/assets.md: Pipeline, floor and wall textures, icons): make it
   square at its kind's size, compress it, write it where the game looks, check it, and make previews to judge it by.

   Usage: npm run prepare-texture -- <image> --kind floor|wall|icon --id <id> [--out <dir>] [--previews <dir>]
     --kind      floor or wall: a seamless 1,024 px tile for a floor look (JPEG); icon: an artifact's icon (PNG)
     --id        a floor look's name (crypt, drowned, burning) or an artifact's id (ember_sigil)
     --out       the assets folder to write into (default public/assets)
     --previews  where the previews go (default asset-previews/, which git ignores)
   Tiles get a 2 × 2 repeat to spot seams, and checks for seams and baked-in light; icons get a sheet at the HUD's
   28 px and the lore card's 44 px on the game's dark background, plain, cursed and cleansed. */
import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { IMAGES, IMAGE_KINDS, type ImageKind } from '../src/assets/assetData';
import { lightSpread, seamScore, transparentBorder } from './imageChecks';

const args = process.argv.slice(2), opt = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const input = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const kind = opt('kind') as ImageKind, id = opt('id');
if (!input || !IMAGE_KINDS.includes(kind) || !id || !/^[a-z0-9_]+$/.test(id)) {
  console.error('Usage: npm run prepare-texture -- <image> --kind floor|wall|icon --id <look or artifact id, lower case> [--out <dir>] [--previews <dir>]');
  process.exit(1);
}
const S = IMAGES[kind], outDir = resolve(opt('out') ?? resolve(import.meta.dirname, '../public/assets'));
const previews = resolve(opt('previews') ?? resolve(import.meta.dirname, '../asset-previews'));
const output = kind === 'icon' ? join(outDir, S.folder, `${id}.png`) : join(outDir, S.folder, id, `${kind}.jpg`);
mkdirSync(join(output, '..'), { recursive: true }); mkdirSync(previews, { recursive: true });

const src = sharp(input), meta = await src.metadata();
const lines: string[] = [], row = (status: 'ok  ' | 'warn' | 'FAIL' | 'fix ', name: string, text: string) => lines.push(`${status}  ${(name + ':').padEnd(12)} ${text}`);
const w0 = meta.width ?? 0, h0 = meta.height ?? 0;


if (kind === 'icon') {
  // an icon: square with room round the object, transparent background, shipped small
  const raw = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cut = transparentBorder({ data: raw.data, width: raw.info.width, height: raw.info.height, channels: 4 });
  row(cut ? 'ok  ' : 'warn', 'Background', cut ? 'transparent' : 'not transparent: remove the background (the HUD shows the room behind it)');
  row(w0 === h0 ? 'ok  ' : 'fix ', 'Shape', w0 === h0 ? `${w0} px square` : `${w0} × ${h0}: padded to a square, centred`);
  row(Math.max(w0, h0) >= (S.source ?? S.size) ? 'ok  ' : 'warn', 'Source size', `${Math.max(w0, h0)} px${Math.max(w0, h0) < (S.source ?? S.size) ? ` (keep ${S.source} px or more to redo it later)` : ''}`);
  const side = Math.max(w0, h0);
  const square = await sharp(input).ensureAlpha().resize(side, side, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp(square).resize(S.size, S.size).png({ compressionLevel: 9, palette: false }).toFile(output);
  // the sheet: 28 px (HUD) and 44 px (lore card), plain, cursed and cleansed, on the game's dark background, shown 4× larger
  const GLOW = { plain: 'rgba(255,170,60,.6)', cursed: 'rgba(200,30,20,.9)', cleansed: 'rgba(240,230,200,.75)' } as const;
  const cell = async (px: number, glow: string) => {
    const pad = Math.round(px * .35), full = px + pad * 2, icon = await sharp(square).resize(px, px).png().toBuffer();
    const halo = await sharp({ create: { width: px, height: px, channels: 4, background: glow } }).composite([{ input: icon, blend: 'dest-in' }]).png().toBuffer();
    // (sharp composites after its other steps, so the halo is placed in one pass and blurred in the next)
    const placed = await sharp({ create: { width: full, height: full, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: halo, left: pad, top: pad }]).png().toBuffer();
    const blurred = await sharp(placed).blur(Math.max(.5, px / 8)).png().toBuffer();
    const one = await sharp({ create: { width: full, height: full, channels: 4, background: '#0c0a08' } })
      .composite([{ input: blurred }, { input: icon, left: pad, top: pad }]).png().toBuffer();
    return sharp(one).resize(full * 4, full * 4, { kernel: 'nearest' }).png().toBuffer();
  };
  const cells: { input: Buffer; left: number; top: number }[] = []; let y = 0, width = 0;
  for (const px of [28, 44]) {
    let x = 0, tall = 0;
    for (const g of Object.values(GLOW)) { const b = await cell(px, g), m = await sharp(b).metadata(); cells.push({ input: b, left: x, top: y }); x += m.width! + 8; tall = m.height!; }
    y += tall + 8; width = Math.max(width, x);
  }
  const sheet = join(previews, `${id}_icon_sheet.png`);
  await sharp({ create: { width, height: y, channels: 4, background: '#1a1410' } }).composite(cells).png().toFile(sheet);
  lines.push(`\npreview: ${relative(process.cwd(), sheet)} (28 px, then 44 px: plain, cursed, cleansed; shown 4× larger)`);
} else {
  // a floor or wall tile: square, seamless, evenly lit
  row(w0 === h0 ? 'ok  ' : 'fix ', 'Shape', w0 === h0 ? `${w0} px square` : `${w0} × ${h0}: cropped to a square from the middle`);
  if (Math.min(w0, h0) < S.size) row('warn', 'Size', `${Math.min(w0, h0)} px, less than ${S.size}: it will look soft`);
  const side = Math.min(w0, h0), tile = await sharp(input).extract({ left: (w0 - side) >> 1, top: (h0 - side) >> 1, width: side, height: side }).resize(S.size, S.size).removeAlpha().toBuffer();
  const px = await sharp(tile).raw().toBuffer({ resolveWithObject: true });
  const p = { data: px.data, width: px.info.width, height: px.info.height, channels: px.info.channels };
  const seam = seamScore(p), light = lightSpread(p);
  row(seam < 2 ? 'ok  ' : 'warn', 'Seams', `${seam.toFixed(2)} (about 1 is seamless; ${seam < 2 ? 'none likely' : 'a seam will likely show where it repeats: remake it as a tile, --tile in MidJourney'})`);
  row(light < .25 ? 'ok  ' : 'warn', 'Light', `${Math.round(light * 100)}% between its brightest and darkest quarter${light < .25 ? '' : ': light or shadow baked in (it shows as a pattern when repeated)'}`);
  await sharp(tile).jpeg({ quality: 85, mozjpeg: true }).toFile(output);
  const repeat = join(previews, `${id}_${kind}_2x2.jpg`), half = S.size;
  const four = await sharp({ create: { width: half * 2, height: half * 2, channels: 3, background: '#000' } })
    .composite([0, 1, 2, 3].map(i => ({ input: tile, left: (i % 2) * half, top: (i >> 1) * half }))).png().toBuffer();
  await sharp(four).resize(half, half).jpeg({ quality: 85 }).toFile(repeat); // (resized in its own pass: sharp composites last)
  lines.push(`\npreview: ${relative(process.cwd(), repeat)} (four tiles side by side: look for seams and repeats)`);
}

const kb = (f: string) => `${Math.round(statSync(f).size / 1024).toLocaleString('en')} KB`;
console.log(`\n${basename(input)} (${w0} × ${h0}, ${kb(input)}) as ${kind === 'icon' ? 'an icon' : `a ${kind} tile`}\n`);
console.log(lines.join('\n'));
const file = relative(outDir, output).split('\\').join('/');
console.log(`\nwritten: ${relative(process.cwd(), output)} (${kb(output)})`);
console.log(kind === 'icon' ? `data/assets.json, "icons": "${id}": { "file": "${file}" }` : kind === 'floor' ? `data/assets.json, "floors": "${id}": { "floor": "${file}" }` : '(walls are not used by the game yet: the file is ready for when they are)');

