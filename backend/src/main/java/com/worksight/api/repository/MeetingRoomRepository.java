package com.worksight.api.repository;

import com.worksight.api.entity.MeetingRoom;
import com.worksight.api.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MeetingRoomRepository extends JpaRepository<MeetingRoom, Long> {

    /** 팀(managerId 기준) 진행 중인 미팅룸 목록 조회 */
    @Query("""
        SELECT mr FROM MeetingRoom mr
        WHERE mr.active = true
        AND (mr.host.managerId = :managerId OR mr.host.id = :managerId)
        ORDER BY mr.createdAt DESC
    """)
    List<MeetingRoom> findActiveRoomsByManagerId(@Param("managerId") Long managerId);

    /** 호스트가 현재 진행 중인 회의방이 있는지 확인 */
    boolean existsByHostAndActiveTrue(Member host);
}
