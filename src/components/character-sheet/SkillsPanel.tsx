import { DND_SKILLS } from '@/lib/dnd-helpers';
import type { SkillId } from '@/lib/dnd-helpers';
import type { ResolvedSkill } from '@/types/resolved';
import type { RollPreset } from '@/components/character-sheet/AttacksPanel';
import { formatSigned } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Dices } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SkillsPanelProps {
  readonly skills: Readonly<Record<SkillId, ResolvedSkill>>;
  readonly onSelectRollPreset?: (preset: RollPreset) => void;
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

export function SkillsPanel({ skills, onSelectRollPreset }: SkillsPanelProps) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');
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

  const handleSelectSkillRoll = (skillId: SkillId, bonus: number) => {
    if (!onSelectRollPreset) return;
    const skillName = t(`skills.${skillId}`);
    onSelectRollPreset({
      die: 20,
      count: 1,
      modifier: bonus,
      contextLabel: `Skill Check: ${skillName} (${formatSigned(bonus)})`,
    });
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

          return (
            <div key={skill.id} className="border-b border-border/30 last:border-0 py-0.5">
              <div className="flex items-center justify-between w-full text-foreground py-0.5 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors">
                <button
                  type="button"
                  onClick={() => {
                    toggleSkill(skill.id);
                    handleSelectSkillRoll(skill.id, resolved.bonus);
                  }}
                  className="flex items-center gap-1 text-left flex-1"
                >
                  {isExpanded ? (
                    <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                  )}
                  <span className={resolved.proficient ? 'font-bold' : ''}>
                    {skillName}
                    <span className="text-xs text-muted-foreground ml-1">({abbrev})</span>
                  </span>
                  {resolved.disadvantageFromArmor && (
                    <Badge
                      variant="outline"
                      title="Disadvantage on Strength and Dexterity tests while wearing armor without training"
                      className="text-[9px] py-0 px-1 border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10 cursor-help ml-1"
                    >
                      DIS
                    </Badge>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectSkillRoll(skill.id, resolved.bonus)}
                    className={`font-mono px-1 rounded hover:bg-primary/20 ${
                      resolved.expertise ? 'text-green-600 font-bold' : 'text-muted-foreground font-bold'
                    }`}
                    title={`Click to set ${skillName} Check Roll (${formatBonus(resolved.bonus)})`}
                  >
                    {formatBonus(resolved.bonus)}
                  </button>

                  {onSelectRollPreset && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSelectSkillRoll(skill.id, resolved.bonus)}
                      className="h-6 px-1.5 text-[10px] gap-0.5 text-primary hover:bg-primary/10"
                      title={`Roll ${skillName} Check`}
                    >
                      <Dices className="size-3" /> Roll
                    </Button>
                  )}
                </div>
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
