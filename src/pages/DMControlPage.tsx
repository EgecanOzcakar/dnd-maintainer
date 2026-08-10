import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Dices, Swords, RotateCcw, Sparkles, Heart, Plus, Minus, Shield, Eye, Brain, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCharacters } from '@/hooks/useCharacters';
import { useCampaignContext } from '@/hooks/useCampaignContext';
import { usePartyState, useUpdatePartyHP, useRecordCharacterRoll } from '@/hooks/usePartyState';
import { usePartyInitiatives, useUpdatePartyInitiatives } from '@/hooks/usePartyInitiatives';
import { usePartyCharacterStats } from '@/hooks/usePartyCharacterStats';
import type { CharacterSummary } from '@/types/database';
import { CommonImageDisplayer } from '@/components/common/CommonImageDisplayer';
import { toast } from 'sonner';

export default function DMControlPage() {
  const { campaignSlug } = useParams<{ campaignSlug: string }>();
  const { campaignId } = useCampaignContext();

  const targetCampaignId = campaignId || campaignSlug || '';

  const { data: characters = [] } = useCharacters(targetCampaignId);
  const { data: partyState } = usePartyState(targetCampaignId);
  const { data: partyInitState } = usePartyInitiatives(targetCampaignId);
  const updatePartyInitiatives = useUpdatePartyInitiatives();
  const updatePartyHP = useUpdatePartyHP();
  const recordCharacterRoll = useRecordCharacterRoll();

  // Filter only Player Characters (excluding NPCs)
  const pcs = characters.filter((c: CharacterSummary) => c.character_type === 'pc');

  // Fetch Perception, Wisdom, and Intelligence statistics for all PCs
  const { data: partyStats = {} } = usePartyCharacterStats(targetCampaignId, pcs);

  // Generic Dice Roller State
  const [numDice, setNumDice] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [rollHistory, setRollHistory] = useState<{ id: string; formula: string; result: number; rolls: number[] }[]>([]);

  // Roll d20 helper with optional modifier
  const rollD20 = (mod: number = 0) => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    return d20 + mod;
  };

  // Roll Generic Dice
  const handleGenericRoll = (sides: number) => {
    const rolls: number[] = [];
    let total = 0;
    for (let i = 0; i < numDice; i++) {
      const r = Math.floor(Math.random() * sides) + 1;
      rolls.push(r);
      total += r;
    }
    total += modifier;
    const formula = `${numDice}d${sides}${modifier >= 0 ? `+${modifier}` : modifier}`;
    const newEntry = { id: crypto.randomUUID(), formula, result: total, rolls };
    setRollHistory((prev) => [newEntry, ...prev.slice(0, 9)]);
    toast.success(`Rolled ${formula}: ${total}`);
  };

  // Roll on behalf of a specific PC
  const handleRollForPC = async (pc: CharacterSummary) => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const formula = '1d20';
    await recordCharacterRoll.mutateAsync({
      campaignId: targetCampaignId,
      characterId: pc.id,
      roll: {
        formula,
        total: d20,
        rolls: [d20],
        modifier: 0,
      },
    });
    toast.success(`Rolled d20 for ${pc.name}: ${d20}`);
  };

  // Roll specific check (Perception, Wisdom, Intelligence) on behalf of a specific PC
  const handleRollCheckForPC = async (
    pc: CharacterSummary,
    checkName: 'Perception' | 'Wisdom' | 'Intelligence',
    mod: number
  ) => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + mod;
    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
    const formula = `1d20${mod !== 0 ? modStr : ''}`;
    await recordCharacterRoll.mutateAsync({
      campaignId: targetCampaignId,
      characterId: pc.id,
      roll: {
        formula,
        total,
        rolls: [d20],
        modifier: mod,
        label: `${pc.name} - ${checkName} Check`,
      },
    });
    toast.success(`Rolled ${checkName} Check for ${pc.name}: ${total} (d20: ${d20}${modStr})`);
  };

  // Roll batch check for all party characters simultaneously
  const handleBatchRollCheck = async (checkName: 'Perception' | 'Wisdom' | 'Intelligence') => {
    if (!targetCampaignId || pcs.length === 0) {
      toast.error('No characters found to roll.');
      return;
    }

    const summaries: string[] = [];
    for (const pc of pcs) {
      const pcStat = partyStats[pc.id];
      const mod =
        checkName === 'Perception'
          ? (pcStat?.perceptionBonus ?? 0)
          : checkName === 'Wisdom'
            ? (pcStat?.wisMod ?? 0)
            : (pcStat?.intMod ?? 0);

      const d20 = Math.floor(Math.random() * 20) + 1;
      const total = d20 + mod;
      const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
      const formula = `1d20${mod !== 0 ? modStr : ''}`;

      await recordCharacterRoll.mutateAsync({
        campaignId: targetCampaignId,
        characterId: pc.id,
        roll: {
          formula,
          total,
          rolls: [d20],
          modifier: mod,
          label: `${pc.name} - ${checkName} Check`,
        },
      });
      summaries.push(`${pc.name}: ${total}`);
    }

    toast.success(`Rolled ${checkName} checks for party: ${summaries.join(', ')}`);
  };

  // Trigger Standalone Initiative Roll for all characters
  const handleTriggerInitiatives = async () => {
    if (!targetCampaignId || pcs.length === 0) {
      toast.error('No characters found in campaign to roll initiatives.');
      return;
    }

    const initiatives: Record<string, number> = {};
    pcs.forEach((pc) => {
      initiatives[pc.id] = rollD20(0);
    });

    await updatePartyInitiatives.mutateAsync({
      campaignId: targetCampaignId,
      initiatives,
    });

    toast.success('Rolled standalone initiatives for all party characters!');
  };

  // Clear / Reset Standalone Initiatives
  const handleResetInitiatives = async () => {
    if (!targetCampaignId) return;
    await updatePartyInitiatives.mutateAsync({
      campaignId: targetCampaignId,
      initiatives: {},
    });
    toast.info('Initiative rolls reset.');
  };

  // Update single character HP
  const handleAdjustHP = async (pcId: string, currentVal: number, maxVal: number, delta: number) => {
    const newHp = Math.max(0, Math.min(maxVal, currentVal + delta));
    await updatePartyHP.mutateAsync({
      campaignId: targetCampaignId,
      hpMap: { [pcId]: newHp },
    });
  };

  const handleSetExactHP = async (pcId: string, maxVal: number, valStr: string) => {
    const parsed = parseInt(valStr, 10);
    if (isNaN(parsed)) return;
    const clamped = Math.max(0, Math.min(maxVal, parsed));
    await updatePartyHP.mutateAsync({
      campaignId: targetCampaignId,
      hpMap: { [pcId]: clamped },
    });
  };

  // Full Heal All Characters
  const handleHealAllParty = async () => {
    if (!targetCampaignId || pcs.length === 0) return;
    const hpMap: Record<string, number> = {};
    pcs.forEach((pc) => {
      const maxHp = pc.hit_points_max ?? 10;
      hpMap[pc.id] = maxHp;
    });
    await updatePartyHP.mutateAsync({
      campaignId: targetCampaignId,
      hpMap,
    });
    toast.success('Fully healed all party characters!');
  };

  const initiativesMap = partyInitState?.initiatives ?? partyState?.initiatives ?? {};
  const hpMap = partyState?.hp ?? {};
  const lastRollsMap = partyState?.lastRolls ?? {};

  const hasInitiatives = Object.keys(initiativesMap).length > 0;

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-primary/30 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Swords className="size-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">DM Control & Initiative Console</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Party HP management, initiative roller, and DM dice roller console.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleHealAllParty} variant="outline" className="gap-2 text-rose-500 border-rose-500/30 hover:bg-rose-500/10">
            <Heart className="size-4 fill-rose-500/20" /> Heal All Party
          </Button>

          <Button onClick={handleTriggerInitiatives} className="gap-2 bg-primary hover:bg-primary/90">
            <Sparkles className="size-4" /> Roll Party Initiative
          </Button>

          {hasInitiatives && (
            <Button variant="outline" onClick={handleResetInitiatives} className="gap-1.5 text-muted-foreground hover:text-destructive">
              <RotateCcw className="size-4" /> Reset Initiatives
            </Button>
          )}
        </div>
      </div>

      {/* ── DM Broadcast Scene & Common Image Displayer Section ────────────── */}
      <CommonImageDisplayer campaignId={targetCampaignId} />

      {/* ── Party Perception, Wisdom & Intelligence Checks Console ──────────── */}
      <div className="bg-card border rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Eye className="size-5 text-sky-500" />
              <span>Party Perception, Wisdom & Intelligence Checks</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Passive scores, check modifiers, and quick rollers for Perception, Wisdom, and Intelligence for all party members.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchRollCheck('Perception')}
              className="gap-1.5 text-xs text-sky-500 border-sky-500/30 hover:bg-sky-500/10"
            >
              <Eye className="size-3.5" /> Roll Party Perception
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchRollCheck('Wisdom')}
              className="gap-1.5 text-xs text-purple-500 border-purple-500/30 hover:bg-purple-500/10"
            >
              <Brain className="size-3.5" /> Roll Party Wisdom
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchRollCheck('Intelligence')}
              className="gap-1.5 text-xs text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
            >
              <BookOpen className="size-3.5" /> Roll Party Intelligence
            </Button>
          </div>
        </div>

        {pcs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">No characters found in campaign.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pcs.map((pc) => {
              const stat = partyStats[pc.id] || {
                wisScore: 10,
                wisMod: 0,
                intScore: 10,
                intMod: 0,
                perceptionBonus: 0,
                passivePerception: 10,
                passiveWisdom: 10,
                passiveIntelligence: 10,
                perceptionProficient: false,
                perceptionExpertise: false,
              };

              const perceptionModStr = stat.perceptionBonus >= 0 ? `+${stat.perceptionBonus}` : `${stat.perceptionBonus}`;
              const wisModStr = stat.wisMod >= 0 ? `+${stat.wisMod}` : `${stat.wisMod}`;
              const intModStr = stat.intMod >= 0 ? `+${stat.intMod}` : `${stat.intMod}`;

              return (
                <div key={pc.id} className="p-4 rounded-xl border bg-muted/20 space-y-4 shadow-sm">
                  {/* PC Header */}
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <div className="font-bold text-sm text-foreground">{pc.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {pc.class ? `${pc.class} (lvl ${pc.level})` : `Lvl ${pc.level}`}
                      </div>
                    </div>
                    {stat.perceptionExpertise ? (
                      <Badge variant="outline" className="text-[10px] text-sky-500 border-sky-500/30 bg-sky-500/10">
                        Expertise
                      </Badge>
                    ) : stat.perceptionProficient ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                        Proficient
                      </Badge>
                    ) : null}
                  </div>

                  {/* 3 Checks Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {/* Perception Box */}
                    <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center justify-center gap-1">
                        <Eye className="size-3" /> Perc.
                      </div>
                      <div className="text-lg font-black font-mono text-sky-600 dark:text-sky-400" title="Passive Perception">
                        {stat.passivePerception}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        Mod: <span className="font-bold text-foreground">{perceptionModStr}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRollCheckForPC(pc, 'Perception', stat.perceptionBonus)}
                        className="h-6 w-full text-[10px] px-1 gap-1 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20"
                      >
                        <Dices className="size-2.5" /> Roll
                      </Button>
                    </div>

                    {/* Wisdom Box */}
                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center justify-center gap-1">
                        <Brain className="size-3" /> Wis
                      </div>
                      <div className="text-lg font-black font-mono text-purple-600 dark:text-purple-400" title="Passive Wisdom (10 + WIS mod)">
                        {stat.passiveWisdom}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        Mod: <span className="font-bold text-foreground">{wisModStr}</span> ({stat.wisScore})
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRollCheckForPC(pc, 'Wisdom', stat.wisMod)}
                        className="h-6 w-full text-[10px] px-1 gap-1 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20"
                      >
                        <Dices className="size-2.5" /> Roll
                      </Button>
                    </div>

                    {/* Intelligence Box */}
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                        <BookOpen className="size-3" /> Int
                      </div>
                      <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-400" title="Passive Intelligence (10 + INT mod)">
                        {stat.passiveIntelligence}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        Mod: <span className="font-bold text-foreground">{intModStr}</span> ({stat.intScore})
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRollCheckForPC(pc, 'Intelligence', stat.intMod)}
                        className="h-6 w-full text-[10px] px-1 gap-1 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                      >
                        <Dices className="size-2.5" /> Roll
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Party HP & Status Management Section ────────────────────────────── */}
      <div className="bg-card border rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Heart className="size-5 text-rose-500 fill-rose-500/20" />
            <h2 className="text-lg font-bold text-foreground">Party HP & Character Management</h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {pcs.length} {pcs.length === 1 ? 'Character' : 'Characters'}
          </span>
        </div>

        {pcs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">No characters found in campaign.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pcs.map((pc) => {
              const maxHp = pc.hit_points_max ?? 10;
              const currentHp = hpMap[pc.id] ?? maxHp;
              const lastRoll = lastRollsMap[pc.id];

              const percent = Math.min(100, Math.max(0, Math.round((currentHp / maxHp) * 100)));

              let statusBadge: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; colorClass: string } = {
                label: 'Healthy',
                variant: 'default',
                colorClass: 'bg-emerald-600',
              };
              if (currentHp === 0) {
                statusBadge = { label: 'Unconscious', variant: 'destructive', colorClass: 'bg-slate-700' };
              } else if (percent <= 25) {
                statusBadge = { label: 'Critical', variant: 'destructive', colorClass: 'bg-rose-600' };
              } else if (percent <= 50) {
                statusBadge = { label: 'Injured', variant: 'secondary', colorClass: 'bg-amber-600 text-white' };
              }

              const barColor =
                currentHp === 0
                  ? 'bg-slate-500'
                  : percent <= 25
                    ? 'bg-rose-500'
                    : percent <= 50
                      ? 'bg-amber-500'
                      : 'bg-emerald-500';

              return (
                <div key={pc.id} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  {/* Header: Name, class, AC & status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-base text-foreground flex items-center gap-2">
                        {pc.name}
                        {pc.armor_class != null && (
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1 border">
                            <Shield className="size-3 text-sky-500" /> AC {pc.armor_class}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {pc.class ? `${pc.class} (lvl ${pc.level})` : `Lvl ${pc.level}`}
                      </div>
                    </div>

                    <Badge className={statusBadge.colorClass}>{statusBadge.label}</Badge>
                  </div>

                  {/* HP Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold font-mono">
                      <span className="text-muted-foreground">Hit Points</span>
                      <span className={currentHp === 0 ? 'text-destructive font-black' : 'text-foreground'}>
                        {currentHp} / {maxHp} HP ({percent}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden border">
                      <div
                        className={`h-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* HP Action Controls */}
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAdjustHP(pc.id, currentHp, maxHp, -5)}
                      className="h-8 px-2 text-xs text-rose-500 hover:bg-rose-500/10"
                    >
                      -5
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAdjustHP(pc.id, currentHp, maxHp, -1)}
                      className="h-8 px-2 text-xs text-rose-500 hover:bg-rose-500/10"
                    >
                      <Minus className="size-3" /> 1
                    </Button>

                    <div className="w-16">
                      <Input
                        type="number"
                        min={0}
                        max={maxHp}
                        value={currentHp}
                        onChange={(e) => handleSetExactHP(pc.id, maxHp, e.target.value)}
                        className="h-8 text-center text-xs font-bold font-mono px-1"
                      />
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAdjustHP(pc.id, currentHp, maxHp, 1)}
                      className="h-8 px-2 text-xs text-emerald-600 hover:bg-emerald-500/10"
                    >
                      <Plus className="size-3" /> 1
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAdjustHP(pc.id, currentHp, maxHp, 5)}
                      className="h-8 px-2 text-xs text-emerald-600 hover:bg-emerald-500/10"
                    >
                      +5
                    </Button>

                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAdjustHP(pc.id, currentHp, maxHp, -maxHp)}
                        className="h-8 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                      >
                        0 HP
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAdjustHP(pc.id, currentHp, maxHp, maxHp)}
                        className="h-8 px-2 text-[11px] text-emerald-600 hover:bg-emerald-500/10"
                      >
                        Full
                      </Button>
                    </div>
                  </div>

                  {/* Character Last Roll & Roll Action */}
                  <div className="border-t pt-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                      <Dices className="size-3 text-indigo-500 shrink-0" />
                      <span className="font-semibold text-[11px]">Last Roll:</span>
                      {lastRoll ? (
                        <span className="font-mono font-bold text-foreground">
                          {lastRoll.formula} = <span className="text-primary font-black">{lastRoll.total}</span>
                        </span>
                      ) : (
                        <span className="italic text-[11px]">No rolls yet</span>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRollForPC(pc)}
                      className="h-7 text-[11px] gap-1 border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10"
                    >
                      <Dices className="size-3" /> Roll d20
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Active Party Initiative Roll Status ────────────────────────────── */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Swords className="size-5 text-amber-500" /> Current Party Initiatives
          </h2>
          {hasInitiatives ? (
            <Badge variant="default" className="bg-emerald-600">Live Rolled</Badge>
          ) : (
            <Badge variant="secondary">No Active Rolls</Badge>
          )}
        </div>

        {pcs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">No characters found in campaign.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pcs.map((pc) => {
              const init = initiativesMap[pc.id] ?? null;

              return (
                <div key={pc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div>
                    <div className="font-bold text-sm text-foreground">{pc.name}</div>
                    <div className="text-xs text-muted-foreground">{pc.class ? `${pc.class} (lvl ${pc.level})` : `Lvl ${pc.level}`}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Initiative</div>
                    <div className="text-xl font-extrabold font-mono text-primary">
                      {init !== null ? (init >= 0 ? `+${init}` : init) : '--'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Generic DM Dice Roller ─────────────────────────────────────────── */}
      <div className="bg-card border rounded-xl p-6 space-y-6">
        <div className="border-b pb-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Dices className="size-5 text-indigo-500" /> DM Generic Dice Roller
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Quickly roll d4, d6, d8, d10, d12, d20, or d100 with modifiers.</p>
        </div>

        {/* Dice Selector Bar */}
        <div className="flex flex-wrap gap-2">
          {[4, 6, 8, 10, 12, 20, 100].map((sides) => (
            <Button
              key={sides}
              variant="outline"
              onClick={() => handleGenericRoll(sides)}
              className="flex-1 min-w-[70px] h-12 text-sm font-bold hover:border-primary hover:text-primary"
            >
              d{sides}
            </Button>
          ))}
        </div>

        {/* Dice Controls */}
        <div className="flex items-center gap-4 max-w-sm">
          <div className="flex-1">
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Number of Dice</label>
            <Input
              type="number"
              min="1"
              max="20"
              value={numDice}
              onChange={(e) => setNumDice(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Modifier</label>
            <Input
              type="number"
              value={modifier}
              onChange={(e) => setModifier(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>

        {/* Recent DM Roll History */}
        {rollHistory.length > 0 && (
          <div className="pt-2">
            <h3 className="text-xs font-bold text-muted-foreground mb-2">Recent DM Rolls</h3>
            <div className="flex flex-wrap gap-2">
              {rollHistory.map((roll) => (
                <div key={roll.id} className="bg-muted px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-2">
                  <span className="text-muted-foreground">{roll.formula}:</span>
                  <span className="font-bold text-primary text-sm">{roll.result}</span>
                  <span className="text-[10px] text-muted-foreground">({roll.rolls.join(', ')})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
