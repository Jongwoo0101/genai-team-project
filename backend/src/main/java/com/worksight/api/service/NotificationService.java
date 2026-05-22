package com.worksight.api.service;

import com.worksight.api.dto.NotificationDto.*;
import com.worksight.api.dto.WsEnvelope;
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

    @Transactional
    public NotificationResponse send(Member sender, SendNotificationRequest request) {
        Member managedSender = memberRepository.findById(sender.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        Member receiver = memberRepository.findById(request.receiverId())
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 수신자입니다."));

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

        pushAfterCommit(notification, receiver);

        return toResponse(notification);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(Member member) {
        Member managed = getManagedMember(member);
        return notificationRepository
                .findAllByReceiverOrderByCreatedAtDesc(managed)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getUnreadNotifications(Member member) {
        Member managed = getManagedMember(member);
        return notificationRepository
                .findAllByReceiverAndReadFalseOrderByCreatedAtDesc(managed)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount(Member member) {
        Member managed = getManagedMember(member);
        return new UnreadCountResponse(notificationRepository.countByReceiverAndReadFalse(managed));
    }

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

    @Transactional
    public void markAllAsRead(Member member) {
        Member managed = getManagedMember(member);
        notificationRepository
                .findAllByReceiverAndReadFalseOrderByCreatedAtDesc(managed)
                .forEach(Notification::markAsRead);
    }

    // ── 내부 헬퍼 ────────────────────────────────────────────────

    private void validateReceiverStatus(Member receiver) {
        MemberStatus status = memberStatusRepository.findByMember(receiver)
                .orElse(null);

        if (status == null
                || (status.getStatusType() != StatusType.WORKING
                && status.getStatusType() != StatusType.MEETING)) {
            throw new IllegalStateException(
                    "중요 알림은 수신자가 [근무중] 또는 [회의중] 상태일 때만 발송할 수 있습니다.");
        }
    }

    /** WsEnvelope 표준 구조로 수신자에게 푸시 */
    private void pushAfterCommit(Notification notification, Member receiver) {
        WsEnvelope envelope = WsEnvelope.of(
                WsEnvelope.Event.NOTIFICATION_RECEIVED,
                toResponse(notification)
        );

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messagingTemplate.convertAndSend(
                        "/topic/members/" + receiver.getId(), envelope);
                log.info("Notification pushed: receiverId={}, type={}",
                        receiver.getId(), notification.getNotificationType());
            }
        });
    }

    private Member getManagedMember(Member member) {
        return memberRepository.findById(member.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getSender().getId(), n.getSender().getUsername(),
                n.getReceiver().getId(), n.getReceiver().getUsername(),
                n.getMessage(), n.getNotificationType(),
                n.isRead(), n.getCreatedAt(), n.getReadAt()
        );
    }
}