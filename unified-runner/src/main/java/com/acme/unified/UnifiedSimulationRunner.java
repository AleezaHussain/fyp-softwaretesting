package com.acme.unified;

import com.acme.chilledwatersystem.SimConfig;
import com.acme.chilledwatersystem.ClimateProfile;
import com.acme.chilledwatersystem.datacenter.DataCenterModel;
import com.acme.chilledwatersystem.datacenter.ITLoadProfile;
import com.acme.chilledwatersystem.datacenter.Server;
import com.acme.chilledwatersystem.datacenter.Rack;

import java.io.BufferedWriter;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Unified simulation runner that runs CRAC, CRAH, and ChilledWater techniques on the same hourly inputs.
 */
public class UnifiedSimulationRunner {
    public static void main(String[] args) throws Exception {
        SimConfig cfg = new SimConfig();
        int days = 365;
        int scaleFactor = 100;
        String climateLabel = (args.length > 0) ? args[0] : "Houston";
        if (args.length > 1) {
            try { scaleFactor = Integer.parseInt(args[1]); } catch (Exception e) {}
        }
        if (args.length > 2) {
            try { days = Integer.parseInt(args[2]); } catch (Exception e) {}
        }

        double designMaxItKW = cfg.getDouble("design.max.it.kW", 500.0);

        // create techniques
        List<CoolingTechnique> techs = new ArrayList<>();
        techs.add(new CRACAdapter(designMaxItKW));
        techs.add(new CRAHAdapter(designMaxItKW));
    techs.add(new AirEconomizerAdapter(scaleFactor));
    techs.add(new ChilledWaterAdapter(scaleFactor));

        // climate + DC model for IT profile
        ClimateProfile climate = new ClimateProfile(climateLabel);

        // create a simple datacenter model to derive per-hour IT
        List<Server> servers = new ArrayList<>();
        for (int i = 0; i < scaleFactor; i++) servers.add(new Server("S" + i, 5.0));
        Rack rack = new Rack("R1", servers, Math.max(1.0, scaleFactor / 10.0));
        DataCenterModel dc = new DataCenterModel(List.of(rack), new ITLoadProfile());

        int totalHours = Math.max(1, days * 24);

        // Prepare output folder
        Path outDir = Path.of("unified-results");
        Files.createDirectories(outDir);

        // create per-technique hourly CSVs
        List<BufferedWriter> writers = new ArrayList<>();
        for (CoolingTechnique t : techs) {
            Path p = outDir.resolve(t.getName() + "-hourly.csv");
            BufferedWriter w = Files.newBufferedWriter(p);
            w.write("hour,it_kW,cooling_kW,ambientC,wetbulbC\n");
            writers.add(w);
        }

        double tariff = cfg.getDouble("electricity.tariff", 0.10);
        double co2factor = cfg.getDouble("co2.factor", 0.45);

        double[] totalEnergyKWh = new double[techs.size()];
        double[] totalCost = new double[techs.size()];
        double[] totalCO2 = new double[techs.size()];

        for (int hour = 0; hour < totalHours; hour++) {
            double itLoadKW = dc.updateAndGetTotalHeat(hour % 24);
            double ambient = climate.getAmbientTemp(hour);
            double wetbulb = climate.getWetBulbTemp(hour);

            for (int i = 0; i < techs.size(); i++) {
                CoolingTechnique t = techs.get(i);
                double coolingKW = t.simulateHour(itLoadKW, ambient, wetbulb, hour);
                totalEnergyKWh[i] += coolingKW; // 1-hour timestep
                totalCost[i] += coolingKW * tariff;
                totalCO2[i] += coolingKW * co2factor;
                BufferedWriter w = writers.get(i);
                w.write(String.format("%d,%.3f,%.3f,%.2f,%.2f\n", hour, itLoadKW, coolingKW, ambient, wetbulb));
            }
        }

        for (BufferedWriter w : writers) w.close();

        // write summary
        Path sum = outDir.resolve("summary.csv");
        try (BufferedWriter w = Files.newBufferedWriter(sum)) {
            w.write("tech,energy_kWh,cost_usd,co2_kg,water_L\n");
            for (int i = 0; i < techs.size(); i++) {
                CoolingTechnique t = techs.get(i);
                w.write(String.format("%s,%.2f,%.2f,%.2f,%.2f\n",
                        t.getName(), totalEnergyKWh[i], totalCost[i], totalCO2[i], t.getTotalWaterL()));
            }
        }

        System.out.println("Unified simulation finished. Results in: " + outDir.toAbsolutePath());
    }
}
