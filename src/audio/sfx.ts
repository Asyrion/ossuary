/* Tiny WebAudio synth, no sound files. Sounds run through two buses, effects and interface, under a master
   (GDD: Audio design), each with a volume the pause menu sets and the browser remembers. An effect that happens
   somewhere in the room (`Sfx.at(x, z).blast()`) is panned to where it happens and a little quieter the further it
   is, heard from just above the mage (`Sfx.listen`, every step). */
let ctx: AudioContext | null = null, master: GainNode, fx: GainNode, ui: GainNode, noise: AudioBuffer, muted = false;
/** Where the tones and hisses of the sound being played go: its bus, or a panner for a positioned effect. */
let bus: AudioNode | null = null;
const listener = { x: 0, z: 0 };

export type VolumeKind = 'master' | 'effects' | 'interface';
const VOLUME_KEY = 'ossuary.volume';
const volumes: Record<VolumeKind, number> = { master: 1, effects: 1, interface: 1 };
try { Object.assign(volumes, JSON.parse(localStorage.getItem(VOLUME_KEY) ?? '{}')); } catch { /* private window or blocked storage: defaults */ }
function applyVolumes() {
  if (!ctx) return;
  master.gain.value = .45 * volumes.master; fx.gain.value = volumes.effects; ui.gain.value = volumes.interface;
}

function init() {
  if (ctx) { if (ctx.state === 'suspended') void ctx.resume(); return; }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
  fx = ctx.createGain(); fx.connect(master); ui = ctx.createGain(); ui.connect(master); applyVolumes();
  noise = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
  if (!ctx || muted) return; const t = ctx.currentTime + delay; const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(bus ?? fx); o.start(t); o.stop(t + dur + .02);
}
/** Fire's crackle: `n` tiny pops over `over` seconds. */
function crackles(n: number, over: number, vol: number) {
  for (let i = 0; i < n; i++) hiss(.02 + Math.random() * .03, vol * (.5 + Math.random()), 'highpass', 2500 + Math.random() * 2500, Math.random() * over);
}
function hiss(dur: number, vol: number, type: BiquadFilterType, freq: number, delay = 0) {
  if (!ctx || muted) return; const t = ctx.currentTime + delay; const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise; f.type = type; f.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f).connect(g).connect(bus ?? fx); s.start(t); s.stop(t + dur + .02);
}
/** A panner for an effect at (x, z): left or right of the mage, and quieter further away. */
function spot(x: number, z: number) {
  const dx = x - listener.x, d = Math.hypot(dx, z - listener.z);
  const pan = ctx!.createStereoPanner(), g = ctx!.createGain();
  pan.pan.value = Math.max(-1, Math.min(1, dx / 7)); g.gain.value = 1 / (1 + Math.max(0, d - 2) * .1);
  pan.connect(g).connect(fx);
  return pan;
}

