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
    glyph: 'Blast glyph', glyphKeys: 'Space', glyphPad: 'Left trigger', glyphTouch: '–',
    pause: 'Pause', pauseKeys: 'Esc or P', pausePad: 'Start', pauseTouch: 'II button',
  },
  chalk: { walk: 'walk', cast: 'cast', glyph: 'glyph', space: 'SPACE', touchMove: 'left thumb moves', touchShoot: 'right thumb shoots' },
  pause: {
    heading: 'Paused', resume: 'Resume', restart: 'Restart run', load: 'Load hero .glb',
    soundOn: 'Sound: on', soundOff: 'Sound: off',
  },
  end: {
    won: 'The descent is complete',
    lost: 'You fell in the ossuary',
    wonText: 'Every floor cleared, and every keeper put to rest.',
    lostText: (floor: number, name: string) => `Your descent ended on floor ${floor}, ${name}.`,
    floor: 'Deepest floor', time: 'Time', kills: 'Foes put to rest', seed: 'Seed', artifacts: 'Artifacts carried',
    floorValue: (floor: number, floors: number) => `${floor} of ${floors}`,
    again: 'Descend again',
    replay: 'Replay this seed',
  },
  /** Banner when a floor begins, floor 1 first. */
  floors: [
    ['The Ossuary', 'Beneath the old chapel of Eda'],
    ['The Drowned Catacombs', "Where the chapel's water gathers"],
    ['The Burning Scriptorium', 'Where the chapel kept its books'],
  ] as Banner[],
  /** The bosses: name and line on the boss bar banner, the banner when it calls help, the one when it dies. */
  bosses: {
    warden: { name: 'The Hollow Warden', sub: 'Keeper of the lower vault', summon: 'The warden calls its dead', dead: 'The warden is still' },
    abbess: { name: 'The Drowned Abbess', sub: 'She still keeps the hours below', summon: 'The abbess calls the drowned lights', dead: 'The abbess sinks for good' },
    pyre: { name: 'The Pyre Knight', sub: 'Sworn to the burning books', summon: 'The knight calls the hounds', dead: 'The knight burns out' },
  },
  banner: {
    wayDown: 'A way down has opened',
    wayOut: 'The way out lies below',
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
  purse: (coins: number, keys: number, glyphs: number) => `${coins} obols, ${keys} bone keys, ${glyphs} blast glyphs`,
  toast: {
    notGlb: 'That file is not a .glb. Export the model from Tripo as GLB and try again.',
    badGlb: 'This .glb could not be read. Re-export it from Tripo as GLB and try again.',
    focusLeft: (name: string) => `You leave the ${name} on the pedestal`,
    chestSealed: "A ward seals this chest. A bone key unbinds it; a glyph's blast breaks it, but burns half of what's inside.",
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
