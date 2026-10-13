/* The instruments of the soundscapes and the music (docs/archive/sound-plan.md): every sound built the way the real thing makes
   its sound, on any audio context, so the same code plays live and renders offline (`render.ts`). Struck and plucked
   things (strings, bells, drums) are rendered into buffers once per note and reused; the beds are loops made in a ring
   (`ring`), so they never click where they join; held things (drones, the choir) are live oscillators and filters. */

export type Ctx = BaseAudioContext;

/** A small seeded random stream (mulberry32): the soundscapes' and the composer's, apart from the run's streams. */
export class Rand {
  private s: number;
  constructor(seed = 1) {
    this.s = seed >>> 0 || 1;
  }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number) {
    return a + (b - a) * this.next();
  }
  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)];
  }
  chance(p: number) {
    return this.next() < p;
  }
  /** A wait drawn so that events come `every` seconds on average, never closer than a third of it. */
  wait(every: number) {
    return every * (0.33 + -Math.log(1 - this.next() * 0.999) * 0.67);
  }
}

export const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/* ---------- filters in plain JS, for what is rendered into buffers ---------- */

/** An RBJ biquad run over samples in place (for rendering buffers; live sound uses BiquadFilterNode). */
export class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;
  constructor(
    private sr: number,
    type: 'lowpass' | 'highpass' | 'bandpass' | 'peak',
    freq: number,
    q = 0.707,
    gainDb = 0,
  ) {
    this.set(type, freq, q, gainDb);
  }
  set(type: 'lowpass' | 'highpass' | 'bandpass' | 'peak', freq: number, q = 0.707, gainDb = 0) {
    const w = (2 * Math.PI * Math.min(freq, this.sr * 0.45)) / this.sr,
      cs = Math.cos(w),
      al = Math.sin(w) / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lowpass') {
      b0 = (1 - cs) / 2;
      b1 = 1 - cs;
      b2 = b0;
      a0 = 1 + al;
      a1 = -2 * cs;
      a2 = 1 - al;
    } else if (type === 'highpass') {
      b0 = (1 + cs) / 2;
      b1 = -(1 + cs);
      b2 = b0;
      a0 = 1 + al;
      a1 = -2 * cs;
      a2 = 1 - al;
    } else if (type === 'bandpass') {
      b0 = al;
      b1 = 0;
      b2 = -al;
      a0 = 1 + al;
      a1 = -2 * cs;
      a2 = 1 - al;
    } else {
      const A = 10 ** (gainDb / 40);
      b0 = 1 + al * A;
      b1 = -2 * cs;
      b2 = 1 - al * A;
      a0 = 1 + al / A;
      a1 = -2 * cs;
      a2 = 1 - al / A;
    }
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }
  tick(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
  run(d: Float32Array) {
    for (let i = 0; i < d.length; i++) d[i] = this.tick(d[i]);
    return d;
  }
}

/** Fold a sound made `fade` samples longer than its loop back onto its start, so the loop joins without a click. */
export function ring(d: Float32Array, len: number) {
  const fade = d.length - len,
    out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = d[i];
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    out[i] = d[i] * k + d[len + i] * (1 - k);
  }
  return out;
}
/** Scale a buffer's channels so its loudest sample is `peak`. */
function normalise(chs: Float32Array[], peak = 0.9) {
  let m = 1e-9;
  for (const c of chs) for (let i = 0; i < c.length; i++) m = Math.max(m, Math.abs(c[i]));
  for (const c of chs) for (let i = 0; i < c.length; i++) c[i] *= peak / m;
}
function toBuffer(ctx: Ctx, chs: Float32Array[]) {
  const b = ctx.createBuffer(chs.length, chs[0].length, ctx.sampleRate);
  chs.forEach((c, i) => b.copyToChannel(c as Float32Array<ArrayBuffer>, i));
  return b;
}

/* ---------- noise ---------- */

