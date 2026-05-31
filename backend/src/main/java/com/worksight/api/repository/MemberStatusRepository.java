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

    /**
     * 팀 전체 상태 조회 — 관리자 본인 포함
     * Team 엔티티 도입에 따라 teamId 기반 쿼리로 변경.
     * 팀원(m.team.id = :teamId) + 팀 관리자(team.manager.id = m.id) 모두 포함.
     * 기존(managerId 기반):
     *   WHERE m.managerId = :managerId
     *   → 관리자 본인(m.id = managerId)이 누락됨
     * 개선(teamId 기반):
     *   WHERE m.team.id = :teamId OR (team.manager.id = m.id AND team.id = :teamId)
     *   → 팀원 + 관리자 모두 포함
     * 단, Team 엔티티 구조상 관리자는 team.manager이고 팀원은 team.members 이므로
     * 아래처럼 team을 JOIN해서 manager.id도 포함하도록 처리.
     */
    @Query("""
           SELECT ms FROM MemberStatus ms
           JOIN ms.member m
           LEFT JOIN Team t ON t.id = :teamId
           WHERE m.team.id = :teamId
              OR (t.manager.id = m.id AND t.id = :teamId)
           """)
    List<MemberStatus> findAllByTeamId(@Param("teamId") Long teamId);
}
