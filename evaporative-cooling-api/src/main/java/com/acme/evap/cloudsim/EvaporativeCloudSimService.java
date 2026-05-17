package com.acme.evap.cloudsim;

import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.datacenters.Datacenter;
import org.cloudsimplus.datacenters.DatacenterSimple;
import org.cloudsimplus.hosts.Host;
import org.cloudsimplus.hosts.HostSimple;
import org.cloudsimplus.resources.Pe;
import org.cloudsimplus.resources.PeSimple;
import org.cloudsimplus.vms.Vm;
import org.cloudsimplus.vms.VmSimple;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.cloudlets.CloudletSimple;
import org.cloudsimplus.brokers.DatacenterBroker;
import org.cloudsimplus.brokers.DatacenterBrokerSimple;
import org.cloudsimplus.utilizationmodels.*;
import org.cloudsimplus.schedulers.cloudlet.CloudletSchedulerTimeShared;
import org.cloudsimplus.power.models.PowerModelHostSimple;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Independent CloudSim Plus Workload Generator for Evaporative Cooling
 * Generates AI-aware IT load profiles using incremental CloudSim Plus simulation
 */
public class EvaporativeCloudSimService {
    
    /**
     * AI Workload Modes
     */
    public enum AIWorkloadMode {
        AI_TRAINING,    // Sustained high load (85-95% utilization)
        AI_INFERENCE,   // Bursty spikes (25% baseline, 85-95% bursts)
        MIXED,          // 60% enterprise + 40% AI training
        ENTERPRISE      // Traditional workload (50-65% utilization)
    }
    
    /**
     * Workload Configuration
     */
    public static class WorkloadConfig {
        public int numberOfServers = 50;
        public int serversPerRack = 10;
        public int simulationHours = 8760;
        public AIWorkloadMode workloadMode = AIWorkloadMode.AI_TRAINING;
        public double computeIntensityFactor = 1.2;
        public int coresPerServer = 16;
        public long mipsPerCore = 1000L;
        public double serverMaxPowerW = 500.0;
        public double serverIdlePowerW = 100.0;
    }
    
    /**
     * Workload Result
     */
    public static class WorkloadResult {
        public double[] hourlyITLoadKW;
        public double[] hourlyUtilization;
        public int totalHours;
        public int numberOfServers;
        public String workloadMode;
        public long executionTimeMs;
    }
    
    private WorkloadConfig config;
    private List<Host> hosts;
    