const sounds = {
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
  // the rooms' objects (M3.6)
  bones() { [900, 1250, 700, 1500, 1050].forEach((f, i) => tone('square', f, f * .8, .03, .025, i * .035)); hiss(.15, .05, 'bandpass', 2200); },
  sack() { hiss(.22, .1, 'lowpass', 700); tone('sine', 110, 70, .15, .06); },
  cask() { tone('square', 150, 70, .12, .05); hiss(.25, .09, 'bandpass', 1100); hiss(.5, .06, 'lowpass', 500, .08); },
  spores() { hiss(.4, .06, 'bandpass', 3200); tone('sine', 660, 990, .3, .025); },
  sporeFlash() { hiss(.45, .16, 'lowpass', 1400); tone('sine', 140, 50, .4, .15); crackles(6, .4, .05); },
  tear() { hiss(.1, .07, 'highpass', 2800); tone('square', 420, 300, .04, .02); },
  // mechanisms (M3.6)
  toll() { [98, 147, 196, 294].forEach((f, i) => tone('sine', f, f * .995, 2.2 - i * .3, .12 / (i + 1))); hiss(.3, .05, 'bandpass', 1200); },
  candlesLit() { [523, 659, 784, 1047].forEach((f, i) => tone('sine', f, f, 1, .05, i * .1)); hiss(.8, .02, 'highpass', 5000, .2); },
  runeCharge() { tone('triangle', 330, 660, .4, .06); tone('sine', 990, 1320, .3, .03, .1); },
  runePulse() { tone('sine', 440, 400, .25, .03); },
  chainSnap() { tone('square', 1400, 900, .05, .04); tone('square', 1100, 700, .05, .03, .05); },
  clang() { tone('triangle', 520, 500, .6, .08); tone('triangle', 780, 760, .5, .04); hiss(.4, .1, 'lowpass', 900); },
  full() { tone('sine', 520, 440, .12, .035); tone('sine', 390, 330, .14, .03, .07); },
  wake() { tone('sine', 220, 330, .25, .05); hiss(.2, .04, 'bandpass', 900); },
  catchFire() { hiss(.3, .08, 'bandpass', 1600); crackles(4, .25, .04); },
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
  // economy artifacts
  ferryman() { tone('sine', 1047, 1040, .5, .04); tone('sine', 1568, 1560, .35, .025, .06); hiss(.3, .02, 'highpass', 5000); },
  // spells and mana
  learn() { [392, 523, 659, 784].forEach((f, i) => tone('triangle', f, f * 1.01, .5, .05, i * .06)); hiss(.5, .03, 'highpass', 4500, .1); },
  spellFail() { tone('sine', 220, 160, .12, .05); hiss(.08, .03, 'lowpass', 900); },
  manaVial() { tone('sine', 880, 1320, .18, .05); tone('sine', 1320, 1760, .22, .03, .06); },
  // Ember: crackle and whoosh
  lance() { hiss(.35, .13, 'bandpass', 1400); tone('sawtooth', 220, 70, .3, .05); hiss(.12, .06, 'highpass', 4000, .03); crackles(5, .3, .05); },
  sealPlace() { tone('sine', 196, 294, .5, .06); tone('triangle', 392, 588, .4, .03, .05); hiss(.4, .04, 'bandpass', 900); },
  sealErupt() { hiss(.7, .2, 'lowpass', 900); tone('sine', 100, 38, .6, .2); hiss(.3, .1, 'bandpass', 1800, .02); crackles(8, .6, .06); },
  crackle() { crackles(3, .2, .035); },
  // Frost: chime and shatter
  shards() { [2349, 2793, 3136].forEach((f, i) => tone('triangle', f, f * .9, .12, .035, i * .025)); hiss(.15, .07, 'highpass', 5000); },
  wallRise() { hiss(.4, .12, 'bandpass', 2800); tone('triangle', 660, 1320, .3, .04); tone('sine', 1760, 2637, .25, .03, .08); crackles(5, .3, .04); },
  wallShatter() { hiss(.4, .13, 'highpass', 3500); [2637, 2093, 3136, 1760].forEach((f, i) => tone('triangle', f, f * .75, .2, .035, i * .04)); tone('sine', 220, 110, .25, .06); },
  // Storm: zap and thunder
  arc(hits = 1) { hiss(.18 + hits * .04, .1, 'highpass', 2500); tone('square', 1600, 400, .12, .03); tone('sawtooth', 90, 60, .25, .05, .02); },
  mantle() { tone('sawtooth', 55, 110, .5, .06); hiss(.5, .07, 'highpass', 3000); tone('square', 1200, 2400, .15, .02, .1); tone('sine', 70, 50, .6, .08, .05); },
  mantleZap() { hiss(.08, .09, 'highpass', 3200); tone('square', 1400, 300, .07, .035); },
  mantleEnd() { tone('sawtooth', 110, 55, .3, .03); hiss(.2, .03, 'highpass', 4000); },
  // statuses and reactions
  freeze() { tone('sine', 2637, 1760, .25, .04); tone('triangle', 1318, 988, .3, .04, .03); hiss(.2, .05, 'highpass', 5000); },
  thaw() { tone('sine', 988, 1318, .2, .02); hiss(.15, .03, 'highpass', 4000); },
  shatter() { hiss(.35, .14, 'highpass', 3500); [2637, 3136, 2093, 3520].forEach((f, i) => tone('triangle', f, f * .8, .18, .04, i * .03)); tone('sine', 196, 98, .3, .08); },
  overload() { hiss(.6, .16, 'lowpass', 700); tone('sine', 110, 40, .6, .18); tone('square', 1800, 300, .2, .04); hiss(.3, .08, 'highpass', 3000, .05); },
  // water and oil
  ignite() { hiss(.7, .16, 'lowpass', 1100); tone('sine', 80, 160, .5, .08); crackles(10, .7, .05); },
  sizzle() { hiss(.35, .1, 'highpass', 4200); tone('square', 2400, 500, .15, .03); crackles(6, .3, .04); },
  wade() { hiss(.09, .035, 'bandpass', 900); },
  // grimoire pages and the library: dry, close rustles and whispers
  pageWhisper() { hiss(1.1, .05, 'bandpass', 2400); hiss(.8, .035, 'bandpass', 3400, .3); tone('sine', 330, 300, .8, .02); },
  pageAsk() { hiss(.12, .06, 'bandpass', 3000); hiss(.1, .05, 'bandpass', 2200, .08); },
  pageDrop() { hiss(.14, .06, 'bandpass', 2800); tone('sine', 660, 880, .35, .025, .05); },
  ash() { hiss(.5, .08, 'lowpass', 1200); crackles(6, .4, .04); },
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
  // the foes built in code (M4): critters squeak and pop rather than groan; each attack's warning and its blow in the
  // palette of its school (Umbral: low, hollow, breathy)
  critterDie() { tone('square', 880, 260, .16, .05); tone('sine', 520, 180, .22, .05, .03); hiss(.18, .08, 'bandpass', 1400); },
  affinity(weak: boolean) { if (weak) { tone('triangle', 880, 1320, .12, .05); tone('triangle', 1320, 1760, .14, .04, .06); } else { tone('sine', 330, 220, .2, .05); hiss(.12, .03, 'lowpass', 700); } },
  sporeSwell() { tone('sine', 110, 190, .6, .06); hiss(.6, .04, 'bandpass', 500); tone('sine', 220, 300, .5, .02, .1); },
  sporePuff() { hiss(.45, .14, 'lowpass', 900); tone('sine', 150, 70, .3, .08); hiss(.3, .05, 'bandpass', 2400, .05); },
  // Hallow: bright bells and chimes
  mothFlare() { [1568, 1976, 2349].forEach((f, i) => tone('sine', f, f * 1.02, .5, .03, i * .1)); hiss(.5, .02, 'highpass', 6000); },
  mothDust() { [2637, 3136, 3520, 2093].forEach((f, i) => tone('triangle', f, f * .96, .25, .025, i * .03)); hiss(.3, .04, 'highpass', 5000); },
  // Storm: buzzing, crackling
  beetleTell() { tone('sawtooth', 160, 420, .45, .04); hiss(.45, .04, 'bandpass', 3000); tone('square', 1200, 1800, .3, .015, .1); },
  beetleThud() { tone('sine', 110, 50, .25, .12); hiss(.2, .1, 'lowpass', 600); tone('square', 300, 150, .08, .04); },
  spark() { hiss(.12, .1, 'highpass', 3200); tone('square', 1800, 500, .1, .035); tone('sawtooth', 900, 1400, .08, .02, .03); },
  // Ember: clay and fire
  mimicWake() { tone('square', 700, 900, .06, .04); tone('square', 820, 1000, .06, .035, .08); hiss(.2, .06, 'bandpass', 1200); tone('sine', 180, 260, .3, .05, .05); },
  mimicSpit() { hiss(.35, .12, 'bandpass', 1100); tone('sawtooth', 240, 120, .25, .05); crackles(6, .35, .04); },
  mimicShut() { tone('square', 520, 300, .07, .05); hiss(.1, .05, 'lowpass', 1500); },
  // Frost: glassy, airy
  toadPuff() { tone('sine', 90, 150, .6, .07); hiss(.6, .03, 'bandpass', 700); tone('triangle', 1760, 2349, .5, .015, .15); },
  toadLeap() { tone('sine', 180, 320, .15, .05); hiss(.1, .04, 'bandpass', 900); },
  toadLand() { tone('sine', 120, 60, .15, .07); hiss(.12, .06, 'lowpass', 700); },
  toadBreath() { hiss(.6, .12, 'highpass', 3000); [2637, 2093, 3136].forEach((f, i) => tone('triangle', f, f * .8, .35, .025, i * .05)); tone('sine', 260, 180, .4, .04); },
  // Storm, under water
  lurkerRise() { hiss(.4, .1, 'bandpass', 500); tone('sine', 140, 280, .4, .05); crackles(3, .3, .03); },
  lurkerDive() { hiss(.35, .09, 'lowpass', 600); tone('sine', 260, 110, .3, .05); },
  // Hallow
  jellyGlow() { [988, 1319, 1568].forEach((f, i) => tone('sine', f, f * 1.01, .7, .025, i * .12)); },
  jellyPulse() { tone('sine', 523, 1047, .35, .06); tone('triangle', 2093, 1568, .4, .03); hiss(.3, .04, 'highpass', 5000); },
  // Ember: the salamander's scamper
  skitter() { for (let i = 0; i < 4; i++) tone('square', 900 + i * 120, 700, .03, .02, i * .04); crackles(3, .2, .03); },
  // Umbral: the imp's blink and its hex
  impBlink() { tone('sine', 220, 660, .18, .05); tone('sine', 330, 990, .15, .025, .04); hiss(.15, .04, 'bandpass', 1800); },
  impThrow() { tone('sawtooth', 110, 60, .4, .05); hiss(.3, .07, 'bandpass', 700); tone('sine', 440, 220, .3, .03, .05); },
  // Frost: the drakeling
  drakeInhale() { hiss(.8, .08, 'bandpass', 1200); tone('sine', 70, 140, .8, .07); tone('triangle', 1175, 1568, .6, .015, .2); },
  drakeWings() { for (let i = 0; i < 3; i++) hiss(.12, .1, 'lowpass', 500, i * .16); },
  // Hallow and Umbral (M4.1): Hallow's bells and choir, Umbral's low drones and swells drawn backwards
  consecrate() { [523, 659, 784].forEach((f, i) => tone('sine', f, f, 1.4, .045, i * .03)); tone('sine', 1047, 1047, 1.2, .02, .1); hiss(.8, .02, 'highpass', 6000, .1); },
  judgementCall() { tone('triangle', 1319, 1300, .9, .04); tone('sine', 1976, 1950, .7, .02, .05); },
  judgement() { tone('sine', 196, 98, .8, .16); [784, 988, 1175, 1568].forEach((f, i) => tone('sine', f, f, 1, .04, i * .02)); hiss(.5, .1, 'bandpass', 2400); },
  wardlight() { [1175, 1568, 2093].forEach((f, i) => tone('sine', f, f * 1.01, .6, .03, i * .08)); },
  hexBolt() { tone('sine', 180, 90, .4, .07); tone('triangle', 90, 180, .35, .03, .05); hiss(.3, .04, 'lowpass', 500); },
  graspRise() { tone('sine', 70, 110, .5, .08); hiss(.5, .05, 'lowpass', 400); },
  graspClose() { tone('square', 140, 60, .12, .05); hiss(.2, .08, 'lowpass', 700); tone('sine', 110, 104, .8, .05, .05); },
  ferryToll() { tone('sine', 1760, 1760, .1, .05); tone('sine', 147, 139, 1.4, .08, .05); tone('sine', 220, 208, 1.1, .04, .1); },
  eclipse() { tone('sine', 110, 55, 1, .1); tone('sine', 988, 494, .9, .03); hiss(.6, .05, 'lowpass', 600); },
  blackfire() { tone('sine', 90, 60, .6, .08); hiss(.5, .08, 'bandpass', 900); crackles(6, .4, .04); },
  // soul motes and the lodestone shard (M4.1): a pale breath taken and let go, a black one's spill, a hallowed chord;
  // the shard's click and the hum of the lodestone
  soulTake() { tone('sine', 660, 990, .35, .04); tone('sine', 1320, 1980, .3, .02, .06); hiss(.25, .02, 'highpass', 5000, .04); },
  soulLost() { tone('sine', 1175, 392, .5, .06); hiss(.4, .05, 'bandpass', 1800); },
  soulBurn() { tone('triangle', 494, 988, .3, .05); hiss(.3, .06, 'highpass', 3000); },
  soulHex() { tone('sine', 147, 73, .9, .08); tone('sine', 1319, 659, .6, .02, .05); hiss(.5, .05, 'lowpass', 500); },
  soulMend() { [587, 740, 880].forEach((f, i) => tone('sine', f, f, 1, .035, i * .06)); },
  shard() { tone('square', 1800, 1700, .03, .04); tone('sine', 110, 220, .6, .07, .02); tone('sine', 880, 1760, .4, .03, .08); },
  // M4.1's artifacts: the antler's lance, a bolt's echo off stone, the choir's hymn, the last rite, the salt's hiss
  antlerLance() { tone('triangle', 1568, 1480, .35, .04); tone('sine', 2349, 2300, .3, .02, .03); hiss(.2, .04, 'highpass', 4000); },
  echo() { tone('sine', 660, 620, .12, .03); tone('sine', 660, 620, .12, .015, .09); },
  choir() { [262, 330, 392, 523].forEach((f, i) => { tone('sine', f, f, 1.6, .05, i * .05); tone('triangle', f * 2, f * 2, 1.2, .012, i * .05 + .02); }); hiss(1.2, .015, 'bandpass', 2000); },
  lastRite() { tone('sine', 196, 196, 1.6, .08); [392, 494, 587].forEach((f, i) => tone('sine', f, f, 1.2, .04, .2 + i * .12)); hiss(.8, .03, 'lowpass', 900); },
  saltForm() { hiss(.5, .05, 'highpass', 5000); tone('sine', 1760, 1976, .3, .015, .1); },
  saltBreak() { hiss(.25, .06, 'bandpass', 3000); },
  guardians() { tone('square', 70, 55, .5, .06); hiss(.5, .08, 'lowpass', 400); [1319, 1568].forEach((f, i) => tone('triangle', f, f * .7, .4, .02, i * .06)); },
  // floor 4's foes (M4.1): the wickmouse's squeak, the chime bat's bell and its strike, the gargoyle's grinding wake and landing, the fawn's healing
  squeak() { tone('sine', 1900, 2600, .05, .03); tone('sine', 2200, 2900, .05, .025, .07); },
  chime() { tone('triangle', 1760, 1740, .6, .05); tone('sine', 2637, 2600, .5, .03, .01); tone('sine', 3520, 3480, .3, .015, .02); },
  zap() { hiss(.12, .12, 'highpass', 3500); tone('square', 900, 120, .1, .05); crackles(4, .15, .04); },
  grind() { hiss(.3, .1, 'lowpass', 350); tone('square', 70, 55, .25, .04); },
  stoneLand() { tone('sine', 110, 45, .3, .12); hiss(.2, .08, 'lowpass', 600); [2349, 1760].forEach((f, i) => tone('triangle', f, f * .7, .25, .025, i * .04)); },
  fawnHeal() { [784, 988, 1175, 1568].forEach((f, i) => tone('sine', f, f, .45, .035, i * .07)); hiss(.4, .02, 'highpass', 5000, .1); },
  // floor 5's foes (M4.1): the rootling's digging and rumble, the storm ray's rush, the void mote's gulp and spill, the tortoise's shell
  dig() { hiss(.3, .08, 'lowpass', 500); tone('sine', 140, 80, .2, .04); },
  rumble() { tone('sine', 60, 50, .6, .1); hiss(.5, .06, 'lowpass', 300); },
  rayPass() { hiss(.5, .07, 'bandpass', 900); tone('sine', 300, 500, .4, .03); crackles(5, .4, .03); },
  gulp() { tone('sine', 420, 140, .16, .06); },
  spill() { tone('sine', 140, 520, .35, .06); hiss(.35, .06, 'bandpass', 700); },
  shellIn() { tone('square', 260, 180, .06, .04); hiss(.08, .05, 'bandpass', 1200); },
  // the bosses of floors 4 and 5 (M4.1): the hart's bell-voice, drumming hooves and light; the angler's hum, bite and spit
  hartBellow() { tone('sine', 196, 185, 1.1, .08); tone('triangle', 392, 370, .9, .04, .05); tone('sine', 587, 554, .8, .025, .12); hiss(.5, .03, 'highpass', 4500, .1); },
  hartCharge() { for (let i = 0; i < 6; i++) tone('sine', 95, 55, .08, .09, i * .08); hiss(.5, .07, 'lowpass', 500); },
  hartSpokes() { [880, 1175, 1319].forEach((f, i) => tone('sine', f, f, .5, .035, i * .06)); hiss(.3, .03, 'highpass', 5000); },
  anglerHum() { tone('sine', 147, 139, 1.8, .07); tone('sine', 220, 208, 1.6, .045, .1); tone('triangle', 441, 417, 1.3, .02, .2); },
  bite() { tone('square', 320, 70, .09, .09); hiss(.12, .12, 'bandpass', 1300); },
  spit() { hiss(.14, .08, 'bandpass', 650); tone('sine', 280, 110, .16, .05); },
  // M4.2's bosses: the War-Tiger's roar (stone giving as it wakes), and a plate knocked off it, bronze or stone
  tigerRoar() { tone('sawtooth', 110, 70, .9, .06); tone('sine', 165, 98, 1, .08); hiss(.8, .08, 'lowpass', 900); hiss(.5, .03, 'highpass', 3500, .1); },
  dragonCall() { tone('sawtooth', 146, 196, .5, .04); tone('sine', 293, 392, .6, .04, .05); hiss(.4, .03, 'bandpass', 1400, .1); },
  dragonFire() { hiss(1, .12, 'lowpass', 900); tone('sawtooth', 90, 60, 1, .05); crackles(10, .9, .04); },
  dragonFrost() { hiss(1, .09, 'highpass', 3200); tone('sine', 1760, 1320, .9, .03); [2637, 3136].forEach((f, i) => tone('triangle', f, f * .9, .6, .02, i * .1)); },
  claw() { for (let i = 0; i < 3; i++) hiss(.09, .09, 'bandpass', 2600 - i * 350, i * .035); tone('sawtooth', 420, 130, .14, .03); },
  plateBreak() { [1480, 1975, 2490].forEach((f, i) => tone('triangle', f, f * .96, .5 - i * .1, .04, i * .01)); tone('sine', 220, 90, .3, .07); hiss(.3, .08, 'bandpass', 1600); },
  drakeLand() { tone('sine', 90, 40, .4, .14); hiss(.35, .1, 'highpass', 3500); [2637, 2093].forEach((f, i) => tone('triangle', f, f * .7, .3, .03, i * .04)); },
  // M4.2's pieces from the lore: a watching statue's gaze settling on the mage and its ray; a hex blinding it; an
  // obelisk's ward breaking
  statueMark() { tone('sine', 220, 440, .7, .05); tone('triangle', 330, 660, .7, .025, .05); hiss(.6, .02, 'highpass', 4000); },
  statueRay() { hiss(.25, .12, 'highpass', 3000); tone('sawtooth', 1320, 180, .25, .05); tone('sine', 660, 330, .4, .04); },
  statueBlind() { tone('sine', 520, 130, .5, .05); hiss(.4, .04, 'lowpass', 900); },
  wardShatter() { [1568, 1175, 880, 659].forEach((f, i) => tone('triangle', f, f * .8, .35, .035, i * .05)); hiss(.4, .08, 'highpass', 3000); },
  // the drinking ward (M4.2): a spell drunk, the ward bursting; a Wardling swelling and letting its volley go
  wardDrink() { tone('sine', 660, 220, .35, .06); tone('sine', 990, 330, .3, .03, .04); hiss(.25, .03, 'bandpass', 1400); },
  wardBurst() { tone('sine', 110, 55, .6, .12); [880, 1320, 1760].forEach((f, i) => tone('triangle', f, f * .6, .5, .04, i * .06)); hiss(.5, .1, 'highpass', 2500); },
  wardlingSwell() { tone('sine', 300, 700, .5, .04); },
  // the Wandering Merchant (M4.2): the bell on his staff as he rides in; his crow
  wandererBell() { [1320, 1760, 1480].forEach((f, i) => tone('triangle', f, f * .98, .5, .04, i * .18)); },
  crow() { tone('sawtooth', 620, 380, .18, .05); tone('sawtooth', 580, 360, .16, .04, .22); },
  wardlingShot() { tone('triangle', 700, 260, .15, .05); hiss(.1, .04, 'bandpass', 1800); },
};
type Sounds = typeof sounds;
/** Sounds of the interface (picking things up, refusals, learning): their own bus, never positioned. */
const UI_SOUNDS = new Set<keyof Sounds>(['pickup', 'relic', 'coin', 'key', 'glyphPickup', 'noGlyph', 'learn', 'spellFail', 'refuse', 'purchase', 'pageAsk']);
/** Every sound, sending its tones to its bus, or to a panner at `place` when there is one. */
function route(place?: { x: number; z: number; on: boolean }): Sounds {
  const out = {} as Record<string, (...a: never[]) => void>;
  for (const [name, fn] of Object.entries(sounds) as [keyof Sounds, (...a: never[]) => void][]) {
    out[name] = (...a: never[]) => {
      if (!ctx || muted) return;
      const prev = bus, isUi = UI_SOUNDS.has(name);
      bus = isUi ? ui : place?.on ? spot(place.x, place.z) : fx;
      try { fn(...a); } finally { bus = prev; }
    };
  }
  return out as unknown as Sounds;
}
const here = { x: 0, z: 0, on: true }, positioned = route(here);

export const Sfx = {
  init,
  get muted() { return muted; },
  toggle() { muted = !muted; return muted; },
  /** Where the mage stands: effects are heard from just above. */
  listen(x: number, z: number) { listener.x = x; listener.z = z; },
  /** The sounds, played at (x, z) in the room: `Sfx.at(foe.x, foe.z).hit()`. */
  at(x: number, z: number): Sounds { here.x = x; here.z = z; return positioned; },
  /** Volumes, 0 to 1, remembered in this browser. */
  get volumes(): Readonly<Record<VolumeKind, number>> { return volumes; },
  setVolume(kind: VolumeKind, v: number) {
    volumes[kind] = Math.max(0, Math.min(1, v)); applyVolumes();
    try { localStorage.setItem(VOLUME_KEY, JSON.stringify(volumes)); } catch { /* not remembered, still applied */ }
  },
  ...route(),
};
