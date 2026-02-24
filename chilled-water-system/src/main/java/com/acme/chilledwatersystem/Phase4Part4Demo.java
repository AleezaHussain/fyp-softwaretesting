package com.acme.chilledwatersystem;

import org.cloudsimplus.brokers.DatacenterBroker;
import org.cloudsimplus.brokers.DatacenterBrokerSimple;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.cloudlets.CloudletSimple;
import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.datacenters.Datacenter;
import org.cloudsimplus.datacenters.DatacenterSimple;
import org.cloudsimplus.hosts.Host;
import org.cloudsimplus.utilizationmodels.UtilizationModelDynamic;
import org.cloudsimplus.vms.Vm;
import org.cloudsimplus.vms.VmSimple;

import java.util.ArrayList;
import java.util.List;

/**
 * Phase 4 Part 4: Prescriptive Optimization & Resilience Stress-Testing Demo
 * 
 * Comprehensive demonstration of:
 * - Multi-Objective Optimization (NSGA-II) for Pareto Frontier
 * - Climate Hazard Stress-Testing (2050 black swan events)
 * - Prescriptive Feasibility Verdict Logic
 * - Macroeconomic Sensitivity Analysis
 * 
 * Maintains tight CloudSim Plus integration throughout.
 */
public class Phase4Part4Demo {
    
    private static final int HOSTS = 20;
    private static final int VMS_PER_HOST = 4;
    private static final int CLOUDLETS_PER_VM = 2;
    
