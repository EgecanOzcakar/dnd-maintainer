import { z } from 'zod';
import { GRID_SIZE, type BattleMap } from '@/types/battle-map';

/** Cell key helpers — terrain is stored as a `"x,y" -> kind` map. */
export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseCellKey(key: string): { x: number; y: number } {
  const [x, y] = key.split(',').map((n) => Number.parseInt(n, 10));
  return { x, y };
}

/** Clamp a coordinate into the valid grid range. */
export function clampToGrid(n: number, max: number = GRID_SIZE): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max - 1, Math.round(n)));
}

export function createEmptyMap(name = 'Untitled Map'): BattleMap {
  return {
    id: crypto.randomUUID(),
    name,
    gridWidth: GRID_SIZE,
    gridHeight: GRID_SIZE,
    objects: [],
    tokens: [],
    terrain: {},
    updatedAt: new Date().toISOString(),
  };
}

/** Is any object or token already sitting on this cell? */
export function isCellOccupied(map: BattleMap, x: number, y: number): boolean {
  return map.objects.some((o) => o.x === x && o.y === y) || map.tokens.some((tk) => tk.x === x && tk.y === y);
}

const coord = z
  .number()
  .int()
  .min(0)
  .max(GRID_SIZE - 1);

const mapObjectSchema = z.object({
  id: z.string(),
  x: coord,
  y: coord,
  label: z.string(),
  breakable: z.boolean(),
  height: z.enum(['short', 'tall']),
  destroyed: z.boolean(),
});

const mapTokenSchema = z.object({
  id: z.string(),
  x: coord,
  y: coord,
  kind: z.enum(['pc', 'enemy']),
  name: z.string(),
  characterId: z.string().optional(),
  portraitUrl: z.string().nullable().optional(),
  color: z.string().optional(),
});

export const battleMapSchema = z.object({
  id: z.string(),
  name: z.string(),
  gridWidth: z.number().int().positive(),
  gridHeight: z.number().int().positive(),
  objects: z.array(mapObjectSchema),
  tokens: z.array(mapTokenSchema),
  terrain: z.record(z.string(), z.enum(['wall', 'difficult', 'water'])),
  updatedAt: z.string(),
});

/** Parse + validate a battle map from a JSON string. Throws on malformed input. */
export function parseBattleMapJson(text: string): BattleMap {
  const raw: unknown = JSON.parse(text);
  return battleMapSchema.parse(raw) as BattleMap;
}

/** Pretty-printed JSON for file download. */
export function serializeBattleMap(map: BattleMap): string {
  return JSON.stringify(map, null, 2);
}
