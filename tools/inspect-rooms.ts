/* Screenshot rooms for a look over them (the room inspector's tool, .claude/agents/room-inspector.md), and put them
   on one contact sheet. Needs the dev server running (npm run dev).

   Usage: npm run inspect -- [--out dir] [--hd] target...
     a template id        crypt_a, octagon_crypt, ...        (played as a test room next to the start)
     theme:<id>           every template of that theme        (theme:ossuary)
     themes               the first template of every theme
     carved               every template that carves its outline with x
     props                every object put down in one room
     floor:<n>            the rooms of a generated floor n (1-3), one shot each (add seed:<code> to fix it)
     <target>@<variant>   a template in a variant             (crypt_b@dark)
   Writes <name>.png per shot and sheet.png into the output folder (default test-results/inspect), and prints what
   each room holds (walls, objects, torches, doors off the middle) and any console errors.
   OSSUARY_URL points at another server; PW_CHROMIUM at a Chromium binary (cloud sessions). */
import { chromium, type Page } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { TEMPLATE_DEFS } from '../src/world/templates';
import { THEME_DEFS } from '../src/world/themeData';
import { PROP_KINDS } from '../src/world/propData';

const BASE = process.env.OSSUARY_URL ?? 'http://localhost:5173/';
const args = process.argv.slice(2);
const outAt = args.indexOf('--out'), outDir = outAt >= 0 ? args.splice(outAt, 2)[1] : 'test-results/inspect';
const hd = args.includes('--hd'), seedArg = args.find(a => a.startsWith('seed:'))?.slice(5);
const targets = args.filter(a => a !== '--hd' && !a.startsWith('seed:'));
if (!targets.length) { console.log('usage: npm run inspect -- [--out dir] [--hd] crypt_a | theme:<id> | themes | carved | props | floor:<n> | <id>@<variant>'); process.exit(1); }

/** One shot: a URL query and what to do in the page before the picture. */
interface Shot { name: string; query: string; kind: 'room' | 'props' | 'floor'; floor?: number }
const shots: Shot[] = [];
for (const t of targets) {
  const [what, variant] = t.split('@'), v = variant ? `&variant=${variant}` : '';
  if (what === 'themes') for (const th of THEME_DEFS) { const d = TEMPLATE_DEFS.find(x => x.theme === th.id); if (d) shots.push({ name: d.id, query: `?room=${d.id}${v}`, kind: 'room' }); }
  else if (what.startsWith('theme:')) for (const d of TEMPLATE_DEFS.filter(x => x.theme === what.slice(6))) shots.push({ name: d.id, query: `?room=${d.id}${v}`, kind: 'room' });
  else if (what === 'carved') for (const d of TEMPLATE_DEFS.filter(x => x.grid.some((row, r) => [...row].some((ch, c) => ch === 'x' && !isOutsideShape(x.shape, c, r))))) shots.push({ name: d.id, query: `?room=${d.id}`, kind: 'room' });
  else if (what === 'props') shots.push({ name: 'props', query: '?room=treasure_plain', kind: 'props' });
  else if (what.startsWith('floor:')) shots.push({ name: `floor${what.slice(6)}`, query: `?floor=${what.slice(6)}${seedArg ? `&seed=${seedArg}` : ''}`, kind: 'floor', floor: +what.slice(6) });
  else if (TEMPLATE_DEFS.some(d => d.id === what)) shots.push({ name: variant ? `${what}@${variant}` : what, query: `?room=${what}${v}`, kind: 'room' });
  else console.log(`unknown target "${t}"`);
}
/** Is (c, r) outside the shape itself (an L's missing corner), rather than carved? */
function isOutsideShape(shape: string, c: number, r: number) { return shape === 'l_shape' && c >= 13 && r >= 7; }

type Hooks = { __manual: boolean; __game: Record<string, unknown> & {
  warp(id: number): void; clearRoom(): void; sim(s: number, draw?: boolean): void; prop(kind: string, x: number, z: number): boolean; rooms(): { plan: { id: number } }[];
  current: { cx: number; cz: number; bounds: { minX: number; minZ: number }; walls: unknown[]; torches: unknown[]; props?: unknown[]; theme?: { id: string }; plan: { doors: { shift?: number }[] }; template: { tiles: string[][] } };
  player: { x: number; z: number; invuln: number };
} };

