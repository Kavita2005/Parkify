package com.parkify.service;
import com.parkify.domain.Notification; import com.parkify.repo.Repos.NotifRepo;
import org.slf4j.*; import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async; import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation; import org.springframework.transaction.annotation.Transactional; import org.springframework.transaction.event.*;
import java.util.Map;

/** Runs in the background after commit: saves a notification and pushes it to that user over WebSocket. */
@Component
public class NotificationListener {
  private static final Logger log=LoggerFactory.getLogger(NotificationListener.class);
  private final NotifRepo repo; private final SimpMessagingTemplate ws;
  public NotificationListener(NotifRepo r,SimpMessagingTemplate ws){ repo=r; this.ws=ws; }

  static String message(String type,Long id){ return message(type,id,null); }
  static String message(String type,Long id,String note){
    return switch(type){
      case "BOOKING_CONFIRMED" -> "Payment received. Booking #"+id+" is confirmed. Your entry pass is ready.";
      case "BOOKING_CANCELLED" -> "Booking #"+id+" was cancelled.";
      case "BOOKING_NO_SHOW" -> "Booking #"+id+" was cancelled because you did not arrive within 15 minutes of your start time. The deposit is non-refundable and has been retained.";
      case "BOOKING_EXPIRED" -> "Booking #"+id+" expired because payment wasn't completed in time.";
      case "BOOKING_OVERSTAY_PAID" -> "Overstay payment received for booking #"+id+". Show your exit pass at the gate.";
      case "BOOKING_CHECKED_IN" -> "Entry recorded for booking #"+id+". Keep your exit pass ready.";
      case "BOOKING_CHECKED_OUT" -> "Exit recorded for booking #"+id+". Thanks for parking with us."+(note==null?"":" "+note);
      default -> null;   // e.g. BOOKING_HELD: no user notification
    };
  }

  @Async @Transactional(propagation=Propagation.REQUIRES_NEW)
  @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT)
  public void on(BookingService.BookingEvent e){
    String msg=message(e.type(),e.bookingId(),e.note()); if(msg==null) return;
    var n=new Notification(); n.setUserId(e.userId()); n.setEventType(e.type()); n.setMessage(msg); repo.save(n);
    ws.convertAndSendToUser(String.valueOf(e.userId()),"/queue/notifications",Map.of("type",e.type(),"bookingId",e.bookingId(),"message",msg));
    log.info("Notification for user {}: {}",e.userId(),msg);   // plug email sending in here
  }
}
