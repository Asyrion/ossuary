/* The townspeople at the Vigil (M7 step 7; docs/M7-plan.md, decisions 11 and 12): each shade the mage has freed stands at
   its own spot round the Nave (data/vigil.json's `town`), its own figure (townLooks.ts) facing the Great Circle, its head
   turning to the mage as it comes near. Walking up to one opens the talk (ui/talk.ts), latched until the mage steps away;
   a glint over a figure shows it has something unheard to say. What each says is picked from data/dialogue.json
   (dialogueData.ts's `pickLine`) on what the save knows: what the mage has found, how deep it has gone, the last run (what
   struck it last, the bosses it felled, a win), who is freed and the flags earlier choices set. The Ferryman says his first
   line as the mage reaches the jetty, once. */
import * as THREE from 'three';
import type { Room, RockBox } from '../types';
import { CFG, BOSS_TYPES } from '../config';
import { G, player } from '../state';
import { STR, foeName } from '../strings';
import { Sfx } from '../audio/sfx';
import { cameraTargetFor, scene } from '../render/renderer';
import { disposeTree } from '../render/materials';
import { iconUrlOf } from '../items/artifactIcons';
import { atLeast, reactionSchools, REACTION_IDS } from '../magic/knowledge';
import { stage } from '../magic/memory';
import { SPELL_DEFS } from '../magic/spellData';
import { FOES, FOE_IDS } from '../actors/foeData';
import { bestiary } from '../actors/bestiary';
import { struckName } from '../ui/screens';
import { openTalk, talkingNow } from '../ui/talk';
import { vigil } from './save';
import { shade, SHADE_IDS } from './shadeData';
import { VIGIL, roomIndex } from './vigilMap';
import { townLook, moveTown, type TownLook } from './townLooks';
import { ferrymanLook } from './vigilLooks';
import { hasNews, pickLine, type Subject, type TalkContext } from './dialogueData';

const C = () => CFG.vigil.town;
interface Figure { id: string; look: TownLook; room: Room; x: number; z: number; armed: boolean; news: boolean; rock: RockBox }
let figures: Figure[] = [];
let ferry: { room: Room; x: number; z: number; said: boolean } | null = null;
let t = 0;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const speakerName = (id: string) => id === 'ferryman' ? STR.town.ferryman : STR.shades.names[id] ?? id;
const lightOf = (id: string) => id === 'ferryman' ? '#ffc070' : shade(id).light;
/** A speaker's icon, rendered once from its figure. */
export const speakerIcon = (id: string) => iconUrlOf('town:' + id, () => id === 'ferryman' ? ferrymanLook() : townLook(id, lightOf(id)).group, lightOf(id));

/** The run the save remembers last, and so this waking's moment: a win, a death, or (a death that felled a boss not felled
    in any run before it) that boss. */
function lastRun() {
  const [run, ...before] = vigil().echoes; if (!run) return null;
  const fresh = run.felled.filter(b => !before.some(r => r.felled.includes(b)));
  const moment: TalkContext['moment'] = run.won ? 'won' : fresh.length ? 'boss' : 'death';
  return { run, moment, boss: fresh.at(-1) ?? run.felled.at(-1) ?? null };
}
/** The key a speaker's moment is heard by: once a run. */
const momentKey = (who: string) => `${who}@run${vigil().runs}`;

/** What the talk knows now, for `who` (`moment`: the dev menu's, in place of the last run's). */
export function talkContext(who: string, moment?: TalkContext['moment']): TalkContext {
  const v = vigil(), last = lastRun(), book = bestiary();
  const metFoes = FOE_IDS.filter(id => book[id]?.met), weak = FOE_IDS.filter(id => book[id]?.weak);
  const boss = last?.boss ?? null, struck = last?.run.struck ?? null;
  const subjects: TalkContext['subjects'] = {
    weakness: metFoes.filter(id => !book[id].weak && FOES[id].floor > 0 && FOES[id].weak).sort((a, b) => FOES[a].floor - FOES[b].floor)
      .map((id): Subject => ({ key: id, vars: { foe: foeName(id), school: STR.schools[FOES[id].weak!] } })),
    bossFear: BOSS_TYPES.filter(b => book[b]?.met && (CFG.enemy[b] as { weak?: string }).weak)
      .map((b): Subject => ({ key: b, vars: { boss: cap(struckName(b)), school: STR.schools[(CFG.enemy[b] as { weak: string }).weak] } })),
    reaction: REACTION_IDS.filter(r => !v.reactions.includes(r))
      .map((r): Subject => { const [a, b] = reactionSchools(r); return { key: r, vars: { reaction: STR.reactions[r], a: STR.schools[a], b: STR.schools[b] } }; }),
  };
  return {
    moment: moment !== undefined ? moment : last?.moment ?? null, momentSaid: moment ? false : vigil().heard[momentKey(who)] !== undefined,
    struck: moment === undefined ? struck : moment === 'death' ? struck : null, felled: last?.run.felled ?? [],
    found: { spells: SPELL_DEFS.filter(d => atLeast(stage(d.id), 'learned')).map(d => d.id), foes: metFoes, weak, reactions: [...v.reactions], recipes: [...v.recipes.potions] },
    deepest: v.deepest, runs: v.runs, wins: v.wins, freed: [...v.freed], flags: { ...v.flags }, subjects,
    vars: { struck: struck ? cap(struckName(struck)) : '', boss: boss ? cap(struckName(boss)) : '' },
  };
}

