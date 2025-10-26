package com.acme.dccore;

import org.cloudsimplus.datacenters.Datacenter;
import org.cloudsimplus.datacenters.DatacenterSimple;
import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.core.Simulation;
import org.cloudsimplus.hosts.Host;
import org.cloudsimplus.hosts.HostSimple;
import org.cloudsimplus.provisioners.ResourceProvisionerSimple;
import org.cloudsimplus.resources.Pe;
import org.cloudsimplus.resources.PeSimple;
import org.cloudsimplus.utilizationmodels.UtilizationModelDynamic;
import org.cloudsimplus.vms.Vm;
import org.cloudsimplus.vms.VmSimple;
import org.cloudsimplus.allocationpolicies.VmAllocationPolicySimple;
import org.cloudsimplus.power.models.PowerModelHostSimple;
import org.cloudsimplus.util.Log;
import ch.qos.logback.classic.Level;

import java.util.ArrayList;
import java.util.List;

public class DataCenterBuilder {

    /**
     * Build a small datacenter with comprehensive thermal modeling
     */
    public static Datacenter buildSmallDC(Simulation sim) {
        return buildSmallDCWithThermalModeling(sim, 24.0); // 24°C supply temperature (cooler)
    }

    /**
     * Build a small datacenter without thermal output (for use with custom
     * analysis)
     */
    public static Datacenter buildSmallDCQuiet(Simulation sim) {
        return buildSmallDCQuietInternal(sim, 24.0);
    }

    /**
     * Build a datacenter with full thermal modeling capabilities
     */
    public static Datacenter buildSmallDCWithThermalModeling(Simulation sim, double supplyTempC) {
        List<Host> hostList = new ArrayList<>();
        List<RackSpec> racks = new ArrayList<>();

        // Define one rack with 4 servers and comprehensive thermal specs
        RackSpec rack = new RackSpec(1);
        ServerSpec serverSpec = new ServerSpec(
                4, // cores
                1000, // MIPS per core
                8192, // RAM MB
                100000L, // Storage MB (long)
                500.0, // max power W (increased from 400W)
                180.0, // idle power W (reduced from 200W)
                0.88, // psuEfficiency (88% - improved efficiency)
                true, // dualPSU (redundant PSU for high-power server)
                0.08, // psuOverhead (8% - higher overhead)
                450.0, // maxAirflowCFM (increased from 350 CFM)
                20.0, // deltaT_C (temperature rise - increased from 15°C)
                35.0, // maxInletTemp_C (increased from 32°C)
                16.0, // minInletTemp_C (reduced from 18°C)
                500.0, // thermalDesignPower (matches max power)
                0.18, // fanPowerPercent (18% of server power - increased)
                true, // variableFanSpeed
                0.4, // minFanSpeed (40% minimum - increased from 30%)
                2, // uHeight (2U server - taller server)
                "2U", // formFactor
                800.0, // depth_mm (0.8m = 800mm - deeper server)
                482.6 // width_mm (19" rack = 482.6mm)
        );

        // Create CloudSim hosts with thermal awareness - increased to 6 servers
        for (int i = 0; i < 6; i++) {
            rack.addServer(serverSpec);

            List<Pe> peList = new ArrayList<>();
            for (int c = 0; c < serverSpec.getCores(); c++) {
                peList.add(new PeSimple(serverSpec.getMipsPerCore()));
            }

            Host host = new HostSimple(
                    serverSpec.getRamMb(),
                    serverSpec.getStorageMb(),
                    serverSpec.getStorageMb(),
                    peList);
            host.setPowerModel(new PowerModelHostSimple(serverSpec.getMaxPowerW(), serverSpec.getIdlePowerW()));
            hostList.add(host);
        }

        racks.add(rack);

        // Print thermal analysis - DISABLED: Using updated analysis in App.java
        // printThermalAnalysis(racks, supplyTempC);

        // Ensure Datacenter lifecycle INFO logs are visible for callers (e.g., demos)
        Log.setLevel(Datacenter.LOGGER, Level.INFO);
        return new DatacenterSimple(sim, hostList, new VmAllocationPolicySimple());
    }

