package com.worksight.api.entity;

import com.worksight.api.entity.Member;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkEvent {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member employee;

    @Enumerated(EnumType.STRING)
    private EventType eventType;

    @CreationTimestamp
    private LocalDateTime eventTime;

    @Builder
    public WorkEvent(Member employee, EventType eventType) {
        this.employee = employee;
        this.eventType = eventType;
    }
}