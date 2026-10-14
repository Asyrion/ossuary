/* Title / pause / end screens, their buttons, and swapping the hero by file picker or drag-and-drop. */
import { STR, struckName } from '../strings';
import { esc } from './spellPanel';
import type { RunSummary, ScreenName } from '../types';
import { exportSave, importSave } from '../vigil/save';
import { Sfx } from '../audio/sfx';
import { $ } from '../util';
import { on } from '../events';
import { G } from '../state';
import { atVigil } from '../vigil/where';
import { FLOORS } from '../world/generate';
import { hero, loadHeroBuffer } from '../actors/hero';
import { artifact } from '../items/artifactData';
import { artifactIcon, setHeroInfo, toast } from './hud';

const screens: Record<ScreenName, HTMLElement> = {
  title: $('scrTitle'),
  pause: $('scrPause'),
  end: $('scrEnd'),
  inv: $('scrInv'),
  lab: $('scrLab'),
  level: $('scrLevel'),
  stone: $('scrStone'),
  lectern: $('scrLectern'),
  talk: $('scrTalk'),
};
export function showScreen(name: ScreenName | null) {
  for (const k of Object.keys(screens) as ScreenName[]) screens[k].classList.toggle('hidden', k !== name);
}

const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function showEndScreen(s: RunSummary) {
  const floorName = STR.floors[Math.min(s.floor, STR.floors.length) - 1][0];
  $('endTitle').textContent = s.won ? STR.end.won : STR.end.lost;
  $('endText').textContent = s.won ? STR.end.wonText : STR.end.lostText(s.floor, floorName);
  $('endFloor').textContent = STR.end.floorValue(s.floor, s.floors);
  $('endLevel').textContent = STR.end.levelValue(s.level, s.insight);
  $('endTime').textContent = clock(s.time);
  $('endKills').textContent = String(s.kills);
  $('endObols').textContent = String(s.obols);
  $('endSeed').textContent = s.seed;
  const H = STR.end.home,
    home = $('endHome');
  home.hidden = !s.home;
  if (s.home) {
    const h = s.home,
      lines = h.dust.lines
        .map((l) => `<li><span>${esc(H.sources[l.source](l.count))}</span><b>${l.dust}</b></li>`)
        .join('');
    home.innerHTML =
      `<h3>${esc(H.title)}</h3><ul class="tally">${lines}<li class="sum"><span>${esc(H.dust)}</span><b>${h.dust.total}</b></li>` +
      `<li class="sum"><span>${esc(s.won ? H.obolsWon(h.carried) : H.obolsLost(h.carried))}</span><b>${h.obols}</b></li></ul>` +
      (h.struck ? `<p class="struck">${esc(H.struck(struckName(h.struck)))}</p>` : '');
  }
  $('endItems').innerHTML = s.artifacts
    .map((id, i) => `<li>${artifactIcon(id, i === 0, s.cleansed.includes(id))}<span>${artifact(id).name}</span></li>`)
    .join('');
  showScreen('end');
  $('btnAgain').focus();
}

export interface ScreenActions {
  start(): void;
  replay(): void;
  resume(): void;
  toggleSound(): void;
  pauseIfPlaying(): void;
}

export function initScreens(act: ScreenActions) {
  on('paused', () => {
    showScreen('pause');
    $('runInfo').textContent = atVigil() ? STR.vigil.runInfo : STR.runInfo(G.run.floor + 1, FLOORS.length, G.run.seed); // (no floor at the Vigil)
    $('btnResume').focus();
  });
  on('resumed', () => showScreen(null));
  on('screensClosed', () => showScreen(null));
  on('runEnded', (p) => showEndScreen(p.summary));
  on('soundToggled', (p) => {
    $('btnSound').textContent = p.muted ? STR.pause.soundOff : STR.pause.soundOn;
  });
  $('btnStart').addEventListener('click', () => act.start());
  $('btnAgain').addEventListener('click', () => act.start());
  $('btnReplay').addEventListener('click', () => act.replay());
  $('btnResume').addEventListener('click', () => act.resume());
  $('btnRestart').addEventListener('click', () => act.start());
  $('btnSound').addEventListener('click', () => act.toggleSound());
  // volumes: master, effects and interface, with a sound of the kind as the slider is let go; music and ambience (heard
  // playing under the menu already)
  const none = () => {};
  for (const [id, kind, sample] of [
    ['volMaster', 'master', () => Sfx.hit()],
    ['volEffects', 'effects', () => Sfx.hit()],
    ['volInterface', 'interface', () => Sfx.pickup()],
    ['volMusic', 'music', none],
    ['volAmbience', 'ambience', none],
  ] as const) {
    const input = $<HTMLInputElement>(id);
    input.value = String(Math.round(Sfx.volumes[kind] * 100));
    input.addEventListener('input', () => Sfx.setVolume(kind, Number(input.value) / 100));
    input.addEventListener('change', () => {
      Sfx.init();
      sample();
    });
  }
  $('pauseBtn').addEventListener('click', () => act.pauseIfPlaying());

  // the save to a file and back (the page starts again from what was read, so every module reads it)
  $('btnSaveOut').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportSave()], { type: 'application/json' }));
    a.download = STR.pause.saveFile;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(STR.pause.saved, 3);
  });
  const saveIn = $<HTMLInputElement>('saveFile');
  $('btnSaveIn').addEventListener('click', () => saveIn.click());
  saveIn.addEventListener('change', () => {
    void (async () => {
      const f = saveIn.files?.[0];
      saveIn.value = '';
      if (!f) return;
      const errs = importSave(await f.text());
      if (errs.length) {
        toast(STR.pause.refused(errs[0]), 4);
        return;
      }
      toast(STR.pause.loaded, 2);
      setTimeout(() => location.reload(), 600);
    })();
  });

  const fileIn = $<HTMLInputElement>('fileIn');
  $('btnLoad').addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', () => {
    const f = fileIn.files?.[0];
    if (f) loadFile(f);
    fileIn.value = '';
  });

  const drop = $('drop');
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragDepth++;
    drop.classList.add('on');
  });
  window.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) drop.classList.remove('on');
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    drop.classList.remove('on');
    const f = e.dataTransfer?.files[0];
    if (f) loadFile(f);
  });
}

function loadFile(file: File) {
  if (!/\.glb$/i.test(file.name)) {
    toast(STR.toast.notGlb);
    return;
  }
  file
    .arrayBuffer()
    .then((buf) => loadHeroBuffer(buf, file.name))
    .then(() => {
      setHeroInfo(hero.info);
      toast(hero.info, 4.5);
    })
    .catch((err) => {
      console.error(err);
      toast(STR.toast.badGlb);
    });
}
