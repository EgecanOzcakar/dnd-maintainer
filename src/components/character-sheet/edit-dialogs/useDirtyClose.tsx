import { Button } from '@/components/ui/button';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Closing an edit dialog with unsaved changes asks first. Returns `requestClose` for the dialog's
 * close paths (Escape, overlay, Cancel) and a `prompt` to render in place of the footer while asking.
 */
export function useDirtyClose(
  dirty: boolean,
  onClose: () => void
): { requestClose: () => void; prompt: ReactElement | null } {
  const { t: tc } = useTranslation('common');
  const [confirming, setConfirming] = useState(false);

  const requestClose = () => {
    if (dirty) setConfirming(true);
    else onClose();
  };

  const prompt = confirming ? (
    <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
      <p className="text-sm text-foreground">{tc('characterSheet.dialogs.discardPrompt')}</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          {tc('characterSheet.dialogs.keepEditing')}
        </Button>
        <Button variant="destructive" size="sm" onClick={onClose}>
          {tc('characterSheet.dialogs.discard')}
        </Button>
      </div>
    </div>
  ) : null;

  return { requestClose, prompt };
}
