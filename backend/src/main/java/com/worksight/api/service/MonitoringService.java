package com.worksight.api.service;

import com.worksight.api.dto.MonitoringDto.*;
import com.worksight.api.entity.EventType;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.WorkEvent;
import com.worksight.api.repository.MemberRepository;
import com.worksight.api.repository.WorkEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.NoSuchElementException;

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

        // 2. 직원 조회 — GlobalExceptionHandler가 NoSuchElementException -> 404 처리
        Member employee = memberRepository.findById(request.employeeId())
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 직원입니다. id=" + request.employeeId()));

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

        // 4. 트랜잭션 커밋 완료 후 WebSocket 브로드캐스팅
        //    save() 후 바로 전송하면 DB 롤백 시 유령 알림이 발생할 수 있으므로 afterCommit으로 이동
        DashboardAlertResponse alert = new DashboardAlertResponse(
                event.getId(),
                employee.getId(),
                employee.getUsername(),
                event.getEventType(),
                event.getEventTime(),   // @CreationTimestamp — save() 시점에 채워짐
                normalizeConfidence(request.confidence()),
                event.getDetectedAt(),
                event.getSource()
        );

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messagingTemplate.convertAndSend("/topic/alerts", alert);
                log.info("Alert broadcasted: employeeId={}, eventType={}",
                        employee.getId(), event.getEventType());
            }
        });
    }

    /**
     * confidence 값을 0~100 범위로 정규화.
     * null인 경우 기본값 0 처리 (집계/비교 시 NPE 방지)
     */
    private int normalizeConfidence(Integer confidence) {
        if (confidence == null) {
            log.warn("confidence is null, defaulting to 0");
            return 0;
        }
        return Math.max(0, Math.min(100, confidence));
    }

    /**
     * source가 없으면 "frontend"로 기본값 처리
     */
    private String normalizeSource(String source) {
        if (source == null || source.isBlank()) {
            return "frontend";
        }
        return source;
    }
}