export type NoiseColour = 'white' | 'pink' | 'brown';
const noiseCache = new WeakMap<Ctx, Record<string, AudioBuffer>>();
/** Four seconds of noise in a colour, a loop in stereo (each side its own), cached per context. */
export function noiseLoop(ctx: Ctx, colour: NoiseColour): AudioBuffer {
  const cache = noiseCache.get(ctx) ?? {};
  noiseCache.set(ctx, cache);
  if (cache[colour]) return cache[colour];
  const sr = ctx.sampleRate,
    len = sr * 4,
    fade = sr >> 3,
    r = new Rand(colour.length * 977);
  const side = () => {
    const d = new Float32Array(len + fade);
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0,
      br = 0;
    for (let i = 0; i < d.length; i++) {
      const w = r.next() * 2 - 1;
      if (colour === 'white') d[i] = w;
      else if (colour === 'pink') {
        // (Paul Kellet's refined pink)
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        br = (br + 0.02 * w) / 1.02;
        d[i] = br * 3.5;
      }
    }
    return ring(d, len);
  };
  const chs = [side(), side()];
  normalise(chs, 0.8);
  return (cache[colour] = toBuffer(ctx, chs));
}

/** A source playing a loop, started at `t`. */
export function loopSource(ctx: Ctx, buf: AudioBuffer, t: number, offset = 0) {
  const s = ctx.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.start(t, offset % buf.duration);
  return s;
}

/* ---------- the space ---------- */

/** A floor's or a room's space: a reverb made from a burst of noise dying over `seconds` and darkening as it dies
    (`bright` 0 to 1: how much high end the first moment keeps). */
export function spaceImpulse(ctx: Ctx, seconds: number, bright: number, seed = 7): AudioBuffer {
  const sr = ctx.sampleRate,
    len = Math.max(1, Math.floor(sr * Math.min(6, seconds * 1.2))),
    r = new Rand(seed);
  const chs = [0, 1].map(() => {
    const d = new Float32Array(len);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr,
        k = Math.exp((-6.9 * t) / seconds);
      const cut = (0.05 + bright * 0.9) * Math.exp(-t * (2.5 - bright * 1.5)) + 0.02; // (the one-pole's coefficient: dark later)
      lp += (r.next() * 2 - 1 - lp) * Math.min(1, cut);
      d[i] = lp * k * (i < sr * 0.004 ? i / (sr * 0.004) : 1); // (a soft start)
    }
    return d;
  });
  normalise(chs, 0.5);
  return toBuffer(ctx, chs);
}

/* ---------- struck and plucked things, rendered once per note ---------- */

const noteCache = new WeakMap<Ctx, Map<string, AudioBuffer>>();
function cached(ctx: Ctx, key: string, make: () => AudioBuffer) {
  const m = noteCache.get(ctx) ?? new Map<string, AudioBuffer>();
  noteCache.set(ctx, m);
  let b = m.get(key);
  if (!b) m.set(key, (b = make()));
  return b;
}

/** A plucked string (Karplus-Strong): a burst of noise in a delay line one period long, losing its brightness on every
    pass. `bright` 0 to 1 (a soft finger to a quill), `ring` seconds to fall 60 dB, `body` a resonance of the wood. */
export function pluck(ctx: Ctx, midi: number, bright = 0.5, ringS = 2.5, body = 0) {
  return cached(ctx, `p${midi}|${bright}|${ringS}|${body}`, () => {
    const sr = ctx.sampleRate,
      f = midiHz(midi),
      period = sr / f,
      damp = 0.5 + bright * 0.45,
      lag = 1 - damp; // (the two-tap filter's own delay)
    let n = Math.floor(period - lag),
      frac = period - lag - n;
    if (frac < 0.1 && n > 2) {
      n--;
      frac++;
    }
    const len = Math.floor(sr * Math.min(5, ringS * 1.1)),
      out = new Float32Array(len),
      line = new Float32Array(n),
      r = new Rand(midi * 31 + 5);
    let lp = 0;
    const soft = 0.15 + bright * 0.8;
    for (let i = 0; i < n; i++) {
      lp += (r.next() * 2 - 1 - lp) * soft;
      line[i] = lp;
    }
    const g = 10 ** (-3 / (ringS * f)),
      c = (1 - frac) / (1 + frac); // (the loss each pass; an allpass for the part-sample, so it is in tune)
    let p = 0,
      x1 = 0,
      y1 = 0;
    for (let i = 0; i < len; i++) {
      const a = line[p],
        b = line[(p + 1) % n],
        x = (a * damp + b * (1 - damp)) * g;
      const y = c * x + x1 - c * y1;
      x1 = x;
      y1 = y;
      line[p] = y;
      out[i] = a;
      p = (p + 1) % n;
    }
    if (body) new Biquad(sr, 'peak', 180 + body * 300, 1.2, 6).run(out);
    const att = Math.floor(sr * 0.002);
    for (let i = 0; i < att; i++) out[i] *= i / att;
    normalise([out], 0.7);
    return toBuffer(ctx, [out]);
  });
}

