package com.acme.chilledwatersystem;

/**
 * Phase 3 Part 3 - Phase 5: Dynamic Go/No-Go Decision Logic
 * 
 * Provides feasibility verdicts based on workload, climate, and economic factors.
 * Implements multi-criteria decision logic with clear justifications.
 */
public class DynamicDecisionEngine {
    
    private final WorkloadAggregator workloadAgg;
    private final ClimateRiskAssessor climateRisk;
    private final EscalatedFinancialAnalyzer financialAnalyzer;
    private final EnhancedSustainabilityKPIs sustainabilityKPIs;
    private final EdgeDataCenterScenario scenario;
    
    public DynamicDecisionEngine(WorkloadAggregator workloadAgg,
                                ClimateRiskAssessor climateRisk,
                                EscalatedFinancialAnalyzer financialAnalyzer,
                                EnhancedSustainabilityKPIs sustainabilityKPIs,
                                EdgeDataCenterScenario scenario) {
        this.workloadAgg = workloadAgg;
        this.climateRisk = climateRisk;
        this.financialAnalyzer = financialAnalyzer;
        this.sustainabilityKPIs = sustainabilityKPIs;
        this.scenario = scenario;
    }
    
    /**
     * Generate comprehensive feasibility verdict
     */
    public FeasibilityVerdict generateVerdict(String coolingType, double rackDensityKW, 
                                              String waterStressLevel, int horizon) {
        FeasibilityVerdict verdict = new FeasibilityVerdict();
        verdict.coolingType = coolingType;
        verdict.rackDensityKW = rackDensityKW;
        verdict.waterStressLevel = waterStressLevel;
        
        // Criterion 1: Rack Density vs Cooling Capability
        DecisionCriterion densityCriterion = assessRackDensity(coolingType, rackDensityKW);
        verdict.criteria.add(densityCriterion);
        
        // Criterion 2: Water Stress Compatibility
        DecisionCriterion waterCriterion = assessWaterStress(coolingType, waterStressLevel);
        verdict.criteria.add(waterCriterion);
        
        // Criterion 3: Thermal Compliance
        DecisionCriterion thermalCriterion = assessThermalCompliance();
        verdict.criteria.add(thermalCriterion);
        
        // Criterion 4: Financial Viability
        DecisionCriterion financialCriterion = assessFinancialViability(horizon);
        verdict.criteria.add(financialCriterion);
        
        // Criterion 5: Climate Resilience
        DecisionCriterion climateCriterion = assessClimateResilience(coolingType);
        verdict.criteria.add(climateCriterion);
        
        // Calculate overall verdict
        int passCount = 0;
        int criticalFailCount = 0;
        
        for (DecisionCriterion criterion : verdict.criteria) {
            if (criterion.status == CriterionStatus.PASS) {
                passCount++;
            } else if (criterion.status == CriterionStatus.CRITICAL_FAIL) {
                criticalFailCount++;
            }
        }
        
        // Decision logic
        if (criticalFailCount > 0) {
            verdict.overallDecision = "NO-GO";
            verdict.confidence = "HIGH";
            verdict.summary = String.format(
                "System has %d critical failure(s) that make it non-viable. Immediate redesign required.",
                criticalFailCount
            );
        } else if (passCount >= 4) {
            verdict.overallDecision = "GO";
            verdict.confidence = "HIGH";
            verdict.summary = String.format(
                "System meets %d of 5 criteria. Proceed with implementation.",
                passCount
            );
        } else if (passCount >= 3) {
            verdict.overallDecision = "CONDITIONAL GO";
            verdict.confidence = "MODERATE";
            verdict.summary = String.format(
                "System meets %d of 5 criteria. Address warnings before proceeding.",
                passCount
            );
        } else {
            verdict.overallDecision = "NO-GO";
            verdict.confidence = "MODERATE";
            verdict.summary = String.format(
                "System meets only %d of 5 criteria. Significant improvements needed.",
                passCount
            );
        }
        
        return verdict;
    }
    
