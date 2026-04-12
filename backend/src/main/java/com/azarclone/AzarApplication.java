package com.azarclone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AzarApplication {
    public static void main(String[] args) {
        SpringApplication.run(AzarApplication.class, args);
    }
}
