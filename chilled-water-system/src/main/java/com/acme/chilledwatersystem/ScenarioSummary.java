package com.acme.chilledwatersystem;

import com.acme.chilledwatersystem.LifeCycleAnalyzer.*;

/**
 * Step 3: Scenario Summary Report
 * 
 * Comprehensive summary of life-cycle analysis results including:
 * - Annual metrics
 * - Sustainability KPIs (PUE, WUE, CUE)
 * - Financial metrics (NPV, Payback, TCO)
 * - Compliance assessment
 * - Go/No-Go recommendation
 */
public class ScenarioSummary {
    private final AnnualMetrics annualMetrics;
    private final SustainabilityKPIs sustainabilityKPIs;
    private final FinancialMetrics financialMetrics;
    private final ComplianceAssessment complianceAssessment;
    private final String recommendation;
    
    public ScenarioSummary(AnnualMetrics annualMetrics,
                          SustainabilityKPIs sustainabilityKPIs,
                          FinancialMetrics financialMetrics,
                          ComplianceAssessment complianceAssessment,
                          String recommendation) {
        this.annualMetrics = annualMetrics;
        this.sustainabilityKPIs = sustainabilityKPIs;
        this.financialMetrics = financialMetrics;
        this.complianceAssessment = complianceAssessment;
        this.recommendation = recommendation;
    }
    
    /**
     * Print comprehensive summary report
     */
    public void printReport() {
        System.out.println("\n" + "=".repeat(80));
        System.out.println("CHILLED WATER SYSTEM - LIFE-CYCLE ANALYSIS REPORT");
        System.out.println("=".repeat(80));
        
        printAnnualMetrics();
        printSustainabilityKPIs();
        printFinancialMetrics();
        printComplianceAssessment();
        printRecommendation();
        
        System.out.println("=".repeat(80) + "\n");
    }
    
    private void printAnnualMetrics() {
        System.out.println("\n--- ANNUAL ENERGY & RESOURCE CONSUMPTION ---");
        System.out.printf("IT Equipment Energy:        %,.0f kWh\n", annualMetrics.annualITEnergyKWh);
        System.out.printf("Cooling Energy:             %,.0f kWh\n", annualMetrics.annualCoolingEnergyKWh);
        System.out.printf("Edge Overhead Energy:       %,.0f kWh\n", annualMetrics.annualEdgeOverheadKWh);
        System.out.printf("Total Facility Energy:      %,.0f kWh\n", annualMetrics.annualTotalEnergyKWh);
        System.out.printf("Peak Demand:                %.2f kW\n", annualMetrics.peakDemandKW);
        System.out.printf("Water Consumption:          %,.0f liters (%.1f m³)\n", 
            annualMetrics.annualWaterLiters, annualMetrics.annualWaterLiters / 1000.0);
        System.out.printf("Carbon Emissions:           %,.0f kg CO2 (%.2f metric tons)\n",
            annualMetrics.annualCarbonKg, annualMetrics.annualCarbonKg / 1000.0);
    }
    
    private void printSustainabilityKPIs() {
        System.out.println("\n--- SUSTAINABILITY KPIs (ISO/IEC 30134) ---");
        System.out.printf("PUE (Power Usage Effectiveness):     %.3f", sustainabilityKPIs.pue);
        if (sustainabilityKPIs.pueImprovement > 0) {
            System.out.printf(" (%.1f%% improvement vs baseline)\n", sustainabilityKPIs.pueImprovement);
        } else {
            System.out.println();
        }
        System.out.printf("WUE (Water Usage Effectiveness):     %.3f L/kWh\n", sustainabilityKPIs.wue);
        System.out.printf("CUE (Carbon Usage Effectiveness):    %.3f kg CO2/kWh\n", sustainabilityKPIs.cue);
        System.out.printf("Energy Efficiency:                   %.1f%%\n", 
            sustainabilityKPIs.energyEfficiency * 100);
        System.out.printf("Total Carbon Footprint:              %.2f metric tons CO2\n",
            sustainabilityKPIs.totalCarbonTons);
    }
    
    private void printFinancialMetrics() {
        System.out.println("\n--- FINANCIAL ANALYSIS (NIST Handbook 135) ---");
        System.out.printf("Annual Energy Cost:          $%,.2f\n", annualMetrics.annualEnergyCostUSD);
        System.out.printf("Annual Maintenance Cost:     $%,.2f\n", annualMetrics.annualMaintenanceCostUSD);
        System.out.printf("Annual Water Cost:           $%,.2f\n", annualMetrics.annualWaterCostUSD);
        System.out.printf("Total Annual OPEX:           $%,.2f\n", annualMetrics.annualTotalOpexUSD);
        System.out.printf("Annual Savings vs Baseline:  $%,.2f\n", financialMetrics.annualSavingsUSD);
        System.out.println();
        System.out.printf("Simple Payback Period:       %.2f years\n", financialMetrics.simplePaybackYears);
        System.out.printf("Net Present Value (NPV):     $%,.2f\n", financialMetrics.npv);
        System.out.printf("Total Cost of Ownership:     $%,.2f\n", financialMetrics.tco);
        System.out.printf("Levelized Cost of Energy:    $%.4f/kWh\n", financialMetrics.lcoe);
        System.out.printf("Return on Investment (ROI):  %.1f%%\n", financialMetrics.roi);
    }
    
    private void printComplianceAssessment() {
        System.out.println("\n--- COMPLIANCE & RELIABILITY ASSESSMENT ---");
        System.out.printf("Thermal Excursion Hours:     %d / 8760 (%.2f%%)\n",
            complianceAssessment.thermalExcursionHours,
            (complianceAssessment.thermalExcursionHours / 8760.0) * 100);
        System.out.printf("Thermal Compliance:          %.2f%% uptime - %s\n",
            complianceAssessment.thermalCompliancePercent,
            complianceAssessment.thermalCompliant ? "PASS" : "FAIL");
        System.out.printf("Water Usage Compliance:      %s\n",
            complianceAssessment.waterCompliant ? "PASS" : "WARNING");
        System.out.printf("System Reliability:          %.2f%% - %s\n",
            complianceAssessment.reliabilityPercent,
            complianceAssessment.reliabilityCompliant ? "ACCEPTABLE" : "UNACCEPTABLE");
    }
    
    private void printRecommendation() {
        System.out.println("\n--- ENGINEERING RECOMMENDATION ---");
        System.out.println(recommendation);
    }
    
    // Getters
    public AnnualMetrics getAnnualMetrics() {
        return annualMetrics;
    }
    
    public SustainabilityKPIs getSustainabilityKPIs() {
        return sustainabilityKPIs;
    }
    
    public FinancialMetrics getFinancialMetrics() {
        return financialMetrics;
    }
    
    public ComplianceAssessment getComplianceAssessment() {
        return complianceAssessment;
    }
    
    public String getRecommendation() {
        return recommendation;
    }
    
    /**
     * Check if system is recommended (Go decision)
     */
    public boolean isRecommended() {
        return recommendation.contains("RECOMMENDATION: GO");
    }
    
    /**
     * Get summary in one line
     */
    public String getOneLinerSummary() {
        return String.format(
            "PUE=%.3f, NPV=$%.0fK, Payback=%.1fy, Compliance=%.1f%%, %s",
            sustainabilityKPIs.pue,
            financialMetrics.npv / 1000.0,
            financialMetrics.simplePaybackYears,
            complianceAssessment.thermalCompliancePercent,
            isRecommended() ? "GO" : "NO-GO"
        );
    }
}
