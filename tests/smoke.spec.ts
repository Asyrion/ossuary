import { expect, test } from '@playwright/test';

/* Minimal view of window.__game for the test. */
interface Foe { x: number; z: number; spawn: number; dead?: boolean }
interface GameHooks {
  state: string; player: { x: number; z: number; hp: number; maxHp: number };
  enemies: Foe[]; current: { gx: number; gy: number; cleared: boolean; locked: boolean; doors: Record<string, { open: boolean }> };
  hero: { info: string }; keys: Set<string>; arrowOrder: string[];
  startGame(): void; warp(gx: number, gy: number): void; sim(sec: number, draw?: boolean): void;
}
type W = Window & { __game: GameHooks; __manual: boolean };

test('start a run and clear room A without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto('/');
  await page.waitForFunction(() => !!(window as W).__game, null, { timeout: 30_000 });
  expect(await page.evaluate(() => (window as W).__game.state)).toBe('title');
  expect(await page.evaluate(() => (window as W).__game.hero.info)).toContain('rigged');

  // start through the real button, then drive the simulation by hand
  await page.click('#btnStart');
  expect(await page.evaluate(() => (window as W).__game.state)).toBe('play');

  const result = await page.evaluate(() => {
    const w = window as W;
    w.__manual = true;
    const g = w.__game;
    g.warp(0, -1);
    const foes = g.enemies.length;
    const hold = (codes: string[]) => { for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) g.keys.delete(k); for (const c of codes) g.keys.add(c); };
    let t = 0;
    for (; t < 60 && g.enemies.length; t += 0.05) {
      g.player.hp = g.player.maxHp; // this test checks the loop, not survival (hits still knock the hero back)
      const p = g.player;
      const e = g.enemies.filter(f => !f.dead).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      const dx = e.x - p.x, dz = e.z - p.z, codes: string[] = [];
      let arrow: string;
      if (Math.hypot(dx, dz) < .9) { // too close for bolts to connect: back away
        codes.push(dx > 0 ? 'KeyA' : 'KeyD', dz > 0 ? 'KeyW' : 'KeyS');
        arrow = Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? 'ArrowLeft' : 'ArrowRight') : (dz < 0 ? 'ArrowUp' : 'ArrowDown');
      } else if (Math.abs(dx) <= Math.abs(dz)) { // line up on x, shoot north/south
        if (dx > .2) codes.push('KeyD'); else if (dx < -.2) codes.push('KeyA');
        arrow = dz < 0 ? 'ArrowUp' : 'ArrowDown';
      } else { // line up on z, shoot east/west
        if (dz > .2) codes.push('KeyS'); else if (dz < -.2) codes.push('KeyW');
        arrow = dx < 0 ? 'ArrowLeft' : 'ArrowRight';
      }
      hold([...codes, arrow]); g.arrowOrder.length = 0; g.arrowOrder.push(arrow);
      g.sim(0.05);
    }
    hold([]); g.arrowOrder.length = 0;
    g.sim(0.5, true); // let the door bars sink and render a frame
    const room = g.current;
    return { foes, seconds: t, left: g.enemies.length, room: [room.gx, room.gy], cleared: room.cleared, locked: room.locked,
      doorsOpen: Object.values(room.doors).every(d => d.open), state: g.state };
  });

  await page.screenshot({ path: 'test-results/smoke-room-a.png' });
  console.log(`cleared ${result.foes} foes in ${result.seconds.toFixed(1)} s of game time`);
  expect(result.foes).toBe(3);
  expect(result.room).toEqual([0, -1]);
  expect(result.left).toBe(0);
  expect(result.cleared).toBe(true);
  expect(result.locked).toBe(false);
  expect(result.doorsOpen).toBe(true);
  expect(result.state).toBe('play');
  expect(errors).toEqual([]);
});
