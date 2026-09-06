import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { parseBattleMapJson, serializeBattleMap } from '@/lib/battle-map';
import type { BattleMap } from '@/types/battle-map';

interface MapFileControlsProps {
  map: BattleMap;
  onImport: (map: BattleMap) => void;
}

export function MapFileControls({ map, onImport }: MapFileControlsProps) {
  const { t } = useTranslation('common');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const blob = new Blob([serializeBattleMap(map)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${map.name.replace(/[^a-z0-9-_]+/gi, '-') || 'battle-map'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = parseBattleMapJson(String(evt.target?.result ?? ''));
        onImport(imported);
        toast.success(t('battleMap.file.importSuccess'));
      } catch {
        toast.error(t('battleMap.file.importError'));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-card border rounded-xl p-4 space-y-2">
      <h3 className="text-sm font-bold text-foreground">{t('battleMap.file.title')}</h3>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 gap-2 text-xs">
          <Download className="size-3.5" /> {t('battleMap.file.export')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} className="flex-1 gap-2 text-xs">
          <Upload className="size-3.5" /> {t('battleMap.file.import')}
        </Button>
      </div>
      <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
    </div>
  );
}
