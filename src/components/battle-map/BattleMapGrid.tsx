import { useCallback, useMemo, useRef, useState } from 'react';
import { Box, Skull, Trees, Waves, Square } from 'lucide-react';
import { clampToGrid } from '@/lib/battle-map';
import type { BattleMap, MapObject, MapToken, TerrainKind } from '@/types/battle-map';
import { cn } from '@/lib/utils';

export type MapTool = 'select' | 'object' | 'terrain' | 'erase';

export interface EntityRef {
  type: 'object' | 'token';
  id: string;
}

const BASE_CELL = 44;

const TERRAIN_STYLES: Record<TerrainKind, string> = {
  wall: 'bg-stone-500/70',
  difficult: 'bg-amber-600/30',
  water: 'bg-sky-500/40',
};

const TERRAIN_ICON: Record<TerrainKind, typeof Square> = {
  wall: Square,
  difficult: Trees,
  water: Waves,
};

interface BattleMapGridProps {
  map: BattleMap;
  readOnly?: boolean;
  tool?: MapTool;
  zoom?: number;
  onCellAction?: (x: number, y: number) => void;
  onMoveEntity?: (entity: EntityRef, x: number, y: number) => void;
  onEntityClick?: (entity: EntityRef) => void;
}

export function BattleMapGrid({
  map,
  readOnly = false,
  tool = 'select',
  zoom = 1,
  onCellAction,
  onMoveEntity,
  onEntityClick,
}: BattleMapGridProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const cell = BASE_CELL * zoom;
  const width = map.gridWidth * cell;
  const height = map.gridHeight * cell;

  const [drag, setDrag] = useState<{ entity: EntityRef; x: number; y: number } | null>(null);
  // While the pointer is held down with a paint tool (object / terrain / erase), we fill
  // every cell it passes over. `last` de-dupes repeated events on the same cell.
  const painting = useRef<{ last: string | null } | null>(null);

  const cellFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const rect = surfaceRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const x = clampToGrid(Math.floor((clientX - rect.left) / cell), map.gridWidth);
      const y = clampToGrid(Math.floor((clientY - rect.top) / cell), map.gridHeight);
      return { x, y };
    },
    [cell, map.gridWidth, map.gridHeight]
  );

  const paintAt = useCallback(
    (clientX: number, clientY: number) => {
      if (readOnly || !onCellAction || !painting.current) return;
      const pos = cellFromEvent(clientX, clientY);
      if (!pos) return;
      const key = `${pos.x},${pos.y}`;
      if (painting.current.last === key) return;
      painting.current.last = key;
      onCellAction(pos.x, pos.y);
    },
    [readOnly, onCellAction, cellFromEvent]
  );

  const startPaintOrDrag = (entity?: EntityRef) => (e: React.PointerEvent) => {
    if (readOnly) return;
    if (entity) e.stopPropagation();

    if (tool === 'select') {
      if (!entity) return;
      const pos = cellFromEvent(e.clientX, e.clientY);
      setDrag(pos ? { entity, ...pos } : null);
      return;
    }

    // Paint tools: begin a drag-fill starting on the pressed cell.
    surfaceRef.current?.setPointerCapture?.(e.pointerId);
    painting.current = { last: null };
    paintAt(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (painting.current) {
      paintAt(e.clientX, e.clientY);
      return;
    }
    if (!drag) return;
    const pos = cellFromEvent(e.clientX, e.clientY);
    if (pos && (pos.x !== drag.x || pos.y !== drag.y)) setDrag({ ...drag, ...pos });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    painting.current = null;
    if (!drag) return;
    const pos = cellFromEvent(e.clientX, e.clientY);
    if (pos) onMoveEntity?.(drag.entity, pos.x, pos.y);
    setDrag(null);
  };

  const handleEntityClick = (entity: EntityRef) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly || tool !== 'select') return;
    onEntityClick?.(entity);
  };

  const terrainCells = useMemo(() => Object.entries(map.terrain), [map.terrain]);

  const posOf = (entity: EntityRef, fallbackX: number, fallbackY: number) =>
    drag && drag.entity.type === entity.type && drag.entity.id === entity.id
      ? { x: drag.x, y: drag.y }
      : { x: fallbackX, y: fallbackY };

  return (
    <div className="overflow-auto rounded-lg border bg-muted/20 max-h-[70vh]">
      <div
        ref={surfaceRef}
        onPointerDown={startPaintOrDrag()}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn('relative select-none', !readOnly && tool !== 'select' && 'cursor-crosshair')}
        style={{
          width,
          height,
          backgroundImage:
            'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)',
          backgroundSize: `${cell}px ${cell}px`,
        }}
      >
        {terrainCells.map(([key, kind]) => {
          const [x, y] = key.split(',').map(Number);
          const Icon = TERRAIN_ICON[kind];
          return (
            <div
              key={`terrain-${key}`}
              className={cn('absolute flex items-center justify-center', TERRAIN_STYLES[kind])}
              style={{ left: x * cell, top: y * cell, width: cell, height: cell }}
            >
              <Icon className="size-3 text-foreground/50" />
            </div>
          );
        })}

        {map.objects.map((obj: MapObject) => {
          const entity: EntityRef = { type: 'object', id: obj.id };
          const { x, y } = posOf(entity, obj.x, obj.y);
          return (
            <div
              key={obj.id}
              title={`${obj.label}${obj.breakable ? '' : ' (unbreakable)'} · ${obj.height}`}
              onPointerDown={startPaintOrDrag(entity)}
              onClick={handleEntityClick(entity)}
              className={cn(
                'absolute flex items-center justify-center border',
                obj.height === 'tall' ? 'bg-orange-700/70 border-orange-900' : 'bg-orange-400/50 border-orange-600',
                obj.breakable ? 'rounded-sm border-dashed' : 'rounded-none',
                obj.destroyed && 'opacity-30 line-through',
                !readOnly && tool === 'select' && 'cursor-grab active:cursor-grabbing'
              )}
              style={{ left: x * cell + 2, top: y * cell + 2, width: cell - 4, height: cell - 4 }}
            >
              {obj.height === 'tall' ? <Box className="size-3.5" /> : <Square className="size-3" />}
            </div>
          );
        })}

        {map.tokens.map((tk: MapToken) => {
          const entity: EntityRef = { type: 'token', id: tk.id };
          const { x, y } = posOf(entity, tk.x, tk.y);
          const initials = tk.name.slice(0, 2).toUpperCase();
          return (
            <div
              key={tk.id}
              title={tk.name}
              onPointerDown={startPaintOrDrag(entity)}
              onClick={handleEntityClick(entity)}
              className={cn(
                'absolute flex items-center justify-center rounded-full border-2 text-xs font-bold overflow-hidden shadow',
                tk.kind === 'pc'
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-100'
                  : 'border-rose-600 bg-rose-600/30 text-rose-50',
                !readOnly && tool === 'select' && 'cursor-grab active:cursor-grabbing'
              )}
              style={{
                left: x * cell + 2,
                top: y * cell + 2,
                width: cell - 4,
                height: cell - 4,
                borderColor: tk.color,
              }}
            >
              {tk.portraitUrl ? (
                <img src={tk.portraitUrl} alt={tk.name} className="size-full object-cover" />
              ) : tk.kind === 'enemy' ? (
                <Skull className="size-4" />
              ) : (
                initials
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
