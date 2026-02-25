package com.acme.chilledwatersystem;

import java.util.ArrayList;
import java.util.List;

/**
 * Phase 4 Part 4 - Section 4.2: Climate Hazard Stress-Testing
 * 
 * Tests facility survivability during extreme "black swan" events:
 * - 2050 heatwave scenarios
 * - Total cooling failure (75-second failure window for AI Training)
 * - Saturation vapor pressure limits
 */
public class ClimateHazardStressTester {
    
    private final EdgeDataCenterScenario scenario;
    private final WorkloadSituation situation;
    
    // Physical constants
    private static final double SPECIFIC_HEAT_AIR = 1.005; // kJ/(kg·K)
    private static final double AIR_DENSITY = 1.2; // kg/m³ at sea level
    
    public ClimateHazardStressTester(EdgeDataCenterScenario scenario, WorkloadSituation situation) {
        this.scenario = scenario;
        this.situation = situation;
    }
    
    /**
     * Perform comprehensive stress test
     */
    public StressTestResults performStressTest(List<HourlyResult> hourlyResults) {
        System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  CLIMATE HAZARD STRESS-TESTING (2050 BLACK SWAN EVENTS)              ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        StressTestResults results = new StressTestResults();
        
        // Test 1: Extreme heat hours (top 1% of year)
        results.extremeHeatAnalysis = analyzeExtremeHeatHours(hourlyResults);
        
        // Test 2: Total cooling failure scenario
        results.coolingFailureAnalysis = analyzeCoolingFailure();
        
        // Test 3: Saturation vapor pressure risk
        results.saturationRiskAnalysis = analyzeSaturationRisk();
        
        // Test 4: Thermal storage capacity
        results.thermalStorageAnalysis = analyzeThermalStorage();
        
        return results;
    }
    
    /**
     * Analyze top 1% extreme heat hours from 2050 morphed weather
     */
    private ExtremeHeatAnalysis analyzeExtremeHeatHours(List<HourlyResult> hourlyResults) {
        ExtremeHeatAnalysis analysis = new ExtremeHeatAnalysis();
        
        // Sort hours by ambient temperature
        List<HourlyResult> sortedByTemp = new ArrayList<>(hourlyResults);
        sortedByTemp.sort((a, b) -> Double.compare(b.getAmbientTempC(), a.getAmbientTempC()));
        
        // Get top 1% (87.6 hours)
        int extremeHourCount = (int)(hourlyResults.size() * 0.01);
        List<HourlyResult> extremeHours = sortedByTemp.subList(0, extremeHourCount);
        
        analysis.extremeHourCount = extremeHourCount;
        analysis.peakAmbientC = extremeHours.get(0).getAmbientTempC();
        analysis.peakWetBulbC = extremeHours.get(0).getWetBulbTempC();
        
        // Calculate average conditions during extreme hours
        double sumAmbient = 0.0;
        double sumWetBulb = 0.0;
        int throttlingCount = 0;
        
        for (HourlyResult hour : extremeHours) {
            sumAmbient += hour.getAmbientTempC();
            sumWetBulb += hour.getWetBulbTempC();
            if (!hour.isThermalCompliance()) {
                throttlingCount++;
            }
        }
        
        analysis.avgExtremeAmbientC = sumAmbient / extremeHourCount;
        analysis.avgExtremeWetBulbC = sumWetBulb / extremeHourCount;
        analysis.throttlingDuringExtremePercent = (throttlingCount * 100.0) / extremeHourCount;
        
        // Assess survivability
        if (analysis.throttlingDuringExtremePercent > 80.0) {
            analysis.survivability = "CRITICAL FAILURE";
            analysis.recommendation = "System cannot survive 2050 extreme heat events. Immediate redesign required.";
        } else if (analysis.throttlingDuringExtremePercent > 50.0) {
            analysis.survivability = "HIGH RISK";
            analysis.recommendation = "System will experience severe degradation during heat waves. Plan for upgrades by 2040.";
        } else if (analysis.throttlingDuringExtremePercent > 20.0) {
            analysis.survivability = "MODERATE RISK";
            analysis.recommendation = "System can survive but with performance loss. Monitor climate trends.";
        } else {
            analysis.survivability = "RESILIENT";
            analysis.recommendation = "System is resilient to projected extreme heat events.";
        }
        
        return analysis;
    }
    
