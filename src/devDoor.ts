/* The one door between the game and its dev code (src/dev/: the dev menu, `window.__game`, the galleries and the test
   harnesses). The game calls only this file; dev code registers its menu and callbacks here, so no game module imports
   from src/dev/ and the game runs the same without it. */
import type { Room } from './types';

/** What the game asks of the dev menu: whether it is open, to close it, to open or close it. */
export interface DevMenu {
  isOpen(): boolean;
  close(): void;
  toggle(): void;
}
/** A step's callback: `playing` is true while a run is played and no room transition is under way. */
export type DevStep = (dt: number, room: Room, playing: boolean) => void;

let menu: DevMenu | null = null;
const steps: DevStep[] = [],
  clears: (() => void)[] = [],
  frames: ((ms: number) => void)[] = [];

/** Dev code: the dev menu, from now on answering the game's input routing. */
export function registerDevMenu(m: DevMenu) {
  menu = m;
}
/** Dev code: called every fixed step (galleries idling). */
export function onDevStep(f: DevStep) {
  steps.push(f);
}
/** Dev code: called when a new floor is built and its rooms are gone (galleries forgetting what they stood). */
export function onDevClear(f: () => void) {
  clears.push(f);
}
/** Dev code: called every drawn frame with its length in ms, outside the tests' manual stepping (the frame readout). */
export function onDevFrame(f: (ms: number) => void) {
  frames.push(f);
}

/** Whether the dev menu is open (never, until dev code registers it). */
export const devMenuOpen = (): boolean => menu?.isOpen() ?? false;
export function closeDevMenu() {
  menu?.close();
}
export function toggleDevMenu() {
  menu?.toggle();
}
export function devStep(dt: number, room: Room, playing: boolean) {
  for (const f of steps) f(dt, room, playing);
}
export function devClear() {
  for (const f of clears) f();
}
export function devFrame(ms: number) {
  for (const f of frames) f(ms);
}
