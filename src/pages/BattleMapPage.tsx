import { useTranslation } from 'react-i18next';
import { Grid3x3 } from 'lucide-react';
import { useCampaignContext } from '@/hooks/useCampaignContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { BattleMapEditor } from '@/components/battle-map/BattleMapEditor';
import { DisplayModeToggle } from '@/components/battle-map/DisplayModeToggle';

export default function BattleMapPage() {
  const { t } = useTranslation('common');
  const { campaignId, campaignSlug } = useCampaignContext();
  const targetCampaignId = campaignId || campaignSlug || '';

  usePageTitle(t('battleMap.title'));

  return (
    <div className="page-container space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-primary/30 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Grid3x3 className="size-6 text-primary" />
            <h1 className="page-title">{t('battleMap.title')}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t('battleMap.subtitle')}</p>
        </div>
        {targetCampaignId && <DisplayModeToggle campaignId={targetCampaignId} />}
      </div>

      {targetCampaignId && <BattleMapEditor campaignId={targetCampaignId} />}
    </div>
  );
}
