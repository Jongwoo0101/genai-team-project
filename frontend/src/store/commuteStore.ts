import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CommuteLog {
  id: string;
  employeeId: number;
  employeeName: string;
  type: 'IN' | 'OUT';
  timestamp: string;
  dateStr: string;
}

interface CommuteState {
  commuteStatus: 'NONE' | 'WORK' | 'LEAVE';
  checkInTime: string | null;
  checkOutTime: string | null;
  logs: CommuteLog[];
  checkIn: (employeeId: number, employeeName: string) => void;
  checkOut: (employeeId: number, employeeName: string) => void;
  resetTodayStatus: () => void;
}

export const useCommuteStore = create<CommuteState>()(
  persist(
    (set) => ({
      commuteStatus: 'NONE',
      checkInTime: null,
      checkOutTime: null,
      logs: [],
      checkIn: (employeeId, employeeName) => {
        const now = new Date();
        const timestamp = now.toLocaleString('ko-KR');
        const dateStr = now.toISOString().split('T')[0];
        const newLog: CommuteLog = {
          id: `${employeeId}-${Date.now()}-IN`,
          employeeId,
          employeeName,
          type: 'IN',
          timestamp,
          dateStr,
        };
        set((state) => ({
          commuteStatus: 'WORK',
          checkInTime: timestamp,
          checkOutTime: null,
          logs: [newLog, ...state.logs],
        }));
      },
      checkOut: (employeeId, employeeName) => {
        const now = new Date();
        const timestamp = now.toLocaleString('ko-KR');
        const dateStr = now.toISOString().split('T')[0];
        const newLog: CommuteLog = {
          id: `${employeeId}-${Date.now()}-OUT`,
          employeeId,
          employeeName,
          type: 'OUT',
          timestamp,
          dateStr,
        };
        set((state) => ({
          commuteStatus: 'LEAVE',
          checkOutTime: timestamp,
          logs: [newLog, ...state.logs],
        }));
      },
      resetTodayStatus: () => {
        set({
          commuteStatus: 'NONE',
          checkInTime: null,
          checkOutTime: null,
        });
      },
    }),
    {
      name: 'worksight-commute-storage',
    }
  )
);
