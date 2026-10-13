import { describe, expect, it } from 'vitest';
import {
  DIALOGUE,
  SPEAKERS,
  hasNews,
  holds,
  lineAfter,
  pickLine,
  validateDialogue,
  type Line,
  type TalkContext,
  type When,
} from '../../src/vigil/dialogueData';
import { SHADE_IDS } from '../../src/vigil/shadeData';
import { SPELL_DEFS } from '../../src/magic/spellData';
import { FOE_IDS } from '../../src/actors/foeData';
import { BOSS_TYPES } from '../../src/config';
import { REACTION_IDS } from '../../src/magic/knowledge';
import { POTION_IDS } from '../../src/items/alchemyData';
import { blankSave, migrate } from '../../src/vigil/vigilData';
import { VIGIL, validateVigil } from '../../src/vigil/vigilMap';

const known = {
  speakers: [...SHADE_IDS, 'ferryman'],
  spells: SPELL_DEFS.map((d) => d.id),
  foes: [...FOE_IDS],
  bosses: [...BOSS_TYPES],
  reactions: [...REACTION_IDS],
  recipes: [...POTION_IDS],
};
const ctx = (o: Partial<TalkContext> = {}): TalkContext => ({
  moment: null,
  momentSaid: false,
  struck: null,
  felled: [],
  found: { spells: [], foes: [], weak: [], reactions: [], recipes: [] },
  deepest: 0,
  runs: 0,
  wins: 0,
  freed: [],
  flags: {},
  subjects: {},
  vars: {},
  ...o,
});
const L = (id: string, moment: Line['moment'], o: Partial<Line> = {}): Line => ({
  id,
  who: 'x',
  moment,
  text: id,
  ...o,
});

