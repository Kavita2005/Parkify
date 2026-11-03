package com.parkify.service;
import com.parkify.repo.Repos.OutboxRepo;
import org.slf4j.*; import org.springframework.kafka.core.KafkaTemplate; import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled; import org.springframework.stereotype.Component;
import java.time.Instant; import java.util.concurrent.TimeUnit;

/** Transactional-outbox relay + a sample idempotent notification consumer. */
/** Only active when KAFKA_ENABLED=true. */
@Component @ConditionalOnProperty(name="parkify.kafka-enabled",havingValue="true")
public class OutboxPublisher {
  private static final Logger log=LoggerFactory.getLogger(OutboxPublisher.class);
  private final OutboxRepo outbox; private final KafkaTemplate<String,String> kafka;
  private final java.util.Set<String> seen=java.util.concurrent.ConcurrentHashMap.newKeySet(); // swap for a DB table in production
  public OutboxPublisher(OutboxRepo o,KafkaTemplate<String,String> k){ outbox=o; kafka=k; }

  @Scheduled(fixedDelay=2000)
  public void relay(){
    for(var e:outbox.findTop50ByPublishedAtIsNullOrderByIdAsc()){
      try{ kafka.send("booking-events",e.getAggregateId(),e.getPayload()).get(5,TimeUnit.SECONDS);
           e.setPublishedAt(Instant.now()); outbox.save(e);
      }catch(Exception ex){ log.warn("Outbox publish failed for {}: {}",e.getId(),ex.getMessage()); break; }
    }
  }

  @KafkaListener(topics="booking-events")
  public void onBookingEvent(String payload){
    String id=payload.replaceAll(".*\"eventId\":\"([^\"]+)\".*","$1");
    if(!seen.add(id)) return;                       // idempotent consumer
    log.info("Notification queued for event {}",payload);
  }
}
