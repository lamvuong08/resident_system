package com.dancu.qlydancu.repo;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.dancu.qlydancu.model.RequestAssignmentHistory;

public interface RequestAssignmentHistoryRepository extends JpaRepository<RequestAssignmentHistory, Long> {
    List<RequestAssignmentHistory> findByRequest_IdOrderByIdAsc(Long requestId);
}
