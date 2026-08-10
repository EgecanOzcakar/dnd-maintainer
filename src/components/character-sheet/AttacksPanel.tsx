import { Badge } from '@/components/ui/badge';
import { BonusBreakdown } from '@/components/character-sheet/BonusBreakdown';
import { formatSigned } from '@/lib/format';
import type { ResolvedAttack } from '@/types/resolved';
import type { WeaponMasteryId } from '@/types/items';
import type { DieSize } from '@/components/character-sheet/DiceRoller';
import { parseDiceFormula } from '@/lib/dice-helpers';
import { ChevronDown, ChevronRight, Dices } from 'lucide-react';
import { useState } from 'react';
import { getItemNameKey } from '@/lib/sources/items';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export interface RollPreset {
  die: DieSize;
  count: number;
  modifier: number;
  contextLabel: string;
}

interface AttacksPanelProps {
  readonly attacks: readonly ResolvedAttack[];
  readonly weaponMasteries?: readonly { readonly weaponId: string; readonly masteryId: WeaponMasteryId }[];
  readonly onSelectRollPreset?: (preset: RollPreset) => void;
}

export function AttacksPanel({ attacks, weaponMasteries, onSelectRollPreset }: AttacksPanelProps) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const masteryMap = new Map(weaponMasteries?.map((m) => [m.weaponId, m.masteryId]) ?? []);

  const toggleRow = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAttackRoll = (attack: ResolvedAttack, weaponName: string) => {
    if (!onSelectRollPreset) return;
    onSelectRollPreset({
      die: 20,
      count: 1,
      modifier: attack.attackBonus,
      contextLabel: `Attack: ${weaponName} (${formatSigned(attack.attackBonus)})`,
    });
  };

  const handleSelectDamageRoll = (attack: ResolvedAttack, weaponName: string) => {
    if (!onSelectRollPreset) return;
    const parsed = parseDiceFormula(attack.damageDice);
    onSelectRollPreset({
      die: parsed.die,
      count: parsed.count,
      modifier: attack.damageBonus,
      contextLabel: `Damage: ${weaponName} (${attack.damageDice}${attack.damageBonus !== 0 ? formatSigned(attack.damageBonus) : ''})`,
    });
  };

  return (
    <div className="bg-card border rounded-lg p-6">
      <h2 className="text-lg font-bold text-foreground mb-4">{tc('characterSheet.sections.attacks')}</h2>

      {attacks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tc('characterSheet.attacks.noAttacks')}</p>
      ) : (
        <div className="space-y-0.5 text-xs">
          <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 px-1 py-1 text-[10px] font-bold text-muted-foreground uppercase">
            <span>{tc('characterSheet.attacks.name')}</span>
            <span className="text-center">{tc('characterSheet.attacks.attackBonus')}</span>
            <span>{tc('characterSheet.attacks.damage')}</span>
            <span className="text-right">Roll</span>
          </div>

          {attacks.map((attack, index) => {
            const isExpanded = expandedRows.has(index);
            const weaponName = t(getItemNameKey('weapon', attack.weaponId), { defaultValue: attack.weaponId });
            const damageType = t(`damageTypes.${attack.damageType}`);
            const damageStr = `${attack.damageDice}${attack.damageBonus !== 0 ? formatSigned(attack.damageBonus) : ''} ${damageType}`;

            const mastery = masteryMap.get(attack.weaponId);

            return (
              <div key={attack.weaponId} className="border-b border-border/40 last:border-0 py-1">
                <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center w-full px-1">
                  <button
                    type="button"
                    onClick={() => {
                      toggleRow(index);
                      handleSelectAttackRoll(attack, weaponName);
                    }}
                    className="flex items-center gap-1 text-foreground font-medium hover:text-primary text-left truncate"
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">{weaponName}</span>
                    {mastery !== undefined && (
                      <Badge variant="secondary" className="text-[10px] py-0 font-normal shrink-0">
                        {t(`weaponMasteries.${mastery}.name`)}
                      </Badge>
                    )}
                    {attack.disadvantageFromArmor && (
                      <Badge
                        variant="outline"
                        title="Disadvantage on attack rolls while wearing armor without training"
                        className="text-[9px] py-0 px-1 border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10 shrink-0 cursor-help"
                      >
                        DIS
                      </Badge>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectAttackRoll(attack, weaponName)}
                    className="font-mono font-bold text-foreground text-center px-1.5 py-0.5 rounded bg-muted/60 hover:bg-primary/20 hover:text-primary transition-colors"
                    title={`Click to set Attack Roll (${formatSigned(attack.attackBonus)})`}
                  >
                    {formatSigned(attack.attackBonus)}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectDamageRoll(attack, weaponName)}
                    className="text-foreground text-left px-1.5 py-0.5 rounded hover:bg-muted/60 hover:text-primary transition-colors truncate"
                    title={`Click to set Damage Roll (${damageStr})`}
                  >
                    {damageStr}
                  </button>

                  {onSelectRollPreset && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSelectAttackRoll(attack, weaponName)}
                        className="h-6 px-1.5 text-[10px] gap-0.5 text-primary hover:bg-primary/10"
                        title="Roll Attack d20"
                      >
                        <Dices className="size-3" /> Atk
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSelectDamageRoll(attack, weaponName)}
                        className="h-6 px-1.5 text-[10px] text-emerald-600 hover:bg-emerald-500/10"
                        title="Roll Damage"
                      >
                        Dmg
                      </Button>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="ml-4 mb-2 space-y-2 px-1 pt-2">
                    {attack.properties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {attack.properties.map((prop) => (
                          <Badge key={prop} variant="outline" className="text-[10px] py-0">
                            {t(`weaponProperties.${prop}`)}
                          </Badge>
                        ))}
                        {attack.range === 'ranged' && attack.normalRange !== undefined && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            {tc('characterSheet.attacks.range')}:{' '}
                            {tc('characterSheet.attacks.rangeFormat', {
                              normal: attack.normalRange,
                              long: attack.longRange ?? attack.normalRange,
                            })}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">
                        {tc('characterSheet.attacks.attackBonus')}
                      </div>
                      <BonusBreakdown components={attack.attackBreakdown} total={attack.attackBonus} />
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">
                        {tc('characterSheet.attacks.damage')}
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        {attack.damageDice}
                        {attack.damageBreakdown.length > 0 && (
                          <BonusBreakdown components={attack.damageBreakdown} total={attack.damageBonus} />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
