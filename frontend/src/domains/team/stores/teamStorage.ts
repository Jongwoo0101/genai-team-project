import { STORAGE_KEYS } from '../../../lib/constants';
import type { Team } from './teamStore';

export const TEAM_STORAGE_KEY = STORAGE_KEYS.TEAM_DATA;
export const MEMBER_MAP_STORAGE_KEY = STORAGE_KEYS.MEMBER_MAP;
export const TEAM_OWNER_STORAGE_KEY = STORAGE_KEYS.TEAM_OWNER;

export function isTeamStorageEventKey(key: string | null): boolean {
  return key === TEAM_OWNER_STORAGE_KEY
    || key === TEAM_STORAGE_KEY
    || key === MEMBER_MAP_STORAGE_KEY
    || key?.startsWith(`${TEAM_STORAGE_KEY}:`) === true
    || key?.startsWith(`${MEMBER_MAP_STORAGE_KEY}:`) === true;
}

function getScopedKeys(ownerMemberId: number | null) {
  if (ownerMemberId === null) {
    return {
      teamKey: TEAM_STORAGE_KEY,
      memberMapKey: MEMBER_MAP_STORAGE_KEY,
    };
  }

  return {
    teamKey: `${TEAM_STORAGE_KEY}:${ownerMemberId}`,
    memberMapKey: `${MEMBER_MAP_STORAGE_KEY}:${ownerMemberId}`,
  };
}

function parseOwnerId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function loadTeamStorage(ownerMemberId?: number): { ownerMemberId: number | null; teams: Team[]; memberTeamMap: Record<number, string> } {
  try {
    const activeOwnerId = parseOwnerId(localStorage.getItem(TEAM_OWNER_STORAGE_KEY));
    const resolvedOwnerId = ownerMemberId ?? activeOwnerId;
    const { teamKey, memberMapKey } = getScopedKeys(resolvedOwnerId);
    const scopedTeamsRaw = localStorage.getItem(teamKey);
    const scopedMapRaw = localStorage.getItem(memberMapKey);

    if (scopedTeamsRaw || scopedMapRaw || resolvedOwnerId !== activeOwnerId) {
      return {
        ownerMemberId: resolvedOwnerId,
        teams: scopedTeamsRaw ? JSON.parse(scopedTeamsRaw) : [],
        memberTeamMap: scopedMapRaw ? JSON.parse(scopedMapRaw) : {},
      };
    }

    const legacyTeamsRaw = localStorage.getItem(TEAM_STORAGE_KEY);
    const legacyMapRaw = localStorage.getItem(MEMBER_MAP_STORAGE_KEY);
    return {
      ownerMemberId: resolvedOwnerId,
      teams: legacyTeamsRaw ? JSON.parse(legacyTeamsRaw) : [],
      memberTeamMap: legacyMapRaw ? JSON.parse(legacyMapRaw) : {},
    };
  } catch {
    return { ownerMemberId: null, teams: [], memberTeamMap: {} };
  }
}

export function saveTeamStorage(teams: Team[], memberTeamMap: Record<number, string>, ownerMemberId: number | null) {
  if (ownerMemberId === null) {
    localStorage.removeItem(TEAM_OWNER_STORAGE_KEY);
  } else {
    localStorage.setItem(TEAM_OWNER_STORAGE_KEY, String(ownerMemberId));
  }

  const { teamKey, memberMapKey } = getScopedKeys(ownerMemberId);
  localStorage.setItem(teamKey, JSON.stringify(teams));
  localStorage.setItem(memberMapKey, JSON.stringify(memberTeamMap));
}

export function clearTeamStorage() {
  localStorage.removeItem(TEAM_OWNER_STORAGE_KEY);
  localStorage.removeItem(TEAM_STORAGE_KEY);
  localStorage.removeItem(MEMBER_MAP_STORAGE_KEY);
}
