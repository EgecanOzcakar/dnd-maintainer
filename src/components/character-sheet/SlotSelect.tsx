import { useTranslation } from 'react-i18next';
import type { SlotOption } from '@/lib/spell-casting';

/** Which spell slot to use: ordinary slots by level, and the Pact slot. Renders nothing for a single choice. */
export function SlotSelect({
  options,
  value,
  onChange,
  label,
}: {
  readonly options: readonly SlotOption[];
  readonly value: string | undefined;
  readonly onChange: (key: string) => void;
  readonly label: string;
}) {
  const { t: tc } = useTranslation('common');
  if (options.length < 2) return null;
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-6 rounded border bg-background px-1 text-[11px]"
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {tc(o.key === 'pact' ? 'spellCasting.pactOption' : 'spellCasting.levelOption', { level: o.level })}
        </option>
      ))}
    </select>
  );
}
