/* Title / pause / end screens, their buttons, and swapping the hero by file picker or drag-and-drop. */
import { STR } from '../strings';
import { $ } from '../util';
import { hero, loadHeroBuffer } from '../actors/hero';
import { artifact } from '../items/artifactData';
import { artifactIcon, setHeroInfo, toast } from './hud';

export type ScreenName = 'title' | 'pause' | 'end';
const screens: Record<ScreenName, HTMLElement> = { title: $('scrTitle'), pause: $('scrPause'), end: $('scrEnd') };
export function showScreen(name: ScreenName | null) {
  for (const k of Object.keys(screens) as ScreenName[]) screens[k].classList.toggle('hidden', k !== name);
}

/** How a run went, for the end screen. `floor` is 1-based; `artifacts` lists the focus first. */
export interface RunSummary {
  won: boolean; floor: number; floors: number; time: number; kills: number; seed: string; artifacts: string[];
  /** Cursed artifacts cleansed at a shrine (they lose their red ring). */ cleansed: string[];
}

const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function showEndScreen(s: RunSummary) {
  const floorName = STR.floors[Math.min(s.floor, STR.floors.length) - 1][0];
  $('endTitle').textContent = s.won ? STR.end.won : STR.end.lost;
  $('endText').textContent = s.won ? STR.end.wonText : STR.end.lostText(s.floor, floorName);
  $('endFloor').textContent = STR.end.floorValue(s.floor, s.floors);
  $('endTime').textContent = clock(s.time);
  $('endKills').textContent = String(s.kills);
  $('endSeed').textContent = s.seed;
  $('endItems').innerHTML = s.artifacts.map((id, i) => `<li>${artifactIcon(id, i === 0, s.cleansed.includes(id))}<span>${artifact(id).name}</span></li>`).join('');
  showScreen('end'); $('btnAgain').focus();
}

export interface ScreenActions {
  start(): void; replay(): void; resume(): void; toggleSound(): void; pauseIfPlaying(): void;
}

export function initScreens(act: ScreenActions) {
  $('btnStart').addEventListener('click', () => act.start());
  $('btnAgain').addEventListener('click', () => act.start());
  $('btnReplay').addEventListener('click', () => act.replay());
  $('btnResume').addEventListener('click', () => act.resume());
  $('btnRestart').addEventListener('click', () => act.start());
  $('btnSound').addEventListener('click', () => act.toggleSound());
  $('pauseBtn').addEventListener('click', () => act.pauseIfPlaying());

  const fileIn = $<HTMLInputElement>('fileIn');
  $('btnLoad').addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', () => { const f = fileIn.files?.[0]; if (f) loadFile(f); fileIn.value = ''; });

  const drop = $('drop'); let dragDepth = 0;
  window.addEventListener('dragenter', e => { e.preventDefault(); dragDepth++; drop.classList.add('on'); });
  window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) drop.classList.remove('on'); });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => {
    e.preventDefault(); dragDepth = 0; drop.classList.remove('on');
    const f = e.dataTransfer?.files[0]; if (f) loadFile(f);
  });
}

function loadFile(file: File) {
  if (!/\.glb$/i.test(file.name)) { toast(STR.toast.notGlb); return; }
  file.arrayBuffer().then(buf => loadHeroBuffer(buf, file.name))
    .then(() => { setHeroInfo(hero.info); toast(hero.info, 4.5); })
    .catch(err => { console.error(err); toast(STR.toast.badGlb); });
}
