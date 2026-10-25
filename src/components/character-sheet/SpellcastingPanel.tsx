import { isSpellId, getSpellDef } from '@/lib/sources/spells';
import { getSpellDisplayMeta } from '@/lib/spell-display';
import type { ResolvedCharacter } from '@/types/resolved';
import type { AbilityKey } from '@/lib/dnd-helpers';
import type { RollPreset } from '@/components/character-sheet/roll-preset';
import { ActionRolls } from '@/components/character-sheet/ActionRolls';
import type { AdjustedAction } from '@/lib/resolver/effects';
import { getSpellSlotMax } from '@/lib/rest';
import { castOptions, type SlotOption } from '@/lib/spell-casting';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SpellPreparationDialog } from '@/components/character-sheet/SpellPreparationDialog';
import { canPrepareSpells, getEffectivePrepared, getPreparationPool } from '@/lib/spell-preparation';
import { ChevronDown, ChevronRight, AlertTriangle, Sparkles } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

type Spellcasting = NonNullable<ResolvedCharacter['spellcasting']>;

function renderSpellBadge(id: string, tc: TFunction<'common'>) {
  if (!isSpellId(id)) return null;
  const def = getSpellDef(id);
  if (!def) return null;

  const cost = def.castingTime.toLowerCase();
  if (cost === 'action') {
    return (
      <Badge variant="default" className="text-[9px] py-0 px-1 ml-1.5 bg-primary/80 shrink-0">
        {tc('spellcastingPanel.action')}
      </Badge>
    );
  }
  if (cost === 'bonus action') {
    return (
      <Badge
        variant="secondary"
        className="text-[9px] py-0 px-1 ml-1.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0"
      >
        {tc('spellcastingPanel.bonusAction')}
      </Badge>
    );
  }
  if (cost.startsWith('reaction')) {
    return (
      <Badge
        variant="secondary"
        className="text-[9px] py-0 px-1 ml-1.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0"
      >
        {tc('spellcastingPanel.reaction')}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[9px] py-0 px-1 ml-1.5 text-muted-foreground shrink-0">
      {def.castingTime}
    </Badge>
  );
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
    regex:
      /\b(Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder)\b/gi,
    className: 'font-semibold text-rose-600 dark:text-rose-400',
  },
];

