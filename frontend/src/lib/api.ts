import type { SignUpRequest, LoginRequest, MemberResponse, EventReportRequest } from './types';

// ========================
// 백엔드 API 호출 함수
// Spring Boot 서버 (localhost:8080)
// Vite 프록시를 통해 /api/** → localhost:8080/api/** 로 전달
// ========================

const API_BASE = '/api';

/** 공통 fetch 래퍼 - JSON POST 요청 */
async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // 서버에서 에러 메시지를 텍스트로 보내는 경우 처리
    const errorText = await res.text();
    throw new Error(errorText || `HTTP ${res.status}`);
  }

  return res.json();
}

/** 회원가입 */
export async function signUp(request: SignUpRequest): Promise<MemberResponse> {
  return postJSON<MemberResponse>('/members/signup', request);
}

/** 로그인 */
export async function login(request: LoginRequest): Promise<MemberResponse> {
  return postJSON<MemberResponse>('/members/login', request);
}

/** ──────────── 모니터링 API ──────────── */

/** 대시보드 통계 가져오기 */
export async function getDashboardStats() {
  const res = await fetch(`${API_BASE}/monitoring/stats`);
  if (!res.ok) throw new Error('통계를 불러오지 못했습니다.');
  return res.json();
}

/** 최근 이벤트 목록 가져오기 */
export async function getWorkEvents() {
  const res = await fetch(`${API_BASE}/monitoring/events`);
  if (!res.ok) throw new Error('이벤트 로그를 불러오지 못했습니다.');
  return res.json();
}

/** 직원 상태 리포트 (모니터링 이벤트 전송) */
export async function reportEvent(request: EventReportRequest) {
  return postJSON<void>('/monitoring/event', request);
}
