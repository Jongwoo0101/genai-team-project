package com.worksight.api.repository;

import com.worksight.api.entity.InviteCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InviteCodeRepository extends JpaRepository<InviteCode, Long> {

    /**
     * 특정 초대 코드를 조회합니다.
     * 만료 여부는 Service 단의 시간(expiresAt) 검증을 통해 확인합니다.
     */
    Optional<InviteCode> findByCode(String code);
}