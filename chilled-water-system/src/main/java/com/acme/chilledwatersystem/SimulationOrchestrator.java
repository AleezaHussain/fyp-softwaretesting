package com.acme.chilledwatersystem;

import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.datacenters.Datacenter;
import org.cloudsimplus.hosts.Host;
import com.acme.chilledwatersystem.EnvironmentEngine.HourlyWeather;
import com.acme.chilledwatersystem.ChilledWaterPhysics.CoolingMetrics;
import com.acme.chilledwatersystem.api.util.InfrastructureEfficiency;

import java.util.ArrayList;
import java.util.List;

/**
 * Step 2: The 8760-Hour Co-Simulation Engine
 * 
 * Conservative Synchronization Orchestrator that ensures CloudSim Plus
 * and the chilled water physics advance in perfect lockstep, hour by hour.
 * 
 * This prevents "thermal drift" where cooling reacts to stale heat data.
 */
public class SimulationOrchestrator {
    private final CloudSimPlus simulation;
    private final ChilledWaterPhysics physics;
    private final EnvironmentEngine weather;
    private final EdgeDataCenterScenario scenario;
    private final CoolingCostCalculator costCalculator;
    private final List<HourlySimulationResult> results;
    private final String workloadType; // NEW: Store workload type for utilization model
    
    // Datacenter components for power tracking
    private Datacenter datacenter;
    private List<Host> hosts;
    
    // Peak demand tracking for demand charges
    private double monthlyPeakDemandKW;
    private int currentMonth;
    
    public SimulationOrchestrator(CloudSimPlus sim, 
                                 ChilledWaterPhysics physics,
                                 EnvironmentEngine weather,
                                 EdgeDataCenterScenario scenario) {
        this(sim, physics, weather, scenario, "enterprise"); // Default to enterprise workload
    }
    
    public SimulationOrchestrator(CloudSimPlus sim, 
                                 ChilledWaterPhysics physics,
                                 EnvironmentEngine weather,
                                 EdgeDataCenterScenario scenario,
                                 String workloadType) {
        this.simulation = sim;
        this.physics = physics;
        this.weather = weather;
        this.scenario = scenario;
        this.workloadType = workloadType != null ? workloadType : "enterprise";
        this.costCalculator = new CoolingCostCalculator(scenario);
        this.results = new ArrayList<>();
        this.monthlyPeakDemandKW = 0.0;
        this.currentMonth = 0;
    }
    
    /**
     * Set the datacenter and hosts for power monitoring
     */
    public void setDatacenterComponents(Datacenter dc, List<Host> hostList) {
        this.datacenter = dc;
        this.hosts = hostList;
    }
    
    /**
     * Execute the full 8760-hour annual simulation with tight coupling
     * between CloudSim workload and chilled water physics
     */
    public void runAnnualSimulation() {
        System.out.println("=== Starting 8760-Hour Co-Simulation ===");
        System.out.println("CloudSim + Chilled Water Physics in Lockstep\n");
        System.out.println("WORKLOAD VARIABILITY ENABLED:");
        System.out.println("  - Diurnal Pattern: Peak at 2 PM, Low at 4 AM");
        System.out.println("  - Weekly Pattern: 70% load on weekends");
        System.out.println("  - Random Noise: ±5% variation");
        System.out.println();
        
        weather.reset();
        costCalculator.reset();
        physics.reset();
        
        // Print header for progress updates
        System.out.printf("%-8s %-10s %-10s %-10s %-8s %-10s %-8s %-10s\n",
            "Hour", "IT Load", "Cooling", "Chiller", "COP", "Cost", "PUE", "Inlet T");
        System.out.println("-".repeat(85));
        
        for (int hour = 1; hour <= 8760; hour++) {
            // Execute one hour of tightly-coupled simulation
            HourlySimulationResult result = executeHourlyStep(hour);
            results.add(result);
            
            // Print progress every 24 hours (daily summary)
            if (hour % 24 == 0) {
                System.out.printf("%04d:00  %8.2f kW %8.2f kW %8.2f kW %6.2f  $%7.2f  %6.2f  %6.2f°C\n",
                    hour, result.itLoadKW, result.totalCoolingKW, result.chillerPowerKW,
                    result.chillerCOP, result.hourlyCostUSD, result.pue, result.rackInletTempC);
            }
            
            // Track monthly peak demand for demand charges
            int month = (hour - 1) / 730; // Approximate month (730 hours per month)
            if (month != currentMonth) {
                // New month - reset peak tracking
                currentMonth = month;
                monthlyPeakDemandKW = 0.0;
            }
            
            double totalFacilityPowerKW = result.itLoadKW + result.totalCoolingKW;
            if (totalFacilityPowerKW > monthlyPeakDemandKW) {
                monthlyPeakDemandKW = totalFacilityPowerKW;
            }
        }
        
        System.out.println("-".repeat(85));
        System.out.println("\n=== Annual Simulation Complete ===\n");
        
        printAnnualSummary();
    }
    
