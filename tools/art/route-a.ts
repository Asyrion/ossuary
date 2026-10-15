/* Route A's frames for the R3 proof: tools/art/route-a.html draws a GLB in real time at the game pixel, the same
   camera, light and facings as tools/art/render_glb.py, and this writes them in render_glb.py's layout, so
   tools/art/pixelize.py reads either (with --smooth 0 for route A: a shader maps each pixel alone).
   Needs the dev server running (npm run dev; OSSUARY_URL points at another, PW_CHROMIUM at a Chromium).

     npx tsx tools/art/route-a.ts --glb assets/hero_default.glb --out <dir> --units 1.3
       [--canvas 96] [--margin 8] [--front -Y] [--pin mixamorig:Hips] [--rest standing_relax] [--clips run,standing_relax]
       [--range standing_relax:0-4] [--frames 8] [--facings S,E,N,W]
   (--range in seconds.) */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.OSSUARY_URL ?? 'http://localhost:5173/';
const argv = process.argv.slice(2),
  opt = (k: string, d = '') => {
    const i = argv.indexOf('--' + k);
    return i >= 0 ? argv[i + 1] : d;
  };
const out = opt('out'),
  frames = +opt('frames', '8'),
  facings = opt('facings', 'S,E,N,W').split(','),
  wanted = opt('clips').split(',').filter(Boolean),
  ranges = Object.fromEntries(
    opt('range')
      .split(',')
      .filter(Boolean)
      .map((r) => {
        const [k, v] = r.split(':');
        return [k, v.split('-').map(Number)];
      }),
  ) as Record<string, number[]>;
const params = new URLSearchParams({
  glb: opt('glb'),
  units: opt('units'),
  canvas: opt('canvas', '96'),
  front: opt('front', '-Y'),
  margin: opt('margin', '8'),
  pin: opt('pin'),
  rest: opt('rest'),
});
for (const k of ['pin', 'rest']) if (!params.get(k)) params.delete(k);

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('page:', m.text()));
await page.goto(`${BASE}tools/art/route-a.html?${params}`);
await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready, null, { timeout: 60_000 });
type RA = { clips: Record<string, number>; frame(f: string, c: string, t: number): { lit: string; flat: string } };
const clips = await page.evaluate(() => (window as unknown as { routeA: RA }).routeA.clips);
const info: { units: number; canvas: number; down: number; facings: string[]; clips: Record<string, object> } = {
  units: +opt('units'),
  canvas: +opt('canvas', '96'),
  down: 1,
  facings,
  clips: {},
};
const png = (url: string) => Buffer.from(url.split(',')[1], 'base64');
for (const facing of facings)
  for (const [name, dur] of Object.entries(clips)) {
    if (wanted.length && !wanted.some((w) => name.includes(w))) continue;
    const [t0, t1] = ranges[name] ?? [0, dur];
    const dir = join(out, facing, name);
    mkdirSync(dir, { recursive: true });
    for (let i = 0; i < frames; i++) {
      const t = t0 + ((t1 - t0) * i) / frames;
      const f = await page.evaluate(
        ([fa, n, t]) => (window as unknown as { routeA: RA }).routeA.frame(fa as string, n as string, t as number),
        [facing, name, t],
      );
      const stem = join(dir, `f${String(i).padStart(4, '0')}`);
      writeFileSync(stem + '.png', png(f.lit));
      writeFileSync(stem + '_flat.png', png(f.flat));
    }
    info.clips[name] = { frames, ms: Math.round((1000 * (t1 - t0)) / frames) };
    console.log('rendered', facing, name, frames);
  }
writeFileSync(join(out, 'clips.json'), JSON.stringify(info, null, 1));
await browser.close();
