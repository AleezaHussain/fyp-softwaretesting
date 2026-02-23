package com.acme.chilledwatersystem;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Phase 5 Part 5 - Section 5.2: Automated ESG & ISO 30134 Reporting
 * 
 * Generates audit-ready sustainability reports compliant with:
 * - ISO/IEC 30134 series (PUE, WUE, CUE)
 * - EU Energy Efficiency Directive (EED)
 * - Scope 1, 2, 3 carbon tracking
 */
public class ESGReporter {
    
    private final List<HourlyResult> hourlyData;
    private final WorkloadAggregator workloadAgg;
    private final EnhancedSustainabilityKPIs sustainabilityKPIs;
    
    public ESGReporter(List<HourlyResult> hourlyData,
                      WorkloadAggregator workloadAgg,
                      EnhancedSustainabilityKPIs sustainabilityKPIs) {
        this.hourlyData = hourlyData;
        this.workloadAgg = workloadAgg;
        this.sustainabilityKPIs = sustainabilityKPIs;
    }
    
    /**
     * Generate comprehensive ESG report
     */
    public ESGReport generateReport(String reportingPeriod) {
        ESGReport report = new ESGReport();
        report.reportingPeriod = reportingPeriod;
        report.generatedAt = LocalDateTime.now();
        report.facilityName = "Edge Data Center - Phoenix, AZ";
        
        // ISO 30134 KPIs
        report.iso30134Metrics = generateISO30134Metrics();
        
        // Scope 1, 2, 3 Emissions
        report.scopeEmissions = sustainabilityKPIs.calculateScopeEmissions(1);
        
        // Water Usage
        report.waterMetrics = generateWaterMetrics();
        
        // Compliance Status
        report.complianceStatus = assessCompliance();
        
        // Equipment Lifecycle
        report.equipmentLifecycle = generateEquipmentLifecycle();
        
        return report;
    }
    
    /**
     * Generate ISO/IEC 30134 metrics
     */
    private ISO30134Metrics generateISO30134Metrics() {
        ISO30134Metrics metrics = new ISO30134Metrics();
        
        EnhancedSustainabilityKPIs.BasicKPIs basic = sustainabilityKPIs.calculateBasicKPIs();
        
        // ISO/IEC 30134-2: Power Usage Effectiveness (PUE)
        metrics.pue = basic.pue;
        metrics.pueCategory = categorizePUE(basic.pue);
        
        // ISO/IEC 30134-9: Water Usage Effectiveness (WUE)
        metrics.wue = basic.wue;
        metrics.wueCategory = categorizeWUE(basic.wue);
        
        // ISO/IEC 30134-8: Carbon Usage Effectiveness (CUE)
        metrics.cue = basic.cue;
        metrics.cueCategory = categorizeCUE(basic.cue);
        
        // ISO/IEC 30134-3: Renewable Energy Factor (REF)
        metrics.ref = 0.20; // 20% renewable (example)
        
        // ISO/IEC 30134-4: Energy Reuse Factor (ERF)
        metrics.erf = 0.0; // No waste heat reuse (example)
        
        return metrics;
    }
    
    /**
     * Categorize PUE performance
     */
    private String categorizePUE(double pue) {
        if (pue < 1.2) return "EXCELLENT";
        if (pue < 1.5) return "GOOD";
        if (pue < 2.0) return "FAIR";
        return "POOR";
    }
    
    /**
     * Categorize WUE performance
     */
    private String categorizeWUE(double wue) {
        if (wue < 0.5) return "EXCELLENT";
        if (wue < 1.0) return "GOOD";
        if (wue < 2.0) return "FAIR";
        return "POOR";
    }
    
    /**
     * Categorize CUE performance
     */
    private String categorizeCUE(double cue) {
        if (cue < 0.3) return "EXCELLENT";
        if (cue < 0.5) return "GOOD";
        if (cue < 0.7) return "FAIR";
        return "POOR";
    }
    
    /**
     * Generate water usage metrics
     */
    private WaterMetrics generateWaterMetrics() {
        WaterMetrics metrics = new WaterMetrics();
        
        double coolingEnergy = workloadAgg.getTotalCoolingEnergyKWh();
        double itEnergy = workloadAgg.getTotalITEnergyKWh();
        
        // Estimate water usage (1.8 L/kWh for evaporative cooling)
        metrics.totalWaterUsageLiters = coolingEnergy * 1.8;
        metrics.totalWaterUsageM3 = metrics.totalWaterUsageLiters / 1000.0;
        metrics.wueAnnual = metrics.totalWaterUsageLiters / itEnergy;
        
        // Water stress assessment
        metrics.waterStressLevel = "HIGH"; // Phoenix, AZ
        metrics.regulatoryRisk = assessWaterRegulatoryRisk(metrics.wueAnnual, metrics.waterStressLevel);
        
        return metrics;
    }
    
