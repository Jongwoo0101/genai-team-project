// ========================
// 백엔드 Entity 기반 타입 정의
// worksight-api 구조 참고
// ========================

/** 사용자 역할 (backend: Role.java) */
export type Role = 'EMPLOYEE' | 'MANAGER';

/** 이벤트 타입 (backend: EventType.java) */
export type EventType = 'DROWSINESS' | 'ABSENCE' | 'PHONE_USE' | 'NORMAL';

/** 직원/관리자 정보 (backend: Member.java) */
export interface Member {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: Role;
  department: string;
  profileImage?: string;
  createdAt: string;
}

/** 근무 이벤트 (backend: WorkEvent.java) */
export interface WorkEvent {
  id: number;
  memberId: number;
  memberName: string;
  eventType: EventType;
  description: string;
  timestamp: string;
  resolved: boolean;
}

/** 로그인 요청 DTO (backend: MemberDto.java 참고) */
export interface LoginRequest {
  email: string;
  password: string;
}

/** 모니터링 상태 DTO (backend: MonitoringDto.java 참고) */
export interface MonitoringStatus {
  memberId: number;
  memberName: string;
  currentStatus: EventType;
  lastChecked: string;
  isOnline: boolean;
  confidence: number; // AI 판별 신뢰도 (0~100)
}

/** 대시보드 통계 */
export interface DashboardStats {
  totalEmployees: number;
  onlineEmployees: number;
  totalAlerts: number;
  resolvedAlerts: number;
}
