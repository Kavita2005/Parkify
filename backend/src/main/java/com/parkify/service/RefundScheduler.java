package com.parkify.service;
import org.springframework.scheduling.annotation.Scheduled; import org.springframework.stereotype.Component;
@Component
public class RefundScheduler {
  private final PaymentService payments; public RefundScheduler(PaymentService p){ payments=p; }
  @Scheduled(fixedDelay=60_000) public void run(){ payments.processPendingRefunds(); }
}
