import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dices, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRecordCharacterRoll } from '@/hooks/usePartyState';
import { useAddRoll, useRollLog } from '@/hooks/useRollLog';
import { rollDice, type D20Mode } from '@/lib/dice-roll';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DieSize = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export interface DiceRollResult {
  readonly id: number;
  readonly die: DieSize;
  readonly count: number;
  readonly modifier: number;
  readonly rolls: readonly number[];
  readonly total: number;
  /** Dice counted toward the total (differs from `rolls` with advantage/disadvantage). */
  readonly kept?: readonly number[];
  readonly natural?: 'nat20' | 'nat1' | null;
}

const DIE_SIZES: DieSize[] = [4, 6, 8, 10, 12, 20, 100];
const MAX_HISTORY = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

let rollIdCounter = 0;

// ─── Roll History Entry ───────────────────────────────────────────────────────

function HistoryEntry({ entry }: { entry: DiceRollResult }) {
  const dieLabel = `d${entry.die}`;
  const sign = entry.modifier > 0 ? `+${entry.modifier}` : entry.modifier < 0 ? `${entry.modifier}` : null;

  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0 text-xs">
      <span className="text-muted-foreground font-mono">
        {entry.count}
        {dieLabel}
        {sign ? ` ${sign}` : ''}
      </span>
      <div className="flex items-center gap-1.5 text-right">
        <span className="text-muted-foreground/60 text-[10px]">[{entry.rolls.join(', ')}]</span>
        <span className="font-bold text-foreground text-sm w-8 text-right">{entry.total}</span>
      </div>
    </div>
  );
}

// ─── DiceRoller Component ─────────────────────────────────────────────────────

interface DiceRollerProps {
  /** If provided, the roller opens pre-set to this modifier (e.g. from an attack roll button). */
  readonly presetModifier?: number;
  /** If provided, auto-selects this die size. */
  readonly presetDie?: DieSize;
  /** If provided, auto-selects this die count. */
  readonly presetCount?: number;
  /** If provided, shown above the roller as context label. */
  readonly contextLabel?: string;
  /** 'damage' shows the critical-hit toggle even for a d20; default infers from the die. */
  readonly presetKind?: 'd20' | 'damage';
  /** Compact mode hides the history panel. */
  readonly compact?: boolean;
  /** Optional character ID for sync with party roll tracker. */
  readonly characterId?: string;
  /** Optional campaign ID for sync with party roll tracker. */
  readonly campaignId?: string;
  /** Optional callback fired when a roll completes. */
  readonly onRoll?: (result: DiceRollResult) => void;
}