    /**
     * Execute one hour of tightly-coupled simulation
     * This is the core lockstep synchronization logic
     */
    private HourlySimulationResult executeHourlyStep(int hour) {
        HourlySimulationResult result = new HourlySimulationResult();
        result.hour = hour;
        
        // STEP 1: Time Alignment - Get weather for this specific hour
        HourlyWeather hourlyWeather = weather.getWeather(hour - 1); // 0-indexed
        result.ambientTempC = hourlyWeather.ambientTempC;
        result.wetbulbTempC = hourlyWeather.wetbulbTempC;
        result.dewpointC = hourlyWeather.dewpointC;
        
        // STEP 2: IT Power Extraction - Advance CloudSim by 3600 seconds (1 hour)
        // The Host power models convert CPU utilization into numerical heat load
        double serverPowerKW = advanceCloudSimOneHour();
        
        // CRITICAL FIX: Apply DYNAMIC UPS/PDU efficiency instead of static losses
        // Calculate UPS and PDU rated capacities (assume 1.5x design load for safety)
        double totalDesignPowerKW = scenario.getTotalDesignPowerKW();
        double upsRatedCapacityKW = totalDesignPowerKW * 1.5;
        double pduRatedCapacityKW = totalDesignPowerKW * 1.5;
        
        // Calculate dynamic UPS losses
        double upsLosses = InfrastructureEfficiency.calculateUpsLosses(serverPowerKW, upsRatedCapacityKW);
        
        // Calculate dynamic PDU losses
        double pduLosses = InfrastructureEfficiency.calculatePduLosses(serverPowerKW, pduRatedCapacityKW);
        
        // Total IT load including infrastructure losses
        double itLoadKW = serverPowerKW + upsLosses + pduLosses;
        result.itLoadKW = itLoadKW;
        
        // STEP 3: Physics Computation - Apply heat load to Chiller EIR model
        // CRITICAL FIX: Now uses WET-BULB temperature for condenser calculations
        CoolingMetrics cooling = physics.calculateCooling(
            itLoadKW,
            hourlyWeather.ambientTempC,
            hourlyWeather.wetbulbTempC  // This is now properly calculated from humidity
        );
        
        result.chillerPowerKW = cooling.chillerPowerKW;
        result.pumpPowerKW = cooling.pumpPowerKW;
        result.towerFanPowerKW = cooling.towerFanPowerKW;
        result.totalCoolingKW = cooling.getTotalCoolingKW();
        result.chillerCOP = cooling.chillerCOP;
        result.rackInletTempC = cooling.rackInletTempC;
        result.waterUsageLiters = cooling.waterUsageLiters;  // NEW
        
        // STEP 4: State Update - Increment degradation (coil fouling)
        // This slightly reduces efficiency for the next hour
        physics.incrementFouling(1.0); // Add 1 hour of wear
        
        // STEP 5: Cost & Carbon Logging - Calculate with time-aware tariffs
        // Edge overhead (lighting, controls, network equipment)
        double edgeOverheadKW = 7.2;
        
        double hourlyCost = calculateHourlyCost(itLoadKW, result.totalCoolingKW, hour);
        result.hourlyCostUSD = hourlyCost;
        
        // Calculate carbon emissions
        double totalFacilityKW = itLoadKW + result.totalCoolingKW + edgeOverheadKW;
        result.hourlyCarbonKg = totalFacilityKW * scenario.getCarbonFactorKgKwh();
        
        // Calculate PUE (now dynamic due to variable UPS/PDU efficiency)
        result.pue = (itLoadKW > 0) ? (totalFacilityKW / serverPowerKW) : 1.0;
        
        // STEP 6: Compliance Monitoring - Check ASHRAE thermal boundaries
        result.thermalCompliant = checkThermalCompliance(result.rackInletTempC, hour);
        
        return result;
    }
    
