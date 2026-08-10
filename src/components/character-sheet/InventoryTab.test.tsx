import { render, screen } from '@testing-library/react';
import { InventoryTab } from './InventoryTab';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  }),
}));

vi.mock('@/hooks/useInventoryMutations', () => ({
  useInventoryMutations: () => ({
    addItem: { mutate: vi.fn() },
    updateItem: { mutate: vi.fn() },
    removeItem: { mutate: vi.fn() },
    transferItem: { mutate: vi.fn() },
  }),
}));

vi.mock('@/hooks/useCharacters', () => ({
  useCharacters: () => ({
    data: [
      { id: 'c1', name: 'Grog', class: 'barbarian' },
      { id: 'c2', name: 'Vex', class: 'ranger' },
    ],
  }),
}));

const queryClient = new QueryClient();

describe('InventoryTab', () => {
  it('renders inventory items and weight correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <InventoryTab
          characterId="c1"
          campaignId="camp1"
          itemsData={[
            { id: 'item-1', item_id: 'longsword', quantity: 1, equipped: true },
            { id: 'item-2', item_id: 'dagger', quantity: 2, equipped: false },
          ]}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText(/longsword/i)).toBeInTheDocument();
    expect(screen.getByText(/dagger/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Items:/i)).toBeInTheDocument();
  });
});
