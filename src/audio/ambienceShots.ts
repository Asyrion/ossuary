/* The one-shots of the soundscapes (data/ambience.json; docs/archive/sound-plan.md): each built the way the real thing sounds,
   never quite the same twice. Each plays into `out` (a voice already placed in the room: panned, darkened by distance and
   sent to the space) at time `t`. */
import type { ShotKind } from './ambienceData';
import { Biquad, Rand, bell, choir, drum, noiseLoop, play, type Ctx, type NoiseColour } from './synth';

export interface ShotCall { ctx: Ctx; t: number; out: AudioNode; r: Rand; gain: number }

/** A burst of noise through a filter, with an attack and a decay (seconds). */
function burst(s: ShotCall, colour: NoiseColour, type: BiquadFilterType, freq: number, q: number, at: number, attack: number, decay: number, gain: number, freqTo?: number) {
  const { ctx } = s, t = s.t + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseLoop(ctx, colour); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
  if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + attack + decay);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * s.gain, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + attack + decay);
  src.connect(f).connect(g).connect(s.out); src.start(t, s.r.next() * 3); src.stop(t + attack + decay + .05);
  return g;
}
/** A sine (or other wave) gliding from `f0` to `f1`, dying away: a drip's plink, a bubble, a squeak. */
function glide(s: ShotCall, at: number, f0: number, f1: number, dur: number, gain: number, type: OscillatorType = 'sine', attack = .002) {
  const { ctx } = s, t = s.t + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * s.gain, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(s.out); o.start(t); o.stop(t + dur + .05);
}
/** A water bubble: a sine whose pitch rises as it dies (the real reason a drip "plinks"). */
const bubble = (s: ShotCall, at: number, f: number, life: number, gain: number) => glide(s, at, f, f * (1.4 + s.r.next() * .5), life, gain);
/** A buffer through a lowpass (muffled, under water, through rock). */
function muffled(s: ShotCall, buf: AudioBuffer, at: number, cut: number, gain: number, rate = 1, wobble = 0) {
  const { ctx } = s, t = s.t + at, lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut; lp.connect(s.out);
  const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf; src.playbackRate.value = rate; g.gain.value = gain * s.gain;
  if (wobble) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 3 + s.r.next() * 2; lg.gain.value = wobble; l.connect(lg).connect(src.detune); l.start(t); l.stop(t + buf.duration / rate); }
  src.connect(g).connect(lp); src.start(t); src.stop(t + buf.duration / rate + .05);
}

/** A creak: wood or a chain under load, sticking and slipping (a train of clicks whose rate wanders) through the
    resonance of the beam. Four of each kind rendered once and reused. */
const creaks = new WeakMap<Ctx, Map<string, AudioBuffer>>();
function creak(ctx: Ctx, low: number, n: number) {
  const m = creaks.get(ctx) ?? new Map<string, AudioBuffer>(); creaks.set(ctx, m);
  const key = `${low}|${n}`; let b = m.get(key); if (b) return b;
  const sr = ctx.sampleRate, r = new Rand(low * 7 + n), dur = 1 + r.next() * 1.5, len = Math.floor(sr * dur), d = new Float32Array(len);
  let t = 0, rate = r.range(14, 30);
  while (t < dur) {
    const k = t / dur, env = Math.sin(Math.PI * k) ** .7;
    const i = Math.floor(t * sr); if (i < len) d[i] += env * (.6 + r.next() * .4);
    rate = Math.max(8, Math.min(70, rate + r.range(-6, 7))); t += 1 / rate;
  }
  const out = new Float32Array(len), a = new Biquad(sr, 'bandpass', low, 7), c = new Biquad(sr, 'bandpass', low * 2.6, 6), h = new Biquad(sr, 'bandpass', low * 5.1, 5);
  for (let i = 0; i < len; i++) out[i] = a.tick(d[i]) * 1 + c.tick(d[i]) * .6 + h.tick(d[i]) * .3;
  let mx = 1e-9; for (const v of out) mx = Math.max(mx, Math.abs(v)); for (let i = 0; i < len; i++) out[i] *= .7 / mx;
  b = ctx.createBuffer(1, len, sr); b.copyToChannel(out, 0); m.set(key, b); return b;
}

