/* A short video of an animated creature (docs/creatures.md), to look at and listen to outside the game:
     npm run creature-preview -- owlbear
   It opens tools/creature-preview.html on the dev server (npm run dev; OSSUARY_URL points at another; PW_CHROMIUM at a
   Chromium in a cloud session), renders every frame of the scene (it rests, walks across, turns, roars, rests) and its
   sounds on the same timeline, and joins them with ffmpeg into creature-previews/<id>.mp4. */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.OSSUARY_URL ?? 'http://localhost:5173/';
async function main() {
  const id = process.argv.slice(2).find(a => !a.startsWith('-')) ?? 'owlbear', out = 'creature-previews', frames = join(out, `${id}-frames`);
  rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(`${BASE}tools/creature-preview.html?id=${id}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready, null, { timeout: 60_000 });
  type P = { preview: { frames: number; fps: number; seconds: number; frame(i: number): void; audio(): Promise<string> } };
  const { frames: n, fps, seconds } = await page.evaluate(() => { const p = (window as unknown as P).preview; return { frames: p.frames, fps: p.fps, seconds: p.seconds }; });
  const canvas = page.locator('canvas');
  for (let i = 0; i < n; i++) { await page.evaluate(i => (window as unknown as P).preview.frame(i), i); await canvas.screenshot({ path: join(frames, `${String(i).padStart(4, '0')}.png`) }); }
  writeFileSync(join(out, `${id}.wav`), Buffer.from(await page.evaluate(() => (window as unknown as P).preview.audio()), 'base64'));
  await browser.close();
  const video = join(out, `${id}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(frames, '%04d.png'), '-i', join(out, `${id}.wav`), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-c:a', 'aac', '-b:a', '160k', '-shortest', video]);
  console.log(`${id}: ${n} frames, ${seconds.toFixed(1)} s -> ${video}`);
}
main().catch(e => { console.error(e); process.exit(1); });
