package com.parkify.web;
import com.parkify.service.GateService; import jakarta.validation.Valid; import jakarta.validation.constraints.NotBlank;
import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import java.util.Map;
@RestController @RequestMapping("/api/v1/gate") @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
public class GateController {
  record ScanReq(@NotBlank String code,boolean collectedAtGate){}
  private final GateService svc; public GateController(GateService s){ svc=s; }
  @PostMapping("/scan") Map<String,Object> scan(@Valid @RequestBody ScanReq r,Authentication a){
    boolean admin=a.getAuthorities().stream().anyMatch(g->g.getAuthority().equals("ROLE_ADMIN"));
    return svc.scan((Long)a.getPrincipal(),admin,r.code(),r.collectedAtGate()); }
}