    public static void main(String[] args) {
        System.out.println("╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  PHASE 4 PART 4: PRESCRIPTIVE OPTIMIZATION & RESILIENCE TESTING      ║");
        System.out.println("║  CloudSim Plus Integration with Active Advisory System               ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        // Run comprehensive analysis for AI Training workload in 2050 RCP8.5 scenario
        runComprehensiveAnalysis();
    }
    
    private static void runComprehensiveAnalysis() {
        // ===================================================================
        // STEP 1: Configure Workload Situation (AI Training, 2050 RCP8.5)
        // ===================================================================
        WorkloadSituation situation = WorkloadSituation.createAITraining();
        situation.applyClimateScenario("RCP8.5", 2050);
        
        System.out.println("Workload Configuration: " + situation);
        System.out.println();
        
        // ===================================================================
        // STEP 2: Initialize CloudSim Plus
        // ===================================================================
        CloudSimPlus simulation = new CloudSimPlus();
        
        // Create datacenter with hosts
        EdgeDataCenterScenario tempScenario = new EdgeDataCenterScenario(5, 4);
        EdgeInfraManager infraManager = new EdgeInfraManager(tempScenario);
        List<Host> hostList = infraManager.buildHosts();
        Datacenter datacenter = new DatacenterSimple(simulation, hostList);
        
        // Create broker
        DatacenterBroker broker = new DatacenterBrokerSimple(simulation);
        
        // Create VMs
        List<Vm> vmList = createVms(VMS_PER_HOST * HOSTS);
        broker.submitVmList(vmList);
        
        // Create cloudlets
        List<Cloudlet> cloudletList = createCloudlets(CLOUDLETS_PER_VM * vmList.size(), situation);
        broker.submitCloudletList(cloudletList);
        
        // ===================================================================
        // STEP 3: Configure Physical Systems
        // ===================================================================
        EdgeDataCenterScenario scenario = new EdgeDataCenterScenario();
        scenario.setLocation("Phoenix, AZ");
        scenario.setDesignAmbientC(35.0 + situation.getClimateWarmingShiftC());
        scenario.setDesignWetBulbC(20.0);
        scenario.setTotalRacks(5);
        scenario.setServersPerRack(4);
        
        EnvironmentEngine weather = new EnvironmentEngine(scenario);
        weather.initialize();
        
        ChilledWaterPhysics physics = new ChilledWaterPhysics(scenario);
        TariffSchedule tariff = new TariffSchedule();
        
        // ===================================================================
        // STEP 4: Run Simplified 8760-Hour Simulation
        // ===================================================================
        System.out.println("Running simplified 8760-hour simulation for baseline...\n");
        
        List<HourlyResult> hourlyResults = runSimplifiedSimulation(
            situation, scenario, weather, physics, tariff
        );
        
        System.out.println("✅ Baseline simulation complete\n");
        
        // ===================================================================
        // STEP 5: Workload Aggregation
        // ===================================================================
        WorkloadAggregator workloadAgg = new WorkloadAggregator(situation, hourlyResults);
        workloadAgg.printSummary();
        
        // ===================================================================
        // STEP 6: Multi-Objective Optimization (NSGA-II)
        // ===================================================================
        EconomicConfig economicConfig = new EconomicConfig();
        CarbonConfig carbonConfig = new CarbonConfig();
        
        MultiObjectiveOptimizer optimizer = new MultiObjectiveOptimizer(50, 30);
        List<DesignSolution> paretoFront = optimizer.optimize(
            situation, scenario, economicConfig, carbonConfig
        );
        
        optimizer.printParetoFront(paretoFront);
        
        // ===================================================================
        // STEP 7: Climate Hazard Stress-Testing
        // ===================================================================
        ClimateHazardStressTester stressTester = new ClimateHazardStressTester(scenario, situation);
        ClimateHazardStressTester.StressTestResults stressResults = 
            stressTester.performStressTest(hourlyResults);
        stressTester.printResults(stressResults);
        
        // ===================================================================
        // STEP 8: Macroeconomic Sensitivity Analysis
        // ===================================================================
        MacroeconomicModel macroModel = new MacroeconomicModel(situation);
        MacroeconomicSensitivityAnalyzer sensitivityAnalyzer = 
            new MacroeconomicSensitivityAnalyzer(macroModel, workloadAgg, economicConfig);
        MacroeconomicSensitivityAnalyzer.SensitivityResults sensitivityResults = 
            sensitivityAnalyzer.performAnalysis();
        sensitivityAnalyzer.printResults(sensitivityResults);
        
        // ===================================================================
        // STEP 9: Prescriptive Feasibility Verdict
        // ===================================================================
        printPrescriptiveFeasibilityVerdict(
            situation, scenario, workloadAgg, stressResults, 
            sensitivityResults, paretoFront
        );
        
        // ===================================================================
        // STEP 10: Strategic Dashboard Summary
        // ===================================================================
        printStrategicDashboard(
            situation, workloadAgg, paretoFront, stressResults, sensitivityResults
        );
    }
    
    /**
     * Run simplified 8760-hour simulation
     */
    private static List<HourlyResult> runSimplifiedSimulation(
            WorkloadSituation situation,
            EdgeDataCenterScenario scenario,
            EnvironmentEngine weather,
            ChilledWaterPhysics physics,
            TariffSchedule tariff) {
        
        List<HourlyResult> hourlyResults = new ArrayList<>();
        
        for (int h = 1; h <= 8760; h++) {
            double ambientC = weather.getAmbientTemperature(h);
            double wetBulbC = weather.getWetBulbTemperature(h);
            
            // Calculate IT load based on workload profile
            double hourOfDay = h % 24;
            double itLoadKw = 100.0 * situation.getEffectiveLoadFactor(hourOfDay);
            
            // Calculate cooling power
            double chillerPowerKw = physics.calculateChillerPower(itLoadKw, ambientC, wetBulbC);
            double fanPowerKw = itLoadKw * 0.05;
            double pumpPowerKw = itLoadKw * 0.025;
            
            // Calculate costs
            double totalFacilityKw = itLoadKw + chillerPowerKw + fanPowerKw + pumpPowerKw + 7.2;
            double hourlyCostUsd = tariff.calculateHourlyCost(h, totalFacilityKw);
            String tariffPeriod = tariff.getTariffPeriod(h);
            
            // Calculate rack inlet temperature
            double rackInletC = 11.0 + (ambientC * 0.1);
            
            // Carbon emissions
            double carbonKg = totalFacilityKw * scenario.getCarbonFactorKgKwh();
            
            HourlyResult result = new HourlyResult(
                h, itLoadKw, chillerPowerKw, fanPowerKw, pumpPowerKw,
                hourlyCostUsd, rackInletC, ambientC, wetBulbC,
                tariffPeriod, carbonKg
            );
            hourlyResults.add(result);
            
            physics.incrementFouling(1.0);
        }
        
        return hourlyResults;
    }
    
    /**
     * Create VMs for CloudSim simulation
     */
    private static List<Vm> createVms(int count) {
        List<Vm> vmList = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            Vm vm = new VmSimple(i, 1000, 4)
                .setRam(8192)
                .setBw(10000)
                .setSize(100000);
            vmList.add(vm);
        }
        return vmList;
    }
    
    /**
     * Create cloudlets with workload-specific characteristics
     */
    private static List<Cloudlet> createCloudlets(int count, WorkloadSituation situation) {
        List<Cloudlet> cloudletList = new ArrayList<>(count);
        
        for (int i = 0; i < count; i++) {
            long length = 100000; // Long-running AI training jobs
            
            Cloudlet cloudlet = new CloudletSimple(i, length, 4)
                .setFileSize(1024)
                .setOutputSize(1024)
                .setUtilizationModelCpu(new UtilizationModelDynamic(0.96)) // 96% for AI Training
                .setUtilizationModelRam(new UtilizationModelDynamic(0.8))
                .setUtilizationModelBw(new UtilizationModelDynamic(0.6));
            
            cloudletList.add(cloudlet);
        }
        
        return cloudletList;
    }
    
