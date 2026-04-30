import { create } from 'zustand';
import type { AuthUser, Role } from '../lib/types';
import * as api from '../lib/api';

interface AuthState {
  /** 현재 로그인한 사용자 */
  user: AuthUser | null;
  /** 로그인 여부 */
  isAuthenticated: boolean;
  /** 로그인 처리 - 실제 백엔드 API 호출 */
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  /** 회원가입 처리 - 실제 백엔드 API 호출 */
  signUp: (username: string, password: string, role: Role) => Promise<{ success: boolean; error?: string }>;
  /** 로그아웃 */
  logout: () => void;
  /** 현재 사용자 역할 가져오기 */
  getRole: () => Role | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    try {
      const res = await api.login({ username, password });
      const user: AuthUser = {
        id: res.id,
        username: res.username,
        role: res.role,
        balance: res.balance,
      };
      set({ user, isAuthenticated: true });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      return { success: false, error: message };
    }
  },

  signUp: async (username: string, password: string, role: Role) => {
    try {
      const res = await api.signUp({ username, password, role });
      const user: AuthUser = {
        id: res.id,
        username: res.username,
        role: res.role,
        balance: res.balance,
      };
      set({ user, isAuthenticated: true });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '회원가입에 실패했습니다.';
      return { success: false, error: message };
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },

  getRole: () => {
    const { user } = get();
    return user?.role ?? null;
  },
}));
