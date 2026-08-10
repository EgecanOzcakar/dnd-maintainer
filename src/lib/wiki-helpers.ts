import {
  DND_SKILLS,
  getProficiencyBonus,
  getSpellSlots,
  getPactMagicSlots,
  getPreparedSpellCount,
  type AbilityKey,
  type ClassId,
  type SkillId,
} from '@/lib/dnd-helpers';
import type { ClassSource, SubclassSource } from '@/types/sources';
import type { Grant, FeatureDef } from '@/types/grants';

export interface SkillUnlockInfo {
  readonly level: number;
  readonly type: 'starting-choice' | 'level-choice' | 'direct' | 'expertise';
  readonly count?: number;
  readonly from?: readonly SkillId[] | null;
  readonly skill?: SkillId;
  readonly descriptionKey?: string;
  readonly isSubclass?: boolean;
}

export interface ResourcePoolLimit {
  readonly poolId: string;
  readonly max: number;
  readonly regen: string;
}

export interface SpellcastingLevelInfo {
  readonly cantripsKnown?: number;
  readonly preparedCount?: number;
  readonly slots?: readonly number[];
  readonly pactMagic?: { readonly slotLevel: number; readonly count: number } | null;
}

export interface LevelProgression {
  readonly level: number;
  readonly proficiencyBonus: number;
  readonly classFeatures: readonly FeatureDef[];
  readonly subclassFeatures: readonly FeatureDef[];
  readonly skillUnlocks: readonly SkillUnlockInfo[];
  readonly savingThrows: readonly AbilityKey[];
  readonly armorProficiencies: readonly string[];
  readonly weaponProficiencies: readonly string[];
  readonly isAsiLevel: boolean;
  readonly unlocksSubclass: boolean;
  readonly resourcePools: readonly ResourcePoolLimit[];
  readonly spellcasting: SpellcastingLevelInfo | null;
}

export interface ClassWikiSummary {
  readonly classId: ClassId;
  readonly primaryAbility: AbilityKey;
  readonly hitDie: number;
  readonly savingThrows: readonly AbilityKey[];
  readonly armorProficiencies: readonly string[];
  readonly weaponProficiencies: readonly string[];
  readonly startingSkills: {
    readonly count: number;
    readonly from: readonly SkillId[] | null;
  } | null;
  readonly skillUnlockLevels: readonly number[];
}

export interface SkillMatrixEntry {
  readonly skillId: SkillId;
  readonly ability: AbilityKey;
  readonly startingClasses: readonly ClassId[];
  readonly levelUpUnlocks: readonly {
    readonly classId: ClassId;
    readonly level: number;
    readonly type: 'choice' | 'expertise' | 'grant';
  }[];
}

export function evaluateResourcePoolMax(grant: Extract<Grant, { type: 'resource-pool' }>, level: number): number {
  const maxSpec = grant.max;
  switch (maxSpec.mode) {
    case 'fixed':
      return maxSpec.value;
    case 'class-level':
      return level;
    case 'class-level-plus':
      return Math.max(0, level + maxSpec.offset);
    case 'proficiency-bonus':
      return getProficiencyBonus(level);
    case 'level-steps': {
      let activeVal = 0;
      for (const step of maxSpec.steps) {
        if (level >= step.minLevel) {
          activeVal = step.value;
        }
      }
      return activeVal;
    }
  }
}

export function extractSkillUnlocksFromGrants(
  grants: readonly Grant[],
  level: number,
  isSubclass = false
): SkillUnlockInfo[] {
  const unlocks: SkillUnlockInfo[] = [];

  for (const grant of grants) {
    if (grant.type === 'proficiency-choice' && grant.category === 'skill') {
      unlocks.push({
        level,
        type: level === 1 ? 'starting-choice' : 'level-choice',
        count: grant.count,
        from: grant.from,
        isSubclass,
      });
    } else if (grant.type === 'proficiency' && grant.category === 'skill') {
      unlocks.push({
        level,
        type: 'direct',
        skill: grant.id,
        isSubclass,
      });
    } else if (grant.type === 'skill-expertise') {
      unlocks.push({
        level,
        type: 'expertise',
        skill: grant.skill,
        isSubclass,
      });
    } else if (grant.type === 'expertise-choice') {
      unlocks.push({
        level,
        type: 'expertise',
        count: grant.count,
        from: grant.from,
        isSubclass,
      });
    }
  }

  return unlocks;
}

