package com.acme.evap;

/**
 * AI Workload Model - Backend-driven AI/ML workload profiles
 * Handles training, inference, and mixed AI workloads with realistic power patterns
 */
public class AIWorkloadModel {
    
    public enum WorkloadType {
        TRADITIONAL,    // Standard enterprise workloads
        AI_TRAINING,    // ML model training (bursty, high power)
        AI_INFERENCE,   // ML inference serving (steady, moderate power)
        MIXED_AI,       // Combination of training and inference
        GPU_COMPUTE     // General GPU compute workloads
    }
    
    public static class AIWorkloadConfig {
        public WorkloadType type;
        
        // Training parameters
        public double trainingBatchDuration_hours = 4.0; // Typical training batch
        public double trainingIdleRatio = 0.3; // 30% idle between batches
        public double trainingPeakMultiplier = 1.8; // 80% above average during training
        
        // Inference parameters
        public double inferenceBaseLoad = 0.6; // 60% base utilization
        public double inferencePeakLoad = 0.9; // 90% peak during high traffic
        public double inferenceVariability = 0.15; // ±15% variation
        
        // Mixed workload parameters
        public double trainingFraction = 0.4; // 40% training, 60% inference
        public boolean enableDiurnalPattern = true; // Follow daily usage patterns
        
        // GPU-specific parameters
        public double gpuIdlePowerFraction = 0.25; // GPUs idle at 25% of max
        public double gpuMemoryPowerFraction = 0.15; // Memory contributes 15% of power
        public double gpuThermalThrottlingTemp = 80.0; // °C threshold for throttling
        
        // Rack density parameters
        public double serversPerRack = 10;
        public double gpusPerServer = 8; // High-density GPU servers
        public double gpuPowerPerUnit_W = 400; // Per GPU power (e.g., A100)
        public double cpuPowerPerServer_W = 300; // CPU power
        
        public AIWorkloadConfig(WorkloadType type) {
            this.type = type;
        }
    }
    
    public static class AIWorkloadResult {
        public double utilizationFraction; // 0.0 to 1.0
        public double powerMultiplier; // Relative to max power
        public double heatDensityKW_per_rack;
        public boolean isTrainingActive;
        public boolean isThermalThrottling;
        public String workloadPhase; // "idle", "training", "inference", "mixed"
    }
    
    /**
     * Calculate AI workload utilization at given time
     */
    public static AIWorkloadResult calculateWorkload(AIWorkloadConfig config, long timeSeconds) {
        AIWorkloadResult result = new AIWorkloadResult();
        
        switch (config.type) {
            case TRADITIONAL:
                calculateTraditionalWorkload(result, config, timeSeconds);
                break;
                
            case AI_TRAINING:
                calculateTrainingWorkload(result, config, timeSeconds);
                break;
                
            case AI_INFERENCE:
                calculateInferenceWorkload(result, config, timeSeconds);
                break;
                
            case MIXED_AI:
                calculateMixedAIWorkload(result, config, timeSeconds);
                break;
                
            case GPU_COMPUTE:
                calculateGPUComputeWorkload(result, config, timeSeconds);
                break;
        }
        
        // Calculate heat density
        double maxPowerPerRack = config.serversPerRack * 
                                (config.gpusPerServer * config.gpuPowerPerUnit_W + 
                                 config.cpuPowerPerServer_W);
        result.heatDensityKW_per_rack = (maxPowerPerRack / 1000.0) * result.powerMultiplier;
        
        return result;
    }
    
    private static void calculateTraditionalWorkload(AIWorkloadResult result, 
                                                    AIWorkloadConfig config, 
                                                    long timeSeconds) {
        // Standard diurnal pattern for enterprise workloads
        double hourOfDay = (timeSeconds % 86400) / 3600.0;
        
        // Business hours: 8 AM to 6 PM (higher load)
        if (hourOfDay >= 8 && hourOfDay <= 18) {
            result.utilizationFraction = 0.65 + 0.15 * Math.sin(Math.PI * (hourOfDay - 8) / 10.0);
        } else {
            result.utilizationFraction = 0.35 + 0.10 * Math.sin(Math.PI * hourOfDay / 12.0);
        }
        
        result.powerMultiplier = 0.3 + 0.7 * result.utilizationFraction; // Idle + active power
        result.isTrainingActive = false;
        result.isThermalThrottling = false;
        result.workloadPhase = "traditional";
    }
    
