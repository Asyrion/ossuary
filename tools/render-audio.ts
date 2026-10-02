/* Render the soundscapes and the music to files, to listen to outside the game (docs/sound-plan.md):
     npm run render-audio                 every floor's soundscape, the rooms', every piece in its moods, and a fight
     npm run render-audio -- ossuary      only what names it (a floor's id, a room, a piece)
   It drives the game's own players on an OfflineAudioContext in a browser (`__game.renderAudio`), so a server must be
   running (npm run dev; OSSUARY_URL points at another) and PW_CHROMIUM at a Chromium in a cloud session. Writes WAVs to
   audio-previews/, or MP3s when ffmpeg is there, and prints each one's peak and loudness. */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.OSSUARY_URL ?? 'http://localhost:5173/';
const OUT = 'audio-previews';
const FLOORS = ['ossuary', 'drowned', 'burning', 'reliquary', 'shore'];
type Ask = { ambience?: { floor: number; room?: string; theme?: string }; music?: { piece: string; mood: string; then?: { mood: string; at: number } }; seconds: number };

const jobs: [string, Ask][] = [
  ['music-title', { music: { piece: 'title', mood: 'title' }, seconds: 70 }],
  ...FLOORS.map((f, i): [string, Ask] => [`ambience-${i + 1}-${f}`, { ambience: { floor: i }, seconds: 45 }]),
  ['ambience-room-library', { ambience: { floor: 0, room: 'library' }, seconds: 30 }],
  ['ambience-room-shrine', { ambience: { floor: 1, room: 'shrine' }, seconds: 30 }],
  ['ambience-room-laboratory', { ambience: { floor: 0, room: 'laboratory' }, seconds: 30 }],
  ['ambience-room-merchant', { ambience: { floor: 2, room: 'merchant' }, seconds: 25 }],
  ['ambience-theme-garden', { ambience: { floor: 1, theme: 'garden' }, seconds: 25 }],
  ...FLOORS.flatMap((f, i): [string, Ask][] => [
    [`music-${i + 1}-${f}-explore`, { music: { piece: f, mood: 'explore' }, seconds: 60 }],
    [`music-${i + 1}-${f}-fight`, { music: { piece: f, mood: 'fight' }, seconds: 40 }],
    [`music-${i + 1}-${f}-boss`, { music: { piece: f, mood: 'boss' }, seconds: 35 }],
    [`together-${i + 1}-${f}`, { ambience: { floor: i }, music: { piece: f, mood: 'explore', then: { mood: 'fight', at: 30 } }, seconds: 60 }],
  ]),
  ['music-1-ossuary-low', { music: { piece: 'ossuary', mood: 'low' }, seconds: 20 }],
];

async function main() {
  const only = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const todo = only.length ? jobs.filter(([name]) => only.some(o => name.includes(o))) : jobs;
  mkdirSync(OUT, { recursive: true });
  let mp3 = true; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { mp3 = false; }
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.addInitScript('window.__manual = true');
  await page.goto(BASE + '?autolevel=skip');
  await page.waitForFunction(() => !!(window as unknown as { __game?: unknown }).__game, null, { timeout: 60_000 });
  console.log('name'.padEnd(34), 'seconds', ' peak', '  rms (dBFS)');
  for (const [name, ask] of todo) {
    const r = await page.evaluate(a => (window as unknown as { __game: { renderAudio(a: unknown): Promise<{ wav: string; peak: number; rms: number }> } }).__game.renderAudio(a), ask);
    const wavPath = join(OUT, name + '.wav'); writeFileSync(wavPath, Buffer.from(r.wav, 'base64'));
    if (mp3) { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wavPath, '-codec:a', 'libmp3lame', '-q:a', '3', join(OUT, name + '.mp3')]); unlinkSync(wavPath); }
    const db = (v: number) => (20 * Math.log10(Math.max(v, 1e-9))).toFixed(1).padStart(6);
    console.log(name.padEnd(34), String(ask.seconds).padStart(7), r.peak.toFixed(2).padStart(5), db(r.rms), r.peak >= 1 ? '  CLIPS' : '');
  }
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
