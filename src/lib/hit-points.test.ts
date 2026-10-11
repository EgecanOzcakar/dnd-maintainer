import {
  applyDamage,
  applyDeathSave,
  applyHeal,
  applyTempHp,
  longRestHpUpdate,
  resolveCurrentHp,
  type HpState,
} from '@/lib/hit-points';

const s = (current: number, temp = 0, successes = 0, failures = 0): HpState => ({
  current,
  temp,
  deathSaves: { successes, failures },
});

describe('hit-points', () => {
  it('resolves null current HP to max', () => {
    expect(resolveCurrentHp(null, 20)).toBe(20);
    expect(resolveCurrentHp(25, 20)).toBe(20);
  });

  it('damage drains temp HP first', () => {
    expect(applyDamage(s(10, 5), 3, 10).state).toEqual(s(10, 2));
    expect(applyDamage(s(10, 5), 8, 10).state).toEqual(s(7, 0));
  });

  it('damage to 0 does not kill unless overflow >= max', () => {
    expect(applyDamage(s(5), 12, 10)).toEqual({ state: s(0), dead: false });
    expect(applyDamage(s(5), 15, 10).dead).toBe(true);
  });

  it('damage at 0 HP adds a failure, two on a crit, three is death', () => {
    expect(applyDamage(s(0), 3, 10).state.deathSaves.failures).toBe(1);
    expect(applyDamage(s(0), 3, 10, true).state.deathSaves.failures).toBe(2);
    expect(applyDamage(s(0, 0, 0, 2), 3, 10).dead).toBe(true);
  });

  it('damage at 0 HP of at least max is instant death', () => {
    expect(applyDamage(s(0), 10, 10).dead).toBe(true);
  });

  it('heal caps at max and resets death saves from 0', () => {
    expect(applyHeal(s(8), 5, 10).current).toBe(10);
    expect(applyHeal(s(0, 0, 2, 2), 1, 10)).toEqual(s(1));
    expect(applyHeal(s(5, 0, 1, 1), 1, 10).deathSaves).toEqual({ successes: 1, failures: 1 });
  });

  it('temp HP takes the higher value', () => {
    expect(applyTempHp(s(5, 4), 3).temp).toBe(4);
    expect(applyTempHp(s(5, 4), 9).temp).toBe(9);
  });

  it.each([
    [1, 0, 2],
    [2, 0, 1],
    [10, 1, 0],
    [19, 1, 0],
  ])('death save d20=%i', (roll, successes, failures) => {
    const r = applyDeathSave(s(0), roll);
    expect(r.state.deathSaves).toEqual({ successes, failures });
    expect(r.state.current).toBe(0);
  });

  it('natural 20 regains 1 HP and resets saves', () => {
    expect(applyDeathSave(s(0, 0, 1, 2), 20).state).toEqual(s(1));
  });

  it('three failures is dead', () => {
    expect(applyDeathSave(s(0, 0, 0, 2), 5).dead).toBe(true);
  });

  it('long rest update', () => {
    expect(longRestHpUpdate()).toEqual({ current_hp: null, temp_hp: 0, death_saves: { successes: 0, failures: 0 } });
  });
});
