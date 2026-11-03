package com.parkify.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkify.domain.*; import com.parkify.repo.Repos.*;
import org.slf4j.*; import org.springframework.beans.factory.annotation.Value; import org.springframework.http.*;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.*; import org.springframework.web.server.ResponseStatusException;
import javax.crypto.Mac; import javax.crypto.spec.SecretKeySpec;
import java.math.*; import java.time.Instant; import java.nio.charset.StandardCharsets; import java.security.MessageDigest; import java.util.*;

/**
 * Online payment for a held booking.
 * Real mode (Razorpay): server creates the order, the browser pays in Razorpay Checkout, the server verifies Razorpay's
 * signature before confirming. A signed webhook is the safety net when the browser never reports back.
 * Test mode: a built-in gateway for demos without keys.
 * Mode "auto" (default) = Razorpay when RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set, otherwise test gateway.
 */
@Service
public class PaymentService {
  private static final Logger log=LoggerFactory.getLogger(PaymentService.class);
  private final RefundRepo refunds; private final PaymentRepo payments; private final BookingRepo bookings; private final BookingService bookingService;
  private final String mode,keyId,keySecret,webhookSecret; private final RestClient rest=RestClient.create(); private final ObjectMapper mapper=new ObjectMapper();

  public PaymentService(PaymentRepo p,BookingRepo b,BookingService bs,RefundRepo rf,@Value("${parkify.payment-mode:auto}") String mode,
      @Value("${parkify.razorpay-key-id:}") String keyId,@Value("${parkify.razorpay-key-secret:}") String secret,
      @Value("${parkify.razorpay-webhook-secret:}") String webhookSecret){
    payments=p; refunds=rf; bookings=b; bookingService=bs; this.mode=mode; this.keyId=keyId; keySecret=secret; this.webhookSecret=webhookSecret; }

  private boolean rzp(){
    return "razorpay".equalsIgnoreCase(mode)||("auto".equalsIgnoreCase(mode)&&!keyId.isBlank()&&!keySecret.isBlank()); }

  public Map<String,Object> config(){
    return Map.of("mode",rzp()?"razorpay":"mock","test",rzp()&&keyId.startsWith("rzp_test_")); }

