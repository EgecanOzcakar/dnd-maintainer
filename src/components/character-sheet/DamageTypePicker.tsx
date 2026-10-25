import { Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PendingChoice } from '@/types/resolved';
import type { ChoiceKey, ChoiceDecision } from '@/types/choices';
import type { DamageTypeId } from '@/types/grants';
import { useTranslation } from 'react-i18next';

interface DamageTypePickerProps {
  readonly choice: Extract<PendingChoice, { type: 'damage-choice' }>;
  readonly currentDecision?: ChoiceDecision | undefined;
  readonly onDecide: (choiceKey: ChoiceKey, decision: ChoiceDecision) => void;
  readonly onClear?: (key: ChoiceKey) => void;
  /** When true, calls onDecide immediately on selection and hides the confirm button. */
  readonly autoCommit?: boolean;
}

export function DamageTypePicker({ choice, currentDecision, onDecide, onClear, autoCommit }: DamageTypePickerProps) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');

  const existingTypeId = currentDecision?.type === 'damage-choice' ? (currentDecision.damageTypes[0] ?? null) : null;
  const [selected, setSelected] = useState<DamageTypeId | null>(existingTypeId);
  const hasExistingDecision = existingTypeId !== null;

  const handleSelect = (id: DamageTypeId) => {
    setSelected(id);
    if (autoCommit) onDecide(choice.choiceKey, { type: 'damage-choice', damageTypes: [id] });
  };

  const handleConfirm = () => {
    if (!selected) return;
    onDecide(choice.choiceKey, { type: 'damage-choice', damageTypes: [selected] });
  };

  const handleClear = () => {
    setSelected(null);
    onClear?.(choice.choiceKey);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tc('characterSheet.damageTypePicker.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{tc('characterSheet.damageTypePicker.description')}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {choice.from.map((damageType) => {
          const isSelected = selected === damageType;
          const featureId = `${choice.featureIdPrefix}-${damageType}`;
          const featureName = t(`features.${featureId}.name`, { defaultValue: '' });
          const featureDescription = t(`features.${featureId}.description`, { defaultValue: '' });
          return (
            <button
              key={damageType}
              type="button"
              onClick={() => handleSelect(damageType)}
              aria-pressed={isSelected}
              className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                isSelected ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
              }`}
            >
              <div
                className={`flex items-center justify-between gap-2 text-sm text-foreground ${isSelected ? 'font-semibold' : ''}`}
              >
                {featureName || t(`damageTypes.${damageType}`)}
                {isSelected && <Check aria-hidden className="size-4 shrink-0 text-primary" />}
              </div>
              {featureDescription && <p className="text-xs text-muted-foreground mt-1">{featureDescription}</p>}
            </button>
          );
        })}

        {!autoCommit && (
          <div className="flex gap-2 mt-4">
            {hasExistingDecision && (
              <Button variant="ghost" size="sm" onClick={handleClear} className="flex-1">
                {tc('buttons.clearSelection')}
              </Button>
            )}
            <Button className="flex-1" disabled={!selected} onClick={handleConfirm}>
              {tc('buttons.confirm')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
