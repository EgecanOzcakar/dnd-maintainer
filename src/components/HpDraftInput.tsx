import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface HpDraftInputProps {
  value: number;
  max: number;
  onCommit: (hp: number) => void;
  'aria-label': string;
}

/**
 * Number input that keeps a local draft while typing and only commits (clamped to 0..max) on blur or
 * Enter, so each keystroke doesn't fire a save. Escape discards the draft.
 */
export function HpDraftInput({ value, max, onCommit, 'aria-label': ariaLabel }: HpDraftInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    const parsed = parseInt(draft ?? '', 10);
    setDraft(null);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(0, Math.min(max, parsed));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <Input
      type="number"
      min={0}
      max={max}
      value={draft ?? value}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') setDraft(null);
      }}
      className="h-9 text-center text-xs font-bold font-mono px-1"
    />
  );
}