    /**
     * Assess rack density vs cooling capability
     */
    private DecisionCriterion assessRackDensity(String coolingType, double rackDensityKW) {
        DecisionCriterion criterion = new DecisionCriterion();
        criterion.name = "Rack Density vs Cooling Capability";
        
        if (rackDensityKW > 40.0 && coolingType.equalsIgnoreCase("AIR")) {
            criterion.status = CriterionStatus.CRITICAL_FAIL;
            criterion.justification = String.format(
                "Rack density of %.0f kW/rack exceeds air cooling limits (40 kW/rack). " +
                "Air cooling requires storm-level airflow (%.0f CFM/rack) which is physically impractical.",
                rackDensityKW, rackDensityKW * 160
            );
            criterion.recommendation = "LIQUID COOLING REQUIRED - Switch to direct-to-chip or rear-door heat exchangers";
        } else if (rackDensityKW > 30.0 && coolingType.equalsIgnoreCase("AIR")) {
            criterion.status = CriterionStatus.WARNING;
            criterion.justification = String.format(
                "Rack density of %.0f kW/rack is at the upper limit of air cooling. " +
                "May experience thermal throttling during peak loads.",
                rackDensityKW
            );
            criterion.recommendation = "Consider hybrid cooling or oversized air handling";
        } else {
            criterion.status = CriterionStatus.PASS;
            criterion.justification = String.format(
                "Rack density of %.0f kW/rack is compatible with %s cooling.",
                rackDensityKW, coolingType
            );
            criterion.recommendation = "";
        }
        
        return criterion;
    }
    
    /**
     * Assess water stress compatibility
     */
    private DecisionCriterion assessWaterStress(String coolingType, String waterStressLevel) {
        DecisionCriterion criterion = new DecisionCriterion();
        criterion.name = "Water Stress Compatibility";
        
        EnhancedSustainabilityKPIs.BasicKPIs kpis = sustainabilityKPIs.calculateBasicKPIs();
        
        if (waterStressLevel.equalsIgnoreCase("VERY_HIGH") && kpis.wue > 1.5) {
            criterion.status = CriterionStatus.CRITICAL_FAIL;
            criterion.justification = String.format(
                "WUE of %.2f L/kWh in Very High water stress region faces extreme regulatory risk. " +
                "Evaporative cooling (WUE > 1.5) is prohibited in drought-prone counties.",
                kpis.wue
            );
            criterion.recommendation = "CLOSED-LOOP ONLY - Switch to air-cooled chillers or dry coolers";
        } else if (waterStressLevel.equalsIgnoreCase("HIGH") && kpis.wue > 2.0) {
            criterion.status = CriterionStatus.WARNING;
            criterion.justification = String.format(
                "WUE of %.2f L/kWh may face public scrutiny in water-stressed region.",
                kpis.wue
            );
            criterion.recommendation = "Consider hybrid system with reduced water usage";
        } else {
            criterion.status = CriterionStatus.PASS;
            criterion.justification = String.format(
                "WUE of %.2f L/kWh is acceptable for %s water stress region.",
                kpis.wue, waterStressLevel
            );
            criterion.recommendation = "";
        }
        
        return criterion;
    }
    
