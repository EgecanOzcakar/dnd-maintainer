import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PoolPips } from '@/components/character-sheet/PoolPips';
import type { RollPreset } from '@/components/character-sheet/roll-preset';
import type { DieSize } from '@/components/character-sheet/DiceRoller';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRollParts } from '@/hooks/useRollParts';
import { poolRemaining, spendPool } from '@/lib/rest';
import { MANEUVER_BY_FEATURE, SUPERIORITY_DICE } from '@/lib/sources/maneuvers';
import type { Character } from '@/types/database';
import type { ResolvedCharacter } from '@/types/resolved';

interface ManeuversPanelProps {
  readonly resolved: ResolvedCharacter;
  readonly character: Pick<Character, 'resource_pools_used'>;
  readonly fighterLevel: number;
  readonly onUpdate: (u: Partial<Character>) => void;
  readonly onSelectRollPreset?: (preset: RollPreset) => void;
}

/** Battle Master: Superiority Dice, the maneuver save DC, and each known maneuver with its rules and a Use button. */
export function ManeuversPanel({
  resolved,
  character,
  fighterLevel,
  onUpdate,
  onSelectRollPreset,
}: ManeuversPanelProps): React.JSX.Element | null {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');
  const rollParts = useRollParts();
  const [free, setFree] = useState(false);

  const pool = resolved.resourcePools.find((p) => p.poolId === SUPERIORITY_DICE);
  if (!pool) return null;

  const pools = character.resource_pools_used ?? {};
  const left = poolRemaining(pools, SUPERIORITY_DICE, pool.max);
  const die = (pool.dieSize ?? 8) as DieSize;
  const { str, dex } = resolved.abilities;
  const dcMod = Math.max(str.modifier, dex.modifier);
  const dc = 8 + resolved.proficiencyBonus + dcMod;
  const relentless = resolved.features.some((f) => f.feature.id === 'battlemaster-relentless');
  // The same maneuver can't be learned twice; ignore a duplicate pick.
  const known = [...new Set(resolved.features.map((f) => f.feature.id).filter((id) => MANEUVER_BY_FEATURE.has(id)))];

  const use = (featureId: string) => {
    const def = MANEUVER_BY_FEATURE.get(featureId);
    if (!def) return;
    const flat = def.adds === 'str-dex' ? dcMod : def.adds === 'half-level' ? Math.floor(fighterLevel / 2) : 0;
    const name = t(`features.${featureId}.name` as 'features.x.name', { defaultValue: featureId });
    // Relentless: the free die is a d8 and costs nothing (once per turn).
    const rolled = free ? 8 : die;
    if (!free) onUpdate({ resource_pools_used: spendPool(pools, SUPERIORITY_DICE, pool.max) });
    setFree(false);
    onSelectRollPreset?.({
      die: rolled as DieSize,
      count: 1,
      modifier: flat,
      kind: def.roll === 'damage' ? 'damage' : 'd20',
      contextLabel: `${name} (d${rolled})${def.save ? ` · ${tc('maneuvers.dc', { dc })}` : ''}`,
      breakdown: rollParts(
        def.adds === 'str-dex'
          ? [{ type: 'ability', label: str.modifier >= dex.modifier ? 'str' : 'dex', value: flat }]
          : def.adds === 'half-level'
            ? [{ type: 'level', label: 'level', value: flat }]
            : []
      ),
    });
  };

  return (
    <div className="bg-card border rounded-lg p-6" data-testid="maneuvers-panel">
      <h2 className="text-lg font-bold text-foreground mb-3">{tc('maneuvers.title')}</h2>

      <div className="rounded border bg-muted/40 p-3 mb-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-semibold text-sm">{tc('maneuvers.dice', { die })}</span>
          <PoolPips
            name={tc('maneuvers.diceName')}
            max={pool.max}
            used={pools[SUPERIORITY_DICE] ?? 0}
            onSetUsed={(n) => onUpdate({ resource_pools_used: { ...pools, [SUPERIORITY_DICE]: n } })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {tc('maneuvers.saveDC', { dc, mod: dcMod >= 0 ? `+${dcMod}` : dcMod })}
        </p>
        {relentless && (
          <label className="mt-2 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} />
            {t('features.battlemaster-relentless.name')}: {tc('maneuvers.relentlessHint')}
          </label>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-2">{tc('maneuvers.help')}</p>
      {known.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tc('maneuvers.none')}</p>
      ) : (
        <ul className="space-y-2">
          {known.map((id) => {
            const def = MANEUVER_BY_FEATURE.get(id);
            return (
              <li key={id} className="rounded border p-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm flex-1">
                    {t(`features.${id}.name` as 'features.x.name', { defaultValue: id })}
                  </span>
                  {def?.save && (
                    <Badge variant="outline">
                      {tc('maneuvers.saveBadge', { ability: t(`abilities.${def.save}`), dc })}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[11px]"
                    disabled={left === 0 && !free}
                    onClick={() => use(id)}
                  >
                    {tc('maneuvers.use')}
                  </Button>
                </div>
                <p className="mt-1 text-muted-foreground leading-relaxed">
                  {t(`features.${id}.description` as 'features.x.description', { defaultValue: '' })}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
