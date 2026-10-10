import { describe, it, expect } from 'vitest';
import {
  buildRuleEntries,
  groupByCategory,
  matchesQuery,
  NO_SPELL_FILTERS,
  searchRules,
  type RuleEntry,
} from '@/lib/rules-search';
import gamedata from '@/locales/en/gamedata.json';
import common from '@/locales/en/common.json';

const dig = (root: unknown, key: string): string =>
  String(key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], root) ?? key);

const entries = buildRuleEntries(
  (k) => dig(gamedata, k),
  (k) => dig(common, k)
);

describe('rules-search', () => {
  it('builds entries for every category', () => {
    const cats = new Set(entries.map((e) => e.category));
    expect([...cats].sort()).toEqual(['action', 'condition', 'feat', 'mastery', 'property', 'spell']);
    expect(entries.filter((e) => e.category === 'action')).toHaveLength(13);
  });

  it('matches name or description, all terms required', () => {
    const e: RuleEntry = { id: 'x', category: 'feat', name: 'Alert', description: 'Bonus to Initiative' };
    expect(matchesQuery(e, 'alert')).toBe(true);
    expect(matchesQuery(e, 'BONUS initiative')).toBe(true);
    expect(matchesQuery(e, 'alert dragon')).toBe(false);
    expect(matchesQuery(e, '  ')).toBe(true);
  });

  it('finds a spell by name and attaches mechanics', () => {
    const [fireball] = searchRules(entries, 'fireball', NO_SPELL_FILTERS);
    expect(fireball.spell?.level).toBe(3);
    expect(fireball.mechanics?.save).toBe('dex');
  });

  it('applies spell filters and hides non-spells', () => {
    const res = searchRules(entries, '', { ...NO_SPELL_FILTERS, level: '0', classId: 'wizard' });
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((e) => e.spell?.level === 0 && e.spell.nativeClasses.includes('wizard'))).toBe(true);
    const conc = searchRules(entries, '', { ...NO_SPELL_FILTERS, concentration: true });
    expect(conc.length).toBeGreaterThan(0);
    expect(conc.every((e) => e.spell?.concentration)).toBe(true);
    const rit = searchRules(entries, '', { ...NO_SPELL_FILTERS, ritual: true });
    expect(rit.length).toBeGreaterThan(0);
    expect(rit.every((e) => e.spell?.ritual)).toBe(true);
  });

  it('groups by category in display order and drops empty groups', () => {
    const groups = groupByCategory(searchRules(entries, '', NO_SPELL_FILTERS));
    expect(groups.map((g) => g.category)).toEqual(['spell', 'condition', 'action', 'feat', 'mastery', 'property']);
    expect(groupByCategory(searchRules(entries, 'zzzzqqq', NO_SPELL_FILTERS))).toEqual([]);
  });
});
