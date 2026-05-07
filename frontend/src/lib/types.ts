// ========================
// 백엔드 Entity 기반 타입 정의
// backend/ 구조 참고 (Spring Boot)
// ========================

/** 사용자 역할 (backend: Role.java) */
export type Role = 'EMPLOYEE' | 'MANAGER';

/** 이벤트 타입 (backend: EventType.java) */
export type EventType = 'SLEEP' | 'SMARTPHONE' | 'AWAY' | 'DISTRACTED' | 'NORMAL';

/** ──────────── 인증 관련 DTO ──────────── */

/** 회원가입 요청 (backend: MemberDto.SignUpRequest) */
export interface SignUpRequest {
  username: string;
  password: string;
  role: Role;
}

/** 로그인 요청 (backend: MemberDto.LoginRequest) */
export interface LoginRequest {
  username: string;
  password: string;
}

/** 토큰 재발급 요청 (backend: MemberDto.ReissueRequest) */
export interface ReissueRequest {
  refreshToken: string;
}

/** 초대 코드로 직원 추가 요청 (관리자 → 서버) */
export interface AddEmployeeByCodeRequest {
  inviteCode: string;
}

/** 초대 코드 생성 응답 (직원 → 서버) */
export interface GenerateInviteCodeResponse {
  inviteCode: string;
}

/** 로그인 응답 (backend: MemberDto.LoginResponse) */
export interface LoginResponse {
  token: string;
  id: number;
  username: string;
  role: Role;
  virtualBalance: number;
}

/** 회원가입 응답 (backend: MemberDto.MemberResponse) */
export interface MemberResponse {
  id: number;
  username: string;
  role: Role;
  balance: number; // virtualBalance (가상 머니)
}

/** ──────────── 모니터링 관련 DTO ──────────── */

/** AI 모듈 → 서버 이벤트 리포트 (backend: MonitoringDto.EventReportRequest) */
export interface EventReportRequest {
  employeeId: number;
  eventType: EventType;
}

/** 웹소켓 알림 (backend: MonitoringDto.DashboardAlertResponse) */
export interface DashboardAlertResponse {
  eventId: number;
  employeeId: number;
  employeeName: string;
  eventType: EventType;
  eventTime: string;
}

/** ──────────── 프론트엔드 내부 타입 ──────────── */

/** 프론트엔드에서 사용하는 인증된 사용자 (MemberResponse 기반) */
export interface AuthUser {
  id: number;
  username: string;
  role: Role;
  balance: number;
}

/** 근무 이벤트 (프론트엔드 내부 - 대시보드 표시용, mock 포함) */
export interface WorkEvent {
  id: number;
  memberId: number;
  memberName: string;
  eventType: EventType;
  description: string;
  timestamp: string;
  resolved: boolean;
}

/** 모니터링 상태 (프론트엔드 내부 - mock 기반, 추후 WebSocket 연동) */
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
  activeAlerts: number;
}
