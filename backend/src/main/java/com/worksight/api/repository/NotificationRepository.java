package com.worksight.api.repository;

import com.worksight.api.entity.Member;
import com.worksight.api.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** 수신자의 전체 알림 목록 (최신순) */
    List<Notification> findAllByReceiverOrderByCreatedAtDesc(Member receiver);

    /** 수신자의 읽지 않은 알림 목록 */
    List<Notification> findAllByReceiverAndReadFalseOrderByCreatedAtDesc(Member receiver);

    /** 읽지 않은 알림 수 */
    long countByReceiverAndReadFalse(Member receiver);
}
