import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ActionsPanel } from '@/components/character-sheet/ActionsPanel';
import { homebrewToActions } from '@/lib/homebrew';
import type { HomebrewAction } from '@/lib/homebrew';
import type { ResolvedCharacter } from '@/types/resolved';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const last = key.split('.').slice(-1)[0];
      return (opts?.defaultValue as string | undefined) ?? (opts?.name ? `${last} ${opts.name}` : last);
    },
  }),
}));

const resolved = {
  abilities: { str: { modifier: 3 }, dex: { modifier: 0 }, int: { modifier: 0 } },
  proficiencyBonus: 2,
  resourcePools: [],
} as unknown as ResolvedCharacter;

function Harness({ onRoll }: { onRoll?: (p: unknown) => void }) {
  const [homebrew, setHomebrew] = useState<HomebrewAction[]>([]);
  return (
    <ActionsPanel
      actions={homebrewToActions(homebrew, resolved)}
      attacksPerAction={1}
      resolved={resolved}
      homebrew={homebrew}
      onChangeHomebrew={setHomebrew}
      onSelectRollPreset={onRoll}
    />
  );
}

const add = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'addButton' }));
  fireEvent.change(screen.getByLabelText('name'), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'save' }));
};

describe('homebrew actions', () => {
  it('adds a custom action with a working roll', () => {
    const onRoll = vi.fn();
    render(<Harness onRoll={onRoll} />);
    add('Moon Blade');
    expect(screen.getByText('Moon Blade')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/1d8\+3/));
    expect(onRoll).toHaveBeenCalledWith(expect.objectContaining({ die: 8, modifier: 3 }));
  });

  it('validates the name', () => {
    render(<Harness />);
    add('  ');
    expect(screen.getByRole('alert')).toHaveTextContent('name');
  });

  it('edits and deletes', () => {
    render(<Harness />);
    add('Moon Blade');
    fireEvent.click(screen.getByRole('button', { name: 'edit Moon Blade' }));
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Sun Blade' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    expect(screen.queryByText('Moon Blade')).not.toBeInTheDocument();
    expect(screen.getByText('Sun Blade')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'remove Sun Blade' }));
    expect(screen.queryByText('Sun Blade')).not.toBeInTheDocument();
  });
});
