import type { SignUpRequest, LoginRequest, LoginResponse, ReissueRequest, MemberResponse, EventReportRequest, CreateTeamRequest, CreateTeamResponse, JoinTeamRequest, JoinTeamResponse } from './types';

const API_BASE = '/api';

/** 공통 fetch 래퍼 - JSON POST 요청 */
async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (token && token !== 'undefined' && token !== 'null') {
    headers['Authorization'] = `Bearer ${token}`;
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

  // 응답 본문이 있는지 확인 후 파싱 (사파리 호환성 강화)
  const contentType = res.headers.get('content-type') || '';
  if (res.status === 204 || !contentType.includes('application/json')) {
    return undefined as T;
  }

  try {
    return await res.json();
  } catch (err) {
    console.warn('JSON 파싱 실패:', err);
    return undefined as T;
  }
}

/** 회원가입 */
export async function signUp(request: SignUpRequest): Promise<MemberResponse> {
  return postJSON<MemberResponse>('/members/signup', request);
}

/** ──────────── 팀 관리 API ──────────── */

/** 팀 생성 및 초대 코드 발급 (관리자가 호출) */
export async function createTeamAndInviteCode(request: CreateTeamRequest): Promise<CreateTeamResponse> {
  return postJSON<CreateTeamResponse>('/members/invite-code', request);
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

/** ──────────── 모니터링 API ──────────── */
async function fetchWithAuth(url: string) {
  const token = localStorage.getItem('token'); // 'accessToken' -> 'token'
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  return fetch(`${API_BASE}${url}`, { headers });
}

/** 대시보드 통계 가져오기 */
export async function getDashboardStats() {
  const res = await fetchWithAuth('/monitoring/stats');
  if (!res.ok) throw new Error('통계를 불러오지 못했습니다.');
  return res.json();
}

/** 최근 이벤트 목록 가져오기 */
export async function getWorkEvents() {
  const res = await fetchWithAuth('/monitoring/events');
  if (!res.ok) throw new Error('이벤트 로그를 불러오지 못했습니다.');
  return res.json();
}

/** 직원 상태 리포트 (모니터링 이벤트 전송) */
export async function reportEvent(request: EventReportRequest) {
  return postJSON<void>('/monitoring/event', request);
}