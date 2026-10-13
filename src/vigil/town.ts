/* The townspeople at the Vigil (M7 step 7; docs/M7-plan.md, decisions 11 and 12): each shade the mage has freed stands at
   its own spot round the Nave (data/vigil.json's `town`), its own figure (townLooks.ts) facing the Great Circle, its head
   turning to the mage as it comes near. Walking up to one opens the talk (ui/talk.ts), latched until the mage steps away;
   a glint over a figure shows it has something unheard to say. What each says is picked from data/dialogue.json
   (dialogueData.ts's `pickLine`) on what the save knows: what the mage has found, how deep it has gone, the last run (what
   struck it last, the bosses it felled, a win), who is freed and the flags earlier choices set. The Ferryman says his first
   line as the mage reaches the jetty, once. */
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { Room, RockBox } from '../types';
import { CFG, BOSS_TYPES } from '../config';
import { selfLight } from '../actors/texturePixel';
import { FINE, markFine } from '../render/pixelLook';
import { G, player } from '../state';
import { STR, foeName, struckName } from '../strings';
import { Sfx } from '../audio/sfx';
import { cameraTargetFor } from '../render/renderer';
import { iconUrlOf } from '../items/artifactIcons';
import { atLeast, reactionSchools, REACTION_IDS } from '../magic/knowledge';
import { stage } from '../magic/memory';
import { SPELL_DEFS } from '../magic/spellData';
import { FOES, FOE_IDS } from '../actors/foeData';
import { bestiary } from '../actors/bestiary';
import { UI, openTalk } from '../panels';
import { vigil } from './save';
import { shade, SHADE_IDS } from './shadeData';
import { VIGIL, roomIndex } from './vigilMap';
import { townLook, moveTown, type TownLook } from './townLooks';
import { CREATURES, loadedScene, madeModel } from '../actors/madeCreatures';
import { glow } from '../render/materials';
import { ferrymanLook } from './vigilLooks';
import { hasNews, pickLine, type Subject, type TalkContext } from './dialogueData';
import { questSaid, questState } from './gifts';

const C = () => CFG.vigil.town;
/** A made figure standing in place of the code one (the owner's Tripo models, 2026-10-09): its group, its clips, its head
    bone (turned to the mage after the clip), the clip playing, its glint, and how far its head is turned. */
interface Made {
  group: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  head?: THREE.Object3D;
  clip: string;
  glint: THREE.Sprite;
  yaw: number;
}
interface Figure {
  id: string;
  look: TownLook;
  room: Room;
  x: number;
  z: number;
  armed: boolean;
  news: boolean;
  rock: RockBox;
  made?: Made;
}
let figures: Figure[] = [];
let ferry: { room: Room; x: number; z: number; said: boolean } | null = null;
let t = 0;

/** What the townspeople wear: the owner's made models where there is one (data/creatures.json), or the figures built in code
    (the dev menu's switch, remembered in this browser). */
export type TownWear = 'made' | 'code';
const WEAR_KEY = 'ossuary.townWear';
let wear: TownWear = 'made';
try {
  if (localStorage.getItem(WEAR_KEY) === 'code') wear = 'code';
} catch {
  /* the made models */
}
export const townWear = () => wear;
/** Whether `id` stands as its made model. */
export const wearsMade = (id: string) => wear === 'made' && !!CREATURES[id];
/** Wear `w` from the next waking on (the dev menu wakes the Vigil again to show it). */
export function setTownWear(w: TownWear) {
  wear = w;
  try {
    localStorage.setItem(WEAR_KEY, w);
  } catch {
    /* not remembered */
  }
}

/** A made figure loaded in place of `look`: stood where it stands, turned as it is, the code figure hidden but for its
    glint's place, idle until it speaks. `onto` is the group it hangs in (the room's, or the boat's). */
