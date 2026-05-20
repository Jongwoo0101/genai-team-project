package com.worksight.api.service;

import com.worksight.api.entity.Member;
import com.worksight.api.entity.Role;
import com.worksight.api.repository.MemberRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class MonitoringServiceTest {

    private final WorkEventRepository workEventRepository = mock(WorkEventRepository.class);
    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
    private final MonitoringService monitoringService = new MonitoringService(
            workEventRepository,
            memberRepository,
            messagingTemplate
    );

    @Test
    void normalEventsAreIgnoredEvenWhenOptionalAiFieldsArePresent() {
        EventReportRequest request = new EventReportRequest(
                1L,
                EventType.NORMAL,
                93,
                LocalDateTime.parse("2026-05-13T10:00:00"),
                "ai_model"
        );

        monitoringService.processEvent(request);

        verify(memberRepository, never()).findById(1L);
        verifyNoInteractions(workEventRepository);
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void abnormalEventsPersistAiMetadataAndBroadcastItToManagers() {
        Member employee = Member.builder()
                .username("employee01")
                .password("pw")
                .role(Role.EMPLOYEE)
                .build();
        ReflectionTestUtils.setField(employee, "id", 7L);
        when(memberRepository.findById(7L)).thenReturn(Optional.of(employee));
        when(workEventRepository.save(org.mockito.ArgumentMatchers.any(WorkEvent.class)))
                .thenAnswer(invocation -> {
                    WorkEvent event = invocation.getArgument(0);
                    ReflectionTestUtils.setField(event, "id", 99L);
                    ReflectionTestUtils.setField(event, "eventTime", LocalDateTime.parse("2026-05-13T10:00:02"));
                    return event;
                });

        EventReportRequest request = new EventReportRequest(
                7L,
                EventType.SLEEP,
                88,
                LocalDateTime.parse("2026-05-13T10:00:00"),
                "ai_model"
        );

        monitoringService.processEvent(request);

        ArgumentCaptor<WorkEvent> eventCaptor = ArgumentCaptor.forClass(WorkEvent.class);
        verify(workEventRepository).save(eventCaptor.capture());
        assertThat(eventCaptor.getValue().getConfidence()).isEqualTo(88);
        assertThat(eventCaptor.getValue().getDetectedAt()).isEqualTo(LocalDateTime.parse("2026-05-13T10:00:00"));
        assertThat(eventCaptor.getValue().getSource()).isEqualTo("ai_model");

        ArgumentCaptor<DashboardAlertResponse> alertCaptor = ArgumentCaptor.forClass(DashboardAlertResponse.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/alerts"), alertCaptor.capture());
        assertThat(alertCaptor.getValue().confidence()).isEqualTo(88);
        assertThat(alertCaptor.getValue().detectedAt()).isEqualTo(LocalDateTime.parse("2026-05-13T10:00:00"));
        assertThat(alertCaptor.getValue().source()).isEqualTo("ai_model");
    }
}
