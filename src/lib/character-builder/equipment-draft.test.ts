import { describe, expect, it } from 'vitest';
import {
  clearEquipmentDraft,
  loadEquipmentDraft,
  parseEquipmentDraft,
  saveEquipmentDraft,
} from '@/lib/character-builder/equipment-draft';

const draft = {
  mode: 'buy-with-gold',
  startingGold: 155,
  items: [{ itemId: 'rope', quantity: 2, costGp: 1 }],
} as const;

describe('equipment draft storage', () => {
  it('round-trips a saved draft and clears it', () => {
    saveEquipmentDraft('abc', draft);
    expect(loadEquipmentDraft('abc')).toEqual(draft);
    clearEquipmentDraft('abc');
    expect(loadEquipmentDraft('abc')).toBeNull();
  });

  it.each([
    null,
    '',
    'not json',
    '{"mode":"x","startingGold":1,"items":[]}',
    '{"mode":"buy-with-gold","startingGold":1,"items":[{}]}',
  ])('rejects malformed payload %j', (raw) => {
    expect(parseEquipmentDraft(raw)).toBeNull();
  });

  it('returns null without an id', () => {
    expect(loadEquipmentDraft(undefined)).toBeNull();
  });
});
