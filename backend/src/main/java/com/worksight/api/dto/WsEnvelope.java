package com.worksight.api.dto;

import java.time.Instant;

/**
 * WebSocket 표준 이벤트 Envelope
 * {
 *   "event":      "STATUS_CHANGED",
 *   "data":       { ... },
 *   "occurredAt": "2026-05-22T10:00:00Z",
 *   "version":    "v1"
 * }
 */
public record WsEnvelope(
        String event,
        Object data,
        String occurredAt,
        String version
) {
    public static WsEnvelope of(String event, Object data) {
        return new WsEnvelope(event, data, Instant.now().toString(), "v1");
    }

    public static final class Event {
        // 상태
        public static final String STATUS_CHANGED       = "STATUS_CHANGED";

        // 미팅룸
        public static final String ROOM_CREATED         = "ROOM_CREATED";
        public static final String ROOM_ENDED           = "ROOM_ENDED";
        public static final String MEMBER_JOINED        = "MEMBER_JOINED";
        public static final String MEMBER_LEFT          = "MEMBER_LEFT";
        public static final String JOIN_REQUESTED       = "JOIN_REQUESTED";
        public static final String INVITED              = "INVITED";
        public static final String REQUEST_ACCEPTED     = "REQUEST_ACCEPTED";
        public static final String REQUEST_REJECTED     = "REQUEST_REJECTED";

        // 스탠드업
        public static final String GOAL_UPDATED         = "GOAL_UPDATED";
        public static final String RESULT_UPDATED       = "RESULT_UPDATED";

        // 팀
        public static final String TEAM_LINKED          = "TEAM_LINKED";

        // 알림
        public static final String NOTIFICATION_RECEIVED = "NOTIFICATION_RECEIVED";

        // ── 채팅 (신규) ──────────────────────────────────────
        /** 새 메시지 수신 — /topic/members/{receiverId} */
        public static final String CHAT_MESSAGE_RECEIVED = "CHAT_MESSAGE_RECEIVED";

        /** 긴급 메시지 수신 — /topic/members/{receiverId} (별도 구분으로 강제 알림 처리) */
        public static final String CHAT_URGENT_RECEIVED  = "CHAT_URGENT_RECEIVED";

        /** 상대방이 메시지를 읽음 — /topic/members/{senderId} */
        public static final String CHAT_READ             = "CHAT_READ";

        private Event() {}
    }
}
