import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../../../lib/constants';
import * as api from '../../../lib/api';
import type { StatusType } from '../../../lib/types';

export interface CommuteLog {
  id: string;
  employeeId: number;
  employeeName: string;
  type: 'IN' | 'OUT' | 'STATE';
  statusDetail?: string; // '집중 근무', '회의 중', '휴식 중' 등
  timestamp: string;
  dateStr: string;
}

export type UserStateType = '집중 근무' | '회의 중' | '휴식 중' | '근무 중' | '오프라인';

export const mapKoStateToEnStatus = (koState: UserStateType): StatusType => {
  switch (koState) {
    case '집중 근무': return 'FOCUS';
    case '회의 중': return 'MEETING';
    case '휴식 중': return 'BREAK';
    case '근무 중': return 'WORKING';
    case '오프라인': return 'OFFLINE';
    default: return 'WORKING';
  }
};

export const mapEnStatusToKoState = (enStatus: StatusType): UserStateType => {
  switch (enStatus) {
    case 'FOCUS': return '집중 근무';
    case 'MEETING': return '회의 중';
    case 'BREAK': return '휴식 중';
    case 'WORKING': return '근무 중';
    case 'OFFLINE': return '오프라인';
    default: return '근무 중';
  }
};

export interface DirectPing {
  id: string;
  employeeId: number;
  fromName: string;
  message: string;
  timestamp: string;
  status: 'pending' | 'dismissed';
}

interface CommuteState {
  commuteStatus: 'NONE' | 'WORK' | 'LEAVE';
  userState: UserStateType;
  checkInTime: string | null;
  checkOutTime: string | null;
  logs: CommuteLog[];
  isCameraActive: boolean;
  cameraStream: MediaStream | null;
  directPings: DirectPing[];
  checkIn: (employeeId: number, employeeName: string) => Promise<void>;
  checkOut: (employeeId: number, employeeName: string) => Promise<void>;
  setUserState: (employeeId: number, employeeName: string, state: UserStateType) => Promise<void>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  resetTodayStatus: () => void;
  sendDirectPing: (employeeId: number, fromName: string, message: string) => void;
  dismissDirectPing: (pingId: string) => void;
}

export const useCommuteStore = create<CommuteState>()(
  persist(
    (set) => ({
      commuteStatus: 'NONE',
      userState: '오프라인',
      checkInTime: null,
      checkOutTime: null,
      logs: [],
      isCameraActive: false,
      cameraStream: null,
      directPings: [],
      checkIn: async (employeeId, employeeName) => {
        try {
          const res = await api.clockIn();
          const now = new Date();
          const timestamp = now.toLocaleString('ko-KR');
          const dateStr = now.toISOString().split('T')[0];
          const newLog: CommuteLog = {
            id: `${employeeId}-${Date.now()}-IN`,
            employeeId,
            employeeName,
            type: 'IN',
            timestamp: res.clockInTime ? new Date(res.clockInTime).toLocaleString('ko-KR') : timestamp,
            dateStr,
          };
          set((state) => ({
            commuteStatus: 'WORK',
            userState: '근무 중',
            checkInTime: newLog.timestamp,
            checkOutTime: null,
            logs: [newLog, ...state.logs],
          }));
        } catch (err) {
          console.error('출근 API 호출 실패:', err);
          throw err;
        }
      },
      checkOut: async (employeeId, employeeName) => {
        try {
          const res = await api.clockOut();
          const now = new Date();
          const timestamp = now.toLocaleString('ko-KR');
          const dateStr = now.toISOString().split('T')[0];
          const newLog: CommuteLog = {
            id: `${employeeId}-${Date.now()}-OUT`,
            employeeId,
            employeeName,
            type: 'OUT',
            timestamp: res.clockOutTime ? new Date(res.clockOutTime).toLocaleString('ko-KR') : timestamp,
            dateStr,
          };
          set((state) => ({
            commuteStatus: 'LEAVE',
            userState: '오프라인',
            checkOutTime: newLog.timestamp,
            logs: [newLog, ...state.logs],
          }));
        } catch (err) {
          console.error('퇴근 API 호출 실패:', err);
          throw err;
        }
      },
      setUserState: async (employeeId, employeeName, status) => {
        try {
          const statusType = mapKoStateToEnStatus(status);
          if (statusType === 'FOCUS') {
            await api.updateManualStatus('FOCUS');
          } else {
            await api.updateAiStatus(statusType);
          }

          const now = new Date();
          const timestamp = now.toLocaleString('ko-KR');
          const dateStr = now.toISOString().split('T')[0];
          const newLog: CommuteLog = {
            id: `${employeeId}-${Date.now()}-STATE-${status}`,
            employeeId,
            employeeName,
            type: 'STATE',
            statusDetail: status,
            timestamp,
            dateStr,
          };
          set((state) => ({
            userState: status,
            logs: [newLog, ...state.logs],
          }));
        } catch (err) {
          console.error('상태 업데이트 API 호출 실패:', err);
          throw err;
        }
      },
      // 카메라 제어 액션
      startCamera: async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          set({ isCameraActive: true, cameraStream: stream });
        } catch (err) {
          console.error('카메라 접근 실패:', err);
        }
      },
      stopCamera: () => {
        set((state) => {
          // 기존 스트림 해제
          state.cameraStream?.getTracks().forEach((track) => track.stop());
          return { isCameraActive: false, cameraStream: null };
        });
      },
      resetTodayStatus: () => {
        set({
          commuteStatus: 'NONE',
          userState: '오프라인',
          checkInTime: null,
          checkOutTime: null,
          isCameraActive: false,
          cameraStream: null,
        });
      },
      sendDirectPing: (employeeId, fromName, message) => {
        const newPing: DirectPing = {
          id: `ping-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          employeeId,
          fromName,
          message,
          timestamp: new Date().toLocaleString('ko-KR'),
          status: 'pending',
        };
        set((state) => ({
          directPings: [newPing, ...state.directPings],
        }));
      },
      dismissDirectPing: (pingId) => {
        set((state) => ({
          directPings: state.directPings.map((p) =>
            p.id === pingId ? { ...p, status: 'dismissed' as const } : p
          ),
        }));
      },
    }),
    {
      name: STORAGE_KEYS.COMMUTE_STATE,
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { cameraStream, isCameraActive, ...rest } = state;
        return rest;
      },
    }
  )
);

// 다른 브라우저 탭에서 변경 시 자동으로 연동되도록 이벤트 수신
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.COMMUTE_STATE) {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.COMMUTE_STATE);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.state) {
            useCommuteStore.setState(parsed.state);
          }
        }
      } catch (err) {
        console.error('commuteStore storage 동기화 실패:', err);
      }
    }
  });
}
