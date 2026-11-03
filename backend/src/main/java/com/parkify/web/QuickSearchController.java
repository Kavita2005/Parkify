package com.parkify.web;
import com.parkify.service.QuickSearchService; import jakarta.validation.Valid; import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/search")
public class QuickSearchController {
  record Ask(@NotBlank @Size(max=500) String message,Double lat,Double lng){}
  private final QuickSearchService svc; public QuickSearchController(QuickSearchService s){ svc=s; }
  @PostMapping("/quick") QuickSearchService.Reply ask(@Valid @RequestBody Ask a){ return svc.handle(a.message(),a.lat(),a.lng()); }
}
