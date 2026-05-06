package com.acme.aireconcalc.cloudsim;

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
import org.cloudsimplus.listeners.EventInfo;

import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

/**
 * CloudSim Plus Workload Generator for Air Economizer
 * Generates AI-aware IT load profiles using CloudSim Plus simulation
 * 
 * Uses Host-level power monitoring for continuous, realistic workload data
 * 
 * AI WORKLOAD METHODOLOGY INTEGRATION:
 * This service integrates the AI Workload Methodology at the PowerModel level,
 * replacing CloudSim's generic linear power calculation with workload-specific
 * heat profiles:
 * 
 * - AI Training: Power Multiplier 1.80x (sustained high load, 85-95% utilization)
 * - AI Inference: Power Multiplier 1.40x (bursty spikes, 25% baseline → 85-95% bursts)
 * - Mixed: Power Multiplier 1.3x (60% enterprise + 40% AI training)
 * - Enterprise: Power Multiplier 1.0x (traditional workload, 50-65% utilization)
 * 
 * The AIWorkloadPowerModel applies these multipliers dynamically based on
 * real-time utilization from CloudSim, providing accurate heat density
 * calculations for the cooling system.
 */
public class CloudSimWorkloadService {
    
    /**
     * AI Workload Modes
     */
    public enum AIWorkloadMode {
        AI_TRAINING,    // Long-running, sustained high utilization (85-95%)
        AI_INFERENCE,   // Bursty spikes (20-35% baseline → 85-95% spikes)
        MIXED,          // Enterprise baseline + periodic AI bursts
        ENTERPRISE      // Traditional enterprise workload (40-70%)
    }
    
    /**
     * Configuration for CloudSim workload generation
     */
    public static class WorkloadConfig {
        public int numberOfServers = 50;
        public int serversPerRack = 10;
        public double serverMaxPowerW = 507.0;
        public double serverIdlePowerW = 100.0;
        public int coresPerServer = 4;
        public long mipsPerCore = 1000;
        public AIWorkloadMode workloadMode = AIWorkloadMode.ENTERPRISE;
        public int simulationHours = 24;
        public double schedulingIntervalSeconds = 300.0; // 5 minutes
        public double computeIntensityFactor = 1.0; // AI/HPC multiplier
    }
    
    /**
     * Result containing IT load profile
     */
    public static class WorkloadResult {
        public double[] hourlyITLoadKW;           // Total facility load by hour
        public double[][] rackITLoadKW;           // Per-rack load by hour [rack][hour]
        public double[] hourlyUtilization;        // Average utilization by hour
        public double[][] hostUtilization;        // Per-host utilization [host][hour]
        public String workloadMode;
        public int totalHours;
        public int numberOfRacks;
        public int serversPerRack;
    }
    
    private CloudSimPlus simulation;
    private List<Host> hosts;
    private List<Vm> vms;
    private DatacenterBroker broker;
    private Datacenter datacenter;  // Store datacenter reference
    private WorkloadConfig config;
    private Map<Integer, List<Double>> hostPowerSamples; // Store power samples per hour per host
    
