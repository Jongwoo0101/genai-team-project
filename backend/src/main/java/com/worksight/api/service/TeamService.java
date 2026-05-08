package com.worksight.api.service;

import com.worksight.api.dto.TeamDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.Role;
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
     // 관리자가 자신의 팀 소속 직원 목록 조회
    @Transactional(readOnly = true)
    public List<TeamMemberResponse> getTeamMembers(Long managerId, Member manager) {

        // 본인 팀만 조회 가능
        if (!manager.getId().equals(managerId)) {
            throw new IllegalArgumentException("본인 팀의 멤버만 조회할 수 있습니다.");
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