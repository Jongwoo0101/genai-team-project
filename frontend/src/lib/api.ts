import type { SignUpRequest, LoginRequest, LoginResponse, ReissueRequest, MemberResponse, EventReportRequest, AddEmployeeByCodeRequest, GenerateInviteCodeResponse } from './types';

const API_BASE = '/api';

/** 공통 fetch 래퍼 - JSON POST 요청 */
async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const token = localStorage.getItem('token'); // 'accessToken' -> 'token'으로 변경
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData?.message || `HTTP ${res.status}`);
    } catch (jsonErr) {
      if (jsonErr instanceof Error && !jsonErr.message.startsWith('HTTP')) {
        throw jsonErr;
      }
      const errorText = await res.text().catch(() => '');
      throw new Error(errorText || `HTTP ${res.status}`);
    }
  }

  const contentLength = res.headers.get('content-length');
  const contentType = res.headers.get('content-type') || '';
  if (res.status === 204 || contentLength === '0' || !contentType.includes('application/json')) {
    return undefined as T;
  }

  return res.json();
}

/** 회원가입 */
export async function signUp(request: SignUpRequest): Promise<MemberResponse> {
  return postJSON<MemberResponse>('/members/signup', request);
}

/** 초대 코드 생성 (직원이 호출) */
export async function generateInviteCode(): Promise<GenerateInviteCodeResponse> {
  return postJSON<GenerateInviteCodeResponse>('/members/invite-code', {});
}

/** 초대 코드로 직원 추가 (관리자가 호출) */
export async function addEmployeeByCode(request: AddEmployeeByCodeRequest): Promise<void> {
  try {
    return await postJSON<void>('/members/add-by-code', request);
  } catch (err: any) {
    if (err.message?.includes('pattern') || err.message?.includes('JSON')) {
      throw new Error('백엔드 API가 아직 구현되지 않았습니다. 백엔드 개발 후 연동됩니다.');
    }
    throw err;
  }
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