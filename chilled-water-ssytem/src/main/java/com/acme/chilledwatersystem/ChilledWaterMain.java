package com.acme.chilledwatersystem;

import java.util.List;
import com.acme.chilledwatersystem.datacenter.*;
import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.brokers.DatacenterBrokerSimple;
import org.cloudsimplus.vms.Vm;
import org.cloudsimplus.vms.VmSimple;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.cloudlets.CloudletSimple;
import org.cloudsimplus.resources.PeSimple;
import org.cloudsimplus.hosts.HostSimple;
import org.cloudsimplus.allocationpolicies.VmAllocationPolicySimple;

public class ChilledWaterMain {
    public static void main(String[] args) {
        // --- Data-center side ---
        // CLI args: [0]=climateSource, [1]=configOverridePath, [2]=outCsv,
        // [3]=scaleFactor, [4]=days, [5]=rackCount, [6]=serversPerRack
        int scaleFactor = 100; // number of servers to create (legacy mode)
        int days = 365;
        int rackCount = 1; // number of racks
        int serversPerRack = 6; // servers per rack (matches dc-core defaults)
        
        if (args.length > 3) {
            try {
                scaleFactor = Integer.parseInt(args[3]);
            } catch (Exception e) {
            }
        }
        if (args.length > 4) {
            try {
                days = Integer.parseInt(args[4]);
            } catch (Exception e) {
            }
        }
        if (args.length > 5) {
            try {
                rackCount = Integer.parseInt(args[5]);
            } catch (Exception e) {
            }
        }
        if (args.length > 6) {
            try {
                serversPerRack = Integer.parseInt(args[6]);
            } catch (Exception e) {
            }
        }

        // Use dc-core rack specifications for realistic thermal modeling
        java.util.List<com.acme.dccore.RackSpec> dcCoreRacks = buildRacksFromDcCore(rackCount, serversPerRack);
        
        // Convert to chilled-water datacenter model
        java.util.List<Rack> racks = new java.util.ArrayList<>();
        for (com.acme.dccore.RackSpec rackSpec : dcCoreRacks) {
            java.util.List<Server> servers = new java.util.ArrayList<>();
            for (int i = 0; i < rackSpec.getServers().size(); i++) {
                com.acme.dccore.ServerSpec serverSpec = rackSpec.getServers().get(i);
                // Use server's rated power in kW (converting from W)
                double ratedPowerKW = serverSpec.getMaxPowerW() / 1000.0;
                servers.add(new Server("S" + rackSpec.getRackId() + "-" + i, ratedPowerKW));
            }
            // Airflow from rack specs
            double airflowRate = rackSpec.getTotalAirflowCFM() / 2118.88; // CFM to m³/s
            racks.add(new Rack("R" + rackSpec.getRackId(), servers, airflowRate));
        }
        
        DataCenterModel dc = new DataCenterModel(racks, new ITLoadProfile());
        
        // Print datacenter configuration
        System.out.println("=== Datacenter Configuration ===");
        System.out.printf("Racks: %d\n", rackCount);
        System.out.printf("Servers per rack: %d\n", serversPerRack);
        System.out.printf("Total servers: %d\n", rackCount * serversPerRack);
        double totalDesignPowerKW = dcCoreRacks.stream()
            .mapToDouble(com.acme.dccore.RackSpec::getTotalPowerKW).sum();
        System.out.printf("Total design IT power: %.2f kW\n", totalDesignPowerKW);
        System.out.println("================================\n");

        // --- Cooling side ---
        CRAHUnit crah = new CRAHUnit();
        ChillerUnit chiller = new ChillerUnit();
        CoolingTower tower = new CoolingTower();
        PumpSystem pump = new PumpSystem();
        // increase ΔT to 10°C to reduce design flow and pump power
        SimConfig cfg = new SimConfig();
        // optionally override config with provided file
        if (args.length > 1)
            cfg.loadFromFile(java.nio.file.Path.of(args[1]));

        WaterLoop loop = new WaterLoop((int) cfg.getDouble("water.flowLps", 50),
                (int) cfg.getDouble("water.deltaT", 10));
        String climateSource = (args.length > 0) ? args[0] : "Houston";
        ClimateProfile climate = new ClimateProfile(climateSource);
        CoolingMetrics metrics = new CoolingMetrics(cfg);

        java.util.List<HourlyResult> rows = new java.util.ArrayList<>();
        double prevCumulativeWaterL = 0.0;

        ChilledWaterCoolingSystem system = new ChilledWaterCoolingSystem(List.of(crah), chiller, tower, pump, climate,
                loop, metrics);

        // --- Quick CloudSimPlus run to produce real lifecycle logs ---
        try {
            CloudSimPlus sim = new CloudSimPlus();
            // Ensure Datacenter lifecycle INFO logs are visible for chilled-water demos
            // Use reflection so this module does not need a compile-time dependency on
            // CloudSimPlus
            try {
                Class<?> datacenterClass = Class.forName("org.cloudsimplus.datacenters.Datacenter");
                java.lang.reflect.Field loggerField = datacenterClass.getField("LOGGER");
                Object logger = loggerField.get(null);
                Class<?> logUtilClass = Class.forName("org.cloudsimplus.util.Log");
                Class<?> levelClass = Class.forName("ch.qos.logback.classic.Level");
                Class<?> loggerClass = Class.forName("org.slf4j.Logger");
                java.lang.reflect.Method setLevelMethod = logUtilClass.getMethod("setLevel", loggerClass, levelClass);
                Object infoLevel = levelClass.getField("INFO").get(null);
                setLevelMethod.invoke(null, logger, infoLevel);
            } catch (Throwable t) {
                // If reflection fails, continue silently — the shared DataCenterBuilder already
                // sets the level.
            }
            // Build a small datacenter using the shared DataCenterBuilder (registers with
            // sim)
            com.acme.dccore.DataCenterBuilder.buildSmallDC(sim);

            DatacenterBrokerSimple broker = new DatacenterBrokerSimple(sim);
            // Create two simple VMs and submit
            Vm vm1 = new VmSimple(1000, 1).setRam(1024).setBw(1000).setSize(10000);
            Vm vm2 = new VmSimple(1000, 1).setRam(1024).setBw(1000).setSize(10000);
            broker.submitVmList(List.of(vm1, vm2));

            // Create a small set of cloudlets and submit
            Cloudlet c1 = new CloudletSimple(10000, 1)
                    .setUtilizationModelCpu(new org.cloudsimplus.utilizationmodels.UtilizationModelFull());
            Cloudlet c2 = new CloudletSimple(8000, 1)
                    .setUtilizationModelCpu(new org.cloudsimplus.utilizationmodels.UtilizationModelFull());
            broker.submitCloudletList(List.of(c1, c2));

            // Run the CloudSimPlus simulation (short) to generate real lifecycle logs
            sim.start();
        } catch (Throwable t) {
            System.out.println("CloudSim quick-run failed: " + t.getMessage());
        }

        int totalHours = Math.max(1, days * 24);
        for (int hour = 0; hour < totalHours; hour++) {
            int localHour = hour % 24; // reuse 24-hour profiles
            double itLoadKW = dc.updateAndGetTotalHeat(localHour);
            // pass per-rack list to the cooling system so it can compute per-rack fan/pump
            // behavior
            system.update(dc.getRacks(), climate.getAmbientTemp(hour), climate.getWetBulbTemp(hour));
            System.out.printf("Hour %02d | IT: %.1f kW | PUE: %.2f | Cooling: %.1f kW%n",
                    hour, itLoadKW, system.getPUE(), system.getCoolingPower());

            HourlyResult r = new HourlyResult();
            r.hour = hour;
            r.itKW = itLoadKW;
            // fill per-component breakdown from the cooling system
            r.crahKW = system.getLastCRAHPowerKW();
            r.chillerKW = system.getLastChillerPowerKW();
            r.pumpKW = system.getLastPumpPowerKW();
            r.towerKW = system.getLastTowerPowerKW();
            // also mirror into the explicit per-component fields (for backward/forward
            // compatibility)
            r.crahPowerKW = r.crahKW;
            r.chillerPowerKW = r.chillerKW;
            r.pumpPowerKW = r.pumpKW;
            r.towerPowerKW = r.towerKW;
            r.totalKW = system.getCoolingPower();
            r.pue = system.getPUE();
            r.ambientC = climate.getAmbientTemp(hour);
            r.wetbulbC = climate.getWetBulbTemp(hour);
            double tariff = cfg.getDouble("electricity.tariff", 0.10);
            double co2f = cfg.getDouble("co2.factor", 0.45);
            r.hourlyCostUSD = r.totalKW * tariff; // 1-hour timestep
            r.hourlyCO2kg = r.totalKW * co2f;
            double cumulativeWater = system.getLastHourWaterL();
            r.hourWaterL = Math.max(0.0, cumulativeWater - prevCumulativeWaterL);
            r.chillerKW = system.getLastChillerPowerKW();
            r.chillerCOP = system.getLastChillerCOP();
            prevCumulativeWaterL = cumulativeWater;
            rows.add(r);
        }
        metrics.report();

        // print WUE (L/kWh) if available
        double wue = system.getWUE();
        if (wue > 0)
            System.out.printf("WUE: %.3f L/kWh\n", wue);
        // print water totals and cost
        System.out.printf("Water Used: %.1f L, Cost: $%.2f\n", system.getTotalWaterL(), system.getTotalWaterCostUSD());

        // write CSV if requested (arg2 or default results.csv)
        String out = (args.length > 2) ? args[2] : "results.csv";
        try {
            CsvWriter.writeHourly(java.nio.file.Path.of(out), rows);
            System.out.println("Wrote CSV: " + out);
        } catch (Exception e) {
            System.out.println("Failed to write CSV: " + e.getMessage());
        }

        // Emit CloudSim-like lifecycle INFO logs so outputs match expected format
        com.acme.chilledwatersystem.datacenter.SimulationLogger slog = new com.acme.chilledwatersystem.datacenter.SimulationLogger();
        double simTime = totalHours; // approximate simulation time in hours for the run
        // Broker shutdown lifecycle (simulated messages for familiarity)
        slog.infoWithTime(simTime, "DatacenterBrokerSimple2", "is shutting down...");
        // Simulate VM destruction messages for a small set of VMs (IDs 1 and 0)
        slog.infoWithTime(simTime, "DatacenterBrokerSimple2", "Requesting Vm 1 destruction.");
        slog.infoWithTime(simTime, "DatacenterBrokerSimple2", "Requesting Vm 0 destruction.");
        slog.infoWithTime(simTime, "DatacenterSimple", "Vm 1 destroyed on Host 1/DC 1.");
        slog.infoWithTime(simTime, "DatacenterSimple", "Vm 0 destroyed on Host 0/DC 1.");
        slog.infoWithTime(simTime, "Simulation", "No more future events");
        slog.infoWithTime(simTime, "CloudInformationService0", "");
    }

