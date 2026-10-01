/* The balance bot (M4.9 step 1, docs/M4.9-plan.md): every foe on its floor fought alone by a walking, shooting bot, with
   the cantrip only and with each school's two spells, on a few seeds; how long it took and the hearts it cost, written to
   docs/balance.md. Flags a foe that takes more than twice its floor's median to put down, and a school whose median on a
   floor is more than twice the floor's. Needs the dev server running (npm run dev). Not in CI: it takes a while.

   Usage: npm run balance -- [floor=3] [foe=hydra,rimeWolf] [school=frost|cantrip,...] [seeds=2] [limit=40] [--print]
     floor, foe and school narrow the run (a narrowed run prints its table and leaves docs/balance.md alone unless
     --write is given); seeds is how many seeds each pairing is fought on; limit the seconds a fight may last.

   OSSUARY_URL points at another server; PW_CHROMIUM at a Chromium binary (cloud sessions). */
import { chromium, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { FOES as FOE_DEFS } from '../src/actors/foeData';

const FOES = FOE_DEFS as Record<string, { floor: number }>;
const BASE = process.env.OSSUARY_URL ?? 'http://localhost:5173/';
const args = process.argv.slice(2);
const opt = (k: string) => args.find(a => a.startsWith(k + '='))?.slice(k.length + 1);

/** Each build: the spells in its two slots (the cantrip is always there). */
export const BUILDS: Record<string, string[]> = {
  cantrip: [], ember: ['cinder_lance', 'pyre_seal'], frost: ['rime_shards', 'glacial_wall'], storm: ['arc', 'static_mantle'],
  hallow: ['judgement', 'consecrate'], umbral: ['hex_bolt', 'grasp_of_the_grave'],
};
/** Foes that never come alone (a nest's wasps, a rubble golem's stones) or have no floor of their own (the Wardlings). */
const SKIP = new Set(['emberWasp', 'rubbleStone']);

const floors = opt('floor')?.split(',').map(Number), only = opt('foe')?.split(','), schools = (opt('school')?.split(',') ?? Object.keys(BUILDS));
const seeds = Number(opt('seeds') ?? 2), limit = Number(opt('limit') ?? 40), narrowed = !!(floors || only || opt('school'));
const ids = Object.keys(FOES).filter(id => FOES[id].floor >= 1 && !SKIP.has(id) && (!floors || floors.includes(FOES[id].floor)) && (!only || only.includes(id)));

/** The bot, put into the page: it lines up with the nearest foe and casts at it (backing off when close), and casts its
    spells at it whenever they are ready. Returns the seconds the fight took (`limit` if it never ended) and the half
    hearts it cost; the mage is healed when low, so a hard foe shows as hearts lost rather than as a death. */
function installBot() {
  type G = { keys: Set<string>; arrowOrder: string[]; player: { x: number; z: number; hp: number; maxHp: number }; enemies: { x: number; z: number; dead?: boolean; type: string; spawn: number }[];
    sim(s: number): void; cast(slot: number, dir?: { x: number; z: number }): boolean; state: string; player_spells?: unknown };
  const w = window as unknown as { __game: G; __bot(limit: number, spells: number): { t: number; lost: number } };
  const g = w.__game;
  const hold = (codes: string[]) => {
    for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) g.keys.delete(k);
    for (const c of codes) g.keys.add(c);
    g.arrowOrder.length = 0; const a = codes.find(c => c.startsWith('Arrow')); if (a) g.arrowOrder.push(a);
  };
  w.__bot = (lim: number, spells: number) => {
    let t = 0, lost = 0;
    for (; t < lim && g.enemies.some(e => !e.dead && e.type !== 'dummy'); t += .05) {
      const p = g.player, before = p.hp;
      const e = g.enemies.filter(f => !f.dead).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz), codes: string[] = [];
      if (d < 1.4) {
        codes.push(dx > 0 ? 'KeyA' : 'KeyD', dz > 0 ? 'KeyW' : 'KeyS');
        codes.push(Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? 'ArrowLeft' : 'ArrowRight') : (dz < 0 ? 'ArrowUp' : 'ArrowDown'));
      } else if (Math.abs(dx) <= Math.abs(dz)) {
        if (dx > .2) codes.push('KeyD'); else if (dx < -.2) codes.push('KeyA');
        codes.push(dz < 0 ? 'ArrowUp' : 'ArrowDown');
      } else {
        if (dz > .2) codes.push('KeyS'); else if (dz < -.2) codes.push('KeyW');
        codes.push(dx < 0 ? 'ArrowLeft' : 'ArrowRight');
      }
      hold(codes);
      if (e.spawn <= 0 && d < 7) for (let s = 0; s < spells; s++) g.cast(s, { x: dx / (d || 1), z: dz / (d || 1) });
      g.sim(.05);
      if (p.hp < before) lost += before - p.hp;
      if (p.hp <= 2) p.hp = p.maxHp;
      if (g.state !== 'play') break;
    }
    hold([]); return { t: +t.toFixed(1), lost };
  };
}

interface Row { id: string; floor: number; build: string; t: number[]; lost: number[] }

