import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../../../lib/constants';

export interface Standup {
  id: string;
  employeeId: number;
  employeeName: string;
  dateStr: string;
  todayGoal: string;
  todayResult: string;
  timestamp: string;
}

interface StandupState {
  standups: Standup[];
  addStandup: (employeeId: number, employeeName: string, todayGoal: string, todayResult: string) => void;
  getStandupsByDate: (dateStr: string) => Standup[];
  getStandupsByEmployee: (employeeId: number) => Standup[];
  clearAll: () => void;
}

export const useStandupStore = create<StandupState>()(
  persist(
    (set, get) => ({
      standups: [],
      addStandup: (employeeId, employeeName, todayGoal, todayResult) => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timestamp = now.toLocaleString('ko-KR');
        const id = `${employeeId}-${Date.now()}-STANDUP`;

        const newStandup: Standup = {
          id,
          employeeId,
          employeeName,
          dateStr,
          todayGoal,
          todayResult,
          timestamp,
        };

        // 동일한 날짜에 동일 직원이 이미 올린 스탠드업이 있다면 덮어쓰기하거나, 누적합니다. 여기서는 덮어쓰는 구조로 개선합니다.
        set((state) => {
          const filtered = state.standups.filter(
            (s) => !(s.employeeId === employeeId && s.dateStr === dateStr)
          );
          return {
            standups: [newStandup, ...filtered],
          };
        });
      },
      getStandupsByDate: (dateStr) => {
        return get().standups.filter((s) => s.dateStr === dateStr);
      },
      getStandupsByEmployee: (employeeId) => {
        return get().standups.filter((s) => s.employeeId === employeeId);
      },
      clearAll: () => {
        set({ standups: [] });
      },
    }),
    {
      name: STORAGE_KEYS.STANDUP_STATE,
    }
  )
);

// 다른 브라우저 탭에서 변경 시 자동으로 연동되도록 이벤트 수신
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.STANDUP_STATE) {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.STANDUP_STATE);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.state) {
            useStandupStore.setState(parsed.state);
          }
        }
      } catch (err) {
        console.error('standupStore storage 동기화 실패:', err);
      }
    }
  });
}
