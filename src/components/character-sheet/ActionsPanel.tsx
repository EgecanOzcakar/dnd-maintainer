import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { RollPreset } from '@/components/character-sheet/roll-preset';
import { HomebrewDialog } from '@/components/character-sheet/HomebrewDialog';
import type { HomebrewAction } from '@/lib/homebrew';
import { getItemNameKey } from '@/lib/sources/items';
import { isSpellId } from '@/lib/sources/spells';
import { SlotAction } from '@/components/character-sheet/SlotAction';
import type { SlotOption } from '@/lib/spell-casting';
import { PoolPips } from '@/components/character-sheet/PoolPips';
import { ActionRolls } from '@/components/character-sheet/ActionRolls';
import type { ResolvedAction } from '@/lib/resolver/actions';
import type { AdjustedAction } from '@/lib/resolver/effects';
import type { ActivationType } from '@/types/actions';
import type { ResolvedCharacter } from '@/types/resolved';

const FILTERS = ['all', 'attack', 'action', 'bonus-action', 'reaction', 'other'] as const;
type Filter = (typeof FILTERS)[number];

/** 2024 PHB actions every creature has, plus the Opportunity Attack reaction. */
const BASIC_ACTIONS = [
  'dash',
  'disengage',
  'dodge',
  'help',
  'hide',
  'influence',
  'magic',
  'ready',
  'search',
  'study',
  'utilize',
] as const;

function matches(filter: Filter, a: { activation: ActivationType; isAttack?: boolean }): boolean {
  if (filter === 'all') return true;
  if (filter === 'attack') return Boolean(a.isAttack);
  if (filter === 'other') return a.activation === 'free' || a.activation === 'special';
  return a.activation === filter;
}

interface ActionsPanelProps {
  readonly actions: readonly AdjustedAction[];
  readonly attacksPerAction: number;
  readonly resolved: ResolvedCharacter;
  readonly onSelectRollPreset?: (preset: RollPreset) => void;
  /** Custom entries behind the homebrew rows; with `onChangeHomebrew`, enables add/edit/delete. */
  readonly homebrew?: readonly HomebrewAction[];
  readonly onChangeHomebrew?: (next: HomebrewAction[]) => void;
  /** Uses spent per resource pool; with `onSetPoolUsed`, pool actions get use pips and a Use button. */
  readonly poolsUsed?: Readonly<Record<string, number>>;
  readonly onSetPoolUsed?: (poolId: string, used: number) => void;
  /** Spell slots a slot-spending action (Divine Smite) can use, and how to spend one. */
  readonly slotOptions?: readonly SlotOption[];
  readonly onSpendSlot?: (slotKey: string) => void;
}

