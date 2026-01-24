
package com.example.coolingeconomizer.controller;

import com.acme.aireconcalc.AirEconomizerModel;
import com.acme.aireconcalc.EconomizerInputs;
import com.acme.aireconcalc.SimUtils;
import com.acme.aireconcalc.WeatherData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/simulation")
@CrossOrigin(origins = "*")
public class SimulationController {

    private static final Logger logger = LoggerFactory.getLogger(SimulationController.class);

    @PostMapping("/run")
    public Map<String, Object> runSimulation(@RequestBody SimulationRequest request) {
        // Log all received request data
        logger.info("[API] Received SimulationRequest: " + request);
        logger.info("[API] economizerMaxOutdoorTemp: " + request.economizerMaxOutdoorTemp);
        logger.info("[API] economizerMaxHumidity: " + request.economizerMaxHumidity);
        logger.info("[API] minOutdoorAirFraction: " + request.minOutdoorAirFraction);
        logger.info("[API] numberOfRacks: " + request.numberOfRacks);
        logger.info("[API] serversPerRack: " + request.serversPerRack);
        logger.info("[API] serverMaxPowerW: " + request.serverMaxPowerW);
        logger.info("[API] serverIdlePowerW: " + request.serverIdlePowerW);
        logger.info("[API] averageUtilization: " + request.averageUtilization);
        logger.info("[API] peakUtilization: " + request.peakUtilization);
        logger.info("[API] computeIntensityFactor: " + request.computeIntensityFactor);
        logger.info("[API] forecastYears: " + request.forecastYears);
        logger.info("[API] energyEscalationRate: " + request.energyEscalationRate);
        logger.info("[API] carbonTaxProjected: " + request.carbonTaxProjected);
        logger.info("[API] electricityTariff: " + request.electricityTariff);
        logger.info("[API] carbonIntensity: " + request.carbonIntensity);
        logger.info("[API] airflowCFM: " + request.airflowCFM);
        logger.info("[API] fans: " + request.fans);
        logger.info("[API] bestQuantity: " + request.bestQuantity + " bestEfficiency: " + request.bestEfficiency);
        logger.info("[API] averageQuantity: " + request.averageQuantity + " averageEfficiency: "
                + request.averageEfficiency);
        logger.info(
                "[API] legacyQuantity: " + request.legacyQuantity + " legacyEfficiency: " + request.legacyEfficiency);
        if (request.weatherData != null && !request.weatherData.isEmpty()) {
            logger.info("[API] weatherData[0]: " + request.weatherData.get(0));
        }
        logger.info("Simulation started for AI Workload Scenario");
        Map<String, Object> result = new LinkedHashMap<>();

        try {
            // 1. Map Request to EconomizerInputs
            EconomizerInputs in = new EconomizerInputs();

            // Basic Hardware Specs
            in.numServers = (request.numberOfRacks > 0 ? request.numberOfRacks : 1) *
                    (request.serversPerRack > 0 ? request.serversPerRack : 50);

            // Server Power with AI scaling defaults
            in.serverMaxPowerW = request.serverMaxPowerW > 0 ? request.serverMaxPowerW : 500.0;
            in.serverIdlePowerW = request.serverIdlePowerW > 0 ? request.serverIdlePowerW : 100.0;

            // AI & Future Proofing Inputs
            in.computeIntensityFactor = request.computeIntensityFactor > 0 ? request.computeIntensityFactor : 1.0;
            in.forecastYears = request.forecastYears > 0 ? request.forecastYears : 5;
            in.energyEscalationRate = request.energyEscalationRate >= 0 ? request.energyEscalationRate : 0.035;
            in.carbonTaxProjected = request.carbonTaxProjected >= 0 ? request.carbonTaxProjected : 0.0;

            // Economic & Environmental
            in.elecTariff_per_kWh = request.electricityTariff > 0 ? request.electricityTariff : 0.15;
            in.carbonIntensity_kg_per_kWh = request.carbonIntensity > 0 ? request.carbonIntensity : 0.055; // kg/kWh
            in.maxAirflowCFM = request.airflowCFM > 0 ? request.airflowCFM : 2000.0;

            // Economizer and airflow fields (the missing assignments!)
            in.economizerMaxOutdoorTemp = request.economizerMaxOutdoorTemp != null ? request.economizerMaxOutdoorTemp
                    : 24.0;
            in.economizerMaxHumidity = request.economizerMaxHumidity != null ? request.economizerMaxHumidity : 60.0;
            in.minOutdoorAirFraction = request.minOutdoorAirFraction != null ? request.minOutdoorAirFraction : 0.2;

            // Fan Efficiency Calculation
            if (request.fans != null) {
                // Calculate weighted efficiency if fans object is provided
                double totalFans = request.fans.bestFans + request.fans.averageFans + request.fans.oldFans;
                if (totalFans > 0) {
                    // Using rough defaults matching frontend if not explicitly sent in a
                    // "fanEfficiency" map
                    // Frontend sends raw counts. We can use standard efficiency values here or
                    // passed in.
                    // For now, assuming standard values: Best=0.35, Avg=0.6, Old=1.0 W/CFM
                    double weighted = (request.fans.bestFans * 0.35 +
                            request.fans.averageFans * 0.60 +
                            request.fans.oldFans * 1.0) / totalFans;
                    in.fanWeightedEfficiency = weighted;
                }
            }

            // Log model input check for economizer fields
            System.out.println(
                    "[MODEL INPUT CHECK] econTemp=" + in.economizerMaxOutdoorTemp +
                            " | econRH=" + in.economizerMaxHumidity +
                            " | minOA=" + in.minOutdoorAirFraction +
                            " | maxAirflowCFM=" + in.maxAirflowCFM);

            // 2. Run Hourly Simulation
            AirEconomizerModel model = new AirEconomizerModel();
            List<Map<String, Object>> hourlyProfile = new ArrayList<>();

            double totalItEnergy = 0;
            double totalCoolingEnergy = 0;
            double totalCarbon = 0;

            int steps = 24; // Default to 24 hours

            // Determine weather source
            boolean useProvidedWeather = request.weatherData != null && !request.weatherData.isEmpty();
            if (useProvidedWeather)
                steps = request.weatherData.size();

            for (int h = 0; h < steps; h++) {
                // Prepare Weather
                WeatherData w = new WeatherData();
                if (useProvidedWeather) {
                    WeatherEntryDTO wd = request.weatherData.get(h);
                    w.dryBulbC = wd.temperature != null ? wd.temperature : 20.0;
                    w.relativeHumidity = wd.humidity != null ? wd.humidity : 50.0;
                } else {
                    w.dryBulbC = SimUtils.getHourlyTempC(h % 24, 18.0, 30.0);
                    // Add climate offset
                    if (request.climateChangeOffsetC != 0) {
                        w.dryBulbC += request.climateChangeOffsetC;
                    }
                    w.relativeHumidity = 50.0;
                }

                // Prepare Utilization
                double util = 0.5; // default
                if (request.averageUtilization > 0) {
                    // Simple variation
                    double base = request.averageUtilization / 100.0;
                    double peak = request.peakUtilization / 100.0;
                    // Sine wave fluctuation between base and peak
                    util = base + (peak - base) * Math.sin((h % 24) * Math.PI / 12.0);
                    util = Math.max(0.1, Math.min(1.0, util));
                } else {
                    util = SimUtils.getHourlyUtilization(h % 24, 0.2, 0.8);
                }

                AirEconomizerModel.StepResult res = model.computeTimeStep(in, w, h, util);

                // Accumulate
                totalItEnergy += res.itLoad_kW;
                totalCoolingEnergy += (res.fanPower_kW + res.mechPower_kW);
                totalCarbon += (res.totalPower_kW * in.carbonIntensity_kg_per_kWh);

                // Add to profile
                Map<String, Object> hourMap = new LinkedHashMap<>();
                hourMap.put("hour", h);
                hourMap.put("timestamp", useProvidedWeather && request.weatherData.get(h).timestamp != null
                        ? request.weatherData.get(h).timestamp
                        : String.format("%02d:00", h % 24));
                hourMap.put("itLoadKW", res.itLoad_kW);
                hourMap.put("coolingLoadKW", res.coolingLoad_kW);
                hourMap.put("fanPowerKW", res.fanPower_kW);
                hourMap.put("mechPowerKW", res.mechPower_kW);
                hourMap.put("totalPowerKW", res.totalPower_kW);
                hourMap.put("tempC", w.dryBulbC);
                hourMap.put("rh", w.relativeHumidity);
                hourMap.put("mode", res.mode);
                hourMap.put("pue", res.pue);
                hourMap.put("cue", res.cue);
                hourlyProfile.add(hourMap);
            }

            // 3. TCO Forecast (AI Future-Proofing)
            List<Map<String, Object>> tcoForecast = new ArrayList<>();

            // Fix: Calculate Annual Energy based on simulation duration
            // If steps < 8760, we extrapolate. If steps >= 8760, we assume it's a full
            // year.
            double yearMult = (steps > 0) ? (8760.0 / steps) : 365.0;
            double annualEnergy = (totalItEnergy + totalCoolingEnergy) * yearMult;
            double annualCarbonTons = (totalCarbon * yearMult) / 1000.0;

            double currentElecRate = in.elecTariff_per_kWh;
            double baseCarbonTax = 65.0; // Starting baseline (EU ETS current approx)
            double targetCarbonTax = in.carbonTaxProjected > 0 ? in.carbonTaxProjected : 126.0; // 2030 Target

            for (int y = 1; y <= in.forecastYears; y++) {
                // Escalate Grid Cost
                double yearRate = currentElecRate * Math.pow(1 + in.energyEscalationRate, y - 1); // Start with Year 1
                                                                                                  // at base? Or Year 1
                                                                                                  // inflated? Usually
                                                                                                  // Y1 is current/next
                                                                                                  // year. Let's apply
                                                                                                  // inflation from Y2
                                                                                                  // onwards or Y1 if
                                                                                                  // base is Y0.
                // User said "Fix Year 1: gridCost[1] = estimatedOpExUSD".
                // If estimatedOpExUSD is based on *current* tariff, then Year 1 should use
                // current tariff (y=0 escalation).
                // Or if we consider "Future Proofing", year 1 is already future.
                // Let's align with user: Year 1 = Base cost. Year 2 = Base * (1+rate).

                if (y > 1) {
                    // Apply cumulative inflation for subsequent years
                    // Note: user said "Annual Inflation Rate".
                    // Formula: Cost_N = Cost_N-1 * (1+rate)
                    // which is Cost_1 * (1+rate)^(y-1)
                    yearRate = currentElecRate * Math.pow(1 + in.energyEscalationRate, y - 1);
                } else {
                    yearRate = currentElecRate;
                }

                double gridCost = annualEnergy * yearRate;

                // Ramp up Carbon Tax
                // Formula: Tax_Y = Base + (Target - Base) * (Year / Horizon_to_Target)
                // Assuming Target is 2030 (4 years from now)
                double taxRate = baseCarbonTax;
                int yearsToTarget = 4; // 2026 to 2030
                if (y <= yearsToTarget) {
                    taxRate = baseCarbonTax + ((double) y / yearsToTarget) * (targetCarbonTax - baseCarbonTax);
                } else {
                    taxRate = targetCarbonTax; // Capped at target after 2030
                }

                double carbonCost = annualCarbonTons * taxRate; // Euros/Dollars depending on unit. Assuming currency
                                                                // parity for sim.

                Map<String, Object> yearRow = new LinkedHashMap<>();
                yearRow.put("year", y);
                yearRow.put("gridCost", gridCost);
                yearRow.put("carbonCost", carbonCost);
                yearRow.put("totalTCO", gridCost + carbonCost);
                yearRow.put("energyKWh", annualEnergy);
                yearRow.put("carbonTaxRate", taxRate);
                tcoForecast.add(yearRow);
            }

            // 4. Final Response Construction
            result.put("summary", Map.of(
                    "totalItEnergyKWh", totalItEnergy,
                    "totalCoolingEnergyKWh", totalCoolingEnergy,
                    "totalEnergyKWh", totalItEnergy + totalCoolingEnergy,
                    "averagePUE", (totalItEnergy + totalCoolingEnergy) / totalItEnergy,
                    "averageCUE", totalCarbon / totalItEnergy,
                    "totalCarbonKg", totalCarbon,
                    "estimatedOpExUSD", (totalItEnergy + totalCoolingEnergy) * in.elecTariff_per_kWh));
            result.put("hourlyProfile", hourlyProfile);
            result.put("tcoForecast", tcoForecast);
            result.put("aiConfig", Map.of(
                    "computeIntensityFactor", in.computeIntensityFactor,
                    "forecastYears", in.forecastYears,
                    "upliftMessage", in.computeIntensityFactor > 1.0 ? "AI Scaling Applied" : "Standard Workload"));

        } catch (Exception e) {
            logger.error("Simulation failed", e);
            result.put("error", e.getMessage());
        }

        return result;
    }

