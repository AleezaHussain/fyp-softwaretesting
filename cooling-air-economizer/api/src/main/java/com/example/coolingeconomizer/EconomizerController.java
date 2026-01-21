package com.example.coolingeconomizer;

import com.acme.aireconcalc.AirEconomizerModel;
import com.acme.aireconcalc.EconomizerInputs;
import com.acme.aireconcalc.SimUtils;
import com.acme.aireconcalc.WeatherData;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Allow frontend access
public class EconomizerController {

    @GetMapping("/simulate")
    public SimulationResponse runSimulation() {
        System.out.println("[EconomizerController] GET /simulate called");
        SimulationResponse resp = runSimulationPost(new SimulationRequest());
        System.out.println("[EconomizerController] GET /simulate response: " + resp);
        return resp;
    }

    @PostMapping("/simulate")
    public SimulationResponse runSimulationPost(@RequestBody(required = false) SimulationRequest req) {
        System.out.println("[EconomizerController] POST /simulate called");
        if (req == null) {
            System.out.println("[EconomizerController] No request body provided, using defaults");
            req = new SimulationRequest(); // Safety fallback
        } else {
            System.out.println("[EconomizerController] Request body: " + req);
        }

        // 1. Map DTO to Inputs
        EconomizerInputs in = new EconomizerInputs();
        int racks = req.numberOfRacks > 0 ? req.numberOfRacks : 1;
        int servers = req.serversPerRack > 0 ? req.serversPerRack : 50;
        in.numServers = racks * servers;
        System.out.println("[EconomizerController] numServers: " + in.numServers);

        in.serverMaxPowerW = req.serverMaxPowerW > 0 ? req.serverMaxPowerW : 93.6;
        in.serverIdlePowerW = req.serverIdlePowerW > 0 ? req.serverIdlePowerW : 19.7;
        System.out.println("[EconomizerController] serverMaxPowerW: " + in.serverMaxPowerW + ", serverIdlePowerW: "
                + in.serverIdlePowerW);

        in.carbonIntensity_kg_per_kWh = req.carbonIntensity > 0 ? req.carbonIntensity : 0.055;
        in.elecTariff_per_kWh = req.electricityTariff > 0 ? req.electricityTariff : 0.15;
        System.out.println("[EconomizerController] carbonIntensity: " + in.carbonIntensity_kg_per_kWh + ", elecTariff: "
                + in.elecTariff_per_kWh);

        double peakUtil = req.peakUtilization > 0 ? req.peakUtilization / 100.0 : 0.7;
        double avgUtil = req.averageUtilization > 0 ? req.averageUtilization / 100.0 : 0.4;
        double minUtil = Math.max(0.1, 2 * avgUtil - peakUtil);
        System.out.println(
                "[EconomizerController] peakUtil: " + peakUtil + ", avgUtil: " + avgUtil + ", minUtil: " + minUtil);

        in.fanWeightedEfficiency = 0.516;
        in.maxAirflowCFM = 2000.0;
        in.mechCOP = 3.0;

        AirEconomizerModel model = new AirEconomizerModel();
        List<AirEconomizerModel.StepResult> hourlyResults = new ArrayList<>();

        double totalItEnergy = 0;
        double totalCoolingEnergy = 0;
        double totalCarbon = 0;

        boolean useProvidedWeather = req.weatherData != null && !req.weatherData.isEmpty();
        int steps = useProvidedWeather ? req.weatherData.size() : 24;
        System.out.println("[EconomizerController] useProvidedWeather: " + useProvidedWeather + ", steps: " + steps);

        for (int h = 0; h < steps; h++) {
            WeatherData w = new WeatherData();
            if (useProvidedWeather) {
                WeatherEntryDTO entry = req.weatherData.get(h);
                w.dryBulbC = entry.dryBulbC != null ? entry.dryBulbC : (entry.tempC != null ? entry.tempC : 20.0);
                w.relativeHumidity = entry.relativeHumidity != null ? entry.relativeHumidity
                        : (entry.rh != null ? entry.rh : 50.0);
                System.out.println("[EconomizerController] WeatherData (provided) h=" + h + ": dryBulbC=" + w.dryBulbC
                        + ", rh=" + w.relativeHumidity);
            } else {
                w.dryBulbC = SimUtils.getHourlyTempC(h % 24, 18.0, 30.0);
                w.relativeHumidity = 50.0;
                System.out.println("[EconomizerController] WeatherData (mock) h=" + h + ": dryBulbC=" + w.dryBulbC
                        + ", rh=" + w.relativeHumidity);
            }
            double util = SimUtils.getHourlyUtilization(h % 24, minUtil, peakUtil);
            System.out.println("[EconomizerController] Utilization h=" + h + ": util=" + util);
            AirEconomizerModel.StepResult res = model.computeTimeStep(in, w, h, util);
            hourlyResults.add(res);
            totalItEnergy += res.itLoad_kW;
            totalCoolingEnergy += (res.fanPower_kW + res.mechPower_kW);
            totalCarbon += (res.totalPower_kW * in.carbonIntensity_kg_per_kWh);
        }

        SimulationResponse resp = new SimulationResponse();
        resp.hourlyResults = hourlyResults;
        resp.summary = new SimulationSummary();
        resp.summary.totalItEnergy_kWh = totalItEnergy;
        resp.summary.totalCoolingEnergy_kWh = totalCoolingEnergy;
        resp.summary.totalEnergy_kWh = totalItEnergy + totalCoolingEnergy;
        resp.summary.averagePUE = totalItEnergy > 0 ? (resp.summary.totalEnergy_kWh / totalItEnergy) : 0;
        resp.summary.averageCUE = totalItEnergy > 0 ? (totalCarbon / totalItEnergy) : 0;
        resp.summary.estimatedOpExUSD = resp.summary.totalEnergy_kWh * in.elecTariff_per_kWh;
        System.out.println("[EconomizerController] SimulationResponse: " + resp);
        return resp;
    }

    // DTOs
    public static class SimulationResponse {
        public SimulationSummary summary;
        public List<AirEconomizerModel.StepResult> hourlyResults;
    }

    public static class SimulationSummary {
        public double totalItEnergy_kWh;
        public double totalCoolingEnergy_kWh;
        public double totalEnergy_kWh;
        public double averagePUE;
        public double averageCUE;
        public double estimatedOpExUSD;
    }

    // Request DTO matched to User Payload
    public static class SimulationRequest {
        public int numberOfRacks;
        public int serversPerRack;
        public double serverMaxPowerW;
        public double serverIdlePowerW;
        public double averageUtilization; // 0-100
        public double peakUtilization; // 0-100
        public double carbonIntensity;
        public double electricityTariff;
        public String country;
        public List<WeatherEntryDTO> weatherData;
    }

    public static class WeatherEntryDTO {
        // Supporting potential field names
        public Double dryBulbC;
        public Double tempC;
        public Double relativeHumidity;
        public Double rh;
    }
}
