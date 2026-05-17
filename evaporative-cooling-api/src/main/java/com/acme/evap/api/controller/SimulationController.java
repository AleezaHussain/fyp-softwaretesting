package com.acme.evap.api.controller;

import com.acme.evap.api.dto.SimulationRequest;
import com.acme.evap.api.dto.SimulationResponse;
import com.acme.evap.api.service.EvaporativeCoolingService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * REST API Controller for Evaporative Cooling Simulations
 * Handles 8760-hour weather-driven simulations with CSV upload
 */
@RestController
@RequestMapping("/api/simulations")
public class SimulationController {
    
    @Autowired
    private EvaporativeCoolingService simulationService;
    
    /**
     * Run evaporative cooling simulation with weather CSV file
     * 
     * @param weatherFile CSV file with 8760 hours of weather data
     * @param request Simulation configuration parameters
     * @return Complete simulation results with cooling adequacy assessment
     */
    @PostMapping(value = "/evaporative-cooling", 
                 consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
                 produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SimulationResponse> runEvaporativeCoolingSimulation(
            @RequestParam("weatherFile") MultipartFile weatherFile,
            @RequestParam("config") @Valid String configJson) {
        
        try {
            System.out.println("=== EVAPORATIVE COOLING REQUEST DEBUG ===");
            System.out.println("Weather file: " + (weatherFile != null ? weatherFile.getOriginalFilename() : "NULL"));
            System.out.println("Weather file size: " + (weatherFile != null ? weatherFile.getSize() : "NULL"));
            System.out.println("Config JSON length: " + (configJson != null ? configJson.length() : "NULL"));
            System.out.println("Config JSON preview: " + (configJson != null ? configJson.substring(0, Math.min(200, configJson.length())) : "NULL"));
            
            // Validate weather file
            if (weatherFile.isEmpty()) {
                System.out.println("ERROR: Weather file is empty");
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Weather file is required"));
            }
            
            if (!weatherFile.getOriginalFilename().toLowerCase().endsWith(".csv")) {
                System.out.println("ERROR: Weather file is not CSV format: " + weatherFile.getOriginalFilename());
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Weather file must be CSV format"));
            }
            
            System.out.println("Weather file validation passed");
            
            // Parse configuration JSON
            System.out.println("Parsing configuration JSON...");
            SimulationRequest request = simulationService.parseConfigJson(configJson);
            System.out.println("Configuration parsed successfully");
            
            // Run simulation
            System.out.println("Starting simulation...");
            SimulationResponse response = simulationService.runSimulation(weatherFile, request);
            System.out.println("Simulation completed successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            System.out.println("ERROR: IllegalArgumentException - " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(createErrorResponse("Invalid configuration: " + e.getMessage()));
        } catch (Exception e) {
            System.out.println("ERROR: Exception - " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                .body(createErrorResponse("Simulation failed: " + e.getMessage()));
        }
    }
    
    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Evaporative Cooling API is running");
    }
    
    /**
     * Get simulation configuration template
     */
    @GetMapping("/config-template")
    public ResponseEntity<SimulationRequest> getConfigTemplate() {
        SimulationRequest template = simulationService.createDefaultConfig();
        return ResponseEntity.ok(template);
    }
    
    private SimulationResponse createErrorResponse(String message) {
        SimulationResponse response = new SimulationResponse();
        response.status = "error";
        response.message = message;
        return response;
    }
}