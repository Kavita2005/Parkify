package com.parkify.web;
import com.parkify.config.ApiErrors;
import org.slf4j.*; import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*; import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.ErrorResponse; import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*; import org.springframework.web.context.request.*;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import java.util.*;

/** Every error leaves the API in the same JSON shape, with a message the frontend can show as-is. */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {
  private static final Logger log=LoggerFactory.getLogger(ApiExceptionHandler.class);
  private static String path(WebRequest r){ return r instanceof ServletWebRequest s ? s.getRequest().getRequestURI() : ""; }
  private static ResponseEntity<Object> res(int status,String msg,WebRequest r){ return ResponseEntity.status(status).body(ApiErrors.body(status,msg,path(r))); }
  private static String fallback(int status){
    return switch(status){ case 400->"That request wasn't valid. Please check the values and try again."; case 401->"Please log in to continue.";
      case 403->"You don't have permission to do that."; case 404->"We couldn't find that."; case 405->"That action isn't supported.";
      case 415->"Unsupported content type."; default->"The request could not be completed."; };
  }

  @Override protected ResponseEntity<Object> handleExceptionInternal(Exception ex,Object body,HttpHeaders h,HttpStatusCode status,WebRequest r){
    String msg=(ex instanceof ErrorResponse er&&er.getBody().getDetail()!=null&&!er.getBody().getDetail().isBlank())?er.getBody().getDetail():fallback(status.value());
    return res(status.value(),msg,r);          // covers ResponseStatusException (our 404/409/402...), bad JSON, wrong types, missing params
  }

  @Override protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,HttpHeaders h,HttpStatusCode s,WebRequest r){
    var fields=new LinkedHashMap<String,String>();
    ex.getBindingResult().getFieldErrors().forEach(f->fields.putIfAbsent(f.getField(),f.getDefaultMessage()));
    var b=ApiErrors.body(400,"Please check: "+String.join(", ",fields.keySet()),path(r)); b.put("fields",fields);
    return ResponseEntity.badRequest().body(b);
  }

  @ExceptionHandler(AccessDeniedException.class) ResponseEntity<Object> denied(WebRequest r){ return res(403,fallback(403),r); }
  @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<Object> integrity(WebRequest r){ return res(409,"That conflicts with existing data.",r); }
  @ExceptionHandler(Exception.class) ResponseEntity<Object> other(Exception ex,WebRequest r){
    log.error("Unhandled error on {}",path(r),ex); return res(500,"Something went wrong on our side. Please try again.",r); }
}