function highlightText(text: string) {
  if (!text) return text;
  const combinedPattern = new RegExp(
    `\\b(Advantage|Disadvantage|STR|DEX|CON|INT|WIS|CHA|Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder)\\b|\\b(\\d+d\\d+([+-]\\d+)?)\\b`,
    'gi'
  );

  const parts: (string | ReactElement)[] = [];
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
  abilityOverride,
  action,
  slotOptions,
  concentrating,
  onSelectRollPreset,
  onCast,
}: {
  id: string;
  level?: number;
  school?: string;
  /** When set, this spell uses a different ability than the dominant spellcasting stat. */
  abilityOverride?: AbilityKey;
  /** Resolved attack/save/damage/heal for this spell, if it has any. */
  action?: AdjustedAction;
  /** Slots this spell can be cast with (higher levels upcast it). */
  slotOptions: readonly SlotOption[];
  concentrating?: boolean;
  onSelectRollPreset?: (preset: RollPreset) => void;
  /** `slotKey` is null for cantrips. */
  onCast?: (spellId: string, slotKey: string | null) => void;
}) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);
  const [castKey, setCastKey] = useState<string | null>(null);

  const def = isSpellId(id) ? getSpellDef(id) : null;
  const spellName = isSpellId(id) ? t(`spells.${id}.name`) : id;
  const description = isSpellId(id) ? t(`spells.${id}.description`, { defaultValue: '' }) : '';
  const baseLevel = def?.level ?? level ?? 0;
  const chosen = slotOptions.find((o) => o.key === castKey) ?? slotOptions[0];

  const meta = isSpellId(id) ? getSpellDisplayMeta(id) : null;
  const metaSchool = meta?.school ? t(`spellSchools.${meta.school}`, { defaultValue: meta.school }) : null;
  const displaySchool = school ?? metaSchool;

  return (
    <div className="rounded border border-border/70 bg-card/60 overflow-hidden transition-all">
      <div className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 hover:bg-muted/40 transition-colors">
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
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
              ({level !== undefined && level > 0 ? `lvl ${level} ` : ''}
              {displaySchool})
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

          {renderSpellBadge(id, tc)}
        </button>
      </div>

      {(action || ((baseLevel > 0 || def?.concentration) && onCast)) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2.5 pb-1.5 text-xs">
          {concentrating && (
            <Badge variant="secondary" className="text-[9px] py-0 px-1 gap-0.5 bg-amber-500/20 text-amber-600">
              <Sparkles className="size-2.5" />
              {tc('spellCasting.concentrating')}
            </Badge>
          )}
          {action && (
            <ActionRolls
              action={action}
              name={spellName}
              onSelectRollPreset={onSelectRollPreset}
              castLevel={baseLevel > 0 ? (chosen?.level ?? baseLevel) : undefined}
            />
          )}
          {onCast && (baseLevel > 0 || def?.concentration) && (
            <span className="ml-auto flex items-center gap-1">
              {slotOptions.length > 1 && (
                <select
                  aria-label={tc('spellCasting.slotLevel', { spell: spellName })}
                  value={chosen?.key}
                  onChange={(e) => setCastKey(e.target.value)}
                  className="h-6 rounded border bg-background px-1 text-[11px]"
                >
                  {slotOptions.map((o) => (
                    <option key={o.key} value={o.key}>
                      {tc(o.key === 'pact' ? 'spellCasting.pactOption' : 'spellCasting.levelOption', {
                        level: o.level,
                      })}
                    </option>
                  ))}
                </select>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px]"
                disabled={baseLevel > 0 && !chosen}
                title={baseLevel > 0 && !chosen ? tc('spellCasting.noSlots') : undefined}
                onClick={() => onCast(id, baseLevel > 0 ? (chosen?.key ?? null) : null)}
              >
                {tc('spellCasting.cast')}
              </Button>
            </span>
          )}
        </div>
      )}

      {expanded && description && (
        <div className="px-3 py-2 text-xs border-t border-border/50 bg-muted/20 space-y-1.5">
          <p className="text-muted-foreground leading-relaxed">{highlightText(description)}</p>
          {def && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80 font-mono pt-1 border-t border-border/30">
              <span>
                <strong className="text-foreground/80 font-sans">{tc('spellcastingPanel.range')}</strong> {def.range}
              </span>
              <span>
                <strong className="text-foreground/80 font-sans">{tc('spellcastingPanel.duration')}</strong>{' '}
                {def.duration}
              </span>
              {def.concentration && (
                <span className="text-amber-600 dark:text-amber-400 font-sans font-semibold">
                  {tc('spellcastingPanel.concentration')}
                </span>
              )}
              {def.ritual && (
                <span className="text-purple-600 dark:text-purple-400 font-sans font-semibold">
                  {tc('spellcastingPanel.ritual')}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FeatureRow({
  name,
  description,
  saveDC,
  saveAbility,
  action,
  onSelectRollPreset,
}: {
  name: string;
  description: string;
  saveDC?: number;
  saveAbility?: string;
  /** Resolved attack/save/damage/heal for this feature, if it has any. */
  action?: AdjustedAction;
  onSelectRollPreset?: (preset: RollPreset) => void;
}) {
  const { t: tc } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10 overflow-hidden transition-all">
      <div className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 hover:bg-amber-500/10 transition-colors">
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          {description ? (
            expanded ? (
              <ChevronDown className="size-3 text-amber-500 shrink-0" />
            ) : (
              <ChevronRight className="size-3 text-amber-500 shrink-0" />
            )
          ) : (
            <span className="size-3 shrink-0 text-amber-500">&bull;</span>
          )}

          <span className="text-sm font-semibold text-foreground truncate">{name}</span>

          <Badge
            variant="secondary"
            className="text-[9px] py-0 px-1 ml-1.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0"
          >
            {tc('spellcastingPanel.abilityAction')}
          </Badge>

          {saveDC !== undefined && (
            <Badge
              variant="outline"
              className="text-[9px] py-0 px-1 ml-1 font-mono border-amber-500/40 text-amber-600 dark:text-amber-400 shrink-0"
            >
              DC {saveDC} {saveAbility?.toUpperCase()}
            </Badge>
          )}
        </button>

        {action && (
          <span className="flex flex-wrap items-center gap-1 text-xs shrink-0">
            <ActionRolls action={action} name={name} onSelectRollPreset={onSelectRollPreset} />
          </span>
        )}
      </div>

      {expanded && description && (
        <div className="px-3 py-2 text-xs border-t border-amber-500/20 bg-muted/20 space-y-1.5">
          <p className="text-muted-foreground leading-relaxed">{highlightText(description)}</p>
        </div>
      )}
    </div>
  );
}

export function SpellcastingPanel({
  spellcasting,
  resolved,
  onSelectRollPreset,
  classId = null,
  preparedSpells,
  onChangePrepared,
  actions,
  spellSlotsUsed,
  onCast,
  concentratingOn = null,
  onEndConcentration,
}: {
  spellcasting?: Spellcasting | null;
  resolved?: ResolvedCharacter;
  onSelectRollPreset?: (preset: RollPreset) => void;
  /** Class that supplies the preparation pool (whole-list casters). */
  classId?: string | null;
  /** Stored `characters.prepared_spells`; empty falls back to known spells. */
  preparedSpells?: readonly string[] | null;
  /** Persist a new prepared list. Omit for a read-only panel. */
  onChangePrepared?: (prepared: string[]) => void;
  /** Effect-adjusted actions; spells and features with rolls get one-click buttons. */
  actions?: readonly AdjustedAction[];
  /** Stored `characters.spell_slots_used`; decides which slots a spell can be cast with. */
  spellSlotsUsed?: Record<string, number> | null;
  /** Cast a spell: spends the slot (`slotKey`, null for cantrips) and starts concentration. Omit to hide Cast. */
  onCast?: (spellId: string, slotKey: string | null) => void;
  concentratingOn?: string | null;
  onEndConcentration?: () => void;
}) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');
  const [prepDialogOpen, setPrepDialogOpen] = useState(false);
  const prepSc = spellcasting && canPrepareSpells(spellcasting) ? spellcasting : null;
  const prepared = prepSc ? getEffectivePrepared(preparedSpells, prepSc) : [];

  const slotMax = resolved ? getSpellSlotMax(resolved) : {};
  const rowProps = (id: string) => ({
    id,
    abilityOverride: spellcasting?.spellAbilityOverrides[id],
    action: actions?.find((a) => a.key === `spell:${id}`),
    slotOptions: castOptions(
      slotMax,
      spellSlotsUsed ?? {},
      spellcasting?.pactMagic?.slotLevel ?? null,
      getSpellDef(id)?.level ?? 0
    ),
    concentrating: concentratingOn === id,
    onSelectRollPreset,
    onCast,
  });

  // Group knownSpells by level, ascending
  const listedSpells = prepSc
    ? prepared.map((spellId) => ({ spellId, spellLevel: getSpellDef(spellId)?.level ?? 1 }))
    : (spellcasting?.knownSpells ?? []);
  const spellsByLevel =
    listedSpells.reduce<Record<number, string[]>>((acc, { spellId, spellLevel }) => {
      const group = acc[spellLevel] ?? [];
      group.push(spellId);
      return { ...acc, [spellLevel]: group };
    }, {}) ?? {};
  const sortedLevels = Object.keys(spellsByLevel)
    .map(Number)
    .sort((a, b) => a - b);

  // Cantrips header: show "CANTRIPS (chosen/target)" when cantripsKnown > 0
  const cantripsHeader =
    spellcasting && spellcasting.cantripsKnown > 0
      ? `${tc('characterSheet.sections.cantrips')} (${tc('characterSheet.fields.chosenOfTarget', { chosen: spellcasting.cantrips.length, target: spellcasting.cantripsKnown })})`
      : tc('characterSheet.sections.cantrips');

  // Filter features to render active/special class abilities, boons, and subclass features
  const CORE_CLASS_FEATURE_IDS = new Set([
    // Monk Focus / Ki Actions & Reactions
    'monk-martial-arts',
    'monk-flurry-of-blows',
    'monk-patient-defense',
    'monk-step-of-the-wind',
    'monk-deflect-attacks',
    'monk-slow-fall',
    'monk-stunning-strike',
    'monk-uncanny-metabolism',
    'monk-stillness-of-mind',
    'monk-heightened-focus',
    'monk-self-restoration',
    'monk-superior-defense',

    // Barbarian
    'barbarian-rage',
    'barbarian-reckless-attack',
    'barbarian-primal-knowledge',
    'barbarian-brutal-strike',

    // Bard
    'bard-bardic-inspiration',
    'bard-countercharm',

    // Cleric
    'cleric-channel-divinity',
    'cleric-search-for-the-truth',

    // Druid
    'druid-wild-shape',

    // Fighter
    'fighter-second-wind',
    'fighter-action-surge',
    'fighter-tactical-mind',
    'fighter-indomitable',

    // Paladin
    'paladin-lay-on-hands',
    'paladin-divine-smite',
    'paladin-channel-divinity',
    'paladin-aura-of-protection',

    // Ranger
    'ranger-favored-enemy',

    // Rogue
    'rogue-sneak-attack',
    'rogue-cunning-action',
    'rogue-uncanny-dodge',
    'rogue-evasion',
    'rogue-reliable-talent',

    // Sorcerer
    'sorcerer-font-of-magic',
    'sorcerer-metamagic',
    'sorcerer-innate-sorcery',

    // Warlock Boons & Features
    'warlock-eldritch-invocations',
    'warlock-pact-boon',
    'warlock-pact-of-the-blade',
    'warlock-pact-of-the-chain',
    'warlock-pact-of-the-tome',

    // Wizard
    'wizard-arcane-recovery',
    'wizard-scholar',
    'wizard-memorize-spell',
  ]);

  const SUBCLASS_PREFIXES = [
    'berserker-',
    'wildheart-',
    'worldtree-',
    'zealot-',
    'collegedance-',
    'collegeglamour-',
    'collegelore-',
    'collegevalor-',
    'lifedomain-',
    'lightdomain-',
    'trickerydomain-',
    'wardomain-',
    'circleland-',
    'circlemoon-',
    'circlesea-',
    'circlestars-',
    'champion-',
    'battlemaster-',
    'eldritchknight-',
    'psiwarrior-',
    'warriorofmercy-',
    'warriorofshadow-',
    'warriorofelements-',
    'warrioropenhand-',
    'oathofdevotion-',
    'oathofglory-',
    'oathofancients-',
    'oathofvengeance-',
    'beastmaster-',
    'feywanderer-',
    'gloomstalker-',
    'hunter-',
    'thief-',
    'assassin-',
    'arcanetrickster-',
    'soulknife-',
    'aberrantsorcery-',
    'clockworksorcery-',
    'draconicsorcery-',
    'wildmagicsorcery-',
    'archfeypatron-',
    'celestialpatron-',
    'fiendpatron-',
    'greatoldonepatron-',
    'abjurer-',
    'diviner-',
    'evoker-',
    'illusionist-',
  ];

  const activeFeatures =
    resolved?.features.filter((f) => {
      const id = f.feature.id;
      if (CORE_CLASS_FEATURE_IDS.has(id)) return true;
      if (id.startsWith('feat-')) return true;
      return SUBCLASS_PREFIXES.some((prefix) => id.startsWith(prefix));
    }) ?? [];

  return (
    <div className="bg-card border border-purple-200 dark:border-purple-900/50 rounded-lg p-6">
      <h2 className="text-lg font-bold text-foreground mb-4">
        {spellcasting ? tc('characterSheet.sections.spells') : 'Special & Class Abilities'}
      </h2>

      {spellcasting?.cannotCastSpells && (
        <div className="mb-4 p-3 bg-amber-500/15 border border-amber-500/40 rounded text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2 font-medium">
          <AlertTriangle className="size-4 shrink-0 text-amber-500" />
          <span>{tc('spellcastingPanel.cannotCast')}</span>
        </div>
      )}

      {concentratingOn && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
            <Sparkles className="size-3.5" />
            {tc('spellCasting.concentratingOn', {
              spell: isSpellId(concentratingOn) ? t(`spells.${concentratingOn}.name`) : concentratingOn,
            })}
          </span>
          {onEndConcentration && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              onClick={onEndConcentration}
            >
              {tc('spellCasting.endConcentration')}
            </Button>
          )}
        </div>
      )}

      {/* Spellcasting stats header */}
      {spellcasting &&
        (spellcasting.ability != null || spellcasting.spellSaveDC != null || spellcasting.spellAttackBonus != null) && (
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
        {/* Active Class Features & Ki / Focus Actions */}
        {activeFeatures.length > 0 && (
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {tc('spellcastingPanel.classAbilities')}
            </div>
            <div className="space-y-1.5">
              {activeFeatures.map((rf, i) => {
                const featName = t(`features.${rf.feature.id}.name`, {
                  defaultValue: rf.feature.name ?? rf.feature.id,
                });
                const featDesc = t(`features.${rf.feature.id}.description`, {
                  defaultValue: rf.feature.description ?? '',
                });
                return (
                  <FeatureRow
                    key={i}
                    name={featName}
                    description={featDesc}
                    saveDC={rf.saveDC}
                    saveAbility={rf.feature.saveDC?.dcAbility}
                    action={actions?.find((a) => a.key === `feature:${rf.feature.id}`)}
                    onSelectRollPreset={onSelectRollPreset}
                  />
                );
              })}
            </div>
          </div>
        )}

        {prepSc && (
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">
              {tc('spellPrep.prepared', { count: prepared.length, max: prepSc.preparedCount })}
            </div>
            {onChangePrepared && (
              <Button type="button" size="sm" variant="outline" onClick={() => setPrepDialogOpen(true)}>
                {tc('spellPrep.button')}
              </Button>
            )}
          </div>
        )}

        {spellcasting && spellcasting.knownSpells.length > 0 && (
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {tc('characterSheet.sections.knownSpells')}
          </div>
        )}

        {spellcasting && spellcasting.cantrips.length > 0 && (
          <div>
            <div className="text-xs font-bold text-muted-foreground mb-2">{cantripsHeader}</div>
            <div className="space-y-1">
              {spellcasting.cantrips.map((id) => (
                <SpellItemRow key={id} {...rowProps(id)} />
              ))}
            </div>
          </div>
        )}

        {spellcasting && spellcasting.alwaysPreparedSpells.length > 0 && (
          <div>
            <div className="text-xs font-bold text-muted-foreground mb-2">
              {tc('characterSheet.sections.alwaysPrepared')}
            </div>
            <div className="space-y-1">
              {spellcasting.alwaysPreparedSpells.map((id) => (
                <SpellItemRow key={id} {...rowProps(id)} />
              ))}
            </div>
          </div>
        )}

        {spellcasting &&
          sortedLevels.map((lvl) => {
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
                    <SpellItemRow key={id} {...rowProps(id)} level={lvl} />
                  ))}
                </div>
              </div>
            );
          })}
      </div>
      {prepSc && onChangePrepared && (
        <SpellPreparationDialog
          open={prepDialogOpen}
          onOpenChange={setPrepDialogOpen}
          pool={getPreparationPool(classId, prepSc)}
          prepared={prepared}
          cap={prepSc.preparedCount}
          onChange={onChangePrepared}
        />
      )}
    </div>
  );
}
