package com.acme.chilledwatersystem;

/**
 * Phase 1 Part 2: Dynamic Workload Configuration
 * 
 * Defines workload "situations" that dictate power draw and duty cycle patterns.
 * Supports AI Training, AI Inference, and Enterprise workload profiles.
 */
public class WorkloadSituation {
    
    /**
     * Workload profile types with distinct characteristics
     */
    public enum Type {
        /**
         * AI Training: Sustained extreme compute intensity
         * - Load factor: 0.96 (96% sustained utilization)
         * - Power density: 50-100 kW/rack
         * - Duration: Weeks to months
         * - Behavior: Near-constant high load
         */
        AI_TRAINING,
        
        /**
         * AI Inference: Highly variable and bursty
         * - Load factor: 0.40-0.80 (variable)
         * - Power density: 20-40 kW/rack
         * - Duration: Milliseconds to seconds per request
         * - Behavior: Poisson-distributed arrivals, rapid fluctuations
         */
        AI_INFERENCE,
        
        /**
         * Enterprise: Traditional business workloads
         * - Load factor: 0.60 (60% average utilization)
         * - Power density: 5-15 kW/rack
         * - Duration: Continuous with diurnal patterns
         * - Behavior: Predictable daily/seasonal cycles
         */
        ENTERPRISE
    }
    
    // Workload characteristics
    private Type workloadType;
    private double loadFactor; // Average utilization (0.0 to 1.0)
    private double rackPowerDensityKW; // Power per rack (kW)
    private double burstinessFactor; // Variability (1.0 = steady, >1.0 = bursty)
    
    // Climate scenario
    private double climateWarmingShiftC; // Global warming adjustment (°C) e.g., +2.0 for 2050
    private double humidityIncreaseFactor; // Moisture capacity increase (7% per °C)
    
    // Economic scenario
    private double electricityInflationRate; // Annual electricity price increase (e.g., 0.05 = 5%)
    private double carbonTaxEscalationRate; // Annual carbon tax increase
    private double constructionInflationRate; // CAPEX inflation (e.g., 0.08 = 8% CAGR)
    
    // Simulation parameters
    private int targetYear; // Future year for projections (e.g., 2030, 2040, 2050)
    private String climateScenario; // IPCC scenario (e.g., "RCP4.5", "RCP8.5")
    
    /**
     * Default constructor with typical enterprise workload
     */
    public WorkloadSituation() {
        this.workloadType = Type.ENTERPRISE;
        this.loadFactor = 0.60;
        this.rackPowerDensityKW = 10.0;
        this.burstinessFactor = 1.2;
        this.climateWarmingShiftC = 0.0;
        this.humidityIncreaseFactor = 0.07; // 7% per °C
        this.electricityInflationRate = 0.03;
        this.carbonTaxEscalationRate = 0.05;
        this.constructionInflationRate = 0.08;
        this.targetYear = 2030;
        this.climateScenario = "Current";
    }
    
    /**
     * Create AI Training workload situation
     */
    public static WorkloadSituation createAITraining() {
        WorkloadSituation situation = new WorkloadSituation();
        situation.workloadType = Type.AI_TRAINING;
        situation.loadFactor = 0.96; // 96% sustained utilization
        situation.rackPowerDensityKW = 75.0; // 50-100 kW/rack typical
        situation.burstinessFactor = 1.05; // Very steady load
        return situation;
    }
    
    /**
     * Create AI Inference workload situation
     */
    public static WorkloadSituation createAIInference() {
        WorkloadSituation situation = new WorkloadSituation();
        situation.workloadType = Type.AI_INFERENCE;
        situation.loadFactor = 0.60; // Average 60%, but highly variable
        situation.rackPowerDensityKW = 30.0; // 20-40 kW/rack typical
        situation.burstinessFactor = 2.5; // Highly bursty (Poisson arrivals)
        return situation;
    }
    
