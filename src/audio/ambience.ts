/* The soundscapes played (docs/archive/sound-plan.md): a floor's bed and one-shots, a room's laid over them, all heard in the
   space of where the mage is. Works on any audio context: live under the ambience bus, or offline for a preview
   (`render.ts`). One-shots are scheduled a little ahead (`pump`), so a hitch in the frame doesn't stutter them. */
import { floorScape, roomScape, spaceFor, type BedLayer, type Scape, type ShotSpec, type Space } from './ambienceData';
import { SHOTS } from './ambienceShots';
import { CFG } from '../config';
import {
  Rand,
  crackleLoop,
  loopSource,
  noiseLoop,
  placed,
  shoreLoop,
  spaceImpulse,
  streamLoop,
  type Ctx,
} from './synth';

const impulses = new WeakMap<Ctx, Map<string, AudioBuffer>>();
function impulse(ctx: Ctx, sp: Space) {
  const m = impulses.get(ctx) ?? new Map<string, AudioBuffer>();
  impulses.set(ctx, m);
  const key = `${sp.seconds}|${sp.bright}`;
  let b = m.get(key);
  if (!b) m.set(key, (b = spaceImpulse(ctx, sp.seconds, sp.bright)));
  return b;
}

/** A space (a reverb) that crossfades to another when the mage walks into a room that sounds different. */
export class SpaceNode {
  readonly input: GainNode;
  private cur: { conv: ConvolverNode; g: GainNode; key: string } | null = null;
  constructor(
    private ctx: Ctx,
    private out: AudioNode,
    private level = 1,
  ) {
    this.input = ctx.createGain();
  }
  set(sp: Space, t: number, fade = 1.2) {
    const key = `${sp.seconds}|${sp.bright}`;
    if (this.cur?.key === key) return;
    const conv = this.ctx.createConvolver(),
      g = this.ctx.createGain();
    conv.buffer = impulse(this.ctx, sp);
    this.input.connect(conv).connect(g).connect(this.out);
    g.gain.setValueAtTime(0, t);
    g.gain.setTargetAtTime(this.level, t, fade / 3);
    const old = this.cur;
    this.cur = { conv, g, key };
    if (old) {
      old.g.gain.cancelScheduledValues(t);
      old.g.gain.setTargetAtTime(0, t, fade / 4);
      const ms = (fade + 0.2) * 1000;
      setTimeout(() => {
        try {
          this.input.disconnect(old.conv);
          old.g.disconnect();
        } catch {
          /* gone */
        }
      }, ms);
    }
  }
  get space() {
    return this.cur?.key ?? '';
  }
}

/** One soundscape playing: its bed's layers and its one-shots, with a level to fade and duck it. */
export class ScapePlayer {
  private dry: GainNode;
  private wet: GainNode;
  private sources: AudioScheduledSourceNode[] = [];
  private shots: { spec: ShotSpec; next: number }[] = [];
  private wander: { layer: BedLayer; filter: BiquadFilterNode; gain: GainNode; next: number }[] = [];
  private stopped = false;
  private r: Rand;
  constructor(
    private ctx: Ctx,
    readonly id: string,
    private scape: Scape,
    dry: AudioNode,
    wet: AudioNode,
    seed = 1,
  ) {
    this.r = new Rand(seed);
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.dry.connect(dry);
    this.wet.connect(wet);
    this.dry.gain.value = 0;
    this.wet.gain.value = 0;
  }
  start(t: number, fade = 2) {
    for (const layer of this.scape.bed ?? []) this.layer(layer, t);
    for (const spec of this.scape.shots ?? [])
      this.shots.push({ spec, next: t + (spec.steady ? spec.every : this.r.wait(spec.every) * 0.6) });
    this.level(1, t, fade);
    return this;
  }
  /** Fade to `v` (the duck) over about `ramp` seconds, from wherever the level is then (a fade under way included). */
  level(v: number, t: number, ramp = 1.5) {
    for (const g of [this.dry, this.wet]) {
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(v, t, ramp / 3);
    }
  }
  stop(t: number, fade = 2) {
    if (this.stopped) return;
    this.stopped = true;
    this.level(0, t, fade);
    for (const s of this.sources) {
      try {
        s.stop(t + fade + 0.05);
      } catch {
        /* not started */
      }
    }
    const ms = (fade + 0.3) * 1000;
    setTimeout(() => {
      this.dry.disconnect();
      this.wet.disconnect();
    }, ms);
  }
  /** Schedule what falls before `until`: one-shots, and the next gust or wander of the bed's layers. */
  pump(until: number) {
    if (this.stopped) return;
    for (const s of this.shots)
      while (s.next < until) {
        const sp = s.spec,
          far = this.r.range(sp.far[0], sp.far[1]),
          pan = (this.r.next() * 2 - 1) * (0.35 + far * 0.65);
        const voice = placed(this.ctx, this.dry, this.wet, pan, far, sp.gain);
        try {
          SHOTS[sp.kind]({ ctx: this.ctx, t: s.next, out: voice, r: this.r, gain: 1 });
        } catch {
          /* a voice past the context's end */
        }
        s.next += sp.steady ? sp.every : this.r.wait(sp.every);
      }
    for (const w of this.wander)
      while (w.next < until) {
        const L = w.layer,
          span = (L.gust?.every ?? 6) * this.r.range(0.5, 1.5),
          at = w.next + span;
        if (L.sweep) {
          const [lo, hi] = L.sweep;
          w.filter.frequency.exponentialRampToValueAtTime(lo * (hi / lo) ** this.r.next(), at);
        }
        if (L.gust) w.gain.gain.linearRampToValueAtTime(L.gain * (1 - L.gust.depth * this.r.next() ** 0.7), at);
        else w.gain.gain.linearRampToValueAtTime(L.gain, at);
        w.next = at;
      }
  }
  private layer(L: BedLayer, t: number) {
    const { ctx } = this,
      g = ctx.createGain();
    g.gain.setValueAtTime(L.gain, t);
    const send = ctx.createGain();
    send.gain.value = CFG.audio.bedSend;
    g.connect(this.dry);
    g.connect(send).connect(this.wet);
    const off = this.r.next() * 30;
    if (L.kind === 'noise') {
      const src = loopSource(ctx, noiseLoop(ctx, L.colour!), t, off),
        f = ctx.createBiquadFilter();
      f.type = L.filter!;
      f.frequency.setValueAtTime(L.freq!, t);
      f.Q.value = L.q ?? 0.7;
      src.connect(f).connect(g);
      this.sources.push(src);
      if (L.sweep || L.gust) this.wander.push({ layer: L, filter: f, gain: g, next: t });
    } else if (L.kind === 'stream' || L.kind === 'crackle' || L.kind === 'shore') {
      const buf =
        L.kind === 'stream'
          ? streamLoop(ctx, L.rate!, L.lo!, L.hi!, L.thick ?? 0)
          : L.kind === 'crackle'
            ? crackleLoop(ctx, L.rate!)
            : shoreLoop(ctx, L.period!);
      const src = loopSource(ctx, buf, t, off);
      src.connect(g);
      this.sources.push(src);
    } else {
      // hum: tones that beat slowly against each other
      const n = L.freqs!.length;
      for (const [i, f] of L.freqs!.entries()) {
        const o = ctx.createOscillator(),
          og = ctx.createGain(),
          lfo = ctx.createOscillator(),
          lg = ctx.createGain();
        o.frequency.value = f;
        og.gain.value = 0.5 / n;
        lfo.frequency.value = (L.beat ?? 0.1) * (1 + i * 0.37);
        lg.gain.value = 0.4 / n;
        lfo.connect(lg).connect(og.gain);
        o.connect(og).connect(g);
        o.start(t);
        lfo.start(t);
        this.sources.push(o, lfo);
      }
    }
  }
}