/** A struck bell: inharmonic partials, each dying at its own rate, the higher sooner (`ring` seconds for the hum).
    `glass` thins it to the upper partials: a chime or a goblet. */
export function bell(ctx: Ctx, midi: number, ringS = 4, glass = 0) {
  return cached(ctx, `b${midi}|${ringS}|${glass}`, () => {
    const sr = ctx.sampleRate,
      f = midiHz(midi),
      len = Math.floor(sr * Math.min(8, ringS * 1.2)),
      out = new Float32Array(len);
    const parts = [
      [0.5, 0.55, 1],
      [1, 1, 0.8],
      [1.183, 0.45, 0.7],
      [1.506, 0.6, 0.55],
      [2, 0.45, 0.45],
      [2.514, 0.3, 0.35],
      [2.662, 0.3, 0.3],
      [3.011, 0.2, 0.25],
      [4.166, 0.15, 0.18],
      [5.433, 0.1, 0.12],
      [6.796, 0.06, 0.09],
    ];
    for (const [ratio, amp0, life] of parts) {
      const amp = amp0 * (ratio < 1.1 ? 1 - glass : 1 + glass),
        fr = f * ratio;
      if (fr > sr * 0.45 || amp <= 0) continue;
      const dk = 6.9 / (ringS * life),
        w = (2 * Math.PI * fr) / sr,
        ph = ratio * 1.7;
      for (let i = 0; i < len; i++) out[i] += amp * Math.sin(w * i + ph) * Math.exp((-dk * i) / sr);
    }
    const strike = Math.floor(sr * 0.003);
    const r = new Rand(midi);
    for (let i = 0; i < strike * 4; i++) out[i] += (r.next() * 2 - 1) * 0.3 * Math.exp(-i / strike); // (the clapper)
    for (let i = 0; i < 64; i++) out[i] *= i / 64;
    normalise([out], 0.7);
    return toBuffer(ctx, [out]);
  });
}

export type DrumKind = 'frame' | 'taiko' | 'hand' | 'timpani' | 'heart' | 'thump';
/** A drum: a skin struck, a falling thump and a slap of noise. */
export function drum(ctx: Ctx, kind: DrumKind) {
  return cached(ctx, `d${kind}`, () => {
    const sr = ctx.sampleRate;
    const P = {
      frame: { f0: 140, f1: 70, drop: 0.05, life: 0.45, slap: 0.35, slapF: 1800, len: 0.7 },
      taiko: { f0: 95, f1: 48, drop: 0.08, life: 1.1, slap: 0.25, slapF: 900, len: 1.4 },
      hand: { f0: 260, f1: 180, drop: 0.02, life: 0.22, slap: 0.5, slapF: 3000, len: 0.4 },
      timpani: { f0: 110, f1: 98, drop: 0.2, life: 1.6, slap: 0.12, slapF: 700, len: 2 },
      heart: { f0: 70, f1: 42, drop: 0.06, life: 0.2, slap: 0.05, slapF: 300, len: 0.35 },
      thump: { f0: 60, f1: 30, drop: 0.1, life: 0.5, slap: 0.3, slapF: 400, len: 0.8 },
    }[kind];
    const len = Math.floor(sr * P.len),
      out = new Float32Array(len),
      r = new Rand(kind.length * 13);
    let ph = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr,
        f = P.f1 + (P.f0 - P.f1) * Math.exp(-t / P.drop);
      ph += (2 * Math.PI * f) / sr;
      out[i] = Math.sin(ph) * Math.exp(-t / (P.life / 3)) + Math.sin(ph * 1.6) * 0.25 * Math.exp(-t / (P.life / 8));
    }
    const slap = new Float32Array(len);
    for (let i = 0; i < len; i++) slap[i] = (r.next() * 2 - 1) * Math.exp(-i / (sr * 0.012));
    new Biquad(sr, 'bandpass', P.slapF, 0.9).run(slap);
    for (let i = 0; i < len; i++) out[i] += slap[i] * P.slap * 3;
    for (let i = 0; i < 32; i++) out[i] *= i / 32;
    normalise([out], 0.8);
    return toBuffer(ctx, [out]);
  });
}

