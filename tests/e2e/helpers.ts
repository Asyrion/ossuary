import { expect, type Page } from '@playwright/test';

/* What the browser tests share: the views of window.__game they read, `start`, and the hooks types several use. */

/* Minimal view of window.__game for the tests. */
export interface Foe {
  x: number;
  z: number;
  spawn: number;
  dead?: boolean;
  isBoss?: boolean;
}

export interface RoomView {
  type: string;
  cleared: boolean;
  locked: boolean;
  cx: number;
  cz: number;
  plan: { id: number; shape: string; templateId: string };
  doors: { open: boolean }[];
}

export interface GameHooks {
  state: string;
  seed: string;
  floor: number;
  player: { x: number; z: number; hp: number; maxHp: number };
  enemies: Foe[];
  current: RoomView;
  rooms(): RoomView[];
  map(): string;
  hero: { info: string };
  keys: Set<string>;
  arrowOrder: string[];
  warp(id: number): void;
  sim(sec: number, draw?: boolean): void;
  wayDown: { x: number; z: number; room: string | null; kind?: string } | null;
}

export type W = { __game: GameHooks; __manual: boolean; __fight(limit: number, step?: number): number };

/** Math.random from a seed, started again by `window.__reseed()` (as `npm run inspect` does). The game keeps
    Math.random unseeded for combat and visual jitter (src/rng.ts); the browser tests swap it before the page loads, so a
    test plays out the same on every run and a pass never rests on a lucky roll. */
export const SEEDED_RANDOM = `(() => { let s = 1; Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__reseed = () => { s = 1; }; })();`;

/** Collect console errors, open the game with Math.random seeded and press Descend. */
export async function start(page: Page, query: string) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  // the tests step the game themselves: no frames drawn in real time from the moment the page loads (with software
  // WebGL on a two-core runner, the title screen drawing flat out slowed every start down)
  await page.addInitScript('window.__manual = true');
  await page.addInitScript(SEEDED_RANDOM);
  // (levels pass with nothing taken, so a fight cleared changes none of the mage's numbers, unless a test asks otherwise)
  await page.goto(
    '/' + query + (query.includes('autolevel') ? '' : (query.includes('?') ? '&' : '?') + 'autolevel=skip'),
  );
  await page.waitForFunction(() => !!(window as unknown as W).__game, null, { timeout: 30_000 });
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('title');
  expect(await page.evaluate(() => (window as unknown as W).__game.hero.info)).toContain('rigged');
  await page.click('#btnStart');
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('play');
  // a simple auto-player: line up with the nearest foe and cast at it, backing off when too close
  await page.evaluate(() => {
    const w = window as unknown as W;
    w.__manual = true;
    const g = w.__game;
    const hold = (codes: string[]) => {
      for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
        g.keys.delete(k);
      for (const c of codes) g.keys.add(c);
      g.arrowOrder.length = 0;
      const a = codes.find((c) => c.startsWith('Arrow'));
      if (a) g.arrowOrder.push(a);
    };
    // (what it remembers lasts across calls: a test may fight in short slices)
    let stuck = 0,
      idle = 0,
      lineUp = 0,
      was = { x: g.player.x, z: g.player.z },
      last: unknown,
      lastHp = 0;
    w.__fight = (limit: number, step = 0.05) => {
      // (`step`: how long each slice is; a test that watches every step passes one)
      let t = 0;
      for (; t < limit && g.enemies.length; t += step) {
        g.player.hp = g.player.maxHp; // these tests check the loop, not survival (hits still knock the hero back)
        const p = g.player;
        // a foe killed by a bolt stays in the list, marked dead, until the next step
        // (a foe whose shield turns bolts, a Twin Guardian, only when there's nothing else)
        const e = g.enemies
          .filter((f) => !f.dead)
          .sort(
            (a, b) =>
              +!!(a as { glance?: boolean }).glance - +!!(b as { glance?: boolean }).glance ||
              Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
          )[0];
        if (!e) {
          hold([]);
          g.sim(step);
          continue;
        }
        const dx = e.x - p.x,
          dz = e.z - p.z,
          codes: string[] = [];
        // backing off into a corner goes nowhere (and a foe on the diagonal is never struck), and a foe that takes no harm
        // for a while isn't being struck: line up with it a while instead
        const hp = (e as unknown as { hp: number }).hp;
        idle = e === last && hp >= lastHp ? idle + step : 0;
        last = e;
        lastHp = hp;
        if (stuck > 0.5 || idle > 2) {
          lineUp = 1.5;
          stuck = idle = 0;
        }
        if (Math.hypot(dx, dz) < (e.isBoss ? 1.6 : 0.9) && lineUp <= 0) {
          codes.push(dx > 0 ? 'KeyA' : 'KeyD', dz > 0 ? 'KeyW' : 'KeyS');
          codes.push(
            Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? 'ArrowLeft' : 'ArrowRight') : dz < 0 ? 'ArrowUp' : 'ArrowDown',
          );
        } else if (Math.abs(dx) <= Math.abs(dz)) {
          if (dx > 0.2) codes.push('KeyD');
          else if (dx < -0.2) codes.push('KeyA');
          codes.push(dz < 0 ? 'ArrowUp' : 'ArrowDown');
        } else {
          if (dz > 0.2) codes.push('KeyS');
          else if (dz < -0.2) codes.push('KeyW');
          codes.push(dx < 0 ? 'ArrowLeft' : 'ArrowRight');
        }
        hold(codes);
        g.sim(step);
        lineUp -= step;
        stuck = Math.hypot(p.x - was.x, p.z - was.z) < 0.01 ? stuck + step : 0;
        was = { x: p.x, z: p.z };
      }
      hold([]);
      return t;
    };
  });
  return errors;
}

