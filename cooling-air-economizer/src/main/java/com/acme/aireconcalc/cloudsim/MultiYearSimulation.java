package com.acme.aireconcalc.cloudsim;

import com.acme.aireconcalc.WeatherData;
import com.acme.aireconcalc.ProjectionEngine;
import java.util.List;
import java.util.ArrayList;

/**
 * Multi-Year Simulation Orchestrator
 * 
 * Coordinates multi-year scenario modeling (2025-2030) with:
 * - Energy cost escalation
 * - Carbon tax escalation
 * - Grid decarbonization
 * - Climate change impact
 * - AI workload growth
 * 
 * This class bridges CloudSim's thermal simulation with the existing
 * ProjectionEngine for comprehensive financial and environmental analysis.
 */
public class MultiYearSimulation {
    
    /**
     * Scenario types for multi-year analysis
     */
    public enum ScenarioType {
        BASELINE,           // Current conditions maintained
        AI_GROWTH,          // AI workload growth (20% annual)
        CLIMATE_CHANGE,     // Temperature increase (+1.5°C over 5 years)
        GRID_DECARBONIZATION, // Grid carbon intensity reduction (50% over 5 years)
        COMBINED            // All factors combined
    }
    
    /**
     * Run multi-year scenario analysis
     * 
     * @param baselineResults Results from initial CloudSim simulation
     * @param weatherData Weather data for simulation
     * @param forecastYears Number of years to project (e.g., 5)
     * @param scenarioType Type of scenario to model
     * @return MultiYearResults object
     */
    public static MultiYearResults runScenario(
            SustainabilityDatacenter.FacilitySummary baselineResults,
            List<WeatherData> weatherData,
            int forecastYears,
            ScenarioType scenarioType) {
        
        MultiYearResults results = new MultiYearResults();
        results.scenarioType = scenarioType;
        results.forecastYears = forecastYears;
        results.yearlyResults = new YearlyResults[forecastYears];
        
        // Base parameters
        double baselineEnergyKWh = baselineResults.totalEnergyKWh;
        double baselineCarbonKg = baselineResults.totalCarbonKg;
        double baselineWaterLiters = baselineResults.totalWaterLiters;
        
        // Scenario-specific parameters
        double aiGrowthRate = getAIGrowthRate(scenarioType);
        double climateChangeRate = getClimateChangeRate(scenarioType);
        double gridDecarbRate = getGridDecarbonizationRate(scenarioType);
        
        // Financial parameters
        double electricityTariff = 0.12;        // $0.12/kWh
        double energyEscalationRate = 0.03;     // 3% annual
        double carbonTaxBase = 50.0;            // $50/ton in 2025
        double carbonTaxEscalationRate = 0.15;  // 15% annual
        double gridCarbonIntensity = 0.45;      // 450g CO2/kWh
        
        // Cumulative tracking
        double cumulativeEnergy = 0.0;
        double cumulativeCarbon = 0.0;
        double cumulativeCost = 0.0;
        double cumulativeWater = 0.0;
        
        // Simulate each year
        for (int year = 0; year < forecastYears; year++) {
            YearlyResults yearResults = new YearlyResults();
            yearResults.year = 2025 + year;
            
            // Apply AI workload growth
            double workloadMultiplier = Math.pow(1.0 + aiGrowthRate, year);
            
            // Apply climate change impact on cooling load
            // Higher temperatures → less effective free cooling → higher energy
            double temperatureOffset = climateChangeRate * year;
            double coolingLoadMultiplier = 1.0 + (temperatureOffset * 0.03); // 3% per °C
            
            // Combined multiplier
            double energyMultiplier = workloadMultiplier * coolingLoadMultiplier;
            
            // Calculate adjusted energy consumption
            yearResults.energyKWh = baselineEnergyKWh * energyMultiplier;
            
            // Apply grid decarbonization
            double adjustedCarbonIntensity = gridCarbonIntensity * Math.pow(1.0 - gridDecarbRate, year);
            yearResults.carbonIntensityKgPerKWh = adjustedCarbonIntensity;
            yearResults.carbonKg = yearResults.energyKWh * adjustedCarbonIntensity;
            yearResults.carbonTons = yearResults.carbonKg / 1000.0;
            
            // Calculate water consumption (scales with workload)
            yearResults.waterLiters = baselineWaterLiters * workloadMultiplier;
            
            // Calculate costs with escalation
            double adjustedElectricityTariff = electricityTariff * Math.pow(1.0 + energyEscalationRate, year);
            double adjustedCarbonTax = carbonTaxBase * Math.pow(1.0 + carbonTaxEscalationRate, year);
            
            yearResults.electricityTariff = adjustedElectricityTariff;
            yearResults.carbonTaxRate = adjustedCarbonTax;
            
            yearResults.energyCost = yearResults.energyKWh * adjustedElectricityTariff;
            yearResults.carbonTaxCost = yearResults.carbonTons * adjustedCarbonTax;
            yearResults.totalCost = yearResults.energyCost + yearResults.carbonTaxCost;
            
            // Calculate baseline (mechanical-only) for comparison
            double baselinePUE = 1.8;
            double currentPUE = baselineResults.averagePUE;
            double baselineEnergy = yearResults.energyKWh * (baselinePUE / currentPUE);
            double baselineCost = baselineEnergy * adjustedElectricityTariff;
            double baselineCarbon = baselineEnergy * adjustedCarbonIntensity;
            double baselineCarbonTax = (baselineCarbon / 1000.0) * adjustedCarbonTax;
            
            yearResults.energySavingsKWh = baselineEnergy - yearResults.energyKWh;
            yearResults.costSavings = (baselineCost + baselineCarbonTax) - yearResults.totalCost;
            yearResults.carbonSavingsKg = baselineCarbon - yearResults.carbonKg;
            
            // Climate impact metrics
            yearResults.temperatureOffsetC = temperatureOffset;
            yearResults.coolingLoadIncrease = (coolingLoadMultiplier - 1.0) * 100.0;
            yearResults.workloadGrowth = (workloadMultiplier - 1.0) * 100.0;
            
            // Cumulative tracking
            cumulativeEnergy += yearResults.energyKWh;
            cumulativeCarbon += yearResults.carbonKg;
            cumulativeCost += yearResults.totalCost;
            cumulativeWater += yearResults.waterLiters;
            
            yearResults.cumulativeEnergy = cumulativeEnergy;
            yearResults.cumulativeCarbon = cumulativeCarbon;
            yearResults.cumulativeCost = cumulativeCost;
            yearResults.cumulativeWater = cumulativeWater;
            
            results.yearlyResults[year] = yearResults;
        }
        
        // Calculate summary metrics
        results.totalEnergy = cumulativeEnergy;
        results.totalCarbon = cumulativeCarbon;
        results.totalCost = cumulativeCost;
        results.totalWater = cumulativeWater;
        
        // Calculate NPV of savings
        results.npvSavings = calculateNPV(results.yearlyResults, 0.08); // 8% discount rate
        
        // Calculate adjusted payback
        results.paybackYears = calculatePayback(results.yearlyResults, 25000.0); // Assume $25k CAPEX
        
        return results;
    }
    