/** Whispered syllables: breath through a mouth that changes shape every syllable. */
function whisperings(s: ShotCall, at: number, syllables: number, gain: number, low = 1) {
  const { ctx } = s; let t = s.t + at;
  for (let i = 0; i < syllables; i++) {
    const len = s.r.range(.08, .22), src = ctx.createBufferSource(), g = ctx.createGain(), sum = ctx.createGain(), hp = ctx.createBiquadFilter();
    src.buffer = noiseLoop(ctx, 'white'); hp.type = 'highpass'; hp.frequency.value = 900 * low;
    for (const [f, a] of [[s.r.range(300, 900) * low, 1], [s.r.range(1100, 2400) * low, .7], [s.r.range(2600, 3400) * low, .3]]) {
      const bp = ctx.createBiquadFilter(), gg = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 6; gg.gain.value = a; src.connect(bp).connect(gg).connect(sum);
    }
    if (s.r.chance(.3)) { const sh = ctx.createBiquadFilter(), gg = ctx.createGain(); sh.type = 'highpass'; sh.frequency.value = 4500; gg.gain.value = .6; src.connect(sh).connect(gg).connect(sum); } // (an "s")
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * s.gain, t + len * .3); g.gain.linearRampToValueAtTime(0, t + len);
    sum.connect(hp).connect(g).connect(s.out); src.start(t, s.r.next() * 3); src.stop(t + len + .02);
    t += len + s.r.range(.02, .12) + (s.r.chance(.15) ? s.r.range(.2, .5) : 0);
  }
}

