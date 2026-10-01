/* What is being done to the mage, shown (the owner's rule, 2026-10-01: every mechanic tells the player what is going on,
   even if only in a word): a row of chips beside the mana bar, one for each affliction holding the mage now (hexed, with
   the mana it took; chilled; heavy as stone; sight dimmed; webbed or inked; snagged; sliding; drawn in; sapped), and the
   first time each comes in a run, a line that says what it is. */
import { G, player } from '../state';
import { CFG } from '../config';
import { STR } from '../strings';
import { stuckIn, slipAt } from '../actors/bestiaryGround';
import { snagAt } from '../world/props';
import { sapMul } from '../world/mechanisms';
import { floatText } from '../magic/statusFx';
import { toast } from './hud';

export type Affliction = 'hexed' | 'chill' | 'stone' | 'dim' | 'web' | 'ink' | 'snag' | 'slide' | 'drawn' | 'sapped';
/** Each one's colour (its school's light where it has one). */
const COLOR: Record<Affliction, string> = {
  hexed: '#b784ff', chill: '#a8d8ff', stone: '#b8b0a4', dim: '#8a6aa8', web: '#d8d0e8', ink: '#8a72c8', snag: '#c8c0b0',
  slide: '#9fd0ee', drawn: '#ffd27a', sapped: '#9a7ad8',
};

/** A hexing blow took `n` mana (M4: a Hex Imp's shot; M4.5: a hydra's venom, a raven's caw, a manticore's spikes): the
    mana bar flashes violet, the loss rises over the mage, and the chip says how much. */
export function hexDrained(n: number) {
  if (n <= 0) return;
  player.hexed = CFG.afflict.hexShow; player.drained = Math.round(n);
  floatText(player.x, 1.7, player.z, `−${Math.round(n)}`, 0xb784ff, 40);
  const bar = document.getElementById('mana'); if (bar) { bar.classList.add('hexed'); setTimeout(() => bar.classList.remove('hexed'), 420); }
}

/** The afflictions holding the mage now, in the order they show. */
export function afflictions(): Affliction[] {
  const out: Affliction[] = [], x = player.x, z = player.z, stuck = stuckIn(x, z);
  if (player.hexed > 0) out.push('hexed');
  if (player.chill > 0) out.push('chill');
  if (player.stone > 0) out.push('stone');
  if (player.dim > 0) out.push('dim');
  if (stuck) out.push(stuck);
  if (snagAt(x, z) < 1) out.push('snag');
  if (G.current?.theme?.twist === 'rime' || slipAt(x, z)) out.push('slide');
  if (player.drawn > 0) out.push('drawn');
  if (sapMul() < 1) out.push('sapped');
  return out;
}

let shown = '', lineUntil = 0;
/** Every frame: the chips, written only when they change; and the first time in a run each affliction comes, its line,
    one at a time (several coming at once wait their turn, each long enough to read). */
export function updateAfflictions() {
  const now = afflictions();
  if (G.simClock >= lineUntil) for (const a of now) {
    const why = STR.afflict.why[a]; if (!why || G.run.hinted.has(`afflict:${a}`)) continue;
    G.run.hinted.add(`afflict:${a}`); toast(why, CFG.afflict.lineShow); lineUntil = G.simClock + CFG.afflict.lineShow; break;
  }
  const key = now.join(' ') + (player.hexed > 0 ? `:${player.drained}` : '');
  if (key === shown) return;
  shown = key;
  const box = document.getElementById('afflict'); if (!box) return;
  box.innerHTML = now.map(a => `<span style="--c:${COLOR[a]}">${a === 'hexed' ? STR.afflict.hexed(player.drained) : STR.afflict.label[a]}</span>`).join('');
}
/** A new run: the chips start empty. */
export function resetAfflictions() { shown = ''; lineUntil = 0; const box = document.getElementById('afflict'); if (box) box.innerHTML = ''; }
