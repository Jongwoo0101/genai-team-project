package com.worksight.api.enums;

public enum StatusType {
    WORKING,  // 근무중 — 출근 클릭 시 자동
    MEETING,  // 회의중 — 미팅룸 입장 시 자동
    AWAY,     // 휴식/자리비움 — 키보드·마우스 5분 무입력 + 캠 판별
    FOCUS,    // 집중 — AI 자동 판별 or 사용자 수동 설정
    OFFLINE   // 오프라인 — 퇴근 클릭 시 자동
}
