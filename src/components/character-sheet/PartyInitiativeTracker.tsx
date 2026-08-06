import { usePartyInitiatives } from '@/hooks/usePartyInitiatives';
import { useCharacters } from '@/hooks/useCharacters';
import { Swords } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CharacterSummary } from '@/types/database';

interface PartyInitiativeTrackerProps {
  campaignId: string;
  currentCharacterId?: string;
}

export function PartyInitiativeTracker({ campaignId, currentCharacterId }: PartyInitiativeTrackerProps) {
  const { data: partyInitState } = usePartyInitiatives(campaignId);
  const { data: characters = [] } = useCharacters(campaignId);

  // Filter strictly for Player Characters (PCs)
  const pcs = characters.filter((c: CharacterSummary) => c.character_type === 'pc');

  if (pcs.length === 0) return null;

  const initiativesMap = partyInitState?.initiatives ?? {};

  // Build PC list with initiative scores (sorted by initiative descending)
  const pcList = pcs.map((pc) => {
    const initiative = initiativesMap[pc.id] ?? null;
    return {
      pc,
      initiative,
      isCurrent: pc.id === currentCharacterId,
    };
  });

  // Sort: highest initiative first, then PCs without initiative
  pcList.sort((a, b) => {
    if (a.initiative !== null && b.initiative !== null) return b.initiative - a.initiative;
    if (a.initiative !== null) return -1;
    if (b.initiative !== null) return 1;
    return a.pc.name.localeCompare(b.pc.name);
  });

  const hasInitiatives = Object.keys(initiativesMap).length > 0;

  return (
    <div className="bg-card border border-primary/20 rounded-xl p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Swords className="size-5 text-primary" />
          <h3 className="font-bold text-sm text-foreground">Party Initiative Tracker</h3>
          {hasInitiatives ? (
            <Badge variant="default" className="text-[10px] bg-emerald-600/90 text-white px-2 py-0.5">
              Live Rolled Order
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              Waiting for DM Roll
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          {pcs.length} {pcs.length === 1 ? 'Character' : 'Characters'}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {pcList.map(({ pc, initiative, isCurrent }) => {
          return (
            <div
              key={pc.id}
              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                isCurrent
                  ? 'bg-primary/10 border-primary font-semibold ring-1 ring-primary/40'
                  : 'bg-muted/40 border-border hover:bg-muted/70'
              }`}
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold truncate text-foreground text-sm">{pc.name}</span>
                  {isCurrent && (
                    <Badge variant="secondary" className="text-[9px] py-0 px-1 shrink-0 bg-primary/20 text-primary">
                      You
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {pc.class ? `${pc.class} (lvl ${pc.level})` : `Lvl ${pc.level}`}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Init</div>
                  <div className="text-base font-extrabold font-mono text-primary">
                    {initiative !== null ? (initiative >= 0 ? `+${initiative}` : initiative) : '--'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
