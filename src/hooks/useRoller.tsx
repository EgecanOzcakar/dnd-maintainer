import { useCallback } from 'react';
import { toast } from 'sonner';
import { RollResultCard } from '@/components/character-sheet/RollResultCard';
import type { RollPreset } from '@/components/character-sheet/roll-preset';
import { useRecordCharacterRoll } from '@/hooks/usePartyState';
import { useAddRoll } from '@/hooks/useRollLog';
import { rollPreset, type RollKeys } from '@/lib/dice-roll';

/** One-click roller for the character sheet: rolls, pops the result up, and logs it to the campaign. */
export function useRoller(characterId: string, campaignId: string) {
  const { mutate: logRoll } = useAddRoll();
  const { mutate: recordRoll } = useRecordCharacterRoll();

  return useCallback(
    (preset: RollPreset, keys?: RollKeys) => {
      const out = rollPreset(preset, keys);
      toast.custom(() => <RollResultCard preset={preset} out={out} />, {
        duration: 8000,
        position: 'top-center',
      });
      logRoll({
        campaign_id: campaignId,
        character_id: characterId,
        label: preset.contextLabel,
        formula: out.formula,
        result: out.total,
        detail: { rolls: out.rolls, kept: out.kept, natural: out.natural },
      });
      recordRoll({
        campaignId,
        characterId,
        roll: {
          formula: out.formula,
          total: out.total,
          rolls: out.rolls,
          modifier: preset.modifier,
          label: preset.contextLabel,
        },
      });
      return out;
    },
    [logRoll, recordRoll, characterId, campaignId]
  );
}
