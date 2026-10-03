/* The balance bot (M4.9 step 1, docs/M4.9-plan.md): every foe on its floor fought alone by a walking, shooting bot, with
   the cantrip only and with each school's two spells, on a few seeds; how long it took and the hearts it cost, written to
   docs/balance.md. Flags a foe that takes more than twice its floor's median to put down, and a school whose median on a
   floor is more than twice the floor's. Needs the dev server running (npm run dev). Not in CI: it takes a while.

   Usage: npm run balance -- [floor=3] [foe=hydra,rimeWolf] [school=frost|cantrip,...] [seeds=2] [limit=40] [--print]
     floor, foe and school narrow the run (a narrowed run prints its table and leaves docs/balance.md alone unless
     --write is given); seeds is how many seeds each pairing is fought on; limit the seconds a fight may last.
   npm run balance -- runs [floor=1,2] [school=...] [seeds=3] [limit=90]
     Whole floors instead (2026-10-01): each seed's run, floor by floor, every fight room entered in turn (the boss's
     too) and cleared by the same bot with each build; the floor's rooms as generated, waves, pairs, champions, elites
     and its pressure dials all in. Writes docs/balance-runs.md: each floor's room times, hearts and boss, how much
     longer than the floor above, every room the bot could not clear in `limit` s, and page errors.

   OSSUARY_URL points at another server; PW_CHROMIUM at a Chromium binary (cloud sessions). */
import { levelAtFloor } from '../src/progression/levelData';
import { chromium, type Browser, type Page } from '@playwright/test';
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

const runsMode = args.includes('runs');
const floors = opt('floor')?.split(',').map(Number), only = opt('foe')?.split(','), schools = (opt('school')?.split(',') ?? Object.keys(BUILDS));
const seeds = Number(opt('seeds') ?? (runsMode ? 3 : 2)), limit = Number(opt('limit') ?? (runsMode ? 90 : 40)), narrowed = !!(floors || only || opt('school'));
const ids = Object.keys(FOES).filter(id => FOES[id].floor >= 1 && !SKIP.has(id) && (!floors || floors.includes(FOES[id].floor)) && (!only || only.includes(id)));

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

/* ---------- whole floors (runs) ---------- */

/** The bot, put into the page: it lines up with the nearest foe and casts at it (closing in when out of reach, backing off
    when close), and casts its spells at it whenever they are ready. When its target has taken no harm for a while (a tomb
    or a pillar between them), it steps aside for a moment, as a player would; with nothing awake to fight (an ambush not
    yet sprung, foes still rising) it walks to the room's middle. The mage is healed when low, so a hard foe shows as
    hearts lost rather than as a death. `__bot` fights until every foe is down (one foe alone), `__runBot` until the room
    is cleared (an ordeal's every wave, a boss with its helpers). Each returns the seconds (`limit` if it never ended), the
    half hearts lost and the kinds still standing. */
