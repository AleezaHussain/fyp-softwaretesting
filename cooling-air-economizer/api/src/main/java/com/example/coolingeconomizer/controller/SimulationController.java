package com.example.coolingeconomizer.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.*;

import com.example.coolingeconomizer.model.SimulationRequest;
import com.acme.dccore.RackSpec;
import com.acme.dccore.ServerSpec;
import com.acme.aireconcalc.ThermalIntegrator;

@RestController
@RequestMapping("/api/simulation")
public class SimulationController {

    private static final Logger logger = LoggerFactory.getLogger(SimulationController.class);

    @PostMapping("/run")
    public Map<String, Object> runSimulation(
            @RequestBody SimulationRequest request) {

        logger.info("Simulation started");
        logger.debug("Incoming SimulationRequest: {}", request);

        Map<String, Object> result = new LinkedHashMap<>();

        try {
            // ===============================
            // 1) Build Server + Rack Model
            // ===============================
            ServerSpec server = new ServerSpec(
                    8, 2500, 32768, 1000000L,
                    request.serverMaxPowerW,
                    request.serverIdlePowerW,
                    request.psuEfficiency,
                    request.dualPSU,
                    request.psuOverhead,
                    request.serverMaxAirflowCFM,
                    request.serverDeltaT,
                    request.serverMaxInletTemp,
                    request.serverMinInletTemp,
                    200.0,
                    request.serverFanPowerPercent,
                    request.variableFanSpeed,
                    request.minFanSpeed,
                    request.serverUHeight,
                    request.formFactor,
                    request.serverDepthMm,
                    request.serverWidthMm);

            logger.debug("ServerSpec: {}", server);

            List<RackSpec> racks = new ArrayList<>();
            for (int i = 0; i < request.numberOfRacks; i++) {
                RackSpec rack = new RackSpec(i + 1);
                for (int j = 0; j < request.serversPerRack; j++) {
                    rack.addServer(server);
                }
                racks.add(rack);
            }
            logger.debug("RackSpec count: {}", racks.size());

            // ===============================
            // 2) Inputs
            // ===============================
            double utilization = request.averageUtilization / 100.0;
            double supplyTemp = request.supplyAirTemp != null ? request.supplyAirTemp : 18.0;
            double deltaT = request.deltaT != null ? request.deltaT : 12.0;
            double returnTemp = supplyTemp + deltaT;
            double airflow = request.airflowCFM != null ? request.airflowCFM : 2000.0;

            double econEnableTemp = request.economizerEnableTemp != null ? request.economizerEnableTemp : 24.0;
            double mechCOP = request.mechanicalCOP != null ? request.mechanicalCOP : 3.5;

            double tariff = request.electricityTariff;
            double carbon = request.carbonIntensity;

            logger.debug(
                    "Inputs: utilization={}, supplyTemp={}, deltaT={}, returnTemp={}, airflow={}, econEnableTemp={}, mechCOP={}, tariff={}, carbon={}",
                    utilization, supplyTemp, deltaT, returnTemp, airflow, econEnableTemp, mechCOP, tariff, carbon);

            // ===============================
            // 3) Aggregates
            // ===============================
            double totalEnergy = 0;
            double totalCooling = 0;
            double totalFan = 0;
            double totalCost = 0;
            double totalCO2 = 0;

            List<Map<String, Object>> hourlyProfile = new ArrayList<>();

            // ===============================
            // 4) Hourly Simulation
            // ===============================
            for (SimulationRequest.WeatherData wd : request.weatherData) {
                logger.debug("WeatherData: timestamp={}, dryBulb={}, humidity={}", wd.timestamp, wd.dryBulb,
                        wd.relativeHumidity);

                boolean economizerActive = wd.dryBulb <= econEnableTemp;

                ThermalIntegrator.ThermalLoad load = ThermalIntegrator.calculateThermalLoad(
                        racks,
                        utilization,
                        supplyTemp,
                        returnTemp,
                        airflow,
                        deltaT);

                logger.debug("ThermalLoad: ITLoadKW={}, FanPowerKW={}, EstimatedCoolingKW={}", load.totalITLoadKW,
                        load.totalFanPowerKW, load.estimatedCoolingPowerKW);

                // Cooling logic
                if (economizerActive) {
                    load.estimatedCoolingPowerKW = (load.totalITLoadKW + load.totalFanPowerKW) * 0.15; // fans + dampers
                } else {
                    load.estimatedCoolingPowerKW = (load.totalITLoadKW + load.totalFanPowerKW) / mechCOP;
                }

                double hourKW = load.totalITLoadKW
                        + load.totalFanPowerKW
                        + load.estimatedCoolingPowerKW;

                double cost = hourKW * tariff;
                double co2 = hourKW * carbon;

                logger.debug("Hour: hourKW={}, cost={}, co2={}", hourKW, cost, co2);

                totalEnergy += hourKW;
                totalCooling += load.estimatedCoolingPowerKW;
                totalFan += load.totalFanPowerKW;
                totalCost += cost;
                totalCO2 += co2;

                Map<String, Object> hour = new LinkedHashMap<>();
                hour.put("timestamp", wd.timestamp);
                hour.put("economizer", economizerActive);
                hour.put("itKW", load.totalITLoadKW);
                hour.put("fanKW", load.totalFanPowerKW);
                hour.put("coolingKW", load.estimatedCoolingPowerKW);
                hour.put("totalKW", hourKW);
                hour.put("cost", cost);
                hour.put("co2", co2);

                hourlyProfile.add(hour);
            }

            // ===============================
            // 5) Response
            // ===============================
            logger.debug(
                    "Simulation result: totalEnergyKWh={}, totalCoolingKWh={}, totalFanKWh={}, totalCost={}, totalCO2={}, hourlyProfile.size={}",
                    totalEnergy, totalCooling, totalFan, totalCost, totalCO2, hourlyProfile.size());
            result.put("totalEnergyKWh", totalEnergy);
            result.put("totalCoolingKWh", totalCooling);
            result.put("totalFanKWh", totalFan);
            result.put("totalCost", totalCost);
            result.put("totalCO2", totalCO2);
            result.put("hourlyProfile", hourlyProfile);

        } catch (Exception e) {
            logger.error("Simulation failed", e);
            result.put("error", e.getMessage());
        }

        return result;
    }
}
