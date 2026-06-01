package com.worksight.api.controller;

import com.worksight.api.dto.MeetingRoomDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.service.MeetingRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
public class MeetingRoomController {

    private final MeetingRoomService meetingRoomService;

    /** POST /api/meetings — 미팅룸 생성 */
    @PostMapping
    public ResponseEntity<MeetingRoomResponse> createRoom(
            @AuthenticationPrincipal Member member,
            @RequestBody CreateMeetingRoomRequest request
    ) {
        return ResponseEntity.ok(meetingRoomService.createRoom(member, request));
    }

    /** GET /api/meetings — 진행 중인 미팅룸 목록 조회 */
    @GetMapping
    public ResponseEntity<List<MeetingRoomResponse>> getActiveRooms(
            @AuthenticationPrincipal Member member,
            @RequestParam(required = false) Long teamId // 다중 팀 조회를 위한 파라미터
    ) {
        return ResponseEntity.ok(meetingRoomService.getActiveRooms(member, teamId));
    }

    /** GET /api/meetings/{roomId} — 미팅룸 상세 조회 */
    @GetMapping("/{roomId}")
    public ResponseEntity<MeetingRoomDetailResponse> getRoomDetail(
            @PathVariable Long roomId
    ) {
        return ResponseEntity.ok(meetingRoomService.getRoomDetail(roomId));
    }

    /** POST /api/meetings/{roomId}/join-request — 참가 요청 (사용자 → 주최자) */
    @PostMapping("/{roomId}/join-request")
    public ResponseEntity<MeetingRequestResponse> requestJoin(
            @PathVariable Long roomId,
            @AuthenticationPrincipal Member member
    ) {
        return ResponseEntity.ok(meetingRoomService.requestJoin(roomId, member));
    }

    /** POST /api/meetings/{roomId}/invite — 주최자 초대 */
    @PostMapping("/{roomId}/invite")
    public ResponseEntity<MeetingRequestResponse> inviteMember(
            @PathVariable Long roomId,
            @AuthenticationPrincipal Member host,
            @RequestBody InviteMemberRequest request
    ) {
        return ResponseEntity.ok(meetingRoomService.inviteMember(roomId, host, request));
    }

    /** PUT /api/meetings/{roomId}/requests/{participantId} — 참가 요청 수락/거절 (주최자) */
    @PutMapping("/{roomId}/requests/{participantId}")
    public ResponseEntity<MeetingRequestResponse> respondToRequest(
            @PathVariable Long roomId,
            @PathVariable Long participantId,
            @AuthenticationPrincipal Member host,
            @RequestBody RespondToRequestRequest request
    ) {
        return ResponseEntity.ok(
                meetingRoomService.respondToRequest(roomId, participantId, host, request));
    }

    /** PUT /api/meetings/{roomId}/invite-response — 초대 수락/거절 (초대받은 사용자) */
    @PutMapping("/{roomId}/invite-response")
    public ResponseEntity<MeetingRequestResponse> respondToInvite(
            @PathVariable Long roomId,
            @AuthenticationPrincipal Member member,
            @RequestBody RespondToRequestRequest request
    ) {
        return ResponseEntity.ok(meetingRoomService.respondToInvite(roomId, member, request));
    }

    /** DELETE /api/meetings/{roomId} — 미팅룸 종료 (주최자만) */
    @DeleteMapping("/{roomId}")
    public ResponseEntity<Void> endRoom(
            @PathVariable Long roomId,
            @AuthenticationPrincipal Member host
    ) {
        meetingRoomService.endRoom(roomId, host);
        return ResponseEntity.ok().build();
    }

    /** DELETE /api/meetings/{roomId}/leave — 회의 나가기 (참가자) */
    @DeleteMapping("/{roomId}/leave")
    public ResponseEntity<Void> leaveRoom(
            @PathVariable Long roomId,
            @AuthenticationPrincipal Member member
    ) {
        meetingRoomService.leaveRoom(roomId, member);
        return ResponseEntity.ok().build();
    }
}