function installBot() {
  type E = { x: number; z: number; dead?: boolean; type: string; spawn: number; hidden?: boolean; hp: number; owner?: E; foe?: { id: string; behaviour: string } };
  type G = { keys: Set<string>; arrowOrder: string[]; player: { x: number; z: number; hp: number; maxHp: number }; enemies: E[];
    sim(s: number): void; cast(slot: number, dir?: { x: number; z: number }): boolean; state: string; current: { cleared: boolean; cx: number; cz: number } };
  type Out = { t: number; lost: number; left: string[] };
  const w = window as unknown as { __game: G; __runBot(limit: number, spells: number): Out; __bot(limit: number, spells: number): Out };
  const g = w.__game;
  const hold = (codes: string[]) => {
    for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) g.keys.delete(k);
    for (const c of codes) g.keys.add(c);
    g.arrowOrder.length = 0; const a = codes.find(c => c.startsWith('Arrow')); if (a) g.arrowOrder.push(a);
  };
  const fight = (lim: number, spells: number, done: () => boolean) => {
    let t = 0, lost = 0, idle = 0, aside = 0, way = 1, tries = 0, flip = false, last: E | undefined, lastHp = 0;
    const room = g.current;
    for (; t < lim && !done(); t += .05) {
      const p = g.player, before = p.hp, codes: string[] = [];
      // the nearest foe, but first one that makes or mends the others (a wasps' nest with its brood out, a healer), as a
      // player learns to
      const live = g.enemies.filter(f => !f.dead), first = (f: E) => !f.hidden && (f.foe?.behaviour === 'healer' || live.some(o => o.owner === f));
      const e = live.sort((a, b) => +first(b) - +first(a) || Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      if (!e) { // (nothing to fight yet: to the middle, where an ambush springs)
        const dx = room.cx - p.x, dz = room.cz - p.z;
        if (dx > .3) codes.push('KeyD'); else if (dx < -.3) codes.push('KeyA');
        if (dz > .3) codes.push('KeyS'); else if (dz < -.3) codes.push('KeyW');
      } else {
        const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
        const struck = e === last && e.hp < lastHp; if (struck) tries = 0; if (e !== last) flip = false;
        idle = e === last && !struck && e.spawn <= 0 && !e.hidden ? idle + .05 : 0; last = e; lastHp = e.hp; // (a foe under water can't be struck: no cover to step round)
        // striking nothing (cover between): step aside, further each time, and the other way after two tries; every other
        // try, line up on the other axis, kept while it strikes (a nest in a side wall behind a row of pillars is struck
        // only from beside it)
        if (idle > 1.5 && aside <= 0) { tries++; if (tries % 3 === 0) way = -way; if (tries % 2 === 0) flip = !flip; aside = Math.min(2, .5 + .4 * tries); idle = 0; }
        const vert = (Math.abs(dx) <= Math.abs(dz)) !== flip;
        if (aside > 0) {
          aside -= .05;
          if (vert) { codes.push(way > 0 ? 'KeyD' : 'KeyA'); codes.push(dz < 0 ? 'ArrowUp' : 'ArrowDown'); }
          else { codes.push(way > 0 ? 'KeyS' : 'KeyW'); codes.push(dx < 0 ? 'ArrowLeft' : 'ArrowRight'); }
        } else if (d < 1.4) {
          codes.push(dx > 0 ? 'KeyA' : 'KeyD', dz > 0 ? 'KeyW' : 'KeyS');
          codes.push(Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? 'ArrowLeft' : 'ArrowRight') : (dz < 0 ? 'ArrowUp' : 'ArrowDown'));
        } else if (vert) {
          if (dx > .2) codes.push('KeyD'); else if (dx < -.2) codes.push('KeyA');
          if (d > 5) codes.push(dz < 0 ? 'KeyW' : 'KeyS');
          codes.push(dz < 0 ? 'ArrowUp' : 'ArrowDown');
        } else {
          if (dz > .2) codes.push('KeyS'); else if (dz < -.2) codes.push('KeyW');
          if (d > 5) codes.push(dx < 0 ? 'KeyA' : 'KeyD');
          codes.push(dx < 0 ? 'ArrowLeft' : 'ArrowRight');
        }
        if (e.spawn <= 0 && d < 7) for (let s = 0; s < spells; s++) g.cast(s, { x: dx / (d || 1), z: dz / (d || 1) });
      }
      hold(codes); g.sim(.05);
      if (p.hp < before) lost += before - p.hp;
      if (p.hp <= 2) p.hp = p.maxHp;
      if (g.state !== 'play') break;
    }
    hold([]);
    return { t: +t.toFixed(1), lost, left: done() ? [] : g.enemies.filter(f => !f.dead && f.type !== 'dummy').map(f => f.foe?.id ?? f.type) };
  };
  w.__runBot = (lim, spells) => { const room = g.current; return fight(lim, spells, () => room.cleared || g.current !== room); };
  w.__bot = (lim, spells) => fight(lim, spells, () => !g.enemies.some(e => !e.dead && e.type !== 'dummy'));
}

interface RoomRow { seed: number; floor: number; build: string; type: string; template: string; variant: string; foes: string[]; t: number; lost: number; left: string[]; insight: number; level: number; start: number }

/** One floor of one seed's run with one build: every room with a fight, entered in turn (the boss's last). */
async function fightFloor(page: Page, floor: number, build: string, seed: number): Promise<RoomRow[]> {
  const start = levelAtFloor(floor - 1); // (M6 step 12: each floor at the level a run expects to reach it at, its levels choosing for themselves)
  const rooms = await page.evaluate(({ floor, spells, seed, start }) => {
    type R = { cleared: boolean; plan: { id: number; type: string; templateId: string; variant: string }; waves: { kind: string }[][] };
    type G = { startGame(o: object): void; rooms(): R[] };
    const g = (window as unknown as { __game: G }).__game;
    g.startGame({ seed: 'RUN' + seed, floor: floor - 1, spells, level: start > 1 ? start : undefined });
    return g.rooms().filter(r => !r.cleared && r.waves.length && r.plan.type !== 'vault') // (a vault's warden wakes only to a key or blasts)
      .sort((a, b) => +(a.plan.type === 'boss') - +(b.plan.type === 'boss'))
      .map(r => ({ id: r.plan.id, type: r.plan.type, template: r.plan.templateId, variant: r.plan.variant, foes: r.waves.flat().map(w => w.kind) }));
  }, { floor, spells: BUILDS[build], seed, start });
  const out: RoomRow[] = [];
  for (const r of rooms) {
    const res = await page.evaluate(({ id, limit, n }) => {
      type G = { warp(id: number): void; sim(s: number): void; clearRoom(): void; player: { hp: number; maxHp: number; invuln: number }; insight: { insight: number }; level: number };
      const w = window as unknown as { __game: G; __runBot(limit: number, spells: number): { t: number; lost: number; left: string[] } }, g = w.__game;
      g.player.hp = g.player.maxHp; g.warp(id);
      const before = g.insight.insight, r = w.__runBot(limit, n);
      if (r.left.length) { g.clearRoom(); g.sim(.1); } // (what one room left standing never spoils the next: warp leaves foes behind)
      g.sim(.2); // (the clear's insight)
      return { ...r, insight: g.insight.insight - before, level: g.level };
    }, { id: r.id, limit: r.type === 'boss' || r.type === 'ordeal' ? limit * 2 : limit, n: BUILDS[build].length }); // (an ordeal's waves, a boss's phases: twice as long)
    out.push({ seed, floor, build, ...r, t: res.t, lost: res.lost / 2, left: res.left, insight: res.insight, level: res.level, start });
  }
  return out;
}

