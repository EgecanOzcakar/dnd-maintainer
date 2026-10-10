import { describe, expect, it } from 'vitest';
import gamedata from '@/locales/en/gamedata.json';
import { FEATURE_ACTION_GROUPS } from '@/lib/sources/feature-actions';
import { SPELL_MECHANICS_GROUPS } from '@/lib/sources/spell-mechanics';
import { getSpellDef } from '@/lib/sources/spells';
import type { ScaledDice } from '@/types/actions';

const DICE = /^\d+d(4|6|8|10|12|20)$/;
const featureNames = gamedata.features as Record<string, unknown>;
const featNames = gamedata.feats as Record<string, unknown>;

function diceOf(d: ScaledDice | undefined): string[] {
  if (d === undefined) return [];
  return typeof d === 'string' ? [d] : d.map(([, dice]) => dice);
}

describe('feature action catalog', () => {
  it('no feature id appears in two groups', () => {
    const ids = FEATURE_ACTION_GROUPS.flatMap((g) => Object.keys(g));
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('every key is a feature with a gamedata entry (feat-<id> features are named under feats)', () => {
    const ids = FEATURE_ACTION_GROUPS.flatMap((g) => Object.keys(g));
    const named = (id: string) => id in featureNames || (id.startsWith('feat-') && id.slice(5) in featNames);
    expect(ids.filter((id) => !named(id))).toEqual([]);
  });

  it('dice are well-formed and level tables ascend', () => {
    for (const group of FEATURE_ACTION_GROUPS) {
      for (const [id, meta] of Object.entries(group)) {
        for (const roll of [meta.damage, meta.heal]) {
          if (!roll) continue;
          for (const d of diceOf(roll.dice)) expect(d, id).toMatch(DICE);
          if (roll.dice !== undefined && typeof roll.dice !== 'string') {
            const levels = roll.dice.map(([lvl]) => lvl);
            expect(levels, id).toEqual([...levels].sort((a, b) => a - b));
          }
        }
      }
    }
  });
});

describe('spell mechanics catalog', () => {
  it('every key is a catalog spell in its group’s level range', () => {
    const bad = SPELL_MECHANICS_GROUPS.flatMap((g) =>
      Object.keys(g.mechanics).filter((id) => {
        const def = getSpellDef(id);
        return !def || def.level < g.minLevel || def.level > g.maxLevel;
      })
    );
    expect(bad).toEqual([]);
  });

  it('cantripScaling only on cantrips, perSlot only on leveled spells, dice well-formed', () => {
    for (const g of SPELL_MECHANICS_GROUPS) {
      for (const [id, m] of Object.entries(g.mechanics)) {
        const level = getSpellDef(id)?.level ?? 0;
        if (m.damage?.cantripScaling) expect(level, id).toBe(0);
        if (m.damage?.perSlot || m.heal?.perSlot) expect(level, id).toBeGreaterThan(0);
        for (const d of [m.damage?.dice, m.damage?.perSlot, m.heal?.dice, m.heal?.perSlot]) {
          if (d) expect(d, id).toMatch(DICE);
        }
        expect(m.attack && m.save, `${id}: attack and save are exclusive`).toBeFalsy();
      }
    }
  });
});