/* The merchant and the locked vault. */
export type Ware = { ware: string; price: number; x: number; z: number; sold: boolean; def?: { id: string } };

export type Seal = { sealed: boolean; blasts: number };

export type G5 = Omit<GameHooks, 'current' | 'enemies'> & {
  player: GameHooks['player'] & {
    coins: number;
    keys: number;
    glyphs: number;
    items: string[];
    focus: string;
    invuln: number;
    vx: number;
    vz: number;
  };
  current: Omit<RoomView, 'doors'> & {
    wares?: Ware[];
    warden?: boolean;
    spots: { taken: boolean }[];
    doors: { x: number; z: number; open: boolean; seal?: Seal }[];
  };
  bolts: { dist: number }[];
  glyphs: unknown[];
  enemies: (Foe & { champion?: boolean })[];
  clearRoom(): void;
  loot(v: Record<string, number>): void;
};

/* The shrine. */
export type Rite = {
  id: string;
  x: number;
  z: number;
  hits: number;
  t: number;
  inside: boolean;
  fleeing: boolean;
} | null;

export type G6 = G5 & {
  rite: Rite;
  player: G5['player'] & { cleansed: string[]; stats: { damage: number; speed: number; effects: Set<string> } };
  current: G5['current'] & { shrine: { stones: { id: string; x: number; z: number }[] } };
};

/* Magic. */
export type G9 = Omit<GameHooks, 'enemies'> & {
  enemies: (Foe & { hp: number; lastHit?: string })[];
  player: GameHooks['player'] & {
    mana: number;
    spells: (string | null)[];
    spellCd: number[];
    stats: { maxMana: number };
  };
  cast(slot: number, aim?: { x: number; z: number }): boolean;
  mana(v?: number): number;
  learn(id: string, slot?: number): string | null;
  drop(kind: string, x?: number, z?: number): void;
};

export type Status = { burn: number; chill: number; frozen: number; shock: number; stun: number };

export type G10 = Omit<G9, 'enemies'> & {
  enemies: (Foe & {
    hp: number;
    maxHp: number;
    type: string;
    status?: Status;
    label?: { userData: { text: string } };
  })[];
  spawn(kind: string, x?: number, z?: number): { hp: number; x: number; z: number; status?: Status; type: string };
  inflict(status: Record<string, number>): void;
};

