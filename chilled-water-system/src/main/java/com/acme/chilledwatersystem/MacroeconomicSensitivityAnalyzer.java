package com.acme.chilledwatersystem;

import java.util.ArrayList;
import java.util.List;

/**
 * Phase 4 Part 4 - Section 4.4: Macroeconomic Sensitivity Analysis
 * 
 * Tests financial future-proofing by applying ±20% variance to inflation scalars:
 * - Electricity price spikes (15-20% by 2030)
 * - Equipment supercycle (3-year GPU refresh vs 15-year cooling infrastructure)
 * - Carbon tax escalation
 */
public class MacroeconomicSensitivityAnalyzer {
    
    private final MacroeconomicModel baseModel;
    private final WorkloadAggregator workloadAgg;
    private final EconomicConfig economicConfig;
    
    public MacroeconomicSensitivityAnalyzer(MacroeconomicModel baseModel,
                                           WorkloadAggregator workloadAgg,
                                           EconomicConfig economicConfig) {
        this.baseModel = baseModel;
        this.workloadAgg = workloadAgg;
        this.economicConfig = economicConfig;
    }
    
    /**
     * Perform comprehensive sensitivity analysis
     */
    public SensitivityResults performAnalysis() {
        System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  MACROECONOMIC SENSITIVITY ANALYSIS (±20% Variance)                   ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        SensitivityResults results = new SensitivityResults();
        
        // Base case
        results.baseCase = calculateScenario("Base Case", 1.0, 1.0, 1.0);
        
        // Electricity price sensitivity
        results.electricityLow = calculateScenario("Electricity -20%", 0.8, 1.0, 1.0);
        results.electricityHigh = calculateScenario("Electricity +20%", 1.2, 1.0, 1.0);
        
        // Carbon tax sensitivity
        results.carbonTaxLow = calculateScenario("Carbon Tax -20%", 1.0, 0.8, 1.0);
        results.carbonTaxHigh = calculateScenario("Carbon Tax +20%", 1.0, 1.2, 1.0);
        
        // Equipment refresh sensitivity
        results.refreshFast = calculateScenario("Fast Refresh (2.4yr)", 1.0, 1.0, 0.8);
        results.refreshSlow = calculateScenario("Slow Refresh (3.6yr)", 1.0, 1.0, 1.2);
        
        // Worst case (all high)
        results.worstCase = calculateScenario("Worst Case", 1.2, 1.2, 0.8);
        
        // Best case (all low)
        results.bestCase = calculateScenario("Best Case", 0.8, 0.8, 1.2);
        
        return results;
    }
    
    /**
     * Calculate scenario with multipliers
     */
    private ScenarioResult calculateScenario(String name, 
                                            double electricityMultiplier,
                                            double carbonTaxMultiplier,
                                            double refreshMultiplier) {
        ScenarioResult result = new ScenarioResult();
        result.name = name;
        
        // Calculate annual energy cost with electricity multiplier
        double baseElectricityRate = 0.12; // $0.12/kWh
        double annualEnergyKWh = workloadAgg.getTotalFacilityEnergyKWh();
        double annualEnergyCost = annualEnergyKWh * baseElectricityRate * electricityMultiplier;
        result.annualEnergyCostUSD = annualEnergyCost;
        
        // Calculate carbon tax with multiplier
        double carbonKg = annualEnergyKWh * 0.45; // 0.45 kg CO2/kWh
        double carbonTax2030 = 254.0 * carbonTaxMultiplier; // $/ton
        double carbonTax2050 = 800.0 * carbonTaxMultiplier; // $/ton
        double avgCarbonTax = (carbonTax2030 + carbonTax2050) / 2.0;
        result.annualCarbonTaxUSD = (carbonKg / 1000.0) * avgCarbonTax;
        
        // Calculate equipment refresh cost with multiplier
        double refreshYears = workloadAgg.getEquipmentRefreshYears() * refreshMultiplier;
        int numRefreshes = (int)(15.0 / refreshYears);
        double refreshCost = 300000.0; // $300K per refresh
        result.totalRefreshCostUSD = refreshCost * numRefreshes;
        result.refreshCycleYears = refreshYears;
        
        // Calculate 15-year TCO
        double initialCAPEX = economicConfig.getInitialCapexUSD();
        double annualOPEX = annualEnergyCost + result.annualCarbonTaxUSD + 20000; // +$20K maintenance
        
        result.tco15Years = initialCAPEX + (annualOPEX * 15) + result.totalRefreshCostUSD;
        
        // Calculate NPV (simplified)
        double annualSavings = 50000.0; // Baseline savings
        double discountRate = economicConfig.getDiscountRate();
        double npv = -initialCAPEX;
        
        for (int year = 1; year <= 15; year++) {
            double escalatedSavings = annualSavings * Math.pow(1 + 0.03 * electricityMultiplier, year);
            double presentValue = escalatedSavings / Math.pow(1 + discountRate, year);
            npv += presentValue;
        }
        result.npv15Years = npv;
        
        // Calculate payback period
        double cumulativeSavings = 0.0;
        int paybackYears = 0;
        for (int year = 1; year <= 30; year++) {
            cumulativeSavings += annualSavings * Math.pow(1 + 0.03 * electricityMultiplier, year);
            if (cumulativeSavings >= initialCAPEX) {
                paybackYears = year;
                break;
            }
        }
        result.paybackYears = paybackYears > 0 ? paybackYears : 30;
        
        return result;
    }
    
