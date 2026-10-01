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
import { line, toast, toastShowing } from './hud';
import { after } from '../state';
import { burst } from '../combat/fx';
import { gainMana } from '../magic/spells';

export type Affliction = 'hexed' | 'chill' | 'stone' | 'dim' | 'web' | 'ink' | 'snag' | 'slide' | 'drawn' | 'sapped';
/** Each one's colour (its school's light where it has one). */
const COLOR: Record<Affliction, string> = {
  hexed: '#b784ff', chill: '#a8d8ff', stone: '#b8b0a4', dim: '#8a6aa8', web: '#d8d0e8', ink: '#8a72c8', snag: '#c8c0b0',
  slide: '#9fd0ee', drawn: '#ffd27a', sapped: '#9a7ad8',
};

/** A hexing blow took `n` mana (M4: a Hex Imp's shot; M4.5: a hydra's venom, a raven's caw, a manticore's spikes): the
    mana bar flashes violet, the loss rises over the mage, and the chip says how much. M4.9: the mana it took runs back in
    a violet trail to the foe that threw it (`from`), and the mage's next Hallow cast within `CFG.curve.hexDebt` seconds
    gives it back (`hexGiveBack`). */
export function hexDrained(n: number, from?: { x: number; z: number; dead?: boolean }) {
  if (n <= 0) return;
  player.hexed = CFG.afflict.hexShow; player.drained = Math.round(n);
  player.hexDebt = Math.round(n); player.hexDebtUntil = G.simClock + CFG.curve.hexDebt;
  floatText(player.x, 1.7, player.z, `−${Math.round(n)}`, 0xb784ff, 40);
  if (from) { // (motes from the mage to the thrower, one after another, following it if it moves)
    const sx = player.x, sz = player.z, k = CFG.curve.trail;
    for (let i = 1; i <= k; i++) after(i * .045, () => { if (from.dead) return; const t = i / k; burst(sx + (from.x - sx) * t, 1 - .4 * t, sz + (from.z - sz) * t, 0xb784ff, 2, .6, .035); });
  }
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
  if (G.simClock >= lineUntil && !toastShowing()) for (const a of now) { // (a line already showing, a shrine's or a room's, isn't cut short)
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

/** A Hallow spell cast (M4.9): if a hex took mana a moment ago, the light gives it back, in gold over the mage, and the
    first time in a run a line says so. Returns what it gave back. */
export function hexGiveBack() {
  const n = player.hexDebt;
  if (!(n > 0) || G.simClock > player.hexDebtUntil) return 0;
  player.hexDebt = 0; gainMana(n);
  floatText(player.x, 1.7, player.z, `+${n}`, 0xffe6a0, 40); burst(player.x, .9, player.z, 0xffe6a0, 10, 1.6, .04);
  if (!G.run.hinted.has('hexBack')) { G.run.hinted.add('hexBack'); line(STR.curve.giveBack, CFG.afflict.lineShow); }
  return n;
}
