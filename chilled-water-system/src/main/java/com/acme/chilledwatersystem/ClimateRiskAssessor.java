package com.acme.chilledwatersystem;

/**
 * Phase 3 Part 3 - Phase 4: Climate Risk & Resilience Assessment
 * 
 * Performs 2050 thermal stress testing and evaluates long-term climate risks.
 * Accounts for increased cooling degree days and humidity saturation limits.
 */
public class ClimateRiskAssessor {
    
    private final ClimateHazardModel climateModel;
    private final WorkloadAggregator workloadAgg;
    private final EdgeDataCenterScenario scenario;
    
    // Climate projections
    private static final double COOLING_DEGREE_DAYS_INCREASE_2080 = 0.25; // 25% increase
    
    public ClimateRiskAssessor(ClimateHazardModel climateModel,
                              WorkloadAggregator workloadAgg,
                              EdgeDataCenterScenario scenario) {
        this.climateModel = climateModel;
        this.workloadAgg = workloadAgg;
        this.scenario = scenario;
    }
    
    /**
     * Perform 2050 thermal stress test
     */
    public ThermalStressTest perform2050StressTest(String coolingType) {
        ThermalStressTest test = new ThermalStressTest();
        
        double baseAmbient = scenario.getDesignAmbientC();
        double baseWetBulb = scenario.getDesignWetBulbC();
        
        // Apply 2050 climate warming
        double future2050Ambient = climateModel.applyClimateWarming(baseAmbient);
        double future2050WetBulb = climateModel.calculateAdjustedWetBulb(baseWetBulb, baseAmbient);
        
        test.baseAmbientC = baseAmbient;
        test.future2050AmbientC = future2050Ambient;
        test.future2050WetBulbC = future2050WetBulb;
        test.warmingShiftC = future2050Ambient - baseAmbient;
        
        // Calculate thermal throttling hours
        int throttlingHours = workloadAgg.getThermalThrottlingHours();
        test.currentThrottlingHours = throttlingHours;
        
        // Project future throttling (increases with temperature)
        // For every 1°C increase, throttling hours increase by ~15%
        double throttlingIncreaseFactor = 1.0 + (test.warmingShiftC * 0.15);
        test.future2050ThrottlingHours = (int)(throttlingHours * throttlingIncreaseFactor);
        
        // Calculate performance impact
        if (workloadAgg.getTrainingTimeIncreasePercent() > 0) {
            test.trainingTimeIncrease2050 = workloadAgg.getTrainingTimeIncreasePercent() * throttlingIncreaseFactor;
        }
        
        if (workloadAgg.getInferenceLatencyIncreasePercent() > 0) {
            test.inferenceLatencyIncrease2050 = workloadAgg.getInferenceLatencyIncreasePercent() * throttlingIncreaseFactor;
        }
        
        // Check cooling system compatibility
        ClimateHazardModel.ClimateCompatibility compat = 
            climateModel.checkClimateCompatibility(coolingType, baseAmbient, baseWetBulb);
        
        test.isSystemCompatible = compat.isCompatible;
        test.compatibilityReason = compat.reason;
        test.compatibilityRecommendation = compat.recommendation;
        
        // Calculate efficiency degradation
        // Chiller COP drops 2-3% per °C above design
        test.efficiencyDegradation2050 = test.warmingShiftC * 0.025;
        
        // Calculate revenue impact for AI workloads
        if (test.trainingTimeIncrease2050 > 0) {
            // Assume $10K/hour for GPU training time
            double annualTrainingHours = 8760 * 0.96; // 96% utilization
            double delayHours = annualTrainingHours * (test.trainingTimeIncrease2050 / 100.0);
            test.revenueImpactUSD = delayHours * 10000.0;
        }
        
        return test;
    }
    
