package com.parkify.domain;
import jakarta.persistence.*; import lombok.*; import java.time.LocalTime;
@Entity @Table(name="parking_lots") @Getter @Setter @NoArgsConstructor
public class ParkingLot {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
  @Column(name="owner_id",nullable=false) Long ownerId;
  String name, address;
  double latitude, longitude;
  String status = "ACTIVE";   // ACTIVE | PENDING | SUSPENDED
  @Column(name="opening_time") LocalTime openingTime = LocalTime.of(0,0);
  @Column(name="closing_time") LocalTime closingTime = LocalTime.of(23,59);
}
