package com.parkify.service;
import org.springframework.messaging.simp.SimpMessagingTemplate; import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component; import org.springframework.transaction.event.*;
import java.time.Instant; import java.util.Map;

/** Tells every connected browser that availability changed, so lists and maps refresh without a page reload. */
@Component
public class RealtimeBroadcaster {
  private final SimpMessagingTemplate ws; public RealtimeBroadcaster(SimpMessagingTemplate ws){ this.ws=ws; }
  @Async @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT)
  public void on(BookingService.BookingEvent e){
    ws.convertAndSend("/topic/availability",Map.of("lotId",e.lotId()==null?0:e.lotId(),"type",e.type(),"at",Instant.now().toString()));
  }
}
