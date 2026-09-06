import { describe, it, expect } from 'vitest';
import {
  cellKey,
  parseCellKey,
  clampToGrid,
  createEmptyMap,
  isCellOccupied,
  parseBattleMapJson,
  serializeBattleMap,
} from '@/lib/battle-map';
import { GRID_SIZE, type BattleMap } from '@/types/battle-map';

describe('battle-map helpers', () => {
  it('round-trips cell keys', () => {
    expect(cellKey(3, 7)).toBe('3,7');
    expect(parseCellKey('3,7')).toEqual({ x: 3, y: 7 });
  });

  it.each([
    [-5, 0],
    [0, 0],
    [10, 10],
    [GRID_SIZE - 1, GRID_SIZE - 1],
    [GRID_SIZE + 10, GRID_SIZE - 1],
    [Number.NaN, 0],
  ])('clampToGrid(%s) -> %s', (input, expected) => {
    expect(clampToGrid(input)).toBe(expected);
  });

  it('creates an empty grid-sized map', () => {
    const map = createEmptyMap('Cave');
    expect(map).toMatchObject({
      name: 'Cave',
      gridWidth: GRID_SIZE,
      gridHeight: GRID_SIZE,
      objects: [],
      tokens: [],
      terrain: {},
    });
    expect(map.id).toEqual(expect.any(String));
  });

  it('detects occupied cells', () => {
    const map = createEmptyMap();
    map.objects.push({ id: 'o1', x: 2, y: 2, label: 'Crate', breakable: true, height: 'short', destroyed: false });
    expect(isCellOccupied(map, 2, 2)).toBe(true);
    expect(isCellOccupied(map, 5, 5)).toBe(false);
  });

  it('serializes and parses a valid map', () => {
    const map = createEmptyMap('Bridge');
    map.tokens.push({ id: 't1', x: 1, y: 1, kind: 'enemy', name: 'Goblin', color: '#e11d48' });
    map.terrain[cellKey(0, 0)] = 'water';

    const parsed = parseBattleMapJson(serializeBattleMap(map));
    expect(parsed).toEqual(map);
  });

  it('rejects malformed JSON', () => {
    expect(() => parseBattleMapJson('{ not json')).toThrow();
  });

  it('rejects out-of-range coordinates', () => {
    const bad = {
      ...createEmptyMap(),
      objects: [{ id: 'o', x: 999, y: 0, label: '', breakable: true, height: 'short', destroyed: false }],
    } as BattleMap;
    expect(() => parseBattleMapJson(JSON.stringify(bad))).toThrow();
  });
});
