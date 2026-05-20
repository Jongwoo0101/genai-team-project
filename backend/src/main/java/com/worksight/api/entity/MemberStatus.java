package com.worksight.api.entity;

import com.worksight.api.enums.StatusType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 팀원의 현재 상태 엔티티 (1인 1레코드)
 * - AI 판별 결과 또는 사용자 수동 설정으로 업데이트
 * - WebSocket 브로드캐스트 대상
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberStatus {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false, unique = true)
    private Member member;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusType statusType;      // 현재 상태

    private LocalDateTime updatedAt;    // 마지막 상태 변경 시각

    @Builder
    public MemberStatus(Member member, StatusType statusType) {
        this.member = member;
        this.statusType = statusType;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateStatus(StatusType statusType) {
        this.statusType = statusType;
        this.updatedAt = LocalDateTime.now();
    }
}