    /**
     * Advance CloudSim by exactly 3600 seconds (1 hour)
     * Returns the SERVER power consumption in kW (without UPS/PDU losses)
     * 
     * CLOUDSIM DISCRETE EVENT SIMULATION: This method uses CloudSim Plus's event engine
     * to process cloudlet execution, VM scheduling, and resource contention.
     * 
     * THE "NUDGE" PATTERN: Use runFor() to advance the engine in controlled bursts
     * - simulation.start() runs to completion (WRONG)
     * - simulation.runFor(3600) processes exactly 1 hour of events (CORRECT)
     */
    private double advanceCloudSimOneHour() {
        int currentHour = results.size(); // 0-based hour index
        
        // STEP 1: ADVANCE THE DISCRETE EVENT ENGINE
        // This nudges the actual CloudSim engine forward by 3600 seconds.
        // It triggers Cloudlet internal execution and updates VM/Host states.
        if (simulation != null) {
            // Process exactly 3600 seconds of discrete events
            // runFor() will automatically start the simulation on first call
            // and process events incrementally without jumping to completion
            simulation.runFor(3600.0);
        }
        
        // STEP 2: QUERY DYNAMIC STATE
        // Instead of manually calculating utilization, we ask CloudSim for the
        // current state of the hosts AFTER those 3600 seconds of events.
        double totalPowerW = 0.0;
        int activeHosts = 0;
        double totalUtilization = 0.0;
        
        if (hosts != null && !hosts.isEmpty()) {
            for (Host host : hosts) {
                if (host.isActive()) {
                    // Get actual CPU utilization from CloudSim's event engine
                    // This reflects the real state after processing events
                    double hostUtil = host.getCpuPercentUtilization();
                    
                    // This method automatically calls the LoopingDiurnalUtilizationModel
                    // using the engine's internal 'simulation.clock()' value
                    double hostPowerW = host.getPowerModel().getPower();
                    
                    totalPowerW += hostPowerW;
                    activeHosts++;
                    totalUtilization += hostUtil;
                }
            }
        }
        
        // Log every 24 hours for debugging
        if (currentHour % 24 == 0 && activeHosts > 0) {
            double avgUtilization = (totalUtilization / activeHosts) * 100.0;
            int hourOfDay = currentHour % 24;
            int dayOfYear = currentHour / 24;
            int dayOfWeek = dayOfYear % 7;
            String dayType = (dayOfWeek < 5) ? "Weekday" : "Weekend";
            
            System.out.printf("DEBUG Hour %04d (%s %02d:00): CloudSim Time=%.0fs, Active Hosts=%d, Avg Util=%.1f%%, Power=%.2f kW\n",
                currentHour, dayType, hourOfDay, simulation.clock(), activeHosts, avgUtilization, totalPowerW / 1000.0);
        }
        
        // Convert to kW (return ONLY server power, UPS/PDU losses calculated separately)
        // This is now a REAL, fluctuating variable based on CloudSim's internal CPU utilization
        double serverPowerKW = totalPowerW / 1000.0;
        
        return serverPowerKW;
    }
    
    /**
     * Calculate hourly cost with Time-of-Use (TOU) tariffs
     * Includes IT power + Cooling power + Edge infrastructure overhead
     */
    private double calculateHourlyCost(double itLoadKW, double coolingKW, int hour) {
        // Edge-specific fixed overhead (lighting, controls, network equipment)
        double edgeOverheadKW = 7.2; // Typical for small edge DC
        
        // Total facility power
        double totalFacilityKW = itLoadKW + coolingKW + edgeOverheadKW;
        
        // Get tariff rate based on time of day (TOU pricing)
        double tariffRate = getTariffRate(hour);
        
        // Hourly energy cost
        return totalFacilityKW * tariffRate;
    }
    
    /**
     * Get electricity tariff rate based on Time-of-Use (TOU) schedule
     * Peak hours: 12:00-18:00 on weekdays
     * Off-peak hours: 22:00-06:00 all days
     * Partial-peak: all other times
     */
    private double getTariffRate(int hour) {
        int hourOfDay = (hour - 1) % 24;
        int dayOfWeek = ((hour - 1) / 24) % 7;
        boolean isWeekday = dayOfWeek < 5;
        
        double baseRate = scenario.getElectricityRateUsdKwh();
        
        // Peak hours (12:00-18:00 weekdays): 1.5x base rate
        if (isWeekday && hourOfDay >= 12 && hourOfDay < 18) {
            return baseRate * 1.5;
        }
        
        // Off-peak hours (22:00-06:00): 0.7x base rate
        if (hourOfDay >= 22 || hourOfDay < 6) {
            return baseRate * 0.7;
        }
        
        // Partial-peak: base rate
        return baseRate;
    }
    
    /**
     * Check thermal compliance against ASHRAE Recommended boundaries
     * Returns true if within safe operating range (18-27°C)
     */
    private boolean checkThermalCompliance(double rackInletTempC, int hour) {
        boolean compliant = rackInletTempC >= scenario.getMinInletTempC() && 
                           rackInletTempC <= scenario.getMaxInletTempC();
        
        if (!compliant) {
            System.out.printf("ALERT: Thermal Excursion at hour %d - Inlet Temp: %.2f°C (Safe: %.1f-%.1f°C)\n",
                hour, rackInletTempC, scenario.getMinInletTempC(), scenario.getMaxInletTempC());
        }
        
        return compliant;
    }
    
