/* Contact sheets of boss looks, for the owner's review (M7 step 2): `bosses=kaelith,warden` shoots the boss looks (the
   Galleries' list, bossLooks.ts), each alone in the start room at the game's own zoom with the mage just below it for
   scale, twice: in the game's pixel look (its pixels blown up whole) and close up with the pixel look off; the shots
   tiled into one labelled sheet each, bosses-texel.png and bosses-off.png.
   Needs the dev server running (npm run dev).

   Usage: npm run foe-sheet -- bosses=kaelith,warden [out=asset-previews/foes]
   OSSUARY_URL points at another server; PW_CHROMIUM at a Chromium binary (cloud sessions). */
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.OSSUARY_URL ?? 'http://localhost:5173/';
const args = process.argv.slice(2),
  opt = (k: string) => args.find((a) => a.startsWith(k + '='))?.slice(k.length + 1);
const out = opt('out') ?? 'asset-previews/foes';
mkdirSync(out, { recursive: true });

type V = { x: number; y: number; z: number; project(c: unknown): V };
type G = {
  player: { x: number; z: number; invuln: number };
  current: { cx: number; cz: number };
  sim(s: number, draw?: boolean): void;
  takeModelOptions(): void;
  camera: { position: V };
  bossLooks(ids?: string[]): { id: string; x: number; z: number }[];
};
type W = { __manual: boolean; __game: G };
const bosses = opt('bosses')?.split(',');
if (!bosses) {
  console.error('Usage: npm run foe-sheet -- bosses=kaelith,warden [out=asset-previews/foes]');
  process.exit(1);
}
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
await bossSheets(bosses);
await browser.close();

/** Boss looks, each alone in the start room at the game's own zoom, the mage below for scale, labelled with its id. */
async function bossSheets(ids: string[]) {
  const T = { texel: { w: 420, h: 330, up: 0.62, zoom: 2 }, off: { w: 300, h: 260, up: 0.62, zoom: 1 } } as const;
  for (const [mode, scale] of [
    ['texel', 1],
    ['off', 3],
  ] as const) {
    const t = T[mode],
      page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: scale });
    await page.addInitScript('window.__manual = true');
    await page.goto(`${BASE}?seed=SHEET&autolevel=skip&pixel=${mode}`);
    await page.waitForFunction(() => !!(window as unknown as W).__game, null, { timeout: 60_000 });
    await page.click('#btnStart');
    await page.evaluate(() => {
      const g = (window as unknown as W).__game;
      g.player.invuln = 999;
      g.sim(3);
    });
    const shots: Buffer[] = [];
    for (const id of ids) {
      const at = await page.evaluate((id) => {
        const g = (window as unknown as W).__game;
        g.takeModelOptions();
        g.player.x = g.current.cx;
        g.player.z = g.current.cz + 1.6;
        const [b] = g.bossLooks([id]);
        g.sim(0.6, true);
        const V = g.camera.position.constructor as new (x: number, y: number, z: number) => V,
          s = new V(b.x, 1, b.z).project(g.camera);
        return { x: ((s.x + 1) / 2) * innerWidth, y: ((1 - s.y) / 2) * innerHeight };
      }, id);
      const x = Math.round(Math.max(0, Math.min(1280 - t.w, at.x - t.w / 2))),
        y = Math.round(Math.max(0, Math.min(720 - t.h, at.y - t.h * t.up)));
      const shot = await page.screenshot({ clip: { x, y, width: t.w, height: t.h } });
      shots.push(
        t.zoom > 1
          ? await sharp(shot)
              .resize(t.w * scale * t.zoom, t.h * scale * t.zoom, { kernel: 'nearest' })
              .png()
              .toBuffer()
          : shot,
      );
    }
    const w = t.w * scale * t.zoom,
      h = t.h * scale * t.zoom,
      lab = 26 * Math.max(scale, t.zoom);
    const tiles = await Promise.all(
      shots.map(async (s, i) => {
        const label = Buffer.from(
          `<svg width="${w}" height="${lab}"><rect width="100%" height="100%" fill="#0c0a08"/><text x="${lab * 0.3}" y="${lab * 0.7}" font-family="sans-serif" font-size="${lab * 0.54}" fill="#e8dcc2">${ids[i]}</text></svg>`,
        );
        return {
          input: await sharp({ create: { width: w, height: h + lab, channels: 3, background: '#0c0a08' } })
            .composite([
              { input: label, top: 0, left: 0 },
              { input: s, top: lab, left: 0 },
            ])
            .png()
            .toBuffer(),
          top: 0,
          left: i * (w + 6),
        };
      }),
    );
    const file = join(out, `bosses-${mode}.png`);
    await sharp({ create: { width: ids.length * (w + 6), height: h + lab, channels: 3, background: '#000' } })
      .composite(tiles)
      .png()
      .toFile(file);
    console.log(`${ids.join(', ')} → ${file}`);
    await page.close();
  }
}
