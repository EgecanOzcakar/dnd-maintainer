import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Sparkles, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePageTitle } from '@/hooks/usePageTitle';
import { MAGIC_ITEM_CATALOG } from '@/lib/sources/magic-items';
import { MAGIC_ITEM_RARITIES, type MagicItemRarity } from '@/types/magic-items';
import { SRD_ATTRIBUTION } from '@/lib/licenses';

const RARITY_STYLES: Record<MagicItemRarity, string> = {
  common: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30',
  uncommon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  rare: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
  'very-rare': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
  legendary: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  artifact: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
  varies: 'bg-muted text-muted-foreground border-border',
};

export default function MagicItemsPage() {
  const { t } = useTranslation('common');
  usePageTitle(t('magicItems.title'));

  const [query, setQuery] = useState('');
  const [rarity, setRarity] = useState<MagicItemRarity | 'all'>('all');
  const [attunedOnly, setAttunedOnly] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MAGIC_ITEM_CATALOG.filter((item) => {
      if (rarity !== 'all' && item.rarity !== rarity) return false;
      if (attunedOnly && !item.attunement) return false;
      if (q && !item.name.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, rarity, attunedOnly]);

  return (
    <div className="page-container space-y-6 pb-12">
      <div className="flex flex-col gap-2 bg-card border border-primary/30 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="size-6 text-primary" />
          <h1 className="page-title">{t('magicItems.title')}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t('magicItems.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-xl p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('magicItems.searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={rarity === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRarity('all')}
            className="text-xs"
          >
            {t('magicItems.rarityAll')}
          </Button>
          {MAGIC_ITEM_RARITIES.map((r) => (
            <Button
              key={r}
              variant={rarity === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRarity(r)}
              className="text-xs"
            >
              {t(`magicItems.rarity.${r}` as const)}
            </Button>
          ))}
          <Button
            variant={attunedOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAttunedOnly((v) => !v)}
            className="text-xs ml-auto"
          >
            {t('magicItems.attunementFilter')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t('magicItems.resultCount', { count: results.length })}</p>
      </div>

      {/* Results */}
      <div className="grid gap-3">
        {results.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                { }
                <CardTitle className="text-base">{item.name}</CardTitle>
                <Badge variant="outline" className={`text-[10px] ${RARITY_STYLES[item.rarity]}`}>
                  {t(`magicItems.rarity.${item.rarity}` as const)}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {t(`magicItems.category.${item.category}` as const)}
                </Badge>
                {item.attunement && (
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    {item.attunementNote
                      ? t('magicItems.attunementBy', { who: item.attunementNote })
                      : t('magicItems.attunement')}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              { }
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
            </CardContent>
          </Card>
        ))}
        {results.length === 0 && (
          <p className="text-center py-10 text-muted-foreground text-sm">{t('magicItems.noResults')}</p>
        )}
      </div>

      {/* Attribution */}
      <div className="border-t pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAttribution((v) => !v)}
          className="gap-1.5 text-xs text-muted-foreground"
        >
          <Info className="size-3.5" /> {t('magicItems.attributionToggle')}
        </Button>
        {showAttribution && <p className="mt-2 text-xs text-muted-foreground max-w-2xl">{SRD_ATTRIBUTION}</p>}
      </div>
    </div>
  );
}
