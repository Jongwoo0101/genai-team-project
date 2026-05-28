package com.worksight.api.service;

import com.worksight.api.dto.TeamDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.enums.Role;
import com.worksight.api.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final MemberRepository memberRepository;

    /**
     * GET /api/teams/my-team
     * 직원이 자신이 소속된 팀(관리자 정보) 조회
     */
    @Transactional(readOnly = true)
    public MyTeamResponse getMyTeam(Member employee) {

        if (employee.getManagerId() == null) {
            throw new IllegalStateException("아직 팀에 소속되지 않았습니다.");
        }

        Member manager = memberRepository.findById(employee.getManagerId())
                .orElseThrow(() -> new NoSuchElementException("소속된 팀의 관리자를 찾을 수 없습니다."));

        return new MyTeamResponse(
                manager.getId(),
                manager.getUsername()
        );
    }


     // GET /api/teams/{managerId}/members
     // 팀 소속 직원 목록 조회 (관리자 및 해당 팀 소속 직원)
    @Transactional(readOnly = true)
    public List<TeamMemberResponse> getTeamMembers(Long managerId, Member member) {

        // 매니저인 경우 본인 팀인지 확인, 직원인 경우 본인이 속한 팀의 매니저인지 확인
        if (member.getRole() == Role.MANAGER && !member.getId().equals(managerId)) {
            throw new IllegalArgumentException("본인 팀의 멤버만 조회할 수 있습니다.");
        } else if (member.getRole() == Role.EMPLOYEE && !managerId.equals(member.getManagerId())) {
            throw new IllegalArgumentException("본인 소속 팀의 멤버만 조회할 수 있습니다.");
        }

        return memberRepository.findAllByManagerId(managerId)
                .stream()
                .map(m -> new TeamMemberResponse(
                        m.getId(),
                        m.getUsername(),
                        m.getRole(),
                        m.getVirtualBalance()
                ))
                .toList();
    }
}