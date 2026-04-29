package com.worksight.api.controller;

import com.worksight.api.dto.MonitoringDto.EventReportRequest;
import com.worksight.api.service.MonitoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/monitoring")
@RequiredArgsConstructor
public class MonitoringController {

    private final MonitoringService monitoringService;

    // Python AI 모듈이 상태 변화 감지 시 호출할 엔드포인트
    @PostMapping("/event")
    public ResponseEntity<String> reportEvent(@RequestBody EventReportRequest request) {
        monitoringService.processEvent(request);
        return ResponseEntity.ok("Event processed successfully");
    }
}