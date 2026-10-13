/* The face the obols wear (2026-10-02, from the owner's coins; docs/assets.md: Coins): one of the coin faces in
   data/assets.json (`coins`), the one its `obol` names, or the dev menu's choice to try another, remembered in the
   browser with the default it was made against (so a new default shows once, as the pixel look's choice does).
   'rune' is the obol built in code, worn when no face is loaded (?assets=off, a missing file). */
import { coinFace, coinIconUrl, coinIds, manifestObol, type CoinFace } from '../assets/models';

export const RUNE = 'rune';
const KEY = 'ossuary.obolFace';
let stored: { id: string; start: string | null } | null = null;
try {
  stored = JSON.parse(localStorage.getItem(KEY) ?? 'null') as typeof stored;
} catch {
  /* no storage: the default */
}

/** The face the obols wear now (a coin's name), or 'rune'. */
export function obolFace(): string {
  const start = manifestObol(),
    id = stored && stored.start === start ? stored.id : start;
  return id && coinFace(id) ? id : RUNE;
}
/** The worn face's image and rim, or null for the rune. */
export const obolFaceNow = (): (CoinFace & { id: string }) | null => {
  const id = obolFace(),
    f = coinFace(id);
  return f ? { ...f, id } : null;
};
/** The worn face's icon (a URL), or null for the rune's drawn one. */
export const obolIconUrl = () => coinIconUrl(obolFace());
/** Every face the obols can wear: the loaded coins, then the rune. */
export const obolFaces = () => [...coinIds(), RUNE];
/** Wear another face (the dev menu): remembered in this browser. */
export function setObolFace(id: string) {
  stored = { id, start: manifestObol() };
  try {
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    /* not remembered */
  }
}