/** What plays in one place: the floor's soundscape, a room's over it, and the space they are heard in. */
export class AmbienceMix {
  readonly dry: GainNode;
  readonly space: SpaceNode;
  floor = -1;
  private floorP: ScapePlayer | null = null;
  private roomP: ScapePlayer | null = null;
  private duckV = 1;
  private seed = 1;
  constructor(
    private ctx: Ctx,
    out: AudioNode,
  ) {
    this.dry = ctx.createGain();
    this.dry.connect(out);
    this.space = new SpaceNode(ctx, out, 0.9);
  }
  /** Play floor `floor`'s soundscape, and the room's (type, theme) over it, in the right space. */
  set(floor: number, roomType = 'normal', theme?: string, t = this.ctx.currentTime) {
    const over = roomScape(roomType, theme);
    let changed = false;
    if (floor !== this.floor) {
      this.floorP?.stop(t, 2.5);
      this.floor = floor;
      changed = true;
      this.floorP = new ScapePlayer(
        this.ctx,
        floorScape(floor).id,
        floorScape(floor),
        this.dry,
        this.space.input,
        ++this.seed,
      ).start(t, 3);
    }
    if ((over?.id ?? '') !== (this.roomP?.id ?? '')) {
      this.roomP?.stop(t, 1.5);
      changed = true;
      this.roomP = over
        ? new ScapePlayer(this.ctx, over.id, over.scape, this.dry, this.space.input, ++this.seed).start(t, 1.5)
        : null;
    }
    if (!changed) return; // (the director asks every step: only a change does anything)
    this.space.set(spaceFor(floor, over?.scape ?? null), t);
    this.applyDuck(t);
  }
  /** Turn the floor's bed down (a fight, the music taking over), on top of what the room asks. */
  duck(v: number, t = this.ctx.currentTime) {
    if (Math.abs(v - this.duckV) < 0.01) return;
    this.duckV = v;
    this.applyDuck(t);
  }
  private applyDuck(t: number) {
    this.floorP?.level(
      (this.roomP ? (roomScape(this.roomP.id)?.scape.duck ?? CFG.audio.themeDuck) : 1) * this.duckV,
      t,
      1.5,
    );
  }
  pump(until: number) {
    this.floorP?.pump(until);
    this.roomP?.pump(until);
  }
  stop(t = this.ctx.currentTime, fade = 2) {
    this.floorP?.stop(t, fade);
    this.roomP?.stop(t, fade);
    this.floorP = this.roomP = null;
    this.floor = -1;
  }
  get info() {
    return {
      floor: this.floor,
      scape: this.floorP?.id ?? null,
      room: this.roomP?.id ?? null,
      space: this.space.space,
      duck: this.duckV,
    };
  }
}
