package com.worksight.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 출근 중복 체크 race condition 방어
 * (member_id, work_date) 유니크 제약 추가
 * WorkLogService에서 SELECT → INSERT 사이 동시 요청이 들어올 경우
 * DB 유니크 제약이 두 번째 INSERT를 막는다.
 * DataIntegrityViolationException → GlobalExceptionHandler에서 409 응답.
 */
@Entity
@Table(
    name = "work_log",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_work_log_member_date", columnNames = {"member_id", "work_date"})
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false)
    private LocalDate workDate;

    @Column(nullable = false)
    private LocalDateTime clockInTime;

    private LocalDateTime clockOutTime;

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
