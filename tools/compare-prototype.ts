/* Screenshot the same rooms in the port and in the playable 0.3 prototype, side by side.
   Needs the dev server running (npm run dev). Usage: npm run compare [-- outDir]
   Writes <room>-port.png and <room>-proto.png. */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.OSSUARY_URL ?? 'http://localhost:5173/';
const outDir = process.argv[2] ?? 'test-results/compare';
const ROOMS: [string, number, number][] = [['start', 0, 0], ['roomA', 0, -1], ['treasure', -1, -1], ['boss', 1, -3]];

async function shoot(page: Page, url: string, tag: string) {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { __game?: unknown }).__game, null, { timeout: 30000 });
  for (const [name, gx, gy] of ROOMS) {
    await page.evaluate(([gx, gy]) => {
      const w = window as unknown as { __manual: boolean; __game: { startGame(): void; warp(x: number, y: number): void; sim(s: number, d?: boolean): void } };
      w.__manual = true; w.__game.startGame(); w.__game.warp(gx, gy); w.__game.sim(3.2, true);
    }, [gx, gy]);
    await page.screenshot({ path: join(outDir, `${name}-${tag}.png`) });
  }
}

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', m => { if (m.type() === 'error') console.log('console error:', m.text()); });
await shoot(page, BASE, 'port');
await shoot(page, new URL('prototype/ossuary-0.3-playable.html', BASE).href, 'proto');
await browser.close();
console.log('wrote', outDir);
