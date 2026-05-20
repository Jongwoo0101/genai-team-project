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

    private Integer confidence;
    private LocalDateTime detectedAt;
    private String source;

    @CreationTimestamp
    private LocalDateTime eventTime;

    @Builder
    public WorkEvent(Member employee, EventType eventType, Integer confidence, LocalDateTime detectedAt, String source) {
        this.employee = employee;
        this.eventType = eventType;
        this.confidence = confidence;
        this.detectedAt = detectedAt;
        this.source = source;
    }
}
