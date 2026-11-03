package com.parkify.config;
import com.parkify.domain.*; import com.parkify.repo.Repos.UserRepo;
import org.slf4j.*; import org.springframework.beans.factory.annotation.Value; import org.springframework.boot.ApplicationArguments; import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder; import org.springframework.stereotype.Component;

/** Creates the first admin account on startup if none exists. Change the password after first login. */
@Component
public class AdminSeeder implements ApplicationRunner {
  private static final Logger log=LoggerFactory.getLogger(AdminSeeder.class);
  private final UserRepo users; private final PasswordEncoder enc; private final String email,password;
  public AdminSeeder(UserRepo u,PasswordEncoder e,@Value("${parkify.admin-email}") String email,@Value("${parkify.admin-password}") String pw){ users=u; enc=e; this.email=email; password=pw; }
  @Override public void run(ApplicationArguments args){
    if(users.existsByRole(Role.ADMIN)) return;
    var u=new User(); u.setName("Administrator"); u.setEmail(email.toLowerCase()); u.setPasswordHash(enc.encode(password)); u.setRole(Role.ADMIN);
    users.save(u); log.warn("Created default admin account {} — change this password before real use.",email);
  }
}
