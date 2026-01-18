package com.acme.dccore;

import org.cloudsimplus.builders.tables.CloudletsTableBuilder;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.cloudlets.CloudletSimple;
import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.datacenters.Datacenter;
import org.cloudsimplus.datacenters.DatacenterSimple;
import org.cloudsimplus.hosts.Host;
import org.cloudsimplus.hosts.HostSimple;
import org.cloudsimplus.resources.Pe;
import org.cloudsimplus.resources.PeSimple;
import org.cloudsimplus.utilizationmodels.UtilizationModelFull;
import org.cloudsimplus.vms.Vm;
import org.cloudsimplus.vms.VmSimple;

import java.util.ArrayList;
import java.util.List;

public class SimpleCloudSimTest {
    public static void main(String[] args) {
        // Create CloudSim Plus simulation
        CloudSimPlus simulation = new CloudSimPlus();

        // Create datacenter with hosts
        Datacenter datacenter = createDatacenter(simulation);
        List<Host> hosts = datacenter.getHostList();

        // Create VMs and cloudlets
        List<Vm> vmList = new ArrayList<>();
        List<Cloudlet> cloudletList = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            Vm vm = new VmSimple(i, 1000, 1); // 1000 MIPS, 1 core
            vm.setRam(1024).setBw(1000).setSize(10000);
            vmList.add(vm);
            Cloudlet cloudlet = new CloudletSimple(i, 10000, 1); // length, cores
            cloudlet.setUtilizationModel(new UtilizationModelFull());
            cloudletList.add(cloudlet);
        }
        // Replace with correct broker reference
        // Example:
        // DatacenterBroker broker = simulation.getFirstBroker();
        // broker.submitVmList(vmList);
        // broker.submitCloudletList(cloudletList);

        // Immersion cooling setup (example values)
        ImmersionCoolingUnit coolingUnit = new ImmersionCoolingUnit(
                0.000083, // flowRate m^3/s (5 lpm)
                1800,     // fluidCp J/(kg*K)
                1200,     // fluidDensity kg/m^3
                35,       // inletTemp deg C
                100,      // heatTransferCoeff
                0.65,     // pumpEfficiency
                4.0,      // chillerCOP
                35,       // bathSetpoint
                45,       // maxBathTemp
                25        // minBathTemp
        );
        ImmersionThermalModel thermalModel = new ImmersionThermalModel(35, 10000);
        ImmersionCoolingController controller = new ImmersionCoolingController(35, 45, 25);
        ImmersionCoolingPowerModel powerModel = new ImmersionCoolingPowerModel();
        ImmersionCoolingPolicy policy = new ImmersionCoolingPolicy(50, 55);

        // Register ImmersionCoolingManager for periodic thermal/cooling events
    double timestepSeconds = 10; // 10s timestep
    ImmersionCoolingManager manager = new ImmersionCoolingManager(
        timestepSeconds, hosts,
        coolingUnit, thermalModel, controller, powerModel, policy);
    // If needed, register manager with clock tick listener instead of addEntity

        System.out.println("CloudSim Plus 8.0.0 is working!");
        simulation.start();
        System.out.println("Simulation finished successfully!");
    }

    private static Datacenter createDatacenter(CloudSimPlus simulation) {
        List<Host> hostList = new ArrayList<>();

        // Create processing elements (CPU cores)
        List<Pe> peList = new ArrayList<>();
        peList.add(new PeSimple(1000)); // 1000 MIPS

        // Create host
        Host host = new HostSimple(4096, 10000, 100000, peList);
        hostList.add(host);

        // Create datacenter
        return new DatacenterSimple(simulation, hostList);
    }
}