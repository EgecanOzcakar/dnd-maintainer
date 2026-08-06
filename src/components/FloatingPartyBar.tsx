import { usePartyState } from '@/hooks/usePartyState';
import { usePartyInitiatives } from '@/hooks/usePartyInitiatives';
import { useCharacters } from '@/hooks/useCharacters';
import { Swords, Shield, Heart, Dices } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CharacterSummary } from '@/types/database';

interface FloatingPartyBarProps {
  campaignId: string;
  currentCharacterId?: string;
}

export function FloatingPartyBar({ campaignId, currentCharacterId }: FloatingPartyBarProps) {
  const { data: partyState } = usePartyState(campaignId);
  const { data: partyInitState } = usePartyInitiatives(campaignId);
  const { data: characters = [] } = useCharacters(campaignId);

  // Filter strictly for Player Characters (PCs)
  const pcs = characters.filter((c: CharacterSummary) => c.character_type === 'pc');

  if (pcs.length === 0) return null;

  const initiativesMap = partyInitState?.initiatives ?? partyState?.initiatives ?? {};
  const hpMap = partyState?.hp ?? {};
  const lastRollsMap = partyState?.lastRolls ?? {};

  // Build PC list with initiative scores, HP/Status info, and last rolled dice
  const pcList = pcs.map((pc) => {
    const initiative = initiativesMap[pc.id] ?? null;
    const conditions = pc.conditions ?? [];
    const maxHp = pc.hit_points_max;
    const currentHp = maxHp != null ? (hpMap[pc.id] ?? maxHp) : null;
    const lastRoll = lastRollsMap[pc.id] ?? null;

    return {
      pc,
      initiative,
      currentHp,
      maxHp,
      lastRoll,
      conditions,
      isCurrent: pc.id === currentCharacterId,
    };
  });

  // Sort: highest initiative first, then alphabetical by name
  pcList.sort((a, b) => {
    if (a.initiative !== null && b.initiative !== null) return b.initiative - a.initiative;
    if (a.initiative !== null) return -1;
    if (b.initiative !== null) return 1;
    return a.pc.name.localeCompare(b.pc.name);
  });

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/80 px-4 py-2.5 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-stretch justify-between gap-3">
        {/* Left Title Label - Fixed Width to Keep Grid Vertical Start Aligned */}
        <div className="flex items-center gap-2 shrink-0 md:w-32 md:pt-1">
          <Swords className="size-4 text-primary animate-pulse" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
            Party Status
          </span>
        </div>

        {/* Strictly Aligned 6-Column Grid Layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 grid-flow-row auto-cols-fr gap-2 w-full min-w-0 flex-1">
          {pcList.map(({ pc, initiative, currentHp, maxHp, lastRoll, conditions, isCurrent }) => {
            const hasConditions = conditions.length > 0;
            const isLowHp = currentHp !== null && maxHp !== null && currentHp <= maxHp * 0.25;

            return (
              <div
                key={pc.id}
                className={`p-2 rounded-lg border text-xs flex flex-col justify-between gap-2 w-full min-w-0 transition-all ${isCurrent
                    ? 'bg-primary/10 border-primary font-semibold ring-1 ring-primary/40'
                    : 'bg-card/80 border-border hover:bg-muted/50'
                  }`}
              >
                {/* Header: Name, Role/Level, & Current Indicator */}
                <div className="flex flex-col min-w-0 w-full">
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="font-bold text-xs truncate text-foreground min-w-0 flex-1" title={pc.name}>
                      {pc.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-extrabold px-1 rounded bg-primary text-primary-foreground leading-none py-0.5 shrink-0">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate w-full">
                    {pc.class ? `${pc.class} (lvl ${pc.level})` : `Lvl ${pc.level}`}
                  </div>
                </div>

                {/* Vertical Stat Group with Uniform Alignments */}
                <div className="flex flex-col gap-1 font-mono text-[11px] w-full">
                  {/* Initiative & AC Row */}
                  <div className="grid grid-cols-2 gap-1 w-full">
                    <div
                      className="flex items-center justify-center gap-1 px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 w-full"
                      title="Initiative Score"
                    >
                      <span className="text-[9px] uppercase font-sans font-bold text-muted-foreground">Init</span>
                      <span className="font-black text-xs">
                        {initiative !== null ? (initiative >= 0 ? `+${initiative}` : initiative) : '--'}
                      </span>
                    </div>

                    <div
                      className={`flex items-center justify-center gap-1 px-1 py-0.5 rounded bg-muted/60 text-muted-foreground w-full ${pc.armor_class == null ? 'opacity-0' : ''
                        }`}
                      title="Armor Class"
                    >
                      <Shield className="size-3 text-sky-500 shrink-0" />
                      <span className="font-bold">{pc.armor_class ?? '--'}</span>
                    </div>
                  </div>

                  {/* Hit Points Row */}
                  <div
                    className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded border w-full ${maxHp == null
                        ? 'opacity-0'
                        : isLowHp
                          ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                          : 'bg-muted/60 text-muted-foreground border-transparent'
                      }`}
                    title="Hit Points (Current / Max)"
                  >
                    <Heart className={`size-3 ${isLowHp ? 'text-rose-600 fill-rose-600' : 'text-rose-500 fill-rose-500/20'} shrink-0`} />
                    <span className="font-bold text-[10px]">
                      {maxHp != null ? `${currentHp ?? maxHp}/${maxHp} HP` : '--'}
                    </span>
                  </div>

                  {/* Last Roll Row */}
                  <div
                    className={`flex items-center justify-between gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 w-full ${!lastRoll ? 'opacity-0' : ''
                      }`}
                    title={lastRoll ? `Last Roll: ${lastRoll.formula} = ${lastRoll.total} (${lastRoll.rolls.join(', ')})` : ''}
                  >
                    <div className="flex items-center gap-1 truncate min-w-0">
                      <Dices className="size-3 text-indigo-500 shrink-0" />
                      <span className="text-[9px] font-sans text-muted-foreground font-bold truncate">
                        {lastRoll?.formula ?? '--'}
                      </span>
                    </div>
                    <span className="font-black text-xs shrink-0">{lastRoll?.total ?? '--'}</span>
                  </div>
                </div>

                {/* Status Conditions */}
                <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-border/50 min-h-[22px] w-full">
                  {hasConditions &&
                    conditions.map((cond) => (
                      <Badge key={cond} variant="destructive" className="text-[8px] py-0 px-1 capitalize leading-tight">
                        {cond}
                      </Badge>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}