    /**
     * Generate workload profile using incremental CloudSim processing
     */
    public WorkloadResult generateWorkloadProfile(WorkloadConfig config) {
        this.config = config;
        
        System.out.println("=== Evaporative CloudSim Workload Generation ===");
        System.out.printf("Servers: %d, Duration: %d hours (%s), Mode: %s\n", 
            config.numberOfServers, config.simulationHours, getDurationName(config.simulationHours), config.workloadMode);
        System.out.println("Using INCREMENTAL CloudSim processing for realistic timing...\n");
        
        long startTime = System.currentTimeMillis();
        
        // Initialize CloudSim Plus
        CloudSimPlus simulation = new CloudSimPlus();
        
        // Create datacenter
        Datacenter datacenter = createDatacenter(simulation);
        
        // Create broker
        DatacenterBroker broker = new DatacenterBrokerSimple(simulation);
        
        // Create VMs
        List<Vm> vmList = createVMs();
        broker.submitVmList(vmList);
        
        // Create cloudlets based on workload mode
        List<Cloudlet> cloudletList = createCloudlets(config.workloadMode, vmList);
        broker.submitCloudletList(cloudletList);
        
        // Initialize CloudSim event queue without running to completion
        System.out.println("✅ Initializing CloudSim Plus event queue...");
        simulation.startSync();
        System.out.println("   Datacenter registered, VMs allocated, Cloudlets submitted");
        System.out.printf("   Will advance simulation using runFor(3600) for %d hours\n", config.simulationHours);
        System.out.println("   Using Discrete Event Simulation with realistic workload patterns\n");
        
        // Initialize result arrays
        double[] hourlyITLoadKW = new double[config.simulationHours];
        double[] hourlyUtilization = new double[config.simulationHours];
        
        // Get hosts for power monitoring
        List<Host> hosts = datacenter.getHostList();
        
        // Print progress header
        System.out.printf("%-8s %-12s %-12s %-10s %-8s\n", 
            "Hour", "IT Load (kW)", "Avg Util (%)", "Active Hosts", "CloudSim Time");
        System.out.println("-".repeat(60));
        
        // INCREMENTAL SIMULATION: Process one hour at a time
        for (int hour = 0; hour < config.simulationHours; hour++) {
            // Advance CloudSim by exactly 3600 seconds (1 hour)
            simulation.runFor(3600.0);
            
            // Query current state from CloudSim after processing events
            double totalPowerW = 0.0;
            double totalUtilization = 0.0;
            int activeHosts = 0;
            
            for (Host host : hosts) {
                if (host.isActive()) {
                    // Get actual CPU utilization from CloudSim's event engine
                    double hostUtil = host.getCpuPercentUtilization();
                    
                    // Get power consumption using the power model
                    double hostPowerW = host.getPowerModel().getPower();
                    
                    totalPowerW += hostPowerW;
                    totalUtilization += hostUtil;
                    activeHosts++;
                }
            }
            
            // Convert to kW and store results
            double itLoadKW = totalPowerW / 1000.0;
            double avgUtilization = activeHosts > 0 ? (totalUtilization / activeHosts) : 0.0;
            
            hourlyITLoadKW[hour] = itLoadKW;
            hourlyUtilization[hour] = avgUtilization;
            
            // Print progress based on simulation duration
            boolean shouldPrint = false;
            if (config.simulationHours <= 730) {
                // 1 month: print every 24 hours or first 10 hours or last hour
                shouldPrint = (hour % 24 == 0 || hour < 10 || hour == config.simulationHours - 1);
            } else if (config.simulationHours <= 2190) {
                // 3 months: print every 72 hours or first 5 hours or last hour
                shouldPrint = (hour % 72 == 0 || hour < 5 || hour == config.simulationHours - 1);
            } else if (config.simulationHours <= 4380) {
                // 6 months: print every 168 hours (weekly) or first 3 hours or last hour
                shouldPrint = (hour % 168 == 0 || hour < 3 || hour == config.simulationHours - 1);
            } else {
                // Full year: print every 240 hours or first 3 hours or last hour
                shouldPrint = (hour % 240 == 0 || hour < 3 || hour == config.simulationHours - 1);
            }
            
            if (shouldPrint) {
                System.out.printf("%04d     %8.2f      %8.1f      %6d      %.0fs\n",
                    hour, itLoadKW, avgUtilization * 100, activeHosts, simulation.clock());
            }
        }
        
        System.out.println("-".repeat(60));
        
        long executionTime = System.currentTimeMillis() - startTime;
        System.out.printf("\n✅ CloudSim simulation completed in %.2f seconds\n", executionTime / 1000.0);
        System.out.printf("   Processed %d hours of discrete events\n", config.simulationHours);
        System.out.printf("   Average IT Load: %.2f kW\n", 
            Arrays.stream(hourlyITLoadKW).average().orElse(0.0));
        System.out.println("=== Evaporative CloudSim Generation Complete ===\n");
        
        // Build and return result
        WorkloadResult result = new WorkloadResult();
        result.totalHours = config.simulationHours;
        result.numberOfServers = config.numberOfServers;
        result.hourlyITLoadKW = hourlyITLoadKW;
        result.hourlyUtilization = hourlyUtilization;
        result.workloadMode = config.workloadMode.toString();
        result.executionTimeMs = executionTime;
        
        return result;
    }
    
