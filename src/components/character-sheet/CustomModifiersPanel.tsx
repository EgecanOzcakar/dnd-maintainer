import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { describeGrant, suggestModifiers, type ModifierSuggestion } from '@/lib/modifier-suggestions';
import { MAGIC_ITEM_CATALOG } from '@/lib/sources/magic-items';
import { ROLL_TARGETS, type Grant, type RollModifierGrant } from '@/types/grants';
import { ABILITY_KEYS, DND_SKILLS, type SkillId } from '@/lib/dnd-helpers';
import type { AbilityKey } from '@/types/database';
import type { CustomModifier } from '@/types/database';
import { customItemName, getItemNotes } from '@/lib/custom-items';
import { getItemDef, getItemNameKey } from '@/lib/sources/items';
import { getMagicItemDef } from '@/lib/sources/magic-items';

interface Props {
  readonly modifiers?: readonly CustomModifier[];
  readonly onChange: (next: readonly CustomModifier[]) => void;
  /** The character's inventory, so a modifier can be tied to an item and follow its equipped state. */
  readonly items?: ReadonlyArray<{ readonly item_id: string; readonly equipped?: boolean; readonly source?: unknown }>;
}

const newId = () => crypto.randomUUID();

/**
 * Item and custom bonuses (saves, checks, attacks, damage, AC, ...). Add one by hand, or paste an item
 * description and approve the modifiers detected in it — nothing applies until the player ticks it.
 */
