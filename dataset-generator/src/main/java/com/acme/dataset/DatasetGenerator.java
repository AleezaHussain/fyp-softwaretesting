package com.acme.dataset;

import com.acme.aireconcalc.AirEconomizerModel;
import com.acme.aireconcalc.EconomizerInputs;
import com.acme.aireconcalc.WeatherData;
import com.acme.evap.EvaporativeCoolingModel;
import com.acme.evap.CoolingDispatch;
import com.acme.evap.FanModel;
import com.acme.chilledwatersystem.ChilledWaterPhysics;
import com.acme.chilledwatersystem.EdgeDataCenterScenario;
import provider.Psychrometrics;
import provider.PsychroState;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/**
 * Dataset Generator for Cooling Technique Recommendation System
 *
 * Generates training data by running all 3 cooling simulators on random
 * scenarios and selecting the best technique based on a multi-criteria
 * weighted-cost function.
 *
 * Outputs:
 *   - dataset.csv          (conditions + bestTechnique label)
 *   - dataset_full.csv     (conditions + all 3 technique outputs for analysis)
 */
public class DatasetGenerator {

    // ── Condition Ranges (realistic data-center operating envelope) ──
    private static final double TEMP_MIN = 15.0,  TEMP_MAX = 45.0;   // °C outdoor
    private static final double RH_MIN   = 20.0,  RH_MAX   = 90.0;   // % relative humidity
    private static final double IT_MIN   = 200.0, IT_MAX   = 2000.0;  // kW IT load
    private static final double ELEC_MIN = 0.05,  ELEC_MAX = 0.25;    // USD/kWh
    private static final double WATER_MIN= 0.30,  WATER_MAX= 2.50;    // USD/m³
    private static final double CO2_MIN  = 0.20,  CO2_MAX  = 0.75;    // kgCO₂/kWh

    // ── Best-technique selection weights ──
    //  totalScore = w_energy*energy + w_cost*cost + w_carbon*carbon + w_water*water
    //  Lower score = better.  Infeasible → score = Double.MAX_VALUE
    private static final double W_ENERGY = 0.30;
    private static final double W_COST   = 0.35;
    private static final double W_CARBON = 0.20;
    private static final double W_WATER  = 0.15;

    // Number of rows to generate
    private static final int NUM_ROWS = 500;

    // Pressure constant
    private static final double P_ATM_KPA = 101.325;

    private final Random rng = new Random(42); // deterministic seed for reproducibility

    // ─────────────────────── result container ────────────────────────
    private static class TechResult {
        String name;
        boolean feasible;
        double energyKWh;    // annual cooling energy (kWh)
        double costUSD;      // annual cost (USD)
        double carbonKg;     // annual CO₂ (kg)
        double waterLiters;  // annual water use (L)
        double pue;
        int    violations;
        String violationDetail = "";

        // score() is computed externally via pickBest() with per-scenario
        // relative normalization.  No absolute-bound scoring needed.
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          MAIN
    // ═══════════════════════════════════════════════════════════════════
    public static void main(String[] args) {
        int rows = NUM_ROWS;
        if (args.length > 0) {
            try { rows = Integer.parseInt(args[0]); } catch (NumberFormatException ignored) {}
        }
        new DatasetGenerator().generate(rows);
    }

