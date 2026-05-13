package com.worksight.api.dto;

import com.worksight.api.entity.EventType;
import java.time.LocalDateTime;

public class MonitoringDto {
    // Python AI 모듈이 서버로 보낼 때 사용하는 형식
    public record EventReportRequest(
            Long employeeId,
            EventType eventType,
            Integer confidence,
            LocalDateTime detectedAt,
            String source
    ) {
        public EventReportRequest(Long employeeId, EventType eventType) {
            this(employeeId, eventType, null, null, null);
        }
    }

    // 관리자 대시보드(웹소켓)로 쏠 알람 형식
    public record DashboardAlertResponse(
            Long eventId,
            Long employeeId,
            String employeeName,
            EventType eventType,
            LocalDateTime eventTime,
            Integer confidence,
            LocalDateTime detectedAt,
            String source
    ) {}
}
