import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Swords, Sparkles, Zap, Clock, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DiceRoller } from '@/components/character-sheet/DiceRoller';
import type { DieSize } from '@/components/character-sheet/DiceRoller';
import { formatSigned } from '@/lib/format';
import { isSpellId, getSpellDef } from '@/lib/sources/spells';
import { getSpellDisplayMeta } from '@/lib/spell-display';
import { getItemNameKey } from '@/lib/sources/items';
import type { ResolvedCharacter, ResolvedFeature } from '@/types/resolved';
import type { AbilityKey } from '@/lib/dnd-helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CombatViewProps {
  readonly resolved: ResolvedCharacter | null;
  readonly abilities: ResolvedCharacter['abilities'] | undefined;
  readonly armorClass: number | null;
  readonly speedValue: number | null | undefined;
  readonly speed?: ResolvedCharacter['speed'];
  readonly maxHP: number | null | undefined;
  readonly profBonus: number;
  readonly passivePerception?: number | null;
  readonly isStale: boolean;
  readonly buildError: string | null;
}

interface DiceRollerPreset {
  die: DieSize;
  count: number;
  modifier: number;
  label: string;
}

type ActionCategory = 'action' | 'bonus' | 'reaction' | 'other';

interface ActionItem {
  readonly id: string;
  readonly name: string;
  readonly category: ActionCategory;
  readonly type: 'attack' | 'spell' | 'feature';
  readonly detail?: string;       // e.g. "1d8+4 piercing", "DC 15 Dex"
  readonly meta?: string;         // e.g. "Lvl 2 • Evocation • Concentration"
  readonly range?: string;
  readonly attackBonus?: number;
  readonly die?: DieSize;
  readonly dieCount?: number;
  readonly modifier?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifySpellCastingTime(castingTime: string): ActionCategory {
  const t = castingTime.toLowerCase();
  if (t === 'action') return 'action';
  if (t === 'bonus action') return 'bonus';
  if (t.startsWith('reaction')) return 'reaction';
  return 'other';
}

/**
 * Parse a damage dice string like "1d8" into count + die size.
 * Returns null if the string doesn't match the expected pattern.
 */
function parseDamageDice(damageDice: string): { count: number; die: DieSize } | null {
  const match = /^(\d+)d(\d+)$/.exec(damageDice);
  if (!match) return null;
  const count = parseInt(match[1], 10);
  const die = parseInt(match[2], 10) as DieSize;
  const valid: DieSize[] = [4, 6, 8, 10, 12, 20, 100];
  if (!valid.includes(die)) return null;
  return { count, die };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
      <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{count}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function ActionRow({
  item,
  onRoll,
}: {
  item: ActionItem;
  onRoll: (preset: DiceRollerPreset) => void;
}) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);

