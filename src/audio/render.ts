/* Rendering the soundscapes and the music offline (docs/sound-plan.md), to listen to outside the game: the same players
   on an OfflineAudioContext, every event scheduled up front, written out as a WAV (`__game.renderAudio`, and
   tools/render-audio.ts, which saves them to audio-previews/). */
import { AmbienceMix } from './ambience';
import { MusicPlayer } from './music';
import type { Mood } from './musicData';
import { CFG } from '../config';

export interface RenderAsk {
  /** A floor's soundscape (0-based), with a room's over it; or a piece of music in a mood; or both at once. */
  ambience?: { floor: number; room?: string; theme?: string };
  music?: { piece: string; mood: Mood; then?: { mood: Mood; at: number } };
  seconds: number;
}
export interface Rendered { wav: ArrayBuffer; seconds: number; peak: number; rms: number }

/** The levels heard in the game at the default volumes (the master's .45, the buses' .8), raised for listening alone. */
const PREVIEW = .45 * .8 * 2.2;

export async function renderAudio(ask: RenderAsk, sampleRate = 44100): Promise<Rendered> {
  const ctx = new OfflineAudioContext(2, Math.ceil(ask.seconds * sampleRate), sampleRate);
  const out = ctx.createGain(); out.gain.value = PREVIEW; out.connect(ctx.destination);
  if (ask.ambience) {
    const mix = new AmbienceMix(ctx, out); mix.set(ask.ambience.floor, ask.ambience.room ?? 'normal', ask.ambience.theme, 0);
    if (ask.music) mix.duck(ask.music.mood === 'boss' ? CFG.audio.bossDuck : ask.music.mood === 'fight' ? CFG.audio.fightDuck : 1, 0);
    mix.pump(ask.seconds);
  }
  if (ask.music) {
    const m = new MusicPlayer(ctx, out); m.play(ask.music.piece, ask.music.mood, 0);
    if (ask.music.then) { m.pump(ask.music.then.at); m.mood(ask.music.then.mood, ask.music.then.at); }
    m.pump(ask.seconds);
  }
  const buf = await ctx.startRendering();
  let peak = 0, sum = 0; const n = buf.length;
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += v * v; } }
  return { wav: wav(buf), seconds: ask.seconds, peak, rms: Math.sqrt(sum / (2 * n)) };
}

/** A buffer as a 16-bit stereo WAV file. */
export function wav(buf: AudioBuffer): ArrayBuffer {
  const n = buf.length, ch = buf.numberOfChannels, out = new ArrayBuffer(44 + n * ch * 2), v = new DataView(out);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * ch * 2, true);
  v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44; for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return out;
}
