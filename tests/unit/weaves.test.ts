import { describe, expect, it } from 'vitest';
import { WEAVES, WEAVE_IDS, validateWeaves, weaveOf, weavesOf } from '../../src/magic/weaves';
import { MAGIC } from '../../src/magic/status';
import { spell } from '../../src/magic/spellData';

describe('weaves and chains', () => {
  it('are ten weaves and seven chains, each a pair of its own, each with its tuning', () => {
    expect(WEAVE_IDS.filter((id) => WEAVES[id].kind === 'weave')).toHaveLength(10);
    expect(WEAVE_IDS.filter((id) => WEAVES[id].kind === 'chain')).toHaveLength(7);
    for (const id of WEAVE_IDS) expect(weaveOf(WEAVES[id].left, WEAVES[id].by)).toBe(id);
    expect(weaveOf('wall', 'grasp')).toBeUndefined();
    expect(validateWeaves(MAGIC.weaves)).toEqual([]);
    const bad = { ...MAGIC.weaves, glimmer: {} } as Record<string, unknown>;
    delete bad.corona;
    expect(validateWeaves(bad)).toEqual(['corona: no tuning', 'tuning for glimmer, no such weave']);
  });

  it('name the weaves each spell takes part in (what it leaves, or what it strikes)', () => {
    const of = (id: string) => weavesOf(spell(id)).sort();
    expect(of('glacial_wall')).toEqual(['conductor', 'refraction', 'steamCurtain']);
    expect(of('cinder_lance')).toEqual(['lanternFan', 'steamCurtain']);
    expect(of('arc')).toEqual(['conductor', 'overloadSeal', 'tollChain']);
    expect(of('pyre_seal')).toEqual(['blackPyre', 'overloadSeal']);
    expect(of('hex_bolt')).toEqual(['blackPyre']);
    expect(of('consecrate')).toEqual(['eclipseGround', 'hallowedHail']);
    expect(of('static_mantle')).toEqual(['liveWade']);
    expect(of('ferrymans_toll')).toEqual(['tollChain']);
    // (Verdant's spells share the zone's, the wall's and the grasp's shapes, but pollen, living wood and thorns weave nothing)
    for (const id of ['pollen_cloud', 'living_wall', 'thorn_snare']) expect(of(id)).toEqual([]);
    // (every weave is somebody's: both its spells name it, except Live Wade, which the water completes)
    for (const id of WEAVE_IDS.filter((i) => WEAVES[i].kind === 'weave'))
      expect(
        [
          'glacial_wall',
          'cinder_lance',
          'arc',
          'pyre_seal',
          'hex_bolt',
          'consecrate',
          'grasp_of_the_grave',
          'rime_shards',
          'wardlight',
          'static_mantle',
          'judgement',
          'ferrymans_toll',
        ].filter((s) => weavesOf(spell(s)).includes(id)).length,
      ).toBeGreaterThanOrEqual(id === 'liveWade' ? 1 : 2);
  });
});
