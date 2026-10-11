import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ABILITY_KEYS } from '@/lib/dnd-helpers';
import { availableEffects, type AppliedEffects, type RollMode } from '@/lib/resolver/effects';
import type { ResolvedCharacter } from '@/types/resolved';

export function RollModeBadge({ mode }: { readonly mode: RollMode | undefined }) {
  const { t } = useTranslation('common');
  if (!mode) return null;
  return (
    <Badge
      variant="outline"
      className={`text-[9px] py-0 px-1 ${mode === 'adv' ? 'border-emerald-500/50 text-emerald-600' : 'border-amber-500/50 text-amber-600'}`}
    >
      {t(`activeEffects.badge.${mode}`)}
    </Badge>
  );
}

interface ActiveEffectsPanelProps {
  readonly resolved: ResolvedCharacter;
  readonly active: readonly string[];
  readonly applied: AppliedEffects;
  readonly onChange: (active: string[]) => void;
}

export function ActiveEffectsPanel({ resolved, active, applied, onChange }: ActiveEffectsPanelProps) {
  const { t } = useTranslation('common');
  const { t: tg } = useTranslation('gamedata');
  const toggle = (id: string) => onChange(active.includes(id) ? active.filter((a) => a !== id) : [...active, id]);

  const lines = [
    ...ABILITY_KEYS.map((a) => ({
      key: `check:${a}`,
      label: t('activeEffects.summary.checks', { ability: tg(`abilities.${a}`) }),
      mode: applied.checks[a],
    })),
    ...ABILITY_KEYS.map((a) => ({
      key: `save:${a}`,
      label: t('activeEffects.summary.saves', { ability: tg(`abilities.${a}`) }),
      mode: applied.savingThrows[a].mode,
    })),
    { key: 'against', label: t('activeEffects.summary.attacksAgainst'), mode: applied.attacksAgainst },
  ].filter((l) => l.mode);

  return (
    <div className="bg-card border rounded-lg p-6">
      <h2 className="text-lg font-bold text-foreground">{t('activeEffects.title')}</h2>
      <p className="text-xs text-muted-foreground mb-3">{t('activeEffects.hint')}</p>
      <div className="flex flex-wrap gap-1">
        {availableEffects(resolved).map((e) => (
          <Button
            key={e.id}
            size="sm"
            aria-pressed={active.includes(e.id)}
            variant={active.includes(e.id) ? 'default' : 'outline'}
            className="h-7 px-2 text-xs"
            onClick={() => toggle(e.id)}
          >
            {t(`activeEffects.names.${e.id}` as 'activeEffects.names.rage')}
          </Button>
        ))}
      </div>
      {(lines.length > 0 || applied.resistances.length > 0 || applied.checkPenalty > 0) && (
        <ul className="mt-3 space-y-1 text-xs">
          {lines.map((l) => (
            <li key={l.key} className="flex items-center gap-2">
              <RollModeBadge mode={l.mode} />
              <span>{l.label}</span>
            </li>
          ))}
          {applied.resistances.length > 0 && (
            <li>
              {t('activeEffects.summary.resistances', {
                types: applied.resistances
                  .map((r) => tg(`damageTypes.${r}` as `damageTypes.${string}`, { defaultValue: r }))
                  .join(', '),
              })}
            </li>
          )}
          {applied.checkPenalty > 0 && (
            <li>{t('activeEffects.summary.d20Penalty', { value: `-${applied.checkPenalty}` })}</li>
          )}
        </ul>
      )}
    </div>
  );
}
