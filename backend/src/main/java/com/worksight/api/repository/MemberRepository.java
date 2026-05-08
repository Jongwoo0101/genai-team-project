package com.worksight.api.repository;

import com.worksight.api.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByUsername(String username);
    boolean existsByUsername(String username);
    List<Member> findAllByManagerId(Long managerId); // ✅ 추가
}