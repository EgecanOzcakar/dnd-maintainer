import { useTranslation } from 'react-i18next';
import { Grid3x3 } from 'lucide-react';
import { useBattleMap } from '@/hooks/useBattleMap';
import { BattleMapGrid } from './BattleMapGrid';

interface BattleMapViewProps {
  campaignId: string;
  className?: string;
}

/** Read-only render of the campaign's active battle map, for the shared display area. */
export function BattleMapView({ campaignId, className = '' }: BattleMapViewProps) {
  const { t } = useTranslation('common');
  const { data } = useBattleMap(campaignId);

  return (
    <div className={`bg-card border rounded-lg p-5 space-y-3 ${className}`}>
      <div className="flex items-center gap-2 border-b pb-3">
        <Grid3x3 className="size-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">{t('battleMap.liveTitle')}</h2>
      </div>
      {data?.map ? (
        <BattleMapGrid map={data.map} readOnly zoom={0.75} />
      ) : (
        <p className="text-sm text-muted-foreground italic py-8 text-center">{t('battleMap.noMap')}</p>
      )}
    </div>
  );
}