    /**
     * Print sensitivity analysis results
     */
    public void printResults(SensitivityResults results) {
        System.out.println("═".repeat(75));
        System.out.println("SENSITIVITY ANALYSIS RESULTS");
        System.out.println("═".repeat(75));
        System.out.println();
        
        printScenario(results.baseCase);
        System.out.println();
        
        System.out.println("ELECTRICITY PRICE SENSITIVITY:");
        printScenario(results.electricityLow);
        printScenario(results.electricityHigh);
        double electricitySensitivity = Math.abs(results.electricityHigh.tco15Years - results.electricityLow.tco15Years) / 
                                       results.baseCase.tco15Years * 100.0;
        System.out.printf("  → TCO Sensitivity: ±%.1f%%\n\n", electricitySensitivity / 2);
        
        System.out.println("CARBON TAX SENSITIVITY:");
        printScenario(results.carbonTaxLow);
        printScenario(results.carbonTaxHigh);
        double carbonSensitivity = Math.abs(results.carbonTaxHigh.tco15Years - results.carbonTaxLow.tco15Years) / 
                                  results.baseCase.tco15Years * 100.0;
        System.out.printf("  → TCO Sensitivity: ±%.1f%%\n\n", carbonSensitivity / 2);
        
        System.out.println("EQUIPMENT REFRESH SENSITIVITY:");
        printScenario(results.refreshFast);
        printScenario(results.refreshSlow);
        double refreshSensitivity = Math.abs(results.refreshFast.tco15Years - results.refreshSlow.tco15Years) / 
                                   results.baseCase.tco15Years * 100.0;
        System.out.printf("  → TCO Sensitivity: ±%.1f%%\n\n", refreshSensitivity / 2);
        
        System.out.println("EXTREME SCENARIOS:");
        printScenario(results.bestCase);
        printScenario(results.worstCase);
        double extremeRange = results.worstCase.tco15Years - results.bestCase.tco15Years;
        System.out.printf("  → TCO Range: $%.0f (%.1f%% of base)\n\n", 
            extremeRange, extremeRange / results.baseCase.tco15Years * 100.0);
        
        // Risk assessment
        System.out.println("═".repeat(75));
        System.out.println("RISK ASSESSMENT:");
        System.out.println("═".repeat(75));
        
        if (results.worstCase.npv15Years < -500000) {
            System.out.println("⚠️  HIGH FINANCIAL RISK: Worst-case NPV is severely negative");
            System.out.println("   → Design is not resilient to economic volatility");
            System.out.println("   → Consider renewable energy or alternative cooling");
        } else if (results.worstCase.npv15Years < 0) {
            System.out.println("⚠️  MODERATE FINANCIAL RISK: Worst-case NPV is negative");
            System.out.println("   → Design is marginally viable under adverse conditions");
            System.out.println("   → Monitor economic indicators and plan contingencies");
        } else {
            System.out.println("✅ LOW FINANCIAL RISK: Positive NPV across all scenarios");
            System.out.println("   → Design is resilient to economic volatility");
        }
        
        System.out.println();
    }
    
    /**
     * Print single scenario result
     */
    private void printScenario(ScenarioResult result) {
        System.out.printf("%-25s | TCO: $%.0fK | NPV: $%.0fK | Payback: %d yrs | Refresh: %.1f yrs\n",
            result.name,
            result.tco15Years / 1000.0,
            result.npv15Years / 1000.0,
            result.paybackYears,
            result.refreshCycleYears
        );
    }
    
    /**
     * Inner class for sensitivity results
     */
    public static class SensitivityResults {
        public ScenarioResult baseCase;
        public ScenarioResult electricityLow;
        public ScenarioResult electricityHigh;
        public ScenarioResult carbonTaxLow;
        public ScenarioResult carbonTaxHigh;
        public ScenarioResult refreshFast;
        public ScenarioResult refreshSlow;
        public ScenarioResult worstCase;
        public ScenarioResult bestCase;
    }
    
    /**
     * Inner class for scenario result
     */
    public static class ScenarioResult {
        public String name;
        public double annualEnergyCostUSD;
        public double annualCarbonTaxUSD;
        public double totalRefreshCostUSD;
        public double refreshCycleYears;
        public double tco15Years;
        public double npv15Years;
        public int paybackYears;
    }
}
