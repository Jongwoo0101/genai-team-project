import type { WorkEvent, MonitoringStatus, DashboardStats, EventType } from './types';

// ========================
// Mock 데이터 (백엔드 API 완성 전 사용)
// 추후 lib/api.ts 에서 실제 fetch로 교체
// ========================

export const mockWorkEvents: WorkEvent[] = [
  {
    id: 1,
    memberId: 2,
    memberName: '이서연',
    eventType: 'SLEEP',
    description: '졸음 상태 감지 - 눈 깜빡임 빈도 저하',
    timestamp: '2026-04-29T14:23:00',
    resolved: false,
  },
  {
    id: 2,
    memberId: 3,
    memberName: '박준혁',
    eventType: 'SMARTPHONE',
    description: '스마트폰 사용 감지 - 작업 중 스마트폰 조작',
    timestamp: '2026-04-29T13:45:00',
    resolved: true,
  },
  {
    id: 3,
    memberId: 4,
    memberName: '최유진',
    eventType: 'AWAY',
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
    eventType: 'SLEEP',
    description: '졸음 상태 감지 - 머리 기울기 변화 감지',
    timestamp: '2026-04-29T12:15:00',
    resolved: true,
  },
  {
    id: 6,
    memberId: 2,
    memberName: '이서연',
    eventType: 'AWAY',
    description: '자리 이탈 감지 - 5분간 카메라 미감지',
    timestamp: '2026-04-29T11:30:00',
    resolved: true,
  },
  {
    id: 7,
    memberId: 3,
    memberName: '박준혁',
    eventType: 'DISTRACTED',
    description: '딴짓 감지 - 화면 주시 이탈',
    timestamp: '2026-04-29T10:45:00',
    resolved: false,
  },
];

export const mockMonitoringStatuses: MonitoringStatus[] = [
  {
    memberId: 2,
    memberName: '이서연',
    currentStatus: 'SLEEP',
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
    currentStatus: 'AWAY',
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
  totalAlerts: 7,
  resolvedAlerts: 4,
  activeAlerts: 3,
};

/** 이벤트 타입별 한글 라벨 (backend EventType에 맞춤) */
export const eventTypeLabels: Record<string, string> = {
  SLEEP: '졸음',
  SMARTPHONE: '스마트폰',
  AWAY: '자리 이탈',
  DISTRACTED: '딴짓',
  NORMAL: '정상',
};

/** 이벤트 타입별 색상 클래스 */
export const eventTypeColors: Record<string, { bg: string; text: string; dot: string }> = {
  SLEEP: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  SMARTPHONE: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400' },
  AWAY: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  DISTRACTED: { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400' },
  NORMAL: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
};

/** 웹소켓 시뮬레이션을 위한 랜덤 이벤트 풀 */
export const SIMULATED_EVENTS: { memberId: number; memberName: string; eventType: EventType; description: string; resolved: boolean; }[] = [
  { memberId: 2, memberName: '이서연', eventType: 'SLEEP', description: '졸음 상태 감지 - 눈 깜빡임 빈도 저하', resolved: false },
  { memberId: 3, memberName: '박준혁', eventType: 'SMARTPHONE', description: '스마트폰 사용 감지 - 작업 중 스마트폰 조작', resolved: false },
  { memberId: 4, memberName: '최유진', eventType: 'AWAY', description: '자리 이탈 감지 - 10분 이상 자리 비움', resolved: false },
  { memberId: 5, memberName: '정다은', eventType: 'NORMAL', description: '정상 근무 상태', resolved: true },
  { memberId: 6, memberName: '한승우', eventType: 'DISTRACTED', description: '딴짓 감지 - 화면 주시 이탈', resolved: false },
];
