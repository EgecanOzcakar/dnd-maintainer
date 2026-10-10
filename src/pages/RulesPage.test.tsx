import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@/lib/i18n';
import RulesPage from '@/pages/RulesPage';

vi.mock('@/hooks/usePageTitle', () => ({ usePageTitle: () => {} }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <RulesPage />
    </MemoryRouter>
  );

describe('RulesPage', () => {
  it('searches after the debounce and groups results', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search the rules'), { target: { value: 'fireball' } });
    expect(await screen.findByRole('button', { name: /^Fireball/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Spells/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Conditions/ })).not.toBeInTheDocument());
  });

  it('expands a spell to show casting details and mechanics', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search the rules'), { target: { value: 'fireball' } });
    fireEvent.click(await screen.findByRole('button', { name: /^Fireball/ }));
    expect(screen.getByText('Casting time:')).toBeInTheDocument();
    expect(screen.getByText('Dexterity save')).toBeInTheDocument();
  });

  it('filters spells by level and school, hiding other categories', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('School'), { target: { value: 'evocation' } });
    expect(screen.queryByRole('heading', { name: /Conditions/ })).not.toBeInTheDocument();
    const section = screen.getByRole('region', { name: /Spells/ });
    expect(within(section).getAllByText('Evocation cantrip').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('heading', { name: /Conditions/ })).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search the rules'), { target: { value: 'zzzzqqq' } });
    expect(await screen.findByText('Nothing found')).toBeInTheDocument();
  });
});
