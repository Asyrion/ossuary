/* The sounds of an animated creature (docs/creatures.md), played on its clips' events (data/creatures.json): built the way
   the real thing sounds, on any audio context, so the same code plays them in the room (panned to where the creature is)
   and offline beside the animation for a preview. The owlbear's: heavy padded paws with claws clicking on stone, a breath
   drawn in, a roar that is half a bear's growl and half an owl's screech, and the slam of its forepaws. The dragonling's:
   light scaled feet whose claws tick on stone, a reptile's hiss, the clack of its jaw snapping shut, a rasping shriek
   with a rattle in its throat, and a chitter while it rests. */
import { Rand, crackleLoop, drum, noiseLoop, play, type Ctx } from './synth';

export interface CreatureCall { ctx: Ctx; t: number; out: AudioNode; r: Rand; gain: number }

/** A burst of noise through a filter: an attack, a decay, and a band that may glide. */
function noise(s: CreatureCall, colour: 'white' | 'pink' | 'brown', type: BiquadFilterType, f0: number, f1: number, q: number, at: number, attack: number, decay: number, gain: number) {
  const { ctx } = s, t = s.t + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseLoop(ctx, colour); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + attack + decay);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * s.gain, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + attack + decay);
  src.connect(f).connect(g).connect(s.out); src.start(t, s.r.next() * 3); src.stop(t + attack + decay + .05);
  return { f, g };
}
/** A soft-clipping curve: grit for a throat. */
function grit(ctx: Ctx, amount: number) {
  const ws = ctx.createWaveShaper(), n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * amount) / Math.tanh(amount); }
  ws.curve = c; ws.oversample = '2x'; return ws;
}

/** A heavy paw coming down: the pad's thump, the fur's brush, then two or three claws clicking on stone. */
function paw(s: CreatureCall, weight: number) {
  play(s.ctx, drum(s.ctx, 'thump'), lowpass(s, 340), s.t, s.gain * .9 * weight, s.r.range(.78, .95) / weight ** .3);
  noise(s, 'pink', 'bandpass', 900, 600, 1.1, 0, .006, .07, .22 * weight);
  for (let i = 0; i < 2 + Math.floor(s.r.next() * 2); i++) noise(s, 'white', 'bandpass', s.r.range(3200, 5200), s.r.range(2800, 4000), 6, .018 + i * s.r.range(.012, .03), .0006, .006, s.r.range(.12, .22));
}
function lowpass(s: CreatureCall, f: number) { const lp = s.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = f; lp.connect(s.out); return lp; }

/** The roar: a bear's throat (a rough, wavering buzz through the shape of an open mouth closing, ground through grit),
    the air pushed through it, a chest's low resonance, and an owl's hissing screech riding on top; `long` seconds. */
