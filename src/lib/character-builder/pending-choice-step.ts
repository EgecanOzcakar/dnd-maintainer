import type { TFunction } from 'i18next';
import { getChoiceSourceName } from '@/lib/character-builder/choice-source-name';
import type { PendingChoice } from '@/types/resolved';
import type { StepType } from '@/types/character-builder';

/** The builder step where a pending choice is made, so blockers can link straight to it. */
export function pendingChoiceStep(choice: PendingChoice): StepType {
  switch (choice.type) {
    case 'subclass':
    case 'fighting-style-choice':
    case 'spell-choice':
    case 'damage-choice':
      return 'class';
    case 'feature-choice':
      return choice.source.origin === 'feat' ? 'origin' : 'class';
    case 'lineage-choice':
    case 'feat-choice':
      return 'origin';
    case 'ability-choice':
    case 'asi':
      return 'abilities';
    case 'skill-choice':
    case 'expertise-choice':
    case 'tool-choice':
    case 'language-choice':
    case 'saving-throw-choice':
      return 'details';
    case 'weapon-mastery-choice':
    case 'bundle-choice':
      return 'equipment';
    default: {
      const _exhaustive: never = choice;
      return _exhaustive;
    }
  }
}

/** Human-readable "what is missing" for a pending choice, e.g. "Choose 2 skill(s) (Fighter)". */
export function describePendingChoice(
  choice: PendingChoice,
  tc: TFunction<'common'>,
  tg: TFunction<'gamedata'>
): string {
  const source = getChoiceSourceName(choice.choiceKey, tg);
  const what = ((): string => {
    switch (choice.type) {
      case 'skill-choice':
        return tc('characterBuilder.pendingChoices.skillChoice', { count: choice.count });
      case 'language-choice':
        return tc('characterBuilder.pendingChoices.languageChoice', { count: choice.count });
      case 'saving-throw-choice':
        return tc('characterBuilder.pendingChoices.savingThrowChoice', { count: choice.count });
      case 'ability-choice':
        return tc('characterBuilder.pendingChoices.abilityChoice', { count: choice.count });
      case 'tool-choice':
        return tc('characterBuilder.pendingChoices.toolChoice', { count: choice.count });
      case 'expertise-choice':
        return tc('characterBuilder.pendingChoices.expertiseChoice', { count: choice.count });
      case 'fighting-style-choice':
        return tc('characterBuilder.pendingChoices.fightingStyleChoice', { count: choice.count });
      case 'spell-choice':
        return choice.spellLevel === 0
          ? tc('characterBuilder.pendingChoices.spellChoice', { count: choice.count })
          : tc('characterBuilder.pendingChoices.spellChoiceLeveled', {
              count: choice.count,
              level: choice.spellLevel,
            });
      case 'weapon-mastery-choice':
        return tc('characterBuilder.pendingChoices.weaponMasteryChoice', { count: choice.count });
      case 'damage-choice':
        return tc('characterBuilder.pendingChoices.damageChoice', { count: choice.count });
      case 'lineage-choice':
        return tc('characterBuilder.pendingChoices.lineageChoice');
      case 'feat-choice':
        return tc('characterBuilder.pendingChoices.featChoice');
      case 'feature-choice':
        return tc('characterBuilder.pendingChoices.featureChoice');
      case 'subclass':
        return tc('characterBuilder.pendingChoices.subclassChoice');
      case 'asi':
        return tc('characterBuilder.pendingChoices.asiChoice');
      case 'bundle-choice':
        return tc('characterBuilder.pendingChoices.bundleChoice');
      default: {
        const _exhaustive: never = choice;
        return _exhaustive;
      }
    }
  })();
  return tc('characterBuilder.finalizeBlockers.pendingChoice', { what, source });
}
