package com.worksight.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member implements UserDetails {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String username;
    private String password;

    @Enumerated(EnumType.STRING)
    private Role role;

    private Long virtualBalance;
    private Long managerId; // 팀 매핑용

    @Builder
    public Member(String username, String password, Role role) {
        this.username = username;
        this.password = password;
        this.role = role;
        this.virtualBalance = 10000L;
    }

    public void linkManager(Long managerId) {
        this.managerId = managerId;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override public String getPassword()   { return password; }
    @Override public String getUsername()   { return username; }

}