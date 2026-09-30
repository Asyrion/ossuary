/* Soul motes (M4.1; GDD: Items; the idea bank's soul hearts): pale flames kept beside the hearts that take a hit before
   the hearts do, and can't be healed back. A pale mote guards one hit; a black one guards one and, going out, hexes every
   foe in the room; a hallowed one is always lost last and gives back half a heart at the end of every floor it lives
   through. A spell cast short of mana burns a mote for the rest. The rules on which goes first are pure (`soulToLose` in
   loot.ts); here they are carried out. */
import { CFG } from '../config';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { burst } from '../combat/fx';
import { renderHearts, toast } from '../ui/hud';
import { FLOORS } from '../world/generate';
import { inflict } from '../magic/statusFx';
import { SOUL_COLOR, soulToLose, type Soul } from './loot';


/** How much likelier soul motes are in the loot here: the floor's `souls` (the deep floors give more). */
export const soulsHere = () => (FLOORS[G.run.floor]?.souls ?? 1) * (player.stats.effects.has('soulLantern') ? CFG.artifacts.soulLantern.souls : 1); // (twice with the Ferryman's Lantern)

/** Take a mote; false when the mage already holds as many as can be kept. */
export function gainSoul(kind: Soul) {
  if (player.souls.length >= CFG.souls.max) return false;
  player.souls.push(kind); renderHearts();
  return true;
}

/** Put out the mote a hit or a spell takes, with what goes with it (a black one hexes the room); null when none is held. */
function spendSoul(): Soul | null {
  const i = soulToLose(player.souls);
  if (i < 0) return null;
  const [kind] = player.souls.splice(i, 1); renderHearts();
  burst(player.x, 1, player.z, SOUL_COLOR[kind], 14, 2.2, .05);
  if (kind === 'black') { // it goes out in a spill of shadow over every foe in the room
    for (const e of G.enemies) if (!e.dead && e.spawn <= 0 && !e.hidden) { inflict(e, { hex: CFG.souls.blackHex }); burst(e.x, .8, e.z, SOUL_COLOR.black, 6, 1.4, .04); }
    Sfx.soulHex();
  }
  return kind;
}

/** A blow reached the mage: a mote takes it if one is held (the one it takes, or null). */
export function guardHit(): Soul | null {
  const kind = spendSoul();
  if (kind) Sfx.soulLost();
  return kind;
}

/** A spell short of mana: a mote burns for the rest (said once a run); false when none is held. */
export function burnSoul() {
  if (!spendSoul()) return false;
  Sfx.soulBurn();
  if (!G.run.hinted.has('soulBurn')) { G.run.hinted.add('soulBurn'); toast(STR.toast.soulBurned, 3); }
  return true;
}

/** The end of a floor: each hallowed mote held gives back half a heart. */
export function hallowedMend() {
  const n = player.souls.filter(s => s === 'hallowed').length;
  if (!n || player.hp >= player.maxHp) return 0;
  const before = player.hp; player.hp = Math.min(player.maxHp, player.hp + n); renderHearts();
  burst(player.x, 1, player.z, SOUL_COLOR.hallowed, 12, 1.8, .05); Sfx.soulMend();
  return player.hp - before;
}

/** A new run: no motes. */
export function resetSouls() { player.souls = []; renderHearts(); }
