package com.worksight.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 데일리 스탠드업 엔티티
 * - 하루 1인 1건 (member + date 유니크)
 * - 오늘의 목표(goal): 하루 시작 시 작성
 * - 오늘의 결과(result): 하루 끝 시 작성
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(uniqueConstraints = {
        @UniqueConstraint(columnNames = {"member_id", "standupDate"})
})
public class DailyStandup {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false)
    private LocalDate standupDate;  // 해당 날짜

    @Column(length = 500)
    private String goal;            // 오늘의 목표

    @Column(length = 500)
    private String result;          // 오늘의 결과

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Builder
    public DailyStandup(Member member, LocalDate standupDate, String goal) {
        this.member = member;
        this.standupDate = standupDate;
        this.goal = goal;
    }

    public void updateGoal(String goal) {
        this.goal = goal;
    }

    public void updateResult(String result) {
        this.result = result;
    }
}
