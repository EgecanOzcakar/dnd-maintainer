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

type OverlayPhase = 'center' | 'corner';

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
  const [phase, setPhase] = useState<OverlayPhase>('center');
  const [isAnimating, setIsAnimating] = useState(false);
  const [visible, setVisible] = useState(false);
  const [displayNumber, setDisplayNumber] = useState<number>(20);

  const lastSeenTimestampRef = useRef<string | null>(null);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const numberIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Find the latest roll from any Player Character
  const latestPcRoll = useMemo<{ pc: CharacterSummary; roll: CharacterRollEntry } | null>(() => {
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
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (numberIntervalRef.current) clearInterval(numberIntervalRef.current);

      setActiveRoll({
        character: latestPcRoll.pc,
        roll: latestPcRoll.roll,
        timestamp: rollTimestamp,
      });
      setPhase('center');
      setIsAnimating(true);
      setVisible(true);

      // Rapidly cycle random numbers during the "dice in action" tumbling animation
      const sides = extractDieSides(latestPcRoll.roll.formula) || 20;
      numberIntervalRef.current = setInterval(() => {
        setDisplayNumber(Math.floor(Math.random() * sides) + 1);
      }, 50);

      // Stop tumbling animation after 600ms
      animationTimerRef.current = setTimeout(() => {
        if (numberIntervalRef.current) clearInterval(numberIntervalRef.current);
        setIsAnimating(false);
      }, 600);

      // Transition from screen-center hero mode down to bottom-right corner after 1800ms
      phaseTimerRef.current = setTimeout(() => {
        setPhase('corner');
      }, 1800);

      // Auto dismiss layer after 6600ms (6.6 seconds)
      dismissTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, 6600);
    }
  }, [latestPcRoll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
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
  const modStr = roll.modifier > 0 ? ` + ${roll.modifier}` : roll.modifier < 0 ? ` ${roll.modifier}` : '';
  const breakdownStr = `[${roll.rolls ? roll.rolls.join(', ') : ''}]${modStr}`;

  return (
    <>
      {/* Dimmed backdrop when in huge center screen animation */}
      <div
        className={`fixed inset-0 bg-black/65 backdrop-blur-md z-40 transition-opacity duration-500 pointer-events-none ${
          phase === 'center' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        role="region"
        aria-label="Player Dice Roll Notification"
        className={`fixed z-50 transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) pointer-events-auto ${
          phase === 'center'
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md scale-100'
            : 'bottom-6 right-6 max-w-sm w-full scale-100'
        }`}
      >
        <div
          className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-500 ${
            isNat20
              ? 'bg-emerald-950/95 border-emerald-400/60 text-emerald-100 shadow-[0_0_50px_rgba(16,185,129,0.35)]'
              : isNat1
                ? 'bg-rose-950/95 border-rose-400/60 text-rose-100 shadow-[0_0_50px_rgba(244,63,94,0.35)]'
                : 'bg-card/95 border-indigo-500/40 text-card-foreground shadow-[0_0_40px_rgba(99,102,241,0.25)]'
          }`}
        >
          {/* Countdown Progress Bar in Corner Mode */}
          {phase === 'corner' && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-muted/30">
              <div
                className={`h-full transition-all duration-[6000ms] ease-linear ${
                  visible ? 'w-0' : 'w-full'
                } ${isNat20 ? 'bg-emerald-400' : isNat1 ? 'bg-rose-400' : 'bg-primary'}`}
                style={{ width: visible ? '0%' : '100%', transition: 'width 6000ms linear' }}
              />
            </div>
          )}

          {/* ── Center Stage View (Huge & Effect Rich) ── */}
          {phase === 'center' ? (
            <div className="p-6 flex flex-col items-center text-center space-y-4 relative">
              {/* Top Banner / Badges */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="font-extrabold text-lg tracking-wide text-foreground">
                  {character.name}
                </span>
                <Badge variant="outline" className="font-mono font-extrabold text-xs uppercase border-primary/40 text-primary bg-primary/10 px-2 py-0.5">
                  {dieName}
                </Badge>
                {isNat20 && (
                  <Badge className="bg-emerald-500 text-emerald-950 font-bold text-xs py-0.5 px-2.5 uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-emerald-500/30 animate-pulse">
                    <Sparkles className="size-3.5" />
                    Nat 20!
                  </Badge>
                )}
                {isNat1 && (
                  <Badge variant="destructive" className="font-bold text-xs py-0.5 px-2.5 uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-rose-500/30 animate-bounce">
                    <AlertCircle className="size-3.5" />
                    Nat 1!
                  </Badge>
                )}
              </div>

              {roll.label && (
                <div className="text-sm font-extrabold text-primary truncate max-w-full" title={roll.label}>
                  {roll.label}
                </div>
              )}

              {/* Huge Dice Frame with Visual Effects */}
              <div className="relative my-2 flex items-center justify-center">
                {/* Glowing Aura Ring */}
                <div
                  className={`absolute size-36 sm:size-44 rounded-full blur-2xl transition-all duration-500 ${
                    isNat20
                      ? 'bg-emerald-500/40 animate-pulse'
                      : isNat1
                        ? 'bg-rose-500/40 animate-ping'
                        : 'bg-indigo-500/30'
                  }`}
                />

                <div
                  className={`relative size-32 sm:size-40 rounded-3xl flex flex-col items-center justify-center font-mono font-black border-4 shadow-2xl transition-all duration-300 ${
                    isAnimating
                      ? 'bg-primary/20 border-primary text-primary animate-bounce scale-110 shadow-indigo-500/30'
                      : isNat20
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-emerald-950 border-emerald-300 ring-8 ring-emerald-500/20 scale-105 shadow-emerald-500/40'
                        : isNat1
                          ? 'bg-gradient-to-br from-rose-600 to-red-700 text-rose-950 border-rose-300 ring-8 ring-rose-500/20 scale-105 shadow-rose-500/40'
                          : 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-indigo-300 ring-4 ring-indigo-500/20 shadow-indigo-500/30'
                  }`}
                >
                  {isAnimating ? (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Dices className="size-10 animate-spin text-primary" />
                      <span className="text-3xl sm:text-4xl">{displayNumber}</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-5xl sm:text-6xl tracking-tighter drop-shadow-md">
                        {roll.total}
                      </span>
                      {isNat20 && (
                        <span className="text-[10px] font-sans uppercase font-black tracking-widest text-emerald-950/80 -mt-1">
                          Critical Hit
                        </span>
                      )}
                      {isNat1 && (
                        <span className="text-[10px] font-sans uppercase font-black tracking-widest text-rose-950/80 -mt-1">
                          Critical Fail
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Roll Formula & Breakdown */}
              <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground font-mono bg-muted/30 px-4 py-2 rounded-xl border border-border/50 w-full">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary text-sm">{roll.formula}</span>
                  <span>=</span>
                  <span className="font-semibold text-foreground">{breakdownStr}</span>
                </div>
              </div>

              {/* Manual Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisible(false)}
                className="absolute top-2 right-2 p-1 size-8 text-muted-foreground hover:text-foreground rounded-full"
                aria-label={tc('buttons.close') || 'Close'}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            /* ── Corner Stage View (Compact & Resting) ── */
            <div className="p-4 flex items-center justify-between gap-3">
              {/* Left: Dice Badge */}
              <div className="relative shrink-0 flex items-center justify-center">
                <div
                  className={`size-14 rounded-xl flex items-center justify-center font-mono font-black text-2xl border transition-all duration-300 ${
                    isNat20
                      ? 'bg-emerald-500 text-emerald-950 border-emerald-300 ring-4 ring-emerald-500/30'
                      : isNat1
                        ? 'bg-rose-500 text-rose-950 border-rose-300 ring-4 ring-rose-500/30'
                        : 'bg-primary text-primary-foreground border-primary/50'
                  }`}
                >
                  <span>{roll.total}</span>
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
                  <span className="truncate">{breakdownStr}</span>
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
          )}
        </div>
      </div>
    </>
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