    /**
     * Create datacenter with hosts
     */
    private Datacenter createDatacenter(CloudSimPlus simulation) {
        hosts = new ArrayList<>();
        
        for (int i = 0; i < config.numberOfServers; i++) {
            Host host = createHost(i);
            hosts.add(host);
        }
        
        return new DatacenterSimple(simulation, hosts);
    }
    
    /**
     * Create host with power model
     */
    private Host createHost(int id) {
        List<Pe> peList = new ArrayList<>();
        for (int i = 0; i < config.coresPerServer; i++) {
            peList.add(new PeSimple(config.mipsPerCore));
        }
        
        Host host = new HostSimple(8192, 1000000, 10000, peList);
        
        // Linear power model with compute intensity factor for AI workloads
        double adjustedMaxPower = config.serverMaxPowerW * config.computeIntensityFactor;
        double adjustedIdlePower = config.serverIdlePowerW * config.computeIntensityFactor;
        
        host.setPowerModel(new PowerModelHostSimple(
            adjustedMaxPower, 
            adjustedIdlePower
        ));
        
        return host;
    }
    
    /**
     * Create VMs (1:1 mapping with hosts)
     */
    private List<Vm> createVMs() {
        List<Vm> vmList = new ArrayList<>();
        
        for (int i = 0; i < config.numberOfServers; i++) {
            Vm vm = new VmSimple(config.mipsPerCore * config.coresPerServer, config.coresPerServer);
            vm.setRam(4096).setBw(1000).setSize(10000);
            vm.setCloudletScheduler(new CloudletSchedulerTimeShared());
            vmList.add(vm);
        }
        
        return vmList;
    }
    
    /**
     * Create cloudlets based on workload mode
     */
    private List<Cloudlet> createCloudlets(AIWorkloadMode mode, List<Vm> vmList) {
        switch (mode) {
            case AI_TRAINING:
                return createAITrainingWorkload(vmList);
            case AI_INFERENCE:
                return createAIInferenceWorkload(vmList);
            case MIXED:
                return createMixedWorkload(vmList);
            case ENTERPRISE:
            default:
                return createEnterpriseWorkload(vmList);
        }
    }
    
    /**
     * AI Training workload: Sustained high utilization (85-95%)
     */
    private List<Cloudlet> createAITrainingWorkload(List<Vm> vmList) {
        List<Cloudlet> cloudlets = new ArrayList<>();
        
        for (int i = 0; i < config.numberOfServers; i++) {
            Vm vm = vmList.get(i);
            
            // Create 15-25 training jobs per server for more CloudSim events
            int numJobs = 15 + (int)(Math.random() * 11); // 15-25 jobs
            double perJobRamBw = 1.0 / numJobs;
            
            for (int job = 0; job < numJobs; job++) {
                // Each job covers portion of simulation with higher complexity
                double jobDurationHours = (double) config.simulationHours / numJobs;
                
                // Increased computational complexity (20x more MIPS for realistic timing)
                long baseLength = (long) (jobDurationHours * 3600 * config.mipsPerCore * config.coresPerServer);
                long complexityMultiplier = 20; // Increase computational load significantly
                long length = baseLength * complexityMultiplier;
                
                Cloudlet cloudlet = new CloudletSimple(length, config.coresPerServer);
                cloudlet.setFileSize(10240).setOutputSize(10240); // Increased I/O
                
                // Stagger start times with more realistic intervals
                double startDelay = (config.simulationHours / (double) numJobs) * job * 3600.0;
                // Add some randomness to start times for realism
                startDelay += (Math.random() * 1800); // ±30 minutes random delay
                cloudlet.setSubmissionDelay(startDelay);
                
                // High CPU utilization with more variation (75-95%)
                double jobUtilization = 0.75 + (Math.random() * 0.20);
                cloudlet.setUtilizationModelCpu(new UtilizationModelDynamic(jobUtilization));
                
                // Higher RAM/BW utilization for AI workloads
                double ramUtil = 0.6 + (Math.random() * 0.3); // 60-90% RAM usage
                double bwUtil = 0.4 + (Math.random() * 0.4);  // 40-80% BW usage
                cloudlet.setUtilizationModelRam(new UtilizationModelDynamic(ramUtil * perJobRamBw));
                cloudlet.setUtilizationModelBw(new UtilizationModelDynamic(bwUtil * perJobRamBw));
                
                cloudlet.setVm(vm);
                cloudlets.add(cloudlet);
            }
        }
        
        return cloudlets;
    }
    
