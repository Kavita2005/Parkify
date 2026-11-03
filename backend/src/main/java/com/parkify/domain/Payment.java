package com.parkify.domain;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant;
@Entity @Table(name="payments") @Getter @Setter @NoArgsConstructor
public class Payment {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
  @Column(name="booking_id",nullable=false) Long bookingId;
  String provider;
  @Column(name="provider_order_id") String providerOrderId;
  @Column(name="provider_payment_id") String providerPaymentId;
  String method;
  @Column(length=20) String purpose = "BOOKING";   // BOOKING | OVERSTAY
  @Column(nullable=false) BigDecimal amount;
  String status = "CREATED";   // CREATED | PAID | FAILED | REFUNDED
  @Column(name="created_at") Instant createdAt = Instant.now();
}
