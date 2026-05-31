package com.worksight.api.exception;

/**
 * 존재하지 않는 리소스 조회 시 (404)
 * 기존 NoSuchElementException 대체
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }

    public static ResourceNotFoundException member(Long id) {
        return new ResourceNotFoundException("존재하지 않는 회원입니다. id=" + id);
    }
    public static ResourceNotFoundException team(Long id) {
        return new ResourceNotFoundException("존재하지 않는 팀입니다. id=" + id);
    }
    public static ResourceNotFoundException chatRoom(Long id) {
        return new ResourceNotFoundException("존재하지 않는 채팅방입니다. id=" + id);
    }
    public static ResourceNotFoundException meetingRoom(Long id) {
        return new ResourceNotFoundException("존재하지 않는 미팅룸입니다. id=" + id);
    }
    public static ResourceNotFoundException notification(Long id) {
        return new ResourceNotFoundException("존재하지 않는 알림입니다. id=" + id);
    }
    public static ResourceNotFoundException standup() {
        return new ResourceNotFoundException("오늘 작성된 스탠드업이 없습니다.");
    }
    public static ResourceNotFoundException meetingParticipant() {
        return new ResourceNotFoundException("존재하지 않는 참가 요청입니다.");
    }
}
