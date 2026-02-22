package com.acme.aireconcalc;

/**
 * Multi-year projection engine for Air Economizer system.
 * Handles energy cost escalation, carbon tax projections, and climate change impacts.
 */
public class ProjectionEngine {

    /**
     * Calculate multi-year financial and environmental projections
     */
    public static ProjectionResult calculateProjections(
            EconomizerInputs inputs,
            double annualEnergyKWh,
            double annualCO2Kg,
            double baselineAnnualEnergyKWh) {
        
        ProjectionResult result = new ProjectionResult();
        result.forecastYears = inputs.forecastYears;
        result.yearlyData = new YearlyData[inputs.forecastYears];
        
        double cumulativeEnergy = 0.0;
        double cumulativeEmissions = 0.0;
        double cumulativeCost = 0.0;
        double cumulativeCarbonTax = 0.0;
        double cumulativeSavings = 0.0;
        
        for (int year = 0; year < inputs.forecastYears; year++) {
            YearlyData yearData = new YearlyData();
            yearData.year = year + 1;
            
            // Energy escalation
            double energyCostMultiplier = Math.pow(1.0 + inputs.energyEscalationRate, year);
            double adjustedElectricityRate = inputs.elecTariff_per_kWh * energyCostMultiplier;
            
            // Climate change impact on cooling load
            // As temperature increases, economizer effectiveness decreases
            double temperatureOffset = inputs.climateChangeOffsetC * year;
            double coolingLoadMultiplier = 1.0 + (temperatureOffset * 0.03); // 3% increase per °C
            double adjustedAnnualEnergy = annualEnergyKWh * coolingLoadMultiplier;
            
            // Energy cost
            yearData.energyKWh = adjustedAnnualEnergy;
            yearData.energyCostUSD = adjustedAnnualEnergy * adjustedElectricityRate;
            
            // Carbon emissions
            yearData.emissionsTonsCO2 = (annualCO2Kg * coolingLoadMultiplier) / 1000.0;
            
            // Carbon tax (escalating)
            double carbonTaxMultiplier = Math.pow(1.0 + 0.15, year); // 15% annual carbon tax increase
            double adjustedCarbonTax = inputs.carbonTaxProjected * carbonTaxMultiplier;
            yearData.carbonTaxUSD = yearData.emissionsTonsCO2 * adjustedCarbonTax;
            
            // Total cost
            yearData.totalCostUSD = yearData.energyCostUSD + yearData.carbonTaxUSD;
            
            // Baseline comparison (mechanical-only cooling)
            double baselinePUE = 1.8;
            double baselineEnergy = baselineAnnualEnergyKWh * coolingLoadMultiplier;
            double baselineCost = baselineEnergy * adjustedElectricityRate;
            double baselineEmissions = (baselineEnergy * inputs.carbonIntensity_kg_per_kWh) / 1000.0;
            double baselineCarbonTax = baselineEmissions * adjustedCarbonTax;
            double baselineTotalCost = baselineCost + baselineCarbonTax;
            
            // Savings
            yearData.energySavingsKWh = baselineEnergy - adjustedAnnualEnergy;
            yearData.costSavingsUSD = baselineTotalCost - yearData.totalCostUSD;
            yearData.emissionsSavingsTonsCO2 = baselineEmissions - yearData.emissionsTonsCO2;
            
            // Cumulative tracking
            cumulativeEnergy += adjustedAnnualEnergy;
            cumulativeEmissions += yearData.emissionsTonsCO2;
            cumulativeCost += yearData.totalCostUSD;
            cumulativeCarbonTax += yearData.carbonTaxUSD;
            cumulativeSavings += yearData.costSavingsUSD;
            
            yearData.cumulativeEnergy = cumulativeEnergy;
            yearData.cumulativeEmissions = cumulativeEmissions;
            yearData.cumulativeCost = cumulativeCost;
            yearData.cumulativeSavings = cumulativeSavings;
            
            // Climate impact metrics
            yearData.temperatureOffsetC = temperatureOffset;
            yearData.coolingLoadIncrease = (coolingLoadMultiplier - 1.0) * 100.0; // percentage
            
            result.yearlyData[year] = yearData;
        }
        
        // Summary metrics
        result.totalEnergy = cumulativeEnergy;
        result.totalEmissions = cumulativeEmissions;
        result.totalCost = cumulativeCost;
        result.totalCarbonTax = cumulativeCarbonTax;
        result.totalSavings = cumulativeSavings;
        
        // NPV calculation (Net Present Value)
        double discountRate = 0.08; // 8% discount rate
        result.npvSavings = calculateNPV(result.yearlyData, discountRate);
        
        // Adjusted payback period considering escalation
        result.adjustedPaybackYears = calculateAdjustedPayback(
            inputs.capexEconomizerUSD, 
            result.yearlyData
        );
        
        return result;
    }
    
