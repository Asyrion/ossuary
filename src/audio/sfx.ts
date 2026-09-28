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
  // bosses
  wail() { tone('sine', 520, 360, .7, .07); tone('triangle', 780, 540, .7, .03, .06); },
  dive() { hiss(.5, .1, 'lowpass', 700); tone('sine', 300, 70, .5, .1); },
  surface() { hiss(.4, .16, 'bandpass', 1100); tone('sine', 90, 40, .45, .2); },
  leap() { hiss(.35, .09, 'highpass', 1400); tone('sawtooth', 90, 200, .3, .05); },
  ember() { hiss(.12, .08, 'highpass', 2500); tone('square', 320, 150, .08, .03); },
  // obols, bone keys and blast glyphs
  coin(purse = false) { tone('sine', 1320, 1320, .08, .05); tone('sine', 1760, 1760, .14, .05, .05); if (purse) tone('sine', 2093, 2093, .16, .04, .11); },
  key() { tone('triangle', 880, 1100, .09, .05); tone('triangle', 1320, 1320, .12, .04, .08); hiss(.05, .03, 'highpass', 5000, .02); },
  glyphPickup() { tone('sine', 440, 660, .22, .06); hiss(.12, .03, 'highpass', 3500); },
  inscribe() { hiss(.2, .06, 'bandpass', 2600); tone('sine', 330, 390, .25, .04); },
  fuseTick(k: number) { tone('square', 500 + k * 700, 480 + k * 700, .035, .025); },
  blast() { tone('sine', 120, 38, .5, .24); tone('sawtooth', 240, 60, .35, .06); hiss(.45, .12, 'bandpass', 700); hiss(.2, .05, 'highpass', 3000); },
  noGlyph() { tone('square', 180, 140, .06, .03); },
  // urns, wards, coffers and chests
  urn(sealed = false) { hiss(.22, .12, 'bandpass', sealed ? 2600 : 1600); tone('square', 320, 120, .08, .03); if (sealed) tone('sine', 1320, 660, .4, .05, .03); },
  wardTink() { tone('sine', 1500, 1420, .1, .05); tone('sine', 2250, 2200, .07, .03, .02); },
  wardBreak() { tone('sine', 1100, 280, .45, .07); hiss(.3, .06, 'highpass', 3500); },
  unbind() { tone('triangle', 660, 990, .18, .06); tone('triangle', 1320, 1320, .16, .05, .12); hiss(.1, .03, 'highpass', 5000, .05); },
  coffer() { tone('sawtooth', 140, 220, .14, .04); hiss(.18, .06, 'lowpass', 900); },
  locked() { tone('square', 120, 100, .1, .05); tone('square', 110, 92, .1, .05, .13); },
  // the merchant and the vault
  purchase() { tone('sine', 1320, 1320, .07, .05); tone('sine', 1760, 1760, .1, .05, .05); tone('sine', 1100, 330, .4, .05, .1); hiss(.25, .04, 'highpass', 3500, .1); },
  shade() { tone('sine', 147, 139, 1.2, .07); tone('sine', 220, 208, 1, .03, .15); hiss(.9, .04, 'bandpass', 500); },
  wardCrack() { tone('sine', 1300, 900, .25, .06); tone('square', 180, 120, .12, .04); hiss(.2, .05, 'highpass', 3000); },
  // artifacts
  crit() { tone('triangle', 1320, 1760, .12, .06); hiss(.1, .04, 'highpass', 4000); },
  leech() { tone('sine', 330, 660, .3, .06); tone('sine', 495, 990, .25, .03, .05); },
  moth() { tone('sine', 1900, 1500, .05, .015); },
  skullBite() { tone('square', 300, 160, .06, .03); },
  oath() { [784, 988, 1175].forEach((f, i) => tone('sine', f, f, .3, .05, i * .07)); },
  tithe() { tone('sawtooth', 160, 90, .4, .06); tone('sine', 80, 50, .5, .08); },
  // secret rooms
  hollow() { tone('sine', 1760, 1740, .5, .05); tone('sine', 2637, 2600, .35, .025, .03); tone('square', 110, 80, .12, .05); hiss(.25, .05, 'bandpass', 900); },
  crumble() { hiss(.7, .14, 'lowpass', 420); tone('sine', 70, 35, .6, .16); hiss(.3, .06, 'bandpass', 1500, .15); },
  secretFound() { [659, 831, 988, 1319].forEach((f, i) => tone('triangle', f, f, .45, .06, .25 + i * .08)); hiss(.6, .03, 'highpass', 4500, .25); },
  unlock() { tone('square', 90, 70, .12, .06); tone('triangle', 660, 990, .2, .06, .1); tone('triangle', 1320, 1320, .2, .05, .22); hiss(.15, .04, 'highpass', 5000, .1); },
  // the shrine
  curseDrawn() { tone('sawtooth', 311, 147, .7, .05); tone('sine', 98, 62, .9, .1); hiss(.8, .06, 'bandpass', 700); },
  wispHit() { tone('triangle', 988, 740, .12, .05); hiss(.12, .05, 'highpass', 3000); },
  wispShot() { tone('sawtooth', 220, 150, .18, .025); },
  curseEscaped() { tone('sawtooth', 147, 311, .5, .05); tone('sine', 196, 98, .7, .06, .1); hiss(.5, .04, 'bandpass', 900); },
  cleanse() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone('sine', f, f, .9 - i * .08, .06, i * .09)); tone('sine', 131, 131, 1.4, .06); hiss(.9, .03, 'highpass', 5000, .3); },
  // runs, rooms and artifacts
  descend() { hiss(.6, .1, 'lowpass', 900); tone('sine', 220, 50, .7, .12); tone('sine', 60, 35, .35, .16, .55); },
  trapdoor() { hiss(.8, .1, 'lowpass', 300); tone('square', 55, 42, .8, .04); },
  victory() { [392, 523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, .6, .08, i * .12)); tone('sine', 131, 131, 1.6, .1, .5); },
  fallen() { tone('sine', 131, 131, 2.2, .14); tone('sine', 262, 262, 1.4, .05); tone('sine', 98, 98, 2.4, .08, .05); },
  cursed() { tone('sawtooth', 233, 220, .6, .05); tone('sawtooth', 330, 311, .6, .04); tone('sine', 110, 70, .8, .1); },
  rise() { [392, 523, 659].forEach((f, i) => tone('sine', f, f * 1.01, .4, .06, i * .12)); hiss(.5, .03, 'highpass', 4000); },
  vanish() { tone('sine', 880, 220, .35, .05); hiss(.3, .04, 'highpass', 3000); },
  altar() { tone('sine', 70, 40, .18, .2); tone('sine', 70, 40, .18, .16, .22); tone('sine', 147, 147, 1, .06, .1); },
  refuse() { tone('square', 110, 90, .25, .05); tone('square', 104, 85, .25, .05, .16); },
  gong() { tone('sine', 98, 98, 1.6, .14); tone('sine', 196, 194, 1, .06); tone('triangle', 263, 260, .6, .03); hiss(.4, .05, 'bandpass', 600); },
  darkness() { hiss(1, .07, 'lowpass', 400); tone('sine', 180, 120, 1, .03); },
  champion() { tone('sawtooth', 80, 60, .5, .08); hiss(.4, .06, 'lowpass', 300); },
  bell() { tone('sine', 196, 196, 1.2, .12); tone('sine', 392, 392, .8, .05); tone('triangle', 588, 588, .5, .03); },
};
