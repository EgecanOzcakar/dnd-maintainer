import { fireEvent, render, screen } from '@testing-library/react';
import { CurrencyPanel } from '@/components/character-sheet/CurrencyPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key.split('.').slice(-1)[0] }),
}));

describe('CurrencyPanel', () => {
  it('commits a changed amount on blur, never below zero', () => {
    const onChange = vi.fn();
    render(<CurrencyPanel currency={{ cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 }} onChange={onChange} />);
    const gp = screen.getAllByRole('spinbutton')[1];
    fireEvent.change(gp, { target: { value: '-4' } });
    fireEvent.blur(gp);
    expect(onChange).toHaveBeenCalledWith({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
  });

  it('does not write when nothing changed', () => {
    const onChange = vi.fn();
    render(<CurrencyPanel currency={{ cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 }} onChange={onChange} />);
    fireEvent.blur(screen.getAllByRole('spinbutton')[1]);
    expect(onChange).not.toHaveBeenCalled();
  });
});
