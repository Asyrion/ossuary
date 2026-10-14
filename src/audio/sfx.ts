/* Tiny WebAudio synth: every effect made in code (the few sounds played from files, a creature's, go through samples.ts,
   these as their fallbacks). Sounds run through two buses, effects and interface, under a master
   (GDD: Audio design), each with a volume the pause menu sets and the browser remembers. An effect that happens
   somewhere in the room (`Sfx.at(x, z).blast()`) is panned to where it happens and a little quieter the further it
   is, heard from just above the mage (`Sfx.listen`, every step). */
let ctx: AudioContext | null = null,
  master: GainNode,
  fx: GainNode,
  ui: GainNode,
  music: GainNode,
  ambience: GainNode,
  noise: AudioBuffer,
  muted = false;
/** Where the tones and hisses of the sound being played go: its bus, or a panner for a positioned effect. */
let bus: AudioNode | null = null;
const listener = { x: 0, z: 0 };

export type VolumeKind = 'master' | 'effects' | 'interface' | 'music' | 'ambience';
const VOLUME_KEY = 'ossuary.volume';
const volumes: Record<VolumeKind, number> = { master: 1, effects: 1, interface: 1, music: 0.8, ambience: 0.8 };
try {
  Object.assign(volumes, JSON.parse(localStorage.getItem(VOLUME_KEY) ?? '{}'));
} catch {
  /* private window or blocked storage: defaults */
}
function applyVolumes() {
  if (!ctx) return;
  master.gain.value = muted ? 0 : 0.45 * volumes.master;
  fx.gain.value = volumes.effects;
  ui.gain.value = volumes.interface;
  music.gain.value = volumes.music;
  ambience.gain.value = volumes.ambience;
}

function init() {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  const AC =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  fx = ctx.createGain();
  fx.connect(master);
  ui = ctx.createGain();
  ui.connect(master);
  music = ctx.createGain();
  music.connect(master);
  ambience = ctx.createGain();
  ambience.connect(master);
  applyVolumes(); // (docs/archive/sound-plan.md)
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus ?? fx);
  o.start(t);
  o.stop(t + dur + 0.02);
}
/** Fire's crackle: `n` tiny pops over `over` seconds. */
function crackles(n: number, over: number, vol: number) {
  for (let i = 0; i < n; i++)
    hiss(
      0.02 + Math.random() * 0.03,
      vol * (0.5 + Math.random()),
      'highpass',
      2500 + Math.random() * 2500,
      Math.random() * over,
    );
}
function hiss(dur: number, vol: number, type: BiquadFilterType, freq: number, delay = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource(),
    f = ctx.createBiquadFilter(),
    g = ctx.createGain();
  s.buffer = noise;
  f.type = type;
  f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f)
    .connect(g)
    .connect(bus ?? fx);
  s.start(t);
  s.stop(t + dur + 0.02);
}
/** A panner for an effect at (x, z): left or right of the mage, and quieter further away. */
function spot(x: number, z: number) {
  const dx = x - listener.x,
    d = Math.hypot(dx, z - listener.z) || 0;
  const pan = ctx!.createStereoPanner(),
    g = ctx!.createGain();
  pan.pan.value = Number.isFinite(dx) ? Math.max(-1, Math.min(1, dx / 7)) : 0;
  g.gain.value = 1 / (1 + Math.max(0, d - 2) * 0.1); // (a sound from nowhere plays in the middle, never throws)
  pan.connect(g).connect(fx);
  return pan;
}

/** A school's note (weaves): Ember a crackling rise, Frost a high chime, Storm a buzz, Hallow a bright bell,
    Umbral a low hum. */
function schoolNote(school: string, delay: number) {
  if (school === 'ember') {
    tone('sawtooth', 220, 440, 0.3, 0.05, delay);
    crackles(3, 0.25, 0.03);
  } else if (school === 'frost') tone('sine', 1318, 1568, 0.35, 0.05, delay);
  else if (school === 'storm') {
    tone('square', 880, 660, 0.2, 0.04, delay);
    hiss(0.12, 0.05, 'highpass', 4000, delay);
  } else if (school === 'hallow') tone('triangle', 784, 784, 0.5, 0.06, delay);
  else if (school === 'verdant') {
    tone('triangle', 392, 466, 0.35, 0.05, delay);
    hiss(0.25, 0.04, 'bandpass', 900, delay);
  } // (a reed's breath)
  else tone('sine', 110, 82, 0.5, 0.08, delay);
}

