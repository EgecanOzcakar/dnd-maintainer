import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HitPointsPanel } from '@/components/character-sheet/HitPointsPanel';
import * as hp from '@/lib/hit-points';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key.split('.').pop(),
  }),
}));

const base = { current_hp: null, temp_hp: 0, death_saves: { successes: 0, failures: 0 } };

describe('HitPointsPanel', () => {
  it('renders nothing without max HP', () => {
    const { container } = render(<HitPointsPanel character={base} maxHp={null} onUpdate={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('damage drains temp HP first, then current', async () => {
    const onUpdate = vi.fn();
    render(<HitPointsPanel character={{ ...base, current_hp: 10, temp_hp: 4 }} maxHp={20} onUpdate={onUpdate} />);
    await userEvent.type(screen.getByRole('spinbutton'), '6');
    await userEvent.click(screen.getByRole('button', { name: 'damage' }));
    expect(onUpdate).toHaveBeenCalledWith({
      current_hp: 8,
      temp_hp: 0,
      death_saves: { successes: 0, failures: 0 },
    });
  });

  it('heal is capped at max and stored as null (at max)', async () => {
    const onUpdate = vi.fn();
    render(<HitPointsPanel character={{ ...base, current_hp: 18 }} maxHp={20} onUpdate={onUpdate} />);
    await userEvent.type(screen.getByRole('spinbutton'), '50');
    await userEvent.click(screen.getByRole('button', { name: 'heal' }));
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ current_hp: null }));
  });

  it('temp HP does not stack', async () => {
    const onUpdate = vi.fn();
    render(<HitPointsPanel character={{ ...base, temp_hp: 7 }} maxHp={20} onUpdate={onUpdate} />);
    await userEvent.type(screen.getByRole('spinbutton'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'tempHp' }));
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ temp_hp: 7 }));
  });

  it('shows death saves only at 0 HP and records a rolled save', async () => {
    const { rerender } = render(<HitPointsPanel character={base} maxHp={20} onUpdate={vi.fn()} />);
    expect(screen.queryByTestId('death-saves')).toBeNull();

    vi.spyOn(hp, 'rollD20').mockReturnValue(1);
    const onUpdate = vi.fn();
    rerender(<HitPointsPanel character={{ ...base, current_hp: 0 }} maxHp={20} onUpdate={onUpdate} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(7); // 3 + 3 + crit
    await userEvent.click(screen.getByRole('button', { name: 'rollDeathSave' }));
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ death_saves: { successes: 0, failures: 2 } }));
  });

  it('warns when dead', () => {
    render(
      <HitPointsPanel
        character={{ ...base, current_hp: 0, death_saves: { successes: 0, failures: 3 } }}
        maxHp={20}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
