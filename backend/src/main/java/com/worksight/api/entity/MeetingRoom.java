package com.worksight.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 미팅룸 엔티티
 * - 주최자가 생성하며, 회의 주제(title)가 미팅룸 제목으로 노출됨
 * - isActive: true = 진행중 / false = 종료
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingRoom {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 회의 주제 — 미팅룸 목록에 제목으로 노출 */
    @Column(nullable = false)
    private String title;

    /** 주최자 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id", nullable = false)
    private Member host;

    /** 진행 중 여부 */
    @Column(nullable = false)
    private boolean active;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime endedAt;

    @Builder
    public MeetingRoom(String title, Member host) {
        this.title = title;
        this.host = host;
        this.active = true;
    }

    public void end() {
        this.active = false;
        this.endedAt = LocalDateTime.now();
    }
}
