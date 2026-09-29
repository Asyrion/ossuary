/* Screenshot rooms for a look over them (the room inspector's tool, .claude/agents/room-inspector.md), check them
   for what a script can see, and put them on one contact sheet. Needs the dev server running (npm run dev).

   Usage: npm run inspect -- [--out dir] [--hd] [--against <git ref>] [seed:<code>] target...
     changed[:<range>]    what the diff touches (default range origin/main...HEAD, plus uncommitted changes): changed
                          templates and themes, every object if objects changed, a sample if walls or lights changed
     sample               one room of each shape, a carved one, and a room on floors 2 and 3
     a template id        crypt_a, octagon_crypt, ...        (played as a test room next to the start)
     theme:<id>           every template of that theme        (theme:ossuary)
     themes               the first template of every theme
     carved               every template that carves its outline with x
     props                every object put down in one room
     floor:<n>            the rooms of a generated floor n (1-3), one shot each
     <target>@<variant>   a template in a variant             (crypt_b@dark)
   --against <ref>        also shoot every room on <ref> (a worktree and a second server, started and stopped here),
                          compare each pair and write <name>-vs.png (before | after) for the rooms that changed
   seed:<code>            the run's seed (default K3F9QX, so rooms, their scatter and their doors are the same each time)
   Writes <name>.png per shot and sheet.png (labelled thumbnails, three across) into the output folder (default
   test-results/inspect). Prints what each room holds, what the checks found (console errors, the mage hidden, pools
   that read as pits, rooms too dark to read) and, last, the shots worth a look.

   npm run inspect -- crop <png> <x> <y> <w> <h>   a 2x enlargement of part of a shot, next to it (no new shot)

   OSSUARY_URL points at another server; PW_CHROMIUM at a Chromium binary (cloud sessions). */
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { TEMPLATE_DEFS } from '../src/world/templates';
import { THEME_DEFS } from '../src/world/themeData';
import { PROP_KINDS } from '../src/world/propData';

const args = process.argv.slice(2);

/* ---------- crop: a close look at part of a shot, no new shot ---------- */
if (args[0] === 'crop') {
  const [file, x, y, w, h] = [args[1], ...args.slice(2, 6).map(Number)];
  const out = file.replace(/\.png$/, `-crop-${x}-${y}.png`);
  await sharp(file).extract({ left: x, top: y, width: w, height: h }).resize(w * 2, h * 2, { kernel: 'lanczos3' }).toFile(out);
  console.log(`wrote ${out}`); process.exit(0);
}

const BASE = process.env.OSSUARY_URL ?? 'http://localhost:5173/';
const take2 = (flag: string) => { const at = args.indexOf(flag); return at >= 0 ? args.splice(at, 2)[1] : undefined; };
const outDir = take2('--out') ?? 'test-results/inspect', against = take2('--against');
const hd = args.includes('--hd'), seed = args.find(a => a.startsWith('seed:'))?.slice(5) ?? 'K3F9QX';
const targets = args.filter(a => a !== '--hd' && !a.startsWith('seed:'));
if (!targets.length) { console.log('usage: npm run inspect -- [--out dir] [--hd] [--against ref] changed | sample | crypt_a | theme:<id> | themes | carved | props | floor:<n> | <id>@<variant>'); process.exit(1); }

/** One shot: a URL query and what to do in the page before the picture. */
interface Shot { name: string; query: string; kind: 'room' | 'props' | 'floor' }
const shots: Shot[] = [], why: string[] = [];
const room = (id: string, variant = '', floor = 0): Shot => ({ name: id + (variant ? `@${variant}` : '') + (floor ? `-f${floor}` : ''), query: `?room=${id}${variant ? `&variant=${variant}` : ''}${floor ? `&floor=${floor}` : ''}`, kind: 'room' });
const firstOfTheme = (id: string) => TEMPLATE_DEFS.find(d => d.theme === id);
/** Is (c, r) outside the shape itself (an L's missing corner), rather than carved? */
const isOutsideShape = (shape: string, c: number, r: number) => shape === 'l_shape' && c >= 13 && r >= 7;
const carvedDefs = () => TEMPLATE_DEFS.filter(x => x.grid.some((row, r) => [...row].some((ch, c) => ch === 'x' && !isOutsideShape(x.shape, c, r))));
function sample(): Shot[] {
  const byShape = [...new Set(TEMPLATE_DEFS.map(d => d.shape))].map(s => TEMPLATE_DEFS.find(d => d.shape === s && d.types.includes('normal') && !d.theme)).filter(d => !!d);
  const plain = byShape[0]!.id;
  return [...byShape.map(d => room(d!.id)), room(carvedDefs()[0].id), room(plain, '', 2), room(plain, '', 3)];
}

