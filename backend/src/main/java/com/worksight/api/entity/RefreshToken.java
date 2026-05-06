package com.worksight.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 한 멤버당 하나의 refresh token만 유지
    @Column(nullable = false, unique = true)
    private Long memberId;

    @Column(nullable = false)
    private String token;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Builder
    public RefreshToken(Long memberId, String token, LocalDateTime expiresAt) {
        this.memberId = memberId;
        this.token = token;
        this.expiresAt = expiresAt;
    }

    public void rotate(String newToken, LocalDateTime newExpiresAt) {
        this.token = newToken;
        this.expiresAt = newExpiresAt;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}