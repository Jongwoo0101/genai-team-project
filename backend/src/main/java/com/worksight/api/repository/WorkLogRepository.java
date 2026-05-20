package com.worksight.api.repository;

import com.worksight.api.entity.Member;
import com.worksight.api.entity.WorkLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface WorkLogRepository extends JpaRepository<WorkLog, Long> {

    /** 당일 출근 기록 조회 (퇴근 처리 및 중복 출근 방지용) */
    Optional<WorkLog> findByMemberAndWorkDate(Member member, LocalDate workDate);
}
