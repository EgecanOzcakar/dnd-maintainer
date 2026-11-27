import { customItemName, getItemNotes } from '@/lib/custom-items';

describe('customItemName', () => {
  it.each([
    ['custom-kara-avuc', 'Kara Avuc'],
    ['custom-nasirsiniz-eldiven--1-dex-check', 'Nasirsiniz Eldiven -1 Dex Check'],
    ['custom-cepli-bandolier-+-no-action-potion', 'Cepli Bandolier + No Action Potion'],
    ['custom-hp-spell---level-slot,-ve', 'Hp Spell - Level Slot, Ve'],
  ])('%s → %s', (id, name) => expect(customItemName(id)).toBe(name));
});

describe('getItemNotes', () => {
  it.each([
    [{ origin: 'loot', description: 'x', notes: 'adv once' }, 'adv once'],
    [{ origin: 'loot', description: 'x' }, ''],
    [null, ''],
  ])('%j → %j', (source, notes) => expect(getItemNotes(source)).toBe(notes));
});