function roar(s: CreatureCall, long = 1.35) {
  const { ctx } = s, t = s.t, end = t + long;
  const throat = ctx.createGain(), mouth = ctx.createGain(), env = ctx.createGain(), shaper = grit(ctx, 3.2), tone = ctx.createBiquadFilter();
  tone.type = 'lowpass'; tone.frequency.value = 4200;
  // the voice: two rough sawtooths and a sub-octave, its pitch rising into the roar and sinking as it ends, shaken
  const f0 = [[0, 82], [.16, 148], [.55, 136], [.95, 118], [long, 66]] as const;
  const oscs = [[1, 'sawtooth', .5], [1.012, 'sawtooth', .4], [.5, 'square', .25]] as const;
  const jitter = ctx.createBufferSource(), jf = ctx.createBiquadFilter(), jg = ctx.createGain();
  jitter.buffer = noiseLoop(ctx, 'white'); jitter.loop = true; jf.type = 'lowpass'; jf.frequency.value = 35; jg.gain.value = 900; // (cents: a throat never holds still)
  jitter.connect(jf).connect(jg);
  for (const [ratio, wave, g] of oscs) {
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = wave; og.gain.value = g;
    o.frequency.setValueAtTime(f0[0][1] * ratio, t); for (const [at, f] of f0.slice(1)) o.frequency.exponentialRampToValueAtTime(f * ratio, t + at);
    jg.connect(o.detune); o.connect(og).connect(throat); o.start(t); o.stop(end + .1);
  }
  jitter.start(t, s.r.next() * 3); jitter.stop(end + .1);
  // the mouth: an open "ah" closing to an "oh" as the roar ends
  for (const [a, b, gain] of [[720, 520, 1], [1150, 860, .6], [2650, 2450, .25]] as const) {
    const bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.Q.value = 5;
    bp.frequency.setValueAtTime(a, t); bp.frequency.setValueAtTime(a, t + long * .55); bp.frequency.exponentialRampToValueAtTime(b, end);
    g.gain.value = gain; throat.connect(bp).connect(g).connect(mouth);
  }
  const body = ctx.createGain(); body.gain.value = .35; throat.connect(body).connect(mouth); // (the chest under it)
  mouth.connect(shaper).connect(tone).connect(env).connect(s.out);
  env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(.9 * s.gain, t + .12); env.gain.linearRampToValueAtTime(s.gain, t + .5);
  env.gain.setValueAtTime(s.gain, end - .45); env.gain.exponentialRampToValueAtTime(.0005, end);
  // the air forced through it, and the chest's low boom at its start
  noise(s, 'pink', 'bandpass', 1300, 800, 1, 0, .12, long - .1, .5);
  const boom = ctx.createOscillator(), bg = ctx.createGain(); boom.frequency.setValueAtTime(70, t); boom.frequency.exponentialRampToValueAtTime(42, t + .8);
  bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(.45 * s.gain, t + .08); bg.gain.exponentialRampToValueAtTime(.0005, t + .9); boom.connect(bg).connect(s.out); boom.start(t); boom.stop(t + 1);
  // the owl in it: a hissing, rasping screech high over the growl, rising in and falling away
  const screech = noise(s, 'white', 'bandpass', 3200, 2100, 3.5, .05, .1, long * .75, .55);
  const rasp = ctx.createOscillator(), rg = ctx.createGain(); rasp.type = 'square'; rasp.frequency.value = 38; rg.gain.value = .35 * s.gain;
  rasp.connect(rg).connect(screech.g.gain); rasp.start(t); rasp.stop(end);
  const cry = ctx.createOscillator(), cf = ctx.createBiquadFilter(), cg = ctx.createGain(); cry.type = 'sawtooth';
  cry.frequency.setValueAtTime(1150, t + .06); cry.frequency.exponentialRampToValueAtTime(1450, t + .3); cry.frequency.exponentialRampToValueAtTime(900, t + long * .8);
  cf.type = 'bandpass'; cf.frequency.value = 2700; cf.Q.value = 7;
  cg.gain.setValueAtTime(0, t + .06); cg.gain.linearRampToValueAtTime(.16 * s.gain, t + .2); cg.gain.exponentialRampToValueAtTime(.0005, t + long * .8);
  cry.connect(cf).connect(cg).connect(s.out); cry.start(t + .06); cry.stop(t + long);
}

/** A light scaled foot: a small soft tap, a scuff, and its claws ticking on stone one after another. */
function claws(s: CreatureCall, weight: number) {
  play(s.ctx, drum(s.ctx, 'thump'), lowpass(s, 900), s.t, s.gain * .35 * weight, s.r.range(1.5, 1.8));
  noise(s, 'pink', 'bandpass', 2000, 1400, 1.4, 0, .004, .05, .12 * weight);
  for (let i = 0; i < 3 + Math.floor(s.r.next() * 2); i++) noise(s, 'white', 'bandpass', s.r.range(4200, 6500), s.r.range(3600, 5000), 8, .006 + i * s.r.range(.01, .022), .0004, .004, s.r.range(.18, .3) * weight);
}
/** A reptile's hiss: breath forced past the teeth, high and rising, with a wet flutter in it; `long` seconds. */
function hiss(s: CreatureCall, long = .55) {
  const h = noise(s, 'white', 'bandpass', 3800, 5600, 1.6, 0, .07, long, .55);
  const flutter = s.ctx.createOscillator(), fg = s.ctx.createGain(); flutter.frequency.value = 23; fg.gain.value = .18 * s.gain;
  flutter.connect(fg).connect(h.g.gain); flutter.start(s.t); flutter.stop(s.t + long + .1);
  noise(s, 'white', 'highpass', 7000, 8000, .7, .02, .05, long * .8, .25);
}
/** The jaw snapping shut: a hard clack of teeth on teeth, a knock of bone under it, and a short snort of breath. */
function snap(s: CreatureCall) {
  noise(s, 'white', 'bandpass', 2600, 1800, 3, 0, .0005, .03, .9);
  noise(s, 'white', 'bandpass', 5200, 4200, 5, .004, .0005, .02, .5);
  play(s.ctx, drum(s.ctx, 'hand'), lowpass(s, 1400), s.t, s.gain * .55, 1.6);
  noise(s, 'pink', 'bandpass', 900, 600, 1, .03, .02, .12, .18);
}
/** The shriek: a rasping, reedy voice high in its throat, its pitch bent up and shaken, ground through grit, a rattle of
    its throat under it and a hiss of air over it; `long` seconds. */
