package com.worksight.api.dto;

import com.worksight.api.enums.NotificationType;

import java.time.LocalDateTime;

public class NotificationDto {

    /**
     * 알림 발송 요청 (MANAGER → EMPLOYEE)
     * IMPORTANT 타입은 수신자가 WORKING / MEETING 상태일 때만 발송됨
     */
    public record SendNotificationRequest(
            Long receiverId,
            String message,
            NotificationType notificationType
    ) {}

    /** 알림 응답 */
    public record NotificationResponse(
            Long notificationId,
            Long senderId,
            String senderUsername,
            Long receiverId,
            String receiverUsername,
            String message,
            NotificationType notificationType,
            boolean read,
            LocalDateTime createdAt,
            LocalDateTime readAt
    ) {}

    /** 읽지 않은 알림 수 */
    public record UnreadCountResponse(
            long unreadCount
    ) {}
}
