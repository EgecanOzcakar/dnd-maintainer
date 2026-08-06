import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Dices, Swords, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCharacters } from '@/hooks/useCharacters';
import { useCampaignContext } from '@/hooks/useCampaignContext';
import { usePartyInitiatives, useUpdatePartyInitiatives } from '@/hooks/usePartyInitiatives';
import type { CharacterSummary } from '@/types/database';
import { toast } from 'sonner';

export default function DMControlPage() {
  const { t } = useTranslation('common');
  const { campaignSlug } = useParams<{ campaignSlug: string }>();
  const { campaignId } = useCampaignContext();

  const targetCampaignId = campaignId || campaignSlug || '';

  const { data: characters = [] } = useCharacters(targetCampaignId);
  const { data: partyInitState } = usePartyInitiatives(targetCampaignId);
  const updatePartyInitiatives = useUpdatePartyInitiatives();

  // Filter only Player Characters (excluding NPCs)
  const pcs = characters.filter((c: CharacterSummary) => c.character_type === 'pc');

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

  const initiativesMap = partyInitState?.initiatives ?? {};
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
            Standalone party initiative roller and DM dice roller console.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleTriggerInitiatives} className="gap-2 bg-primary hover:bg-primary/90">
            <Sparkles className="size-4" /> Trigger Party Initiative Roll
          </Button>

          {hasInitiatives && (
            <Button variant="outline" onClick={handleResetInitiatives} className="gap-1.5 text-muted-foreground hover:text-destructive">
              <RotateCcw className="size-4" /> Reset Initiatives
            </Button>
          )}
        </div>
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