    /**
     * Generate IT load profile using CloudSim Plus
     * Uses Host-level power monitoring for continuous workload data
     */
    public WorkloadResult generateWorkloadProfile(WorkloadConfig config) {
        this.config = config;
        this.hostPowerSamples = new HashMap<>();
        
        // Write logs to file for debugging
        java.io.PrintWriter logWriter = null;
        try {
            logWriter = new java.io.PrintWriter(new java.io.FileWriter("cloudsim_debug.log", true));
            logWriter.println("\n========================================");
            logWriter.println("CloudSim Simulation Started: " + new java.util.Date());
            logWriter.println("========================================");
            logWriter.println("Config: " + config.numberOfServers + " servers, " + 
                             config.simulationHours + " hours, mode=" + config.workloadMode);
        } catch (Exception e) {
            System.err.println("Could not create log file: " + e.getMessage());
        }
        final java.io.PrintWriter log = logWriter;
        
        System.out.println("[CloudSimWorkloadService] Starting CloudSim simulation");
        System.out.println("[CloudSimWorkloadService] Config: " + config.numberOfServers + " servers, " + 
                         config.simulationHours + " hours, mode=" + config.workloadMode);
        
        // Initialize CloudSim
        simulation = new CloudSimPlus();
        
        // Create datacenter with hosts (1:1 mapping with physical servers)
        datacenter = createDatacenter();
        System.out.println("[CloudSimWorkloadService] Created datacenter with " + hosts.size() + " hosts");
        if (log != null) log.println("Created datacenter with " + hosts.size() + " hosts");
        
        // Create broker
        broker = new DatacenterBrokerSimple(simulation);
        
        // Create VMs (1 VM per Host for 1:1 mapping)
        vms = createVMs();
        broker.submitVmList(vms);
        System.out.println("[CloudSimWorkloadService] Submitted " + vms.size() + " VMs");
        if (log != null) log.println("Submitted " + vms.size() + " VMs");
        
        // Create cloudlets based on AI workload mode, pinned to their specific VMs
        // so the broker never stacks multiple servers' cloudlets onto one VM.
        List<Cloudlet> cloudlets = createCloudlets(config.workloadMode, vms);
        broker.submitCloudletList(cloudlets);
        System.out.println("[CloudSimWorkloadService] Submitted " + cloudlets.size() + " cloudlets");
        if (log != null) log.println("Submitted " + cloudlets.size() + " cloudlets");
        
        // Schedule periodic power sampling during simulation
        scheduleHostPowerSampling();
        
        // Run simulation
        System.out.println("[CloudSimWorkloadService] Starting simulation...");
        if (log != null) log.println("Starting simulation...");
        simulation.start();
        System.out.println("[CloudSimWorkloadService] Simulation completed at time: " + simulation.clock());
        if (log != null) log.println("Simulation completed at time: " + simulation.clock());
        
        // Check cloudlet execution status
        List<Cloudlet> finishedCloudlets = broker.getCloudletFinishedList();
        System.out.println("[CloudSimWorkloadService] Finished cloudlets: " + finishedCloudlets.size() + "/" + cloudlets.size());
        if (log != null) {
            log.println("Finished cloudlets: " + finishedCloudlets.size() + "/" + cloudlets.size());
            log.println("\nFirst 5 cloudlets status:");
            for (int i = 0; i < Math.min(5, cloudlets.size()); i++) {
                Cloudlet c = cloudlets.get(i);
                log.println("  Cloudlet " + i + ": status=" + c.getStatus() + 
                          ", length=" + c.getLength() + ", finishTime=" + c.getFinishTime());
            }
        }
        
        // Extract workload profile from host power samples
        WorkloadResult result = extractWorkloadFromHostPower();
        
        System.out.println("[CloudSimWorkloadService] Generated workload profile: " + result.totalHours + " hours");
        System.out.println("[CloudSimWorkloadService] Sample IT loads: h0=" + result.hourlyITLoadKW[0] + 
                         " kW, h1=" + (result.totalHours > 1 ? result.hourlyITLoadKW[1] : "N/A") + " kW");
        
        if (log != null) {
            log.println("\nGenerated workload profile: " + result.totalHours + " hours");
            log.println("First 10 hours IT load:");
            for (int h = 0; h < Math.min(10, result.totalHours); h++) {
                log.println("  Hour " + h + ": " + result.hourlyITLoadKW[h] + " kW (util=" + 
                          String.format("%.2f", result.hourlyUtilization[h]) + ")");
            }
            log.println("========================================\n");
            log.close();
        }
        
        return result;
    }
    
    /**
     * Schedule periodic sampling of host power consumption
     * Samples every hour during simulation and updates facility metrics
     */
    private void scheduleHostPowerSampling() {
        for (int hour = 0; hour < config.simulationHours; hour++) {
            final int currentHour = hour;
            double sampleTime = (hour + 0.5) * 3600.0; // Sample at middle of each hour
            
            // Schedule event at this time
            simulation.addOnClockTickListener(new org.cloudsimplus.listeners.EventListener<EventInfo>() {
                private boolean sampled = false;
                
                @Override
                public void update(EventInfo evt) {
                    if (!sampled && evt.getTime() >= sampleTime) {
                        sampleHostPower(currentHour);
                        
                        // Update facility metrics if using SustainabilityDatacenter
                        if (datacenter instanceof SustainabilityDatacenter) {
                            SustainabilityDatacenter sustainabilityDC = (SustainabilityDatacenter) datacenter;
                            sustainabilityDC.updateFacilityMetrics(evt.getTime());
                        }
                        
                        sampled = true;
                    }
                }
            });
        }
    }
    
