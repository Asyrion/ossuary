/* A room of the game alone for the R3 proof: no HUD, no mage, no foes, at a fixed seed, plus where its floor tiles
   lie on screen (for measuring the walkable floor and standing sprites in it). Needs the dev server (npm run dev).

     npx tsx tools/art/room-shot.ts chapel_nave <out dir> [seed]

   Writes <out>/<template>.png (1280 x 720 at 2x) and <out>/<template>.json: the screen point of each floor tile's
   centre and corners, the room's bounds, and its template's tiles. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.OSSUARY_URL ?? 'http://localhost:5173/';
const [id = 'chapel_nave', out = 'asset-previews/r3-proof/room/code', seed = 'K3F9QX'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
type G = { draw(): void; hero: { info?: string } };
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
await page.addInitScript('window.__manual = true;');
await page.goto(`${BASE}?room=${id}&seed=${seed}&autolevel=skip`);
await page.waitForFunction(
  () => String((window as unknown as { __game?: G }).__game?.hero?.info ?? '').includes('rigged'),
  null,
  {
    timeout: 90_000,
  },
);
await page.click('#btnStart');
// (a string: tsx would wrap the named helper in one of its own, missing in the page)
const info = await page.evaluate<object>(`(() => {
  const g = window.__game;
  g.warp(1);
  g.clearRoom();
  g.player.x = g.current.cx;
  g.player.z = g.current.cz;
  g.sim(1, true);
  g.hero.root.visible = false;
  g.draw();
  const W = window.innerWidth, H = window.innerHeight, v = g.camera.position.clone();
  const at = (x, z) => {
    const p = v.set(x, 0, z).project(g.camera);
    return [((p.x + 1) / 2) * W * 2, ((1 - p.y) / 2) * H * 2];
  };
  const b = g.current.bounds;
  return { bounds: b, tiles: g.current.template.tiles, origin: at(b.minX, b.minZ), unitX: at(b.minX + 1, b.minZ),
    unitZ: at(b.minX, b.minZ + 1), centre: at(g.current.cx, g.current.cz) };
})()`);
await page.addStyleTag({
  content: 'body * { visibility: hidden !important; } canvas#game { visibility: visible !important; }',
});
await page.evaluate(() => (window as unknown as { __game: G }).__game.draw());
await page.screenshot({ path: join(out, `${id}.png`) });
writeFileSync(join(out, `${id}.json`), JSON.stringify(info, null, 1));
await browser.close();
console.log('wrote', join(out, `${id}.png`));
