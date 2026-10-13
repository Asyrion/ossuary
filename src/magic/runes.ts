/* M6 step 7: runes in play (docs/archive/M6-plan.md, decisions 9 and 10; the rules are runeData.ts). Each slot has a socket (one
   rune, two with Second Socket); a rune carved there changes every cast of the slot's spell, read through `slotDef`
   (cost.ts). The socket belongs to the slot: a spell given up or forgotten sends its runes to the pouch (`player.runes`)
   and the slot keeps its size, so a swap at a library costs nothing. Step 8 brings runes to find (`addRune`, dealt by
   `dealRune` on the run's own stream, leaning to the spells in the slots); until step 9's waystone, runes are carved from
   the dev menu and `?runes=`. A rune at work says so (Nothing silent): its name rises once a room, its line the first time
   in a run, a chisel's tick and the spell's school. */
import { CFG } from '../config';
import { DEV, G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { line, renderSpells } from '../notify';
import { showLore } from '../ui/lore';
import { LOOT, type RuneOdds } from '../items/loot';
import { FLOORS } from '../world/generate';
import { runeIconImg } from '../items/runeLooks';
import { actsHere } from '../progression/boonHooks';
import { SHAPE_COUNT, canCarve, pickPair, pickRune, rune, runeFits, type RuneId } from './runeData';
import { spell, type School, type SpellDef } from './spellData';
import { upgradedSpell } from './memory';

/** Carve rune `id` into slot `slot`'s socket: null when carved, else why not (no spell there, it doesn't fit the spell,
    the socket is full, it is carved there already). The spell's knowledge reaches Upgraded once it is known well. */
export function carve(slot: number, id: RuneId): 'empty' | 'fit' | 'full' | 'twice' | null {
  const sid = player.spells[slot];
  if (!sid) return 'empty';
  const socket = player.sockets[slot],
    why = canCarve(socket, id, spell(sid));
  if (why) return why;
  player.sockets[slot] = { size: socket.size, runes: [...socket.runes, id] }; // (a new array: slotDef's cache sees it)
  upgradedSpell(sid, 'rune:' + id);
  renderSpells();
  return null;
}
/** Slot `slot`'s socket emptied (the dev menu): its runes are gone, not sent to the pouch. */
export function clearRunes(slot: number) {
  player.sockets[slot] = { size: player.sockets[slot].size, runes: [] };
  renderSpells();
}
/** Slot `slot`'s socket holds `size` runes (Second Socket: two); runes past it go to the pouch. */
export function setSockets(slot: number, size: number) {
  const s = player.sockets[slot];
  toPouch(s.runes.slice(size));
  player.sockets[slot] = { size, runes: s.runes.slice(0, size) };
  renderSpells();
}
/** The runes carved in slot `slot` go to the pouch (its spell given up or forgotten), a line saying so; the socket stays. */
export function unslot(slot: number) {
  const s = player.sockets[slot];
  if (!s?.runes.length) return;
  toPouch(s.runes);
  player.sockets[slot] = { size: s.size, runes: [] };
}
function toPouch(ids: RuneId[]) {
  if (!ids.length) return;
  player.runes.push(...ids);
  Sfx.runeTake();
  line(STR.runes.toPouch(ids.map((id) => rune(id).name).join(' and ')), CFG.afflict.lineShow);
}

/* ---------- M6 step 8: runes as things ---------- */

/** How likely runes are here: the floor's `runes` (none on floor 5) times the chance of `where` in data/loot.json. */
export const runeOdds = (where: keyof RuneOdds) => LOOT.runes[where] * (FLOORS[G.run.floor]?.runes ?? 1);
/** Whether a rune lies `where` this time: always drawn from the run's runes stream (a seed replays the same draws). */
export const runeHere = (where: keyof RuneOdds) => G.run.runes.chance(runeOdds(where)) || DEV.runes;
/** Which rune a drop or a ware is: two times in three one that fits a spell in the slots, else any of the seven. */
export const dealRune = (): RuneId =>
  pickRune(G.run.runes, player.spells.filter((s): s is string => !!s).map(spell), CFG.runeDrops.lean);
/** Rune `id` into the pouch (no limit), with a stone's chime; its card the first time each is taken in a run. */
export function addRune(id: RuneId) {
  player.runes.push(id);
  Sfx.runeTake();
  renderSpells();
  if (!G.run.loreSeen.has('rune:' + id)) {
    G.run.loreSeen.add('rune:' + id);
    runeCard(id);
  }
}
/** M6 step 9: a waystone's pair, two different runes dealt as one is. */
export const dealPair = () =>
  pickPair(G.run.runes, player.spells.filter((s): s is string => !!s).map(spell), CFG.runeDrops.lean);
/** Carve rune `id` from the pouch into slot `slot` (a waystone): null when carved (one taken out of the pouch), else why
    not, as `carve` says; 'none' when the pouch holds no such rune. */
export function carveFromPouch(slot: number, id: RuneId): 'empty' | 'fit' | 'full' | 'twice' | 'none' | null {
  const at = player.runes.indexOf(id);
  if (at < 0) return 'none';
  const why = carve(slot, id);
  if (why) return why;
  player.runes.splice(at, 1);
  Sfx.carve();
  return null;
}
/** Lift rune `id` out of slot `slot`'s socket back into the pouch (a waystone, for nothing); false when it isn't carved there. */
export function liftRune(slot: number, id: RuneId) {
  const s = player.sockets[slot];
  if (!s.runes.includes(id)) return false;
  player.sockets[slot] = { size: s.size, runes: s.runes.filter((r) => r !== id) };
  player.runes.push(id);
  Sfx.runeTake();
  renderSpells();
  return true;
}
/** What rune `id` fits, in words: every spell, or the shapes it takes; and which spells in the hand it fits now. */
export function runeFitsText(id: RuneId) {
  const r = rune(id),
    held = player.spells.filter((s): s is string => !!s).map(spell);
  const shapes =
    r.shapes.length >= SHAPE_COUNT
      ? STR.runes.everySpell
      : STR.runes.shapesFit(r.shapes.map((s) => STR.runes.shapes[s] ?? s));
  const fits = held.filter((d) => runeFits(id, d)).map((d) => d.name);
  return `${shapes} ${held.length ? (fits.length ? STR.runes.handFits(fits.join(' and ')) : STR.runes.handFitsNone) : ''}`.trim();
}
/** A rune's lore card: what it does, what it fits, that a waystone carves it. */
export function runeCard(id: RuneId) {
  const r = rune(id);
  showLore({
    name: r.name,
    kind: STR.runes.kind,
    effect: `${r.text}. ${runeFitsText(id)} ${STR.runes.carvedAt}`,
    lore: r.lore,
    icon: runeIconImg(id),
  });
}

/** Rune `id` at work at (x, z) on a spell of `school` (counted as `rune:<id>` in `G.run.acted`). */
export function runeActs(id: RuneId, school: School, x = player.x, z = player.z) {
  const r = rune(id);
  actsHere('rune:' + id, 'rune:' + id, r.name, r.color, STR.runes.acts[id] ?? r.text, x, z, () =>
    Sfx.at(x, z).rune(school),
  );
}
/** The runes that show at the cast itself (Quicken, Wide, Lasting): the rest act where their work is done. */
const AT_CAST: readonly RuneId[] = ['quicken', 'wide', 'lasting'];
export function castRunes(def: SpellDef) {
  for (const id of def.runes ?? []) if (AT_CAST.includes(id as RuneId)) runeActs(id as RuneId, def.school);
}
