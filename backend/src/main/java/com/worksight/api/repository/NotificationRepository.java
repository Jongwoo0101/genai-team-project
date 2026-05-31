package com.worksight.api.repository;

import com.worksight.api.entity.Member;
import com.worksight.api.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findAllByReceiverOrderByCreatedAtDesc(Member receiver);

    List<Notification> findAllByReceiverAndReadFalseOrderByCreatedAtDesc(Member receiver);

    long countByReceiverAndReadFalse(Member receiver);

    /**
     * 전체 읽음 처리 벌크 UPDATE
     * 기존: findAllByReceiverAndReadFalse → forEach(markAsRead) → 알림 N건만큼 UPDATE
     * 개선: 단일 UPDATE 쿼리로 처리
     * @Modifying + @Transactional 조합 필요.
     * 호출부(NotificationService)에 @Transactional이 이미 있으므로 문제없음.
     */
    @Modifying
    @Query("""
           UPDATE Notification n
           SET n.read = true, n.readAt = CURRENT_TIMESTAMP
           WHERE n.receiver = :receiver
             AND n.read = false
           """)
    void bulkMarkAllAsRead(@Param("receiver") Member receiver);
}
