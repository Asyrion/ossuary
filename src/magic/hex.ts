/* A hex's mana debt: a hexing blow takes mana, shows it over the mage and runs it back to the thrower; a Hallow cast
   soon after gives it back. Game logic: it changes `player.hexDebt` and the mana; the HUD only flashes the mana bar (the
   `manaHexed` event) and shows the chip (ui/afflictions.ts). */
import { CFG } from '../config';
import { G, after, player } from '../state';
import { STR } from '../strings';
import { emit } from '../events';
import { burst } from '../combat/fx';
import { floatText } from './statusFx';
import { gainMana } from './spells';
import { line } from '../notify';

/** A hexing blow took `n` mana (a Hex Imp's shot; a hydra's venom, a raven's caw, a manticore's spikes): the
    mana bar flashes violet, the loss rises over the mage, and the chip says how much. The mana it took runs back in
    a violet trail to the foe that threw it (`from`), and the mage's next Hallow cast within `CFG.curve.hexDebt` seconds
    gives it back (`hexGiveBack`). */
export function hexDrained(n: number, from?: { x: number; z: number; dead?: boolean }) {
  if (n <= 0) return;
  player.hexed = CFG.afflict.hexShow;
  player.drained = Math.round(n);
  player.hexDebt = Math.round(n);
  player.hexDebtUntil = G.flow.clock + CFG.curve.hexDebt;
  floatText(player.x, 1.7, player.z, `−${Math.round(n)}`, 0xb784ff, 40);
  if (from) {
    // (motes from the mage to the thrower, one after another, following it if it moves)
    const sx = player.x,
      sz = player.z,
      k = CFG.curve.trail;
    for (let i = 1; i <= k; i++)
      after(i * CFG.curve.trailStep, () => {
        if (from.dead) return;
        const t = i / k;
        burst(sx + (from.x - sx) * t, 1 - 0.4 * t, sz + (from.z - sz) * t, 0xb784ff, 2, 0.6, 0.035);
      });
  }
  emit('manaHexed'); // (the mana bar flashes violet)
}

/** A Hallow spell cast: if a hex took mana a moment ago, the light gives it back, in gold over the mage, and the
    first time in a run a line says so. Returns what it gave back. */
export function hexGiveBack() {
  const n = player.hexDebt;
  if (!(n > 0) || G.flow.clock > player.hexDebtUntil) return 0;
  player.hexDebt = 0;
  gainMana(n);
  floatText(player.x, 1.7, player.z, `+${n}`, 0xffe6a0, 40);
  burst(player.x, 0.9, player.z, 0xffe6a0, 10, 1.6, 0.04);
  if (!G.run.hinted.has('hexBack')) {
    G.run.hinted.add('hexBack');
    line(STR.curve.giveBack, CFG.afflict.lineShow);
  }
  return n;
}