    /**
     * Analyze total cooling failure scenario (75-second failure window)
     */
    private CoolingFailureAnalysis analyzeCoolingFailure() {
        CoolingFailureAnalysis analysis = new CoolingFailureAnalysis();
        
        double rackDensityKW = situation.getRackPowerDensityKW();
        analysis.rackDensityKW = rackDensityKW;
        
        // Calculate time to critical temperature
        // For AI Training at 100 kW/rack: 75 seconds
        // Scales inversely with power density
        double referenceTime = 75.0; // seconds at 100 kW/rack
        double referenceDensity = 100.0; // kW/rack
        
        analysis.timeToCriticalSeconds = referenceTime * (referenceDensity / rackDensityKW);
        
        // Calculate temperature rise rate
        // Assuming 20°C starting temp, 80°C critical temp
        double startTempC = 20.0;
        double criticalTempC = 80.0;
        double tempRise = criticalTempC - startTempC;
        
        analysis.temperatureRiseRate = tempRise / analysis.timeToCriticalSeconds; // °C/second
        
        // Assess failure risk
        if (analysis.timeToCriticalSeconds < 30.0) {
            analysis.failureRisk = "EXTREME";
            analysis.recommendation = String.format(
                "CRITICAL: Only %.0f seconds to thermal runaway at %.0f kW/rack. " +
                "Requires redundant cooling with instant failover.",
                analysis.timeToCriticalSeconds, rackDensityKW
            );
        } else if (analysis.timeToCriticalSeconds < 60.0) {
            analysis.failureRisk = "HIGH";
            analysis.recommendation = String.format(
                "HIGH RISK: %.0f seconds to failure. Implement N+1 cooling redundancy.",
                analysis.timeToCriticalSeconds
            );
        } else if (analysis.timeToCriticalSeconds < 120.0) {
            analysis.failureRisk = "MODERATE";
            analysis.recommendation = String.format(
                "MODERATE: %.0f seconds provides limited safety margin. Consider thermal mass enhancement.",
                analysis.timeToCriticalSeconds
            );
        } else {
            analysis.failureRisk = "LOW";
            analysis.recommendation = String.format(
                "Acceptable: %.0f seconds provides adequate time for failover response.",
                analysis.timeToCriticalSeconds
            );
        }
        
        return analysis;
    }
    