    /**
     * Calculate climate-driven operational risk
     */
    public OperationalRisk assessOperationalRisk(ThermalStressTest stressTest) {
        OperationalRisk risk = new OperationalRisk();
        
        // Risk Level 1: Thermal throttling
        if (stressTest.future2050ThrottlingHours > 1000) {
            risk.thermalRiskLevel = "CRITICAL";
            risk.thermalRiskScore = 10;
            risk.thermalRiskReason = String.format(
                "System will experience %d hours of thermal throttling annually by 2050 (%.1f%% of year)",
                stressTest.future2050ThrottlingHours,
                stressTest.future2050ThrottlingHours * 100.0 / 8760
            );
        } else if (stressTest.future2050ThrottlingHours > 500) {
            risk.thermalRiskLevel = "HIGH";
            risk.thermalRiskScore = 7;
            risk.thermalRiskReason = String.format(
                "Moderate thermal throttling expected: %d hours annually by 2050",
                stressTest.future2050ThrottlingHours
            );
        } else if (stressTest.future2050ThrottlingHours > 100) {
            risk.thermalRiskLevel = "MODERATE";
            risk.thermalRiskScore = 4;
            risk.thermalRiskReason = String.format(
                "Minor thermal throttling: %d hours annually by 2050",
                stressTest.future2050ThrottlingHours
            );
        } else {
            risk.thermalRiskLevel = "LOW";
            risk.thermalRiskScore = 1;
            risk.thermalRiskReason = "System can handle 2050 climate conditions";
        }
        
        // Risk Level 2: Efficiency degradation
        if (stressTest.efficiencyDegradation2050 > 0.20) {
            risk.efficiencyRiskLevel = "HIGH";
            risk.efficiencyRiskScore = 8;
            risk.efficiencyRiskReason = String.format(
                "Severe efficiency loss: %.0f%% degradation by 2050",
                stressTest.efficiencyDegradation2050 * 100
            );
        } else if (stressTest.efficiencyDegradation2050 > 0.10) {
            risk.efficiencyRiskLevel = "MODERATE";
            risk.efficiencyRiskScore = 5;
            risk.efficiencyRiskReason = String.format(
                "Moderate efficiency loss: %.0f%% degradation by 2050",
                stressTest.efficiencyDegradation2050 * 100
            );
        } else {
            risk.efficiencyRiskLevel = "LOW";
            risk.efficiencyRiskScore = 2;
            risk.efficiencyRiskReason = "Acceptable efficiency degradation";
        }
        
        // Risk Level 3: System compatibility
        if (!stressTest.isSystemCompatible) {
            risk.compatibilityRiskLevel = "CRITICAL";
            risk.compatibilityRiskScore = 10;
            risk.compatibilityRiskReason = stressTest.compatibilityReason;
        } else {
            risk.compatibilityRiskLevel = "LOW";
            risk.compatibilityRiskScore = 1;
            risk.compatibilityRiskReason = "Cooling system compatible with 2050 climate";
        }
        
        // Calculate overall risk score (0-30)
        risk.overallRiskScore = risk.thermalRiskScore + 
                               risk.efficiencyRiskScore + 
                               risk.compatibilityRiskScore;
        
        if (risk.overallRiskScore >= 20) {
            risk.overallRiskLevel = "CRITICAL";
            risk.overallRecommendation = "System redesign required - current design will not be viable by 2050";
        } else if (risk.overallRiskScore >= 12) {
            risk.overallRiskLevel = "HIGH";
            risk.overallRecommendation = "Plan for major upgrades by 2040 to maintain performance";
        } else if (risk.overallRiskScore >= 6) {
            risk.overallRiskLevel = "MODERATE";
            risk.overallRecommendation = "Monitor climate trends and plan for incremental improvements";
        } else {
            risk.overallRiskLevel = "LOW";
            risk.overallRecommendation = "System is resilient to projected climate change";
        }
        
        return risk;
    }
    
    /**
     * Calculate saturation vapor pressure limit
     * 
     * For every 1°C of warming, atmosphere's moisture capacity increases by ~7%
     */
    public double calculateSaturationVaporPressure(double temperatureC) {
        // Magnus formula: es = 6.112 * exp((17.67 * T) / (T + 243.5))
        return 6.112 * Math.exp((17.67 * temperatureC) / (temperatureC + 243.5));
    }
    
    /**
     * Check if evaporative cooling will be viable in 2050
     */
    public boolean isEvaporativeCoolingViable2050(double baseWetBulbC) {
        double future2050WetBulb = climateModel.calculateAdjustedWetBulb(
            baseWetBulbC, 
            scenario.getDesignAmbientC()
        );
        
        // Evaporative cooling becomes ineffective above 28°C wet-bulb
        return future2050WetBulb < 28.0;
    }
    