describe('the townspeople and their talk (M7 step 7)', () => {
  it('passes its checks: every shade and the Ferryman with a first line, every choice leading to a reply of its own', () => {
    expect(validateDialogue(DIALOGUE, known)).toEqual([]);
    expect(SPEAKERS).toEqual(expect.arrayContaining(known.speakers));
    for (const s of SPEAKERS) {
      const mine = DIALOGUE.lines.filter((l) => l.who === s);
      expect(mine.length, s).toBeGreaterThanOrEqual(s === 'ferryman' ? 6 : 9);
      for (const m of ['first', 'death', 'won', 'idle'] as const)
        expect(
          mine.some((l) => l.moment === m),
          s + ' ' + m,
        ).toBe(true);
    }
    expect(DIALOGUE.lines.length).toBeGreaterThan(100);
  });
  it('finds what is wrong: a choice to nowhere, an unknown foe, a word the line has not got, three choices', () => {
    const bad = {
      speakers: ['x'],
      lines: [
        L('a', 'first', { choices: [{ label: 'go', next: 'nowhere' }, { label: 'b' }, { label: 'c' }] }),
        L('b', 'idle', { when: { foe: 'goblin' } }),
        L('c', 'idle', { text: 'The {foe}' }),
        L('d', 'reply'),
      ],
    };
    const errs = validateDialogue(bad, { ...known, speakers: ['x'] }).join('\n');
    expect(errs).toMatch(/leads to no line nowhere/);
    expect(errs).toMatch(/two choices at most/);
    expect(errs).toMatch(/no foe goblin/);
    expect(errs).toMatch(/\{foe\} isn't a word/);
    expect(errs).toMatch(/no choice leads to it/);
  });
  it('each shade stands at its own spot in the Nave', () => {
    expect(validateVigil()).toEqual([]);
    expect(Object.keys(VIGIL.town.spots).sort()).toEqual([...SHADE_IDS].sort());
    const moved = JSON.parse(JSON.stringify(VIGIL));
    moved.town.spots.scribe = [14, 8];
    expect(validateVigil(moved).join()).toMatch(/scribe stands on the Great Circle/);
  });
  it('holds a line only when its conditions hold', () => {
    const c = ctx({
      found: { spells: ['arc'], foes: ['sporeling'], weak: [], reactions: [], recipes: [] },
      deepest: 3,
      runs: 2,
      freed: ['sexton'],
      flags: { asked: true, mood: 'glad' },
      struck: 'tiger',
      felled: ['warden'],
    });
    expect(
      holds(
        {
          spell: 'arc',
          foe: 'sporeling',
          deepest: 3,
          shallower: 4,
          runs: 2,
          freed: 'sexton',
          flag: { asked: true, mood: 'glad' },
          struck: 'tiger',
          boss: 'warden',
        },
        c,
      ),
    ).toBe(true);
    for (const w of <When[]>[
      { spell: 'cinder_lance' },
      { weak: 'sporeling' },
      { deepest: 4 },
      { shallower: 3 },
      { wins: 1 },
      { freed: 'scribe' },
      { flag: { mood: 'sad' } },
      { flag: { other: true } },
      { noFlag: 'asked' },
      { struck: 'warden' },
      { boss: 'tiger' },
    ])
      expect(holds(w, c), JSON.stringify(w)).toBe(false);
  });
  it("picks the first line until heard, then this waking's moment once (the most particular first), then what is unheard, then the oldest", () => {
    const lines = [
      L('f', 'first'),
      L('d', 'death', { text: 'By {struck}' }),
      L('dt', 'death', { when: { struck: 'tiger' } }),
      L('w', 'won'),
      L('i1', 'idle'),
      L('i2', 'idle'),
    ];
    const heard: Record<string, number> = {};
    expect(pickLine('x', ctx({ moment: 'death', struck: 'tiger' }), heard, lines)!.line.id).toBe('f');
    heard.f = 1;
    expect(pickLine('x', ctx({ moment: 'death', struck: 'tiger' }), heard, lines)!.line.id).toBe('dt');
    const d = pickLine(
      'x',
      ctx({ moment: 'death', struck: 'warden', vars: { struck: 'The Hollow Warden' } }),
      heard,
      lines,
    )!;
    expect(d.line.id).toBe('d');
    expect(d.text).toBe('By The Hollow Warden');
    expect(pickLine('x', ctx({ moment: 'death', momentSaid: true }), heard, lines)!.line.id).toBe('i1');
    heard.i1 = 2;
    expect(pickLine('x', ctx(), heard, lines)!.line.id).toBe('i2');
    heard.i2 = 3;
    expect(pickLine('x', ctx(), heard, lines)!.line.id).toBe('i1'); // (both heard: the older)
    expect(hasNews('x', ctx(), heard, lines)).toBe(false);
    expect(hasNews('x', ctx({ moment: 'won' }), heard, lines)).toBe(true);
  });
  it('tells of one subject at a time, each once before any again, its words put in', () => {
    const lines = [L('f', 'first'), L('t', 'idle', { fill: 'weakness', text: 'The {foe} fears {school}' })];
    const subjects = {
      weakness: [
        { key: 'sporeling', vars: { foe: 'Sporeling', school: 'Ember' } },
        { key: 'runeBeetle', vars: { foe: 'Rune Beetle', school: 'Frost' } },
      ],
    };
    const heard: Record<string, number> = { f: 1 };
    const a = pickLine('x', ctx({ subjects }), heard, lines)!;
    expect(a.key).toBe('t@sporeling');
    expect(a.text).toBe('The Sporeling fears Ember');
    heard[a.key] = 2;
    expect(pickLine('x', ctx({ subjects }), heard, lines)!.text).toBe('The Rune Beetle fears Frost');
    expect(pickLine('x', ctx({ subjects: { weakness: [] } }), heard, lines)!.line.id).toBe('f'); // (nothing to tell: its first again)
  });
  it("a choice leads on, its words kept; the scribe's first has two", () => {
    const first = DIALOGUE.lines.find((l) => l.id === 'scribe.first')!;
    expect(first.choices!.length).toBe(2);
    expect(first.choices![0].set).toBeTruthy();
    expect(lineAfter(first.choices![0].next!, {}, {})!.line.who).toBe('scribe');
    expect(lineAfter('nowhere', {}, {})).toBeNull();
  });
  it('the save keeps what was heard and the bosses each run felled, made whole from whatever was stored', () => {
    expect(blankSave().heard).toEqual({});
    expect(migrate({ v: 1, heard: { 'scribe.first': 3, bad: 'x' } }).heard).toEqual({ 'scribe.first': 3 });
    expect(migrate({ v: 1, echoes: [{ seed: 'A', felled: ['warden', 4] }] }).echoes[0].felled).toEqual(['warden']);
  });
});