    /**
     * Create Enterprise workload situation
     */
    public static WorkloadSituation createEnterprise() {
        WorkloadSituation situation = new WorkloadSituation();
        situation.workloadType = Type.ENTERPRISE;
        situation.loadFactor = 0.60;
        situation.rackPowerDensityKW = 10.0;
        situation.burstinessFactor = 1.2; // Moderate variability
        return situation;
    }
    
    /**
     * Apply climate scenario (e.g., IPCC RCP8.5 for 2050)
     */
    public void applyClimateScenario(String scenario, int year) {
        this.climateScenario = scenario;
        this.targetYear = year;
        
        int yearsFromNow = year - 2026;
        
        switch (scenario.toUpperCase()) {
            case "RCP2.6": // Low emissions
                this.climateWarmingShiftC = yearsFromNow * 0.04; // ~1°C by 2050
                break;
            case "RCP4.5": // Moderate emissions
                this.climateWarmingShiftC = yearsFromNow * 0.06; // ~1.5°C by 2050
                break;
            case "RCP8.5": // High emissions (business as usual)
                this.climateWarmingShiftC = yearsFromNow * 0.10; // ~2.5°C by 2050
                break;
            case "EXTREME": // Extreme heat event (e.g., London 2022, California 2022)
                this.climateWarmingShiftC = 5.0; // +5°C spike
                break;
            default:
                this.climateWarmingShiftC = 0.0;
        }
    }
    
    /**
     * Calculate effective load factor with burstiness
     * For CloudSim workload generation
     */
    public double getEffectiveLoadFactor(double hourOfDay) {
        double baseLoad = loadFactor;
        
        // Apply workload-specific patterns
        switch (workloadType) {
            case AI_TRAINING:
                // Sustained high load with minimal variation
                return baseLoad + (Math.random() - 0.5) * 0.04; // ±2% variation
                
            case AI_INFERENCE:
                // Bursty pattern following user activity
                // Peak during business hours, low at night
                double diurnalFactor = 0.5 + 0.5 * Math.sin((hourOfDay - 6) / 24.0 * 2 * Math.PI);
                double burstVariation = (Math.random() - 0.5) * 0.4 * burstinessFactor;
                return Math.max(0.2, Math.min(0.95, baseLoad * diurnalFactor + burstVariation));
                
            case ENTERPRISE:
                // Diurnal pattern with business hours peak
                double businessHoursFactor = (hourOfDay >= 8 && hourOfDay <= 18) ? 1.2 : 0.7;
                return Math.max(0.3, Math.min(0.85, baseLoad * businessHoursFactor));
                
            default:
                return baseLoad;
        }
    }
    
    /**
     * Check if workload is feasible with given cooling system
     */
    public FeasibilityCheck checkFeasibility(String coolingType, double maxRackPowerKW, 
                                            double ambientTempC, double wueLimit) {
        FeasibilityCheck check = new FeasibilityCheck();
        check.isFeasible = true;
        
        // Check 1: AI Training with air cooling
        if (workloadType == Type.AI_TRAINING && rackPowerDensityKW > 30.0 && 
            coolingType.equalsIgnoreCase("AIR")) {
            check.isFeasible = false;
            check.reason = "NOT FEASIBLE: Thermal Throttling - AI Training workload (" + 
                          String.format("%.0f", rackPowerDensityKW) + " kW/rack) exceeds air cooling limits (30 kW/rack)";
            check.recommendation = "Liquid cooling required for high-density AI workloads";
        }
        
        // Check 2: Extreme heat with evaporative cooling
        double effectiveAmbient = ambientTempC + climateWarmingShiftC;
        if (effectiveAmbient > 40.0 && coolingType.equalsIgnoreCase("EVAPORATIVE")) {
            check.isFeasible = false;
            check.reason = "NOT FEASIBLE: Humidity Ceiling - Ambient temperature (" + 
                          String.format("%.1f", effectiveAmbient) + "°C) exceeds evaporative cooling limits";
            check.recommendation = "Mechanical chiller required for extreme heat scenarios";
        }
        
        // Check 3: Water scarcity (WUE > 2.0 L/kWh)
        if (wueLimit > 2.0 && coolingType.contains("WATER")) {
            check.isFeasible = true; // Not a hard fail
            check.isRisk = true;
            check.reason = "RISK: High Regulatory Scrutiny - WUE (" + 
                          String.format("%.2f", wueLimit) + " L/kWh) may face restrictions in water-stressed regions";
            check.recommendation = "Consider air-cooled or hybrid systems for water-constrained sites";
        }
        
        return check;
    }
    