export function ActionsPanel({
  actions,
  attacksPerAction,
  resolved,
  onSelectRollPreset,
  homebrew = [],
  onChangeHomebrew,
  poolsUsed = {},
  onSetPoolUsed,
  slotOptions = [],
  onSpendSlot,
}: ActionsPanelProps) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');
  const [filter, setFilter] = useState<Filter>('all');
  const [dialog, setDialog] = useState<{ entry?: HomebrewAction } | null>(null);

  const poolMax = new Map(resolved.resourcePools.map((p) => [p.poolId, p.max]));
  // Grapple / Shove (Unarmed Strike options): save DC 8 + STR mod + proficiency.
  const unarmedDC = 8 + resolved.abilities.str.modifier + resolved.proficiencyBonus;

  const nameOf = (a: ResolvedAction) => {
    if (a.name) return a.name;
    if (a.kind === 'weapon') return t(getItemNameKey('weapon', a.refId), { defaultValue: a.refId });
    if (a.kind === 'spell') return isSpellId(a.refId) ? t(`spells.${a.refId}.name`) : a.refId;
    // Feat features are named `feat-<id>` and titled under `feats.<id>`.
    const featName = t(`feats.${a.refId.replace(/^feat-/, '')}.name` as `feats.${string}.name`, {
      defaultValue: a.refId,
    });
    return t(`features.${a.refId}.name` as `features.${string}.name`, { defaultValue: featName });
  };

  const visible = actions.filter((a) => matches(filter, a));
  const showBasics = filter === 'all' || filter === 'action';

  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-bold text-foreground">{tc('characterSheet.combatView.sections.actions')}</h2>
        <span className="text-xs text-muted-foreground">
          {tc('characterSheet.combatView.actions.attacksPerAction', { count: attacksPerAction })}
        </span>
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 mb-3">
        {FILTERS.map((f) => (
          <Button
            key={f}
            role="tab"
            aria-selected={filter === f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            className="h-7 px-2 text-xs"
            onClick={() => setFilter(f)}
          >
            {tc(`characterSheet.combatView.actions.filters.${f}`)}
          </Button>
        ))}
      </div>

      {visible.length === 0 && !showBasics && (
        <p className="text-sm text-muted-foreground">{tc('characterSheet.combatView.actions.noOther')}</p>
      )}

      <ul className="divide-y divide-border/40 text-xs">
        {visible.map((a) => {
          const name = nameOf(a);
          const uses = a.poolId ? poolMax.get(a.poolId) : undefined;
          const spent = a.poolId ? (poolsUsed[a.poolId] ?? 0) : 0;
          const track = a.poolId && uses !== undefined && onSetPoolUsed ? a.poolId : null;
          const spend = track ? () => onSetPoolUsed?.(track, Math.min(uses ?? 0, spent + 1)) : undefined;
          // Actions that roll spend a use when rolled; the rest get a Use button.
          const rolls = Boolean(a.damage?.dice.includes('d') || a.heal?.dice.includes('d'));
          return (
            <li key={a.key} className="py-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-foreground mr-auto">
                {name}
                {a.offHand && (
                  <span className="text-muted-foreground"> ({tc('characterSheet.combatView.actions.offHand')})</span>
                )}
              </span>
              <Badge variant="outline" className="text-[10px] py-0">
                {tc(`characterSheet.combatView.actions.activation.${a.activation}`)}
              </Badge>
              {a.mastery && (
                <details className="group open:basis-full order-last">
                  <summary className="cursor-pointer list-none inline-flex">
                    <Badge className="text-[10px] py-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40">
                      {tc('characterSheet.combatView.actions.mastery', {
                        name: t(`weaponMasteries.${a.mastery}.name`),
                      })}
                    </Badge>
                  </summary>
                  <p className="mt-1 text-muted-foreground leading-relaxed">
                    {t(`weaponMasteries.${a.mastery}.description`)}
                  </p>
                </details>
              )}
              {a.spellLevel !== undefined && !a.spendsSlot && (
                <Badge variant="secondary" className="text-[10px] py-0">
                  {a.spellLevel === 0
                    ? tc('characterSheet.combatView.actions.cantrip')
                    : tc('characterSheet.combatView.actions.spellLevel', { level: a.spellLevel })}
                </Badge>
              )}
              {uses !== undefined &&
                (track ? (
                  <PoolPips name={name} max={uses} used={spent} onSetUsed={(n) => onSetPoolUsed?.(track, n)} />
                ) : (
                  <span className="text-muted-foreground">
                    {tc('characterSheet.combatView.actions.uses', { count: uses })}
                  </span>
                ))}
              {track && !rolls && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px]"
                  disabled={spent >= (uses ?? 0)}
                  onClick={spend}
                >
                  {tc('characterSheet.combatView.actions.use')}
                </Button>
              )}
              {a.spendsSlot && onSpendSlot ? (
                <SlotAction
                  action={a}
                  name={name}
                  options={slotOptions}
                  onSpendSlot={onSpendSlot}
                  onSelectRollPreset={onSelectRollPreset}
                />
              ) : (
                <ActionRolls
                  action={a}
                  name={name}
                  onSelectRollPreset={onSelectRollPreset}
                  onUse={rolls ? spend : undefined}
                />
              )}
              {a.usesPerRest && (
                <span className="text-muted-foreground">
                  {tc('homebrew.usesPerRest', {
                    count: a.usesPerRest.max,
                    rest: tc(`homebrew.rest.${a.usesPerRest.rest}`),
                  })}
                </span>
              )}
              {a.homebrewId && onChangeHomebrew && (
                <span className="flex gap-0.5">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={tc('homebrew.edit', { name })}
                    onClick={() => setDialog({ entry: homebrew.find((h) => h.id === a.homebrewId) })}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={tc('homebrew.remove', { name })}
                    onClick={() => onChangeHomebrew(homebrew.filter((h) => h.id !== a.homebrewId))}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {onChangeHomebrew && (
        <Button size="sm" variant="outline" className="mt-3" onClick={() => setDialog({})}>
          <Plus className="size-3" />
          {tc('homebrew.addButton')}
        </Button>
      )}
      {dialog && onChangeHomebrew && (
        <HomebrewDialog
          open
          entry={dialog.entry}
          onOpenChange={(o) => !o && setDialog(null)}
          onSave={(saved) =>
            onChangeHomebrew(
              homebrew.some((h) => h.id === saved.id)
                ? homebrew.map((h) => (h.id === saved.id ? saved : h))
                : [...homebrew, saved]
            )
          }
        />
      )}

      {showBasics && (
        <div className="mt-4">
          <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">
            {tc('characterSheet.combatView.actions.basicActions')}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {BASIC_ACTIONS.map((id) => tc(`characterSheet.combatView.actions.basic.${id}`)).join(' · ')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {tc('characterSheet.combatView.actions.grappleShove', { dc: unarmedDC })}
          </p>
        </div>
      )}
      {(filter === 'all' || filter === 'reaction') && (
        <p className="text-xs text-muted-foreground mt-2">
          {tc('characterSheet.combatView.actions.opportunityAttack')}
        </p>
      )}
    </div>
  );
}
