package com.parkify.service;
import org.junit.jupiter.api.Test; import static org.junit.jupiter.api.Assertions.*;
class PaymentServiceTest {
  // Standard HMAC-SHA256 test vector (key "key", message "The quick brown fox jumps over the lazy dog")
  private static final String SIG="f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8";
  private static final String MSG="The quick brown fox jumps over the lazy dog";
  @Test void acceptsAValidSignature(){ assertTrue(PaymentService.hmacOk("key",MSG,SIG)); }
  @Test void rejectsATamperedPayload(){ assertFalse(PaymentService.hmacOk("key",MSG+"!",SIG)); }
  @Test void rejectsAWrongSecretOrMissingSignature(){
    assertFalse(PaymentService.hmacOk("other",MSG,SIG)); assertFalse(PaymentService.hmacOk("key",MSG,null)); assertFalse(PaymentService.hmacOk("",MSG,SIG)); }
}