    /**
     * Calculate Net Present Value of savings
     */
    private static double calculateNPV(YearlyData[] yearlyData, double discountRate) {
        double npv = 0.0;
        for (int i = 0; i < yearlyData.length; i++) {
            double discountFactor = Math.pow(1.0 + discountRate, -(i + 1));
            npv += yearlyData[i].costSavingsUSD * discountFactor;
        }
        return npv;
    }
    
    /**
     * Calculate adjusted payback period considering escalating savings
     */
    private static double calculateAdjustedPayback(double capex, YearlyData[] yearlyData) {
        double cumulativeSavings = 0.0;
        
        for (int i = 0; i < yearlyData.length; i++) {
            cumulativeSavings += yearlyData[i].costSavingsUSD;
            
            if (cumulativeSavings >= capex) {
                // Interpolate within the year
                double previousCumulative = cumulativeSavings - yearlyData[i].costSavingsUSD;
                double remainingCapex = capex - previousCumulative;
                double fractionOfYear = remainingCapex / yearlyData[i].costSavingsUSD;
                return (i + fractionOfYear);
            }
        }
        
        // Payback exceeds forecast period
        return 999.0;
    }
    
    /**
     * Generate climate change scenario analysis
     */
    public static ClimateScenario[] generateClimateScenarios(
            EconomizerInputs inputs,
            double annualEnergyKWh,
            double annualCO2Kg,
            double baselineAnnualEnergyKWh) {
        
        ClimateScenario[] scenarios = new ClimateScenario[3];
        
        // Conservative scenario: +0.5°C over forecast period
        scenarios[0] = new ClimateScenario();
        scenarios[0].name = "Conservative (Low Climate Impact)";
        scenarios[0].temperatureIncrease = 0.5;
        scenarios[0].climateChangeOffsetC = 0.5 / inputs.forecastYears;
        
        // Moderate scenario: +1.5°C over forecast period
        scenarios[1] = new ClimateScenario();
        scenarios[1].name = "Moderate (Medium Climate Impact)";
        scenarios[1].temperatureIncrease = 1.5;
        scenarios[1].climateChangeOffsetC = 1.5 / inputs.forecastYears;
        
        // Aggressive scenario: +3.0°C over forecast period
        scenarios[2] = new ClimateScenario();
        scenarios[2].name = "Aggressive (High Climate Impact)";
        scenarios[2].temperatureIncrease = 3.0;
        scenarios[2].climateChangeOffsetC = 3.0 / inputs.forecastYears;
        
        // Calculate projections for each scenario
        for (ClimateScenario scenario : scenarios) {
            EconomizerInputs scenarioInputs = copyInputs(inputs);
            scenarioInputs.climateChangeOffsetC = scenario.climateChangeOffsetC;
            
            scenario.projection = calculateProjections(
                scenarioInputs,
                annualEnergyKWh,
                annualCO2Kg,
                baselineAnnualEnergyKWh
            );
        }
        
        return scenarios;
    }
    
    /**
     * Helper to copy inputs
     */
    private static EconomizerInputs copyInputs(EconomizerInputs original) {
        EconomizerInputs copy = new EconomizerInputs();
        copy.forecastYears = original.forecastYears;
        copy.energyEscalationRate = original.energyEscalationRate;
        copy.carbonTaxProjected = original.carbonTaxProjected;
        copy.climateChangeOffsetC = original.climateChangeOffsetC;
        copy.elecTariff_per_kWh = original.elecTariff_per_kWh;
        copy.carbonIntensity_kg_per_kWh = original.carbonIntensity_kg_per_kWh;
        copy.capexEconomizerUSD = original.capexEconomizerUSD;
        return copy;
    }
    
    // ========================================================================
    // DATA STRUCTURES
    // ========================================================================
    
    public static class ProjectionResult {
        public int forecastYears;
        public YearlyData[] yearlyData;
        
        // Summary metrics
        public double totalEnergy;
        public double totalEmissions;
        public double totalCost;
        public double totalCarbonTax;
        public double totalSavings;
        public double npvSavings;
        public double adjustedPaybackYears;
    }
    
    public static class YearlyData {
        public int year;
        
        // Energy
        public double energyKWh;
        public double energyCostUSD;
        public double energySavingsKWh;
        
        // Emissions
        public double emissionsTonsCO2;
        public double emissionsSavingsTonsCO2;
        
        // Costs
        public double carbonTaxUSD;
        public double totalCostUSD;
        public double costSavingsUSD;
        
        // Cumulative
        public double cumulativeEnergy;
        public double cumulativeEmissions;
        public double cumulativeCost;
        public double cumulativeSavings;
        
        // Climate impact
        public double temperatureOffsetC;
        public double coolingLoadIncrease; // percentage
    }
    
    public static class ClimateScenario {
        public String name;
        public double temperatureIncrease; // Total increase over forecast period
        public double climateChangeOffsetC; // Annual increase
        public ProjectionResult projection;
    }
}