    /**
     * Sample power consumption from all hosts at a specific hour
     */
    private void sampleHostPower(int hour) {
        for (int hostIdx = 0; hostIdx < hosts.size(); hostIdx++) {
            Host host = hosts.get(hostIdx);
            
            // Get current CPU utilization
            double cpuUtil = host.getCpuPercentUtilization();
            
            // Calculate power using host's power model
            double powerW = host.getPowerModel().getPower(cpuUtil);
            
            // Add +/- 5% random noise to represent micro-fluctuations
            // (checkpointing, data loading, network I/O bursts)
            double noise = 0.95 + (Math.random() * 0.10);
            
            // Apply compute intensity factor and noise
            powerW = powerW * config.computeIntensityFactor * noise;
            
            // Store sample
            int key = hour * 1000 + hostIdx; // Unique key for hour+host
            hostPowerSamples.putIfAbsent(key, new ArrayList<>());
            hostPowerSamples.get(key).add(powerW);
            
            // Debug first few samples
            if (hour < 3 && hostIdx < 2) {
                System.out.println("[CloudSimWorkloadService] Hour " + hour + " Host " + hostIdx + 
                                 ": cpuUtil=" + String.format("%.2f", cpuUtil) + 
                                 ", powerW=" + String.format("%.2f", powerW));
            }
        }
    }
    
    /**
     * Extract workload profile from collected host power samples
     */
    private WorkloadResult extractWorkloadFromHostPower() {
        WorkloadResult result = new WorkloadResult();
        int totalHours = config.simulationHours;
        int numberOfRacks = (int) Math.ceil((double) config.numberOfServers / config.serversPerRack);
        
        result.totalHours = totalHours;
        result.numberOfRacks = numberOfRacks;
        result.serversPerRack = config.serversPerRack;
        result.workloadMode = config.workloadMode.toString();
        result.hourlyITLoadKW = new double[totalHours];
        result.rackITLoadKW = new double[numberOfRacks][totalHours];
        result.hourlyUtilization = new double[totalHours];
        result.hostUtilization = new double[config.numberOfServers][totalHours];
        
        // Process collected samples
        for (int hour = 0; hour < totalHours; hour++) {
            double totalPower = 0;
            double totalUtil = 0;
            
            for (int hostIdx = 0; hostIdx < config.numberOfServers; hostIdx++) {
                int key = hour * 1000 + hostIdx;
                List<Double> samples = hostPowerSamples.get(key);
                
                double avgPower = 0;
                if (samples != null && !samples.isEmpty()) {
                    // Average all samples for this host at this hour
                    avgPower = samples.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                } else {
                    // No samples - use idle power
                    avgPower = config.serverIdlePowerW;
                }
                
                // Calculate utilization from power
                double utilization = (avgPower - config.serverIdlePowerW) / 
                                   (config.serverMaxPowerW - config.serverIdlePowerW);
                utilization = Math.max(0.0, Math.min(1.0, utilization));
                
                totalPower += avgPower;
                totalUtil += utilization;
                
                // Store host utilization
                result.hostUtilization[hostIdx][hour] = utilization;
                
                // Aggregate to rack level
                int rackId = hostIdx / config.serversPerRack;
                result.rackITLoadKW[rackId][hour] += (avgPower / 1000.0);
            }
            
            // Store hourly totals
            result.hourlyITLoadKW[hour] = totalPower / 1000.0; // Convert W to kW
            result.hourlyUtilization[hour] = totalUtil / config.numberOfServers;
        }
        
        return result;
    }
    
