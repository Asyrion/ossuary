/* Listening to the game and telling the soundscapes and the music what to play (docs/archive/sound-plan.md): one call a step
   from the loop. The floor and the room choose the soundscape and the space; the room's doors, a boss alive and the
   mage's hearts choose the music's mood; a fight won strikes a stinger, a death another. The dev menu can force any
   floor's soundscape, any room's, any piece and mood (`force`). Under the browser tests (`window.__manual`), which step
   the game by hand, it stays silent unless a test turns it on. */
import { CFG } from '../config';
import { G, player } from '../state';
import { Sfx } from './sfx';
import { AmbienceMix } from './ambience';
import { MusicPlayer } from './music';
import { BOSS_PIECES, DAYLIGHT_PIECE, VIGIL_PIECE, TITLE_PIECE, floorPiece, type Mood } from './musicData';
import { daylightOn } from '../world/daylight';
import { atVigil } from '../vigil/where';
import { VIGIL } from '../vigil/vigilMap';
import { roomScape, spaceFor } from './ambienceData';

export interface Forced { floor?: number; room?: string; theme?: string; piece?: string; mood?: Mood }

let amb: AmbienceMix | null = null, mus: MusicPlayer | null = null, ticker = 0;
let on = !(typeof window !== 'undefined' && window.__manual);
let forced: Forced | null = null;
let lastMood: Mood = 'quiet', lastRoom: unknown = null, died = false;

function ensure() {
  const b = Sfx.buses; if (!b) return null;
  if (!amb) {
    amb = new AmbienceMix(b.ctx, b.ambience); mus = new MusicPlayer(b.ctx, b.music);
    ticker = window.setInterval(() => pump(), CFG.audio.tick); // (a hidden tab draws no frames: the bars are still scheduled)
  }
  return b.ctx;
}
function pump() {
  const b = Sfx.buses; if (!b || !amb || !mus) return;
  const until = b.ctx.currentTime + (document.hidden ? CFG.audio.hiddenAhead : CFG.audio.ahead); // (a hidden tab's timers run once a second)
  amb.pump(until); mus.pump(until);
}

/** The mood the game is in: under a heart the music thins; a boss alive; the doors locked; else exploring. */
function moodNow(): Mood {
  if (G.state === 'title') return 'title';
  if (G.state === 'dying' || player.dead) return 'quiet';
  if (G.state === 'end') return 'title';
  if (player.hp > 0 && player.hp <= CFG.audio.lowHp) return 'low';
  if (G.enemies.some(e => e.isBoss && !e.dead)) return 'boss';
  return G.current?.locked ? 'fight' : 'explore';
}

/** One step: what should play, and the next bars and one-shots scheduled. */
export function updateAudio() {
  if (!on) return;
  const ctx = ensure(); if (!ctx || !amb || !mus) return;
  const t = ctx.currentTime;
  if (forced) {
    if (forced.floor !== undefined) amb.set(forced.floor, forced.room ?? 'normal', forced.theme, t); else amb.stop(t, 1);
    if (forced.piece) mus.play(forced.piece, forced.mood ?? 'explore', t); else mus.stop(t, 1.5);
    mus.muffle(false, t); pump(); return;
  }
  const mood = moodNow(), room = G.current, floor = G.run.floor;
  if (daylightOn()) { // (M7 step 3: the cave mouth at dawn, and the end screen over it: the wind, the falls, the birds, and its piece)
    amb.set(floor, 'daylight', undefined, t); amb.duck(1, t); mus.setSpace(spaceFor(floor, roomScape('daylight')?.scape ?? null), t); mus.muffle(false, t); mus.play(DAYLIGHT_PIECE, 'title', t);
  }
  else if (G.state === 'title') { amb.stop(t, 2); mus.play(TITLE_PIECE, 'title', t); }
  else if (atVigil() && G.state !== 'end') { // (M7 step 5: the Vigil between descents: its stillness and candles, the Landing's water, its piece)
    const scape = VIGIL.rooms[G.rooms.indexOf(room)]?.name === 'landing' ? 'vigilLanding' : 'vigil';
    amb.set(floor, scape, undefined, t); amb.duck(G.state === 'pause' ? CFG.audio.pauseDuck : 1, t);
    mus.setSpace(spaceFor(floor, roomScape(scape)?.scape ?? null), t); mus.muffle(G.state === 'pause', t); mus.play(VIGIL_PIECE, 'explore', t);
  }
  else if (G.state === 'end') { amb.stop(t, 3); mus.play(TITLE_PIECE, 'title', t); }
  else {
    const theme = room?.theme?.id;
    amb.set(floor, room?.type ?? 'normal', theme, t);
    mus.setSpace(spaceFor(floor, roomScape(room?.type ?? 'normal', theme)?.scape ?? null), t);
    mus.play(mood === 'boss' && BOSS_PIECES[G.run.boss] ? BOSS_PIECES[G.run.boss] : floorPiece(floor), mood, t); // (M7: Kaelith's theme in its fight)
    amb.duck(G.state === 'pause' ? CFG.audio.pauseDuck : mood === 'boss' ? CFG.audio.bossDuck : mood === 'fight' ? CFG.audio.fightDuck : 1, t);
    mus.muffle(G.state === 'pause', t);
    // a fight won in this room: a stinger; the mage fallen: the death phrase, once
    if ((lastMood === 'fight' || lastMood === 'boss') && (mood === 'explore' || mood === 'low') && room === lastRoom && room?.cleared) mus.stinger('cleared', t);
    if (G.state === 'dying' && !died) { died = true; mus.stinger('death', t); }
    if (G.state === 'play' && !player.dead) died = false;
  }
  lastMood = mood; lastRoom = room;
  pump();
}

/** The dev menu's and the tests' hand on it. */
export const AudioDirector = {
  get on() { return on; },
  /** Turn it on or off (off stops what plays). */
  set(v: boolean) { on = v; if (!v) { const t = Sfx.buses?.ctx.currentTime ?? 0; amb?.stop(t, .5); mus?.stop(t, .5); } },
  /** Play this instead of what the game asks for (null: the game again). */
  force(f: Forced | null) { forced = f; if (!on) this.set(true); },
  get forced() { return forced; },
  stinger(kind: 'cleared' | 'death') { mus?.stinger(kind); },
  get info() { return { on, forced, ambience: amb?.info ?? null, music: mus?.info ?? null, mood: lastMood }; },
  dispose() { window.clearInterval(ticker); },
};