export function getClassProgression(
  classSource: ClassSource,
  subclassSource?: SubclassSource
): LevelProgression[] {
  const progression: LevelProgression[] = [];

  // Check if class has spellcasting grant
  const l1Grants = classSource.levels[0]?.grants ?? [];
  const hasClassSpellcasting = l1Grants.some((g) => g.type === 'spellcasting');

  for (let level = 1; level <= 20; level++) {
    const levelIndex = level - 1;
    const levelUp = classSource.levels[levelIndex];
    const cGrants = levelUp?.grants ?? [];

    const proficiencyBonus = getProficiencyBonus(level);

    // Class features
    const classFeatures: FeatureDef[] = [];
    for (const grant of cGrants) {
      if (grant.type === 'feature') {
        classFeatures.push(grant.feature);
      }
    }

    // Subclass features
    const subclassFeatures: FeatureDef[] = [];
    const subGrants: Grant[] = [];
    if (subclassSource) {
      for (const feat of subclassSource.features) {
        if (feat.classLevel === level) {
          for (const grant of feat.grants) {
            subGrants.push(grant);
            if (grant.type === 'feature') {
              subclassFeatures.push(grant.feature);
            }
          }
        }
      }
    }

    // Skill unlocks
    const skillUnlocks = [
      ...extractSkillUnlocksFromGrants(cGrants, level, false),
      ...extractSkillUnlocksFromGrants(subGrants, level, true),
    ];

    // Proficiencies
    const savingThrows: AbilityKey[] = [];
    const armorProficiencies: string[] = [];
    const weaponProficiencies: string[] = [];

    for (const grant of cGrants) {
      if (grant.type === 'proficiency') {
        if (grant.category === 'saving-throw') savingThrows.push(grant.id);
        else if (grant.category === 'armor') armorProficiencies.push(grant.id);
        else if (grant.category === 'weapon') weaponProficiencies.push(grant.id);
      }
    }

    // ASI / Feat
    const isAsiLevel = cGrants.some((g) => g.type === 'asi' || g.type === 'feat-choice');

    // Subclass unlock
    const unlocksSubclass = cGrants.some((g) => g.type === 'subclass');

    // Resource pools
    const resourcePools: ResourcePoolLimit[] = [];
    for (const grant of cGrants) {
      if (grant.type === 'resource-pool') {
        const max = evaluateResourcePoolMax(grant, level);
        const regenStr = typeof grant.regen === 'string' ? grant.regen : 'compound';
        resourcePools.push({
          poolId: grant.poolId,
          max,
          regen: regenStr,
        });
      }
    }

    // Spellcasting
    let spellcasting: SpellcastingLevelInfo | null = null;
    if (hasClassSpellcasting) {
      const isWarlock = classSource.id === 'warlock';
      const pactMagic = isWarlock ? getPactMagicSlots(level) : null;
      const slots = isWarlock ? [] : getSpellSlots(classSource.id, level);

      // Collect cantrip counts from spell choices up to this level
      let cantripsKnown = 0;
      for (let lvlIdx = 0; lvlIdx <= levelIndex; lvlIdx++) {
        const lvlGrants = classSource.levels[lvlIdx]?.grants ?? [];
        for (const g of lvlGrants) {
          if (g.type === 'spell-choice' && g.spellLevel === 0) {
            cantripsKnown += g.count;
          }
        }
      }

      // Prepared count calculation (assuming standard ability mod ~ +3 for summary)
      const preparedCount = getPreparedSpellCount(classSource.id, level, 3);

      spellcasting = {
        cantripsKnown,
        preparedCount,
        slots,
        pactMagic,
      };
    }

    progression.push({
      level,
      proficiencyBonus,
      classFeatures,
      subclassFeatures,
      skillUnlocks,
      savingThrows,
      armorProficiencies,
      weaponProficiencies,
      isAsiLevel,
      unlocksSubclass,
      resourcePools,
      spellcasting,
    });
  }

  return progression;
}

