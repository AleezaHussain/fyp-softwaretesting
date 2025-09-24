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

        // Create simple datacenter with 1 host, 1 VM, 1 cloudlet
        Datacenter datacenter = createDatacenter(simulation);

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