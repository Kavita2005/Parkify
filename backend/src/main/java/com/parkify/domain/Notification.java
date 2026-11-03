package com.parkify.domain;
import jakarta.persistence.*; import lombok.*; import java.time.Instant;
@Entity @Table(name="notifications") @Getter @Setter @NoArgsConstructor
public class Notification {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
  @Column(name="user_id") Long userId;
  @Column(name="event_type") String eventType;
  String message;
  String status = "SENT";
  @Column(name="created_at") Instant createdAt = Instant.now();
}
