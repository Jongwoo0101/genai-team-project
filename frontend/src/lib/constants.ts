/**
 * WorkSight 서비스에서 사용되는 전역 상수 및 스토리지 키 정의
 */
export const STORAGE_KEYS = {
  // 인증 관련 스토리지 키 (sessionStorage)
  AUTH_TOKEN: 'token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'worksight_user',

  // Zustand 스토어 및 데이터 저장용 스토리지 키 (localStorage)
  COMMUTE_STATE: 'worksight-commute-storage',
  STANDUP_STATE: 'worksight-standup-storage',
  VIDEOCALL_STATE: 'worksight-videocall-storage',
  TEAM_DATA: 'worksight-team-storage',
  MEMBER_MAP: 'worksight-member-map-storage',
} as const;

export type StorageKeyType = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