  @Transactional
  public Map<String,Object> createOrder(Long userId,Long bookingId,String purposeIn){
    var b=bookings.findById(bookingId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Booking not found"));
    if(!b.getUserId().equals(userId)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Not your booking");
    String purpose="OVERSTAY".equalsIgnoreCase(purposeIn)?"OVERSTAY":"BOOKING";
    BigDecimal amount;
    if("OVERSTAY".equals(purpose)){
      if(!"CHECKED_IN".equals(b.getStatus())) throw new ResponseStatusException(HttpStatus.CONFLICT,"Only a parked vehicle can pay an overstay charge");
      amount=bookingService.overstayDue(b,java.time.Instant.now().plus(15,java.time.temporal.ChronoUnit.MINUTES));   // covers the next 15 minutes
      if(amount.signum()<=0) throw new ResponseStatusException(HttpStatus.CONFLICT,"No overstay charge is due");
      if(amount.compareTo(BigDecimal.ONE)<0) amount=BigDecimal.ONE;
    } else {
      if(!"PENDING_PAYMENT".equals(b.getStatus())) throw new ResponseStatusException(HttpStatus.CONFLICT,"This booking is not waiting for payment");
      amount=b.getTotalAmount();
    }
    var p=new Payment(); p.setBookingId(bookingId); p.setAmount(amount); p.setPurpose(purpose); p.setProvider(rzp()?"razorpay":"mock");
    String orderId;
    if(rzp()){
      if(keyId.isBlank()||keySecret.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Razorpay keys are not configured");
      long paise=amount.movePointRight(2).setScale(0,RoundingMode.HALF_UP).longValueExact();
      if(paise<100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Amount is below the minimum online payment of ₹1");
      try{
        @SuppressWarnings("unchecked") Map<String,Object> res=rest.post().uri("https://api.razorpay.com/v1/orders")
          .headers(h->h.setBasicAuth(keyId,keySecret)).contentType(MediaType.APPLICATION_JSON)
          .body(Map.of("amount",paise,"currency","INR","receipt",purpose.toLowerCase()+"_"+bookingId)).retrieve().body(Map.class);
        orderId=String.valueOf(res.get("id"));
      }catch(RestClientException e){ log.warn("Razorpay order failed: {}",e.getMessage()); throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"Payment provider error. Try again."); }
    } else orderId="mock_order_"+UUID.randomUUID().toString().substring(0,8);
    p.setProviderOrderId(orderId); p=payments.save(p);
    var out=new LinkedHashMap<String,Object>();
    out.put("paymentId",p.getId()); out.put("orderId",orderId); out.put("amount",amount); out.put("currency","INR");
    out.put("mode",p.getProvider()); out.put("keyId",rzp()?keyId:null);
    return out;
  }

  /** Browser reports back after paying. The row is locked so it can't race with the webhook. */
  @Transactional(noRollbackFor=ResponseStatusException.class)
  public Booking confirm(Long userId,Long paymentId,String method,String outcome,String rzpPaymentId,String rzpSignature){
    var p=payments.lockById(paymentId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Payment not found"));
    var b=bookings.findById(p.getBookingId()).orElseThrow();
    if(!b.getUserId().equals(userId)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Not your payment");
    if("PAID".equals(p.getStatus())) return b;                       // safe to retry
    boolean ok;
    if(rzp()){ ok=hmacOk(keySecret,p.getProviderOrderId()+"|"+rzpPaymentId,rzpSignature); p.setProviderPaymentId(rzpPaymentId); p.setMethod("RAZORPAY"); }
    else { ok=!"FAIL".equalsIgnoreCase(outcome); p.setProviderPaymentId("mock_pay_"+UUID.randomUUID().toString().substring(0,8)); p.setMethod(method); }
    if(!ok){ p.setStatus("FAILED"); payments.save(p); throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED,"Payment could not be verified. If money was deducted it will be refunded."); }
    if("OVERSTAY".equals(p.getPurpose())){
      if(!"CHECKED_IN".equals(b.getStatus())){ refund(p); throw new ResponseStatusException(HttpStatus.CONFLICT,"This vehicle has already left. Your overstay payment is being refunded."); }
      p.setStatus("PAID"); payments.save(p);
      return bookingService.recordOverstayPayment(b.getId(),p.getAmount());
    }
    if(!"PENDING_PAYMENT".equals(b.getStatus())){                    // paid after the 10-minute hold ended
      refund(p);
      throw new ResponseStatusException(HttpStatus.CONFLICT,"Your slot hold expired before payment completed. Your payment is being refunded.");
    }
    p.setStatus("PAID"); payments.save(p);
    return bookingService.markPaid(b.getId());
  }

  /** Razorpay → server. Confirms bookings even if the browser was closed; refunds payments that arrive too late. */
  @Transactional(noRollbackFor=ResponseStatusException.class)
  public void webhook(String body,String signature){
    if(webhookSecret.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Webhook secret is not configured");
    if(!hmacOk(webhookSecret,body,signature)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid webhook signature");
    try{
      var root=mapper.readTree(body); String event=root.path("event").asText();
      if(!event.equals("payment.captured")&&!event.equals("order.paid")) return;
      var pay=root.path("payload").path("payment").path("entity");
      String orderId=pay.path("order_id").asText(""), payId=pay.path("id").asText("");
      if(orderId.isBlank()) return;
      payments.lockByOrderId(orderId).ifPresent(p->{
        if(List.of("PAID","REFUNDED","REFUND_PENDING").contains(p.getStatus())) return;     // already handled
        var b=bookings.findById(p.getBookingId()).orElseThrow();
        p.setProviderPaymentId(payId); p.setMethod("RAZORPAY");
        if("OVERSTAY".equals(p.getPurpose())){
          if("CHECKED_IN".equals(b.getStatus())){ p.setStatus("PAID"); payments.save(p); bookingService.recordOverstayPayment(b.getId(),p.getAmount()); } else refund(p);
        }
        else if("PENDING_PAYMENT".equals(b.getStatus())){ p.setStatus("PAID"); payments.save(p); bookingService.markPaid(b.getId()); }
        else refund(p);
      });
    }catch(ResponseStatusException e){ throw e; }
    catch(Exception e){ log.warn("Webhook payload not understood: {}",e.getMessage()); }
  }

  @Transactional
  public void refundIfPaid(Long bookingId){ payments.findByBookingIdAndStatus(bookingId,"PAID").stream().filter(p->!"OVERSTAY".equals(p.getPurpose())).forEach(this::refund); }

  /** REFUNDED only when Razorpay accepted the refund; otherwise REFUND_PENDING so it is visible to the admin. */
  private void refund(Payment p){
    if(rzp()&&p.getProviderPaymentId()!=null&&!p.getProviderPaymentId().startsWith("mock_")){
      try{ rest.post().uri("https://api.razorpay.com/v1/payments/"+p.getProviderPaymentId()+"/refund").headers(h->h.setBasicAuth(keyId,keySecret))
             .contentType(MediaType.APPLICATION_JSON).body(Map.of()).retrieve().toBodilessEntity(); p.setStatus("REFUNDED"); }
      catch(Exception e){ log.warn("Razorpay refund failed for {}: {}",p.getProviderPaymentId(),e.getMessage()); p.setStatus("REFUND_PENDING"); }
    } else p.setStatus("REFUNDED");
    payments.save(p);
  }

  /** Issues pending early-exit refunds (partial refund of the original payment). Runs every minute, so refunds go out far inside the 2-hour promise. */
  @Transactional
  public int processPendingRefunds(){
    int done=0;
    for(var r:refunds.findByStatusOrderByIdAsc("PENDING")){
      var p=payments.findById(r.getPaymentId()).orElse(null);
      if(p==null){ r.setStatus("FAILED"); r.setLastError("Payment not found"); continue; }
      try{
        if("razorpay".equals(p.getProvider())&&p.getProviderPaymentId()!=null&&!p.getProviderPaymentId().startsWith("mock_")){
          long paise=r.getAmount().movePointRight(2).setScale(0,RoundingMode.HALF_UP).longValueExact();
          rest.post().uri("https://api.razorpay.com/v1/payments/"+p.getProviderPaymentId()+"/refund").headers(h->h.setBasicAuth(keyId,keySecret))
            .contentType(MediaType.APPLICATION_JSON).body(Map.of("amount",paise)).retrieve().toBodilessEntity();
        }
        r.setStatus("REFUNDED"); r.setProcessedAt(Instant.now()); done++;
      }catch(Exception e){
        r.setAttempts(r.getAttempts()+1); r.setLastError(String.valueOf(e.getMessage()));
        if(Instant.now().isAfter(r.getDueAt())) log.warn("Refund {} is overdue: {}",r.getId(),e.getMessage());
      }
    }
    return done;
  }

  static boolean hmacOk(String secret,String payload,String sig){
    if(sig==null||secret==null||secret.isBlank()) return false;
    try{ var mac=Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
      String hex=HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
      return MessageDigest.isEqual(hex.getBytes(StandardCharsets.UTF_8),sig.getBytes(StandardCharsets.UTF_8));
    }catch(Exception e){ return false; }
  }
}