/** What the diff touches, as targets (and why each one). */
function changed(range: string): Shot[] {
  const sh = (cmd: string) => execSync(cmd, { encoding: 'utf8' }).trim();
  const baseRef = range.includes('...') ? sh(`git merge-base ${range.split('...')[0]} ${range.split('...')[1] || 'HEAD'}`) : range.split('..')[0];
  const files = new Set([...sh(`git diff --name-only ${range}`).split('\n'), ...sh('git diff --name-only HEAD').split('\n')].filter(Boolean));
  const out: Shot[] = [], has = (re: RegExp) => [...files].some(f => re.test(f));
  const old = (file: string) => { try { return JSON.parse(sh(`git show ${baseRef}:${file}`)) as { id: string }[]; } catch { return []; } };
  for (const f of [...files].filter(f => /^data\/templates\/.*\.json$/.test(f) && existsSync(f))) {
    const before = new Map(old(f).map(t => [t.id, JSON.stringify(t)]));
    for (const t of JSON.parse(readFileSync(f, 'utf8')) as { id: string; types: string[] }[]) {
      if (before.get(t.id) === JSON.stringify(t)) continue;
      out.push(room(t.id)); why.push(`${t.id}: template ${before.has(t.id) ? 'changed' : 'new'}`);
    }
  }
  if (files.has('data/themes.json')) {
    const before = new Map(old('data/themes.json').map(t => [t.id, JSON.stringify(t)]));
    for (const t of THEME_DEFS) if (before.get(t.id) !== JSON.stringify(t)) { const d = firstOfTheme(t.id); if (d) { out.push(room(d.id)); why.push(`${d.id}: theme ${t.id} changed`); } }
  }
  if (has(/^src\/world\/(props|mechanisms|propData)\.ts$/)) { out.push({ name: 'props', query: '?room=treasure_plain', kind: 'props' }); why.push('props: objects changed'); }
  if (has(/^src\/world\/(themes|themeData)\.ts$/)) for (const t of THEME_DEFS) { const d = firstOfTheme(t.id); if (d) { out.push(room(d.id)); why.push(`${d.id}: theme code changed`); } }
  if (has(/^src\/world\/pools\.ts$/)) for (const d of TEMPLATE_DEFS.filter(x => x.grid.some(r => /[~%]/.test(r))).slice(0, 4)) { out.push(room(d.id)); why.push(`${d.id}: water and oil changed`); }
  if (has(/^src\/world\/(walls|rooms|dressing|shapes|dims)\.ts$|^src\/render\/|^data\/floors\.json$/)) for (const s of sample()) { out.push(s); why.push(`${s.name}: walls, looks or lights changed`); }
  const special: Record<string, string> = { vault: 'vault_urns', secret: 'secret_cell', shrine: 'shrine_henge', pages: 'library_plain', merchant: 'merchant_plain' };
  for (const [file, id] of Object.entries(special)) if (has(new RegExp(`/${file}\\.ts$`)) && TEMPLATE_DEFS.some(d => d.id === id)) { out.push(room(id)); why.push(`${id}: ${file}.ts changed`); }
  return out;
}
for (const t of targets) {
  const [what, variant = ''] = t.split('@');
  if (what === 'changed' || what.startsWith('changed:')) shots.push(...changed(what.slice(8) || 'origin/main...HEAD'));
  else if (what === 'sample') shots.push(...sample());
  else if (what === 'themes') for (const th of THEME_DEFS) { const d = firstOfTheme(th.id); if (d) shots.push(room(d.id, variant)); }
  else if (what.startsWith('theme:')) for (const d of TEMPLATE_DEFS.filter(x => x.theme === what.slice(6))) shots.push(room(d.id, variant));
  else if (what === 'carved') for (const d of carvedDefs()) shots.push(room(d.id, variant));
  else if (what === 'props') shots.push({ name: 'props', query: '?room=treasure_plain', kind: 'props' });
  else if (what.startsWith('floor:')) shots.push({ name: `floor${what.slice(6)}`, query: `?floor=${what.slice(6)}`, kind: 'floor' });
  else if (TEMPLATE_DEFS.some(d => d.id === what)) shots.push(room(what, variant));
  else console.log(`unknown target "${t}"`);
}
const unique = [...new Map(shots.map(s => [s.name, s])).values()];
if (why.length) console.log(`from the diff:\n  ${[...new Set(why)].join('\n  ')}`);
if (!unique.length) { console.log('nothing to shoot: the diff changes nothing that shows in a room'); process.exit(0); }

