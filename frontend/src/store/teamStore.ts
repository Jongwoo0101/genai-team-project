import { create } from 'zustand';

// ========================
// 팀 관련 타입 정의
// ========================

export interface Team {
  id: string;
  name: string;
  description: string;
  teamCode: string;
  managerId: number;
  managerName: string;
  members: TeamMember[];
  createdAt: string;
}

export interface TeamMember {
  id: number;
  username: string;
  joinedAt: string;
}

interface TeamState {
  teams: Team[];
  // 직원의 소속 팀 (employeeId -> teamId)
  memberTeamMap: Record<number, string>;

  // 관리자 액션
  createTeam: (name: string, description: string, managerId: number, managerName: string) => Team;
  deleteTeam: (teamId: string, managerId: number) => boolean;
  getTeamsByManager: (managerId: number) => Team[];
  getTeamById: (teamId: string) => Team | undefined;

  // 직원 액션
  joinTeam: (teamCode: string, employeeId: number, employeeName: string) => { success: boolean; error?: string; teamName?: string };
  leaveTeam: (employeeId: number) => void;
  getEmployeeTeam: (employeeId: number) => Team | undefined;

  // 팀 코드로 팀 찾기
  getTeamByCode: (teamCode: string) => Team | undefined;

  // 멤버 제거 (관리자)
  removeMember: (teamId: string, memberId: number) => boolean;
}

/** WS-XXXX-XXXX 형식의 팀 코드 생성 (백엔드와 일치) */
function generateTeamCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = () => {
    let s = '';
    for (let i = 0; i < 4; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    return s;
  };
  return `WS-${segment()}-${segment()}`;
}

/** localStorage 키 */
const STORAGE_KEY = 'worksight_teams';
const MEMBER_MAP_KEY = 'worksight_member_team_map';

/** localStorage에서 불러오기 */
function loadFromStorage(): { teams: Team[]; memberTeamMap: Record<number, string> } {
  try {
    const teamsRaw = localStorage.getItem(STORAGE_KEY);
    const mapRaw = localStorage.getItem(MEMBER_MAP_KEY);
    return {
      teams: teamsRaw ? JSON.parse(teamsRaw) : [],
      memberTeamMap: mapRaw ? JSON.parse(mapRaw) : {},
    };
  } catch {
    return { teams: [], memberTeamMap: {} };
  }
}

/** localStorage에 저장 */
function saveToStorage(teams: Team[], memberTeamMap: Record<number, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
  localStorage.setItem(MEMBER_MAP_KEY, JSON.stringify(memberTeamMap));
}

export const useTeamStore = create<TeamState>((set, get) => {
  const initial = loadFromStorage();

  return {
    teams: initial.teams,
    memberTeamMap: initial.memberTeamMap,

    createTeam: (name, description, managerId, managerName) => {
      // 중복 없는 코드 생성
      let teamCode = generateTeamCode();
      while (get().teams.some((t) => t.teamCode === teamCode)) {
        teamCode = generateTeamCode();
      }

      const newTeam: Team = {
        id: crypto.randomUUID(),
        name,
        description,
        teamCode,
        managerId,
        managerName,
        members: [],
        createdAt: new Date().toISOString(),
      };

      const updated = [...get().teams, newTeam];
      set({ teams: updated });
      saveToStorage(updated, get().memberTeamMap);
      return newTeam;
    },

    deleteTeam: (teamId, managerId) => {
      const team = get().teams.find((t) => t.id === teamId);
      if (!team || team.managerId !== managerId) return false;

      // 해당 팀 멤버들의 매핑도 제거
      const newMap = { ...get().memberTeamMap };
      team.members.forEach((m) => {
        delete newMap[m.id];
      });

      const updated = get().teams.filter((t) => t.id !== teamId);
      set({ teams: updated, memberTeamMap: newMap });
      saveToStorage(updated, newMap);
      return true;
    },

    getTeamsByManager: (managerId) => {
      return get().teams.filter((t) => t.managerId === managerId);
    },

    getTeamById: (teamId) => {
      return get().teams.find((t) => t.id === teamId);
    },

    joinTeam: (teamCode, employeeId, employeeName) => {
      // 이미 팀에 소속되어 있는지 확인
      const existingTeamId = get().memberTeamMap[employeeId];
      if (existingTeamId) {
        const existingTeam = get().teams.find((t) => t.id === existingTeamId);
        return {
          success: false,
          error: `이미 "${existingTeam?.name || '알 수 없는 팀'}"에 소속되어 있습니다.`,
        };
      }

      // 팀 코드로 팀 찾기
      const team = get().teams.find((t) => t.teamCode === teamCode.toUpperCase());
      if (!team) {
        return { success: false, error: '유효하지 않은 팀 코드입니다. 다시 확인해주세요.' };
      }

      // 이미 팀에 있는 멤버인지 확인
      if (team.members.some((m) => m.id === employeeId)) {
        return { success: false, error: '이미 이 팀에 소속되어 있습니다.' };
      }

      // 멤버 추가
      const newMember: TeamMember = {
        id: employeeId,
        username: employeeName,
        joinedAt: new Date().toISOString(),
      };

      const updatedTeams = get().teams.map((t) =>
        t.id === team.id ? { ...t, members: [...t.members, newMember] } : t
      );
      const updatedMap = { ...get().memberTeamMap, [employeeId]: team.id };

      set({ teams: updatedTeams, memberTeamMap: updatedMap });
      saveToStorage(updatedTeams, updatedMap);

      return { success: true, teamName: team.name };
    },

    leaveTeam: (employeeId) => {
      const teamId = get().memberTeamMap[employeeId];
      if (!teamId) return;

      const updatedTeams = get().teams.map((t) =>
        t.id === teamId ? { ...t, members: t.members.filter((m) => m.id !== employeeId) } : t
      );
      const updatedMap = { ...get().memberTeamMap };
      delete updatedMap[employeeId];

      set({ teams: updatedTeams, memberTeamMap: updatedMap });
      saveToStorage(updatedTeams, updatedMap);
    },

    getEmployeeTeam: (employeeId) => {
      const teamId = get().memberTeamMap[employeeId];
      if (!teamId) return undefined;
      return get().teams.find((t) => t.id === teamId);
    },

    getTeamByCode: (teamCode) => {
      return get().teams.find((t) => t.teamCode === teamCode.toUpperCase());
    },

    removeMember: (teamId, memberId) => {
      const team = get().teams.find((t) => t.id === teamId);
      if (!team) return false;

      const updatedTeams = get().teams.map((t) =>
        t.id === teamId ? { ...t, members: t.members.filter((m) => m.id !== memberId) } : t
      );
      const updatedMap = { ...get().memberTeamMap };
      delete updatedMap[memberId];

      set({ teams: updatedTeams, memberTeamMap: updatedMap });
      saveToStorage(updatedTeams, updatedMap);
      return true;
    },
  };
});