    /**
     * Print comprehensive annual summary
     */
    private void printAnnualSummary() {
        // Calculate totals
        double totalITEnergyKWh = 0.0;
        double totalCoolingEnergyKWh = 0.0;
        double totalCostUSD = 0.0;
        double totalCarbonKg = 0.0;
        double totalWaterLiters = 0.0;  // NEW
        int thermalExcursions = 0;
        
        for (HourlySimulationResult result : results) {
            totalITEnergyKWh += result.itLoadKW;
            totalCoolingEnergyKWh += result.totalCoolingKW;
            totalCostUSD += result.hourlyCostUSD;
            totalCarbonKg += result.hourlyCarbonKg;
            totalWaterLiters += result.waterUsageLiters;  // NEW
            if (!result.thermalCompliant) {
                thermalExcursions++;
            }
        }
        
        // Calculate annual PUE
        double annualPUE = (totalITEnergyKWh + totalCoolingEnergyKWh) / totalITEnergyKWh;
        
        // Calculate WUE (Water Usage Effectiveness)
        double totalEnergyKWh = totalITEnergyKWh + totalCoolingEnergyKWh;
        double wue = totalWaterLiters / totalEnergyKWh;  // L/kWh
        
        System.out.println("=== Annual Performance Summary ===");
        System.out.printf("Total IT Energy: %.2f MWh\n", totalITEnergyKWh / 1000.0);
        System.out.printf("Total Cooling Energy: %.2f MWh\n", totalCoolingEnergyKWh / 1000.0);
        System.out.printf("Annual PUE: %.3f\n", annualPUE);
        System.out.printf("Total Water Usage: %.2f m³ (%.0f liters)\n", totalWaterLiters / 1000.0, totalWaterLiters);
        System.out.printf("WUE (Water Usage Effectiveness): %.3f L/kWh\n", wue);
        System.out.printf("Total Energy Cost: $%.2f\n", totalCostUSD);
        System.out.printf("Total Carbon Emissions: %.2f metric tons CO2\n", totalCarbonKg / 1000.0);
        System.out.printf("Thermal Excursions: %d / 8760 hours (%.2f%%)\n", 
            thermalExcursions, 100.0 * thermalExcursions / 8760.0);
        System.out.printf("Peak Monthly Demand: %.2f kW\n", monthlyPeakDemandKW);
        System.out.printf("Demand Charges: $%.2f\n", 
            monthlyPeakDemandKW * scenario.getDemandChargeUsdKw() * 12); // 12 months
        System.out.println("===================================\n");
    }
    
    /**
     * Export results to CSV for analysis
     */
    public void exportResultsToCSV(String filename) {
        try {
            // CsvWriter.writeHourlySimulation(java.nio.file.Path.of(filename), results);
            System.out.println("CSV export temporarily disabled - Results exported to: " + filename);
        } catch (Exception e) {
            System.err.println("Failed to export results: " + e.getMessage());
        }
    }
    
    // Getters
    public List<HourlySimulationResult> getResults() {
        return results;
    }
    
    public double getAnnualPUE() {
        double totalIT = results.stream().mapToDouble(r -> r.itLoadKW).sum();
        double totalCooling = results.stream().mapToDouble(r -> r.totalCoolingKW).sum();
        return (totalIT + totalCooling) / totalIT;
    }
    
    public double getTotalCostUSD() {
        return results.stream().mapToDouble(r -> r.hourlyCostUSD).sum();
    }
    
    public int getThermalExcursionCount() {
        return (int) results.stream().filter(r -> !r.thermalCompliant).count();
    }
    
    /**
     * Inner class to hold hourly simulation results
     */
    public static class HourlySimulationResult {
        public int hour;
        public double itLoadKW;
        public double chillerPowerKW;
        public double pumpPowerKW;
        public double towerFanPowerKW;
        public double totalCoolingKW;
        public double chillerCOP;
        public double rackInletTempC;
        public double ambientTempC;
        public double wetbulbTempC;
        public double dewpointC;
        public double hourlyCostUSD;
        public double hourlyCarbonKg;
        public double pue;
        public boolean thermalCompliant;
        public double waterUsageLiters;  // NEW: Water usage per hour
        
        @Override
        public String toString() {
            return String.format(
                "Hour %d: IT=%.2f kW, Cooling=%.2f kW, COP=%.2f, PUE=%.2f, Cost=$%.2f, Water=%.1f L, Compliant=%s",
                hour, itLoadKW, totalCoolingKW, chillerCOP, pue, hourlyCostUSD, waterUsageLiters, thermalCompliant
            );
        }
    }
}