/* ---------- shooting ---------- */

type V3 = { set(x: number, y: number, z: number): V3; project(c: unknown): V3; x: number; y: number };
type Hooks = { __manual: boolean; __game: Record<string, unknown> & {
  warp(id: number): void; clearRoom(): void; sim(s: number, draw?: boolean): void; draw(): void; prop(kind: string, x: number, z: number): boolean; rooms(): { plan: { id: number } }[];
  current: { cx: number; cz: number; bounds: { minX: number; minZ: number }; walls: unknown[]; torches: unknown[]; props?: unknown[]; theme?: { id: string }; plan: { variant?: string; doors: { shift?: number }[] }; template: { tiles: string[][] } };
  player: { x: number; z: number; invuln: number }; camera: { position: { clone(): V3 } }; hero: { root: { visible: boolean } };
  pools: { kind: string; state: string; tiles: { x: number; z: number }[] }[];
} };
/** Where things are on screen, for the checks: the mage, the pools' tiles, floor and pit tiles. */
interface Probe { info: Record<string, unknown>; mage: [number, number][]; pools: { kind: string; state: string; at: [number, number][] }[]; floor: [number, number][]; pits: [number, number][]; dark: boolean }

/** Set the room up for its picture and say where things are (no named functions in here: tsx would wrap them in a
    helper the page doesn't have). */
const setUp = ([kind, kinds, warpTo]: readonly [string, readonly string[], number | null]) => {
  const w = window as unknown as Hooks & { __reseed(): void }, g = w.__game; w.__manual = true;
  w.__reseed(); // the same randomness from here on, on both sides of a comparison (sparks, stains, what a cleared room drops)
  g.warp(warpTo ?? 1);
  g.clearRoom(); g.player.invuln = 99;
  if (kind === 'props') kinds.forEach((k, i) => g.prop(k, g.current.bounds.minX + .5 + (i % 7) * 2, g.current.bounds.minZ + 1.5 + Math.floor(i / 7) * 2));
  // the mage on the open floor tile nearest a little south of the middle (an L's middle can be outside it)
  let best = { x: g.current.cx, z: g.current.cz + 1.5 }, bd = 1e9;
  const tiles = g.current.template.tiles, b = g.current.bounds, floor: { x: number; z: number }[] = [], pits: { x: number; z: number }[] = [];
  tiles.forEach((row, r) => row.forEach((k, c) => {
    const x = b.minX + c + .5, z = b.minZ + r + .5, d = Math.hypot(x - g.current.cx, z - g.current.cz - 1.5);
    if (k === 'floor') { floor.push({ x, z }); if (d < bd) { bd = d; best = { x, z }; } }
    if (k === 'pit') pits.push({ x, z });
  }));
  g.player.x = best.x; g.player.z = best.z; g.sim(1); g.player.invuln = 0; g.sim(.02, true); // (invulnerable, the mage blinks)
  // every point to find on screen, projected in one pass: the mage's feet and head, pool tiles, floor and pit tiles
  const v = g.camera.position.clone(), W = window.innerWidth, H = window.innerHeight, pools = g.pools;
  const pts: [string, number, number, number][] = [['mage', g.player.x, .2, g.player.z], ['mage', g.player.x, 1.2, g.player.z]];
  pools.forEach((p, i) => p.tiles.forEach(t => pts.push(['pool' + i, t.x, .01, t.z])));
  floor.forEach((t, i) => { if (i % 3 === 0) pts.push(['floor', t.x, .01, t.z]); });
  pits.forEach(t => pts.push(['pit', t.x, .01, t.z]));
  const at = pts.map(([tag, x, y, z]) => { v.set(x, y, z).project(g.camera); return [tag, Math.round((v.x + 1) / 2 * W), Math.round((1 - v.y) / 2 * H)] as [string, number, number]; });
  const by: Record<string, [number, number][]> = {};
  for (const a of at) (by[a[0]] ??= []).push([a[1], a[2]]);
  return {
    info: { walls: g.current.walls.length, torches: g.current.torches.length, props: g.current.props?.length ?? 0, theme: g.current.theme?.id ?? '', shifted: g.current.plan.doors.filter(d => d.shift).length },
    mage: by.mage ?? [], pools: pools.map((p, i) => ({ kind: p.kind, state: p.state, at: by['pool' + i] ?? [] })), floor: by.floor ?? [], pits: by.pit ?? [],
    dark: g.current.plan.variant === 'dark',
  } as unknown;
};