/** One page, one build, one seed: start a run in a great hall on the foe's floor with the build's spells, then fight each
    foe in turn, a fresh run each time (so nothing one fight left lies on the floor of the next). */
async function fight(page: Page, id: string, build: string, seed: number) {
  return page.evaluate(({ id, spells, seed, floor, limit }) => {
    type G = { startGame(o: object): void; warp(id: number): void; sim(s: number): void; clearRoom(): void; spawn(kind: string, x: number, z: number): unknown; player: { x: number; z: number; hp: number; maxHp: number; invuln: number }; mana(v?: number): number };
    const w = window as unknown as { __game: G; __manual: boolean; __bot(limit: number, spells: number): { t: number; lost: number } }, g = w.__game; w.__manual = true;
    g.startGame({ seed: 'BAL' + seed, floor: floor - 1, testTemplate: 'great_hall', testVariant: 'quiet', spells });
    g.warp(1); g.sim(.5); g.clearRoom(); g.sim(.3);
    g.player.maxHp = g.player.hp = 6; g.mana(999);
    g.spawn(id, g.player.x + 4, g.player.z - 1); g.sim(.7);
    return w.__bot(limit, spells.length);
  }, { id, spells: BUILDS[build], seed, floor: FOES[id].floor, limit });
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length ? s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 : 0; };
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript('window.__manual = true; window.__name = f => f'); // (__name: what tsx wraps named functions in, which the page lacks)
  await page.goto(BASE + '?room=great_hall&variant=quiet');
  await page.waitForFunction(() => !!(window as unknown as { __game?: unknown }).__game, null, { timeout: 60_000 });
  await page.click('#btnStart');
  await page.evaluate(installBot);
  const rows: Row[] = [], started = Date.now();
  for (const id of ids) for (const build of schools) {
    const row: Row = { id, floor: FOES[id].floor, build, t: [], lost: [] };
    for (let s = 0; s < seeds; s++) { const r = await fight(page, id, build, s); row.t.push(r.t); row.lost.push(r.lost / 2); }
    rows.push(row);
    console.log(`${id.padEnd(16)} f${row.floor} ${build.padEnd(8)} ${row.t.map(t => t >= limit ? 'DNF' : t.toFixed(1) + 's').join(' ').padEnd(14)} hearts ${row.lost.join(' ')}`);
  }
  await browser.close();
  if (errors.length) console.log('page errors:\n' + errors.join('\n'));
  const md = report(rows, (Date.now() - started) / 1000);
  if (!narrowed || args.includes('--write')) { writeFileSync('docs/balance.md', md); console.log('wrote docs/balance.md'); }
  if (narrowed || args.includes('--print')) console.log('\n' + md);
}

/** The report: per floor, each foe's mean time and hearts by build, the floor's medians, and what is flagged. */
function report(rows: Row[], secs: number) {
  const builds = [...new Set(rows.map(r => r.build))], fl = [...new Set(rows.map(r => r.floor))].sort();
  const cell = (r?: Row) => !r ? '' : `${r.t.some(t => t >= limit) ? 'DNF ' : ''}${mean(r.t).toFixed(1)} s · ${mean(r.lost).toFixed(1)} ♥`;
  const flags: string[] = [];
  let md = `# Balance\n\nWritten by \`npm run balance\` (tools/balance.ts, M4.9). Every foe fought alone in a great hall on its own floor by a bot that walks, shoots and casts its two spells whenever they are ready; ${seeds} seed(s) each, fights cut off at ${limit} s (DNF). Each cell: the mean time to put it down · the mean hearts it cost. Flagged: a foe taking more than twice its floor's median, a school whose median on a floor is more than twice the floor's. Last run: ${new Date().toISOString().slice(0, 10)}, ${Math.round(secs / 60)} min.\n`;
  for (const f of fl) {
    const here = rows.filter(r => r.floor === f), floorMed = median(here.map(r => mean(r.t)));
    md += `\n## Floor ${f} (median ${floorMed.toFixed(1)} s)\n\n| Foe | ${builds.join(' | ')} |\n| --- | ${builds.map(() => '---').join(' | ')} |\n`;
    for (const id of [...new Set(here.map(r => r.id))]) {
      md += `| ${id} | ${builds.map(b => cell(here.find(r => r.id === id && r.build === b))).join(' | ')} |\n`;
      const all = mean(here.filter(r => r.id === id).map(r => mean(r.t)));
      if (all > floorMed * 2) flags.push(`floor ${f}: ${id} takes ${all.toFixed(1)} s, more than twice the floor's ${floorMed.toFixed(1)} s`);
    }
    const meds = builds.map(b => median(here.filter(r => r.build === b).map(r => mean(r.t))));
    md += `| *median* | ${meds.map(m => `*${m.toFixed(1)} s*`).join(' | ')} |\n`;
    builds.forEach((b, i) => { if (meds[i] > floorMed * 2) flags.push(`floor ${f}: ${b} takes ${meds[i].toFixed(1)} s, more than twice the floor's ${floorMed.toFixed(1)} s`); });
  }
  md += `\n## Flagged\n\n${flags.length ? flags.map(f => `- ${f}`).join('\n') : 'Nothing.'}\n`;
  return md;
}

await main();