/** Play a rendered buffer at `t` into `out` at `gain`, at `rate` (pitch). */
export function play(ctx: Ctx, buf: AudioBuffer, out: AudioNode, t: number, gain: number, rate = 1) {
  const s = ctx.createBufferSource(),
    g = ctx.createGain();
  s.buffer = buf;
  s.playbackRate.value = rate;
  g.gain.value = gain;
  s.connect(g).connect(out);
  s.start(t);
  s.stop(t + buf.duration / rate + 0.05);
  return g;
}

/* ---------- loops made in a ring ---------- */

const loopCache = new WeakMap<Ctx, Map<string, AudioBuffer>>();
function loopCached(ctx: Ctx, key: string, make: () => AudioBuffer) {
  const m = loopCache.get(ctx) ?? new Map<string, AudioBuffer>();
  loopCache.set(ctx, m);
  let b = m.get(key);
  if (!b) m.set(key, (b = make()));
  return b;
}
/** Add an event into a loop of `len` samples at `at`, wrapping round its end. */
function addRing(d: Float32Array, at: number, ev: Float32Array, gain: number) {
  for (let i = 0; i < ev.length; i++) d[(at + i) % d.length] += ev[i] * gain;
}

/** A stream: hundreds of bubbles a second (a sine rising in pitch as it dies), over a hiss of moving water.
    `rate` bubbles a second; `lo`..`hi` their pitch; `thick` slows them (jelly, a vat). */
export function streamLoop(ctx: Ctx, rate: number, lo: number, hi: number, thick = 0, seconds = 8) {
  return loopCached(ctx, `s${rate}|${lo}|${hi}|${thick}|${seconds}`, () => {
    const sr = ctx.sampleRate,
      len = Math.floor(sr * seconds),
      r = new Rand(rate + lo);
    const chs = [0, 1].map(() => {
      const d = new Float32Array(len),
        n = Math.floor(rate * seconds);
      for (let k = 0; k < n; k++) {
        const f = lo * (hi / lo) ** (r.next() ** 1.6),
          life = (0.004 + r.next() * 0.02) * (1 + thick * 6) * (500 / f) ** 0.5;
        const m = Math.floor(sr * life * 4),
          ev = new Float32Array(m),
          rise = 1.5 + r.next() * 3 * (1 - thick * 0.6);
        let ph = 0;
        for (let i = 0; i < m; i++) {
          const t = i / sr;
          ph += (2 * Math.PI * f * (1 + ((rise * t) / life) * 0.1)) / sr;
          ev[i] = Math.sin(ph) * Math.exp(-t / life) * (i < 8 ? i / 8 : 1);
        }
        addRing(d, Math.floor(r.next() * len), ev, (0.2 + r.next() ** 3) * (thick ? 1 : 0.6));
      }
      const hissD = new Float32Array(len);
      for (let i = 0; i < len; i++) hissD[i] = r.next() * 2 - 1;
      const bp = new Biquad(sr, 'bandpass', (lo + hi) / 3, 0.6);
      for (let i = 0; i < len; i++) d[i] += bp.tick(hissD[i]) * 0.25;
      return d;
    });
    normalise(chs, 0.7);
    return toBuffer(ctx, chs);
  });
}

