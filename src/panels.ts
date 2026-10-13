/* The panel door: the only way the simulation opens a UI flow (a screen that pauses the game, a talk, a question) or asks
   whether one is up, as devDoor.ts is for dev code. The UI registers its panels at boot (main.ts, `registerPanels`); until
   then every call does nothing. */

/** What the UI opens for the game. */
export interface Panels {
  /** A grimoire page walked into with both slots full asks which spell to give up (the answer is a spell key: pages.ts). */
  askPage(spell: string): void;
}

let door: Panels | null = null;
/** The UI's panels, from now on answering the game (main.ts, at boot). */
export function registerPanels(p: Panels) {
  door = p;
}

export const askPage = (spell: string) => door?.askPage(spell);
