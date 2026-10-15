import { expect, test } from '@playwright/test';
import { type GameHooks, type W, start, type G9 } from './helpers';

test('the pause menu sets the volumes, and the browser remembers them; positioned effects play without errors', async ({
  page,
}) => {
  const errors = await start(page, '?room=crypt_a&seed=VOL1&spells=arc');
  // a fight: hits, deaths and a spell, all panned to where they happen
  await page.evaluate(() => {
    const w = window as unknown as W,
      g = w.__game as unknown as G9;
    g.warp(1);
    g.cast(0, { x: 0, z: -1 });
    w.__fight(30);
  });
  await page.keyboard.press('Escape');
  await expect(page.locator('#scrPause')).toBeVisible();
  await page.locator('#volEffects').fill('40');
  await page.locator('#volInterface').fill('70');
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as W).__game, null, { timeout: 30_000 });
  expect(await page.locator('#volEffects').inputValue()).toBe('40');
  expect(await page.locator('#volInterface').inputValue()).toBe('70');
  expect(await page.locator('#volMaster').inputValue()).toBe('100');
  expect(errors).toEqual([]);
});

test('soundscapes and music: the floor and room choose them, the doors and the hearts the mood; the dev menu forces any; a stretch renders offline', async ({
  page,
}) => {
  const errors = await start(page, '?seed=SOUND1');
  type Info = {
    on: boolean;
    ambience: { scape: string | null; room: string | null; space: string } | null;
    music: { piece: string | null; mood: string } | null;
  };
  type GA = GameHooks & {
    audio: Info;
    audioOn(v?: boolean): void;
    forceAudio(f: unknown): void;
    renderAudio(a: unknown): Promise<{ peak: number; rms: number; seconds: number; wav: string }>;
  };
  const r = await page.evaluate(async () => {
    const g = (window as unknown as { __game: GA }).__game,
      out: Record<string, unknown> = {};
    out.offAtFirst = g.audio.on; // (the browser tests step the game by hand: silent unless asked)
    g.audioOn();
    g.sim(0.1);
    out.floor1 = { scape: g.audio.ambience?.scape, piece: g.audio.music?.piece, mood: g.audio.music?.mood };
    const hp = g.player.hp;
    g.player.hp = 1;
    g.sim(0.1);
    out.low = g.audio.music?.mood;
    g.player.hp = hp;
    g.sim(0.1);
    g.forceAudio({ floor: 4, room: 'library', piece: 'shore', mood: 'boss' });
    g.sim(0.1);
    out.forced = {
      scape: g.audio.ambience?.scape,
      room: g.audio.ambience?.room,
      space: g.audio.ambience?.space,
      piece: g.audio.music?.piece,
      mood: g.audio.music?.mood,
    };
    g.forceAudio(null);
    g.sim(0.1);
    out.back = g.audio.ambience?.scape;
    const amb = await g.renderAudio({ ambience: { floor: 1 }, seconds: 3 }),
      mus = await g.renderAudio({ music: { piece: 'burning', mood: 'fight' }, seconds: 3 });
    out.rendered = [amb.peak, mus.peak, amb.wav.length > 1000];
    return out;
  });
  expect(r.offAtFirst).toBe(false);
  expect(r.floor1).toEqual({ scape: 'ossuary', piece: 'ossuary', mood: 'explore' });
  expect(r.low).toBe('low'); // (under a heart the music thins to a heartbeat)
  expect(r.forced).toEqual({ scape: 'shore', room: 'library', space: '0.8|0.3', piece: 'shore', mood: 'boss' }); // (the library's dry space)
  expect(r.back).toBe('ossuary');
  const [ambPeak, musPeak, wrote] = r.rendered as [number, number, boolean];
  expect(ambPeak).toBeGreaterThan(0.01);
  expect(ambPeak).toBeLessThan(1);
  expect(musPeak).toBeGreaterThan(0.01);
  expect(wrote).toBe(true);
  expect(await page.locator('#volMusic').count()).toBe(1);
  expect(await page.locator('#volAmbience').count()).toBe(1);
  expect(errors).toEqual([]);
});
