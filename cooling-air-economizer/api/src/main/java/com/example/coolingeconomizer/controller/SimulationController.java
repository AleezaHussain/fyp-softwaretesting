
package com.example.coolingeconomizer.controller;

import com.acme.aireconcalc.AirEconomizerModel;
import com.acme.aireconcalc.EconomizerInputs;
import com.acme.aireconcalc.ProjectionEngine;
import com.acme.aireconcalc.SimUtils;
import com.acme.aireconcalc.WeatherData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * SimulationController — Air-Side Economizer REST endpoint.
 *
 * POST /api/simulation/run
 *
 * Changes vs previous version:
 *  1. summary now includes ALL fields from the old EconomizerController response:
 *       totalCapexUSD, annualSavingsUSD, carbonSavings_kg, carbonTaxCostUSD,
 *       waterUsage_liters, electricityCostUSD, paybackPeriodYears,
 *       energySavingsPercent, totalCarbonEmissions_kg, totalItEnergy_kWh,
 *       averagePUE, averageCUE, estimatedOpExUSD, totalCoolingEnergy_kWh,
 *       totalEnergy_kWh
 *  2. projection object added (calls ProjectionEngine) with npvSavings,
 *       adjustedPaybackYears, yearlyData[] (cumulativeSavings, temperatureOffsetC,
 *       coolingLoadIncrease, etc.)
 *  3. rackAnalysis added: maxRackLoadKW, averageRackLoadKW, loadImbalanceFactor,
 *       hotspotRacks, totalRacks, airflowViolations[]
 *  4. hourlyProfile entries now include ALL old fields:
 *       timestampHour, outdoorTempC, outdoorRH, itLoad_kW, coolingLoad_kW,
 *       q_free_kW, mech_load_kW, requiredAirflow_CFM, airflowViolation,
 *       violationMsg, fanPower_kW, mechPower_kW, totalPower_kW, pue, cue, mode
 *  5. Physics fix: CloudSim IT load is fed into computeTimeStepWithCloudSimLoad()
 *       so q_free_kW / mech_load_kW / requiredAirflow_CFM are consistent with
 *       the actual CloudSim load (not the utilization-derived load).
 *  6. Root-level fields added: cloudSimEnabled, workloadMode, averageUtilization
 */
@RestController
@RequestMapping("/api/simulation")
@CrossOrigin(origins = "*")
public class SimulationController {

    private static final Logger logger = LoggerFactory.getLogger(SimulationController.class);

    // Baseline PUE for a mechanical-only (no economizer) reference system
    private static final double BASELINE_PUE = 1.8;

