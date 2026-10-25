import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionRolls } from '@/components/character-sheet/ActionRolls';
import { SlotSelect } from '@/components/character-sheet/SlotSelect';
import type { RollPreset } from '@/components/character-sheet/roll-preset';
import type { AdjustedAction } from '@/lib/resolver/effects';
import type { SlotOption } from '@/lib/spell-casting';

/** An action that burns a spell slot when rolled (Divine Smite): pick the slot, dice scale with it. */
export function SlotAction({
  action,
  name,
  options,
  onSpendSlot,
  onSelectRollPreset,
}: {
  readonly action: AdjustedAction;
  readonly name: string;
  readonly options: readonly SlotOption[];
  readonly onSpendSlot: (slotKey: string) => void;
  readonly onSelectRollPreset?: (preset: RollPreset) => void;
}) {
  const { t: tc } = useTranslation('common');
  const [key, setKey] = useState<string>();
  const usable = options.filter((o) => o.level <= (action.spendsSlot?.maxSlotLevel ?? 9));
  const chosen = usable.find((o) => o.key === key) ?? usable[0];

  return (
    <>
      <SlotSelect
        options={usable}
        value={chosen?.key}
        onChange={setKey}
        label={tc('spellCasting.slotLevel', { spell: name })}
      />
      {chosen ? (
        <ActionRolls
          action={action}
          name={name}
          onSelectRollPreset={onSelectRollPreset}
          castLevel={chosen.level}
          onUse={() => onSpendSlot(chosen.key)}
        />
      ) : (
        <span className="text-muted-foreground">{tc('spellCasting.noSlots')}</span>
      )}
    </>
  );
}
