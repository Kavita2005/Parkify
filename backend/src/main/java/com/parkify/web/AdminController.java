package com.parkify.web;
import org.springframework.http.HttpStatus; import org.springframework.jdbc.core.JdbcTemplate; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import org.springframework.web.server.ResponseStatusException; import java.util.*;

/** Platform administration: overview, lot approval, user management. */
@RestController @RequestMapping("/api/v1/admin") @PreAuthorize("hasRole('ADMIN')")
public class AdminController {
  private final JdbcTemplate jdbc; public AdminController(JdbcTemplate j){ jdbc=j; }

  @GetMapping("/stats") Map<String,Object> stats(){
    var m=new LinkedHashMap<String,Object>();
    m.put("users",jdbc.queryForList("select role as label, count(*) as n from users group by role order by role"));
    m.put("lots",jdbc.queryForList("select status as label, count(*) as n from parking_lots group by status order by status"));
    m.put("bookings",jdbc.queryForList("select status as label, count(*) as n from bookings group by status order by status"));
    m.put("payments",jdbc.queryForList("select status as label, count(*) as n from payments group by status order by status"));
    m.put("refunds",jdbc.queryForList("select status as label, count(*) as n from refunds group by status order by status"));
    m.put("revenue",jdbc.queryForObject("select (select coalesce(sum(amount),0) from payments where status='PAID' and provider<>'cash') - (select coalesce(sum(amount),0) from refunds where status='REFUNDED')",java.math.BigDecimal.class));
    return m; }

  @GetMapping("/lots") List<Map<String,Object>> lots(){
    return jdbc.queryForList("""
      select l.id, l.name, l.address, l.status, u.name as "ownerName", u.email as "ownerEmail",
             (select count(*) from parking_spaces s where s.parking_lot_id=l.id and s.active) as spaces
      from parking_lots l join users u on u.id=l.owner_id order by (l.status='PENDING') desc, l.id desc"""); }

  record StatusReq(String status){}
  @PostMapping("/lots/{id}/status") Map<String,Object> lotStatus(@PathVariable Long id,@RequestBody StatusReq r){
    if(r.status()==null||!List.of("ACTIVE","SUSPENDED","PENDING").contains(r.status())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Status must be ACTIVE, SUSPENDED or PENDING");
    int n=jdbc.update("update parking_lots set status=? where id=?",r.status(),id);
    if(n==0) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Lot not found");
    return Map.of("id",id,"status",r.status()); }

  @GetMapping("/users") List<Map<String,Object>> users(){
    return jdbc.queryForList("select id, name, email, role, coalesce(enabled,true) as enabled, created_at as \"createdAt\" from users order by id desc"); }

  record EnabledReq(boolean enabled){}
  @PostMapping("/users/{id}/enabled") Map<String,Object> enabled(@PathVariable Long id,@RequestBody EnabledReq r){
    int n=jdbc.update("update users set enabled=? where id=? and role<>'ADMIN'",r.enabled(),id);
    if(n==0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"User not found, or admins can't be disabled");
    return Map.of("id",id,"enabled",r.enabled()); }
}
