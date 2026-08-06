import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext, useParams } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Compass,
  Filter,
  GraduationCap,
  Layers,
  Search,
  Shield,
  Sparkles,
  Sword,
  Wand2,
  Zap,
} from 'lucide-react';
import { useGameData } from '@/hooks/useGameData';
import { CLASS_ICONS } from '@/lib/class-icons';
import type { ClassId } from '@/lib/dnd-helpers';
import { SUBCLASS_IDS_BY_CLASS, type SubclassId } from '@/lib/sources/subclasses';
import {
  getClassProgression,
  getClassWikiSummary,
  getSkillMatrix,
  type LevelProgression,
} from '@/lib/wiki-helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CampaignContext } from '@/hooks/useCampaignContext';

export default function WikiPage() {
  const { campaignSlug } = useParams<{ campaignSlug: string }>();
  const context = useOutletContext<CampaignContext | undefined>();
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');

  const { classes, subclasses } = useGameData(campaignSlug ?? context?.campaignSlug);

  const [selectedClassId, setSelectedClassId] = useState<ClassId>('barbarian');
  const [selectedSubclassId, setSelectedSubclassId] = useState<SubclassId | 'none'>('none');
  const [activeTab, setActiveTab] = useState<'progression' | 'skills' | 'subclasses'>('progression');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  useEffect(() => {
    context?.setPageTitle?.(tc('wiki.title'));
  }, [context, tc]);

  // Reset subclass choice when class changes
  const handleSelectClass = (clsId: ClassId) => {
    setSelectedClassId(clsId);
    setSelectedSubclassId('none');
  };

  const selectedClassSource = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) ?? classes[0];
  }, [classes, selectedClassId]);

  const availableSubclassIds = useMemo(() => {
    if (!selectedClassId || !(selectedClassId in SUBCLASS_IDS_BY_CLASS)) return [];
    return SUBCLASS_IDS_BY_CLASS[selectedClassId];
  }, [selectedClassId]);

  const selectedSubclassSource = useMemo(() => {
    if (selectedSubclassId === 'none') return undefined;
    return subclasses[selectedSubclassId];
  }, [subclasses, selectedSubclassId]);

  const progression: LevelProgression[] = useMemo(() => {
    if (!selectedClassSource) return [];
    return getClassProgression(selectedClassSource, selectedSubclassSource);
  }, [selectedClassSource, selectedSubclassSource]);

  const classSummary = useMemo(() => {
    if (!selectedClassSource) return null;
    return getClassWikiSummary(selectedClassSource);
  }, [selectedClassSource]);

  const skillMatrix = useMemo(() => {
    return getSkillMatrix(classes);
  }, [classes]);

  // Filter progression by search query & level filter
  const filteredProgression = useMemo(() => {
    return progression.filter((levelData) => {
      if (levelFilter !== 'all' && levelData.level !== Number(levelFilter)) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();

      // Match feature names or descriptions
      const featureMatch = [...levelData.classFeatures, ...levelData.subclassFeatures].some((feat) => {
        const featName = t(`features.${feat.id}.name`, { defaultValue: feat.name ?? feat.id }).toLowerCase();
        const featDesc = t(`features.${feat.id}.description`, { defaultValue: feat.description ?? '' }).toLowerCase();
        return featName.includes(query) || featDesc.includes(query);
      });

      // Match skill unlocks
      const skillMatch = levelData.skillUnlocks.some((unlock) => {
        if (unlock.skill) {
          const skillName = t(`skills.${unlock.skill}`).toLowerCase();
          if (skillName.includes(query)) return true;
        }
        if (unlock.from) {
          return unlock.from.some((sk) => t(`skills.${sk}`).toLowerCase().includes(query));
        }
        return false;
      });

      return featureMatch || skillMatch;
    });
  }, [progression, levelFilter, searchQuery, t]);

  const SelectedIcon = selectedClassId ? CLASS_ICONS[selectedClassId] : Shield;

  return (
    <div className="page-container space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/15 via-primary/5 to-background border border-primary/20 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{tc('wiki.title')}</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">{tc('wiki.subtitle')}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={tc('wiki.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Class Picker Grid */}
      <div className="space-y-2">
        <div className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
          {tc('buttons.select')} {tc('wiki.labels.primaryAbility')}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {classes.map((cls) => {
            const Icon = CLASS_ICONS[cls.id] || Shield;
            const isSelected = cls.id === selectedClassId;
            return (
              <button
                key={cls.id}
                onClick={() => handleSelectClass(cls.id)}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200
                  ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                      : 'bg-card hover:bg-accent hover:border-primary/50 text-card-foreground'
                  }
                `}
              >
                <div
                  className={`p-2 rounded-md ${isSelected ? 'bg-primary-foreground/10' : 'bg-muted text-primary'}`}
                >
                  <Icon className="size-5 shrink-0" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{t(`classes.${cls.id}`)}</div>
                  <div className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {tc('wiki.labels.hitDieShort', {
                      die: cls.levels[0]?.grants.find((g) => g.type === 'hit-die')?.die ?? 8,
                      ability: t(`abilities.${cls.primaryAbility}`).slice(0, 3),
                    })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {selectedClassSource && classSummary && (
        <div className="space-y-6">
          {/* Class Summary Banner */}
          <Card className="border-primary/20 bg-card/60 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <SelectedIcon className="size-8" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      {t(`classes.${selectedClassId}`)}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <span>
                        {tc('wiki.labels.hitDie')}:{' '}
                        <strong className="text-foreground">
                          {tc('wiki.labels.hitDieValue', { die: classSummary.hitDie })}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        {tc('wiki.labels.primaryAbility')}:{' '}
                        <strong className="text-foreground">{t(`abilities.${classSummary.primaryAbility}`)}</strong>
                      </span>
                    </CardDescription>
                  </div>
                </div>

                {/* Subclass Selector Pills */}
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Layers className="size-3.5" />
                    {tc('wiki.labels.subclass')}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant={selectedSubclassId === 'none' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedSubclassId('none')}
                      className="h-8 text-xs"
                    >
                      {tc('wiki.labels.allSubclasses')}
                    </Button>
                    {availableSubclassIds.map((subId) => (
                      <Button
                        key={subId}
                        variant={selectedSubclassId === subId ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedSubclassId(subId)}
                        className="h-8 text-xs"
                      >
                        {t(`subclasses.${subId}.name`, { defaultValue: subId })}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-0">
              <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                <span className="font-semibold text-foreground block">{tc('wiki.labels.savingThrows')}</span>
                <div className="flex flex-wrap gap-1">
                  {classSummary.savingThrows.map((st) => (
                    <Badge key={st} variant="secondary">
                      {t(`abilities.${st}`)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                <span className="font-semibold text-foreground block">{tc('wiki.labels.armorProficiencies')}</span>
                <p className="text-muted-foreground">
                  {classSummary.armorProficiencies.length > 0
                    ? classSummary.armorProficiencies.map((p) => t(`armor.${p}`, { defaultValue: p })).join(', ')
                    : tc('none')}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                <span className="font-semibold text-foreground block">{tc('wiki.labels.startingSkills')}</span>
                {classSummary.startingSkills ? (
                  <p className="text-muted-foreground">
                    {tc('wiki.labels.chooseSkills', {
                      count: classSummary.startingSkills.count,
                      skills: classSummary.startingSkills.from
                        ? classSummary.startingSkills.from.map((s) => t(`skills.${s}`)).join(', ')
                        : tc('wiki.labels.chooseAnySkills'),
                    })}
                  </p>
                ) : (
                  <p className="text-muted-foreground">{tc('none')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border pb-2">
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'progression' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('progression')}
                className="gap-2"
              >
                <Compass className="size-4" />
                {tc('wiki.tabs.progression')}
              </Button>
              <Button
                variant={activeTab === 'skills' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('skills')}
                className="gap-2"
              >
                <Zap className="size-4" />
                {tc('wiki.tabs.skills')}
              </Button>
              <Button
                variant={activeTab === 'subclasses' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('subclasses')}
                className="gap-2"
              >
                <Sparkles className="size-4" />
                {tc('wiki.tabs.subclasses')}
              </Button>
            </div>

            {activeTab === 'progression' && (
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="h-9 text-xs w-36 rounded-lg border border-input bg-card px-2.5 py-1 font-medium text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3"
                >
                  <option value="all">{tc('wiki.labels.filterLevel')}</option>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => (
                    <option key={lvl} value={lvl.toString()}>
                      {tc('wiki.labels.level', { level: lvl })}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* TAB 1: Level Progression */}
          {activeTab === 'progression' && (
            <div className="space-y-4">
              {filteredProgression.length === 0 ? (
                <div className="text-center py-12 bg-card border rounded-lg p-6">
                  <BookOpen className="size-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground">{tc('none')}</h3>
                  <p className="text-sm text-muted-foreground">{tc('wiki.labels.noFeaturesAtLevel')}</p>
                </div>
              ) : (
                filteredProgression.map((levelData) => {
                  const hasFeatures =
                    levelData.classFeatures.length > 0 || levelData.subclassFeatures.length > 0;
                  const hasSkillUnlocks = levelData.skillUnlocks.length > 0;

                  return (
                    <Card
                      key={levelData.level}
                      className={`
                        transition-all border
                        ${hasSkillUnlocks ? 'border-amber-500/40 bg-amber-500/5' : 'bg-card'}
                      `}
                    >
                      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-muted/30 border-b">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-base font-bold px-3 py-1 bg-background">
                            {tc('wiki.labels.level', { level: levelData.level })}
                          </Badge>
                          <div className="text-xs font-semibold text-muted-foreground">
                            {tc('wiki.labels.proficiencyBonus')}:{' '}
                            <span className="text-foreground">+{levelData.proficiencyBonus}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 items-center">
                          {levelData.unlocksSubclass && (
                            <Badge variant="secondary" className="bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/30">
                              <Sparkles className="size-3 mr-1" />
                              {tc('wiki.labels.subclassSelection')}
                            </Badge>
                          )}
                          {levelData.isAsiLevel && (
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30">
                              <Sword className="size-3 mr-1" />
                              {tc('wiki.labels.asiFeat')}
                            </Badge>
                          )}
                          {hasSkillUnlocks && (
                            <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold">
                              <Zap className="size-3 mr-1" />
                              {tc('wiki.labels.skillUnlocks')}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 space-y-4">
                        {/* Skill Unlocks Section */}
                        {hasSkillUnlocks && (
                          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                              <Zap className="size-4" />
                              {tc('wiki.labels.skillUnlocks')}
                            </h4>
                            <ul className="space-y-1.5 text-xs text-foreground">
                              {levelData.skillUnlocks.map((unlock, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <CheckCircle2 className="size-4 text-amber-500 shrink-0 mt-0.5" />
                                  <div>
                                    {unlock.type === 'starting-choice' && (
                                      <span>
                                        {tc('wiki.labels.chooseSkills', {
                                          count: unlock.count ?? 2,
                                          skills: unlock.from
                                            ? unlock.from.map((s) => t(`skills.${s}`)).join(', ')
                                            : tc('wiki.labels.chooseAnySkills'),
                                        })}
                                      </span>
                                    )}
                                    {unlock.type === 'level-choice' && (
                                      <span>
                                        {tc('wiki.labels.chooseSkills', {
                                          count: unlock.count ?? 1,
                                          skills: unlock.from
                                            ? unlock.from.map((s) => t(`skills.${s}`)).join(', ')
                                            : tc('wiki.labels.chooseAnySkills'),
                                        })}
                                      </span>
                                    )}
                                    {unlock.type === 'direct' && unlock.skill && (
                                      <span>{tc('wiki.labels.directSkill', { skill: t(`skills.${unlock.skill}`) })}</span>
                                    )}
                                    {unlock.type === 'expertise' && (
                                      <span>
                                        {unlock.skill
                                          ? tc('wiki.labels.expertiseSkill', { skill: t(`skills.${unlock.skill}`) })
                                          : tc('wiki.labels.chooseExpertise', { count: unlock.count ?? 2 })}
                                      </span>
                                    )}
                                    {unlock.isSubclass && (
                                      <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1">
                                        {tc('wiki.labels.subclass')}
                                      </Badge>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Class & Subclass Features */}
                        {hasFeatures ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {levelData.classFeatures.map((feat) => (
                              <div key={feat.id} className="p-3 rounded-lg border bg-muted/20 space-y-1">
                                <div className="font-semibold text-sm text-foreground flex items-center justify-between">
                                  <span>{t(`features.${feat.id}.name`, { defaultValue: feat.name ?? feat.id })}</span>
                                  {feat.saveDC && (
                                    <Badge variant="outline" className="text-xs">
                                      {tc('wiki.labels.saveDCBadge', {
                                        ability: t(`abilities.${feat.saveDC.dcAbility}`).slice(0, 3),
                                      })}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {t(`features.${feat.id}.description`, { defaultValue: feat.description ?? '' })}
                                </p>
                              </div>
                            ))}

                            {levelData.subclassFeatures.map((feat) => (
                              <div key={feat.id} className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 space-y-1">
                                <div className="font-semibold text-sm text-purple-600 dark:text-purple-300 flex items-center justify-between">
                                  <span>{t(`features.${feat.id}.name`, { defaultValue: feat.name ?? feat.id })}</span>
                                  <Badge variant="secondary" className="text-[10px] bg-purple-500/20">
                                    {tc('wiki.labels.subclass')}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {t(`features.${feat.id}.description`, { defaultValue: feat.description ?? '' })}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          !hasSkillUnlocks && (
                            <p className="text-xs text-muted-foreground italic">
                              {tc('wiki.labels.noFeaturesAtLevel')}
                            </p>
                          )
                        )}

                        {/* Resource Pool Limits */}
                        {levelData.resourcePools.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                            {levelData.resourcePools.map((pool) => (
                              <Badge key={pool.poolId} variant="outline" className="text-xs gap-1">
                                <span className="font-semibold capitalize">{pool.poolId}:</span>
                                <span>{pool.max}</span>
                                <span className="text-[10px] text-muted-foreground">({pool.regen})</span>
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Spell Slots */}
                        {levelData.spellcasting && (
                          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-2">
                            <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-300 flex items-center gap-1.5">
                              <Wand2 className="size-3.5" />
                              {tc('wiki.labels.spellcasting')}
                            </h4>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {levelData.spellcasting.cantripsKnown !== undefined && (
                                <Badge variant="secondary">
                                  {tc('wiki.labels.cantrips')}: {levelData.spellcasting.cantripsKnown}
                                </Badge>
                              )}
                              {levelData.spellcasting.preparedCount !== undefined && levelData.spellcasting.preparedCount > 0 && (
                                <Badge variant="secondary">
                                  {tc('wiki.labels.preparedApprox', { count: levelData.spellcasting.preparedCount })}
                                </Badge>
                              )}
                              {levelData.spellcasting.pactMagic && (
                                <Badge variant="secondary" className="bg-purple-500/20">
                                  {tc('wiki.labels.pactMagicSlots', {
                                    slots: levelData.spellcasting.pactMagic.count,
                                    level: levelData.spellcasting.pactMagic.slotLevel,
                                  })}
                                </Badge>
                              )}
                              {levelData.spellcasting.slots?.map((count, idx) => (
                                <Badge key={idx} variant="outline">
                                  {tc('wiki.labels.slotLevelCount', { level: idx + 1, count })}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Skill Matrix */}
          {activeTab === 'skills' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="size-5 text-amber-500" />
                  {tc('wiki.labels.skillMatrixTitle')}
                </CardTitle>
                <CardDescription>{tc('wiki.labels.skillMatrixDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                      <th className="p-3">{tc('wiki.labels.startingSkills')}</th>
                      <th className="p-3">{tc('wiki.labels.keyAbility')}</th>
                      <th className="p-3">{tc('wiki.labels.startingClasses')}</th>
                      <th className="p-3">{tc('wiki.labels.levelUpUnlocks')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {skillMatrix.map((item) => (
                      <tr key={item.skillId} className="hover:bg-muted/30">
                        <td className="p-3 font-bold text-foreground flex items-center gap-2">
                          <span>{t(`skills.${item.skillId}`)}</span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{t(`abilities.${item.ability}`).slice(0, 3)}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {item.startingClasses.map((clsId) => (
                              <Badge key={clsId} variant="secondary" className="capitalize">
                                {t(`classes.${clsId}`)}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {item.levelUpUnlocks.length > 0 ? (
                              item.levelUpUnlocks.map((u, i) => (
                                <Badge key={i} variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                  {tc('wiki.labels.classLevelBadge', {
                                    className: t(`classes.${u.classId}`),
                                    level: u.level,
                                  })}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">{tc('none')}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: Subclasses Overview */}
          {activeTab === 'subclasses' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">
                {tc('wiki.labels.subclassesTitle', { className: t(`classes.${selectedClassId}`) })}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableSubclassIds.map((subId) => {
                  const subSource = subclasses[subId];
                  return (
                    <Card key={subId} className="border bg-card">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{t(`subclasses.${subId}.name`, { defaultValue: subId })}</span>
                          <Badge variant="outline">{t(`classes.${selectedClassId}`)}</Badge>
                        </CardTitle>
                        <CardDescription>
                          {t(`subclasses.${subId}.description`, { defaultValue: '' })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        <span className="font-semibold text-foreground block">
                          {tc('wiki.labels.featuresRoadmap')}
                        </span>
                        {subSource ? (
                          <div className="space-y-2">
                            {subSource.features.map((featGroup, idx) => (
                              <div key={idx} className="p-2 rounded border bg-muted/30 space-y-1">
                                <span className="font-bold text-primary">
                                  {tc('wiki.labels.levelHeader', { level: featGroup.classLevel })}
                                </span>
                                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                                  {featGroup.grants.map((g, gi) => {
                                    if (g.type === 'feature') {
                                      return (
                                        <li key={gi}>
                                          <strong className="text-foreground">
                                            {t(`features.${g.feature.id}.name`, {
                                              defaultValue: g.feature.name ?? g.feature.id,
                                            })}
                                          </strong>
                                        </li>
                                      );
                                    }
                                    if (g.type === 'spell') {
                                      return (
                                        <li key={gi}>
                                          {tc('wiki.labels.spellGrantItem', { spell: g.spellId })}
                                        </li>
                                      );
                                    }
                                    return null;
                                  })}
                                </ul>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">{tc('none')}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
