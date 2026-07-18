package com.azarclone.repository;

import com.azarclone.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findBySessionId(String sessionId);
    Optional<User> findByDeviceId(String deviceId);
    Optional<User> findByEmail(String email);
    Optional<User> findByGoogleId(String googleId);

    @Query("SELECT COALESCE(AVG(u.totalCallDurationSeconds / u.totalMatches), 0) FROM User u WHERE u.totalMatches > 0")
    double averageCallDurationSeconds();

    @Query("SELECT u.country, COUNT(u) FROM User u GROUP BY u.country ORDER BY COUNT(u) DESC")
    List<Object[]> findCountryDistribution();
}
