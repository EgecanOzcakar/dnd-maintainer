import { useTranslation } from 'react-i18next';
import type { RollPreset } from '@/components/character-sheet/roll-preset';
import type { PresetRollOutput } from '@/lib/dice-roll';

/** The popup shown after a one-click roll (rendered inside a Sonner custom toast). */
export function RollResultCard({ preset, out }: { readonly preset: RollPreset; readonly out: PresetRollOutput }) {
  const { t } = useTranslation('common');
  const tone = out.natural === 'nat20' ? 'text-green-500' : out.natural === 'nat1' ? 'text-destructive' : '';
  const tag = out.crit ? 'critical' : out.mode !== 'normal' ? out.mode : null;
  // With advantage/disadvantage one of the two d20s is dropped.
  const twoD20 = out.rolls.length > out.kept.length;
  const dropped = twoD20 ? out.rolls.indexOf(out.kept[0]) : -1;
  const dice = out.rolls.map((r, i) => (
    <span key={i} className={twoD20 && i !== dropped ? 'line-through opacity-50' : ''}>
      {i > 0 ? ', ' : ''}
      {r}
    </span>
  ));
  const floored = out.floored;

  return (
    <div className="w-80 rounded-xl border bg-popover text-popover-foreground shadow-lg p-3 text-xs space-y-2">
      <div className="flex items-center gap-3">
        <div className={`text-4xl font-black tabular-nums min-w-14 text-center ${tone}`}>{out.total}</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{preset.contextLabel}</div>
          <div className="font-mono text-muted-foreground">{out.formula}</div>
          <div className="flex flex-wrap gap-x-2 font-bold">
            {tag && <span className="text-amber-600 dark:text-amber-400">{t(`diceLog.${tag}`)}</span>}
            {out.natural && (
              <span className={tone}>{t(out.natural === 'nat20' ? 'diceLog.natural20' : 'diceLog.natural1')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Every term of the total: dice first, then each bonus with its source. */}
      <ul className="font-mono border-t pt-2 space-y-0.5">
        <li className="flex justify-between">
          <span className="font-sans text-muted-foreground">
            {out.formula.match(/^\d+d\d+/)?.[0]} {floored ? '*' : ''}
          </span>
          <span>[{dice}]</span>
        </li>
        {(preset.breakdown ?? []).map((p, i) => (
          <li key={i} className="flex justify-between">
            <span className="font-sans text-muted-foreground">{p.label}</span>
            <span>{p.value}</span>
          </li>
        ))}
        {out.extras.map((e, i) => (
          <li key={`x${i}`} className="flex justify-between">
            <span className="font-sans text-muted-foreground">
              {t('rollBreakdown.effectDice')} {e.formula}
            </span>
            <span>[{e.rolls.join(', ')}]</span>
          </li>
        ))}
      </ul>
      {floored && <div className="text-amber-600 dark:text-amber-400">{t('rollBreakdown.reliableTalent')}</div>}
    </div>
  );
}
