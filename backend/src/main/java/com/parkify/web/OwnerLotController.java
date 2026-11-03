package com.parkify.web;
import com.parkify.domain.*; import com.parkify.repo.Repos.*;
import jakarta.validation.Valid; import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional; import org.springframework.web.bind.annotation.*; import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal; import java.time.Instant; import java.util.*;

/** Lot providers edit their own lots: details and location, prices per vehicle type, switching spaces on/off, adding spaces. */
@RestController @RequestMapping("/api/v1/owner") @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
public class OwnerLotController {
  record LotInfo(@NotBlank String name,@NotBlank String address,double latitude,double longitude){}
  record AddSpaces(@NotBlank String vehicleType,@Min(1) @Max(500) int count,@NotNull @DecimalMin("0.0") BigDecimal hourlyRate){}
  record Prices(@NotBlank String vehicleType,@NotNull @DecimalMin("0.0") BigDecimal hourlyRate){}
  record SpacePatch(Boolean active,@DecimalMin("0.0") BigDecimal hourlyRate){}
  private static final List<String> ACTIVE=List.of("PENDING_PAYMENT","CONFIRMED","CHECKED_IN");
  private final LotRepo lots; private final SpaceRepo spaces; private final BookingRepo bookings;
  public OwnerLotController(LotRepo l,SpaceRepo s,BookingRepo b){ lots=l; spaces=s; bookings=b; }

  private ParkingLot mine(Long id,Authentication a){
    var lot=lots.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Lot not found"));
    boolean admin=a.getAuthorities().stream().anyMatch(g->g.getAuthority().equals("ROLE_ADMIN"));
    if(!lot.getOwnerId().equals(a.getPrincipal())&&!admin) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Not your parking lot");
    return lot; }
  static int suffix(String n){ try{ return Integer.parseInt(n.substring(n.lastIndexOf('-')+1)); }catch(Exception e){ return 0; } }

  @GetMapping("/parking-lots/{id}") Map<String,Object> get(@PathVariable Long id,Authentication a){
    var lot=mine(id,a);
    return Map.of("lot",lot,"spaces",spaces.findByParkingLotId(id).stream().sorted(Comparator.comparing(ParkingSpace::getId)).toList()); }

  @PutMapping("/parking-lots/{id}") ParkingLot update(@PathVariable Long id,@Valid @RequestBody LotInfo r,Authentication a){
    var lot=mine(id,a); lot.setName(r.name()); lot.setAddress(r.address()); lot.setLatitude(r.latitude()); lot.setLongitude(r.longitude()); return lots.save(lot); }

  @PostMapping("/parking-lots/{id}/spaces") @Transactional List<ParkingSpace> add(@PathVariable Long id,@Valid @RequestBody AddSpaces r,Authentication a){
    mine(id,a); var vt=VehicleType.parse(r.vehicleType());
    int next=spaces.findByParkingLotId(id).stream().filter(s->vt.name().equals(s.getVehicleType())).mapToInt(s->suffix(s.getSpaceNumber())).max().orElse(0)+1;
    var out=new ArrayList<ParkingSpace>();
    for(int i=0;i<r.count();i++){ var s=new ParkingSpace(); s.setParkingLotId(id); s.setVehicleType(vt.name()); s.setHourlyRate(r.hourlyRate()); s.setSpaceNumber(vt.prefix+"-"+(next+i)); out.add(spaces.save(s)); }
    return out; }

  /** New hourly price for every space of one vehicle type. Existing bookings keep the price they were made at. */
  @PutMapping("/parking-lots/{id}/prices") @Transactional Map<String,Object> prices(@PathVariable Long id,@Valid @RequestBody Prices r,Authentication a){
    mine(id,a); var vt=VehicleType.parse(r.vehicleType()).name(); int n=0;
    for(var s:spaces.findByParkingLotId(id)) if(vt.equals(s.getVehicleType())){ s.setHourlyRate(r.hourlyRate()); spaces.save(s); n++; }
    return Map.of("updated",n); }

  @PutMapping("/spaces/{spaceId}") ParkingSpace patch(@PathVariable Long spaceId,@Valid @RequestBody SpacePatch r,Authentication a){
    var s=spaces.findById(spaceId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Space not found"));
    mine(s.getParkingLotId(),a);
    if(r.active()!=null&&!r.active()&&bookings.existsByParkingSpaceIdAndStatusInAndEndTimeGreaterThan(spaceId,ACTIVE,Instant.now()))
      throw new ResponseStatusException(HttpStatus.CONFLICT,"This space has upcoming or active bookings. Switch it off after they finish.");
    if(r.active()!=null) s.setActive(r.active());
    if(r.hourlyRate()!=null) s.setHourlyRate(r.hourlyRate());
    return spaces.save(s); }
}
