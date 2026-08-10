import type { ResolvedCharacter } from '@/types/resolved';
import type { RollPreset } from '@/components/character-sheet/AttacksPanel';
import { formatSigned } from '@/lib/format';
import { useTranslation } from 'react-i18next';

export function AbilityScoresPanel({
  abilities,
  buildError,
  onSelectRollPreset,
}: {
  abilities: ResolvedCharacter['abilities'] | undefined;
  buildError: string | null;
  onSelectRollPreset?: (preset: RollPreset) => void;
}) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');

  if (!abilities) {
    return (
      <div className="sheet-panel text-center text-muted-foreground">
        <h2 className="text-lg font-bold text-foreground mb-4">{tc('characterSheet.sections.abilities')}</h2>
        <p>
          {buildError
            ? tc('characterSheet.buildError.abilities', { message: buildError })
            : tc('characterSheet.emptyState.abilities')}
        </p>
      </div>
    );
  }

  const handleSelectAbilityCheck = (ability: keyof typeof abilities, modifier: number) => {
    if (!onSelectRollPreset) return;
    const abilityName = t(`abilities.${ability}`);
    onSelectRollPreset({
      die: 20,
      count: 1,
      modifier,
      contextLabel: `Ability Check: ${abilityName} (${formatSigned(modifier)})`,
    });
  };

  return (
    <div className="sheet-panel">
      <h2 className="text-lg font-bold text-foreground mb-4">{tc('characterSheet.sections.abilities')}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
        {(Object.keys(abilities) as Array<keyof typeof abilities>).map((ability) => {
          const resolvedAbility = abilities[ability];
          const modifier = resolvedAbility.modifier;
          const abilityName = t(`abilities.${ability}`);

          return (
            <button
              key={ability}
              type="button"
              onClick={() => handleSelectAbilityCheck(ability, modifier)}
              className="ability-shield hover:border-primary hover:bg-primary/5 transition-all cursor-pointer text-left"
              title={`Click to set ${abilityName} Check Roll (${formatSigned(modifier)})`}
            >
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{abilityName}</div>
              <div className={`text-3xl font-bold leading-tight ${modifier >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatSigned(modifier)}
              </div>
              <div className="mt-1 rounded-full border bg-card px-2 text-sm font-bold text-foreground">
                {resolvedAbility.total}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
