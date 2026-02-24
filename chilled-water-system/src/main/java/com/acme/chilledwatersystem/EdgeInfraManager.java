package com.acme.chilledwatersystem;

import org.cloudsimplus.hosts.Host;
import org.cloudsimplus.hosts.HostSimple;
import org.cloudsimplus.resources.Pe;
import org.cloudsimplus.resources.PeSimple;
import org.cloudsimplus.power.models.PowerModelHost;
import org.cloudsimplus.power.models.PowerModelHostSimple;

import java.util.ArrayList;
import java.util.List;

/**
 * Step 1.1: The Hardware Factory (EdgeInfraManager)
 * 
 * Uses CloudSimPlus to build servers (Hosts) with numerical power values
 * from EdgeDataCenterScenario. This creates the "Digital Twin" infrastructure.
 */
public class EdgeInfraManager {
    private final EdgeDataCenterScenario scenario;
    private List<Host> hosts;
    private double totalDesignPowerKW;

    public EdgeInfraManager(EdgeDataCenterScenario scenario) {
        this.scenario = scenario;
        this.hosts = new ArrayList<>();
        this.totalDesignPowerKW = 0.0;
    }

    /**
     * Build CloudSim hosts based on scenario specifications
     */
    public List<Host> buildHosts() {
        hosts.clear();
        int totalServers = scenario.getTotalServers();

        for (int i = 0; i < totalServers; i++) {
            Host host = createHost(i);
            hosts.add(host);
        }

        totalDesignPowerKW = scenario.getTotalDesignPowerKW();
        return hosts;
    }

    /**
     * Create a single host with power model based on scenario specs
     */
    private Host createHost(int id) {
        // Create processing elements (cores)
        int cores = 4; // Default for edge servers
        long mips = 1000; // MIPS per core
        List<Pe> peList = new ArrayList<>();
        for (int i = 0; i < cores; i++) {
            peList.add(new PeSimple(mips));
        }

        // Memory and storage (typical edge server specs)
        long ram = 8192; // MB
        long storage = 100000; // MB
        long bw = 1000; // Mbps

        // Create host
        Host host = new HostSimple(ram, bw, storage, peList);

        // Set power model using scenario values
        PowerModelHost powerModel = createPowerModel();
        host.setPowerModel(powerModel);

        return host;
    }

    /**
     * Create power model from scenario specifications
     * Power varies linearly between idle and max based on CPU utilization
     */
    private PowerModelHost createPowerModel() {
        double maxPowerWatts = scenario.getServerMaxPowerW();
        double idlePowerWatts = scenario.getServerIdlePowerW();

        // CloudSim PowerModelHostSimple uses: P = maxPower * utilization + staticPower
        // We need: P = idlePower + (maxPower - idlePower) * utilization
        // This matches: P = (maxPower - idlePower) * utilization + idlePower
        
        return new PowerModelHostSimple(maxPowerWatts, idlePowerWatts);
    }

    /**
     * Calculate current IT load based on host utilization
     * Includes server fan power and UPS/PDU losses
     */
    public double calculateCurrentITLoadKW(List<Host> activeHosts) {
        double serverPowerW = 0.0;

        for (Host host : activeHosts) {
            // Get power consumption from CloudSim power model
            double hostPowerW = host.getPowerModel().getPower();
            serverPowerW += hostPowerW;
            
            // Add internal server fan power (part of IT load per standards)
            serverPowerW += scenario.getServerFanPowerW();
        }

        // Convert to kW
        double serverPowerKW = serverPowerW / 1000.0;

        // Add UPS losses (facility overhead, but must be cooled)
        double upsLosses = serverPowerKW * scenario.getUpsLossFraction();
        
        // Add PDU losses
        double pduLosses = serverPowerKW * scenario.getPduLossFraction();

        // Total heat load that must be removed by cooling system
        return serverPowerKW + upsLosses + pduLosses;
    }

    /**
     * Calculate IT load for a given utilization percentage (0-100)
     * Useful for testing scenarios without running full CloudSim
     */
    public double calculateITLoadAtUtilization(double utilizationPercent) {
        double utilization = utilizationPercent / 100.0;
        int totalServers = scenario.getTotalServers();
        
        double idlePower = scenario.getServerIdlePowerW();
        double maxPower = scenario.getServerMaxPowerW();
        double fanPower = scenario.getServerFanPowerW();
        
        // Power per server: idle + (max - idle) * utilization + fan
        double powerPerServerW = idlePower + (maxPower - idlePower) * utilization + fanPower;
        double totalServerPowerW = powerPerServerW * totalServers;
        double totalServerPowerKW = totalServerPowerW / 1000.0;
        
        // Add UPS and PDU losses
        double upsLosses = totalServerPowerKW * scenario.getUpsLossFraction();
        double pduLosses = totalServerPowerKW * scenario.getPduLossFraction();
        
        return totalServerPowerKW + upsLosses + pduLosses;
    }

    // Getters
    public List<Host> getHosts() {
        return hosts;
    }

    public double getTotalDesignPowerKW() {
        return totalDesignPowerKW;
    }

    public EdgeDataCenterScenario getScenario() {
        return scenario;
    }

    /**
     * Print infrastructure summary
     */
    public void printSummary() {
        System.out.println("=== Edge Infrastructure Summary ===");
        System.out.printf("Total Racks: %d\n", scenario.getTotalRacks());
        System.out.printf("Servers per Rack: %d\n", scenario.getServersPerRack());
        System.out.printf("Total Servers: %d\n", scenario.getTotalServers());
        System.out.printf("Server Power: %.1f W (idle) to %.1f W (max)\n", 
            scenario.getServerIdlePowerW(), scenario.getServerMaxPowerW());
        System.out.printf("Total Design IT Power: %.2f kW\n", totalDesignPowerKW);
        System.out.printf("UPS Loss Factor: %.1f%%\n", scenario.getUpsLossFraction() * 100);
        System.out.printf("PDU Loss Factor: %.1f%%\n", scenario.getPduLossFraction() * 100);
        System.out.println("===================================\n");
    }
}
