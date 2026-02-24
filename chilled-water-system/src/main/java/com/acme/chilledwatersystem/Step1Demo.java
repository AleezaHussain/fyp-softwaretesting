package com.acme.chilledwatersystem;

import com.acme.chilledwatersystem.EnvironmentEngine.HourlyWeather;
import com.acme.chilledwatersystem.CoolingCostCalculator.HourlyCoolingResult;

/**
 * Step 1 Demo: Data Ingestion & Physical Boundary Configuration
 * 
 * Demonstrates the complete Step 1 implementation with:
 * - EdgeDataCenterScenario (numerical inputs)
 * - EdgeInfraManager (CloudSim infrastructure)
 * - EnvironmentEngine (8760-hour weather baseline)
 * - CoolingCostCalculator (EIR framework and cost logic)
 */
public class Step1Demo {
    
    public static void main(String[] args) {
        System.out.println("=== Step 1: Data Ingestion & Physical Boundary Configuration ===\n");
        
        // 1. Create scenario with numerical inputs
        EdgeDataCenterScenario scenario = new EdgeDataCenterScenario();
        scenario.setTotalRacks(2);
        scenario.setServersPerRack(10);
        scenario.setServerMaxPowerW(500.0);
        scenario.setServerIdlePowerW(200.0);
        scenario.setServerFanPowerW(25.0);
        scenario.setUpsLossFraction(0.09);
        scenario.setPduLossFraction(0.02);
        
        // Thermal boundaries (ASHRAE Recommended)
        scenario.setMaxInletTempC(27.0);
        scenario.setMinInletTempC(18.0);
        scenario.setMaxDewPointC(15.0);
        
        // Chiller specs (EIR framework)
        scenario.setChillerReferenceCop(6.0);
        scenario.setChillerReferenceLoadKW(100.0);
        scenario.setChillerPerformanceCoeffs(new double[]{0.74, 0.008, -0.001, 0.024, -0.001, 0.002});
        
        // Cost factors
        scenario.setElectricityRateUsdKwh(0.12);
        scenario.setDemandChargeUsdKw(15.00);
        scenario.setCarbonFactorKgKwh(0.45);
        
        System.out.println(scenario);
        System.out.println();
        
        // 2. Initialize infrastructure manager
        EdgeInfraManager infraManager = new EdgeInfraManager(scenario);
        infraManager.buildHosts();
        infraManager.printSummary();
        
        // 3. Initialize environment engine
        EnvironmentEngine envEngine = new EnvironmentEngine(scenario);
        envEngine.initialize();
        
        // Check thermal boundaries
        int unsafeHours = envEngine.countUnsafeHours();
        System.out.printf("Unsafe operating hours: %d / %d (%.1f%%)\n\n", 
            unsafeHours, envEngine.getTotalHours(), 
            100.0 * unsafeHours / envEngine.getTotalHours());
        
        // 4. Initialize cost calculator
        CoolingCostCalculator costCalc = new CoolingCostCalculator(scenario);
        
        // 5. Run simulation for first 24 hours (demo)
        System.out.println("=== Hourly Simulation (First 24 Hours) ===\n");
        System.out.printf("%-6s %-10s %-10s %-10s %-8s %-10s %-8s\n",
            "Hour", "IT Load", "Cooling", "Chiller", "COP", "Cost", "PUE");
        System.out.println("-".repeat(70));
        
        for (int hour = 0; hour < 24; hour++) {
            // Get weather for this hour
            HourlyWeather weather = envEngine.getWeather(hour);
            
            // Calculate IT load at varying utilization (simulate workload pattern)
            double utilization = 30.0 + 40.0 * Math.sin((hour / 24.0) * 2 * Math.PI); // 30-70% range
            double itLoadKW = infraManager.calculateITLoadAtUtilization(utilization);
            
            // Calculate cooling cost
            HourlyCoolingResult result = costCalc.calculateHourlyCost(
                itLoadKW, 
                weather.ambientTempC, 
                weather.wetbulbTempC
            );
            
            // Calculate PUE
            double pue = costCalc.calculatePUE(itLoadKW, result.totalCoolingPowerKW);
            
            // Print hourly results
            System.out.printf("%02d:00  %8.2f kW %8.2f kW %8.2f kW %6.2f  $%7.2f  %6.2f\n",
                hour, itLoadKW, result.totalCoolingPowerKW, result.chillerPowerKW,
                result.chillerCOP, result.hourlyCostUSD, pue);
        }
        
        System.out.println("-".repeat(70));
        
        // 6. Print summary
        costCalc.printSummary();
        
        // 7. Demonstrate full year simulation (abbreviated output)
        System.out.println("=== Running Full Year Simulation (8760 hours) ===\n");
        costCalc.reset();
        envEngine.reset();
        
        for (int hour = 0; hour < 8760; hour++) {
            HourlyWeather weather = envEngine.nextHour();
            
            // Simulate realistic workload pattern
            int hourOfDay = hour % 24;
            int dayOfWeek = (hour / 24) % 7;
            double baseUtil = (dayOfWeek < 5) ? 60.0 : 40.0; // Weekday vs weekend
            double diurnalVar = 20.0 * Math.sin((hourOfDay / 24.0) * 2 * Math.PI);
            double utilization = Math.max(20.0, Math.min(90.0, baseUtil + diurnalVar));
            
            double itLoadKW = infraManager.calculateITLoadAtUtilization(utilization);
            costCalc.calculateHourlyCost(itLoadKW, weather.ambientTempC, weather.wetbulbTempC);
        }
        
        System.out.println("Full year simulation complete!");
        costCalc.printSummary();
        
        // 8. Calculate annual metrics
        double annualPUE = costCalc.calculatePUE(
            infraManager.getTotalDesignPowerKW() * 0.6 * 8760, // Assume 60% avg utilization
            costCalc.getTotalCoolingEnergyKWh()
        );
        
        System.out.println("=== Annual Metrics ===");
        System.out.printf("Annual PUE: %.3f\n", annualPUE);
        System.out.printf("Annual Cooling Efficiency: %.2f kWh/kW-IT\n", 
            costCalc.getTotalCoolingEnergyKWh() / (infraManager.getTotalDesignPowerKW() * 0.6 * 8760));
        System.out.printf("Carbon Intensity: %.3f kg CO2/kWh\n",
            costCalc.getTotalCarbonKg() / costCalc.getTotalCoolingEnergyKWh());
        
        System.out.println("\n=== Step 1 Implementation Complete ===");
        System.out.println("✓ EdgeDataCenterScenario: Numerical inputs configured");
        System.out.println("✓ EdgeInfraManager: CloudSim infrastructure built");
        System.out.println("✓ EnvironmentEngine: 8760-hour weather baseline loaded");
        System.out.println("✓ CoolingCostCalculator: EIR framework and cost logic operational");
    }
}
