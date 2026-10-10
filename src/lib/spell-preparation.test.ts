import { describe, expect, it } from 'vitest';
import { canPrepareSpells, getEffectivePrepared, getPreparationPool, togglePrepared } from '@/lib/spell-preparation';
import type { ResolvedSpellcasting } from '@/types/resolved';

const base: ResolvedSpellcasting = {
  ability: 'wis',
  spellSaveDC: 13,
  spellAttackBonus: 5,
  cantrips: ['sacred-flame'],
  cantripsKnown: 1,
  knownSpells: [
    { spellId: 'cure-wounds', spellLevel: 1 },
    { spellId: 'bless', spellLevel: 1 },
  ],
  spellsKnown: [],
  alwaysPreparedSpells: ['command'],
  slots: [2],
  preparedCount: 3,
  pactMagic: null,
  spellAbilityOverrides: {},
};

describe('spell preparation rules', () => {
  it('only characters with a prepared count choose daily', () => {
    expect(canPrepareSpells(base)).toBe(true);
    expect(canPrepareSpells({ ...base, preparedCount: 0 })).toBe(false);
    expect(canPrepareSpells({ ...base, cannotCastSpells: true })).toBe(false);
    expect(canPrepareSpells(null)).toBe(false);
  });

  it('wizard pool is the spellbook only; always-prepared spells are excluded', () => {
    const sc = { ...base, alwaysPreparedSpells: ['bless'] };
    expect(getPreparationPool('wizard', sc)).toEqual(['cure-wounds']);
  });

  it('cleric pool is the whole class list up to the highest slot level, no cantrips', () => {
    const pool = getPreparationPool('cleric', base);
    expect(pool).toEqual(expect.arrayContaining(['cure-wounds', 'bless']));
    expect(pool).not.toContain('sacred-flame');
    expect(pool).not.toContain('command');
    expect(pool.length).toBeGreaterThan(2);
  });

  it('empty stored list defaults to known spells; always-prepared never counts', () => {
    expect(getEffectivePrepared([], base)).toEqual(['cure-wounds', 'bless']);
    expect(getEffectivePrepared(['bless', 'command'], base)).toEqual(['bless']);
  });

  it('toggle respects the cap and the pool, and unpreparing always works', () => {
    const pool = ['a', 'b', 'c'];
    expect(togglePrepared(['a'], 'b', 2, pool)).toEqual(['a', 'b']);
    expect(togglePrepared(['a', 'b'], 'c', 2, pool)).toEqual(['a', 'b']);
    expect(togglePrepared(['a'], 'x', 2, pool)).toEqual(['a']);
    expect(togglePrepared(['a', 'b'], 'a', 2, pool)).toEqual(['b']);
  });
});
