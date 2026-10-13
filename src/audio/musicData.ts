/* The music as data (data/music.json; docs/archive/sound-plan.md) and the composer that plays it: pure, so it is tested. A piece
   is a key and a mode, a tempo, a progression of chords, the motifs its melody is made of and its voices; `planBar`
   writes one bar of it at a time, for the mood the game is in, so it never loops the same way twice but always sounds
   like itself. */
import data from '../../data/music.json';

export const MODES = {
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  phrygianDominant: [0, 1, 4, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
} as const;
export type Mode = keyof typeof MODES;

export const MOODS = ['title', 'explore', 'fight', 'boss', 'low', 'quiet'] as const;
export type Mood = (typeof MOODS)[number];
export const STEMS = ['drone', 'harmony', 'melody', 'pulse'] as const;
export type Stem = (typeof STEMS)[number];

export const MELODY_VOICES = ['lyre', 'harp', 'oud', 'bowed', 'bell', 'underbell', 'voice', 'pluckLow'] as const;
export const HARMONY_VOICES = ['strings', 'choir', 'organ'] as const;
export const DRONE_VOICES = ['strings', 'organ', 'hum', 'horn', 'water', 'deep'] as const;
export const DRUMS = ['frame', 'taiko', 'hand', 'timpani', 'heart', 'thump'] as const;
export type MelodyVoice = (typeof MELODY_VOICES)[number];
export type HarmonyVoice = (typeof HARMONY_VOICES)[number];
export type DroneVoice = (typeof DRONE_VOICES)[number];
export type Drum = (typeof DRUMS)[number];

/** A motif: scale steps from where it is placed (null a rest) and how many beats each lasts. */
export type Motif = [number | null, number][];
export interface Chord {
  notes: number[];
  bars: number;
}
export interface DrumPart {
  drum: Drum;
  gain: number;
  explore?: string;
  fight?: string;
  boss?: string;
}
export interface Piece {
  id: string;
  name: string;
  tempo: number;
  beats: number;
  root: number;
  mode: Mode;
  chords: Chord[];
  motifs: Motif[];
  /** The title's melody, written out: it plays through the progression instead of the motifs. */
  theme?: Motif;
  drone: { voice: DroneVoice; notes: number[]; gain: number };
  harmony: { voice: HarmonyVoice; octave: number; vowel?: 'a' | 'o' | 'u' | 'e' | 'm'; spread?: number; gain: number };
  melody: { voices: MelodyVoice[]; octave: number; gain: number };
  pulse: DrumPart[];
  bass?: { voice: 'pluck' | 'bowed'; octave: number; gain: number; fight?: string; boss?: string };
  bell?: { midi: number; every: number; gain: number };
  /** How likely a bar is to begin a phrase when the melody rests, per mood. */
  density: Partial<Record<Mood, number>>;
}
export interface Note {
  stem: Stem;
  voice: string;
  midi: number[];
  at: number;
  dur: number;
  vel: number;
}

export const PIECES = (data as unknown as { pieces: Piece[] }).pieces;
export const MOOD_GAINS = (data as unknown as { moods: Record<Mood, Record<Stem, number>> }).moods;
export const pieceById = (id: string) => PIECES.find((p) => p.id === id);
/** The piece each floor plays (0-based; past the last, the last's) and the title's. */
export const FLOOR_PIECES = (data as unknown as { floors: string[] }).floors;
export const floorPiece = (floor: number) => FLOOR_PIECES[Math.max(0, Math.min(FLOOR_PIECES.length - 1, floor))];
export const TITLE_PIECE = (data as unknown as { title: string }).title;
/** M7 step 2: a boss with a theme of its own, played in its fight in place of the floor's piece (Kaelith's). */
export const BOSS_PIECES = (data as unknown as { bosses?: Record<string, string> }).bosses ?? {};
/** M7 step 3: the piece a won run's dawn plays, at the cave mouth and under the end screen. */
export const DAYLIGHT_PIECE = (data as unknown as { daylight: string }).daylight;
/** M7 step 5: the piece the Vigil plays, between the descents. */
export const VIGIL_PIECE = (data as unknown as { vigil: string }).vigil;

export const barSeconds = (p: Piece) => (p.beats * 60) / p.tempo;
export const progressionBars = (p: Piece) => p.chords.reduce((a, c) => a + c.bars, 0);
/** The chord under bar `bar`, and whether it begins there. */
export function chordAt(p: Piece, bar: number): { chord: Chord; starts: boolean } {
  let b = bar % progressionBars(p);
  for (const chord of p.chords) {
    if (b < chord.bars) return { chord, starts: b === 0 };
    b -= chord.bars;
  }
  return { chord: p.chords[0], starts: true };
}
const mod = (a: number, n: number) => ((a % n) + n) % n;
/** The mode's seven pitches (semitones from the root) under a chord: a step a semitone off one of the chord's notes takes
    the chord's note instead, so the melody never rubs against the harmony (a flat second, a borrowed chord). */
export function scaleUnder(mode: Mode, chord: readonly number[]): number[] {
  const pcs = chord.map((n) => mod(n, 12));
  return MODES[mode].map((s) => {
    if (pcs.includes(s)) return s;
    const near = pcs.find((c) => mod(c - s, 12) === 1 || mod(s - c, 12) === 1);
    return near !== undefined && !MODES[mode].includes(near as never) ? near : s;
  });
}
/** A scale step as semitones from the root (steps past seven climb the octave). */
export const stepSemis = (scale: readonly number[], step: number) => scale[mod(step, 7)] + 12 * Math.floor(step / 7);

/** The composer's memory between bars: the melody's queue, where it is placed, what spills into the next bar. */
export interface ComposerState {
  queue: Motif;
  anchor: number;
  carry: number;
  voice: MelodyVoice;
}
export const newComposer = (p: Piece): ComposerState => ({ queue: [], anchor: 0, carry: 0, voice: p.melody.voices[0] });

/** One phrase from the motifs: placed on a note of the chord near the last, sometimes turned upside down, slowed or cut
    short, then a rest. */
export function phrase(p: Piece, chord: readonly number[], st: ComposerState, rnd: () => number, mood: Mood): Motif {
  const motif = p.motifs[Math.floor(rnd() * p.motifs.length)];
  const scale = scaleUnder(p.mode, chord),
    pcs = chord.map((n) => mod(n, 12));
  const tones = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].filter((s) => pcs.includes(mod(stepSemis(scale, s), 12)));
  const near = tones.filter((s) => Math.abs(s - st.anchor) <= 3);
  st.anchor = (near.length ? near : tones)[Math.floor(rnd() * (near.length || tones.length))] ?? 0;
  const invert = rnd() < 0.22,
    slow = mood === 'explore' && rnd() < 0.25,
    cut = rnd() < 0.2 && motif.length > 3;
  let notes: Motif = motif.map(([s, b]) => [s === null ? null : st.anchor + (invert ? -s : s), slow ? b * 2 : b]);
  if (cut) {
    notes = notes.slice(0, notes.length - 1);
    const last = notes[notes.length - 1];
    last[1] += 1;
  }
  const steps = notes.flatMap(([s]) => (s === null ? [] : [s])),
    hi = Math.max(...steps),
    lo = Math.min(...steps);
  if (hi > 10) notes = notes.map(([s, b]) => [s === null ? null : s - 7, b]);
  else if (lo < -4) notes = notes.map(([s, b]) => [s === null ? null : s + 7, b]);
  st.voice = p.melody.voices[Math.floor(rnd() * p.melody.voices.length)];
  const rest = mood === 'explore' ? 2 + Math.floor(rnd() * p.beats * 1.5) : 1 + Math.floor(rnd() * p.beats * 0.75);
  return [...notes, [null, rest]];
}

