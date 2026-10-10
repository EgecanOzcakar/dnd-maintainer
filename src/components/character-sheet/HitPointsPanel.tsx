import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  applyDamage,
  applyDeathSave,
  applyHeal,
  applyTempHp,
  resolveCurrentHp,
  rollD20,
  type HpState,
} from '@/lib/hit-points';
import type { Character } from '@/types/database';

interface HitPointsPanelProps {
  readonly character: Pick<Character, 'current_hp' | 'temp_hp' | 'death_saves'>;
  readonly maxHp: number | null;
  readonly onUpdate: (u: Partial<Character>) => void;
}

export function HitPointsPanel({ character, maxHp, onUpdate }: HitPointsPanelProps): React.JSX.Element | null {
  const { t } = useTranslation('common');
  const [amount, setAmount] = useState('');
  const [crit, setCrit] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);

  if (maxHp == null) return null;

  const state: HpState = {
    current: resolveCurrentHp(character.current_hp, maxHp),
    temp: character.temp_hp ?? 0,
    deathSaves: character.death_saves ?? { successes: 0, failures: 0 },
  };
  const { successes, failures } = state.deathSaves;
  const dead = failures >= 3;
  const stable = successes >= 3;

  function save(next: HpState): void {
    // NULL means "at max", so it follows max HP changes (level up, etc.).
    onUpdate({
      current_hp: next.current >= (maxHp ?? 0) ? null : next.current,
      temp_hp: next.temp,
      death_saves: next.deathSaves,
    });
  }

  const value = Math.max(0, parseInt(amount, 10) || 0);
  function run(fn: (v: number) => HpState): void {
    if (value === 0) return;
    save(fn(value));
    setAmount('');
    setCrit(false);
  }

  function setSaves(next: { successes: number; failures: number }): void {
    save({ ...state, deathSaves: next });
  }

  function handleRoll(): void {
    const roll = rollD20();
    setLastRoll(roll);
    save(applyDeathSave(state, roll).state);
  }

  return (
    <div className="bg-card border rounded-lg p-6" data-testid="hit-points-panel">
      <h2 className="text-lg font-bold text-foreground mb-4">{t('hitPoints.title')}</h2>
      <div className="grid grid-cols-3 gap-2 text-center mb-4">
        <div>
          <div className="text-xs text-muted-foreground">{t('hitPoints.current')}</div>
          <div className="text-2xl font-bold" data-testid="hp-current">
            {state.current}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t('hitPoints.max')}</div>
          <div className="text-2xl font-bold" data-testid="hp-max">
            {maxHp}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t('hitPoints.temp')}</div>
          <div className="text-2xl font-bold" data-testid="hp-temp">
            {state.temp}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min={0}
          aria-label={t('hitPoints.amount')}
          className="w-24"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => run((v) => applyDamage(state, v, maxHp, crit).state)}
        >
          {t('hitPoints.damage')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => run((v) => applyHeal(state, v, maxHp))}>
          {t('hitPoints.heal')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => run((v) => applyTempHp(state, v))}>
          {t('hitPoints.tempHp')}
        </Button>
        {state.current === 0 && (
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} />
            {t('hitPoints.critical')}
          </label>
        )}
      </div>

      {state.current === 0 && (
        <div className="mt-4 space-y-2" data-testid="death-saves">
          <h3 className="text-sm font-semibold">{t('hitPoints.deathSaves')}</h3>
          {dead && (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {t('hitPoints.dead')}
            </p>
          )}
          {stable && <p className="text-sm text-muted-foreground">{t('hitPoints.stable')}</p>}
          {(['successes', 'failures'] as const).map((kind) => (
            <div key={kind} className="flex items-center gap-2">
              <span className="text-xs w-20 text-muted-foreground">{t(`hitPoints.${kind}`)}</span>
              {[1, 2, 3].map((n) => {
                const count = kind === 'successes' ? successes : failures;
                return (
                  <input
                    key={n}
                    type="checkbox"
                    aria-label={t(kind === 'successes' ? 'hitPoints.success' : 'hitPoints.failure', { n })}
                    checked={count >= n}
                    onChange={() => setSaves({ ...state.deathSaves, [kind]: count >= n ? n - 1 : n })}
                  />
                );
              })}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={dead} onClick={handleRoll}>
              {t('hitPoints.rollDeathSave')}
            </Button>
            {lastRoll !== null && <span className="text-xs">{t('hitPoints.rolled', { roll: lastRoll })}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
