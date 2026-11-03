package com.parkify.service;
import org.junit.jupiter.api.Test; import static org.junit.jupiter.api.Assertions.*;
class NotificationMessageTest {
  @Test void heldBookingsDoNotNotifyTheUser(){ assertNull(NotificationListener.message("BOOKING_HELD",1L)); }
  @Test void confirmedMentionsEntryPass(){ assertTrue(NotificationListener.message("BOOKING_CONFIRMED",7L).contains("entry pass")); }
}