    @PostMapping("/run")
    public Map<String, Object> runSimulation(@RequestBody SimulationRequest request) {
        logger.info("[API] Received SimulationRequest: numberOfRacks={}, serversPerRack={}, serverMaxPowerW={}",
                request.numberOfRacks, request.serversPerRack, request.serverMaxPowerW);

        Map<String, Object> result = new LinkedHashMap<>();

        try {
            // ─────────────────────────────────────────────────────────────────
            // 1. Map Request → EconomizerInputs
            // ─────────────────────────────────────────────────────────────────
            EconomizerInputs in = new EconomizerInputs();

            in.numServers = (request.numberOfRacks > 0 ? request.numberOfRacks : 1)
                    * (request.serversPerRack > 0 ? request.serversPerRack : 50);

            in.serverMaxPowerW  = request.serverMaxPowerW  > 0 ? request.serverMaxPowerW  : 500.0;
            in.serverIdlePowerW = request.serverIdlePowerW > 0 ? request.serverIdlePowerW : 100.0;

            in.computeIntensityFactor = request.computeIntensityFactor > 0 ? request.computeIntensityFactor : 1.0;
            in.forecastYears          = request.forecastYears > 0 ? request.forecastYears : 5;
            in.energyEscalationRate   = request.energyEscalationRate >= 0 ? request.energyEscalationRate : 0.035;
            in.carbonTaxProjected     = request.carbonTaxProjected >= 0 ? request.carbonTaxProjected : 126.0;
            in.climateChangeOffsetC   = request.climateChangeOffsetC;

            in.elecTariff_per_kWh         = request.electricityTariff > 0 ? request.electricityTariff : 0.15;
            in.carbonIntensity_kg_per_kWh = request.carbonIntensity > 0 ? request.carbonIntensity : 0.055;
            in.maxAirflowCFM              = request.airflowCFM > 0 ? request.airflowCFM : 2000.0;

            in.economizerMaxOutdoorTemp = request.economizerMaxOutdoorTemp != null ? request.economizerMaxOutdoorTemp : 24.0;
            in.economizerMaxHumidity    = request.economizerMaxHumidity    != null ? request.economizerMaxHumidity    : 60.0;
            in.minOutdoorAirFraction    = request.minOutdoorAirFraction    != null ? request.minOutdoorAirFraction    : 0.2;

            // CAPEX for payback calculation
            in.capexEconomizerUSD = request.capexEconomizerUSD > 0 ? request.capexEconomizerUSD : 25000.0;

            // Fan efficiency
            if (request.fans != null) {
                double totalFans = request.fans.bestFans + request.fans.averageFans + request.fans.oldFans;
                if (totalFans > 0) {
                    in.fanWeightedEfficiency = (request.fans.bestFans * 0.35
                            + request.fans.averageFans * 0.60
                            + request.fans.oldFans * 1.0) / totalFans;
                }
            }
            if (in.fanWeightedEfficiency <= 0) in.fanWeightedEfficiency = 0.60;

            // ─────────────────────────────────────────────────────────────────
            // 2. CloudSim Workload Generation (MUST remain — dynamic AI load)
            // ─────────────────────────────────────────────────────────────────
            logger.info("[CloudSim] Generating dynamic workload profile...");

            com.acme.aireconcalc.cloudsim.CloudSimWorkloadService.WorkloadConfig csConfig =
                    new com.acme.aireconcalc.cloudsim.CloudSimWorkloadService.WorkloadConfig();
            csConfig.numberOfServers      = in.numServers;
            csConfig.serversPerRack       = request.serversPerRack > 0 ? request.serversPerRack : 10;
            csConfig.serverMaxPowerW      = in.serverMaxPowerW;
            csConfig.serverIdlePowerW     = in.serverIdlePowerW;
            csConfig.coresPerServer       = request.coresPerServer  != null ? request.coresPerServer  : 4;
            csConfig.mipsPerCore          = request.mipsPerCore     != null ? request.mipsPerCore     : 1000L;
            csConfig.computeIntensityFactor = in.computeIntensityFactor;

            boolean useProvidedWeather = request.weatherData != null && !request.weatherData.isEmpty();
            int simulationHours = useProvidedWeather ? request.weatherData.size() : 24;
            if (useProvidedWeather) {
                int requestedHours = request.simulationDuration > 0 ? request.simulationDuration : 8760;
                if (simulationHours > requestedHours) {
                    request.weatherData = request.weatherData.subList(0, requestedHours);
                    simulationHours = requestedHours;
                }
            }
            csConfig.simulationHours = simulationHours;

            String workloadModeStr = request.aiWorkloadMode != null ? request.aiWorkloadMode : "ENTERPRISE";
            com.acme.aireconcalc.cloudsim.CloudSimWorkloadService.AIWorkloadMode workloadMode;
            try {
                workloadMode = com.acme.aireconcalc.cloudsim.CloudSimWorkloadService.AIWorkloadMode.valueOf(workloadModeStr);
            } catch (IllegalArgumentException e) {
                workloadMode = com.acme.aireconcalc.cloudsim.CloudSimWorkloadService.AIWorkloadMode.ENTERPRISE;
            }
            csConfig.workloadMode = workloadMode;

            com.acme.aireconcalc.cloudsim.CloudSimWorkloadService csService =
                    new com.acme.aireconcalc.cloudsim.CloudSimWorkloadService();
            com.acme.aireconcalc.cloudsim.CloudSimWorkloadService.WorkloadResult csResult =
                    csService.generateWorkloadProfile(csConfig);

            logger.info("[CloudSim] Completed: {} hours, h0={} kW", csResult.totalHours,
                    String.format("%.2f", csResult.hourlyITLoadKW[0]));

            // ─────────────────────────────────────────────────────────────────
            // 3. Hourly Physics Simulation
            // ─────────────────────────────────────────────────────────────────
            AirEconomizerModel model = new AirEconomizerModel();
            List<Map<String, Object>> hourlyProfile = new ArrayList<>();

            double totalItEnergy      = 0;
            double totalCoolingEnergy = 0;
            double totalCarbon        = 0;
            double sumUtilization     = 0;
            int    steps              = csResult.totalHours;

            // Per-rack peak tracking for rackAnalysis
            int numberOfRacks = csResult.numberOfRacks > 0 ? csResult.numberOfRacks : 1;
            double[] rackPeakLoadKW = new double[numberOfRacks];
            double[] rackTotalLoadKW = new double[numberOfRacks];

            for (int h = 0; h < steps; h++) {
                // Weather
                WeatherData w = new WeatherData();
                if (useProvidedWeather) {
                    WeatherEntryDTO wd = request.weatherData.get(h);
                    w.dryBulbC        = wd.temperature != null ? wd.temperature : 20.0;
                    w.relativeHumidity = wd.humidity   != null ? wd.humidity    : 50.0;
                } else {
                    w.dryBulbC        = SimUtils.getHourlyTempC(h % 24, 18.0, 30.0);
                    w.dryBulbC       += request.climateChangeOffsetC;
                    w.relativeHumidity = 50.0;
                }

                // ── FIX: use computeTimeStepWithCloudSimLoad so physics is
                //         consistent with the actual CloudSim IT load ──────────
                double itLoadKW   = csResult.hourlyITLoadKW[h];
                double utilization = csResult.hourlyUtilization[h];
                AirEconomizerModel.StepResult res =
                        model.computeTimeStepWithCloudSimLoad(in, w, h, itLoadKW);

                // Accumulate energy
                totalItEnergy      += res.itLoad_kW;
                totalCoolingEnergy += (res.fanPower_kW + res.mechPower_kW);
                totalCarbon        += (res.totalPower_kW * in.carbonIntensity_kg_per_kWh);
                sumUtilization     += utilization;

                // Per-rack load tracking
                if (csResult.rackITLoadKW != null) {
                    for (int r = 0; r < numberOfRacks && r < csResult.rackITLoadKW.length; r++) {
                        double rackLoad = csResult.rackITLoadKW[r][h];
                        rackTotalLoadKW[r] += rackLoad;
                        if (rackLoad > rackPeakLoadKW[r]) rackPeakLoadKW[r] = rackLoad;
                    }
                }

                // ── Hourly profile — ALL fields from old result ───────────────
                Map<String, Object> hourMap = new LinkedHashMap<>();
                // Old field names (kept for backward compatibility)
                hourMap.put("timestampHour",       h);
                hourMap.put("outdoorTempC",         w.dryBulbC);
                hourMap.put("outdoorRH",            w.relativeHumidity);
                hourMap.put("itLoad_kW",            res.itLoad_kW);
                hourMap.put("coolingLoad_kW",       res.coolingLoad_kW);
                hourMap.put("q_free_kW",            res.q_free_kW);
                hourMap.put("mech_load_kW",         res.mech_load_kW);
                hourMap.put("requiredAirflow_CFM",  res.requiredAirflow_CFM);
                hourMap.put("airflowViolation",     res.airflowViolation);
                hourMap.put("violationMsg",         res.violationMsg != null ? res.violationMsg : "");
                hourMap.put("fanPower_kW",          res.fanPower_kW);
                hourMap.put("mechPower_kW",         res.mechPower_kW);
                hourMap.put("totalPower_kW",        res.totalPower_kW);
                hourMap.put("pue",                  res.pue);
                hourMap.put("cue",                  res.cue);
                hourMap.put("mode",                 res.mode);
                // New field names (used by SimulationController frontend mapping)
                hourMap.put("hour",                 h);
                hourMap.put("timestamp",            useProvidedWeather && request.weatherData.get(h).timestamp != null
                                                        ? request.weatherData.get(h).timestamp
                                                        : String.format("%02d:00", h % 24));
                hourMap.put("itLoadKW",             res.itLoad_kW);
                hourMap.put("coolingLoadKW",        res.coolingLoad_kW);
                hourMap.put("fanPowerKW",           res.fanPower_kW);
                hourMap.put("mechPowerKW",          res.mechPower_kW);
                hourMap.put("totalPowerKW",         res.totalPower_kW);
                hourMap.put("tempC",                w.dryBulbC);
                hourMap.put("rh",                   w.relativeHumidity);
                hourlyProfile.add(hourMap);
            }

            // ─────────────────────────────────────────────────────────────────
            // 4. Annual extrapolation (scale short runs to full year for financials)
            // ─────────────────────────────────────────────────────────────────
            double yearMult        = steps > 0 ? (8760.0 / steps) : 1.0;
            double annualItEnergy  = totalItEnergy      * yearMult;
            double annualCooling   = totalCoolingEnergy * yearMult;
            double annualEnergy    = annualItEnergy + annualCooling;
            double annualCarbon    = totalCarbon         * yearMult;   // kg
            double avgUtilization  = steps > 0 ? sumUtilization / steps : 0.0;

            // Baseline (mechanical-only, PUE 1.8) for savings calculation
            double baselineAnnualEnergy = annualItEnergy * BASELINE_PUE;
            double energySavingsKWh     = baselineAnnualEnergy - annualEnergy;
            double energySavingsPct     = baselineAnnualEnergy > 0
                    ? (energySavingsKWh / baselineAnnualEnergy) * 100.0 : 0.0;

            // Financial summary
            double electricityCostUSD = annualEnergy * in.elecTariff_per_kWh;
            double carbonTaxCostUSD   = (annualCarbon / 1000.0) * in.carbonTaxProjected;
            double annualOpExUSD      = electricityCostUSD + carbonTaxCostUSD;

            double baselineCost       = baselineAnnualEnergy * in.elecTariff_per_kWh
                                      + (baselineAnnualEnergy * in.carbonIntensity_kg_per_kWh / 1000.0) * in.carbonTaxProjected;
            double annualSavingsUSD   = baselineCost - annualOpExUSD;

            double paybackPeriodYears = annualSavingsUSD > 0
                    ? in.capexEconomizerUSD / annualSavingsUSD : 999.0;

            double baselineCarbon     = baselineAnnualEnergy * in.carbonIntensity_kg_per_kWh; // kg
            double carbonSavingsKg    = baselineCarbon - annualCarbon;

            // ─────────────────────────────────────────────────────────────────
            // 5. Summary — unified field names (no duplicates)
            // ─────────────────────────────────────────────────────────────────
            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("averagePUE",              annualItEnergy > 0 ? annualEnergy / annualItEnergy : 0.0);
            summary.put("averageCUE",              annualItEnergy > 0 ? annualCarbon / annualItEnergy : 0.0);
            summary.put("annualOpExUSD",           annualOpExUSD);
            summary.put("totalCapexUSD",           in.capexEconomizerUSD);
            summary.put("totalEnergy_kWh",         annualEnergy);
            summary.put("annualSavingsUSD",        annualSavingsUSD);
            summary.put("carbonSavings_kg",        carbonSavingsKg);
            summary.put("carbonTaxCostUSD",        carbonTaxCostUSD);
            summary.put("estimatedOpExUSD",        electricityCostUSD);
            summary.put("totalItEnergy_kWh",       annualItEnergy);
            summary.put("waterUsage_liters",       0.0);
            summary.put("electricityCostUSD",      electricityCostUSD);
            summary.put("paybackPeriodYears",      paybackPeriodYears);
            summary.put("energySavingsPercent",    energySavingsPct);
            summary.put("totalCoolingEnergy_kWh",  annualCooling);
            summary.put("totalCarbonEmissions_kg", annualCarbon);

            // ─────────────────────────────────────────────────────────────────
            // 6. Projection — calls ProjectionEngine (was completely missing)
            // ─────────────────────────────────────────────────────────────────
            in.elecTariff_per_kWh = request.electricityTariff > 0 ? request.electricityTariff : 0.15;
            ProjectionEngine.ProjectionResult proj = ProjectionEngine.calculateProjections(
                    in, annualEnergy, annualCarbon, baselineAnnualEnergy);

            List<Map<String, Object>> yearlyDataList = new ArrayList<>();
            for (ProjectionEngine.YearlyData yd : proj.yearlyData) {
                Map<String, Object> yr = new LinkedHashMap<>();
                yr.put("year",                    yd.year);
                yr.put("energyKWh",               yd.energyKWh);
                yr.put("carbonTaxUSD",            yd.carbonTaxUSD);
                yr.put("totalCostUSD",            yd.totalCostUSD);
                yr.put("energyCostUSD",           yd.energyCostUSD);
                yr.put("costSavingsUSD",          yd.costSavingsUSD);
                yr.put("cumulativeCost",          yd.cumulativeCost);
                yr.put("cumulativeEnergy",        yd.cumulativeEnergy);
                yr.put("emissionsTonsCO2",        yd.emissionsTonsCO2);
                yr.put("energySavingsKWh",        yd.energySavingsKWh);
                yr.put("cumulativeSavings",       yd.cumulativeSavings);
                yr.put("temperatureOffsetC",      yd.temperatureOffsetC);
                yr.put("coolingLoadIncrease",     yd.coolingLoadIncrease);
                yr.put("cumulativeEmissions",     yd.cumulativeEmissions);
                yr.put("emissionsSavingsTonsCO2", yd.emissionsSavingsTonsCO2);
                yearlyDataList.add(yr);
            }

            Map<String, Object> projection = new LinkedHashMap<>();
            projection.put("totalCost",            proj.totalCost);
            projection.put("npvSavings",           proj.npvSavings);
            projection.put("yearlyData",           yearlyDataList);
            projection.put("totalEnergy",          proj.totalEnergy);
            projection.put("totalSavings",         proj.totalSavings);
            projection.put("forecastYears",        proj.forecastYears);
            projection.put("totalCarbonTax",       proj.totalCarbonTax);
            projection.put("totalEmissions",       proj.totalEmissions);
            projection.put("adjustedPaybackYears", proj.adjustedPaybackYears);

            // ─────────────────────────────────────────────────────────────────
            // 7. Rack Analysis — was completely missing
            // ─────────────────────────────────────────────────────────────────
            double maxRackLoad = 0, sumRackLoad = 0;
            int hotspotRacks = 0;
            List<String> airflowViolationMsgs = new ArrayList<>();
            double hotspotThresholdKW = (in.serverMaxPowerW * csConfig.serversPerRack) / 1000.0 * 0.85;

            for (int r = 0; r < numberOfRacks; r++) {
                double peakKW = rackPeakLoadKW[r];
                if (peakKW > maxRackLoad) maxRackLoad = peakKW;
                sumRackLoad += rackTotalLoadKW[r] / steps; // average over time
                if (peakKW > hotspotThresholdKW) hotspotRacks++;

                // Airflow violation check per rack
                double rackCFM = (peakKW * 3160.0) / (1.2 * 1.006 * 12.0);
                double rackCFMLimit = in.maxAirflowCFM / numberOfRacks;
                if (rackCFM > rackCFMLimit) {
                    airflowViolationMsgs.add(String.format(
                            "Rack %d AIRFLOW VIOLATION: Requires %.0f CFM, exceeds limit %.0f CFM. " +
                            "Peak load: %.1f kW. RECOMMENDATION: Liquid cooling or rack redistribution.",
                            r, rackCFM, rackCFMLimit, peakKW));
                }
            }
            double avgRackLoad = numberOfRacks > 0 ? sumRackLoad / numberOfRacks : 0;

            // Load imbalance factor (coefficient of variation)
            double sumSqDiff = 0;
            for (int r = 0; r < numberOfRacks; r++) {
                double avg = rackTotalLoadKW[r] / steps;
                sumSqDiff += Math.pow(avg - avgRackLoad, 2);
            }
            double loadImbalanceFactor = avgRackLoad > 0
                    ? Math.sqrt(sumSqDiff / numberOfRacks) / avgRackLoad : 0.0;

            Map<String, Object> rackAnalysis = new LinkedHashMap<>();
            rackAnalysis.put("totalRacks",          numberOfRacks);
            rackAnalysis.put("hotspotRacks",        hotspotRacks);
            rackAnalysis.put("maxRackLoadKW",       maxRackLoad);
            rackAnalysis.put("averageRackLoadKW",   avgRackLoad);
            rackAnalysis.put("loadImbalanceFactor", loadImbalanceFactor);
            rackAnalysis.put("airflowViolations",   airflowViolationMsgs);
            rackAnalysis.put("warnings",            new ArrayList<>());

            // ─────────────────────────────────────────────────────────────────
            // 8. TCO Forecast (kept for backward compat with new frontend mapping)
            // ─────────────────────────────────────────────────────────────────
            List<Map<String, Object>> tcoForecast = new ArrayList<>();
            double baseCarbonTax   = 65.0;
            double targetCarbonTax = in.carbonTaxProjected > 0 ? in.carbonTaxProjected : 126.0;
            for (int y = 1; y <= in.forecastYears; y++) {
                double yearRate  = y > 1
                        ? in.elecTariff_per_kWh * Math.pow(1 + in.energyEscalationRate, y - 1)
                        : in.elecTariff_per_kWh;
                double gridCost  = annualEnergy * yearRate;
                double taxRate   = y <= 4
                        ? baseCarbonTax + ((double) y / 4.0) * (targetCarbonTax - baseCarbonTax)
                        : targetCarbonTax;
                double carbonCost = (annualCarbon / 1000.0) * taxRate;
                Map<String, Object> yr = new LinkedHashMap<>();
                yr.put("year",          y);
                yr.put("gridCost",      gridCost);
                yr.put("carbonCost",    carbonCost);
                yr.put("totalTCO",      gridCost + carbonCost);
                yr.put("energyKWh",     annualEnergy);
                yr.put("carbonTaxRate", taxRate);
                tcoForecast.add(yr);
            }

            // ─────────────────────────────────────────────────────────────────
            // 9. Assemble final response
            // ─────────────────────────────────────────────────────────────────
            result.put("summary",          summary);
            result.put("projection",       projection);
            result.put("rackAnalysis",     rackAnalysis);
            result.put("hourlyResults",    hourlyProfile);   // old key
            result.put("hourlyProfile",    hourlyProfile);   // new key (both present)
            result.put("tcoForecast",      tcoForecast);
            result.put("workloadMode",     workloadModeStr);
            result.put("cloudSimEnabled",  true);
            result.put("averageUtilization", avgUtilization);
            result.put("aiConfig", Map.of(
                    "computeIntensityFactor", in.computeIntensityFactor,
                    "forecastYears",          in.forecastYears,
                    "upliftMessage",          in.computeIntensityFactor > 1.0 ? "AI Scaling Applied" : "Standard Workload"));

        } catch (Exception e) {
            logger.error("Simulation failed", e);
            result.put("error", e.getMessage());
        }

        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DTO Classes
    // ─────────────────────────────────────────────────────────────────────────

    public static class SimulationRequest {
        public int    numberOfRacks;
        public int    serversPerRack;
        public double serverMaxPowerW;
        public double serverIdlePowerW;
        public double averageUtilization;
        public double peakUtilization;
        public double electricityTariff;
        public double carbonIntensity;
        public double airflowCFM;
        public double computeIntensityFactor;
        public int    forecastYears;
        public double energyEscalationRate;
        public double carbonTaxProjected;
        public double climateChangeOffsetC;
        public double capexEconomizerUSD;   // NEW: CAPEX for payback calculation
        public int    simulationDuration;
        public Integer coresPerServer;
        public Long    mipsPerCore;
        public String  aiWorkloadMode;
        public FanConfig fans;
        public List<WeatherEntryDTO> weatherData;
        public Double economizerMaxOutdoorTemp;
        public Double economizerMaxHumidity;
        public Double minOutdoorAirFraction;
        public Integer bestQuantity;
        public Double  bestEfficiency;
        public Integer averageQuantity;
        public Double  averageEfficiency;
        public Integer legacyQuantity;
        public Double  legacyEfficiency;
    }

    public static class FanConfig {
        public int bestFans;
        public int averageFans;
        public int oldFans;
    }

    public static class WeatherEntryDTO {
        public String timestamp;
        public Double temperature;
        public Double humidity;
    }
}
