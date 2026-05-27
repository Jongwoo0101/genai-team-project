package com.worksight.api.repository;

import com.worksight.api.entity.MeetingParticipant;
import com.worksight.api.entity.MeetingRoom;
import com.worksight.api.entity.Member;
import com.worksight.api.enums.MeetingRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MeetingParticipantRepository extends JpaRepository<MeetingParticipant, Long> {

    /** 특정 회의방의 전체 참가자 조회 */
    List<MeetingParticipant> findAllByMeetingRoom(MeetingRoom meetingRoom);

    /** 특정 회의방의 수락된 참가자 수 */
    int countByMeetingRoomAndRequestStatus(MeetingRoom meetingRoom, MeetingRequestStatus status);

    /** 중복 요청 방지 — 이미 요청/초대 여부 확인 */
    boolean existsByMeetingRoomAndMember(MeetingRoom meetingRoom, Member member);

    /** 특정 회의방에서 특정 멤버의 참가 정보 조회 */
    Optional<MeetingParticipant> findByMeetingRoomAndMember(MeetingRoom meetingRoom, Member member);

    /** 특정 회의방의 PENDING 요청 목록 (주최자가 확인용) */
    List<MeetingParticipant> findAllByMeetingRoomAndRequestStatus(
            MeetingRoom meetingRoom, MeetingRequestStatus status);
}