export function DiceRoller({
  presetModifier,
  presetDie,
  presetCount,
  presetKind,
  contextLabel,
  compact = false,
  characterId,
  campaignId,
  onRoll,
}: DiceRollerProps) {
  const { t: tc } = useTranslation('common');
  const recordRoll = useRecordCharacterRoll();
  const addRoll = useAddRoll();
  const { data: sharedLog = [] } = useRollLog(compact ? undefined : campaignId);
  const [mode, setMode] = useState<D20Mode>('normal');
  const [crit, setCrit] = useState(false);

  const [selectedDie, setSelectedDie] = useState<DieSize>(presetDie ?? 20);
  const [count, setCount] = useState<number>(presetCount ?? 1);
  const [modifier, setModifier] = useState<number>(presetModifier ?? 0);
  const [lastResult, setLastResult] = useState<DiceRollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [history, setHistory] = useState<DiceRollResult[]>([]);

  const rollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRoll = useCallback(() => {
    if (isRolling) return;
    setIsRolling(true);
    if (rollTimeout.current) clearTimeout(rollTimeout.current);

    rollTimeout.current = setTimeout(() => {
      const out = rollDice({ die: selectedDie, count, modifier, mode, crit });
      const { rolls, total } = out;
      const entry: DiceRollResult = {
        id: ++rollIdCounter,
        die: selectedDie,
        count: Math.max(1, count),
        modifier,
        rolls,
        total,
        kept: out.kept,
        natural: out.natural,
      };
      setLastResult(entry);
      setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
      setIsRolling(false);

      if (onRoll) onRoll(entry);

      if (campaignId) {
        addRoll.mutate({
          campaign_id: campaignId,
          character_id: characterId ?? null,
          label: contextLabel ?? null,
          formula: out.formula,
          result: total,
          detail: { rolls, kept: out.kept, natural: out.natural },
        });
      }
      if (characterId && campaignId) {
        recordRoll.mutate({
          campaignId,
          characterId,
          roll: { formula: out.formula, total, rolls, modifier, label: contextLabel },
        });
      }
    }, 320);
  }, [
    isRolling,
    count,
    selectedDie,
    modifier,
    mode,
    crit,
    onRoll,
    characterId,
    campaignId,
    recordRoll,
    addRoll,
    contextLabel,
  ]);

  // Keep preset values in sync when parent changes them (e.g. clicking a spell's Roll button)
  const [lastPresetKey, setLastPresetKey] = useState('');
  const presetKey = `${presetDie}-${presetCount}-${presetModifier}`;
  if (
    presetKey !== lastPresetKey &&
    (presetDie !== undefined || presetCount !== undefined || presetModifier !== undefined)
  ) {
    setLastPresetKey(presetKey);
    setMode('normal');
    setCrit(false);
    if (presetDie !== undefined) setSelectedDie(presetDie);
    if (presetCount !== undefined) setCount(presetCount);
    if (presetModifier !== undefined) setModifier(presetModifier);
  }

  const modSign = modifier >= 0 ? `+${modifier}` : `${modifier}`;

  return (
    <div className="space-y-3">
      {contextLabel && <div className="text-xs font-semibold text-primary truncate">{contextLabel}</div>}

      {/* Die selector */}
      <div className="flex flex-wrap gap-1.5">
        {DIE_SIZES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setSelectedDie(d)}
            className={`
              px-2.5 py-1 rounded-md text-xs font-bold border transition-all duration-150
              ${
                selectedDie === d
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                  : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/60 hover:text-foreground hover:bg-muted'
              }
            `}
          >{`d${d}`}</button>
        ))}
      </div>

      {/* Count + Modifier inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold block mb-1">
            {tc('characterSheet.combatView.diceRoller.numDice')}
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
            className="w-full bg-muted/50 border border-border rounded-md px-2 py-1.5 text-sm font-mono text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold block mb-1">
            {tc('characterSheet.combatView.diceRoller.modifier')}
          </label>
          <input
            type="number"
            min={-20}
            max={20}
            value={modifier}
            onChange={(e) => setModifier(parseInt(e.target.value, 10) || 0)}
            className="w-full bg-muted/50 border border-border rounded-md px-2 py-1.5 text-sm font-mono text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Advantage / disadvantage (single d20) and critical hit (damage) */}
      <div className="flex flex-wrap gap-1.5">
        {selectedDie === 20 && count === 1 && !crit && (
          <>
            {(['advantage', 'disadvantage'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(mode === m ? 'normal' : m)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                  mode === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 border-border'
                }`}
              >
                {tc(`diceLog.${m}`)}
              </button>
            ))}
          </>
        )}
        {(presetKind === 'damage' || selectedDie !== 20) && (
          <button
            type="button"
            aria-pressed={crit}
            onClick={() => setCrit(!crit)}
            className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
              crit ? 'bg-destructive text-white border-destructive' : 'bg-muted/50 border-border'
            }`}
          >
            {tc('diceLog.critical')}
          </button>
        )}
      </div>

      {/* Roll button + result */}
      <div className="flex items-center gap-3">
        <Button onClick={handleRoll} disabled={isRolling} className="flex-1 gap-2 font-bold">
          <Dices className={`size-4 ${isRolling ? 'animate-spin' : ''}`} />
          {isRolling
            ? tc('characterSheet.combatView.diceRoller.rolling')
            : `${count * (crit ? 2 : 1)}d${selectedDie}${modifier !== 0 ? ` ${modSign}` : ''}`}
        </Button>

        {lastResult && (
          <div
            key={lastResult.id}
            className="flex flex-col items-center min-w-[56px] animate-in fade-in zoom-in-90 duration-200"
          >
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {tc('characterSheet.combatView.diceRoller.result')}
            </div>
            <div
              className={`text-3xl font-black leading-tight ${
                lastResult.natural === 'nat20'
                  ? 'text-green-500'
                  : lastResult.natural === 'nat1'
                    ? 'text-destructive'
                    : 'text-foreground'
              }`}
            >
              {lastResult.total}
            </div>
            {lastResult.natural && (
              <div className="text-[10px] font-bold">
                {tc(lastResult.natural === 'nat20' ? 'diceLog.natural20' : 'diceLog.natural1')}
              </div>
            )}
            {lastResult.kept && lastResult.kept.length < lastResult.rolls.length && (
              <div className="text-[10px] text-muted-foreground font-mono">
                {lastResult.rolls.map((r, i) => (
                  <span
                    key={i}
                    className={
                      r === lastResult.kept?.[0] && i === lastResult.rolls.indexOf(r) ? 'font-bold' : 'line-through'
                    }
                  >
                    {i > 0 ? ' / ' : ''}
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shared campaign roll log */}
      {!compact && campaignId && (
        <div>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            {tc('diceLog.title')}
          </span>
          {sharedLog.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{tc('diceLog.empty')}</p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {sharedLog.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0 text-xs"
                >
                  <span className="truncate">
                    <span className="font-semibold">{r.characters?.name ?? tc('diceLog.unknownRoller')}</span>
                    {r.label ? ` · ${r.label}` : ''}
                    <span className="text-muted-foreground font-mono"> {r.formula}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="text-muted-foreground/60 text-[10px]">[{r.detail?.rolls?.join(', ')}]</span>
                    <span className="font-bold text-sm">{r.result}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Local roll history (no campaign context) */}
      {!compact && !campaignId && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {tc('characterSheet.combatView.diceRoller.history')}
            </span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistory([])}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
              >
                <RotateCcw className="size-2.5" />
                {tc('characterSheet.combatView.diceRoller.clearHistory')}
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              {tc('characterSheet.combatView.diceRoller.noHistory')}
            </p>
          ) : (
            <div className="space-y-0">
              {history.map((entry) => (
                <HistoryEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
