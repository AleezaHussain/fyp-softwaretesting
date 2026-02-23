package com.acme.aireconcalc.cloudsim;

/**
 * Quick test to verify CloudSim workload generation
 */
public class CloudSimQuickTest {
    
    public static void main(String[] args) {
        System.out.println("=== CloudSim Workload Generation Test ===\n");
        
        CloudSimWorkloadService service = new CloudSimWorkloadService();
        
        // Test configuration
        CloudSimWorkloadService.WorkloadConfig config = new CloudSimWorkloadService.WorkloadConfig();
        config.numberOfServers = 10;
        config.serversPerRack = 10;
        config.serverMaxPowerW = 507.0;
        config.serverIdlePowerW = 100.0;
        config.coresPerServer = 4;
        config.mipsPerCore = 1000;
        config.computeIntensityFactor = 1.0;
        config.simulationHours = 24;
        
        // Test each workload mode
        testWorkloadMode(service, config, CloudSimWorkloadService.AIWorkloadMode.AI_TRAINING);
        testWorkloadMode(service, config, CloudSimWorkloadService.AIWorkloadMode.AI_INFERENCE);
        testWorkloadMode(service, config, CloudSimWorkloadService.AIWorkloadMode.MIXED);
        testWorkloadMode(service, config, CloudSimWorkloadService.AIWorkloadMode.ENTERPRISE);
    }
    
    private static void testWorkloadMode(CloudSimWorkloadService service, 
                                        CloudSimWorkloadService.WorkloadConfig config,
                                        CloudSimWorkloadService.AIWorkloadMode mode) {
        System.out.println("\n========================================");
        System.out.println("Testing: " + mode);
        System.out.println("========================================");
        
        config.workloadMode = mode;
        CloudSimWorkloadService.WorkloadResult result = service.generateWorkloadProfile(config);
        
        // Print statistics
        double minLoad = Double.MAX_VALUE;
        double maxLoad = Double.MIN_VALUE;
        double avgLoad = 0;
        
        for (int h = 0; h < result.totalHours; h++) {
            double load = result.hourlyITLoadKW[h];
            minLoad = Math.min(minLoad, load);
            maxLoad = Math.max(maxLoad, load);
            avgLoad += load;
        }
        avgLoad /= result.totalHours;
        
        System.out.println("\nResults:");
        System.out.println("  Min IT Load: " + String.format("%.2f", minLoad) + " kW");
        System.out.println("  Max IT Load: " + String.format("%.2f", maxLoad) + " kW");
        System.out.println("  Avg IT Load: " + String.format("%.2f", avgLoad) + " kW");
        System.out.println("  Variation: " + String.format("%.2f", maxLoad - minLoad) + " kW");
        
        // Print first 5 hours
        System.out.println("\nFirst 5 hours:");
        for (int h = 0; h < Math.min(5, result.totalHours); h++) {
            System.out.println("  Hour " + h + ": " + String.format("%.2f", result.hourlyITLoadKW[h]) + " kW");
        }
    }
}
