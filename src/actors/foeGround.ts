/* Foes in each other's ground (M4.7 step 2, docs/archive/M4.7-plan.md; GDD: Depth for what's built). What the bestiary leaves on
   the floor works on foes as it does on the mage: webs and ink slow a walker, rime makes it slide, burning ground sets it
   burning, an armed spark shocks it, a Sporeling's or a Puffcap's spores sting it. A foe's own ground spares it and its
   kind (each patch, fire, spark and cloud knows whose it is: actors/acting.ts), and a foe is at home in ground of its own
   school (a Frost foe on rime, an Ember one in fire, a Storm one on sparks, an Umbral one in webs, ink and spores). Beasts
   blunder in; golems (`avoidsGround`) and elementals look a step ahead and go round. Fliers and bosses pass over it all.
   Tuning in `CFG.foeGround`. */
import type { Enemy } from '../types';
import { G } from '../state';
import { CFG } from '../config';
import { STR } from '../strings';
import { SCHOOL_LIGHT } from '../render/arcane';
import { burst } from '../combat/fx';
import { line } from '../ui/hud';
import { damageEnemy } from '../combat/damage';
import { inflict } from '../magic/statusFx';
import { MAGIC } from '../magic/status';
import { addSpores, stingAt } from '../world/props';
import { blackIceAt, layGround, patchAt, slipAt, stickyAt } from './bestiaryGround';
import { hazardAt, layBlackFire, layFire, laySpark, sparkSting } from './foes';
import { spawnFoe } from './enemies';

export type Ground = 'web' | 'ink' | 'rime' | 'blackice' | 'fire' | 'blackfire' | 'spark' | 'spores';
/** The school each ground is of: a foe of that school is at home in it (black ice, a reaction's, is no one's home). */
const SCHOOL: Record<Ground, string> = { web: 'umbral', ink: 'umbral', rime: 'frost', blackice: '', fire: 'ember', blackfire: '', spark: 'storm', spores: 'umbral' };
const kindOf = (e: Enemy) => e.foe?.id;
/** Whether ground `g` leaves `e` be (it is of `e`'s school). */
const home = (e: Enemy, g: Ground) => e.foe?.school === SCHOOL[g];
/** Whether `e` walks the ground at all (fliers, bosses and those hidden under it don't). */
const walks = (e: Enemy) => !!e.foe && !e.flying && !e.isBoss && !e.hidden;
/** Whether something at (x, z) would hold or hurt `e` (another kind's, not of its school). */
function foulAt(e: Enemy, x: number, z: number) {
  const who = kindOf(e), h = hazardAt(x, z, who), p = patchAt(x, z, who);
  return (!!h && !home(e, h)) || (!!p && !home(e, p)) || (stingAt(x, z, who) && !home(e, 'spores'));
}
/** Each ground's colour, for the puff as a foe steps into it. */
const COLOR: Record<Ground, number> = { web: 0xd8d0e8, ink: 0x8a72c8, rime: 0x9fd0ee, blackice: 0x6a4aa8, fire: 0xff7a2a, blackfire: 0xb070ff, spark: SCHOOL_LIGHT.storm, spores: 0x8a6aa8 };
/** The ground at (x, z) that a foe of kind `who` would fall foul of, if any. */
const groundAt = (x: number, z: number, who?: string): Ground | undefined => hazardAt(x, z, who) ?? patchAt(x, z, who) ?? (stingAt(x, z, who) ? 'spores' : undefined);

/** How much the ground at its feet holds `e` back this step (1: not at all): another kind's web or ink. */
export const groundPace = (e: Enemy) => walks(e) && !home(e, 'web') ? stickyAt(e.x, e.z, kindOf(e)) : 1;

/** A golem or an elemental about to step into another kind's ground goes round it: the first way, a little to either side,
    that is clear, or it waits a moment. It never stops while it stands in it (it walks out). */
export function steerAround(e: Enemy) {
  if (!walks(e) || !(e.foe!.avoidsGround || e.foe!.elemental)) return;
  const sp = Math.hypot(e.vx, e.vz), look = CFG.foeGround.look;
  if (sp < .2 || foulAt(e, e.x, e.z)) return;
  const a0 = Math.atan2(e.vz, e.vx), clear = (a: number) => CFG.foeGround.lookAt.every(k => !foulAt(e, e.x + Math.cos(a) * look * k, e.z + Math.sin(a) * look * k)); // (points on the way: a near patch isn't stepped over)
  if (clear(a0)) return;
  for (const d of CFG.foeGround.steer) if (clear(a0 + d)) { e.vx = Math.cos(a0 + d) * sp; e.vz = Math.sin(a0 + d) * sp; return; }
  e.vx = e.vz = 0;
}