    /**
     * Create datacenter with hosts (1:1 mapping with physical servers)
     * Uses SustainabilityDatacenter for facility-level carbon accounting
     */
    private Datacenter createDatacenter() {
        hosts = new ArrayList<>();
        
        for (int i = 0; i < config.numberOfServers; i++) {
            Host host = createHost(i);
            hosts.add(host);
        }
        
        // Create SustainabilityDatacenter for facility-level tracking
        SustainabilityDatacenter datacenter = new SustainabilityDatacenter(simulation, hosts);
        
        // Configure sustainability parameters
        datacenter.setElectricityTariff(0.12);              // $0.12/kWh
        datacenter.setCarbonTaxRate(50.0);                  // $50/ton CO2 (2025 baseline)
        datacenter.setEnergyEscalationRate(0.03);           // 3% annual
        datacenter.setCarbonTaxEscalationRate(0.15);        // 15% annual
        datacenter.setGridCarbonIntensity(0.45);            // 450g CO2/kWh
        datacenter.setGridDecarbonizationRate(0.02);        // 2% annual reduction
        datacenter.setSimulationStartYear(2025.0);
        datacenter.setBaselinePUE(1.8);                     // Mechanical-only baseline
        
        // Initialize hourly tracking
        datacenter.initializeHourlyTracking(config.simulationHours);
        
        return datacenter;
    }
    
    /**
     * Create a single host (server) with AI Workload Power Model
     * Uses methodology-specific power multipliers based on workload type
     */
    private Host createHost(int id) {
        List<Pe> peList = new ArrayList<>();
        
        // Create PEs (cores) for this host
        for (int i = 0; i < config.coresPerServer; i++) {
            peList.add(new PeSimple(config.mipsPerCore));
        }
        
        // Over-provision resources to ensure VM allocation succeeds
        long ram = 16384; // 16 GB
        long storage = 1000000; // 1 TB
        long bw = 10000; // 10 Gbps
        
        Host host = new ThermalEvaporativeHost(ram, bw, storage, peList);
        
        // Set AI Workload Power Model based on workload mode
        // This replaces the generic linear model with methodology-specific calculations
        AIWorkloadPowerModel powerModel = createPowerModelForWorkload(config.workloadMode);
        host.setPowerModel(powerModel);
        
        return host;
    }
    
    /**
     * Create appropriate power model based on workload type
     * Applies methodology-specific power multipliers:
     * - AI Training: 1.80x (high density, sustained load)
     * - AI Inference: 1.40x (moderate density, bursty load)
     * - Mixed: 1.3x (balanced workload)
     * - Enterprise: 1.0x (standard density)
     */
    private AIWorkloadPowerModel createPowerModelForWorkload(AIWorkloadMode mode) {
        switch (mode) {
            case AI_TRAINING:
                return AIWorkloadPowerModel.forAITraining(config.serverMaxPowerW);
            
            case AI_INFERENCE:
                return AIWorkloadPowerModel.forAIInference(config.serverMaxPowerW);
            
            case MIXED:
                return AIWorkloadPowerModel.forMixed(config.serverMaxPowerW);
            
            case ENTERPRISE:
            default:
                return AIWorkloadPowerModel.forEnterprise(config.serverMaxPowerW);
        }
    }
    
    /**
     * Create VMs (1 VM per Host for 1:1 mapping)
     *
     * RAM and BW are sized to handle the maximum concurrent cloudlet load.
     * AI Training creates up to 5 cloudlets per VM each requesting 80% of VM RAM/BW,
     * so we provision enough headroom: host has 16 GB / 10 Gbps, VM gets 14 GB / 8 Gbps
     * to stay under host limits while supporting concurrent cloudlets without starvation.
     */
    private List<Vm> createVMs() {
        List<Vm> vmList = new ArrayList<>();
        
        for (int i = 0; i < config.numberOfServers; i++) {
            // Create VM with MIPS per PE (not total MIPS)
            Vm vm = new VmSimple(config.mipsPerCore, config.coresPerServer);
            
            // Provision VM with ample RAM and BW to avoid cloudlet starvation.
            // Multiple concurrent cloudlets (up to 5 in AI_TRAINING mode) each request
            // up to 80% of VM resources via UtilizationModelDynamic — TimeShared scheduler
            // divides available resources, so the VM must have enough total capacity.
            vm.setRam(14336) // 14 GB (leaves 2 GB headroom under host's 16 GB)
              .setBw(8000)   // 8 Gbps (leaves 2 Gbps headroom under host's 10 Gbps)
              .setSize(100000); // 100 GB (less than host's 1 TB)
            
            // Use TimeShared scheduler for concurrent cloudlet execution
            vm.setCloudletScheduler(new CloudletSchedulerTimeShared());
            
            vmList.add(vm);
        }
        
        return vmList;
    }
    
