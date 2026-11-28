import { activeCustomModifiers, customItemName, getItemNotes } from '@/lib/custom-items';

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

describe('activeCustomModifiers', () => {
  const mod = (id: string, enabled: boolean, itemId?: string) => ({ id, label: id, enabled, itemId, grants: [] });
  it('keeps enabled modifiers, dropping those whose item is not equipped', () => {
    const mods = [
      mod('free', true),
      mod('off', false),
      mod('worn', true, 'custom-belt'),
      mod('stowed', true, 'custom-ring'),
    ];
    expect(activeCustomModifiers(mods, ['custom-belt']).map((m) => m.id)).toEqual(['free', 'worn']);
  });
});
