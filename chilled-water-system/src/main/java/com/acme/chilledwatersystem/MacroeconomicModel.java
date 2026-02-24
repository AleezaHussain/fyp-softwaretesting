package com.acme.chilledwatersystem;

/**
 * Phase 1 Part 2: Macroeconomic & Inflationary Modeling
 * 
 * Provides real-world accuracy by accounting for resource volatility,
 * carbon tax projections, and construction inflation.
 */
public class MacroeconomicModel {
    
    private final WorkloadSituation situation;
    private final int baseYear;
    
    // Regional electricity demand growth projections
    private static final double US_DATACENTER_DEMAND_GROWTH = 0.15; // 15-20% by 2030
    
    // Carbon tax projections (Low-Carbon Economy scenario)
    private static final double CARBON_TAX_2030_USD = 254.0; // $/ton CO2
    private static final double CARBON_TAX_2050_USD = 800.0; // $/ton CO2
    private static final double CARBON_TAX_ANNUAL_GROWTH = 27.3; // $/ton per year
    
    public MacroeconomicModel(WorkloadSituation situation) {
        this.situation = situation;
        this.baseYear = 2026; // Current year
    }
    
    /**
     * Calculate future electricity rate with regional inflation
     * 
     * U.S. data center demand projected to increase bills by 15-20% by 2030
     */
    public double calculateFutureElectricityRate(double baseRateUsdKwh, int targetYear) {
        int yearsFromBase = targetYear - baseYear;
        
        // Compound annual growth
        double inflationRate = situation.getElectricityInflationRate();
        
        // Additional demand-driven increase for data centers
        double demandMultiplier = 1.0 + (US_DATACENTER_DEMAND_GROWTH * (yearsFromBase / 4.0));
        
        double futureRate = baseRateUsdKwh * Math.pow(1 + inflationRate, yearsFromBase) * demandMultiplier;
        
        return futureRate;
    }
    
    /**
     * Calculate carbon tax for a given year
     * 
     * Low-Carbon Economy (LCE) scenario:
     * - 2030: $254/ton
     * - 2050: $800/ton
     * - Linear growth: $27.3/ton per year
     */
    public double calculateCarbonTaxPerTon(int targetYear) {
        if (targetYear <= 2030) {
            // Linear interpolation from current to 2030
            int yearsTo2030 = targetYear - baseYear;
            double currentTax = 50.0; // Current average
            return currentTax + (CARBON_TAX_2030_USD - currentTax) * (yearsTo2030 / 4.0);
        } else if (targetYear <= 2050) {
            // Linear growth from 2030 to 2050
            int yearsFrom2030 = targetYear - 2030;
            return CARBON_TAX_2030_USD + (CARBON_TAX_ANNUAL_GROWTH * yearsFrom2030);
        } else {
            // Beyond 2050, continue linear growth
            int yearsFrom2030 = targetYear - 2030;
            return CARBON_TAX_2030_USD + (CARBON_TAX_ANNUAL_GROWTH * yearsFrom2030);
        }
    }
    
    /**
     * Calculate total carbon cost including tax liability
     */
    public double calculateCarbonCost(double totalEnergyKWh, double carbonFactorKgKwh, int targetYear) {
        // Total carbon produced (metric tons)
        double carbonTons = (totalEnergyKWh * carbonFactorKgKwh) / 1000.0;
        
        // Carbon tax for target year
        double taxPerTon = calculateCarbonTaxPerTon(targetYear);
        
        // Total carbon cost
        return carbonTons * taxPerTon;
    }
    
    /**
     * Calculate future CAPEX with construction inflation
     * 
     * AI-ready infrastructure faces 8% CAGR due to:
     * - Limited contractor pools
     * - Workforce dynamics
     * - Technical complexity
     */
    public double calculateFutureCAPEX(double baseCAPEX, int targetYear) {
        int yearsFromBase = targetYear - baseYear;
        
        double inflationRate = situation.getConstructionInflationRate();
        
        // Additional premium for AI-ready infrastructure
        double aiPremium = 1.0;
        if (situation.getWorkloadType() == WorkloadSituation.Type.AI_TRAINING) {
            aiPremium = 1.15; // 15% premium for high-density AI infrastructure
        }
        
        double futureCAPEX = baseCAPEX * Math.pow(1 + inflationRate, yearsFromBase) * aiPremium;
        
        return futureCAPEX;
    }
    
