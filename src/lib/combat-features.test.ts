import { combatFeatures } from '@/lib/combat-features';
import type { ResolvedFeature } from '@/types/resolved';

const f = (id: string, description?: string): ResolvedFeature => ({
  feature: { id, description },
  source: { origin: 'class', id: 'fighter', level: 1 },
});

describe('combatFeatures', () => {
  it('keeps combat passives, drops non-combat and action-row features', () => {
    const ids = combatFeatures([
      f('champion-improved-critical'),
      f('fighting-style-defense'),
      f('fighter-second-wind'),
      f('homebrew-x', 'Once per turn you deal extra damage.'),
      f('homebrew-y', 'You can speak with animals.'),
    ]).map((r) => r.feature.id);
    expect(ids).toContain('champion-improved-critical');
    expect(ids).toContain('fighting-style-defense');
    expect(ids).toContain('homebrew-x');
    expect(ids).not.toContain('homebrew-y');
    expect(ids).not.toContain('fighter-second-wind');
  });
});
