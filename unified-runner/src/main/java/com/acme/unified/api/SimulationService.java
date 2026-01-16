package com.acme.unified.api;

import com.acme.chilledwatersystem.SimConfig;
import com.acme.chilledwatersystem.ClimateProfile;
import com.acme.chilledwatersystem.datacenter.DataCenterModel;
import com.acme.chilledwatersystem.datacenter.ITLoadProfile;
import com.acme.chilledwatersystem.datacenter.Server;
import com.acme.chilledwatersystem.datacenter.Rack;
import com.acme.unified.*;

import java.util.ArrayList;
import java.util.List;

public class SimulationService {

    public SimulationDtos.SimulationResult runSimulation(SimulationDtos.SimParams params) {
        SimConfig cfg = new SimConfig();
        int days = params.days > 0 ? params.days : 365;
        int scaleFactor = params.scaleFactor > 0 ? params.scaleFactor : 100;
        int racks = params.racks > 0 ? params.racks : 5;
        double itLoadPerRack = params.itLoadPerRack > 0 ? params.itLoadPerRack : 5.0;
        double waterAvailability = params.waterAvailability >= 0 ? params.waterAvailability : 100.0;
        double windSpeed = params.windSpeed >= 0 ? params.windSpeed : 2.0;
        List<String> selectedTechniques = params.techniques != null && !params.techniques.isEmpty()
                ? params.techniques
                : List.of("CRAC", "CRAH", "AirEconomizer", "ChilledWater");

        String climateLabel = (params.climateLabel != null && !params.climateLabel.isEmpty())
                ? params.climateLabel
                : "Houston";

        double designMaxItKW = racks * itLoadPerRack;

        List<CoolingTechnique> techs = new ArrayList<>();
        if (selectedTechniques.contains("CRAC")) techs.add(new CRACAdapter(designMaxItKW));
        if (selectedTechniques.contains("CRAH")) techs.add(new CRAHAdapter(designMaxItKW));
        if (selectedTechniques.contains("AirEconomizer")) techs.add(new AirEconomizerAdapter(scaleFactor));
        if (selectedTechniques.contains("ChilledWater")) techs.add(new ChilledWaterAdapter(scaleFactor));

        ClimateProfile climate = new ClimateProfile(climateLabel);

        List<Rack> rackList = new ArrayList<>();
        for (int r = 0; r < racks; r++) {
            List<Server> servers = new ArrayList<>();
            for (int s = 0; s < Math.max(1, scaleFactor / racks); s++) {
                servers.add(new Server("R" + r + "S" + s, itLoadPerRack));
            }
            rackList.add(new Rack("R" + r, servers, 1.0));
        }
        DataCenterModel dc = new DataCenterModel(rackList, new ITLoadProfile());

        int totalHours = Math.max(1, days * 24);

        double tariff = cfg.getDouble("electricity.tariff", 0.10);
        double co2factor = cfg.getDouble("co2.factor", 0.45);

        double[] totalEnergyKWh = new double[techs.size()];
        double[] totalCost = new double[techs.size()];
        double[] totalCO2 = new double[techs.size()];

        List<SimulationDtos.HourResult> hourResults = new ArrayList<>();

        for (int hour = 0; hour < totalHours; hour++) {
            double itLoadKW = dc.updateAndGetTotalHeat(hour % 24);
            double ambient = climate.getAmbientTemp(hour);
            double wetbulb = climate.getWetBulbTemp(hour);

            for (int i = 0; i < techs.size(); i++) {
                CoolingTechnique t = techs.get(i);
                double coolingKW = t.simulateHour(itLoadKW, ambient, wetbulb, hour);
                totalEnergyKWh[i] += coolingKW;
                totalCost[i] += coolingKW * tariff;
                totalCO2[i] += coolingKW * co2factor;

                SimulationDtos.HourResult hr = new SimulationDtos.HourResult();
                hr.hour = hour;
                hr.technique = t.getName();
                hr.itKW = itLoadKW;
                hr.coolingKW = coolingKW;
                hr.ambientC = ambient;
                hr.wetbulbC = wetbulb;
                hourResults.add(hr);
            }
        }

        List<SimulationDtos.SummaryRow> summary = new ArrayList<>();
        for (int i = 0; i < techs.size(); i++) {
            CoolingTechnique t = techs.get(i);
            SimulationDtos.SummaryRow row = new SimulationDtos.SummaryRow();
            row.tech = t.getName();
            row.energyKWh = totalEnergyKWh[i];
            row.costUsd = totalCost[i];
            row.co2Kg = totalCO2[i];
            row.waterL = t.getTotalWaterL();
            summary.add(row);
        }

        SimulationDtos.SimulationResult result = new SimulationDtos.SimulationResult();
        result.hours = hourResults;
        result.summary = summary;
        return result;
    }
}