export type G11 = Omit<G10, 'current' | 'enemies' | 'player'> & {
  clearRoom(): void;
  shoot(x: number, z: number, dx: number, dz: number): void;
  readonly mantle: number;
  readonly spellFx: { lance: boolean; rings: number; strikes: number };
  shots: unknown[];
  bolts: unknown[];
  current: G10['current'] & { barriers?: unknown[] };
  enemies: (G10['enemies'][number] & { lastHit?: string })[];
  player: G10['player'] & { invuln: number };
};

export type HStatus = Status & { sanct: number; hex: number; root: number; eclipse: number; black: boolean };

export type G11h = Omit<G11, 'enemies' | 'spawn' | 'inflict'> & {
  enemies: (Omit<G11['enemies'][number], 'status'> & { status?: HStatus; toll?: unknown })[];
  spawn(
    kind: string,
    x?: number,
    z?: number,
  ): { hp: number; x: number; z: number; status?: HStatus; toll?: unknown; type: string };
  inflict(status: Record<string, number>): void;
  hit(i: number, dmg: number, school?: string, by?: string): number;
  readonly ward: number;
  pickups: { kind: string }[];
  prop(kind: string, x?: number, z?: number): boolean;
  props: { kind: string; lit?: boolean }[];
};

export type GS = Omit<G11h, 'player'> & {
  player: G11h['player'] & { spellCd: number[]; souls: string[] };
  readonly souls: string[];
  soul(kind: string): boolean;
  hallowedMend(): number;
  drop(kind: string, x?: number, z?: number): void;
};

export type PageView = { spell: string; kind: string; price: number; gone: boolean; x: number; z: number };

export type G12 = Omit<G11, 'player'> & {
  player: G11['player'] & { coins: number };
  page(id?: string, x?: number, z?: number): string | null;
  readonly pages: PageView[];
  readonly forgotten: string[];
};

export type PoolView = { kind: string; state: string; tiles: { x: number; z: number }[] };

export type G13 = Omit<G12, 'keys' | 'player'> & {
  readonly pools: PoolView[];
  pool(what: 'fire' | 'frost' | 'shock'): void;
  keys: Set<string>;
  player: G12['player'] & { vx: number; vz: number };
};

export type G14 = G13 & { give(...ids: string[]): void; arrowOrder: string[] };

/* The potion belt, and what potions do drunk and thrown (docs/archive/M5-plan.md). */
export type Belt = {
  ids: string[];
  at: number;
  slots: number;
  known: boolean[];
  reagents: Record<string, number>;
  html: string;
};

export type GP = Omit<GameHooks, 'enemies' | 'player'> & {
  belt: Belt;
  potionFx: Record<string, number | string | null>;
  bottles: Record<string, { shape: string; liquid: string }>;
  throws: { flying: number; storms: number; thrall: boolean };
  givePotion(id: string): boolean;
  usePotion(how: 'drink' | 'throw'): boolean;
  choosePotion(d: number): void;
  identifyAll(): void;
  forgetPotions(): void;
  drop(kind: string, x?: number, z?: number, o?: { potion?: string }): void;
  pickups: { kind: string; potion?: string; reagent?: string; x: number; z: number }[];
  spawn(kind: string): void;
  clearRoom(): void;
  player: GameHooks['player'] & { aim: { x: number; z: number }; mana: number };
  mana(v?: number): number;
  learn(id: string, slot: number): void;
  cast(slot: number, dir?: { x: number; z: number }): boolean;
  enemies: (Foe & { status?: Record<string, number>; giant?: boolean; hp: number })[];
};

/* The artifacts that bend the economy. */
export type G7 = Omit<G6, 'current'> & {
  give(...ids: string[]): void;
  drop(kind: string, x?: number, z?: number): void;
  pickups: { kind: string }[];
  glyphs: { fuseMax: number; radius: number }[];
  run: { freeVault: number; floor: number };
  player: G6['player'] & { stats: G6['player']['stats'] & { gilt: number; blastMul: number; boltColor: number } };
  current: Omit<G6['current'], 'doors' | 'wares'> & {
    doors: { x: number; z: number; open: boolean; seal?: Seal; secret?: { divined: boolean } }[];
    wares?: (Ware & { tagPrice: number })[];
  };
};