    private static void calculateTrainingWorkload(AIWorkloadResult result, 
                                                 AIWorkloadConfig config, 
                                                 long timeSeconds) {
        // Training runs in batches with idle periods
        double batchDurationSeconds = config.trainingBatchDuration_hours * 3600;
        double cycleDurationSeconds = batchDurationSeconds / (1.0 - config.trainingIdleRatio);
        double cyclePosition = (timeSeconds % (long)cycleDurationSeconds) / cycleDurationSeconds;
        
        if (cyclePosition < (1.0 - config.trainingIdleRatio)) {
            // Training active
            result.isTrainingActive = true;
            result.utilizationFraction = 0.95; // Near-maximum utilization during training
            result.powerMultiplier = config.trainingPeakMultiplier;
            result.workloadPhase = "training_active";
        } else {
            // Idle between batches
            result.isTrainingActive = false;
            result.utilizationFraction = 0.15; // Low utilization during idle
            result.powerMultiplier = config.gpuIdlePowerFraction;
            result.workloadPhase = "training_idle";
        }
        
        result.isThermalThrottling = false;
    }
    
    private static void calculateInferenceWorkload(AIWorkloadResult result, 
                                                  AIWorkloadConfig config, 
                                                  long timeSeconds) {
        // Inference follows traffic patterns with variability
        double hourOfDay = (timeSeconds % 86400) / 3600.0;
        
        // Peak traffic during business hours
        double trafficMultiplier;
        if (config.enableDiurnalPattern) {
            if (hourOfDay >= 9 && hourOfDay <= 17) {
                trafficMultiplier = 1.0; // Peak hours
            } else if (hourOfDay >= 6 && hourOfDay <= 22) {
                trafficMultiplier = 0.7; // Moderate hours
            } else {
                trafficMultiplier = 0.4; // Off-peak hours
            }
        } else {
            trafficMultiplier = 1.0; // Constant load
        }
        
        // Add random variability
        double randomVariation = (Math.random() - 0.5) * 2 * config.inferenceVariability;
        
        result.utilizationFraction = Math.min(1.0, Math.max(0.1,
            config.inferenceBaseLoad + 
            (config.inferencePeakLoad - config.inferenceBaseLoad) * trafficMultiplier +
            randomVariation
        ));
        
        result.powerMultiplier = config.gpuIdlePowerFraction + 
                                (1.0 - config.gpuIdlePowerFraction) * result.utilizationFraction;
        result.isTrainingActive = false;
        result.isThermalThrottling = false;
        result.workloadPhase = "inference";
    }
    
    private static void calculateMixedAIWorkload(AIWorkloadResult result, 
                                                AIWorkloadConfig config, 
                                                long timeSeconds) {
        // Combine training and inference workloads
        AIWorkloadResult trainingResult = new AIWorkloadResult();
        calculateTrainingWorkload(trainingResult, config, timeSeconds);
        
        AIWorkloadResult inferenceResult = new AIWorkloadResult();
        calculateInferenceWorkload(inferenceResult, config, timeSeconds);
        
        // Weighted combination
        result.utilizationFraction = config.trainingFraction * trainingResult.utilizationFraction +
                                    (1.0 - config.trainingFraction) * inferenceResult.utilizationFraction;
        
        result.powerMultiplier = config.trainingFraction * trainingResult.powerMultiplier +
                                (1.0 - config.trainingFraction) * inferenceResult.powerMultiplier;
        
        result.isTrainingActive = trainingResult.isTrainingActive;
        result.isThermalThrottling = false;
        result.workloadPhase = "mixed";
    }
    
    private static void calculateGPUComputeWorkload(AIWorkloadResult result, 
                                                   AIWorkloadConfig config, 
                                                   long timeSeconds) {
        // General GPU compute with sustained high utilization
        double hourOfDay = (timeSeconds % 86400) / 3600.0;
        
        // Slight diurnal variation
        double baseUtilization = 0.80; // High sustained utilization
        double variation = 0.10 * Math.sin(2 * Math.PI * hourOfDay / 24.0);
        
        result.utilizationFraction = baseUtilization + variation;
        result.powerMultiplier = config.gpuIdlePowerFraction + 
                                (1.0 - config.gpuIdlePowerFraction) * result.utilizationFraction;
        result.isTrainingActive = false;
        result.isThermalThrottling = false;
        result.workloadPhase = "gpu_compute";
    }
    
    /**
     * Check for thermal throttling based on inlet temperature
     */
    public static boolean checkThermalThrottling(AIWorkloadConfig config, double inletTempC) {
        return inletTempC >= config.gpuThermalThrottlingTemp;
    }
    
    /**
     * Calculate adjusted power due to thermal throttling
     */
    public static double applyThermalThrottling(double basePowerKW, double inletTempC, 
                                               AIWorkloadConfig config) {
        if (inletTempC < config.gpuThermalThrottlingTemp) {
            return basePowerKW; // No throttling
        }
        
        // Linear throttling: reduce power by 5% per degree above threshold
        double excessTemp = inletTempC - config.gpuThermalThrottlingTemp;
        double throttlingFactor = Math.max(0.5, 1.0 - 0.05 * excessTemp); // Min 50% power
        
        return basePowerKW * throttlingFactor;
    }
    
