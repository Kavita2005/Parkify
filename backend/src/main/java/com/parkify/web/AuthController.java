package com.parkify.web;
import com.parkify.config.JwtService; import com.parkify.domain.*; import com.parkify.repo.Repos.UserRepo;
import jakarta.validation.Valid; import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus; import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder; import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException; import java.util.Map;

@RestController @RequestMapping("/api/v1/auth")
public class AuthController {
  record RegisterReq(@NotBlank String name,@Email @NotBlank String email,@Size(min=8) String password,String role){}
  record LoginReq(@NotBlank String email,@NotBlank String password){}
  private final UserRepo users; private final PasswordEncoder enc; private final JwtService jwt;
  public AuthController(UserRepo u,PasswordEncoder e,JwtService j){ users=u; enc=e; jwt=j; }

  @PostMapping("/register") Map<String,Object> register(@Valid @RequestBody RegisterReq r){
    if(users.findByEmail(r.email().toLowerCase()).isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Email already registered");
    var u=new User(); u.setName(r.name()); u.setEmail(r.email().toLowerCase()); u.setPasswordHash(enc.encode(r.password()));
    u.setRole("OWNER".equalsIgnoreCase(r.role())?Role.OWNER:Role.DRIVER);   // ADMIN can never be self-assigned
    u=users.save(u); return resp(u); }

  @PostMapping("/login") Map<String,Object> login(@Valid @RequestBody LoginReq r){
    var u=users.findByEmail(r.email().toLowerCase()).filter(x->enc.matches(r.password(),x.getPasswordHash()))
      .orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid email or password"));
    if(Boolean.FALSE.equals(u.getEnabled())) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"This account has been disabled");
    return resp(u); }

  @GetMapping("/me") Map<String,Object> me(Authentication a){
    var u=users.findById((Long)a.getPrincipal()).orElseThrow();
    return Map.of("id",u.getId(),"name",u.getName(),"email",u.getEmail(),"role",u.getRole()); }

  private Map<String,Object> resp(User u){
    return Map.of("token",jwt.create(u.getId(),u.getRole().name()),"user",Map.of("id",u.getId(),"name",u.getName(),"email",u.getEmail(),"role",u.getRole())); }
}
