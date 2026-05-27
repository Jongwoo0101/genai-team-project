import { STORAGE_KEYS } from './constants';
import type {
  SignUpRequest, LoginRequest, LoginResponse, ReissueRequest, MemberResponse,
  CreateTeamResponse, JoinTeamRequest, JoinTeamResponse,
  MyTeamResponse, TeamMemberResponse, ClockInResponse, ClockOutResponse,
  StatusUpdateResponse, TeamMemberStatusResponse, StatusType,
  MeetingRoomResponse, MeetingRoomDetailResponse, JoinRequestResponse,
  NotificationResponse, UnreadCountResponse, NotificationType,
  StandupResponse, TeamStandupResponse
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/** 인증이 필요 없는 공개 엔드포인트 */
const PUBLIC_ENDPOINTS = ['/members/signup', '/members/login', '/members/reissue'];

/** 공통 fetch 래퍼 - JSON POST 요청 */
async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  // 공개 엔드포인트에는 토큰을 보내지 않음 (서버 재시작 후 만료된 토큰이 401을 유발하는 문제 방지)
  const isPublic = PUBLIC_ENDPOINTS.some(ep => url.includes(ep));
  if (!isPublic) {
    const token = sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token && token !== 'undefined' && token !== 'null') {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData?.message || errorMessage;
    } catch {
      try {
        const text = await res.text();
        errorMessage = text || errorMessage;
      } catch { /* ignore */ }
    }
    throw new Error(errorMessage);
  }

  // 응답 본문 파싱 (사파리 호환성 강화)
  // 204 No Content만 빈 응답 처리, 나머지는 무조건 JSON 파싱 시도
  if (res.status === 204) {
    return undefined as T;
  }

  try {
    return await res.json();
  } catch (err) {
    console.warn('JSON 파싱 실패 (빈 응답일 수 있음):', err);
    return undefined as T;
  }
}

/** 회원가입 */
export async function signUp(request: SignUpRequest): Promise<MemberResponse> {
  return postJSON<MemberResponse>('/members/signup', request);
}

/** ──────────── 팀 관리 API ──────────── */

/** 팀 생성 및 초대 코드 발급 (관리자가 호출) */
export async function createTeamAndInviteCode(request: { teamName: string; description?: string }): Promise<CreateTeamResponse> {
  void request;
  // 백엔드 POST /members/invite-code 는 현재 @RequestBody 를 받지 않음
  return postJSON<CreateTeamResponse>('/members/invite-code', {});
}

/** 팀 참여 (직원이 호출) */
export async function joinTeam(request: JoinTeamRequest): Promise<JoinTeamResponse> {
  return postJSON<JoinTeamResponse>('/members/join-team', request);
}

/** 로그인 */
export async function login(request: LoginRequest): Promise<LoginResponse> {
  return postJSON<LoginResponse>('/members/login', request);
}

/** 토큰 재발급 */
export async function reissueToken(request: ReissueRequest): Promise<LoginResponse> {
  return postJSON<LoginResponse>('/members/reissue', request);
}

/** ──────────── 신규 팀 관리 API (DB 연동) ──────────── */

/** 내 팀 정보 조회 (직원용) */
export async function getMyTeam(): Promise<MyTeamResponse> {
  const res = await fetchWithAuth('/teams/my-team');
  if (!res.ok) {
    if (res.status === 409) throw new Error('NOT_JOINED'); // 팀 미소속 특수 에러
    throw new Error('내 팀 정보를 불러오지 못했습니다.');
  }
  return res.json();
}

/** 팀 멤버 목록 조회 (관리자용) */
export async function getTeamMembers(managerId: number): Promise<TeamMemberResponse[]> {
  const res = await fetchWithAuth(`/teams/${managerId}/members`);
  if (!res.ok) throw new Error('팀 멤버 목록을 불러오지 못했습니다.');
  return res.json();
}

/** ──────────── 인증 및 API 헬퍼 ──────────── */

async function fetchWithAuth(url: string) {
  const token = sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  const headers: Record<string, string> = {};
  if (token && token !== 'undefined' && token !== 'null') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(`${API_BASE}${url}`, { headers });
}