    // Getters and Setters
    public Type getWorkloadType() {
        return workloadType;
    }
    
    public void setWorkloadType(Type workloadType) {
        this.workloadType = workloadType;
    }
    
    public double getLoadFactor() {
        return loadFactor;
    }
    
    public void setLoadFactor(double loadFactor) {
        this.loadFactor = loadFactor;
    }
    
    public double getRackPowerDensityKW() {
        return rackPowerDensityKW;
    }
    
    public void setRackPowerDensityKW(double rackPowerDensityKW) {
        this.rackPowerDensityKW = rackPowerDensityKW;
    }
    
    public double getBurstinessFactor() {
        return burstinessFactor;
    }
    
    public void setBurstinessFactor(double burstinessFactor) {
        this.burstinessFactor = burstinessFactor;
    }
    
    public double getClimateWarmingShiftC() {
        return climateWarmingShiftC;
    }
    
    public void setClimateWarmingShiftC(double climateWarmingShiftC) {
        this.climateWarmingShiftC = climateWarmingShiftC;
    }
    
    public double getHumidityIncreaseFactor() {
        return humidityIncreaseFactor;
    }
    
    public void setHumidityIncreaseFactor(double humidityIncreaseFactor) {
        this.humidityIncreaseFactor = humidityIncreaseFactor;
    }
    
    public double getElectricityInflationRate() {
        return electricityInflationRate;
    }
    
    public void setElectricityInflationRate(double electricityInflationRate) {
        this.electricityInflationRate = electricityInflationRate;
    }
    
    public double getCarbonTaxEscalationRate() {
        return carbonTaxEscalationRate;
    }
    
    public void setCarbonTaxEscalationRate(double carbonTaxEscalationRate) {
        this.carbonTaxEscalationRate = carbonTaxEscalationRate;
    }
    
    public double getConstructionInflationRate() {
        return constructionInflationRate;
    }
    
    public void setConstructionInflationRate(double constructionInflationRate) {
        this.constructionInflationRate = constructionInflationRate;
    }
    
    public int getTargetYear() {
        return targetYear;
    }
    
    public void setTargetYear(int targetYear) {
        this.targetYear = targetYear;
    }
    
    public String getClimateScenario() {
        return climateScenario;
    }
    
    public void setClimateScenario(String climateScenario) {
        this.climateScenario = climateScenario;
    }
    
    @Override
    public String toString() {
        return String.format(
            "WorkloadSituation[Type=%s, LoadFactor=%.2f, RackPower=%.1f kW, Climate=%s+%.1f°C, Year=%d]",
            workloadType, loadFactor, rackPowerDensityKW, climateScenario, climateWarmingShiftC, targetYear
        );
    }
    
    /**
     * Inner class for feasibility check results
     */
    public static class FeasibilityCheck {
        public boolean isFeasible;
        public boolean isRisk;
        public String reason;
        public String recommendation;
        
        public FeasibilityCheck() {
            this.isFeasible = true;
            this.isRisk = false;
            this.reason = "System is feasible for this workload situation";
            this.recommendation = "";
        }
        
        @Override
        public String toString() {
            if (!isFeasible) {
                return "❌ " + reason + "\n   → " + recommendation;
            } else if (isRisk) {
                return "⚠️  " + reason + "\n   → " + recommendation;
            } else {
                return "✅ " + reason;
            }
        }
    }
}
