package com.azarclone.repository;

import com.azarclone.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findBySessionToken(String sessionToken);
    Optional<Session> findByStompSessionId(String stompSessionId);
    void deleteBySessionToken(String sessionToken);

    /** Fetch all searching sessions eagerly loading their User for matchmaking */
    @Query("SELECT s FROM Session s JOIN FETCH s.user WHERE s.status = 'SEARCHING' ORDER BY s.queueJoinedAt ASC")
    List<Session> findAllSearchingWithUser();

    /** Count sessions that are not DISCONNECTED (i.e. active users) */
    @Query("SELECT COUNT(s) FROM Session s WHERE s.status <> 'DISCONNECTED'")
    long countActiveUsers();

    /** Count sessions currently searching */
    @Query("SELECT COUNT(s) FROM Session s WHERE s.status = 'SEARCHING'")
    long countSearching();

    /** Count distinct countries among active sessions */
    @Query("SELECT COUNT(DISTINCT s.user.country) FROM Session s WHERE s.status <> 'DISCONNECTED'")
    long countDistinctCountries();

    /** Average wait time in seconds for sessions currently searching */
    @Query("SELECT COALESCE(AVG(TIMESTAMPDIFF(SECOND, s.queueJoinedAt, CURRENT_TIMESTAMP)), 0) FROM Session s WHERE s.status = 'SEARCHING' AND s.queueJoinedAt IS NOT NULL")
    double averageWaitTimeSeconds();
}
