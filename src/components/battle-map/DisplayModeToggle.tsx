import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBattleMap, useSetDisplayMode } from '@/hooks/useBattleMap';
import type { DisplayMode } from '@/types/battle-map';

interface DisplayModeToggleProps {
  campaignId: string;
}

/** Lets the DM pick what players see: the image displayer or the live battle map. */
export function DisplayModeToggle({ campaignId }: DisplayModeToggleProps) {
  const { t } = useTranslation('common');
  const { data } = useBattleMap(campaignId);
  const setMode = useSetDisplayMode();
  const active: DisplayMode = data?.displayMode ?? 'image';

  return (
    <div className="inline-flex rounded-lg border overflow-hidden">
      <Button
        variant={active === 'image' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setMode.mutate({ campaignId, mode: 'image' })}
        className="rounded-none gap-1.5 text-xs"
      >
        <ImageIcon className="size-3.5" /> {t('battleMap.showImage')}
      </Button>
      <Button
        variant={active === 'map' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setMode.mutate({ campaignId, mode: 'map' })}
        className="rounded-none gap-1.5 text-xs"
      >
        <Grid3x3 className="size-3.5" /> {t('battleMap.showMap')}
      </Button>
    </div>
  );
}
