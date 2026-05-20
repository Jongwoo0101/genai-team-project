import { create } from 'zustand';
import * as api from '../lib/api';
import { useAuthStore } from './authStore';
import {
  clearTeamStorage as clearStoredTeams,
  loadTeamStorage,
  MEMBER_MAP_STORAGE_KEY,
  saveTeamStorage,
  TEAM_STORAGE_KEY
} from './teamStorage';

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
  createTeam: (name: string, description: string, managerId: number, managerName: string, teamCode?: string) => Team;
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

  // 서버 데이터 동기화 액션
  fetchMyTeam: () => Promise<void>;
  fetchTeamMembers: (managerId: number) => Promise<void>;
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

export function clearTeamStorage() {
  clearStoredTeams();
  useTeamStore.setState({ teams: [], memberTeamMap: {} });
}

export const useTeamStore = create<TeamState>((set, get) => {
  const initial = loadTeamStorage();

  return {
    teams: initial.teams,
    memberTeamMap: initial.memberTeamMap,

    createTeam: (name, description, managerId, managerName, providedTeamCode) => {
      // 이제 백엔드에서는 초대 코드가 발급되면 자동으로 매니저와 연결되므로, 
      // 로컬 스토리지에는 팀 이름/설명 등 UI 표시용 정보만 저장합니다.
      const teamCode = providedTeamCode || generateTeamCode();

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
      saveTeamStorage(updated, get().memberTeamMap);
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
      saveTeamStorage(updated, newMap);
      return true;
    },

    getTeamsByManager: (managerId) => {
      return get().teams.filter((t) => t.managerId === managerId);
    },

    getTeamById: (teamId) => {
      return get().teams.find((t) => t.id === teamId);
    },

    joinTeam: (teamCode, employeeId, employeeName) => {
      // 1. 최신 상태 강제 동기화 (다른 창에서 방금 생성된 팀을 인식하기 위함)
      const latest = loadTeamStorage();
      set({ teams: latest.teams, memberTeamMap: latest.memberTeamMap });

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
        return { success: false, error: '로컬에 없는 팀 코드입니다. 서버 동기화 후 다시 확인해주세요.' };
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
      saveTeamStorage(updatedTeams, updatedMap);

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
      saveTeamStorage(updatedTeams, updatedMap);
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
      saveTeamStorage(updatedTeams, updatedMap);
      return true;
    },

    fetchMyTeam: async () => {
      try {
        const res = await api.getMyTeam();
        if (res && res.managerId) {
          const existingTeam = get().teams.find(t => t.managerId === res.managerId);
          const teamId = existingTeam?.id || `team-${res.managerId}`;
          const fallbackTeam: Team = existingTeam || {
            id: teamId,
            name: `${res.managerUsername}님의 팀`,
            description: '서버에서 불러온 팀입니다.',
            teamCode: '',
            managerId: res.managerId,
            managerName: res.managerUsername,
            members: [],
            createdAt: new Date().toISOString()
          };
          
          const updatedTeams = [...get().teams.filter(t => t.id !== teamId), fallbackTeam];
          // 현재 유저(직원)의 ID를 가져와서 맵 업데이트
          const { user } = useAuthStore.getState();
          const updatedMap = { ...get().memberTeamMap };
          if (user?.id) {
            updatedMap[user.id] = teamId;
          }
          
          set({ teams: updatedTeams, memberTeamMap: updatedMap });
          saveTeamStorage(updatedTeams, updatedMap);
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'NOT_JOINED') {
          console.log('아직 소속된 팀이 없습니다.');
        }
      }
    },

    fetchTeamMembers: async (managerId) => {
      try {
        const members = await api.getTeamMembers(managerId);

        const teamMembers: TeamMember[] = members.map(m => ({
          id: m.id,
          username: m.username,
          joinedAt: new Date().toISOString()
        }));

        const existingTeam = get().teams.find(t => t.managerId === managerId);

        if (existingTeam) {
          const updatedTeams = get().teams.map(t =>
            (t.managerId === managerId) ? { ...t, members: teamMembers } : t
          );
          set({ teams: updatedTeams });
          saveTeamStorage(updatedTeams, get().memberTeamMap);
        }
      } catch (err) {
        console.error('멤버 목록 동기화 실패:', err);
      }
    }
  };
});

// 다른 탭에서 로컬 스토리지가 변경될 때 자동으로 현재 탭의 상태를 동기화합니다.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === TEAM_STORAGE_KEY || e.key === MEMBER_MAP_STORAGE_KEY) {
      const latest = loadTeamStorage();
      useTeamStore.setState({ teams: latest.teams, memberTeamMap: latest.memberTeamMap });
    }
  });
}
