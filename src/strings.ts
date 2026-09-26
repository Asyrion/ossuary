/* Every player-facing string, so the placeholder names can be swapped for Eda lore in one place.
   Relic names and pickup lines live with the relic data in data/relics.json. */
type Banner = [title: string, subtitle: string];

export const STR = {
  pageTitle: 'Ossuary, an Eda prototype',
  title: {
    heading: 'Ossuary',
    intro: 'A first descent beneath Eda. Clear the crypt, take the relic from its altar, and put the warden below to rest.',
    start: 'Descend',
    note: 'Prototype 0.4. Drop any Tripo .glb onto this page to play as it.',
  },
  controls: {
    keyboard: 'Keyboard', gamepad: 'Gamepad', touch: 'Touch',
    move: 'Move', moveKeys: 'W A S D', movePad: 'Left stick', moveTouch: 'Left thumb',
    shoot: 'Shoot', shootKeys: 'Arrow keys', shootPad: 'Right stick', shootTouch: 'Right thumb',
    pause: 'Pause', pauseKeys: 'Esc or P', pausePad: 'Start', pauseTouch: 'II button',
  },
  chalk: { walk: 'walk', cast: 'cast', touchMove: 'left thumb moves', touchShoot: 'right thumb shoots' },
  pause: {
    heading: 'Paused', resume: 'Resume', restart: 'Restart floor', load: 'Load hero .glb',
    soundOn: 'Sound: on', soundOff: 'Sound: off',
  },
  end: {
    won: 'The warden has fallen',
    lost: 'You fell in the ossuary',
    wonText: (time: string, kills: number) => `Floor cleared in ${time}, with ${kills} foes put to rest.`,
    lostText: (time: string, kills: number) => `You lasted ${time} and put ${kills} foes to rest.`,
    again: 'Descend again',
  },
  banner: {
    floor: ['The Ossuary', 'Beneath the old chapel of Eda'] as Banner,
    boss: ['The Hollow Warden', 'Keeper of the lower vault'] as Banner,
    summon: ['The warden calls its dead', ''] as Banner,
    bossDead: ['The warden is still', 'A way down has opened'] as Banner,
  },
  bossName: 'The Hollow Warden',
  rotate: 'Turn your phone sideways to play.',
  drop: 'Release to play as this model',
  health: (hp: number, max: number) => `Health ${hp} of ${max} hearts`,
  toast: {
    notGlb: 'That file is not a .glb. Export the model from Tripo as GLB and try again.',
    badGlb: 'This .glb could not be read. Re-export it from Tripo as GLB and try again.',
  },
  heroInfo: (label: string, tris: number, stripped: boolean, skinned: boolean, clips: string) =>
    `${label}: ${tris.toLocaleString()} triangles${stripped ? ', base removed' : ''}` +
    `${skinned ? ', rigged' : ', static (procedural animation)'}${clips ? `. Clips used: ${clips}` : ''}.`,
};

/** Fill every element with a data-s="path.to.string" attribute. */
export function applyStrings(root: ParentNode = document) {
  document.title = STR.pageTitle;
  for (const el of root.querySelectorAll<HTMLElement>('[data-s]')) {
    let v: unknown = STR;
    for (const k of el.dataset.s!.split('.')) v = (v as Record<string, unknown>)?.[k];
    if (typeof v === 'string') el.textContent = v;
    else console.warn('missing string', el.dataset.s);
  }
}
