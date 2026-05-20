package com.worksight.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 출퇴근 기록 엔티티
 * - CLOCK_IN  : 업무 시작 클릭 시 생성
 * - CLOCK_OUT : 업무 종료 클릭 시 clockOutTime 업데이트
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false)
    private LocalDate workDate;         // 근무 날짜 (당일)

    @Column(nullable = false)
    private LocalDateTime clockInTime;  // 출근 시각

    private LocalDateTime clockOutTime; // 퇴근 시각 (출근 시엔 null)

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Builder
    public WorkLog(Member member, LocalDate workDate, LocalDateTime clockInTime) {
        this.member = member;
        this.workDate = workDate;
        this.clockInTime = clockInTime;
    }

    public void clockOut(LocalDateTime clockOutTime) {
        this.clockOutTime = clockOutTime;
    }

    public boolean isClockedOut() {
        return this.clockOutTime != null;
    }
}
