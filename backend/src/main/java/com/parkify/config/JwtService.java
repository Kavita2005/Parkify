package com.parkify.config;
import io.jsonwebtoken.*; import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value; import org.springframework.stereotype.Service;
import javax.crypto.SecretKey; import java.nio.charset.StandardCharsets; import java.util.Date;
@Service
public class JwtService {
  private final SecretKey key; private final long minutes;
  public JwtService(@Value("${parkify.jwt-secret}") String secret,@Value("${parkify.jwt-minutes}") long minutes){
    this.key=Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); this.minutes=minutes; }
  public String create(Long userId,String role){
    return Jwts.builder().subject(String.valueOf(userId)).claim("role",role)
      .issuedAt(new Date()).expiration(new Date(System.currentTimeMillis()+minutes*60_000)).signWith(key).compact(); }
  public Claims parse(String token){ return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload(); }
}