export function CustomModifiersPanel({ modifiers = [], onChange, items = [] }: Props) {
  const { t: tc } = useTranslation('common');
  const { t: tg } = useTranslation('gamedata');
  const itemName = (id: string) => {
    const def = getItemDef(id);
    if (def) return tg(getItemNameKey(def.type, id), { defaultValue: id });
    return getMagicItemDef(id)?.name ?? customItemName(id);
  };
  const itemIds = [...new Set(items.map((i) => i.item_id))];
  const isEquipped = (id: string) => items.some((i) => i.item_id === id && i.equipped);
  const [itemId, setItemId] = useState('');
  const [source, setSource] = useState('');
  const [text, setText] = useState('');
  const [found, setFound] = useState<readonly ModifierSuggestion[] | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set());
  const [manual, setManual] = useState({ target: 'save', value: '', mode: '', ability: '', skill: '' });
  const isAc = manual.target === 'ac';
  const isAbility = manual.target === 'ability';
  // Ability/skill narrowing only reaches saves and checks (see applyEffects).
  const narrowable = manual.target === 'save' || manual.target === 'check';
  const link = itemId ? { itemId } : {};
  const pickLinkedItem = (id: string) => {
    setItemId(id);
    if (!id) return;
    pickItem(getMagicItemDef(id)?.name ?? itemName(id));
    const notes = getItemNotes(items.find((i) => i.item_id === id)?.source);
    if (notes) setText(notes);
  };

  const pickItem = (name: string) => {
    setSource(name);
    const item = MAGIC_ITEM_CATALOG.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (item) setText(item.description);
  };
  const detect = () => {
    const list = suggestModifiers(text, source || undefined);
    setFound(list);
    setPicked(new Set(list.map((_, i) => i)));
  };
  const addPicked = () => {
    const chosen = (found ?? []).filter((_, i) => picked.has(i));
    onChange([
      ...modifiers,
      ...chosen.map((s) => ({
        id: newId(),
        label: s.label,
        source: source || undefined,
        ...link,
        enabled: true,
        grants: s.grants,
      })),
    ]);
    setFound(null);
    setText('');
    setSource('');
  };
  const addManual = () => {
    const value = manual.value.trim();
    let grant: Grant;
    if (isAc || isAbility) {
      const bonus = Number(value.replace(/^\+/, ''));
      if (!bonus) return;
      if (isAbility) {
        if (!manual.ability) return;
        grant = { type: 'ability-bonus', ability: manual.ability as AbilityKey, bonus };
      } else {
        grant = { type: 'ac-bonus', bonus };
      }
    } else {
      if (!value && !manual.mode) return;
      grant = {
        type: 'roll-modifier',
        target: manual.target as RollModifierGrant['target'],
        ...(narrowable && manual.ability ? { abilities: [manual.ability as AbilityKey] } : {}),
        ...(manual.target === 'check' && manual.skill ? { skills: [manual.skill as SkillId] } : {}),
        ...(manual.mode ? { mode: manual.mode as 'adv' | 'dis' } : {}),
        ...(/d/i.test(value) ? { dice: value.startsWith('-') ? value : `+${value.replace(/^\+/, '')}` } : {}),
        ...(value && !/d/i.test(value) ? { bonus: Number(value) || 0 } : {}),
        ...(source ? { label: source } : {}),
      };
    }
    onChange([
      ...modifiers,
      {
        id: newId(),
        label: describeGrant(grant),
        source: source || undefined,
        ...link,
        enabled: true,
        grants: [grant],
      },
    ]);
    setManual({ ...manual, value: '', mode: '' });
  };
  const update = (id: string, patch: Partial<CustomModifier>) =>
    onChange(modifiers.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  return (
    <div className="bg-card border rounded-lg p-4 mb-4" data-testid="custom-modifiers-panel">
      <h2 className="text-lg font-bold text-foreground">{tc('customModifiers.title')}</h2>
      <p className="text-xs text-muted-foreground mb-3">{tc('customModifiers.hint')}</p>

      {modifiers.length === 0 && <p className="text-sm text-muted-foreground mb-3">{tc('customModifiers.empty')}</p>}
      <ul className="space-y-1 mb-4">
        {modifiers.map((m) => (
          <li key={m.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={m.enabled}
              aria-label={tc('customModifiers.toggle', { name: m.label })}
              onChange={(e) => update(m.id, { enabled: e.target.checked })}
            />
            <span className="flex-1">
              {m.label}
              {m.source && <span className="text-muted-foreground"> — {m.source}</span>}
              {m.itemId && !isEquipped(m.itemId) && (
                <span className="text-xs text-muted-foreground"> ({tc('customModifiers.notEquipped')})</span>
              )}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={tc('customModifiers.remove', { name: m.label })}
              onClick={() => onChange(modifiers.filter((x) => x.id !== m.id))}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        {itemIds.length > 0 && (
          <select
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            aria-label={tc('customModifiers.linkedItem')}
            value={itemId}
            onChange={(e) => pickLinkedItem(e.target.value)}
          >
            <option value="">{tc('customModifiers.noLinkedItem')}</option>
            {itemIds.map((id) => (
              <option key={id} value={id}>
                {itemName(id)}
              </option>
            ))}
          </select>
        )}
        <Input
          list="custom-modifier-items"
          value={source}
          placeholder={tc('customModifiers.sourcePlaceholder')}
          aria-label={tc('customModifiers.source')}
          onChange={(e) => pickItem(e.target.value)}
        />
        <datalist id="custom-modifier-items">
          {MAGIC_ITEM_CATALOG.map((i) => (
            <option key={i.id} value={i.name} />
          ))}
        </datalist>
        <Textarea
          value={text}
          rows={3}
          placeholder={tc('customModifiers.textPlaceholder')}
          aria-label={tc('customModifiers.text')}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="button" size="sm" variant="outline" disabled={!text.trim()} onClick={detect}>
          {tc('customModifiers.detect')}
        </Button>

        {found && (
          <div className="border rounded p-2 space-y-1">
            {found.length === 0 && <p className="text-sm text-muted-foreground">{tc('customModifiers.noneFound')}</p>}
            {found.map((s, i) => (
              <label key={i} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={picked.has(i)}
                  onChange={(e) =>
                    setPicked((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(i);
                      else next.delete(i);
                      return next;
                    })
                  }
                />
                <span>
                  <strong>{s.label}</strong>
                  <span className="block text-xs text-muted-foreground">{s.snippet}</span>
                </span>
              </label>
            ))}
            {found.length > 0 && (
              <Button type="button" size="sm" disabled={picked.size === 0} onClick={addPicked}>
                {tc('customModifiers.addApproved')}
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            aria-label={tc('customModifiers.target')}
            value={manual.target}
            onChange={(e) => setManual({ ...manual, target: e.target.value })}
          >
            {ROLL_TARGETS.map((target) => (
              <option key={target} value={target}>
                {tc(`customModifiers.targets.${target}`)}
              </option>
            ))}
            <option value="ac">{tc('customModifiers.targets.ac')}</option>
            <option value="ability">{tc('customModifiers.targets.ability')}</option>
          </select>
          {(narrowable || isAbility) && (
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              aria-label={tc('customModifiers.ability')}
              value={manual.ability}
              onChange={(e) => setManual({ ...manual, ability: e.target.value })}
            >
              <option value="">{tc(isAbility ? 'customModifiers.pickAbility' : 'customModifiers.anyAbility')}</option>
              {ABILITY_KEYS.map((a) => (
                <option key={a} value={a}>
                  {tg(`abilities.${a}`)}
                </option>
              ))}
            </select>
          )}
          {manual.target === 'check' && (
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              aria-label={tc('customModifiers.skill')}
              value={manual.skill}
              onChange={(e) => setManual({ ...manual, skill: e.target.value })}
            >
              <option value="">{tc('customModifiers.anySkill')}</option>
              {DND_SKILLS.map((sk) => (
                <option key={sk.id} value={sk.id}>
                  {tg(`skills.${sk.id}`)}
                </option>
              ))}
            </select>
          )}
          <Input
            className="w-24"
            value={manual.value}
            placeholder={isAc || isAbility ? '+1' : '+1 / 1d4'}
            aria-label={tc('customModifiers.value')}
            onChange={(e) => setManual({ ...manual, value: e.target.value })}
          />
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-50"
            disabled={isAc || isAbility}
            aria-label={tc('customModifiers.mode')}
            value={manual.mode}
            onChange={(e) => setManual({ ...manual, mode: e.target.value })}
          >
            <option value="">{tc('customModifiers.noMode')}</option>
            <option value="adv">{tc('customModifiers.adv')}</option>
            <option value="dis">{tc('customModifiers.dis')}</option>
          </select>
          <Button type="button" size="sm" variant="outline" onClick={addManual}>
            {tc('customModifiers.add')}
          </Button>
        </div>
      </div>
    </div>
  );
}
