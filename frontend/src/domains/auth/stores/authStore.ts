import { create } from 'zustand';
import { STORAGE_KEYS } from '../../../lib/constants';
import type { AuthUser, Role } from '../../../lib/types';
import * as api from '../../../lib/api';
import { clearTeamStorage } from '../../team/stores/teamStore';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (username: string, password: string, role: Role) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  getRole: () => Role | null;
}

// 서버 에러 응답에서 사용자 친화적 메시지 추출
const parseErrorMessage = async (err: unknown): Promise<string> => {
  // api.ts에서 throw한 Error 객체 처리
  if (err instanceof Error) {
    // api.ts에서 response.json()의 message를 Error.message로 넘겨준 경우
    const msg = err.message;

    // 서버에서 내려온 한국어 메시지가 이미 있으면 그대로 사용
    if (msg && !msg.startsWith('HTTP')) return msg;

    // HTTP 상태코드 기반 파싱 (api.ts에서 "HTTP 409" 형태로 던진 경우)
    if (msg.includes('409')) return '이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.';
    if (msg.includes('401')) return '아이디 또는 비밀번호가 올바르지 않습니다.';
    if (msg.includes('403')) return '접근 권한이 없습니다. 관리자에게 문의해주세요.';
    if (msg.includes('404')) return '존재하지 않는 계정입니다. 아이디를 다시 확인해주세요.';
    if (msg.includes('400')) return '입력 정보를 다시 확인해주세요.';
    if (msg.includes('500')) return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }

  return '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
};

// 초기 상태 복구 (새로고침 대응)
const loadInitialState = () => {
  try {
    const userJson = sessionStorage.getItem(STORAGE_KEYS.USER_INFO);
    const token = sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (userJson && token) {
      return {
        user: JSON.parse(userJson) as AuthUser,
        token,
        isAuthenticated: true
      };
    }
  } catch (e) {
    console.error('Failed to load initial auth state', e);
  }
  return { user: null, token: null, isAuthenticated: false };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...loadInitialState(),

  login: async (username: string, password: string) => {
    try {
      const res = await api.login({ username, password });

      // 백엔드 응답 필드(token) 반영
      if (res.token) {
        sessionStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, res.token);
      }
      if (res.refreshToken) {
        sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, res.refreshToken);
      }

      const user: AuthUser = {
        id: res.id,
        username: res.username,
        role: res.role,
        balance: res.virtualBalance ?? 0,
      };
      
      // 유저 정보 저장 (새로고침 시 복구용)
      sessionStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
      
      set({ user, token: res.token, isAuthenticated: true });
      return { success: true };
    } catch (err: unknown) {
      const message = await parseErrorMessage(err);
      return { success: false, error: message };
    }
  },

  signUp: async (username: string, password: string, role: Role) => {
    try {
      clearTeamStorage();
      // 1. 회원가입 요청
      await api.signUp({ username, password, role });
      
      // 2. 가입 성공 시 자동으로 로그인 처리
      const loginResult = await get().login(username, password);
      if (!loginResult.success) {
        return { success: false, error: '가입은 완료되었으나 자동 로그인에 실패했습니다. 수동으로 로그인해주세요.' };
      }
      
      return { success: true };
    } catch (err: unknown) {
      const message = await parseErrorMessage(err);
      return { success: false, error: message };
    }
  },

  logout: () => {
    // 프론트엔드 캐시(토큰 등) 완전 초기화
    sessionStorage.clear();
    set({ user: null, token: null, isAuthenticated: false });
  },

  getRole: () => {
    const { user } = get();
    return user?.role ?? null;
  },
}));
