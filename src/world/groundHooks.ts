/* What lands on the ground (M4.5): fire, frost and shock report where they land (world/pools.ts: `fireAt`, `frostAt`,
   `shockAt`), and what lies on the floor hears it here without the pools knowing of it: a crypt spider's webs burn, an
   ink octopus's smears freeze. Steam (magic/steam.ts) reports where it rises and a glyph's blast where it goes off
   (combat/glyphs.ts): scalded or blasted water gives up what hides in it. */
export type GroundElement = 'fire' | 'frost' | 'shock' | 'steam' | 'blast';
type Hearer = (kind: GroundElement, x: number, z: number, r: number) => void;
const hearers: Hearer[] = [];
/** Listen for the elements landing on the ground. */
export const hearGround = (h: Hearer) => {
  hearers.push(h);
};
/** An element has landed at (x, z), reaching `r` round it. */
export const groundHears = (kind: GroundElement, x: number, z: number, r = 0) => {
  for (const h of hearers) h(kind, x, z, r);
};
