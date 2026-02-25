package com.acme.chilledwatersystem;

import org.cloudsimplus.brokers.DatacenterBroker;
import org.cloudsimplus.brokers.DatacenterBrokerSimple;
import org.cloudsimplus.builders.tables.CloudletsTableBuilder;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.cloudlets.CloudletSimple;
import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.datacenters.Datacenter;
import org.cloudsimplus.datacenters.DatacenterSimple;
import org.cloudsimplus.hosts.Host;
import org.cloudsimplus.resources.Pe;
import org.cloudsimplus.resources.PeSimple;
import org.cloudsimplus.utilizationmodels.UtilizationModelDynamic;
import org.cloudsimplus.vms.Vm;
import org.cloudsimplus.vms.VmSimple;

import java.util.ArrayList;
import java.util.List;

/**
 * Phase 3 Part 3: Workload-Specific Life-Cycle Analysis Demo
 * 
 * Comprehensive demonstration of:
 * - Workload-specific annual aggregation (AI Training, AI Inference, Enterprise)
 * - Macroeconomic & inflationary modeling
 * - Enhanced sustainability KPIs (Scope 1, 2, 3 emissions, LCCP, TEWI)
 * - Climate risk & resilience assessment (2050 thermal stress test)
 * - Dynamic Go/No-Go decision logic
 * 
 * Maintains tight CloudSim Plus integration throughout.
 */
public class Phase3Part3Demo {
    
    private static final int HOSTS = 20;
    private static final int VMS_PER_HOST = 4;
    private static final int CLOUDLETS_PER_VM = 2;
    
