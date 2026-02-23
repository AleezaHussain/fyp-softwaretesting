package com.acme.aireconcalc.cloudsim;

import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.datacenters.Datacenter;
import org.cloudsimplus.hosts.Host;
import org.cloudsimplus.vms.Vm;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.brokers.DatacenterBroker;
import org.cloudsimplus.brokers.DatacenterBrokerSimple;

import java.util.ArrayList;
import java.util.List;
import java.util.Calendar;

/**
 * COOlience Simulation Runner - The Integration Entry Point
 * 
 * This class acts as the "Director," coordinating the 3-layer architecture:
 * 
 * Layer 1: AI Workload Generation (CloudSimWorkloadService)
 *   - Generates realistic AI/ML workload profiles
 *   - Modes: AI_TRAINING, AI_INFERENCE, MIXED, ENTERPRISE
 *   - Produces hourly IT load data (kW)
 * 
 * Layer 2: Thermal & Power Modeling (ThermalEvaporativeHost + AIWorkloadPowerModel)
 *   - Applies workload-specific power multipliers (1.0x - 1.8x)
 *   - Calculates heat generation and thermal dynamics
 *   - Tracks rack-level power density
 * 
 * Layer 3: Sustainability & Carbon Tracking (SustainabilityDatacenter)
 *   - Facility-level carbon accounting
 *   - Multi-year financial projections (2025-2030)
 *   - Carbon tax escalation and grid decarbonization
 * 
 * EXECUTION FLOW:
 * 1. Initialize CloudSim engine
 * 2. Create SustainabilityDatacenter with ThermalEvaporativeHosts
 * 3. Generate AI workload using CloudSimWorkloadService
 * 4. Run simulation and collect hourly metrics
 * 5. Export results for evaporative cooling analysis
 * 
 * OUTPUT:
 * - Hourly IT load profile (kW)
 * - Rack-level power distribution
 * - Carbon emissions and costs
 * - 5-year financial projections
 */
public class COOlienceSimRunner {
    
    private CloudSimPlus simulation;
    private SustainabilityDatacenter datacenter;
    private DatacenterBroker broker;
    private List<Host> hosts;
    private List<Vm> vms;
    private CloudSimWorkloadService workloadService;
    
    /**
     * Configuration for COOlience simulation
     */
    public static class COOlienceConfig {
        // Infrastructure
        public int numberOfServers = 50;
        public int serversPerRack = 10;
        public double serverMaxPowerW = 507.0;
        public double serverIdlePowerW = 100.0;
        public int coresPerServer = 4;
        public long mipsPerCore = 1000;
        
        // Workload
        public CloudSimWorkloadService.AIWorkloadMode workloadMode = 
            CloudSimWorkloadService.AIWorkloadMode.AI_TRAINING;
        public int simulationHours = 24; // Can be extended to 8760 for full year
        public double schedulingIntervalSeconds = 300.0; // 5 minutes
        public double computeIntensityFactor = 1.2; // AI/HPC multiplier
        
        // Sustainability
        public double electricityTariff = 0.12; // $/kWh
        public double carbonTaxRate = 50.0; // $/ton CO2
        public double energyEscalationRate = 0.03; // 3% annual
        public double carbonTaxEscalationRate = 0.15; // 15% annual
        public double gridCarbonIntensity = 0.45; // kg CO2/kWh
        public double gridDecarbonizationRate = 0.02; // 2% annual reduction
        public double simulationStartYear = 2025.0;
        public double baselinePUE = 1.8; // Mechanical-only baseline
        
        // Weather integration (optional - for future enhancement)
        public String weatherDataPath = null;
        public double climateChangeOffsetC = 1.0; // Temperature offset for 2030 scenario
    }
    
    /**
     * Results from COOlience simulation
     */
    public static class COOlienceResults {
        // Workload profile
        public double[] hourlyITLoadKW;
        public double[][] rackITLoadKW; // [rack][hour]
        public double[] hourlyUtilization;
        public double[][] hostUtilization; // [host][hour]
        
        // Sustainability metrics
        public double totalEnergyKWh;
        public double totalCarbonKg;
        public double totalCarbonTaxUSD;
        public double averagePUE;
        