    /**
     * AI Inference workload: Bursty patterns (25% baseline, 85-95% spikes)
     */
    private List<Cloudlet> createAIInferenceWorkload(List<Vm> vmList) {
        List<Cloudlet> cloudlets = new ArrayList<>();
        
        for (int server = 0; server < config.numberOfServers; server++) {
            Vm vm = vmList.get(server);
            int maxBursts = 8; // More concurrent bursts
            double perCloudletShare = 1.0 / (1 + maxBursts);
            
            // Baseline cloudlet (runs entire simulation at low utilization) - increased complexity
            long baselineLength = (long) (config.simulationHours * 3600 * config.mipsPerCore * 15); // 15x complexity
            Cloudlet baseline = new CloudletSimple(baselineLength, 1);
            baseline.setFileSize(512).setOutputSize(512);
            baseline.setUtilizationModelCpu(new UtilizationModelDynamic(0.25));
            baseline.setUtilizationModelRam(new UtilizationModelDynamic(perCloudletShare));
            baseline.setUtilizationModelBw(new UtilizationModelDynamic(perCloudletShare));
            baseline.setVm(vm);
            cloudlets.add(baseline);
            
            // Burst cloudlets (short, high CPU utilization) - increased complexity
            int numBursts = 8 + (int)(Math.random() * 7); // 8-14 bursts (more events)
            for (int burst = 0; burst < numBursts; burst++) {
                long burstLength = (long) ((300 + Math.random() * 600) * config.mipsPerCore * 10); // 10x complexity
                Cloudlet burstCloudlet = new CloudletSimple(burstLength, config.coresPerServer);
                burstCloudlet.setFileSize(1024).setOutputSize(1024);
                
                double burstUtil = 0.85 + Math.random() * 0.10;
                burstCloudlet.setUtilizationModelCpu(new UtilizationModelDynamic(burstUtil));
                burstCloudlet.setUtilizationModelRam(new UtilizationModelDynamic(perCloudletShare));
                burstCloudlet.setUtilizationModelBw(new UtilizationModelDynamic(perCloudletShare));
                burstCloudlet.setVm(vm);
                
                cloudlets.add(burstCloudlet);
            }
        }
        
        return cloudlets;
    }
    