  const canRoll = item.die !== undefined;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
        )}

        {/* Name */}
        <span className="flex-1 text-sm font-semibold text-foreground truncate">{item.name}</span>

        {/* Detail (damage / save) */}
        {item.detail && (
          <span className="text-xs text-muted-foreground font-mono">{item.detail}</span>
        )}

        {/* Attack bonus badge */}
        {item.attackBonus !== undefined && (
          <Badge variant="secondary" className="text-[10px] font-bold py-0 shrink-0">
            {formatSigned(item.attackBonus)}
          </Badge>
        )}

        {/* Roll button */}
        {canRoll && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRoll({
                die: item.die!,
                count: item.dieCount ?? 1,
                modifier: item.modifier ?? 0,
                label: item.name,
              });
            }}
            className="ml-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors shrink-0"
          >
            {tc('characterSheet.combatView.actions.roll')}
          </button>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-border/60 bg-muted/20">
          {item.meta && (
            <p className="text-xs text-muted-foreground">{item.meta}</p>
          )}
          {item.range && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground/70">Range:</span> {item.range}
            </p>
          )}
          {item.attackBonus !== undefined && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground/70">Attack:</span>{' '}
              {formatSigned(item.attackBonus)} to hit
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Ability score shield with expandable source breakdown
function AbilityCard({
  abilityKey,
  ability,
}: {
  abilityKey: AbilityKey;
  ability: ResolvedCharacter['abilities'][AbilityKey];
}) {
  const { t } = useTranslation('gamedata');
  const [expanded, setExpanded] = useState(false);

  const mod = ability.modifier;

  return (
    <button
      type="button"
      onClick={() => setExpanded((p) => !p)}
      className={`
        flex flex-col items-center rounded-xl border-2 px-3 py-3 text-center transition-all duration-200 cursor-pointer w-full
        ${expanded ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50'}
      `}
    >
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
        {t(`abilities.${abilityKey}`)}
      </div>
      <div className={`text-4xl font-black leading-tight ${mod >= 0 ? 'text-primary' : 'text-destructive'}`}>
        {mod >= 0 ? '+' : ''}{mod}
      </div>
      <div className="mt-1 rounded-full border bg-card px-2 text-sm font-bold text-foreground">
        {ability.total}
      </div>

      {expanded && ability.bonuses.length > 0 && (
        <div className="mt-2 w-full text-left space-y-0.5 border-t border-border/50 pt-2">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Base</span>
            <span className="font-mono">{ability.base}</span>
          </div>
          {ability.bonuses.map((b, i) => {
            const sourceName =
              b.source.origin === 'class' ? t(`classes.${b.source.id}`)
              : b.source.origin === 'subclass' ? t(`subclasses.${b.source.id}.name`)
              : b.source.origin === 'species' ? t(`species.${b.source.id}`)
              : b.source.origin === 'background' ? t(`backgrounds.${b.source.id}`)
              : b.source.origin === 'feat' ? t(`feats.${b.source.id}.name`, { defaultValue: b.source.id })
              : b.source.id;
            return (
              <div key={i} className="flex justify-between text-[10px]">
                <span className="text-muted-foreground truncate max-w-[80%]">{sourceName}</span>
                <span className={`font-mono font-semibold ${b.value >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                  {formatSigned(b.value)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

// Compact combat stat tile
function StatTile({
  label,
  value,
  subtext,
  highlight,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border-2 px-3 py-3 text-center ${highlight ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-muted/30'}`}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">{label}</div>
      <div className="text-2xl font-black text-foreground leading-tight">{value}</div>
      {subtext && <div className="text-[10px] text-muted-foreground mt-0.5">{subtext}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CombatView({
  resolved,
  abilities,
  armorClass,
  speedValue,
  speed,
  maxHP,
  profBonus,
  passivePerception,
  isStale,
  buildError,
}: CombatViewProps) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');
  const [rollerPreset, setRollerPreset] = useState<DiceRollerPreset | null>(null);

  // ── Speed display ──────────────────────────────────────────────────────────
  const speedDisplay = (() => {
    if (speed && Object.keys(speed).length > 0) {
      const parts: string[] = [];
      if (speed.walk != null) parts.push(`${speed.walk.value} ft`);
      const others = (['fly', 'climb', 'swim', 'burrow'] as const).filter((m) => speed[m] != null);
      for (const mode of others) {
        parts.push(`${tc(`characterSheet.fields.speedModes.${mode}`)} ${speed[mode]!.value} ft`);
      }
      return parts.join(', ') || '—';
    }
    return speedValue != null ? `${speedValue} ft` : '—';
  })();

  // ── Action Items ───────────────────────────────────────────────────────────
  const actionItems: ActionItem[] = [];

  // Weapon attacks → always Action
  if (resolved?.attacks) {
    for (const attack of resolved.attacks) {
      const weaponName = t(getItemNameKey('weapon', attack.weaponId), { defaultValue: attack.weaponId });
      const parsed = parseDamageDice(attack.damageDice);
      const damageType = t(`damageTypes.${attack.damageType}`, { defaultValue: attack.damageType });
      actionItems.push({
        id: `attack-${attack.weaponId}`,
        name: weaponName,
        category: 'action',
        type: 'attack',
        attackBonus: attack.attackBonus,
        detail: `${attack.damageDice}${attack.damageBonus !== 0 ? formatSigned(attack.damageBonus) : ''} ${damageType}`,
        range: attack.range === 'ranged' && attack.normalRange !== undefined
          ? `${attack.normalRange}/${attack.longRange ?? attack.normalRange} ft`
          : attack.range === 'ranged' ? 'Ranged' : 'Melee 5 ft',
        die: parsed?.die ?? 20,
        dieCount: parsed?.count ?? 1,
        modifier: attack.damageBonus,
        meta: attack.properties.length > 0
          ? attack.properties.map((p) => t(`weaponProperties.${p}`, { defaultValue: p })).join(', ')
          : undefined,
      });
    }
  }

  // Spells → classify by castingTime
  const allSpellIds: string[] = [];
  if (resolved?.spellcasting) {
    allSpellIds.push(...resolved.spellcasting.cantrips);
    allSpellIds.push(...resolved.spellcasting.knownSpells.map((s) => s.spellId));
    allSpellIds.push(...resolved.spellcasting.alwaysPreparedSpells);
  }

  // deduplicate
  const seenSpells = new Set<string>();
  for (const spellId of allSpellIds) {
    if (seenSpells.has(spellId)) continue;
    seenSpells.add(spellId);

    const def = isSpellId(spellId) ? getSpellDef(spellId) : null;
    const meta = getSpellDisplayMeta(spellId);
    const spellName = isSpellId(spellId)
      ? t(`spells.${spellId}.name`, { defaultValue: spellId })
      : spellId;

    const category = def ? classifySpellCastingTime(def.castingTime) : 'other';

    const metaParts: string[] = [];
    if (meta) {
      metaParts.push(meta.level === 0 ? tc('characterSheet.combatView.actions.cantrip') : `Lvl ${meta.level}`);
      metaParts.push(meta.school.charAt(0).toUpperCase() + meta.school.slice(1));
    }
    if (def?.concentration) metaParts.push(tc('characterSheet.combatView.actions.concentration'));
    if (def?.ritual) metaParts.push(tc('characterSheet.combatView.actions.ritual'));

    let detail: string | undefined;
    if (resolved?.spellcasting?.spellSaveDC != null) {
      detail = `DC ${resolved.spellcasting.spellSaveDC}`;
    } else if (resolved?.spellcasting?.spellAttackBonus != null) {
      detail = `${formatSigned(resolved.spellcasting.spellAttackBonus)} to hit`;
    }

    actionItems.push({
      id: `spell-${spellId}`,
      name: spellName,
      category,
      type: 'spell',
      detail,
      range: def?.range,
      meta: metaParts.join(' • ') || undefined,
      // Spells use d20 for attack rolls
      die: 20,
      dieCount: 1,
      modifier: resolved?.spellcasting?.spellAttackBonus ?? 0,
    });
  }

  // Class features with usesPerRest → Features section
  const featureItems: ResolvedFeature[] = [];
  if (resolved?.features) {
    for (const rf of resolved.features) {
      if (rf.feature.usesPerRest) {
        featureItems.push(rf);
      }
    }
  }

  // ── Group by category ──────────────────────────────────────────────────────
  const actions = actionItems.filter((i) => i.category === 'action');
  const bonusActions = actionItems.filter((i) => i.category === 'bonus');
  const reactions = actionItems.filter((i) => i.category === 'reaction');
  const other = actionItems.filter((i) => i.category === 'other');

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {buildError && (
        <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
          {tc('characterSheet.buildError.combat', { message: buildError })}
        </div>
      )}

      {/* ── Combat Stats Bar ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          {tc('characterSheet.combatView.sections.combatStats')}
        </h2>
        <div className={`grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 ${isStale ? 'opacity-60' : ''}`}>
          <StatTile label="AC" value={armorClass ?? '—'} highlight />
          <StatTile
            label="Initiative"
            value={
              resolved
                ? formatSigned(resolved.initiative)
                : abilities
                  ? formatSigned(abilities.dex.modifier)
                  : '—'
            }
          />
          <StatTile label="HP Max" value={maxHP ?? '—'} highlight />
          <StatTile label="Speed" value={speedDisplay} />
          <StatTile label="Prof Bonus" value={`+${profBonus}`} />
          {passivePerception != null && (
            <StatTile label="Passive Perc." value={passivePerception} />
          )}
          {resolved?.spellcasting?.spellSaveDC != null && (
            <StatTile label="Spell DC" value={resolved.spellcasting.spellSaveDC} />
          )}
          {resolved?.spellcasting?.spellAttackBonus != null && (
            <StatTile label="Spell ATK" value={formatSigned(resolved.spellcasting.spellAttackBonus)} />
          )}
        </div>
      </section>

      {/* ── Two-column: Abilities + Dice Roller ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Ability Scores */}
        {abilities && (
          <section>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              {tc('characterSheet.combatView.sections.abilityScores')}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(abilities) as AbilityKey[]).map((key) => (
                <AbilityCard key={key} abilityKey={key} ability={abilities[key]} />
              ))}
            </div>
          </section>
        )}

        {/* Dice Roller */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
            {tc('characterSheet.combatView.sections.diceRoller')}
          </h2>
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <DiceRoller
              presetDie={rollerPreset?.die}
              presetCount={rollerPreset?.count}
              presetModifier={rollerPreset?.modifier}
              contextLabel={rollerPreset?.label}
            />
          </div>
        </section>
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Swords className="size-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">
            {tc('characterSheet.combatView.sections.actions')}
          </h2>
          <Badge variant="secondary" className="text-[10px] py-0">{actions.length}</Badge>
        </div>
        {actions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{tc('characterSheet.combatView.actions.noActions')}</p>
        ) : (
          <div className="space-y-2">
            {actions.map((item) => (
              <ActionRow key={item.id} item={item} onRoll={setRollerPreset} />
            ))}
          </div>
        )}
      </section>

      {/* ── Bonus Actions ───────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="size-4 text-amber-500" />
          <h2 className="text-sm font-bold text-foreground">
            {tc('characterSheet.combatView.sections.bonusActions')}
          </h2>
          <Badge variant="secondary" className="text-[10px] py-0">{bonusActions.length}</Badge>
        </div>
        {bonusActions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{tc('characterSheet.combatView.actions.noBonusActions')}</p>
        ) : (
          <div className="space-y-2">
            {bonusActions.map((item) => (
              <ActionRow key={item.id} item={item} onRoll={setRollerPreset} />
            ))}
          </div>
        )}
      </section>

      {/* ── Reactions ───────────────────────────────────────────────────── */}
      {reactions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-4 text-blue-500" />
            <h2 className="text-sm font-bold text-foreground">
              {tc('characterSheet.combatView.sections.reactions')}
            </h2>
            <Badge variant="secondary" className="text-[10px] py-0">{reactions.length}</Badge>
          </div>
          <div className="space-y-2">
            {reactions.map((item) => (
              <ActionRow key={item.id} item={item} onRoll={setRollerPreset} />
            ))}
          </div>
        </section>
      )}

      {/* ── Other (rituals, long cast) ───────────────────────────────────── */}
      {other.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-bold text-foreground">
              {tc('characterSheet.combatView.sections.other')}
            </h2>
            <Badge variant="secondary" className="text-[10px] py-0">{other.length}</Badge>
          </div>
          <div className="space-y-2">
            {other.map((item) => (
              <ActionRow key={item.id} item={item} onRoll={setRollerPreset} />
            ))}
          </div>
        </section>
      )}

      {/* ── Class Features ───────────────────────────────────────────────── */}
      {featureItems.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="size-4 text-purple-500" />
            <h2 className="text-sm font-bold text-foreground">
              {tc('characterSheet.combatView.sections.features')}
            </h2>
            <Badge variant="secondary" className="text-[10px] py-0">{featureItems.length}</Badge>
          </div>
          <div className="space-y-2">
            {featureItems.map((rf, i) => {
              const featureName = t(`features.${rf.feature.id}.name`, {
                defaultValue: rf.feature.name ?? rf.feature.id,
              });
              const regenLabel =
                rf.feature.usesPerRest === 'short'
                  ? tc('characterSheet.resourcePools.regen.short-rest')
                  : tc('characterSheet.resourcePools.regen.long-rest');

              return (
                <div key={i} className="rounded-lg border border-border bg-card px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{featureName}</span>
                    <Badge variant="outline" className="text-[10px] py-0 shrink-0">
                      {rf.feature.usesCount
                        ? tc('characterSheet.combatView.actions.usesPerRest', {
                            uses: rf.feature.usesCount,
                            regen: regenLabel,
                          })
                        : regenLabel}
                    </Badge>
                  </div>
                  {rf.saveDC !== undefined && rf.feature.saveDC && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {tc('characterSheet.fields.saveDC', {
                        dc: rf.saveDC,
                        ability: t(`abilities.${rf.feature.saveDC.dcAbility}`),
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
