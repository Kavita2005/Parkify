package com.parkify.domain;
import jakarta.persistence.*; import lombok.*; import java.time.Instant;
@Entity @Table(name="parking_demand_history") @Getter @Setter @NoArgsConstructor
public class DemandHistory {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
  @Column(name="parking_lot_id") Long parkingLotId;
  @Column(name="observed_at") Instant observedAt;
  @Column(name="occupied_count") int occupiedCount;
  int capacity;
}
