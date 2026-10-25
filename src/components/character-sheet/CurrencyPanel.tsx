import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import type { Currency, CurrencyKey } from '@/types/database';

const COINS: readonly CurrencyKey[] = ['pp', 'gp', 'ep', 'sp', 'cp'];
/** Value of one coin in gold pieces. */
const GP_VALUE: Record<CurrencyKey, number> = { cp: 0.01, sp: 0.1, ep: 0.5, gp: 1, pp: 10 };

export const EMPTY_CURRENCY: Currency = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

export function CurrencyPanel({
  currency = EMPTY_CURRENCY,
  onChange,
}: {
  readonly currency?: Currency;
  readonly onChange: (next: Currency) => void;
}) {
  const { t: tc } = useTranslation('common');
  const gp = COINS.reduce((sum, c) => sum + (currency[c] ?? 0) * GP_VALUE[c], 0);

  return (
    <div className="bg-card border rounded-lg p-4 mb-4" data-testid="currency-panel">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-lg font-bold text-foreground">{tc('currency.title')}</h2>
        <span className="text-xs text-muted-foreground">{tc('currency.total', { gp: gp.toFixed(2) })}</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {COINS.map((coin) => (
          <label key={coin} className="text-center text-xs font-semibold text-muted-foreground">
            {tc(`currency.${coin}`)}
            {/* Committed on blur so typing doesn't write on every keystroke. */}
            <Input
              type="number"
              min={0}
              aria-label={tc('currency.amount', { coin: tc(`currency.${coin}`) })}
              key={currency[coin] ?? 0}
              defaultValue={currency[coin] ?? 0}
              className="mt-1 text-center"
              onBlur={(e) => {
                const value = Math.max(0, Math.floor(Number(e.target.value) || 0));
                if (value !== (currency[coin] ?? 0)) onChange({ ...currency, [coin]: value });
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