/** Mean luminance (0-255) of a 5x5 patch round each point, over all points. */
function lum(raw: Buffer, W: number, H: number, pts: [number, number][], hdScale: number) {
  let sum = 0, n = 0;
  for (const [x0, y0] of pts) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const x = Math.round(x0 * hdScale) + dx, y = Math.round(y0 * hdScale) + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const i = (y * W + x) * 3; sum += .2126 * raw[i] + .7152 * raw[i + 1] + .0722 * raw[i + 2]; n++;
  }
  return n ? sum / n : NaN;
}

/** What a script can see wrong in a shot. */
async function check(file: string, p: Probe, hidden: Buffer | null) {
  const flags: string[] = [], s = hd ? 2 : 1;
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true }), W = info.width, H = info.height;
  const floorLum = lum(data, W, H, p.floor, s), pitLum = p.pits.length ? lum(data, W, H, p.pits, s) : 4;
  for (const pool of p.pools) {
    if (pool.state === 'burning') continue;
    const l = lum(data, W, H, pool.at, s);
    if (l < Math.max(pitLum * 1.6, floorLum * .3)) flags.push(`${pool.kind} reads like a pit (brightness ${l.toFixed(0)} against floor ${floorLum.toFixed(0)}, pits ${pitLum.toFixed(0)})`);
  }
  if (!p.dark && floorLum < 22) flags.push(`too dark to read (floor brightness ${floorLum.toFixed(0)})`);
  if (hidden) { // the mage: how much of the picture round them changes when they are hidden
    const [[x0, y0], [x1, y1]] = p.mage, left = Math.max(0, Math.round((Math.min(x0, x1) - 14) * s)), top = Math.max(0, Math.round((Math.min(y0, y1) - 6) * s));
    const w = Math.min(W - left, Math.round(28 * s)), h = Math.min(H - top, Math.round((Math.abs(y1 - y0) + 12) * s));
    const a = await sharp(file).removeAlpha().extract({ left, top, width: w, height: h }).raw().toBuffer();
    const b = await sharp(hidden).removeAlpha().extract({ left, top, width: w, height: h }).raw().toBuffer();
    let diff = 0; for (let i = 0; i < a.length; i += 3) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 40) diff++;
    if (diff / (a.length / 3) < .15) flags.push(`the mage is hidden (${Math.round(diff / (a.length / 3) * 100)}% of them shows)`);
  }
  return flags;
}

interface Result { shot: Shot; file: string; info: Record<string, unknown>; flags: string[]; diff?: number }

