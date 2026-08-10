import { Badge } from '@/components/ui/badge';
import { CONDITION_IDS, type ConditionId } from '@/lib/sources/conditions';
import type { Character } from '@/types/database';
import { useTranslation } from 'react-i18next';

interface ConditionsPanelProps {
  readonly character: Character;
  readonly onUpdate: (updates: Partial<Character>) => void;
}

// Exhaustion is modeled separately as a graded `exhaustion_level` (0-6) with its own control,
// so it is excluded here to avoid a second, boolean source of truth for the same condition.
const PANEL_CONDITION_IDS = CONDITION_IDS.filter((id) => id !== 'exhaustion');

export function ConditionsPanel({ character, onUpdate }: ConditionsPanelProps) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');

  const activeConditions = character.conditions ?? [];

  function handleToggle(id: ConditionId): void {
    const isActive = activeConditions.includes(id);
    const next: ConditionId[] = isActive ? activeConditions.filter((c) => c !== id) : [...activeConditions, id];
    onUpdate({ conditions: next });
  }

  return (
    <div className="bg-card border rounded-lg p-6">
      <h2 className="text-lg font-bold text-foreground mb-4">{tc('characterSheet.sections.conditions')}</h2>
      <div className="flex flex-wrap gap-1">
        {PANEL_CONDITION_IDS.map((id) => {
          const isActive = activeConditions.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isActive}
              onClick={() => handleToggle(id)}
              className="cursor-pointer"
            >
              <Badge
                variant={isActive ? 'default' : 'outline'}
                title={t(`conditions.${id}.description`)}
                className="pointer-events-none"
              >
                {t(`conditions.${id}.name`)}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Active condition effects — shown inline so the player can see at a glance */}
      {activeConditions.length > 0 && (
        <ul className="mt-4 space-y-2">
          {activeConditions.map((id) => (
            <li key={id} className="flex gap-2 text-sm">
              <span className="font-semibold text-foreground shrink-0">
                {t(`conditions.${id}.name`)}:
              </span>
              <span className="text-muted-foreground">
                {t(`conditions.${id}.description`)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
