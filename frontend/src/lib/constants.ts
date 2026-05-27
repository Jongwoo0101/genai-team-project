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
  TEAM_OWNER: 'worksight-team-owner-storage',
} as const;

export type StorageKeyType = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * STOMP 웹소켓 실시간 알림/이벤트 토픽 경로 템플릿
 */
export const WEBSOCKET_TOPICS = {
  // 특정 팀 전체에 전송되는 실시간 상태 변경/근무 현황 알림 토픽 (구독용)
  TEAM: (managerId: string | number) => `/topic/team/${managerId}`,

  // 특정 사용자(개인)에게 직접 전달되는 실시간 알림(초대, 핑 경보 등) 토픽 (구독용)
  MEMBER: (userId: string | number) => `/topic/members/${userId}`,
} as const;
