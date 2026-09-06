import type { CharacterSummary } from '@/types/database';

/**
 * The "party" is every Player Character plus any NPC the DM has explicitly
 * invited to travel with the group (`party_npcs` in the campaign's shared
 * party state). Draft characters are excluded — they aren't playable yet.
 */
export function selectPartyMembers<T extends Pick<CharacterSummary, 'id' | 'character_type' | 'status'>>(
  characters: T[],
  partyNpcIds: readonly string[]
): T[] {
  const npcIds = new Set(partyNpcIds);
  return characters.filter((c) => c.status !== 'draft' && (c.character_type === 'pc' || npcIds.has(c.id)));
}

/** NPCs that are candidates to join the party (finalized, not already members). */
export function selectRecruitableNpcs<T extends Pick<CharacterSummary, 'id' | 'character_type' | 'status'>>(
  characters: T[]
): T[] {
  return characters.filter((c) => c.character_type === 'npc' && c.status !== 'draft');
}