    /**
     * Analyze saturation vapor pressure risk
     * 7% increase in atmospheric moisture capacity per °C warming
     */
    private SaturationRiskAnalysis analyzeSaturationRisk() {
        SaturationRiskAnalysis analysis = new SaturationRiskAnalysis();
        
        double warmingShiftC = situation.getClimateWarmingShiftC();
        analysis.warmingShiftC = warmingShiftC;
        
        // Calculate moisture capacity increase
        analysis.moistureCapacityIncrease = warmingShiftC * 0.07; // 7% per °C
        
        // Calculate future wet-bulb temperature
        double baseWetBulbC = scenario.getDesignWetBulbC();
        double futureWetBulbC = baseWetBulbC + warmingShiftC * (1.0 + analysis.moistureCapacityIncrease);
        analysis.futureWetBulbC = futureWetBulbC;
        
        // Check if exceeds cooling tower design capacity
        double towerDesignWetBulbC = 28.0; // Typical limit for evaporative cooling
        
        if (futureWetBulbC > towerDesignWetBulbC) {
            analysis.exceedsTowerCapacity = true;
            analysis.excessWetBulbC = futureWetBulbC - towerDesignWetBulbC;
            analysis.risk = "CRITICAL";
            analysis.recommendation = String.format(
                "CRITICAL: 2050 wet-bulb (%.1f°C) exceeds tower capacity (%.1f°C) by %.1f°C. " +
                "Evaporative cooling will be non-functional. Switch to air-cooled chillers.",
                futureWetBulbC, towerDesignWetBulbC, analysis.excessWetBulbC
            );
        } else if (futureWetBulbC > towerDesignWetBulbC - 2.0) {
            analysis.exceedsTowerCapacity = false;
            analysis.excessWetBulbC = 0.0;
            analysis.risk = "HIGH";
            analysis.recommendation = String.format(
                "HIGH RISK: 2050 wet-bulb (%.1f°C) approaches tower limit. " +
                "Plan for hybrid cooling system by 2040.",
                futureWetBulbC
            );
        } else {
            analysis.exceedsTowerCapacity = false;
            analysis.excessWetBulbC = 0.0;
            analysis.risk = "LOW";
            analysis.recommendation = "Evaporative cooling remains viable through 2050.";
        }
        
        return analysis;
    }
    
    /**
     * Analyze thermal storage capacity
     */
    private ThermalStorageAnalysis analyzeThermalStorage() {
        ThermalStorageAnalysis analysis = new ThermalStorageAnalysis();
        
        // Estimate thermal mass (concrete, equipment, air)
        double buildingMassKg = 50000; // Typical edge facility
        double equipmentMassKg = 5000;
        double airMassKg = 2000;
        double totalMassKg = buildingMassKg + equipmentMassKg + airMassKg;
        
        // Specific heat capacity (weighted average)
        double specificHeatKJ = 1.0; // kJ/(kg·K) approximate
        
        // Calculate thermal storage capacity
        double allowableTempRise = 5.0; // °C before critical
        analysis.thermalCapacityKWh = (totalMassKg * specificHeatKJ * allowableTempRise) / 3600.0;
        
        // Calculate ride-through time at peak load
        double peakLoadKW = situation.getRackPowerDensityKW() * 5; // 5 racks
        analysis.rideThroughTimeMinutes = (analysis.thermalCapacityKWh / peakLoadKW) * 60.0;
        
        if (analysis.rideThroughTimeMinutes < 5.0) {
            analysis.adequacy = "INSUFFICIENT";
            analysis.recommendation = "Add thermal mass (phase change materials) to extend ride-through time.";
        } else if (analysis.rideThroughTimeMinutes < 15.0) {
            analysis.adequacy = "MARGINAL";
            analysis.recommendation = "Acceptable for short outages. Consider UPS-backed cooling.";
        } else {
            analysis.adequacy = "ADEQUATE";
            analysis.recommendation = "Sufficient thermal mass for typical failure scenarios.";
        }
        
        return analysis;
    }
    