    /**
     * Assess water regulatory risk
     */
    private String assessWaterRegulatoryRisk(double wue, String stressLevel) {
        if (stressLevel.equals("HIGH") || stressLevel.equals("VERY_HIGH")) {
            if (wue > 2.0) {
                return "CRITICAL - Permit denial risk in water-stressed region";
            } else if (wue > 1.5) {
                return "HIGH - May face regulatory scrutiny";
            } else {
                return "MODERATE - Monitor water usage trends";
            }
        }
        return "LOW - Adequate water availability";
    }
    
    /**
     * Assess compliance status
     */
    private ComplianceStatus assessCompliance() {
        ComplianceStatus status = new ComplianceStatus();
        
        // Thermal compliance (ASHRAE)
        int throttlingHours = workloadAgg.getThermalThrottlingHours();
        status.thermalCompliance = (throttlingHours < 88); // <1% of year
        status.thermalCompliancePercent = ((8760 - throttlingHours) * 100.0) / 8760;
        
        // Energy efficiency (EU EED)
        EnhancedSustainabilityKPIs.BasicKPIs basic = sustainabilityKPIs.calculateBasicKPIs();
        status.energyEfficiencyCompliance = (basic.pue < 1.5); // EU target
        
        // Water usage compliance
        status.waterUsageCompliance = (basic.wue < 2.0);
        
        // Overall compliance
        status.overallCompliance = status.thermalCompliance && 
                                  status.energyEfficiencyCompliance && 
                                  status.waterUsageCompliance;
        
        return status;
    }
    
    /**
     * Generate equipment lifecycle report
     */
    private EquipmentLifecycle generateEquipmentLifecycle() {
        EquipmentLifecycle lifecycle = new EquipmentLifecycle();
        
        lifecycle.refreshCycleYears = workloadAgg.getEquipmentRefreshYears();
        lifecycle.nextRefreshDate = LocalDateTime.now().plusYears((long)lifecycle.refreshCycleYears);
        lifecycle.embodiedCarbonPerRefreshKg = 120000.0; // 120 tons per refresh
        lifecycle.aiInfrastructurePremiumPercent = 15.0; // 15% premium for AI-ready
        
        return lifecycle;
    }
    