const sounds = {
  shoot() {
    tone('triangle', 660, 320, 0.09, 0.09);
    hiss(0.05, 0.04, 'highpass', 3000);
  },
  splash() {
    hiss(0.06, 0.05, 'bandpass', 1800);
  },
  hit() {
    hiss(0.07, 0.12, 'bandpass', 900);
    tone('square', 220, 140, 0.05, 0.04);
  },
  die() {
    tone('sawtooth', 190, 50, 0.28, 0.08);
    hiss(0.25, 0.1, 'lowpass', 700);
  },
  hurt() {
    tone('sawtooth', 240, 80, 0.3, 0.12);
    hiss(0.2, 0.12, 'lowpass', 500);
  },
  door(open: boolean) {
    hiss(0.35, 0.09, 'lowpass', 260);
    tone('square', open ? 70 : 90, open ? 110 : 55, 0.3, 0.04);
  },
  pickup() {
    tone('sine', 660, 660, 0.1, 0.1);
    tone('sine', 990, 990, 0.18, 0.09, 0.09);
  },
  /** A transformation formed: a rising chord with a shimmer over it. */
  transform() {
    [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone('triangle', f, f * 1.01, 0.5, 0.07, i * 0.07));
    tone('sine', 2093, 1568, 0.6, 0.03, 0.45);
  },
  /** Gifts: the Shadowstep's blink (a rush of air, falling), the Runescribe's rune bursting, the Frostborn's touch. */
  blink() {
    hiss(0.18, 0.1, 'highpass', 1800);
    tone('sine', 880, 220, 0.2, 0.06);
  },
  runeBurst() {
    tone('triangle', 660, 990, 0.12, 0.05);
    hiss(0.14, 0.07, 'bandpass', 2200);
  },
  rimeTouch() {
    hiss(0.1, 0.05, 'highpass', 4000);
    tone('sine', 1760, 1320, 0.1, 0.03);
  },
  relic() {
    [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.35, 0.08, i * 0.09));
  },
  enemyShot() {
    tone('sine', 420, 180, 0.18, 0.05);
  },
  boom() {
    tone('sine', 110, 40, 0.45, 0.22);
    hiss(0.4, 0.1, 'lowpass', 400);
  },
  charge() {
    tone('sawtooth', 120, 260, 0.25, 0.06);
  },
  crack() {
    hiss(0.06, 0.08, 'bandpass', 1400);
    tone('square', 160, 90, 0.05, 0.03);
  },
  rubble() {
    hiss(0.35, 0.12, 'lowpass', 500);
    tone('sine', 90, 45, 0.3, 0.1);
  },
  // bosses
  wail() {
    tone('sine', 520, 360, 0.7, 0.07);
    tone('triangle', 780, 540, 0.7, 0.03, 0.06);
  },
  dive() {
    hiss(0.5, 0.1, 'lowpass', 700);
    tone('sine', 300, 70, 0.5, 0.1);
  },
  surface() {
    hiss(0.4, 0.16, 'bandpass', 1100);
    tone('sine', 90, 40, 0.45, 0.2);
  },
  leap() {
    hiss(0.35, 0.09, 'highpass', 1400);
    tone('sawtooth', 90, 200, 0.3, 0.05);
  },
  ember() {
    hiss(0.12, 0.08, 'highpass', 2500);
    tone('square', 320, 150, 0.08, 0.03);
  },
  // obols, bone keys and blast glyphs
  coin(purse = false) {
    tone('sine', 1320, 1320, 0.08, 0.05);
    tone('sine', 1760, 1760, 0.14, 0.05, 0.05);
    if (purse) tone('sine', 2093, 2093, 0.16, 0.04, 0.11);
  },
  key() {
    tone('triangle', 880, 1100, 0.09, 0.05);
    tone('triangle', 1320, 1320, 0.12, 0.04, 0.08);
    hiss(0.05, 0.03, 'highpass', 5000, 0.02);
  },
  glyphPickup() {
    tone('sine', 440, 660, 0.22, 0.06);
    hiss(0.12, 0.03, 'highpass', 3500);
  },
  inscribe() {
    hiss(0.2, 0.06, 'bandpass', 2600);
    tone('sine', 330, 390, 0.25, 0.04);
  },
  fuseTick(k: number) {
    tone('square', 500 + k * 700, 480 + k * 700, 0.035, 0.025);
  },
  blast() {
    tone('sine', 120, 38, 0.5, 0.24);
    tone('sawtooth', 240, 60, 0.35, 0.06);
    hiss(0.45, 0.12, 'bandpass', 700);
    hiss(0.2, 0.05, 'highpass', 3000);
  },
  noGlyph() {
    tone('square', 180, 140, 0.06, 0.03);
  },
  // urns, wards, coffers and chests
  // the rooms' objects
  bones() {
    [900, 1250, 700, 1500, 1050].forEach((f, i) => tone('square', f, f * 0.8, 0.03, 0.025, i * 0.035));
    hiss(0.15, 0.05, 'bandpass', 2200);
  },
  sack() {
    hiss(0.22, 0.1, 'lowpass', 700);
    tone('sine', 110, 70, 0.15, 0.06);
  },
  cask() {
    tone('square', 150, 70, 0.12, 0.05);
    hiss(0.25, 0.09, 'bandpass', 1100);
    hiss(0.5, 0.06, 'lowpass', 500, 0.08);
  },
  spores() {
    hiss(0.4, 0.06, 'bandpass', 3200);
    tone('sine', 660, 990, 0.3, 0.025);
  },
  sporeFlash() {
    hiss(0.45, 0.16, 'lowpass', 1400);
    tone('sine', 140, 50, 0.4, 0.15);
    crackles(6, 0.4, 0.05);
  },
  tear() {
    hiss(0.1, 0.07, 'highpass', 2800);
    tone('square', 420, 300, 0.04, 0.02);
  },
  // mechanisms
  toll() {
    [98, 147, 196, 294].forEach((f, i) => tone('sine', f, f * 0.995, 2.2 - i * 0.3, 0.12 / (i + 1)));
    hiss(0.3, 0.05, 'bandpass', 1200);
  },
  candlesLit() {
    [523, 659, 784, 1047].forEach((f, i) => tone('sine', f, f, 1, 0.05, i * 0.1));
    hiss(0.8, 0.02, 'highpass', 5000, 0.2);
  },
  runeCharge() {
    tone('triangle', 330, 660, 0.4, 0.06);
    tone('sine', 990, 1320, 0.3, 0.03, 0.1);
  },
  runePulse() {
    tone('sine', 440, 400, 0.25, 0.03);
  },
  chainSnap() {
    tone('square', 1400, 900, 0.05, 0.04);
    tone('square', 1100, 700, 0.05, 0.03, 0.05);
  },
  clang() {
    tone('triangle', 520, 500, 0.6, 0.08);
    tone('triangle', 780, 760, 0.5, 0.04);
    hiss(0.4, 0.1, 'lowpass', 900);
  },
  full() {
    tone('sine', 520, 440, 0.12, 0.035);
    tone('sine', 390, 330, 0.14, 0.03, 0.07);
  },
  wake() {
    tone('sine', 220, 330, 0.25, 0.05);
    hiss(0.2, 0.04, 'bandpass', 900);
  },
  catchFire() {
    hiss(0.3, 0.08, 'bandpass', 1600);
    crackles(4, 0.25, 0.04);
  },
  urn(sealed = false) {
    hiss(0.22, 0.12, 'bandpass', sealed ? 2600 : 1600);
    tone('square', 320, 120, 0.08, 0.03);
    if (sealed) tone('sine', 1320, 660, 0.4, 0.05, 0.03);
  },
  wardTink() {
    tone('sine', 1500, 1420, 0.1, 0.05);
    tone('sine', 2250, 2200, 0.07, 0.03, 0.02);
  },
  wardBreak() {
    tone('sine', 1100, 280, 0.45, 0.07);
    hiss(0.3, 0.06, 'highpass', 3500);
  },
  unbind() {
    tone('triangle', 660, 990, 0.18, 0.06);
    tone('triangle', 1320, 1320, 0.16, 0.05, 0.12);
    hiss(0.1, 0.03, 'highpass', 5000, 0.05);
  },
  coffer() {
    tone('sawtooth', 140, 220, 0.14, 0.04);
    hiss(0.18, 0.06, 'lowpass', 900);
  },
  locked() {
    tone('square', 120, 100, 0.1, 0.05);
    tone('square', 110, 92, 0.1, 0.05, 0.13);
  },
  // the merchant and the vault
  purchase() {
    tone('sine', 1320, 1320, 0.07, 0.05);
    tone('sine', 1760, 1760, 0.1, 0.05, 0.05);
    tone('sine', 1100, 330, 0.4, 0.05, 0.1);
    hiss(0.25, 0.04, 'highpass', 3500, 0.1);
  },
  shade() {
    tone('sine', 147, 139, 1.2, 0.07);
    tone('sine', 220, 208, 1, 0.03, 0.15);
    hiss(0.9, 0.04, 'bandpass', 500);
  },
  wardCrack() {
    tone('sine', 1300, 900, 0.25, 0.06);
    tone('square', 180, 120, 0.12, 0.04);
    hiss(0.2, 0.05, 'highpass', 3000);
  },
  // artifacts
  crit() {
    tone('triangle', 1320, 1760, 0.12, 0.06);
    hiss(0.1, 0.04, 'highpass', 4000);
  },
  leech() {
    tone('sine', 330, 660, 0.3, 0.06);
    tone('sine', 495, 990, 0.25, 0.03, 0.05);
  },
  moth() {
    tone('sine', 1900, 1500, 0.05, 0.015);
  },
  skullBite() {
    tone('square', 300, 160, 0.06, 0.03);
  },
  oath() {
    [784, 988, 1175].forEach((f, i) => tone('sine', f, f, 0.3, 0.05, i * 0.07));
  },
  tithe() {
    tone('sawtooth', 160, 90, 0.4, 0.06);
    tone('sine', 80, 50, 0.5, 0.08);
  },
  // secret rooms
  hollow() {
    tone('sine', 1760, 1740, 0.5, 0.05);
    tone('sine', 2637, 2600, 0.35, 0.025, 0.03);
    tone('square', 110, 80, 0.12, 0.05);
    hiss(0.25, 0.05, 'bandpass', 900);
  },
  crumble() {
    hiss(0.7, 0.14, 'lowpass', 420);
    tone('sine', 70, 35, 0.6, 0.16);
    hiss(0.3, 0.06, 'bandpass', 1500, 0.15);
  },
  secretFound() {
    [659, 831, 988, 1319].forEach((f, i) => tone('triangle', f, f, 0.45, 0.06, 0.25 + i * 0.08));
    hiss(0.6, 0.03, 'highpass', 4500, 0.25);
  },
  unlock() {
    tone('square', 90, 70, 0.12, 0.06);
    tone('triangle', 660, 990, 0.2, 0.06, 0.1);
    tone('triangle', 1320, 1320, 0.2, 0.05, 0.22);
    hiss(0.15, 0.04, 'highpass', 5000, 0.1);
  },
  // economy artifacts
  ferryman() {
    tone('sine', 1047, 1040, 0.5, 0.04);
    tone('sine', 1568, 1560, 0.35, 0.025, 0.06);
    hiss(0.3, 0.02, 'highpass', 5000);
  },
  // spells and mana
  learn() {
    [392, 523, 659, 784].forEach((f, i) => tone('triangle', f, f * 1.01, 0.5, 0.05, i * 0.06));
    hiss(0.5, 0.03, 'highpass', 4500, 0.1);
  },
  spellFail() {
    tone('sine', 220, 160, 0.12, 0.05);
    hiss(0.08, 0.03, 'lowpass', 900);
  },
  manaVial() {
    tone('sine', 880, 1320, 0.18, 0.05);
    tone('sine', 1320, 1760, 0.22, 0.03, 0.06);
  },
  // potions and reagents. A bottle taken clinks; a reagent rustles; a draught is gulped; a thrown bottle whistles,
  // shatters and splashes; the belt's choice ticks like glass
  bottle() {
    tone('sine', 1760, 1700, 0.08, 0.05);
    tone('sine', 2350, 2300, 0.1, 0.03, 0.05);
  },
  reagent() {
    hiss(0.14, 0.05, 'bandpass', 2400);
    tone('triangle', 520, 480, 0.1, 0.03);
  },
  drink() {
    for (let i = 0; i < 3; i++) tone('sine', 220 + i * 30, 180 + i * 30, 0.09, 0.06, i * 0.11);
    hiss(0.3, 0.02, 'lowpass', 600);
  },
  throwPotion() {
    hiss(0.22, 0.04, 'bandpass', 1800);
    tone('sine', 700, 1100, 0.18, 0.02);
  },
  /** A brew at the alchemy table (bubbling, then a bright note as it settles); a jelly globe bursting (glass and
      a wet slap). */
  /** Dr. Jelly holds out what he gives: a glassy clink and a glint. */
  jellyGive() {
    tone('sine', 1175, 1175, 0.12, 0.05);
    tone('sine', 1568, 1568, 0.22, 0.04, 0.08);
    hiss(0.12, 0.02, 'highpass', 5000, 0.05);
  },
  brew() {
    for (let i = 0; i < 5; i++) tone('sine', 300 + i * 70, 520 + i * 60, 0.08, 0.04, i * 0.07);
    hiss(0.45, 0.03, 'lowpass', 700);
    tone('triangle', 880, 1320, 0.3, 0.05, 0.38);
  },
  // the jelly serpent: its vat window cracking, bursting, its hiss as it rises, a glob of jelly landing
  glassCrack() {
    tone('triangle', 3200, 2400, 0.08, 0.05);
    tone('triangle', 2400, 1900, 0.1, 0.04, 0.05);
    hiss(0.12, 0.06, 'highpass', 4200, 0.02);
  },
  vatBurst() {
    hiss(0.5, 0.16, 'highpass', 2800);
    tone('triangle', 2800, 1400, 0.25, 0.06);
    tone('sine', 120, 45, 0.6, 0.2, 0.05);
    hiss(0.9, 0.1, 'lowpass', 600, 0.1);
  },
  serpentHiss() {
    hiss(0.55, 0.09, 'bandpass', 2600);
    tone('sine', 180, 120, 0.4, 0.05);
  },
  glob() {
    hiss(0.16, 0.08, 'lowpass', 900);
    tone('sine', 240, 90, 0.14, 0.07);
  },
  globeBreak() {
    hiss(0.22, 0.1, 'highpass', 3000);
    tone('triangle', 2200, 1500, 0.12, 0.05);
    tone('sine', 160, 70, 0.3, 0.1, 0.04);
    hiss(0.35, 0.05, 'lowpass', 500, 0.05);
  },
  bottleBreak() {
    hiss(0.25, 0.12, 'highpass', 3200);
    tone('triangle', 2600, 1800, 0.12, 0.05);
    tone('triangle', 3100, 2100, 0.1, 0.04, 0.03);
    hiss(0.4, 0.06, 'lowpass', 900, 0.05);
  },
  potionChoose() {
    tone('sine', 1320, 1320, 0.05, 0.04);
  },
  // Ember: crackle and whoosh
  lance() {
    hiss(0.35, 0.13, 'bandpass', 1400);
    tone('sawtooth', 220, 70, 0.3, 0.05);
    hiss(0.12, 0.06, 'highpass', 4000, 0.03);
    crackles(5, 0.3, 0.05);
  },
  sealPlace() {
    tone('sine', 196, 294, 0.5, 0.06);
    tone('triangle', 392, 588, 0.4, 0.03, 0.05);
    hiss(0.4, 0.04, 'bandpass', 900);
  },
  sealErupt() {
    hiss(0.7, 0.2, 'lowpass', 900);
    tone('sine', 100, 38, 0.6, 0.2);
    hiss(0.3, 0.1, 'bandpass', 1800, 0.02);
    crackles(8, 0.6, 0.06);
  },
  crackle() {
    crackles(3, 0.2, 0.035);
  },
  // Frost: chime and shatter
  shards() {
    [2349, 2793, 3136].forEach((f, i) => tone('triangle', f, f * 0.9, 0.12, 0.035, i * 0.025));
    hiss(0.15, 0.07, 'highpass', 5000);
  },
  wallRise() {
    hiss(0.4, 0.12, 'bandpass', 2800);
    tone('triangle', 660, 1320, 0.3, 0.04);
    tone('sine', 1760, 2637, 0.25, 0.03, 0.08);
    crackles(5, 0.3, 0.04);
  },
  wallShatter() {
    hiss(0.4, 0.13, 'highpass', 3500);
    [2637, 2093, 3136, 1760].forEach((f, i) => tone('triangle', f, f * 0.75, 0.2, 0.035, i * 0.04));
    tone('sine', 220, 110, 0.25, 0.06);
  },
  // Storm: zap and thunder
  arc(hits = 1) {
    hiss(0.18 + hits * 0.04, 0.1, 'highpass', 2500);
    tone('square', 1600, 400, 0.12, 0.03);
    tone('sawtooth', 90, 60, 0.25, 0.05, 0.02);
  },
  mantle() {
    tone('sawtooth', 55, 110, 0.5, 0.06);
    hiss(0.5, 0.07, 'highpass', 3000);
    tone('square', 1200, 2400, 0.15, 0.02, 0.1);
    tone('sine', 70, 50, 0.6, 0.08, 0.05);
  },
  mantleZap() {
    hiss(0.08, 0.09, 'highpass', 3200);
    tone('square', 1400, 300, 0.07, 0.035);
  },
  mantleEnd() {
    tone('sawtooth', 110, 55, 0.3, 0.03);
    hiss(0.2, 0.03, 'highpass', 4000);
  },
  // statuses and reactions
  freeze() {
    tone('sine', 2637, 1760, 0.25, 0.04);
    tone('triangle', 1318, 988, 0.3, 0.04, 0.03);
    hiss(0.2, 0.05, 'highpass', 5000);
  },
  thaw() {
    tone('sine', 988, 1318, 0.2, 0.02);
    hiss(0.15, 0.03, 'highpass', 4000);
  },
  steam() {
    hiss(0.7, 0.12, 'highpass', 4200);
    hiss(0.5, 0.06, 'bandpass', 1400, 0.05);
    tone('sine', 260, 180, 0.25, 0.03);
  },
  // reactions, each in both its schools' palettes
  searing() {
    hiss(0.5, 0.1, 'bandpass', 900);
    tone('triangle', 784, 1046, 0.4, 0.07);
    tone('sine', 523, 523, 0.6, 0.04, 0.08);
  },
  prism() {
    [1318, 1568, 1976, 2349].forEach((f, i) => tone('sine', f, f, 0.35, 0.04, i * 0.05));
    hiss(0.2, 0.03, 'highpass', 6000);
  },
  verdict() {
    hiss(0.3, 0.16, 'highpass', 2500);
    tone('square', 220, 60, 0.5, 0.07);
    tone('triangle', 659, 880, 0.7, 0.06, 0.05);
  },
  blackice() {
    tone('sine', 165, 110, 0.6, 0.07);
    hiss(0.4, 0.05, 'highpass', 5000, 0.05);
    tone('triangle', 988, 740, 0.3, 0.03, 0.08);
  },
  // Verdant (wood and breath, reeds and seed pods): its spells
  thornRise() {
    hiss(0.35, 0.06, 'lowpass', 900);
    tone('sawtooth', 90, 160, 0.3, 0.04);
  },
  thornClose() {
    for (let i = 0; i < 4; i++) tone('square', 260 + i * 60, 140, 0.06, 0.03, i * 0.03);
    hiss(0.2, 0.07, 'bandpass', 1800);
  },
  pollenCloud() {
    hiss(0.8, 0.05, 'bandpass', 2400);
    tone('triangle', 392, 523, 0.5, 0.04);
    tone('triangle', 494, 659, 0.45, 0.03, 0.15);
  },
  woodRise() {
    tone('sawtooth', 70, 140, 0.45, 0.07);
    hiss(0.4, 0.06, 'lowpass', 500);
    for (let i = 0; i < 3; i++) tone('square', 180 + i * 40, 120, 0.05, 0.03, 0.1 + i * 0.08);
  },
  wallWither() {
    hiss(0.5, 0.07, 'lowpass', 700);
    tone('sine', 160, 70, 0.5, 0.05);
  },
  // Verdant: its reactions
  wildfire() {
    hiss(0.5, 0.12, 'bandpass', 1400);
    tone('sawtooth', 180, 90, 0.45, 0.05);
    crackles(8, 0.45, 0.05);
  },
  frostbloom() {
    tone('triangle', 1760, 2349, 0.2, 0.04);
    tone('sine', 1175, 1568, 0.25, 0.04, 0.08);
    hiss(0.15, 0.04, 'highpass', 5000);
  },
  pollenspark() {
    hiss(0.4, 0.07, 'bandpass', 3200);
    tone('square', 1900, 900, 0.18, 0.025);
    crackles(5, 0.3, 0.03);
  },
  bloom() {
    tone('sine', 523, 784, 0.3, 0.05);
    tone('sine', 659, 988, 0.35, 0.04, 0.1);
    tone('triangle', 1047, 1319, 0.3, 0.03, 0.2);
  },
  blight() {
    tone('sawtooth', 140, 70, 0.45, 0.05);
    hiss(0.35, 0.06, 'lowpass', 600);
    tone('sine', 220, 165, 0.3, 0.03, 0.1);
  },
  voidspark() {
    hiss(0.15, 0.1, 'highpass', 3500);
    tone('sawtooth', 330, 110, 0.4, 0.05);
    tone('sine', 98, 70, 0.6, 0.05, 0.06);
  },
  shatter() {
    hiss(0.35, 0.14, 'highpass', 3500);
    [2637, 3136, 2093, 3520].forEach((f, i) => tone('triangle', f, f * 0.8, 0.18, 0.04, i * 0.03));
    tone('sine', 196, 98, 0.3, 0.08);
  },
  overload() {
    hiss(0.6, 0.16, 'lowpass', 700);
    tone('sine', 110, 40, 0.6, 0.18);
    tone('square', 1800, 300, 0.2, 0.04);
    hiss(0.3, 0.08, 'highpass', 3000, 0.05);
  },
  // water and oil
  ignite() {
    hiss(0.7, 0.16, 'lowpass', 1100);
    tone('sine', 80, 160, 0.5, 0.08);
    crackles(10, 0.7, 0.05);
  },
  /** A weave or a chain, in both its schools' palettes, one after the other. */
  weave(a: string, b: string) {
    for (const [s, d] of [
      [a, 0],
      [b, 0.12],
    ] as [string, number][])
      schoolNote(s, d);
    hiss(0.3, 0.05, 'bandpass', 1600, 0.05);
  },
  /** A sluice gate lifts (iron and a rush of water) or drops shut. */
  sluice(open: boolean) {
    if (open) {
      tone('square', 110, 80, 0.35, 0.04);
      hiss(1.2, 0.1, 'bandpass', 700, 0.1);
    } else {
      tone('square', 90, 60, 0.2, 0.05);
      hiss(0.4, 0.05, 'bandpass', 500);
    }
  },
  sizzle() {
    hiss(0.35, 0.1, 'highpass', 4200);
    tone('square', 2400, 500, 0.15, 0.03);
    crackles(6, 0.3, 0.04);
  },
  wade() {
    hiss(0.09, 0.035, 'bandpass', 900);
  },
  // grimoire pages and the library: dry, close rustles and whispers
  pageWhisper() {
    hiss(1.1, 0.05, 'bandpass', 2400);
    hiss(0.8, 0.035, 'bandpass', 3400, 0.3);
    tone('sine', 330, 300, 0.8, 0.02);
  },
  pageAsk() {
    hiss(0.12, 0.06, 'bandpass', 3000);
    hiss(0.1, 0.05, 'bandpass', 2200, 0.08);
  },
  pageDrop() {
    hiss(0.14, 0.06, 'bandpass', 2800);
    tone('sine', 660, 880, 0.35, 0.025, 0.05);
  },
  ash() {
    hiss(0.5, 0.08, 'lowpass', 1200);
    crackles(6, 0.4, 0.04);
  },
  // the shrine
  curseDrawn() {
    tone('sawtooth', 311, 147, 0.7, 0.05);
    tone('sine', 98, 62, 0.9, 0.1);
    hiss(0.8, 0.06, 'bandpass', 700);
  },
  wispHit() {
    tone('triangle', 988, 740, 0.12, 0.05);
    hiss(0.12, 0.05, 'highpass', 3000);
  },
  wispShot() {
    tone('sawtooth', 220, 150, 0.18, 0.025);
  },
  curseEscaped() {
    tone('sawtooth', 147, 311, 0.5, 0.05);
    tone('sine', 196, 98, 0.7, 0.06, 0.1);
    hiss(0.5, 0.04, 'bandpass', 900);
  },
  cleanse() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone('sine', f, f, 0.9 - i * 0.08, 0.06, i * 0.09));
    tone('sine', 131, 131, 1.4, 0.06);
    hiss(0.9, 0.03, 'highpass', 5000, 0.3);
  },
  // runs, rooms and artifacts
  descend() {
    hiss(0.6, 0.1, 'lowpass', 900);
    tone('sine', 220, 50, 0.7, 0.12);
    tone('sine', 60, 35, 0.35, 0.16, 0.55);
  },
  trapdoor() {
    hiss(0.8, 0.1, 'lowpass', 300);
    tone('square', 55, 42, 0.8, 0.04);
  },
  victory() {
    [392, 523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.6, 0.08, i * 0.12));
    tone('sine', 131, 131, 1.6, 0.1, 0.5);
  },
  fallen() {
    tone('sine', 131, 131, 2.2, 0.14);
    tone('sine', 262, 262, 1.4, 0.05);
    tone('sine', 98, 98, 2.4, 0.08, 0.05);
  },
  cursed() {
    tone('sawtooth', 233, 220, 0.6, 0.05);
    tone('sawtooth', 330, 311, 0.6, 0.04);
    tone('sine', 110, 70, 0.8, 0.1);
  },
  rise() {
    [392, 523, 659].forEach((f, i) => tone('sine', f, f * 1.01, 0.4, 0.06, i * 0.12));
    hiss(0.5, 0.03, 'highpass', 4000);
  },
  /** Insight reaching the hand (soft, a glassy chime), and a level reached (a rising stinger in insight's gold). */
  cardTurn() {
    tone('triangle', 520, 560, 0.06, 0.03);
    hiss(0.04, 0.02, 'highpass', 5000);
  },
  cardTake() {
    tone('sine', 784, 1175, 0.2, 0.05);
    tone('triangle', 1175, 1568, 0.25, 0.03, 0.05);
  },
  attrUp() {
    tone('sine', 660, 990, 0.16, 0.05);
    tone('triangle', 990, 1320, 0.2, 0.03, 0.06);
  },
  insight() {
    tone('sine', 1568, 1760, 0.12, 0.025);
    tone('sine', 2349, 2349, 0.16, 0.012, 0.03);
  },
  /** A boon at work, in its school's palette, a soft bell over it. */
  boon(school: string) {
    schoolNote(school, 0);
    tone('sine', 1046, 1046, 0.3, 0.03, 0.08);
  },
  /** A rune at work: a chisel's tick on stone, then the spell's school. */
  rune(school: string) {
    hiss(0.05, 0.07, 'bandpass', 2200);
    tone('triangle', 330, 290, 0.12, 0.06);
    schoolNote(school, 0.05);
  },
  /** A rune taken into the pouch: stone set down on stone, and a low chime as its glyph wakes. */
  runeTake() {
    hiss(0.06, 0.06, 'bandpass', 1800);
    tone('triangle', 247, 233, 0.14, 0.07);
    tone('sine', 740, 760, 0.4, 0.035, 0.06);
    tone('sine', 1109, 1109, 0.3, 0.018, 0.1);
  },
  /** The waystone: risen, its runes kindle (a deep stone hum and a rising chime); the rest (mana pouring back, a
      long soft swell); a rune carved (a chisel's two strikes into stone, then the glyph's chime). */
  snuff() {
    hiss(0.3, 0.04, 'highpass', 1800);
    tone('sine', 300, 180, 0.18, 0.02);
  }, // (a candle put out)
  wayOpens() {
    hiss(1.4, 0.07, 'lowpass', 600);
    tone('sine', 65, 98, 1.6, 0.1);
    tone('triangle', 262, 392, 1.1, 0.04, 0.2);
    tone('sine', 523, 784, 1.2, 0.03, 0.5);
  }, // (a barred way at the Vigil opens)
  kindle() {
    tone('sine', 98, 110, 1.2, 0.08);
    tone('triangle', 392, 523, 0.6, 0.04, 0.15);
    tone('sine', 784, 1046, 0.8, 0.025, 0.35);
    hiss(0.5, 0.02, 'highpass', 4000, 0.3);
  },
  bargain() {
    tone('sine', 73, 65, 1.6, 0.09);
    tone('square', 147, 139, 0.5, 0.025, 0.1);
    tone('triangle', 294, 277, 0.9, 0.03, 0.3);
  }, // (a low toll, the price)
  bargainKept() {
    [392, 494, 587, 784].forEach((f, i) => tone('triangle', f, f, 0.5, 0.04, i * 0.09));
    tone('sine', 196, 196, 1.2, 0.05);
  },
  rest() {
    for (let i = 0; i < 4; i++) tone('sine', 523 + i * 131, 587 + i * 131, 0.5, 0.03, i * 0.12);
    tone('sine', 262, 262, 1.4, 0.05, 0.05);
  },
  carve() {
    hiss(0.05, 0.09, 'bandpass', 2600);
    hiss(0.05, 0.08, 'bandpass', 2000, 0.12);
    tone('triangle', 220, 196, 0.16, 0.07, 0.1);
    tone('sine', 880, 900, 0.5, 0.03, 0.22);
  },
  levelUp() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone('triangle', f, f, 0.35, 0.06, i * 0.07));
    tone('sine', 262, 262, 0.9, 0.07, 0.1);
    hiss(0.6, 0.025, 'highpass', 5000);
  },
  vanish() {
    tone('sine', 880, 220, 0.35, 0.05);
    hiss(0.3, 0.04, 'highpass', 3000);
  },
  altar() {
    tone('sine', 70, 40, 0.18, 0.2);
    tone('sine', 70, 40, 0.18, 0.16, 0.22);
    tone('sine', 147, 147, 1, 0.06, 0.1);
  },
  refuse() {
    tone('square', 110, 90, 0.25, 0.05);
    tone('square', 104, 85, 0.25, 0.05, 0.16);
  },
  gong() {
    tone('sine', 98, 98, 1.6, 0.14);
    tone('sine', 196, 194, 1, 0.06);
    tone('triangle', 263, 260, 0.6, 0.03);
    hiss(0.4, 0.05, 'bandpass', 600);
  },
  darkness() {
    hiss(1, 0.07, 'lowpass', 400);
    tone('sine', 180, 120, 1, 0.03);
  },
  // Kaelith's fight (Umbral's palette: low, breathy, a hollow ring)
  kaelithSweep() {
    hiss(0.45, 0.1, 'bandpass', 900);
    tone('sawtooth', 220, 70, 0.4, 0.05);
    tone('sine', 110, 55, 0.5, 0.08, 0.05);
  },
  shadowStep() {
    hiss(0.6, 0.07, 'lowpass', 500);
    tone('sine', 140, 60, 0.6, 0.07);
  },
  sealCrack() {
    hiss(1.2, 0.12, 'lowpass', 700);
    tone('sine', 55, 40, 1.4, 0.14);
    tone('square', 90, 60, 0.5, 0.03, 0.2);
  },
  wardShut() {
    tone('triangle', 520, 520, 0.5, 0.06);
    tone('sine', 260, 262, 0.9, 0.05, 0.05);
    hiss(0.2, 0.04, 'highpass', 3000);
  },
  eclipsePull() {
    tone('sine', 60, 110, 2, 0.1);
    hiss(2, 0.05, 'lowpass', 300);
  },
  kneel() {
    tone('sine', 98, 92, 2.4, 0.1);
    tone('sine', 147, 140, 2, 0.05, 0.3);
    hiss(1.4, 0.05, 'lowpass', 500);
  },
  shaft() {
    [523, 659, 784, 1047].forEach((f, i) => tone('sine', f, f * 1.01, 1.6, 0.035, i * 0.09));
    hiss(1.6, 0.03, 'highpass', 3200);
  }, // (daylight falling into the Seal)
  dawn() {
    hiss(2.4, 0.07, 'lowpass', 1800);
    [262, 330, 392, 523].forEach((f, i) => tone('triangle', f, f, 2.6, 0.04, 0.15 + i * 0.05));
    tone('sine', 131, 131, 3, 0.06, 0.2);
  }, // (stepping out at the cave mouth)
  talk() {
    hiss(0.5, 0.025, 'bandpass', 1400);
    tone('sine', 262, 277, 0.45, 0.025, 0.05);
    tone('sine', 392, 370, 0.35, 0.015, 0.12);
  }, // (a townsperson turns to speak, a breath and a murmur)
  boat() {
    hiss(1.6, 0.05, 'lowpass', 600);
    hiss(0.9, 0.03, 'bandpass', 900, 0.5);
    tone('sine', 98, 92, 1.4, 0.05, 0.1);
    tone('triangle', 196, 196, 0.9, 0.02, 0.6);
  }, // (the Ferryman's pole in the water, and the boat pushing off)
  waken() {
    tone('sine', 196, 196, 2.2, 0.05);
    tone('sine', 294, 294, 2, 0.03, 0.25);
    hiss(1.2, 0.02, 'lowpass', 900, 0.1);
  }, // (waking on the bier)
  chainRattle() {
    for (let i = 0; i < 5; i++) tone('square', 900 + i * 130, 700 + i * 90, 0.04, 0.015, i * 0.06);
    hiss(0.35, 0.02, 'highpass', 3000);
  }, // (a chained shade's chains, as it is seen)
  shadeLoose() {
    tone('sine', 330, 440, 1.2, 0.05);
    tone('sine', 495, 660, 1, 0.03, 0.15);
    hiss(0.8, 0.02, 'highpass', 2600, 0.1);
  }, // (its last chain broken)
  shadeFree() {
    [392, 494, 587, 784, 988].forEach((f, i) => tone('sine', f, f * 1.01, 1.8, 0.035, i * 0.12));
    hiss(2, 0.03, 'highpass', 3200);
  }, // (it rises to the Vigil)
  shadeHelp() {
    tone('sine', 660, 660, 0.5, 0.025);
    tone('sine', 990, 990, 0.4, 0.015, 0.08);
  }, // (a bound shade's help at work)
  shadeBind() {
    tone('triangle', 220, 165, 0.9, 0.06);
    tone('sine', 110, 82, 1.2, 0.05, 0.1);
    hiss(0.6, 0.03, 'lowpass', 800);
  }, // (it is bound to the mage)
  sealVoice() {
    hiss(1.8, 0.06, 'lowpass', 280);
    tone('sine', 73, 61, 2, 0.1);
    tone('triangle', 110, 92, 1.5, 0.035, 0.35);
  }, // (Kaelith's voice from under the stone)
  champion() {
    tone('sawtooth', 80, 60, 0.5, 0.08);
    hiss(0.4, 0.06, 'lowpass', 300);
  },
  // champion mantles: a mantle torn off (a snap and a falling chime), and a Hexbound's curse closing
  unbound() {
    hiss(0.18, 0.12, 'highpass', 2600);
    tone('triangle', 990, 330, 0.35, 0.06);
    tone('sine', 165, 110, 0.5, 0.08, 0.05);
  },
  curse() {
    tone('sine', 140, 70, 0.7, 0.08);
    hiss(0.6, 0.05, 'lowpass', 500);
    tone('sawtooth', 210, 190, 0.4, 0.02, 0.1);
  },
  counter() {
    tone('triangle', 660, 660, 0.18, 0.06);
    tone('triangle', 990, 990, 0.3, 0.06, 0.09);
    tone('sine', 1320, 1320, 0.4, 0.03, 0.18);
  },
  bell() {
    tone('sine', 196, 196, 1.2, 0.12);
    tone('sine', 392, 392, 0.8, 0.05);
    tone('triangle', 588, 588, 0.5, 0.03);
  },
  // the foes built in code: critters squeak and pop rather than groan; each attack's warning and its blow in the
  // palette of its school (Umbral: low, hollow, breathy)
  critterDie() {
    tone('square', 880, 260, 0.16, 0.05);
    tone('sine', 520, 180, 0.22, 0.05, 0.03);
    hiss(0.18, 0.08, 'bandpass', 1400);
  },
  affinity(weak: boolean) {
    if (weak) {
      tone('triangle', 880, 1320, 0.12, 0.05);
      tone('triangle', 1320, 1760, 0.14, 0.04, 0.06);
    } else {
      tone('sine', 330, 220, 0.2, 0.05);
      hiss(0.12, 0.03, 'lowpass', 700);
    }
  },
  sporeSwell() {
    tone('sine', 110, 190, 0.6, 0.06);
    hiss(0.6, 0.04, 'bandpass', 500);
    tone('sine', 220, 300, 0.5, 0.02, 0.1);
  },
  sporePuff() {
    hiss(0.45, 0.14, 'lowpass', 900);
    tone('sine', 150, 70, 0.3, 0.08);
    hiss(0.3, 0.05, 'bandpass', 2400, 0.05);
  },
  // Hallow: bright bells and chimes
  mothFlare() {
    [1568, 1976, 2349].forEach((f, i) => tone('sine', f, f * 1.02, 0.5, 0.03, i * 0.1));
    hiss(0.5, 0.02, 'highpass', 6000);
  },
  mothDust() {
    [2637, 3136, 3520, 2093].forEach((f, i) => tone('triangle', f, f * 0.96, 0.25, 0.025, i * 0.03));
    hiss(0.3, 0.04, 'highpass', 5000);
  },
  // Storm: buzzing, crackling
  beetleTell() {
    tone('sawtooth', 160, 420, 0.45, 0.04);
    hiss(0.45, 0.04, 'bandpass', 3000);
    tone('square', 1200, 1800, 0.3, 0.015, 0.1);
  },
  beetleThud() {
    tone('sine', 110, 50, 0.25, 0.12);
    hiss(0.2, 0.1, 'lowpass', 600);
    tone('square', 300, 150, 0.08, 0.04);
  },
  spark() {
    hiss(0.12, 0.1, 'highpass', 3200);
    tone('square', 1800, 500, 0.1, 0.035);
    tone('sawtooth', 900, 1400, 0.08, 0.02, 0.03);
  },
  // Ember: clay and fire
  mimicWake() {
    tone('square', 700, 900, 0.06, 0.04);
    tone('square', 820, 1000, 0.06, 0.035, 0.08);
    hiss(0.2, 0.06, 'bandpass', 1200);
    tone('sine', 180, 260, 0.3, 0.05, 0.05);
  },
  mimicSpit() {
    hiss(0.35, 0.12, 'bandpass', 1100);
    tone('sawtooth', 240, 120, 0.25, 0.05);
    crackles(6, 0.35, 0.04);
  },
  mimicShut() {
    tone('square', 520, 300, 0.07, 0.05);
    hiss(0.1, 0.05, 'lowpass', 1500);
  },
  // Frost: glassy, airy
  toadPuff() {
    tone('sine', 90, 150, 0.6, 0.07);
    hiss(0.6, 0.03, 'bandpass', 700);
    tone('triangle', 1760, 2349, 0.5, 0.015, 0.15);
  },
  toadLeap() {
    tone('sine', 180, 320, 0.15, 0.05);
    hiss(0.1, 0.04, 'bandpass', 900);
  },
  toadLand() {
    tone('sine', 120, 60, 0.15, 0.07);
    hiss(0.12, 0.06, 'lowpass', 700);
  },
  toadBreath() {
    hiss(0.6, 0.12, 'highpass', 3000);
    [2637, 2093, 3136].forEach((f, i) => tone('triangle', f, f * 0.8, 0.35, 0.025, i * 0.05));
    tone('sine', 260, 180, 0.4, 0.04);
  },
  // Storm, under water
  lurkerRise() {
    hiss(0.4, 0.1, 'bandpass', 500);
    tone('sine', 140, 280, 0.4, 0.05);
    crackles(3, 0.3, 0.03);
  },
  lurkerDive() {
    hiss(0.35, 0.09, 'lowpass', 600);
    tone('sine', 260, 110, 0.3, 0.05);
  },
  // Hallow
  jellyGlow() {
    [988, 1319, 1568].forEach((f, i) => tone('sine', f, f * 1.01, 0.7, 0.025, i * 0.12));
  },
  jellyPulse() {
    tone('sine', 523, 1047, 0.35, 0.06);
    tone('triangle', 2093, 1568, 0.4, 0.03);
    hiss(0.3, 0.04, 'highpass', 5000);
  },
  // Ember: the salamander's scamper
  skitter() {
    for (let i = 0; i < 4; i++) tone('square', 900 + i * 120, 700, 0.03, 0.02, i * 0.04);
    crackles(3, 0.2, 0.03);
  },
  // Umbral: the imp's blink and its hex
  impBlink() {
    tone('sine', 220, 660, 0.18, 0.05);
    tone('sine', 330, 990, 0.15, 0.025, 0.04);
    hiss(0.15, 0.04, 'bandpass', 1800);
  },
  impThrow() {
    tone('sawtooth', 110, 60, 0.4, 0.05);
    hiss(0.3, 0.07, 'bandpass', 700);
    tone('sine', 440, 220, 0.3, 0.03, 0.05);
  },
  // Frost: the drakeling
  drakeInhale() {
    hiss(0.8, 0.08, 'bandpass', 1200);
    tone('sine', 70, 140, 0.8, 0.07);
    tone('triangle', 1175, 1568, 0.6, 0.015, 0.2);
  },
  drakeWings() {
    for (let i = 0; i < 3; i++) hiss(0.12, 0.1, 'lowpass', 500, i * 0.16);
  },
  // Hallow and Umbral: Hallow's bells and choir, Umbral's low drones and swells drawn backwards
  consecrate() {
    [523, 659, 784].forEach((f, i) => tone('sine', f, f, 1.4, 0.045, i * 0.03));
    tone('sine', 1047, 1047, 1.2, 0.02, 0.1);
    hiss(0.8, 0.02, 'highpass', 6000, 0.1);
  },
  judgementCall() {
    tone('triangle', 1319, 1300, 0.9, 0.04);
    tone('sine', 1976, 1950, 0.7, 0.02, 0.05);
  },
  judgement() {
    tone('sine', 196, 98, 0.8, 0.16);
    [784, 988, 1175, 1568].forEach((f, i) => tone('sine', f, f, 1, 0.04, i * 0.02));
    hiss(0.5, 0.1, 'bandpass', 2400);
  },
  wardlight() {
    [1175, 1568, 2093].forEach((f, i) => tone('sine', f, f * 1.01, 0.6, 0.03, i * 0.08));
  },
  hexBolt() {
    tone('sine', 180, 90, 0.4, 0.07);
    tone('triangle', 90, 180, 0.35, 0.03, 0.05);
    hiss(0.3, 0.04, 'lowpass', 500);
  },
  graspRise() {
    tone('sine', 70, 110, 0.5, 0.08);
    hiss(0.5, 0.05, 'lowpass', 400);
  },
  graspClose() {
    tone('square', 140, 60, 0.12, 0.05);
    hiss(0.2, 0.08, 'lowpass', 700);
    tone('sine', 110, 104, 0.8, 0.05, 0.05);
  },
  vigilLantern() {
    [784, 1175, 1568].forEach((f, i) => tone('triangle', f, f, 0.5, 0.03, i * 0.06));
    hiss(0.4, 0.02, 'highpass', 3000);
  }, // (Lantern of Vigil lit)
  lanternShot() {
    tone('sine', 1568, 1760, 0.12, 0.025);
  },
  soulHarvest() {
    tone('sine', 110, 82, 1.2, 0.08);
    tone('triangle', 330, 220, 0.8, 0.04, 0.05);
    hiss(0.9, 0.04, 'bandpass', 500);
  }, // (every hex reaped at once)
  ferryToll() {
    tone('sine', 1760, 1760, 0.1, 0.05);
    tone('sine', 147, 139, 1.4, 0.08, 0.05);
    tone('sine', 220, 208, 1.1, 0.04, 0.1);
  },
  eclipse() {
    tone('sine', 110, 55, 1, 0.1);
    tone('sine', 988, 494, 0.9, 0.03);
    hiss(0.6, 0.05, 'lowpass', 600);
  },
  blackfire() {
    tone('sine', 90, 60, 0.6, 0.08);
    hiss(0.5, 0.08, 'bandpass', 900);
    crackles(6, 0.4, 0.04);
  },
  // soul motes and the lodestone shard: a pale breath taken and let go, a black one's spill, a hallowed chord;
  // the shard's click and the hum of the lodestone
  soulTake() {
    tone('sine', 660, 990, 0.35, 0.04);
    tone('sine', 1320, 1980, 0.3, 0.02, 0.06);
    hiss(0.25, 0.02, 'highpass', 5000, 0.04);
  },
  soulLost() {
    tone('sine', 1175, 392, 0.5, 0.06);
    hiss(0.4, 0.05, 'bandpass', 1800);
  },
  soulBurn() {
    tone('triangle', 494, 988, 0.3, 0.05);
    hiss(0.3, 0.06, 'highpass', 3000);
  },
  soulHex() {
    tone('sine', 147, 73, 0.9, 0.08);
    tone('sine', 1319, 659, 0.6, 0.02, 0.05);
    hiss(0.5, 0.05, 'lowpass', 500);
  },
  soulMend() {
    [587, 740, 880].forEach((f, i) => tone('sine', f, f, 1, 0.035, i * 0.06));
  },
  shard() {
    tone('square', 1800, 1700, 0.03, 0.04);
    tone('sine', 110, 220, 0.6, 0.07, 0.02);
    tone('sine', 880, 1760, 0.4, 0.03, 0.08);
  },
  // artifacts: the antler's lance, a bolt's echo off stone, the choir's hymn, the last rite, the salt's hiss
  antlerLance() {
    tone('triangle', 1568, 1480, 0.35, 0.04);
    tone('sine', 2349, 2300, 0.3, 0.02, 0.03);
    hiss(0.2, 0.04, 'highpass', 4000);
  },
  echo() {
    tone('sine', 660, 620, 0.12, 0.03);
    tone('sine', 660, 620, 0.12, 0.015, 0.09);
  },
  choir() {
    [262, 330, 392, 523].forEach((f, i) => {
      tone('sine', f, f, 1.6, 0.05, i * 0.05);
      tone('triangle', f * 2, f * 2, 1.2, 0.012, i * 0.05 + 0.02);
    });
    hiss(1.2, 0.015, 'bandpass', 2000);
  },
  lastRite() {
    tone('sine', 196, 196, 1.6, 0.08);
    [392, 494, 587].forEach((f, i) => tone('sine', f, f, 1.2, 0.04, 0.2 + i * 0.12));
    hiss(0.8, 0.03, 'lowpass', 900);
  },
  saltForm() {
    hiss(0.5, 0.05, 'highpass', 5000);
    tone('sine', 1760, 1976, 0.3, 0.015, 0.1);
  },
  saltBreak() {
    hiss(0.25, 0.06, 'bandpass', 3000);
  },
  guardians() {
    tone('square', 70, 55, 0.5, 0.06);
    hiss(0.5, 0.08, 'lowpass', 400);
    [1319, 1568].forEach((f, i) => tone('triangle', f, f * 0.7, 0.4, 0.02, i * 0.06));
  },
  // floor 4's foes: the wickmouse's squeak, the chime bat's bell and its strike, the gargoyle's grinding wake and landing, the fawn's healing
  squeak() {
    tone('sine', 1900, 2600, 0.05, 0.03);
    tone('sine', 2200, 2900, 0.05, 0.025, 0.07);
  },
  chime() {
    tone('triangle', 1760, 1740, 0.6, 0.05);
    tone('sine', 2637, 2600, 0.5, 0.03, 0.01);
    tone('sine', 3520, 3480, 0.3, 0.015, 0.02);
  },
  zap() {
    hiss(0.12, 0.12, 'highpass', 3500);
    tone('square', 900, 120, 0.1, 0.05);
    crackles(4, 0.15, 0.04);
  },
  grind() {
    hiss(0.3, 0.1, 'lowpass', 350);
    tone('square', 70, 55, 0.25, 0.04);
  },
  stoneLand() {
    tone('sine', 110, 45, 0.3, 0.12);
    hiss(0.2, 0.08, 'lowpass', 600);
    [2349, 1760].forEach((f, i) => tone('triangle', f, f * 0.7, 0.25, 0.025, i * 0.04));
  },
  fawnHeal() {
    [784, 988, 1175, 1568].forEach((f, i) => tone('sine', f, f, 0.45, 0.035, i * 0.07));
    hiss(0.4, 0.02, 'highpass', 5000, 0.1);
  },
  // floor 5's foes: the rootling's digging and rumble, the storm ray's rush, the void mote's gulp and spill, the tortoise's shell
  dig() {
    hiss(0.3, 0.08, 'lowpass', 500);
    tone('sine', 140, 80, 0.2, 0.04);
  },
  rumble() {
    tone('sine', 60, 50, 0.6, 0.1);
    hiss(0.5, 0.06, 'lowpass', 300);
  },
  rayPass() {
    hiss(0.5, 0.07, 'bandpass', 900);
    tone('sine', 300, 500, 0.4, 0.03);
    crackles(5, 0.4, 0.03);
  },
  gulp() {
    tone('sine', 420, 140, 0.16, 0.06);
  },
  spill() {
    tone('sine', 140, 520, 0.35, 0.06);
    hiss(0.35, 0.06, 'bandpass', 700);
  },
  shellIn() {
    tone('square', 260, 180, 0.06, 0.04);
    hiss(0.08, 0.05, 'bandpass', 1200);
  },
  // the bosses of floors 4 and 5: the hart's bell-voice, drumming hooves and light; the angler's hum, bite and spit
  hartBellow() {
    tone('sine', 196, 185, 1.1, 0.08);
    tone('triangle', 392, 370, 0.9, 0.04, 0.05);
    tone('sine', 587, 554, 0.8, 0.025, 0.12);
    hiss(0.5, 0.03, 'highpass', 4500, 0.1);
  },
  hartCharge() {
    for (let i = 0; i < 6; i++) tone('sine', 95, 55, 0.08, 0.09, i * 0.08);
    hiss(0.5, 0.07, 'lowpass', 500);
  },
  hartSpokes() {
    [880, 1175, 1319].forEach((f, i) => tone('sine', f, f, 0.5, 0.035, i * 0.06));
    hiss(0.3, 0.03, 'highpass', 5000);
  },
  anglerHum() {
    tone('sine', 147, 139, 1.8, 0.07);
    tone('sine', 220, 208, 1.6, 0.045, 0.1);
    tone('triangle', 441, 417, 1.3, 0.02, 0.2);
  },
  bite() {
    tone('square', 320, 70, 0.09, 0.09);
    hiss(0.12, 0.12, 'bandpass', 1300);
  },
  spit() {
    hiss(0.14, 0.08, 'bandpass', 650);
    tone('sine', 280, 110, 0.16, 0.05);
  },
  // bosses: the War-Tiger's roar (stone giving as it wakes), and a plate knocked off it, bronze or stone
  tigerRoar() {
    tone('sawtooth', 110, 70, 0.9, 0.06);
    tone('sine', 165, 98, 1, 0.08);
    hiss(0.8, 0.08, 'lowpass', 900);
    hiss(0.5, 0.03, 'highpass', 3500, 0.1);
  },
  dragonCall() {
    tone('sawtooth', 146, 196, 0.5, 0.04);
    tone('sine', 293, 392, 0.6, 0.04, 0.05);
    hiss(0.4, 0.03, 'bandpass', 1400, 0.1);
  },
  dragonFire() {
    hiss(1, 0.12, 'lowpass', 900);
    tone('sawtooth', 90, 60, 1, 0.05);
    crackles(10, 0.9, 0.04);
  },
  dragonFrost() {
    hiss(1, 0.09, 'highpass', 3200);
    tone('sine', 1760, 1320, 0.9, 0.03);
    [2637, 3136].forEach((f, i) => tone('triangle', f, f * 0.9, 0.6, 0.02, i * 0.1));
  },
  claw() {
    for (let i = 0; i < 3; i++) hiss(0.09, 0.09, 'bandpass', 2600 - i * 350, i * 0.035);
    tone('sawtooth', 420, 130, 0.14, 0.03);
  },
  plateBreak() {
    [1480, 1975, 2490].forEach((f, i) => tone('triangle', f, f * 0.96, 0.5 - i * 0.1, 0.04, i * 0.01));
    tone('sine', 220, 90, 0.3, 0.07);
    hiss(0.3, 0.08, 'bandpass', 1600);
  },
  drakeLand() {
    tone('sine', 90, 40, 0.4, 0.14);
    hiss(0.35, 0.1, 'highpass', 3500);
    [2637, 2093].forEach((f, i) => tone('triangle', f, f * 0.7, 0.3, 0.03, i * 0.04));
  },
  // pieces from the lore: a watching statue's gaze settling on the mage and its ray; a hex blinding it; an
  // obelisk's ward breaking
  statueMark() {
    tone('sine', 220, 440, 0.7, 0.05);
    tone('triangle', 330, 660, 0.7, 0.025, 0.05);
    hiss(0.6, 0.02, 'highpass', 4000);
  },
  statueRay() {
    hiss(0.25, 0.12, 'highpass', 3000);
    tone('sawtooth', 1320, 180, 0.25, 0.05);
    tone('sine', 660, 330, 0.4, 0.04);
  },
  statueBlind() {
    tone('sine', 520, 130, 0.5, 0.05);
    hiss(0.4, 0.04, 'lowpass', 900);
  },
  wardShatter() {
    [1568, 1175, 880, 659].forEach((f, i) => tone('triangle', f, f * 0.8, 0.35, 0.035, i * 0.05));
    hiss(0.4, 0.08, 'highpass', 3000);
  },
  // the drinking ward: a spell drunk, the ward bursting; a Wardling swelling and letting its volley go
  wardDrink() {
    tone('sine', 660, 220, 0.35, 0.06);
    tone('sine', 990, 330, 0.3, 0.03, 0.04);
    hiss(0.25, 0.03, 'bandpass', 1400);
  },
  wardBurst() {
    tone('sine', 110, 55, 0.6, 0.12);
    [880, 1320, 1760].forEach((f, i) => tone('triangle', f, f * 0.6, 0.5, 0.04, i * 0.06));
    hiss(0.5, 0.1, 'highpass', 2500);
  },
  wardlingSwell() {
    tone('sine', 300, 700, 0.5, 0.04);
  },
  // the Wandering Merchant: the bell on the merchant's staff, riding in; the crow
  wandererBell() {
    [1320, 1760, 1480].forEach((f, i) => tone('triangle', f, f * 0.98, 0.5, 0.04, i * 0.18));
  },
  crow() {
    tone('sawtooth', 620, 380, 0.18, 0.05);
    tone('sawtooth', 580, 360, 0.16, 0.04, 0.22);
  },
  wardlingShot() {
    tone('triangle', 700, 260, 0.15, 0.05);
    hiss(0.1, 0.04, 'bandpass', 1800);
  },
  // bestiary, floor 1. Umbral: a spider's thread and fall, webs; ink; a grimoire's covers and pages
  spiderTell() {
    hiss(0.5, 0.03, 'highpass', 4500);
    tone('sine', 1800, 2400, 0.45, 0.012);
  },
  spiderLand() {
    tone('sine', 140, 60, 0.2, 0.1);
    for (let i = 0; i < 4; i++) hiss(0.04, 0.05, 'bandpass', 3000 + i * 400, i * 0.03);
  },
  spiderClimb() {
    hiss(0.5, 0.03, 'highpass', 4000);
    tone('sine', 2400, 1800, 0.45, 0.01);
  },
  webSpit() {
    hiss(0.15, 0.07, 'bandpass', 1600);
    tone('sine', 420, 260, 0.12, 0.03);
  },
  webLand() {
    hiss(0.12, 0.05, 'bandpass', 2200);
  },
  webBurn() {
    crackles(8, 0.4, 0.05);
    hiss(0.35, 0.06, 'highpass', 2600);
  },
  inkSwell() {
    tone('sine', 90, 140, 0.55, 0.06);
    hiss(0.5, 0.04, 'lowpass', 600);
  },
  inkSquirt() {
    hiss(0.4, 0.14, 'lowpass', 800);
    tone('sine', 120, 60, 0.3, 0.07);
  },
  inkSplit() {
    hiss(0.3, 0.12, 'lowpass', 900);
    tone('sine', 200, 90, 0.25, 0.07);
    tone('sine', 260, 120, 0.25, 0.05, 0.06);
  },
  inkCrack() {
    [1760, 1320, 2093].forEach((f, i) => tone('triangle', f, f * 0.8, 0.3, 0.035, i * 0.04));
    hiss(0.25, 0.07, 'highpass', 3000);
  },
  bookWake() {
    hiss(0.4, 0.07, 'bandpass', 2600);
    tone('sine', 160, 240, 0.35, 0.04);
  },
  pageRiffle() {
    for (let i = 0; i < 8; i++) hiss(0.03, 0.05, 'bandpass', 3200 + Math.random() * 1500, i * 0.045);
  },
  bookSnap() {
    hiss(0.06, 0.12, 'bandpass', 900);
    tone('square', 180, 90, 0.08, 0.06);
  },
  // Hallow: the swarm's glow and stream, a beetle going out; the lark's song and cry
  swarmGlow() {
    [1319, 1568, 1976].forEach((f, i) => tone('sine', f, f * 1.02, 0.55, 0.02, i * 0.08));
  },
  swarmStream() {
    hiss(0.5, 0.05, 'highpass', 5000);
    [2349, 2637, 2960, 3136].forEach((f, i) => tone('triangle', f, f, 0.1, 0.02, i * 0.09));
  },
  fireflyPop() {
    tone('sine', 2093, 3136, 0.12, 0.04);
    hiss(0.1, 0.03, 'highpass', 6000);
  },
  larkSong() {
    const n = [1568, 1760, 2093, 1976];
    n.forEach((f, i) => tone('sine', f, f * 1.06, 0.14, 0.03, i * 0.1));
  },
  larkCry() {
    tone('triangle', 2093, 2793, 0.2, 0.05);
    tone('triangle', 2637, 1976, 0.25, 0.04, 0.18);
  },
  wingBeat() {
    for (let i = 0; i < 3; i++) hiss(0.07, 0.05, 'lowpass', 900, i * 0.09);
  },
  // Storm: a mantis rearing, slashing, parrying; a rubble crab waking, snapping, flipped
  mantisRear() {
    tone('sawtooth', 300, 700, 0.45, 0.03);
    hiss(0.4, 0.03, 'highpass', 3500);
  },
  mantisSlash() {
    hiss(0.14, 0.12, 'highpass', 2800);
    tone('sawtooth', 1400, 300, 0.14, 0.04);
  },
  mantisParry() {
    tone('square', 2400, 1600, 0.07, 0.04);
    tone('triangle', 3136, 2637, 0.2, 0.03, 0.02);
    hiss(0.08, 0.06, 'highpass', 4000);
  },
  crabWake() {
    hiss(0.35, 0.1, 'lowpass', 500);
    for (let i = 0; i < 4; i++) tone('square', 300 + i * 40, 200, 0.04, 0.03, i * 0.06);
  },
  crabSnap() {
    tone('square', 900, 400, 0.05, 0.05);
    hiss(0.05, 0.08, 'bandpass', 2000);
  },
  crabFlip() {
    tone('sine', 160, 70, 0.3, 0.1);
    hiss(0.3, 0.1, 'lowpass', 700);
    for (let i = 0; i < 3; i++) tone('square', 500, 300, 0.04, 0.03, 0.1 + i * 0.07);
  },
  // floor 2. Frost: a snail's spit, its shell shutting and cracking; a newt's lunge and daze; a serpent rising and spitting
  snailSpit() {
    hiss(0.15, 0.06, 'bandpass', 1800);
    tone('sine', 900, 500, 0.15, 0.03);
  },
  snailHide() {
    tone('sine', 300, 150, 0.25, 0.06);
    hiss(0.2, 0.05, 'lowpass', 800);
    tone('triangle', 1760, 1568, 0.2, 0.02, 0.08);
  },
  snailCrack() {
    [1568, 1175, 2093].forEach((f, i) => tone('triangle', f, f * 0.75, 0.3, 0.035, i * 0.05));
    hiss(0.3, 0.08, 'highpass', 2800);
  },
  newtLunge() {
    hiss(0.25, 0.1, 'bandpass', 1200);
    tone('sine', 400, 900, 0.15, 0.04);
  },
  newtStun() {
    tone('square', 1200, 600, 0.1, 0.03);
    tone('triangle', 2400, 1800, 0.25, 0.03, 0.05);
  },
  serpentRise() {
    hiss(0.6, 0.12, 'lowpass', 700);
    tone('sine', 90, 220, 0.6, 0.07);
    crackles(3, 0.4, 0.03);
  },
  serpentSpit() {
    hiss(0.2, 0.1, 'bandpass', 1400);
    tone('sine', 600, 300, 0.18, 0.04);
  },
  // water: a walking wave rearing and crashing, and shattered in its ice
  waveRear() {
    hiss(0.7, 0.08, 'lowpass', 500);
    tone('sine', 80, 200, 0.7, 0.06);
  },
  waveCrash() {
    hiss(0.6, 0.2, 'lowpass', 1200);
    tone('sine', 140, 50, 0.4, 0.1);
  },
  iceShatter() {
    [2093, 1568, 2637, 1175].forEach((f, i) => tone('triangle', f, f * 0.7, 0.35, 0.04, i * 0.04));
    hiss(0.45, 0.12, 'highpass', 3000);
    tone('sine', 120, 50, 0.3, 0.08);
  },
  // Storm: a thunderhead gathering and its thunder; a darter's dash
  thunderGather() {
    tone('sine', 50, 70, 1, 0.08);
    hiss(0.9, 0.05, 'lowpass', 300);
  },
  thunder() {
    hiss(1.2, 0.22, 'lowpass', 400);
    tone('sawtooth', 70, 35, 0.8, 0.07);
    crackles(6, 0.3, 0.05);
  },
  darterZip() {
    tone('sawtooth', 600, 1400, 0.2, 0.03);
    hiss(0.2, 0.05, 'highpass', 4000);
  },
  // floor 3. Ember: wasps let out of their nest and curling to sting; a djinn lighting, hurling, snuffed; fire thrown and
  // landing; a magma ooze splitting; a phoenix's cry and dive, its fall to ashes and its rising
  waspOut() {
    for (let i = 0; i < 4; i++) tone('sawtooth', 220 + i * 30, 260 + i * 30, 0.12, 0.02, i * 0.05);
    hiss(0.2, 0.03, 'bandpass', 1800);
  },
  waspTell() {
    tone('sawtooth', 320, 520, 0.3, 0.025);
  },
  djinnLight() {
    hiss(0.3, 0.08, 'bandpass', 1200);
    tone('sine', 300, 600, 0.25, 0.04);
    crackles(4, 0.3, 0.03);
  },
  djinnHurl() {
    hiss(0.3, 0.1, 'lowpass', 1400);
    tone('sine', 500, 200, 0.25, 0.05);
  },
  djinnSnuff() {
    hiss(0.45, 0.1, 'highpass', 3000);
    tone('sine', 400, 120, 0.35, 0.04);
  },
  flare() {
    hiss(0.3, 0.09, 'bandpass', 900);
    crackles(3, 0.25, 0.03);
  },
  magmaSplit() {
    hiss(0.3, 0.1, 'lowpass', 600);
    tone('sine', 120, 60, 0.3, 0.08);
    crackles(5, 0.3, 0.04);
  },
  phoenixCry() {
    tone('sawtooth', 900, 1500, 0.3, 0.04);
    tone('triangle', 1800, 2400, 0.35, 0.03, 0.12);
  },
  phoenixDive() {
    hiss(0.5, 0.14, 'lowpass', 1800);
    tone('sawtooth', 700, 250, 0.4, 0.04);
  },
  phoenixFall() {
    tone('triangle', 1400, 400, 0.6, 0.05);
    hiss(0.6, 0.08, 'lowpass', 800);
  },
  phoenixRise() {
    hiss(0.7, 0.14, 'bandpass', 1000);
    [523, 784, 1047, 1568].forEach((f, i) => tone('triangle', f, f * 1.02, 0.5, 0.04, i * 0.1));
  },
  // Umbral: a basilisk's crest, its stare, blinded by holy light
  basiliskCrest() {
    tone('sawtooth', 120, 240, 0.5, 0.04);
    hiss(0.4, 0.03, 'highpass', 4500);
  },
  basiliskGaze() {
    tone('sine', 70, 60, 1.2, 0.07);
    tone('triangle', 466, 440, 1.2, 0.015);
  },
  basiliskBlind() {
    tone('triangle', 1760, 1320, 0.3, 0.03);
    tone('sawtooth', 300, 150, 0.3, 0.04);
  },
  // stone and salt: golems raising their fists and slamming, stones falling and shattering, a golem breaking and coming together
  saltRaise() {
    tone('sine', 90, 140, 0.45, 0.06);
    hiss(0.4, 0.03, 'lowpass', 500);
  },
  saltSlam() {
    tone('sine', 110, 45, 0.35, 0.12);
    hiss(0.35, 0.12, 'bandpass', 2400);
  },
  rubbleSlam() {
    tone('sine', 80, 35, 0.45, 0.14);
    hiss(0.5, 0.14, 'lowpass', 700);
  },
  rockFall() {
    tone('sine', 140, 50, 0.25, 0.1);
    hiss(0.25, 0.1, 'lowpass', 900);
  },
  rockShatter() {
    hiss(0.4, 0.14, 'bandpass', 1600);
    tone('sine', 160, 60, 0.3, 0.09);
    crackles(6, 0.25, 0.05);
  },
  golemBreak() {
    tone('sine', 90, 40, 0.5, 0.14);
    hiss(0.6, 0.16, 'lowpass', 900);
    crackles(8, 0.4, 0.05);
  },
  golemReform() {
    for (let i = 0; i < 4; i++) tone('sine', 140 - i * 15, 90, 0.12, 0.06, i * 0.08);
    hiss(0.4, 0.06, 'lowpass', 600);
  },
  // floor 4. Hallow: a griffin's cry; an eye opening, charging and loosing its ray. Storm: a harpy's screech. Umbral: a
  // shadow fox sinking into the dark and rising out of it
  griffinCry() {
    tone('sawtooth', 1200, 700, 0.35, 0.05);
    tone('triangle', 1600, 1100, 0.3, 0.03, 0.1);
  },
  eyeOpen() {
    tone('sine', 660, 990, 0.3, 0.03);
    hiss(0.2, 0.02, 'highpass', 5000);
  },
  eyeCharge() {
    tone('sine', 880, 1760, 0.5, 0.03);
    tone('triangle', 1320, 2640, 0.5, 0.015);
  },
  eyeRay() {
    tone('sawtooth', 1760, 440, 0.3, 0.05);
    hiss(0.3, 0.08, 'highpass', 3000);
  },
  harpyScreech() {
    tone('sawtooth', 1800, 2600, 0.35, 0.06);
    tone('square', 2200, 1400, 0.4, 0.03, 0.05);
    hiss(0.4, 0.06, 'highpass', 4000);
  },
  foxSink() {
    tone('sine', 300, 90, 0.35, 0.05);
    hiss(0.3, 0.04, 'lowpass', 500);
  },
  foxRise() {
    tone('sine', 90, 300, 0.3, 0.05);
    hiss(0.25, 0.04, 'lowpass', 700);
  },
  // floor 5. Frost: a glacier golem's stomp, a jackalope's stamp, a wolf's howl and whimper. Umbral: a hydra spitting,
  // a head cut off and growing back; a raven's caw; a pangolin rolling; a manticore's tail and pounce
  glacierStomp() {
    tone('sine', 70, 35, 0.5, 0.14);
    [1760, 2093, 1568].forEach((f, i) => tone('triangle', f, f * 0.8, 0.25, 0.025, 0.1 + i * 0.07));
  },
  hareStamp() {
    tone('sine', 200, 90, 0.12, 0.06);
    [2349, 1976].forEach((f, i) => tone('triangle', f, f * 0.85, 0.15, 0.02, i * 0.04));
  },
  wolfHowl() {
    tone('sawtooth', 300, 520, 0.5, 0.03);
    tone('sine', 520, 440, 0.8, 0.04, 0.4);
  },
  wolfWhimper() {
    tone('sine', 900, 600, 0.2, 0.03);
    tone('sine', 800, 550, 0.2, 0.025, 0.2);
  },
  hydraSpit() {
    hiss(0.2, 0.09, 'bandpass', 1400);
    tone('sine', 300, 180, 0.2, 0.04);
  },
  hydraCut() {
    hiss(0.3, 0.14, 'bandpass', 900);
    tone('sawtooth', 400, 120, 0.35, 0.05);
  },
  hydraRegrow() {
    hiss(0.5, 0.06, 'lowpass', 600);
    tone('sine', 110, 260, 0.6, 0.05);
    tone('sine', 130, 300, 0.6, 0.04, 0.15);
  },
  ravenCaw() {
    tone('sawtooth', 640, 380, 0.2, 0.06);
    tone('sawtooth', 600, 360, 0.18, 0.05, 0.25);
  },
  pangolinRoll() {
    for (let i = 0; i < 6; i++) hiss(0.08, 0.05, 'lowpass', 700, i * 0.07);
    tone('sine', 120, 160, 0.4, 0.04);
  },
  manticoreTail() {
    tone('sawtooth', 220, 440, 0.4, 0.04);
    hiss(0.3, 0.03, 'highpass', 4000);
  },
  manticorePounce() {
    tone('sawtooth', 180, 90, 0.3, 0.07);
    hiss(0.3, 0.1, 'lowpass', 900);
  },
};
type Sounds = typeof sounds;
/** Sounds of the interface (picking things up, refusals, learning): their own bus, never positioned. */
const UI_SOUNDS = new Set<keyof Sounds>([
  'levelUp',
  'attrUp',
  'cardTurn',
  'cardTake',
  'potionChoose',
  'pickup',
  'relic',
  'coin',
  'key',
  'glyphPickup',
  'noGlyph',
  'learn',
  'spellFail',
  'refuse',
  'purchase',
  'pageAsk',
]);
/** Every sound, sending its tones to its bus, or to a panner at `place` when there is one. */
function route(place?: { x: number; z: number; on: boolean }): Sounds {
  const out = {} as Record<string, (...a: never[]) => void>;
  for (const [name, fn] of Object.entries(sounds) as [keyof Sounds, (...a: never[]) => void][]) {
    out[name] = (...a: never[]) => {
      if (!ctx || muted) return;
      const prev = bus,
        isUi = UI_SOUNDS.has(name);
      bus = isUi ? ui : place?.on ? spot(place.x, place.z) : fx;
      try {
        fn(...a);
      } finally {
        bus = prev;
      }
    };
  }
  return out as unknown as Sounds;
}
const here = { x: 0, z: 0, on: true },
  positioned = route(here);

