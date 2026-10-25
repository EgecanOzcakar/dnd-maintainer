import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PoolPips } from '@/components/character-sheet/PoolPips';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { left?: number; max?: number }) =>
      opts?.left !== undefined ? `${opts.left} / ${opts.max}` : key,
  }),
}));

describe('PoolPips', () => {
  it('shows how many uses are left next to the pips', () => {
    render(<PoolPips name="Rage" max={4} used={1} onSetUsed={vi.fn()} />);

    expect(screen.getByText('3 / 4')).toBeTruthy();
  });

  it('spends and restores uses by clicking pips', () => {
    const onSetUsed = vi.fn();
    render(<PoolPips name="Rage" max={3} used={1} onSetUsed={onSetUsed} />);

    const pips = screen.getAllByRole('button');
    fireEvent.click(pips[1]);
    expect(onSetUsed).toHaveBeenLastCalledWith(2);
    fireEvent.click(pips[0]);
    expect(onSetUsed).toHaveBeenLastCalledWith(0);
  });
});
