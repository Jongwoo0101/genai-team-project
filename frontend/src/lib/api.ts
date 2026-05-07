import type { SignUpRequest, LoginRequest, LoginResponse, ReissueRequest, MemberResponse, EventReportRequest } from './types';

const API_BASE = '/api';

/** 공통 fetch 래퍼 - JSON POST 요청 */
async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const token = localStorage.getItem('accessToken');
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
    // 서버가 JSON 에러 응답을 보내는 경우 message 필드 추출
    try {
      const errorData = await res.json();
      // GlobalExceptionHandler의 message 필드 우선 사용
      throw new Error(errorData?.message || `HTTP ${res.status}`);
    } catch (jsonErr) {
      // json() 자체가 실패한 경우 (빈 응답 등) 텍스트로 폴백
      if (jsonErr instanceof Error && !jsonErr.message.startsWith('HTTP')) {
        throw jsonErr; // 이미 파싱된 에러면 그대로 던짐
      }
      const errorText = await res.text().catch(() => '');
      throw new Error(errorText || `HTTP ${res.status}`);
    }
  }

  return res.json();
}

/** 회원가입 */
export async function signUp(request: SignUpRequest): Promise<MemberResponse> {
  return postJSON<MemberResponse>('/members/signup', request);
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
// GET 요청용 공통 래퍼 (토큰 포함)
async function fetchWithAuth(url: string) {
  const token = localStorage.getItem('accessToken');
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