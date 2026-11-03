package com.parkify.service;
import org.springframework.stereotype.Service;
import java.math.BigDecimal; import java.math.RoundingMode; import java.time.*; import java.util.*; import java.util.regex.*;

/**
 * Quick search: type a sentence such as "bike parking for 3 hours under ₹60".
 * Simple keyword rules pick out the vehicle type, the number of hours and the budget, then the normal database search runs.
 * Results always come from real availability; nothing is invented and nothing is booked here.
 */
@Service
public class QuickSearchService {
  record Intent(double hours,BigDecimal budget,String vehicleType){}
  public record Reply(String message,Map<String,Object> understood,List<SearchService.LotView> results){}

  private final SearchService search; public QuickSearchService(SearchService s){ search=s; }

  static String vehicle(String t){
    if(t.matches(".*\\b(ev|electric|charging|charger)\\b.*")) return "EV_CAR";
    if(t.matches(".*\\b(bike|bikes|scooter|scooty|moped|motorcycle|motorbike|two[- ]?wheeler|2[- ]?wheeler)\\b.*")) return "TWO_WHEELER";
    if(t.matches(".*\\b(bicycle|cycle)\\b.*")) return "CYCLE";
    if(t.matches(".*\\b(rv|camper|caravan|motorhome)\\b.*")) return "RV";
    if(t.matches(".*\\b(bus|minibus|coach)\\b.*")) return "BUS";
    if(t.matches(".*\\b(truck|lorry)\\b.*")) return "TRUCK";
    if(t.matches(".*\\b(van|tempo|minitruck)\\b.*")) return "VAN";
    if(t.matches(".*\\b(car|suv|sedan|hatchback|innova|jeep)\\b.*")) return "CAR";
    return null;
  }

  Intent parse(String text){
    var t=text.toLowerCase();
    var hm=Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*(?:hours?|hrs?|h)\\b").matcher(t);
    double hours=hm.find()?Double.parseDouble(hm.group(1)):(t.contains("three")?3:t.contains("four")?4:2);
    var m=Pattern.compile("(?:under|below|max|within|₹|rs\\.?)\\s*(\\d+)").matcher(t);
    return new Intent(hours,m.find()?new BigDecimal(m.group(1)):null,vehicle(t));
  }

  public Reply handle(String text,Double lat,Double lng){
    Intent in=parse(text);
    BigDecimal perHour=in.budget()==null?null:in.budget().divide(BigDecimal.valueOf(Math.max(in.hours(),1)),2,RoundingMode.HALF_UP);   // total budget → per hour
    var start=Instant.now().plusSeconds(16*60); var end=start.plusSeconds((long)(in.hours()*3600));
    var res=search.search(lat,lng,perHour,start,end,in.vehicleType()).stream().filter(r->r.freeSpaces()>0).limit(5).toList();
    var u=new LinkedHashMap<String,Object>(); u.put("hours",in.hours()); u.put("maxHourlyRate",perHour); u.put("vehicleType",in.vehicleType()); u.put("from",start.toString());
    return new Reply(res.isEmpty()?"No free parking matched. Try a bigger budget, another vehicle type or a different time.":
      "Found "+res.size()+" option(s) for "+in.hours()+" hour(s)"+(in.vehicleType()==null?"":" · "+in.vehicleType().replace('_',' ').toLowerCase())+".",u,res);
  }
}
