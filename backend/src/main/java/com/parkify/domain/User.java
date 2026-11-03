package com.parkify.domain;
import jakarta.persistence.*; import lombok.*; import java.time.Instant;
@Entity @Table(name="users") @Getter @Setter @NoArgsConstructor
public class User {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
  String name;
  @Column(unique=true,nullable=false) String email;
  @Column(name="password_hash",nullable=false) String passwordHash;
  @Enumerated(EnumType.STRING) Role role = Role.DRIVER;
  Boolean enabled = true;
  @Column(name="created_at") Instant createdAt = Instant.now();
}
