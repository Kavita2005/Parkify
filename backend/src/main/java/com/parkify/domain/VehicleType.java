package com.parkify.domain;
public enum VehicleType {
  TWO_WHEELER("2W"), CAR("CAR"), SUV("SUV"), EV_CAR("EV"), TRUCK("TRK"), BUS("BUS"), VAN("VAN"), RV("RV"), CYCLE("CYC");
  public final String prefix;
  VehicleType(String p){ prefix=p; }
  public static VehicleType parse(String s){
    try{ return valueOf(s.trim().toUpperCase()); }
    catch(Exception e){ throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
      "Unknown vehicle type '"+s+"'. Allowed: CAR, TWO_WHEELER, EV_CAR, TRUCK, BUS, VAN, RV, CYCLE"); }
  }
}
