package com.acme.chilledwatersystem;

import com.acme.chilledwatersystem.SimulationOrchestrator.HourlySimulationResult;
import java.util.List;

/**
 * Step 3: Life-Cycle Analysis Engine
 * 
 * Transforms 8760 hours of CloudSim + Chilled Water simulation data into
 * engineering-grade decision metrics following ISO/IEC 30134 and NIST Handbook 135.
 * 
 * Calculates:
 * - Sustainability KPIs (PUE, WUE, CUE)
 * - Financial metrics (NPV, Payback, TCO)
 * - Compliance assessment
 * - Go/No-Go recommendation
 */
public class LifeCycleAnalyzer {
    private final EconomicConfig economicConfig;
    private final CarbonConfig carbonConfig;
    private final EdgeDataCenterScenario scenario;
    
    public LifeCycleAnalyzer(EdgeDataCenterScenario scenario, 
                            EconomicConfig economicConfig,
                            CarbonConfig carbonConfig) {
        this.scenario = scenario;
        this.economicConfig = economicConfig;
        this.carbonConfig = carbonConfig;
    }
    
    /**
     * Analyze simulation results and produce comprehensive life-cycle assessment
     */
    public ScenarioSummary analyze(List<HourlySimulationResult> hourlyResults) {
        System.out.println("\n=== Step 3: Life-Cycle Analysis ===\n");
        
        // Aggregate annual metrics from hourly results
        AnnualMetrics annual = aggregateAnnualMetrics(hourlyResults);
        
        // Calculate sustainability KPIs (ISO/IEC 30134)
        SustainabilityKPIs kpis = calculateSustainabilityKPIs(annual);
        
        // Calculate financial metrics (NIST Handbook 135)
        FinancialMetrics financial = calculateFinancialMetrics(annual);
        
        // Assess compliance and reliability
        ComplianceAssessment compliance = assessCompliance(hourlyResults, annual);
        
        // Generate Go/No-Go recommendation
        String recommendation = generateRecommendation(kpis, financial, compliance);
        
        return new ScenarioSummary(annual, kpis, financial, compliance, recommendation);
    }
    
    /**
     * Aggregate 8760 hourly results into annual totals
     */
    private AnnualMetrics aggregateAnnualMetrics(List<HourlySimulationResult> hourlyResults) {
        AnnualMetrics metrics = new AnnualMetrics();
        
        double edgeOverheadKW = 7.2; // Fixed edge infrastructure load
        
        for (HourlySimulationResult r : hourlyResults) {
            metrics.annualITEnergyKWh += r.itLoadKW;
            metrics.annualCoolingEnergyKWh += r.totalCoolingKW;
            metrics.annualEdgeOverheadKWh += edgeOverheadKW;
            metrics.annualTotalEnergyKWh += (r.itLoadKW + r.totalCoolingKW + edgeOverheadKW);
            metrics.annualEnergyCostUSD += r.hourlyCostUSD;
            metrics.annualCarbonKg += r.hourlyCarbonKg;
            
            // Track water usage (estimate from cooling tower evaporation)
            // Typical: 1.8 L per kWh of heat rejected
            metrics.annualWaterLiters += r.totalCoolingKW * 1.8;
            
            if (!r.thermalCompliant) {
                metrics.thermalExcursionHours++;
            }
            
            // Track peak demand
            double facilityPower = r.itLoadKW + r.totalCoolingKW + edgeOverheadKW;
            if (facilityPower > metrics.peakDemandKW) {
                metrics.peakDemandKW = facilityPower;
            }
        }
        
        // Add annual maintenance cost
        metrics.annualMaintenanceCostUSD = economicConfig.getAnnualMaintenanceCostUSD();
        metrics.annualWaterCostUSD = (metrics.annualWaterLiters / 1000.0) * economicConfig.getWaterCostPerM3();
        
        // Calculate total annual OPEX
        metrics.annualTotalOpexUSD = metrics.annualEnergyCostUSD + 
                                     metrics.annualMaintenanceCostUSD + 
                                     metrics.annualWaterCostUSD;
        
        return metrics;
    }
    