    // ==========================================
    // DTO Classes
    // ==========================================

    public static class SimulationRequest {
        public int numberOfRacks;
        public int serversPerRack;

        public double serverMaxPowerW;
        public double serverIdlePowerW;

        public double averageUtilization;
        public double peakUtilization; // 0-100

        public double electricityTariff;
        public double carbonIntensity;
        public double airflowCFM;

        // New AI Fields
        public double computeIntensityFactor;
        public int forecastYears;
        public double energyEscalationRate;
        public double carbonTaxProjected;
        public double climateChangeOffsetC;

        public FanConfig fans;

        public List<WeatherEntryDTO> weatherData;

        // Economizer controls (added for mapping)
        public Double economizerMaxOutdoorTemp;
        public Double economizerMaxHumidity;
        public Double minOutdoorAirFraction;

        // Flat fan fields (added for mapping)
        public Integer bestQuantity;
        public Double bestEfficiency;
        public Integer averageQuantity;
        public Double averageEfficiency;
        public Integer legacyQuantity;
        public Double legacyEfficiency;
    }

    public static class FanConfig {
        public int bestFans;
        public int averageFans;
        public int oldFans;
    }

    public static class WeatherEntryDTO {
        public String timestamp;
        public Double temperature; // Accept 'temperature' maps to dryBulb
        public Double humidity; // Accept 'humidity' maps to RH
    }
}
