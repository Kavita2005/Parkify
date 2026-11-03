package com.parkify;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
@SpringBootApplication @EnableScheduling @EnableAsync
@EnableJpaRepositories(considerNestedRepositories = true)   // repositories are nested inside the Repos class
public class ParkifyApplication { public static void main(String[] a){ SpringApplication.run(ParkifyApplication.class,a);} }
