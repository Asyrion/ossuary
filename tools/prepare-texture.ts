/* Prepare a painted texture or icon for the game (docs/assets.md: Pipeline, floor and wall textures, icons): make it
   square at its kind's size, compress it, write it where the game looks, check it, and make previews to judge it by.

   Usage: npm run prepare-texture -- <image> --kind floor|wall|icon|coin --id <id> [--out <dir>] [--previews <dir>]
     --kind      floor or wall: a seamless 1,024 px tile for a floor look (JPEG); icon: an artifact's icon (PNG); coin: a
                 coin's face, on a plain ground or cut out (two PNGs: the face at the fine layer's pixel, and its icon)
     --id        a floor look's name (crypt, drowned, burning), an artifact's id (ember_sigil) or a coin's name (pale_obol)
     --out       the assets folder to write into (default public/assets)
     --previews  where the previews go (default asset-previews/, which git ignores)
   Tiles get a 2 × 2 repeat to spot seams, and checks for seams and baked-in light; icons get a sheet at the HUD's
   28 px and the lore card's 44 px on the game's dark background, plain, cursed and cleansed; coins a sheet of the face
   as the room shows it and its icon at the HUD's and the lore card's sizes. */
import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { IMAGES, IMAGE_KINDS, type ImageKind } from '../src/assets/assetData';
import { coinCircle, lightSpread, seamScore, transparentBorder } from './imageChecks';

const args = process.argv.slice(2),
  opt = (k: string) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
const input = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const kind = opt('kind') as ImageKind,
  id = opt('id');
if (!input || !IMAGE_KINDS.includes(kind) || !id || !/^[a-z0-9_]+$/.test(id)) {
  console.error(
    'Usage: npm run prepare-texture -- <image> --kind floor|wall|icon|coin --id <look, artifact or coin id, lower case> [--out <dir>] [--previews <dir>]',
  );
  process.exit(1);
}
const S = IMAGES[kind],
  outDir = resolve(opt('out') ?? resolve(import.meta.dirname, '../public/assets'));
const previews = resolve(opt('previews') ?? resolve(import.meta.dirname, '../asset-previews'));
const output =
  kind === 'icon' || kind === 'coin' ? join(outDir, S.folder, `${id}.png`) : join(outDir, S.folder, id, `${kind}.jpg`);
mkdirSync(join(output, '..'), { recursive: true });
mkdirSync(previews, { recursive: true });

const src = sharp(input),
  meta = await src.metadata();
const lines: string[] = [],
  row = (status: 'ok  ' | 'warn' | 'FAIL' | 'fix ', name: string, text: string) =>
    lines.push(`${status}  ${(name + ':').padEnd(12)} ${text}`);
const w0 = meta.width ?? 0,
  h0 = meta.height ?? 0;

