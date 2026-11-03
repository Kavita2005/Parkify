package com.parkify.repo;
import com.parkify.domain.*;
import org.springframework.data.jpa.repository.*; import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType; import java.time.Instant; import java.util.*;
public class Repos {
  public interface UserRepo extends JpaRepository<User,Long> { Optional<User> findByEmail(String email); boolean existsByRole(Role role); }
  public interface LotRepo extends JpaRepository<ParkingLot,Long> { List<ParkingLot> findByStatus(String status); }
  public interface SpaceRepo extends JpaRepository<ParkingSpace,Long> {
    List<ParkingSpace> findByParkingLotIdAndActiveTrue(Long lotId);
    List<ParkingSpace> findByParkingLotId(Long lotId);
    @Query("""
      select s from ParkingSpace s where s.parkingLotId=:lotId and s.active=true and not exists
      (select b.id from Booking b where b.parkingSpaceId=s.id and b.status in ('PENDING_PAYMENT','CONFIRMED','CHECKED_IN')
        and b.startTime<:end and b.endTime>:start)""")
    List<ParkingSpace> findFree(@Param("lotId") Long lotId,@Param("start") Instant start,@Param("end") Instant end);
  }
  public interface BookingRepo extends JpaRepository<Booking,Long> {
    List<Booking> findByUserIdOrderByStartTimeDesc(Long userId);
    boolean existsByUserIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(Long userId,java.util.Collection<String> statuses,Instant end,Instant start);
    List<Booking> findByStatusAndStartTimeBefore(String status,Instant before);
    boolean existsByParkingSpaceIdAndStatusInAndEndTimeGreaterThan(Long spaceId,java.util.Collection<String> statuses,Instant now);
    Optional<Booking> findByEntryToken(String token);
    Optional<Booking> findByExitToken(String token);
    List<Booking> findByStatusAndCreatedAtBefore(String status,Instant before);
  }
  public interface PaymentRepo extends JpaRepository<Payment,Long> {
    Optional<Payment> findFirstByBookingIdAndStatusOrderByIdDesc(Long bookingId,String status);
    List<Payment> findByBookingIdAndStatus(Long bookingId,String status);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select p from Payment p where p.id=:id") Optional<Payment> lockById(@Param("id") Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select p from Payment p where p.providerOrderId=:o") Optional<Payment> lockByOrderId(@Param("o") String o);
  }
  public interface OutboxRepo extends JpaRepository<OutboxEvent,Long> { List<OutboxEvent> findTop50ByPublishedAtIsNullOrderByIdAsc(); }
  public interface NotifRepo extends JpaRepository<Notification,Long> { List<Notification> findByUserIdOrderByIdDesc(Long userId); }
  public interface RefundRepo extends JpaRepository<Refund,Long> { List<Refund> findByStatusOrderByIdAsc(String status); }
  public interface DemandRepo extends JpaRepository<DemandHistory,Long> { List<DemandHistory> findByParkingLotId(Long lotId); }
}
