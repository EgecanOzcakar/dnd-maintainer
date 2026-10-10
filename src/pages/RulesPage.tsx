import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Search, SearchX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePageTitle } from '@/hooks/usePageTitle';
import { DND_CLASSES } from '@/lib/dnd-helpers';
import {
  buildRuleEntries,
  groupByCategory,
  hasSpellFilters,
  NO_SPELL_FILTERS,
  searchRules,
  type RuleEntry,
  type Translate,
  type SpellFilters,
} from '@/lib/rules-search';
import type { SpellSchool } from '@/types/spells';

const SCHOOLS: readonly SpellSchool[] = [
  'abjuration',
  'conjuration',
  'divination',
  'enchantment',
  'evocation',
  'illusion',
  'necromancy',
  'transmutation',
];
const SEARCH_DEBOUNCE_MS = 250;
const SELECT_CLASS =
  'h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function SpellDetail({ entry }: { entry: RuleEntry }) {
  const { t: tc } = useTranslation('common');
  const { t: tg } = useTranslation('gamedata');
  const spell = entry.spell;
  if (!spell) return null;
  const m = entry.mechanics;
  const comps = [
    spell.components.verbal && tc('rules.spell.verbal'),
    spell.components.somatic && tc('rules.spell.somatic'),
    spell.components.material !== false && `${tc('rules.spell.material')} (${spell.components.material})`,
  ]
    .filter(Boolean)
    .join(', ');
  const rows: [string, string][] = [
    [tc('rules.spell.castingTime'), spell.castingTime],
    [tc('rules.spell.range'), spell.range],
    [tc('rules.spell.components'), comps || '-'],
    [tc('rules.spell.duration'), spell.duration],
    [tc('rules.spell.classes'), spell.nativeClasses.map((c) => tg(`classes.${c}`)).join(', ')],
  ];
  if (m?.attack) rows.push([tc('rules.spell.attackRoll'), tc(`rules.spell.${m.attack}`)]);
  if (m?.save) rows.push([tc('rules.spell.save'), tc('rules.spell.saveValue', { ability: tg(`abilities.${m.save}`) })]);
  if (m?.damage) {
    const flat = m.damage.flat ? ` + ${m.damage.flat}` : '';
    const scaling = m.damage.cantripScaling ? ` (${tc('rules.spell.cantripScaling')})` : '';
    rows.push([tc('rules.spell.damage'), `${m.damage.dice}${flat} ${tg(`damageTypes.${m.damage.type}`)}${scaling}`]);
    if (m.damage.perSlot) rows.push([tc('rules.spell.upcast'), `+${m.damage.perSlot}`]);
  }
  if (m?.heal) {
    const base = [m.heal.dice, m.heal.flat].filter(Boolean).join(' + ');
    rows.push([tc('rules.spell.healing'), base || '-']);
    const slot = m.heal.perSlot ? `+${m.heal.perSlot}` : m.heal.flatPerSlot ? `+${m.heal.flatPerSlot}` : '';
    if (slot) rows.push([tc('rules.spell.upcast'), slot]);
  }
  return (
    <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-2">
          <dt className="shrink-0 font-medium text-muted-foreground">{label}:</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ResultRow({ entry }: { entry: RuleEntry }) {
  const { t: tc } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const spell = entry.spell;
  const expandable = Boolean(entry.description || spell);
  const subtitle = spell
    ? spell.level === 0
      ? tc('rules.spell.cantripSchool', { school: tc(`rules.schools.${spell.school}`) })
      : tc('rules.spell.levelSchool', { level: spell.level, school: tc(`rules.schools.${spell.school}`) })
    : '';
  return (
    <li className="border-b last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-3 text-left hover:bg-muted/50 disabled:cursor-default"
        aria-expanded={expandable ? open : undefined}
        disabled={!expandable}
        onClick={() => setOpen((o) => !o)}
      >
        {expandable ? (
          open ? (
            <ChevronDown className="size-4 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="size-4 shrink-0" aria-hidden />
          )
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{entry.name}</span>
          {subtitle && <span className="block text-xs text-muted-foreground">{subtitle}</span>}
        </span>
        {spell?.concentration && <Badge variant="outline">{tc('rules.spell.concentration')}</Badge>}
        {spell?.ritual && <Badge variant="outline">{tc('rules.spell.ritual')}</Badge>}
      </button>
      {open && (
        <div className="px-3 pb-3 pl-9">
          {entry.description && <p className="text-sm">{entry.description}</p>}
          <SpellDetail entry={entry} />
        </div>
      )}
    </li>
  );
}

/** Rows rendered per category before "Show all": the full catalog is several hundred rows. */
const GROUP_PREVIEW = 50;

export default function RulesPage() {
  const { t: tc } = useTranslation('common');
  const { t: tg } = useTranslation('gamedata');
  usePageTitle(tc('rules.title'));

  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SpellFilters>(NO_SPELL_FILTERS);
  const [showAll, setShowAll] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const id = setTimeout(() => setQuery(input), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [input]);

  const entries = useMemo(() => buildRuleEntries(tg as unknown as Translate, tc as unknown as Translate), [tg, tc]);
  const groups = useMemo(() => groupByCategory(searchRules(entries, query, filters)), [entries, query, filters]);
  const total = groups.reduce((n, g) => n + g.entries.length, 0);
  const set = (patch: Partial<SpellFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const filtered = hasSpellFilters(filters);

  return (
    <div className="page-container">
      <h1 className="page-title">{tc('rules.title')}</h1>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          className="pl-9"
          aria-label={tc('rules.searchLabel')}
          placeholder={tc('rules.searchPlaceholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>

      <fieldset className="mb-4 grid grid-cols-2 items-end gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <legend className="sr-only">{tc('rules.filters.spellFilters')}</legend>
        <label className="text-xs font-medium">
          {tc('rules.filters.class')}
          <select className={SELECT_CLASS} value={filters.classId} onChange={(e) => set({ classId: e.target.value })}>
            <option value="">{tc('rules.filters.anyClass')}</option>
            {DND_CLASSES.map((c) => (
              <option key={c.id} value={c.id}>
                {tg(`classes.${c.id}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          {tc('rules.filters.level')}
          <select className={SELECT_CLASS} value={filters.level} onChange={(e) => set({ level: e.target.value })}>
            <option value="">{tc('rules.filters.anyLevel')}</option>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
              <option key={l} value={l}>
                {l === 0 ? tc('rules.cantrip') : tc('rules.levelOption', { level: l })}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          {tc('rules.filters.school')}
          <select className={SELECT_CLASS} value={filters.school} onChange={(e) => set({ school: e.target.value })}>
            <option value="">{tc('rules.filters.anySchool')}</option>
            {SCHOOLS.map((s) => (
              <option key={s} value={s}>
                {tc(`rules.schools.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={filters.concentration}
            onChange={(e) => set({ concentration: e.target.checked })}
          />
          {tc('rules.filters.concentration')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={filters.ritual}
            onChange={(e) => set({ ritual: e.target.checked })}
          />
          {tc('rules.filters.ritual')}
        </label>
      </fieldset>

      <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground" aria-live="polite">
        <span>{tc('rules.resultCount', { count: total })}</span>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(NO_SPELL_FILTERS)}>
            {tc('rules.clearFilters')}
          </Button>
        )}
      </div>

      {total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <SearchX className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">{tc('rules.emptyTitle')}</p>
            <p className="text-sm text-muted-foreground">{tc('rules.emptyHint')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.category} aria-labelledby={`rules-${g.category}`}>
              <h2 id={`rules-${g.category}`} className="mb-1 flex items-center gap-2 text-lg font-semibold">
                {tc(`rules.categories.${g.category}`)}
                <Badge variant="secondary">{g.entries.length}</Badge>
              </h2>
              <Card>
                <ul>
                  {(showAll.has(g.category) ? g.entries : g.entries.slice(0, GROUP_PREVIEW)).map((e) => (
                    <ResultRow key={`${e.category}-${e.id}`} entry={e} />
                  ))}
                </ul>
                {!showAll.has(g.category) && g.entries.length > GROUP_PREVIEW && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAll((prev) => new Set(prev).add(g.category))}
                  >
                    {tc('rules.showAll', { count: g.entries.length })}
                  </Button>
                )}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
