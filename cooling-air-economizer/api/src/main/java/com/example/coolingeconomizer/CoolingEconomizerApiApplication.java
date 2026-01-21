package com.example.coolingeconomizer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CoolingEconomizerApiApplication {
    private static final Logger logger = LoggerFactory.getLogger(CoolingEconomizerApiApplication.class);

    public static void main(String[] args) {
        logger.info("Starting CoolingEconomizerApiApplication...");
        SpringApplication.run(CoolingEconomizerApiApplication.class, args);
        logger.info("CoolingEconomizerApiApplication started.");
    }
}
