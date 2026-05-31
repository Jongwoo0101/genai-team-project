package com.worksight.api.exception;

/**
 * 접근 권한이 없는 작업 시도 (403)
 * 기존 IllegalArgumentException("주최자만 가능한 작업입니다.") 등을 대체
 */
public class UnauthorizedAccessException extends RuntimeException {
    public UnauthorizedAccessException(String message) {
        super(message);
    }

    public static UnauthorizedAccessException hostOnly() {
        return new UnauthorizedAccessException("주최자만 가능한 작업입니다.");
    }
    public static UnauthorizedAccessException myTeamOnly() {
        return new UnauthorizedAccessException("본인 팀의 멤버만 조회할 수 있습니다.");
    }
    public static UnauthorizedAccessException myNotificationOnly() {
        return new UnauthorizedAccessException("본인의 알림만 읽음 처리할 수 있습니다.");
    }
}
