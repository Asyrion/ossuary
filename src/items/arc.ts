/* Asyrion's arc (M4.6, docs/M4.6-plan.md; GDD: Artifacts, Asyrion's arc): the apprentice grows towards the chaos mage as
   they hold more artifacts (levels will count too, M6). The stage (costumeData.ts's `arcStage`, at `CFG.arc.at`) puts the
   chaos mage's pieces on in the slots nothing else holds (costume.ts's `dress`); each stage first reached in a run says so
   in a line (GDD pillar: Nothing silent). The dev menu forces a stage (`DEV.arc`). */
import { DEV, G, player } from '../state';
import { CFG } from '../config';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { line } from '../ui/hud';
import { arcStage } from '../actors/costumeData';
import { artifact } from './artifactData';

/** The artifacts the mage holds that count towards the arc: every one taken, and the focus unless it is the first wand. */
export const arcHeld = () => player.items.length + (artifact(player.focus).start ? 0 : 1);
/** The arc's stage now: the dev menu's, or from what is held. */
export const arcNow = () => DEV.arc ?? arcStage(arcHeld(), CFG.arc.at);

/** After what is held changes: each stage reached for the first time this run says so in a line. */
export function updateArc() {
  const now = arcStage(arcHeld(), CFG.arc.at);
  if (now <= G.run.arc) return;
  for (let k = G.run.arc; k < now; k++) line(STR.arc[k], CFG.arc.line);
  G.run.arc = now; Sfx.relic();
}
