import { describe, expect, it } from 'vitest';
import { TEMPLATE_DEFS, fallRuns, parseTemplate, validateTemplate, type TemplateDef } from '../../src/world/templates';
import { ARTIFACT_DEFS, pickFocus } from '../../src/items/artifactData';
import { Rng } from '../../src/rng';
import { LOOT } from '../../src/items/loot';

const room = (grid: string[], current?: TemplateDef['current']): TemplateDef => ({ id: 't', shape: 'standard', types: ['normal'], difficulty: 1, grid, current });
const RIVER = [
  '....~~~......',
  '..R.~~~......',
  '....~~~...R..',
  '....~~L......',
  '....~~~......',
  '..W.~~~......',
  '....~~~......',
];

describe('M4.2 currents and waterfalls', () => {
  it('a current turns with the grid when a template is mirrored', () => {
    const across = room(RIVER.map(r => r.replace(/~/g, '.')), 'e');
    expect(parseTemplate(across).current).toBe('e');
    expect(parseTemplate(across, true).current).toBe('w');
    expect(parseTemplate(across, false, true).current).toBe('e'); // (top to bottom leaves an east-west current alone)
    const down = room(RIVER, 's');
    expect(parseTemplate(down).current).toBe('s');
    expect(parseTemplate(down, false, true).current).toBe('n');
    expect(parseTemplate(down, true, false).current).toBe('s');
    expect(parseTemplate(room(RIVER)).current).toBeUndefined();
  });

  it('its waterfall pours from the wall upstream, one span for each run of water along it', () => {
    expect(fallRuns(parseTemplate(room(RIVER)))).toEqual([]); // (still water: no fall)
    expect(fallRuns(parseTemplate(room(RIVER, 's')))).toEqual([{ side: 'n', i0: 4, i1: 7 }]);
    expect(fallRuns(parseTemplate(room(RIVER, 'n')))).toEqual([{ side: 's', i0: 4, i1: 7 }]);
    expect(fallRuns(parseTemplate(room(RIVER, 's'), true))).toEqual([{ side: 'n', i0: 6, i1: 9 }]); // (mirrored, it moves with the river)
    const two = room(['~~...~~......', ...RIVER.slice(1)], 's');
    expect(fallRuns(parseTemplate(two))).toEqual([{ side: 'n', i0: 0, i1: 2 }, { side: 'n', i0: 5, i1: 7 }]);
    const east = room(['.............', '.............', '~~~~~~~~~~~~~', '~~~~~~~~~~~~~', '..R.......W..', '.............', '.............'], 'e');
    expect(fallRuns(parseTemplate(east))).toEqual([{ side: 'w', i0: 2, i1: 4 }]);
    // a candle stand standing in the water counts as the water round it
    const stand = room(['....~L~......', ...RIVER.slice(1)], 's');
    expect(fallRuns(parseTemplate(stand))).toEqual([{ side: 'n', i0: 4, i1: 7 }]);
  });

  it('every template with a current names a way it can flow, and has water to flow', () => {
    const flowing = TEMPLATE_DEFS.filter(d => d.current);
    expect(flowing.length).toBeGreaterThanOrEqual(3);
    for (const d of flowing) expect(fallRuns(parseTemplate(d)).length, d.id).toBeGreaterThan(0);
    expect(validateTemplate({ ...room(RIVER), current: 'up' as never })).toContain('unknown current "up"');
    expect(validateTemplate(room(RIVER, 's'))).toEqual([]);
  });
});

describe("M4.2 the Wandering Merchant's focus", () => {
  it('is a focus the run has not met, from any pool, never the one held nor the starting wand', () => {
    const foci = ARTIFACT_DEFS.filter(a => a.kind === 'focus' && !a.start);
    const rng = new Rng(7), seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const f = pickFocus(rng, seen, foci[0].id);
      expect(f).not.toBeNull(); expect(f!.kind).toBe('focus'); expect(f!.start).toBeFalsy(); expect(f!.id).not.toBe(foci[0].id); expect(seen.has(f!.id)).toBe(false);
    }
    const all = new Set(foci.map(a => a.id));
    expect(pickFocus(new Rng(1), all)).toBeNull(); // (every focus met: nothing to sell)
    const one = new Set([...all].slice(1));
    expect(pickFocus(new Rng(1), one)?.id).toBe(foci[0].id);
    expect(pickFocus(new Rng(1), one, foci[0].id)).toBeNull();
  });
});

describe("M4.2 the Wandering Merchant's prices", () => {
  it('every ware the merchant can lay out has its price', () => {
    for (const w of ['artifact', 'map', 'secret', ...Object.keys(LOOT.wanderer.souls)] as const) expect(LOOT.wanderer.prices[w as keyof typeof LOOT.wanderer.prices], w).toBeGreaterThan(0);
  });
});