async function take(page: Page, s: Shot, errors: string[]) {
  const files: string[] = [];
  await page.goto(new URL(s.query, BASE).href);
  await page.waitForFunction(() => !!(window as unknown as Hooks).__game, null, { timeout: 30000 });
  await page.click('#btnStart');
  const rooms = await page.evaluate(([kind, kinds]) => {
    const w = window as unknown as Hooks, g = w.__game; w.__manual = true;
    // (no named functions in here: tsx would wrap them in a helper the page doesn't have)
    if (kind === 'floor') return g.rooms().map(r => r.plan.id);
    g.warp(1); g.clearRoom(); g.player.invuln = 99;
    if (kind === 'props') (kinds as string[]).forEach((k, i) => g.prop(k, g.current.bounds.minX + .5 + (i % 7) * 2, g.current.bounds.minZ + 1.5 + Math.floor(i / 7) * 2));
    // the mage on the open floor tile nearest a little south of the middle (an L's middle can be outside it)
    let best = { x: g.current.cx, z: g.current.cz + 1.5 }, bd = 1e9;
    g.current.template.tiles.forEach((row, r) => row.forEach((k, c) => {
      const x = g.current.bounds.minX + c + .5, z = g.current.bounds.minZ + r + .5, d = Math.hypot(x - g.current.cx, z - g.current.cz - 1.5);
      if (k === 'floor' && d < bd) { bd = d; best = { x, z }; }
    }));
    g.player.x = best.x; g.player.z = best.z; g.sim(1); g.player.invuln = 0; g.sim(.02, true); // (invulnerable, the mage blinks)
    return [{ walls: g.current.walls.length, torches: g.current.torches.length, props: g.current.props?.length ?? 0, theme: g.current.theme?.id ?? '', shifted: g.current.plan.doors.filter(d => d.shift).length }];
  }, [s.kind, PROP_KINDS] as const);
  if (s.kind === 'floor') {
    for (const id of rooms as number[]) {
      const info = await page.evaluate(id => {
        const g = (window as unknown as Hooks).__game; g.warp(id); g.clearRoom(); g.player.invuln = 99;
        let best = { x: g.current.cx, z: g.current.cz + 1.5 }, bd = 1e9;
        g.current.template.tiles.forEach((row, r) => row.forEach((k, c) => {
          const x = g.current.bounds.minX + c + .5, z = g.current.bounds.minZ + r + .5, d = Math.hypot(x - g.current.cx, z - g.current.cz - 1.5);
          if (k === 'floor' && d < bd) { bd = d; best = { x, z }; }
        }));
        g.player.x = best.x; g.player.z = best.z; g.sim(1); g.player.invuln = 0; g.sim(.02, true);
        return { walls: g.current.walls.length, torches: g.current.torches.length, props: g.current.props?.length ?? 0, theme: g.current.theme?.id ?? '', shifted: g.current.plan.doors.filter(d => d.shift).length };
      }, id);
      const f = join(outDir, `${s.name}-room${id}.png`); await page.screenshot({ path: f }); files.push(f);
      console.log(`${s.name} room ${id}:`, JSON.stringify(info));
    }
  } else {
    const f = join(outDir, `${s.name}.png`); await page.screenshot({ path: f }); files.push(f);
    console.log(`${s.name}:`, JSON.stringify(rooms[0]));
  }
  if (errors.length) { console.log(`  console errors in ${s.name}:`, errors.splice(0)); }
  return files;
}

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: hd ? 2 : 1 });
const errors: string[] = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
const files: string[] = [];
for (const s of shots) files.push(...await take(page, s, errors));
await browser.close();
// a contact sheet: two across, half size, in the order taken
if (files.length) {
  const W = 640, H = 360, cols = Math.min(2, files.length), rows = Math.ceil(files.length / cols);
  const tiles = await Promise.all(files.map(async (f, i) => ({ input: await sharp(f).resize(W, H).toBuffer(), left: (i % cols) * W, top: Math.floor(i / cols) * H })));
  await sharp({ create: { width: cols * W, height: rows * H, channels: 3, background: '#000' } }).composite(tiles).png().toFile(join(outDir, 'sheet.png'));
}
console.log(`wrote ${files.length} shots and sheet.png to ${outDir}`);