    /**
     * Calculate cooling requirements for AI workloads
     */
    public static class CoolingRequirement {
        public double requiredAirflowCFM;
        public double requiredCoolingCapacityKW;
        public double inletTempLimitC;
        public boolean requiresEnhancedCooling;
        public String[] coolingRecommendations;
    }
    
    public static CoolingRequirement calculateCoolingRequirements(AIWorkloadConfig config,
                                                                 int numberOfRacks,
                                                                 double ambientTempC) {
        CoolingRequirement req = new CoolingRequirement();
        java.util.List<String> recommendations = new java.util.ArrayList<>();
        
        // Calculate peak heat load
        double maxPowerPerRack = config.serversPerRack * 
                                (config.gpusPerServer * config.gpuPowerPerUnit_W + 
                                 config.cpuPowerPerServer_W);
        double totalHeatLoadKW = (maxPowerPerRack * numberOfRacks) / 1000.0;
        
        // Required cooling capacity (with 20% safety margin)
        req.requiredCoolingCapacityKW = totalHeatLoadKW * 1.2;
        
        // Calculate required airflow (assuming 10°C temperature rise)
        double tempRiseC = 10.0;
        double airDensity = 1.2; // kg/m³
        double specificHeat = 1.006; // kJ/(kg·°C)
        double requiredAirflowM3s = (totalHeatLoadKW * 3600) / (airDensity * specificHeat * tempRiseC);
        req.requiredAirflowCFM = requiredAirflowM3s * 2118.88; // Convert to CFM
        
        // Inlet temperature limit (stricter for GPUs)
        req.inletTempLimitC = config.gpuThermalThrottlingTemp - 5.0; // 5°C safety margin
        
        // Check if enhanced cooling is required
        double heatDensityKW_per_rack = totalHeatLoadKW / numberOfRacks;
        req.requiresEnhancedCooling = heatDensityKW_per_rack > 15.0; // >15kW/rack is high density
        
        // Generate recommendations
        if (req.requiresEnhancedCooling) {
            recommendations.add("High-density AI workload detected - implement hot aisle containment");
            recommendations.add("Consider rear-door heat exchangers for GPU racks");
        }
        
        if (ambientTempC > 30.0) {
            recommendations.add("High ambient temperature - add DX backup cooling");
            recommendations.add("Monitor GPU thermal throttling events");
        }
        
        if (config.type == WorkloadType.AI_TRAINING) {
            recommendations.add("Training workloads create thermal spikes - ensure adequate thermal mass");
        }
        
        if (config.gpusPerServer >= 8) {
            recommendations.add("High GPU density - verify server airflow and fan operation");
        }
        
        req.coolingRecommendations = recommendations.toArray(new String[0]);
        
        return req;
    }
    
    /**
     * Validate rack density feasibility
     */
    public static class DensityCheck {
        public boolean feasible;
        public double maxSafeServersPerRack;
        public double coolingCapacityDeficit;
        public String[] warnings;
    }
    
    public static DensityCheck validateRackDensity(AIWorkloadConfig config,
                                                  double availableCoolingKW,
                                                  double ambientTempC) {
        DensityCheck check = new DensityCheck();
        java.util.List<String> warnings = new java.util.ArrayList<>();
        
        // Calculate power per rack
        double powerPerRack = config.serversPerRack * 
                             (config.gpusPerServer * config.gpuPowerPerUnit_W + 
                              config.cpuPowerPerServer_W) / 1000.0;
        
        // Check against cooling capacity
        check.feasible = powerPerRack <= availableCoolingKW;
        
        if (!check.feasible) {
            check.coolingCapacityDeficit = powerPerRack - availableCoolingKW;
            warnings.add(String.format("Rack power (%.1f kW) exceeds cooling capacity (%.1f kW)", 
                                      powerPerRack, availableCoolingKW));
            
            // Calculate safe density
            double maxPowerPerServer = (config.gpusPerServer * config.gpuPowerPerUnit_W + 
                                       config.cpuPowerPerServer_W) / 1000.0;
            check.maxSafeServersPerRack = Math.floor(availableCoolingKW / maxPowerPerServer);
            
            warnings.add(String.format("Reduce to %.0f servers per rack or increase cooling capacity", 
                                      check.maxSafeServersPerRack));
        } else {
            check.maxSafeServersPerRack = config.serversPerRack;
            check.coolingCapacityDeficit = 0.0;
        }
        
        // Additional warnings for extreme conditions
        if (powerPerRack > 20.0) {
            warnings.add("Extreme rack density (>20kW) - consider liquid cooling");
        }
        
        if (ambientTempC > 35.0 && config.type == WorkloadType.AI_TRAINING) {
            warnings.add("High ambient temp + training workload - risk of thermal throttling");
        }
        
        check.warnings = warnings.toArray(new String[0]);
        
        return check;
    }
}
