package com.azarclone.repository;

import com.azarclone.model.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    long countByReportedDeviceId(String reportedDeviceId);
}