    /**
     * Get AI workload growth rate for scenario
     */
    private static double getAIGrowthRate(ScenarioType scenario) {
        switch (scenario) {
            case AI_GROWTH:
            case COMBINED:
                return 0.20; // 20% annual growth
            default:
                return 0.0;
        }
    }
    
    /**
     * Get climate change temperature increase rate (°C per year)
     */
    private static double getClimateChangeRate(ScenarioType scenario) {
        switch (scenario) {
            case CLIMATE_CHANGE:
                return 0.3; // +1.5°C over 5 years
            case COMBINED:
                return 0.3;
            default:
                return 0.0;
        }
    }
    
    /**
     * Get grid decarbonization rate (annual reduction)
     */
    private static double getGridDecarbonizationRate(ScenarioType scenario) {
        switch (scenario) {
            case GRID_DECARBONIZATION:
            case COMBINED:
                return 0.10; // 10% annual reduction (50% over 5 years)
            default:
                return 0.02; // 2% baseline reduction
        }
    }
    
    /**
     * Calculate Net Present Value of savings
     */
    private static double calculateNPV(YearlyResults[] yearlyResults, double discountRate) {
        double npv = 0.0;
        for (int i = 0; i < yearlyResults.length; i++) {
            double discountFactor = Math.pow(1.0 + discountRate, -(i + 1));
            npv += yearlyResults[i].costSavings * discountFactor;
        }
        return npv;
    }
    
