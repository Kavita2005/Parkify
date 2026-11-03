package com.parkify.service;
import org.junit.jupiter.api.Test; import static org.junit.jupiter.api.Assertions.*;
class QuickSearchServiceTest {
  @Test void detectsVehicleTypes(){
    assertEquals("TWO_WHEELER",QuickSearchService.vehicle("need bike parking near station"));
    assertEquals("EV_CAR",QuickSearchService.vehicle("electric car charging please"));
    assertEquals("CAR",QuickSearchService.vehicle("space for my suv"));
    assertEquals("BUS",QuickSearchService.vehicle("parking for a school bus"));
    assertEquals("VAN",QuickSearchService.vehicle("tempo parking for deliveries"));
    assertEquals("RV",QuickSearchService.vehicle("camper overnight"));
    assertEquals("CAR",QuickSearchService.vehicle("parking for my car"));
    assertNull(QuickSearchService.vehicle("parking near the mall"));
  }
  @Test void haversineIsRoughlyRight() throws Exception {
    var m=SearchService.class.getDeclaredMethod("km",double.class,double.class,double.class,double.class); m.setAccessible(true);
    double d=(double)m.invoke(null,18.5204,73.8567,19.0760,72.8777);   // Pune → Mumbai
    assertTrue(d>110&&d<130);
  }
}
