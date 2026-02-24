package com.acme.chilledwatersystem.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

/**
 * Spring Boot Application for Chilled Water Cooling System REST API
 * 
 * Access Swagger UI at: http://localhost:8080/swagger-ui.html
 * Access API docs at: http://localhost:8080/v3/api-docs
 */
@SpringBootApplication
@ComponentScan(basePackages = "com.acme.chilledwatersystem")
public class ChilledWaterApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChilledWaterApiApplication.class, args);
        System.out.println("\n==============================================");
        System.out.println("Chilled Water Cooling System API Started!");
        System.out.println("==============================================");
        System.out.println("Swagger UI: http://localhost:8080/swagger-ui.html");
        System.out.println("API Docs:   http://localhost:8080/v3/api-docs");
        System.out.println("Health:     http://localhost:8080/api/v1/health");
        System.out.println("==============================================\n");
    }
}
