/* Shots of every screen the HUD's look touches, for the owner to compare an old look with a new one (CLAUDE.md: the owner
   sees new looks before they replace old ones): the HUD in a fight, the level-up, the inventory, the waystone, a
   townsperson's talk, the pause menu, the end screen and the title, each at 1280 × 720 and 1920 × 1080.

     npx tsx tools/hud/shots.ts asset-previews/hud/built/after

   Needs the dev server running (`npm run dev`; OSSUARY_URL names another, PW_CHROMIUM a Chromium binary). The game is
   stepped by hand (`__manual`) with Math.random seeded, so a shot shows the same moment each time. */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.OSSUARY_URL ?? 'http://localhost:5173/';
const OUT = process.argv[2] ?? 'asset-previews/hud/built/after';
const SEEDED = `(() => { let s = 1; Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__manual = true; })();`;

/* The parts of window.__game the shots use (src/dev/hooks.ts). */
interface Hooks {
  state: string;
  player: {
    x: number;
    z: number;
    hp: number;
    maxHp: number;
    mana: number;
    invuln: number;
    chill: number;
    spellCd: number[];
    stats: { maxMana: number };
  };
  offer: { open: boolean };
  waystone: { x: number; z: number; screen: { open: boolean } } | null;
  rooms(): { type: string; plan: { id: number; templateId: string } }[];
  warp(id: number): void;
  sim(sec: number, draw?: boolean): void;
  drop(kind: string, x?: number, z?: number, o?: object): void;
  shoot(x: number, z: number, dx: number, dz: number): void;
  clearRoom(): void;
  descend(): void;
  veteranSave(): void;
  toVigil(first?: boolean): void;
  talkTo(id: string): boolean;
  creaturesReady(): Promise<void>;
}
type Win = { __game: Hooks };

async function open(page: Page, query: string, begin = true) {
  await page.goto(BASE + query + (query.includes('autolevel') ? '' : '&autolevel=skip'));
  await page.waitForFunction(() => !!(window as unknown as Win).__game, null, { timeout: 60_000 });
  await page.evaluate(() => (window as unknown as Win).__game.creaturesReady());
  await page.evaluate(() => document.fonts.ready);
  if (!begin) return;
  await page.click('#btnStart');
  await page.evaluate(() => (window as unknown as Win).__game.creaturesReady());
}
const draw = (page: Page, t = 0.05) => page.evaluate((s) => (window as unknown as Win).__game.sim(s, true), t);

/** Each screen: how to reach it. */
const SHOTS: Record<string, (page: Page) => Promise<void>> = {
  title: async (page) => {
    await open(page, '?seed=HUDT', false);
    await draw(page);
  },
  fight: async (page) => {
    await open(
      page,
      '?room=crypt_a&seed=HUD1&spells=cinder_lance,rime_shards&potions=healing,frostbrew,liquidEmber&give=mourners_censer,candle_moth&loot=coins:23,keys:2,glyphs:3',
    );
    await page.evaluate(() => {
      const g = (window as unknown as Win).__game,
        P = g.player;
      P.invuln = 999;
      g.warp(1);
      g.sim(0.6);
      P.invuln = 0;
      g.shoot(P.x, P.z - 2.5, 0, 1); // (a bolt taken: the heart's crack)
      g.sim(1.2);
      P.invuln = 999;
      P.hp = P.maxHp - 3; // (a heart full, one half, one empty: drawn as the mote comes)
      g.drop('paleSoul', P.x, P.z);
      g.sim(3);
      document.getElementById('lore')!.classList.remove('on'); // (the mote's card, timed in real time)
      P.mana = P.stats.maxMana * 0.62;
      P.spellCd = [0, 1.2];
      P.chill = 2;
      g.sim(0.1, true);
      const t = document.getElementById('toast')!;
      t.textContent = 'Bronze closes round your forearms.';
      t.classList.add('on');
    });
    await page.waitForTimeout(900); // (a heart's crack played out)
  },
  level: async (page) => {
    await open(page, '?seed=LVUP&level=3&autolevel=0');
    await page.evaluate(() => {
      const g = (window as unknown as Win).__game;
      g.player.invuln = 999;
      for (let k = 0; k < 400 && !g.offer.open; k++) g.sim(1 / 60);
      g.sim(0.01, true);
    });
    await page.waitForTimeout(900); // (the mana surge has risen through the cards)
  },
  inventory: async (page) => {
    await open(
      page,
      '?seed=INV1&spells=arc,pyre_seal&give=twin_staff,mana_lantern,crown_of_thorns&loot=coins:12,keys:1,glyphs:3',
    );
    await draw(page);
    await page.keyboard.press('KeyI');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
  },
  waystone: async (page) => {
    await open(page, '?room=boss_open&boss=warden&seed=STONE9&spells=cinder_lance,arc&potions=healing,hexBrew');
    await page.evaluate(() => {
      const g = (window as unknown as Win).__game,
        P = g.player;
      P.invuln = 999;
      g.warp(1);
      g.sim(0.3);
      g.clearRoom();
      g.sim(2.2);
      const s = g.waystone!;
      P.x = s.x;
      P.z = s.z + 2.5;
      g.sim(0.1);
      P.z = s.z + 0.9;
      g.sim(0.1, true);
    });
    await page.waitForTimeout(300);
  },
  talk: async (page) => {
    await open(page, '?vigil=1&seed=VIGL2');
    await page.evaluate(() => {
      const g = (window as unknown as Win).__game;
      g.veteranSave();
      g.toVigil(false);
      g.sim(3);
      g.warp(g.rooms().find((r) => r.plan.templateId === 'vigil_nave')!.plan.id);
      g.sim(0.6);
      g.talkTo('scribe');
      g.sim(4, true);
    });
    await page.waitForTimeout(300);
  },
  pause: async (page) => {
    await open(page, '?seed=HUDP&spells=cinder_lance,rime_shards');
    await draw(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  },
  end: async (page) => {
    await open(page, '?room=crypt_a&seed=ENDRUN&give=twin_staff,bone_lens');
    await page.evaluate(() => {
      const g = (window as unknown as Win).__game;
      g.player.invuln = 999;
      g.warp(1);
      g.sim(0.5);
      g.clearRoom();
      g.drop('purse', g.player.x, g.player.z + 0.3);
      g.sim(1);
      g.descend();
      g.sim(0.05, true);
    });
    await page.waitForTimeout(300);
  },
};

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const only = process.argv.slice(3);
for (const [w, h] of [
  [1280, 720],
  [1920, 1080],
]) {
  const dir = join(OUT, `${w}x${h}`);
  mkdirSync(dir, { recursive: true });
  for (const [name, reach] of Object.entries(SHOTS)) {
    if (only.length && !only.includes(name)) continue;
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.addInitScript(SEEDED);
    try {
      await reach(page);
      await page.screenshot({ path: join(dir, `${name}.png`) });
      console.log('shot', w, name);
    } catch (e) {
      console.log('failed', w, name, String(e).split('\n')[0]);
    }
    await page.close();
  }
}
await browser.close();
