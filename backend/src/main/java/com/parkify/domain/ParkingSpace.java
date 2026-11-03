package com.parkify.domain;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal;
@Entity @Table(name="parking_spaces") @Getter @Setter @NoArgsConstructor
public class ParkingSpace {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
  @Column(name="parking_lot_id",nullable=false) Long parkingLotId;
  @Column(name="space_number") String spaceNumber;
  @Column(name="vehicle_type") String vehicleType = "CAR";
  @Column(name="hourly_rate",nullable=false) BigDecimal hourlyRate;
  boolean active = true;
}
