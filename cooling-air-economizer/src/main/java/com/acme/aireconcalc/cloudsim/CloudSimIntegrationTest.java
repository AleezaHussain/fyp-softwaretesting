package com.acme.aireconcalc.cloudsim;

import com.acme.aireconcalc.AirEconomizerModel;
import com.acme.aireconcalc.EconomizerInputs;
import com.acme.aireconcalc.WeatherData;

/**
 * Integration test demonstrating CloudSim + Air Economizer
 * 
 * This test shows the complete workflow:
 * 1. Generate AI workload using CloudSim
 * 2. Feed IT load profile into economizer physics engine
 * 3. Analyze cooling performance with AI hotspots
 */
public class CloudSimIntegrationTest {
    
    public static void main(String[] args) {
        System.out.println("=================================================================");
        System.out.println("  CLOUDSIM + AIR ECONOMIZER INTEGRATION TEST");
        System.out.println("=================================================================\n");
        
        // Test all AI workload modes
        testWorkloadMode(CloudSimWorkloadService.AIWorkloadMode.AI_TRAINING);
        testWorkloadMode(CloudSimWorkloadService.AIWorkloadMode.AI_INFERENCE);
        testWorkloadMode(CloudSimWorkloadService.AIWorkloadMode.MIXED);
        testWorkloadMode(CloudSimWorkloadService.AIWorkloadMode.ENTERPRISE);
    }
    
    private static void testWorkloadMode(CloudSimWorkloadService.AIWorkloadMode mode) {
        System.out.println("\n--- Testing Workload Mode: " + mode + " ---\n");
        
        // Step 1: Configure CloudSim workload generator
        CloudSimWorkloadService.WorkloadConfig config = new CloudSimWorkloadService.WorkloadConfig();
        config.numberOfServers = 50;
        config.serversPerRack = 10;
        config.serverMaxPowerW = 507.0;
        config.serverIdlePowerW = 100.0;
        config.workloadMode = mode;
        config.simulationHours = 24;
        config.computeIntensityFactor = 1.2; // 20% AI uplift
        
        // Step 2: Generate workload profile using CloudSim
        System.out.println("Generating CloudSim workload profile...");
        CloudSimWorkloadService workloadService = new CloudSimWorkloadService();
        CloudSimWorkloadService.WorkloadResult workloadResult = workloadService.generateWorkloadProfile(config);
        
        System.out.println("✓ Generated " + workloadResult.totalHours + " hours of IT load");
        System.out.println("✓ Workload mode: " + workloadResult.workloadMode);
        System.out.println("✓ Number of racks: " + workloadResult.numberOfRacks);
        
        // Print sample IT loads
        System.out.println("\nSample IT Loads (first 6 hours):");
        for (int h = 0; h < Math.min(6, workloadResult.hourlyITLoadKW.length); h++) {
            System.out.printf("  Hour %2d: %.2f kW (Util: %.1f%%)\n", 
                h, workloadResult.hourlyITLoadKW[h], workloadResult.hourlyUtilization[h] * 100);
        }
        
        // Step 3: Perform rack-level analysis
        System.out.println("\nPerforming rack-level analysis...");
        double rackPowerThreshold = (config.serverMaxPowerW * config.serversPerRack) / 1000.0;
        RackLoadAggregator.FacilityRackAnalysis rackAnalysis = 
            RackLoadAggregator.aggregateToRacks(workloadResult, rackPowerThreshold);
        
        System.out.println("✓ Total racks: " + rackAnalysis.totalRacks);
        System.out.println("✓ Hotspot racks: " + rackAnalysis.hotspotRacks);
        System.out.println("✓ Max rack load: " + String.format("%.2f kW", rackAnalysis.maxRackLoadKW));
        System.out.println("✓ Avg rack load: " + String.format("%.2f kW", rackAnalysis.averageRackLoadKW));
        System.out.println("✓ Load imbalance: " + String.format("%.2f", rackAnalysis.loadImbalanceFactor));
        
        if (rackAnalysis.warnings.length > 0) {
            System.out.println("\n⚠ Warnings:");
            for (String warning : rackAnalysis.warnings) {
                System.out.println("  • " + warning);
            }
        }
        
        // Step 4: Run economizer simulation with CloudSim IT load
        System.out.println("\nRunning air economizer simulation...");
        EconomizerInputs econInputs = new EconomizerInputs();
        econInputs.numServers = config.numberOfServers;
        econInputs.serverMaxPowerW = config.serverMaxPowerW;
        econInputs.serverIdlePowerW = config.serverIdlePowerW;
        econInputs.maxAirflowCFM = 9000.0;
        econInputs.economizerMaxOutdoorTemp = 24.0;
        econInputs.economizerMaxHumidity = 60.0;
        econInputs.minOutdoorAirFraction = 0.2;
        econInputs.bestQuantity = 2;
        econInputs.bestEfficiency = 0.60;
        econInputs.carbonIntensity_kg_per_kWh = 0.055;
        
        AirEconomizerModel econModel = new AirEconomizerModel();
        
        double totalEnergy = 0;
        double totalCooling = 0;
        int fullEconHours = 0;
        int partialHours = 0;
        int mechHours = 0;
        int violations = 0;
        
        for (int h = 0; h < workloadResult.totalHours; h++) {
            // Mock weather (cool climate favorable for economizer)
            WeatherData weather = new WeatherData();
            weather.dryBulbC = 18.0 + (h % 24) * 0.5; // 18-30°C daily cycle
            weather.relativeHumidity = 50.0;
            
            // Use CloudSim IT load
            double itLoadKW = workloadResult.hourlyITLoadKW[h];
            AirEconomizerModel.StepResult result = 
                econModel.computeTimeStepWithCloudSimLoad(econInputs, weather, h, itLoadKW);
            
            totalEnergy += result.itLoad_kW;
            totalCooling += (result.fanPower_kW + result.mechPower_kW);
            
            if ("FULL_ECON".equals(result.mode)) fullEconHours++;
            else if ("PARTIAL_TRIM".equals(result.mode)) partialHours++;
            else mechHours++;
            
            if (result.airflowViolation) violations++;
        }
        
        double avgPUE = (totalEnergy + totalCooling) / totalEnergy;
        
        System.out.println("✓ Average PUE: " + String.format("%.3f", avgPUE));
        System.out.println("✓ Full economizer hours: " + fullEconHours + "/" + workloadResult.totalHours);
        System.out.println("✓ Partial economizer hours: " + partialHours + "/" + workloadResult.totalHours);
        System.out.println("✓ Mechanical only hours: " + mechHours + "/" + workloadResult.totalHours);
        System.out.println("✓ Airflow violations: " + violations + "/" + workloadResult.totalHours);
        
        // Step 5: Check for rack-level airflow violations
        String[] rackViolations = RackLoadAggregator.detectAIHotspotViolations(
            rackAnalysis, econInputs.maxAirflowCFM / config.serversPerRack, 12.0
        );
        
        if (rackViolations.length > 0) {
            System.out.println("\n🔥 Rack-Level Airflow Violations:");
            for (String violation : rackViolations) {
                System.out.println("  • " + violation);
            }
        } else {
            System.out.println("\n✓ No rack-level airflow violations detected");
        }
        
        System.out.println("\n" + "=".repeat(65));
    }
}
