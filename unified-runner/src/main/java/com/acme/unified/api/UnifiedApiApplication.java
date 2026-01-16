package com.acme.unified.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"com.acme.unified"})
public class UnifiedApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(UnifiedApiApplication.class, args);
    }
}
