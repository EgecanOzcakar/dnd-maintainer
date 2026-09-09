import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Shows a persistent toast when a new app version has been precached, letting the
 * user reload to apply it. Renders nothing itself. Mount once, near the root.
 */
export function PWAUpdatePrompt() {
  const { t } = useTranslation('common');
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!needRefresh) return;
    toast(t('pwa.updateAvailable'), {
      id: 'pwa-update',
      duration: Infinity,
      action: {
        label: t('pwa.reload'),
        onClick: () => updateServiceWorker(true),
      },
    });
  }, [needRefresh, t, updateServiceWorker]);

  return null;
}
