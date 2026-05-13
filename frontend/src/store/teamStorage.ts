import type { Team } from './teamStore';

export const TEAM_STORAGE_KEY = 'worksight_teams';
export const MEMBER_MAP_STORAGE_KEY = 'worksight_member_team_map';

export function loadTeamStorage(): { teams: Team[]; memberTeamMap: Record<number, string> } {
  try {
    const teamsRaw = localStorage.getItem(TEAM_STORAGE_KEY);
    const mapRaw = localStorage.getItem(MEMBER_MAP_STORAGE_KEY);
    return {
      teams: teamsRaw ? JSON.parse(teamsRaw) : [],
      memberTeamMap: mapRaw ? JSON.parse(mapRaw) : {},
    };
  } catch {
    return { teams: [], memberTeamMap: {} };
  }
}

export function saveTeamStorage(teams: Team[], memberTeamMap: Record<number, string>) {
  localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(teams));
  localStorage.setItem(MEMBER_MAP_STORAGE_KEY, JSON.stringify(memberTeamMap));
}

export function clearTeamStorage() {
  localStorage.removeItem(TEAM_STORAGE_KEY);
  localStorage.removeItem(MEMBER_MAP_STORAGE_KEY);
}
