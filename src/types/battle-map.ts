/** Fixed tactical grid dimensions (30x30 squares). */
export const GRID_SIZE = 30;

/** Object height categories — affects line-of-sight / cover semantics for the DM. */
export type ObjectHeight = 'short' | 'tall';

/** Paintable terrain overlays keyed by cell. */
export type TerrainKind = 'wall' | 'difficult' | 'water';

/** A single-cell object placed on the map. */
export interface MapObject {
  id: string;
  x: number;
  y: number;
  label: string;
  /** Breakable objects can be toggled to `destroyed`; unbreakable ones cannot. */
  breakable: boolean;
  height: ObjectHeight;
  destroyed: boolean;
}

/** A movable token representing a player character or an enemy. */
export interface MapToken {
  id: string;
  x: number;
  y: number;
  kind: 'pc' | 'enemy';
  name: string;
  /** Set for `pc` tokens sourced from the campaign roster. */
  characterId?: string;
  portraitUrl?: string | null;
  /** Hex colour used for the enemy disc / PC ring. */
  color?: string;
}

export interface BattleMap {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  objects: MapObject[];
  tokens: MapToken[];
  /** Cell key (`"x,y"`) -> terrain kind. */
  terrain: Record<string, TerrainKind>;
  updatedAt: string;
}

/** What the DM is currently broadcasting to players on the DM Control page. */
export type DisplayMode = 'image' | 'map';
