package com.worksight.api.service;

import com.worksight.api.dto.NotificationDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.MemberStatus;
import com.worksight.api.entity.Notification;
import com.worksight.api.enums.NotificationType;
import com.worksight.api.enums.StatusType;
import com.worksight.api.repository.MemberRepository;
import com.worksight.api.repository.MemberStatusRepository;
import com.worksight.api.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.NoSuchElementException;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final MemberRepository memberRepository;
    private final MemberStatusRepository memberStatusRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 알림 발송 (MANAGER → EMPLOYEE)
     *
     * IMPORTANT 알림 발송 조건:
     *   - 수신자 상태가 WORKING 또는 MEETING 일 때만 발송
     *   - 그 외 상태(AWAY, FOCUS, OFFLINE)면 예외 발생
     *
     * GENERAL 알림: 상태 무관 항상 발송
     */
    @Transactional
    public NotificationResponse send(Member sender, SendNotificationRequest request) {
        Member managedSender = memberRepository.findById(sender.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        Member receiver = memberRepository.findById(request.receiverId())
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 수신자입니다."));

        // IMPORTANT 알림: 수신자 상태 검증
        if (request.notificationType() == NotificationType.IMPORTANT) {
            validateReceiverStatus(receiver);
        }

        Notification notification = Notification.builder()
                .sender(managedSender)
                .receiver(receiver)
                .message(request.message())
                .notificationType(request.notificationType())
                .build();

        notificationRepository.save(notification);

        log.info("Notification sent: senderId={}, receiverId={}, type={}",
                managedSender.getId(), receiver.getId(), request.notificationType());

        // 커밋 후 수신자에게 WebSocket 실시간 푸시
        pushAfterCommit(notification, receiver);

        return toResponse(notification);
    }

    /**
     * 내 알림 전체 조회 (최신순)
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(Member member) {
        Member managed = memberRepository.findById(member.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        return notificationRepository
                .findAllByReceiverOrderByCreatedAtDesc(managed)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * 읽지 않은 알림만 조회
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getUnreadNotifications(Member member) {
        Member managed = memberRepository.findById(member.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        return notificationRepository
                .findAllByReceiverAndReadFalseOrderByCreatedAtDesc(managed)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * 읽지 않은 알림 수 조회
     */
    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount(Member member) {
        Member managed = memberRepository.findById(member.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        return new UnreadCountResponse(
                notificationRepository.countByReceiverAndReadFalse(managed)
        );
    }

    /**
     * 알림 읽음 처리 (단건)
     */
    @Transactional
    public NotificationResponse markAsRead(Long notificationId, Member member) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 알림입니다."));

        if (!notification.getReceiver().getId().equals(member.getId())) {
            throw new IllegalArgumentException("본인의 알림만 읽음 처리할 수 있습니다.");
        }

        notification.markAsRead();
        return toResponse(notification);
    }

    /**
     * 알림 전체 읽음 처리
     */
    @Transactional
    public void markAllAsRead(Member member) {
        Member managed = memberRepository.findById(member.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        notificationRepository
                .findAllByReceiverAndReadFalseOrderByCreatedAtDesc(managed)
                .forEach(Notification::markAsRead);
    }

    // ── 내부 헬퍼 ────────────────────────────────────────────────

    /**
     * IMPORTANT 알림 발송 시 수신자 상태 검증
     * WORKING / MEETING 상태일 때만 발송 허용
     */
    private void validateReceiverStatus(Member receiver) {
        MemberStatus status = memberStatusRepository.findByMember(receiver)
                .orElseThrow(() -> new IllegalStateException(
                        "수신자의 상태 정보가 없습니다. 출근 후 사용 가능합니다."));

        StatusType currentStatus = status.getStatusType();
        if (currentStatus != StatusType.WORKING && currentStatus != StatusType.MEETING) {
            throw new IllegalStateException(
                    "중요 알림은 수신자가 [근무중] 또는 [회의중] 상태일 때만 발송할 수 있습니다. " +
                    "현재 상태: " + currentStatus.name()
            );
        }
    }

    /**
     * 커밋 후 수신자에게 WebSocket 실시간 푸시
     * - /topic/members/{receiverId} 로 전송
     * - IMPORTANT 알림은 프론트에서 모니터 팝업 or 모바일 푸시 트리거
     */
    private void pushAfterCommit(Notification notification, Member receiver) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messagingTemplate.convertAndSend(
                        "/topic/members/" + receiver.getId(),
                        toResponse(notification)
                );
                log.info("Notification pushed: receiverId={}, type={}",
                        receiver.getId(), notification.getNotificationType());
            }
        });
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getSender().getId(),
                n.getSender().getUsername(),
                n.getReceiver().getId(),
                n.getReceiver().getUsername(),
                n.getMessage(),
                n.getNotificationType(),
                n.isRead(),
                n.getCreatedAt(),
                n.getReadAt()
        );
    }
}
