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
    merchant: ['The Bound Shade', 'He deals in the obols of the dead'] as Banner,
    vault: ['The Vault', 'What the dead would not give up'] as Banner,
    vaultWarden: ["The vault's warden wakes", 'It will not give up the hoard'] as Banner,
    gildedRelic: ['A relic in the reliquary', 'Fortune favours the bold'] as Banner,
    secret: ['A forgotten cell', 'Someone studied the dark here, long ago'] as Banner,
    shrine: (price: number): Banner => ['A shrine', `For ${price} obols it cleanses a curse`],
    riteBegins: ['The curse fights back', 'Strike it down inside the circle'] as Banner,
    cleansed: (name: string, text: string): Banner => [`The ${name} is cleansed`, text],
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
    focusLeftShop: (name: string) => `You leave the ${name} in the broken circle`,
    chestSealed: "A ward seals this chest. A bone key unbinds it; a glyph's blast breaks it, but burns half of what's inside.",
    gildedSealed: 'A golden ward seals this reliquary. No blast breaks it; only a bone key unbinds it. Something rare waits inside.',
    shopWarded: 'The shade has warded his shop: no spell takes hold here.',
    tooPoor: (price: number, coins: number) => `It costs ${price} obols; you carry ${coins}.`,
    wareWhole: 'You are whole; keep your obols.',
    wareFull: 'You can carry no more of those.',
    bought: (name: string) => `The ward breaks: the ${name} is yours`,
    vaultSealed: 'A ward seals the vault. A bone key unbinds it; two glyph blasts can force it, but forcing it wakes its warden.',
    wardCracks: 'The ward cracks. One more blast breaks it, and wakes what guards the vault.',
    vaultForced: 'The ward shatters. Something stirs inside the vault.',
    vaultUnbound: 'The bone key unbinds the ward.',
    hollow: "The wall rings hollow. A glyph's blast would break it.",
    secretFound: 'A hidden way lies open.',
    oathKept: 'The oath holds: half a heart returns.',
    shrineIdle: 'You carry no curse for the shrine to cleanse.',
    shrinePoor: (price: number, coins: number) => `The shrine asks ${price} obols to cleanse a curse; you carry ${coins}.`,
    outsideCircle: 'Outside the circle, your bolts pass through the curse.',
    curseEscaped: (name: string) => `The curse slips back into the ${name}. Walk into its stone to try again.`,
  },
  /** The boss bar while a shrine draws a curse out. */
  curseOf: (name: string) => `The curse of the ${name}`,
  /** The dev menu (the key left of 1, or F2): for testing, not for players. */
  dev: {
    title: 'Dev menu', close: 'Close',
    /** On the HUD during play-tests, so the key isn't forgotten. */ hint: 'Dev menu: ` / ^ or F2',
    info: (seed: string, floor: number, room: number, type: string) => `Seed ${seed} · floor ${floor} · room ${room} (${type})`,
    mage: 'The mage', heal: 'Full heal', container: '+1 heart container', resetArtifacts: 'Reset artifacts',
    godOn: 'God mode: on', godOff: 'God mode: off',
    resources: 'Obols, keys and glyphs', emptyPurse: 'Empty the purse',
    give: (n: number, what: string) => `+${n} ${what}${n === 1 ? '' : 's'}`,
    names: { coins: 'obol', keys: 'key', glyphs: 'glyph' } as Record<string, string>,
    drops: 'Drop ahead of the mage', gildedChest: 'Gilded chest',
    dropNames: { halfHeart: 'Half heart', heart: 'Heart', coin: 'Obol', purse: 'Purse', key: 'Bone key', glyph: 'Glyph stone', coffer: 'Coffer', chest: 'Reliquary chest' } as Record<string, string>,
    artifacts: 'Artifacts (click to take)', kinds: { focus: 'focus', passive: 'passive', cursed: 'cursed' } as Record<string, string>,
    foes: 'Foes (they leave the doors open)', champion: (name: string) => `Champion ${name.toLowerCase()}`,
    foeNames: { rotling: 'Rotling', wisp: 'Wisp', hound: 'Crypt hound' } as Record<string, string>,
    floor: 'This floor', sealed: 'sealed', hidden: 'hidden', clear: 'End this fight', reveal: 'Reveal the map', nextFloor: 'Next floor',
    revealCracks: 'Reveal cracked walls', openSecret: 'Open the secret room',
    cleanse: 'Cleanse a curse', takeCurse: 'Take a curse', noCurse: 'No curse to cleanse', allCurses: 'You hold every curse', cleansed: 'cleansed',
    roomNames: { start: 'Start', normal: 'Normal', treasure: 'Treasure', boss: 'Boss', ordeal: 'Ordeal', altar: 'Bone altar', merchant: 'Merchant', vault: 'Vault', secret: 'Secret room', shrine: 'Shrine' } as Record<string, string>,
    test: 'Test a room', template: 'Room template', variant: 'Variant', play: 'Play it',
    variants: { normal: 'Normal', quiet: 'Quiet', champion: 'Champion', ambush: 'Ambush', dark: 'Dark' } as Record<string, string>,
    bosses: 'Fight a boss', newRun: 'New run', floorN: (n: number) => `Floor ${n}`,
    keep: ' Keep artifacts, obols, keys and glyphs when starting',
  },
  /** What a merchant's ware is called in messages. */
  wares: { heart: 'heart', halfHeart: 'half heart', key: 'bone key', glyph: 'glyph stone', coin: 'obol', purse: 'purse' } as Record<string, string>,
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
