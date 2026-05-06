package com.worksight.api.security;

import com.worksight.api.entity.RefreshToken;
import com.worksight.api.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration; // ms 단위

    // 저장 또는 갱신 (rotate)
    @Transactional
    public void save(Long memberId, String token) {
        LocalDateTime expiresAt = LocalDateTime.now()
                .plusSeconds(refreshExpiration / 1000);

        refreshTokenRepository.findByMemberId(memberId)
                .ifPresentOrElse(
                        rt -> rt.rotate(token, expiresAt),
                        () -> refreshTokenRepository.save(
                                RefreshToken.builder()
                                        .memberId(memberId)
                                        .token(token)
                                        .expiresAt(expiresAt)
                                        .build()
                        )
                );
    }

    // 토큰 문자열로 조회 + 유효성 검증
    @Transactional(readOnly = true)
    public RefreshToken validate(String token) {
        RefreshToken rt = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 refresh token입니다."));

        if (rt.isExpired()) {
            throw new IllegalArgumentException("만료된 refresh token입니다. 다시 로그인해주세요.");
        }
        return rt;
    }

    @Transactional
    public void deleteByMemberId(Long memberId) {
        refreshTokenRepository.deleteByMemberId(memberId);
    }
}