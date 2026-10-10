import { fireEvent, render, screen } from '@testing-library/react';
import { ActionsPanel } from '@/components/character-sheet/ActionsPanel';
import type { ResolvedAction } from '@/lib/resolver/actions';
import type { ResolvedCharacter } from '@/types/resolved';

// Echo the key's last segment (or defaultValue) so assertions can target stable text.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      (opts?.defaultValue as string | undefined) ?? key.split('.').slice(-1)[0],
  }),
}));

const resolved = {
  abilities: { str: { modifier: 3 } },
  proficiencyBonus: 2,
  resourcePools: [{ poolId: 'second-wind', max: 2 }],
} as unknown as ResolvedCharacter;

const actions: ResolvedAction[] = [
  {
    key: 'weapon:longsword',
    kind: 'weapon',
    refId: 'longsword',
    activation: 'action',
    isAttack: true,
    toHit: 5,
    damage: { dice: '1d8', bonus: 3, type: 'slashing' },
  },
  {
    key: 'feature:fighter-second-wind',
    kind: 'feature',
    refId: 'fighter-second-wind',
    activation: 'bonus-action',
    isAttack: false,
    heal: { dice: '1d10', bonus: 2 },
    poolId: 'second-wind',
  },
  {
    key: 'feature:rogue-uncanny-dodge',
    kind: 'feature',
    refId: 'rogue-uncanny-dodge',
    activation: 'reaction',
    isAttack: false,
  },
];

describe('ActionsPanel', () => {
  it('shows every action under All, with to-hit, damage and heal rolls', () => {
    render(<ActionsPanel actions={actions} attacksPerAction={2} resolved={resolved} />);
    expect(screen.getByText('+5')).toBeInTheDocument();
    expect(screen.getByText(/1d8\+3/)).toBeInTheDocument();
    expect(screen.getAllByText(/fighter-second-wind|rogue-uncanny-dodge/)).toHaveLength(2);
  });

  it('filters by activation', () => {
    render(<ActionsPanel actions={actions} attacksPerAction={1} resolved={resolved} />);
    fireEvent.click(screen.getByRole('tab', { name: 'bonus-action' }));
    expect(screen.getByText('fighter-second-wind')).toBeInTheDocument();
    expect(screen.queryByText('rogue-uncanny-dodge')).not.toBeInTheDocument();
    expect(screen.queryByText('+5')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'attack' }));
    expect(screen.getByText('+5')).toBeInTheDocument();
    expect(screen.queryByText('fighter-second-wind')).not.toBeInTheDocument();
  });

  it('clicking a to-hit button hands a d20 roll to the dice roller', () => {
    const onSelectRollPreset = vi.fn();
    render(
      <ActionsPanel
        actions={actions}
        attacksPerAction={1}
        resolved={resolved}
        onSelectRollPreset={onSelectRollPreset}
      />
    );
    fireEvent.click(screen.getByText('+5'));
    expect(onSelectRollPreset).toHaveBeenCalledWith(expect.objectContaining({ die: 20, count: 1, modifier: 5 }));
  });
});
