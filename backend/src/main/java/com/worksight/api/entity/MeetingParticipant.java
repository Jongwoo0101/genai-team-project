package com.worksight.api.entity;

import com.worksight.api.enums.MeetingRequestStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 미팅룸 참가자 엔티티
 * - 참가 요청(사용자 → 주최자) 또는 초대(주최자 → 사용자) 모두 이 테이블로 관리
 * - isInvited: true = 주최자가 초대 / false = 사용자가 참가 요청
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingParticipant {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_room_id", nullable = false)
    private MeetingRoom meetingRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MeetingRequestStatus requestStatus; // PENDING / ACCEPTED / REJECTED

    /** true = 주최자 초대 / false = 사용자 참가 요청 */
    @Column(nullable = false)
    private boolean invited;

    @CreationTimestamp
    private LocalDateTime requestedAt;

    private LocalDateTime respondedAt;

    @Builder
    public MeetingParticipant(MeetingRoom meetingRoom, Member member,
                               MeetingRequestStatus requestStatus, boolean invited) {
        this.meetingRoom = meetingRoom;
        this.member = member;
        this.requestStatus = requestStatus;
        this.invited = invited;
    }

    public void accept() {
        this.requestStatus = MeetingRequestStatus.ACCEPTED;
        this.respondedAt = LocalDateTime.now();
    }

    public void reject() {
        this.requestStatus = MeetingRequestStatus.REJECTED;
        this.respondedAt = LocalDateTime.now();
    }
}