/** Fire's crackle: clicks of every size in clusters, as wood splits and sap bursts. `rate` clusters a second. */
export function crackleLoop(ctx: Ctx, rate: number, seconds = 7) {
  return loopCached(ctx, `c${rate}|${seconds}`, () => {
    const sr = ctx.sampleRate,
      len = Math.floor(sr * seconds),
      r = new Rand(rate * 7 + 3);
    const chs = [0, 1].map(() => {
      const d = new Float32Array(len),
        n = Math.floor(rate * seconds);
      for (let k = 0; k < n; k++) {
        const at = Math.floor(r.next() * len),
          clicks = 1 + Math.floor(r.next() ** 2 * 7);
        for (let c = 0; c < clicks; c++) {
          const m = Math.floor(sr * (0.0008 + r.next() * 0.004)),
            ev = new Float32Array(m);
          for (let i = 0; i < m; i++) ev[i] = (r.next() * 2 - 1) * Math.exp(-i / (m / 3));
          addRing(d, at + Math.floor(r.next() * sr * 0.06), ev, r.next() ** 2.5 * 1.2);
        }
      }
      new Biquad(sr, 'highpass', 900, 0.7).run(d);
      return d;
    });
    normalise(chs, 0.8);
    return toBuffer(ctx, chs);
  });
}

/** Waves on a shingle shore: each comes in (the water swelling, its brightness rising) and draws back (the stones
    rattling as it goes), `period` seconds apart, a few to a loop so no two are the same. */
export function shoreLoop(ctx: Ctx, period: number, waves = 4) {
  return loopCached(ctx, `w${period}|${waves}`, () => {
    const sr = ctx.sampleRate,
      r = new Rand(Math.floor(period * 100));
    const spans = Array.from({ length: waves }, () => period * r.range(0.75, 1.3)),
      seconds = spans.reduce((a, b) => a + b, 0);
    const len = Math.floor(sr * seconds),
      fade = sr >> 1;
    const chs = [0, 1].map((side) => {
      const d = new Float32Array(len + fade),
        lp = new Biquad(sr, 'lowpass', 400, 0.8),
        hp = new Biquad(sr, 'highpass', 2500, 0.7);
      let at = 0;
      for (const span of spans) {
        const n = Math.floor(span * sr),
          peak = r.range(0.6, 1),
          inT = r.range(0.3, 0.45),
          off = side ? r.range(0.0, 0.08) : 0;
        for (let i = 0; i < n && at + i < d.length; i++) {
          const k = i / n - off,
            swell = k < inT ? Math.sin(((Math.PI / 2) * Math.max(0, k)) / inT) : Math.exp(-(k - inT) * 5);
          if ((i & 63) === 0) lp.set('lowpass', 200 + 1600 * swell * peak, 0.8);
          const w = r.next() * 2 - 1,
            back = k > inT ? Math.exp(-(k - inT) * 3) * (k - inT < 0.4 ? (k - inT) / 0.4 : 1) : 0;
          const rattle = r.next() < 0.02 + back * 0.2 ? (r.next() * 2 - 1) * 3 : 0; // (stones knocking as the water draws back)
          d[at + i] += lp.tick(w) * swell * peak * 1.2 + hp.tick(rattle) * back * 0.5;
        }
        at += n;
      }
      return ring(d, len);
    });
    normalise(chs, 0.8);
    return toBuffer(ctx, chs);
  });
}

/* ---------- held things: live oscillators and filters ---------- */

/** A note held by a voice that `stop`s itself: returned so the caller can end it early. */
export interface Held {
  stop(t: number, release?: number): void;
}

/** The formants of a vowel (Hz, gain): the shape of the mouth a choir sings through. */
export const VOWELS = {
  a: [
    [800, 1],
    [1150, 0.5],
    [2900, 0.12],
  ],
  o: [
    [450, 1],
    [800, 0.4],
    [2830, 0.08],
  ],
  u: [
    [325, 1],
    [700, 0.25],
    [2530, 0.05],
  ],
  e: [
    [400, 1],
    [1700, 0.3],
    [2600, 0.15],
  ],
  m: [
    [250, 1],
    [500, 0.2],
    [2000, 0.02],
  ],
} as const;
export type Vowel = keyof typeof VOWELS;