/** Every floor of every seed with every build. A page that crashes (a headless browser can, an hour or more into a pass) is
    replaced by a fresh one and the floor fought again, at most `CRASHES` times. */
const CRASHES = 3;
async function runs(first: Page, reopen: () => Promise<Page>, errors: string[]) {
  const fl = floors ?? [1, 2, 3, 4, 5], rows: RoomRow[] = [], started = Date.now();
  let page = first, crashes = 0;
  for (let s = 0; s < seeds; s++) for (const f of fl) for (const build of schools) {
    let got: RoomRow[];
    try { got = await fightFloor(page, f, build, s); } catch (e) {
      if (!/crashed|closed/i.test(String(e)) || ++crashes > CRASHES) throw e;
      console.log(`(the page crashed on seed ${s}, floor ${f}, ${build}: a fresh page, and the floor again)`); errors.push(`the page crashed on seed ${s}, floor ${f}, ${build} (fought again on a fresh page)`);
      await page.close().catch(() => undefined); page = await reopen(); got = await fightFloor(page, f, build, s);
    }
    rows.push(...got);
    const fights = got.filter(r => r.type !== 'boss'), boss = got.find(r => r.type === 'boss'), dnf = got.filter(r => r.left.length);
    console.log(`seed ${s} f${f} ${build.padEnd(8)} ${fights.length} rooms, mean ${mean(fights.map(r => r.t)).toFixed(1)} s, hearts ${fights.reduce((a, r) => a + r.lost, 0)}, boss ${boss ? boss.t + ' s' : '-'}${dnf.length ? `, not cleared: ${dnf.map(r => `${r.template} [${r.left.join(' ')}]`).join('; ')}` : ''}`);
  }
  return { rows, secs: (Date.now() - started) / 1000 };
}

/** A page with the game started and the bot in it. */
async function openPage(browser: Browser, errors: string[]) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript('window.__manual = true; window.__name = f => f'); // (__name: what tsx wraps named functions in, which the page lacks)
  await page.goto(BASE + '?room=great_hall&variant=quiet&autolevel=1'); // (M6: levels choose for themselves, no screen in the way)
  await page.waitForFunction(() => !!(window as unknown as { __game?: unknown }).__game, null, { timeout: 60_000 });
  await page.click('#btnStart');
  await page.evaluate(installBot);
  return page;
}