async function shoot(url: string, dir: string, list: Shot[], withChecks: boolean) {
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: hd ? 2 : 1 });
  // Math.random from a seed that each room's set-up starts again (a string: tsx would wrap a function in a helper)
  await page.addInitScript(`(() => { let s = 1; const next = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; Math.random = next; window.__reseed = () => { s = 1; }; window.__manual = true; })();`); // (and no frames drawn in real time: the tool steps the game)
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  const results: Result[] = [];
  const one = async (s: Shot, name: string, warpTo: number | null) => {
    const probe = await page.evaluate(setUp, [s.kind, PROP_KINDS, warpTo] as const) as Probe;
    const file = join(dir, `${name}.png`); await page.screenshot({ path: file });
    let hidden: Buffer | null = null;
    if (withChecks) { await page.evaluate(() => { const g = (window as unknown as Hooks).__game; g.hero.root.visible = false; g.draw(); }); hidden = await page.screenshot(); }
    const flags = withChecks ? await check(file, probe, hidden) : [];
    if (errors.length) flags.push(`console errors: ${errors.splice(0).join(' | ')}`);
    results.push({ shot: { ...s, name }, file, info: probe.info, flags });
  };
  for (const s of list) {
    await page.goto(new URL(`${s.query}&seed=${seed}`, url).href);
    await page.waitForFunction(() => !!(window as unknown as Hooks).__game, null, { timeout: 90000 }); // (a fresh server optimises its dependencies first)
    await page.waitForFunction(() => String(((window as unknown as Hooks).__game.hero as unknown as { info?: string }).info ?? '').includes('rigged'), null, { timeout: 60000 }); // the hero model loaded
    await page.addStyleTag({ content: '#banner, #lore { display: none !important; }' }); // the floor's title and lore cards would cover the room
    await page.click('#btnStart');
    if (s.kind === 'floor') {
      const ids = await page.evaluate(() => (window as unknown as Hooks).__game.rooms().map(r => r.plan.id));
      for (const id of ids) await one(s, `${s.name}-room${id}`, id);
    } else await one(s, s.name, null);
  }
  await browser.close();
  return results;
}

/** A second server on <ref>: a worktree of it beside this one, sharing node_modules. */
async function baseServer(ref: string) {
  const dir = mkdtempSync(join(tmpdir(), 'ossuary-base-')), port = 5299;
  execSync(`git worktree add -f --detach ${dir} ${ref}`, { stdio: 'ignore' });
  symlinkSync(resolve('node_modules'), join(dir, 'node_modules'));
  // its node_modules lie outside it (a link to ours), which Vite won't serve unless told to
  // (and its own dependency cache: sharing ours with the running dev server makes both re-optimise)
  writeFileSync(join(dir, 'vite.base.tmp.ts'), `import cfg from './vite.config';\nexport default (env: any) => { const c: any = typeof cfg === 'function' ? (cfg as any)(env) : cfg; return { ...c, cacheDir: '.vite-base', server: { ...(c.server ?? {}), fs: { strict: false } } }; };\n`);
  const vite = spawn('npx', ['vite', '--port', String(port), '--strictPort', '--config', 'vite.base.tmp.ts'], { cwd: dir, stdio: 'ignore', detached: true });
  let stopped = false;
  const stop = () => {
    if (stopped) return; stopped = true;
    try { process.kill(-vite.pid!); } catch { /* gone already */ }
    try { execSync(`git worktree remove --force ${dir}`, { stdio: 'ignore' }); } catch { /* removed already */ }
  };
  process.on('exit', stop); for (const sig of ['SIGINT', 'SIGTERM', 'SIGPIPE'] as const) process.on(sig, () => { stop(); process.exit(1); });
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 90 && vite.exitCode === null; i++) { try { if ((await fetch(url)).ok) break; } catch { /* not up yet */ } await new Promise(r => setTimeout(r, 1000)); }
  if (vite.exitCode !== null) { stop(); throw new Error(`the ${ref} server didn't start (is port ${port} taken?)`); }
  return { url, stop };
}

/** How much of a picture changed between two shots, and a before | after image when it did. It counts blocks of
    16 × 16 pixels in which a good part changed clearly, so a small object that changed shows, and a mote or a spark
    (a few pixels) doesn't. Returns the share of blocks changed. */
