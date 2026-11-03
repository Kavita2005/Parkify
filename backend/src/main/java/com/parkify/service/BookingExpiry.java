package com.parkify.service;
import org.springframework.scheduling.annotation.Scheduled; import org.springframework.stereotype.Component;
@Component
public class BookingExpiry {
  private final BookingService svc; public BookingExpiry(BookingService s){ svc=s; }
  @Scheduled(fixedDelay=30_000) public void run(){ svc.expireStale(); svc.markNoShows(); }
}
