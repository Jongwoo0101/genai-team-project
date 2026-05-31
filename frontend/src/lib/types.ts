// ========================
// 백엔드 Entity 기반 타입 정의
// backend/ 구조 참고 (Spring Boot)
// ========================

/** 사용자 역할 (backend: Role.java) */
export type Role = 'EMPLOYEE' | 'MANAGER';

/** AI 모델 → 프론트 WebSocket 상태 (backend: StatusType 기반 AI 판별 상태) */
export type AiStatusType = 'WORKING' | 'MEETING' | 'AWAY' | 'FOCUS';

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

/** 팀 생성 및 초대 코드 생성 요청 (관리자 → 서버) */
export interface CreateTeamRequest {
  teamName: string;
  description?: string;
}

/**
 * 팀 생성 및 초대 코드 생성 응답 (서버 → 관리자)
 * backend: TeamDto.CreateTeamResponse
 * [변경] teamId: optional → required, teamName 추가
 */
export interface CreateTeamResponse {
  teamId: number;
  teamName: string;
  inviteCode: string;
}

/** 팀 참여 요청 (직원 → 서버) */
export interface JoinTeamRequest {
  inviteCode: string;
}

/** 팀 참여 응답 (서버 → 직원) */
export type JoinTeamResponse = void;

/** 내 팀 정보 응답 (backend: TeamDto.MyTeamResponse) */
export interface MyTeamResponse {
  teamId: number;
  teamName: string;
  managerId: number;
  managerUsername: string;
}

/** 팀 멤버 목록 응답 (backend: TeamDto.TeamMemberResponse) */
export interface TeamMemberResponse {
  id: number;
  username: string;
  role: Role;
  virtualBalance: number;
}

/**
 * 관리자 팀 목록 응답 (backend: TeamDto.MyTeamsResponse)
 * [신규] GET /api/teams/my-teams
 */
export interface MyTeamsApiResponse {
  teamId: number;
  teamName: string;
  managerId: number;
  managerUsername: string;
  memberCount: number;
  createdAt: string;
}

/** 로그인 응답 (backend: MemberDto.LoginResponse) */
export interface LoginResponse {
  token: string;
  refreshToken: string;
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
  balance: number;
}

/** 웹소켓 알림 (backend: StatusService WebSocket broadcast) */
export interface DashboardAlertResponse {
  memberId: number;
  username: string;
  statusType: StatusType;
  updatedAt: string;
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
  statusType: StatusType;
  description: string;
  timestamp: string;
  resolved: boolean;
  confidence?: number;
  source?: string;
}

/** 모니터링 상태 (프론트엔드 내부 - WebSocket 연동) */
export interface MonitoringStatus {
  memberId: number;
  memberName: string;
  currentStatus: StatusType;
  lastChecked: string;
  isOnline: boolean;
  confidence: number;
}

/** 대시보드 통계 */
export interface DashboardStats {
  totalEmployees: number;
  onlineEmployees: number;
  totalAlerts: number;
  resolvedAlerts: number;
  activeAlerts: number;
}

/** ──────────── WebSocket 관련 타입 (로컬 AI 에이전트 연동) ──────────── */

export interface WSInitMsg {
  type: 'init';
  employeeId: number;
  token: string;
  refreshToken?: string;
}

export interface WSFrameMsg {
  type: 'frame';
  data: string;
}

export interface WSStopMsg {
  type: 'stop';
}

export interface WSResultMsg {
  type: 'result';
  state: AiStatusType;
  confidence: number;
  fps: number;
}

export interface WSReadyMsg {
  type: 'ready';
}

export interface WSErrorMsg {
  type: 'error';
  message: string;
}

/** ──────────── v2.0 출퇴근 및 상태 관리 DTO ──────────── */

export type StatusType = 'WORKING' | 'MEETING' | 'AWAY' | 'FOCUS' | 'OFFLINE';

export interface ClockInResponse {
  workLogId: number;
  memberId: number;
  username: string;
  workDate: string;
  clockInTime: string;
}

export interface ClockOutResponse {
  workLogId: number;
  memberId: number;
  username: string;
  workDate: string;
  clockInTime: string;
  clockOutTime: string;
}

export interface StatusUpdateResponse {
  memberId: number;
  username: string;
  statusType: StatusType;
  updatedAt: string;
}

export interface TeamMemberStatusResponse {
  memberId: number;
  username: string;
  statusType: StatusType;
  updatedAt: string;
}

export interface TeamStatusBroadcast {
  memberId: number;
  username: string;
  statusType: StatusType;
  changedAt: string;
}

/** ──────────── 미팅룸 관련 DTO ──────────── */

export interface MeetingParticipantResponse {
  participantId: number;
  memberId: number;
  username: string;
  requestStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  invited: boolean;
}

export interface MeetingRoomResponse {
  roomId: number;
  title: string;
  hostId: number;
  hostUsername: string;
  active: boolean;
  participantCount: number;
  createdAt: string;
}

export interface MeetingRoomDetailResponse {
  roomId: number;
  title: string;
  hostId: number;
  hostUsername: string;
  active: boolean;
  participants: MeetingParticipantResponse[];
  createdAt: string;
}

export interface JoinRequestResponse {
  participantId: number;
  roomId: number;
  memberId: number;
  username: string;
  requestStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

/** ──────────── 알림 관련 DTO ──────────── */

export type NotificationType = 'GENERAL' | 'IMPORTANT';

export interface NotificationResponse {
  notificationId: number;
  senderId: number;
  senderUsername: string;
  receiverId: number;
  receiverUsername: string;
  message: string;
  notificationType: NotificationType;
  read: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

/** ──────────── 데일리 스탠드업 관련 DTO ──────────── */

export interface StandupResponse {
  standupId: number;
  memberId: number;
  username: string;
  standupDate: string;
  goal: string;
  result: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamStandupResponse {
  standupDate: string;
  standups: StandupResponse[];
}