package com.acme.chilledwatersystem;

/**
 * Step 3: Economic Configuration for Life-Cycle Analysis
 * 
 * Based on NIST Handbook 135 methodology for engineering economics.
 * Includes CAPEX, OPEX, escalation rates, and discount factors.
 */
public class EconomicConfig {
    // Capital Expenditure
    private double initialCapexUSD; // Initial investment for chilled water system
    private double baselineCapexUSD; // Cost of baseline system (e.g., DX air cooling)
    
    // Operating Expenditure
    private double annualMaintenanceCostUSD; // Annual maintenance cost
    private double waterCostPerM3; // Water cost ($/m³)
    
    // Financial Parameters
    private double discountRate; // Discount rate for NPV (e.g., 0.05 = 5%)
    private double electricityEscalationRate; // Annual electricity price increase (e.g., 0.03 = 3%)
    private double waterEscalationRate; // Annual water price increase
    private int analysisHorizonYears; // Life-cycle analysis period (typically 10-20 years)
    
    // Baseline Comparison
    private double baselineAnnualOpexUSD; // Annual OPEX of baseline system
    private double baselinePUE; // PUE of baseline system (typically 1.8-2.2 for air-cooled)
    
    public EconomicConfig() {
        // Default values based on typical edge data center economics
        this.initialCapexUSD = 150000.0; // Chilled water system CAPEX
        this.baselineCapexUSD = 100000.0; // DX system CAPEX
        this.annualMaintenanceCostUSD = 5000.0;
        this.waterCostPerM3 = 0.80;
        this.discountRate = 0.05; // 5% discount rate
        this.electricityEscalationRate = 0.03; // 3% annual increase
        this.waterEscalationRate = 0.02; // 2% annual increase
        this.analysisHorizonYears = 15; // 15-year analysis
        this.baselineAnnualOpexUSD = 80000.0; // Baseline system annual OPEX
        this.baselinePUE = 2.0; // Typical air-cooled PUE
    }
    
    // Getters and Setters
    public double getInitialCapexUSD() {
        return initialCapexUSD;
    }
    
    public void setInitialCapexUSD(double initialCapexUSD) {
        this.initialCapexUSD = initialCapexUSD;
    }
    
    public double getBaselineCapexUSD() {
        return baselineCapexUSD;
    }
    
    public void setBaselineCapexUSD(double baselineCapexUSD) {
        this.baselineCapexUSD = baselineCapexUSD;
    }
    
    public double getAnnualMaintenanceCostUSD() {
        return annualMaintenanceCostUSD;
    }
    
    public void setAnnualMaintenanceCostUSD(double annualMaintenanceCostUSD) {
        this.annualMaintenanceCostUSD = annualMaintenanceCostUSD;
    }
    
    public double getWaterCostPerM3() {
        return waterCostPerM3;
    }
    
    public void setWaterCostPerM3(double waterCostPerM3) {
        this.waterCostPerM3 = waterCostPerM3;
    }
    
    public double getDiscountRate() {
        return discountRate;
    }
    
    public void setDiscountRate(double discountRate) {
        this.discountRate = discountRate;
    }
    
    public double getElectricityEscalationRate() {
        return electricityEscalationRate;
    }
    
    public void setElectricityEscalationRate(double electricityEscalationRate) {
        this.electricityEscalationRate = electricityEscalationRate;
    }
    
    public double getWaterEscalationRate() {
        return waterEscalationRate;
    }
    
    public void setWaterEscalationRate(double waterEscalationRate) {
        this.waterEscalationRate = waterEscalationRate;
    }
    
    public int getAnalysisHorizonYears() {
        return analysisHorizonYears;
    }
    
    public void setAnalysisHorizonYears(int analysisHorizonYears) {
        this.analysisHorizonYears = analysisHorizonYears;
    }
    
    public double getBaselineAnnualOpexUSD() {
        return baselineAnnualOpexUSD;
    }
    
    public void setBaselineAnnualOpexUSD(double baselineAnnualOpexUSD) {
        this.baselineAnnualOpexUSD = baselineAnnualOpexUSD;
    }
    
    public double getBaselinePUE() {
        return baselinePUE;
    }
    
    public void setBaselinePUE(double baselinePUE) {
        this.baselinePUE = baselinePUE;
    }
    
    /**
     * Calculate differential CAPEX (chilled water vs baseline)
     */
    public double getDifferentialCapex() {
        return initialCapexUSD - baselineCapexUSD;
    }
    
    @Override
    public String toString() {
        return String.format(
            "EconomicConfig[CAPEX=$%.0f, Baseline=$%.0f, Horizon=%d years, Discount=%.1f%%, Escalation=%.1f%%]",
            initialCapexUSD, baselineCapexUSD, analysisHorizonYears, 
            discountRate * 100, electricityEscalationRate * 100
        );
    }
}
