package com.acme.chilledwatersystem;

/**
 * Phase 1 Part 2: Climate Hazards & Global Warming Integration
 * 
 * Implements climate morphing with IPCC scenarios and extreme heat events.
 * Accounts for humidity shifts and design wet-bulb temperature changes.
 */
public class ClimateHazardModel {
    
    private final WorkloadSituation situation;
    
    // Clausius-Clapeyron relation: 7% moisture capacity increase per °C
    private static final double HUMIDITY_INCREASE_PER_DEGREE = 0.07;
    
    public ClimateHazardModel(WorkloadSituation situation) {
        this.situation = situation;
    }
    
    /**
     * Apply climate warming to ambient temperature
     */
    public double applyClimateWarming(double baseAmbientC) {
        return baseAmbientC + situation.getClimateWarmingShiftC();
    }
    
    /**
     * Calculate adjusted wet-bulb temperature with humidity shift
     * 
     * Every 1°C of warming increases moisture capacity by ~7%,
     * raising the design wet-bulb temperature
     */
    public double calculateAdjustedWetBulb(double baseWetBulbC, double baseAmbientC) {
        double warmingShift = situation.getClimateWarmingShiftC();
        
        // Wet-bulb depression (difference between dry-bulb and wet-bulb)
        double wetBulbDepression = baseAmbientC - baseWetBulbC;
        
        // With increased humidity, wet-bulb depression decreases
        double humidityEffect = warmingShift * HUMIDITY_INCREASE_PER_DEGREE;
        double adjustedDepression = wetBulbDepression * (1.0 - humidityEffect);
        
        // New wet-bulb = warmed ambient - adjusted depression
        double adjustedAmbient = baseAmbientC + warmingShift;
        double adjustedWetBulb = adjustedAmbient - adjustedDepression;
        
        return adjustedWetBulb;
    }
    
    /**
     * Calculate dew point with climate adjustment
     */
    public double calculateAdjustedDewPoint(double baseDewPointC) {
        // Dew point increases with warming and humidity
        double warmingShift = situation.getClimateWarmingShiftC();
        double humidityEffect = warmingShift * HUMIDITY_INCREASE_PER_DEGREE;
        
        return baseDewPointC + warmingShift * (1.0 + humidityEffect);
    }
    
    /**
     * Simulate extreme heat event (e.g., London 2022, California 2022)
     */
    public ExtremeHeatEvent simulateExtremeHeat(double baseAmbientC, int durationHours) {
        ExtremeHeatEvent event = new ExtremeHeatEvent();
        
        // Extreme heat spike
        event.peakAmbientC = baseAmbientC + situation.getClimateWarmingShiftC();
        event.durationHours = durationHours;
        
        // Calculate time to thermal throttling
        // Assuming system can handle +5°C above design for limited time
        double thermalMargin = 27.0 - baseAmbientC; // ASHRAE max - current
        double excessHeat = event.peakAmbientC - 27.0;
        
        if (excessHeat > 0) {
            // System will throttle when thermal mass is exhausted
            // Typical data center thermal mass: ~30 minutes at full excess
            event.timeToThrottleMinutes = (thermalMargin / excessHeat) * 30.0;
            event.willThrottle = true;
        } else {
            event.timeToThrottleMinutes = Double.POSITIVE_INFINITY;
            event.willThrottle = false;
        }
        
        // Calculate efficiency degradation
        // Chiller COP drops ~2-3% per °C above design
        event.efficiencyDegradation = excessHeat * 0.025; // 2.5% per °C
        
        return event;
    }
    
