package com.worksight.api.dto;

import com.worksight.api.enums.MeetingRequestStatus;

import java.time.LocalDateTime;
import java.util.List;

public class MeetingRoomDto {

    /** 미팅룸 생성 요청 */
    public record CreateMeetingRoomRequest(
            String title
    ) {}

    /** 미팅룸 목록 조회 응답 (팀 전체에 노출) */
    public record MeetingRoomResponse(
            Long roomId,
            String title,
            Long hostId,
            String hostUsername,
            boolean active,
            int participantCount,
            LocalDateTime createdAt
    ) {}

    /** 미팅룸 상세 조회 응답 */
    public record MeetingRoomDetailResponse(
            Long roomId,
            String title,
            Long hostId,
            String hostUsername,
            boolean active,
            List<ParticipantInfo> participants,
            LocalDateTime createdAt
    ) {}

    /** 참가자 정보 */
    public record ParticipantInfo(
            Long memberId,
            String username,
            MeetingRequestStatus requestStatus,
            boolean invited
    ) {}

    /** 참가 요청 응답 */
    public record MeetingRequestResponse(
            Long participantId,
            Long roomId,
            Long memberId,
            String username,
            MeetingRequestStatus requestStatus
    ) {}

    /** 주최자 초대 요청 */
    public record InviteMemberRequest(
            Long memberId
    ) {}

    /** 요청 수락/거절 요청 */
    public record RespondToRequestRequest(
            boolean accept  // true = 수락, false = 거절
    ) {}
}
