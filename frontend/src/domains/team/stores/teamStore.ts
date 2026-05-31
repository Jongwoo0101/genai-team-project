import { create } from 'zustand';
import * as api from '../../../lib/api';
import { useAuthStore } from '../../auth/stores/authStore';
import {
  clearTeamStorage as clearStoredTeams,
  isTeamStorageEventKey,
  loadTeamStorage,
  saveTeamStorage,
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
  ownerMemberId: number | null;
  teams: Team[];
  memberTeamMap: Record<number, string>;

  syncMemberContext: (memberId: number) => void;

  // 관리자 액션
  // [변경] createTeam은 더 이상 직접 호출하지 않음 — createTeamFromServer로 대체
  // 하지만 기존 코드 호환을 위해 내부 상태 업데이트용으로만 유지
  createTeam: (name: string, description: string, managerId: number, managerName: string, teamCode?: string, teamId?: string) => Team;

  // [신규] 서버 API 호출 + 로컬 상태 업데이트를 함께 처리
  createTeamFromServer: (name: string, description: string) => Promise<{ teamId: string; inviteCode: string }>;

  // [변경] deleteTeam → 서버 API 먼저 호출 후 로컬 상태 업데이트
  deleteTeam: (teamId: string, managerId: number) => Promise<boolean>;

  getTeamsByManager: (managerId: number) => Team[];
  getTeamById: (teamId: string) => Team | undefined;

  // 직원 액션
  joinTeam: (teamCode: string, employeeId: number, employeeName: string) => { success: boolean; error?: string; teamName?: string };
  leaveTeam: (employeeId: number) => void;
  getEmployeeTeam: (employeeId: number) => Team | undefined;

  getTeamByCode: (teamCode: string) => Team | undefined;
  removeMember: (teamId: string, memberId: number) => boolean;

  // 서버 데이터 동기화
  fetchMyTeam: () => Promise<void>;
  fetchTeamMembers: (teamId: number) => Promise<void>;

  // [신규] 관리자 팀 목록을 서버에서 가져와서 로컬 상태 덮어쓰기
  fetchMyTeams: () => Promise<void>;
}

export function clearTeamStorage() {
  clearStoredTeams();
  useTeamStore.setState({ ownerMemberId: null, teams: [], memberTeamMap: {} });
}

