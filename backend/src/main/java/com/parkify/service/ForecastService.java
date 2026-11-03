package com.parkify.service;
import com.parkify.repo.Repos.DemandRepo;
import org.springframework.stereotype.Service;
import java.time.*; import java.util.*;

/** Baseline forecaster: mean occupancy ratio for the same weekday+hour. Replace with a trained model later. */
@Service
public class ForecastService {
  private final DemandRepo repo; public ForecastService(DemandRepo r){ repo=r; }
  public Map<String,Object> predict(Long lotId,Instant when){
    var z=when.atZone(ZoneId.of("Asia/Kolkata"));
    var same=repo.findByParkingLotId(lotId).stream().filter(d->d.getCapacity()>0).filter(d->{
      var t=d.getObservedAt().atZone(z.getZone()); return t.getDayOfWeek()==z.getDayOfWeek()&&t.getHour()==z.getHour(); }).toList();
    double ratio=same.stream().mapToDouble(d->(double)d.getOccupiedCount()/d.getCapacity()).average().orElse(Double.NaN);
    var out=new LinkedHashMap<String,Object>(); out.put("lotId",lotId); out.put("for",when.toString());
    out.put("samples",same.size()); out.put("predictedOccupancy",Double.isNaN(ratio)?null:Math.round(ratio*100)/100.0);
    out.put("note",same.isEmpty()?"Not enough history yet":"Baseline average of past observations");
    return out;
  }
}
