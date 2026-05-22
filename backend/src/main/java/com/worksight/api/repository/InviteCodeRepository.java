package com.worksight.api.repository;

import com.worksight.api.entity.InviteCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InviteCodeRepository extends JpaRepository<InviteCode, Long> {

    /**
     * 아직 사용되지 않은(used = false) 특정 초대 코드를 조회합니다.
     * MemberService의 joinTeam 메서드에서 사용됩니다.
     */
    Optional<InviteCode> findByCodeAndUsedFalse(String code);
}