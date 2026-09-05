import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommonImageDisplayer } from '@/components/common/CommonImageDisplayer';
import { useBattleMap } from '@/hooks/useBattleMap';
import type { DisplayMode } from '@/types/battle-map';
import { BattleMapView } from './BattleMapView';

interface PlayerSceneViewerProps {
  campaignId: string;
}

/**
 * Scene viewer for players (character sheet). Shows the live shared image or the live
 * battle map, and lets the viewer switch between them locally — independent of the DM's
 * broadcast choice. The initial view follows the DM until the viewer picks one.
 */
export function PlayerSceneViewer({ campaignId }: PlayerSceneViewerProps) {
  const { t } = useTranslation('common');
  const { data } = useBattleMap(campaignId);
  const storageKey = `dnd_scene_view_${campaignId}`;

  const [override, setOverride] = useState<DisplayMode | null>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === 'image' || stored === 'map' ? stored : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (override) localStorage.setItem(storageKey, override);
      else localStorage.removeItem(storageKey);
    } catch {
      // best-effort persistence only
    }
  }, [override, storageKey]);

  const view: DisplayMode = override ?? data?.displayMode ?? 'image';

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border overflow-hidden">
          <Button
            variant={view === 'image' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setOverride('image')}
            className="rounded-none gap-1.5 text-xs"
          >
            <ImageIcon className="size-3.5" /> {t('battleMap.showImage')}
          </Button>
          <Button
            variant={view === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setOverride('map')}
            className="rounded-none gap-1.5 text-xs"
          >
            <Grid3x3 className="size-3.5" /> {t('battleMap.showMap')}
          </Button>
        </div>
      </div>
      {view === 'map' ? <BattleMapView campaignId={campaignId} /> : <CommonImageDisplayer campaignId={campaignId} />}
    </div>
  );
}
