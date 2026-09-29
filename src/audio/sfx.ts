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