        // Financial projections (2025-2030)
        public double[] yearlyEnergyKWh = new double[6];
        public double[] yearlyEnergyCostUSD = new double[6];
        public double[] yearlyCarbonKg = new double[6];
        public double[] yearlyCarbonTaxUSD = new double[6];
        public double[] yearlyTotalOpexUSD = new double[6];
        
        // Metadata
        public String workloadMode;
        public int totalHours;
        public int numberOfRacks;
        public int serversPerRack;
        public double simulationStartYear;
    }
    
    /**
     * Main entry point for standalone execution
     */
    public static void main(String[] args) {
        try {
            System.out.println("╔════════════════════════════════════════════════════════════╗");
            System.out.println("║     COOlience Multi-Year Simulation Runner                 ║");
            System.out.println("║     AI Workload → Thermal → Sustainability                 ║");
            System.out.println("╚════════════════════════════════════════════════════════════╝");
            System.out.println();
            
            // Create default configuration
            COOlienceConfig config = new COOlienceConfig();
            config.simulationHours = 24; // Start with 24 hours for testing
            config.workloadMode = CloudSimWorkloadService.AIWorkloadMode.AI_TRAINING;
            
            // Run simulation
            COOlienceSimRunner runner = new COOlienceSimRunner();
            COOlienceResults results = runner.runSimulation(config);
            
            // Print results
            runner.printResults(results);
            
            System.out.println();
            System.out.println("✅ Simulation completed successfully!");
            System.out.println("📊 Results can be exported to CSV or JSON for evaporative cooling analysis");
            
        } catch (Exception e) {
            System.err.println("❌ Simulation failed: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Run complete COOlience simulation
     */
    public COOlienceResults runSimulation(COOlienceConfig config) {
        System.out.println("🚀 Starting COOlience Simulation...");
        System.out.println("   Servers: " + config.numberOfServers);
        System.out.println("   Workload: " + config.workloadMode);
        System.out.println("   Duration: " + config.simulationHours + " hours");
        System.out.println();
        
        // Step 1: Initialize CloudSim engine
        System.out.println("📋 Step 1: Initializing CloudSim engine...");
        simulation = new CloudSimPlus();
        
        // Step 2: Create Sustainability Datacenter with Thermal Hosts
        System.out.println("📋 Step 2: Creating Sustainability Datacenter...");
        datacenter = createSustainabilityDatacenter(config);
        
        // Step 3: Create broker and VMs
        System.out.println("📋 Step 3: Creating broker and VMs...");
        broker = new DatacenterBrokerSimple(simulation);
        vms = createVMs(config);
        broker.submitVmList(vms);
        
        // Step 4: Generate AI workload using CloudSimWorkloadService
        System.out.println("📋 Step 4: Generating AI workload...");
        workloadService = new CloudSimWorkloadService();
        CloudSimWorkloadService.WorkloadConfig workloadConfig = createWorkloadConfig(config);
        CloudSimWorkloadService.WorkloadResult workloadResult = 
            workloadService.generateWorkloadProfile(workloadConfig);
        
        // Step 5: Run simulation
        System.out.println("📋 Step 5: Running simulation...");
        simulation.start();
        
        // Step 6: Collect results
        System.out.println("📋 Step 6: Collecting results...");
        COOlienceResults results = collectResults(workloadResult, config);
        
        // Step 7: Calculate multi-year projections
        System.out.println("📋 Step 7: Calculating 5-year projections...");
        calculateMultiYearProjections(results, config);
        
        System.out.println();
        System.out.println("✅ Simulation completed!");
        
        return results;
    }
    
    /**
     * Create Sustainability Datacenter with Thermal Evaporative Hosts
     */
    private SustainabilityDatacenter createSustainabilityDatacenter(COOlienceConfig config) {
        hosts = new ArrayList<>();
        
        // Create ThermalEvaporativeHosts (one per physical server)
        for (int i = 0; i < config.numberOfServers; i++) {
            Host host = createThermalHost(i, config);
            hosts.add(host);
        }
        
        // Create SustainabilityDatacenter
        SustainabilityDatacenter dc = new SustainabilityDatacenter(simulation, hosts);
        
        // Configure sustainability parameters
        dc.setElectricityTariff(config.electricityTariff);
        dc.setCarbonTaxRate(config.carbonTaxRate);
        dc.setEnergyEscalationRate(config.energyEscalationRate);
        dc.setCarbonTaxEscalationRate(config.carbonTaxEscalationRate);
        dc.setGridCarbonIntensity(config.gridCarbonIntensity);
        dc.setGridDecarbonizationRate(config.gridDecarbonizationRate);
        dc.setSimulationStartYear(config.simulationStartYear);
        dc.setBaselinePUE(config.baselinePUE);
        
        // Initialize hourly tracking
        dc.initializeHourlyTracking(config.simulationHours);
        
        System.out.println("   ✓ Created " + hosts.size() + " ThermalEvaporativeHosts");
        System.out.println("   ✓ Configured sustainability tracking");
        
        return dc;
    }
    
    /**
     * Create a single ThermalEvaporativeHost with AI Workload Power Model
     */
    private Host createThermalHost(int id, COOlienceConfig config) {
        List<org.cloudsimplus.resources.Pe> peList = new ArrayList<>();
        
        // Create PEs (cores) for this host
        for (int i = 0; i < config.coresPerServer; i++) {
            peList.add(new org.cloudsimplus.resources.PeSimple(config.mipsPerCore));
        }
        
        // Over-provision resources to ensure VM allocation succeeds
        long ram = 16384; // 16 GB
        long storage = 1000000; // 1 TB
        long bw = 10000; // 10 Gbps
        
        ThermalEvaporativeHost host = new ThermalEvaporativeHost(ram, bw, storage, peList);
        
        // Set AI Workload Power Model based on workload mode
        AIWorkloadPowerModel powerModel = createPowerModelForWorkload(
            config.workloadMode, config.serverMaxPowerW);
        host.setPowerModel(powerModel);
        
        return host;
    }
    
    /**
     * Create appropriate power model based on workload type
     */
    private AIWorkloadPowerModel createPowerModelForWorkload(
            CloudSimWorkloadService.AIWorkloadMode mode, double maxPowerW) {
        
        switch (mode) {
            case AI_TRAINING:
                return AIWorkloadPowerModel.forAITraining(maxPowerW);
            
            case AI_INFERENCE:
                return AIWorkloadPowerModel.forAIInference(maxPowerW);
            
            case MIXED:
                return AIWorkloadPowerModel.forMixed(maxPowerW);
            
            case ENTERPRISE:
            default:
                return AIWorkloadPowerModel.forEnterprise(maxPowerW);
        }
    }
    
    /**
     * Create VMs (1 VM per Host for 1:1 mapping)
     */
    private List<Vm> createVMs(COOlienceConfig config) {
        List<Vm> vmList = new ArrayList<>();
        
        for (int i = 0; i < config.numberOfServers; i++) {
            Vm vm = new org.cloudsimplus.vms.VmSimple(config.mipsPerCore, config.coresPerServer);
            
            // Set VM resources (less than host to ensure allocation)
            vm.setRam(8192)  // 8 GB
              .setBw(5000)   // 5 Gbps
              .setSize(100000); // 100 GB
            
            // Use TimeShared scheduler for concurrent cloudlet execution
            vm.setCloudletScheduler(new org.cloudsimplus.schedulers.cloudlet.CloudletSchedulerTimeShared());
            
            vmList.add(vm);
        }
        
        System.out.println("   ✓ Created " + vmList.size() + " VMs");
        
        return vmList;
    }
    
    /**
     * Create workload configuration for CloudSimWorkloadService
     */
    private CloudSimWorkloadService.WorkloadConfig createWorkloadConfig(COOlienceConfig config) {
        CloudSimWorkloadService.WorkloadConfig workloadConfig = 
            new CloudSimWorkloadService.WorkloadConfig();
        
        workloadConfig.numberOfServers = config.numberOfServers;
        workloadConfig.serversPerRack = config.serversPerRack;
        workloadConfig.serverMaxPowerW = config.serverMaxPowerW;
        workloadConfig.serverIdlePowerW = config.serverIdlePowerW;
        workloadConfig.coresPerServer = config.coresPerServer;
        workloadConfig.mipsPerCore = config.mipsPerCore;
        workloadConfig.workloadMode = config.workloadMode;
        workloadConfig.simulationHours = config.simulationHours;
        workloadConfig.schedulingIntervalSeconds = config.schedulingIntervalSeconds;
        workloadConfig.computeIntensityFactor = config.computeIntensityFactor;
        
        return workloadConfig;
    }
    
    /**
     * Collect results from simulation
     */
    private COOlienceResults collectResults(
            CloudSimWorkloadService.WorkloadResult workloadResult, 
            COOlienceConfig config) {
        
        COOlienceResults results = new COOlienceResults();
        
        // Copy workload profile
        results.hourlyITLoadKW = workloadResult.hourlyITLoadKW;
        results.rackITLoadKW = workloadResult.rackITLoadKW;
        results.hourlyUtilization = workloadResult.hourlyUtilization;
        results.hostUtilization = workloadResult.hostUtilization;
        
        // Copy metadata
        results.workloadMode = workloadResult.workloadMode;
        results.totalHours = workloadResult.totalHours;
        results.numberOfRacks = workloadResult.numberOfRacks;
        results.serversPerRack = workloadResult.serversPerRack;
        results.simulationStartYear = config.simulationStartYear;
        
        // Calculate sustainability metrics
        results.totalEnergyKWh = 0;
        for (double loadKW : results.hourlyITLoadKW) {
            results.totalEnergyKWh += loadKW;
        }
        
        results.totalCarbonKg = results.totalEnergyKWh * config.gridCarbonIntensity;
        results.totalCarbonTaxUSD = (results.totalCarbonKg / 1000.0) * config.carbonTaxRate;
        results.averagePUE = config.baselinePUE; // Will be updated by evaporative cooling simulation
        
        return results;
    }
    
    /**
     * Calculate multi-year financial projections (2025-2030)
     */
    private void calculateMultiYearProjections(COOlienceResults results, COOlienceConfig config) {
        double baseEnergyKWh = results.totalEnergyKWh;
        double baseCarbonKg = results.totalCarbonKg;
        
        for (int year = 0; year < 6; year++) {
            // Energy escalation
            double energyMultiplier = Math.pow(1.0 + config.energyEscalationRate, year);
            results.yearlyEnergyKWh[year] = baseEnergyKWh * energyMultiplier;
            
            // Energy cost escalation
            double tariffMultiplier = Math.pow(1.0 + config.energyEscalationRate, year);
            results.yearlyEnergyCostUSD[year] = results.yearlyEnergyKWh[year] * 
                config.electricityTariff * tariffMultiplier;
            
            // Carbon emissions (with grid decarbonization)
            double carbonIntensityMultiplier = Math.pow(1.0 - config.gridDecarbonizationRate, year);
            results.yearlyCarbonKg[year] = results.yearlyEnergyKWh[year] * 
                config.gridCarbonIntensity * carbonIntensityMultiplier;
            
            // Carbon tax escalation
            double carbonTaxMultiplier = Math.pow(1.0 + config.carbonTaxEscalationRate, year);
            results.yearlyCarbonTaxUSD[year] = (results.yearlyCarbonKg[year] / 1000.0) * 
                config.carbonTaxRate * carbonTaxMultiplier;
            
            // Total OPEX
            results.yearlyTotalOpexUSD[year] = results.yearlyEnergyCostUSD[year] + 
                results.yearlyCarbonTaxUSD[year];
        }
    }
    
    /**
     * Print simulation results
     */
    private void printResults(COOlienceResults results) {
        System.out.println();
        System.out.println("╔════════════════════════════════════════════════════════════╗");
        System.out.println("║              SIMULATION RESULTS SUMMARY                    ║");
        System.out.println("╚════════════════════════════════════════════════════════════╝");
        System.out.println();
        
        // Workload summary
        System.out.println("📊 WORKLOAD PROFILE:");
        System.out.println("   Mode: " + results.workloadMode);
        System.out.println("   Duration: " + results.totalHours + " hours");
        System.out.println("   Racks: " + results.numberOfRacks);
        System.out.println("   Servers per Rack: " + results.serversPerRack);
        System.out.println();
        
        // IT load statistics
        double minLoad = Double.MAX_VALUE;
        double maxLoad = Double.MIN_VALUE;
        double avgLoad = 0;
        
        for (double load : results.hourlyITLoadKW) {
            minLoad = Math.min(minLoad, load);
            maxLoad = Math.max(maxLoad, load);
            avgLoad += load;
        }
        avgLoad /= results.totalHours;
        
        System.out.println("⚡ IT LOAD STATISTICS:");
        System.out.println("   Average: " + String.format("%.2f", avgLoad) + " kW");
        System.out.println("   Minimum: " + String.format("%.2f", minLoad) + " kW");
        System.out.println("   Maximum: " + String.format("%.2f", maxLoad) + " kW");
        System.out.println("   Total Energy: " + String.format("%.2f", results.totalEnergyKWh) + " kWh");
        System.out.println();
        
        // Sustainability metrics
        System.out.println("🌍 SUSTAINABILITY METRICS:");
        System.out.println("   Total Carbon: " + String.format("%.2f", results.totalCarbonKg) + " kg CO2");
        System.out.println("   Carbon Tax: $" + String.format("%.2f", results.totalCarbonTaxUSD));
        System.out.println("   Average PUE: " + String.format("%.2f", results.averagePUE));
        System.out.println();
        
        // 5-year projections
        System.out.println("📈 5-YEAR PROJECTIONS (2025-2030):");
        System.out.println("   Year | Energy (kWh) | Energy Cost ($) | Carbon (kg) | Carbon Tax ($) | Total OPEX ($)");
        System.out.println("   -----|--------------|-----------------|-------------|----------------|---------------");
        
        for (int year = 0; year < 6; year++) {
            int displayYear = (int)results.simulationStartYear + year;
            System.out.println(String.format("   %d | %12.0f | %15.2f | %11.0f | %14.2f | %14.2f",
                displayYear,
                results.yearlyEnergyKWh[year],
                results.yearlyEnergyCostUSD[year],
                results.yearlyCarbonKg[year],
                results.yearlyCarbonTaxUSD[year],
                results.yearlyTotalOpexUSD[year]
            ));
        }
        System.out.println();
        
        // Sample hourly data (first 10 hours)
        System.out.println("📋 SAMPLE HOURLY DATA (First 10 hours):");
        System.out.println("   Hour | IT Load (kW) | Utilization (%)");
        System.out.println("   -----|--------------|----------------");
        
        for (int hour = 0; hour < Math.min(10, results.totalHours); hour++) {
            System.out.println(String.format("   %4d | %12.2f | %15.1f",
                hour,
                results.hourlyITLoadKW[hour],
                results.hourlyUtilization[hour] * 100
            ));
        }
    }
    
    /**
     * Export results to CSV for evaporative cooling analysis
     */
    public void exportToCSV(COOlienceResults results, String filename) {
        try (java.io.PrintWriter writer = new java.io.PrintWriter(filename)) {
            // Write header
            writer.println("hour,it_load_kw,utilization_percent,rack_0_kw,rack_1_kw,rack_2_kw,rack_3_kw,rack_4_kw");
            
            // Write data
            for (int hour = 0; hour < results.totalHours; hour++) {
                writer.print(hour + ",");
                writer.print(results.hourlyITLoadKW[hour] + ",");
                writer.print((results.hourlyUtilization[hour] * 100) + ",");
                
                // Write first 5 racks
                for (int rack = 0; rack < Math.min(5, results.numberOfRacks); rack++) {
                    writer.print(results.rackITLoadKW[rack][hour]);
                    if (rack < Math.min(4, results.numberOfRacks - 1)) {
                        writer.print(",");
                    }
                }
                writer.println();
            }
            
            System.out.println("✅ Results exported to: " + filename);
            
        } catch (Exception e) {
            System.err.println("❌ Failed to export results: " + e.getMessage());
        }
    }
}
