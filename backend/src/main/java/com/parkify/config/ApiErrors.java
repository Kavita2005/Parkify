package com.parkify.config;
import jakarta.servlet.http.*; import org.springframework.http.HttpStatus;
import java.io.IOException; import java.time.Instant; import java.util.LinkedHashMap; import java.util.Map;

/** One error shape for the whole API: { timestamp, status, error, message, path }. */
public final class ApiErrors {
  private ApiErrors(){}
  public static Map<String,Object> body(int status,String message,String path){
    var m=new LinkedHashMap<String,Object>();
    m.put("timestamp",Instant.now().toString()); m.put("status",status);
    m.put("error",HttpStatus.valueOf(status).name()); m.put("message",message); m.put("path",path);
    return m;
  }
  /** For security filters, which run before controllers and can't use @RestControllerAdvice. */
  public static void write(HttpServletResponse res,HttpServletRequest req,int status,String message) throws IOException {
    res.setStatus(status); res.setContentType("application/json"); res.setCharacterEncoding("UTF-8");
    res.getWriter().write(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(body(status,message,req.getRequestURI())));
  }
}
