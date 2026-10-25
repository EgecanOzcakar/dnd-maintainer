import { Dices } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { RollModeBadge } from '@/components/character-sheet/ActiveEffectsPanel';
import type { RollPreset } from '@/components/character-sheet/roll-preset';
import { parseDiceFormula } from '@/lib/dice-helpers';
import { formatSigned } from '@/lib/format';
import { partsText, useRollParts } from '@/hooks/useRollParts';
import { upcastRoll, type BreakdownPart, type ResolvedRoll } from '@/lib/resolver/actions';
import type { AdjustedAction } from '@/lib/resolver/effects';

/** Parts that explain `total`; any remainder (homebrew, magic bonuses, class level) shows as a flat bonus. */
const explain = (parts: readonly BreakdownPart[], total: number): BreakdownPart[] => {
  const rest = total - parts.reduce((sum, p) => sum + p.value, 0);
  return rest ? [...parts, { type: 'flat', label: 'flat', value: rest }] : [...parts];
};

const fmt = (r: ResolvedRoll, extra: readonly string[] = []) =>
  (r.dice ? `${r.dice}${r.bonus !== 0 ? formatSigned(r.bonus) : ''}` : `${r.bonus}`) + extra.join('');

/**
 * The one-click roll buttons for an action: attack, save DC, damage and heal (with upcast and
 * active-effect extras applied). Shared by the Actions panel and the spell list.
 */
export function ActionRolls({
  action: a,
  name,
  onSelectRollPreset,
  castLevel,
  onUse,
}: {
  readonly action: AdjustedAction;
  readonly name: string;
  readonly onSelectRollPreset?: (preset: RollPreset) => void;
  /** Slot level a leveled spell is cast at; dice grow per level above the spell's own. */
  readonly castLevel?: number;
  /** Rolling this action's damage or healing spends a use of its resource pool. */
  readonly onUse?: () => void;
}) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');
  const rollParts = useRollParts();

  const steps = castLevel && a.spellLevel ? castLevel - a.spellLevel : 0;
  const damage = a.damage && upcastRoll(a.damage, a.upcast, steps);
  const heal = a.heal && upcastRoll(a.heal, a.damage ? undefined : a.upcast, steps);
  const damageExtra = [...(damage?.extra ?? []), ...(a.damageExtra ?? [])];

  const diceAs = (
    label: string,
    r: ResolvedRoll,
    extra: readonly string[],
    parts: readonly BreakdownPart[]
  ): RollPreset => {
    const { die, count } = parseDiceFormula(r.dice);
    return {
      die,
      count,
      modifier: r.bonus,
      contextLabel: label,
      kind: 'damage',
      extra,
      breakdown: rollParts(explain(parts, r.bonus)),
    };
  };
  const toHit: RollPreset = {
    die: 20,
    count: 1,
    modifier: a.toHit ?? 0,
    contextLabel: `${name} ${formatSigned(a.toHit ?? 0)}`,
    kind: 'd20',
    mode: a.mode,
    extra: a.toHitExtra,
    breakdown: rollParts(explain(a.toHitParts ?? [], a.toHit ?? 0)),
  };
  const damagePreset =
    a.damage && damage ? diceAs(`${name} ${fmt(damage.roll)}`, damage.roll, damageExtra, a.damageParts ?? []) : null;
  const healPreset = a.heal && heal ? diceAs(`${name} ${fmt(heal.roll)}`, heal.roll, heal.extra, []) : null;
  const tip = (p: RollPreset | null) => (p ? partsText(p.breakdown ?? [], p.extra) : undefined);

  return (
    <>
      {a.toHit !== undefined && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 font-mono text-primary gap-0.5"
          title={tip(toHit)}
          onClick={() => onSelectRollPreset?.(toHit)}
        >
          <Dices className="size-3" />
          {formatSigned(a.toHit)}
          {a.toHitExtra?.join('')}
        </Button>
      )}
      <RollModeBadge mode={a.mode} />
      {a.save && (
        <span className="font-mono">
          {tc('characterSheet.combatView.actions.save', { ability: t(`abilities.${a.save.ability}`), dc: a.save.dc })}
        </span>
      )}
      {a.damage && damage && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 font-mono text-emerald-600"
          disabled={!damage.roll.dice.includes('d')}
          title={`${tip(damagePreset)} — ${tc('diceLog.critHint')}`}
          onClick={() => {
            if (damagePreset) onSelectRollPreset?.(damagePreset);
            onUse?.();
          }}
        >
          {fmt(damage.roll, damageExtra)}{' '}
          {a.damage.type === 'weapon'
            ? tc('characterSheet.combatView.actions.weaponDamage')
            : t(`damageTypes.${a.damage.type}` as `damageTypes.${string}`, { defaultValue: a.damage.type })}
        </Button>
      )}
      {a.heal && heal && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 font-mono text-sky-600"
          disabled={!heal.roll.dice.includes('d')}
          title={tip(healPreset)}
          onClick={() => {
            if (healPreset) onSelectRollPreset?.(healPreset);
            onUse?.();
          }}
        >
          {tc('characterSheet.combatView.actions.heal', { roll: fmt(heal.roll, heal.extra) })}
        </Button>
      )}
      {a.versatileDice && (
        <span className="text-muted-foreground">
          {tc('characterSheet.combatView.actions.twoHanded', { dice: a.versatileDice })}
        </span>
      )}
      {a.upcast && !castLevel && (
        <span className="text-muted-foreground">
          {tc('characterSheet.combatView.actions.upcast', { dice: a.upcast })}
        </span>
      )}
    </>
  );
}