export const useTeamStore = create<TeamState>((set, get) => {
  const initial = loadTeamStorage();

  return {
    ownerMemberId: initial.ownerMemberId,
    teams: initial.teams,
    memberTeamMap: initial.memberTeamMap,

    syncMemberContext: (memberId) => {
      if (get().ownerMemberId === memberId) return;
      const latest = loadTeamStorage(memberId);
      set({ ownerMemberId: memberId, teams: latest.teams, memberTeamMap: latest.memberTeamMap });
      saveTeamStorage(latest.teams, latest.memberTeamMap, memberId);
    },

    // ── 기존 호환용 (내부 상태 업데이트만) ──────────────────────
    createTeam: (name, description, managerId, managerName, providedTeamCode, teamId) => {
      const teamCode = providedTeamCode || `WS-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const newTeam: Team = {
        id: teamId || crypto.randomUUID(),
        name,
        description,
        teamCode,
        managerId,
        managerName,
        members: [],
        createdAt: new Date().toISOString(),
      };
      const updated = [...get().teams, newTeam];
      const ownerMemberId = get().ownerMemberId ?? managerId;
      set({ ownerMemberId, teams: updated });
      saveTeamStorage(updated, get().memberTeamMap, ownerMemberId);
      return newTeam;
    },

    // ── [신규] 서버 API 호출 → 로컬 상태 업데이트 ───────────────
    createTeamFromServer: async (name, description) => {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 서버 API 호출 (POST /api/teams)
      const res = await api.createTeamAndInviteCode({ teamName: name, description });

      if (!res?.inviteCode || !res?.teamId) {
        throw new Error('서버에서 팀 정보를 받지 못했습니다.');
      }

      // 로컬 상태에도 반영
      const newTeam: Team = {
        id: String(res.teamId),
        name,
        description,
        teamCode: res.inviteCode,
        managerId: user.id,
        managerName: user.username,
        members: [],
        createdAt: new Date().toISOString(),
      };

      const updated = [...get().teams, newTeam];
      const ownerMemberId = get().ownerMemberId ?? user.id;
      set({ ownerMemberId, teams: updated });
      saveTeamStorage(updated, get().memberTeamMap, ownerMemberId);

      return { teamId: String(res.teamId), inviteCode: res.inviteCode };
    },

    // ── [변경] deleteTeam — 서버 API 먼저 호출 ──────────────────
    deleteTeam: async (teamId, managerId) => {
      const team = get().teams.find((t) => t.id === teamId);
      if (!team || team.managerId !== managerId) return false;

      // [핵심 변경] 서버 API 먼저 호출 → 실패 시 로컬 상태 건드리지 않음
      await api.deleteTeam(Number(teamId));

      // 서버 삭제 성공 후 로컬 상태 업데이트
      const newMap = { ...get().memberTeamMap };
      team.members.forEach((m) => { delete newMap[m.id]; });

      const updated = get().teams.filter((t) => t.id !== teamId);
      const ownerMemberId = get().ownerMemberId ?? managerId;
      set({ ownerMemberId, teams: updated, memberTeamMap: newMap });
      saveTeamStorage(updated, newMap, ownerMemberId);
      return true;
    },

    getTeamsByManager: (managerId) => get().teams.filter((t) => t.managerId === managerId),

    getTeamById: (teamId) => get().teams.find((t) => t.id === teamId),

    joinTeam: (teamCode, employeeId, employeeName) => {
      const latest = loadTeamStorage(employeeId);
      set({ ownerMemberId: employeeId, teams: latest.teams, memberTeamMap: latest.memberTeamMap });

      const existingTeamId = get().memberTeamMap[employeeId];
      if (existingTeamId) {
        const existingTeam = get().teams.find((t) => t.id === existingTeamId);
        return { success: false, error: `이미 "${existingTeam?.name || '알 수 없는 팀'}"에 소속되어 있습니다.` };
      }

      const team = get().teams.find((t) => t.teamCode === teamCode.toUpperCase());
      if (!team) {
        return { success: false, error: '로컬에 없는 팀 코드입니다. 서버 동기화 후 다시 확인해주세요.' };
      }

      if (team.members.some((m) => m.id === employeeId)) {
        return { success: false, error: '이미 이 팀에 소속되어 있습니다.' };
      }

      const newMember: TeamMember = { id: employeeId, username: employeeName, joinedAt: new Date().toISOString() };
      const updatedTeams = get().teams.map((t) =>
        t.id === team.id ? { ...t, members: [...t.members, newMember] } : t
      );
      const updatedMap = { ...get().memberTeamMap, [employeeId]: team.id };
      const ownerMemberId = get().ownerMemberId ?? employeeId;
      set({ ownerMemberId, teams: updatedTeams, memberTeamMap: updatedMap });
      saveTeamStorage(updatedTeams, updatedMap, ownerMemberId);
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
      const ownerMemberId = get().ownerMemberId ?? employeeId;
      set({ ownerMemberId, teams: updatedTeams, memberTeamMap: updatedMap });
      saveTeamStorage(updatedTeams, updatedMap, ownerMemberId);
    },

    getEmployeeTeam: (employeeId) => {
      const teamId = get().memberTeamMap[employeeId];
      if (!teamId) return undefined;
      return get().teams.find((t) => t.id === teamId);
    },

    getTeamByCode: (teamCode) => get().teams.find((t) => t.teamCode === teamCode.toUpperCase()),

    removeMember: (teamId, memberId) => {
      const team = get().teams.find((t) => t.id === teamId);
      if (!team) return false;
      const updatedTeams = get().teams.map((t) =>
        t.id === teamId ? { ...t, members: t.members.filter((m) => m.id !== memberId) } : t
      );
      const updatedMap = { ...get().memberTeamMap };
      delete updatedMap[memberId];
      const ownerMemberId = get().ownerMemberId;
      set({ teams: updatedTeams, memberTeamMap: updatedMap });
      saveTeamStorage(updatedTeams, updatedMap, ownerMemberId);
      return true;
    },

    // ── [신규] 관리자 팀 목록 서버에서 가져오기 ──────────────────
    fetchMyTeams: async () => {
      try {
        const serverTeams = await api.getMyTeams();
        const { user } = useAuthStore.getState();
        if (!user) return;

        // 서버 팀 목록을 기준으로 로컬 상태 덮어쓰기
        // 단, 멤버 정보는 로컬에 있는 것을 유지하고 없는 건 빈 배열로
        const mergedTeams: Team[] = serverTeams.map((serverTeam) => {
          const localTeam = get().teams.find((t) => t.id === String(serverTeam.teamId));
          return {
            id: String(serverTeam.teamId),
            name: serverTeam.teamName,
            description: localTeam?.description || '',
            teamCode: localTeam?.teamCode || '',
            managerId: serverTeam.managerId,
            managerName: serverTeam.managerUsername,
            members: localTeam?.members || [],
            createdAt: serverTeam.createdAt || new Date().toISOString(),
          };
        });

        const ownerMemberId = get().ownerMemberId ?? user.id;
        set({ teams: mergedTeams });
        saveTeamStorage(mergedTeams, get().memberTeamMap, ownerMemberId);

        // 각 팀의 멤버 목록도 서버에서 동기화
        await Promise.all(
          serverTeams.map((t) => get().fetchTeamMembers(t.teamId))
        );
      } catch (err) {
        console.error('팀 목록 동기화 실패:', err);
      }
    },

    fetchMyTeam: async () => {
      try {
        const res = await api.getMyTeam();
        if (res && res.managerId) {
          const teamId = String(res.teamId);
          const existingTeam = get().teams.find((t) => t.id === teamId);
          const fallbackTeam: Team = existingTeam || {
            id: teamId,
            name: res.teamName,
            description: '서버에서 불러온 팀입니다.',
            teamCode: '',
            managerId: res.managerId,
            managerName: res.managerUsername,
            members: [],
            createdAt: new Date().toISOString(),
          };
          const updatedTeams = [...get().teams.filter((t) => t.id !== teamId), fallbackTeam];
          const { user } = useAuthStore.getState();
          const updatedMap = { ...get().memberTeamMap };
          if (user?.id) updatedMap[user.id] = teamId;
          const ownerMemberId = user?.id ?? get().ownerMemberId;
          set({ ownerMemberId, teams: updatedTeams, memberTeamMap: updatedMap });
          saveTeamStorage(updatedTeams, updatedMap, ownerMemberId);
          await get().fetchTeamMembers(res.teamId);
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'NOT_JOINED') {
          const { user } = useAuthStore.getState();
          if (user?.id) {
            const updatedMap = { ...get().memberTeamMap };
            delete updatedMap[user.id];
            set({ memberTeamMap: updatedMap });
            saveTeamStorage(get().teams, updatedMap, get().ownerMemberId);
          }
        }
      }
    },

    fetchTeamMembers: async (teamId) => {
      try {
        const members = await api.getTeamMembers(teamId);
        const teamMembers: TeamMember[] = members.map((m) => ({
          id: m.id,
          username: m.username,
          joinedAt: new Date().toISOString(),
        }));
        const teamIdStr = String(teamId);
        const updatedTeams = get().teams.map((t) =>
          t.id === teamIdStr ? { ...t, members: teamMembers } : t
        );
        set({ teams: updatedTeams });
        saveTeamStorage(updatedTeams, get().memberTeamMap, get().ownerMemberId);
      } catch (err) {
        console.error('멤버 목록 동기화 실패:', err);
      }
    },
  };
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (isTeamStorageEventKey(e.key)) {
      const currentOwnerId = useTeamStore.getState().ownerMemberId;
      if (currentOwnerId === null) return;
      const latest = loadTeamStorage(currentOwnerId);
      useTeamStore.setState({ teams: latest.teams, memberTeamMap: latest.memberTeamMap });
    }
  });
}