import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AwayReason = '화장실' | '수분 섭취' | '단순 휴식' | '기타';

export interface AwayLog {
  id: string;
  employeeId: number;
  employeeName: string;
  reason: AwayReason;
  startTime: string;
  startTimeMs: number;
  endTime: string | null;
  durationMinutes: number | null;
  dateStr: string;
}

interface AwayState {
  isAway: boolean;
  currentReason: AwayReason | null;
  awayStartTime: string | null;
  awayStartTimeMs: number | null;
  logs: AwayLog[];
  startAway: (employeeId: number, employeeName: string, reason: AwayReason) => void;
  stopAway: () => void;
}

export const useAwayStore = create<AwayState>()(
  persist(
    (set) => ({
      isAway: false,
      currentReason: null,
      awayStartTime: null,
      awayStartTimeMs: null,
      logs: [],
      startAway: (employeeId, employeeName, reason) => {
        const now = new Date();
        const startTimeStr = now.toLocaleString('ko-KR');
        const dateStr = now.toISOString().split('T')[0];
        const newLog: AwayLog = {
          id: `${employeeId}-${Date.now()}-AWAY`,
          employeeId,
          employeeName,
          reason,
          startTime: startTimeStr,
          startTimeMs: now.getTime(),
          endTime: null,
          durationMinutes: null,
          dateStr,
        };
        set((state) => ({
          isAway: true,
          currentReason: reason,
          awayStartTime: startTimeStr,
          awayStartTimeMs: now.getTime(),
          logs: [newLog, ...state.logs],
        }));
      },
      stopAway: () => {
        const now = new Date();
        const endTimeStr = now.toLocaleString('ko-KR');
        set((state) => {
          if (!state.isAway || !state.awayStartTimeMs) return state;

          const updatedLogs = state.logs.map((log, index) => {
            if (index === 0 && log.endTime === null) {
              const diffMs = now.getTime() - state.awayStartTimeMs!;
              // 1분 미만은 최소 1분으로 설정
              const diffMins = Math.max(1, Math.round(diffMs / 60000));
              return {
                ...log,
                endTime: endTimeStr,
                durationMinutes: diffMins,
              };
            }
            return log;
          });

          return {
            isAway: false,
            currentReason: null,
            awayStartTime: null,
            awayStartTimeMs: null,
            logs: updatedLogs,
          };
        });
      },
    }),
    {
      name: 'worksight-away-storage',
    }
  )
);
