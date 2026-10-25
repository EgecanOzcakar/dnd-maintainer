import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { arcaneBudget, recoverSlot } from '@/lib/arcane-recovery';
import type { Character } from '@/types/database';

const POOL = 'arcane-recovery';

/** Wizard: once per long rest, after a short rest, recover spent slots up to half the wizard level combined. */
export function ArcaneRecoveryPanel({
  wizardLevel,
  character,
  onUpdate,
}: {
  readonly wizardLevel: number;
  readonly character: Pick<Character, 'spell_slots_used' | 'resource_pools_used'>;
  readonly onUpdate: (u: Partial<Character>) => void;
}) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');
  // ponytail: the leftover budget lives in component state; reloading mid-recovery forfeits it.
  const [budget, setBudget] = useState<number | null>(null);
  const used = (character.resource_pools_used?.[POOL] ?? 0) > 0;
  const left = budget ?? (used ? 0 : arcaneBudget(wizardLevel));
  const spent = character.spell_slots_used ?? {};
  const levels = [1, 2, 3, 4, 5].filter((l) => (spent[String(l)] ?? 0) > 0);

  return (
    <div className="bg-card border rounded-lg p-4" data-testid="arcane-recovery">
      <h2 className="text-lg font-bold text-foreground mb-1">{t('features.wizard-arcane-recovery.name')}</h2>
      <p className="text-xs text-muted-foreground mb-2">{t('features.wizard-arcane-recovery.description')}</p>
      <p className="text-xs font-semibold mb-2">{tc('arcaneRecovery.budget', { left })}</p>
      <div className="flex flex-wrap gap-1">
        {levels.map((level) => (
          <Button
            key={level}
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px]"
            disabled={left < level}
            onClick={() => {
              const next = recoverSlot(spent, level, left);
              if (!next) return;
              setBudget(next.budget);
              onUpdate({
                spell_slots_used: next.slots,
                resource_pools_used: { ...character.resource_pools_used, [POOL]: 1 },
              });
            }}
          >
            {tc('arcaneRecovery.recover', { level })}
          </Button>
        ))}
        {levels.length === 0 && <span className="text-xs text-muted-foreground">{tc('arcaneRecovery.none')}</span>}
      </div>
    </div>
  );
}
