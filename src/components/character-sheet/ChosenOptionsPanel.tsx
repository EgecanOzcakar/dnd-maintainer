import { useTranslation } from 'react-i18next';
import type { ResolvedCharacter } from '@/types/resolved';

/** A class's chosen options (Eldritch Invocations, ...) with their full rules text. */
export function ChosenOptionsPanel({
  title,
  help,
  features,
}: {
  readonly title: string;
  readonly help?: string;
  readonly features: ResolvedCharacter['features'];
}) {
  const { t } = useTranslation('gamedata');
  if (features.length === 0) return null;
  return (
    <div className="bg-card border rounded-lg p-4" data-testid="chosen-options">
      <h2 className="text-lg font-bold text-foreground mb-1">{title}</h2>
      {help && <p className="text-xs text-muted-foreground mb-2">{help}</p>}
      <ul className="space-y-2">
        {features.map(({ feature }) => (
          <li key={feature.id} className="rounded border p-2 text-xs">
            <div className="font-semibold text-sm">
              {t(`features.${feature.id}.name` as 'features.x.name', { defaultValue: feature.id })}
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {t(`features.${feature.id}.description` as 'features.x.description', { defaultValue: '' })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