export const Sfx = {
  init,
  get muted() {
    return muted;
  },
  toggle() {
    muted = !muted;
    applyVolumes();
    return muted;
  },
  /** The audio context and the music and ambience buses (docs/archive/sound-plan.md), once the first key or click has made them. */
  get buses() {
    return ctx ? { ctx, music, ambience } : null;
  },
  /** Where to send a sound built elsewhere (an animated creature's, docs/creatures.md) that happens at (x, z) in the room:
      panned and quieter further off, on the effects bus; null before the first key or click, or while muted. */
  place(x: number, z: number): { ctx: AudioContext; out: AudioNode } | null {
    return ctx && !muted ? { ctx, out: spot(x, z) } : null;
  },
  /** Where the mage stands: effects are heard from just above. */
  listen(x: number, z: number) {
    listener.x = x;
    listener.z = z;
  },
  /** The sounds, played at (x, z) in the room: `Sfx.at(foe.x, foe.z).hit()`. */
  at(x: number, z: number): Sounds {
    here.x = x;
    here.z = z;
    return positioned;
  },
  /** Volumes, 0 to 1, remembered in this browser. */
  get volumes(): Readonly<Record<VolumeKind, number>> {
    return volumes;
  },
  setVolume(kind: VolumeKind, v: number) {
    volumes[kind] = Math.max(0, Math.min(1, v));
    applyVolumes();
    try {
      localStorage.setItem(VOLUME_KEY, JSON.stringify(volumes));
    } catch {
      /* not remembered, still applied */
    }
  },
  ...route(),
};
