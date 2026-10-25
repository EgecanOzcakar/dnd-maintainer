import { describe, expect, it } from 'vitest';
import gamedata from '@/locales/en/gamedata.json';
import { MANEUVERS, MANEUVER_OPTIONS, maneuverFeatureId } from '@/lib/sources/maneuvers';
import { resolveCharacter } from '@/lib/resolver';
import { collectBundles } from '@/lib/sources';
import { SUBCLASS_SOURCES } from '@/lib/sources/subclasses';
import { createChoiceKey, type CharacterBuild } from '@/types/choices';

describe('Battle Master maneuvers', () => {
  it('has the 20 maneuvers of the 2024 PHB, each with a name and rules text', () => {
    expect(new Set(MANEUVERS.map((m) => m.id)).size).toBe(20);
    const features = gamedata.features as Record<string, { name?: string; description?: string }>;
    for (const m of MANEUVERS) {
      const f = features[maneuverFeatureId(m.id)];
      expect(f?.name, m.id).toBeTruthy();
      expect(f?.description, m.id).toBeTruthy();
    }
  });

  it('every save maneuver names the save its rules text describes', () => {
    const features = gamedata.features as Record<string, { description: string }>;
    const word = { str: 'Strength saving throw', wis: 'Wisdom saving throw' } as const;
    for (const m of MANEUVERS.filter((x) => x.save)) {
      expect(features[maneuverFeatureId(m.id)].description, m.id).toContain(word[m.save as 'str' | 'wis']);
    }
  });

  it('learns 3 maneuvers at Fighter level 3, then 2 more at 7, 10 and 15 (9 in all), from all 20', () => {
    const picks = SUBCLASS_SOURCES.battlemaster.features.map((f) => ({
      level: f.classLevel,
      keys: f.grants.flatMap((g) => (g.type === 'feature-choice' ? [g.key] : [])),
    }));
    expect(picks.filter((p) => p.keys.length).map((p) => [p.level, p.keys.length])).toEqual([
      [3, 3],
      [7, 2],
      [10, 2],
      [15, 2],
    ]);
    const all = picks.flatMap((p) => p.keys);
    expect(new Set(all).size).toBe(9);
    expect(MANEUVER_OPTIONS).toHaveLength(20);
  });

  it('a Fighter 7 Battle Master resolves its chosen maneuvers, with 5 dice and the rest as pending choices', () => {
    const pick = (n: number, optionId: string) =>
      [
        createChoiceKey('feature-choice', 'subclass', 'battlemaster', n),
        { type: 'feature-choice' as const, optionId },
      ] as const;
    const build: CharacterBuild = {
      speciesId: 'human',
      backgroundId: 'soldier',
      baseAbilities: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
      abilityMethod: 'standard-array',
      levels: Array.from({ length: 7 }, (_, i) => ({
        classId: 'fighter' as const,
        classLevel: i + 1,
        hpRoll: i ? 6 : null,
      })),
      choices: {
        [createChoiceKey('subclass', 'class', 'fighter', 0)]: { type: 'subclass', subclassId: 'battlemaster' },
        ...Object.fromEntries([pick(0, 'parry'), pick(1, 'riposte'), pick(2, 'trip-attack')]),
      } as CharacterBuild['choices'],
      feats: [],
      activeItems: [],
    };
    const { bundles } = collectBundles(build);
    const resolved = resolveCharacter({
      baseAbilities: build.baseAbilities,
      level: 7,
      bundles,
      choices: build.choices,
      hpRolls: [],
    });
    const ids = resolved.features.map((f) => f.feature.id);
    expect(ids).toEqual(expect.arrayContaining(['maneuver-parry', 'maneuver-riposte', 'maneuver-trip-attack']));
    expect(resolved.resourcePools.find((p) => p.poolId === 'superiority-dice')).toMatchObject({ max: 5, dieSize: 8 });
    // Two more maneuvers were unlocked at level 7 and are still waiting to be picked.
    expect(resolved.pendingChoices.filter((c) => c.type === 'feature-choice')).toHaveLength(2);
  });
});
