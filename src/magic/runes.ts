/* M6 step 7: runes in play (docs/M6-plan.md, decisions 9 and 10; the rules are runeData.ts). Each slot has a socket (one
   rune, two with Second Socket); a rune carved there changes every cast of the slot's spell, read through `slotDef`
   (cost.ts). The socket belongs to the slot: a spell given up or forgotten sends its runes to the pouch (`player.runes`)
   and the slot keeps its size, so a swap at a library costs nothing. Until step 8 brings runes to find and step 9 the
   waystone to carve at, runes are carved from the dev menu and `?runes=`. A rune at work says so (Nothing silent): its
   name rises once a room, its line the first time in a run, a chisel's tick and the spell's school. */
import { CFG } from '../config';
import { player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { line, renderSpells } from '../ui/hud';
import { actsHere } from '../progression/boonHooks';
import { canCarve, rune, type RuneId } from './runeData';
import { spell, type School, type SpellDef } from './spellData';
import { upgradedSpell } from './memory';

/** Carve rune `id` into slot `slot`'s socket: null when carved, else why not (no spell there, it doesn't fit the spell,
    the socket is full, it is carved there already). The spell's knowledge reaches Upgraded once it is known well. */
export function carve(slot: number, id: RuneId): 'empty' | 'fit' | 'full' | 'twice' | null {
  const sid = player.spells[slot]; if (!sid) return 'empty';
  const socket = player.sockets[slot], why = canCarve(socket, id, spell(sid));
  if (why) return why;
  player.sockets[slot] = { size: socket.size, runes: [...socket.runes, id] }; // (a new array: slotDef's cache sees it)
  upgradedSpell(sid, 'rune:' + id);
  renderSpells();
  return null;
}
/** Slot `slot`'s socket emptied (the dev menu): its runes are gone, not sent to the pouch. */
export function clearRunes(slot: number) { player.sockets[slot] = { size: player.sockets[slot].size, runes: [] }; renderSpells(); }
/** Slot `slot`'s socket holds `size` runes (Second Socket: two); runes past it go to the pouch. */
export function setSockets(slot: number, size: number) {
  const s = player.sockets[slot];
  toPouch(s.runes.slice(size));
  player.sockets[slot] = { size, runes: s.runes.slice(0, size) }; renderSpells();
}
/** The runes carved in slot `slot` go to the pouch (its spell given up or forgotten), a line saying so; the socket stays. */
export function unslot(slot: number) {
  const s = player.sockets[slot]; if (!s?.runes.length) return;
  toPouch(s.runes); player.sockets[slot] = { size: s.size, runes: [] };
}
function toPouch(ids: RuneId[]) {
  if (!ids.length) return;
  player.runes.push(...ids);
  line(STR.runes.toPouch(ids.map(id => rune(id).name).join(' and ')), CFG.afflict.lineShow);
}

/** Rune `id` at work at (x, z) on a spell of `school` (counted as `rune:<id>` in `G.run.acted`). */
export function runeActs(id: RuneId, school: School, x = player.x, z = player.z) {
  const r = rune(id);
  actsHere('rune:' + id, 'rune:' + id, r.name, r.color, STR.runes.acts[id] ?? r.text, x, z, () => Sfx.at(x, z).rune(school));
}
/** The runes that show at the cast itself (Quicken, Wide, Lasting): the rest act where their work is done. */
const AT_CAST: readonly RuneId[] = ['quicken', 'wide', 'lasting'];
export function castRunes(def: SpellDef) { for (const id of def.runes ?? []) if (AT_CAST.includes(id as RuneId)) runeActs(id as RuneId, def.school); }
