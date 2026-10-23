/* The dev code's one entry: main.ts loads it with a dynamic import, so it is its own chunk and no game module imports
   from src/dev/. It reaches the game through the door (devDoor.ts) and the game's own modules. */
import { registerDevMenu } from '../devDoor';
import { closeDev, devOpen, toggleDev } from './menu';
import { installHooks } from './hooks';
import { applyUrlOptions as applyAddress } from './urlOptions';
import { DEV_STR } from './strings';
import './frameInfo';
import { preloadBossCreatures } from '../actors/madeBosses';

/** Before the game reads its options: the dev options in the address applied, and the dev menu's key shown. */
export function applyUrlOptions() {
  applyAddress();
  const hint = document.getElementById('devHint');
  if (hint) hint.textContent = DEV_STR.hint;
}
/** Once the title is up and the hero loaded: the dev menu behind the door, and `window.__game`. A boss the address asks
    for (?boss=) starts loading its creature now, as its floor would, since its room may be the first (`creaturesReady`). */
export function install() {
  const boss = new URLSearchParams(location.search).get('boss');
  if (boss) void preloadBossCreatures(boss);
  registerDevMenu({ isOpen: devOpen, close: closeDev, toggle: toggleDev });
  installHooks();
}