/** `who` talks: the line picked for it now (or for the dev menu's `moment`). False when it has nothing to say. */
export function talkTo(who: string, moment?: TalkContext['moment']) {
  const c = talkContext(who, moment), line = pickLine(who, c, vigil().heard);
  if (!line) return false;
  const f = figures.find(x => x.id === who), at = f ?? (who === 'ferryman' ? ferry : null);
  if (at) Sfx.at(at.x, at.z).talk(); else Sfx.talk();
  const said = c.moment && line.line.moment === c.moment ? [momentKey(who)] : [];
  // (the panel goes at the top when the speaker stands in the screen's lower half: south of where the camera is heading, its
  // middle half a tile up the screen for its height)
  const low = !!at && at.z - .4 > cameraTargetFor(G.current, player.x, player.z).z;
  openTalk(who, speakerName(who), speakerIcon(who), line, said, low);
  return true;
}

/** The Vigil furnished: the freed stand at their spots in the Nave, each blocking its tile, facing the circle. */
export function standTown(rooms: Room[]) {
  clearTown();
  const room = rooms[roomIndex(VIGIL, VIGIL.town.room)], circle = VIGIL.circle;
  const mid = { x: room.bounds.minX + circle.at[0], z: room.bounds.minZ + circle.at[1] };
  for (const id of vigil().freed) {
    const spot = VIGIL.town.spots[id]; if (!spot || !SHADE_IDS.includes(id)) continue;
    const x = room.bounds.minX + spot[0] + .5, z = room.bounds.minZ + spot[1] + .5, look = townLook(id, shade(id).light);
    look.group.position.set(x - room.cx, 0, z - room.cz); look.group.rotation.y = Math.atan2(mid.x - x, mid.z - z);
    room.group.add(look.group);
    const rock = { x, z, hx: .4, hz: .4, hp: 0, breakable: false, shade: true } as RockBox; room.rocks.push(rock);
    figures.push({ id, look, room, x, z, armed: true, news: false, rock });
  }
  refreshNews();
}
/** The Ferryman stands in his boat: where the mage reaching the jetty hears his first line. */
export function ferryAt(room: Room, x: number, z: number) { ferry = { room, x, z, said: vigil().heard['ferryman.first'] !== undefined }; }
/** Which figures have something unheard to say (their glint), worked out again after each talk. */
function refreshNews() { for (const f of figures) f.news = hasNews(f.id, talkContext(f.id), vigil().heard); }

let wasTalking: string | null = null;
/** Each step at the Vigil (even while the game waits): the figures sway and watch, the one talking gestures; while playing,
    the one walked up to talks, and the Ferryman at the jetty. */
export function updateTown(dt: number, playing: boolean) {
  t += dt;
  const talking = talkingNow();
  if (wasTalking && !talking) refreshNews();
  wasTalking = talking;
  for (const f of figures) {
    const near = G.current === f.room && Math.hypot(player.x - f.x, player.z - f.z) < C().watch;
    const toMage = near ? Math.atan2(player.x - f.x, player.z - f.z) - f.look.group.rotation.y : null;
    moveTown(f.look, t, toMage === null ? null : Math.atan2(Math.sin(toMage), Math.cos(toMage)), talking === f.id, f.news && talking !== f.id);
  }
  if (!playing || talking) return;
  for (const f of figures) {
    const d = G.current === f.room ? Math.hypot(player.x - f.x, player.z - f.z) : Infinity;
    if (d < C().reach && f.armed) { f.armed = false; talkTo(f.id); return; }
    if (d > C().reach + C().rearm) f.armed = true;
  }
  if (ferry && !ferry.said && G.current === ferry.room && Math.hypot(player.x - ferry.x, player.z - ferry.z) < C().ferryReach) { ferry.said = true; talkTo('ferryman'); }
}

/** Leave the Vigil: the figures go with its rooms (they are in them); forget them. */
export function clearTown() { figures = []; ferry = null; wasTalking = null; }

/** For the tests and the dev menu: who stands where, whether each has news, and the lines heard. */
export function townInfo() {
  return { figures: figures.map(f => ({ id: f.id, x: f.x, z: f.z, news: f.news, armed: f.armed })), ferry: ferry && { x: ferry.x, z: ferry.z, said: ferry.said },
    heard: { ...vigil().heard }, flags: { ...vigil().flags }, moment: lastRun()?.moment ?? null };
}

const gallery: THREE.Group[] = [];
let gt = 0;
/** The Galleries tab: the ten figures (or those in `only`) in rows ahead of world (x, z), gesturing in turn (for the owner's
    review). */
export function townGallery(x: number, z: number, only?: string[]) {
  takeTownGallery();
  const list = SHADE_IDS.filter(id => !only || only.includes(id)), cols = Math.min(5, list.length);
  list.forEach((id, i) => {
    const look = townLook(id, shade(id).light), g = look.group;
    g.position.set(x + (i % 5 - (cols - 1) / 2) * 1.5, 0, z - 2.2 - Math.floor(i / 5) * 1.9); scene.add(g); gallery.push(g);
    g.userData.town = look;
  });
  return list.length;
}
/** Each step: the gallery's figures gesture in turn. */
export function updateTownGallery(dt: number) { if (!gallery.length) return; gt += dt; gallery.forEach((g, i) => moveTown(g.userData.town as TownLook, gt, null, Math.floor(gt / 2) % gallery.length === i, true)); }
export function takeTownGallery() { for (const g of gallery) { scene.remove(g); disposeTree(g); } gallery.length = 0; }
