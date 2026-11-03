package com.parkify.service;
import com.parkify.domain.*; import com.parkify.repo.Repos.*;
import org.junit.jupiter.api.*; import org.springframework.context.ApplicationEventPublisher; import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal; import java.time.Instant; import java.time.temporal.ChronoUnit; import java.util.Optional;
import org.springframework.test.util.ReflectionTestUtils; import static org.junit.jupiter.api.Assertions.*; import static org.mockito.ArgumentMatchers.any; import static org.mockito.ArgumentMatchers.eq; import static org.mockito.Mockito.*;

class BookingServiceTest {
  BookingRepo bookings=mock(BookingRepo.class); SpaceRepo spaces=mock(SpaceRepo.class); LotRepo lots=mock(LotRepo.class);
  OutboxRepo outbox=mock(OutboxRepo.class); ApplicationEventPublisher events=mock(ApplicationEventPublisher.class);
  BookingService svc=new BookingService(bookings,spaces,lots,outbox,events,false);
  Instant start=Instant.now().plus(1,ChronoUnit.HOURS);

  @BeforeEach void setUp(){
    var s=new ParkingSpace(); s.setId(5L); s.setParkingLotId(9L); s.setHourlyRate(new BigDecimal("30"));
    when(spaces.findById(5L)).thenReturn(Optional.of(s));
    when(lots.findById(9L)).thenReturn(Optional.of(new ParkingLot()));
  }

  @Test void priceIsRateTimesHours_andEventIsPublished(){
    when(bookings.saveAndFlush(any(Booking.class))).thenAnswer(i->{ Booking b=i.getArgument(0); b.setId(1L); return b; });
    var b=svc.create(7L,5L,start,start.plus(3,ChronoUnit.HOURS));
    assertEquals(0,new BigDecimal("90").compareTo(b.getTotalAmount()));
    verify(events).publishEvent(any(BookingService.BookingEvent.class));
  }

  @Test void overlappingBookingIsRejectedWith409(){
    when(bookings.saveAndFlush(any(Booking.class))).thenThrow(new DataIntegrityViolationException("overlap"));
    var ex=assertThrows(ResponseStatusException.class,()->svc.create(7L,5L,start,start.plus(1,ChronoUnit.HOURS)));
    assertEquals(409,ex.getStatusCode().value());
    verify(events,never()).publishEvent(any(BookingService.BookingEvent.class));
  }

  @Test void endBeforeStartIsRejectedWith400(){
    var ex=assertThrows(ResponseStatusException.class,()->svc.create(7L,5L,start,start.minus(1,ChronoUnit.HOURS)));
    assertEquals(400,ex.getStatusCode().value());
  }

  @Test void otherUsersCannotCancel(){
    var b=new Booking(); b.setId(3L); b.setUserId(1L); b.setParkingSpaceId(5L);
    when(bookings.findById(3L)).thenReturn(Optional.of(b));
    var ex=assertThrows(ResponseStatusException.class,()->svc.cancel(2L,false,3L));
    assertEquals(403,ex.getStatusCode().value());
  }

  @Test void markPaidConfirmsAndIssuesEntryToken(){
    var b=new Booking(); b.setId(3L); b.setUserId(1L); b.setParkingSpaceId(5L); b.setStatus("PENDING_PAYMENT");
    when(bookings.findById(3L)).thenReturn(Optional.of(b));
    var r=svc.markPaid(3L);
    assertEquals("CONFIRMED",r.getStatus()); assertEquals(12,r.getEntryToken().length());
  }

  @Test void cannotCancelAfterCheckIn(){
    var b=new Booking(); b.setId(4L); b.setUserId(1L); b.setParkingSpaceId(5L); b.setStatus("CHECKED_IN");
    when(bookings.findById(4L)).thenReturn(Optional.of(b));
    var ex=assertThrows(ResponseStatusException.class,()->svc.cancel(1L,false,4L));
    assertEquals(409,ex.getStatusCode().value());
  }

  @Test void newBookingsStartAsPendingPayment(){
    when(bookings.saveAndFlush(any(Booking.class))).thenAnswer(i->{ Booking b=i.getArgument(0); b.setId(1L); return b; });
    assertEquals("PENDING_PAYMENT",svc.create(7L,5L,start,start.plus(1,ChronoUnit.HOURS)).getStatus());
  }

  @Test void overstayFeeIsHourlyRatePerMinuteBeyondEnd(){
    var b=new Booking(); b.setParkingSpaceId(5L); b.setEndTime(Instant.now().minus(90,ChronoUnit.MINUTES));
    assertEquals(0,new BigDecimal("45.00").compareTo(svc.overstayFee(b,Instant.now())));        // ₹30/h × 1.5 h
    b.setExtraPaid(new BigDecimal("20"));
    assertEquals(0,new BigDecimal("25.00").compareTo(svc.overstayDue(b,Instant.now())));        // minus what was already paid
  }

  @Test void noOverstayFeeBeforeTheBookedEnd(){
    var b=new Booking(); b.setParkingSpaceId(5L); b.setEndTime(Instant.now().plus(30,ChronoUnit.MINUTES));
    assertEquals(0,BigDecimal.ZERO.compareTo(svc.overstayFee(b,Instant.now())));
  }

  @Test void sameDriverCannotHoldTwoOverlappingBookings(){
    ReflectionTestUtils.setField(svc,"blockUserOverlap",true);   // the limit is off by default
    when(bookings.existsByUserIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(eq(7L),any(),any(),any())).thenReturn(true);
    var ex=assertThrows(ResponseStatusException.class,()->svc.create(7L,5L,start,start.plus(1,ChronoUnit.HOURS)));
    assertEquals(409,ex.getStatusCode().value());
    verify(bookings,never()).saveAndFlush(any(Booking.class));
  }

  @Test void driversMayBookManySpacesByDefault(){
    when(bookings.saveAndFlush(any(Booking.class))).thenAnswer(i->{ Booking b=i.getArgument(0); b.setId(1L); return b; });
    assertNotNull(svc.create(7L,5L,start,start.plus(1,ChronoUnit.HOURS)));
    verify(bookings,never()).existsByUserIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(any(),any(),any(),any());
  }

  @Test void bookingMustStartAtLeast15MinutesFromNow(){
    var soon=Instant.now().plus(5,ChronoUnit.MINUTES);
    var ex=assertThrows(ResponseStatusException.class,()->svc.create(7L,5L,soon,soon.plus(1,ChronoUnit.HOURS)));
    assertEquals(400,ex.getStatusCode().value());
    assertTrue(ex.getReason().contains("15 minutes"));
  }

  @Test void missedArrivalWindowBecomesNoShow(){
    var b=new Booking(); b.setId(8L); b.setUserId(1L); b.setParkingSpaceId(5L); b.setStatus("CONFIRMED");
    when(bookings.findByStatusAndStartTimeBefore(eq("CONFIRMED"),any())).thenReturn(java.util.List.of(b));
    assertEquals(1,svc.markNoShows());
    assertEquals("NO_SHOW",b.getStatus());
    verify(events).publishEvent(any(BookingService.BookingEvent.class));
  }

  @Test void noShowBookingsCannotBeCancelledForARefund(){
    var b=new Booking(); b.setId(9L); b.setUserId(1L); b.setParkingSpaceId(5L); b.setStatus("NO_SHOW");
    when(bookings.findById(9L)).thenReturn(Optional.of(b));
    var ex=assertThrows(ResponseStatusException.class,()->svc.cancel(1L,false,9L));
    assertEquals(409,ex.getStatusCode().value());
    assertEquals("NO_SHOW",b.getStatus());
  }
}