    /**
     * Mixed workload: 60% enterprise + 40% AI training
     */
    private List<Cloudlet> createMixedWorkload(List<Vm> vmList) {
        List<Cloudlet> cloudlets = new ArrayList<>();
        
        int enterpriseServers = (int) (config.numberOfServers * 0.6);
        int aiServers = config.numberOfServers - enterpriseServers;
        
        // Enterprise workload (60% of servers) - increased complexity and more cloudlets
        for (int i = 0; i < enterpriseServers; i++) {
            Vm vm = vmList.get(i);
            
            // Create multiple cloudlets per enterprise server for more events
            int numCloudlets = 5 + (int)(Math.random() * 6); // 5-10 cloudlets per server
            for (int j = 0; j < numCloudlets; j++) {
                long length = (long) (config.simulationHours * 3600 * config.mipsPerCore * 8 / numCloudlets); // 8x complexity distributed
                Cloudlet cloudlet = new CloudletSimple(length, 2);
                cloudlet.setFileSize(512).setOutputSize(512);
                
                double utilization = 0.50 + Math.random() * 0.15;
                cloudlet.setUtilizationModelCpu(new UtilizationModelDynamic(utilization));
                cloudlet.setUtilizationModelRam(new UtilizationModelDynamic(0.5 / numCloudlets));
                cloudlet.setUtilizationModelBw(new UtilizationModelDynamic(0.3 / numCloudlets));
                cloudlet.setVm(vm);
                
                // Stagger start times
                double startDelay = (config.simulationHours / (double) numCloudlets) * j * 3600.0;
                cloudlet.setSubmissionDelay(startDelay);
                
                cloudlets.add(cloudlet);
            }
        }
        
        // AI training workload (40% of servers) - increased complexity and more cloudlets
        for (int i = 0; i < aiServers; i++) {
            Vm vm = vmList.get(enterpriseServers + i);
            
            // Create multiple AI training jobs per server
            int numJobs = 8 + (int)(Math.random() * 5); // 8-12 jobs per AI server
            for (int j = 0; j < numJobs; j++) {
                long length = (long) (config.simulationHours * 3600 * config.mipsPerCore * config.coresPerServer * 12 / numJobs); // 12x complexity
                Cloudlet cloudlet = new CloudletSimple(length, config.coresPerServer);
                cloudlet.setFileSize(1024).setOutputSize(1024);
                
                double utilization = 0.80 + Math.random() * 0.10;
                cloudlet.setUtilizationModelCpu(new UtilizationModelDynamic(utilization));
                cloudlet.setUtilizationModelRam(new UtilizationModelDynamic(0.8 / numJobs));
                cloudlet.setUtilizationModelBw(new UtilizationModelDynamic(0.7 / numJobs));
                cloudlet.setVm(vm);
                
                // Stagger start times for AI jobs
                double startDelay = (config.simulationHours / (double) numJobs) * j * 3600.0;
                cloudlet.setSubmissionDelay(startDelay);
                
                cloudlets.add(cloudlet);
            }
        }
        
        return cloudlets;
    }
    
    /**
     * Enterprise workload: Traditional server utilization (50-65%)
     */
    private List<Cloudlet> createEnterpriseWorkload(List<Vm> vmList) {
        List<Cloudlet> cloudlets = new ArrayList<>();
        
        for (int i = 0; i < config.numberOfServers; i++) {
            Vm vm = vmList.get(i);
            
            // Create multiple enterprise workloads per server for more CloudSim events
            int numWorkloads = 6 + (int)(Math.random() * 5); // 6-10 workloads per server
            for (int j = 0; j < numWorkloads; j++) {
                long length = (long) (config.simulationHours * 3600 * config.mipsPerCore * 10 / numWorkloads); // 10x complexity distributed
                Cloudlet cloudlet = new CloudletSimple(length, 2);
                cloudlet.setFileSize(512).setOutputSize(512);
                
                double utilization = 0.50 + Math.random() * 0.15;
                cloudlet.setUtilizationModelCpu(new UtilizationModelDynamic(utilization));
                cloudlet.setUtilizationModelRam(new UtilizationModelDynamic(0.5 / numWorkloads));
                cloudlet.setUtilizationModelBw(new UtilizationModelDynamic(0.3 / numWorkloads));
                cloudlet.setVm(vm);
                
                // Stagger start times to create more discrete events
                double startDelay = (config.simulationHours / (double) numWorkloads) * j * 3600.0;
                startDelay += (Math.random() * 3600); // Add up to 1 hour random delay
                cloudlet.setSubmissionDelay(startDelay);
                
                cloudlets.add(cloudlet);
            }
        }
        
        return cloudlets;
    }
    
    /**
     * Get duration name for logging
     */
    private String getDurationName(int hours) {
        switch (hours) {
            case 730: return "1 Month";
            case 2190: return "3 Months";
            case 4380: return "6 Months";
            case 8760: return "Full Year";
            default: return hours + " hours";
        }
    }
}