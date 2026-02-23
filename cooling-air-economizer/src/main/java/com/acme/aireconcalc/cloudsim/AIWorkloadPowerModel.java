package com.acme.aireconcalc.cloudsim;

import org.cloudsimplus.power.models.PowerModelHostSimple;
import org.cloudsimplus.power.PowerMeasurement;

/**
 * AI Workload Power Model - Integrates AI Workload Methodology into CloudSim
 * 
 * This power model extends PowerModelHostSimple and replaces the generic linear
 * power calculation with methodology-specific heat profiles that account for
 * different AI workload types.
 * 
 * Key Features:
 * - Applies workload-specific power multipliers (Training: 1.80x, Inference: 1.40x)
 * - Accounts for static (idle) power fraction
 * - Provides dynamic heat density calculations based on actual utilization
 * 
 * Formula: P_total = P_idle + (P_dynamic * Utilization * Multiplier)
 * 
 * Where:
 * - P_idle = maxPowerWatts * staticFraction
 * - P_dynamic = maxPowerWatts * (1 - staticFraction)
 * - Multiplier = workloadMultiplier (1.80 for Training, 1.40 for Inference)
 */
public class AIWorkloadPowerModel extends PowerModelHostSimple {
    
    // Methodology Constants
    private final double workloadMultiplier; // 1.80 for Training, 1.40 for Inference, 1.0 for Enterprise
    private final double staticFraction;     // Idle power fraction (typically 0.3 - 0.4)
    
    /**
     * Create AI Workload Power Model
     * 
     * @param maxPowerWatts Maximum server power consumption (W)
     * @param staticFraction Fraction of max power consumed at idle (0.0 - 1.0)
     * @param workloadMultiplier Power multiplier for workload type
     */
    public AIWorkloadPowerModel(double maxPowerWatts, double staticFraction, double workloadMultiplier) {
        // Call parent constructor with max power and idle power
        super(maxPowerWatts, maxPowerWatts * staticFraction);
        
        if (staticFraction < 0 || staticFraction > 1) {
            throw new IllegalArgumentException("staticFraction must be between 0 and 1");
        }
        if (workloadMultiplier < 0) {
            throw new IllegalArgumentException("workloadMultiplier must be non-negative");
        }
        
        this.staticFraction = staticFraction;
        this.workloadMultiplier = workloadMultiplier;
    }
    
    /**
     * Calculate power consumption based on utilization
     * 
     * Implements the AI Workload Methodology formula:
     * P_total = P_idle + (P_busy * Multiplier * Utilization)
     * 
     * This overrides the parent's getPowerInternal method to apply the workload multiplier.
     * 
     * @param utilization CPU utilization (0.0 - 1.0)
     * @return Power consumption in Watts
     */
    @Override
    public double getPowerInternal(double utilization) {
        // Get idle power from parent class
        double idlePower = getStaticPower();
        
        // Calculate dynamic power range
        double dynamicPower = getMaxPower() - idlePower;
        
        // Apply methodology's specific power multiplier
        // This accounts for the heat density characteristics of different AI workloads
        double totalPower = idlePower + (dynamicPower * utilization * workloadMultiplier);
        
        // Ensure power doesn't exceed physical limits
        return Math.min(totalPower, getMaxPower() * workloadMultiplier);
    }
    
    /**
     * Get power measurement with AI workload methodology applied
     * 
     * @return PowerMeasurement object with static and dynamic power components
     */
    @Override
    public PowerMeasurement getPowerMeasurement() {
        final var host = getHost();
        if (!host.isActive()) {
            return new PowerMeasurement();
        }
        
        final double utilization = host.getCpuMipsUtilization() / host.getTotalMipsCapacity();
        final double idlePower = getStaticPower();
        final double dynamicPower = (getMaxPower() - idlePower) * utilization * workloadMultiplier;
        
        return new PowerMeasurement(idlePower, dynamicPower);
    }
    
    /**
     * Get workload multiplier
     * 
     * @return Workload multiplier (1.0 - 1.8)
     */
    public double getWorkloadMultiplier() {
        return workloadMultiplier;
    }
    
    /**
     * Get static fraction
     * 
     * @return Static fraction (0.0 - 1.0)
     */
    public double getStaticFraction() {
        return staticFraction;
    }
    
    // Factory methods for common AI workload types
    
    /**
     * Create power model for AI Training workload
     * High density, sustained load (multiplier: 1.80x)
     * 
     * @param maxPowerWatts Maximum server power
     * @return Configured power model for AI training
     */
    public static AIWorkloadPowerModel forAITraining(double maxPowerWatts) {
        return new AIWorkloadPowerModel(maxPowerWatts, 0.4, 1.80);
    }
    
    /**
     * Create power model for AI Inference workload
     * Moderate density, bursty load (multiplier: 1.40x)
     * 
     * @param maxPowerWatts Maximum server power
     * @return Configured power model for AI inference
     */
    public static AIWorkloadPowerModel forAIInference(double maxPowerWatts) {
        return new AIWorkloadPowerModel(maxPowerWatts, 0.3, 1.40);
    }
    
    /**
     * Create power model for Enterprise workload
     * Standard density, steady load (multiplier: 1.0x)
     * 
     * @param maxPowerWatts Maximum server power
     * @return Configured power model for enterprise workload
     */
    public static AIWorkloadPowerModel forEnterprise(double maxPowerWatts) {
        return new AIWorkloadPowerModel(maxPowerWatts, 0.3, 1.0);
    }
    
    /**
     * Create power model for Mixed workload
     * Balanced between training and enterprise (multiplier: 1.3x)
     * 
     * @param maxPowerWatts Maximum server power
     * @return Configured power model for mixed workload
     */
    public static AIWorkloadPowerModel forMixed(double maxPowerWatts) {
        return new AIWorkloadPowerModel(maxPowerWatts, 0.35, 1.3);
    }
    
    @Override
    public String toString() {
        return String.format("AIWorkloadPowerModel[max=%.1fW, static=%.2f, multiplier=%.2fx]",
                           getMaxPower(), staticFraction, workloadMultiplier);
    }
}