    /**
     * Print stress test results
     */
    public void printResults(StressTestResults results) {
        System.out.println("═".repeat(75));
        System.out.println("EXTREME HEAT ANALYSIS (Top 1% of 2050 Hours)");
        System.out.println("═".repeat(75));
        System.out.printf("Extreme Hour Count: %d hours (%.1f%% of year)\n", 
            results.extremeHeatAnalysis.extremeHourCount,
            results.extremeHeatAnalysis.extremeHourCount * 100.0 / 8760);
        System.out.printf("Peak Ambient: %.1f°C\n", results.extremeHeatAnalysis.peakAmbientC);
        System.out.printf("Peak Wet-Bulb: %.1f°C\n", results.extremeHeatAnalysis.peakWetBulbC);
        System.out.printf("Avg Extreme Ambient: %.1f°C\n", results.extremeHeatAnalysis.avgExtremeAmbientC);
        System.out.printf("Throttling During Extremes: %.1f%%\n", 
            results.extremeHeatAnalysis.throttlingDuringExtremePercent);
        System.out.printf("Survivability: %s\n", results.extremeHeatAnalysis.survivability);
        System.out.printf("→ %s\n\n", results.extremeHeatAnalysis.recommendation);
        
        System.out.println("═".repeat(75));
        System.out.println("COOLING FAILURE ANALYSIS (75-Second Failure Window)");
        System.out.println("═".repeat(75));
        System.out.printf("Rack Density: %.0f kW/rack\n", results.coolingFailureAnalysis.rackDensityKW);
        System.out.printf("Time to Critical Temperature: %.0f seconds\n", 
            results.coolingFailureAnalysis.timeToCriticalSeconds);
        System.out.printf("Temperature Rise Rate: %.2f °C/second\n", 
            results.coolingFailureAnalysis.temperatureRiseRate);
        System.out.printf("Failure Risk: %s\n", results.coolingFailureAnalysis.failureRisk);
        System.out.printf("→ %s\n\n", results.coolingFailureAnalysis.recommendation);
        
        System.out.println("═".repeat(75));
        System.out.println("SATURATION VAPOR PRESSURE RISK");
        System.out.println("═".repeat(75));
        System.out.printf("Climate Warming: +%.1f°C\n", results.saturationRiskAnalysis.warmingShiftC);
        System.out.printf("Moisture Capacity Increase: +%.1f%%\n", 
            results.saturationRiskAnalysis.moistureCapacityIncrease * 100);
        System.out.printf("Future Wet-Bulb: %.1f°C\n", results.saturationRiskAnalysis.futureWetBulbC);
        System.out.printf("Exceeds Tower Capacity: %s\n", 
            results.saturationRiskAnalysis.exceedsTowerCapacity ? "YES" : "NO");
        System.out.printf("Risk Level: %s\n", results.saturationRiskAnalysis.risk);
        System.out.printf("→ %s\n\n", results.saturationRiskAnalysis.recommendation);
        
        System.out.println("═".repeat(75));
        System.out.println("THERMAL STORAGE CAPACITY");
        System.out.println("═".repeat(75));
        System.out.printf("Thermal Capacity: %.1f kWh\n", results.thermalStorageAnalysis.thermalCapacityKWh);
        System.out.printf("Ride-Through Time: %.1f minutes\n", results.thermalStorageAnalysis.rideThroughTimeMinutes);
        System.out.printf("Adequacy: %s\n", results.thermalStorageAnalysis.adequacy);
        System.out.printf("→ %s\n\n", results.thermalStorageAnalysis.recommendation);
    }
    
    // Inner classes for results
    public static class StressTestResults {
        public ExtremeHeatAnalysis extremeHeatAnalysis;
        public CoolingFailureAnalysis coolingFailureAnalysis;
        public SaturationRiskAnalysis saturationRiskAnalysis;
        public ThermalStorageAnalysis thermalStorageAnalysis;
    }
    
    public static class ExtremeHeatAnalysis {
        public int extremeHourCount;
        public double peakAmbientC;
        public double peakWetBulbC;
        public double avgExtremeAmbientC;
        public double avgExtremeWetBulbC;
        public double throttlingDuringExtremePercent;
        public String survivability;
        public String recommendation;
    }
    
    public static class CoolingFailureAnalysis {
        public double rackDensityKW;
        public double timeToCriticalSeconds;
        public double temperatureRiseRate;
        public String failureRisk;
        public String recommendation;
    }
    
    public static class SaturationRiskAnalysis {
        public double warmingShiftC;
        public double moistureCapacityIncrease;
        public double futureWetBulbC;
        public boolean exceedsTowerCapacity;
        public double excessWetBulbC;
        public String risk;
        public String recommendation;
    }
    
    public static class ThermalStorageAnalysis {
        public double thermalCapacityKWh;
        public double rideThroughTimeMinutes;
        public String adequacy;
        public String recommendation;
    }
}
