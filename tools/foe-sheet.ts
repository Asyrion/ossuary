/* M4.12 (docs/M4.12-plan.md): contact sheets of the foes' old and new looks side by side, for the owner's review. For each
   floor asked, the floor's pairs (the old look left, the new right) stood one at a time in the start room at the game's own
   zoom, each shot round the pair with the mage just below it for scale, twice: in the game's pixel look (its pixels blown up
   whole), and close up with the pixel look off; the shots tiled into one labelled sheet a floor. The contract each new look keeps (its old look's moving parts, about its height) is printed.
   Needs the dev server running (npm run dev).

   Usage: npm run foe-sheet -- [floor=1,2] [only=sporeling,runeBeetle] [out=asset-previews/foes]
   OSSUARY_URL points at another server; PW_CHROMIUM at a Chromium binary (cloud sessions). */
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.OSSUARY_URL ?? 'http://localhost:5173/';
const args = process.argv.slice(2), opt = (k: string) => args.find(a => a.startsWith(k + '='))?.slice(k.length + 1);
const floors = (opt('floor') ?? '1,2,3,4,5,0').split(',').map(Number), only = opt('only')?.split(','), out = opt('out') ?? 'asset-previews/foes';
mkdirSync(out, { recursive: true });

type P = { x: number; z: number };
type V = { x: number; y: number; z: number; project(c: unknown): V };
type G = { player: { x: number; z: number; invuln: number }; current: { cx: number; cz: number }; sim(s: number, draw?: boolean): void; takeModelOptions(): void; camera: { position: V };
  lookPairs(f?: number, only?: string[]): { id: string; old: P; new: P }[]; lookContract(): { id: string; missing: string[]; oldH: number; newH: number }[] };
type W = { __manual: boolean; __game: G };
// the crop round each pair (CSS pixels): in the pixel look a wider one, the mage below for scale, blown up whole; with the
// look off a close one at three device pixels to one
const TILE = { texel: { w: 380, h: 250, up: .36, zoom: 2 }, off: { w: 280, h: 150, up: .5, zoom: 1 } } as const;
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
for (const floor of floors) for (const [mode, scale] of [['texel', 1], ['off', 3]] as const) {
  const T = TILE[mode];
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: scale });
  await page.addInitScript('window.__manual = true');
  await page.goto(`${BASE}?seed=SHEET&autolevel=skip&looks=new&pixel=${mode}`);
  await page.waitForFunction(() => !!(window as unknown as W).__game, null, { timeout: 60_000 });
  await page.click('#btnStart');
  // each pair alone in the start room at the game's own zoom, the mage just below it for scale
  const ids = await page.evaluate(f => { const g = (window as unknown as W).__game; g.player.invuln = 999; g.sim(3); const ids = g.lookPairs(f).map(p => p.id); g.takeModelOptions(); return ids; }, floor).then(ids => ids.filter(id => !only || only.includes(id)));
  if (!ids.length) { await page.close(); if (mode === 'texel') console.log(`floor ${floor}: no new looks`); continue; }
  const pairs: { id: string }[] = [], shots: Buffer[] = [];
  for (const id of ids) {
    const at = await page.evaluate(id => {
      const g = (window as unknown as W).__game; g.takeModelOptions(); g.player.x = g.current.cx; g.player.z = g.current.cz + 1.4;
      const [p] = g.lookPairs(undefined, [id]); g.sim(.6, true); // (drawn, so the camera stands where the shot sees it)
      const V = g.camera.position.constructor as new (x: number, y: number, z: number) => V, s = new V((p.old.x + p.new.x) / 2, .35, (p.old.z + p.new.z) / 2).project(g.camera);
      return { x: (s.x + 1) / 2 * innerWidth, y: (1 - s.y) / 2 * innerHeight };
    }, id);
    const x = Math.round(Math.max(0, Math.min(1280 - T.w, at.x - T.w / 2))), y = Math.round(Math.max(0, Math.min(720 - T.h, at.y - T.h * T.up)));
    const shot = await page.screenshot({ clip: { x, y, width: T.w, height: T.h } });
    shots.push(T.zoom > 1 ? await sharp(shot).resize(T.w * scale * T.zoom, T.h * scale * T.zoom, { kernel: 'nearest' }).png().toBuffer() : shot); pairs.push({ id });
  }
  // the sheet: three across, each shot labelled with the look it replaces (old left, new right)
  const cols = 3, w = T.w * scale * T.zoom, h = T.h * scale * T.zoom, lab = 26 * Math.max(scale, T.zoom), rows = Math.ceil(shots.length / cols);
  const tiles = await Promise.all(shots.map(async (s, i) => {
    const label = Buffer.from(`<svg width="${w}" height="${lab}"><rect width="100%" height="100%" fill="#0c0a08"/><text x="${lab * .3}" y="${lab * .7}" font-family="sans-serif" font-size="${lab * .54}" fill="#e8dcc2">${pairs[i].id}: old (left) · new (right)</text></svg>`);
    return { input: await sharp({ create: { width: w, height: h + lab, channels: 3, background: '#0c0a08' } }).composite([{ input: label, top: 0, left: 0 }, { input: s, top: lab, left: 0 }]).png().toBuffer(), top: Math.floor(i / cols) * (h + lab + 6), left: (i % cols) * (w + 6) };
  }));
  const file = join(out, `floor-${floor}-${mode}.png`);
  await sharp({ create: { width: cols * (w + 6), height: rows * (h + lab + 6), channels: 3, background: '#000' } }).composite(tiles).png().toFile(file);
  if (mode === 'texel') {
    console.log(`floor ${floor}: ${pairs.length} new look${pairs.length === 1 ? '' : 's'} → ${file}`);
    for (const c of (await page.evaluate(() => (window as unknown as W).__game.lookContract())).filter(c => pairs.some(p => p.id === c.id)))
      console.log(`  ${c.id}: ${c.missing.length ? `MISSING ${c.missing.join(', ')}` : 'keeps every part'}; height ${c.oldH} → ${c.newH}`);
  }
  await page.close();
}
await browser.close();
