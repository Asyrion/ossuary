import { describe, expect, it } from 'vitest';
import { subtractRect, wallRects, type WallRect } from '../../src/world/walls';
import { shapeMask } from '../../src/world/shapes';
import { TEMPLATE_DEFS, parseTemplate } from '../../src/world/templates';

/** A mask from rows of '.' (inside) and 'x' (carved). */
const maskOf = (rows: string[]) => rows.map((row) => [...row].map((ch) => ch === '.'));
const full = (w: number, h: number) => Array.from({ length: h }, () => Array<boolean>(w).fill(true));
/** Every wall tile, with its height, from the rectangles; throws if two rectangles share a tile. */
function tiles(rects: WallRect[]) {
  const at = new Map<string, boolean>();
  for (const q of rects)
    for (let r = q.r0; r < q.r1; r++)
      for (let c = q.c0; c < q.c1; c++) {
        if (at.has(c + ',' + r)) throw new Error(`tile ${c},${r} is walled twice`);
        at.set(c + ',' + r, q.tall);
      }
  return at;
}

describe('walls', () => {
  it('ring a plain room: tall on the north and the sides, low on the south and its corners', () => {
    const t = tiles(wallRects(full(13, 7), full(13, 7)));
    expect(t.size).toBe(15 * 9 - 13 * 7);
    for (let c = -1; c <= 13; c++) {
      expect(t.get(c + ',-1')).toBe(true);
      expect(t.get(c + ',7')).toBe(false);
    }
    for (let r = 0; r < 7; r++) {
      expect(t.get('-1,' + r)).toBe(true);
      expect(t.get('13,' + r)).toBe(true);
    }
  });

  it('a carved corner is wall: tall at the top, low at the bottom, where the floor lies north of it', () => {
    const rows = [
      'x...........x',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      'xx...........',
    ];
    const t = tiles(wallRects(maskOf(rows), full(13, 7)));
    expect([t.get('0,0'), t.get('12,0')]).toEqual([true, true]);
    expect([t.get('0,6'), t.get('1,6')]).toEqual([false, false]);
    expect(t.get('1,5')).toBeUndefined();
  });

  it('a block standing free in a hall is low all over, and every one of its tiles is wall', () => {
    const rows = [
      '.............',
      '.....xxx.....',
      '.....xxx.....',
      '.....xxx.....',
      '.............',
      '.............',
      '.............',
    ];
    const t = tiles(wallRects(maskOf(rows), full(13, 7)));
    for (let r = 1; r <= 3; r++) for (let c = 5; c <= 7; c++) expect(t.get(c + ',' + r)).toBe(false);
  });

  it('a spur down from the north wall stands tall; one up from the south wall stays low all along', () => {
    const rows = [
      '......x......',
      '......x......',
      '.............',
      '.............',
      '.............',
      '......x......',
      '......x......',
    ];
    const t = tiles(wallRects(maskOf(rows), full(13, 7)));
    expect([t.get('6,0'), t.get('6,1')]).toEqual([true, true]);
    expect([t.get('6,5'), t.get('6,6')]).toEqual([false, false]);
  });

  it('never wall a tile twice, and wall every tile round every template', () => {
    for (const def of TEMPLATE_DEFS) {
      const tp = parseTemplate(def),
        shape = shapeMask(def.shape);
      const inside = shape.map((row, r) => row.map((s, c) => s && tp.tiles[r][c] !== 'void'));
      const t = tiles(wallRects(inside, shape));
      for (let r = 0; r < tp.h; r++)
        for (let c = 0; c < tp.w; c++) {
          if (!inside[r][c]) continue;
          for (const [dc, dr] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const nc = c + dc,
              nr = r + dr;
            if (!inside[nr]?.[nc]) expect(t.has(nc + ',' + nr), `${def.id}: ${nc},${nr}`).toBe(true);
          }
        }
    }
  });

  it('cut a doorway out of a wall', () => {
    const a = { x0: 0, x1: 10, z0: 0, z1: 1 };
    expect(subtractRect(a, { x0: 4, x1: 5.5, z0: -1, z1: 0 })).toEqual([a]);
    expect(subtractRect(a, { x0: 4, x1: 5.5, z0: 0, z1: 1 })).toEqual([
      { x0: 0, x1: 4, z0: 0, z1: 1 },
      { x0: 5.5, x1: 10, z0: 0, z1: 1 },
    ]);
    expect(subtractRect(a, { x0: -1, x1: 11, z0: 0.5, z1: 2 })).toEqual([{ x0: 0, x1: 10, z0: 0, z1: 0.5 }]);
  });
});
