import { BonusBreakdown } from '@/components/character-sheet/BonusBreakdown';
import type { ResolvedCharacter } from '@/types/resolved';
import type { RollPreset } from '@/components/character-sheet/AttacksPanel';
import { formatSigned } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Dices } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SavingThrowsPanel({
  savingThrows,
  buildError,
  onSelectRollPreset,
}: {
  savingThrows: ResolvedCharacter['savingThrows'] | undefined;
  buildError: string | null;
  onSelectRollPreset?: (preset: RollPreset) => void;
}) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');

  if (!savingThrows) {
    return (
      <div className="sheet-panel text-center text-muted-foreground">
        <h2 className="text-lg font-bold text-foreground mb-4">{tc('characterSheet.sections.savingThrows')}</h2>
        <p>
          {buildError
            ? tc('characterSheet.buildError.savingThrows', { message: buildError })
            : tc('characterSheet.emptyState.savingThrows')}
        </p>
      </div>
    );
  }

  const handleSelectSave = (ability: keyof typeof savingThrows, bonus: number) => {
    if (!onSelectRollPreset) return;
    const abilityLabel = t(`abilities.${ability}`);
    onSelectRollPreset({
      die: 20,
      count: 1,
      modifier: bonus,
      contextLabel: `Save: ${abilityLabel} (${formatSigned(bonus)})`,
    });
  };

  return (
    <div className="sheet-panel">
      <h2 className="text-lg font-bold text-foreground mb-4">{tc('characterSheet.sections.savingThrows')}</h2>
      <div className="space-y-2 text-xs">
        {(Object.keys(savingThrows) as Array<keyof typeof savingThrows>).map((ability) => {
          const save = savingThrows[ability];
          const abilityName = t(`abilities.${ability}`);

          return (
            <div key={ability} className="flex justify-between items-center text-foreground hover:bg-muted/40 p-1 rounded transition-colors group">
              <button
                type="button"
                onClick={() => handleSelectSave(ability, save.bonus)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <span
                  aria-hidden
                  className={`inline-block size-2.5 rounded-full border ${save.proficient ? 'bg-foreground border-foreground' : 'border-muted-foreground/50'}`}
                />
                <span className={save.proficient ? 'font-bold' : ''}>{abilityName}</span>
              </button>

              <div className="flex items-center gap-2">
                <BonusBreakdown components={save.breakdown} total={save.bonus} />
                {onSelectRollPreset && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSelectSave(ability, save.bonus)}
                    className="h-6 px-1.5 text-[10px] gap-0.5 text-primary hover:bg-primary/10"
                    title={`Roll ${abilityName} Saving Throw`}
                  >
                    <Dices className="size-3" /> Roll
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
