import { useTranslation } from 'react-i18next';
import { customItemName, getItemNotes } from '@/lib/custom-items';
import type { CustomModifier } from '@/types/database';

/** Equipped custom items and their effect notes, shown in combat so homebrew effects aren't forgotten. */
export function ItemRemindersPanel({
  itemsData,
  modifiers = [],
}: {
  itemsData: ReadonlyArray<{ id: string; item_id: string; equipped?: boolean; source?: unknown }>;
  modifiers?: readonly CustomModifier[];
}) {
  const { t: tc } = useTranslation('common');
  const reminders = itemsData.filter((item) => item.equipped && item.item_id.startsWith('custom-'));
  if (reminders.length === 0) return null;

  return (
    <div className="bg-card border rounded-lg p-4" data-testid="item-reminders-panel">
      <h2 className="text-sm font-bold text-foreground mb-2">{tc('characterSheet.sections.itemReminders')}</h2>
      <ul className="space-y-2 text-xs">
        {reminders.map((item) => {
          const notes = getItemNotes(item.source);
          const applied = modifiers.filter((m) => m.enabled && m.itemId === item.item_id);
          return (
            <li key={item.id}>
              <span className="font-semibold text-foreground">{customItemName(item.item_id)}</span>
              {applied.length > 0 && <span className="text-primary"> — {applied.map((m) => m.label).join(', ')}</span>}
              {notes && <p className="text-muted-foreground whitespace-pre-line">{notes}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
