package com.parkify.service;
import com.parkify.domain.*; import com.parkify.repo.Repos.*;
import org.springframework.stereotype.Service; import java.math.BigDecimal; import java.time.Instant; import java.util.*; import java.util.stream.*;

@Service
public class SearchService {
  public record TypeInfo(int total,int free,BigDecimal rate){}
  public record LotView(Long id,String name,String address,double latitude,double longitude,BigDecimal minRate,int freeSpaces,
                        Double distanceKm,List<String> reasons,Map<String,TypeInfo> types){}
  private final LotRepo lots; private final SpaceRepo spaces;
  public SearchService(LotRepo l,SpaceRepo s){ lots=l; spaces=s; }

  /** vehicleType null = any type. Rate/free counts shown are for the chosen type (or all types). */
  public List<LotView> search(Double lat,Double lng,BigDecimal maxRate,Instant start,Instant end,String vehicleType){
    var out=new ArrayList<LotView>();
    for(var lot:lots.findByStatus("ACTIVE")){
      var all=spaces.findByParkingLotIdAndActiveTrue(lot.getId());
      var freeAll=(start!=null&&end!=null)?spaces.findFree(lot.getId(),start,end):all;
      var freeIds=freeAll.stream().map(ParkingSpace::getId).collect(Collectors.toSet());
      Map<String,TypeInfo> types=new LinkedHashMap<>();
      for(var e:all.stream().collect(Collectors.groupingBy(ParkingSpace::getVehicleType,TreeMap::new,Collectors.toList())).entrySet()){
        var list=e.getValue();
        types.put(e.getKey(),new TypeInfo(list.size(),(int)list.stream().filter(s->freeIds.contains(s.getId())).count(),
          list.stream().map(ParkingSpace::getHourlyRate).min(BigDecimal::compareTo).orElse(null)));
      }
      var chosen=vehicleType==null?types.values().stream().toList():(types.containsKey(vehicleType)?List.of(types.get(vehicleType)):List.<TypeInfo>of());
      if(chosen.isEmpty()) continue;
      var min=chosen.stream().map(TypeInfo::rate).min(BigDecimal::compareTo).orElse(null);
      int free=chosen.stream().mapToInt(TypeInfo::free).sum();
      if(maxRate!=null&&min.compareTo(maxRate)>0) continue;
      Double d=(lat!=null&&lng!=null)?km(lat,lng,lot.getLatitude(),lot.getLongitude()):null;
      var why=new ArrayList<String>(); if(d!=null) why.add(String.format("%.1f km away",d)); why.add("from ₹"+min+"/hr"); why.add(free+" free");
      out.add(new LotView(lot.getId(),lot.getName(),lot.getAddress(),lot.getLatitude(),lot.getLongitude(),min,free,d,why,types));
    }
    out.sort(Comparator.comparingDouble((LotView v)->v.freeSpaces()==0?1e9:(v.distanceKm()==null?0:v.distanceKm()*10)+v.minRate().doubleValue()/10));
    return out;
  }
  static double km(double a,double b,double c,double d){
    double R=6371,dl=Math.toRadians(c-a),dn=Math.toRadians(d-b);
    double x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(Math.toRadians(a))*Math.cos(Math.toRadians(c))*Math.sin(dn/2)*Math.sin(dn/2);
    return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
}
