package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.ApartmentNote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ApartmentNoteRepository extends JpaRepository<ApartmentNote, Long> {
    List<ApartmentNote> findByApartmentId(Long apartmentId);
}
