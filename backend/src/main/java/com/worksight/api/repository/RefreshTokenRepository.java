package com.worksight.api.repository;

import com.worksight.api.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByMemberId(Long memberId);
    Optional<RefreshToken> findByToken(String token);
    void deleteByMemberId(Long memberId);
}