    /**
     * Calculate Sustainability KPIs following ISO/IEC 30134 standards
     */
    private SustainabilityKPIs calculateSustainabilityKPIs(AnnualMetrics annual) {
        SustainabilityKPIs kpis = new SustainabilityKPIs();
        
        // PUE (Power Usage Effectiveness) - ISO/IEC 30134-2
        kpis.pue = annual.annualTotalEnergyKWh / annual.annualITEnergyKWh;
        
        // WUE (Water Usage Effectiveness) - ISO/IEC 30134-9
        // L/kWh of IT equipment energy
        kpis.wue = annual.annualWaterLiters / annual.annualITEnergyKWh;
        
        // CUE (Carbon Usage Effectiveness) - ISO/IEC 30134-8
        // kg CO2 per kWh of IT equipment energy
        kpis.cue = annual.annualCarbonKg / annual.annualITEnergyKWh;
        
        // Calculate improvement vs baseline
        kpis.pueImprovement = ((economicConfig.getBaselinePUE() - kpis.pue) / 
                               economicConfig.getBaselinePUE()) * 100.0;
        
        // Energy efficiency (inverse of PUE)
        kpis.energyEfficiency = 1.0 / kpis.pue;
        
        // Carbon intensity (total emissions)
        kpis.totalCarbonTons = annual.annualCarbonKg / 1000.0;
        
        return kpis;
    }
    
    /**
     * Calculate Financial Metrics using NIST Handbook 135 methodology
     */
    private FinancialMetrics calculateFinancialMetrics(AnnualMetrics annual) {
        FinancialMetrics financial = new FinancialMetrics();
        
        // Annual savings vs baseline
        financial.annualSavingsUSD = economicConfig.getBaselineAnnualOpexUSD() - annual.annualTotalOpexUSD;
        
        // Simple Payback Period
        double differentialCapex = economicConfig.getDifferentialCapex();
        if (financial.annualSavingsUSD > 0) {
            financial.simplePaybackYears = differentialCapex / financial.annualSavingsUSD;
        } else {
            financial.simplePaybackYears = Double.POSITIVE_INFINITY; // No payback
        }
        
        // Net Present Value (NPV) with escalation and discounting
        financial.npv = calculateNPV(annual.annualTotalOpexUSD, financial.annualSavingsUSD);
        
        // Total Cost of Ownership over analysis horizon
        financial.tco = calculateTCO(annual.annualTotalOpexUSD);
        
        // Levelized Cost of Energy (LCOE)
        financial.lcoe = financial.tco / (annual.annualITEnergyKWh * economicConfig.getAnalysisHorizonYears());
        
        // Return on Investment (ROI)
        double totalSavings = financial.annualSavingsUSD * economicConfig.getAnalysisHorizonYears();
        financial.roi = ((totalSavings - differentialCapex) / differentialCapex) * 100.0;
        
        return financial;
    }
    
    /**
     * Calculate Net Present Value with energy escalation and discount rate
     * Following NIST Handbook 135 methodology
     */
    private double calculateNPV(double annualOpex, double annualSavings) {
        double npv = -economicConfig.getDifferentialCapex(); // Initial investment
        
        int horizon = economicConfig.getAnalysisHorizonYears();
        double discountRate = economicConfig.getDiscountRate();
        double escalationRate = economicConfig.getElectricityEscalationRate();
        
        for (int year = 1; year <= horizon; year++) {
            // Apply escalation to savings
            double escalatedSavings = annualSavings * Math.pow(1 + escalationRate, year);
            
            // Discount to present value
            double presentValue = escalatedSavings / Math.pow(1 + discountRate, year);
            
            npv += presentValue;
        }
        
        return npv;
    }
    
    /**
     * Calculate Total Cost of Ownership over analysis horizon
     */
    private double calculateTCO(double annualOpex) {
        double tco = economicConfig.getInitialCapexUSD(); // Initial CAPEX
        
        int horizon = economicConfig.getAnalysisHorizonYears();
        double escalationRate = economicConfig.getElectricityEscalationRate();
        
        for (int year = 1; year <= horizon; year++) {
            // Apply escalation to annual OPEX
            double escalatedOpex = annualOpex * Math.pow(1 + escalationRate, year);
            tco += escalatedOpex;
        }
        
        return tco;
    }
    
