package org.cloudbus.cloudsim.chilledwater;

import java.util.List;
import org.cloudbus.cloudsim.datacenter.*;

public class ChilledWaterMain {
    public static void main(String[] args) {
        // --- Data-center side ---
        // CLI args: [0]=climateSource, [1]=configOverridePath, [2]=outCsv, [3]=scaleFactor, [4]=days
        int scaleFactor = 100; // number of servers to create
        int days = 365;
        if (args.length > 3) {
            try { scaleFactor = Integer.parseInt(args[3]); } catch (Exception e) { }
        }
        if (args.length > 4) {
            try { days = Integer.parseInt(args[4]); } catch (Exception e) { }
        }

        java.util.List<Server> servers = new java.util.ArrayList<>();
        for (int i = 0; i < scaleFactor; i++) {
            // each server nominal 5 kW
            servers.add(new Server("S" + i, 5));
        }
        Rack rack = new Rack("R1", servers, Math.max(1.0, scaleFactor / 10.0));
        DataCenterModel dc = new DataCenterModel(List.of(rack), new ITLoadProfile());

        // --- Cooling side ---
        CRAHUnit crah = new CRAHUnit();
        ChillerUnit chiller = new ChillerUnit();
        CoolingTower tower = new CoolingTower();
        PumpSystem pump = new PumpSystem();
    // increase ΔT to 10°C to reduce design flow and pump power
    SimConfig cfg = new SimConfig();
    // optionally override config with provided file
    if (args.length > 1) cfg.loadFromFile(java.nio.file.Path.of(args[1]));

    WaterLoop loop = new WaterLoop((int)cfg.getDouble("water.flowLps",50), (int)cfg.getDouble("water.deltaT",10));
    String climateSource = (args.length > 0) ? args[0] : "Houston";
    ClimateProfile climate = new ClimateProfile(climateSource);
    CoolingMetrics metrics = new CoolingMetrics(cfg);

    java.util.List<HourlyResult> rows = new java.util.ArrayList<>();
    double prevCumulativeWaterL = 0.0;

        ChilledWaterCoolingSystem system =
            new ChilledWaterCoolingSystem(List.of(crah), chiller, tower, pump, climate, loop, metrics);

        int totalHours = Math.max(1, days * 24);
        for (int hour = 0; hour < totalHours; hour++) {
            int localHour = hour % 24; // reuse 24-hour profiles
            double itLoadKW = dc.updateAndGetTotalHeat(localHour);
            // pass per-rack list to the cooling system so it can compute per-rack fan/pump behavior
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
            // also mirror into the explicit per-component fields (for backward/forward compatibility)
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
        if (wue > 0) System.out.printf("WUE: %.3f L/kWh\n", wue);
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
    }
}
