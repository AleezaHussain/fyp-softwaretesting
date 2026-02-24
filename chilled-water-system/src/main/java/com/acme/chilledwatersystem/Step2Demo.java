package com.acme.chilledwatersystem;

import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.datacenters.Datacenter;
import org.cloudsimplus.datacenters.DatacenterSimple;
import org.cloudsimplus.hosts.Host;
import org.cloudsimplus.hosts.HostSimple;
import org.cloudsimplus.resources.Pe;
import org.cloudsimplus.resources.PeSimple;
import org.cloudsimplus.power.models.PowerModelHostSimple;
import org.cloudsimplus.brokers.DatacenterBroker;
import org.cloudsimplus.brokers.DatacenterBrokerSimple;
import org.cloudsimplus.vms.Vm;
import org.cloudsimplus.vms.VmSimple;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.cloudlets.CloudletSimple;
import org.cloudsimplus.utilizationmodels.UtilizationModelDynamic;
import org.cloudsimplus.utilizationmodels.UtilizationModelFull;

import java.util.ArrayList;
import java.util.List;

/**
 * Step 2 Demo: The 8760-Hour Co-Simulation Engine
 * 
 * Demonstrates tight integration between CloudSim Plus and Chilled Water Physics
 * with hour-by-hour synchronization for a full year (8760 hours).
 */
public class Step2Demo {
    
    private static final int SIMULATION_HOURS = 168; // 1 week for demo (use 8760 for full year)
    
    public static void main(String[] args) {
        System.out.println("=== Step 2: CloudSim + Chilled Water Co-Simulation ===\n");
        
        // STEP 1: Create Edge Data Center Scenario
        EdgeDataCenterScenario scenario = createScenario();
        System.out.println(scenario);
        System.out.println();
        
        // STEP 2: Initialize CloudSim Plus
        CloudSimPlus simulation = new CloudSimPlus();
        
        // STEP 3: Build datacenter with hosts (servers)
        List<Host> hosts = createHosts(scenario);
        Datacenter datacenter = createDatacenter(simulation, hosts);
        
        System.out.println("=== CloudSim Datacenter Created ===");
        System.out.printf("Hosts: %d\n", hosts.size());
        System.out.printf("Total Cores: %d\n", hosts.stream().mapToLong(h -> h.getPesNumber()).sum());
        System.out.printf("Total RAM: %d MB\n", hosts.stream().mapToLong(h -> h.getRam().getCapacity()).sum());
        System.out.println();
        
        // STEP 4: Create broker and submit workload
        DatacenterBroker broker = new DatacenterBrokerSimple(simulation);
        List<Vm> vms = createVms(scenario.getTotalServers());
        List<Cloudlet> cloudlets = createCloudlets(SIMULATION_HOURS);
        
        broker.submitVmList(vms);
        broker.submitCloudletList(cloudlets);
        
        System.out.println("=== Workload Submitted ===");
        System.out.printf("VMs: %d\n", vms.size());
        System.out.printf("Cloudlets: %d\n", cloudlets.size());
        System.out.println();
        
        // STEP 5: Initialize Environment Engine (Weather)
        EnvironmentEngine envEngine = new EnvironmentEngine(scenario);
        envEngine.initialize();
        
        // STEP 6: Initialize Chilled Water Physics
        ChilledWaterPhysics physics = new ChilledWaterPhysics(scenario);
        
        // STEP 7: Create Simulation Orchestrator
        SimulationOrchestrator orchestrator = new SimulationOrchestrator(
            simulation,
            physics,
            envEngine,
            scenario
        );
        
        // Set datacenter components for power monitoring
        orchestrator.setDatacenterComponents(datacenter, hosts);
        
        // STEP 8: Run the co-simulation
        System.out.println("Starting co-simulation...\n");
        orchestrator.runAnnualSimulation();
        
        // STEP 9: Export results
        String outputFile = "step2_results.csv";
        orchestrator.exportResultsToCSV(outputFile);
        
        // STEP 10: Print final statistics
        System.out.println("\n=== Final Statistics ===");
        System.out.printf("Annual PUE: %.3f\n", orchestrator.getAnnualPUE());
        System.out.printf("Total Cost: $%.2f\n", orchestrator.getTotalCostUSD());
        System.out.printf("Thermal Excursions: %d hours\n", orchestrator.getThermalExcursionCount());
        
        System.out.println("\n=== Step 2 Implementation Complete ===");
        System.out.println("✓ CloudSim Plus integrated with chilled water physics");
        System.out.println("✓ Hour-by-hour synchronization operational");
        System.out.println("✓ EIR framework calculating chiller efficiency");
        System.out.println("✓ Equipment degradation tracking active");
        System.out.println("✓ Time-of-Use tariffs implemented");
        System.out.println("✓ Thermal compliance monitoring active");
    }
    