/** Every one-shot, by its kind in data/ambience.json. */
export const SHOTS: Record<ShotKind, (s: ShotCall) => void> = {
  drip(s) {
    const f = s.r.range(1100, 2900);
    burst(s, 'white', 'highpass', 3000, .7, 0, .0005, .006, .25);
    bubble(s, .002, f, s.r.range(.03, .07), .9);
    if (s.r.chance(.35)) bubble(s, s.r.range(.12, .35), f * s.r.range(.8, 1.25), .035, .4);
  },
  bones(s) {
    let at = 0; const n = 3 + Math.floor(s.r.next() * 5);
    for (let i = 0; i < n; i++) {
      const v = (1 - i / n * .6) * s.r.range(.5, 1);
      burst(s, 'white', 'bandpass', s.r.range(1600, 3400), 5, at, .0005, .025, v * .9);
      glide(s, at, s.r.range(700, 1400), s.r.range(600, 1200), .03, v * .25, 'triangle');
      at += s.r.range(.03, .14) * (i > n - 3 ? 2 : 1);
    }
    if (s.r.chance(.4)) burst(s, 'pink', 'bandpass', 1200, 1.5, at, .02, .3, .25); // (a skull rolling to rest)
  },
  chant(s) {
    const roots = [38, 41, 43, 45], m = s.r.pick(roots), dur = s.r.range(4, 7);
    choir(s.ctx, s.out, [m, m + 7], s.t, dur, .5 * s.gain, 'o', 6, 1.6);
    if (s.r.chance(.6)) choir(s.ctx, s.out, [m + s.r.pick([2, -2, 3]), m + 7], s.t + dur - .8, s.r.range(3, 5), .45 * s.gain, 'u', 6, 1.4);
  },
  rats(s) {
    const n = 14 + Math.floor(s.r.next() * 26), span = s.r.range(.6, 1.4);
    for (let i = 0; i < n; i++) burst(s, 'white', 'highpass', s.r.range(3500, 7000), .8, i / n * span + s.r.range(0, .02), .0005, .004, s.r.range(.2, .6));
    for (let k = 0; k < 1 + Math.floor(s.r.next() * 2); k++) { const at = s.r.range(0, span), f = s.r.range(3200, 4400); glide(s, at, f, f * 1.25, .05, .12, 'sine', .01); glide(s, at + .05, f * 1.25, f * .85, .07, .1, 'sine', .005); }
  },
  chapelBell(s) { muffled(s, bell(s.ctx, s.r.pick([50, 52, 53]), 6), 0, 520, 1); if (s.r.chance(.5)) muffled(s, bell(s.ctx, 50, 6), s.r.range(2.6, 3.4), 520, .8); },
  bubbles(s) { let at = 0; const n = 4 + Math.floor(s.r.next() * 9); for (let i = 0; i < n; i++) { bubble(s, at, s.r.range(250, 900), s.r.range(.03, .09), s.r.range(.3, .7)); at += s.r.range(.04, .22); } },
  slosh(s) {
    const d = s.r.range(.7, 1.4); burst(s, 'brown', 'lowpass', 280, 1.2, 0, d * .4, d * .6, 1, 1100);
    burst(s, 'pink', 'bandpass', 900, 1, d * .3, d * .3, d * .5, .3, 500);
    for (let i = 0; i < 3; i++) bubble(s, d * s.r.range(.2, .9), s.r.range(300, 700), .05, .25);
  },
  underBell(s) { muffled(s, bell(s.ctx, s.r.pick([55, 57, 60, 62]), 5), 0, 750, .9, 1, 18); },
  stones(s) { const d = s.r.range(1, 2.2); burst(s, 'brown', 'lowpass', 240, .9, 0, d * .3, d * .7, 1); glide(s, 0, 48, 38, d, .2, 'sine', d * .3); for (let i = 0; i < 4; i++) burst(s, 'white', 'bandpass', s.r.range(900, 1800), 3, s.r.range(0, d), .001, .03, .2); },
  pages(s) {
    const d = s.r.range(.3, .8), src = burst(s, 'white', 'bandpass', s.r.range(2800, 5000), 1.4, 0, .02, d, .7);
    const lfo = s.ctx.createOscillator(), lg = s.ctx.createGain(); lfo.type = 'square'; lfo.frequency.value = s.r.range(11, 24); lg.gain.value = .5 * s.gain;
    lfo.connect(lg).connect(src.gain); lfo.start(s.t); lfo.stop(s.t + d + .05);
    burst(s, 'pink', 'bandpass', 1800, 1, d * .9, .01, .12, .4); // (the page laid down)
  },
  beam(s) { play(s.ctx, creak(s.ctx, s.r.pick([260, 320, 380]), Math.floor(s.r.next() * 4)), s.out, s.t, s.gain, s.r.range(.85, 1.1)); },
  ember(s) { burst(s, 'white', 'highpass', 1600, .8, 0, .0005, .015, .9); glide(s, 0, 140, 60, .05, .25); if (s.r.chance(.4)) burst(s, 'white', 'highpass', 2500, .8, s.r.range(.04, .15), .0005, .01, .5); },
  books(s) {
    let at = 0; for (let i = 0; i < 4 + Math.floor(s.r.next() * 4); i++) { play(s.ctx, drum(s.ctx, 'thump'), s.out, s.t + at, s.gain * s.r.range(.3, .7), s.r.range(1.3, 2.2)); burst(s, 'pink', 'bandpass', 2500, 1, at, .005, .1, .35); at += s.r.range(.06, .25); }
    burst(s, 'white', 'bandpass', 3500, 1, at, .05, .6, .2);
  },
  flare(s) { const d = s.r.range(1.5, 3); burst(s, 'brown', 'lowpass', 250, .9, 0, d * .4, d * .6, 1, 600); burst(s, 'pink', 'bandpass', 1200, 1, d * .2, d * .3, d * .5, .3); },
  chimes(s) { const scale = [84, 86, 88, 91, 93, 96]; let at = 0; for (let i = 0; i < 3 + Math.floor(s.r.next() * 4); i++) { play(s.ctx, bell(s.ctx, s.r.pick(scale), 2.5, .7), s.out, s.t + at, s.gain * s.r.range(.25, .6)); at += s.r.range(.08, .35); } },
  coins(s) { let at = 0, gap = s.r.range(.09, .14); for (let i = 0; i < 4 + Math.floor(s.r.next() * 8); i++) { play(s.ctx, bell(s.ctx, 96 + Math.floor(s.r.next() * 8), .45, 1), s.out, s.t + at, s.gain * .5 * (1 - i * .06)); at += gap; gap *= .82; } },
  censer(s) { play(s.ctx, creak(s.ctx, 620, Math.floor(s.r.next() * 4)), s.out, s.t, s.gain * .5, 1.2); for (let i = 0; i < 3; i++) play(s.ctx, bell(s.ctx, 100 + i, .3, 1), s.out, s.t + s.r.range(.2, 1), s.gain * .25); },
  highVoice(s) { choir(s.ctx, s.out, [s.r.pick([71, 74, 76, 79])], s.t, s.r.range(3, 5), .5 * s.gain, 'a', 4, 1.2); },
  wax(s) { bubble(s, 0, s.r.range(500, 900), .03, .3); burst(s, 'white', 'highpass', 6000, .7, .01, .005, .06, .2); },
  ferryBell(s) { const m = s.r.pick([45, 46, 48]); muffled(s, bell(s.ctx, m, 7), 0, 1400, 1); if (s.r.chance(.6)) muffled(s, bell(s.ctx, m, 7), s.r.range(3.2, 4), 1400, .7); },
  whispers(s) { whisperings(s, 0, 4 + Math.floor(s.r.next() * 8), .5); },
  boatCreak(s) { play(s.ctx, creak(s.ctx, s.r.pick([180, 220]), Math.floor(s.r.next() * 4)), s.out, s.t, s.gain * .8, s.r.range(.8, 1)); play(s.ctx, drum(s.ctx, 'thump'), s.out, s.t + s.r.range(.3, .9), s.gain * .25, .9); },
  oar(s) { burst(s, 'pink', 'bandpass', 1100, 1, 0, .15, .35, .8, 700); for (let i = 0; i < 5; i++) bubble(s, s.r.range(.2, 1.2), s.r.range(400, 1200), .04, .25); for (let i = 0; i < 4; i++) bubble(s, 1 + i * s.r.range(.15, .4), s.r.range(1200, 2400), .03, .2); },
  shingle(s) { const d = s.r.range(.5, 1.2); for (let i = 0; i < 18 + Math.floor(s.r.next() * 20); i++) { const k = s.r.next(); burst(s, 'white', 'bandpass', s.r.range(2000, 5000), 4, k * k * d, .0005, .008, (1 - k) * .6); } },
  pulse(s) { muffled(s, drum(s.ctx, 'heart'), 0, 160, 1); muffled(s, drum(s.ctx, 'heart'), .32, 160, .7); },
  bookThud(s) { play(s.ctx, drum(s.ctx, 'thump'), s.out, s.t, s.gain * .6, 1.8); burst(s, 'pink', 'bandpass', 2000, 1, 0, .005, .15, .3); },
  chime(s) { play(s.ctx, bell(s.ctx, s.r.pick([79, 81, 84, 86, 88]), 6, .4), s.out, s.t, s.gain * .6); },
  glass(s) { const m = 98 + Math.floor(s.r.next() * 8); play(s.ctx, bell(s.ctx, m, .7, 1), s.out, s.t, s.gain * .5); play(s.ctx, bell(s.ctx, m + 2, .7, 1), s.out, s.t + s.r.range(.05, .12), s.gain * .3); },
  gloop(s) { const f = s.r.range(90, 220); glide(s, 0, f, f * s.r.range(1.3, 1.8), s.r.range(.15, .3), .9, 'sine', .02); burst(s, 'brown', 'lowpass', 400, 1, 0, .02, .12, .3); },
  murmur(s) { whisperings(s, 0, 3 + Math.floor(s.r.next() * 5), .4, .7); choir(s.ctx, s.out, [s.r.pick([45, 47, 48])], s.t, s.r.range(1.5, 2.5), .18 * s.gain, 'm', 3, .4); },
  dust(s) { const d = s.r.range(1, 3); for (let i = 0; i < 30 + Math.floor(s.r.next() * 40); i++) { const k = s.r.next(); burst(s, 'white', 'bandpass', s.r.range(1500, 3500), 2, k * d, .0005, .004, Math.sin(Math.PI * k) * .35); } },
  rubble(s) { let at = 0; for (let i = 0; i < 3 + Math.floor(s.r.next() * 4); i++) { play(s.ctx, drum(s.ctx, 'thump'), s.out, s.t + at, s.gain * s.r.range(.3, .6), s.r.range(.9, 1.6)); burst(s, 'white', 'bandpass', s.r.range(1000, 2500), 3, at, .001, .05, .4); at += s.r.range(.08, .3); } },
  rustle(s) {
    const d = s.r.range(.8, 2), g = burst(s, 'white', 'bandpass', s.r.range(2500, 5000), .9, 0, d * .3, d * .7, .6);
    const lfo = s.ctx.createOscillator(), lg = s.ctx.createGain(); lfo.frequency.value = s.r.range(6, 14); lg.gain.value = .35 * s.gain; lfo.connect(lg).connect(g.gain); lfo.start(s.t); lfo.stop(s.t + d);
  },
  insect(s) { const f = s.r.range(4200, 6200); let at = 0; for (let k = 0; k < 2 + Math.floor(s.r.next() * 3); k++) { for (let i = 0; i < 4 + Math.floor(s.r.next() * 6); i++) { glide(s, at, f, f * .98, .025, .25, 'sine', .004); at += .035; } at += s.r.range(.2, .6); } },
  birds(s) { // (M7 step 3: birdsong at dawn: a few quick whistles, rising and falling, now and then a trill)
    const f = s.r.range(2400, 3600); let at = 0;
    for (let i = 0; i < 2 + Math.floor(s.r.next() * 4); i++) { const up = s.r.next() < .5; glide(s, at, up ? f : f * 1.35, up ? f * 1.4 : f * .9, s.r.range(.08, .16), .3, 'sine', .01); at += s.r.range(.12, .24); }
    if (s.r.next() < .4) for (let i = 0; i < 6; i++) glide(s, at + i * .04, f * 1.2, f * 1.1, .035, .18, 'sine', .004);
  },
  choirHum(s) { const m = s.r.pick([50, 52, 53]); choir(s.ctx, s.out, [m, m + 4, m + 7], s.t, s.r.range(5, 8), .4 * s.gain, 'm', 5, 2); },
};

