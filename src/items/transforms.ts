/* Transformations in the game (M4.6, the rules in transformData.ts): which have formed this run (`G.run.transforms`), their
   gifts added to the mage's stats (`giftsFor`, from refreshStats), and the announcement of a new one: a banner, a lore card,
   a sound and a burst of its light (GDD pillar: Nothing silent). Its look is costume.ts's (`dress`). */
import { G, player } from '../state';
import { STR } from '../strings';
import { CFG } from '../config';
import { artifact, type Stats } from './artifactData';
import { formed, giftEffects, TRANSFORMS, type TransformId } from './transformData';
import { banner, showLore } from '../notify';
import { Sfx } from '../audio/sfx';
import { burst } from '../combat/fx';
import { ringFx } from '../magic/spellFx';
import { pilgrimMap } from './gifts';
import { refreshStats } from './artifacts';

/** Bring the run's transformations up to what is held (they only ever grow); returns those newly formed. */
export function updateTransforms(): TransformId[] {
  const before = G.run.transforms,
    now = formed(
      [player.focus, ...player.items].map((id) => artifact(id)),
      before,
    );
  G.run.transforms = now;
  return now.filter((t) => !before.includes(t));
}

/** The formed transformations' gifts, put into freshly computed stats: their effects, and the Pilgrim's quicker step. */
export function giftsFor(stats: Stats) {
  for (const e of giftEffects(G.run.transforms)) stats.effects.add(e);
  if (stats.effects.has('pilgrimPath')) stats.speed *= CFG.transform.pilgrim.speed;
}

/** A transformation formed: said in a banner and a lore card, heard, and seen in a burst of its light round the mage. */
export function announce(t: TransformId) {
  const T = STR.transforms[t],
    light = TRANSFORMS[t].light;
  banner(T.name, T.gift, CFG.transform.banner);
  showLore({ name: T.name, kind: STR.lore.kinds.transform, effect: T.gift, lore: T.lore, icon: transformIcon(light) });
  Sfx.transform();
  burst(player.x, 1, player.z, light, 26, 2.6, 0.05);
  ringFx(player.x, 0.05, player.z, light, 0.3, 2.2, 0.5, true);
  if (t === 'pilgrim') pilgrimMap(); // (the floor's way, known at once)
}

/** The dev menu's: form transformation `t` at once (without its artifacts), announced as if formed; returns whether it
    was new. */
export function formTransform(t: TransformId) {
  if (G.run.transforms.includes(t)) return false;
  G.run.transforms = [...G.run.transforms, t];
  refreshStats();
  announce(t);
  return true;
}
/** The dev menu's: undo every transformation of the run (until three of a family are held again). */
export function clearTransforms() {
  G.run.transforms = [];
  refreshStats();
}

/** A transformation's mark for its lore card: a ring of its light round a star. */
const transformIcon = (light: number) => {
  const c = `#${light.toString(16).padStart(6, '0')}`;
  return `<svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="15" fill="none" stroke="${c}" stroke-width="3"/><path d="M20 8 L23 17 L32 20 L23 23 L20 32 L17 23 L8 20 L17 17 Z" fill="${c}"/></svg>`;
};
