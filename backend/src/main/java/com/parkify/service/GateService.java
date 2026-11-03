package com.parkify.service;
import com.parkify.domain.*; import com.parkify.repo.Repos.*;
import org.springframework.beans.factory.annotation.Value; import org.springframework.context.ApplicationEventPublisher; import org.springframework.http.HttpStatus; import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional; import org.springframework.web.server.ResponseStatusException;
import java.math.*; import java.time.*; import java.time.format.DateTimeFormatter; import java.time.temporal.ChronoUnit; import java.util.*;

/**
 * Gate logic. Entry pass (CONFIRMED) → CHECKED_IN and issues an exit pass.
 * Exit pass → COMPLETED, but only after any overstay fee is settled: online in the driver's app, or collected at the gate by staff.
 */
@Service
public class GateService {
  private final BookingRepo bookings; private final SpaceRepo spaces; private final LotRepo lots; private final JdbcTemplate jdbc;
  private final ApplicationEventPublisher events; private final BookingService bookingService; private final PaymentRepo payments;
  private final RefundRepo refunds;
  public GateService(BookingRepo b,SpaceRepo s,LotRepo l,JdbcTemplate j,ApplicationEventPublisher e,BookingService bs,PaymentRepo p,RefundRepo rf){
    bookings=b; spaces=s; lots=l; jdbc=j; events=e; bookingService=bs; payments=p; refunds=rf; }

  /** The entry pass stops working this many minutes after the booked start (then the booking is a no-show). */
  @Value("${parkify.no-show-grace-minutes:15}") private long noShowGraceMinutes = 15;
  /** Entry opens this many minutes before the booked start (never earlier). */
  @Value("${parkify.entry-early-minutes:15}") private long entryEarlyMinutes = 15;
  @Value("${parkify.timezone:Asia/Kolkata}") private String timezone = "Asia/Kolkata";

  /** Refund for the unused part of the booked time: hourly rate x minutes left (counted from the start if the driver left before it), never more than was paid. */
  static BigDecimal earlyRefund(BigDecimal rate,Instant start,Instant end,Instant now,BigDecimal total){
    if(!now.isBefore(end)) return BigDecimal.ZERO;
    Instant from=now.isAfter(start)?now:start;
    long unused=Math.max(0,Duration.between(from,end).toMinutes());
    return rate.multiply(BigDecimal.valueOf(unused)).divide(BigDecimal.valueOf(60),2,RoundingMode.DOWN).min(total);
  }

  private ResponseStatusException conflict(String m){ return new ResponseStatusException(HttpStatus.CONFLICT,m); }