    /**
     * Assess compliance and reliability
     */
    private ComplianceAssessment assessCompliance(List<HourlySimulationResult> hourlyResults, 
                                                  AnnualMetrics annual) {
        ComplianceAssessment assessment = new ComplianceAssessment();
        
        // Thermal compliance (ASHRAE TC 9.9 guidelines)
        assessment.thermalExcursionHours = annual.thermalExcursionHours;
        assessment.thermalCompliancePercent = 
            ((8760.0 - annual.thermalExcursionHours) / 8760.0) * 100.0;
        assessment.thermalCompliant = (annual.thermalExcursionHours < 88); // <1% excursions
        
        // Water usage compliance (check against regional limits)
        double waterStressThreshold = 2.0; // L/kWh threshold for water-stressed regions
        assessment.waterCompliant = (annual.annualWaterLiters / annual.annualITEnergyKWh) < waterStressThreshold;
        
        // Reliability assessment (uptime)
        assessment.reliabilityPercent = assessment.thermalCompliancePercent;
        assessment.reliabilityCompliant = assessment.thermalCompliant;
        
        return assessment;
    }
    
    /**
     * Generate Go/No-Go recommendation based on three criteria
     */
    private String generateRecommendation(SustainabilityKPIs kpis, 
                                         FinancialMetrics financial,
                                         ComplianceAssessment compliance) {
        StringBuilder recommendation = new StringBuilder();
        int score = 0;
        
        // Criterion 1: Thermal Compliance
        if (compliance.thermalCompliant) {
            recommendation.append("✓ PASS: Thermal compliance (").append(String.format("%.2f", compliance.thermalCompliancePercent)).append("% uptime)\n");
            score++;
        } else {
            recommendation.append("✗ FAIL: Thermal excursions exceed acceptable threshold\n");
        }
        
        // Criterion 2: Water Constraint
        if (compliance.waterCompliant) {
            recommendation.append("✓ PASS: Water usage within regional limits (WUE=").append(String.format("%.2f", kpis.wue)).append(" L/kWh)\n");
            score++;
        } else {
            recommendation.append("⚠ WARNING: High water usage may be problematic in water-stressed regions\n");
            score++; // Not a hard fail
        }
        
        // Criterion 3: Financial Viability
        if (financial.npv > 0 && financial.simplePaybackYears < 10) {
            recommendation.append("✓ PASS: Positive NPV ($").append(String.format("%.0f", financial.npv))
                .append(") with ").append(String.format("%.1f", financial.simplePaybackYears)).append("-year payback\n");
            score++;
        } else if (financial.npv > 0) {
            recommendation.append("⚠ MARGINAL: Positive NPV but long payback period\n");
            score++;
        } else {
            recommendation.append("✗ FAIL: Negative NPV - not financially viable\n");
        }
        
        // Final recommendation
        recommendation.append("\n");
        if (score >= 3) {
            recommendation.append("RECOMMENDATION: GO - System is technically and financially viable");
        } else if (score >= 2) {
            recommendation.append("RECOMMENDATION: CONDITIONAL GO - Review marginal criteria");
        } else {
            recommendation.append("RECOMMENDATION: NO-GO - System does not meet minimum requirements");
        }
        
        return recommendation.toString();
    }
    
    // Inner classes for structured results
    public static class AnnualMetrics {
        public double annualITEnergyKWh;
        public double annualCoolingEnergyKWh;
        public double annualEdgeOverheadKWh;
        public double annualTotalEnergyKWh;
        public double annualEnergyCostUSD;
        public double annualMaintenanceCostUSD;
        public double annualWaterCostUSD;
        public double annualTotalOpexUSD;
        public double annualCarbonKg;
        public double annualWaterLiters;
        public int thermalExcursionHours;
        public double peakDemandKW;
    }
    
    public static class SustainabilityKPIs {
        public double pue;
        public double wue;
        public double cue;
        public double pueImprovement;
        public double energyEfficiency;
        public double totalCarbonTons;
    }
    
    public static class FinancialMetrics {
        public double annualSavingsUSD;
        public double simplePaybackYears;
        public double npv;
        public double tco;
        public double lcoe;
        public double roi;
    }
    
    public static class ComplianceAssessment {
        public int thermalExcursionHours;
        public double thermalCompliancePercent;
        public boolean thermalCompliant;
        public boolean waterCompliant;
        public double reliabilityPercent;
        public boolean reliabilityCompliant;
    }
}
