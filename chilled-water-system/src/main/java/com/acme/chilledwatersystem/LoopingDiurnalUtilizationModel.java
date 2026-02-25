package com.acme.chilledwatersystem;

import org.cloudsimplus.utilizationmodels.UtilizationModelAbstract;

/**
 * A custom CloudSim Plus Utilization Model that loops every 24 hours (86400 seconds).
 * This ensures the IT load never runs out during the 8760-hour simulation.
 * 
 * Features:
 * - Diurnal pattern: Higher utilization during business hours (peak at 2 PM)
 * - Weekly pattern: Lower utilization on weekends (70% of weekday load)
 * - Random noise: ±5% variation to simulate real workload fluctuations
 * - Continuous looping: Uses modulo operator to repeat pattern indefinitely
 * 
 * This fixes the "workload stagnation" problem where CloudSim runs out of
 * cloudlets and IT load flatlines for the remainder of the simulation.
 */
public class LoopingDiurnalUtilizationModel extends UtilizationModelAbstract {
    
    private static final double DAY_SECONDS = 86400.0; // 24 hours
    private static final double WEEK_SECONDS = 604800.0; // 7 days
    
    private final double baseUtilization;
    private final double amplitude;
    private final boolean enableWeeklyPattern;
    private final boolean enableRandomNoise;
    
    /**
     * Create a looping utilization model with default settings
     * Base: 50%, Amplitude: 30%, Weekly pattern: enabled, Random noise: enabled
     */
    public LoopingDiurnalUtilizationModel() {
        this(0.5, 0.3, true, true);
    }
    
    /**
     * Create a looping utilization model with custom settings
     * 
     * @param baseUtilization Average utilization (0.0 to 1.0)
     * @param amplitude Variation amplitude (0.0 to 0.5)
     * @param enableWeeklyPattern Enable weekend load reduction
     * @param enableRandomNoise Enable ±5% random variation
     */
    public LoopingDiurnalUtilizationModel(double baseUtilization, double amplitude, 
                                         boolean enableWeeklyPattern, boolean enableRandomNoise) {
        super();
        this.baseUtilization = Math.max(0.2, Math.min(0.8, baseUtilization));
        this.amplitude = Math.max(0.0, Math.min(0.4, amplitude));
        this.enableWeeklyPattern = enableWeeklyPattern;
        this.enableRandomNoise = enableRandomNoise;
    }
    
    @Override
    protected double getUtilizationInternal(double time) {
        // 1. CYCLIC TIME: Loop the time so model repeats every 24 hours
        // This makes CloudSim "think" it's always within the first day
        double cyclicTime = time % DAY_SECONDS;
        
        // 2. DIURNAL PATTERN: Higher utilization at noon, lower at midnight
        // Formula: base + amplitude * sin(2π * (time - offset) / period)
        // Offset = 21600 seconds (6 AM) so peak occurs at 14:00 (2 PM)
        double hourOfDay = cyclicTime / 3600.0; // 0-24
        double diurnalFactor = 1.0 + (amplitude / baseUtilization) * 
            Math.sin((2 * Math.PI * (cyclicTime - 21600)) / DAY_SECONDS);
        
        // 3. WEEKLY PATTERN: Weekends have lower load (70% of weekday)
        double weeklyFactor = 1.0;
        if (enableWeeklyPattern) {
            int dayOfWeek = (int) ((time % WEEK_SECONDS) / DAY_SECONDS);
            weeklyFactor = (dayOfWeek < 5) ? 1.0 : 0.7; // Mon-Fri: 100%, Sat-Sun: 70%
        }
        
        // 4. RANDOM NOISE: ±5% variation to simulate real workload fluctuations
        double randomFactor = 1.0;
        if (enableRandomNoise) {
            randomFactor = 0.95 + (Math.random() * 0.10); // 0.95 to 1.05
        }
        
        // 5. COMBINE ALL FACTORS
        double utilization = baseUtilization * diurnalFactor * weeklyFactor * randomFactor;
        
        // 6. CLAMP: Ensure utilization stays within realistic bounds (10% to 95%)
        // Minimum 10% prevents zero load (servers never completely idle)
        // Maximum 95% prevents unrealistic 100% sustained load
        utilization = Math.max(0.10, Math.min(0.95, utilization));
        
        // DEBUG: Log occasionally to verify this is being called
        if (time % 86400 < 3600) { // Once per day
            System.out.printf("  LoopingDiurnalUtilizationModel called: time=%.0fs, hour=%.1f, util=%.3f\n",
                time, hourOfDay, utilization);
        }
        
        return utilization;
    }
    
    /**
     * Get the current hour of day (0-23) for debugging
     */
    public static int getHourOfDay(double time) {
        return (int) ((time % DAY_SECONDS) / 3600.0);
    }
    
    /**
     * Get the current day of week (0-6, 0=Monday) for debugging
     */
    public static int getDayOfWeek(double time) {
        return (int) ((time % WEEK_SECONDS) / DAY_SECONDS);
    }
    
    /**
     * Factory method: Create model for AI training workload
     * High base utilization (70%), moderate variation (20%)
     */
    public static LoopingDiurnalUtilizationModel forAITraining() {
        return new LoopingDiurnalUtilizationModel(0.70, 0.20, true, true);
    }
    
    /**
     * Factory method: Create model for AI inference workload
     * Moderate base utilization (50%), high variation (35%)
     */
    public static LoopingDiurnalUtilizationModel forAIInference() {
        return new LoopingDiurnalUtilizationModel(0.50, 0.35, true, true);
    }
    
    /**
     * Factory method: Create model for enterprise workload
     * Moderate base utilization (50%), moderate variation (30%)
     */
    public static LoopingDiurnalUtilizationModel forEnterprise() {
        return new LoopingDiurnalUtilizationModel(0.50, 0.30, true, true);
    }
    
    /**
     * Factory method: Create model for edge computing workload
     * Lower base utilization (40%), high variation (35%)
     */
    public static LoopingDiurnalUtilizationModel forEdgeComputing() {
        return new LoopingDiurnalUtilizationModel(0.40, 0.35, true, true);
    }
    
    @Override
    public String toString() {
        return String.format("LoopingDiurnalUtilizationModel[base=%.1f%%, amplitude=%.1f%%, weekly=%s, noise=%s]",
            baseUtilization * 100, amplitude * 100, enableWeeklyPattern, enableRandomNoise);
    }
}
