package com.azarclone.repository;

import com.azarclone.model.BlockedDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BlockedDeviceRepository extends JpaRepository<BlockedDevice, Long> {
    boolean existsByDeviceId(String deviceId);
}
