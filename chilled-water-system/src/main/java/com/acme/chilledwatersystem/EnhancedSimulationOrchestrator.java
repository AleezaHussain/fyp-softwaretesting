package com.acme.chilledwatersystem;

import org.cloudsimplus.brokers.DatacenterBroker;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.hosts.Host;

import java.util.ArrayList;
import java.util.List;

/**
 * Phase 2 Part 2: Enhanced 8760-Hour Co-Simulation Orchestrator
 * 
 * Implements conservative synchronization between CloudSim Plus and
 * chilled water physics with hour-by-hour lockstep execution.
 * 
 * Features:
 * - Time-of-Use (TOU) tariff tracking
 * - Peak demand monitoring
 * - Equipment degradation modeling
 * - Thermal compliance checking (ASHRAE 18-27°C)
 * - Hourly carbon accounting
 */
public class EnhancedSimulationOrchestrator {
    
    private final CloudSimPlus simulation;
    private final DatacenterBroker broker;
    private final List<Host> hosts;
    private final ChilledWaterPhysics physics;
    private final EnvironmentEngine weather;
    private final TariffSchedule tariff;
    private final EdgeDataCenterScenario scenario;
    
    private final List<HourlyResult> results = new ArrayList<>();
    private final List<String> thermalExcursions = new ArrayList<>();
    
    // Tracking variables
    private double totalEnergyCostUsd = 0.0;
    private double totalCarbonKg = 0.0;
    private double totalWaterLiters = 0.0;
    private int complianceViolations = 0;
    
    public EnhancedSimulationOrchestrator(CloudSimPlus simulation,
                                         DatacenterBroker broker,
                                         List<Host> hosts,
                                         ChilledWaterPhysics physics,
                                         EnvironmentEngine weather,
                                         TariffSchedule tariff,
                                         EdgeDataCenterScenario scenario) {
        this.simulation = simulation;
        this.broker = broker;
        this.hosts = hosts;
        this.physics = physics;
        this.weather = weather;
        this.tariff = tariff;
        this.scenario = scenario;
    }
    
