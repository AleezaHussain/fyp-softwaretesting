package com.acme.evap.api.service;

import com.acme.evap.api.dto.SimulationRequest;
import org.cloudsimplus.brokers.DatacenterBroker;
import org.cloudsimplus.brokers.DatacenterBrokerSimple;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.cloudlets.CloudletSimple;
import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.datacenters.Datacenter;
import org.cloudsimplus.datacenters.DatacenterSimple;
import org.cloudsimplus.hosts.Host;
import org.cloudsimplus.hosts.HostSimple;
import org.cloudsimplus.power.models.PowerModelHostSimple;
import org.cloudsimplus.resources.Pe;
import org.cloudsimplus.resources.PeSimple;
import org.cloudsimplus.utilizationmodels.UtilizationModelDynamic;
import org.cloudsimplus.vms.Vm;
import org.cloudsimplus.vms.VmSimple;

import java.util.ArrayList;
import java.util.List;

/**
 * Discrete Event Simulation Orchestrator for Evaporative Cooling
 * Integrates CloudSim Plus with evaporative cooling physics in lockstep
 */
public class EvaporativeSimulationOrchestrator {
    
    private final CloudSimPlus simulation;
    private final SimulationRequest request;
    private List<Host> hosts;
    private Datacenter datacenter;
    private final List<HourlyResult> results = new ArrayList<>();
    
    public static class HourlyResult {
        public int hour;
        public double itLoadKW;
        public double serverUtilization;
        public double cloudSimTime;
        
        public HourlyResult(int hour, double itLoadKW, double serverUtilization, double cloudSimTime) {
            this.hour = hour;
            this.itLoadKW = itLoadKW;
            this.serverUtilization = serverUtilization;
            this.cloudSimTime = cloudSimTime;
        }
    }
    
    public EvaporativeSimulationOrchestrator(SimulationRequest request) {
        this.simulation = new CloudSimPlus();
        this.request = request;
        initializeCloudSim();
    }
    
    /**
     * Initialize CloudSim Plus infrastructure
     */
    private void initializeCloudSim() {
        System.out.println("🚀 Initializing CloudSim Plus DES for Evaporative Cooling...");
        
        // Create hosts
        hosts = createHosts();
        datacenter = new DatacenterSimple(simulation, hosts);
        
        // Create broker
        DatacenterBroker broker = new DatacenterBrokerSimple(simulation);
        
        // Create VMs
        List<Vm> vmList = createVms();
        broker.submitVmList(vmList);
        
        // Create cloudlets
        List<Cloudlet> cloudletList = createCloudlets(vmList.size());
        broker.submitCloudletList(cloudletList);
        
        System.out.println("✅ CloudSim Plus initialized:");
        System.out.println("   - Hosts: " + hosts.size());
        System.out.println("   - VMs: " + vmList.size());
        System.out.println("   - Cloudlets: " + cloudletList.size());
    }
    
    /**
     * Create hosts based on server configuration
     * Uses calculated server specs based on total IT power
     */
    private List<Host> createHosts() {
        List<Host> hostList = new ArrayList<>();
        int totalServers = request.it_load.servers;
        
        // Calculate power per server from total IT power
        double totalITPowerKW = request.it_load.total_it_power_kw;
        double maxPowerW = (totalITPowerKW * 1000.0) / totalServers; // Distribute evenly
        double idlePowerW = maxPowerW * 0.2; // Assume 20% idle power
        
        for (int i = 0; i < totalServers; i++) {
            List<Pe> peList = new ArrayList<>();
            int coresPerServer = 4; // Default
            long mipsPerCore = 1000; // Default MIPS per core
            
            for (int j = 0; j < coresPerServer; j++) {
                peList.add(new PeSimple(mipsPerCore));
            }
            
            long ram = 16384; // 16 GB
            long storage = 1000000; // 1 TB
            long bw = 10000; // 10 Gbps
            
            Host host = new HostSimple(ram, bw, storage, peList);
            
            // Set power model with calculated server specs
            PowerModelHostSimple powerModel = new PowerModelHostSimple(maxPowerW, idlePowerW);
            host.setPowerModel(powerModel);
            
            hostList.add(host);
        }
        
        return hostList;
    }
    
    /**
     * Create VMs (one per host)
     */
    private List<Vm> createVms() {
        List<Vm> vmList = new ArrayList<>();
        
        for (int i = 0; i < hosts.size(); i++) {
            Vm vm = new VmSimple(1000, 4); // MIPS, PEs
            vm.setRam(8192).setBw(1000).setSize(10000);
            vmList.add(vm);
        }
        
        return vmList;
    }
    
    /**
     * Create cloudlets with realistic time-varying utilization patterns
     * Implements diurnal (daily) and weekly patterns for realistic data center workload
     */
    private List<Cloudlet> createCloudlets(int count) {
        List<Cloudlet> cloudletList = new ArrayList<>();
        
        // Create multiple cloudlets per VM to simulate realistic workload distribution
        for (int vmIdx = 0; vmIdx < count; vmIdx++) {
            // Each VM gets 2-3 cloudlets with staggered start times
            int cloudletsPerVm = 2 + (int)(Math.random() * 2);
            
            for (int j = 0; j < cloudletsPerVm; j++) {
                // Cloudlet length: long enough to span multiple hours
                // Using Long.MAX_VALUE / 1000 to avoid overflow while keeping it long-running
                long length = Long.MAX_VALUE / 1000;
                
                Cloudlet cloudlet = new CloudletSimple(length, 4);
                cloudlet.setFileSize(1024).setOutputSize(1024);
                
                // Stagger submission delays to create natural load variation
                double startDelay = (vmIdx * 300.0) + (j * 1800.0); // Spread over first hour
                cloudlet.setSubmissionDelay(startDelay);
                
                // Create time-varying utilization model with diurnal pattern
                // Use UtilizationModelFull as base and apply time-based scaling in power calculation
                UtilizationModelDynamic utilizationModel = new UtilizationModelDynamic(0.5);
                utilizationModel.setMaxResourceUtilization(0.95);
                
                cloudlet.setUtilizationModelCpu(utilizationModel);
                cloudlet.setUtilizationModelRam(new UtilizationModelDynamic(0.5));
                cloudlet.setUtilizationModelBw(new UtilizationModelDynamic(0.3));
                
                cloudletList.add(cloudlet);
            }
        }
        
        return cloudletList;
    }
    
