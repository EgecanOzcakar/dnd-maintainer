import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  const { t } = useTranslation('common');
  usePageTitle(t('notFound.title'));

  return (
    <div className="page-container flex flex-col items-center justify-center text-center gap-4 py-24">
      <Compass className="size-16 text-muted-foreground/50" />
      <h1 className="text-3xl font-bold text-foreground">{t('notFound.title')}</h1>
      <p className="text-muted-foreground max-w-md">{t('notFound.description')}</p>
      <Link to="/" className={buttonVariants({ size: 'lg' })}>
        {t('campaign.backToCampaigns')}
      </Link>
    </div>
  );
}
