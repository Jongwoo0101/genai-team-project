import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../../../lib/constants';
import * as api from '../../../lib/api';
import type { NotificationResponse, StatusType } from '../../../lib/types';
import { formatDateTimeKo, toEpochMs, toIsoString } from '../../../lib/datetime';

export interface CommuteLog {
  id: string;
  employeeId: number;
  employeeName: string;
  type: 'IN' | 'OUT' | 'STATE';
  statusDetail?: string; // '집중 근무', '회의 중', '휴식 중' 등
  timestampIso: string;
  timestampDisplay: string;
  epochMs: number;
  dateStr: string;
}

export type UserStateType = '집중 근무' | '회의 중' | '자리비움' | '근무 중' | '오프라인';

export const mapKoStateToEnStatus = (koState: UserStateType): StatusType => {
  switch (koState) {
    case '집중 근무': return 'FOCUS';
    case '회의 중': return 'MEETING';
    case '자리비움': return 'AWAY';
    case '근무 중': return 'WORKING';
    case '오프라인': return 'OFFLINE';
    default: return 'WORKING';
  }
};

export const mapEnStatusToKoState = (enStatus: StatusType): UserStateType => {
  switch (enStatus) {
    case 'FOCUS': return '집중 근무';
    case 'MEETING': return '회의 중';
    case 'AWAY': return '자리비움';
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
  timestampIso: string;
  timestampDisplay: string;
  epochMs: number;
  status: 'pending' | 'dismissed';
}

interface CommuteState {
  ownerEmployeeId: number | null;
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
  sendDirectPing: (employeeId: number, fromName: string, message: string) => Promise<void>;
  dismissDirectPing: (pingId: string) => Promise<void>;
  loadDirectPings: () => Promise<void>;
  addDirectPingFromNotification: (notif: NotificationResponse) => void;
  syncEmployeeContext: (employeeId: number) => void;
}

export const createEmployeeScopedCommuteState = (
  prevState: Pick<CommuteState, 'ownerEmployeeId' | 'commuteStatus' | 'userState' | 'checkInTime' | 'checkOutTime' | 'logs' | 'isCameraActive' | 'cameraStream' | 'directPings'>,
  employeeId: number
) => {
  if (prevState.ownerEmployeeId === employeeId) {
    return prevState;
  }

  return {
    ...prevState,
    ownerEmployeeId: employeeId,
    commuteStatus: 'NONE' as const,
    userState: '오프라인' as const,
    checkInTime: null,
    checkOutTime: null,
    logs: [],
    isCameraActive: false,
    cameraStream: null,
    directPings: prevState.directPings.filter((ping) => ping.employeeId === employeeId),
  };
};

export const useCommuteStore = create<CommuteState>()(
  persist(
    (set, get) => ({
      ownerEmployeeId: null,
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
          const dateStr = now.toISOString().split('T')[0];
          const newLog: CommuteLog = {
            id: `${employeeId}-${Date.now()}-IN`,
            employeeId,
            employeeName,
            type: 'IN',
            timestampIso: toIsoString(res.clockInTime),
            timestampDisplay: formatDateTimeKo(toIsoString(res.clockInTime)),
            epochMs: toEpochMs(toIsoString(res.clockInTime)),
            dateStr,
          };
          set((state) => ({
            commuteStatus: 'WORK',
            userState: '근무 중',
            checkInTime: newLog.timestampIso,
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
          const dateStr = now.toISOString().split('T')[0];
          const newLog: CommuteLog = {
            id: `${employeeId}-${Date.now()}-OUT`,
            employeeId,
            employeeName,
            type: 'OUT',
            timestampIso: toIsoString(res.clockOutTime),
            timestampDisplay: formatDateTimeKo(toIsoString(res.clockOutTime)),
            epochMs: toEpochMs(toIsoString(res.clockOutTime)),
            dateStr,
          };
          set((state) => ({
            commuteStatus: 'LEAVE',
            userState: '오프라인',
            checkOutTime: newLog.timestampIso,
            logs: [newLog, ...state.logs],
          }));
        } catch (err: unknown) {
          console.error('퇴근 API 호출 실패:', err);
          if (err instanceof Error && err.message === '오늘 출근 기록이 없습니다.') {
            get().resetTodayStatus();
          }
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
          const dateStr = now.toISOString().split('T')[0];
          const newLog: CommuteLog = {
            id: `${employeeId}-${Date.now()}-STATE-${status}`,
            employeeId,
            employeeName,
            type: 'STATE',
            statusDetail: status,
            timestampIso: now.toISOString(),
            timestampDisplay: formatDateTimeKo(now.toISOString()),
            epochMs: now.getTime(),
            dateStr,
          };
          set((state) => ({
            userState: status,
            logs: [newLog, ...state.logs],
          }));
        } catch (err: unknown) {
          console.error('상태 변경 API 호출 실패:', err);
          if (err instanceof Error && err.message === '오늘 출근 기록이 없습니다.') {
            get().resetTodayStatus();
          }
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
      sendDirectPing: async (employeeId, _fromName, message) => {
        try {
          await api.sendNotification(employeeId, message, 'IMPORTANT');
        } catch (err) {
          console.error('알림 발송 실패:', err);
          throw err;
        }
      },
      dismissDirectPing: async (pingId) => {
        try {
          await api.readNotification(Number(pingId));
          set((state) => ({
            directPings: state.directPings.map((p) =>
              p.id === pingId ? { ...p, status: 'dismissed' as const } : p
            ),
          }));
        } catch (err) {
          console.error('알림 읽음 처리 실패:', err);
          throw err;
        }
      },
      loadDirectPings: async () => {
        try {
          const notifs = await api.getUnreadNotifications();
          const pings: DirectPing[] = notifs
            .filter((n) => n.notificationType === 'IMPORTANT')
            .map((n) => ({
              id: String(n.notificationId),
              employeeId: n.receiverId,
              fromName: n.senderUsername,
              message: n.message,
              timestampIso: toIsoString(n.createdAt),
              timestampDisplay: formatDateTimeKo(toIsoString(n.createdAt)),
              epochMs: toEpochMs(toIsoString(n.createdAt)),
              status: n.read ? ('dismissed' as const) : ('pending' as const),
            }));
          set({ directPings: pings });
        } catch (err) {
          console.error('알림 로드 실패:', err);
        }
      },
      addDirectPingFromNotification: (notif) => {
        if (notif.notificationType !== 'IMPORTANT') return;
        const ping: DirectPing = {
          id: String(notif.notificationId),
          employeeId: notif.receiverId,
          fromName: notif.senderUsername,
          message: notif.message,
          timestampIso: toIsoString(notif.createdAt),
          timestampDisplay: formatDateTimeKo(toIsoString(notif.createdAt)),
          epochMs: toEpochMs(toIsoString(notif.createdAt)),
          status: notif.read ? ('dismissed' as const) : ('pending' as const),
        };
        set((state) => ({
          directPings: [ping, ...state.directPings.filter((p) => p.id !== ping.id)],
        }));
      },
      syncEmployeeContext: (employeeId) => {
        set((state) => createEmployeeScopedCommuteState(state, employeeId));
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
            const currentOwnerId = useCommuteStore.getState().ownerEmployeeId;
            if (currentOwnerId !== null && parsed.state.ownerEmployeeId === currentOwnerId) {
              useCommuteStore.setState(parsed.state);
            }
          }
        }
      } catch (err) {
        console.error('commuteStore storage 동기화 실패:', err);
      }
    }
  });
}
