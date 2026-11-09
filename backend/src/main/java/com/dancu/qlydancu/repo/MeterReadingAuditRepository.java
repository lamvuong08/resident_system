package com.dancu.qlydancu.repo;
import com.dancu.qlydancu.model.MeterReadingAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface MeterReadingAuditRepository extends JpaRepository<MeterReadingAudit,Long> {
    List<MeterReadingAudit> findByReadingIdOrderByIdAsc(Long readingId);
}