    /**
     * Build datacenter without thermal analysis output (quiet version)
     */
    public static Datacenter buildSmallDCQuietInternal(Simulation sim, double supplyTempC) {
        List<Host> hostList = new ArrayList<>();
        List<RackSpec> racks = new ArrayList<>();

        // Define one rack with 4 servers and comprehensive thermal specs
        RackSpec rack = new RackSpec(1);
        ServerSpec serverSpec = new ServerSpec(
                4, // cores
                1000, // MIPS per core
                8192, // RAM MB
                100000L, // Storage MB (long)
                500.0, // max power W (increased from 400W)
                180.0, // idle power W (reduced from 200W)
                0.88, // psuEfficiency (88% - improved efficiency)
                true, // dualPSU (redundant PSU for high-power server)
                0.08, // psuOverhead (8% - higher overhead)
                450.0, // maxAirflowCFM (increased from 350 CFM)
                20.0, // deltaT_C (temperature rise - increased from 15°C)
                35.0, // maxInletTemp_C (increased from 32°C)
                16.0, // minInletTemp_C (reduced from 18°C)
                500.0, // thermalDesignPower (matches max power)
                0.18, // fanPowerPercent (18% of server power - increased)
                true, // variableFanSpeed
                0.4, // minFanSpeed (40% minimum - increased from 30%)
                2, // uHeight (2U server - taller server)
                "2U", // formFactor
                800.0, // depth_mm (0.8m = 800mm - deeper server)
                482.6 // width_mm (19" rack = 482.6mm)
        );

        // Create CloudSim hosts with thermal awareness - increased to 6 servers
        for (int i = 0; i < 6; i++) {
            rack.addServer(serverSpec);

            List<Pe> peList = new ArrayList<>();
            for (int c = 0; c < serverSpec.getCores(); c++) {
                peList.add(new PeSimple(serverSpec.getMipsPerCore()));
            }

            Host host = new HostSimple(
                    serverSpec.getRamMb(),
                    serverSpec.getStorageMb(),
                    serverSpec.getStorageMb(),
                    peList);
            host.setPowerModel(new PowerModelHostSimple(serverSpec.getMaxPowerW(), serverSpec.getIdlePowerW()));
            hostList.add(host);
        }

        racks.add(rack);
        // NO thermal analysis output - using custom analysis in caller

        // Keep this quiet builder enabling Datacenter INFO logging as well so
        // callers that expect lifecycle messages (e.g., CRAH/CRAC demos) will
        // see consistent CloudSimPlus lifecycle output.
        Log.setLevel(Datacenter.LOGGER, Level.INFO);
        return new DatacenterSimple(sim, hostList, new VmAllocationPolicySimple());
    }

    /**
     * Print comprehensive thermal analysis of the datacenter
     */
    private static void printThermalAnalysis(List<RackSpec> racks, double supplyTempC) {
        System.out.println("\n=== DATACENTER THERMAL ANALYSIS ===");
        System.out.printf("Supply Temperature: %.1f°C\n", supplyTempC);
        System.out.println("----------------------------------------");

        for (RackSpec rack : racks) {
            System.out.printf("Rack %d Analysis:\n", rack.getRackId());
            System.out.printf("  Total Power: %.2f kW / %.2f kW (%.1f%% capacity)\n",
                    rack.getTotalPowerKW(), rack.getMaxPowerKW(), rack.getPowerUtilization() * 100);
            System.out.printf("  Total Airflow: %.0f CFM / %.0f CFM\n",
                    rack.getTotalAirflowCFM(), rack.getDesignAirflowCFM());
            System.out.printf("  Space Utilization: %.0f / %d U (%.1f%%)\n",
                    rack.getUsedRackUnits(), rack.getMaxRackUnits(), rack.getSpaceUtilization() * 100);

            double avgExhaust = rack.getAverageExhaustTempC(supplyTempC);
            System.out.printf("  Average Exhaust Temp: %.1f°C (ΔT = %.1f°C)\n",
                    avgExhaust, avgExhaust - supplyTempC);

            double rti = rack.calculateRTI(supplyTempC);
            System.out.printf("  Rack Thermal Index (RTI): %.2f %s\n",
                    rti, rti < 1.0 ? "(GOOD)" : "(NEEDS ATTENTION)");

            // Simulate inlet temperature distribution for RCI calculation
            double[] inletTemps = simulateInletTemperatures(supplyTempC, 10);
            double rciHI = rack.calculateRCI_HI(inletTemps);
            double rciLO = rack.calculateRCI_LO(inletTemps);
            System.out.printf("  RCI_HI: %.1f%% %s\n", rciHI, rciHI >= 90 ? "(GOOD)" : "(NEEDS ATTENTION)");
            System.out.printf("  RCI_LO: %.1f%% %s\n", rciLO, rciLO >= 90 ? "(GOOD)" : "(NEEDS ATTENTION)");

            System.out.println("  Server Details:");
            for (int i = 0; i < rack.getServers().size(); i++) {
                ServerSpec server = rack.getServers().get(i);
                double exhaustTemp = server.getExhaustTempC(supplyTempC, 0.8); // 80% utilization
                System.out.printf("    Server %d: Exhaust %.1f°C, Max Airflow %.0f CFM, Fan Power %.1fW\n",
                        i + 1, exhaustTemp, server.getMaxAirflowCFM(), server.getFanPowerW(0.8));
            }
            System.out.println();
        }
    }

    /**
     * Simulate inlet temperature distribution across rack servers
     */
    private static double[] simulateInletTemperatures(double supplyTemp, int numPoints) {
        double[] temps = new double[numPoints];
        // Simulate temperature variation due to mixing and recirculation
        for (int i = 0; i < numPoints; i++) {
            // Add some variation: ±2°C from supply temperature
            temps[i] = supplyTemp + (Math.random() - 0.5) * 4.0;
        }
        return temps;
    }
}