function shriek(s: CreatureCall, long = .85) {
  const { ctx } = s, t = s.t, end = t + long, voice = ctx.createGain(), env = ctx.createGain(), shaper = grit(ctx, 4), tone = ctx.createBiquadFilter();
  tone.type = 'bandpass'; tone.frequency.value = 2100; tone.Q.value = .7;
  const f0 = [[0, 520], [.09, 880], [.35, 820], [long * .8, 700], [long, 460]] as const;
  const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 17; vg.gain.value = 60; vib.connect(vg); // (cents: a reptile's warble)
  for (const [ratio, wave, g] of [[1, 'sawtooth', .5], [1.007, 'sawtooth', .4], [1.5, 'square', .12]] as const) {
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = wave; og.gain.value = g;
    o.frequency.setValueAtTime(f0[0][1] * ratio, t); for (const [at, f] of f0.slice(1)) o.frequency.exponentialRampToValueAtTime(f * ratio, t + at);
    vg.connect(o.detune); o.connect(og).connect(voice); o.start(t); o.stop(end + .05);
  }
  vib.start(t); vib.stop(end + .05);
  // the throat's rattle: the voice chopped many times a second
  const rattle = ctx.createGain(), rat = ctx.createOscillator(), rg = ctx.createGain(); rattle.gain.value = .6; rat.type = 'square'; rat.frequency.setValueAtTime(42, t); rat.frequency.linearRampToValueAtTime(30, end); rg.gain.value = .4;
  rat.connect(rg).connect(rattle.gain); rat.start(t); rat.stop(end);
  voice.connect(rattle).connect(shaper).connect(tone).connect(env).connect(s.out);
  env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(.8 * s.gain, t + .05); env.gain.setValueAtTime(.8 * s.gain, end - .3); env.gain.exponentialRampToValueAtTime(.0005, end);
  noise(s, 'white', 'bandpass', 4200, 3000, 2, 0, .06, long * .9, .45);
}
/** At rest: a few quick dry clicks in its throat, a lizard's chitter. */
function chitter(s: CreatureCall) {
  const n = 4 + Math.floor(s.r.next() * 3);
  for (let i = 0; i < n; i++) noise(s, 'white', 'bandpass', s.r.range(1800, 2600), s.r.range(1500, 2100), 6, i * s.r.range(.045, .06), .001, .02, .35 * (1 - i / (n + 2)));
}

/** Every creature sound, by the name its clip's events give (data/creatures.json). */
export const CREATURE_SOUNDS: Record<string, (s: CreatureCall) => void> = {
  pawFront: s => paw(s, .85),
  pawRear: s => paw(s, 1),
  /** A breath drawn in before the roar: air rushing in, rising, and a low catch in the chest. */
  inhale: s => { noise(s, 'pink', 'bandpass', 450, 1500, 1.2, 0, .5, .08, .35); noise(s, 'brown', 'lowpass', 160, 220, .8, .1, .4, .1, .4); },
  roar: s => roar(s),
  /** Both forepaws slammed down: two heavy drums a hair apart, a low thud under them, and stone grit skittering. */
  slam: s => {
    play(s.ctx, drum(s.ctx, 'taiko'), lowpass(s, 600), s.t, s.gain * 1.1, .8); play(s.ctx, drum(s.ctx, 'thump'), lowpass(s, 500), s.t + .025, s.gain, .7);
    const g = s.ctx.createGain(), src = s.ctx.createBufferSource(); src.buffer = crackleLoop(s.ctx, 6); g.gain.setValueAtTime(.5 * s.gain, s.t + .02); g.gain.exponentialRampToValueAtTime(.0005, s.t + .7);
    src.connect(g).connect(s.out); src.start(s.t + .02, s.r.next() * 5); src.stop(s.t + .75);
    noise(s, 'brown', 'lowpass', 300, 120, .8, 0, .01, .6, .6);
  },
  clawFront: s => claws(s, .85),
  clawRear: s => claws(s, 1),
  hiss: s => hiss(s),
  snap: s => snap(s),
  shriek: s => shriek(s),
  chitter: s => chitter(s),
};
