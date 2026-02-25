package com.acme.chilledwatersystem;

import com.acme.chilledwatersystem.EnvironmentEngine.HourlyWeather;
import com.acme.chilledwatersystem.CoolingCostCalculator.HourlyCoolingResult;

/**
 * Step 1 Demo (Standalone - No CloudSim Required)
 * 
 * Demonstrates Step 1 implementation without CloudSim dependencies.
 * Uses direct IT load calculations instead of CloudSim hosts.
 */
public class Step1DemoStandalone {
    
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
        
        // 2. Print infrastructure summary
        System.out.println("=== Edge Infrastructure Summary ===");
        System.out.printf("Total Racks: %d\n", scenario.getTotalRacks());
        System.out.printf("Servers per Rack: %d\n", scenario.getServersPerRack());
        System.out.printf("Total Servers: %d\n", scenario.getTotalServers());
        System.out.printf("Server Power: %.1f W (idle) to %.1f W (max)\n", 
            scenario.getServerIdlePowerW(), scenario.getServerMaxPowerW());
        System.out.printf("Total Design IT Power: %.2f kW\n", scenario.getTotalDesignPowerKW());
        System.out.printf("UPS Loss Factor: %.1f%%\n", scenario.getUpsLossFraction() * 100);
        System.out.printf("PDU Loss Factor: %.1f%%\n", scenario.getPduLossFraction() * 100);
        System.out.println("===================================\n");
        
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
            double itLoadKW = calculateITLoadAtUtilization(scenario, utilization);
            
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
            
            double itLoadKW = calculateITLoadAtUtilization(scenario, utilization);
            costCalc.calculateHourlyCost(itLoadKW, weather.ambientTempC, weather.wetbulbTempC);
        }
        
        System.out.println("Full year simulation complete!");
        costCalc.printSummary();
        
        // 8. Calculate annual metrics
        double avgUtilization = 0.6; // 60% average
        double annualITEnergy = scenario.getTotalDesignPowerKW() * avgUtilization * 8760;
        double annualPUE = (annualITEnergy + costCalc.getTotalCoolingEnergyKWh()) / annualITEnergy;
        
        System.out.println("=== Annual Metrics ===");
        System.out.printf("Annual PUE: %.3f\n", annualPUE);
        System.out.printf("Annual Cooling Efficiency: %.2f kWh cooling / kWh IT\n", 
            costCalc.getTotalCoolingEnergyKWh() / annualITEnergy);
        System.out.printf("Carbon Intensity: %.3f kg CO2/kWh\n",
            costCalc.getTotalCarbonKg() / costCalc.getTotalCoolingEnergyKWh());
        
        System.out.println("\n=== Step 1 Implementation Complete ===");
        System.out.println("✓ EdgeDataCenterScenario: Numerical inputs configured");
        System.out.println("✓ Infrastructure calculations: IT load modeling operational");
        System.out.println("✓ EnvironmentEngine: 8760-hour weather baseline loaded");
        System.out.println("✓ CoolingCostCalculator: EIR framework and cost logic operational");
    }
    
    /**
     * Calculate IT load for a given utilization percentage (0-100)
     * Includes server power, fan power, UPS losses, and PDU losses
     */
    private static double calculateITLoadAtUtilization(EdgeDataCenterScenario scenario, double utilizationPercent) {
        double utilization = utilizationPercent / 100.0;
        int totalServers = scenario.getTotalServers();
        
        double idlePower = scenario.getServerIdlePowerW();
        double maxPower = scenario.getServerMaxPowerW();
        double fanPower = scenario.getServerFanPowerW();
        
        // Power per server: idle + (max - idle) * utilization + fan
        double powerPerServerW = idlePower + (maxPower - idlePower) * utilization + fanPower;
        double totalServerPowerW = powerPerServerW * totalServers;
        double totalServerPowerKW = totalServerPowerW / 1000.0;
        
        // Add UPS and PDU losses
        double upsLosses = totalServerPowerKW * scenario.getUpsLossFraction();
        double pduLosses = totalServerPowerKW * scenario.getPduLossFraction();
        
        return totalServerPowerKW + upsLosses + pduLosses;
    }
}