    /**
     * Create cloudlets based on AI workload mode, pinned to their specific VMs.
     * Pinning prevents the broker from stacking all cloudlets onto one VM.
     */
    private List<Cloudlet> createCloudlets(AIWorkloadMode mode, List<Vm> vmList) {
        List<Cloudlet> cloudletList = new ArrayList<>();
        
        switch (mode) {
            case AI_TRAINING:
                cloudletList = createAITrainingWorkload(vmList);
                break;
            case AI_INFERENCE:
                cloudletList = createAIInferenceWorkload(vmList);
                break;
            case MIXED:
                cloudletList = createMixedWorkload(vmList);
                break;
            case ENTERPRISE:
            default:
                cloudletList = createEnterpriseWorkload(vmList);
                break;
        }
        
        return cloudletList;
    }
    
    /**
     * AI Training: Long-running, sustained high utilization (85-95%)
     * Each cloudlet is pinned to its server's VM so the broker never stacks
     * multiple servers' jobs onto one VM.
     *
     * Per-cloudlet RAM/BW utilization is set to 1/numJobs so that even when
     * all jobs for a server run concurrently the total never exceeds 100% of
     * the VM's provisioned RAM/BW.
     */
    private List<Cloudlet> createAITrainingWorkload(List<Vm> vmList) {
        List<Cloudlet> cloudlets = new ArrayList<>();
        
        for (int i = 0; i < config.numberOfServers; i++) {
            Vm vm = vmList.get(i);
            
            // 3-5 training jobs per server with staggered start times
            int numJobs = 3 + (int)(Math.random() * 3);
            double perJobRamBw = 1.0 / numJobs;
            
            for (int job = 0; job < numJobs; job++) {
                // FIX: job duration must span the full simulation window divided by
                // number of jobs — not a hardcoded 6-12 hours.
                // Each job covers its share of the total simulation hours so that
                // CloudSim keeps running for the full simulationHours duration.
                double jobDurationHours = (double) config.simulationHours / numJobs;
                long length = (long) (jobDurationHours * 3600 * config.mipsPerCore * config.coresPerServer);
                
                Cloudlet cloudlet = new CloudletSimple(length, config.coresPerServer);
                cloudlet.setFileSize(1024).setOutputSize(1024);
                
                // Stagger start times evenly across the simulation window
                double startDelay = (config.simulationHours / (double) numJobs) * job * 3600.0;
                cloudlet.setSubmissionDelay(startDelay);
                
                // High CPU utilization (80-95%)
                double jobUtilization = 0.80 + (Math.random() * 0.15);
                cloudlet.setUtilizationModelCpu(new UtilizationModelDynamic(jobUtilization));
                
                cloudlet.setUtilizationModelRam(new UtilizationModelDynamic(perJobRamBw));
                cloudlet.setUtilizationModelBw(new UtilizationModelDynamic(perJobRamBw));
                
                cloudlet.setVm(vm);
                cloudlets.add(cloudlet);
            }
        }
        
        return cloudlets;
    }
    