    public void generate(int rows) {
        System.out.println("╔═══════════════════════════════════════════════════════════════╗");
        System.out.println("║   DATASET GENERATOR — Cooling Technique Recommendation       ║");
        System.out.println("║   Running " + rows + " random scenarios through 3 simulators       ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════╝");

        List<String[]> fullRows  = new ArrayList<>();
        List<String[]> labelRows = new ArrayList<>();

        int countAir = 0, countEvap = 0, countChill = 0;

        for (int i = 0; i < rows; i++) {
            // ── Step 1: Random scenario ──────────────────────────────
            double tempC          = rand(TEMP_MIN,  TEMP_MAX);
            double rh             = rand(RH_MIN,    RH_MAX);
            double itLoadKW       = rand(IT_MIN,    IT_MAX);
            double electricityUSD = rand(ELEC_MIN,  ELEC_MAX);
            double waterUSD       = rand(WATER_MIN, WATER_MAX);
            double carbonFactor   = rand(CO2_MIN,   CO2_MAX);

            // ── Step 2: Run all 3 simulators ─────────────────────────
            TechResult airResult   = simulateAirEconomizer(tempC, rh, itLoadKW, electricityUSD, carbonFactor);
            TechResult evapResult  = simulateEvaporative(tempC, rh, itLoadKW, electricityUSD, waterUSD, carbonFactor);
            TechResult chillResult = simulateChilledWater(tempC, rh, itLoadKW, electricityUSD, waterUSD, carbonFactor);

            // ── Step 3: Pick best ────────────────────────────────────
            TechResult best = pickBest(airResult, evapResult, chillResult);

            if ("AirEconomizer".equals(best.name))     countAir++;
            else if ("Evaporative".equals(best.name))   countEvap++;
            else                                        countChill++;

            // ── Step 4: Build CSV rows ───────────────────────────────
            // Label row
            labelRows.add(new String[]{
                fmt(tempC), fmt(rh), fmt(itLoadKW),
                fmt(electricityUSD), fmt(waterUSD), fmt(carbonFactor),
                best.name
            });

            // Full row (all three outputs)
            fullRows.add(new String[]{
                fmt(tempC), fmt(rh), fmt(itLoadKW),
                fmt(electricityUSD), fmt(waterUSD), fmt(carbonFactor),
                // Air
                String.valueOf(airResult.feasible), fmt(airResult.energyKWh),
                fmt(airResult.costUSD), fmt(airResult.carbonKg),
                fmt(airResult.waterLiters), fmt(airResult.pue),
                String.valueOf(airResult.violations),
                // Evap
                String.valueOf(evapResult.feasible), fmt(evapResult.energyKWh),
                fmt(evapResult.costUSD), fmt(evapResult.carbonKg),
                fmt(evapResult.waterLiters), fmt(evapResult.pue),
                String.valueOf(evapResult.violations),
                // Chill
                String.valueOf(chillResult.feasible), fmt(chillResult.energyKWh),
                fmt(chillResult.costUSD), fmt(chillResult.carbonKg),
                fmt(chillResult.waterLiters), fmt(chillResult.pue),
                String.valueOf(chillResult.violations),
                // Best
                best.name
            });

            if ((i + 1) % 50 == 0 || i == rows - 1) {
                System.out.printf("  Progress: %d/%d scenarios completed%n", i + 1, rows);
            }
        }

        // ── Step 5: Write CSV files ──────────────────────────────────
        Path outDir = Paths.get("dataset-generator", "output");
        try {
            Files.createDirectories(outDir);
        } catch (IOException e) {
            outDir = Paths.get("output");
            try { Files.createDirectories(outDir); } catch (IOException ignored) {}
        }

        writeCsv(outDir.resolve("dataset.csv"),
                 "tempC,rh,itLoadKW,electricityPrice,waterPrice,carbonFactor,bestTechnique",
                 labelRows);

        writeCsv(outDir.resolve("dataset_full.csv"),
                 "tempC,rh,itLoadKW,electricityPrice,waterPrice,carbonFactor,"
                 + "air_feasible,air_energyKWh,air_costUSD,air_carbonKg,air_waterL,air_pue,air_violations,"
                 + "evap_feasible,evap_energyKWh,evap_costUSD,evap_carbonKg,evap_waterL,evap_pue,evap_violations,"
                 + "chill_feasible,chill_energyKWh,chill_costUSD,chill_carbonKg,chill_waterL,chill_pue,chill_violations,"
                 + "bestTechnique",
                 fullRows);

        // ── Summary ──────────────────────────────────────────────────
        System.out.println("\n═══════════════════════════════════════════════════════════════");
        System.out.println("DATASET GENERATION COMPLETE");
        System.out.printf("  Total scenarios:  %d%n", rows);
        System.out.printf("  AirEconomizer:    %d  (%.1f%%)%n", countAir,   100.0 * countAir / rows);
        System.out.printf("  Evaporative:      %d  (%.1f%%)%n", countEvap,  100.0 * countEvap / rows);
        System.out.printf("  ChilledWater:     %d  (%.1f%%)%n", countChill, 100.0 * countChill / rows);
        System.out.println("  Files written:");
        System.out.println("    " + outDir.resolve("dataset.csv").toAbsolutePath());
        System.out.println("    " + outDir.resolve("dataset_full.csv").toAbsolutePath());
        System.out.println("═══════════════════════════════════════════════════════════════");
    }

