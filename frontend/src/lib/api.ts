import type { SignUpRequest, LoginRequest, LoginResponse, ReissueRequest, MemberResponse, EventReportRequest, CreateTeamRequest, CreateTeamResponse, JoinTeamRequest, JoinTeamResponse } from './types';

const API_BASE = '/api';

/** 인증이 필요 없는 공개 엔드포인트 */
const PUBLIC_ENDPOINTS = ['/members/signup', '/members/login', '/members/reissue'];

/** 공통 fetch 래퍼 - JSON POST 요청 */
async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  // 공개 엔드포인트에는 토큰을 보내지 않음 (서버 재시작 후 만료된 토큰이 401을 유발하는 문제 방지)
  const isPublic = PUBLIC_ENDPOINTS.some(ep => url.includes(ep));
  if (!isPublic) {
    const token = localStorage.getItem('token');
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
export async function createTeamAndInviteCode(_request: CreateTeamRequest): Promise<CreateTeamResponse> {
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