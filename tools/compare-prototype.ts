/* Screenshot the same rooms in the port and in the playable 0.3 prototype, side by side.
   Needs the dev server running (npm run dev). Usage: npm run compare [-- outDir]
   Writes <room>-port.png and <room>-proto.png. The port plays each room as a test template (?room=),
   the prototype warps to the room in its hand-built floor. */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.OSSUARY_URL ?? 'http://localhost:5173/';
const outDir = process.argv[2] ?? 'test-results/compare';
/** name, port template, prototype grid cell */
const ROOMS: [string, string, number, number][] = [
  ['start', 'start', 0, 0], ['roomA', 'crypt_a', 0, -1], ['treasure', 'treasure_plain', -1, -1], ['boss', 'boss_warden', 1, -3],
];

type Hooks = { __manual: boolean; __game: { startGame(o?: object): void; warp(x: number, y?: number): void; sim(s: number, d?: boolean): void } };

async function shoot(page: Page, url: string, tag: 'port' | 'proto') {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { __game?: unknown }).__game, null, { timeout: 30000 });
  for (const [name, template, gx, gy] of ROOMS) {
    await page.evaluate(([port, template, gx, gy]) => {
      const w = window as unknown as Hooks; w.__manual = true;
      if (port) {
        const g = w.__game as Hooks['__game'] & { current: { cx: number; cz: number }; player: { x: number; z: number } };
        g.startGame({ testTemplate: template }); g.warp(template === 'start' ? 0 : 1);
        g.player.x = g.current.cx; g.player.z = g.current.cz + 2.9; // where the prototype's warp puts the hero
      }
      else { w.__game.startGame(); w.__game.warp(gx as number, gy as number); }
      w.__game.sim(3.2, true);
    }, [tag === 'port', template, gx, gy] as const);
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
