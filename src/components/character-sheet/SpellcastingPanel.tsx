import { isSpellId, getSpellDef } from '@/lib/sources/spells';
import { getSpellDisplayMeta } from '@/lib/spell-display';
import type { ResolvedCharacter } from '@/types/resolved';
import type { AbilityKey } from '@/lib/dnd-helpers';
import type { DieSize } from '@/components/character-sheet/DiceRoller';
import type { RollPreset } from '@/components/character-sheet/AttacksPanel';
import { parseDiceFormula, extractDiceFromText } from '@/lib/dice-helpers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Dices } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type Spellcasting = NonNullable<ResolvedCharacter['spellcasting']>;

function renderSpellBadge(id: string) {
  if (!isSpellId(id)) return null;
  const def = getSpellDef(id);
  if (!def) return null;

  const cost = def.castingTime.toLowerCase();
  if (cost === 'action') {
    return <Badge variant="default" className="text-[9px] py-0 px-1 ml-1.5 bg-primary/80 shrink-0">Action</Badge>;
  }
  if (cost === 'bonus action') {
    return <Badge variant="secondary" className="text-[9px] py-0 px-1 ml-1.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">Bonus Action</Badge>;
  }
  if (cost.startsWith('reaction')) {
    return <Badge variant="secondary" className="text-[9px] py-0 px-1 ml-1.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">Reaction</Badge>;
  }
  return <Badge variant="outline" className="text-[9px] py-0 px-1 ml-1.5 text-muted-foreground shrink-0">{def.castingTime}</Badge>;
}

