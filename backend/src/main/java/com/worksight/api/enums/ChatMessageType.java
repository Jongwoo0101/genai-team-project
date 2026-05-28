package com.worksight.api.enums;

public enum ChatMessageType {
    NORMAL,  // 일반 메시지 — 수신자 MEETING/AWAY 상태 시 알림 미발송
    URGENT   // 긴급 알림  — 수신자 상태 무관, 강제 알림 발송
}