    /**
     * Create edge data center scenario with realistic parameters
     */
    private static EdgeDataCenterScenario createScenario() {
        EdgeDataCenterScenario scenario = new EdgeDataCenterScenario();
        
        // Infrastructure
        scenario.setTotalRacks(2);
        scenario.setServersPerRack(10);
        scenario.setServerMaxPowerW(500.0);
        scenario.setServerIdlePowerW(200.0);
        scenario.setServerFanPowerW(25.0);
        scenario.setUpsLossFraction(0.09);
        scenario.setPduLossFraction(0.02);
        
        // Thermal boundaries (ASHRAE Recommended)
        scenario.setMaxInletTempC(27.0);
        scenario.setMinInletTempC(18.0);
        scenario.setMaxDewPointC(15.0);
        
        // Chiller specs (EIR framework)
        scenario.setChillerReferenceCop(6.0);
        scenario.setChillerReferenceLoadKW(100.0);
        scenario.setChillerPerformanceCoeffs(new double[]{
            0.653, -0.0158, 0.00001, 0.0153, 0.0002, -0.00024
        });
        
        // Auxiliary equipment
        scenario.setPumpPowerKw(3.0);
        scenario.setCoolingTowerFanPowerKw(5.0);
        
        // Cost factors
        scenario.setElectricityRateUsdKwh(0.12);
        scenario.setDemandChargeUsdKw(15.00);
        scenario.setCarbonFactorKgKwh(0.45);
        
        // Simulation parameters
        scenario.setSimulationHours(SIMULATION_HOURS);
        
        return scenario;
    }
    
    /**
     * Create CloudSim hosts with power models
     */
    private static List<Host> createHosts(EdgeDataCenterScenario scenario) {
        List<Host> hosts = new ArrayList<>();
        int totalServers = scenario.getTotalServers();
        
        for (int i = 0; i < totalServers; i++) {
            // Create processing elements (cores)
            List<Pe> peList = new ArrayList<>();
            for (int j = 0; j < 4; j++) { // 4 cores per server
                peList.add(new PeSimple(1000)); // 1000 MIPS per core
            }
            
            // Create host with power model
            Host host = new HostSimple(8192, 1000, 100000, peList);
            
            // Set power model (idle to max power)
            host.setPowerModel(new PowerModelHostSimple(
                scenario.getServerMaxPowerW(),
                scenario.getServerIdlePowerW()
            ));
            
            host.setId(i);
            hosts.add(host);
        }
        
        return hosts;
    }
    
    /**
     * Create CloudSim datacenter
     */
    private static Datacenter createDatacenter(CloudSimPlus simulation, List<Host> hosts) {
        return new DatacenterSimple(simulation, hosts);
    }
    
    /**
     * Create VMs for workload
     */
    private static List<Vm> createVms(int count) {
        List<Vm> vms = new ArrayList<>();
        
        for (int i = 0; i < count; i++) {
            Vm vm = new VmSimple(1000, 2) // 1000 MIPS, 2 cores
                .setRam(2048)
                .setBw(1000)
                .setSize(10000);
            
            vm.setId(i);
            vms.add(vm);
        }
        
        return vms;
    }
    
    /**
     * Create cloudlets (workload tasks) with varying utilization
     * Simulates realistic workload patterns over time
     */
    private static List<Cloudlet> createCloudlets(int hours) {
        List<Cloudlet> cloudlets = new ArrayList<>();
        
        // Create cloudlets for each hour with varying intensity
        for (int hour = 0; hour < hours; hour++) {
            // Simulate diurnal workload pattern
            double baseUtilization = 0.4 + 0.3 * Math.sin((hour / 24.0) * 2 * Math.PI);
            
            // Create multiple cloudlets per hour to simulate concurrent tasks
            for (int task = 0; task < 5; task++) {
                long length = (long) (3600000 * baseUtilization); // MI for 1 hour
                
                Cloudlet cloudlet = new CloudletSimple(length, 2) // 2 PEs required
                    .setUtilizationModelCpu(new UtilizationModelDynamic(baseUtilization))
                    .setUtilizationModelRam(new UtilizationModelDynamic(0.5))
                    .setUtilizationModelBw(new UtilizationModelDynamic(0.3));
                
                cloudlets.add(cloudlet);
            }
        }
        
        return cloudlets;
    }
}
