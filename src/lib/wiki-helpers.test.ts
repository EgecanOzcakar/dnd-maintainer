import { describe, expect, it } from 'vitest';
import { CLASS_SOURCES } from '@/lib/sources/classes';
import { SUBCLASS_SOURCES } from '@/lib/sources/subclasses';
import { createChoiceKey } from '@/types/choices';
import {
  getClassProgression,
  getClassWikiSummary,
  getSkillMatrix,
  extractSkillUnlocksFromGrants,
} from '@/lib/wiki-helpers';

describe('wiki-helpers', () => {
  it('extracts class wiki summary for barbarian', () => {
    const barbarianSource = CLASS_SOURCES.find((c) => c.id === 'barbarian')!;
    const summary = getClassWikiSummary(barbarianSource);

    expect(summary.classId).toBe('barbarian');
    expect(summary.hitDie).toBe(12);
    expect(summary.primaryAbility).toBe('str');
    expect(summary.savingThrows).toContain('str');
    expect(summary.savingThrows).toContain('con');
    expect(summary.startingSkills?.count).toBe(2);
    expect(summary.startingSkills?.from).toContain('athletics');
  });

  it('calculates 20 levels of progression for Rogue with Thief subclass', () => {
    const rogueSource = CLASS_SOURCES.find((c) => c.id === 'rogue')!;
    const thiefSource = SUBCLASS_SOURCES['thief'];

    const progression = getClassProgression(rogueSource, thiefSource);

    expect(progression).toHaveLength(20);

    // Level 1: Rogue starting skills and expertise
    const l1 = progression[0];
    expect(l1.level).toBe(1);
    expect(l1.proficiencyBonus).toBe(2);
    expect(l1.skillUnlocks).toBeDefined();
    expect(l1.skillUnlocks.length).toBeGreaterThan(0);

    // Level 3: Thief subclass feature
    const l3 = progression[2];
    expect(l3.unlocksSubclass).toBe(true);
    expect(l3.subclassFeatures.length).toBeGreaterThan(0);

    // Level 4: ASI / Feat
    const l4 = progression[3];
    expect(l4.isAsiLevel).toBe(true);
  });

  it('generates skill matrix covering all 18 D&D skills', () => {
    const matrix = getSkillMatrix(CLASS_SOURCES);
    expect(matrix).toHaveLength(18);

    const athletics = matrix.find((s) => s.skillId === 'athletics')!;
    expect(athletics.ability).toBe('str');
    expect(athletics.startingClasses).toContain('barbarian');
    expect(athletics.startingClasses).toContain('fighter');
  });

  it('extracts skill unlocks correctly from grants', () => {
    const unlocks = extractSkillUnlocksFromGrants(
      [
        {
          type: 'proficiency-choice',
          category: 'skill',
          key: createChoiceKey('skill-choice', 'class', 'barbarian', 0),
          count: 2,
          from: ['athletics', 'acrobatics'],
        },
      ],
      1
    );

    expect(unlocks).toHaveLength(1);
    expect(unlocks[0].type).toBe('starting-choice');
    expect(unlocks[0].count).toBe(2);
  });
});
