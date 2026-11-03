package com.parkify.domain;
import jakarta.persistence.*; import lombok.*; import java.time.Instant;
@Entity @Table(name="outbox_events") @Getter @Setter @NoArgsConstructor
public class OutboxEvent {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
  @Column(name="aggregate_id") String aggregateId;
  @Column(name="event_type") String eventType;
  @Column(columnDefinition="text") String payload;
  @Column(name="created_at") Instant createdAt = Instant.now();
  @Column(name="published_at") Instant publishedAt;
}
