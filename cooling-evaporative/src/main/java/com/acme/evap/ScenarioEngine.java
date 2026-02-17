package com.acme.evap;

/**
 * Scenario Engine - Backend-driven scenario modeling
 * Handles baseline, AI growth, carbon pressure, and climate change scenarios
 */
public class ScenarioEngine {
    
    public enum ScenarioType {
        BASELINE,           // Current state projection
        AI_GROWTH,          // AI/ML workload expansion
        CARBON_PRESSURE,    // Carbon tax & regulations
        CLIMATE_CHANGE,     // Temperature offset scenarios
        COMBINED            // Multiple factors combined
    }
    
    public static class ScenarioConfig {
        public ScenarioType type;
        public int startYear = 2025;
        public int endYear = 2030;
        public int projectionYears = 5;
        
        // AI Growth parameters
        public double aiWorkloadGrowthRate = 0.25; // 25% annual growth
        public double aiRackDensityMultiplier = 1.5; // 50% higher density
        public boolean enableAITrainingProfile = false;
        public boolean enableAIInferenceProfile = false;
        
        // Carbon Pressure parameters
        public double carbonTaxStartUSD = 50.0; // $/ton CO2
        public double carbonTaxGrowthRate = 0.15; // 15% annual increase
        public double gridDecarbonizationRate = 0.05; // 5% annual reduction in grid emissions
        
        // Climate Change parameters
        public double temperatureOffsetC = 2.0; // +2°C by 2030
        public double humidityChangePercent = 5.0; // +5% RH
        public boolean enableExtremeWeatherEvents = false;
        
        // Economic parameters
        public double electricityInflationRate = 0.03; // 3% annual
        public double waterInflationRate = 0.04; // 4% annual
        public double discountRate = 0.08; // 8% for NPV calculations
        
        public ScenarioConfig(ScenarioType type) {
            this.type = type;
        }
    }
    
    public static class ScenarioResult {
        public int year;
        public double itLoadMultiplier;
        public double rackDensityMultiplier;
        public double temperatureOffsetC;
        public double humidityOffsetPercent;
        public double electricityRateMultiplier;
        public double waterRateMultiplier;
        public double carbonTaxUSD;
        public double gridEmissionsFactorKgCO2;
        public String utilizationProfile; // "baseline", "ai_training", "ai_inference", "mixed"
    }
    
    /**
     * Generate scenario parameters for each year in projection
     */
    public static ScenarioResult[] generateScenario(ScenarioConfig config) {
        ScenarioResult[] results = new ScenarioResult[config.projectionYears];
        
        for (int i = 0; i < config.projectionYears; i++) {
            int year = config.startYear + i;
            double yearOffset = i; // Years from start
            
            ScenarioResult result = new ScenarioResult();
            result.year = year;
            
            // Initialize with baseline values
            result.itLoadMultiplier = 1.0;
            result.rackDensityMultiplier = 1.0;
            result.temperatureOffsetC = 0.0;
            result.humidityOffsetPercent = 0.0;
            result.electricityRateMultiplier = 1.0;
            result.waterRateMultiplier = 1.0;
            result.carbonTaxUSD = 0.0;
            result.gridEmissionsFactorKgCO2 = 0.45; // US average baseline
            result.utilizationProfile = "baseline";
            
            // Apply scenario-specific modifications
            switch (config.type) {
                case BASELINE:
                    applyBaselineScenario(result, config, yearOffset);
                    break;
                    
                case AI_GROWTH:
                    applyAIGrowthScenario(result, config, yearOffset);
                    break;
                    
                case CARBON_PRESSURE:
                    applyCarbonPressureScenario(result, config, yearOffset);
                    break;
                    
                case CLIMATE_CHANGE:
                    applyClimateChangeScenario(result, config, yearOffset);
                    break;
                    
                case COMBINED:
                    applyBaselineScenario(result, config, yearOffset);
                    applyAIGrowthScenario(result, config, yearOffset);
                    applyCarbonPressureScenario(result, config, yearOffset);
                    applyClimateChangeScenario(result, config, yearOffset);
                    break;
            }
            
            results[i] = result;
        }
        
        return results;
    }
    
    private static void applyBaselineScenario(ScenarioResult result, ScenarioConfig config, double yearOffset) {
        // Modest growth in baseline scenario
        result.itLoadMultiplier = Math.pow(1.05, yearOffset); // 5% annual growth
        result.electricityRateMultiplier = Math.pow(1.0 + config.electricityInflationRate, yearOffset);
        result.waterRateMultiplier = Math.pow(1.0 + config.waterInflationRate, yearOffset);
    }
    
    private static void applyAIGrowthScenario(ScenarioResult result, ScenarioConfig config, double yearOffset) {
        // Aggressive IT load growth due to AI/ML workloads
        result.itLoadMultiplier *= Math.pow(1.0 + config.aiWorkloadGrowthRate, yearOffset);
        result.rackDensityMultiplier *= Math.pow(config.aiRackDensityMultiplier, Math.min(yearOffset / 5.0, 1.0));
        
        // Determine utilization profile based on year
        if (config.enableAITrainingProfile && yearOffset < 2) {
            result.utilizationProfile = "ai_training"; // Early years: training-heavy
        } else if (config.enableAIInferenceProfile && yearOffset >= 2) {
            result.utilizationProfile = "ai_inference"; // Later years: inference-heavy
        } else {
            result.utilizationProfile = "mixed"; // Mixed workload
        }
    }
    