    /**
     * Assess thermal compliance
     */
    private DecisionCriterion assessThermalCompliance() {
        DecisionCriterion criterion = new DecisionCriterion();
        criterion.name = "Thermal Compliance (ASHRAE)";
        
        int throttlingHours = workloadAgg.getThermalThrottlingHours();
        double throttlingPercent = (throttlingHours * 100.0) / 8760;
        
        if (throttlingHours > 876) { // >10% of year
            criterion.status = CriterionStatus.CRITICAL_FAIL;
            criterion.justification = String.format(
                "System experiences %d hours (%.1f%%) of thermal throttling annually. " +
                "High-density AI hardware (Class H1) requires 18-27°C inlet air. " +
                "Exceeding this causes performance loss and revenue impact.",
                throttlingHours, throttlingPercent
            );
            criterion.recommendation = "Increase cooling capacity or reduce rack density";
        } else if (throttlingHours > 88) { // >1% of year
            criterion.status = CriterionStatus.WARNING;
            criterion.justification = String.format(
                "System experiences %d hours (%.1f%%) of thermal throttling. " +
                "Acceptable but may impact SLA compliance.",
                throttlingHours, throttlingPercent
            );
            criterion.recommendation = "Monitor thermal performance and plan for upgrades";
        } else {
            criterion.status = CriterionStatus.PASS;
            criterion.justification = String.format(
                "Excellent thermal compliance: %d hours (%.2f%%) of throttling.",
                throttlingHours, throttlingPercent
            );
            criterion.recommendation = "";
        }
        
        return criterion;
    }
    
    /**
     * Assess financial viability
     */
    private DecisionCriterion assessFinancialViability(int horizon) {
        DecisionCriterion criterion = new DecisionCriterion();
        criterion.name = "Financial Viability (NPV & Payback)";
        
        double annualSavings = 50000.0; // Simplified - should come from actual calculation
        double differentialCAPEX = 200000.0; // Simplified
        
        double npv = financialAnalyzer.calculateEscalatedNPV(annualSavings, differentialCAPEX, horizon);
        double payback = financialAnalyzer.calculateInflationAdjustedPayback(differentialCAPEX, annualSavings);
        
        if (npv < -100000) {
            criterion.status = CriterionStatus.CRITICAL_FAIL;
            criterion.justification = String.format(
                "Negative NPV of $%.0f with carbon tax makes design financially unviable by 2040. " +
                "High grid intensity and projected carbon taxes of $800/ton create unsustainable costs.",
                npv
            );
            criterion.recommendation = "REVISE DESIGN - Consider renewable energy or alternative cooling";
        } else if (npv < 0) {
            criterion.status = CriterionStatus.WARNING;
            criterion.justification = String.format(
                "Negative NPV of $%.0f indicates marginal financial viability.",
                npv
            );
            criterion.recommendation = "Explore cost reduction opportunities";
        } else if (payback > 15) {
            criterion.status = CriterionStatus.WARNING;
            criterion.justification = String.format(
                "Positive NPV of $%.0f but long payback period of %.1f years.",
                npv, payback
            );
            criterion.recommendation = "Acceptable for long-term strategic investments";
        } else {
            criterion.status = CriterionStatus.PASS;
            criterion.justification = String.format(
                "Strong financial case: NPV of $%.0f with %.1f-year payback.",
                npv, payback
            );
            criterion.recommendation = "";
        }
        
        return criterion;
    }
    
    /**
     * Assess climate resilience
     */
    private DecisionCriterion assessClimateResilience(String coolingType) {
        DecisionCriterion criterion = new DecisionCriterion();
        criterion.name = "Climate Resilience (2050 Projection)";
        
        ClimateRiskAssessor.ThermalStressTest stressTest = 
            climateRisk.perform2050StressTest(coolingType);
        ClimateRiskAssessor.OperationalRisk risk = 
            climateRisk.assessOperationalRisk(stressTest);
        
        if (risk.overallRiskLevel.equals("CRITICAL")) {
            criterion.status = CriterionStatus.CRITICAL_FAIL;
            criterion.justification = String.format(
                "System will experience %d hours of thermal throttling annually by 2050. " +
                "Climate warming of +%.1f°C makes current design non-viable.",
                stressTest.future2050ThrottlingHours, stressTest.warmingShiftC
            );
            
            if (stressTest.trainingTimeIncrease2050 > 0) {
                criterion.justification += String.format(
                    " AI training time will increase by %.1f%%, causing $%.0fK annual revenue loss.",
                    stressTest.trainingTimeIncrease2050, stressTest.revenueImpactUSD / 1000.0
                );
            }
            
            criterion.recommendation = risk.overallRecommendation;
        } else if (risk.overallRiskLevel.equals("HIGH")) {
            criterion.status = CriterionStatus.WARNING;
            criterion.justification = String.format(
                "System faces high climate risk by 2050 (Risk Score: %d/30). " +
                "Efficiency will degrade by %.0f%%.",
                risk.overallRiskScore, stressTest.efficiencyDegradation2050 * 100
            );
            criterion.recommendation = risk.overallRecommendation;
        } else {
            criterion.status = CriterionStatus.PASS;
            criterion.justification = String.format(
                "System is resilient to 2050 climate projections (Risk Score: %d/30).",
                risk.overallRiskScore
            );
            criterion.recommendation = "";
        }
        
        return criterion;
    }
    