    /**
     * Calculate future water cost with escalation
     */
    public double calculateFutureWaterCost(double baseWaterCostPerM3, int targetYear) {
        int yearsFromBase = targetYear - baseYear;
        
        // Water costs typically escalate at 2-3% annually
        double waterInflationRate = 0.025;
        
        // Additional scarcity premium in water-stressed regions
        double scarcityPremium = 1.0;
        if (situation.getClimateWarmingShiftC() > 2.0) {
            scarcityPremium = 1.3; // 30% premium in severe drought scenarios
        }
        
        return baseWaterCostPerM3 * Math.pow(1 + waterInflationRate, yearsFromBase) * scarcityPremium;
    }
    
    /**
     * Calculate Net Present Value with macroeconomic adjustments
     */
    public double calculateAdjustedNPV(double annualSavings, double differentialCAPEX, 
                                      int analysisHorizon, double discountRate) {
        double npv = -differentialCAPEX;
        
        for (int year = 1; year <= analysisHorizon; year++) {
            int targetYear = baseYear + year;
            
            // Escalate savings with electricity inflation
            double escalationRate = situation.getElectricityInflationRate();
            double escalatedSavings = annualSavings * Math.pow(1 + escalationRate, year);
            
            // Discount to present value
            double presentValue = escalatedSavings / Math.pow(1 + discountRate, year);
            
            npv += presentValue;
        }
        
        return npv;
    }
    
    /**
     * Calculate payback period with inflation
     */
    public double calculateInflationAdjustedPayback(double differentialCAPEX, double annualSavings) {
        if (annualSavings <= 0) {
            return Double.POSITIVE_INFINITY;
        }
        
        double cumulativeSavings = 0.0;
        int year = 0;
        
        while (cumulativeSavings < differentialCAPEX && year < 50) {
            year++;
            double escalatedSavings = annualSavings * Math.pow(1 + situation.getElectricityInflationRate(), year);
            cumulativeSavings += escalatedSavings;
        }
        
        return year;
    }
    
    /**
     * Generate economic risk assessment
     */
    public EconomicRiskAssessment assessEconomicRisk(double carbonCostUSD, double paybackYears) {
        EconomicRiskAssessment assessment = new EconomicRiskAssessment();
        
        // Risk 1: High carbon liability
        if (carbonCostUSD > 100000) { // $100K+ annual carbon cost
            assessment.hasHighCarbonRisk = true;
            assessment.carbonRiskLevel = "HIGH";
            assessment.carbonRiskReason = String.format(
                "Annual carbon cost of $%.0fK exceeds threshold. Consider renewable energy or carbon offsets.",
                carbonCostUSD / 1000.0
            );
        } else if (carbonCostUSD > 50000) {
            assessment.hasHighCarbonRisk = false;
            assessment.carbonRiskLevel = "MODERATE";
            assessment.carbonRiskReason = String.format(
                "Annual carbon cost of $%.0fK is manageable but may increase with stricter regulations.",
                carbonCostUSD / 1000.0
            );
        } else {
            assessment.carbonRiskLevel = "LOW";
        }
        
        // Risk 2: Extended payback period
        if (paybackYears > 15) {
            assessment.hasLongPayback = true;
            assessment.paybackRiskLevel = "HIGH";
            assessment.paybackRiskReason = String.format(
                "Payback period of %.1f years exceeds typical equipment lifecycle. High financial risk.",
                paybackYears
            );
        } else if (paybackYears > 10) {
            assessment.hasLongPayback = true;
            assessment.paybackRiskLevel = "MODERATE";
            assessment.paybackRiskReason = String.format(
                "Payback period of %.1f years is acceptable but monitor for technology obsolescence.",
                paybackYears
            );
        } else {
            assessment.paybackRiskLevel = "LOW";
        }
        
        // Risk 3: Climate scenario risk
        if (situation.getClimateWarmingShiftC() > 2.0) {
            assessment.hasClimateRisk = true;
            assessment.climateRiskLevel = "HIGH";
            assessment.climateRiskReason = String.format(
                "Climate warming of +%.1f°C may reduce system efficiency by 15-25%%. Plan for upgrades.",
                situation.getClimateWarmingShiftC()
            );
        } else if (situation.getClimateWarmingShiftC() > 1.0) {
            assessment.hasClimateRisk = true;
            assessment.climateRiskLevel = "MODERATE";
            assessment.climateRiskReason = String.format(
                "Climate warming of +%.1f°C will moderately impact efficiency. Monitor trends.",
                situation.getClimateWarmingShiftC()
            );
        } else {
            assessment.climateRiskLevel = "LOW";
        }
        
        return assessment;
    }
    