async function standMade(id: string, onto: THREE.Object3D, at: THREE.Vector3, turn: number, still: () => boolean) {
  const m = await madeModel(id, still);
  if (!m) return null;
  m.group.position.copy(at);
  m.group.rotation.y = turn;
  onto.add(m.group);
  selfLight(id, CFG.vigil.town.madeLight);
  if (m.info.fine) {
    m.model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.layers.set(FINE);
    });
    markFine(m.model);
  } // (drawn at the finer pixel, as the coins are: the owner's ask, 2026-10-09)
  let head: THREE.Object3D | undefined;
  m.model.traverse((o) => {
    if (!head && /Head$/.test(o.name)) head = o;
  }); // (Mixamo's head bone; the loader drops its colon)
  const glint = glow(new THREE.Color(id === 'ferryman' ? '#ffc070' : shade(id).light).getHex(), 0.5, 0.9);
  glint.position.y = m.info.height + 0.25;
  glint.visible = false;
  m.group.add(glint);
  m.actions.idle?.play();
  return { group: m.group, mixer: m.mixer, actions: m.actions, head, clip: 'idle', glint, yaw: 0 } as Made;
}
/** Each step for a made figure: its clip (talk while it speaks, else idle) played on, its head turned toward the mage
    (`toMage`, an angle in its own frame, or null) after the clip, its glint pulsing while it has news. */
function moveMade(m: Made, dt: number, toMage: number | null, talking: boolean, news: boolean) {
  const want = talking && m.actions.talk ? 'talk' : 'idle';
  if (want !== m.clip && m.actions[want]) {
    const a = m.actions[want];
    a.reset().play();
    m.actions[m.clip]?.crossFadeTo(a, 0.3, false);
    m.clip = want;
  }
  m.mixer.update(dt);
  m.yaw += ((toMage === null ? 0 : Math.max(-1, Math.min(1, toMage))) - m.yaw) * Math.min(1, dt * 4);
  if (m.head && Math.abs(m.yaw) > 1e-3) {
    // (about the world's up, seen from the head's parent)
    m.group.updateMatrixWorld(true);
    const pw = m.head.parent!.getWorldQuaternion(new THREE.Quaternion()),
      turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), m.yaw);
    m.head.quaternion.premultiply(pw.clone().invert().multiply(turn).multiply(pw));
  }
  m.glint.visible = news;
  if (news) {
    const s = 0.4 + Math.sin(t * 3) * 0.1;
    m.glint.scale.set(s, s, 1);
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const speakerName = (id: string) => (id === 'ferryman' ? STR.town.ferryman : (STR.shades.names[id] ?? id));
const lightOf = (id: string) => (id === 'ferryman' ? '#ffc070' : shade(id).light);
/** A speaker's icon, rendered once from its figure. */
export function speakerIcon(id: string) {
  // (a made figure's own model, once it has loaded, as it stands; else the figure built in code)
  const made = wearsMade(id) ? madeScenes.get(id) : undefined;
  if (made)
    return iconUrlOf(
      'town:made:' + id,
      () => {
        const c = cloneSkinned(made);
        c.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) m.geometry = m.geometry.clone();
        });
        return c;
      },
      lightOf(id),
    ); // (its own geometry: the icon's is disposed after)
  return iconUrlOf(
    'town:' + id,
    () => (id === 'ferryman' ? ferrymanLook() : townLook(id, lightOf(id)).group),
    lightOf(id),
  );
}
const madeScenes = new Map<string, THREE.Object3D>();
/** Keep the loaded model of each made figure for its icon. */
function keepScene(id: string) {
  void loadedScene(id)?.then((g) => madeScenes.set(id, g.scene));
}

/** The run the save remembers last, and so this waking's moment: a win, a death, or (a death that felled a boss not felled
    in any run before it) that boss. */
function lastRun() {
  const [run, ...before] = vigil().echoes;
  if (!run) return null;
  const fresh = run.felled.filter((b) => !before.some((r) => r.felled.includes(b)));
  const moment: TalkContext['moment'] = run.won ? 'won' : fresh.length ? 'boss' : 'death';
  return { run, moment, boss: fresh.at(-1) ?? run.felled.at(-1) ?? null };
}
/** The key a speaker's moment is heard by: once a run. */
const momentKey = (who: string) => `${who}@run${vigil().runs}`;

