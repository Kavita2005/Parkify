package com.parkify.service;
import org.junit.jupiter.api.Test; import java.math.BigDecimal; import java.time.Instant; import java.time.temporal.ChronoUnit;
import static org.junit.jupiter.api.Assertions.*;
class GateServiceTest {
  Instant start=Instant.parse("2026-11-02T10:00:00Z"), end=Instant.parse("2026-11-02T12:00:00Z");
  BigDecimal rate=new BigDecimal("30"), total=new BigDecimal("60.00");
  @Test void leavingHalfwayRefundsTheUnusedTime(){
    assertEquals(0,new BigDecimal("45.00").compareTo(GateService.earlyRefund(rate,start,end,start.plus(30,ChronoUnit.MINUTES),total)));   // 90 min left x ₹30/h
  }
  @Test void leavingBeforeTheStartRefundsEverything(){
    assertEquals(0,new BigDecimal("60.00").compareTo(GateService.earlyRefund(rate,start,end,start.minus(5,ChronoUnit.MINUTES),total)));
  }
  @Test void noRefundAtOrAfterTheBookedEnd(){
    assertEquals(0,BigDecimal.ZERO.compareTo(GateService.earlyRefund(rate,start,end,end,total)));
    assertEquals(0,BigDecimal.ZERO.compareTo(GateService.earlyRefund(rate,start,end,end.plus(10,ChronoUnit.MINUTES),total)));
  }
  @Test void refundIsNeverMoreThanWasPaid(){
    assertEquals(0,new BigDecimal("40.00").compareTo(GateService.earlyRefund(rate,start,end,start.minus(1,ChronoUnit.HOURS),new BigDecimal("40.00"))));
  }
}
