import { describe, expect, it } from 'vitest';
import { SHAPE_IDS, doorSlots, shapeCells, shapeMask, shapeSize } from '../../src/world/shapes';
import { TEMPLATE_DEFS, validateTemplate, type TemplateDef } from '../../src/world/templates';

const count = (mask: boolean[][]) => mask.flat().filter(Boolean).length;

describe('room shapes', () => {
  it('have the inside sizes from the GDD', () => {
    expect(shapeSize('standard')).toEqual({ w: 13, h: 7 });
    expect(shapeSize('corridor_ew')).toEqual({ w: 13, h: 3 });
    expect(shapeSize('corridor_ns')).toEqual({ w: 5, h: 7 });
    expect(shapeSize('long')).toEqual({ w: 28, h: 7 });
    expect(shapeSize('tall')).toEqual({ w: 13, h: 16 });
    expect(shapeSize('great')).toEqual({ w: 28, h: 16 });
    expect(shapeSize('l_shape')).toEqual({ w: 28, h: 16 });
  });

  it('fill their outline: the gap between cells becomes floor, the L misses one corner', () => {
    expect(count(shapeMask('long'))).toBe(28 * 7);
    expect(count(shapeMask('great'))).toBe(28 * 16);
    const l = shapeMask('l_shape');
    expect(count(l)).toBe(28 * 16 - 15 * 9); // 13 + 2 wide, 7 + 2 tall corner removed
    expect(l[15][27]).toBe(false);
    expect(l[0][27]).toBe(true);
    expect(l[15][0]).toBe(true);
    expect(l[7][13]).toBe(false); // no floor where only three cells meet
    const turned = shapeMask('l_shape', true, true); // mirrored both ways: missing top-left
    expect(turned[0][0]).toBe(false);
    expect(turned[15][27]).toBe(true);
  });

  it('mirror their cells', () => {
    expect(shapeCells('l_shape', true, false)).toEqual([
      [1, 0],
      [0, 0],
      [1, 1],
    ]);
  });

  it('place doors on every outer cell edge, corridors only at their ends', () => {
    const sides = (id: (typeof SHAPE_IDS)[number]) =>
      doorSlots(id)
        .map((s) => s.side)
        .sort()
        .join('');
    expect(sides('standard')).toBe('ensw');
    expect(sides('corridor_ew')).toBe('ew');
    expect(sides('corridor_ns')).toBe('ns');
    expect(doorSlots('long')).toHaveLength(6);
    expect(doorSlots('great')).toHaveLength(8);
    expect(doorSlots('l_shape')).toHaveLength(8); // including the two edges facing the missing corner
    const inner = doorSlots('l_shape').filter(
      (s) => (s.i === 1 && s.side === 's') || (s.i === 0 && s.j === 1 && s.side === 'e'),
    );
    expect(inner.map((s) => s.entry)).toEqual([
      { c: 21, r: 6 },
      { c: 12, r: 12 },
    ]);
  });
});

describe('shaped templates', () => {
  it('exist for every shape, at least two normal ones each', () => {
    for (const id of SHAPE_IDS)
      expect(TEMPLATE_DEFS.filter((t) => t.shape === id && t.types.includes('normal')).length).toBeGreaterThanOrEqual(
        2,
      );
    expect(TEMPLATE_DEFS.length).toBeGreaterThanOrEqual(50);
  });

  it('are checked against their shape', () => {
    const base = TEMPLATE_DEFS.find((t) => t.id === 'crossing')!;
    const edit = (r: number, c: number, ch: string): TemplateDef => ({
      ...base,
      grid: base.grid.map((row, i) => (i === r ? row.slice(0, c) + ch + row.slice(c + 1) : row)),
    });
    expect(validateTemplate(edit(6, 21, '#')).join()).toMatch(/door lane tile \(21,6\)/); // the edge facing the missing corner
    expect(validateTemplate(edit(10, 20, '.')).join()).toMatch(/disagree with the l_shape outline/);
    // x inside the shape carves it: fine in a corner, never across a door's lane
    expect(validateTemplate(edit(0, 0, 'x'))).toEqual([]);
    expect(validateTemplate(edit(0, 6, 'x')).join()).toMatch(/door lane tile \(6,0\) is blocked/);
    const corridor = TEMPLATE_DEFS.find((t) => t.id === 'corridor_rotlings')!;
    expect(validateTemplate({ ...corridor, grid: ['.............', '.R...........', '.............'] }).join()).toMatch(
      /next to a door entry/,
    );
  });
});
