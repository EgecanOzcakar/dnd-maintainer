import { useTranslation } from 'react-i18next';
import type { RollPart } from '@/components/character-sheet/roll-preset';
import { formatSigned } from '@/lib/format';

interface Component {
  readonly type: string;
  readonly label: string;
  readonly value: number;
}

/** `Strength +3, Proficiency +2` — the tooltip text shown before rolling. */
export const partsText = (parts: readonly RollPart[], extraDice: readonly string[] = []) =>
  [...parts.map((p) => `${p.label} ${p.value}`), ...extraDice].join(', ');

/** Turns resolver bonus components (and effect dice) into translated, displayable roll parts. */
export function useRollParts() {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');

  const labelOf = ({ type, label }: Component): string => {
    switch (type) {
      case 'ability':
        return t(`abilities.${label as 'str'}`);
      case 'proficiency':
        return tc('characterSheet.breakdown.proficiency');
      case 'expertise':
        return tc('characterSheet.skillBreakdown.expertise');
      case 'fighting-style':
        return tc('characterSheet.breakdown.fightingStyle');
      case 'ability-check-bonus':
        return t(`features.${label}.name` as 'features.x.name', { defaultValue: label });
      case 'effect':
        return tc(`activeEffects.names.${label}` as 'activeEffects.names.rage');
      default:
        return tc(`rollBreakdown.${type}` as 'rollBreakdown.flat', { defaultValue: label });
    }
  };

  return (components: readonly Component[]): RollPart[] =>
    components
      .filter((c) => c.value !== 0 || c.type === 'ability')
      .map((c) => ({ label: labelOf(c), value: formatSigned(c.value) }));
}
