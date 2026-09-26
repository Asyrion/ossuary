/* Tiny WebAudio synth, no sound files. */
let ctx: AudioContext | null = null, out: GainNode, noise: AudioBuffer, muted = false;

function init() {
  if (ctx) { if (ctx.state === 'suspended') void ctx.resume(); return; }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC(); out = ctx.createGain(); out.gain.value = .45; out.connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
  if (!ctx || muted) return; const t = ctx.currentTime + delay; const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(out); o.start(t); o.stop(t + dur + .02);
}
function hiss(dur: number, vol: number, type: BiquadFilterType, freq: number, delay = 0) {
  if (!ctx || muted) return; const t = ctx.currentTime + delay; const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise; f.type = type; f.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + dur + .02);
}

export const Sfx = {
  init,
  get muted() { return muted; },
  toggle() { muted = !muted; return muted; },
  shoot() { tone('triangle', 660, 320, .09, .09); hiss(.05, .04, 'highpass', 3000); },
  splash() { hiss(.06, .05, 'bandpass', 1800); },
  hit() { hiss(.07, .12, 'bandpass', 900); tone('square', 220, 140, .05, .04); },
  die() { tone('sawtooth', 190, 50, .28, .08); hiss(.25, .1, 'lowpass', 700); },
  hurt() { tone('sawtooth', 240, 80, .3, .12); hiss(.2, .12, 'lowpass', 500); },
  door(open: boolean) { hiss(.35, .09, 'lowpass', 260); tone('square', open ? 70 : 90, open ? 110 : 55, .3, .04); },
  pickup() { tone('sine', 660, 660, .1, .1); tone('sine', 990, 990, .18, .09, .09); },
  relic() { [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, .35, .08, i * .09)); },
  enemyShot() { tone('sine', 420, 180, .18, .05); },
  boom() { tone('sine', 110, 40, .45, .22); hiss(.4, .1, 'lowpass', 400); },
  charge() { tone('sawtooth', 120, 260, .25, .06); },
  crack() { hiss(.06, .08, 'bandpass', 1400); tone('square', 160, 90, .05, .03); },
  rubble() { hiss(.35, .12, 'lowpass', 500); tone('sine', 90, 45, .3, .1); },
  bell() { tone('sine', 196, 196, 1.2, .12); tone('sine', 392, 392, .8, .05); tone('triangle', 588, 588, .5, .03); },
};
