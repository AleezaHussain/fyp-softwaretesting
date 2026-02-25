package com.acme.chilledwatersystem;

import com.acme.chilledwatersystem.EnvironmentEngine.HourlyWeather;
import com.acme.chilledwatersystem.ChilledWaterPhysics.CoolingMetrics;

/**
 * Step 2 Demo (Simplified - Shows Integration Concept)
 * 
 * Demonstrates the 8760-hour co-simulation concept with:
 * - Hour-by-hour synchronization
 * - EIR-based chiller physics
 * - Equipment degradation tracking
 * - Time-of-Use tariffs
 * - Thermal compliance monitoring
 * 
 * This version simulates IT load without requiring CloudSim runtime.
 */
public class Step2DemoSimplified {
    
    public static void main(String[] args) {
        System.out.println("=== Step 2: 8760-Hour Co-Simulation Engine ===\n");
        System.out.println("Conservative Synchronization: CloudSim + Chilled Water Physics\n");
        
        // STEP 1: Create scenario
        EdgeDataCenterScenario scenario = createScenario();
        System.out.println(scenario);
        System.out.println();
        
        // STEP 2: Initialize components
        EnvironmentEngine envEngine = new EnvironmentEngine(scenario);
        envEngine.initialize();
        
        ChilledWaterPhysics physics = new ChilledWaterPhysics(scenario);
        CoolingCostCalculator costCalc = new CoolingCostCalculator(scenario);
        
        System.out.println("=== Infrastructure Summary ===");
        System.out.printf("Total Servers: %d\n", scenario.getTotalServers());
        System.out.printf("Design IT Power: %.2f kW\n", scenario.getTotalDesignPowerKW());
        System.out.printf("Chiller Reference COP: %.2f\n", scenario.getChillerReferenceCop());
        System.out.println();
        
        // STEP 3: Run 8760-hour simulation with lockstep synchronization
        System.out.println("=== Running 8760-Hour Co-Simulation ===\n");
        System.out.printf("%-8s %-10s %-10s %-10s %-8s %-10s %-8s %-10s %-10s\n",
            "Hour", "IT Load", "Cooling", "Chiller", "COP", "Cost", "PUE", "Inlet T", "Fouling");
        System.out.println("-".repeat(95));
        
        double totalCost = 0.0;
        double totalCarbonKg = 0.0;
        int thermalExcursions = 0;
        double peakDemandKW = 0.0;
        
        for (int hour = 1; hour <= 8760; hour++) {
            // === LOCKSTEP SYNCHRONIZATION ===
            
            // 1. Time Alignment: Get weather for this specific hour
            HourlyWeather weather = envEngine.getWeather(hour - 1);
            
            // 2. IT Power Extraction: Simulate CloudSim workload
            // In real implementation, this would be: simulation.runFor(3600)
            double itLoadKW = simulateCloudSimWorkload(scenario, hour);
            
            // 3. Physics Computation: Apply EIR framework
            CoolingMetrics cooling = physics.calculateCooling(
                itLoadKW,
                weather.ambientTempC,
                weather.wetbulbTempC
            );
            
            // 4. State Update: Increment degradation
            physics.incrementFouling(1.0);
            
            // 5. Cost & Carbon Logging: Time-aware tariffs
            double hourlyCost = calculateHourlyCost(itLoadKW, cooling.getTotalCoolingKW(), hour, scenario);
            totalCost += hourlyCost;
            
            double totalFacilityKW = itLoadKW + cooling.getTotalCoolingKW();
            double hourlyCarbonKg = totalFacilityKW * scenario.getCarbonFactorKgKwh();
            totalCarbonKg += hourlyCarbonKg;
            
            // Track peak demand
            if (totalFacilityKW > peakDemandKW) {
                peakDemandKW = totalFacilityKW;
            }
            
            // 6. Compliance Monitoring: Check ASHRAE boundaries
            boolean compliant = cooling.rackInletTempC >= scenario.getMinInletTempC() &&
                               cooling.rackInletTempC <= scenario.getMaxInletTempC();
            if (!compliant) {
                thermalExcursions++;
            }
            
            // Calculate PUE
            double pue = totalFacilityKW / itLoadKW;
            
            // Print daily summary (every 24 hours)
            if (hour % 24 == 0) {
                System.out.printf("%04d:00  %8.2f kW %8.2f kW %8.2f kW %6.2f  $%7.2f  %6.2f  %7.2f°C  %6.2fx\n",
                    hour, itLoadKW, cooling.getTotalCoolingKW(), cooling.chillerPowerKW,
                    cooling.chillerCOP, hourlyCost, pue, cooling.rackInletTempC, 
                    physics.getCurrentFoulingFactor());
            }
            
            // Simulate maintenance every 2000 hours
            if (hour % 2000 == 0) {
                physics.performMaintenance();
            }
        }
        
        System.out.println("-".repeat(95));
        
        // STEP 4: Print annual summary
        double totalITEnergyKWh = scenario.getTotalDesignPowerKW() * 0.6 * 8760; // 60% avg utilization
        double totalCoolingEnergyKWh = totalCost / scenario.getElectricityRateUsdKwh(); // Approximate
        double annualPUE = (totalITEnergyKWh + totalCoolingEnergyKWh) / totalITEnergyKWh;
        
        System.out.println("\n=== Annual Performance Summary ===");
        System.out.printf("Total IT Energy: %.2f MWh\n", totalITEnergyKWh / 1000.0);
        System.out.printf("Total Cooling Energy: %.2f MWh (estimated)\n", totalCoolingEnergyKWh / 1000.0);
        System.out.printf("Annual PUE: %.3f\n", annualPUE);
        System.out.printf("Total Energy Cost: $%.2f\n", totalCost);
        System.out.printf("Peak Demand: %.2f kW\n", peakDemandKW);
        System.out.printf("Demand Charges: $%.2f\n", peakDemandKW * scenario.getDemandChargeUsdKw() * 12);
        System.out.printf("Total Carbon Emissions: %.2f metric tons CO2\n", totalCarbonKg / 1000.0);
        System.out.printf("Thermal Excursions: %d / 8760 hours (%.2f%%)\n", 
            thermalExcursions, 100.0 * thermalExcursions / 8760.0);
        System.out.println("===================================\n");
        
        System.out.println("=== Step 2 Implementation Complete ===");
        System.out.println("✓ Hour-by-hour lockstep synchronization");
        System.out.println("✓ EIR framework for chiller efficiency");
        System.out.println("✓ Equipment degradation tracking (fouling)");
        System.out.println("✓ Time-of-Use tariff implementation");
        System.out.println("✓ Thermal compliance monitoring (ASHRAE)");
        System.out.println("✓ Peak demand tracking for demand charges");
        System.out.println("✓ Carbon emissions calculation");
        System.out.println("\nReady for CloudSim integration!");
    }
    