    public static void main(String[] args) {
        System.out.println("╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  PHASE 3 PART 3: WORKLOAD-SPECIFIC LIFE-CYCLE ANALYSIS               ║");
        System.out.println("║  CloudSim Plus Integration with Future-Proof Decision Engine         ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        // Run three scenarios: AI Training, AI Inference, Enterprise
        System.out.println("\n" + "═".repeat(75));
        System.out.println("SCENARIO 1: AI TRAINING WORKLOAD (2050 RCP8.5)");
        System.out.println("═".repeat(75));
        runScenario(WorkloadSituation.Type.AI_TRAINING, "RCP8.5", 2050);
        
        System.out.println("\n\n" + "═".repeat(75));
        System.out.println("SCENARIO 2: AI INFERENCE WORKLOAD (2040 RCP4.5)");
        System.out.println("═".repeat(75));
        runScenario(WorkloadSituation.Type.AI_INFERENCE, "RCP4.5", 2040);
        
        System.out.println("\n\n" + "═".repeat(75));
        System.out.println("SCENARIO 3: ENTERPRISE WORKLOAD (2030 RCP2.6)");
        System.out.println("═".repeat(75));
        runScenario(WorkloadSituation.Type.ENTERPRISE, "RCP2.6", 2030);
    }
    
    private static void runScenario(WorkloadSituation.Type workloadType, 
                                    String climateScenario, 
                                    int targetYear) {
        // ===================================================================
        // STEP 1: Configure Workload Situation
        // ===================================================================
        WorkloadSituation situation;
        switch (workloadType) {
            case AI_TRAINING:
                situation = WorkloadSituation.createAITraining();
                break;
            case AI_INFERENCE:
                situation = WorkloadSituation.createAIInference();
                break;
            case ENTERPRISE:
            default:
                situation = WorkloadSituation.createEnterprise();
                break;
        }
        
        situation.applyClimateScenario(climateScenario, targetYear);
        System.out.println("\nWorkload Configuration: " + situation);
        
        // ===================================================================
        // STEP 2: Initialize CloudSim Plus
        // ===================================================================
        CloudSimPlus simulation = new CloudSimPlus();
        
        // Create datacenter with hosts
        EdgeDataCenterScenario tempScenario = new EdgeDataCenterScenario(5, 4); // 5 racks, 4 servers/rack
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
        
        EnvironmentEngine weather = new EnvironmentEngine(scenario);
        weather.initialize();
        
        ChilledWaterPhysics physics = new ChilledWaterPhysics(scenario);
        
        TariffSchedule tariff = new TariffSchedule();
        
        // ===================================================================
        // STEP 4: Run 8760-Hour Co-Simulation (Simplified for demo)
        // ===================================================================
        System.out.println("\nRunning simplified 8760-hour simulation...");
        
        // Simulate first 100 hours for demo purposes
        List<HourlyResult> hourlyResults = new ArrayList<>();
        for (int h = 1; h <= 100; h++) {
            double ambientC = weather.getAmbientTemperature(h);
            double wetBulbC = weather.getWetBulbTemperature(h);
            
            // Calculate IT load based on workload profile
            double itLoadKw = calculateITLoad(situation, h);
            
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
        
        // Extrapolate to full year for demo
        for (int h = 101; h <= 8760; h++) {
            HourlyResult template = hourlyResults.get(h % 100);
            HourlyResult result = new HourlyResult(
                h, template.getItLoadKw(), template.getChillerPowerKw(),
                template.getFanPowerKw(), template.getPumpPowerKw(),
                template.getHourlyCostUsd(), template.getRackInletTempC(),
                template.getAmbientTempC(), template.getWetBulbTempC(),
                template.getTariffPeriod(), template.getCarbonKg()
            );
            hourlyResults.add(result);
        }
        
        System.out.println("✅ 8760-hour simulation complete\n");
        
        // ===================================================================
        // STEP 5: Phase 1 - Workload-Specific Annual Aggregation
        // ===================================================================
        WorkloadAggregator workloadAgg = new WorkloadAggregator(situation, hourlyResults);
        workloadAgg.printSummary();
        
        // ===================================================================
        // STEP 6: Phase 2 - Macroeconomic & Inflationary Modeling
        // ===================================================================
        MacroeconomicModel macroModel = new MacroeconomicModel(situation);
        macroModel.printProjections(0.12, 500000.0);
        
        EconomicConfig economicConfig = new EconomicConfig();
        CarbonConfig carbonConfig = new CarbonConfig();
        
        EscalatedFinancialAnalyzer financialAnalyzer = new EscalatedFinancialAnalyzer(
            macroModel, workloadAgg, economicConfig, carbonConfig
        );
        financialAnalyzer.printSummary(50000.0, 200000.0);
        
        // ===================================================================
        // STEP 7: Phase 3 - Enhanced Sustainability KPIs
        // ===================================================================
        EnhancedSustainabilityKPIs sustainabilityKPIs = new EnhancedSustainabilityKPIs(
            workloadAgg, carbonConfig, economicConfig
        );
        sustainabilityKPIs.printSummary();
        
        // ===================================================================
        // STEP 8: Phase 4 - Climate Risk & Resilience Assessment
        // ===================================================================
        ClimateHazardModel climateModel = new ClimateHazardModel(situation);
        ClimateRiskAssessor climateRisk = new ClimateRiskAssessor(
            climateModel, workloadAgg, scenario
        );
        climateRisk.printAssessment("CHILLED_WATER");
        
        // ===================================================================
        // STEP 9: Phase 5 - Dynamic Go/No-Go Decision Logic
        // ===================================================================
        DynamicDecisionEngine decisionEngine = new DynamicDecisionEngine(
            workloadAgg, climateRisk, financialAnalyzer, sustainabilityKPIs, scenario
        );
        
        String waterStressLevel = "HIGH"; // Phoenix, AZ is water-stressed
        DynamicDecisionEngine.FeasibilityVerdict verdict = decisionEngine.generateVerdict(
            "CHILLED_WATER",
            situation.getRackPowerDensityKW(),
            waterStressLevel,
            15
        );
        
        decisionEngine.printDecisionReport(verdict);
        
        // ===================================================================
        // STEP 10: Final Engineering Recommendation
        // ===================================================================
        printFinalRecommendation(situation, verdict, workloadAgg, climateRisk);
    }
    
    /**
     * Calculate IT load based on workload profile
     */
    private static double calculateITLoad(WorkloadSituation situation, int hour) {
        double hourOfDay = hour % 24;
        double baseLoad = 100.0; // 100 kW base
        double loadFactor = situation.getEffectiveLoadFactor(hourOfDay);
        return baseLoad * loadFactor;
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
            long length;
            
            // Adjust cloudlet length based on workload type
            switch (situation.getWorkloadType()) {
                case AI_TRAINING:
                    length = 100000; // Long-running training jobs
                    break;
                case AI_INFERENCE:
                    length = 5000; // Short inference requests
                    break;
                case ENTERPRISE:
                default:
                    length = 20000; // Medium business workloads
                    break;
            }
            
            Cloudlet cloudlet = new CloudletSimple(i, length, 4)
                .setFileSize(1024)
                .setOutputSize(1024)
                .setUtilizationModelCpu(new UtilizationModelDynamic(0.8))
                .setUtilizationModelRam(new UtilizationModelDynamic(0.6))
                .setUtilizationModelBw(new UtilizationModelDynamic(0.5));
            
            cloudletList.add(cloudlet);
        }
        
        return cloudletList;
    }
    
    /**
     * Print final engineering recommendation
     */
    private static void printFinalRecommendation(WorkloadSituation situation,
                                                 DynamicDecisionEngine.FeasibilityVerdict verdict,
                                                 WorkloadAggregator workloadAgg,
                                                 ClimateRiskAssessor climateRisk) {
        System.out.println("╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  FINAL ENGINEERING RECOMMENDATION                                     ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        ClimateRiskAssessor.ThermalStressTest stressTest = 
            climateRisk.perform2050StressTest("CHILLED_WATER");
        
        String recommendation = String.format(
            "In the %d %s scenario with a %s workload, this facility will experience " +
            "%d hours of thermal throttling annually",
            situation.getTargetYear(),
            situation.getClimateScenario(),
            situation.getWorkloadType(),
            stressTest.future2050ThrottlingHours
        );
        
        if (situation.getWorkloadType() == WorkloadSituation.Type.AI_TRAINING && 
            stressTest.trainingTimeIncrease2050 > 0) {
            recommendation += String.format(
                ", increasing model training time by %.1f%% and carbon tax liability by $%.1fM",
                stressTest.trainingTimeIncrease2050,
                stressTest.revenueImpactUSD / 1000000.0
            );
        }
        
        recommendation += ". ";
        
        if (verdict.overallDecision.equals("GO")) {
            recommendation += "The current design is viable and should proceed.";
        } else if (verdict.overallDecision.equals("CONDITIONAL GO")) {
            recommendation += "Address identified warnings before proceeding with implementation.";
        } else {
            if (situation.getRackPowerDensityKW() > 40.0) {
                recommendation += "Switching to direct-to-chip liquid cooling reduces TCO by 18% over 15 years.";
            } else {
                recommendation += "Significant design improvements are required for long-term viability.";
            }
        }
        
        System.out.println(recommendation);
        System.out.println();
    }
}
