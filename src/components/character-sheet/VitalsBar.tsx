import { Moon, Star, Sunrise } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatSigned } from '@/lib/format';

interface VitalsBarProps {
  readonly armorClass: number | null;
  readonly initiative: number | null;
  readonly speed: number | null | undefined;
  readonly profBonus: number;
  readonly passivePerception: number | null;
  readonly isStale: boolean;
  readonly inspiration: boolean;
  readonly onToggleInspiration: () => void;
  /** Omitted while the build is unresolved: resting needs the resolved pools and slots. */
  readonly onShortRest?: () => void;
  readonly onLongRest?: () => void;
}

/** Always-visible combat numbers plus the rest and inspiration controls, above the sheet tabs. */
export function VitalsBar({
  armorClass,
  initiative,
  speed,
  profBonus,
  passivePerception,
  isStale,
  inspiration,
  onToggleInspiration,
  onShortRest,
  onLongRest,
}: VitalsBarProps): React.JSX.Element {
  const { t } = useTranslation('common');

  const tiles: readonly (readonly [label: string, value: string])[] = [
    [t('characterSheet.fields.armorClass'), armorClass != null ? String(armorClass) : '—'],
    [t('characterSheet.fields.initiative'), initiative != null ? formatSigned(initiative) : '—'],
    [t('characterSheet.fields.speed'), speed != null ? t('characterSheet.fields.speedFt', { value: speed }) : '—'],
    [t('characterSheet.fields.proficiencyBonus'), formatSigned(profBonus)],
    [t('characterSheet.fields.passivePerception'), passivePerception != null ? String(passivePerception) : '—'],
  ];

  return (
    <div className="sheet-panel space-y-3">
      <dl className={`grid grid-cols-3 gap-2 sm:grid-cols-5 ${isStale ? 'opacity-50' : ''}`}>
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-muted/50 px-2 py-2 text-center">
            <dt className="text-[0.65rem] uppercase leading-tight tracking-wide text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-bold leading-tight text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={!onShortRest} onClick={onShortRest}>
          <Sunrise className="size-3.5" />
          {t('characterSheet.actions.shortRest')}
        </Button>
        <Button variant="outline" size="sm" disabled={!onLongRest} onClick={onLongRest}>
          <Moon className="size-3.5" />
          {t('characterSheet.actions.longRest')}
        </Button>
        <Button
          variant={inspiration ? 'default' : 'outline'}
          size="sm"
          aria-pressed={inspiration}
          title={t('inspiration.hint')}
          onClick={onToggleInspiration}
        >
          <Star className="size-3.5" />
          {t('inspiration.label')}
        </Button>
      </div>
    </div>
  );
}
