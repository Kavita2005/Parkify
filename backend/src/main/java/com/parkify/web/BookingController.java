package com.parkify.web;
import com.parkify.domain.Booking; import com.parkify.repo.Repos.BookingRepo; import com.parkify.service.BookingService;
import jakarta.validation.Valid; import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus; import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*; import org.springframework.web.server.ResponseStatusException;
import java.time.Instant; import java.util.List;

@RestController @RequestMapping("/api/v1/bookings")
public class BookingController {
  record BookReq(@NotNull Long parkingSpaceId,@NotNull Instant startTime,@NotNull Instant endTime){}
  private final BookingService svc; private final BookingRepo repo; private final org.springframework.jdbc.core.JdbcTemplate jdbc; private final com.parkify.service.PaymentService payments;
  public BookingController(BookingService s,BookingRepo r,org.springframework.jdbc.core.JdbcTemplate j,com.parkify.service.PaymentService p){ svc=s; repo=r; jdbc=j; payments=p; }

  @PostMapping @ResponseStatus(HttpStatus.CREATED)
  Booking create(@Valid @RequestBody BookReq r,Authentication a){ return svc.create((Long)a.getPrincipal(),r.parkingSpaceId(),r.startTime(),r.endTime()); }
  @GetMapping("/me") List<java.util.Map<String,Object>> mine(Authentication a){
    return jdbc.queryForList("""
      select b.id, l.id as "lotId", l.name as "lotName", l.address as "address", l.latitude as "latitude", l.longitude as "longitude",
             s.space_number as "spaceNumber", s.vehicle_type as "vehicleType", b.start_time as "startTime", b.end_time as "endTime",
             b.total_amount as "totalAmount", b.extra_amount as "extraAmount", b.extra_paid as "extraPaid", b.early_refund as "earlyRefund",
             (select r.status from refunds r where r.booking_id=b.id and r.reason='EARLY_EXIT' order by r.id desc limit 1) as "refundStatus", b.status as "status", b.created_at as "createdAt",
             b.checked_in_at as "checkedInAt", b.checked_out_at as "checkedOutAt",
             case when b.status='CONFIRMED' then b.entry_token end as "entryToken",
             case when b.status='CHECKED_IN' then b.exit_token end as "exitToken"
      from bookings b join parking_spaces s on s.id=b.parking_space_id join parking_lots l on l.id=s.parking_lot_id
      where b.user_id=? order by b.start_time desc""",(Long)a.getPrincipal()); }
  @GetMapping("/{id}") Booking get(@PathVariable Long id,Authentication a){
    var b=repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Not found"));
    if(!b.getUserId().equals(a.getPrincipal())&&!isAdmin(a)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Not your booking"); return b; }
  @GetMapping("/{id}/overstay") java.util.Map<String,Object> overstay(@PathVariable Long id,Authentication a){ return svc.overstayQuote((Long)a.getPrincipal(),id); }
  @PostMapping("/{id}/cancel") Booking cancel(@PathVariable Long id,Authentication a){
    var b=svc.cancel((Long)a.getPrincipal(),isAdmin(a),id); if("CANCELLED".equals(b.getStatus())) payments.refundIfPaid(b.getId());   // never refund a no-show
    return b; }
  private boolean isAdmin(Authentication a){ return a.getAuthorities().stream().anyMatch(g->g.getAuthority().equals("ROLE_ADMIN")); }
}
