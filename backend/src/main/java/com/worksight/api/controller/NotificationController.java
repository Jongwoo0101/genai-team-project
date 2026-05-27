package com.worksight.api.controller;

import com.worksight.api.dto.NotificationDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * POST /api/notifications
     * 알림 발송 (MANAGER 전용)
     * IMPORTANT 타입은 수신자가 WORKING / MEETING 상태일 때만 발송
     */
    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<NotificationResponse> send(
            @AuthenticationPrincipal Member sender,
            @RequestBody SendNotificationRequest request
    ) {
        return ResponseEntity.ok(notificationService.send(sender, request));
    }

    /**
     * GET /api/notifications
     * 내 알림 전체 조회 (최신순)
     */
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(
            @AuthenticationPrincipal Member member
    ) {
        return ResponseEntity.ok(notificationService.getMyNotifications(member));
    }

    /**
     * GET /api/notifications/unread
     * 읽지 않은 알림만 조회
     */
    @GetMapping("/unread")
    public ResponseEntity<List<NotificationResponse>> getUnreadNotifications(
            @AuthenticationPrincipal Member member
    ) {
        return ResponseEntity.ok(notificationService.getUnreadNotifications(member));
    }

    /**
     * GET /api/notifications/unread/count
     * 읽지 않은 알림 수 조회 (뱃지 표시용)
     */
    @GetMapping("/unread/count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(
            @AuthenticationPrincipal Member member
    ) {
        return ResponseEntity.ok(notificationService.getUnreadCount(member));
    }

    /**
     * PATCH /api/notifications/{notificationId}/read
     * 알림 단건 읽음 처리
     */
    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal Member member
    ) {
        return ResponseEntity.ok(notificationService.markAsRead(notificationId, member));
    }

    /**
     * PATCH /api/notifications/read-all
     * 알림 전체 읽음 처리
     */
    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(
            @AuthenticationPrincipal Member member
    ) {
        notificationService.markAllAsRead(member);
        return ResponseEntity.ok().build();
    }
}