async function compare(before: string, after: string, out: string) {
  const a = await sharp(before).removeAlpha().raw().toBuffer({ resolveWithObject: true }), b = await sharp(after).removeAlpha().raw().toBuffer();
  const W = a.info.width, H = a.info.height, B = 16 * (hd ? 2 : 1), bw = Math.ceil(W / B), counts = new Uint16Array(bw * Math.ceil(H / B));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    if (Math.abs(a.data[i] - b[i]) + Math.abs(a.data[i + 1] - b[i + 1]) + Math.abs(a.data[i + 2] - b[i + 2]) > 48) counts[Math.floor(y / B) * bw + Math.floor(x / B)]++;
  }
  const hit: number[] = []; counts.forEach((c, k) => { if (c > B * B * .3) hit.push(k); });
  const share = hit.length / counts.length;
  if (hit.length) { // base | now, half size each, labelled, with the changed blocks outlined on the right
    const TW = 640, TH = 360, k = TW / W, half = (f: string) => sharp(f).resize(TW, TH).toBuffer();
    const rects = hit.map(i => `<rect x="${(i % bw) * B * k}" y="${Math.floor(i / bw) * B * k}" width="${B * k}" height="${B * k}" fill="none" stroke="#ff3030" stroke-width="1"/>`).join('');
    const marks = Buffer.from(`<svg width="${TW}" height="${TH}">${rects}<rect width="96" height="20" fill="#000" opacity=".7"/><text x="6" y="15" font-family="sans-serif" font-size="13" fill="#fff">now</text></svg>`);
    const tag = Buffer.from(`<svg width="${TW}" height="20"><rect width="160" height="20" fill="#000" opacity=".7"/><text x="6" y="15" font-family="sans-serif" font-size="13" fill="#fff">base ${against}</text></svg>`);
    await sharp({ create: { width: TW * 2, height: TH, channels: 3, background: '#000' } })
      .composite([{ input: await half(before), left: 0, top: 0 }, { input: tag, left: 0, top: 0 }, { input: await half(after), left: TW, top: 0 }, { input: marks, left: TW, top: 0 }]).png().toFile(out);
  }
  return share;
}
const NOISE = 0; // (a changed block is a change: motes and sparks are too small to fill one)

mkdirSync(outDir, { recursive: true });
const results = await shoot(BASE, outDir, unique, true);
if (against) {
  console.log(`shooting the same rooms on ${against}...`);
  const server = await baseServer(against);
  try {
    const before = await shoot(server.url, join(outDir, 'base'), unique, false);
    for (const r of results) {
      const b = before.find(x => x.shot.name === r.shot.name);
      r.diff = b ? await compare(b.file, r.file, r.file.replace(/\.png$/, '-vs.png')) : 1;
    }
  } finally { server.stop(); }
}

// the contact sheet: labelled thumbnails, three across
const TW = 426, TH = 240, cols = Math.min(3, results.length), rows = Math.ceil(results.length / cols);
const label = (t: string) => Buffer.from(`<svg width="${TW}" height="22"><rect width="100%" height="100%" fill="#000" opacity=".7"/><text x="6" y="16" font-family="sans-serif" font-size="14" fill="#fff">${t.replace(/[<&]/g, '')}</text></svg>`);
const tiles = (await Promise.all(results.map(async (r, i) => {
  const left = (i % cols) * TW, top = Math.floor(i / cols) * TH, mark = r.flags.length ? '  [!]' : r.diff !== undefined && r.diff > NOISE ? '  [changed]' : '';
  return [{ input: await sharp(r.file).resize(TW, TH).toBuffer(), left, top }, { input: label(r.shot.name + mark), left, top }];
}))).flat();
await sharp({ create: { width: cols * TW, height: rows * TH, channels: 3, background: '#000' } }).composite(tiles).png().toFile(join(outDir, 'sheet.png'));

for (const r of results) {
  const d = r.diff === undefined ? '' : r.diff > NOISE ? `  changed (${(r.diff * 100).toFixed(1)}% of the picture)` : '  unchanged';
  console.log(`${r.shot.name}: ${JSON.stringify(r.info)}${d}${r.flags.map(f => `\n  ⚑ ${f}`).join('')}`);
}
const look = results.filter(r => r.flags.length || (r.diff !== undefined && r.diff > NOISE)).map(r => basename(r.file, '.png') + (r.diff !== undefined && r.diff > NOISE ? ' (-vs.png)' : ''));
console.log(`wrote ${results.length} shots and sheet.png to ${outDir}${against ? ` (and the ${against} shots in base/)` : ''}`);
console.log(look.length ? `worth a look: ${look.join(', ')}` : 'nothing flagged' + (against ? ' and nothing changed' : ''));
if (existsSync(join(outDir, 'base')) && !against) { /* (a base/ folder from an earlier run is left alone) */ }