/** What the talk knows now, for `who` (`moment`: the dev menu's, in place of the last run's). */
export function talkContext(who: string, moment?: TalkContext['moment']): TalkContext {
  const v = vigil(),
    last = lastRun(),
    book = bestiary();
  const metFoes = FOE_IDS.filter((id) => book[id]?.met),
    weak = FOE_IDS.filter((id) => book[id]?.weak);
  const boss = last?.boss ?? null,
    struck = last?.run.struck ?? null;
  const subjects: TalkContext['subjects'] = {
    weakness: metFoes
      .filter((id) => !book[id].weak && FOES[id].floor > 0 && FOES[id].weak)
      .sort((a, b) => FOES[a].floor - FOES[b].floor)
      .map((id): Subject => ({ key: id, vars: { foe: foeName(id), school: STR.schools[FOES[id].weak] } })),
    bossFear: BOSS_TYPES.filter((b) => book[b]?.met && (CFG.enemy[b] as { weak?: string }).weak).map((b): Subject => ({
      key: b,
      vars: { boss: cap(struckName(b)), school: STR.schools[(CFG.enemy[b] as { weak: string }).weak] },
    })),
    reaction: REACTION_IDS.filter((r) => !v.reactions.includes(r)).map((r): Subject => {
      const [a, b] = reactionSchools(r);
      return { key: r, vars: { reaction: STR.reactions[r], a: STR.schools[a], b: STR.schools[b] } };
    }),
  };
  return {
    moment: moment !== undefined ? moment : (last?.moment ?? null),
    momentSaid: moment ? false : vigil().heard[momentKey(who)] !== undefined,
    struck: moment === undefined ? struck : moment === 'death' ? struck : null,
    felled: last?.run.felled ?? [],
    found: {
      spells: SPELL_DEFS.filter((d) => atLeast(stage(d.id), 'learned')).map((d) => d.id),
      foes: metFoes,
      weak,
      reactions: [...v.reactions],
      recipes: [...v.recipes.potions],
    },
    deepest: v.deepest,
    runs: v.runs,
    wins: v.wins,
    freed: [...v.freed],
    flags: { ...v.flags },
    subjects,
    vars: { struck: struck ? cap(struckName(struck)) : '', boss: boss ? cap(struckName(boss)) : '' },
    quest: ((q: string | null) => (q === 'offer' || q === 'ready' ? q : null))(questState(who)), // (M7 step 8: a quest to give, or met)
  };
}

/** `who` talks: the line picked for it now (or for the dev menu's `moment`). False when it has nothing to say. */
export function talkTo(who: string, moment?: TalkContext['moment']) {
  const c = talkContext(who, moment),
    line = pickLine(who, c, vigil().heard);
  if (!line) return false;
  const f = figures.find((x) => x.id === who),
    at = f ?? (who === 'ferryman' ? ferry : null);
  if (at) Sfx.at(at.x, at.z).talk();
  else Sfx.talk();
  const said = c.moment && line.line.moment === c.moment ? [momentKey(who)] : [];
  if (line.line.moment === 'quest' || line.line.moment === 'questDone') questSaid(who, line.line.moment); // (M7 step 8: given, or done)
  // (the panel goes at the top when the speaker stands in the screen's lower half: south of where the camera is heading, its
  // middle half a tile up the screen for its height)
  const low = !!at && at.z - 0.4 > cameraTargetFor(G.room.current, player.x, player.z).z;
  openTalk(who, speakerName(who), speakerIcon(who), line, said, low);
  return true;
}

