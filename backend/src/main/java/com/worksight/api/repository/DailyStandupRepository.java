package com.worksight.api.repository;

import com.worksight.api.entity.DailyStandup;
import com.worksight.api.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyStandupRepository extends JpaRepository<DailyStandup, Long> {

    /** 특정 날짜 본인 스탠드업 조회 */
    Optional<DailyStandup> findByMemberAndStandupDate(Member member, LocalDate standupDate);

    /** 팀 전체 특정 날짜 스탠드업 조회 (managerId 기준) */
    @Query("""
        SELECT ds FROM DailyStandup ds
        JOIN ds.member m
        WHERE (m.managerId = :managerId OR m.id = :managerId)
        AND ds.standupDate = :date
        ORDER BY m.username ASC
    """)
    List<DailyStandup> findTeamStandupsByDate(
            @Param("managerId") Long managerId,
            @Param("date") LocalDate date
    );
}