async function requestWithAuth<T>(url: string, method: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (token && token !== 'undefined' && token !== 'null') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${url}`, options);

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData?.message || errorMessage;
    } catch {
      try {
        const text = await res.text();
        errorMessage = text || errorMessage;
      } catch { /* ignore */ }
    }
    throw new Error(errorMessage);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  try {
    return await res.json();
  } catch {
    return undefined as T;
  }
}

/** ──────────── v2.0 출퇴근 및 상태 관리 API ──────────── */

/** 출근 API */
export async function clockIn(): Promise<ClockInResponse> {
  return requestWithAuth<ClockInResponse>('/work/clock-in', 'POST', {});
}

/** 퇴근 API */
export async function clockOut(): Promise<ClockOutResponse> {
  return requestWithAuth<ClockOutResponse>('/work/clock-out', 'POST', {});
}

/** AI 상태 판별 업데이트 API */
export async function updateAiStatus(statusType: StatusType): Promise<StatusUpdateResponse> {
  return requestWithAuth<StatusUpdateResponse>('/status/ai', 'PUT', { statusType });
}

/** 사용자 수동 상태 설정 API */
export async function updateManualStatus(statusType: StatusType): Promise<StatusUpdateResponse> {
  return requestWithAuth<StatusUpdateResponse>('/status/manual', 'PUT', { statusType });
}

/** 매니저용 팀원 전체 실시간 상태 조회 API */
export async function getTeamMemberStatuses(managerId: number): Promise<TeamMemberStatusResponse[]> {
  const res = await fetchWithAuth(`/status/team/${managerId}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

/** ──────────── 미팅룸 API ──────────── */

/** 미팅룸 생성 */
export async function createMeeting(title: string): Promise<MeetingRoomResponse> {
  return requestWithAuth<MeetingRoomResponse>('/meetings', 'POST', { title });
}

/** 진행 중인 미팅룸 목록 조회 */
export async function getMeetings(): Promise<MeetingRoomResponse[]> {
  const res = await fetchWithAuth('/meetings');
  if (!res.ok) throw new Error('미팅룸 목록을 불러오지 못했습니다.');
  return res.json();
}

/** 미팅룸 상세 조회 */
export async function getMeetingDetail(roomId: number): Promise<MeetingRoomDetailResponse> {
  const res = await fetchWithAuth(`/meetings/${roomId}`);
  if (!res.ok) throw new Error('미팅룸 상세 정보를 불러오지 못했습니다.');
  return res.json();
}

/** 참가 요청 (사용자 → 주최자) */
export async function requestJoinMeeting(roomId: number): Promise<JoinRequestResponse> {
  return requestWithAuth<JoinRequestResponse>(`/meetings/${roomId}/join-request`, 'POST', {});
}

/** 주최자 초대 */
export async function inviteToMeeting(roomId: number, memberId: number): Promise<JoinRequestResponse> {
  return requestWithAuth<JoinRequestResponse>(`/meetings/${roomId}/invite`, 'POST', { memberId });
}

/** 참가 요청 수락/거절 (주최자) */
export async function respondToJoinRequest(roomId: number, participantId: number, accept: boolean): Promise<JoinRequestResponse> {
  return requestWithAuth<JoinRequestResponse>(`/meetings/${roomId}/requests/${participantId}`, 'PUT', { accept });
}

/** 초대 수락/거절 (초대받은 사용자) */
export async function respondToInvitation(roomId: number, accept: boolean): Promise<JoinRequestResponse> {
  return requestWithAuth<JoinRequestResponse>(`/meetings/${roomId}/invite-response`, 'PUT', { accept });
}

/** 미팅룸 종료 (주최자) */
export async function endMeeting(roomId: number): Promise<void> {
  return requestWithAuth<void>(`/meetings/${roomId}`, 'DELETE');
}

/** 회의 나가기 (참가자) */
export async function leaveMeeting(roomId: number): Promise<void> {
  return requestWithAuth<void>(`/meetings/${roomId}/leave`, 'DELETE');
}

/** ──────────── 알림 API ──────────── */

/** 알림 발송 (매니저 전용) */
export async function sendNotification(receiverId: number, message: string, notificationType: NotificationType): Promise<NotificationResponse> {
  return requestWithAuth<NotificationResponse>('/notifications', 'POST', { receiverId, message, notificationType });
}

/** 내 알림 전체 조회 */
export async function getNotifications(): Promise<NotificationResponse[]> {
  const res = await fetchWithAuth('/notifications');
  if (!res.ok) throw new Error('알림 목록을 불러오지 못했습니다.');
  return res.json();
}

/** 읽지 않은 알림 조회 */
export async function getUnreadNotifications(): Promise<NotificationResponse[]> {
  const res = await fetchWithAuth('/notifications/unread');
  if (!res.ok) throw new Error('읽지 않은 알림 목록을 불러오지 못했습니다.');
  return res.json();
}

/** 읽지 않은 알림 수 조회 */
export async function getUnreadNotificationsCount(): Promise<UnreadCountResponse> {
  const res = await fetchWithAuth('/notifications/unread/count');
  if (!res.ok) throw new Error('읽지 않은 알림 수를 불러오지 못했습니다.');
  return res.json();
}

/** 알림 단건 읽음 처리 */
export async function readNotification(notificationId: number): Promise<NotificationResponse> {
  return requestWithAuth<NotificationResponse>(`/notifications/${notificationId}/read`, 'PATCH', {});
}

/** 알림 전체 읽음 처리 */
export async function readAllNotifications(): Promise<void> {
  return requestWithAuth<void>('/notifications/read-all', 'PATCH', {});
}

/** ──────────── 데일리 스탠드업 API ──────────── */

/** 오늘의 목표 작성 */
export async function createStandupGoal(goal: string): Promise<StandupResponse> {
  return requestWithAuth<StandupResponse>('/standup/goal', 'POST', { goal });
}

/** 오늘의 결과 작성 */
export async function createStandupResult(result: string): Promise<StandupResponse> {
  return requestWithAuth<StandupResponse>('/standup/result', 'POST', { result });
}

/** 내 오늘 스탠드업 조회 */
export async function getMyTodayStandup(): Promise<StandupResponse> {
  const res = await fetchWithAuth('/standup/my');
  if (!res.ok) {
    if (res.status === 409) {
      throw new Error('NO_STANDUP');
    }
    throw new Error('오늘 스탠드업 정보를 불러오지 못했습니다.');
  }
  return res.json();
}

/** 팀 전체 스탠드업 조회 */
export async function getTeamStandups(date?: string): Promise<TeamStandupResponse> {
  const url = date ? `/standup/team?date=${date}` : '/standup/team';
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error('팀 스탠드업 목록을 불러오지 못했습니다.');
  return res.json();
}
