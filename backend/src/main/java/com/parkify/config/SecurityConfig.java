package com.parkify.config;
import jakarta.servlet.*; import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value; import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*; import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException; import java.util.List;

@Configuration @EnableMethodSecurity
public class SecurityConfig {
  @Bean PasswordEncoder encoder(){ return new BCryptPasswordEncoder(); }

  @Bean SecurityFilterChain chain(HttpSecurity http, JwtService jwt) throws Exception {
    http.csrf(c->c.disable()).cors(c->{}).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(a->a
        .requestMatchers("/api/v1/auth/register","/api/v1/auth/login","/actuator/health","/ws/**","/api/v1/payments/webhook","/swagger-ui/**","/v3/api-docs/**").permitAll()
        .requestMatchers(HttpMethod.GET,"/api/v1/parking-lots","/api/v1/parking-lots/**").permitAll()
        .requestMatchers("/api/v1/search/**").permitAll()
        .anyRequest().authenticated())
      .exceptionHandling(e->e.authenticationEntryPoint((req,res,ex)->ApiErrors.write(res,req,401,"Please log in to continue."))
        .accessDeniedHandler((req,res,ex)->ApiErrors.write(res,req,403,"You don't have permission to do that.")))
      .addFilterBefore(new OncePerRequestFilter(){
        @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain fc) throws ServletException,IOException {
          String h=req.getHeader("Authorization");
          if(h!=null && h.startsWith("Bearer ")){
            try{ var c=jwt.parse(h.substring(7));
              SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                Long.valueOf(c.getSubject()),null,List.of(new SimpleGrantedAuthority("ROLE_"+c.get("role",String.class)))));
            }catch(Exception ignored){}
          }
          fc.doFilter(req,res);
        }}, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  @Bean CorsConfigurationSource corsConfigurationSource(@Value("${parkify.cors-origin}") String origin){   // this exact bean name is what Spring Security looks for
    var cfg=new CorsConfiguration(); cfg.setAllowedOrigins(List.of(origin,origin.replace("localhost","127.0.0.1"))); cfg.setAllowedMethods(List.of("*")); cfg.setAllowedHeaders(List.of("*"));
    var src=new UrlBasedCorsConfigurationSource(); src.registerCorsConfiguration("/**",cfg); return src; }
}
