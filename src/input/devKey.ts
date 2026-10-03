/** The dev menu's keys: the key left of 1 and F2 (a Mac's F2 reaches the browser only with fn held). A Mac with an ISO
    keyboard (the German one among them) reports the key left of 1 as IntlBackslash, not Backquote: macOS swaps it with
    the key beside left Shift. Elsewhere IntlBackslash is that key beside left Shift, which a hand reaching for Shift (the
    blink) can catch, so it opens the menu only on a Mac. */
export const IS_MAC = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform || navigator.userAgent);
export const isDevKey = (code: string, mac = IS_MAC) => code === 'Backquote' || code === 'F2' || (mac && code === 'IntlBackslash');
