package com.acme.evap.api.controller;

import com.acme.evap.api.service.WeatherCsvParser;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Test endpoints for API development and debugging
 */
@RestController
@RequestMapping("/api/test")
public class TestController {
    
    /**
     * Generate sample weather CSV for testing
     */
    @GetMapping("/sample-weather-csv")
    public ResponseEntity<String> getSampleWeatherCsv() {
        String csvContent = WeatherCsvParser.generateSampleWeatherCsv();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        headers.setContentDispositionFormData("attachment", "sample_weather_8760h.csv");
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(csvContent);
    }
    
    /**
     * API status check
     */
    @GetMapping("/status")
    public ResponseEntity<String> getStatus() {
        return ResponseEntity.ok("Evaporative Cooling API is running successfully");
    }
}