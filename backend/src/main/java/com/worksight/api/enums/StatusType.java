package com.worksight.api.enums;

public enum StatusType {
    WORKING,   // 근무중 (AI 판별)
    MEETING,   // 회의 (AI 판별)
    BREAK,     // 휴식 (AI 판별)
    FOCUS,     // 집중 (사용자 수동 설정)
    OFFLINE    // 오프라인
}
