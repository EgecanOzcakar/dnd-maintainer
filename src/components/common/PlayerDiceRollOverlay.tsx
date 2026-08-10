import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dices, X, Sparkles, AlertCircle } from 'lucide-react';
import { usePartyState, type CharacterRollEntry } from '@/hooks/usePartyState';
import { useCharacters } from '@/hooks/useCharacters';
import type { CharacterSummary } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PlayerDiceRollOverlayProps {
  campaignId: string;
}

interface ActiveRollState {
  character: CharacterSummary;
  roll: CharacterRollEntry;
  timestamp: string;
}

export function PlayerDiceRollOverlay({ campaignId }: PlayerDiceRollOverlayProps) {
  const { t: tc } = useTranslation('common');
  const { data: partyState } = usePartyState(campaignId);
  const { data: characters = [] } = useCharacters(campaignId);

  // Filter strictly for Player Characters (excluding DM / NPC rolls)
  const pcMap = useMemo(() => {
    const map = new Map<string, CharacterSummary>();
    characters.forEach((c) => {
      if (c.character_type === 'pc') {
        map.set(c.id, c);
      }
    });
    return map;
  }, [characters]);

  const [activeRoll, setActiveRoll] = useState<ActiveRollState | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [visible, setVisible] = useState(false);
  const [displayNumber, setDisplayNumber] = useState<number>(20);

  const lastSeenTimestampRef = useRef<string | null>(null);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const numberIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Find the latest roll from any Player Character
  const latestPcRoll = useMemo(() => {
    const lastRolls = partyState?.lastRolls;
    if (!lastRolls || pcMap.size === 0) return null;

    let latest: { pc: CharacterSummary; roll: CharacterRollEntry } | null = null;
    let latestTime = 0;

    Object.entries(lastRolls).forEach(([charId, roll]) => {
      const pc = pcMap.get(charId);
      if (pc && roll && roll.timestamp) {
        const time = new Date(roll.timestamp).getTime();
        if (time > latestTime) {
          latestTime = time;
          latest = { pc, roll };
        }
      }
    });

    return latest;
  }, [partyState?.lastRolls, pcMap]);

  // Trigger animation & display when a new player roll arrives
  useEffect(() => {
    if (!latestPcRoll) return;

    const rollTimestamp = latestPcRoll.roll.timestamp;

    // Check if this is a newly arrived roll
    if (lastSeenTimestampRef.current !== rollTimestamp) {
      lastSeenTimestampRef.current = rollTimestamp;

      // Clear existing timers
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (numberIntervalRef.current) clearInterval(numberIntervalRef.current);

      setActiveRoll({
        character: latestPcRoll.pc,
        roll: latestPcRoll.roll,
        timestamp: rollTimestamp,
      });
      setIsAnimating(true);
      setVisible(true);

      // Rapidly cycle random numbers during the "dice in action" animation
      const sides = extractDieSides(latestPcRoll.roll.formula) || 20;
      numberIntervalRef.current = setInterval(() => {
        setDisplayNumber(Math.floor(Math.random() * sides) + 1);
      }, 50);

      // Stop tumbling animation after 600ms
      animationTimerRef.current = setTimeout(() => {
        if (numberIntervalRef.current) clearInterval(numberIntervalRef.current);
        setIsAnimating(false);
      }, 600);

      // Auto dismiss layer after 6000ms (6 seconds)
      dismissTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, 6600);
    }
  }, [latestPcRoll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (numberIntervalRef.current) clearInterval(numberIntervalRef.current);
    };
  }, []);

  if (!visible || !activeRoll) return null;

  const { character, roll } = activeRoll;

  // Determine if it's a d20 Critical Hit or Critical Fail
  const isD20 = roll.formula.includes('d20');
  const rawRoll = roll.rolls && roll.rolls.length > 0 ? roll.rolls[0] : null;
  const isNat20 = isD20 && rawRoll === 20;
  const isNat1 = isD20 && rawRoll === 1;

  const dieName = extractDieName(roll.formula);

  return (
    <div
      role="region"
      aria-label="Player Dice Roll Notification"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto"
    >
      <div
        className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${
          isNat20
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 shadow-emerald-900/30'
            : isNat1
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-100 shadow-rose-900/30'
              : 'bg-card/95 border-primary/30 text-card-foreground shadow-primary/10'
        }`}
      >
        {/* Animated Countdown Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted/30">
          <div
            className={`h-full transition-all duration-[6000ms] ease-linear ${
              visible ? 'w-0' : 'w-full'
            } ${
              isNat20 ? 'bg-emerald-400' : isNat1 ? 'bg-rose-400' : 'bg-primary'
            }`}
            style={{ width: visible ? '0%' : '100%', transition: 'width 6000ms linear' }}
          />
        </div>

        <div className="p-4 flex items-center justify-between gap-3">
          {/* Left: Dice in Action Animation / Final Die Badge */}
          <div className="relative shrink-0 flex items-center justify-center">
            <div
              className={`size-14 rounded-xl flex items-center justify-center font-mono font-black text-2xl border transition-all duration-300 ${
                isAnimating
                  ? 'bg-primary/20 border-primary text-primary animate-bounce scale-110 shadow-lg shadow-primary/20'
                  : isNat20
                    ? 'bg-emerald-500 text-emerald-950 border-emerald-300 ring-4 ring-emerald-500/30'
                    : isNat1
                      ? 'bg-rose-500 text-rose-950 border-rose-300 ring-4 ring-rose-500/30'
                      : 'bg-primary text-primary-foreground border-primary/50'
              }`}
            >
              {isAnimating ? (
                <div className="flex items-center justify-center gap-1">
                  <Dices className="size-6 animate-spin text-primary" />
                  <span className="text-sm">{displayNumber}</span>
                </div>
              ) : (
                <span>{roll.total}</span>
              )}
            </div>
          </div>

          {/* Center: Character Info & Roll Details */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-sm truncate text-foreground">
                {character.name}
              </span>
              <Badge variant="outline" className="font-mono font-extrabold text-[10px] uppercase border-primary/40 text-primary bg-primary/10 px-1.5 py-0">
                {dieName}
              </Badge>
              {isNat20 && (
                <Badge className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 text-[10px] py-0 px-1.5 font-bold uppercase tracking-wider flex items-center gap-0.5">
                  <Sparkles className="size-2.5" />
                  Nat 20!
                </Badge>
              )}
              {isNat1 && (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold uppercase tracking-wider flex items-center gap-0.5">
                  <AlertCircle className="size-2.5" />
                  Nat 1!
                </Badge>
              )}
            </div>

            {roll.label && (
              <div className="text-xs font-extrabold text-primary truncate" title={roll.label}>
                {roll.label}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <span className="font-semibold text-primary">{roll.formula}</span>
              <span>=</span>
              <span className="truncate">
                [{roll.rolls ? roll.rolls.join(', ') : ''}]
                {roll.modifier > 0 ? ` + ${roll.modifier}` : roll.modifier < 0 ? ` ${roll.modifier}` : ''}
              </span>
            </div>
          </div>

          {/* Right: Manual Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisible(false)}
            className="p-1 size-7 shrink-0 text-muted-foreground hover:text-foreground rounded-full"
            aria-label={tc('buttons.close') || 'Close'}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Helper to extract die sides from formula (e.g. "1d20+3" -> 20) */
function extractDieSides(formula: string): number | null {
  const match = formula.match(/d(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/** Helper to extract die name from formula (e.g. "1d20+3" -> "d20", "2d6+4" -> "d6") */
function extractDieName(formula: string): string {
  const match = formula.match(/d\d+/i);
  return match ? match[0].toLowerCase() : 'dice';
}