    /**
     * Initialize the DES engine in synchronized mode
     * This prepares CloudSim for lock-step execution without running to completion
     */
    public void startSync() {
        System.out.println("=== Initializing DES in Lock-Step Mode ===");
        System.out.println("CloudSim + Evaporative Cooling Physics Co-Simulation\n");
        System.out.println("WORKLOAD VARIABILITY ENABLED:");
        System.out.println("  - Diurnal Pattern: Peak at 2 PM, Low at 4 AM");
        System.out.println("  - Weekly Pattern: 70% load on weekends");
        System.out.println("  - Random Noise: ±5% variation");
        System.out.println();
        
        // Initialize CloudSim event queue without blocking
        System.out.println("✅ Starting CloudSim Plus in synchronized mode...");
        simulation.startSync();
        System.out.println("   Datacenter registered, VMs allocated, Cloudlets submitted");
        System.out.println("   Ready for hourly lock-step execution\n");
    }
    
    /**
     * Advance the simulation by one hour and return current IT load
     * This is called from the physics loop for lock-step execution
     */
    public HourlyResult advanceOneHour(int hour) {
        // Advance CloudSim by 3600 seconds
        double itLoadKW = advanceCloudSimOneHour();
        
        // Query server utilization
        double totalUtilization = 0.0;
        int activeHosts = 0;
        
        for (Host host : hosts) {
            if (host.isActive()) {
                totalUtilization += host.getCpuPercentUtilization();
                activeHosts++;
            }
        }
        
        double avgUtilization = activeHosts > 0 ? totalUtilization / activeHosts : 0.0;
        
        HourlyResult result = new HourlyResult(hour, itLoadKW, avgUtilization, simulation.clock());
        results.add(result);
        
        // Print progress every 24 hours
        if (hour % 24 == 0) {
            System.out.printf("Hour %04d: IT Load=%.2f kW, Util=%.1f%%, CloudSim Time=%.0fs\n",
                hour, result.itLoadKW, result.serverUtilization * 100, result.cloudSimTime);
        }
        
        return result;
    }
    
    /**
     * Advance CloudSim engine by one hour
     * Returns the SERVER power consumption in kW (without UPS/PDU losses)
     * Applies time-based utilization patterns for realistic workload variation
     */
    private double advanceCloudSimOneHour() {
        int currentHour = results.size();
        
        // Process 3600 seconds of discrete events
        simulation.runFor(3600.0);
        
        // Calculate time-based utilization factor
        int hourOfDay = currentHour % 24;
        int dayOfWeek = (currentHour / 24) % 7;
        
        // Diurnal pattern: Peak at 2 PM (14:00), low at 4 AM (04:00)
        double hourFactor = 0.5 + 0.3 * Math.sin((hourOfDay - 6) * Math.PI / 12.0);
        
        // Weekend reduction (70% of weekday load)
        double weekFactor = (dayOfWeek >= 5) ? 0.7 : 1.0;
        
        // Random noise (±5% variation)
        double noise = 0.95 + (Math.random() * 0.10);
        
        // Combined time factor
        double timeFactor = hourFactor * weekFactor * noise;
        
        // Query power consumption from all active hosts
        double totalPowerW = 0.0;
        int activeHosts = 0;
        double totalUtilization = 0.0;
        
        for (Host host : hosts) {
            if (host.isActive()) {
                // Get actual CPU utilization from CloudSim's event engine
                double hostUtil = host.getCpuPercentUtilization();
                
                // Apply time-based factor to utilization
                double adjustedUtil = hostUtil * timeFactor;
                adjustedUtil = Math.max(0.10, Math.min(0.95, adjustedUtil));
                
                // Get power from host's power model using adjusted utilization
                double hostPowerW = host.getPowerModel().getPower(adjustedUtil);
                
                totalPowerW += hostPowerW;
                activeHosts++;
                totalUtilization += adjustedUtil;
            }
        }
        
        // Debug logging every 24 hours
        if (currentHour % 24 == 0 && activeHosts > 0) {
            double avgUtilization = (totalUtilization / activeHosts) * 100.0;
            String dayType = (dayOfWeek < 5) ? "Weekday" : "Weekend";
            
            System.out.printf("DEBUG Hour %04d (%s %02d:00): CloudSim Time=%.0fs, Active Hosts=%d, Avg Util=%.1f%%, Power=%.2f kW, TimeFactor=%.2f\n",
                currentHour, dayType, hourOfDay, simulation.clock(), activeHosts, avgUtilization, totalPowerW / 1000.0, timeFactor);
        }
        
        // Convert to kW (return ONLY server power, UPS/PDU losses calculated separately)
        return totalPowerW / 1000.0;
    }
    
    /**
     * Get simulation results
     */
    public List<HourlyResult> getResults() {
        return results;
    }
}
