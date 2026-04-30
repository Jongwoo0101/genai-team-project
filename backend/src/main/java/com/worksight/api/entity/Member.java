package com.worksight.api.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true) // 같은 아이디 중복 가입 방지
    private String username;
    private String password;

    @Enumerated(EnumType.STRING)
    private Role role;

    private Long virtualBalance; // 가상 머니

    @Builder
    public Member(String username, String password, Role role) {
        this.username = username;
        this.password = password;
        this.role = role;
        this.virtualBalance = 10000L; // 가입 시 기본 지급
    }
}