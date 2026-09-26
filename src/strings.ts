/* Every player-facing string, so the placeholder names can be swapped for Eda lore in one place.
   Artifact names and pickup lines live with the artifact data in data/artifacts.json. */
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
    heading: 'Paused', resume: 'Resume', restart: 'Restart run', load: 'Load hero .glb',
    soundOn: 'Sound: on', soundOff: 'Sound: off',
  },
  end: {
    won: 'The descent is complete',
    lost: 'You fell in the ossuary',
    wonText: (time: string, kills: number) => `All three floors cleared in ${time}, with ${kills} foes put to rest.`,
    lostText: (floor: number, time: string, kills: number) => `You fell on floor ${floor} after ${time}, with ${kills} foes put to rest.`,
    again: 'Descend again',
  },
  /** Banner when a floor begins, floor 1 first. */
  floors: [
    ['The Ossuary', 'Beneath the old chapel of Eda'],
    ['The Drowned Catacombs', "Where the chapel's water gathers"],
    ['The Burning Scriptorium', 'Where the chapel kept its books'],
  ] as Banner[],
  /** The boss of each floor. */
  bossNames: ['The Hollow Warden', 'The Hollow Warden, Risen', 'The Hollow Warden, Unbound'],
  banner: {
    bossSub: 'Keeper of the lower vault',
    summon: ['The warden calls its dead', ''] as Banner,
    bossDead: ['The warden is still', 'A way down has opened'] as Banner,
    lastBossDead: ['The last warden is still', 'The way out lies below'] as Banner,
    artifactRises: ['Something rises from the dust', ''] as Banner,
    ordeal: (waves: number): Banner => ['The Ordeal', `Survive ${waves} waves, and be rewarded`],
    wave: (n: number, of: number): Banner => [`Wave ${n}`, `of ${of}`],
    ordealPassed: ['The ordeal is passed', 'Your reward rises'] as Banner,
    altar: ['A bone altar', 'It asks for a heart'] as Banner,
    altarRefuses: ['The altar refuses', 'You have no heart to spare'] as Banner,
  },
  runInfo: (floor: number, floors: number, seed: string) => `Floor ${floor} of ${floors} · Seed ${seed}`,
  rotate: 'Turn your phone sideways to play.',
  drop: 'Release to play as this model',
  health: (hp: number, max: number) => `Health ${hp} of ${max} hearts`,
  toast: {
    notGlb: 'That file is not a .glb. Export the model from Tripo as GLB and try again.',
    badGlb: 'This .glb could not be read. Re-export it from Tripo as GLB and try again.',
    focusLeft: (name: string) => `You leave the ${name} on the pedestal`,
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