    // ═══════════════════════════════════════════════════════════════════
    //      SIMULATOR 1: Air-Side Economizer  (24h × 365d = annual)
    // ═══════════════════════════════════════════════════════════════════
    private TechResult simulateAirEconomizer(double tempC, double rh,
                                              double itLoadKW, double elecUSD,
                                              double carbonFactor) {
        TechResult res = new TechResult();
        res.name = "AirEconomizer";

        AirEconomizerModel model = new AirEconomizerModel();
        EconomizerInputs in = new EconomizerInputs();

        // Scale servers to match requested IT load
        //  P_IT = N * factor * [idle + (max-idle)*util]
        //  At avg util ~0.5: P_IT ≈ N * 1.0 * [100 + (507-100)*0.5] = N*353.5 W
        int numServers = Math.max(1, (int) Math.round(itLoadKW * 1000.0 / 353.5));
        in.numServers = numServers;
        in.serverMaxPowerW = 507.0;
        in.serverIdlePowerW = 100.0;
        in.computeIntensityFactor = 1.0;
        in.maxAirflowCFM = itLoadKW * 350.0;  // headroom above physics need (~218 CFM/kW)
        in.carbonIntensity_kg_per_kWh = carbonFactor;
        in.mechCOP = 3.0;
        // Economizer thresholds
        in.economizerMaxOutdoorTemp = 28.0;
        in.economizerMaxHumidity = 75.0;
        in.minOutdoorAirFraction = 0.2;
        // Fan fleet
        in.bestQuantity = 10;  in.bestEfficiency = 0.15;  // W/CFM: ultra-efficient EC fans
        in.averageQuantity = 5; in.averageEfficiency = 0.25; // W/CFM: modern fans
        in.legacyQuantity = 2;  in.legacyEfficiency = 0.40;  // W/CFM: older fans

        double totalItEnergy = 0, totalCoolingEnergy = 0, totalCarbon = 0;
        int violations = 0;
        StringBuilder violDetail = new StringBuilder();

        // Simulate 24 representative hours with diurnal variation around the
        // scenario's outdoor temperature (±5°C swing) and scale to annual.
        for (int h = 0; h < 24; h++) {
            double diurnalOffset = 5.0 * Math.cos((h - 14) * 2 * Math.PI / 24.0);
            double hourTemp = tempC + diurnalOffset;
            // RH varies inversely with temperature swing
            double hourRH = Math.max(10, Math.min(100, rh - diurnalOffset * 1.5));

            WeatherData w = new WeatherData();
            w.dryBulbC = hourTemp;
            w.relativeHumidity = hourRH;

            double util = 0.3 + 0.4 * Math.cos((h - 14) * 2 * Math.PI / 24.0);
            util = Math.max(0.1, Math.min(0.95, util));

            AirEconomizerModel.StepResult step = model.computeTimeStep(in, w, h, util);

            totalItEnergy += step.itLoad_kW;           // kW × 1h = kWh per hour
            totalCoolingEnergy += (step.fanPower_kW + step.mechPower_kW);
            totalCarbon += step.totalPower_kW * carbonFactor;

            if (step.airflowViolation) {
                violations++;
                if (violDetail.length() == 0)
                    violDetail.append(step.violationMsg);
            }
        }

        // Scale 24h → annual (×365)
        double annualScale = 365.0;
        res.energyKWh   = totalCoolingEnergy * annualScale;
        res.costUSD     = (totalItEnergy + totalCoolingEnergy) * annualScale * elecUSD;
        res.carbonKg    = totalCarbon * annualScale;
        res.waterLiters = 0; // Air-side uses no water
        res.pue         = totalItEnergy > 0
                          ? (totalItEnergy + totalCoolingEnergy) / totalItEnergy
                          : 99.0;

        // Always "feasible" — violations give a soft penalty in the
        // per-scenario relative scoring (see pickBest).
        res.violations = violations;
        res.violationDetail = violDetail.toString();
        res.feasible = true;

        return res;
    }

