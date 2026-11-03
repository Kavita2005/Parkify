package com.parkify.domain;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant;
/** Money returned to a driver, for example for the unused time after leaving early. Issued by a background job. */
@Entity @Table(name="refunds") @Getter @Setter @NoArgsConstructor
public class Refund {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
  @Column(name="booking_id",nullable=false) Long bookingId;
  @Column(name="payment_id",nullable=false) Long paymentId;
  @Column(nullable=false) BigDecimal amount;
  @Column(length=30) String reason = "EARLY_EXIT";
  @Column(length=20) String status = "PENDING";      // PENDING | REFUNDED | FAILED
  @Column(name="due_at") Instant dueAt;               // we aim to issue the refund before this time (2 hours after exit)
  @Column(name="processed_at") Instant processedAt;
  int attempts;
  @Column(name="last_error") String lastError;
  @Column(name="created_at") Instant createdAt = Instant.now();
}
