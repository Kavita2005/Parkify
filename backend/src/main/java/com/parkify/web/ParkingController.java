package com.parkify.web;
import com.parkify.domain.*; import com.parkify.repo.Repos.*; import com.parkify.service.*;
import jakarta.validation.Valid; import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication; import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*; import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal; import java.time.Instant; import java.util.*; import java.util.stream.Collectors;

@RestController @RequestMapping("/api/v1")
public class ParkingController {
  record SpaceGroup(@NotBlank String vehicleType,@Min(1) @Max(500) int count,@NotNull @DecimalMin("0.0") BigDecimal hourlyRate){}
  record LotReq(@NotBlank String name,@NotBlank String address,double latitude,double longitude,@NotEmpty @Valid List<SpaceGroup> spaces){}
  private final LotRepo lots; private final SpaceRepo spaces; private final SearchService search; private final ForecastService forecast;
  public ParkingController(LotRepo l,SpaceRepo s,SearchService se,ForecastService f){ lots=l; spaces=s; search=se; forecast=f; }

  @GetMapping("/parking-lots") List<SearchService.LotView> list(@RequestParam(required=false) Double lat,@RequestParam(required=false) Double lng,
      @RequestParam(required=false) BigDecimal maxRate,@RequestParam(required=false) Instant start,@RequestParam(required=false) Instant end,
      @RequestParam(required=false) String vehicleType){
    return search.search(lat,lng,maxRate,start,end,blank(vehicleType)?null:VehicleType.parse(vehicleType).name()); }

  @GetMapping("/parking-lots/{id}") Map<String,Object> get(@PathVariable Long id){
    var lot=lots.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Not found"));
    return Map.of("lot",lot,"spaces",spaces.findByParkingLotIdAndActiveTrue(id)); }

  @GetMapping("/parking-lots/{id}/availability") Map<String,Object> availability(@PathVariable Long id,@RequestParam Instant start,
      @RequestParam Instant end,@RequestParam(required=false) String vehicleType){
    if(!end.isAfter(start)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"End must be after start");
    String vt=blank(vehicleType)?null:VehicleType.parse(vehicleType).name();
    var free=spaces.findFree(id,start,end).stream().filter(s->vt==null||vt.equals(s.getVehicleType())).toList();
    return Map.of("lotId",id,"freeCount",free.size(),"freeSpaces",free); }

  /** Every space of a lot for a time window: AVAILABLE, BOOKED (someone holds or has paid for it) or UNAVAILABLE (switched off). */
  @GetMapping("/parking-lots/{id}/slots") List<Map<String,Object>> slots(@PathVariable Long id,@RequestParam Instant start,@RequestParam Instant end,
      @RequestParam(required=false) String vehicleType){
    if(!end.isAfter(start)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"End must be after start");
    String vt=blank(vehicleType)?null:VehicleType.parse(vehicleType).name();
    var free=spaces.findFree(id,start,end).stream().map(ParkingSpace::getId).collect(Collectors.toSet());
    var out=new ArrayList<Map<String,Object>>();
    spaces.findByParkingLotId(id).stream().filter(s->vt==null||vt.equals(s.getVehicleType())).sorted(Comparator.comparing(ParkingSpace::getId)).forEach(s->{
      var m=new LinkedHashMap<String,Object>(); m.put("id",s.getId()); m.put("spaceNumber",s.getSpaceNumber()); m.put("vehicleType",s.getVehicleType()); m.put("hourlyRate",s.getHourlyRate());
      m.put("status",!s.isActive()?"UNAVAILABLE":free.contains(s.getId())?"AVAILABLE":"BOOKED"); out.add(m); });
    return out; }

  @GetMapping("/parking-lots/{id}/forecast") Map<String,Object> forecast(@PathVariable Long id,@RequestParam(required=false) Instant at){
    return forecast.predict(id,at==null?Instant.now().plusSeconds(3600):at); }

  /** Owner sends one group per vehicle type, e.g. 20 two-wheeler bays at ₹10 and 8 car bays at ₹40. */
  @PostMapping("/owner/parking-lots") @PreAuthorize("hasAnyRole('OWNER','ADMIN')") @Transactional
  ParkingLot create(@Valid @RequestBody LotReq r,Authentication a){
    var types=new HashSet<VehicleType>();
    for(var g:r.spaces()) if(!types.add(VehicleType.parse(g.vehicleType()))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Duplicate vehicle type "+g.vehicleType());
    var lot=new ParkingLot(); lot.setOwnerId((Long)a.getPrincipal()); apply(lot,r);
    boolean admin=a.getAuthorities().stream().anyMatch(g->g.getAuthority().equals("ROLE_ADMIN"));
    lot.setStatus(admin?"ACTIVE":"PENDING");   // owners' lots go live after admin approval
    lot=lots.save(lot);
    for(var g:r.spaces()){ var vt=VehicleType.parse(g.vehicleType());
      for(int i=1;i<=g.count();i++){ var s=new ParkingSpace(); s.setParkingLotId(lot.getId()); s.setSpaceNumber(vt.prefix+"-"+i);   // CAR-1, CAR-2, 2W-1, 2W-2, EV-1 ...
        s.setVehicleType(vt.name()); s.setHourlyRate(g.hourlyRate()); spaces.save(s); } }
    return lot; }

  private static boolean blank(String s){ return s==null||s.isBlank(); }
  private void apply(ParkingLot l,LotReq r){ l.setName(r.name()); l.setAddress(r.address()); l.setLatitude(r.latitude()); l.setLongitude(r.longitude()); }
}