    private static void applyCarbonPressureScenario(ScenarioResult result, ScenarioConfig config, double yearOffset) {
        // Carbon tax escalation
        result.carbonTaxUSD = config.carbonTaxStartUSD * Math.pow(1.0 + config.carbonTaxGrowthRate, yearOffset);
        
        // Grid decarbonization (emissions factor reduction)
        result.gridEmissionsFactorKgCO2 *= Math.pow(1.0 - config.gridDecarbonizationRate, yearOffset);
        result.gridEmissionsFactorKgCO2 = Math.max(0.1, result.gridEmissionsFactorKgCO2); // Floor at 0.1
    }
    
    private static void applyClimateChangeScenario(ScenarioResult result, ScenarioConfig config, double yearOffset) {
        // Linear temperature increase
        result.temperatureOffsetC = config.temperatureOffsetC * (yearOffset / config.projectionYears);
        
        // Humidity increase (non-linear, accelerating)
        result.humidityOffsetPercent = config.humidityChangePercent * Math.pow(yearOffset / config.projectionYears, 1.5);
    }
    
    /**
     * Calculate Net Present Value (NPV) for multi-year OPEX
     */
    public static double calculateNPV(double[] annualCosts, double discountRate) {
        double npv = 0.0;
        for (int year = 0; year < annualCosts.length; year++) {
            npv += annualCosts[year] / Math.pow(1.0 + discountRate, year);
        }
        return npv;
    }
    
    /**
     * Calculate Total Cost of Ownership (TCO) over projection period
     */
    public static class TCOResult {
        public double totalElectricityCost;
        public double totalWaterCost;
        public double totalCarbonCost;
        public double totalOPEX;
        public double npvOPEX;
        public double[] annualCosts;
    }
    
    public static TCOResult calculateTCO(ScenarioResult[] scenarios, 
                                        double baseElectricityRate,
                                        double baseWaterRate,
                                        double annualElectricityKWh,
                                        double annualWaterLiters) {
        TCOResult tco = new TCOResult();
        tco.annualCosts = new double[scenarios.length];
        
        for (int i = 0; i < scenarios.length; i++) {
            ScenarioResult scenario = scenarios[i];
            
            // Calculate annual costs with escalation
            double electricityCost = annualElectricityKWh * scenario.itLoadMultiplier * 
                                    baseElectricityRate * scenario.electricityRateMultiplier;
            
            double waterCost = (annualWaterLiters / 1000.0) * 
                              baseWaterRate * scenario.waterRateMultiplier;
            
            double carbonCost = (annualElectricityKWh * scenario.itLoadMultiplier * 
                                scenario.gridEmissionsFactorKgCO2 / 1000.0) * // Convert to tons
                                scenario.carbonTaxUSD;
            
            double annualTotal = electricityCost + waterCost + carbonCost;
            
            tco.totalElectricityCost += electricityCost;
            tco.totalWaterCost += waterCost;
            tco.totalCarbonCost += carbonCost;
            tco.totalOPEX += annualTotal;
            tco.annualCosts[i] = annualTotal;
        }
        
        // Calculate NPV
        tco.npvOPEX = calculateNPV(tco.annualCosts, scenarios[0].year == 2025 ? 0.08 : 0.08);
        
        return tco;
    }
    
    /**
     * Validate cooling feasibility under scenario conditions
     */
    public static class FeasibilityCheck {
        public boolean coolingAdequate;
        public boolean temperatureCompliant;
        public boolean humidityFeasible;
        public String[] warnings;
        public String[] recommendations;
    }
    
    public static FeasibilityCheck checkCoolingFeasibility(ScenarioResult scenario,
                                                          double baseAmbientTempC,
                                                          double baseHumidityPercent,
                                                          double coolingCapacityKW,
                                                          double itLoadKW) {
        FeasibilityCheck check = new FeasibilityCheck();
        java.util.List<String> warnings = new java.util.ArrayList<>();
        java.util.List<String> recommendations = new java.util.ArrayList<>();
        
        // Adjusted ambient conditions
        double adjustedTempC = baseAmbientTempC + scenario.temperatureOffsetC;
        double adjustedHumidityPercent = baseHumidityPercent + scenario.humidityOffsetPercent;
        
        // Adjusted IT load
        double adjustedITLoadKW = itLoadKW * scenario.itLoadMultiplier * scenario.rackDensityMultiplier;
        
        // Check 1: Cooling capacity vs heat load
        check.coolingAdequate = coolingCapacityKW >= adjustedITLoadKW;
        if (!check.coolingAdequate) {
            double deficit = ((adjustedITLoadKW - coolingCapacityKW) / adjustedITLoadKW) * 100;
            warnings.add(String.format("Cooling capacity deficit of %.1f%% in year %d", deficit, scenario.year));
            recommendations.add("Increase evaporative cooling capacity or add DX backup");
        }
        
        // Check 2: Temperature compliance
        check.temperatureCompliant = adjustedTempC <= 40.0; // Practical limit for evap cooling
        if (!check.temperatureCompliant) {
            warnings.add(String.format("Ambient temperature (%.1f°C) exceeds evaporative cooling limits", adjustedTempC));
            recommendations.add("Consider hybrid cooling with mechanical backup");
        }
        
        // Check 3: Humidity feasibility
        check.humidityFeasible = adjustedHumidityPercent <= 85.0;
        if (!check.humidityFeasible) {
            warnings.add(String.format("High humidity (%.1f%%) reduces evaporative effectiveness", adjustedHumidityPercent));
            recommendations.add("Switch to indirect evaporative cooling (IEC) or add dehumidification");
        }
        
        // Additional warnings for AI workloads
        if (scenario.utilizationProfile.contains("ai") && scenario.rackDensityMultiplier > 1.3) {
            warnings.add("High-density AI racks may require enhanced airflow distribution");
            recommendations.add("Implement hot aisle containment and increase cold aisle airflow");
        }
        
        check.warnings = warnings.toArray(new String[0]);
        check.recommendations = recommendations.toArray(new String[0]);
        
        return check;
    }
}
