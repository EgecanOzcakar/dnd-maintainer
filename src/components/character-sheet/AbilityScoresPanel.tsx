import type { ResolvedCharacter } from '@/types/resolved';
import type { RollPreset } from '@/components/character-sheet/roll-preset';
import { formatSigned } from '@/lib/format';
import type { CheckRollMods } from '@/lib/roll-mods';
import { useTranslation } from 'react-i18next';
import { RollModeBadge } from '@/components/character-sheet/ActiveEffectsPanel';
import { partsText, useRollParts } from '@/hooks/useRollParts';

export function AbilityScoresPanel({
  abilities,
  buildError,
  onSelectRollPreset,
  checkMods,
}: {
  abilities: ResolvedCharacter['abilities'] | undefined;
  buildError: string | null;
  onSelectRollPreset?: (preset: RollPreset) => void;
  checkMods?: (target: { ability: keyof ResolvedCharacter['abilities'] }) => CheckRollMods | undefined;
}) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');
  const rollParts = useRollParts();

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

  const presetFor = (ability: keyof typeof abilities): RollPreset => {
    const modifier = abilities[ability].modifier;
    const mods = checkMods?.({ ability });
    const total = modifier + (mods?.bonus ?? 0);
    return {
      die: 20,
      count: 1,
      modifier: total,
      contextLabel: `Ability Check: ${t(`abilities.${ability}`)} (${formatSigned(total)})`,
      mode: mods?.mode,
      breakdown: rollParts([{ type: 'ability', label: ability, value: modifier }, ...(mods?.parts ?? [])]),
    };
  };

  return (
    <div className="sheet-panel">
      <h2 className="text-lg font-bold text-foreground mb-4">{tc('characterSheet.sections.abilities')}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
        {(Object.keys(abilities) as Array<keyof typeof abilities>).map((ability) => {
          const resolvedAbility = abilities[ability];
          const modifier = resolvedAbility.modifier;
          const abilityName = t(`abilities.${ability}`);
          const preset = presetFor(ability);

          return (
            <button
              key={ability}
              type="button"
              onClick={() => onSelectRollPreset?.(preset)}
              className="ability-shield hover:border-primary hover:bg-primary/5 transition-all cursor-pointer text-left"
              title={`${abilityName} ${formatSigned(preset.modifier)} = ${partsText(preset.breakdown ?? [])}`}
            >
              <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                {abilityName}
                <RollModeBadge mode={preset.mode} />
              </div>
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
