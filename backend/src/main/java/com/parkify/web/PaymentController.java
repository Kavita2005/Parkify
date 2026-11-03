package com.parkify.web;
import com.parkify.domain.Booking; import com.parkify.service.PaymentService;
import jakarta.validation.Valid; import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import java.util.Map;

@RestController @RequestMapping("/api/v1/payments")
public class PaymentController {
  record OrderReq(@NotNull Long bookingId,String purpose){}
  record ConfirmReq(@NotNull Long paymentId,String method,String outcome,String razorpayPaymentId,String razorpaySignature){}
  private final PaymentService svc; public PaymentController(PaymentService s){ svc=s; }
  @GetMapping("/config") Map<String,Object> config(){ return svc.config(); }
  /** Called by Razorpay's servers (no login). Authenticity is proven by the X-Razorpay-Signature header. */
  @PostMapping("/webhook") ResponseEntity<Void> webhook(@RequestBody String body,@RequestHeader(value="X-Razorpay-Signature",required=false) String sig){
    svc.webhook(body,sig); return ResponseEntity.ok().build(); }
  @PostMapping("/order") Map<String,Object> order(@Valid @RequestBody OrderReq r,Authentication a){ return svc.createOrder((Long)a.getPrincipal(),r.bookingId(),r.purpose()); }
  @PostMapping("/confirm") Booking confirm(@Valid @RequestBody ConfirmReq r,Authentication a){
    return svc.confirm((Long)a.getPrincipal(),r.paymentId(),r.method(),r.outcome(),r.razorpayPaymentId(),r.razorpaySignature()); }
}
