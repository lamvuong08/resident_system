package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.Otp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpRepository extends JpaRepository<Otp, Long> {
    Optional<Otp> findFirstByEmailAndPurposeOrderByIdDesc(String email, String purpose);
    void deleteByEmailAndPurpose(String email, String purpose);
}
