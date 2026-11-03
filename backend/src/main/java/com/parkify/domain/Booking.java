package com.parkify.domain;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant;
@Entity @Table(name="bookings") @Getter @Setter @NoArgsConstructor
public class Booking {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
  @Column(name="user_id",nullable=false) Long userId;
  @Column(name="parking_space_id",nullable=false) Long parkingSpaceId;
  @Column(name="start_time",nullable=false) Instant startTime;
  @Column(name="end_time",nullable=false) Instant endTime;
  @Column(name="total_amount") BigDecimal totalAmount;
  String status = "PENDING_PAYMENT";   // PENDING_PAYMENT | CONFIRMED | CHECKED_IN | COMPLETED | CANCELLED | EXPIRED
  @Column(name="entry_token") String entryToken;
  @Column(name="exit_token") String exitToken;
  @Column(name="checked_in_at") Instant checkedInAt;
  @Column(name="checked_out_at") Instant checkedOutAt;
  @Column(name="extra_amount") BigDecimal extraAmount;   // overstay charge billed at exit
  @Column(name="extra_paid") BigDecimal extraPaid;
  @Column(name="early_refund") BigDecimal earlyRefund;   // refund for the unused time when the driver leaves early       // overstay money actually collected (online or at gate)
  @Column(name="created_at") Instant createdAt = Instant.now();
}
