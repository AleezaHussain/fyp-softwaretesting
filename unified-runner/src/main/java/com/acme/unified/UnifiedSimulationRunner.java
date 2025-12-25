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
        System.out.println("==================================================");
        System.out.println("  AIR ECONOMIZER COOLING SIMULATION");
        System.out.println("==================================================\n");
        
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

        System.out.println("Configuration:");
        System.out.println("  Climate Zone: " + climateLabel);
        System.out.println("  Scale Factor: " + scaleFactor + " servers");
        System.out.println("  Simulation Duration: " + days + " days (" + (days * 24) + " hours)");
        
        double designMaxItKW = cfg.getDouble("design.max.it.kW", 500.0);

        // create techniques
        List<CoolingTechnique> techs = new ArrayList<>();
        // Running only Air Economizer
        techs.add(new AirEconomizerAdapter(scaleFactor));
        System.out.println("  Cooling Technique: Air Economizer\n");

        // climate + DC model for IT profile
        System.out.println("Initializing climate profile and datacenter model...");
        ClimateProfile climate = new ClimateProfile(climateLabel);

        // create a simple datacenter model to derive per-hour IT
        List<Server> servers = new ArrayList<>();
        for (int i = 0; i < scaleFactor; i++) servers.add(new Server("S" + i, 5.0));
        Rack rack = new Rack("R1", servers, Math.max(1.0, scaleFactor / 10.0));
        DataCenterModel dc = new DataCenterModel(List.of(rack), new ITLoadProfile());
        System.out.println("Datacenter: " + servers.size() + " servers in 1 rack\n");

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
        
        System.out.println("Economic Parameters:");
        System.out.println("  Electricity Tariff: $" + tariff + "/kWh");
        System.out.println("  CO2 Factor: " + co2factor + " kg/kWh\n");

        double[] totalEnergyKWh = new double[techs.size()];
        double[] totalCost = new double[techs.size()];
        double[] totalCO2 = new double[techs.size()];

        System.out.println("Starting simulation...");
        System.out.println("--------------------------------------------------\n");
        
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
            
            // Show progress every 240 hours (10 days)
            if ((hour + 1) % 240 == 0 || hour == 0) {
                int day = (hour + 1) / 24;
                System.out.printf("Hour %4d (Day %3d) | IT Load: %6.2f kW | Ambient: %5.1f°C | Wetbulb: %5.1f°C | Cooling: %6.2f kW\n", 
                    hour, day, itLoadKW, ambient, wetbulb, totalEnergyKWh[0] / (hour + 1));
            }
        }
        
        System.out.println("\n--------------------------------------------------");
        System.out.println("Simulation Complete!\n");
        
        System.out.println("Writing results to files...");
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

        System.out.println("\n==================================================");
        System.out.println("  SIMULATION RESULTS");
        System.out.println("==================================================\n");
        
        for (int i = 0; i < techs.size(); i++) {
            CoolingTechnique t = techs.get(i);
            System.out.println("Technique: " + t.getName());
            System.out.printf("  Total Energy: %,.2f kWh\n", totalEnergyKWh[i]);
            System.out.printf("  Total Cost: $%,.2f\n", totalCost[i]);
            System.out.printf("  Total CO2: %,.2f kg\n", totalCO2[i]);
            System.out.printf("  Water Usage: %,.2f L\n", t.getTotalWaterL());
            System.out.printf("  Average Cooling Power: %.2f kW\n", totalEnergyKWh[i] / totalHours);
        }
        
        System.out.println("\n==================================================");
        System.out.println("Results saved in: " + outDir.toAbsolutePath());
        System.out.println("==================================================");
    }
}
