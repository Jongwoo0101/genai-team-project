import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS } from '../../../lib/constants';
import * as api from '../../../lib/api';
import { formatDateTimeKo, toEpochMs, toIsoString } from '../../../lib/datetime';
import type { WsEnvelope } from '../../../lib/wsEvent';
import { userScopedStorage, getScopedKey } from '../../../lib/userScopedStorage';

export interface Standup {
  id: string;
  employeeId: number;
  employeeName: string;
  dateStr: string;
  todayGoal: string;
  todayResult: string;
  timestampIso: string;
  timestampDisplay: string;
  epochMs: number;
}

interface StandupState {
  ownerMemberId: number | null;
  currentTeamId: number | null;
  standups: Standup[];
  syncMemberContext: (memberId: number) => void;
  addStandup: (employeeId: number, employeeName: string, todayGoal: string, todayResult: string) => Promise<void>;
  getStandupsByDate: (dateStr: string) => Standup[];
  getStandupsByEmployee: (employeeId: number) => Standup[];
  loadTeamStandups: (dateStr?: string, teamId?: number) => Promise<void>;
  loadMyTodayStandup: () => Promise<void>;
  clearAll: () => void;
  handleWebsocketEvent: (envelope: WsEnvelope, teamId?: number) => Promise<void>;
}

const createMemberScopedStandupState = (
  memberId: number
): Pick<StandupState, 'ownerMemberId' | 'currentTeamId' | 'standups'> => ({
  ownerMemberId: memberId,
  currentTeamId: null,
  standups: [],
});

export const useStandupStore = create<StandupState>()(
  persist(
    (set, get) => ({
      ownerMemberId: null,
      currentTeamId: null,
      standups: [],
      syncMemberContext: (memberId) => {
        if (get().ownerMemberId === memberId) return;
        set(createMemberScopedStandupState(memberId));
      },
      addStandup: async (_employeeId, _employeeName, todayGoal, todayResult) => {
        try {
          // 목표 등록
          await api.createStandupGoal(todayGoal);
          // 결과가 비어있지 않다면 결과도 등록
          if (todayResult) {
            await api.createStandupResult(todayResult);
          }
          // 등록 완료 후 다시 내 스탠드업 불러오기
          await get().loadMyTodayStandup();
        } catch (err) {
          console.error('스탠드업 등록 실패:', err);
          throw err;
        }
      },
      getStandupsByDate: (dateStr) => {
        return get().standups.filter((s) => s.dateStr === dateStr);
      },
      getStandupsByEmployee: (employeeId) => {
        return get().standups.filter((s) => s.employeeId === employeeId);
      },
      loadTeamStandups: async (dateStr, teamId) => {
        try {
          const resolvedTeamId = teamId ?? get().currentTeamId ?? undefined;
          const res = await api.getTeamStandups(dateStr, resolvedTeamId);
          const mapped: Standup[] = res.standups.map((s) => ({
            id: String(s.standupId),
            employeeId: s.memberId,
            employeeName: s.username,
            dateStr: s.standupDate,
            todayGoal: s.goal,
            todayResult: s.result || '',
            timestampIso: toIsoString(s.createdAt),
            timestampDisplay: formatDateTimeKo(toIsoString(s.createdAt)),
            epochMs: toEpochMs(toIsoString(s.createdAt)),
          }));
          set({
            standups: mapped,
            currentTeamId: resolvedTeamId ?? null,
          });
        } catch (err) {
          console.error('팀 스탠드업 로드 실패:', err);
        }
      },
      loadMyTodayStandup: async () => {
        try {
          const s = await api.getMyTodayStandup();
          const mapped: Standup = {
            id: String(s.standupId),
            employeeId: s.memberId,
            employeeName: s.username,
            dateStr: s.standupDate,
            todayGoal: s.goal,
            todayResult: s.result || '',
            timestampIso: toIsoString(s.createdAt),
            timestampDisplay: formatDateTimeKo(toIsoString(s.createdAt)),
            epochMs: toEpochMs(toIsoString(s.createdAt)),
          };
          set((state) => {
            const filtered = state.standups.filter(
              (item) => !(item.employeeId === mapped.employeeId && item.dateStr === mapped.dateStr)
            );
            return { standups: [mapped, ...filtered] };
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.message === 'NO_STANDUP') {
            return;
          }
          console.error('내 오늘 스탠드업 로드 실패:', err);
        }
      },
      clearAll: () => {
        set({ standups: [], currentTeamId: null });
      },
      handleWebsocketEvent: async (envelope, teamId) => {
        if (envelope.event === 'GOAL_UPDATED' || envelope.event === 'RESULT_UPDATED') {
          const todayStr = new Date().toISOString().split('T')[0];
          await get().loadTeamStandups(todayStr, teamId);
        }
      },
    }),
    {
      name: STORAGE_KEYS.STANDUP_STATE,
      storage: createJSONStorage(() => userScopedStorage),
    }
  )
);

// 다른 브라우저 탭에서 변경 시 자동으로 연동되도록 이벤트 수신
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    const currentOwnerId = useStandupStore.getState().ownerMemberId;
    const scopedKey = getScopedKey(STORAGE_KEYS.STANDUP_STATE, currentOwnerId);

    if (e.key === scopedKey) {
      try {
        const data = localStorage.getItem(scopedKey);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.state) {
            if (currentOwnerId !== null && parsed.state.ownerMemberId === currentOwnerId) {
              useStandupStore.setState(parsed.state);
            }
          }
        }
      } catch (err) {
        console.error('standupStore storage 동기화 실패:', err);
      }
    }
  });
}
