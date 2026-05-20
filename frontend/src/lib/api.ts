import { STORAGE_KEYS } from './constants';
import type {
  SignUpRequest, LoginRequest, LoginResponse, ReissueRequest, MemberResponse,
  CreateTeamResponse, JoinTeamRequest, JoinTeamResponse,
  MyTeamResponse, TeamMemberResponse, ClockInResponse, ClockOutResponse,
  StatusUpdateResponse, TeamMemberStatusResponse, StatusType
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
  } catch (err) {
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
