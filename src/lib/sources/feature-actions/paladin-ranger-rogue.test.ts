import { describe, expect, it } from 'vitest';
import { PALADIN_RANGER_ROGUE_ACTIONS as A } from './paladin-ranger-rogue';

describe('paladin/ranger/rogue actions', () => {
  it('keeps Sneak Attack and Lay On Hands', () => {
    expect(A['rogue-sneak-attack']?.damage?.dice).toHaveLength(10);
    expect(A['paladin-lay-on-hands']?.poolId).toBe('lay-on-hands');
  });
  it('Dread Ambusher scales to 2d8', () => {
    expect(A['gloomstalker-dread-ambusher']?.damage?.dice).toContainEqual([11, '2d8']);
  });
});
