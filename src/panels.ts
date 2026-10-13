/* The panel door: the only way the simulation opens a UI flow (a screen that pauses the game, a talk, a question) or asks
   whether one is up, as devDoor.ts is for dev code. The UI registers the panels at boot (main.ts, `registerPanels`); until
   then every call does nothing and every question answers "no". `UI` is what the UI writes and the game reads, as `DEV` is
   for dev code. */
import type { School } from './magic/spellData';
import type { Picked } from './vigil/dialogueData';

/** The alchemy table's tabs (ui/alchemyTable.ts). */
export type LabTab = 'brew' | 'identify' | 'recipes';
/** The waystone's tabs (ui/waystone.ts). */
export type StoneTab = 'runes' | 'belt';

/** What the UI opens for the game. */
export interface Panels {
  /** The alchemy table at a tab (the game waits). */
  openLab(tab: LabTab): void;
  closeLab(): void;
  /** The waystone's screen at a tab; `slot` makes that spell the one carved into. */
  openWaystone(tab: StoneTab, slot?: number): void;
  /** The shrine's bargain on `school`; false when another screen holds the level-up screen. */
  openBargain(school: School): boolean;
  /** A townsperson's talk: `who` (named `name`, its icon `icon`) says `line`; `also` heard with it; `top` puts the panel at
      the top of the screen. */
  openTalk(who: string, name: string, icon: string, line: Picked, also?: string[], top?: boolean): void;
  closeTalk(): void;
  /** The level-up screen for the next level waiting; false if it is open already or none waits. */
  openLevelUp(): boolean;
  /** A grimoire page walked into with both slots full asks which spell to give up (the answer is a spell key: pages.ts). */
  askPage(spell: string): void;
  /** Whether a screen other than the level-up's is up (a talk, the lectern, the table, the stone, the inventory, the dev
      menu, a page's question): a level waits for it. */
  otherScreenUp(): boolean;
}

/** What the UI says is open (it writes these; the game reads them). */
export const UI = {
  labOpen: false,
  waystoneOpen: false,
  levelOpen: false,
  /** Who is talking now (their figure gestures), if anyone. */
  talking: null as string | null,
};

let door: Panels | null = null;
/** The UI's panels, from now on answering the game (main.ts, at boot). */
export function registerPanels(p: Panels) {
  door = p;
}

export const openLab = (tab: LabTab) => door?.openLab(tab);
export const closeLab = () => door?.closeLab();
export const openWaystone = (tab: StoneTab, slot?: number) => door?.openWaystone(tab, slot);
export const openBargain = (school: School): boolean => door?.openBargain(school) ?? false;
export const openTalk = (...a: Parameters<Panels['openTalk']>) => door?.openTalk(...a);
export const closeTalk = () => door?.closeTalk();
export const openLevelUp = (): boolean => door?.openLevelUp() ?? false;
export const askPage = (spell: string) => door?.askPage(spell);
export const otherScreenUp = (): boolean => door?.otherScreenUp() ?? false;