    // ═══════════════════════════════════════════════════════════════════
    //      SIMULATOR 2: Evaporative Cooling  (24h × 365d = annual)
    // ═══════════════════════════════════════════════════════════════════
    private TechResult simulateEvaporative(double tempC, double rh,
                                            double itLoadKW, double elecUSD,
                                            double waterUSD, double carbonFactor) {
        TechResult res = new TechResult();
        res.name = "Evaporative";

        EvaporativeCoolingModel model = new EvaporativeCoolingModel();
        FanModel fanModel = new FanModel();
        FanModel.Params fanParams = new FanModel.Params();
        fanParams.eta_fan = 0.6;
        fanParams.deltaP_Pa = 200.0;  // wet-media + ductwork resistance

        // Server parameters (same fleet as air)
        int numServers = Math.max(1, (int) Math.round(itLoadKW * 1000.0 / 353.5));
        double UPS_eff = 0.96;
        double PDU_frac = 0.02;
        double pump_frac = 0.02;
        double COP_DX = 3.5;
        double eta_DEC = 0.80;
        double eta_IEC = 0.10;
        double Tout_set = 26.0;
        double Tdp_max = 16.0;

        // Airflow scales with IT load: ~0.04 m³/s per kW (industry ~100 CFM/kW)
        double V_air_base = itLoadKW * 0.04;

        double totalItEnergy = 0, totalCoolingEnergy = 0, totalCarbon = 0;
        double totalWater_L = 0;
        int violations = 0;

        for (int h = 0; h < 24; h++) {
            double diurnalOffset = 5.0 * Math.cos((h - 14) * 2 * Math.PI / 24.0);
            double hourTemp = tempC + diurnalOffset;
            double hourRH = Math.max(10, Math.min(100, rh - diurnalOffset * 1.5));

            // Psychrometric state
            PsychroState state = Psychrometrics.from(hourTemp, hourRH, P_ATM_KPA);

            // Hourly IT load with diurnal utilization
            double util = 0.3 + 0.4 * Math.cos((h - 14) * 2 * Math.PI / 24.0);
            util = Math.max(0.1, Math.min(0.95, util));
            double P_IT = numServers * (100.0 + (507.0 - 100.0) * util) / 1000.0; // kW
            double P_UPS_loss = P_IT * (1.0 / UPS_eff - 1.0);
            double P_PDU_loss = PDU_frac * P_IT;
            double Q_required = P_IT + P_UPS_loss + P_PDU_loss;

            // Cooling dispatch
            CoolingDispatch.Result dispatch = CoolingDispatch.evaluate(
                    state.Tdb_C, state.RH, state.P_kPa,
                    state.Twb_C, state.Tdp_C, state.W,
                    eta_DEC, eta_IEC, Q_required, Tout_set, Tdp_max, COP_DX);

            // Evaporative model
            EvaporativeCoolingModel.Inputs evIn = new EvaporativeCoolingModel.Inputs();
            evIn.inState = state;
            evIn.efficiency = eta_DEC;
            evIn.V_air_m3s = V_air_base;
            evIn.rho_air = 1.2;
            evIn.Cp_kJ_per_kgC = 1.006;
            evIn.L_v_kJ_per_kg = 2260.0;
            evIn.P_kPa = P_ATM_KPA;

            EvaporativeCoolingModel.Outputs evOut = model.compute(evIn);

            // Fan power
            double P_fan_kW = fanModel.powerW(fanParams, V_air_base) / 1000.0;
            double P_pump_kW = pump_frac * dispatch.Q_evap;
            double P_DX_kW = dispatch.P_DX;

            double totalHourPower = P_IT + P_UPS_loss + P_PDU_loss + P_fan_kW + P_pump_kW + P_DX_kW;

            totalItEnergy += P_IT;
            totalCoolingEnergy += (P_fan_kW + P_pump_kW + P_DX_kW);
            totalCarbon += totalHourPower * carbonFactor;

            // Water usage: evaporation (kg/s → L/hour) + 10% blowdown
            double waterPerHour_L = evOut.m_water_kg_s * 3600.0 * 1.10;
            totalWater_L += waterPerHour_L;

            // Violation: overcooling in cold weather (evaporative wastes water)
            // OR too hot for evap to handle alone
            // OR insufficient evaporative potential in very humid conditions.
            boolean viol = false;
            if (hourTemp < 18.0) viol = true;                        // too cold
            if (hourTemp > 38.0) viol = true;                        // too hot
            if (state.Twb_C > (state.Tdb_C - 2.0)) viol = true;     // humid
            if (viol) violations++;
        }

        double annualScale = 365.0;
        res.energyKWh   = totalCoolingEnergy * annualScale;
        res.costUSD     = (totalItEnergy + totalCoolingEnergy) * annualScale * elecUSD
                          + (totalWater_L * annualScale / 1000.0) * waterUSD; // water in m³
        res.carbonKg    = totalCarbon * annualScale;
        res.waterLiters = totalWater_L * annualScale;
        res.pue         = totalItEnergy > 0
                          ? (totalItEnergy + totalCoolingEnergy) / totalItEnergy
                          : 99.0;
        res.violations  = violations;

        // Always feasible — soft penalty via violation count in scoring
        res.feasible = true;

        return res;
    }

