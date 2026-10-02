/* M4.12 (docs/M4.12-plan.md): contact sheets of the foes' old and new looks side by side, for the owner's review. For each
   floor asked, a great hall with the floor's pairs (the old look left, the new right) shot twice: in the game's pixel look
   at play distance, and close up with the pixel look off; and the contract each new look keeps (its old look's moving
   parts, about its height), printed. Needs the dev server running (npm run dev).

   Usage: npm run foe-sheet -- [floor=1,2] [out=asset-previews/foes]
   OSSUARY_URL points at another server; PW_CHROMIUM at a Chromium binary (cloud sessions). */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.OSSUARY_URL ?? 'http://localhost:5173/';
const args = process.argv.slice(2), opt = (k: string) => args.find(a => a.startsWith(k + '='))?.slice(k.length + 1);
const floors = (opt('floor') ?? '1,2,3,4,5,0').split(',').map(Number), out = opt('out') ?? 'asset-previews/foes';
mkdirSync(out, { recursive: true });

type W = { __manual: boolean; __game: { player: { invuln: number }; sim(s: number, draw?: boolean): void; lookPairs(f?: number): unknown[]; lookContract(): { id: string; missing: string[]; oldH: number; newH: number }[] } };
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
for (const [mode, scale] of [['texel', 1], ['off', 2]] as const) {
  for (const floor of floors) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: scale });
    await page.addInitScript('window.__manual = true');
    await page.goto(`${BASE}?seed=SHEET&room=great_hall&autolevel=skip&looks=new&pixel=${mode}`);
    await page.waitForFunction(() => !!(window as unknown as W).__game, null, { timeout: 60_000 });
    await page.click('#btnStart');
    const n = await page.evaluate(f => { const g = (window as unknown as W).__game; g.player.invuln = 999; g.sim(1); const n = g.lookPairs(f).length; g.sim(.5, true); return n; }, floor);
    if (n) await page.screenshot({ path: join(out, `floor-${floor}-${mode}.png`) });
    if (mode === 'texel') console.log(`floor ${floor}: ${n} new look${n === 1 ? '' : 's'}${n ? ` → ${join(out, `floor-${floor}-*.png`)}` : ''}`);
    if (mode === 'texel' && floor === floors[0]) for (const c of await page.evaluate(() => (window as unknown as W).__game.lookContract()))
      console.log(`  ${c.id}: ${c.missing.length ? `MISSING ${c.missing.join(', ')}` : 'keeps every part'}; height ${c.oldH} → ${c.newH}`);
    await page.close();
  }
}
await browser.close();
