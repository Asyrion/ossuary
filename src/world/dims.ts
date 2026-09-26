import type { Side } from '../types';

/** Room interior half-width and half-depth (13 × 7 tiles), wall thickness, room pitch on the grid,
    door half-width, and the tall north / low south wall heights. */
export const HW = 6.5, HD = 3.5, WT = 1, PX = 15, PZ = 9, DH = 0.72;
export const H_TALL = 1.35, H_LOW = 0.5;
export const SIDES: Side[] = ['n', 's', 'e', 'w'];
export const DIR: Record<Side, { gx: number; gy: number }> = { n: { gx: 0, gy: -1 }, s: { gx: 0, gy: 1 }, e: { gx: 1, gy: 0 }, w: { gx: -1, gy: 0 } };
