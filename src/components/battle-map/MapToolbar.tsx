import { useTranslation } from 'react-i18next';
import { MousePointer2, Box, Mountain, Eraser, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { MapTool } from './BattleMapGrid';
import type { ObjectHeight, TerrainKind } from '@/types/battle-map';

export interface ObjectDraft {
  breakable: boolean;
  height: ObjectHeight;
}

interface MapToolbarProps {
  tool: MapTool;
  onToolChange: (tool: MapTool) => void;
  objectDraft: ObjectDraft;
  onObjectDraftChange: (draft: ObjectDraft) => void;
  terrainKind: TerrainKind;
  onTerrainKindChange: (kind: TerrainKind) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onClear: () => void;
}

const TOOLS: {
  id: MapTool;
  icon: typeof Box;
  labelKey: 'battleMap.tools.select' | 'battleMap.tools.object' | 'battleMap.tools.terrain' | 'battleMap.tools.erase';
}[] = [
  { id: 'select', icon: MousePointer2, labelKey: 'battleMap.tools.select' },
  { id: 'object', icon: Box, labelKey: 'battleMap.tools.object' },
  { id: 'terrain', icon: Mountain, labelKey: 'battleMap.tools.terrain' },
  { id: 'erase', icon: Eraser, labelKey: 'battleMap.tools.erase' },
];

const TERRAIN_KINDS: {
  id: TerrainKind;
  labelKey: 'battleMap.terrain.wall' | 'battleMap.terrain.difficult' | 'battleMap.terrain.water';
}[] = [
  { id: 'wall', labelKey: 'battleMap.terrain.wall' },
  { id: 'difficult', labelKey: 'battleMap.terrain.difficult' },
  { id: 'water', labelKey: 'battleMap.terrain.water' },
];

export function MapToolbar({
  tool,
  onToolChange,
  objectDraft,
  onObjectDraftChange,
  terrainKind,
  onTerrainKindChange,
  zoom,
  onZoomChange,
  onClear,
}: MapToolbarProps) {
  const { t } = useTranslation('common');

  return (
    <div className="bg-card border rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-bold text-foreground">{t('battleMap.toolbarTitle')}</h3>

      <div className="grid grid-cols-2 gap-2">
        {TOOLS.map(({ id, icon: Icon, labelKey }) => (
          <Button
            key={id}
            variant={tool === id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange(id)}
            className="justify-start gap-2 text-xs"
          >
            <Icon className="size-3.5" /> {t(labelKey)}
          </Button>
        ))}
      </div>

      {tool === 'object' && (
        <div className="space-y-3 border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">{t('battleMap.object.breakable')}</span>
            <Switch
              checked={objectDraft.breakable}
              onCheckedChange={(v: boolean) => onObjectDraftChange({ ...objectDraft, breakable: v })}
            />
          </div>
          <div className="flex items-center gap-2">
            {(['short', 'tall'] as const).map((h) => (
              <Button
                key={h}
                variant={objectDraft.height === h ? 'default' : 'outline'}
                size="sm"
                onClick={() => onObjectDraftChange({ ...objectDraft, height: h })}
                className="flex-1 text-xs"
              >
                {t(h === 'short' ? 'battleMap.object.short' : 'battleMap.object.tall')}
              </Button>
            ))}
          </div>
        </div>
      )}

      {tool === 'terrain' && (
        <div className="space-y-2 border-t pt-3">
          <span className="text-xs font-semibold text-muted-foreground">{t('battleMap.terrain.label')}</span>
          <div className="flex flex-col gap-1.5">
            {TERRAIN_KINDS.map(({ id, labelKey }) => (
              <Button
                key={id}
                variant={terrainKind === id ? 'default' : 'outline'}
                size="sm"
                onClick={() => onTerrainKindChange(id)}
                className="justify-start text-xs"
              >
                {t(labelKey)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-xs font-semibold text-muted-foreground">{t('battleMap.zoom')}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onZoomChange(Math.max(0.5, zoom - 0.25))}
            className="size-8 p-0"
          >
            <ZoomOut className="size-3.5" />
          </Button>
          <span className="text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onZoomChange(Math.min(2, zoom + 0.25))}
            className="size-8 p-0"
          >
            <ZoomIn className="size-3.5" />
          </Button>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onClear}
        className={cn('w-full gap-2 text-xs text-destructive hover:bg-destructive/10')}
      >
        <Trash2 className="size-3.5" /> {t('battleMap.clearMap')}
      </Button>
    </div>
  );
}
