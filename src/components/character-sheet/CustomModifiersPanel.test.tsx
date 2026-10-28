import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CustomModifiersPanel } from '@/components/character-sheet/CustomModifiersPanel';

describe('CustomModifiersPanel', () => {
  it('detects a modifier in pasted text and adds it only once approved', () => {
    const onChange = vi.fn();
    render(<CustomModifiersPanel onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('customModifiers.text'), {
      target: { value: 'You gain a +1 bonus to all saving throws.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'customModifiers.detect' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'customModifiers.addApproved' }));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        enabled: true,
        grants: [expect.objectContaining({ type: 'roll-modifier', target: 'save', bonus: 1 })],
      }),
    ]);
  });

  it('toggles and removes a modifier', () => {
    const onChange = vi.fn();
    const mod = { id: 'a', label: '+1 to save', enabled: true, grants: [] };
    render(<CustomModifiersPanel modifiers={[mod]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('customModifiers.toggle'));
    expect(onChange).toHaveBeenLastCalledWith([{ ...mod, enabled: false }]);
    fireEvent.click(screen.getByLabelText('customModifiers.remove'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('adds a hand-entered AC bonus', () => {
    const onChange = vi.fn();
    render(<CustomModifiersPanel onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('customModifiers.target'), { target: { value: 'ac' } });
    expect(screen.getByLabelText('customModifiers.mode')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('customModifiers.value'), { target: { value: '+2' } });
    fireEvent.click(screen.getByRole('button', { name: 'customModifiers.add' }));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ label: '+2 AC', grants: [{ type: 'ac-bonus', bonus: 2 }] }),
    ]);
  });

  it('narrows a save to one ability', () => {
    const onChange = vi.fn();
    render(<CustomModifiersPanel onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('customModifiers.ability'), { target: { value: 'wis' } });
    fireEvent.change(screen.getByLabelText('customModifiers.mode'), { target: { value: 'adv' } });
    fireEvent.click(screen.getByRole('button', { name: 'customModifiers.add' }));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        grants: [{ type: 'roll-modifier', target: 'save', abilities: ['wis'], mode: 'adv' }],
      }),
    ]);
  });

  it('narrows a check to one skill, and hides the pickers for attacks', () => {
    const onChange = vi.fn();
    render(<CustomModifiersPanel onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('customModifiers.target'), { target: { value: 'check' } });
    fireEvent.change(screen.getByLabelText('customModifiers.skill'), { target: { value: 'stealth' } });
    fireEvent.change(screen.getByLabelText('customModifiers.value'), { target: { value: '1d4' } });
    fireEvent.click(screen.getByRole('button', { name: 'customModifiers.add' }));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        grants: [{ type: 'roll-modifier', target: 'check', skills: ['stealth'], dice: '+1d4' }],
      }),
    ]);
    fireEvent.change(screen.getByLabelText('customModifiers.target'), { target: { value: 'attack' } });
    expect(screen.queryByLabelText('customModifiers.ability')).toBeNull();
    expect(screen.queryByLabelText('customModifiers.skill')).toBeNull();
  });
});
