import type { Member, WorkEvent, MonitoringStatus, DashboardStats } from './types';

// ========================
// Mock 데이터 (백엔드 API 완성 전 사용)
// 추후 lib/api.ts 에서 실제 fetch로 교체
// ========================

export const mockMembers: Member[] = [
  {
    id: 1,
    name: '김민수',
    email: 'minsu@worksight.com',
    role: 'MANAGER',
    department: '생산관리팀',
    createdAt: '2025-01-15T09:00:00',
  },
  {
    id: 2,
    name: '이서연',
    email: 'seoyeon@worksight.com',
    role: 'EMPLOYEE',
    department: '생산1팀',
    createdAt: '2025-02-01T09:00:00',
  },
  {
    id: 3,
    name: '박준혁',
    email: 'junhyuk@worksight.com',
    role: 'EMPLOYEE',
    department: '생산1팀',
    createdAt: '2025-02-10T09:00:00',
  },
  {
    id: 4,
    name: '최유진',
    email: 'yujin@worksight.com',
    role: 'EMPLOYEE',
    department: '생산2팀',
    createdAt: '2025-03-05T09:00:00',
  },
  {
    id: 5,
    name: '정다은',
    email: 'daeun@worksight.com',
    role: 'EMPLOYEE',
    department: '생산2팀',
    createdAt: '2025-03-20T09:00:00',
  },
  {
    id: 6,
    name: '한승우',
    email: 'seungwoo@worksight.com',
    role: 'EMPLOYEE',
    department: '물류팀',
    createdAt: '2025-04-01T09:00:00',
  },
];

export const mockWorkEvents: WorkEvent[] = [
  {
    id: 1,
    memberId: 2,
    memberName: '이서연',
    eventType: 'DROWSINESS',
    description: '졸음 상태 감지 - 눈 깜빡임 빈도 저하',
    timestamp: '2026-04-29T14:23:00',
    resolved: false,
  },
  {
    id: 2,
    memberId: 3,
    memberName: '박준혁',
    eventType: 'PHONE_USE',
    description: '휴대폰 사용 감지 - 작업 중 스마트폰 조작',
    timestamp: '2026-04-29T13:45:00',
    resolved: true,
  },
  {
    id: 3,
    memberId: 4,
    memberName: '최유진',
    eventType: 'ABSENCE',
    description: '자리 이탈 감지 - 10분 이상 자리 비움',
    timestamp: '2026-04-29T13:30:00',
    resolved: false,
  },
  {
    id: 4,
    memberId: 5,
    memberName: '정다은',
    eventType: 'NORMAL',
    description: '정상 근무 상태',
    timestamp: '2026-04-29T14:00:00',
    resolved: true,
  },
  {
    id: 5,
    memberId: 6,
    memberName: '한승우',
    eventType: 'DROWSINESS',
    description: '졸음 상태 감지 - 머리 기울기 변화 감지',
    timestamp: '2026-04-29T12:15:00',
    resolved: true,
  },
  {
    id: 6,
    memberId: 2,
    memberName: '이서연',
    eventType: 'ABSENCE',
    description: '자리 이탈 감지 - 5분간 카메라 미감지',
    timestamp: '2026-04-29T11:30:00',
    resolved: true,
  },
];

export const mockMonitoringStatuses: MonitoringStatus[] = [
  {
    memberId: 2,
    memberName: '이서연',
    currentStatus: 'DROWSINESS',
    lastChecked: '2026-04-29T14:23:00',
    isOnline: true,
    confidence: 87,
  },
  {
    memberId: 3,
    memberName: '박준혁',
    currentStatus: 'NORMAL',
    lastChecked: '2026-04-29T14:20:00',
    isOnline: true,
    confidence: 95,
  },
  {
    memberId: 4,
    memberName: '최유진',
    currentStatus: 'ABSENCE',
    lastChecked: '2026-04-29T13:30:00',
    isOnline: false,
    confidence: 99,
  },
  {
    memberId: 5,
    memberName: '정다은',
    currentStatus: 'NORMAL',
    lastChecked: '2026-04-29T14:25:00',
    isOnline: true,
    confidence: 92,
  },
  {
    memberId: 6,
    memberName: '한승우',
    currentStatus: 'NORMAL',
    lastChecked: '2026-04-29T14:22:00',
    isOnline: true,
    confidence: 88,
  },
];

export const mockDashboardStats: DashboardStats = {
  totalEmployees: 5,
  onlineEmployees: 4,
  totalAlerts: 6,
  resolvedAlerts: 4,
};

/** 이벤트 타입별 한글 라벨 */
export const eventTypeLabels: Record<string, string> = {
  DROWSINESS: '졸음',
  ABSENCE: '자리 이탈',
  PHONE_USE: '휴대폰 사용',
  NORMAL: '정상',
};

/** 이벤트 타입별 색상 클래스 */
export const eventTypeColors: Record<string, { bg: string; text: string; dot: string }> = {
  DROWSINESS: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  ABSENCE: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  PHONE_USE: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400' },
  NORMAL: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
};
