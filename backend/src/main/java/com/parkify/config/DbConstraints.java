package com.parkify.config;
import org.springframework.boot.ApplicationArguments; import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate; import org.springframework.stereotype.Component;

/** Database-level protection against double booking (PostgreSQL range exclusion constraint). */
@Component
public class DbConstraints implements ApplicationRunner {
  private final JdbcTemplate jdbc;
  public DbConstraints(JdbcTemplate jdbc){ this.jdbc=jdbc; }
  @Override public void run(ApplicationArguments args){
    jdbc.execute("CREATE EXTENSION IF NOT EXISTS btree_gist");
    jdbc.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap");
    jdbc.execute("""
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bookings_active_no_overlap') THEN
          ALTER TABLE bookings ADD CONSTRAINT bookings_active_no_overlap
            EXCLUDE USING gist (parking_space_id WITH =, tstzrange(start_time,end_time) WITH &&)
            WHERE (status IN ('PENDING_PAYMENT','CONFIRMED','CHECKED_IN'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bookings_valid_period') THEN
          ALTER TABLE bookings ADD CONSTRAINT bookings_valid_period CHECK (end_time > start_time);
        END IF;
      END $$;""");
  }
}