  @Transactional
  public Map<String,Object> scan(Long staffId,boolean admin,String raw,boolean collectedAtGate){
    String code=raw==null?"":raw.trim().toUpperCase().replaceFirst("^PKFY:","");
    if(code.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Enter or scan a pass code");
    var entry=bookings.findByEntryToken(code);
    Booking b=entry.or(()->bookings.findByExitToken(code)).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Unknown pass code"));
    var space=spaces.findById(b.getParkingSpaceId()).orElseThrow();
    var lot=lots.findById(space.getParkingLotId()).orElseThrow();
    if(!admin&&!lot.getOwnerId().equals(staffId)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"This pass is for a different parking lot");
    Instant now=Instant.now(); var out=new LinkedHashMap<String,Object>(); long over=0;

    if(entry.isPresent()){
      if("NO_SHOW".equals(b.getStatus())) throw conflict("This booking was cancelled as a no-show: the driver did not arrive within "+noShowGraceMinutes+" minutes of the start time.");
      if(!"CONFIRMED".equals(b.getStatus())) throw conflict("Entry pass can't be used now (booking is "+b.getStatus().toLowerCase().replace('_',' ')+")");
      Instant opens=b.getStartTime().minus(entryEarlyMinutes,ChronoUnit.MINUTES);
      if(now.isBefore(opens)) throw conflict("Too early. Entry opens at "+DateTimeFormatter.ofPattern("h:mm a").format(opens.atZone(ZoneId.of(timezone)))
        +" ("+entryEarlyMinutes+" minutes before the booked start). Do not let the vehicle in yet.");
      Instant lateAt=b.getStartTime().plus(noShowGraceMinutes,ChronoUnit.MINUTES);
      if(now.isAfter(lateAt)) throw conflict("Too late. The arrival window closed at "+DateTimeFormatter.ofPattern("h:mm a").format(lateAt.atZone(ZoneId.of(timezone)))
        +" ("+noShowGraceMinutes+" minutes after the booked start). This booking is cancelled as a no-show.");
      b.setStatus("CHECKED_IN"); b.setCheckedInAt(now); b.setExitToken(BookingService.token());
      events.publishEvent(new BookingService.BookingEvent("BOOKING_CHECKED_IN",b.getId(),b.getUserId(),b.getParkingSpaceId(),lot.getId()));
      out.put("result","ENTRY_OK"); out.put("message","Entry allowed. Direct the driver to space "+space.getSpaceNumber()+".");
    } else {
      if(!"CHECKED_IN".equals(b.getStatus())) throw conflict("Exit pass can't be used now (booking is "+b.getStatus().toLowerCase().replace('_',' ')+")");
      BigDecimal fee=bookingService.overstayFee(b,now);
      BigDecimal paid=b.getExtraPaid()==null?BigDecimal.ZERO:b.getExtraPaid();
      BigDecimal due=fee.subtract(paid).max(BigDecimal.ZERO);
      over=Math.max(0,Duration.between(b.getEndTime(),now).toMinutes());

      if(due.signum()>0&&!collectedAtGate){            // not settled yet: do NOT let the vehicle out
        out.put("result","FEE_DUE"); out.put("dueAmount",due);
        out.put("message","Overstay of "+over+" min. ₹"+due+" is due. Ask the driver to pay in the app and scan again, or collect it at the gate.");
        return fill(out,b,lot,space,over);
      }
      if(due.signum()>0){                              // staff collected it in person
        var cash=new Payment(); cash.setBookingId(b.getId()); cash.setProvider("cash"); cash.setMethod("CASH_AT_GATE"); cash.setPurpose("OVERSTAY");
        cash.setAmount(due); cash.setStatus("PAID"); payments.save(cash); b.setExtraPaid(paid.add(due));
      }
      b.setStatus("COMPLETED"); b.setCheckedOutAt(now); b.setExtraAmount(fee);
      // Left early? Refund the unused time. The slot is free for other drivers again right away (COMPLETED no longer blocks it).
      BigDecimal refund=BigDecimal.ZERO; String note=null;
      if(fee.signum()==0){
        refund=earlyRefund(space.getHourlyRate(),b.getStartTime(),b.getEndTime(),now,b.getTotalAmount());
        var pay=payments.findByBookingIdAndStatus(b.getId(),"PAID").stream().filter(x->!"OVERSTAY".equals(x.getPurpose())).findFirst();
        if(refund.compareTo(BigDecimal.ONE)>=0&&pay.isPresent()){
          long unused=Duration.between(now.isAfter(b.getStartTime())?now:b.getStartTime(),b.getEndTime()).toMinutes();
          var r=new Refund(); r.setBookingId(b.getId()); r.setPaymentId(pay.get().getId()); r.setAmount(refund); r.setReason("EARLY_EXIT");
          r.setDueAt(now.plus(2,ChronoUnit.HOURS)); refunds.save(r); b.setEarlyRefund(refund);
          note="You left "+unused+" minutes early, so a refund of ₹"+refund+" for the unused time is being processed and will be issued within 2 hours.";
        } else refund=BigDecimal.ZERO;
      }
      events.publishEvent(new BookingService.BookingEvent("BOOKING_CHECKED_OUT",b.getId(),b.getUserId(),b.getParkingSpaceId(),lot.getId(),note));
      out.put("result","EXIT_OK"); out.put("refundAmount",refund);
      out.put("message",fee.signum()>0?"Exit allowed. Overstay charge of ₹"+fee+" is settled.":refund.signum()>0
        ?"Exit allowed. Left early: ₹"+refund+" for the unused time will be refunded to the driver within 2 hours. The space is free for other drivers again."
        :"Exit allowed. No extra charge. The space is free for other drivers again.");
    }
    bookings.save(b);
    return fill(out,b,lot,space,over);
  }

  private Map<String,Object> fill(Map<String,Object> out,Booking b,ParkingLot lot,ParkingSpace space,long over){
    out.put("bookingId",b.getId()); out.put("lotName",lot.getName()); out.put("spaceNumber",space.getSpaceNumber()); out.put("vehicleType",space.getVehicleType());
    out.put("driverName",jdbc.queryForObject("select name from users where id=?",String.class,b.getUserId()));
    out.put("startTime",b.getStartTime()); out.put("endTime",b.getEndTime()); out.put("overstayMinutes",over); out.put("extraAmount",b.getExtraAmount());
    return out;
  }
}
