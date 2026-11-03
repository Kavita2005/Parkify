package com.parkify.config;
import org.springframework.beans.factory.annotation.Value; import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.*; import org.springframework.messaging.simp.config.*;
import org.springframework.messaging.simp.stomp.*; import org.springframework.messaging.support.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.config.annotation.*; import java.util.List;

/** STOMP over WebSocket at /ws. Public topic: /topic/availability. Private queue: /user/queue/notifications (JWT on CONNECT). */
@Configuration @EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
  private final JwtService jwt; private final String origin;
  public WebSocketConfig(JwtService jwt,@Value("${parkify.cors-origin}") String origin){ this.jwt=jwt; this.origin=origin; }

  @Override public void registerStompEndpoints(StompEndpointRegistry r){ r.addEndpoint("/ws").setAllowedOriginPatterns(origin); }
  @Override public void configureMessageBroker(MessageBrokerRegistry r){
    r.enableSimpleBroker("/topic","/queue"); r.setApplicationDestinationPrefixes("/app"); r.setUserDestinationPrefix("/user"); }

  @Override public void configureClientInboundChannel(ChannelRegistration reg){
    reg.interceptors(new ChannelInterceptor(){
      @Override public Message<?> preSend(Message<?> m,MessageChannel ch){
        var acc=MessageHeaderAccessor.getAccessor(m,StompHeaderAccessor.class);
        if(acc!=null&&StompCommand.CONNECT.equals(acc.getCommand())){
          String h=acc.getFirstNativeHeader("Authorization");
          if(h!=null&&h.startsWith("Bearer ")){
            try{ var c=jwt.parse(h.substring(7)); acc.setUser(new UsernamePasswordAuthenticationToken(c.getSubject(),null,List.of())); }
            catch(Exception ignored){}
          }
        }
        return m;
      }});
  }
}