const PATTERN = /^[xo.]+$/;
/** The hits of a drum pattern ("x" accented, "o" soft, "." silent) across a bar of `beats`. */
export function hits(pattern: string, beats: number): { at: number; vel: number }[] {
  const step = beats / pattern.length;
  const out: { at: number; vel: number }[] = [];
  [...pattern].forEach((c, i) => {
    if (c !== '.') out.push({ at: i * step, vel: c === 'x' ? 1 : 0.55 });
  });
  return out;
}

/** One bar of the piece for the mood: the chord when it changes, the drone's bell, the drums and the bass, and the
    melody (the theme's notes on the title, else the motifs). `rnd` is the composer's stream. */
export function planBar(p: Piece, bar: number, mood: Mood, st: ComposerState, rnd: () => number): Note[] {
  const out: Note[] = [],
    { chord, starts } = chordAt(p, bar),
    root = p.root;
  if (mood === 'quiet') return out;
  if (starts)
    out.push({
      stem: 'harmony',
      voice: p.harmony.voice,
      midi: chord.notes.map((n) => root + 12 * p.harmony.octave + n),
      at: 0,
      dur: chord.bars * p.beats,
      vel: 1,
    });
  if (p.bell && bar % p.bell.every === 0)
    out.push({ stem: 'drone', voice: 'bell', midi: [p.bell.midi], at: 0, dur: p.beats, vel: 1 });
  if (mood === 'low') {
    // the music thins to the drone and a heartbeat
    const dub = (0.3 * p.tempo) / 60;
    for (let b = 0; b < p.beats; b += Math.max(1, Math.round(p.tempo / 60)))
      out.push(
        { stem: 'pulse', voice: 'heart', midi: [], at: b, dur: 1, vel: 1 },
        { stem: 'pulse', voice: 'heart', midi: [], at: b + dub, dur: 1, vel: 0.6 },
      );
    return out;
  }
  const key = mood === 'boss' ? 'boss' : mood === 'fight' ? 'fight' : 'explore';
  for (const d of p.pulse) {
    const pat = d[key] ?? (key === 'boss' ? d.fight : undefined);
    if (pat)
      for (const h of hits(pat, p.beats))
        out.push({ stem: 'pulse', voice: d.drum, midi: [], at: h.at, dur: 1, vel: h.vel * d.gain });
  }
  const bassPat =
    p.bass && (key === 'boss' ? (p.bass.boss ?? p.bass.fight) : key === 'fight' ? p.bass.fight : undefined);
  if (p.bass && bassPat)
    for (const h of hits(bassPat, p.beats))
      out.push({
        stem: 'pulse',
        voice: `bass-${p.bass.voice}`,
        midi: [root + 12 * p.bass.octave + mod(chord.notes[0], 12)],
        at: h.at,
        dur: (p.beats / bassPat.length) * 1.8,
        vel: h.vel * p.bass.gain,
      });
  // the melody: notes from the queue until the bar is full, a new phrase when it runs dry (or a rest)
  const scale = scaleUnder(p.mode, chord.notes),
    melodyRoot = root + 12 * p.melody.octave;
  let at = st.carry;
  while (at < p.beats) {
    if (!st.queue.length) {
      if (mood === 'title' && p.theme) {
        st.queue = p.theme.slice();
        st.voice = p.melody.voices[0];
        continue;
      }
      if (rnd() < (p.density[mood] ?? 0.5)) st.queue = phrase(p, chord.notes, st, rnd, mood);
      else {
        at = p.beats;
        break;
      } // (a bar's rest)
    }
    const [s, b] = st.queue.shift()!;
    if (s !== null)
      out.push({
        stem: 'melody',
        voice: st.voice,
        midi: [melodyRoot + stepSemis(scale, s)],
        at,
        dur: b,
        vel: 0.75 + rnd() * 0.25,
      });
    at += b;
  }
  st.carry = Math.max(0, at - p.beats);
  return out;
}