    /**
     * Check if cooling system can handle climate scenario
     */
    public ClimateCompatibility checkClimateCompatibility(String coolingType, 
                                                          double designAmbientC,
                                                          double designWetBulbC) {
        ClimateCompatibility compat = new ClimateCompatibility();
        compat.isCompatible = true;
        
        double futureAmbient = applyClimateWarming(designAmbientC);
        double futureWetBulb = calculateAdjustedWetBulb(designWetBulbC, designAmbientC);
        
        // Check 1: Evaporative cooling limits
        if (coolingType.equalsIgnoreCase("EVAPORATIVE")) {
            // Evaporative cooling becomes ineffective above 40°C ambient or 28°C wet-bulb
            if (futureAmbient > 40.0) {
                compat.isCompatible = false;
                compat.reason = String.format(
                    "Evaporative cooling ineffective at %.1f°C ambient (limit: 40°C)",
                    futureAmbient
                );
                compat.recommendation = "Upgrade to mechanical chiller or hybrid system";
            } else if (futureWetBulb > 28.0) {
                compat.isCompatible = false;
                compat.reason = String.format(
                    "Evaporative cooling ineffective at %.1f°C wet-bulb (limit: 28°C)",
                    futureWetBulb
                );
                compat.recommendation = "High humidity limits evaporative effectiveness";
            }
        }
        
        // Check 2: Air cooling limits
        if (coolingType.equalsIgnoreCase("AIR")) {
            // Air cooling struggles above 35°C ambient
            if (futureAmbient > 35.0) {
                compat.isCompatible = false;
                compat.reason = String.format(
                    "Air cooling capacity insufficient at %.1f°C ambient (limit: 35°C)",
                    futureAmbient
                );
                compat.recommendation = "Consider chilled water or liquid cooling";
            }
        }
        
        // Check 3: Chilled water efficiency
        if (coolingType.contains("CHILLED_WATER")) {
            // Chiller efficiency degrades significantly above 40°C condenser temp
            double condenserTemp = futureAmbient + 5.0; // Cooling tower approach
            if (condenserTemp > 45.0) {
                compat.isCompatible = true; // Still works, but inefficient
                compat.isWarning = true;
                compat.reason = String.format(
                    "Chiller efficiency degraded at %.1f°C condenser temp (optimal: <40°C)",
                    condenserTemp
                );
                compat.recommendation = "Expect 20-30%% efficiency loss. Consider oversizing or hybrid cooling.";
            }
        }
        
        compat.futureAmbientC = futureAmbient;
        compat.futureWetBulbC = futureWetBulb;
        
        return compat;
    }
    
    /**
     * Calculate climate-adjusted PUE
     * 
     * PUE typically increases 2-3% per °C above design conditions
     */
    public double calculateClimateAdjustedPUE(double basePUE, double designAmbientC, double actualAmbientC) {
        double temperatureExcess = actualAmbientC - designAmbientC;
        
        if (temperatureExcess > 0) {
            // PUE degradation: 2.5% per °C
            double pueIncrease = temperatureExcess * 0.025;
            return basePUE * (1.0 + pueIncrease);
        }
        
        return basePUE;
    }
    
    /**
     * Generate climate scenario report
     */
    public void printClimateScenario(double baseAmbientC, double baseWetBulbC) {
        System.out.println("\n=== Climate Scenario Analysis ===");
        System.out.printf("Scenario: %s\n", situation.getClimateScenario());
        System.out.printf("Target Year: %d\n", situation.getTargetYear());
        System.out.printf("Warming Shift: +%.1f°C\n\n", situation.getClimateWarmingShiftC());
        
        System.out.println("Temperature Projections:");
        System.out.printf("  Current Ambient: %.1f°C\n", baseAmbientC);
        System.out.printf("  Future Ambient: %.1f°C\n", applyClimateWarming(baseAmbientC));
        System.out.printf("  Current Wet-Bulb: %.1f°C\n", baseWetBulbC);
        System.out.printf("  Future Wet-Bulb: %.1f°C\n", 
            calculateAdjustedWetBulb(baseWetBulbC, baseAmbientC));
        System.out.printf("  Humidity Increase: +%.1f%%\n", 
            situation.getClimateWarmingShiftC() * HUMIDITY_INCREASE_PER_DEGREE * 100);
        System.out.println("===================================\n");
    }
    
    /**
     * Inner class for extreme heat event simulation
     */
    public static class ExtremeHeatEvent {
        public double peakAmbientC;
        public int durationHours;
        public double timeToThrottleMinutes;
        public boolean willThrottle;
        public double efficiencyDegradation;
        
        @Override
        public String toString() {
            if (willThrottle) {
                return String.format(
                    "⚠️  EXTREME HEAT: Peak %.1f°C for %d hours → System will throttle in %.0f minutes (%.0f%% efficiency loss)",
                    peakAmbientC, durationHours, timeToThrottleMinutes, efficiencyDegradation * 100
                );
            } else {
                return String.format(
                    "✅ System can handle %.1f°C for %d hours (%.0f%% efficiency loss)",
                    peakAmbientC, durationHours, efficiencyDegradation * 100
                );
            }
        }
    }
    
    /**
     * Inner class for climate compatibility check
     */
    public static class ClimateCompatibility {
        public boolean isCompatible;
        public boolean isWarning;
        public String reason;
        public String recommendation;
        public double futureAmbientC;
        public double futureWetBulbC;
        
        public ClimateCompatibility() {
            this.isCompatible = true;
            this.isWarning = false;
            this.reason = "Cooling system compatible with climate scenario";
            this.recommendation = "";
        }
        
        @Override
        public String toString() {
            if (!isCompatible) {
                return "❌ " + reason + "\n   → " + recommendation;
            } else if (isWarning) {
                return "⚠️  " + reason + "\n   → " + recommendation;
            } else {
                return "✅ " + reason;
            }
        }
    }
}
