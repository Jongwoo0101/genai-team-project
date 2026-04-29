import { create } from 'zustand';
import type { Member, Role } from '../lib/types';
import { mockMembers } from '../lib/mockData';

interface AuthState {
  /** 현재 로그인한 사용자 */
  user: Member | null;
  /** 로그인 여부 */
  isAuthenticated: boolean;
  /** 로그인 처리 (Mock) - 추후 실제 API로 교체 */
  login: (email: string, password: string) => boolean;
  /** 로그아웃 */
  logout: () => void;
  /** 현재 사용자 역할 가져오기 */
  getRole: () => Role | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,

  login: (email: string, _password: string) => {
    // Mock 로그인: 이메일로 사용자 찾기
    // 추후 lib/api.ts 에서 실제 POST /api/members/login 호출로 교체
    const member = mockMembers.find((m) => m.email === email);
    if (member) {
      set({ user: member, isAuthenticated: true });
      return true;
    }
    return false;
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },

  getRole: () => {
    const { user } = get();
    return user?.role ?? null;
  },
}));