    // ═══════════════════════════════════════════════════════════════════
    //      SIMULATOR 3: Chilled Water System  (24h × 365d = annual)
    // ═══════════════════════════════════════════════════════════════════
    private TechResult simulateChilledWater(double tempC, double rh,
                                             double itLoadKW, double elecUSD,
                                             double waterUSD, double carbonFactor) {
        TechResult res = new TechResult();
        res.name = "ChilledWater";

        // Configure scenario to match the requested IT load
        int numServers = Math.max(1, (int) Math.round(itLoadKW * 1000.0 / 353.5));
        int racks = Math.max(1, numServers / 10);
        int serversPerRack = (int) Math.ceil((double) numServers / racks);

        EdgeDataCenterScenario scenario = new EdgeDataCenterScenario(racks, serversPerRack);
        scenario.setDesignAmbientC(tempC);
        scenario.setDesignWetBulbC(computeWetBulb(tempC, rh));
        scenario.setServerMaxPowerW(507.0);
        scenario.setServerIdlePowerW(100.0);
        scenario.setElectricityRateUsdKwh(elecUSD);
        scenario.setCarbonFactorKgKwh(carbonFactor);
        scenario.setWaterCostUsdPerM3(waterUSD);
        // Set reference load to match
        scenario.setChillerReferenceLoadKW(itLoadKW);
        scenario.setChillerReferenceCop(6.0);

        ChilledWaterPhysics physics = new ChilledWaterPhysics(scenario);

        double totalItEnergy = 0, totalCoolingEnergy = 0, totalCarbon = 0;
        double totalWater_L = 0;
        int violations = 0;

        for (int h = 0; h < 24; h++) {
            double diurnalOffset = 5.0 * Math.cos((h - 14) * 2 * Math.PI / 24.0);
            double hourTemp = tempC + diurnalOffset;
            double hourRH = Math.max(10, Math.min(100, rh - diurnalOffset * 1.5));
            double wetBulb = computeWetBulb(hourTemp, hourRH);

            double util = 0.3 + 0.4 * Math.cos((h - 14) * 2 * Math.PI / 24.0);
            util = Math.max(0.1, Math.min(0.95, util));
            double P_IT = numServers * (100.0 + (507.0 - 100.0) * util) / 1000.0;

            ChilledWaterPhysics.CoolingMetrics cm = physics.calculateCooling(P_IT, hourTemp, wetBulb);

            double hourCooling = cm.chillerPowerKW + cm.pumpPowerKW + cm.towerFanPowerKW;
            double hourTotal = P_IT + hourCooling + 7.2; // 7.2 kW edge overhead

            totalItEnergy += P_IT;
            totalCoolingEnergy += hourCooling;
            totalCarbon += hourTotal * carbonFactor;
            totalWater_L += cm.waterUsageLiters;

            // Violation: rack inlet out of ASHRAE range 18-27°C
            if (cm.rackInletTempC < 18.0 || cm.rackInletTempC > 27.0) {
                violations++;
            }

            // Reset fouling each hour for dataset consistency
            physics.reset();
        }

        double annualScale = 365.0;
        res.energyKWh   = totalCoolingEnergy * annualScale;
        res.costUSD     = (totalItEnergy + totalCoolingEnergy + 7.2 * 24) * annualScale * elecUSD
                          + (totalWater_L * annualScale / 1000.0) * waterUSD;
        res.carbonKg    = totalCarbon * annualScale;
        res.waterLiters = totalWater_L * annualScale;
        res.pue         = totalItEnergy > 0
                          ? (totalItEnergy + totalCoolingEnergy) / totalItEnergy
                          : 99.0;
        res.violations  = violations;

        // Chilled water is almost always feasible (active mechanical system)
        // Infeasible only if COP degrades too badly (extremely hot + humid)
        res.feasible = true;

        return res;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                  BEST TECHNIQUE PICKER
    // ═══════════════════════════════════════════════════════════════════
    /**
     * Pick the best technique using per-scenario min-max normalization.
     * Each metric is normalised to [0,1] where 0 = best within scenario,
     * 1 = worst.  Violations add a soft penalty (0.04 per violation-hour).
     */
    private TechResult pickBest(TechResult air, TechResult evap, TechResult chill) {
        TechResult[] techs = {air, evap, chill};

        // min/max across the three techniques for each metric
        double minE = Double.MAX_VALUE, maxE = 0;
        double minC = Double.MAX_VALUE, maxC = 0;
        double minK = Double.MAX_VALUE, maxK = 0;
        double minW = Double.MAX_VALUE, maxW = 0;
        for (TechResult t : techs) {
            minE = Math.min(minE, t.energyKWh);   maxE = Math.max(maxE, t.energyKWh);
            minC = Math.min(minC, t.costUSD);      maxC = Math.max(maxC, t.costUSD);
            minK = Math.min(minK, t.carbonKg);     maxK = Math.max(maxK, t.carbonKg);
            minW = Math.min(minW, t.waterLiters);  maxW = Math.max(maxW, t.waterLiters);
        }

        TechResult best = null;
        double bestScore = Double.MAX_VALUE;
        for (TechResult t : techs) {
            double nE = (maxE > minE) ? (t.energyKWh - minE) / (maxE - minE) : 0;
            double nC = (maxC > minC) ? (t.costUSD   - minC) / (maxC - minC) : 0;
            double nK = (maxK > minK) ? (t.carbonKg  - minK) / (maxK - minK) : 0;
            double nW = (maxW > minW) ? (t.waterLiters - minW) / (maxW - minW) : 0;
            double score = W_ENERGY * nE + W_COST * nC + W_CARBON * nK + W_WATER * nW
                         + t.violations * 0.06;  // soft penalty per violation-hour
            if (score < bestScore) {
                bestScore = score;
                best = t;
            }
        }
        return best;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                      HELPERS
    // ═══════════════════════════════════════════════════════════════════
    private double rand(double min, double max) {
        return min + (max - min) * rng.nextDouble();
    }

    /** Approximate wet-bulb temperature (Stull 2011) */
    private static double computeWetBulb(double Tdb, double RH) {
        return Psychrometrics.Twb(Tdb, RH, P_ATM_KPA);
    }

    private static String fmt(double v) {
        return String.format(Locale.US, "%.4f", v);
    }

    private void writeCsv(Path path, String header, List<String[]> rows) {
        try (BufferedWriter w = Files.newBufferedWriter(path, StandardCharsets.UTF_8)) {
            w.write(header);
            w.newLine();
            for (String[] row : rows) {
                w.write(String.join(",", row));
                w.newLine();
            }
            System.out.println("  Wrote " + rows.size() + " rows → " + path.toAbsolutePath());
        } catch (IOException e) {
            System.err.println("ERROR writing " + path + ": " + e.getMessage());
        }
    }
}
