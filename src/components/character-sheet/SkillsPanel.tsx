import { DND_SKILLS } from '@/lib/dnd-helpers';
import type { AbilityKey, SkillId } from '@/lib/dnd-helpers';
import type { ResolvedSkill } from '@/types/resolved';
import type { RollPreset } from '@/components/character-sheet/roll-preset';
import { formatSigned } from '@/lib/format';
import type { CheckRollMods } from '@/lib/roll-mods';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Dices } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { RollModeBadge } from '@/components/character-sheet/ActiveEffectsPanel';
import { partsText, useRollParts } from '@/hooks/useRollParts';
import { useTranslation } from 'react-i18next';

interface SkillsPanelProps {
  readonly skills: Readonly<Record<SkillId, ResolvedSkill>>;
  readonly onSelectRollPreset?: (preset: RollPreset) => void;
  readonly checkMods?: (target: { ability: AbilityKey; skillId: SkillId }) => CheckRollMods | undefined;
}

function formatBonus(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function BreakdownLabel({ type, label }: { type: string; label: string }) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');

  if (type === 'ability') return <>{t(`abilities.${label as 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'}`)}</>;
  if (type === 'proficiency') return <>{tc('characterSheet.skillBreakdown.proficiency')}</>;
  if (type === 'expertise') return <>{tc('characterSheet.skillBreakdown.expertise')}</>;
  return <>{t(`features.${label}.name`, { defaultValue: label })}</>;
}

/** Filled dot = proficient, ringed dot = expertise. Text for screen readers, never colour alone. */
function ProficiencyPip({ proficient, expertise }: { proficient: boolean; expertise: boolean }) {
  const { t: tc } = useTranslation('common');
  return (
    <>
      <span
        aria-hidden
        className={cn(
          'inline-block size-2.5 shrink-0 rounded-full border border-muted-foreground',
          proficient && 'bg-foreground border-foreground',
          expertise && 'outline outline-1 outline-offset-1 outline-foreground'
        )}
      />
      {(proficient || expertise) && (
        <span className="sr-only">
          {expertise ? tc('characterSheet.skillBreakdown.expertise') : tc('characterSheet.skillBreakdown.proficiency')}
        </span>
      )}
    </>
  );
}

export function SkillsPanel({ skills, onSelectRollPreset, checkMods }: SkillsPanelProps) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');
  const rollParts = useRollParts();
  const [expanded, setExpanded] = useState<Set<SkillId>>(new Set());

  const sortedSkills = [...DND_SKILLS].sort((a, b) => t(`skills.${a.id}`).localeCompare(t(`skills.${b.id}`)));

  const allExpanded = expanded.size === sortedSkills.length;
  const toggleAll = () => {
    if (allExpanded) {
      setExpanded(new Set());
    } else {
      setExpanded(new Set(sortedSkills.map((s) => s.id)));
    }
  };

  const toggleSkill = (id: SkillId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const presetFor = (skillId: SkillId, ability: AbilityKey, skill: ResolvedSkill): RollPreset => {
    const mods = checkMods?.({ ability, skillId });
    const total = skill.bonus + (mods?.bonus ?? 0);
    return {
      die: 20,
      count: 1,
      modifier: total,
      contextLabel: tc('characterSheet.skillBreakdown.checkLabel', {
        skill: t(`skills.${skillId}`),
        bonus: formatSigned(total),
      }),
      mode: mods?.mode,
      min: mods?.min,
      extra: mods?.extra,
      breakdown: rollParts([...skill.breakdown, ...(mods?.parts ?? [])]),
    };
  };

  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">{tc('characterSheet.sections.skills')}</h2>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {allExpanded
            ? tc('characterSheet.skillBreakdown.collapseAll')
            : tc('characterSheet.skillBreakdown.expandAll')}
        </button>
      </div>
      <div className="space-y-0.5 text-xs">
        {sortedSkills.map((skill) => {
          const resolved = skills[skill.id as keyof typeof skills];
          if (!resolved) return null;
          const isExpanded = expanded.has(skill.id);
          const abbrev = t(`abilityAbbreviations.${skill.ability}`);
          const skillName = t(`skills.${skill.id}`);
          const preset = presetFor(skill.id, skill.ability, resolved);

          return (
            <div key={skill.id} className="border-b border-border/30 last:border-0 py-0.5">
              <div className="flex items-center w-full text-foreground py-0.5 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-label={tc('characterSheet.skillBreakdown.toggle', { skill: skillName })}
                  onClick={() => toggleSkill(skill.id)}
                  className="p-0.5 -ml-0.5"
                >
                  {isExpanded ? (
                    <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                  )}
                </button>
                {/* One target per row: the whole name/bonus area rolls the check. */}
                <button
                  type="button"
                  disabled={!onSelectRollPreset}
                  onClick={() => onSelectRollPreset?.(preset)}
                  aria-label={tc('characterSheet.skillBreakdown.rollSkill', {
                    skill: skillName,
                    bonus: formatBonus(preset.modifier),
                  })}
                  title={`${skillName} ${formatBonus(preset.modifier)} = ${partsText(preset.breakdown ?? [])}`}
                  className="flex flex-1 items-center gap-1 rounded px-1 py-0.5 text-left enabled:hover:bg-primary/10"
                >
                  <ProficiencyPip proficient={resolved.proficient} expertise={resolved.expertise} />
                  <span className={resolved.proficient ? 'font-bold' : ''}>
                    {skillName}
                    <span className="text-xs text-muted-foreground ml-1">({abbrev})</span>
                  </span>
                  <RollModeBadge mode={preset.mode} />
                  {preset.min !== undefined && (
                    <Badge
                      variant="outline"
                      title={tc('rollBreakdown.reliableTalent')}
                      className="text-[9px] py-0 px-1 ml-1 cursor-help"
                    >
                      {tc('characterSheet.skillBreakdown.minRoll', { min: preset.min })}
                    </Badge>
                  )}
                  {resolved.disadvantageFromArmor && (
                    <Badge
                      variant="outline"
                      title={tc('characterSheet.skillBreakdown.armorDisadvantageTitle')}
                      className="text-[9px] py-0 px-1 border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10 cursor-help ml-1"
                    >
                      {tc('characterSheet.skillBreakdown.armorDisadvantage')}
                    </Badge>
                  )}
                  <span
                    className={cn(
                      'ml-auto font-mono font-bold',
                      resolved.expertise ? 'text-green-600' : 'text-muted-foreground'
                    )}
                  >
                    {formatBonus(preset.modifier)}
                  </span>
                  {onSelectRollPreset && <Dices aria-hidden className="size-3 shrink-0 text-primary" />}
                </button>
              </div>
              {isExpanded && (
                <div className="ml-5 mb-1 space-y-0.5">
                  {resolved.breakdown.map((component, i) => (
                    <div key={i} className="flex items-center justify-between text-muted-foreground py-0.5">
                      <span className="text-[11px]">
                        <BreakdownLabel type={component.type} label={component.label} />
                      </span>
                      <span className="font-mono text-[11px]">{formatBonus(component.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