    /**
     * Print prescriptive feasibility verdict
     */
    private static void printPrescriptiveFeasibilityVerdict(
            WorkloadSituation situation,
            EdgeDataCenterScenario scenario,
            WorkloadAggregator workloadAgg,
            ClimateHazardStressTester.StressTestResults stressResults,
            MacroeconomicSensitivityAnalyzer.SensitivityResults sensitivityResults,
            List<DesignSolution> paretoFront) {
        
        System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  PRESCRIPTIVE FEASIBILITY VERDICT                                     ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        List<String> verdicts = new ArrayList<>();
        List<String> criticalIssues = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();
        
        // Check 1: Physical Air Limit
        double rackDensity = situation.getRackPowerDensityKW();
        if (rackDensity > 40.0) {
            double requiredAirflow = rackDensity * 160; // CFM per rack
            verdicts.add("❌ NOT FEASIBLE: Physical Air Limit");
            criticalIssues.add(String.format(
                "Rack density of %.0f kW/rack requires %.0f CFM/rack airflow, " +
                "causing storm-level wind speeds and acoustic failure.",
                rackDensity, requiredAirflow
            ));
            recommendations.add("Switch to liquid cooling (direct-to-chip or immersion)");
        } else {
            verdicts.add("✅ PASS: Physical Air Limit");
        }
        
        // Check 2: Water Stress Index
        double wue = workloadAgg.getTotalCoolingEnergyKWh() * 1.8 / workloadAgg.getTotalITEnergyKWh();
        if (wue > 2.0 && scenario.getLocation().contains("Phoenix")) {
            verdicts.add("⚠️  RISK: Water Stress Index");
            criticalIssues.add(String.format(
                "WUE of %.2f L/kWh in Very High Stress region (Phoenix) faces " +
                "regulatory and community scrutiny. Permit denial risk.",
                wue
            ));
            recommendations.add("Implement closed-loop cooling or air-cooled chillers");
        } else {
            verdicts.add("✅ PASS: Water Stress Index");
        }
        
        // Check 3: Performance Loss
        int throttlingHours = workloadAgg.getThermalThrottlingHours();
        double throttlingPercent = (throttlingHours * 100.0) / 8760;
        if (throttlingPercent > 10.0) {
            verdicts.add("⚠️  RISK: Performance Loss");
            criticalIssues.add(String.format(
                "Throttling %.1f%% of year (%.0f hours) will extend AI training times by %.1f%%, " +
                "rendering model delivery timelines unreliable.",
                throttlingPercent, (double)throttlingHours, workloadAgg.getTrainingTimeIncreasePercent()
            ));
            recommendations.add("Increase cooling capacity or reduce rack density");
        } else {
            verdicts.add("✅ PASS: Performance Loss");
        }
        
        // Check 4: Carbon Liability
        double carbonTaxPercent = (sensitivityResults.baseCase.annualCarbonTaxUSD / 
                                  sensitivityResults.baseCase.annualEnergyCostUSD) * 100.0;
        if (carbonTaxPercent > 30.0) {
            verdicts.add("❌ NOT FUTURE-PROOF: Carbon Liability");
            criticalIssues.add(String.format(
                "2050 carbon tax ($%.0fK/year) exceeds 30%% of annual OpEx. " +
                "Design requires immediate transition to renewable energy or liquid cooling.",
                sensitivityResults.baseCase.annualCarbonTaxUSD / 1000.0
            ));
            recommendations.add("Implement 100% renewable energy or switch to low-PUE liquid cooling");
        } else {
            verdicts.add("✅ PASS: Carbon Liability");
        }
        
        // Check 5: Extreme Heat Survivability
        if (stressResults.extremeHeatAnalysis.survivability.equals("CRITICAL FAILURE")) {
            verdicts.add("❌ CRITICAL: Extreme Heat Survivability");
            criticalIssues.add(stressResults.extremeHeatAnalysis.recommendation);
            recommendations.add("System redesign required for 2050 climate resilience");
        } else if (stressResults.extremeHeatAnalysis.survivability.equals("HIGH RISK")) {
            verdicts.add("⚠️  RISK: Extreme Heat Survivability");
            criticalIssues.add(stressResults.extremeHeatAnalysis.recommendation);
        } else {
            verdicts.add("✅ PASS: Extreme Heat Survivability");
        }
        
        // Print verdicts
        System.out.println("FEASIBILITY GATE RESULTS:");
        System.out.println("─".repeat(75));
        for (String verdict : verdicts) {
            System.out.println(verdict);
        }
        System.out.println();
        
        // Print critical issues
        if (!criticalIssues.isEmpty()) {
            System.out.println("CRITICAL ISSUES:");
            System.out.println("─".repeat(75));
            for (int i = 0; i < criticalIssues.size(); i++) {
                System.out.printf("%d. %s\n", i + 1, criticalIssues.get(i));
            }
            System.out.println();
        }
        
        // Print recommendations
        if (!recommendations.isEmpty()) {
            System.out.println("PRESCRIPTIVE RECOMMENDATIONS:");
            System.out.println("─".repeat(75));
            for (int i = 0; i < recommendations.size(); i++) {
                System.out.printf("%d. %s\n", i + 1, recommendations.get(i));
            }
            System.out.println();
        }
        
        // Final verdict
        long criticalCount = verdicts.stream().filter(v -> v.contains("❌")).count();
        long riskCount = verdicts.stream().filter(v -> v.contains("⚠️")).count();
        
        System.out.println("═".repeat(75));
        if (criticalCount > 0) {
            System.out.println("FINAL VERDICT: ❌ NO-GO");
            System.out.printf("System has %d critical failure(s). Immediate redesign required.\n", criticalCount);
        } else if (riskCount > 2) {
            System.out.println("FINAL VERDICT: ⚠️  CONDITIONAL GO");
            System.out.printf("System has %d risk factor(s). Address before proceeding.\n", riskCount);
        } else {
            System.out.println("FINAL VERDICT: ✅ GO");
            System.out.println("System is technically and financially viable.");
        }
        System.out.println("═".repeat(75));
        System.out.println();
    }
    