    private static EdgeDataCenterScenario createScenario() {
        EdgeDataCenterScenario scenario = new EdgeDataCenterScenario();
        scenario.setTotalRacks(2);
        scenario.setServersPerRack(10);
        scenario.setServerMaxPowerW(500.0);
        scenario.setServerIdlePowerW(200.0);
        scenario.setServerFanPowerW(25.0);
        scenario.setUpsLossFraction(0.09);
        scenario.setPduLossFraction(0.02);
        scenario.setMaxInletTempC(27.0);
        scenario.setMinInletTempC(18.0);
        scenario.setChillerReferenceCop(6.0);
        scenario.setChillerReferenceLoadKW(100.0);
        scenario.setChillerPerformanceCoeffs(new double[]{
            0.653, -0.0158, 0.00001, 0.0153, 0.0002, -0.00024
        });
        scenario.setPumpPowerKw(3.0);
        scenario.setCoolingTowerFanPowerKw(5.0);
        scenario.setElectricityRateUsdKwh(0.12);
        scenario.setDemandChargeUsdKw(15.00);
        scenario.setCarbonFactorKgKwh(0.45);
        return scenario;
    }
    
    /**
     * Simulate CloudSim workload with realistic patterns
     * In real implementation, this would be replaced by actual CloudSim execution
     */
    private static double simulateCloudSimWorkload(EdgeDataCenterScenario scenario, int hour) {
        int hourOfDay = (hour - 1) % 24;
        int dayOfWeek = ((hour - 1) / 24) % 7;
        
        // Weekday vs weekend pattern
        double baseUtilization = (dayOfWeek < 5) ? 60.0 : 40.0;
        
        // Diurnal pattern (peak during business hours)
        double diurnalVar = 20.0 * Math.sin(((hourOfDay - 6) / 24.0) * 2 * Math.PI);
        
        // Random variation (simulates workload bursts)
        double randomVar = (Math.random() - 0.5) * 10.0;
        
        double utilization = Math.max(20.0, Math.min(90.0, baseUtilization + diurnalVar + randomVar));
        
        // Calculate IT load
        int totalServers = scenario.getTotalServers();
        double idlePower = scenario.getServerIdlePowerW();
        double maxPower = scenario.getServerMaxPowerW();
        double fanPower = scenario.getServerFanPowerW();
        
        double powerPerServerW = idlePower + (maxPower - idlePower) * (utilization / 100.0) + fanPower;
        double totalServerPowerKW = (powerPerServerW * totalServers) / 1000.0;
        
        // Add UPS and PDU losses
        double upsLosses = totalServerPowerKW * scenario.getUpsLossFraction();
        double pduLosses = totalServerPowerKW * scenario.getPduLossFraction();
        
        return totalServerPowerKW + upsLosses + pduLosses;
    }
    
    /**
     * Calculate hourly cost with Time-of-Use tariffs
     */
    private static double calculateHourlyCost(double itLoadKW, double coolingKW, int hour, EdgeDataCenterScenario scenario) {
        double edgeOverheadKW = 7.2; // Fixed edge infrastructure
        double totalFacilityKW = itLoadKW + coolingKW + edgeOverheadKW;
        
        // Time-of-Use tariff
        int hourOfDay = (hour - 1) % 24;
        int dayOfWeek = ((hour - 1) / 24) % 7;
        boolean isWeekday = dayOfWeek < 5;
        
        double baseRate = scenario.getElectricityRateUsdKwh();
        double tariffRate = baseRate;
        
        if (isWeekday && hourOfDay >= 12 && hourOfDay < 18) {
            tariffRate = baseRate * 1.5; // Peak hours
        } else if (hourOfDay >= 22 || hourOfDay < 6) {
            tariffRate = baseRate * 0.7; // Off-peak hours
        }
        
        return totalFacilityKW * tariffRate;
    }
}
