package com.acme.chilledwatersystem;

import java.util.List;

/**
 * Phase 3 Part 3: Workload-Specific Annual Aggregation
 * 
 * Aggregates 8760-hour simulation results based on workload profile:
 * - AI Training: Sustained high load (96% load factor, 50-100 kW/rack)
 * - AI Inference: Bursty load with latency penalty tracking
 * - Enterprise: Traditional diurnal patterns (5-15 kW/rack)
 */
public class WorkloadAggregator {
    
    private final WorkloadSituation workloadSituation;
    private final List<HourlyResult> hourlyResults;
    
    // Aggregated metrics
    private double totalITEnergyKWh = 0.0;
    private double totalCoolingEnergyKWh = 0.0;
    private double totalFacilityEnergyKWh = 0.0;
    private double averagePUE = 0.0;
    private int thermalThrottlingHours = 0;
    private int latencyPenaltyHours = 0;
    private double performanceLossPercent = 0.0;
    
    public WorkloadAggregator(WorkloadSituation workloadSituation, List<HourlyResult> hourlyResults) {
        this.workloadSituation = workloadSituation;
        this.hourlyResults = hourlyResults;
        aggregate();
    }
    
    /**
     * Aggregate results based on workload type
     */
    private void aggregate() {
        double sumPUE = 0.0;
        
        for (HourlyResult result : hourlyResults) {
            totalITEnergyKWh += result.getItLoadKw();
            totalCoolingEnergyKWh += result.getTotalCoolingKw();
            totalFacilityEnergyKWh += result.getTotalFacilityKw();
            sumPUE += result.getPue();
            
            // Check for thermal compliance violations
            if (!result.isThermalCompliance()) {
                thermalThrottlingHours++;
                
                // Calculate performance impact based on workload type
                if (workloadSituation.getWorkloadType() == WorkloadSituation.Type.AI_TRAINING) {
                    // AI Training: 15% performance loss during throttling
                    performanceLossPercent += 15.0;
                } else if (workloadSituation.getWorkloadType() == WorkloadSituation.Type.AI_INFERENCE) {
                    // AI Inference: Latency penalty (switch to lower-power processors)
                    latencyPenaltyHours++;
                    performanceLossPercent += 8.0;
                }
            }
        }
        
        averagePUE = sumPUE / hourlyResults.size();
        
        // Calculate average performance loss
        if (thermalThrottlingHours > 0) {
            performanceLossPercent = performanceLossPercent / thermalThrottlingHours;
        }
    }
    
    /**
     * Calculate equipment refresh rate based on workload
     */
    public double getEquipmentRefreshYears() {
        switch (workloadSituation.getWorkloadType()) {
            case AI_TRAINING:
            case AI_INFERENCE:
                return 3.0; // AI hardware: 3-year refresh cycle
            case ENTERPRISE:
            default:
                return 5.0; // Traditional servers: 5-year refresh cycle
        }
    }
    
    /**
     * Calculate training time increase due to thermal throttling
     * Relevant for AI Training workloads
     */
    public double getTrainingTimeIncreasePercent() {
        if (workloadSituation.getWorkloadType() != WorkloadSituation.Type.AI_TRAINING) {
            return 0.0;
        }
        
        // Training time increases proportionally to throttling hours
        double throttlingFraction = (double) thermalThrottlingHours / hourlyResults.size();
        return throttlingFraction * performanceLossPercent;
    }
    
    /**
     * Calculate inference latency impact
     * Relevant for AI Inference workloads
     */
    public double getInferenceLatencyIncreasePercent() {
        if (workloadSituation.getWorkloadType() != WorkloadSituation.Type.AI_INFERENCE) {
            return 0.0;
        }
        
        // Latency increases when switching to lower-power processors
        double latencyFraction = (double) latencyPenaltyHours / hourlyResults.size();
        return latencyFraction * 25.0; // 25% latency increase during penalty hours
    }
    
    /**
     * Get workload-specific energy signature
     */
    public String getEnergySignature() {
        switch (workloadSituation.getWorkloadType()) {
            case AI_TRAINING:
                return String.format("Sustained High Load: %.0f%% load factor, %.1f kW/rack average",
                    workloadSituation.getLoadFactor() * 100,
                    workloadSituation.getRackPowerDensityKW());
            case AI_INFERENCE:
                return String.format("Bursty Load: %.0f%% average load factor, %.1f kW/rack peak, %d latency penalty hours",
                    workloadSituation.getLoadFactor() * 100,
                    workloadSituation.getRackPowerDensityKW(),
                    latencyPenaltyHours);
            case ENTERPRISE:
            default:
                return String.format("Diurnal Pattern: %.0f%% load factor, %.1f kW/rack average",
                    workloadSituation.getLoadFactor() * 100,
                    workloadSituation.getRackPowerDensityKW());
        }
    }
    
    /**
     * Print workload-specific summary
     */
    public void printSummary() {
        System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  WORKLOAD-SPECIFIC ANNUAL AGGREGATION                                 ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        System.out.println("Workload Profile: " + workloadSituation.getWorkloadType());
        System.out.println("Energy Signature: " + getEnergySignature());
        System.out.println();
        
        System.out.println("ANNUAL ENERGY CONSUMPTION:");
        System.out.printf("  IT Energy: %.2f MWh\n", totalITEnergyKWh / 1000.0);
        System.out.printf("  Cooling Energy: %.2f MWh\n", totalCoolingEnergyKWh / 1000.0);
        System.out.printf("  Total Facility Energy: %.2f MWh\n", totalFacilityEnergyKWh / 1000.0);
        System.out.printf("  Average PUE: %.3f\n", averagePUE);
        System.out.println();
        
        System.out.println("THERMAL PERFORMANCE:");
        System.out.printf("  Thermal Throttling Hours: %d (%.2f%%)\n", 
            thermalThrottlingHours, thermalThrottlingHours * 100.0 / hourlyResults.size());
        
        if (workloadSituation.getWorkloadType() == WorkloadSituation.Type.AI_TRAINING) {
            System.out.printf("  Training Time Increase: %.2f%%\n", getTrainingTimeIncreasePercent());
            System.out.printf("  Average Performance Loss: %.2f%% during throttling\n", performanceLossPercent);
        } else if (workloadSituation.getWorkloadType() == WorkloadSituation.Type.AI_INFERENCE) {
            System.out.printf("  Latency Penalty Hours: %d (%.2f%%)\n", 
                latencyPenaltyHours, latencyPenaltyHours * 100.0 / hourlyResults.size());
            System.out.printf("  Inference Latency Increase: %.2f%%\n", getInferenceLatencyIncreasePercent());
        }
        
        System.out.println();
        System.out.println("EQUIPMENT LIFECYCLE:");
        System.out.printf("  Refresh Cycle: %.1f years\n", getEquipmentRefreshYears());
        System.out.printf("  Lifecycle Refreshes (15 years): %.0f\n", 15.0 / getEquipmentRefreshYears());
        System.out.println();
    }
    
    // Getters
    public double getTotalITEnergyKWh() {
        return totalITEnergyKWh;
    }
    
    public double getTotalCoolingEnergyKWh() {
        return totalCoolingEnergyKWh;
    }
    
    public double getTotalFacilityEnergyKWh() {
        return totalFacilityEnergyKWh;
    }
    
    public double getAveragePUE() {
        return averagePUE;
    }
    
    public int getThermalThrottlingHours() {
        return thermalThrottlingHours;
    }
    
    public int getLatencyPenaltyHours() {
        return latencyPenaltyHours;
    }
    
    public double getPerformanceLossPercent() {
        return performanceLossPercent;
    }
}