const KEYWORD_STYLES: { regex: RegExp; className: string }[] = [
  {
    regex: /\b(Advantage|Disadvantage)\b/gi,
    className: 'font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded',
  },
  {
    regex: /\b(STR|DEX|CON|INT|WIS|CHA|Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\b/gi,
    className: 'font-semibold text-sky-600 dark:text-sky-400',
  },
  {
    regex: /\b(\d+d\d+([+-]\d+)?)\b/g,
    className: 'font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded',
  },
  {
    regex: /\b(Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder)\b/gi,
    className: 'font-semibold text-rose-600 dark:text-rose-400',
  },
];

function highlightText(text: string) {
  if (!text) return text;
  const combinedPattern = new RegExp(
    `\\b(Advantage|Disadvantage|STR|DEX|CON|INT|WIS|CHA|Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder)\\b|\\b(\\d+d\\d+([+-]\\d+)?)\\b`,
    'gi'
  );

  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const matchedStr = match[0];
    let styleClass = 'font-semibold text-primary';

    for (const rule of KEYWORD_STYLES) {
      rule.regex.lastIndex = 0;
      if (rule.regex.test(matchedStr)) {
        styleClass = rule.className;
        break;
      }
    }

    parts.push(
      <span key={`${match.index}-${matchedStr}`} className={styleClass}>
        {matchedStr}
      </span>
    );
    lastIndex = combinedPattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

function SpellItemRow({
  id,
  level,
  school,
  spellAttackBonus,
  abilityOverride,
  onSelectRollPreset,
}: {
  id: string;
  level?: number;
  school?: string;
  spellAttackBonus?: number | null;
  /** When set, this spell uses a different ability than the dominant spellcasting stat. */
  abilityOverride?: AbilityKey;
  onSelectRollPreset?: (preset: RollPreset) => void;
}) {
  const { t } = useTranslation('gamedata');
  const [expanded, setExpanded] = useState(false);

  const def = isSpellId(id) ? getSpellDef(id) : null;
  const spellName = isSpellId(id) ? t(`spells.${id}.name`) : id;
  const description = isSpellId(id) ? t(`spells.${id}.description`, { defaultValue: '' }) : '';

  const handleSelectSpell = () => {
    if (!onSelectRollPreset) return;
    const extracted = extractDiceFromText(description);
    if (extracted) {
      const parsed = parseDiceFormula(extracted);
      onSelectRollPreset({
        die: parsed.die,
        count: parsed.count,
        modifier: parsed.modifier,
        contextLabel: `Spell: ${spellName} (${extracted})`,
      });
    } else if (spellAttackBonus != null) {
      onSelectRollPreset({
        die: 20,
        count: 1,
        modifier: spellAttackBonus,
        contextLabel: `Spell Attack: ${spellName} (${spellAttackBonus >= 0 ? `+${spellAttackBonus}` : spellAttackBonus})`,
      });
    } else {
      onSelectRollPreset({
        die: 20,
        count: 1,
        modifier: 0,
        contextLabel: `Spell: ${spellName}`,
      });
    }
  };

  const meta = isSpellId(id) ? getSpellDisplayMeta(id) : null;
  const metaSchool = meta?.school ? t(`spellSchools.${meta.school}`, { defaultValue: meta.school }) : null;
  const displaySchool = school ?? metaSchool;

  return (
    <div className="rounded border border-border/70 bg-card/60 overflow-hidden transition-all">
      <div className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 hover:bg-muted/40 transition-colors">
        <button
          type="button"
          onClick={() => {
            setExpanded((p) => !p);
            handleSelectSpell();
          }}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          {description ? (
            expanded ? (
              <ChevronDown className="size-3 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="size-3 text-muted-foreground shrink-0" />
            )
          ) : (
            <span className="size-3 shrink-0 text-muted-foreground">&bull;</span>
          )}

          <span className="text-sm font-semibold text-foreground truncate">{spellName}</span>

          {displaySchool && (
            <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
              ({level !== undefined && level > 0 ? `lvl ${level} ` : ''}{displaySchool})
            </span>
          )}

          {abilityOverride && (
            <Badge
              variant="secondary"
              className="text-[9px] py-0 px-1 ml-0.5 bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 shrink-0 uppercase font-mono"
              title={`Uses ${abilityOverride.toUpperCase()} instead of the default spellcasting ability`}
            >
              {abilityOverride.toUpperCase()}
            </Badge>
          )}

          {renderSpellBadge(id)}
        </button>

        {onSelectRollPreset && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleSelectSpell}
            className="h-6 px-1.5 text-[10px] gap-0.5 text-indigo-500 hover:bg-indigo-500/10 shrink-0"
            title={`Select ${spellName} for Dice Roller`}
          >
            <Dices className="size-3" /> Roll
          </Button>
        )}
      </div>

      {expanded && description && (
        <div className="px-3 py-2 text-xs border-t border-border/50 bg-muted/20 space-y-1.5">
          <p className="text-muted-foreground leading-relaxed">{highlightText(description)}</p>
          {def && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80 font-mono pt-1 border-t border-border/30">
              <span><strong className="text-foreground/80 font-sans">Range:</strong> {def.range}</span>
              <span><strong className="text-foreground/80 font-sans">Duration:</strong> {def.duration}</span>
              {def.concentration && <span className="text-amber-600 dark:text-amber-400 font-sans font-semibold">Concentration</span>}
              {def.ritual && <span className="text-purple-600 dark:text-purple-400 font-sans font-semibold">Ritual</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SpellcastingPanel({
  spellcasting,
  onSelectRollPreset,
}: {
  spellcasting: Spellcasting;
  onSelectRollPreset?: (preset: RollPreset) => void;
}) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');

  // Group knownSpells by level, ascending
  const spellsByLevel = spellcasting.knownSpells.reduce<Record<number, string[]>>((acc, { spellId, spellLevel }) => {
    const group = acc[spellLevel] ?? [];
    group.push(spellId);
    return { ...acc, [spellLevel]: group };
  }, {});
  const sortedLevels = Object.keys(spellsByLevel)
    .map(Number)
    .sort((a, b) => a - b);

  // Cantrips header: show "CANTRIPS (chosen/target)" when cantripsKnown > 0
  const cantripsHeader =
    spellcasting.cantripsKnown > 0
      ? `${tc('characterSheet.sections.cantrips')} (${tc('characterSheet.fields.chosenOfTarget', { chosen: spellcasting.cantrips.length, target: spellcasting.cantripsKnown })})`
      : tc('characterSheet.sections.cantrips');

  return (
    <div className="bg-card border border-purple-200 dark:border-purple-900/50 rounded-lg p-6">
      <h2 className="text-lg font-bold text-foreground mb-4">{tc('characterSheet.sections.spells')}</h2>

      {/* Spellcasting stats header */}
      {(spellcasting.ability != null || spellcasting.spellSaveDC != null || spellcasting.spellAttackBonus != null) && (
        <div className="flex flex-wrap gap-4 mb-4 text-sm border-b border-border pb-3">
          {spellcasting.ability != null && (
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">
                {tc('characterSheet.fields.spellcastingAbility')}
              </div>
              <div className="font-bold text-foreground">{t(`abilities.${spellcasting.ability}`)}</div>
            </div>
          )}
          {spellcasting.spellSaveDC != null && (
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">{tc('characterSheet.fields.spellSaveDC')}</div>
              <div className="font-bold text-foreground">{spellcasting.spellSaveDC}</div>
            </div>
          )}
          {spellcasting.spellAttackBonus != null && (
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">{tc('characterSheet.fields.spellAttackBonus')}</div>
              <div className="font-bold text-foreground">
                {spellcasting.spellAttackBonus >= 0 ? '+' : ''}
                {spellcasting.spellAttackBonus}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {spellcasting.knownSpells.length > 0 && (
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {tc('characterSheet.sections.knownSpells')}
          </div>
        )}

        {spellcasting.cantrips.length > 0 && (
          <div>
            <div className="text-xs font-bold text-muted-foreground mb-2">{cantripsHeader}</div>
            <div className="space-y-1">
              {spellcasting.cantrips.map((id) => (
                <SpellItemRow
                  key={id}
                  id={id}
                  spellAttackBonus={spellcasting.spellAttackBonus}
                  abilityOverride={spellcasting.spellAbilityOverrides[id]}
                  onSelectRollPreset={onSelectRollPreset}
                />
              ))}
            </div>
          </div>
        )}

        {spellcasting.alwaysPreparedSpells.length > 0 && (
          <div>
            <div className="text-xs font-bold text-muted-foreground mb-2">
              {tc('characterSheet.sections.alwaysPrepared')}
            </div>
            <div className="space-y-1">
              {spellcasting.alwaysPreparedSpells.map((id) => (
                <SpellItemRow
                  key={id}
                  id={id}
                  spellAttackBonus={spellcasting.spellAttackBonus}
                  abilityOverride={spellcasting.spellAbilityOverrides[id]}
                  onSelectRollPreset={onSelectRollPreset}
                />
              ))}
            </div>
          </div>
        )}

        {sortedLevels.map((lvl) => {
          const ids = spellsByLevel[lvl];
          if (!ids || ids.length === 0) return null;

          const targetCount = spellcasting.spellsKnown.find((sk) => sk.spellLevel === lvl)?.count;
          const levelHeader =
            lvl === 0
              ? tc('characterSheet.fields.spellLevelUnknown')
              : targetCount !== undefined
                ? `${tc('characterSheet.fields.spellLevelLabel', { level: lvl })} (${tc('characterSheet.fields.chosenOfTarget', { chosen: ids.length, target: targetCount })})`
                : tc('characterSheet.fields.spellLevelLabel', { level: lvl });

          return (
            <div key={lvl}>
              <div className="text-xs font-bold text-muted-foreground mb-2">{levelHeader}</div>
              <div className="space-y-1">
                {ids.map((id) => (
                  <SpellItemRow
                    key={id}
                    id={id}
                    level={lvl}
                    spellAttackBonus={spellcasting.spellAttackBonus}
                    abilityOverride={spellcasting.spellAbilityOverrides[id]}
                    onSelectRollPreset={onSelectRollPreset}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
