package com.acme.chilledwatersystem;

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
 * Phase 2 Part 2 Demo: Enhanced 8760-Hour Co-Simulation
 * 
 * Demonstrates:
 * - Conservative synchronization between CloudSim and physics
 * - Time-of-Use (TOU) tariff tracking
 * - Peak demand monitoring
 * - Equipment degradation over 8760 hours
 * - Thermal compliance checking
 * - Hourly carbon and water accounting
 */
public class Phase2Part2Demo {
    
    private static final int HOSTS = 2;
    private static final int VMS_PER_HOST = 2;
    private static final int CLOUDLETS_PER_VM = 100;
    
    public static void main(String[] args) {
        System.out.println("╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  PHASE 2 PART 2: ENHANCED 8760-HOUR CO-SIMULATION DEMO               ║");
        System.out.println("║  Conservative Synchronization with Time-of-Use Tariffs               ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        new Phase2Part2Demo().run();
    }
    
    private void run() {
        // ===================================================================
        // STEP 1: Initialize CloudSim Plus
        // ===================================================================
        CloudSimPlus simulation = new CloudSimPlus();
        
        // ===================================================================
        // STEP 2: Create Edge Data Center Scenario
        // ===================================================================
        EdgeDataCenterScenario scenario = new EdgeDataCenterScenario();
        scenario.setLocation("Austin, TX");
        scenario.setDesignAmbientC(35.0);
        scenario.setDesignWetBulbC(24.0);
        // Use existing setters for chilled water temperatures
        scenario.setChilledWaterSupplyTempC(7.0);
        scenario.setChilledWaterReturnTempC(12.0);
        scenario.setElectricityRateUsdKwh(0.12);
        scenario.setCarbonFactorKgKwh(0.45);
        
        System.out.println("Scenario Configuration:");
        System.out.println("  Location: " + scenario.getLocation());
        System.out.println("  Design Ambient: " + scenario.getDesignAmbientC() + "°C");
        System.out.println("  Design Wet-Bulb: " + scenario.getDesignWetBulbC() + "°C");
        System.out.println("  Electricity Rate: $" + scenario.getElectricityRateUsdKwh() + "/kWh");
        System.out.println();
        
        // ===================================================================
        // STEP 3: Create Datacenter with Power Models
        // ===================================================================
        List<Host> hostList = new ArrayList<>();
        for (int i = 0; i < HOSTS; i++) {
            Host host = createHost(i);
            hostList.add(host);
        }
        
        Datacenter datacenter = new DatacenterSimple(simulation, hostList);
        datacenter.setSchedulingInterval(3600); // 1 hour intervals
        
        // ===================================================================
        // STEP 4: Create Broker and VMs
        // ===================================================================
        DatacenterBroker broker = new DatacenterBrokerSimple(simulation);
        
        List<Vm> vmList = new ArrayList<>();
        for (int i = 0; i < HOSTS * VMS_PER_HOST; i++) {
            Vm vm = createVm(i);
            vmList.add(vm);
        }
        broker.submitVmList(vmList);
        
        // ===================================================================
        // STEP 5: Create Cloudlets (Workload)
        // ===================================================================
        List<Cloudlet> cloudletList = new ArrayList<>();
        for (int i = 0; i < VMS_PER_HOST * CLOUDLETS_PER_VM; i++) {
            Cloudlet cloudlet = createCloudlet(i);
            cloudletList.add(cloudlet);
        }
        broker.submitCloudletList(cloudletList);
        
        // ===================================================================
        // STEP 6: Initialize Physics and Environment
        // ===================================================================
        ChilledWaterPhysics physics = new ChilledWaterPhysics(scenario);
        EnvironmentEngine weather = new EnvironmentEngine(scenario);
        TariffSchedule tariff = new TariffSchedule();
        
        // ===================================================================
        // STEP 7: Create Enhanced Orchestrator
        // ===================================================================
        EnhancedSimulationOrchestrator orchestrator = new EnhancedSimulationOrchestrator(
            simulation,
            broker,
            hostList,
            physics,
            weather,
            tariff,
            scenario
        );
        
        // ===================================================================
        // STEP 8: Run 8760-Hour Simulation
        // ===================================================================
        System.out.println("Starting CloudSim Plus simulation...\n");
        simulation.start();
        
        System.out.println("\nCloudSim Plus simulation complete. Starting orchestrated co-simulation...\n");
        orchestrator.runAnnualSimulation();
        
        // ===================================================================
        // STEP 9: Analyze Results
        // ===================================================================
        analyzeResults(orchestrator);
        
        System.out.println("\n✅ Phase 2 Part 2 Demo Complete!");
        System.out.println("   Enhanced 8760-hour co-simulation with TOU tariffs and compliance tracking.\n");
    }
    
    /**
     * Create a host with power model
     */
    private Host createHost(int id) {
        List<Pe> peList = new ArrayList<>();
        long mips = 10000;
        
        // 8 cores per host
        for (int i = 0; i < 8; i++) {
            peList.add(new PeSimple(mips));
        }
        
        long ram = 32768; // 32 GB
        long storage = 1000000; // 1 TB
        long bw = 10000; // 10 Gbps
        
        Host host = new HostSimple(ram, bw, storage, peList);
        
        // Power model: maxPower=450W, staticPower=200W
        // Constructor: PowerModelHostSimple(double maxPower, double staticPower)
        PowerModelHostSimple powerModel = new PowerModelHostSimple(450, 200);
        host.setPowerModel(powerModel);
        host.setId(id);
        
        return host;
    }
    
    /**
     * Create a VM
     */
    private Vm createVm(int id) {
        long mips = 5000;
        long size = 10000; // 10 GB
        int ram = 4096; // 4 GB
        long bw = 1000;
        int pesNumber = 2;
        
        return new VmSimple(id, mips, pesNumber)
            .setRam(ram)
            .setBw(bw)
            .setSize(size);
    }
    
    /**
     * Create a cloudlet (task)
     */
    private Cloudlet createCloudlet(int id) {
        long length = 400000; // MI
        long fileSize = 300;
        long outputSize = 300;
        int pesNumber = 1;
        
        UtilizationModelDynamic utilizationModel = new UtilizationModelDynamic(0.3, 0.8);
        
        return new CloudletSimple(id, length, pesNumber)
            .setFileSize(fileSize)
            .setOutputSize(outputSize)
            .setUtilizationModelCpu(utilizationModel)
            .setUtilizationModelRam(utilizationModel)
            .setUtilizationModelBw(utilizationModel);
    }
    
    /**
     * Analyze and print detailed results
     */
    private void analyzeResults(EnhancedSimulationOrchestrator orchestrator) {
        List<HourlyResult> results = orchestrator.getResults();
        
        System.out.println("\n═".repeat(75));
        System.out.println("DETAILED ANALYSIS");
        System.out.println("═".repeat(75));
        
        // Find peak demand hour
        HourlyResult peakHour = results.stream()
            .max((r1, r2) -> Double.compare(r1.getTotalFacilityKw(), r2.getTotalFacilityKw()))
            .orElse(null);
        
        if (peakHour != null) {
            System.out.println("\nPEAK DEMAND HOUR:");
            System.out.println("  " + peakHour);
        }
        
        // Find worst thermal excursion
        HourlyResult worstThermal = results.stream()
            .filter(r -> !r.isThermalCompliance())
            .max((r1, r2) -> Double.compare(r1.getRackInletTempC(), r2.getRackInletTempC()))
            .orElse(null);
        
        if (worstThermal != null) {
            System.out.println("\nWORST THERMAL EXCURSION:");
            System.out.println("  " + worstThermal);
        }
        
        // Calculate seasonal averages
        double summerPUE = 0.0;
        double winterPUE = 0.0;
        int summerCount = 0;
        int winterCount = 0;
        
        for (int i = 0; i < results.size(); i++) {
            HourlyResult result = results.get(i);
            int month = (i / 730) + 1;
            
            if (month >= 6 && month <= 8) { // Summer
                summerPUE += result.getPue();
                summerCount++;
            } else if (month == 12 || month <= 2) { // Winter
                winterPUE += result.getPue();
                winterCount++;
            }
        }
        
        System.out.println("\nSEASONAL ANALYSIS:");
        System.out.printf("  Summer Average PUE: %.3f\n", summerPUE / summerCount);
        System.out.printf("  Winter Average PUE: %.3f\n", winterPUE / winterCount);
        System.out.printf("  Seasonal Variation: %.1f%%\n", 
            ((summerPUE / summerCount) - (winterPUE / winterCount)) / (winterPUE / winterCount) * 100);
        
        System.out.println("\n" + "═".repeat(75));
    }
}
