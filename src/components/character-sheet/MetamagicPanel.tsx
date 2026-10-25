import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PoolPips } from '@/components/character-sheet/PoolPips';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createSlot, slotToPoints, spendSorceryPoints } from '@/lib/metamagic';
import { getSpellSlotMax, poolRemaining } from '@/lib/rest';
import { METAMAGIC_COSTS, SLOT_CREATION_COST, SORCERY_POINTS } from '@/lib/sources/metamagic';
import type { Character } from '@/types/database';
import type { ResolvedCharacter } from '@/types/resolved';

interface MetamagicPanelProps {
  readonly resolved: ResolvedCharacter;
  readonly character: Pick<Character, 'spell_slots_used' | 'resource_pools_used'>;
  readonly onUpdate: (u: Partial<Character>) => void;
}

/** Sorcerer: Sorcery Points, Font of Magic slot conversion, and the chosen Metamagic options with their rules. */
export function MetamagicPanel({ resolved, character, onUpdate }: MetamagicPanelProps): React.JSX.Element | null {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');

  const points = resolved.resourcePools.find((p) => p.poolId === SORCERY_POINTS);
  if (!points) return null;

  const spMax = points.max;
  const slotMax = getSpellSlotMax(resolved);
  const slots = character.spell_slots_used ?? {};
  const pools = character.resource_pools_used ?? {};
  const left = poolRemaining(pools, SORCERY_POINTS, spMax);
  const options = resolved.features.filter((f) => f.feature.id in METAMAGIC_COSTS);
  const levels = (resolved.spellcasting?.slots ?? []).flatMap((n, i) => (n > 0 ? [i + 1] : []));

  const convert = (level: number) => {
    const next = slotToPoints({ slots, pools }, slotMax, spMax, level);
    if (!next) return;
    onUpdate({ spell_slots_used: next.slots, resource_pools_used: next.pools });
    toast.success(tc('metamagic.converted', { level, points: Math.min(level, spMax - left) }));
  };
  const create = (level: number) => {
    const next = createSlot({ slots, pools }, spMax, level);
    if (!next) return toast.error(tc('metamagic.notEnough'));
    onUpdate({ spell_slots_used: next.slots, resource_pools_used: next.pools });
    toast.success(tc('metamagic.created', { level }));
  };
  const use = (featureId: string, cost: number) => {
    const next = spendSorceryPoints(pools, spMax, cost);
    if (!next) return toast.error(tc('metamagic.notEnough'));
    onUpdate({ resource_pools_used: next });
    toast.success(
      tc('metamagic.spent', {
        cost,
        name: t(`features.${featureId}.name` as 'features.x.name', { defaultValue: featureId }),
        left: left - cost,
      })
    );
  };

  return (
    <div className="bg-card border rounded-lg p-6" data-testid="metamagic-panel">
      <h2 className="text-lg font-bold text-foreground mb-3">{tc('metamagic.title')}</h2>

      <div className="rounded border bg-muted/40 p-3 mb-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-semibold text-sm">{tc('metamagic.sorceryPoints')}</span>
          <PoolPips
            name={tc('metamagic.sorceryPoints')}
            max={spMax}
            used={pools[SORCERY_POINTS] ?? 0}
            onSetUsed={(n) => onUpdate({ resource_pools_used: { ...pools, [SORCERY_POINTS]: n } })}
          />
        </div>
        <p className="text-xs text-muted-foreground">{t('resourcePools.sorcery-points.description')}</p>
      </div>

      <div className="mb-4 space-y-2">
        <h3 className="text-xs font-bold uppercase text-muted-foreground">{tc('metamagic.fontTitle')}</h3>
        <p className="text-xs text-muted-foreground">{t('features.sorcerer-font-of-magic.description')}</p>
        <p className="text-xs text-muted-foreground">{tc('metamagic.convertHelp')}</p>
        <div className="flex flex-wrap gap-1">
          {levels.map((level) => (
            <Button
              key={level}
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              disabled={(slotMax[String(level)] ?? 0) - (slots[String(level)] ?? 0) <= 0 || left >= spMax}
              onClick={() => convert(level)}
            >
              {tc('metamagic.convertButton', { level, points: level })}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{tc('metamagic.createHelp')}</p>
        <div className="flex flex-wrap gap-1">
          {Object.entries(SLOT_CREATION_COST).map(([level, cost]) => (
            <Button
              key={level}
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              disabled={left < cost}
              onClick={() => create(Number(level))}
            >
              {tc('metamagic.createButton', { level, cost })}
            </Button>
          ))}
        </div>
      </div>

      <h3 className="text-xs font-bold uppercase text-muted-foreground mb-1">{tc('metamagic.optionsTitle')}</h3>
      <p className="text-xs text-muted-foreground mb-2">{tc('metamagic.optionsHelp')}</p>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tc('metamagic.noOptions')}</p>
      ) : (
        <ul className="space-y-2">
          {options.map(({ feature }) => {
            const cost = METAMAGIC_COSTS[feature.id];
            return (
              <li key={feature.id} className="rounded border p-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-left flex-1">
                    {t(`features.${feature.id}.name` as 'features.x.name', { defaultValue: feature.id })}
                  </span>
                  <Badge variant="outline">{tc('metamagic.cost', { cost })}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[11px]"
                    disabled={left < cost}
                    onClick={() => use(feature.id, cost)}
                  >
                    {tc('metamagic.use')}
                  </Button>
                </div>
                {/* The rules text stays visible: it is the point of listing them. */}
                <p className="mt-1 text-muted-foreground leading-relaxed">
                  {t(`features.${feature.id}.description` as 'features.x.description', { defaultValue: '' })}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
