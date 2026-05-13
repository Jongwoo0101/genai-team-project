package com.worksight.api.service;

import java.util.NoSuchElementException;
import com.worksight.api.entity.Member;
import com.worksight.api.repository.MemberRepository;
import com.worksight.api.dto.MonitoringDto.*;
import com.worksight.api.entity.EventType;
import com.worksight.api.entity.WorkEvent;
import com.worksight.api.repository.WorkEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class MonitoringService {

    private final WorkEventRepository workEventRepository;
    private final MemberRepository memberRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void processEvent(EventReportRequest request) {
        // 1. 정상 상태면 무시 (기획서대로 DB 로그 폭발 방지)
        if (request.eventType() == EventType.NORMAL) {
            return;
        }

        // 2. 직원 조회
        Member employee = memberRepository.findById(request.employeeId())
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 직원입니다."));

        // 3. 이상 상태 DB에 이벤트 저장
        WorkEvent event = WorkEvent.builder()
                .employee(employee)
                .eventType(request.eventType())
                .confidence(normalizeConfidence(request.confidence()))
                .detectedAt(request.detectedAt())
                .source(normalizeSource(request.source()))
                .build();

        workEventRepository.save(event);
        log.info("Abnormal state detected and saved: {} - {}", employee.getUsername(), request.eventType());

        // 4. 웹소켓을 통해 관리자 대시보드로 실시간 알림 브로드캐스팅
        DashboardAlertResponse alert = new DashboardAlertResponse(
                event.getId(),
                employee.getId(),
                employee.getUsername(),
                event.getEventType(),
                event.getEventTime(),
                event.getConfidence(),
                event.getDetectedAt(),
                event.getSource()
        );

        // 프론트엔드(관리자)는 '/topic/alerts'를 구독하고 있어야 함
        messagingTemplate.convertAndSend("/topic/alerts", alert);
    }

    private Integer normalizeConfidence(Integer confidence) {
        if (confidence == null) {
            return null;
        }
        return Math.max(0, Math.min(100, confidence));
    }

    private String normalizeSource(String source) {
        if (source == null || source.isBlank()) {
            return "frontend";
        }
        return source;
    }
}
