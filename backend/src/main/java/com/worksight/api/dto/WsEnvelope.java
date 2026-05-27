package com.worksight.api.dto;

import java.time.Instant;

/**
 * WebSocket 표준 이벤트 Envelope
 * 모든 WebSocket 발신부는 이 구조를 사용한다.
 * {
 *   "event":      "STATUS_CHANGED",
 *   "data":       { ... },
 *   "occurredAt": "2026-05-22T10:00:00Z",
 *   "version":    "v1"
 * }
 */
public record WsEnvelope(
        String event,       // 이벤트 식별자 (WsEvent 상수 사용)
        Object data,        // 실제 페이로드 DTO
        String occurredAt,  // ISO-8601 UTC
        String version      // 항상 "v1"
) {
    /** 팩토리 메서드 — 현재 시각을 occurredAt 으로 자동 설정 */
    public static WsEnvelope of(String event, Object data) {
        return new WsEnvelope(event, data, Instant.now().toString(), "v1");
    }

    /** WebSocket 이벤트 이름 상수 */
    public static final class Event {
        // 상태
        public static final String STATUS_CHANGED    = "STATUS_CHANGED";

        // 미팅룸
        public static final String ROOM_CREATED      = "ROOM_CREATED";
        public static final String ROOM_ENDED        = "ROOM_ENDED";
        public static final String MEMBER_JOINED     = "MEMBER_JOINED";
        public static final String MEMBER_LEFT       = "MEMBER_LEFT";
        public static final String JOIN_REQUESTED    = "JOIN_REQUESTED";
        public static final String INVITED           = "INVITED";
        public static final String REQUEST_ACCEPTED  = "REQUEST_ACCEPTED";
        public static final String REQUEST_REJECTED  = "REQUEST_REJECTED";

        // 스탠드업
        public static final String GOAL_UPDATED      = "GOAL_UPDATED";
        public static final String RESULT_UPDATED    = "RESULT_UPDATED";

        // 팀
        public static final String TEAM_LINKED       = "TEAM_LINKED";

        // 알림
        public static final String NOTIFICATION_RECEIVED = "NOTIFICATION_RECEIVED";

        private Event() {}
    }
}