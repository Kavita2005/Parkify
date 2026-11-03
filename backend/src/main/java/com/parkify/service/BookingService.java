package com.parkify.service;
import com.parkify.domain.*; import com.parkify.repo.Repos.*;
import org.springframework.beans.factory.annotation.Value; import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException; import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.*; import java.time.*; import java.time.temporal.ChronoUnit; import java.util.UUID;

/**
 * Booking lifecycle: PENDING_PAYMENT (slot held 10 min) → CONFIRMED (paid, entry QR issued) → CHECKED_IN (exit QR issued) → COMPLETED.
 * Side branches: CANCELLED, EXPIRED. Events fire after commit (WebSocket, notifications, optional Kafka).
 */
@Service
public class BookingService {
  public static final int HOLD_MINUTES=10;
  /** note = optional extra sentence for the driver's notification (e.g. refund details). */
  public record BookingEvent(String type,Long bookingId,Long userId,Long spaceId,Long lotId,String note){
    public BookingEvent(String type,Long bookingId,Long userId,Long spaceId,Long lotId){ this(type,bookingId,userId,spaceId,lotId,null); }
  }
  private final BookingRepo bookings; private final SpaceRepo spaces; private final LotRepo lots; private final OutboxRepo outbox;
  private final ApplicationEventPublisher events; private final boolean kafka;
  public BookingService(BookingRepo b,SpaceRepo s,LotRepo l,OutboxRepo o,ApplicationEventPublisher ev,@Value("${parkify.kafka-enabled:false}") boolean kafka){
    bookings=b; spaces=s; lots=l; outbox=o; events=ev; this.kafka=kafka; }

  /** One driver can't hold two bookings that overlap in time. Set BLOCK_USER_OVERLAP=false to allow it (e.g. one person with several vehicles). */
  @Value("${parkify.block-user-overlap:false}") private boolean blockUserOverlap = false;   // default: a driver may book as many spaces as they like
  /** A booking must start at least this many minutes from now, so the driver has time to reach the lot. */
  @Value("${parkify.min-lead-minutes:15}") private long minLeadMinutes = 15;
  /** If the entry pass is not scanned within this many minutes after the booked start, the booking becomes NO_SHOW and the payment is kept. */
  @Value("${parkify.no-show-grace-minutes:15}") private long noShowGraceMinutes = 15;

  public static String token(){ return UUID.randomUUID().toString().replace("-","").substring(0,12).toUpperCase(); }

  /** Holds the slot. The booking becomes CONFIRMED only after payment succeeds. */
  @Transactional
  public Booking create(Long userId,Long spaceId,Instant start,Instant end){
    if(!end.isAfter(start)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"End must be after start");
    if(start.isBefore(Instant.now().plus(minLeadMinutes,ChronoUnit.MINUTES)))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Bookings must start at least "+minLeadMinutes+" minutes from now, so you have time to reach the lot.");
    var space=spaces.findById(spaceId).filter(ParkingSpace::isActive)
      .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Space not found"));
    var lot=lots.findById(space.getParkingLotId()).orElseThrow();
    if(!"ACTIVE".equals(lot.getStatus())) throw new ResponseStatusException(HttpStatus.CONFLICT,"Facility not open for booking");
    if(blockUserOverlap&&bookings.existsByUserIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(userId,java.util.List.of("PENDING_PAYMENT","CONFIRMED","CHECKED_IN"),end,start))
      throw new ResponseStatusException(HttpStatus.CONFLICT,"You already have a booking at this time. Cancel it first or pick a different time.");
    long minutes=Duration.between(start,end).toMinutes();
    var amount=space.getHourlyRate().multiply(BigDecimal.valueOf(minutes)).divide(BigDecimal.valueOf(60),2,RoundingMode.HALF_UP);
    var b=new Booking(); b.setUserId(userId); b.setParkingSpaceId(spaceId); b.setStartTime(start); b.setEndTime(end); b.setTotalAmount(amount);
    try{ b=bookings.saveAndFlush(b); }
    catch(DataIntegrityViolationException e){ throw new ResponseStatusException(HttpStatus.CONFLICT,"Space already booked for that time"); }
    event(b,"BOOKING_HELD",space.getParkingLotId()); return b;
  }

  @Transactional
  public Booking markPaid(Long id){
    var b=bookings.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Booking not found"));
    if(!"PENDING_PAYMENT".equals(b.getStatus())) throw new ResponseStatusException(HttpStatus.CONFLICT,"Booking is no longer awaiting payment (it may have expired)");
    b.setStatus("CONFIRMED"); b.setEntryToken(token());
    event(b,"BOOKING_CONFIRMED",lotOf(b)); return b;
  }

