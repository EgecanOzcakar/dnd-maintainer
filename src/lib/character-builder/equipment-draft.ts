// The buy-with-gold cart and equipment mode are not stored in the draft rows (they only
// materialize at finalize), so a reload used to lose them. Keep a copy in localStorage keyed
// by the draft's character id.

export interface EquipmentDraft {
  readonly mode: 'starting-equipment' | 'buy-with-gold';
  readonly startingGold: number;
  readonly items: readonly { itemId: string; quantity: number; costGp: number }[];
}

const keyFor = (characterId: string) => `dnd-builder-equipment:${characterId}`;

function isItem(x: unknown): x is EquipmentDraft['items'][number] {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.itemId === 'string' &&
    typeof o.quantity === 'number' &&
    o.quantity > 0 &&
    typeof o.costGp === 'number' &&
    o.costGp >= 0
  );
}

export function parseEquipmentDraft(raw: string | null): EquipmentDraft | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (o.mode !== 'starting-equipment' && o.mode !== 'buy-with-gold') return null;
    if (typeof o.startingGold !== 'number' || !Array.isArray(o.items) || !o.items.every(isItem)) return null;
    return { mode: o.mode, startingGold: o.startingGold, items: o.items };
  } catch {
    return null;
  }
}

export function loadEquipmentDraft(characterId: string | undefined): EquipmentDraft | null {
  if (!characterId) return null;
  try {
    return parseEquipmentDraft(localStorage.getItem(keyFor(characterId)));
  } catch {
    return null;
  }
}

export function saveEquipmentDraft(characterId: string, draft: EquipmentDraft): void {
  try {
    localStorage.setItem(keyFor(characterId), JSON.stringify(draft));
  } catch {
    // Storage unavailable (private mode / quota): the cart simply isn't persisted.
  }
}

export function clearEquipmentDraft(characterId: string | undefined): void {
  if (!characterId) return;
  try {
    localStorage.removeItem(keyFor(characterId));
  } catch {
    // ignore
  }
}
