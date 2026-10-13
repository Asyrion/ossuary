/* The music played (docs/archive/sound-plan.md): a piece from data/music.json, composed a bar at a time by `planBar` and
   performed on the instruments of synth.ts, its four stems (drone, harmony, melody, pulse) each at the level its mood
   asks. Works on any audio context (live under the music bus, or offline for a preview); bars are scheduled a little ahead
   (`pump`), and a new piece or mood comes in on the next bar, the stems crossfading. */
import {
  MODES,
  MOOD_GAINS,
  STEMS,
  barSeconds,
  newComposer,
  pieceById,
  planBar,
  stepSemis,
  type ComposerState,
  type Mood,
  type Note,
  type Piece,
  type Stem,
} from './musicData';
import { SpaceNode } from './ambience';
import { Rand, bell, bowed, choir, drone, drum, play, pluck, type Ctx, type DrumKind, type Held } from './synth';
import type { Space } from './ambienceData';
import { CFG } from '../config';

interface Playing {
  piece: Piece;
  out: GainNode;
  stems: Record<Stem, GainNode>;
  drone: Held;
  st: ComposerState;
  bar: number;
  next: number;
}

export class MusicPlayer {
  readonly out: GainNode;
  private tone: BiquadFilterNode;
  readonly space: SpaceNode;
  private send: GainNode;
  private cur: Playing | null = null;
  private moodV: Mood = 'quiet';
  private r = new Rand(2026);
  private muffled = false;
  constructor(
    private ctx: Ctx,
    dest: AudioNode,
  ) {
    this.out = ctx.createGain();
    this.out.gain.value = CFG.audio.music.level;
    this.tone = ctx.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.frequency.value = 18000;
    const glue = ctx.createDynamicsCompressor(),
      G = CFG.audio.music.glue; // (holds the boss's full stems under the effects)
    glue.threshold.value = G.threshold;
    glue.ratio.value = G.ratio;
    glue.knee.value = G.knee;
    glue.attack.value = G.attack;
    glue.release.value = G.release;
    this.out.connect(this.tone).connect(glue).connect(dest);
    this.space = new SpaceNode(ctx, this.tone, 0.8);
    this.space.set({ seconds: 2.6, bright: 0.45 }, 0, 0.01);
    this.send = ctx.createGain();
    this.send.gain.value = CFG.audio.music.send;
    this.out.connect(this.send).connect(this.space.input);
  }
  get piece() {
    return this.cur?.piece.id ?? null;
  }
  get bar() {
    return this.cur?.bar ?? 0;
  }
  /** Play `id` in `mood` (the same piece only changes the mood). */
  play(id: string, mood: Mood, t = this.ctx.currentTime) {
    if (this.cur?.piece.id === id) {
      this.mood(mood, t);
      return;
    }
    const piece = pieceById(id);
    if (!piece) return;
    const start = this.cur ? Math.max(t, Math.min(this.cur.next, t + 2)) : t + 0.05; // (the next bar of the old, at most two seconds off)
    if (this.cur) this.fadeOut(this.cur, start, 2.5);
    const out = this.ctx.createGain();
    out.connect(this.out);
    out.gain.setValueAtTime(0, start);
    out.gain.setTargetAtTime(1, start, 0.7);
    const stems = Object.fromEntries(
      STEMS.map((s) => {
        const g = this.ctx.createGain();
        g.gain.value = 0;
        g.connect(out);
        return [s, g];
      }),
    ) as Record<Stem, GainNode>;
    const d = drone(
      this.ctx,
      stems.drone,
      piece.drone.voice,
      piece.drone.notes.map((n) => piece.root + n),
      start,
      piece.drone.gain,
    );
    this.cur = { piece, out, stems, drone: d, st: newComposer(piece), bar: 0, next: start };
    this.moodV = mood;
    this.levels(mood, start, 0.01);
  }
  /** Change the mood: the stems fade to its levels, the composer writes the next bars for it; under one heart and when
      paused the music is muffled too. */
  mood(m: Mood, t = this.ctx.currentTime) {
    if (m === this.moodV) return;
    this.moodV = m;
    this.levels(m, t, m === 'boss' || m === 'fight' ? 1.2 : 2.5);
  }
  /** Muffle the music (the pause menu): a lowpass closing over it. */
  muffle(on: boolean, t = this.ctx.currentTime) {
    if (on === this.muffled) return;
    this.muffled = on;
    this.tone.frequency.cancelScheduledValues(t);
    this.tone.frequency.setTargetAtTime(on ? CFG.audio.music.muffle : 18000, t, 0.25);
  }
  setSpace(sp: Space, t = this.ctx.currentTime) {
    this.space.set({ seconds: Math.round(Math.max(1.6, sp.seconds * 0.9) * 10) / 10, bright: sp.bright }, t, 2);
  }
  stop(t = this.ctx.currentTime, fade = 2.5) {
    if (this.cur) this.fadeOut(this.cur, t, fade);
    this.cur = null;
    this.moodV = 'quiet';
  }
  private levels(m: Mood, t: number, ramp: number) {
    if (!this.cur) return;
    for (const s of STEMS) {
      const g = this.cur.stems[s].gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(MOOD_GAINS[m][s], t, ramp / 3);
    } // (from wherever it is: a fade under way included)
  }
  private fadeOut(p: Playing, t: number, fade: number) {
    p.out.gain.cancelScheduledValues(t);
    p.out.gain.setTargetAtTime(0, t, fade / 4);
    p.drone.stop(t, fade);
    setTimeout(() => p.out.disconnect(), (fade + 6) * 1000);
  }
  /** Write and schedule the bars that begin before `until`. */
  pump(until: number) {
    const p = this.cur;
    if (!p) return;
    const bs = barSeconds(p.piece),
      beat = bs / p.piece.beats;
    while (p.next < until) {
      for (const n of planBar(p.piece, p.bar, this.moodV, p.st, () => this.r.next()))
        this.note(p, n, p.next + n.at * beat, n.dur * beat);
      p.bar++;
      p.next += bs;
    }
  }
  /** A stinger in the piece's key: the room cleared (a cadence struck on bells or strings), or death (a falling phrase). */
  stinger(kind: 'cleared' | 'death', t = this.ctx.currentTime) {
    const p = this.cur?.piece;
    if (!p) return;
    const root = p.root + 12,
      out = this.out;
    if (kind === 'cleared') {
      const tri = [0, 7, 12, 12 + MODES[p.mode][2]]; // (root, fifth, octave, the mode's third above)
      tri.forEach((n, i) =>
        play(
          this.ctx,
          p.melody.voices.includes('bell')
            ? bell(this.ctx, root + n + 12, 3, 0.4)
            : pluck(this.ctx, root + n, 0.45, 3, 0.4),
          out,
          t + i * 0.11,
          0.28,
        ),
      );
      play(this.ctx, bell(this.ctx, root, 4, 0.2), out, t + 0.45, 0.18);
    } else {
      [7, 6, 4, 3, 1, 0].forEach((s, i) =>
        bowed(this.ctx, out, root + stepSemis(MODES[p.mode], s), t + i * 0.38, i === 5 ? 1.6 : 0.5, 0.45, 0.3),
      );
      play(this.ctx, drum(this.ctx, 'taiko'), out, t + 2.3, 0.5, 0.8);
    }
  }
  private note(p: Playing, n: Note, t: number, dur: number) {
    const out = p.stems[n.stem],
      P = p.piece;
    if (n.stem === 'harmony') {
      const g = P.harmony.gain * n.vel;
      if (P.harmony.voice === 'choir')
        choir(
          this.ctx,
          out,
          n.midi,
          t,
          dur + 0.6,
          g,
          P.harmony.vowel ?? 'a',
          P.harmony.spread ?? 8,
          Math.min(2, dur * 0.3),
        );
      else if (P.harmony.voice === 'organ') {
        const h = drone(this.ctx, out, 'organ', n.midi, t, g * 0.8);
        h.stop(t + dur, 1.5);
      } else for (const m of n.midi) bowed(this.ctx, out, m, t, dur, g * 0.7, 0.25);
      return;
    }
    if (n.stem === 'pulse') {
      if (n.voice === 'bass-pluck') play(this.ctx, pluck(this.ctx, n.midi[0], 0.35, 2.5, 0.6), out, t, 0.8 * n.vel);
      else if (n.voice === 'bass-bowed') bowed(this.ctx, out, n.midi[0], t, dur, 1.1 * n.vel, 0.15);
      else
        play(
          this.ctx,
          drum(this.ctx, n.voice as DrumKind),
          out,
          t,
          0.55 * n.vel * (n.voice === 'heart' ? 1.4 : 1),
          1 + (this.r.next() - 0.5) * 0.04,
        );
      return;
    }
    if (n.voice === 'bell' && n.stem === 'drone') {
      play(this.ctx, bell(this.ctx, n.midi[0], 7), out, t, P.bell?.gain ?? 0.4);
      return;
    }
    const m = n.midi[0],
      g = P.melody.gain * n.vel;
    switch (n.voice) {
      case 'lyre':
        play(this.ctx, pluck(this.ctx, m, 0.55, 2.6, 0.5), out, t, g);
        break;
      case 'harp':
        play(this.ctx, pluck(this.ctx, m, 0.35, 4, 0.2), out, t, g);
        break;
      case 'oud':
        play(this.ctx, pluck(this.ctx, m, 0.8, 1.6, 1), out, t, g);
        break;
      case 'pluckLow':
        play(this.ctx, pluck(this.ctx, m - 12, 0.3, 3.5, 0.7), out, t, g * 1.1);
        break;
      case 'bowed':
        bowed(this.ctx, out, m, t, Math.max(0.25, dur * 0.95), g * 1.3, 0.45);
        break;
      case 'bell':
        play(this.ctx, bell(this.ctx, m + 12, 3, 0.5), out, t, g * 0.7);
        break;
      case 'underbell':
        this.under(bell(this.ctx, m + 12, 3.5, 0.3), out, t, g * 0.8);
        break;
      case 'voice':
        choir(this.ctx, out, [m], t, Math.max(0.8, dur + 0.3), g * 0.9, 'u', 4, Math.min(0.6, dur * 0.4));
        break;
    }
  }
  /** A bell heard through water: muffled, its pitch wavering. */
  private under(buf: AudioBuffer, out: AudioNode, t: number, gain: number) {
    const s = this.ctx.createBufferSource(),
      lp = this.ctx.createBiquadFilter(),
      g = this.ctx.createGain(),
      l = this.ctx.createOscillator(),
      lg = this.ctx.createGain();
    s.buffer = buf;
    lp.type = 'lowpass';
    lp.frequency.value = 1300;
    g.gain.value = gain;
    l.frequency.value = 3.2;
    lg.gain.value = 16;
    l.connect(lg).connect(s.detune);
    s.connect(lp).connect(g).connect(out);
    s.start(t);
    l.start(t);
    s.stop(t + buf.duration);
    l.stop(t + buf.duration);
  }
  get info() {
    return { piece: this.piece, mood: this.moodV, bar: this.bar, space: this.space.space };
  }
}
