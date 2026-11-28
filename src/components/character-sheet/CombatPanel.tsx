import type { ResolvedCharacter } from '@/types/resolved';
import { useTranslation } from 'react-i18next';

export function CombatPanel({
  resolved,
  speedValue,
  speed,
  profBonus,
  passivePerception,
  isStale,
  buildError,
}: {
  resolved: ResolvedCharacter | null;
  speedValue: number | null | undefined;
  speed?: ResolvedCharacter['speed'];
  profBonus: number;
  passivePerception?: number | null;
  isStale: boolean;
  buildError: string | null;
}) {
  const { t: tc } = useTranslation('common');
  const { t: tg } = useTranslation('gamedata');

  const speedDisplay = (() => {
    if (speed && Object.keys(speed).length > 0) {
      const parts: string[] = [];
      const walk = speed.walk;
      if (walk != null) {
        const walkStr = tc('characterSheet.fields.speedFt', { value: walk.value });
        parts.push(walkStr);
      }
      const otherModes = (['fly', 'climb', 'swim', 'burrow'] as const).filter((m) => speed[m] != null);
      for (const mode of otherModes) {
        const entry = speed[mode]!;
        const modeLabel = tc(`characterSheet.fields.speedModes.${mode}`);
        let part = `${modeLabel} ${tc('characterSheet.fields.speedFt', { value: entry.value })}`;
        if (entry.condition != null) {
          part += ` (${tc(`characterSheet.fields.speedConditions.${entry.condition}`, { defaultValue: entry.condition })})`;
        }
        parts.push(part);
      }
      return parts.length > 0 ? parts.join(', ') : '—';
    }
    return speedValue != null ? tc('characterSheet.fields.speedFt', { value: speedValue }) : '—';
  })();

  return (
    <div className="sheet-panel">
      <h2 className="text-lg font-bold text-foreground mb-4">{tc('characterSheet.sections.combat')}</h2>

      {!resolved && (
        <p className="text-sm text-muted-foreground mb-4">
          {buildError
            ? tc('characterSheet.buildError.combat', { message: buildError })
            : tc('characterSheet.emptyState.combat')}
        </p>
      )}

      <div className={`text-xs text-muted-foreground ${isStale ? 'opacity-50' : ''}`}>
        <div className="flex justify-between py-1">
          <span>{tc('characterSheet.fields.proficiencyBonus')}</span>
          <span className="font-mono font-bold text-foreground">+{profBonus}</span>
        </div>
        <div className="flex justify-between py-1">
          <span>{tc('characterSheet.fields.speed')}</span>
          <span className="font-mono font-bold text-foreground">{speedDisplay}</span>
        </div>
        {passivePerception != null && (
          <div className="flex justify-between py-1">
            <span>{tc('characterSheet.fields.passivePerception')}</span>
            <span className="font-mono font-bold text-foreground">{passivePerception}</span>
          </div>
        )}
        {resolved &&
          (['investigation', 'insight'] as const)
            .filter((skill) => resolved.skills[skill])
            .map((skill) => (
              <div key={skill} className="flex justify-between py-1">
                <span>{tc('characterSheet.fields.passiveSkill', { skill: tg(`skills.${skill}`) })}</span>
                <span className="font-mono font-bold text-foreground">{10 + resolved.skills[skill].bonus}</span>
              </div>
            ))}
      </div>
    </div>
  );
}
