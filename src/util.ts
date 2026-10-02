export const clamp = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const ease = (t: number) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/** Small seeded PRNG, used for procedural textures and rock placement (in the pure rng.ts, for the pure rules). */
export { mulberry } from './rng';

export function angleLerp(a: number, b: number, t: number) {
  const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * t;
}

export const isTouch = ('ontouchstart' in window) || matchMedia('(pointer: coarse)').matches;
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
