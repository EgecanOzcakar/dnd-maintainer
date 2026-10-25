import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useBattleMap, useUpdateBattleMap } from '@/hooks/useBattleMap';
import { cellKey, createEmptyMap, findFreeCell, isCellOccupied } from '@/lib/battle-map';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import type { BattleMap, MapToken } from '@/types/battle-map';
import { BattleMapGrid, type EntityRef, type MapTool } from './BattleMapGrid';
import { MapToolbar, type ObjectDraft } from './MapToolbar';
import { TokenPalette } from './TokenPalette';
import { MapFileControls } from './MapFileControls';

const AUTOSAVE_MS = 700;

interface BattleMapEditorProps {
  campaignId: string;
}

export function BattleMapEditor({ campaignId }: BattleMapEditorProps) {
  const { t } = useTranslation('common');
  const { data } = useBattleMap(campaignId);
  const updateMap = useUpdateBattleMap();

  const [map, setMap] = useState<BattleMap | null>(null);
  const [tool, setTool] = useState<MapTool>('select');
  const [objectDraft, setObjectDraft] = useState<ObjectDraft>({ breakable: true, height: 'short' });
  const [terrainKind, setTerrainKind] = useState<'wall' | 'difficult' | 'water'>('wall');
  const [zoom, setZoom] = useState(1);

  // Destructive actions (clear / import) wait for confirmation; the last one can be undone.
  const [pendingAction, setPendingAction] = useState<{ type: 'clear' } | { type: 'import'; map: BattleMap } | null>(
    null
  );

  const seeded = useRef(false);
  const save = useDebouncedSave<{ map: BattleMap }>(
    ({ map: next }) => updateMap.mutate({ campaignId, map: next }),
    AUTOSAVE_MS
  );

  // Seed the working copy once from the persisted map (or a fresh empty one).
  useEffect(() => {
    if (seeded.current || data === undefined) return;
    seeded.current = true;
    setMap(data.map ?? createEmptyMap(t('battleMap.defaultName')));
  }, [data, t]);

  const persist = save.schedule;

  const mutate = useCallback(
    (fn: (prev: BattleMap) => BattleMap) => {
      setMap((prev) => {
        if (!prev) return prev;
        const result = fn(prev);
        if (result === prev) return prev;
        const next = { ...result, updatedAt: new Date().toISOString() };
        persist({ map: next });
        return next;
      });
    },
    [persist]
  );

  if (!map) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const handleCellAction = (x: number, y: number) => {
    if (tool === 'object') {
      mutate((prev) =>
        isCellOccupied(prev, x, y)
          ? prev
          : {
              ...prev,
              objects: [
                ...prev.objects,
                {
                  id: crypto.randomUUID(),
                  x,
                  y,
                  label: t('battleMap.object.defaultLabel'),
                  breakable: objectDraft.breakable,
                  height: objectDraft.height,
                  destroyed: false,
                },
              ],
            }
      );
    } else if (tool === 'terrain') {
      mutate((prev) => ({ ...prev, terrain: { ...prev.terrain, [cellKey(x, y)]: terrainKind } }));
    } else if (tool === 'erase') {
      mutate((prev) => {
        const terrain = { ...prev.terrain };
        delete terrain[cellKey(x, y)];
        return {
          ...prev,
          terrain,
          objects: prev.objects.filter((o) => o.x !== x || o.y !== y),
          tokens: prev.tokens.filter((tk) => tk.x !== x || tk.y !== y),
        };
      });
    }
  };

  const handleMoveEntity = (entity: EntityRef, x: number, y: number) => {
    mutate((prev) =>
      entity.type === 'object'
        ? { ...prev, objects: prev.objects.map((o) => (o.id === entity.id ? { ...o, x, y } : o)) }
        : { ...prev, tokens: prev.tokens.map((tk) => (tk.id === entity.id ? { ...tk, x, y } : tk)) }
    );
  };

  const handleEntityClick = (entity: EntityRef) => {
    if (entity.type !== 'object') return;
    mutate((prev) => ({
      ...prev,
      objects: prev.objects.map((o) => (o.id === entity.id && o.breakable ? { ...o, destroyed: !o.destroyed } : o)),
    }));
  };

  const handleAddToken = (token: Omit<MapToken, 'id' | 'x' | 'y'>) => {
    // Pick the cell from the latest state (not this render's) so several adds in a row don't stack.
    mutate((prev) => {
      const cell = findFreeCell(prev);
      return cell ? { ...prev, tokens: [...prev.tokens, { ...token, id: crypto.randomUUID(), ...cell }] } : prev;
    });
  };

  /** Replace the whole map, offering a one-step undo back to the current one. */
  const replaceMap = (next: BattleMap, message: string) => {
    const previous = map;
    setMap(next);
    persist({ map: next });
    toast.info(message, {
      action: {
        label: t('battleMap.undo'),
        onClick: () => {
          setMap(previous);
          persist({ map: previous });
        },
      },
    });
  };

  const handleConfirmPending = () => {
    if (pendingAction?.type === 'clear') {
      replaceMap(
        { ...map, objects: [], tokens: [], terrain: {}, updatedAt: new Date().toISOString() },
        t('battleMap.cleared')
      );
    } else if (pendingAction?.type === 'import') {
      replaceMap({ ...pendingAction.map, updatedAt: new Date().toISOString() }, t('battleMap.file.importSuccess'));
    }
    setPendingAction(null);
  };

  const handleSaveNow = () => {
    save.cancel();
    updateMap.mutate({ campaignId, map });
    toast.success(t('battleMap.saved'));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <Input
            value={map.name}
            onChange={(e) => mutate((prev) => ({ ...prev, name: e.target.value }))}
            className="h-9 text-sm font-semibold"
          />
          <Button onClick={handleSaveNow} size="sm" className="w-full gap-2 text-xs" disabled={updateMap.isPending}>
            {updateMap.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {t('battleMap.save')}
          </Button>
        </div>
        <MapToolbar
          tool={tool}
          onToolChange={setTool}
          objectDraft={objectDraft}
          onObjectDraftChange={setObjectDraft}
          terrainKind={terrainKind}
          onTerrainKindChange={setTerrainKind}
          zoom={zoom}
          onZoomChange={setZoom}
          onClear={() => setPendingAction({ type: 'clear' })}
        />
        <TokenPalette campaignId={campaignId} tokens={map.tokens} onAddToken={handleAddToken} />
        <MapFileControls map={map} onImport={(imported) => setPendingAction({ type: 'import', map: imported })} />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Trash2 className="size-3" /> {t('battleMap.breakHint')}
        </p>
        <BattleMapGrid
          map={map}
          tool={tool}
          zoom={zoom}
          onCellAction={handleCellAction}
          onMoveEntity={handleMoveEntity}
          onEntityClick={handleEntityClick}
        />
      </div>

      <Dialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.type === 'import' ? t('battleMap.confirmImportTitle') : t('battleMap.confirmClearTitle')}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.type === 'import' ? t('battleMap.confirmImport') : t('battleMap.confirmClear')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingAction(null)}>
              {t('buttons.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmPending}>
              {pendingAction?.type === 'import' ? t('battleMap.file.import') : t('battleMap.clearMap')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