    /**
     * Print macroeconomic projections
     */
    public void printProjections(double baseElectricityRate, double baseCAPEX) {
        System.out.println("\n=== Macroeconomic Projections ===");
        System.out.printf("Base Year: %d\n", baseYear);
        System.out.printf("Target Year: %d\n", situation.getTargetYear());
        System.out.printf("Analysis Horizon: %d years\n\n", situation.getTargetYear() - baseYear);
        
        System.out.println("Electricity Rate Projections:");
        System.out.printf("  Current: $%.4f/kWh\n", baseElectricityRate);
        System.out.printf("  2030: $%.4f/kWh\n", calculateFutureElectricityRate(baseElectricityRate, 2030));
        System.out.printf("  2040: $%.4f/kWh\n", calculateFutureElectricityRate(baseElectricityRate, 2040));
        System.out.printf("  2050: $%.4f/kWh\n\n", calculateFutureElectricityRate(baseElectricityRate, 2050));
        
        System.out.println("Carbon Tax Projections:");
        System.out.printf("  2030: $%.0f/ton CO2\n", calculateCarbonTaxPerTon(2030));
        System.out.printf("  2040: $%.0f/ton CO2\n", calculateCarbonTaxPerTon(2040));
        System.out.printf("  2050: $%.0f/ton CO2\n\n", calculateCarbonTaxPerTon(2050));
        
        System.out.println("CAPEX Projections:");
        System.out.printf("  Current: $%.0f\n", baseCAPEX);
        System.out.printf("  2030: $%.0f\n", calculateFutureCAPEX(baseCAPEX, 2030));
        System.out.printf("  2040: $%.0f\n", calculateFutureCAPEX(baseCAPEX, 2040));
        System.out.printf("  2050: $%.0f\n", calculateFutureCAPEX(baseCAPEX, 2050));
        System.out.println("=================================\n");
    }
    
    /**
     * Inner class for economic risk assessment
     */
    public static class EconomicRiskAssessment {
        public boolean hasHighCarbonRisk;
        public boolean hasLongPayback;
        public boolean hasClimateRisk;
        
        public String carbonRiskLevel;
        public String paybackRiskLevel;
        public String climateRiskLevel;
        
        public String carbonRiskReason;
        public String paybackRiskReason;
        public String climateRiskReason;
        
        public EconomicRiskAssessment() {
            this.carbonRiskLevel = "LOW";
            this.paybackRiskLevel = "LOW";
            this.climateRiskLevel = "LOW";
            this.carbonRiskReason = "";
            this.paybackRiskReason = "";
            this.climateRiskReason = "";
        }
        
        public void printAssessment() {
            System.out.println("\n=== Economic Risk Assessment ===");
            System.out.printf("Carbon Risk: %s\n", carbonRiskLevel);
            if (!carbonRiskReason.isEmpty()) {
                System.out.printf("  %s\n", carbonRiskReason);
            }
            
            System.out.printf("Payback Risk: %s\n", paybackRiskLevel);
            if (!paybackRiskReason.isEmpty()) {
                System.out.printf("  %s\n", paybackRiskReason);
            }
            
            System.out.printf("Climate Risk: %s\n", climateRiskLevel);
            if (!climateRiskReason.isEmpty()) {
                System.out.printf("  %s\n", climateRiskReason);
            }
            System.out.println("=================================\n");
        }
    }
}