    /**
     * Calculate payback period
     */
    private static double calculatePayback(YearlyResults[] yearlyResults, double capex) {
        double cumulativeSavings = 0.0;
        
        for (int i = 0; i < yearlyResults.length; i++) {
            cumulativeSavings += yearlyResults[i].costSavings;
            
            if (cumulativeSavings >= capex) {
                double previousCumulative = cumulativeSavings - yearlyResults[i].costSavings;
                double remainingCapex = capex - previousCumulative;
                double fractionOfYear = remainingCapex / yearlyResults[i].costSavings;
                return (i + fractionOfYear);
            }
        }
        
        return 999.0; // Payback exceeds forecast period
    }
    
    /**
     * Generate comparison report across multiple scenarios
     */
    public static ScenarioComparison compareScenarios(
            SustainabilityDatacenter.FacilitySummary baselineResults,
            List<WeatherData> weatherData,
            int forecastYears) {
        
        ScenarioComparison comparison = new ScenarioComparison();
        
        // Run all scenarios
        comparison.baseline = runScenario(baselineResults, weatherData, forecastYears, ScenarioType.BASELINE);
        comparison.aiGrowth = runScenario(baselineResults, weatherData, forecastYears, ScenarioType.AI_GROWTH);
        comparison.climateChange = runScenario(baselineResults, weatherData, forecastYears, ScenarioType.CLIMATE_CHANGE);
        comparison.gridDecarbonization = runScenario(baselineResults, weatherData, forecastYears, ScenarioType.GRID_DECARBONIZATION);
        comparison.combined = runScenario(baselineResults, weatherData, forecastYears, ScenarioType.COMBINED);
        
        return comparison;
    }
    
    // Data structures
    
    /**
     * Multi-year simulation results
     */
    public static class MultiYearResults {
        public ScenarioType scenarioType;
        public int forecastYears;
        public YearlyResults[] yearlyResults;
        
        // Summary metrics
        public double totalEnergy;
        public double totalCarbon;
        public double totalCost;
        public double totalWater;
        public double npvSavings;
        public double paybackYears;
    }
    
    /**
     * Results for a single year
     */
    public static class YearlyResults {
        public int year;
        
        // Energy
        public double energyKWh;
        public double energyCost;
        public double energySavingsKWh;
        public double electricityTariff;
        
        // Carbon
        public double carbonKg;
        public double carbonTons;
        public double carbonIntensityKgPerKWh;
        public double carbonTaxCost;
        public double carbonTaxRate;
        public double carbonSavingsKg;
        
        // Water
        public double waterLiters;
        
        // Costs
        public double totalCost;
        public double costSavings;
        
        // Cumulative
        public double cumulativeEnergy;
        public double cumulativeCarbon;
        public double cumulativeCost;
        public double cumulativeWater;
        
        // Impact factors
        public double temperatureOffsetC;
        public double coolingLoadIncrease;
        public double workloadGrowth;
    }
    
    /**
     * Comparison across multiple scenarios
     */
    public static class ScenarioComparison {
        public MultiYearResults baseline;
        public MultiYearResults aiGrowth;
        public MultiYearResults climateChange;
        public MultiYearResults gridDecarbonization;
        public MultiYearResults combined;
    }
}
