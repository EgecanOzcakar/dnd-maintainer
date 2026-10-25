import { describe, it, expect } from 'vitest';
import {
  CONCENTRATION_BREAKERS,
  applyCast,
  castOptions,
  concentrationDC,
  endConcentration,
  getConcentration,
  spendSlot,
} from '@/lib/spell-casting';

describe('concentration', () => {
  it('casting a concentration spell replaces the previous one and switches on its effect', () => {
    const bless = applyCast(['rage'], 'bless', true);
    expect(bless).toEqual(['rage', 'bless', 'concentration:bless']);
    expect(getConcentration(bless)).toBe('bless');
    expect(applyCast(bless, 'haste', true)).toEqual(['rage', 'haste', 'concentration:haste']);
    expect(getConcentration(undefined)).toBeNull();
  });

  it('a non-concentration cast keeps concentration', () => {
    expect(applyCast(['concentration:bless', 'bless'], 'shield', false)).toEqual([
      'concentration:bless',
      'bless',
      'shield',
    ]);
  });

  it("ending concentration removes the marker and that spell's effects only", () => {
    expect(endConcentration(['rage', 'bless', 'shield', 'concentration:bless'])).toEqual(['rage', 'shield']);
    expect(endConcentration(undefined)).toEqual([]);
  });

  it('DC is 10 or half the damage, whichever is higher', () => {
    expect(concentrationDC(7)).toBe(10);
    expect(concentrationDC(21)).toBe(10);
    expect(concentrationDC(30)).toBe(15);
    expect(concentrationDC(100)).toBe(30); // capped at 30
  });
});

describe('castOptions / spendSlot', () => {
  const max = { '1': 4, '2': 3, '3': 2, pact: 2 };
  it('lists slots at or above the spell level that have uses left', () => {
    expect(castOptions(max, { '2': 3 }, 3, 2).map((o) => o.key)).toEqual(['3', 'pact']);
    expect(castOptions(max, {}, 3, 1).map((o) => o.level)).toEqual([1, 2, 3, 3]);
    expect(castOptions(max, { pact: 2 }, 3, 3).map((o) => o.key)).toEqual(['3']);
    expect(castOptions({}, {}, null, 1)).toEqual([]);
  });
  it('spends one use', () => {
    expect(spendSlot({ '1': 1 }, '1')).toEqual({ '1': 2 });
    expect(spendSlot({}, 'pact')).toEqual({ pact: 1 });
  });
});

describe('CONCENTRATION_BREAKERS', () => {
  it('lists the conditions that include Incapacitated', () => {
    expect(['stunned', 'unconscious', 'paralyzed'].every((c) => CONCENTRATION_BREAKERS.has(c))).toBe(true);
    expect(CONCENTRATION_BREAKERS.has('prone')).toBe(false);
  });
});
