package com.worksight.api.repository;

import com.worksight.api.entity.WorkEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkEventRepository extends JpaRepository<WorkEvent, Long> {
}