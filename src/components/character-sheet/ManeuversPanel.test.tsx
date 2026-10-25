import { fireEvent, render, screen } from '@testing-library/react';
import { ManeuversPanel } from '@/components/character-sheet/ManeuversPanel';
import type { ResolvedCharacter } from '@/types/resolved';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      (opts?.defaultValue as string | undefined) ?? key.split('.').slice(-1)[0],
  }),
}));

const f = (id: string) => ({ feature: { id } });
const make = (features: string[], dieSize = 10) =>
  ({
    proficiencyBonus: 3,
    abilities: { str: { modifier: 4 }, dex: { modifier: 2 } },
    resourcePools: [{ poolId: 'superiority-dice', max: 5, dieSize, regen: 'short-rest', source: {} }],
    features: features.map(f),
  }) as unknown as ResolvedCharacter;

describe('ManeuversPanel', () => {
  it('Use spends a die and rolls it at the current die size, as non-damage for Precision Attack', () => {
    const onUpdate = vi.fn();
    const onRoll = vi.fn();
    render(
      <ManeuversPanel
        resolved={make(['maneuver-precision-attack'])}
        character={{ resource_pools_used: { 'superiority-dice': 1 } }}
        fighterLevel={10}
        onUpdate={onUpdate}
        onSelectRollPreset={onRoll}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'use' }));
    expect(onUpdate).toHaveBeenCalledWith({ resource_pools_used: { 'superiority-dice': 2 } });
    expect(onRoll).toHaveBeenCalledWith(expect.objectContaining({ die: 10, count: 1, modifier: 0, kind: 'd20' }));
  });

  it('Parry adds the better of STR and DEX; Rally adds half the Fighter level', () => {
    const onRoll = vi.fn();
    render(
      <ManeuversPanel
        resolved={make(['maneuver-parry', 'maneuver-rally'])}
        character={{}}
        fighterLevel={11}
        onUpdate={vi.fn()}
        onSelectRollPreset={onRoll}
      />
    );
    const [parry, rally] = screen.getAllByRole('button', { name: 'use' });
    fireEvent.click(parry);
    expect(onRoll).toHaveBeenLastCalledWith(expect.objectContaining({ modifier: 4 }));
    fireEvent.click(rally);
    expect(onRoll).toHaveBeenLastCalledWith(expect.objectContaining({ modifier: 5 })); // floor(11 / 2)
  });

  it('shows the save DC (8 + proficiency + best of STR/DEX) on save maneuvers', () => {
    render(
      <ManeuversPanel resolved={make(['maneuver-trip-attack'])} character={{}} fighterLevel={5} onUpdate={vi.fn()} />
    );
    expect(screen.getByText('saveBadge')).toBeInTheDocument();
  });

  it('is disabled with no dice left, but Relentless gives a free d8 that costs nothing', () => {
    const onUpdate = vi.fn();
    const onRoll = vi.fn();
    const resolved = make(['maneuver-riposte', 'battlemaster-relentless']);
    render(
      <ManeuversPanel
        resolved={resolved}
        character={{ resource_pools_used: { 'superiority-dice': 5 } }}
        fighterLevel={15}
        onUpdate={onUpdate}
        onSelectRollPreset={onRoll}
      />
    );
    expect(screen.getByRole('button', { name: 'use' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'use' }));
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onRoll).toHaveBeenCalledWith(expect.objectContaining({ die: 8, kind: 'damage' }));
  });

  it('renders nothing without Superiority Dice', () => {
    const { container } = render(
      <ManeuversPanel
        resolved={{ ...make([]), resourcePools: [] } as ResolvedCharacter}
        character={{}}
        fighterLevel={1}
        onUpdate={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
