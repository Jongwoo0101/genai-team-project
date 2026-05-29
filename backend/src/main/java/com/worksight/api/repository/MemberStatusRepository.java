package com.worksight.api.repository;

import com.worksight.api.entity.Member;
import com.worksight.api.entity.MemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MemberStatusRepository extends JpaRepository<MemberStatus, Long> {

    Optional<MemberStatus> findByMember(Member member);

    /** 팀 전체 상태 조회 — teamId로 소속 직원 상태 한 번에 조회 */
    @Query("SELECT ms FROM MemberStatus ms JOIN ms.member m WHERE m.team.id = :teamId")
    List<MemberStatus> findAllByTeamId(@Param("teamId") Long teamId);
}
