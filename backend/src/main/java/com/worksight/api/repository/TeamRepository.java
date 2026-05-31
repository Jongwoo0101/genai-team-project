package com.worksight.api.repository;

import com.worksight.api.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List; // List 임포트 꼭 추가해줘!
import java.util.Optional;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {

    // 관리자가 소유한 가장 최근 팀 조회
    Optional<Team> findFirstByManagerIdOrderByIdDesc(Long managerId);

    // [신규 추가] 관리자가 소유한 모든 팀 목록 조회
    List<Team> findAllByManagerId(Long managerId);
}