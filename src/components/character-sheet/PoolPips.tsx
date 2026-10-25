import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { poolRemaining } from '@/lib/rest';

const MAX_PIPS = 10;

/**
 * Uses left in a limited-use pool: clickable pips (filled = spent, like spell slots), or a
 * stepper for big pools such as Lay on Hands.
 */
export function PoolPips({
  name,
  max,
  used,
  onSetUsed,
}: {
  readonly name: string;
  readonly max: number;
  readonly used: number;
  readonly onSetUsed: (used: number) => void;
}) {
  const { t: tc } = useTranslation('common');
  const spent = Math.min(used, max);

  if (max > MAX_PIPS) {
    const left = poolRemaining({ p: used }, 'p', max);
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs">
        <button
          type="button"
          aria-label={tc('characterSheet.resourcePools.spend', { name })}
          disabled={left === 0}
          onClick={() => onSetUsed(spent + 1)}
          className="rounded border p-0.5 disabled:opacity-40"
        >
          <Minus className="size-3" />
        </button>
        <span>{tc('characterSheet.resourcePools.remaining', { left, max })}</span>
        <button
          type="button"
          aria-label={tc('characterSheet.resourcePools.restore', { name })}
          disabled={spent === 0}
          onClick={() => onSetUsed(spent - 1)}
          className="rounded border p-0.5 disabled:opacity-40"
        >
          <Plus className="size-3" />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center" role="group" aria-label={name}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < spent;
        return (
          <button
            key={i}
            type="button"
            aria-pressed={filled}
            aria-label={tc(filled ? 'characterSheet.resourcePools.restore' : 'characterSheet.resourcePools.spend', {
              name,
            })}
            onClick={() => onSetUsed(filled ? i : i + 1)}
            className="group grid size-6 place-items-center rounded-full"
          >
            <span
              aria-hidden
              className={`size-4 rounded-full border-2 transition-colors ${
                filled ? 'bg-primary border-primary' : 'border-muted-foreground group-hover:border-primary'
              }`}
            />
          </button>
        );
      })}
      <span className="ml-1 font-mono text-xs text-muted-foreground">
        {tc('characterSheet.resourcePools.remaining', { left: max - spent, max })}
      </span>
    </span>
  );
}