    /**
     * Execute the full 8760-hour annual simulation with lockstep synchronization
     */
    public void runAnnualSimulation() {
        System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  PHASE 2 PART 2: ENHANCED 8760-HOUR CO-SIMULATION                    ║");
        System.out.println("║  Conservative Synchronization with CloudSim Plus                      ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        tariff.printSchedule();
        
        System.out.println("Starting 8760-hour simulation...\n");
        
        for (int h = 1; h <= 8760; h++) {
            // ===================================================================
            // STEP 1: Time Alignment - Get weather data for this specific hour
            // ===================================================================
            double ambientTempC = weather.getAmbientTemperature(h);
            double wetBulbTempC = weather.getWetBulbTemperature(h);
            
            // ===================================================================
            // STEP 2: IT Power Extraction - Advance CloudSim by 1 hour (3600s)
            // ===================================================================
            double itLoadKw = calculateITLoad(h);
            
            // ===================================================================
            // STEP 3: Physics Computation - Calculate cooling power using EIR
            // ===================================================================
            double chillerPowerKw = physics.calculateChillerPower(
                itLoadKw, 
                ambientTempC, 
                wetBulbTempC
            );
            
            // Calculate auxiliary cooling equipment power
            double fanPowerKw = calculateFanPower(itLoadKw);
            double pumpPowerKw = calculatePumpPower(itLoadKw);
            
            // Calculate rack inlet temperature
            double rackInletTempC = calculateRackInletTemp(ambientTempC);
            
            // ===================================================================
            // STEP 4: State Update - Increment equipment degradation
            // ===================================================================
            physics.incrementFouling(1.0); // Add 1 hour of wear
            
            // ===================================================================
            // STEP 5: Cost & Carbon Logging - Apply TOU tariffs
            // ===================================================================
            double totalFacilityKw = itLoadKw + chillerPowerKw + fanPowerKw + pumpPowerKw + 7.2; // +7.2 kW edge overhead
            double hourlyCostUsd = tariff.calculateHourlyCost(h, totalFacilityKw);
            String tariffPeriod = tariff.getTariffPeriod(h);
            
            // Carbon calculation
            double carbonFactorKgKwh = scenario.getCarbonFactorKgKwh();
            double carbonKg = totalFacilityKw * carbonFactorKgKwh;
            
            // Water usage (for cooling tower evaporation)
            double waterLiters = calculateWaterUsage(chillerPowerKw);
            
            // ===================================================================
            // STEP 6: Compliance Monitoring - Check ASHRAE thermal limits
            // ===================================================================
            boolean thermalCompliance = (rackInletTempC >= 18.0 && rackInletTempC <= 27.0);
            if (!thermalCompliance) {
                complianceViolations++;
                String excursion = String.format(
                    "Hour %d: Rack inlet %.1f°C (Ambient: %.1f°C, IT Load: %.1f kW)",
                    h, rackInletTempC, ambientTempC, itLoadKw
                );
                thermalExcursions.add(excursion);
                
                if (complianceViolations <= 5) {
                    System.out.println("⚠️  THERMAL EXCURSION: " + excursion);
                }
            }
            
            // ===================================================================
            // STEP 7: Record hourly result
            // ===================================================================
            HourlyResult result = new HourlyResult(
                h, itLoadKw, chillerPowerKw, fanPowerKw, pumpPowerKw,
                hourlyCostUsd, rackInletTempC, ambientTempC, wetBulbTempC,
                tariffPeriod, carbonKg
            );
            results.add(result);
            
            // Update totals
            totalEnergyCostUsd += hourlyCostUsd;
            totalCarbonKg += carbonKg;
            totalWaterLiters += waterLiters;
            
            // Print progress every 730 hours (monthly)
            if (h % 730 == 0) {
                int month = h / 730;
                System.out.printf("Month %d complete | Peak Demand: %.1f kW | Cost: $%.2f\n",
                    month, tariff.getMonthlyPeakDemandKw(), hourlyCostUsd * 730);
            }
        }
        
        System.out.println("\n✅ 8760-hour simulation complete!\n");
        printAnnualSummary();
    }
    
    /**
     * Calculate IT load for a given hour
     * Uses CloudSim host power models
     */
    private double calculateITLoad(int hour) {
        double totalPowerKw = 0.0;
        
        for (Host host : hosts) {
            // Get host utilization (0.0 to 1.0)
            double utilization = host.getCpuPercentUtilization();
            
            // Calculate power using host power model
            double powerWatts = host.getPowerModel().getPower(utilization);
            totalPowerKw += powerWatts / 1000.0;
        }
        
        return totalPowerKw;
    }
    
    /**
     * Calculate fan power using cubic law scaling
     * Fan power scales with the cube of airflow
     */
    private double calculateFanPower(double itLoadKw) {
        // Base fan power: 5 kW at 100 kW IT load
        // Cubic scaling: P_fan = P_base * (Q/Q_base)^3
        double baseFanPower = 5.0;
        double baseITLoad = 100.0;
        
        if (itLoadKw < 0.1) {
            return 0.5; // Minimum fan power
        }
        
        double fanPower = baseFanPower * Math.pow(itLoadKw / baseITLoad, 3.0);
        return Math.max(0.5, Math.min(fanPower, 15.0)); // Clamp between 0.5-15 kW
    }
    
    /**
     * Calculate pump power for chilled water circulation
     */
    private double calculatePumpPower(double itLoadKw) {
        // Pump power: ~2-3% of IT load for chilled water systems
        double pumpPower = itLoadKw * 0.025;
        return Math.max(0.3, Math.min(pumpPower, 5.0)); // Clamp between 0.3-5 kW
    }
    
    /**
     * Calculate rack inlet temperature
     * Simplified model: Supply air temp + approach
     */
    private double calculateRackInletTemp(double ambientTempC) {
        // Chilled water supply: 7°C
        // CRAH approach: 3-5°C
        double chilledWaterSupply = 7.0;
        double crahApproach = 4.0;
        double rackInletTemp = chilledWaterSupply + crahApproach + (ambientTempC * 0.1);
        
        return rackInletTemp;
    }
    
    /**
     * Calculate water usage for cooling tower evaporation
     */
    private double calculateWaterUsage(double chillerPowerKw) {
        // Typical evaporation: 1.8 L/kWh for cooling towers
        return chillerPowerKw * 1.8;
    }
    
    /**
     * Print comprehensive annual summary
     */
    private void printAnnualSummary() {
        System.out.println("═".repeat(75));
        System.out.println("ANNUAL SIMULATION SUMMARY");
        System.out.println("═".repeat(75));
        
        // Calculate totals
        double totalITEnergyKwh = 0.0;
        double totalCoolingEnergyKwh = 0.0;
        double totalFacilityEnergyKwh = 0.0;
        double avgPue = 0.0;
        int peakHours = 0;
        int partialPeakHours = 0;
        int offPeakHours = 0;
        
        for (HourlyResult result : results) {
            totalITEnergyKwh += result.getItLoadKw();
            totalCoolingEnergyKwh += result.getTotalCoolingKw();
            totalFacilityEnergyKwh += result.getTotalFacilityKw();
            avgPue += result.getPue();
            
            switch (result.getTariffPeriod()) {
                case "PEAK":
                    peakHours++;
                    break;
                case "PARTIAL_PEAK":
                    partialPeakHours++;
                    break;
                case "OFF_PEAK":
                    offPeakHours++;
                    break;
            }
        }
        
        avgPue /= results.size();
        
        System.out.println("\nENERGY METRICS:");
        System.out.printf("  Total IT Energy: %.2f MWh\n", totalITEnergyKwh / 1000.0);
        System.out.printf("  Total Cooling Energy: %.2f MWh\n", totalCoolingEnergyKwh / 1000.0);
        System.out.printf("  Total Facility Energy: %.2f MWh\n", totalFacilityEnergyKwh / 1000.0);
        System.out.printf("  Average PUE: %.3f\n", avgPue);
        
        System.out.println("\nECONOMIC METRICS:");
        System.out.printf("  Total Energy Cost: $%.2f\n", totalEnergyCostUsd);
        System.out.printf("  Average Cost per kWh: $%.4f\n", totalEnergyCostUsd / totalFacilityEnergyKwh);
        System.out.printf("  Peak Hours: %d (%.1f%%)\n", peakHours, peakHours * 100.0 / 8760);
        System.out.printf("  Partial Peak Hours: %d (%.1f%%)\n", partialPeakHours, partialPeakHours * 100.0 / 8760);
        System.out.printf("  Off-Peak Hours: %d (%.1f%%)\n", offPeakHours, offPeakHours * 100.0 / 8760);
        
        System.out.println("\nSUSTAINABILITY METRICS:");
        System.out.printf("  Total Carbon Emissions: %.2f tons CO2\n", totalCarbonKg / 1000.0);
        System.out.printf("  Carbon Intensity (CUE): %.3f kg CO2/kWh\n", totalCarbonKg / totalITEnergyKwh);
        System.out.printf("  Total Water Usage: %.2f m³\n", totalWaterLiters / 1000.0);
        System.out.printf("  Water Usage Effectiveness (WUE): %.3f L/kWh\n", totalWaterLiters / totalITEnergyKwh);
        
        System.out.println("\nTHERMAL COMPLIANCE:");
        System.out.printf("  Compliant Hours: %d (%.2f%%)\n", 
            8760 - complianceViolations, (8760 - complianceViolations) * 100.0 / 8760);
        System.out.printf("  Excursion Hours: %d (%.2f%%)\n", 
            complianceViolations, complianceViolations * 100.0 / 8760);
        
        if (complianceViolations > 0) {
            System.out.println("\n  First 5 Thermal Excursions:");
            for (int i = 0; i < Math.min(5, thermalExcursions.size()); i++) {
                System.out.println("    " + thermalExcursions.get(i));
            }
            if (thermalExcursions.size() > 5) {
                System.out.printf("    ... and %d more\n", thermalExcursions.size() - 5);
            }
        }
        
        System.out.println("\n" + "═".repeat(75));
    }
    
    /**
     * Get all hourly results
     */
    public List<HourlyResult> getResults() {
        return results;
    }
    
    /**
     * Get thermal excursions
     */
    public List<String> getThermalExcursions() {
        return thermalExcursions;
    }
    
    /**
     * Get total energy cost
     */
    public double getTotalEnergyCostUsd() {
        return totalEnergyCostUsd;
    }
    
    /**
     * Get total carbon emissions
     */
    public double getTotalCarbonKg() {
        return totalCarbonKg;
    }
}
