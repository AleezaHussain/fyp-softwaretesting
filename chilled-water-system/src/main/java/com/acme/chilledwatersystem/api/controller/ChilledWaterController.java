package com.acme.chilledwatersystem.api.controller;

import com.acme.chilledwatersystem.api.dto.SimulationRequest;
import com.acme.chilledwatersystem.api.dto.SimulationResponse;
import com.acme.chilledwatersystem.api.service.ChilledWaterSimulationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for Chilled Water Cooling System Simulations
 * 
 * Provides endpoints to run 8760-hour simulations with CloudSim Plus integration
 */
@RestController
@RequestMapping("/api/v1/chilled-water")
@CrossOrigin(origins = "*") // Configure properly in production
@Tag(name = "Chilled Water Cooling", description = "APIs for chilled water cooling system simulations")
public class ChilledWaterController {

    @Autowired
    private ChilledWaterSimulationService simulationService;

    /**
     * Run a complete 8760-hour chilled water cooling simulation
     * 
     * @param request Simulation configuration from frontend
     * @return Simulation results with metrics, costs, emissions, and Phase 4 gates
     */
    @PostMapping("/simulate")
    @Operation(summary = "Run Simulation", description = "Execute 8760-hour chilled water cooling simulation with CloudSim Plus")
    public ResponseEntity<?> runSimulation(@Valid @RequestBody SimulationRequest request) {
        try {
            System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
            System.out.println("║  CHILLED WATER SIMULATION API - REQUEST RECEIVED                     ║");
            System.out.println("╚═══════════════════════════════════════════════════════════════════════╝");
            System.out.println("");
            System.out.println("📥 [BACKEND] Request Details:");
            System.out.println("  Location: " + request.getWeatherData().getLocation());
            System.out.println("  Weather Data Points: " + request.getWeatherData().getDataPoints().size());
            System.out.println("  Warming Delta: " + request.getClimateScenario().getWarmingDelta() + "°C");
            System.out.println("  Altitude: " + request.getSiteParameters().getAltitude() + " " + request.getSiteParameters().getAltitudeUnit());
            System.out.println("  Total Servers: " + request.getItInfrastructure().getTotalServers());
            System.out.println("  Workload Type: " + request.getItInfrastructure().getWorkloadType());
            System.out.println("  Chiller Type: " + request.getMechanicalSpecs().getChillerType());
            System.out.println("  Supply Water Temp: " + request.getMechanicalSpecs().getSupplyWaterTempC() + "°C");
            System.out.println("  Water Stress Level: " + request.getWaterStress().getWaterStressLevel());
            System.out.println("  Electricity Rate: $" + request.getEconomicEnvironmental().getBaseElectricityRate() + "/kWh");
            System.out.println("  TOU Enabled: " + request.getEconomicEnvironmental().getTouEnabled());
            System.out.println("");
            System.out.println("🚀 Starting simulation...");
            System.out.println("");

            SimulationResponse response = simulationService.runSimulation(request);
            
            System.out.println("");
            System.out.println("✅ Simulation completed successfully!");
            System.out.println("  Simulation ID: " + response.getSimulationId());
            System.out.println("  Execution Time: " + response.getExecutionTime() + " ms");
            System.out.println("  Annual Energy: " + String.format("%.2f", response.getResults().getAnnual().getEnergyConsumption_kWh()) + " kWh");
            System.out.println("  Annual Cost: $" + String.format("%.2f", response.getResults().getAnnual().getCost_USD()));
            System.out.println("  PUE: " + String.format("%.3f", response.getResults().getMetrics().getPue()));
            System.out.println("  WUE: " + String.format("%.3f", response.getResults().getMetrics().getWue()) + " L/kWh");
            System.out.println("");

            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Validation error: " + e.getMessage());
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
            
        } catch (Exception e) {
            System.err.println("❌ Simulation error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Simulation failed: " + e.getMessage()));
        }
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    @Operation(summary = "Health Check", description = "Check if the API is running")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Chilled Water Cooling API is running ✅");
    }

    /**
     * Get API version and info
     */
    @GetMapping("/info")
    @Operation(summary = "API Info", description = "Get API version and capabilities")
    public ResponseEntity<ApiInfo> info() {
        ApiInfo info = new ApiInfo(
            "Chilled Water Cooling System API",
            "1.0.0",
            "8760-hour simulation with CloudSim Plus integration",
            new String[]{"Weather data upload", "Climate scenarios", "Phase 4 gates", "Economic analysis"}
        );
        return ResponseEntity.ok(info);
    }

    // ============================================================================
    // HELPER CLASSES
    // ============================================================================

    record ErrorResponse(String message) {}

    record ApiInfo(String name, String version, String description, String[] features) {}
}