export function getClassWikiSummary(classSource: ClassSource): ClassWikiSummary {
  const l1Grants = classSource.levels[0]?.grants ?? [];

  let hitDie = 8;
  const savingThrows: AbilityKey[] = [];
  const armorProficiencies: string[] = [];
  const weaponProficiencies: string[] = [];
  let startingSkills: ClassWikiSummary['startingSkills'] = null;

  for (const grant of l1Grants) {
    if (grant.type === 'hit-die') {
      hitDie = grant.die;
    } else if (grant.type === 'proficiency') {
      if (grant.category === 'saving-throw') savingThrows.push(grant.id);
      else if (grant.category === 'armor') armorProficiencies.push(grant.id);
      else if (grant.category === 'weapon') weaponProficiencies.push(grant.id);
    } else if (grant.type === 'proficiency-choice' && grant.category === 'skill') {
      startingSkills = {
        count: grant.count,
        from: grant.from,
      };
    }
  }

  const skillUnlockLevels: number[] = [];
  for (let level = 1; level <= 20; level++) {
    const levelGrants = classSource.levels[level - 1]?.grants ?? [];
    const hasSkillUnlock = levelGrants.some(
      (g) =>
        (g.type === 'proficiency-choice' && g.category === 'skill') ||
        (g.type === 'proficiency' && g.category === 'skill') ||
        g.type === 'skill-expertise' ||
        g.type === 'expertise-choice'
    );
    if (hasSkillUnlock) {
      skillUnlockLevels.push(level);
    }
  }

  return {
    classId: classSource.id,
    primaryAbility: classSource.primaryAbility,
    hitDie,
    savingThrows,
    armorProficiencies,
    weaponProficiencies,
    startingSkills,
    skillUnlockLevels,
  };
}

export function getSkillMatrix(classes: readonly ClassSource[]): SkillMatrixEntry[] {
  return DND_SKILLS.map((skill) => {
    const startingClasses: ClassId[] = [];
    const levelUpUnlocks: SkillMatrixEntry['levelUpUnlocks'][number][] = [];

    for (const cls of classes) {
      for (let level = 1; level <= 20; level++) {
        const grants = cls.levels[level - 1]?.grants ?? [];
        for (const grant of grants) {
          if (grant.type === 'proficiency-choice' && grant.category === 'skill') {
            if (!grant.from || (grant.from as readonly SkillId[]).includes(skill.id)) {
              if (level === 1) {
                if (!startingClasses.includes(cls.id)) {
                  startingClasses.push(cls.id);
                }
              } else {
                levelUpUnlocks.push({ classId: cls.id, level, type: 'choice' });
              }
            }
          } else if (grant.type === 'proficiency' && grant.category === 'skill' && grant.id === skill.id) {
            levelUpUnlocks.push({ classId: cls.id, level, type: 'grant' });
          } else if (
            (grant.type === 'skill-expertise' && grant.skill === skill.id) ||
            (grant.type === 'expertise-choice' && (!grant.from || (grant.from as readonly SkillId[]).includes(skill.id)))
          ) {
            levelUpUnlocks.push({ classId: cls.id, level, type: 'expertise' });
          }
        }
      }
    }

    return {
      skillId: skill.id,
      ability: skill.ability as AbilityKey,
      startingClasses,
      levelUpUnlocks,
    };
  });
}
