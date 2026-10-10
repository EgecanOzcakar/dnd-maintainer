export interface DeathSaves {
  successes: number;
  failures: number;
}

/** `current` is already resolved (null/at-max converted to max by the caller). */
export interface HpState {
  current: number;
  temp: number;
  deathSaves: DeathSaves;
}

export interface HpResult {
  state: HpState;
  /** Damage beyond 0 HP was >= max HP, or 3 death-save failures. */
  dead: boolean;
}

export const NO_DEATH_SAVES: DeathSaves = { successes: 0, failures: 0 };

export function resolveCurrentHp(currentHp: number | null | undefined, max: number): number {
  return Math.max(0, Math.min(max, currentHp ?? max));
}

export function applyDamage(state: HpState, amount: number, max: number, crit = false): HpResult {
  const dmg = Math.max(0, Math.floor(amount));
  if (dmg === 0) return { state, dead: state.deathSaves.failures >= 3 };

  const absorbed = Math.min(state.temp, dmg);
  const temp = state.temp - absorbed;
  const rest = dmg - absorbed;
  if (rest === 0) return { state: { ...state, temp }, dead: false };

  // Already at 0 HP: damage is a death-save failure (two on a crit), or instant death if huge.
  if (state.current === 0) {
    const failures = Math.min(3, state.deathSaves.failures + (crit ? 2 : 1));
    const dead = rest >= max || failures >= 3;
    return { state: { ...state, temp, deathSaves: { ...state.deathSaves, failures: dead ? 3 : failures } }, dead };
  }

  const overflow = rest - state.current;
  if (overflow >= max) {
    return { state: { current: 0, temp, deathSaves: { successes: 0, failures: 3 } }, dead: true };
  }
  return { state: { ...state, current: Math.max(0, state.current - rest), temp }, dead: false };
}

export function applyHeal(state: HpState, amount: number, max: number): HpState {
  const heal = Math.max(0, Math.floor(amount));
  if (heal === 0) return state;
  const current = Math.min(max, state.current + heal);
  return { ...state, current, deathSaves: state.current === 0 ? { ...NO_DEATH_SAVES } : state.deathSaves };
}

/** Temp HP never stacks: keep the higher value. */
export function applyTempHp(state: HpState, amount: number): HpState {
  return { ...state, temp: Math.max(state.temp, Math.max(0, Math.floor(amount))) };
}

/** d20 death save: 1 = two failures, 2-9 = failure, 10-19 = success, 20 = regain 1 HP. */
export function applyDeathSave(state: HpState, d20: number): HpResult {
  if (d20 >= 20) return { state: { ...state, current: 1, deathSaves: { ...NO_DEATH_SAVES } }, dead: false };
  const { successes, failures } = state.deathSaves;
  const next =
    d20 >= 10
      ? { successes: Math.min(3, successes + 1), failures }
      : { successes, failures: Math.min(3, failures + (d20 === 1 ? 2 : 1)) };
  return { state: { ...state, deathSaves: next }, dead: next.failures >= 3 };
}

export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/** Column updates for a long rest: full HP (NULL), no temp HP, fresh death saves. */
export function longRestHpUpdate(): { current_hp: null; temp_hp: 0; death_saves: DeathSaves } {
  return { current_hp: null, temp_hp: 0, death_saves: { ...NO_DEATH_SAVES } };
}
