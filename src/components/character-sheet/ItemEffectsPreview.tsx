import { useTranslation } from 'react-i18next';
import { parseEffects } from '@/lib/item-effects';
import { describeGrant } from '@/lib/modifier-suggestions';

/** Live readout of effect rules: what each line does, or why it was ignored. */
export function ItemEffectsPreview({ text }: { text: string }) {
  const { t: tc } = useTranslation('common');
  const lines = parseEffects(text);
  if (lines.length === 0) return null;
  return (
    <ul className="mt-2 space-y-0.5 text-xs" data-testid="item-effects-preview">
      {lines.map((line, i) => (
        <li key={i} className={line.error ? 'text-destructive' : 'text-foreground'}>
          {line.error ? (
            <>
              <span className="font-mono">{line.text}</span> — {line.error}
            </>
          ) : (
            <>
              {line.grant && describeGrant(line.grant)}
              {line.note && <span className="text-muted-foreground"> ({line.note})</span>}
              {line.situational && (
                <span className="text-muted-foreground"> · {tc('inventory.effectsSituational')}</span>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