    /**
     * Print comprehensive decision report
     */
    public void printDecisionReport(FeasibilityVerdict verdict) {
        System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  DYNAMIC GO/NO-GO DECISION REPORT                                     ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        System.out.println("SYSTEM CONFIGURATION:");
        System.out.printf("  Cooling Type: %s\n", verdict.coolingType);
        System.out.printf("  Rack Density: %.1f kW/rack\n", verdict.rackDensityKW);
        System.out.printf("  Water Stress Level: %s\n", verdict.waterStressLevel);
        System.out.println();
        
        System.out.println("DECISION CRITERIA ASSESSMENT:");
        System.out.println("─".repeat(75));
        
        for (int i = 0; i < verdict.criteria.size(); i++) {
            DecisionCriterion criterion = verdict.criteria.get(i);
            String statusIcon = getStatusIcon(criterion.status);
            
            System.out.printf("\n%d. %s: %s %s\n", 
                i + 1, criterion.name, statusIcon, criterion.status);
            System.out.printf("   %s\n", criterion.justification);
            
            if (!criterion.recommendation.isEmpty()) {
                System.out.printf("   → %s\n", criterion.recommendation);
            }
        }
        
        System.out.println("\n" + "─".repeat(75));
        System.out.println("\nOVERALL DECISION:");
        System.out.printf("  Verdict: %s\n", verdict.overallDecision);
        System.out.printf("  Confidence: %s\n", verdict.confidence);
        System.out.printf("  Summary: %s\n", verdict.summary);
        System.out.println();
        
        // Final engineering recommendation
        if (verdict.overallDecision.equals("GO")) {
            System.out.println("✅ RECOMMENDATION: Proceed with implementation");
        } else if (verdict.overallDecision.equals("CONDITIONAL GO")) {
            System.out.println("⚠️  RECOMMENDATION: Address warnings before proceeding");
        } else {
            System.out.println("❌ RECOMMENDATION: Do not proceed - significant redesign required");
        }
        System.out.println();
    }
    
    private String getStatusIcon(CriterionStatus status) {
        switch (status) {
            case PASS:
                return "✅";
            case WARNING:
                return "⚠️ ";
            case CRITICAL_FAIL:
                return "❌";
            default:
                return "  ";
        }
    }
    
    /**
     * Enum for criterion status
     */
    public enum CriterionStatus {
        PASS,
        WARNING,
        CRITICAL_FAIL
    }
    
    /**
     * Inner class for decision criterion
     */
    public static class DecisionCriterion {
        public String name;
        public CriterionStatus status;
        public String justification;
        public String recommendation;
    }
    
    /**
     * Inner class for feasibility verdict
     */
    public static class FeasibilityVerdict {
        public String coolingType;
        public double rackDensityKW;
        public String waterStressLevel;
        public java.util.List<DecisionCriterion> criteria = new java.util.ArrayList<>();
        public String overallDecision;
        public String confidence;
        public String summary;
    }
}
