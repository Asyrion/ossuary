/* The HUD's insight (the game's: progression/insight.ts): the strip under the mana bar fills toward the next level (full at
   the cap), and the badge beside the spell slots says the level and glows while a level's choice waits. Written only when
   it changes (`insightChanged`); a new run shows it afresh (`insightReset`). */
import { G } from '../state';
import { STR } from '../strings';
import { $ } from '../util';
import { on } from '../events';
import { levelProgress } from '../progression/levelData';
import { toNextLevel } from '../progression/insight';

let strip: HTMLElement | null = null,
  badge: HTMLElement | null = null,
  shown = '';
export function renderInsight() {
  strip ??= $('insight');
  badge ??= $('level');
  if (!strip || !badge) return;
  const p = levelProgress(G.run.insight),
    k = p.span ? p.into / p.span : 1,
    key = p.level + ':' + k.toFixed(3) + ':' + G.run.pending;
  if (key === shown) return;
  shown = key;
  (strip.firstElementChild as HTMLElement).style.transform = `scaleX(${k})`;
  strip.classList.toggle('cap', !p.span);
  badge.classList.toggle('waits', G.run.pending > 0); // (a level's choice waiting: the badge glows)
  strip.setAttribute('aria-valuenow', String(Math.round(G.run.insight)));
  strip.setAttribute('aria-label', STR.levels.meter(p.level, Math.round(toNextLevel())));
  badge.innerHTML = `<small>${STR.levels.short}</small><b>${p.level}</b>`;
  badge.title = STR.levels.meter(p.level, Math.round(toNextLevel()));
}

/** The strip and badge listen to the game (main.ts calls this at boot). */
export function initInsightHud() {
  on('insightChanged', () => renderInsight());
  on('insightReset', () => {
    shown = '';
    renderInsight();
  });
}