/** Every piece checked: a known mode and voices, chords and motifs, patterns of x, o and ., a theme as long as its
    progression, and a mood's gains for every stem. */
export function validateMusic(
  d = data as unknown as { pieces: Piece[]; moods: Record<Mood, Record<Stem, number>> },
): string[] {
  const errs: string[] = [];
  for (const m of MOODS)
    for (const s of STEMS) if (!(d.moods?.[m]?.[s] >= 0)) errs.push(`mood ${m} needs a gain for ${s}`);
  for (const id of [...FLOOR_PIECES, TITLE_PIECE, DAYLIGHT_PIECE, VIGIL_PIECE, ...Object.values(BOSS_PIECES)])
    if (!d.pieces.some((p) => p.id === id)) errs.push(`no piece "${id}"`);
  for (const p of d.pieces) {
    const at = `piece "${p.id}"`;
    if (!p.name) errs.push(`${at} needs a name`);
    if (!(p.mode in MODES)) errs.push(`${at} has unknown mode "${p.mode}"`);
    if (!(p.tempo >= 30 && p.tempo <= 200) || !(p.beats >= 2 && p.beats <= 12))
      errs.push(`${at}: tempo 30 to 200, 2 to 12 beats a bar`);
    if (!(p.root >= 36 && p.root <= 64)) errs.push(`${at}: root between C2 and E4`);
    if (!p.chords?.length || p.chords.some((c) => !(c.bars >= 1) || !c.notes?.length))
      errs.push(`${at}: chords need notes and bars`);
    if (!p.motifs?.length || p.motifs.some((m) => !m.length || m.some(([, b]) => !(b > 0))))
      errs.push(`${at}: motifs need notes of some length`);
    if (p.theme) {
      const beats = p.theme.reduce((a, [, b]) => a + b, 0);
      if (Math.abs(beats - progressionBars(p) * p.beats) > 1e-6)
        errs.push(`${at}: its theme lasts ${beats} beats, its progression ${progressionBars(p) * p.beats}`);
    }
    if (!DRONE_VOICES.includes(p.drone?.voice)) errs.push(`${at}: unknown drone "${p.drone?.voice}"`);
    if (!HARMONY_VOICES.includes(p.harmony?.voice)) errs.push(`${at}: unknown harmony "${p.harmony?.voice}"`);
    if (!p.melody?.voices?.length || p.melody.voices.some((v) => !MELODY_VOICES.includes(v)))
      errs.push(`${at}: unknown melody voice`);
    for (const d2 of p.pulse ?? []) {
      if (!DRUMS.includes(d2.drum)) errs.push(`${at}: unknown drum "${d2.drum}"`);
      for (const k of ['explore', 'fight', 'boss'] as const)
        if (d2[k] !== undefined && !PATTERN.test(d2[k]!)) errs.push(`${at}: ${d2.drum}'s ${k} pattern is x, o and .`);
    }
    for (const k of ['fight', 'boss'] as const)
      if (p.bass?.[k] !== undefined && !PATTERN.test(p.bass[k]!))
        errs.push(`${at}: the bass's ${k} pattern is x, o and .`);
  }
  return errs;
}