/** The Vigil furnished: the freed stand at their spots in the Nave, each blocking its tile, facing the circle. */
export function standTown(rooms: Room[]) {
  clearTown();
  const room = rooms[roomIndex(VIGIL, VIGIL.town.room)],
    circle = VIGIL.circle;
  const mid = { x: room.bounds.minX + circle.at[0], z: room.bounds.minZ + circle.at[1] };
  for (const id of vigil().freed) {
    const spot = VIGIL.town.spots[id];
    if (!spot || !SHADE_IDS.includes(id)) continue;
    const x = room.bounds.minX + spot[0] + 0.5,
      z = room.bounds.minZ + spot[1] + 0.5,
      look = townLook(id, shade(id).light);
    look.group.position.set(x - room.cx, 0, z - room.cz);
    look.group.rotation.y = Math.atan2(mid.x - x, mid.z - z);
    room.group.add(look.group);
    const rock = { x, z, hx: 0.4, hz: 0.4, hp: 0, breakable: false, shade: true } as RockBox;
    room.rocks.push(rock);
    const f: Figure = { id, look, room, x, z, armed: true, news: false, rock };
    figures.push(f);
    if (wearsMade(id)) {
      keepScene(id);
      void standMade(id, room.group, look.group.position.clone(), look.group.rotation.y, () =>
        figures.includes(f),
      ).then((m) => {
        if (m) {
          f.made = m;
          look.group.visible = false;
          keepScene(id);
        }
      });
    }
  }
  refreshNews();
}
/** The Ferryman stands in his boat: where the mage reaching the jetty hears his first line. */
export function ferryAt(room: Room, x: number, z: number) {
  ferry = { room, x, z, said: vigil().heard['ferryman.first'] !== undefined };
}
/** The made Ferryman stood at the stern of his boat (built without the code one, `pieceLook`'s `ferryman: false`). */
let ferryman: Made | null = null;
export function standFerryman(boat: THREE.Object3D) {
  const at = ferry;
  if (!wearsMade('ferryman')) return;
  void standMade('ferryman', boat, new THREE.Vector3(0.88, 0.26, 0), 0, () => ferry === at && !!at).then((m) => {
    ferryman = m;
    keepScene('ferryman');
  });
}
/** Which figures have something unheard to say (their glint), worked out again after each talk. */
function refreshNews() {
  for (const f of figures) f.news = hasNews(f.id, talkContext(f.id), vigil().heard);
}

let wasTalking: string | null = null;
/** Each step at the Vigil (even while the game waits): the figures sway and watch, the one talking gestures; while playing,
    the one walked up to talks, and the Ferryman at the jetty. */
export function updateTown(dt: number, playing: boolean) {
  t += dt;
  const talking = UI.talking;
  if (wasTalking && !talking) refreshNews();
  wasTalking = talking;
  for (const f of figures) {
    const near = G.room.current === f.room && Math.hypot(player.x - f.x, player.z - f.z) < C().watch;
    const toMage = near ? Math.atan2(player.x - f.x, player.z - f.z) - f.look.group.rotation.y : null;
    const turn = toMage === null ? null : Math.atan2(Math.sin(toMage), Math.cos(toMage));
    if (f.made) moveMade(f.made, dt, turn, talking === f.id, f.news && talking !== f.id);
    else moveTown(f.look, t, turn, talking === f.id, f.news && talking !== f.id);
  }
  if (ferryman && ferry) {
    const near = G.room.current === ferry.room ? Math.atan2(player.x - ferry.x, player.z - ferry.z) : null;
    moveMade(
      ferryman,
      dt,
      near === null ? null : Math.atan2(Math.sin(near), Math.cos(near)),
      talking === 'ferryman',
      false,
    );
  }
  if (!playing || talking) return;
  for (const f of figures) {
    const d = G.room.current === f.room ? Math.hypot(player.x - f.x, player.z - f.z) : Infinity;
    if (d < C().reach && f.armed) {
      f.armed = false;
      talkTo(f.id);
      return;
    }
    if (d > C().reach + C().rearm) f.armed = true;
  }
  if (
    ferry &&
    !ferry.said &&
    G.room.current === ferry.room &&
    Math.hypot(player.x - ferry.x, player.z - ferry.z) < C().ferryReach
  ) {
    ferry.said = true;
    talkTo('ferryman');
  }
}

/** Leave the Vigil: the figures go with its rooms (they are in them); forget them. */
export function clearTown() {
  figures = [];
  ferry = null;
  ferryman = null;
  wasTalking = null;
}

/** For the tests and the dev menu: who stands where, whether each has news, and the lines heard. */
export function townInfo() {
  return {
    wear,
    figures: figures.map((f) => ({
      id: f.id,
      x: f.x,
      z: f.z,
      news: f.news,
      armed: f.armed,
      made: !!f.made,
      clip: f.made?.clip ?? null,
    })),
    ferryman: ferryman ? { clip: ferryman.clip } : null,
    ferry: ferry && { x: ferry.x, z: ferry.z, said: ferry.said },
    heard: { ...vigil().heard },
    flags: { ...vigil().flags },
    moment: lastRun()?.moment ?? null,
  };
}
