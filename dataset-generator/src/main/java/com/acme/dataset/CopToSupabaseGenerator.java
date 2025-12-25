package com.acme.dataset;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

public class CopToSupabaseGenerator {

    // =========================
    // RESEARCH-GROUNDED DEFAULTS
    // =========================
    // Air-side economizer typical enthalpy lockout ~ 65 kJ/kg (commonly used baseline)
    private static final double ECON_LOCKOUT_ENTHALPY_KJ_PER_KG = 65.0;

    // Typical data center AHU fan power coefficients (baseline ranges in practice; choose representative)
    private static final double SUPPLY_FAN_W_PER_CFM = 0.35;
    private static final double RETURN_FAN_W_PER_CFM = 0.28;
    private static final double FILTER_PENALTY = 0.10; // 10%

    // DX trim / legacy mechanical COP baseline
    private static final double DX_COP = 3.0;

    // Chiller nominal COP baseline
    private static final double CHILLER_COP_NOMINAL = 5.0;
    private static final double CHILLER_COP_MIN = 2.5;

    // Auxiliaries (pumps + CRAH fans) baseline fraction
    private static final double CHW_AUX_FRACTION_OF_IT = 0.05;

    // Evaporative effectiveness baseline
    private static final double EVAP_EFF = 0.75;
    private static final double EVAP_FAN_W_PER_CFM = 0.35;

    // =========================
    // DATASET SIZE + BATCHING
    // =========================
    private static final int TOTAL_SCENARIOS = 5000;     // change to 10000/20000 as needed
    private static final int BATCH_SIZE = 200;           // Supabase batch insert size

    // Recommended vs extreme split (research-style)
    private static final double RECOMMENDED_SHARE = 0.70; // 70% in 18–27C
    // Extreme share 30% in wider 5–45C

    // Design IT (for PLR). Use your edge design baseline (example: 10 kW)
    private static final double DESIGN_IT_KW = 10.0;

    // =========================
    // TECHNIQUES
    // =========================
    enum Technique { AirEconomizer, ChilledWater, Evaporative }

    public static void main(String[] args) throws Exception {
        String supabaseUrl = System.getenv("SUPABASE_URL");
        String anonKey = System.getenv("SUPABASE_ANON_KEY");

        if (supabaseUrl == null || anonKey == null || supabaseUrl.isBlank() || anonKey.isBlank()) {
            throw new IllegalStateException("Set env vars SUPABASE_URL and SUPABASE_ANON_KEY first.");
        }

        HttpClient http = HttpClient.newHttpClient();

        List<String> jsonRows = new ArrayList<>(BATCH_SIZE);

        int inserted = 0;
        int scenarioId = 0;

        for (int i = 0; i < TOTAL_SCENARIOS; i++) {
            scenarioId++;

            Scenario s = sampleScenario(scenarioId);

            // Compute psychrometrics
            double wetBulbC = Psychrometrics.wetBulbStullC(s.ambientTempC, s.rhPercent);
            double enthalpy = Psychrometrics.enthalpyKjPerKg(s.ambientTempC, s.rhPercent);

            // Generate 3 technique rows
            jsonRows.add(rowJson(s, Technique.AirEconomizer, wetBulbC, enthalpy));
            jsonRows.add(rowJson(s, Technique.ChilledWater, wetBulbC, enthalpy));
            jsonRows.add(rowJson(s, Technique.Evaporative, wetBulbC, enthalpy));

            // Batch insert
            if (jsonRows.size() >= BATCH_SIZE) {
                batchInsert(http, supabaseUrl, anonKey, jsonRows);
                inserted += jsonRows.size();
                jsonRows.clear();
                System.out.println("Inserted rows: " + inserted);
            }
        }

        // Flush remainder
        if (!jsonRows.isEmpty()) {
            batchInsert(http, supabaseUrl, anonKey, jsonRows);
            inserted += jsonRows.size();
            System.out.println("Inserted rows: " + inserted);
        }

        System.out.println("✅ Done. Total inserted rows = " + inserted
                + " (scenarios=" + TOTAL_SCENARIOS + ", techniques=3)");
    }

