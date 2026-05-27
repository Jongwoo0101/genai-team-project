import type { StateStorage } from 'zustand/middleware';
import { STORAGE_KEYS } from './constants';

/**
 * 현재 로그인된 사용자의 ID를 sessionStorage에서 안전하게 추출합니다.
 */
export function getActiveUserId(): number | null {
  try {
    const userJson = sessionStorage.getItem(STORAGE_KEYS.USER_INFO);
    if (userJson) {
      const user = JSON.parse(userJson);
      const parsedId = Number(user?.id);
      return Number.isFinite(parsedId) ? parsedId : null;
    }
  } catch {
    // ignore parsing errors
  }
  return null;
}

/**
 * 주어진 기본 키 이름에 사용자 ID를 접미사로 붙여 반환합니다.
 */
export function getScopedKey(baseKey: string, userId: number | null): string {
  if (userId === null) return baseKey;
  return `${baseKey}:${userId}`;
}

/**
 * Zustand persist 미들웨어에 주입할 사용자별 격리 로컬 스토리지 어댑터를 생성합니다.
 */
export const userScopedStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const userId = getActiveUserId();
    const key = getScopedKey(name, userId);
    const value = localStorage.getItem(key);
    if (value !== null) {
      return value;
    }

    // 마이그레이션 로직: 새 scoped key 데이터가 없고, 레거시 키 데이터는 존재하는 경우 이전
    if (userId !== null) {
      const legacyValue = localStorage.getItem(name);
      if (legacyValue !== null) {
        localStorage.setItem(key, legacyValue);
        localStorage.removeItem(name);
        return legacyValue;
      }
    }
    return null;
  },
  setItem: (name: string, value: string): void => {
    const userId = getActiveUserId();
    const key = getScopedKey(name, userId);
    localStorage.setItem(key, value);
  },
  removeItem: (name: string): void => {
    const userId = getActiveUserId();
    const key = getScopedKey(name, userId);
    localStorage.removeItem(key);
  },
};