/** The runs' report: each floor's mean room and boss by build, how it grows from the floor above, and what was not cleared. */
function runsReport(rows: RoomRow[], secs: number, errors: string[]) {
  const builds = [...new Set(rows.map(r => r.build))], fl = [...new Set(rows.map(r => r.floor))].sort();
  const fights = (f: number, b?: string) => rows.filter(r => r.floor === f && r.type !== 'boss' && (!b || r.build === b));
  const bosses = (f: number, b?: string) => rows.filter(r => r.floor === f && r.type === 'boss' && (!b || r.build === b));
  let md = `# Balance: whole floors\n\nWritten by \`npm run balance -- runs\` (tools/balance.ts). ${seeds} seed(s) of a run, each floor started fresh with each build at the level a run expects to reach it at (M6 step 12: \`levelAtFloor\`, its levels choosing for themselves; no artifacts carried), every fight room entered in turn and cleared by the bot (vaults left sealed); a room is cut off at ${limit} s, an ordeal or a boss at ${limit * 2} s. The bot is healed when low, so hard rooms show as hearts lost. Last run: ${new Date().toISOString().slice(0, 10)}, ${Math.round(secs / 60)} min.\n`;
  md += `\n## Rooms: mean seconds · hearts lost a room\n\n| Floor | ${builds.join(' | ')} | all | vs floor above |\n| --- | ${builds.map(() => '---').join(' | ')} | --- | --- |\n`;
  let prev = 0;
  for (const f of fl) {
    const all = mean(fights(f).map(r => r.t)), grow = prev ? `×${(all / prev).toFixed(2)}` : '';
    md += `| ${f} | ${builds.map(b => `${mean(fights(f, b).map(r => r.t)).toFixed(1)} · ${mean(fights(f, b).map(r => r.lost)).toFixed(1)}`).join(' | ')} | ${all.toFixed(1)} · ${mean(fights(f).map(r => r.lost)).toFixed(1)} | ${grow} |\n`;
    prev = all;
  }
  md += `\n## Insight and levels (M6 step 12)\n\nEach floor's start level, the mean insight a fight room gave (kills and its clear), the boss's, and the level the floor ended at (mean over builds and seeds), against the curve's next start level.\n\n| Floor | start | insight a room | boss | ends at | the curve's next |\n| --- | --- | --- | --- | --- | --- |\n`;
  for (const f of fl) {
    const all = rows.filter(r => r.floor === f), boss = bosses(f), ends = [...new Set(all.map(r => r.seed + r.build))].map(k => all.filter(r => r.seed + r.build === k).at(-1)!.level);
    md += `| ${f} | ${all[0]?.start ?? ''} | ${mean(fights(f).map(r => r.insight)).toFixed(1)} | ${mean(boss.map(r => r.insight)).toFixed(0)} | ${mean(ends).toFixed(1)} | ${f < 5 ? levelAtFloor(f) : 12} |\n`;
  }
  md += `\n## Bosses: mean seconds · hearts lost\n\n| Floor | ${builds.join(' | ')} |\n| --- | ${builds.map(() => '---').join(' | ')} |\n`;
  for (const f of fl) md += `| ${f} | ${builds.map(b => { const r = bosses(f, b); return r.length ? `${mean(r.map(x => x.t)).toFixed(1)} · ${mean(r.map(x => x.lost)).toFixed(1)}` : ''; }).join(' | ')} |\n`;
  const slow = rows.filter(r => r.type !== 'boss' && !r.left.length).sort((a, b) => b.t - a.t).slice(0, 12);
  md += `\n## The longest rooms cleared\n\n${slow.map(r => `- floor ${r.floor}, ${r.build}: ${r.template} (${r.type}${r.variant !== 'normal' ? ', ' + r.variant : ''}) ${r.t} s, ${r.lost} ♥: ${r.foes.join(', ')}`).join('\n')}\n`;
  const dnf = rows.filter(r => r.left.length);
  md += `\n## Not cleared in time\n\n${dnf.length ? dnf.map(r => `- floor ${r.floor}, seed ${r.seed}, ${r.build}: ${r.template} (${r.type}${r.variant !== 'normal' ? ', ' + r.variant : ''}), still standing: ${r.left.join(', ')}`).join('\n') : 'Every room was cleared.'}\n`;
  md += `\n## Page errors\n\n${errors.length ? [...new Set(errors)].map(e => `- ${e}`).join('\n') : 'None.'}\n`;
  return md;
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors: string[] = [], page = await openPage(browser, errors);
  if (runsMode) {
    const { rows, secs } = await runs(page, () => openPage(browser, errors), errors);
    await browser.close();
    const md = runsReport(rows, secs, errors);
    if (!narrowed || args.includes('--write')) { writeFileSync('docs/balance-runs.md', md); console.log('wrote docs/balance-runs.md'); }
    if (narrowed || args.includes('--print')) console.log('\n' + md);
    return;
  }
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
  let md = `# Balance\n\nWritten by \`npm run balance\` (tools/balance.ts, M4.9). Every foe fought alone in a great hall on its own floor by a bot that walks, shoots and casts its two spells whenever they are ready; ${seeds} seed(s) each, fights cut off at ${limit} s (DNF). Each cell: the mean time to put it down · the mean hearts it cost. Flagged: a foe taking more than twice its floor's median, a school whose median on a floor is more than twice the floor's. Last run: ${new Date().toISOString().slice(0, 10)}, ${Math.round(secs / 60)} min.\n\n**Reading it.** The bot casts in four directions as the mage does, walks in when out of reach and steps aside when its target takes no harm for a while (cover between them), but it chalks no glyphs and stands in no steam: a foe hiding in water is struck only while it is up. A foe circling the mage (the Phoenix) is hard for it to line up on. Elites take longer by design. Each fight is one foe alone, so the floors' pressure dials (more foes, more elites) don't show here.\n`;
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