  @Transactional
  public Booking cancel(Long userId,boolean admin,Long id){
    var b=bookings.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Booking not found"));
    if(!b.getUserId().equals(userId)&&!admin) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Not your booking");
    if("CANCELLED".equals(b.getStatus())||"EXPIRED".equals(b.getStatus())) return b;
    if("NO_SHOW".equals(b.getStatus())) throw new ResponseStatusException(HttpStatus.CONFLICT,"This booking was cancelled as a no-show. The payment is non-refundable.");
    if(!"PENDING_PAYMENT".equals(b.getStatus())&&!"CONFIRMED".equals(b.getStatus()))
      throw new ResponseStatusException(HttpStatus.CONFLICT,"This booking can't be cancelled after entry");
    b.setStatus("CANCELLED"); event(b,"BOOKING_CANCELLED",lotOf(b)); return b;
  }

  /** Frees slots whose payment wasn't completed within the hold time. */
  @Transactional
  public int expireStale(){
    var stale=bookings.findByStatusAndCreatedAtBefore("PENDING_PAYMENT",Instant.now().minus(HOLD_MINUTES,ChronoUnit.MINUTES));
    for(var b:stale){ b.setStatus("EXPIRED"); event(b,"BOOKING_EXPIRED",lotOf(b)); }
    return stale.size();
  }

  /**
   * Automatic no-show: a CONFIRMED booking whose entry pass was not scanned within the grace period after its start becomes NO_SHOW.
   * The payment is NOT refunded (it stays PAID), the space is released (NO_SHOW no longer blocks the slot), and the driver is notified.
   */
  @Transactional
  public int markNoShows(){
    var late=bookings.findByStatusAndStartTimeBefore("CONFIRMED",Instant.now().minus(noShowGraceMinutes,ChronoUnit.MINUTES));
    for(var b:late){ b.setStatus("NO_SHOW"); event(b,"BOOKING_NO_SHOW",lotOf(b)); }
    return late.size();
  }

  private static BigDecimal nz(BigDecimal x){ return x==null?BigDecimal.ZERO:x; }

  /** Overstay fee accrued up to `at`: hourly rate × minutes beyond the booked end. */
  public BigDecimal overstayFee(Booking b,Instant at){
    long over=Math.max(0,Duration.between(b.getEndTime(),at).toMinutes());
    var rate=spaces.findById(b.getParkingSpaceId()).map(ParkingSpace::getHourlyRate).orElse(BigDecimal.ZERO);
    return rate.multiply(BigDecimal.valueOf(over)).divide(BigDecimal.valueOf(60),2,RoundingMode.HALF_UP);
  }
  /** Fee up to `at` minus what has already been collected. */
  public BigDecimal overstayDue(Booking b,Instant at){ return overstayFee(b,at).subtract(nz(b.getExtraPaid())).max(BigDecimal.ZERO); }

  /** What the driver sees: minutes over, fee so far, and how much to pay now (covers the next 15 minutes so they can walk out). */
  @Transactional(readOnly=true)
  public java.util.Map<String,Object> overstayQuote(Long userId,Long id){
    var b=bookings.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Booking not found"));
    if(!b.getUserId().equals(userId)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Not your booking");
    var now=Instant.now(); long minutes=Math.max(0,Duration.between(b.getEndTime(),now).toMinutes());
    BigDecimal pay=BigDecimal.ZERO;
    if("CHECKED_IN".equals(b.getStatus())&&minutes>0){
      pay=overstayDue(b,now.plus(15,ChronoUnit.MINUTES));
      if(pay.signum()>0&&pay.compareTo(BigDecimal.ONE)<0) pay=BigDecimal.ONE;      // minimum online payment
    }
    var out=new java.util.LinkedHashMap<String,Object>();
    out.put("minutes",minutes); out.put("fee",overstayFee(b,now)); out.put("paid",nz(b.getExtraPaid())); out.put("payAmount",pay);
    return out;
  }

  @Transactional
  public Booking recordOverstayPayment(Long id,BigDecimal amount){
    var b=bookings.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Booking not found"));
    if(!"CHECKED_IN".equals(b.getStatus())) throw new ResponseStatusException(HttpStatus.CONFLICT,"Overstay can only be paid while the vehicle is parked");
    b.setExtraPaid(nz(b.getExtraPaid()).add(amount));
    event(b,"BOOKING_OVERSTAY_PAID",lotOf(b)); return b;
  }

  private Long lotOf(Booking b){ return spaces.findById(b.getParkingSpaceId()).map(ParkingSpace::getParkingLotId).orElse(null); }

  private void event(Booking b,String type,Long lotId){
    events.publishEvent(new BookingEvent(type,b.getId(),b.getUserId(),b.getParkingSpaceId(),lotId));
    if(!kafka) return;
    var e=new OutboxEvent(); e.setAggregateId(String.valueOf(b.getId())); e.setEventType(type);
    e.setPayload("{\"eventId\":\""+UUID.randomUUID()+"\",\"eventType\":\""+type+"\",\"bookingId\":"+b.getId()+
      ",\"userId\":"+b.getUserId()+",\"spaceId\":"+b.getParkingSpaceId()+",\"at\":\""+Instant.now()+"\",\"schemaVersion\":1}");
    outbox.save(e);
  }
}
