package com.parkify.web;
import com.parkify.domain.Notification; import com.parkify.repo.Repos.NotifRepo;
import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/api/v1/notifications")
public class NotificationController {
  private final NotifRepo repo; public NotificationController(NotifRepo r){ repo=r; }
  @GetMapping("/me") List<Notification> mine(Authentication a){ return repo.findByUserIdOrderByIdDesc((Long)a.getPrincipal()); }
}