/** On another kind's rime, `e` slides: what it means to do comes in slowly, as for the mage (`CFG.bestiary.rimeGrip`). On
    black ice (M4.8's reaction, Frost and Umbral) every walker slides, and far longer: it can hardly stop or turn
    (`blackice.grip` in data/magic.json). */
export function groundSlide(e: Enemy, dt: number) {
  const black = walks(e) && blackIceAt(e.x, e.z);
  if (!black && (!walks(e) || home(e, 'rime') || !slipAt(e.x, e.z, kindOf(e)))) { e.slide = undefined; return; }
  const k = 1 - Math.exp(-(black ? MAGIC.reactions.blackice.grip : CFG.bestiary.rimeGrip) * dt), was = e.slide ?? { x: e.vx, z: e.vz };
  e.slide = { x: was.x + (e.vx - was.x) * k, z: was.z + (e.vz - was.z) * k };
  e.vx = e.slide.x; e.vz = e.slide.z;
}

/** What another kind's ground does to `e` standing in it: as it steps in, a puff in the ground's colour (and the first
    time in a run, a line that says foes fall foul of each other's ground); every `CFG.foeGround.every` seconds, burning
    ground sets it burning, an armed spark shocks and hurts it, spores sting it. */
export function groundHarm(e: Enemy, dt: number) {
  if (!walks(e) || e.dead || e.spawn > 0) { e.inGround = undefined; return; }
  const F = CFG.foeGround, who = kindOf(e), found = groundAt(e.x, e.z, who), at = found && !home(e, found) ? found : undefined;
  if (at && at !== e.inGround) {
    burst(e.x, .3, e.z, COLOR[at], 8, 1.4, .04);
    if (!G.run.hinted.has('foeGround')) { G.run.hinted.add('foeGround'); line(STR.foes.groundLine, CFG.afflict.lineShow); }
  }
  e.inGround = at;
  e.groundT = (e.groundT ?? 0) - dt; if (e.groundT > 0) return;
  const h = at === 'fire' || at === 'blackfire' || at === 'spark' ? at : undefined;
  if (h === 'fire' || h === 'blackfire') { inflict(e, { burn: F.burn }); if (h === 'blackfire' && e.status && e.status.burn > 0) e.status.black = true; } // (M4.10: Black Melt's ground burns black)
  else if (h === 'spark') { inflict(e, { shock: F.shock }); damageEnemy(e, sparkSting(e.x, e.z, who) ?? F.sparkDamage, 0, 0, 0, undefined, 'storm'); } // (M6: Spark Wake's stings harder)
  else if (at === 'spores') damageEnemy(e, F.sting, 0, 0, 0);
  else return;
  e.groundT = F.every;
}

/** The dev menu and the tests: a patch of `kind` at (x, z) in the current room, left by a foe of kind `by` (none: no one's,
    so it holds every foe). */
export function layDevGround(kind: Ground, x: number, z: number, by?: string) {
  const room = G.current;
  if (kind === 'fire') layFire(room, x, z, 10, by);
  else if (kind === 'blackfire') layBlackFire(room, x, z, 10);
  else if (kind === 'spark') laySpark(room, x, z, 10, by);
  else if (kind === 'spores') addSpores(room, x, z, { color: 0x8a6aa8, sting: 1, by });
  else layGround(room, kind, x, z, .75, 14, by);
}
/** The dev menu's lure test: across the room ahead of the mage, a band of burning ground (a Magma Ooze's), of webs (a Crypt
    Spider's) and of rime (a Rime Snail's), and beyond it a pack of Rime Wolves, which blunder through, and a Salt Golem,
    which goes round. */
export function lureTest(x: number, z: number) {
  const band = z - 3, kinds: [Ground, string][] = [['fire', 'magmaOoze'], ['web', 'cryptSpider'], ['rime', 'rimeSnail']];
  kinds.forEach(([kind, by], i) => { for (let k = 0; k < 4; k++) layDevGround(kind, x - 5 + i * 3.4 + k * .8, band, by); });
  spawnFoe('rimeWolf', x - 2, z - 6, 1);
  spawnFoe('saltGolem', x + 3, z - 6, 1);
}