if (kind === 'coin') {
  // a coin's face: the circle cut from its ground, drawn at the fine layer's pixel (`size` across: the game draws coins
  // finer than the rest, two pixels to a game pixel, so a coin facing the camera shows it pixel for pixel), in a few
  // colours with a hard edge, as the game's pixel art is; and its icon (`icon` across), the coin a pixel inside its edge
  // and outlined in dark, as the artifacts' icons are
  const raw = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = raw.info.width,
    H = raw.info.height,
    data = raw.data,
    coin = coinCircle({ data, width: W, height: H, channels: 4 });
  if (!coin) {
    console.error(`${basename(input)}: no coin found (the image is all one colour)`);
    process.exit(1);
  }
  row(
    'ok  ',
    'Ground',
    transparentBorder({ data, width: W, height: H, channels: 4 }) ? 'cut out' : 'plain: cut away round the coin',
  );
  row(
    Math.abs(coin.round - 1) < 0.06 ? 'ok  ' : 'warn',
    'Round',
    Math.abs(coin.round - 1) < 0.06
      ? 'a round coin'
      : `${coin.round.toFixed(2)} as tall as wide: a shadow or a piece under it is left out (the coin is the circle across its width)`,
  );
  row(
    coin.r * 2 >= (S.source ?? 0) ? 'ok  ' : 'warn',
    'Source size',
    `the coin ${Math.round(coin.r * 2)} px across${coin.r * 2 < (S.source ?? 0) ? ` (keep ${S.source} px or more to redo it later)` : ''}`,
  );
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (Math.hypot(x + 0.5 - coin.cx, y + 0.5 - coin.cy) > coin.r) data[(y * W + x) * 4 + 3] = 0;
  const d = Math.round(coin.r * 2),
    left = Math.round(coin.cx - coin.r),
    top = Math.round(coin.cy - coin.r);
  const room = await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
    .extend({ top: d, bottom: d, left: d, right: d, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const square = await sharp(room)
    .extract({ left: left + d, top: top + d, width: d, height: d })
    .png()
    .toBuffer(); // (in two passes: sharp crops before it extends)
  /** The coin `px` across in a `full` square: hard-edged (each pixel drawn or clear), cut to 16 colours. */
  const pixels = async (px: number, full = px) => {
    const small = await sharp(square)
      .resize(px, px, { kernel: 'lanczos3' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 3; i < small.data.length; i += 4) small.data[i] = small.data[i] >= 128 ? 255 : 0;
    const pad = (full - px) >> 1;
    return sharp(small.data, { raw: { width: px, height: px, channels: 4 } })
      .extend({
        top: pad,
        bottom: full - px - pad,
        left: pad,
        right: full - px - pad,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
  };
  const face = await pixels(S.size);
  await sharp(face).png({ palette: true, colours: 16, dither: 0, compressionLevel: 9 }).toFile(output);
  // the icon: outlined where a clear pixel touches the coin (as toIcon in src/items/artifactIcons.ts)
  const N = S.icon ?? 24,
    ic = await sharp(await pixels(N - 2, N))
      .raw()
      .toBuffer({ resolveWithObject: true }),
    px = ic.data;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N && px[(y * N + x) * 4 + 3] === 255;
  const edge: number[] = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)))
        edge.push((y * N + x) * 4);
  for (const i of edge) px.set([22, 15, 11, 235], i);
  const iconFile = output.replace(/\.png$/, '-icon.png');
  await sharp(px, { raw: { width: N, height: N, channels: 4 } })
    .png({ palette: true, colours: 24, dither: 0, compressionLevel: 9 })
    .toFile(iconFile);
  // the sheet, on the game's dark background: the face as the room draws it, 4× larger; the icon at 28 px and 44 px, 4× larger
  const on = async (img: Buffer, size: number, k: number) =>
    sharp(
      await sharp({ create: { width: size, height: size, channels: 4, background: '#1c1814' } })
        .composite([{ input: await sharp(img).resize(size, size, { kernel: 'nearest' }).png().toBuffer() }])
        .png()
        .toBuffer(),
    )
      .resize(size * k, size * k, { kernel: 'nearest' })
      .png()
      .toBuffer();
  const cells = [
    await on(face, S.size, 4),
    await on(await sharp(iconFile).toBuffer(), 28, 4),
    await on(await sharp(iconFile).toBuffer(), 44, 4),
  ];
  let x = 0;
  const parts: { input: Buffer; left: number; top: number }[] = [];
  for (const c of cells) {
    const m = await sharp(c).metadata();
    parts.push({ input: c, left: x, top: 0 });
    x += m.width! + 12;
  }
  const sheet = join(previews, `${id}_coin_sheet.png`);
  await sharp({ create: { width: x, height: Math.max(S.size * 4, 44 * 4), channels: 4, background: '#0c0a08' } })
    .composite(parts)
    .png()
    .toFile(sheet);
  lines.push(`\nicon: ${relative(process.cwd(), iconFile)} (${kb(iconFile)})`);
  lines.push(
    `preview: ${relative(process.cwd(), sheet)} (the face as the room draws it, 4× larger; the icon at 28 px and 44 px, 4× larger)`,
  );
} else if (kind === 'icon') {
  // an icon: square with room round the object, transparent background, shipped small
  const raw = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cut = transparentBorder({ data: raw.data, width: raw.info.width, height: raw.info.height, channels: 4 });
  row(
    cut ? 'ok  ' : 'warn',
    'Background',
    cut ? 'transparent' : 'not transparent: remove the background (the HUD shows the room behind it)',
  );
  row(
    w0 === h0 ? 'ok  ' : 'fix ',
    'Shape',
    w0 === h0 ? `${w0} px square` : `${w0} × ${h0}: padded to a square, centred`,
  );
  row(
    Math.max(w0, h0) >= (S.source ?? S.size) ? 'ok  ' : 'warn',
    'Source size',
    `${Math.max(w0, h0)} px${Math.max(w0, h0) < (S.source ?? S.size) ? ` (keep ${S.source} px or more to redo it later)` : ''}`,
  );
  const side = Math.max(w0, h0);
  const square = await sharp(input)
    .ensureAlpha()
    .resize(side, side, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp(square).resize(S.size, S.size).png({ compressionLevel: 9, palette: false }).toFile(output);
  // the sheet: 28 px (HUD) and 44 px (lore card), plain, cursed and cleansed, on the game's dark background, shown 4× larger
  const GLOW = {
    plain: 'rgba(255,170,60,.6)',
    cursed: 'rgba(200,30,20,.9)',
    cleansed: 'rgba(240,230,200,.75)',
  } as const;
  const cell = async (px: number, glow: string) => {
    const pad = Math.round(px * 0.35),
      full = px + pad * 2,
      icon = await sharp(square).resize(px, px).png().toBuffer();
    const halo = await sharp({ create: { width: px, height: px, channels: 4, background: glow } })
      .composite([{ input: icon, blend: 'dest-in' }])
      .png()
      .toBuffer();
    // (sharp composites after its other steps, so the halo is placed in one pass and blurred in the next)
    const placed = await sharp({
      create: { width: full, height: full, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: halo, left: pad, top: pad }])
      .png()
      .toBuffer();
    const blurred = await sharp(placed)
      .blur(Math.max(0.5, px / 8))
      .png()
      .toBuffer();
    const one = await sharp({ create: { width: full, height: full, channels: 4, background: '#0c0a08' } })
      .composite([{ input: blurred }, { input: icon, left: pad, top: pad }])
      .png()
      .toBuffer();
    return sharp(one)
      .resize(full * 4, full * 4, { kernel: 'nearest' })
      .png()
      .toBuffer();
  };
  const cells: { input: Buffer; left: number; top: number }[] = [];
  let y = 0,
    width = 0;
  for (const px of [28, 44]) {
    let x = 0,
      tall = 0;
    for (const g of Object.values(GLOW)) {
      const b = await cell(px, g),
        m = await sharp(b).metadata();
      cells.push({ input: b, left: x, top: y });
      x += m.width! + 8;
      tall = m.height!;
    }
    y += tall + 8;
    width = Math.max(width, x);
  }
  const sheet = join(previews, `${id}_icon_sheet.png`);
  await sharp({ create: { width, height: y, channels: 4, background: '#1a1410' } })
    .composite(cells)
    .png()
    .toFile(sheet);
  lines.push(
    `\npreview: ${relative(process.cwd(), sheet)} (28 px, then 44 px: plain, cursed, cleansed; shown 4× larger)`,
  );
} else {
  // a floor or wall tile: square, seamless, evenly lit
  row(
    w0 === h0 ? 'ok  ' : 'fix ',
    'Shape',
    w0 === h0 ? `${w0} px square` : `${w0} × ${h0}: cropped to a square from the middle`,
  );
  if (Math.min(w0, h0) < S.size) row('warn', 'Size', `${Math.min(w0, h0)} px, less than ${S.size}: it will look soft`);
  const side = Math.min(w0, h0),
    tile = await sharp(input)
      .extract({ left: (w0 - side) >> 1, top: (h0 - side) >> 1, width: side, height: side })
      .resize(S.size, S.size)
      .removeAlpha()
      .toBuffer();
  const px = await sharp(tile).raw().toBuffer({ resolveWithObject: true });
  const p = { data: px.data, width: px.info.width, height: px.info.height, channels: px.info.channels };
  const seam = seamScore(p),
    light = lightSpread(p);
  row(
    seam < 2 ? 'ok  ' : 'warn',
    'Seams',
    `${seam.toFixed(2)} (about 1 is seamless; ${seam < 2 ? 'none likely' : 'a seam will likely show where it repeats: remake it as a tile, --tile in MidJourney'})`,
  );
  row(
    light < 0.25 ? 'ok  ' : 'warn',
    'Light',
    `${Math.round(light * 100)}% between its brightest and darkest quarter${light < 0.25 ? '' : ': light or shadow baked in (it shows as a pattern when repeated)'}`,
  );
  await sharp(tile).jpeg({ quality: 85, mozjpeg: true }).toFile(output);
  const repeat = join(previews, `${id}_${kind}_2x2.jpg`),
    half = S.size;
  const four = await sharp({ create: { width: half * 2, height: half * 2, channels: 3, background: '#000' } })
    .composite([0, 1, 2, 3].map((i) => ({ input: tile, left: (i % 2) * half, top: (i >> 1) * half })))
    .png()
    .toBuffer();
  await sharp(four).resize(half, half).jpeg({ quality: 85 }).toFile(repeat); // (resized in its own pass: sharp composites last)
  lines.push(`\npreview: ${relative(process.cwd(), repeat)} (four tiles side by side: look for seams and repeats)`);
}

function kb(f: string) {
  return `${Math.max(1, Math.round(statSync(f).size / 1024)).toLocaleString('en')} KB`;
}
console.log(
  `\n${basename(input)} (${w0} × ${h0}, ${kb(input)}) as ${kind === 'icon' ? 'an icon' : kind === 'coin' ? "a coin's face" : `a ${kind} tile`}\n`,
);
console.log(lines.join('\n'));
const file = relative(outDir, output).split('\\').join('/');
console.log(`\nwritten: ${relative(process.cwd(), output)} (${kb(output)})`);
console.log(
  kind === 'coin'
    ? `data/assets.json, "coins": "${id}": { "face": "${file}", "icon": "${file.replace(/\.png$/, '-icon.png')}" } (and "obol": "${id}" for the obols to wear it)`
    : kind === 'icon'
      ? `data/assets.json, "icons": "${id}": { "file": "${file}" }`
      : kind === 'floor'
        ? `data/assets.json, "floors": "${id}": { "floor": "${file}" }`
        : '(walls are not used by the game yet: the file is ready for when they are)',
);
