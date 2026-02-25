package com.acme.chilledwatersystem;

import com.acme.chilledwatersystem.WorkloadSituation.FeasibilityCheck;
import com.acme.chilledwatersystem.ClimateHazardModel.ExtremeHeatEvent;
import com.acme.chilledwatersystem.ClimateHazardModel.ClimateCompatibility;
import com.acme.chilledwatersystem.MacroeconomicModel.EconomicRiskAssessment;

/**
 * Phase 1 Part 2 Demo: Dynamic Workload-Aware Simulation
 * 
 * Demonstrates:
 * - AI Training, AI Inference, and Enterprise workload profiles
 * - Climate hazard scenarios (IPCC RCP scenarios, extreme heat)
 * - Macroeconomic modeling (inflation, carbon tax, construction costs)
 * - Feasibility decision matrix
 */
public class Phase1Part2Demo {
    
    public static void main(String[] args) {
        System.out.println("╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  PHASE 1 PART 2: DYNAMIC WORKLOAD-AWARE SIMULATION                   ║");
        System.out.println("║  Future-Proof Edge Data Center Analysis                              ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        // ===================================================================
        // SCENARIO 1: AI Training Workload in 2030
        // ===================================================================
        System.out.println("═".repeat(75));
        System.out.println("SCENARIO 1: AI TRAINING WORKLOAD - 2030");
        System.out.println("═".repeat(75));
        
        WorkloadSituation aiTraining = WorkloadSituation.createAITraining();
        aiTraining.applyClimateScenario("RCP4.5", 2030);
        aiTraining.setElectricityInflationRate(0.05); // 5% annual increase
        aiTraining.setCarbonTaxEscalationRate(0.06);
        
        System.out.println(aiTraining);
        System.out.println();
        
        // Feasibility check
        FeasibilityCheck feasibility1 = aiTraining.checkFeasibility(
            "AIR", 30.0, 25.0, 1.5
        );
        System.out.println(feasibility1);
        System.out.println();
        
        // Climate analysis
        ClimateHazardModel climate1 = new ClimateHazardModel(aiTraining);
        climate1.printClimateScenario(25.0, 20.0);
        
        ClimateCompatibility compat1 = climate1.checkClimateCompatibility(
            "AIR", 25.0, 20.0
        );
        System.out.println(compat1);
        System.out.println();
        
        // Economic projections
        MacroeconomicModel econ1 = new MacroeconomicModel(aiTraining);
        econ1.printProjections(0.12, 150000);
        
        double carbonCost1 = econ1.calculateCarbonCost(500000, 0.45, 2030);
        System.out.printf("Projected Annual Carbon Cost (2030): $%.2f\n\n", carbonCost1);
        
        EconomicRiskAssessment risk1 = econ1.assessEconomicRisk(carbonCost1, 8.5);
        risk1.printAssessment();
        
        // ===================================================================
        // SCENARIO 2: AI Inference Workload in 2040 with Climate Warming
        // ===================================================================
        System.out.println("\n" + "═".repeat(75));
        System.out.println("SCENARIO 2: AI INFERENCE WORKLOAD - 2040 (RCP8.5)");
        System.out.println("═".repeat(75));
        
        WorkloadSituation aiInference = WorkloadSituation.createAIInference();
        aiInference.applyClimateScenario("RCP8.5", 2040);
        aiInference.setElectricityInflationRate(0.06);
        aiInference.setCarbonTaxEscalationRate(0.07);
        
        System.out.println(aiInference);
        System.out.println();
        
        // Feasibility check
        FeasibilityCheck feasibility2 = aiInference.checkFeasibility(
            "CHILLED_WATER", 40.0, 28.0, 1.8
        );
        System.out.println(feasibility2);
        System.out.println();
        
        // Climate analysis
        ClimateHazardModel climate2 = new ClimateHazardModel(aiInference);
        climate2.printClimateScenario(28.0, 22.0);
        
        ClimateCompatibility compat2 = climate2.checkClimateCompatibility(
            "CHILLED_WATER", 28.0, 22.0
        );
        System.out.println(compat2);
        System.out.println();
        
        // Economic projections
        MacroeconomicModel econ2 = new MacroeconomicModel(aiInference);
        econ2.printProjections(0.12, 150000);
        
        double carbonCost2 = econ2.calculateCarbonCost(400000, 0.45, 2040);
        System.out.printf("Projected Annual Carbon Cost (2040): $%.2f\n\n", carbonCost2);
        
        EconomicRiskAssessment risk2 = econ2.assessEconomicRisk(carbonCost2, 12.0);
        risk2.printAssessment();
        
        // ===================================================================
        // SCENARIO 3: Extreme Heat Event (London 2022 / California 2022)
        // ===================================================================
        System.out.println("\n" + "═".repeat(75));
        System.out.println("SCENARIO 3: EXTREME HEAT EVENT - LONDON 2022 STYLE");
        System.out.println("═".repeat(75));
        
        WorkloadSituation extremeHeat = WorkloadSituation.createEnterprise();
        extremeHeat.applyClimateScenario("EXTREME", 2026);
        
        System.out.println(extremeHeat);
        System.out.println();
        
        ClimateHazardModel climate3 = new ClimateHazardModel(extremeHeat);
        
        // Simulate extreme heat event
        ExtremeHeatEvent heatEvent = climate3.simulateExtremeHeat(30.0, 48);
        System.out.println(heatEvent);
        System.out.println();
        
        // Check compatibility
        ClimateCompatibility compat3 = climate3.checkClimateCompatibility(
            "EVAPORATIVE", 30.0, 24.0
        );
        System.out.println(compat3);
        System.out.println();
        
        // ===================================================================
        // SCENARIO 4: Enterprise Workload in 2050 (Long-term Planning)
        // ===================================================================
        System.out.println("\n" + "═".repeat(75));
        System.out.println("SCENARIO 4: ENTERPRISE WORKLOAD - 2050 (LONG-TERM)");
        System.out.println("═".repeat(75));
        
        WorkloadSituation enterprise2050 = WorkloadSituation.createEnterprise();
        enterprise2050.applyClimateScenario("RCP4.5", 2050);
        enterprise2050.setElectricityInflationRate(0.04);
        enterprise2050.setCarbonTaxEscalationRate(0.05);
        
        System.out.println(enterprise2050);
        System.out.println();
        
        // Economic projections to 2050
        MacroeconomicModel econ4 = new MacroeconomicModel(enterprise2050);
        econ4.printProjections(0.12, 150000);
        
        double carbonCost4 = econ4.calculateCarbonCost(300000, 0.45, 2050);
        System.out.printf("Projected Annual Carbon Cost (2050): $%.2f\n", carbonCost4);
        System.out.printf("Carbon Tax Rate (2050): $%.0f/ton CO2\n\n", 
            econ4.calculateCarbonTaxPerTon(2050));
        
        // ===================================================================
        // FEASIBILITY DECISION MATRIX
        // ===================================================================
        System.out.println("\n" + "═".repeat(75));
        System.out.println("FEASIBILITY DECISION MATRIX");
        System.out.println("═".repeat(75));
        
        System.out.println("\n┌─────────────────────────────────────────────────────────────────────┐");
        System.out.println("│ Situation                    │ Cooling Type  │ Verdict              │");
        System.out.println("├─────────────────────────────────────────────────────────────────────┤");
        
        // Test 1: AI Training with Air Cooling
        WorkloadSituation test1 = WorkloadSituation.createAITraining();
        test1.setRackPowerDensityKW(75.0);
        FeasibilityCheck check1 = test1.checkFeasibility("AIR", 30.0, 25.0, 1.0);
        System.out.printf("│ AI Training (75 kW/rack)     │ Air Cooling   │ %-20s │\n", 
            check1.isFeasible ? "✅ FEASIBLE" : "❌ NOT FEASIBLE");
        
        // Test 2: AI Training with Liquid Cooling
        FeasibilityCheck check2 = test1.checkFeasibility("LIQUID", 100.0, 25.0, 0.5);
        System.out.printf("│ AI Training (75 kW/rack)     │ Liquid Cooling│ %-20s │\n",
            check2.isFeasible ? "✅ FEASIBLE" : "❌ NOT FEASIBLE");
        
        // Test 3: Extreme Heat with Evaporative
        WorkloadSituation test3 = WorkloadSituation.createEnterprise();
        test3.applyClimateScenario("EXTREME", 2026);
        FeasibilityCheck check3 = test3.checkFeasibility("EVAPORATIVE", 30.0, 45.0, 2.0);
        System.out.printf("│ Extreme Heat (45°C)          │ Evaporative   │ %-20s │\n",
            check3.isFeasible ? "✅ FEASIBLE" : "❌ NOT FEASIBLE");
        
        // Test 4: Water Scarcity Region
        WorkloadSituation test4 = WorkloadSituation.createEnterprise();
        FeasibilityCheck check4 = test4.checkFeasibility("CHILLED_WATER", 30.0, 25.0, 2.5);
        System.out.printf("│ Water Scarcity (WUE=2.5)     │ Chilled Water │ %-20s │\n",
            check4.isRisk ? "⚠️  RISK" : "✅ FEASIBLE");
        
        System.out.println("└─────────────────────────────────────────────────────────────────────┘\n");
        
        // ===================================================================
        // SUMMARY & RECOMMENDATIONS
        // ===================================================================
        System.out.println("═".repeat(75));
        System.out.println("KEY INSIGHTS & RECOMMENDATIONS");
        System.out.println("═".repeat(75));
        
        System.out.println("\n1. AI TRAINING WORKLOADS:");
        System.out.println("   • Require liquid cooling for densities >30 kW/rack");
        System.out.println("   • Plan for 15% CAPEX premium for AI-ready infrastructure");
        System.out.println("   • Load factor: 96% sustained utilization");
        
        System.out.println("\n2. CLIMATE SCENARIOS:");
        System.out.println("   • RCP4.5 (2040): +1.5°C → 10-15% efficiency loss");
        System.out.println("   • RCP8.5 (2040): +2.5°C → 20-25% efficiency loss");
        System.out.println("   • Extreme heat: System throttling in <2 hours without upgrades");
        
        System.out.println("\n3. ECONOMIC PROJECTIONS:");
        System.out.println("   • Electricity rates: +50-70% by 2040 (data center demand growth)");
        System.out.println("   • Carbon tax: $254/ton (2030) → $800/ton (2050)");
        System.out.println("   • Construction inflation: 8% CAGR for AI-ready facilities");
        
        System.out.println("\n4. FEASIBILITY THRESHOLDS:");
        System.out.println("   • Air cooling: <30 kW/rack, <35°C ambient");
        System.out.println("   • Evaporative: <40°C ambient, <28°C wet-bulb");
        System.out.println("   • Chilled water: Effective to 45°C, but efficiency degrades");
        System.out.println("   • Water scarcity: WUE >2.0 L/kWh faces regulatory risk");
        
        System.out.println("\n" + "═".repeat(75));
        System.out.println("\n✅ Phase 1 Part 2 Implementation Complete!");
        System.out.println("   Dynamic workload profiles, climate scenarios, and economic modeling");
        System.out.println("   are now integrated into the chilled water system analysis.\n");
    }
}
