package com.acme.chilledwatersystem;

/**
 * Phase 3 Part 3 - Phase 2: Escalated Financial Analysis
 * 
 * Provides real-world accuracy with resource inflation, carbon tax projections,
 * and equipment refresh cycles for AI workloads.
 */
public class EscalatedFinancialAnalyzer {
    
    private final MacroeconomicModel macroModel;
    private final WorkloadAggregator workloadAgg;
    private final EconomicConfig economicConfig;
    private final CarbonConfig carbonConfig;
    
    public EscalatedFinancialAnalyzer(MacroeconomicModel macroModel,
                                     WorkloadAggregator workloadAgg,
                                     EconomicConfig economicConfig,
                                     CarbonConfig carbonConfig) {
        this.macroModel = macroModel;
        this.workloadAgg = workloadAgg;
        this.economicConfig = economicConfig;
        this.carbonConfig = carbonConfig;
    }
    
    /**
     * Calculate escalated NPV with resource inflation
     */
    public double calculateEscalatedNPV(double annualSavings, double differentialCAPEX, int horizon) {
        double npv = -differentialCAPEX;
        double discountRate = economicConfig.getDiscountRate();
        
        for (int year = 1; year <= horizon; year++) {
            int targetYear = 2026 + year;
            
            // Escalate electricity savings
            double baseElectricityRate = 0.12; // $0.12/kWh baseline
            double futureRate = macroModel.calculateFutureElectricityRate(baseElectricityRate, targetYear);
            double escalationFactor = futureRate / baseElectricityRate;
            double escalatedSavings = annualSavings * escalationFactor;
            
            // Subtract carbon tax liability
            double annualEnergyKWh = workloadAgg.getTotalFacilityEnergyKWh();
            double carbonCost = macroModel.calculateCarbonCost(
                annualEnergyKWh, 
                carbonConfig.getGridCarbonFactorKgPerKwh(), 
                targetYear
            );
            escalatedSavings -= carbonCost;
            
            // Discount to present value
            double presentValue = escalatedSavings / Math.pow(1 + discountRate, year);
            npv += presentValue;
        }
        
        return npv;
    }
    
    /**
     * Calculate Total Cost of Ownership with equipment refresh cycles
     */
    public double calculateTCOWithRefresh(double annualOPEX, int horizon) {
        double tco = economicConfig.getInitialCapexUSD();
        double refreshYears = workloadAgg.getEquipmentRefreshYears();
        
        for (int year = 1; year <= horizon; year++) {
            int targetYear = 2026 + year;
            
            // Escalate annual OPEX
            double baseElectricityRate = 0.12;
            double futureRate = macroModel.calculateFutureElectricityRate(baseElectricityRate, targetYear);
            double escalationFactor = futureRate / baseElectricityRate;
            double escalatedOPEX = annualOPEX * escalationFactor;
            
            tco += escalatedOPEX;
            
            // Add equipment refresh cost
            if (year % (int)refreshYears == 0) {
                double refreshCAPEX = economicConfig.getInitialCapexUSD() * 0.6; // 60% of initial
                double futureCAPEX = macroModel.calculateFutureCAPEX(refreshCAPEX, targetYear);
                tco += futureCAPEX;
            }
        }
        
        return tco;
    }
    
    /**
     * Calculate Levelized Cost of Energy with escalation
     */
    public double calculateLCOE(double tco, double annualITEnergyKWh, int horizon) {
        return tco / (annualITEnergyKWh * horizon);
    }
    
    /**
     * Calculate inflation-adjusted payback period
     */
    public double calculateInflationAdjustedPayback(double differentialCAPEX, double annualSavings) {
        return macroModel.calculateInflationAdjustedPayback(differentialCAPEX, annualSavings);
    }
    
    /**
     * Calculate carbon tax liability over lifecycle
     */
    public double calculateLifecycleCarbonTax(double annualEnergyKWh, int horizon) {
        double totalCarbonTax = 0.0;
        
        for (int year = 1; year <= horizon; year++) {
            int targetYear = 2026 + year;
            double carbonCost = macroModel.calculateCarbonCost(
                annualEnergyKWh,
                carbonConfig.getGridCarbonFactorKgPerKwh(),
                targetYear
            );
            totalCarbonTax += carbonCost;
        }
        
        return totalCarbonTax;
    }
    
    /**
     * Print escalated financial summary
     */
    public void printSummary(double annualSavings, double differentialCAPEX) {
        System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  ESCALATED FINANCIAL ANALYSIS                                         ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        int horizon = economicConfig.getAnalysisHorizonYears();
        double annualOPEX = workloadAgg.getTotalFacilityEnergyKWh() * 0.12; // Simplified
        
        double escalatedNPV = calculateEscalatedNPV(annualSavings, differentialCAPEX, horizon);
        double tcoWithRefresh = calculateTCOWithRefresh(annualOPEX, horizon);
        double lcoe = calculateLCOE(tcoWithRefresh, workloadAgg.getTotalITEnergyKWh(), horizon);
        double payback = calculateInflationAdjustedPayback(differentialCAPEX, annualSavings);
        double carbonTax = calculateLifecycleCarbonTax(workloadAgg.getTotalFacilityEnergyKWh(), horizon);
        
        System.out.println("ESCALATED FINANCIAL METRICS:");
        System.out.printf("  Escalated NPV (15 years): $%.2f\n", escalatedNPV);
        System.out.printf("  TCO with Equipment Refresh: $%.2f\n", tcoWithRefresh);
        System.out.printf("  Levelized Cost of Energy: $%.4f/kWh\n", lcoe);
        System.out.printf("  Inflation-Adjusted Payback: %.1f years\n", payback);
        System.out.println();
        
        System.out.println("CARBON TAX LIABILITY:");
        System.out.printf("  Total Carbon Tax (15 years): $%.2f\n", carbonTax);
        System.out.printf("  Average Annual Carbon Tax: $%.2f\n", carbonTax / horizon);
        System.out.println();
        
        System.out.println("EQUIPMENT REFRESH SCHEDULE:");
        System.out.printf("  Refresh Cycle: %.1f years\n", workloadAgg.getEquipmentRefreshYears());
        System.out.printf("  Number of Refreshes (15 years): %.0f\n", 15.0 / workloadAgg.getEquipmentRefreshYears());
        System.out.println();
    }
}