/** A choir singing `midis` together from `t` for `dur` seconds: each note three voices a little out of tune with each
    other, buzzing through one mouth (the vowel's formants); `breath` adds air. */
export function choir(
  ctx: Ctx,
  out: AudioNode,
  midis: readonly number[],
  t: number,
  dur: number,
  gain: number,
  vowel: Vowel = 'a',
  spread = 9,
  attack = 1.2,
): Held {
  const mouth = ctx.createGain(),
    env = ctx.createGain();
  mouth.gain.value = 1;
  const oscs: OscillatorNode[] = [],
    vib = ctx.createOscillator(),
    vibG = ctx.createGain();
  vib.frequency.value = 4.6 + Math.random() * 0.8;
  vibG.gain.value = 9;
  vib.connect(vibG);
  vib.start(t);
  for (const m of midis)
    for (let v = 0; v < 3; v++) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midiHz(m);
      o.detune.value = (v - 1) * spread + (Math.random() - 0.5) * 4;
      vibG.connect(o.detune);
      const g = ctx.createGain();
      g.gain.value = 1 / (midis.length * 3);
      o.connect(g).connect(mouth);
      o.start(t);
      oscs.push(o);
    }
  const sum = ctx.createGain();
  sum.gain.value = 1.6;
  for (const [f, a] of VOWELS[vowel]) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = f / 90;
    const g = ctx.createGain();
    g.gain.value = a;
    mouth.connect(bp).connect(g).connect(sum);
  }
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3500;
  sum.connect(lp).connect(env).connect(out);
  env.gain.setValueAtTime(0, t);
  env.gain.setTargetAtTime(gain, t, attack / 3);
  const end = (at: number, release = 1.5) => {
    // (from wherever the voice is then, so an early stop never clicks)
    env.gain.cancelScheduledValues(at);
    env.gain.setTargetAtTime(0, at, release / 5);
    for (const o of oscs) o.stop(at + release + 0.05);
    vib.stop(at + release + 0.05);
  };
  if (Number.isFinite(dur)) end(t + Math.max(attack, dur - 1), 1.4);
  return { stop: (at, release) => end(at, release) };
}

export type DroneKind = 'strings' | 'organ' | 'hum' | 'horn' | 'water' | 'deep';
/** A held drone on `midis` (the floor's root and fifth): low strings, an organ pipe, a hummed note, a horn, a note that
    wavers like water, or a deep one with a sub under it. */