    /**
     * AI Inference: Bursty spikes with baseline load.
     * Baseline + bursts are all pinned to the same VM per server.
     * RAM/BW is divided by (1 baseline + max bursts) so concurrent total ≤ 100%.
     */
    private List<Cloudlet> createAIInferenceWorkload(List<Vm> vmList) {
        List<Cloudlet> cloudlets = new ArrayList<>();
        
        for (int server = 0; server < config.numberOfServers; server++) {
            Vm vm = vmList.get(server);
            int maxBursts = 5; // worst-case concurrent count
            // 1 baseline + maxBursts concurrent → divide by (1 + maxBursts)
            double perCloudletShare = 1.0 / (1 + maxBursts);
            
            // Baseline cloudlet (runs entire simulation at low utilization)
            long baselineLength = (long) (config.simulationHours * 3600 * config.mipsPerCore);
            Cloudlet baseline = new CloudletSimple(baselineLength, 1);
            baseline.setFileSize(512).setOutputSize(512);
            baseline.setUtilizationModelCpu(new UtilizationModelDynamic(0.25));
            baseline.setUtilizationModelRam(new UtilizationModelDynamic(perCloudletShare));
            baseline.setUtilizationModelBw(new UtilizationModelDynamic(perCloudletShare));
            baseline.setVm(vm);
            cloudlets.add(baseline);
            
            // Burst cloudlets (short, high CPU utilization)
            int numBursts = 3 + (int)(Math.random() * 3); // 3-5 bursts
            for (int burst = 0; burst < numBursts; burst++) {
                long burstLength = (long) ((300 + Math.random() * 600) * config.mipsPerCore);
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
     * Mixed: 60% enterprise + 40% AI training, each cloudlet pinned to its VM.
     */
    private List<Cloudlet> createMixedWorkload(List<Vm> vmList) {
        List<Cloudlet> cloudlets = new ArrayList<>();
        
        int enterpriseServers = (int) (config.numberOfServers * 0.6);
        int aiServers = config.numberOfServers - enterpriseServers;
        
        // Enterprise workload (60% of servers) — 1 cloudlet per VM, safe utilization
        for (int i = 0; i < enterpriseServers; i++) {
            Vm vm = vmList.get(i);
            long length = (long) (config.simulationHours * 3600 * config.mipsPerCore * 2);
            Cloudlet cloudlet = new CloudletSimple(length, 2);
            cloudlet.setFileSize(512).setOutputSize(512);
            
            double utilization = 0.50 + Math.random() * 0.15;
            cloudlet.setUtilizationModelCpu(new UtilizationModelDynamic(utilization));
            cloudlet.setUtilizationModelRam(new UtilizationModelDynamic(0.5));
            cloudlet.setUtilizationModelBw(new UtilizationModelDynamic(0.3));
            cloudlet.setVm(vm);
            
            cloudlets.add(cloudlet);
        }
        
        // AI training workload (40% of servers) — 1 cloudlet per VM
        for (int i = 0; i < aiServers; i++) {
            Vm vm = vmList.get(enterpriseServers + i);
            long length = (long) (config.simulationHours * 3600 * config.mipsPerCore * config.coresPerServer);
            Cloudlet cloudlet = new CloudletSimple(length, config.coresPerServer);
            cloudlet.setFileSize(1024).setOutputSize(1024);
            
            double utilization = 0.80 + Math.random() * 0.10;
            cloudlet.setUtilizationModelCpu(new UtilizationModelDynamic(utilization));
            cloudlet.setUtilizationModelRam(new UtilizationModelDynamic(0.8));
            cloudlet.setUtilizationModelBw(new UtilizationModelDynamic(0.7));
            cloudlet.setVm(vm);
            
            cloudlets.add(cloudlet);
        }
        
        return cloudlets;
    }
    
    /**
     * Enterprise: Traditional workload — 1 cloudlet per VM, pinned.
     */
    private List<Cloudlet> createEnterpriseWorkload(List<Vm> vmList) {
        List<Cloudlet> cloudlets = new ArrayList<>();
        
        for (int i = 0; i < config.numberOfServers; i++) {
            Vm vm = vmList.get(i);
            long length = (long) (config.simulationHours * 3600 * config.mipsPerCore * 2);
            Cloudlet cloudlet = new CloudletSimple(length, 2);
            cloudlet.setFileSize(512).setOutputSize(512);
            
            double utilization = 0.50 + Math.random() * 0.15;
            cloudlet.setUtilizationModelCpu(new UtilizationModelDynamic(utilization));
            cloudlet.setUtilizationModelRam(new UtilizationModelDynamic(0.5));
            cloudlet.setUtilizationModelBw(new UtilizationModelDynamic(0.3));
            cloudlet.setVm(vm);
            
            cloudlets.add(cloudlet);
        }
        
        return cloudlets;
    }
}
