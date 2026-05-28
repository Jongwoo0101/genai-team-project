package com.worksight.api.dto;

import java.time.Instant;

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
        public static final String STATUS_CHANGED           = "STATUS_CHANGED";

        // 미팅룸
        public static final String ROOM_CREATED             = "ROOM_CREATED";
        public static final String ROOM_ENDED               = "ROOM_ENDED";
        public static final String MEMBER_JOINED            = "MEMBER_JOINED";
        public static final String MEMBER_LEFT              = "MEMBER_LEFT";
        public static final String JOIN_REQUESTED           = "JOIN_REQUESTED";
        public static final String INVITED                  = "INVITED";
        public static final String REQUEST_ACCEPTED         = "REQUEST_ACCEPTED";
        public static final String REQUEST_REJECTED         = "REQUEST_REJECTED";

        // 스탠드업
        public static final String GOAL_UPDATED             = "GOAL_UPDATED";
        public static final String RESULT_UPDATED           = "RESULT_UPDATED";

        // 팀
        public static final String TEAM_LINKED              = "TEAM_LINKED";

        // 알림
        public static final String NOTIFICATION_RECEIVED    = "NOTIFICATION_RECEIVED";

        // 1:1 채팅
        public static final String CHAT_MESSAGE_RECEIVED    = "CHAT_MESSAGE_RECEIVED";
        public static final String CHAT_URGENT_RECEIVED     = "CHAT_URGENT_RECEIVED";
        public static final String CHAT_READ                = "CHAT_READ";

        // 팀 채팅 (신규)
        /** 팀 채팅 메시지 — /topic/team/{managerId}  */
        public static final String TEAM_CHAT_MESSAGE        = "TEAM_CHAT_MESSAGE";

        /** 팀원 합류 → 팀 채팅 참여자 목록 갱신 — /topic/team/{managerId} */
        public static final String TEAM_CHAT_MEMBER_JOINED  = "TEAM_CHAT_MEMBER_JOINED";

        private Event() {}
    }
}