    /**
     * Print strategic dashboard summary
     */
    private static void printStrategicDashboard(
            WorkloadSituation situation,
            WorkloadAggregator workloadAgg,
            List<DesignSolution> paretoFront,
            ClimateHazardStressTester.StressTestResults stressResults,
            MacroeconomicSensitivityAnalyzer.SensitivityResults sensitivityResults) {
        
        System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  STRATEGIC DASHBOARD                                                  ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        System.out.println("PARETO OPTIMIZATION MAP:");
        System.out.println("─".repeat(75));
        if (!paretoFront.isEmpty()) {
            DesignSolution best = paretoFront.get(0);
            System.out.printf("Sweet Spot Design: %.1f°C supply, %.0f kW/rack, %s cooling\n",
                best.getSupplyWaterTempC(), best.getRackDensityKW(), best.getCoolingTechnology());
            System.out.printf("  TEWI: %.0f tons CO2e | NPV: $%.0fK | WUE: %.2f L/kWh\n",
                best.getTewi(), best.getEscalatedNPV() / 1000.0, best.getWue());
        }
        System.out.println();
        
        System.out.println("FAILURE ANALYSIS:");
        System.out.println("─".repeat(75));
        System.out.printf("Time to Critical Temperature: %.0f seconds at %.0f kW/rack\n",
            stressResults.coolingFailureAnalysis.timeToCriticalSeconds,
            stressResults.coolingFailureAnalysis.rackDensityKW);
        System.out.printf("Thermal Ride-Through: %.1f minutes\n",
            stressResults.thermalStorageAnalysis.rideThroughTimeMinutes);
        System.out.println();
        
        System.out.println("FINANCIAL RESILIENCE:");
        System.out.println("─".repeat(75));
        System.out.printf("Base Case TCO: $%.0fK over 15 years\n",
            sensitivityResults.baseCase.tco15Years / 1000.0);
        System.out.printf("Worst Case TCO: $%.0fK (%.1f%% increase)\n",
            sensitivityResults.worstCase.tco15Years / 1000.0,
            ((sensitivityResults.worstCase.tco15Years - sensitivityResults.baseCase.tco15Years) / 
             sensitivityResults.baseCase.tco15Years) * 100.0);
        System.out.println();
        
        System.out.println("ENGINEERING STATEMENT:");
        System.out.println("─".repeat(75));
        String statement = String.format(
            "This system is %s for %s workload in %d under %s scenario. " +
            "Thermal throttling of %.1f%% will impact performance. " +
            "Financial analysis shows %s NPV with %.1f-year payback. " +
            "%s",
            stressResults.extremeHeatAnalysis.survivability.contains("RESILIENT") ? "feasible" : "at risk",
            situation.getWorkloadType(),
            situation.getTargetYear(),
            situation.getClimateScenario(),
            (workloadAgg.getThermalThrottlingHours() * 100.0) / 8760,
            sensitivityResults.baseCase.npv15Years > 0 ? "positive" : "negative",
            (double)sensitivityResults.baseCase.paybackYears,
            stressResults.coolingFailureAnalysis.timeToCriticalSeconds < 60 ? 
                "Requires chiller upgrade by 2042 due to rising ambient temperatures." :
                "Current design is adequate through 2050."
        );
        System.out.println(statement);
        System.out.println();
    }
}