    /**
     * Print climate risk assessment
     */
    public void printAssessment(String coolingType) {
        System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  CLIMATE RISK & RESILIENCE ASSESSMENT                                 ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        ThermalStressTest stressTest = perform2050StressTest(coolingType);
        
        System.out.println("2050 THERMAL STRESS TEST:");
        System.out.printf("  Current Design Ambient: %.1f°C\n", stressTest.baseAmbientC);
        System.out.printf("  2050 Projected Ambient: %.1f°C (+%.1f°C)\n", 
            stressTest.future2050AmbientC, stressTest.warmingShiftC);
        System.out.printf("  2050 Projected Wet-Bulb: %.1f°C\n", stressTest.future2050WetBulbC);
        System.out.println();
        
        System.out.println("THERMAL PERFORMANCE PROJECTION:");
        System.out.printf("  Current Throttling Hours: %d/year\n", stressTest.currentThrottlingHours);
        System.out.printf("  2050 Throttling Hours: %d/year (%.1f%% increase)\n", 
            stressTest.future2050ThrottlingHours,
            ((stressTest.future2050ThrottlingHours - stressTest.currentThrottlingHours) * 100.0) / 
            Math.max(1, stressTest.currentThrottlingHours));
        
        if (stressTest.trainingTimeIncrease2050 > 0) {
            System.out.printf("  AI Training Time Increase: %.1f%%\n", stressTest.trainingTimeIncrease2050);
            System.out.printf("  Estimated Revenue Impact: $%.2f/year\n", stressTest.revenueImpactUSD);
        }
        
        if (stressTest.inferenceLatencyIncrease2050 > 0) {
            System.out.printf("  AI Inference Latency Increase: %.1f%%\n", stressTest.inferenceLatencyIncrease2050);
        }
        System.out.println();
        
        System.out.println("EFFICIENCY IMPACT:");
        System.out.printf("  Projected Efficiency Degradation: %.1f%%\n", 
            stressTest.efficiencyDegradation2050 * 100);
        System.out.println();
        
        System.out.println("SYSTEM COMPATIBILITY:");
        if (stressTest.isSystemCompatible) {
            System.out.println("  ✅ " + stressTest.compatibilityReason);
        } else {
            System.out.println("  ❌ " + stressTest.compatibilityReason);
            System.out.println("  → " + stressTest.compatibilityRecommendation);
        }
        System.out.println();
        
        OperationalRisk risk = assessOperationalRisk(stressTest);
        
        System.out.println("OPERATIONAL RISK ASSESSMENT:");
        System.out.printf("  Thermal Risk: %s (Score: %d/10)\n", 
            risk.thermalRiskLevel, risk.thermalRiskScore);
        System.out.printf("    %s\n", risk.thermalRiskReason);
        System.out.printf("  Efficiency Risk: %s (Score: %d/10)\n", 
            risk.efficiencyRiskLevel, risk.efficiencyRiskScore);
        System.out.printf("    %s\n", risk.efficiencyRiskReason);
        System.out.printf("  Compatibility Risk: %s (Score: %d/10)\n", 
            risk.compatibilityRiskLevel, risk.compatibilityRiskScore);
        System.out.printf("    %s\n", risk.compatibilityRiskReason);
        System.out.println();
        
        System.out.printf("  OVERALL RISK: %s (Score: %d/30)\n", 
            risk.overallRiskLevel, risk.overallRiskScore);
        System.out.printf("  RECOMMENDATION: %s\n", risk.overallRecommendation);
        System.out.println();
    }
    
    /**
     * Inner class for thermal stress test results
     */
    public static class ThermalStressTest {
        public double baseAmbientC;
        public double future2050AmbientC;
        public double future2050WetBulbC;
        public double warmingShiftC;
        public int currentThrottlingHours;
        public int future2050ThrottlingHours;
        public double trainingTimeIncrease2050;
        public double inferenceLatencyIncrease2050;
        public double efficiencyDegradation2050;
        public boolean isSystemCompatible;
        public String compatibilityReason;
        public String compatibilityRecommendation;
        public double revenueImpactUSD;
    }
    
    /**
     * Inner class for operational risk assessment
     */
    public static class OperationalRisk {
        public String thermalRiskLevel;
        public int thermalRiskScore;
        public String thermalRiskReason;
        
        public String efficiencyRiskLevel;
        public int efficiencyRiskScore;
        public String efficiencyRiskReason;
        
        public String compatibilityRiskLevel;
        public int compatibilityRiskScore;
        public String compatibilityRiskReason;
        
        public int overallRiskScore;
        public String overallRiskLevel;
        public String overallRecommendation;
    }
}
