package com.worksight.api.enums;

public enum StatusType {
    WORKING,  // 근무중 — 출근 클릭 시 자동
    MEETING,  // 회의중 — 미팅룸 입장 시 자동
    AWAY,     // 휴식/자리비움 — AI 판별
    FOCUS,    // 집중 — 사용자 수동 설정 전용
    OFFLINE   // 오프라인 — 퇴근 클릭 시 자동
}
