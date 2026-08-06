import { usePartyInitiatives } from '@/hooks/usePartyInitiatives';
import { useCharacters } from '@/hooks/useCharacters';
import { Swords, Shield, Heart, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CharacterSummary } from '@/types/database';

interface FloatingPartyBarProps {
  campaignId: string;
  currentCharacterId?: string;
}

export function FloatingPartyBar({ campaignId, currentCharacterId }: FloatingPartyBarProps) {
  const { data: partyInitState } = usePartyInitiatives(campaignId);
  const { data: characters = [] } = useCharacters(campaignId);

  // Filter strictly for Player Characters (PCs)
  const pcs = characters.filter((c: CharacterSummary) => c.character_type === 'pc');

  if (pcs.length === 0) return null;

  const initiativesMap = partyInitState?.initiatives ?? {};

  // Build PC list with initiative scores and HP/Status info
  const pcList = pcs.map((pc) => {
    const initiative = initiativesMap[pc.id] ?? null;
    const conditions = pc.conditions ?? [];

    return {
      pc,
      initiative,
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
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/80 px-4 py-2 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left Title Label */}
        <div className="flex items-center gap-2 shrink-0">
          <Swords className="size-4 text-primary animate-pulse" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
            Party Status
          </span>
        </div>

        {/* Scrollable / Responsive Party Row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
          {pcList.map(({ pc, initiative, conditions, isCurrent }) => {
            const hasConditions = conditions.length > 0;

            return (
              <div
                key={pc.id}
                className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-2.5 shrink-0 transition-all ${
                  isCurrent
                    ? 'bg-primary/10 border-primary font-semibold ring-1 ring-primary/40'
                    : 'bg-card/80 border-border hover:bg-muted/50'
                }`}
              >
                {/* Character Name & Level */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs truncate text-foreground max-w-[110px]">
                      {pc.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-extrabold px-1 rounded bg-primary text-primary-foreground leading-none py-0.5">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {pc.class ? `${pc.class} (lvl ${pc.level})` : `Lvl ${pc.level}`}
                  </div>
                </div>

                {/* Stat Badges: AC, Max HP, Initiative */}
                <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                  {/* Armor Class */}
                  {pc.armor_class != null && (
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground" title="Armor Class">
                      <Shield className="size-3 text-sky-500" />
                      <span className="font-bold">{pc.armor_class}</span>
                    </div>
                  )}

                  {/* Max Hit Points */}
                  {pc.hit_points_max != null && (
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground" title="Max Hit Points">
                      <Heart className="size-3 text-rose-500 fill-rose-500/20" />
                      <span className="font-bold">{pc.hit_points_max} HP</span>
                    </div>
                  )}

                  {/* Initiative Score */}
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20" title="Initiative Score">
                    <span className="text-[9px] uppercase font-sans font-bold text-muted-foreground">Init</span>
                    <span className="font-black text-sm">
                      {initiative !== null ? (initiative >= 0 ? `+${initiative}` : initiative) : '--'}
                    </span>
                  </div>
                </div>

                {/* Status Conditions */}
                {hasConditions && (
                  <div className="flex items-center gap-1 shrink-0">
                    {conditions.map((cond) => (
                      <Badge key={cond} variant="destructive" className="text-[9px] py-0 px-1 capitalize">
                        {cond}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
