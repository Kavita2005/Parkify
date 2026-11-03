package com.parkify.web;
import org.springframework.jdbc.core.JdbcTemplate; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*;
import java.util.*;

/** Lot provider dashboard: own lots, bookings, revenue, and who is inside right now. */
@RestController @RequestMapping("/api/v1/owner") @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
public class OwnerController {
  private static final String PAID="('CONFIRMED','CHECKED_IN','COMPLETED','NO_SHOW')";
  private static final String JOIN=" from bookings b join parking_spaces s on s.id=b.parking_space_id join parking_lots l on l.id=s.parking_lot_id join users u on u.id=b.user_id ";
  private final JdbcTemplate jdbc; public OwnerController(JdbcTemplate j){ jdbc=j; }

  @GetMapping("/parking-lots") List<Map<String,Object>> myLots(Authentication a){
    return jdbc.queryForList("""
      select l.id, l.name, l.address, l.status, count(s.id) as spaces, min(s.hourly_rate) as "hourlyRate", string_agg(distinct s.vehicle_type, ',') as "vehicleTypes"
      from parking_lots l left join parking_spaces s on s.parking_lot_id=l.id and s.active
      where l.owner_id=? group by l.id order by l.id desc""",(Long)a.getPrincipal()); }

  @GetMapping("/analytics") Map<String,Object> analytics(Authentication a){
    Long uid=(Long)a.getPrincipal();
    var totals=jdbc.queryForMap("""
      select (select count(*) from parking_lots where owner_id=?) as facilities,
             (select count(*) from parking_spaces s join parking_lots l on l.id=s.parking_lot_id where l.owner_id=? and s.active) as spaces,
             count(b.id) as bookings, coalesce(sum(b.total_amount + coalesce(b.extra_paid,0) - coalesce(b.early_refund,0)),0) as revenue,
             count(b.id) filter (where b.status='CHECKED_IN') as inside"""+JOIN+"where l.owner_id=? and b.status in "+PAID,uid,uid,uid);
    var daily=jdbc.queryForList("""
      select to_char(b.start_time,'YYYY-MM-DD') as day, count(*) as bookings, coalesce(sum(b.total_amount),0) as revenue"""+JOIN+
      "where l.owner_id=? and b.status in "+PAID+" group by 1 order by 1 desc limit 14",uid);
    Collections.reverse(daily);
    var out=new LinkedHashMap<String,Object>(totals); out.put("daily",daily); return out; }

  @GetMapping("/bookings") List<Map<String,Object>> bookings(Authentication a){
    return jdbc.queryForList("""
      select b.id, u.name as "driverName", l.name as "lotName", s.space_number as "spaceNumber", s.vehicle_type as "vehicleType",
             b.start_time as "startTime", b.end_time as "endTime", b.total_amount as "totalAmount", b.status as "status\""""+JOIN+
      "where l.owner_id=? order by b.id desc limit 30",(Long)a.getPrincipal()); }

  /** The lot "control centre" view: vehicles currently checked in. */
  @GetMapping("/inside") List<Map<String,Object>> inside(Authentication a){
    return jdbc.queryForList("""
      select b.id, u.name as "driverName", l.name as "lotName", s.space_number as "spaceNumber", s.vehicle_type as "vehicleType",
             b.checked_in_at as "checkedInAt", b.end_time as "endTime\""""+JOIN+
      "where l.owner_id=? and b.status='CHECKED_IN' order by b.checked_in_at desc",(Long)a.getPrincipal()); }
}
