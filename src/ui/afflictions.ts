/* What is being done to the mage, shown (every mechanic tells the player what is going on,
   even if only in a word): a row of chips beside the mana bar, one for each affliction holding the mage now (hexed, with
   the mana it took; chilled; heavy as stone; sight dimmed; webbed or inked; snagged; sliding; drawn in; sapped; wading
   in the jelly serpent's jelly, and what a potion drunk leaves, while it lasts), and the first time each comes in a run, a line that says what it is. */
import { G, player } from '../state';
import { CFG } from '../config';
import { STR } from '../strings';
import { stuckIn, slipAt } from '../actors/bestiaryGround';
import { snagAt } from '../world/props';
import { sapMul } from '../world/mechanisms';
import { jellyAt } from '../world/pools';
import { toast, toastShowing } from './hud';
import { on } from '../events';
import { potionFx } from '../items/potionFx';
import { POTIONS } from '../items/alchemyData';

export type Affliction =
  | 'hexed'
  | 'chill'
  | 'stone'
  | 'dim'
  | 'web'
  | 'ink'
  | 'snag'
  | 'slide'
  | 'drawn'
  | 'sapped'
  | 'jelly'
  | 'ember'
  | 'frost'
  | 'free'
  | 'echo'
  | 'giant'
  | 'unseen'
  | 'reversed'
  | 'remedy';
/** Each one's colour (its school's light where it has one; for what a potion left, the potion's). */
const COLOR: Record<Affliction, string> = {
  hexed: '#b784ff',
  chill: '#a8d8ff',
  stone: '#b8b0a4',
  dim: '#8a6aa8',
  web: '#d8d0e8',
  ink: '#8a72c8',
  snag: '#c8c0b0',
  slide: '#9fd0ee',
  drawn: '#ffd27a',
  sapped: '#9a7ad8',
  jelly: '#7ae070',
  ember: POTIONS.liquidEmber.color,
  frost: POTIONS.frostbrew.color,
  free: POTIONS.bottledStorm.color,
  echo: POTIONS.echoes.color,
  giant: POTIONS.giants.color,
  unseen: '#9a82d0',
  reversed: '#a070c8',
  remedy: POTIONS.bitterRemedy.color,
};

/** The afflictions holding the mage now, in the order they show. */
export function afflictions(): Affliction[] {
  const out: Affliction[] = [],
    x = player.x,
    z = player.z,
    stuck = stuckIn(x, z);
  if (player.hexed > 0) out.push('hexed');
  if (player.chill > 0) out.push('chill');
  if (player.stone > 0) out.push('stone');
  if (player.dim > 0) out.push('dim');
  if (stuck) out.push(stuck);
  if (snagAt(x, z) < 1) out.push('snag');
  if (G.room.current?.theme?.twist === 'rime' || slipAt(x, z)) out.push('slide');
  if (player.drawn > 0) out.push('drawn');
  if (sapMul() < 1) out.push('sapped');
  if (jellyAt(x, z) && !player.stats.effects.has('float')) out.push('jelly'); // (the jelly serpent's)
  // what a potion drunk leaves on the mage, while it lasts
  const f = potionFx;
  if (f.ember > 0) out.push('ember');
  if (f.frost > 0) out.push('frost');
  if (f.free > 0) out.push('free');
  if (f.echo > 0) out.push('echo');
  if (f.giant > 0) out.push('giant');
  if (f.unseen > 0) out.push('unseen');
  if (f.reversed > 0) out.push('reversed');
  if (G.run.remedy) out.push('remedy');
  return out;
}

let shown = '',
  lineUntil = 0;
/** Every frame: the chips, written only when they change; and the first time in a run each affliction comes, its line,
    one at a time (several coming at once wait their turn, each long enough to read). */
export function updateAfflictions() {
  const now = afflictions();
  if (G.flow.clock >= lineUntil && !toastShowing())
    for (const a of now) {
      // (a line already showing, a shrine's or a room's, isn't cut short)
      const why = STR.afflict.why[a];
      if (!why || G.run.hinted.has(`afflict:${a}`)) continue;
      G.run.hinted.add(`afflict:${a}`);
      toast(why, CFG.afflict.lineShow);
      lineUntil = G.flow.clock + CFG.afflict.lineShow;
      break;
    }
  const key =
    now.join(' ') + (player.hexed > 0 ? `:${player.drained}` : '') + (potionFx.free > 0 ? `:${potionFx.free}` : '');
  if (key === shown) return;
  shown = key;
  const box = document.getElementById('afflict');
  if (!box) return;
  box.innerHTML = now
    .map(
      (a) =>
        `<span style="--c:${COLOR[a]}">${a === 'hexed' ? STR.afflict.hexed(player.drained) : a === 'free' ? STR.afflict.free(potionFx.free) : STR.afflict.label[a]}</span>`,
    )
    .join('');
}
/** A new run: the chips start empty. */
export function resetAfflictions() {
  shown = '';
  lineUntil = 0;
  const box = document.getElementById('afflict');
  if (box) box.innerHTML = '';
}

/** The chips listen to the game (main.ts calls this at boot). */
export function initAfflictions() {
  on('afflictionsReset', () => resetAfflictions());
}