    /**
     * Export report to audit-ready format
     */
    public String exportToAuditFormat(ESGReport report) {
        StringBuilder sb = new StringBuilder();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        
        sb.append("═".repeat(75)).append("\n");
        sb.append("ESG SUSTAINABILITY REPORT (ISO/IEC 30134 COMPLIANT)\n");
        sb.append("═".repeat(75)).append("\n\n");
        
        sb.append("REPORT METADATA:\n");
        sb.append("  Facility: ").append(report.facilityName).append("\n");
        sb.append("  Reporting Period: ").append(report.reportingPeriod).append("\n");
        sb.append("  Generated: ").append(report.generatedAt.format(formatter)).append("\n");
        sb.append("  Standard: ISO/IEC 30134 Series\n\n");
        
        sb.append("ISO/IEC 30134 KEY PERFORMANCE INDICATORS:\n");
        sb.append("─".repeat(75)).append("\n");
        sb.append(String.format("  PUE (ISO 30134-2): %.3f [%s]\n", 
            report.iso30134Metrics.pue, report.iso30134Metrics.pueCategory));
        sb.append(String.format("  WUE (ISO 30134-9): %.2f L/kWh [%s]\n", 
            report.iso30134Metrics.wue, report.iso30134Metrics.wueCategory));
        sb.append(String.format("  CUE (ISO 30134-8): %.3f kg CO2/kWh [%s]\n", 
            report.iso30134Metrics.cue, report.iso30134Metrics.cueCategory));
        sb.append(String.format("  REF (ISO 30134-3): %.2f (%.0f%% renewable)\n", 
            report.iso30134Metrics.ref, report.iso30134Metrics.ref * 100));
        sb.append(String.format("  ERF (ISO 30134-4): %.2f\n\n", report.iso30134Metrics.erf));
        
        sb.append("SCOPE 1, 2, 3 CARBON EMISSIONS:\n");
        sb.append("─".repeat(75)).append("\n");
        sb.append(String.format("  Scope 1 (Direct): %.2f tons CO2e/year\n", 
            report.scopeEmissions.scope1AnnualKg / 1000.0));
        sb.append(String.format("  Scope 2 (Indirect): %.2f tons CO2e/year\n", 
            report.scopeEmissions.scope2AnnualKg / 1000.0));
        sb.append(String.format("  Scope 3 (Embodied): %.2f tons CO2e (lifecycle)\n", 
            report.scopeEmissions.scope3TotalKg / 1000.0));
        sb.append(String.format("  Total Lifecycle: %.2f tons CO2e\n\n", 
            report.scopeEmissions.totalLifecycleKg / 1000.0));
        
        sb.append("WATER USAGE METRICS:\n");
        sb.append("─".repeat(75)).append("\n");
        sb.append(String.format("  Total Water Usage: %.2f m³/year\n", 
            report.waterMetrics.totalWaterUsageM3));
        sb.append(String.format("  WUE (Annual): %.2f L/kWh\n", report.waterMetrics.wueAnnual));
        sb.append(String.format("  Water Stress Level: %s\n", report.waterMetrics.waterStressLevel));
        sb.append(String.format("  Regulatory Risk: %s\n\n", report.waterMetrics.regulatoryRisk));
        
        sb.append("COMPLIANCE STATUS:\n");
        sb.append("─".repeat(75)).append("\n");
        sb.append(String.format("  Thermal (ASHRAE): %s (%.2f%% uptime)\n", 
            report.complianceStatus.thermalCompliance ? "✅ COMPLIANT" : "❌ NON-COMPLIANT",
            report.complianceStatus.thermalCompliancePercent));
        sb.append(String.format("  Energy Efficiency (EU EED): %s\n", 
            report.complianceStatus.energyEfficiencyCompliance ? "✅ COMPLIANT" : "❌ NON-COMPLIANT"));
        sb.append(String.format("  Water Usage: %s\n", 
            report.complianceStatus.waterUsageCompliance ? "✅ COMPLIANT" : "❌ NON-COMPLIANT"));
        sb.append(String.format("  Overall: %s\n\n", 
            report.complianceStatus.overallCompliance ? "✅ COMPLIANT" : "❌ NON-COMPLIANT"));
        
        sb.append("EQUIPMENT LIFECYCLE:\n");
        sb.append("─".repeat(75)).append("\n");
        sb.append(String.format("  Refresh Cycle: %.1f years\n", 
            report.equipmentLifecycle.refreshCycleYears));
        sb.append(String.format("  Next Refresh: %s\n", 
            report.equipmentLifecycle.nextRefreshDate.format(formatter)));
        sb.append(String.format("  Embodied Carbon per Refresh: %.0f tons CO2e\n", 
            report.equipmentLifecycle.embodiedCarbonPerRefreshKg / 1000.0));
        sb.append(String.format("  AI Infrastructure Premium: %.0f%%\n\n", 
            report.equipmentLifecycle.aiInfrastructurePremiumPercent));
        
        sb.append("═".repeat(75)).append("\n");
        sb.append("END OF REPORT\n");
        sb.append("═".repeat(75)).append("\n");
        
        return sb.toString();
    }
    
    /**
     * Print ESG report
     */
    public void printReport(ESGReport report) {
        System.out.println(exportToAuditFormat(report));
    }
    
    // Inner classes for report structure
    public static class ESGReport {
        public String reportingPeriod;
        public LocalDateTime generatedAt;
        public String facilityName;
        public ISO30134Metrics iso30134Metrics;
        public EnhancedSustainabilityKPIs.ScopeEmissions scopeEmissions;
        public WaterMetrics waterMetrics;
        public ComplianceStatus complianceStatus;
        public EquipmentLifecycle equipmentLifecycle;
    }
    
    public static class ISO30134Metrics {
        public double pue;
        public String pueCategory;
        public double wue;
        public String wueCategory;
        public double cue;
        public String cueCategory;
        public double ref; // Renewable Energy Factor
        public double erf; // Energy Reuse Factor
    }
    
    public static class WaterMetrics {
        public double totalWaterUsageLiters;
        public double totalWaterUsageM3;
        public double wueAnnual;
        public String waterStressLevel;
        public String regulatoryRisk;
    }
    
    public static class ComplianceStatus {
        public boolean thermalCompliance;
        public double thermalCompliancePercent;
        public boolean energyEfficiencyCompliance;
        public boolean waterUsageCompliance;
        public boolean overallCompliance;
    }
    
    public static class EquipmentLifecycle {
        public double refreshCycleYears;
        public LocalDateTime nextRefreshDate;
        public double embodiedCarbonPerRefreshKg;
        public double aiInfrastructurePremiumPercent;
    }
}