export function drone(
  ctx: Ctx,
  out: AudioNode,
  kind: DroneKind,
  midis: readonly number[],
  t: number,
  gain: number,
): Held {
  const env = ctx.createGain(),
    lp = ctx.createBiquadFilter(),
    nodes: AudioScheduledSourceNode[] = [];
  lp.type = 'lowpass';
  lp.Q.value = 0.8;
  lp.frequency.value = { strings: 700, organ: 2400, hum: 420, horn: 900, water: 600, deep: 260 }[kind];
  const lfo = ctx.createOscillator(),
    lfoG = ctx.createGain();
  lfo.frequency.value = kind === 'water' ? 0.13 : 0.07;
  lfoG.gain.value = lp.frequency.value * 0.35;
  lfo.connect(lfoG).connect(lp.frequency);
  lfo.start(t);
  nodes.push(lfo);
  const wob = ctx.createOscillator(),
    wobG = ctx.createGain();
  wob.frequency.value = kind === 'water' ? 0.21 : 0.3;
  wobG.gain.value = kind === 'water' ? 14 : 3;
  wob.connect(wobG);
  wob.start(t);
  nodes.push(wob);
  const voices: [number, OscillatorType, number, number][] = []; // (ratio, wave, detune, gain)
  if (kind === 'organ')
    voices.push(
      [1, 'sine', 0, 1],
      [2, 'sine', 1, 0.5],
      [3, 'sine', -1, 0.3],
      [4, 'sine', 2, 0.2],
      [6, 'sine', 0, 0.08],
    );
  else if (kind === 'deep')
    voices.push([0.5, 'sine', 0, 1], [1, 'sawtooth', -5, 0.5], [1, 'sawtooth', 6, 0.5], [2, 'triangle', 0, 0.2]);
  else if (kind === 'hum') voices.push([1, 'sawtooth', -4, 0.6], [1, 'sawtooth', 5, 0.6], [1, 'sine', 0, 0.6]);
  else if (kind === 'horn') voices.push([1, 'sawtooth', -3, 0.7], [1, 'sawtooth', 4, 0.7], [2, 'square', 0, 0.1]);
  else
    voices.push([1, 'sawtooth', -7, 0.6], [1, 'sawtooth', 6, 0.6], [1, 'triangle', 0, 0.4], [2, 'sawtooth', 3, 0.15]);
  for (const m of midis)
    for (const [ratio, wave, det, g] of voices) {
      const o = ctx.createOscillator();
      o.type = wave;
      o.frequency.value = midiHz(m) * ratio;
      o.detune.value = det;
      wobG.connect(o.detune);
      const gg = ctx.createGain();
      gg.gain.value = (g / (midis.length * voices.length)) * 2.2;
      o.connect(gg).connect(lp);
      o.start(t);
      nodes.push(o);
    }
  lp.connect(env).connect(out);
  env.gain.setValueAtTime(0, t);
  env.gain.setTargetAtTime(gain, t, 1.3);
  return {
    stop: (at, release = 3) => {
      env.gain.cancelScheduledValues(at);
      env.gain.setTargetAtTime(0, at, release / 5);
      for (const n of nodes) n.stop(at + release + 0.05);
    },
  };
}

/** A bowed note (a viola, a rebec): two strings slightly apart, the bow's slow attack, a vibrato that comes in late. */
export function bowed(ctx: Ctx, out: AudioNode, midi: number, t: number, dur: number, gain: number, bright = 0.5) {
  const env = ctx.createGain(),
    lp = ctx.createBiquadFilter(),
    vib = ctx.createOscillator(),
    vibG = ctx.createGain();
  lp.type = 'lowpass';
  lp.frequency.value = 900 + bright * 1600;
  lp.Q.value = 1.2;
  vib.frequency.value = 5.2;
  vibG.gain.setValueAtTime(0, t);
  vibG.gain.linearRampToValueAtTime(14, t + Math.min(0.8, dur * 0.6));
  vib.connect(vibG);
  const end = t + dur + 0.9;
  for (const [type, det] of [
    ['sawtooth', -4],
    ['sawtooth', 5],
    ['triangle', 0],
  ] as [OscillatorType, number][]) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = midiHz(midi);
    o.detune.value = det;
    vibG.connect(o.detune);
    o.connect(lp);
    o.start(t);
    o.stop(end);
  }
  lp.connect(env).connect(out);
  vib.start(t);
  vib.stop(end);
  const a = Math.min(0.35, dur * 0.4);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain * 0.33, t + a);
  env.gain.setValueAtTime(gain * 0.33, t + dur);
  env.gain.linearRampToValueAtTime(0, t + dur + 0.8);
}

/** A voice placed in the room: a lowpass for how far it is, a pan, and what goes to the space. */
export function placed(ctx: Ctx, dry: AudioNode, wet: AudioNode, pan: number, far: number, gain: number) {
  const g = ctx.createGain(),
    lp = ctx.createBiquadFilter(),
    p = ctx.createStereoPanner(),
    send = ctx.createGain();
  g.gain.value = gain * (1 - far * 0.55);
  lp.type = 'lowpass';
  lp.frequency.value = 16000 * (1 - far) ** 2 + 500;
  p.pan.value = Math.max(-1, Math.min(1, pan));
  send.gain.value = 0.25 + far * 0.9;
  g.connect(lp).connect(p);
  p.connect(dry);
  p.connect(send).connect(wet);
  return g;
}