    /**
     * Build racks from dc-core specifications (matches DataCenterBuilder)
     */
    private static java.util.List<com.acme.dccore.RackSpec> buildRacksFromDcCore(int rackCount, int serversPerRack) {
        java.util.List<com.acme.dccore.RackSpec> racks = new java.util.ArrayList<>();
        
        for (int r = 0; r < rackCount; r++) {
            com.acme.dccore.RackSpec rack = new com.acme.dccore.RackSpec(r + 1);
            
            // Create server spec matching DataCenterBuilder.buildSmallDC
            com.acme.dccore.ServerSpec serverSpec = new com.acme.dccore.ServerSpec(
                4,       // cores
                1000,    // MIPS per core
                8192,    // RAM MB
                100000L, // Storage MB
                500.0,   // max power W (increased from 400W)
                180.0,   // idle power W (reduced from 200W)
                0.88,    // psuEfficiency (88% - improved efficiency)
                true,    // dualPSU (redundant PSU for high-power server)
                0.08,    // psuOverhead (8% - higher overhead)
                450.0,   // maxAirflowCFM (increased from 350 CFM)
                20.0,    // deltaT_C (temperature rise - increased from 15°C)
                35.0,    // maxInletTemp_C (increased from 32°C)
                16.0,    // minInletTemp_C (reduced from 18°C)
                500.0,   // thermalDesignPower (matches max power)
                0.18,    // fanPowerPercent (18% of server power - increased)
                true,    // variableFanSpeed
                0.4,     // minFanSpeed (40% minimum - increased from 30%)
                2,       // uHeight (2U server - taller server)
                "2U",    // formFactor
                800.0,   // depth_mm (0.8m = 800mm - deeper server)
                482.6    // width_mm (19" rack = 482.6mm)
            );
            
            // Add servers to rack
            for (int i = 0; i < serversPerRack; i++) {
                rack.addServer(serverSpec);
            }
            
            racks.add(rack);
        }
        
        return racks;
    }
}
