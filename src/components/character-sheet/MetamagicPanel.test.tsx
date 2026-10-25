import { fireEvent, render, screen } from '@testing-library/react';
import { MetamagicPanel } from '@/components/character-sheet/MetamagicPanel';
import type { ResolvedCharacter } from '@/types/resolved';

// Echo the key's last segment so assertions can target stable text.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      (opts?.defaultValue as string | undefined) ?? key.split('.').slice(-1)[0],
  }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const resolved = {
  resourcePools: [{ poolId: 'sorcery-points', max: 5, regen: 'long-rest', source: {} }],
  features: [
    { feature: { id: 'metamagic-heightened-spell' } },
    { feature: { id: 'metamagic-careful-spell' } },
    { feature: { id: 'sorcerer-font-of-magic' } },
  ],
  spellcasting: { slots: [4, 2], pactMagic: null },
} as unknown as ResolvedCharacter;

describe('MetamagicPanel', () => {
  it('lists only chosen Metamagic options, with their costs', () => {
    render(
      <MetamagicPanel
        resolved={resolved}
        character={{ spell_slots_used: {}, resource_pools_used: {} }}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getAllByText('cost')).toHaveLength(2);
    expect(screen.getByText('metamagic-heightened-spell')).toBeInTheDocument();
    expect(screen.queryByText('metamagic-twinned-spell')).not.toBeInTheDocument();
  });

  it('Use spends the option cost from Sorcery Points', () => {
    const onUpdate = vi.fn();
    render(
      <MetamagicPanel
        resolved={resolved}
        character={{ spell_slots_used: {}, resource_pools_used: { 'sorcery-points': 1 } }}
        onUpdate={onUpdate}
      />
    );
    // Heightened costs 2 SP: 1 already spent -> 3 spent
    fireEvent.click(screen.getAllByRole('button', { name: 'use' })[0]);
    expect(onUpdate).toHaveBeenCalledWith({ resource_pools_used: { 'sorcery-points': 3 } });
  });

  it('Use is disabled when there are not enough points', () => {
    render(
      <MetamagicPanel
        resolved={resolved}
        character={{ spell_slots_used: {}, resource_pools_used: { 'sorcery-points': 4 } }}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getAllByRole('button', { name: 'use' })[0]).toBeDisabled(); // heightened costs 2, 1 left
    expect(screen.getAllByRole('button', { name: 'use' })[1]).not.toBeDisabled(); // careful costs 1
  });

  it('renders nothing for a character without sorcery points', () => {
    const { container } = render(
      <MetamagicPanel
        resolved={{ ...resolved, resourcePools: [] } as ResolvedCharacter}
        character={{ spell_slots_used: {}, resource_pools_used: {} }}
        onUpdate={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