    // ----------------------------
    // Scenario sampling (covers ALL situations)
    // ----------------------------
    static Scenario sampleScenario(int scenarioId) {
        ThreadLocalRandom r = ThreadLocalRandom.current();

        boolean recommended = r.nextDouble() < RECOMMENDED_SHARE;

        // Temperature distribution:
        // recommended: 18–27C
        // extreme: 5–45C
        double tdb = recommended
                ? r.nextDouble(18.0, 27.0)
                : r.nextDouble(5.0, 45.0);

        // Humidity distribution (broad coverage)
        // Keep RH in [10..95] to include dry and humid conditions
        double rh = r.nextDouble(10.0, 95.0);

        // IT load: cover deep part-load to full load
        // PLR in [0.05..1.0]
        double plr = r.nextDouble(0.05, 1.0);
        double itLoadKw = plr * DESIGN_IT_KW;

        // Control setpoints: common band + some warmer operation
        double supplyTempC = pickFrom(r, new double[]{18, 20, 22, 25, 27, 30});

        // Airflow (CFM/kW): covers low to high flow
        double airflowCfmPerKw = pickFrom(r, new double[]{100, 150, 200, 250, 300, 350, 400});

        return new Scenario(scenarioId, tdb, rh, itLoadKw, plr, supplyTempC, airflowCfmPerKw);
    }

    static double pickFrom(ThreadLocalRandom r, double[] values) {
        return values[r.nextInt(values.length)];
    }

    // ----------------------------
    // Build one row JSON for Supabase
    // ----------------------------
    static String rowJson(Scenario s, Technique tech, double wetBulbC, double enthalpyKjKg) {
        double coolingPowerKw;
        Double oaFrac = null;
        Double mechTrimFrac = null;

        switch (tech) {
            case AirEconomizer -> {
                // OA fraction rule: better (lower) enthalpy -> more OA; above lockout -> OA=0
                double raw = (ECON_LOCKOUT_ENTHALPY_KJ_PER_KG - enthalpyKjKg) / 25.0;
                double oa = clamp(raw, 0.0, 1.0);
                double mechTrim = 1.0 - oa;

                oaFrac = oa;
                mechTrimFrac = mechTrim;

                coolingPowerKw = Cooling.airEconomizerCoolingPowerKw(
                        s.itLoadKw, s.airflowCfmPerKw, oa, mechTrim
                );
            }
            case ChilledWater -> {
                coolingPowerKw = Cooling.chilledWaterCoolingPowerKw(
                        s.itLoadKw, wetBulbC
                );
            }
            case Evaporative -> {
                coolingPowerKw = Cooling.evaporativeCoolingPowerKw(
                        s.itLoadKw, s.ambientTempC, wetBulbC, s.airflowCfmPerKw, s.supplyTempC
                );
            }
            default -> throw new IllegalArgumentException("Unknown tech");
        }

        if (coolingPowerKw <= 0) coolingPowerKw = 0.0001; // avoid division by zero
        double cop = s.itLoadKw / coolingPowerKw;

        // Basic filtering of nonsensical COPs
        if (cop < 0.2) cop = 0.2;
        if (cop > 50) cop = 50;

        // Supabase columns you created earlier:
        // scenario_id, technique, ambient_temp_c, relative_humidity, wetbulb_temp_c, enthalpy_kjkg,
        // it_load_kw, supply_temp_c, airflow_cfm_per_kw, outside_air_fraction, mechanical_trim_fraction,
        // cooling_power_kw, cop
        return "{"
                + "\"scenario_id\":" + s.scenarioId + ","
                + "\"technique\":\"" + tech.name() + "\"," +
                "\"ambient_temp_c\":" + round(s.ambientTempC) + ","
                + "\"relative_humidity\":" + round(s.rhPercent) + ","
                + "\"wetbulb_temp_c\":" + round(wetBulbC) + ","
                + "\"enthalpy_kjkg\":" + round(enthalpyKjKg) + ","
                + "\"it_load_kw\":" + round(s.itLoadKw) + ","
                + "\"supply_temp_c\":" + round(s.supplyTempC) + ","
                + "\"airflow_cfm_per_kw\":" + round(s.airflowCfmPerKw) + ","
                + "\"outside_air_fraction\":" + (oaFrac == null ? "null" : round(oaFrac)) + ","
                + "\"mechanical_trim_fraction\":" + (mechTrimFrac == null ? "null" : round(mechTrimFrac)) + ","
                + "\"cooling_power_kw\":" + round(coolingPowerKw) + ","
                + "\"cop\":" + round(cop)
                + "}";
    }

    static double round(double x) {
        return Math.round(x * 10000.0) / 10000.0;
    }

