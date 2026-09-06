import { describe, expect, it } from 'vitest';
import { selectPartyMembers, selectRecruitableNpcs } from './party';

type Row = { id: string; character_type: 'pc' | 'npc'; status: 'draft' | 'ready' };

const rows: Row[] = [
  { id: 'pc-1', character_type: 'pc', status: 'ready' },
  { id: 'pc-draft', character_type: 'pc', status: 'draft' },
  { id: 'npc-1', character_type: 'npc', status: 'ready' },
  { id: 'npc-2', character_type: 'npc', status: 'ready' },
  { id: 'npc-draft', character_type: 'npc', status: 'draft' },
];

describe('selectPartyMembers', () => {
  it('includes all finalized PCs and only NPCs in the party list', () => {
    const members = selectPartyMembers(rows, ['npc-1']);
    expect(members.map((m) => m.id)).toEqual(['pc-1', 'npc-1']);
  });

  it('excludes draft characters even when listed as a party NPC', () => {
    const members = selectPartyMembers(rows, ['npc-draft']);
    expect(members.map((m) => m.id)).toEqual(['pc-1']);
  });

  it('returns only PCs when no NPCs have joined', () => {
    expect(selectPartyMembers(rows, []).map((m) => m.id)).toEqual(['pc-1']);
  });
});

describe('selectRecruitableNpcs', () => {
  it('returns finalized NPCs regardless of party membership', () => {
    expect(selectRecruitableNpcs(rows).map((m) => m.id)).toEqual(['npc-1', 'npc-2']);
  });
});
