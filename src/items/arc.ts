/* Asyrion's arc (M4.6, docs/M4.6-plan.md; GDD: Artifacts, Asyrion's arc): the apprentice grows towards the chaos mage as
   they hold more artifacts, and as they grow in level (M6 step 12: every `CFG.arc.perLevels` levels gained count as one). The stage (costumeData.ts's `arcStage`, at `CFG.arc.at`) puts the
   chaos mage's pieces on in the slots nothing else holds (costume.ts's `dress`); each stage first reached in a run says so
   in a line (GDD pillar: Nothing silent). The dev menu forces a stage (`DEV.arc`). */
import { DEV, G, player } from '../state';
import { CFG } from '../config';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { line } from '../ui/hud';
import { arcStage, levelsHeld } from '../actors/costumeData';
import { artifact } from './artifactData';

/** What counts towards the arc: every artifact taken, the focus unless it is the first wand, and one for every
    `CFG.arc.perLevels` levels gained (M6; a level-12 run with nothing held reaches the first stage). */
export const arcHeld = () => player.items.length + (artifact(player.focus).start ? 0 : 1) + arcLevels();
/** What the levels gained count for (M6 step 12). */
export const arcLevels = () => levelsHeld(G.run.level, CFG.arc.perLevels);
/** The arc's stage now: the dev menu's, or from what is held. */
export const arcNow = () => DEV.arc ?? arcStage(arcHeld(), CFG.arc.at);

/** After what is held changes: each stage reached for the first time this run says so in a line. */
export function updateArc() {
  const now = arcStage(arcHeld(), CFG.arc.at);
  if (now <= G.run.arc) return;
  for (let k = G.run.arc; k < now; k++) line(STR.arc[k], CFG.arc.line);
  G.run.arc = now; Sfx.relic();
}