    static double clamp(double v, double lo, double hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    // ----------------------------
    // Batch insert into Supabase
    // ----------------------------
    static void batchInsert(HttpClient http, String supabaseUrl, String anonKey, List<String> rowJsons) throws Exception {
        String body = "[" + String.join(",", rowJsons) + "]";

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/cop_simulation_data"))
                .header("apikey", anonKey)
                .header("Authorization", "Bearer " + anonKey)
                .header("Content-Type", "application/json")
                .header("Prefer", "return=minimal")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 300) {
            throw new RuntimeException("Supabase insert failed (" + resp.statusCode() + "): " + resp.body());
        }
    }

    // ----------------------------
    // Scenario container
    // ----------------------------
    static class Scenario {
        final int scenarioId;
        final double ambientTempC;
        final double rhPercent;
        final double itLoadKw;
        final double plr;
        final double supplyTempC;
        final double airflowCfmPerKw;

        Scenario(int scenarioId, double ambientTempC, double rhPercent,
                 double itLoadKw, double plr, double supplyTempC, double airflowCfmPerKw) {
            this.scenarioId = scenarioId;
            this.ambientTempC = ambientTempC;
            this.rhPercent = rhPercent;
            this.itLoadKw = itLoadKw;
            this.plr = plr;
            this.supplyTempC = supplyTempC;
            this.airflowCfmPerKw = airflowCfmPerKw;
        }
    }

    // ----------------------------
    // Psychrometrics (standard approximations)
    // ----------------------------
    static class Psychrometrics {
        // Enthalpy approximation (kJ/kg dry air)
        static double enthalpyKjPerKg(double tC, double rhPercent) {
            double rh = rhPercent / 100.0;
            double pws = 0.61078 * Math.exp((17.2694 * tC) / (tC + 238.3)); // kPa (Magnus)
            double pw = rh * pws; // kPa
            double p = 101.325; // kPa
            double w = 0.62198 * pw / (p - pw); // kg/kg
            return 1.006 * tC + w * (2501 + 1.86 * tC);
        }

        // Wet-bulb approximation (Stull)
        static double wetBulbStullC(double tdbC, double rhPercent) {
            double rh = rhPercent;
            return tdbC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659))
                    + Math.atan(tdbC + rh)
                    - Math.atan(rh - 1.676331)
                    + 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh)
                    - 4.686035;
        }
    }

    // ----------------------------
    // Cooling power models (baseline research assumptions)
    // ----------------------------
    static class Cooling {

        // Air Economizer: fan + mechanical trim
        static double airEconomizerCoolingPowerKw(double itLoadKw,
                                                  double airflowCfmPerKw,
                                                  double oaFraction,
                                                  double mechTrimFraction) {
            double totalCfm = itLoadKw * airflowCfmPerKw;

            double fanKw = totalCfm
                    * (SUPPLY_FAN_W_PER_CFM + RETURN_FAN_W_PER_CFM)
                    * (1.0 + FILTER_PENALTY)
                    / 1000.0;

            double mechKw = (itLoadKw * mechTrimFraction) / DX_COP;

            return fanKw + mechKw;
        }

        // Chilled water: chiller power + aux. COP depends on wet-bulb (proxy for condenser conditions)
        static double chilledWaterCoolingPowerKw(double itLoadKw, double wetBulbC) {
            double cop = Math.max(CHILLER_COP_MIN,
                    CHILLER_COP_NOMINAL - 0.06 * (wetBulbC - 20.0)); // simple degradation

            double chillerKw = itLoadKw / cop;
            double auxKw = itLoadKw * CHW_AUX_FRACTION_OF_IT;

            return chillerKw + auxKw;
        }

        // Evaporative: fans + optional small trim if cannot meet supply setpoint
        static double evaporativeCoolingPowerKw(double itLoadKw,
                                                double dryBulbC,
                                                double wetBulbC,
                                                double airflowCfmPerKw,
                                                double supplySetpointC) {
            double supplyAchievable = dryBulbC - EVAP_EFF * (dryBulbC - wetBulbC);

            double totalCfm = itLoadKw * airflowCfmPerKw;
            double fanKw = totalCfm * EVAP_FAN_W_PER_CFM / 1000.0;

            // If evap can't meet supply setpoint, add trim on 20% load at DX_COP
            double trimKw = 0.0;
            if (supplyAchievable > supplySetpointC) {
                trimKw = (itLoadKw * 0.20) / DX_COP;
            }

            // ASHRAE/DOE baseline: evaporative systems consume ~5-8% of IT load in auxiliaries
            // (pumps, controls, drift eliminators, makeup water systems)
            double auxKw = itLoadKw * 0.065; // 6.5% midpoint

            return fanKw + trimKw + auxKw;
        }
    }
}
