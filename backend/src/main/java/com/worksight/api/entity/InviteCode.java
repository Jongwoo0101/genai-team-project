package com.worksight.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "invite_codes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class InviteCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    // 기존 managerId를 제거하고, 어떤 팀으로 초대하는 코드인지 Team 연관관계 추가
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Column(nullable = false)
    private Instant expiresAt;

    // 만료 여부 확인 편의 메서드 (Instant 기준)
    public boolean isExpired() {
        return Instant.now().isAfter(this.expiresAt);
    }
}